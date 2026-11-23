import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ImpulseItem, UserProfile, VaultStats } from '../types';
import { calculateHourlyRate, calculateVaultStats } from '../utils/finance';
import { cancelQuarantineNotification } from '../utils/notifications';
import { DEFAULT_PROFILE, loadItems, loadProfile, saveItems, saveProfile } from '../utils/storage';

interface AppContextValue {
  isReady: boolean;
  profile: UserProfile;
  items: ImpulseItem[];
  hourlyRate: number;
  vaultStats: VaultStats;
  isPro: boolean;
  setDevPro: (value: boolean) => void;
  updateProfile: (patch: Partial<UserProfile>) => Promise<void>;
  addImpulse: (item: ImpulseItem) => Promise<void>;
  resolveImpulse: (id: string, status: 'resisted' | 'bought') => Promise<void>;
  deleteImpulse: (id: string) => Promise<void>;
  replaceAllData: (profile: UserProfile, items: ImpulseItem[]) => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const [profile, setProfile] = useState<UserProfile>(DEFAULT_PROFILE);
  const [items, setItems] = useState<ImpulseItem[]>([]);
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      const [loadedProfile, loadedItems] = await Promise.all([loadProfile(), loadItems()]);
      if (!active) return;
      setProfile(loadedProfile);
      setItems(loadedItems);
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

  const replaceAllData = useCallback(async (newProfile: UserProfile, newItems: ImpulseItem[]) => {
    setProfile(newProfile);
    setItems(newItems);
    await Promise.all([saveProfile(newProfile), saveItems(newItems)]);
  }, []);

  const setDevPro = useCallback((value: boolean) => {
    setIsPro(value);
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      isReady,
      profile,
      items,
      hourlyRate,
      vaultStats,
      isPro,
      setDevPro,
      updateProfile,
      addImpulse,
      resolveImpulse,
      deleteImpulse,
      replaceAllData,
    }),
    [
      isReady,
      profile,
      items,
      hourlyRate,
      vaultStats,
      isPro,
      setDevPro,
      updateProfile,
      addImpulse,
      resolveImpulse,
      deleteImpulse,
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
