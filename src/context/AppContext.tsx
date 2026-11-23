import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { t } from '../constants/i18n';
import {
  CleanStreakStats,
  FreedomGoal,
  ImpulseItem,
  SubscriptionItem,
  SubStats,
  TutorialSeenMap,
  TutorialTabKey,
  UserProfile,
  VaultStats,
} from '../types';
import {
  calculateCleanStreak,
  calculateFutureValue,
  calculateHourlyRate,
  calculateLifeCost,
  calculateSubscriptionStats,
  calculateVaultStats,
  getAnnualSubscriptionCost,
  getLocalDateKey,
} from '../utils/finance';
import { cancelQuarantineNotification } from '../utils/notifications';
import {
  DEFAULT_GOALS,
  DEFAULT_PROFILE,
  loadCleanDays,
  loadGoals,
  loadItems,
  loadProfile,
  loadSubscriptions,
  loadTutorialsSeen,
  saveCleanDays,
  saveGoals,
  saveItems,
  saveProfile,
  saveSubscriptions,
  saveTutorialsSeen,
} from '../utils/storage';

interface AppContextValue {
  isReady: boolean;
  profile: UserProfile;
  items: ImpulseItem[];
  subscriptions: SubscriptionItem[];
  goals: FreedomGoal[];
  activeGoal: FreedomGoal;
  cleanDays: string[];
  cleanStats: CleanStreakStats;
  tutorialsSeen: TutorialSeenMap;
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
  saveActiveGoal: (goal: FreedomGoal) => Promise<void>;
  addGoal: (goal: FreedomGoal) => Promise<void>;
  selectGoal: (goalId: string) => Promise<void>;
  toggleTodayClean: () => Promise<boolean>;
  markTutorialSeen: (tab: TutorialTabKey) => Promise<void>;
  resetTutorials: () => Promise<void>;
  replaceAllData: (
    profile: UserProfile,
    items: ImpulseItem[],
    subscriptions?: SubscriptionItem[],
    goals?: FreedomGoal[],
    activeGoalId?: string,
    cleanDays?: string[]
  ) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [items, setItems] = useState<ImpulseItem[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionItem[]>([]);
  const [goals, setGoals] = useState<FreedomGoal[]>(DEFAULT_GOALS);
  const [activeGoalId, setActiveGoalId] = useState<string>(DEFAULT_GOALS[0].id);
  const [cleanDays, setCleanDays] = useState<string[]>([]);
  const [tutorialsSeen, setTutorialsSeen] = useState<TutorialSeenMap>({});
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const [loadedProfile, loadedItems, loadedSubs, loadedGoals, loadedClean, loadedTuts] =
        await Promise.all([
          loadProfile(),
          loadItems(),
          loadSubscriptions(),
          loadGoals(),
          loadCleanDays(),
          loadTutorialsSeen(),
        ]);
      if (!active) return;
      setProfile(loadedProfile);
      setItems(loadedItems);
      setSubscriptions(loadedSubs);
      setGoals(loadedGoals.goals);
      setActiveGoalId(loadedGoals.activeGoalId);
      setCleanDays(loadedClean);
      setTutorialsSeen(loadedTuts);
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

  const cleanStats = useMemo(() => calculateCleanStreak(cleanDays), [cleanDays]);

  const activeGoal = useMemo(
    () => goals.find((g) => g.id === activeGoalId) ?? goals[0] ?? DEFAULT_GOALS[0],
    [goals, activeGoalId]
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

  const saveActiveGoal = useCallback(
    async (updated: FreedomGoal) => {
      setGoals((prev) => {
        const exists = prev.some((g) => g.id === updated.id);
        const next = exists
          ? prev.map((g) => (g.id === updated.id ? updated : g))
          : [...prev, updated];
        saveGoals(next, updated.id).catch(() => {});
        return next;
      });
      setActiveGoalId(updated.id);
    },
    []
  );

  const addGoal = useCallback(async (goal: FreedomGoal) => {
    setGoals((prev) => {
      const next = [...prev, goal];
      saveGoals(next, goal.id).catch(() => {});
      return next;
    });
    setActiveGoalId(goal.id);
  }, []);

  const selectGoal = useCallback(
    async (goalId: string) => {
      setActiveGoalId(goalId);
      setGoals((prev) => {
        saveGoals(prev, goalId).catch(() => {});
        return prev;
      });
    },
    []
  );

  const toggleTodayClean = useCallback(async (): Promise<boolean> => {
    const todayKey = getLocalDateKey();
    let nowClean = false;
    setCleanDays((prev) => {
      const exists = prev.includes(todayKey);
      nowClean = !exists;
      const next = exists ? prev.filter((d) => d !== todayKey) : [...prev, todayKey];
      saveCleanDays(next).catch(() => {});
      return next;
    });
    return nowClean;
  }, []);

  const markTutorialSeen = useCallback(async (tab: TutorialTabKey) => {
    setTutorialsSeen((prev) => {
      if (prev[tab]) return prev;
      const next = { ...prev, [tab]: true };
      saveTutorialsSeen(next).catch(() => {});
      return next;
    });
  }, []);

  const resetTutorials = useCallback(async () => {
    setTutorialsSeen({});
    await saveTutorialsSeen({});
  }, []);

  const replaceAllData = useCallback(
    async (
      newProfile: UserProfile,
      newItems: ImpulseItem[],
      newSubscriptions: SubscriptionItem[] = [],
      newGoals: FreedomGoal[] = DEFAULT_GOALS,
      newActiveGoalId?: string,
      newCleanDays: string[] = []
    ) => {
      const safeGoals = newGoals.length > 0 ? newGoals : DEFAULT_GOALS;
      const safeActive =
        newActiveGoalId && safeGoals.some((g) => g.id === newActiveGoalId)
          ? newActiveGoalId
          : safeGoals[0].id;

      setProfile(newProfile);
      setItems(newItems);
      setSubscriptions(newSubscriptions);
      setGoals(safeGoals);
      setActiveGoalId(safeActive);
      setCleanDays(newCleanDays);

      await Promise.all([
        saveProfile(newProfile),
        saveItems(newItems),
        saveSubscriptions(newSubscriptions),
        saveGoals(safeGoals, safeActive),
        saveCleanDays(newCleanDays),
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
      goals,
      activeGoal,
      cleanDays,
      cleanStats,
      tutorialsSeen,
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
      saveActiveGoal,
      addGoal,
      selectGoal,
      toggleTodayClean,
      markTutorialSeen,
      resetTutorials,
      replaceAllData,
    }),
    [
      isReady,
      profile,
      items,
      subscriptions,
      goals,
      activeGoal,
      cleanDays,
      cleanStats,
      tutorialsSeen,
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
      saveActiveGoal,
      addGoal,
      selectGoal,
      toggleTodayClean,
      markTutorialSeen,
      resetTutorials,
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
