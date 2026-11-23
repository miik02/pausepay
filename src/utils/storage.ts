import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppBackupPayload, ImpulseItem, SubscriptionItem, UserProfile } from '../types';

const PROFILE_KEY = '@pausepay_profile_v1';
const ITEMS_KEY = '@pausepay_items_v1';
const SUBS_KEY = '@pausepay_subs_v1';

export const DEFAULT_PROFILE: UserProfile = {
  monthlyNetIncome: 1800,
  weeklyHours: 40,
  commuteWeeklyHours: 5,
  currency: 'EUR',
  language: 'es',
  onboardingCompleted: false,
  defaultEtf: 'sp500',
  customRate: 7,
};

export async function loadProfile(): Promise<UserProfile> {
  try {
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    if (!raw) return DEFAULT_PROFILE;
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

export async function loadItems(): Promise<ImpulseItem[]> {
  try {
    const raw = await AsyncStorage.getItem(ITEMS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveItems(items: ImpulseItem[]): Promise<void> {
  await AsyncStorage.setItem(ITEMS_KEY, JSON.stringify(items));
}

export async function loadSubscriptions(): Promise<SubscriptionItem[]> {
  try {
    const raw = await AsyncStorage.getItem(SUBS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveSubscriptions(subscriptions: SubscriptionItem[]): Promise<void> {
  await AsyncStorage.setItem(SUBS_KEY, JSON.stringify(subscriptions));
}

export function serializeBackup(
  profile: UserProfile,
  items: ImpulseItem[],
  subscriptions: SubscriptionItem[] = []
): string {
  const payload: AppBackupPayload = {
    version: 2,
    app: 'PausePay',
    exportedAt: new Date().toISOString(),
    profile,
    items,
    subscriptions,
  };
  return JSON.stringify(payload, null, 2);
}

export function parseBackup(rawJson: string): AppBackupPayload | null {
  try {
    const parsed = JSON.parse(rawJson);
    if (
      !parsed ||
      parsed.app !== 'PausePay' ||
      typeof parsed.version !== 'number' ||
      !parsed.profile ||
      !Array.isArray(parsed.items)
    ) {
      return null;
    }
    return {
      version: parsed.version,
      app: 'PausePay',
      exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : new Date().toISOString(),
      profile: { ...DEFAULT_PROFILE, ...parsed.profile },
      items: parsed.items,
      subscriptions: Array.isArray(parsed.subscriptions) ? parsed.subscriptions : [],
    };
  } catch {
    return null;
  }
}
