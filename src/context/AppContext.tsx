import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { t } from '../constants/i18n';
import { ImpulseItem, SubscriptionItem, SubStats, UserProfile, VaultStats } from '../types';
import {
  calculateFutureValue,
  calculateHourlyRate,
  calculateLifeCost,
  calculateSubscriptionStats,
  calculateVaultStats,
  getAnnualSubscriptionCost,
} from '../utils/finance';
import { cancelQuarantineNotification } from '../utils/notifications';
import {
  DEFAULT_PROFILE,
  loadItems,
  loadProfile,
  loadSubscriptions,
  saveItems,
  saveProfile,
  saveSubscriptions,
} from '../utils/storage';

interface AppContextValue {
  isReady: boolean;
  profile: UserProfile;
  items: ImpulseItem[];
  subscriptions: SubscriptionItem[];
  hourlyRate: number;
  vaultStats: VaultStats;
  subStats: SubStats;
  isPro: boolean;
  setDevPro: (value: boolean) => void;
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>;
  addImpulse: (item: ImpulseItem) => Promise<void>;
  resolveImpulse: (id: string, status: 'resisted' | 'bought') => Promise<void>;
  deleteImpulse: (id: string) => Promise<void>;
  addSubscription: (sub: SubscriptionItem) => Promise<void>;
  cancelSubscriptionAndRescue: (id: string) => Promise<void>;
  deleteSubscription: (id: string) => Promise<void>;
  replaceAllData: (
    profile: UserProfile,
    items: ImpulseItem[],
    subscriptions?: SubscriptionItem[]
  ) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [items, setItems] = useState<ImpulseItem[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const [loadedProfile, loadedItems, loadedSubs] = await Promise.all([
        loadProfile(),
        loadItems(),
        loadSubscriptions(),
      ]);
      if (!active) return;
      setProfile(loadedProfile);
      setItems(loadedItems);
      setSubscriptions(loadedSubs);
      setIsReady(true);
    })();
    return () => {
      active = false;
    };
  }, []);

  const hourlyRate = useMemo(
    () =>
      calculateHourlyRate(
        profile.monthlyNetIncome,
        profile.weeklyHours,
        profile.commuteWeeklyHours
      ),
    [profile.monthlyNetIncome, profile.weeklyHours, profile.commuteWeeklyHours]
  );

  const vaultStats = useMemo(
    () => calculateVaultStats(items, hourlyRate),
    [items, hourlyRate]
  );

  const subStats = useMemo(
    () => calculateSubscriptionStats(subscriptions, hourlyRate),
    [subscriptions, hourlyRate]
  );

  const updateProfile = useCallback(async (patch: Partial<UserProfile>) => {
    setProfile((prev) => {
      const next = { ...prev, ...patch };
      saveProfile(next).catch(() => {});
      return next;
    });
  }, []);

  const addImpulse = useCallback(async (item: ImpulseItem) => {
    setItems((prev) => {
      const next = [item, ...prev];
      saveItems(next).catch(() => {});
      return next;
    });
  }, []);

  const resolveImpulse = useCallback(async (id: string, status: 'resisted' | 'bought') => {
    setItems((prev) => {
      const target = prev.find((it) => it.id === id);
      if (target?.notificationId) {
        cancelQuarantineNotification(target.notificationId).catch(() => {});
      }
      const next = prev.map((it) =>
        it.id === id
          ? { ...it, status, resolvedAt: Date.now(), notificationId: undefined }
          : it
      );
      saveItems(next).catch(() => {});
      return next;
    });
  }, []);

  const deleteImpulse = useCallback(async (id: string) => {
    setItems((prev) => {
      const target = prev.find((it) => it.id === id);
      if (target?.notificationId) {
        cancelQuarantineNotification(target.notificationId).catch(() => {});
      }
      const next = prev.filter((it) => it.id !== id);
      saveItems(next).catch(() => {});
      return next;
    });
  }, []);

  const addSubscription = useCallback(async (sub: SubscriptionItem) => {
    setSubscriptions((prev) => {
      const next = [sub, ...prev];
      saveSubscriptions(next).catch(() => {});
      return next;
    });
  }, []);

  const cancelSubscriptionAndRescue = useCallback(
    async (id: string) => {
      let targetSub: SubscriptionItem | undefined;
      setSubscriptions((prev) => {
        targetSub = prev.find((s) => s.id === id);
        if (targetSub?.notificationId) {
          cancelQuarantineNotification(targetSub.notificationId).catch(() => {});
        }
        const next = prev.map((s) =>
          s.id === id
            ? {
                ...s,
                status: 'cancelled' as const,
                cancelledAt: Date.now(),
                notificationId: undefined,
              }
            : s
        );
        saveSubscriptions(next).catch(() => {});
        return next;
      });

      if (!targetSub) return;

      const sub = targetSub;
      const now = Date.now();
      const frequency = sub.cycle === 'monthly' ? 'monthly' : 'once';
      const annualCost = getAnnualSubscriptionCost(sub.price, sub.cycle);
      const life = calculateLifeCost(annualCost, hourlyRate);
      const futureVal = calculateFutureValue(sub.price, 10, 10, frequency);

      const rescuedItem: ImpulseItem = {
        id: `sub-${now}-${Math.random().toString(36).slice(2, 6)}`,
        name: `${t(profile.language, 'subsCancelledPrefix')} ${sub.name}`,
        price: sub.price,
        frequency,
        category: sub.category,
        etfId: 'sp500',
        annualRate: 10,
        horizonYears: 10,
        hoursCost: life.hours,
        futureValue: futureVal,
        status: 'resisted',
        createdAt: now,
        unlockAt: now,
        resolvedAt: now,
      };

      setItems((prev) => {
        const next = [rescuedItem, ...prev];
        saveItems(next).catch(() => {});
        return next;
      });
    },
    [hourlyRate, profile.language]
  );

  const deleteSubscription = useCallback(async (id: string) => {
    setSubscriptions((prev) => {
      const target = prev.find((s) => s.id === id);
      if (target?.notificationId) {
        cancelQuarantineNotification(target.notificationId).catch(() => {});
      }
      const next = prev.filter((s) => s.id !== id);
      saveSubscriptions(next).catch(() => {});
      return next;
    });
  }, []);

  const replaceAllData = useCallback(
    async (
      newProfile: UserProfile,
      newItems: ImpulseItem[],
      newSubscriptions: SubscriptionItem[] = []
    ) => {
      setProfile(newProfile);
      setItems(newItems);
      setSubscriptions(newSubscriptions);
      await Promise.all([
        saveProfile(newProfile),
        saveItems(newItems),
        saveSubscriptions(newSubscriptions),
      ]);
    },
    []
  );

  const setDevPro = useCallback((value: boolean) => {
    setIsPro(value);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      isReady,
      profile,
      items,
      subscriptions,
      hourlyRate,
      vaultStats,
      subStats,
      isPro,
      setDevPro,
      updateProfile,
      addImpulse,
      resolveImpulse,
      deleteImpulse,
      addSubscription,
      cancelSubscriptionAndRescue,
      deleteSubscription,
      replaceAllData,
    }),
    [
      isReady,
      profile,
      items,
      subscriptions,
      hourlyRate,
      vaultStats,
      subStats,
      isPro,
      setDevPro,
      updateProfile,
      addImpulse,
      resolveImpulse,
      deleteImpulse,
      addSubscription,
      cancelSubscriptionAndRescue,
      deleteSubscription,
      replaceAllData,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside AppProvider');
  return ctx;
}
