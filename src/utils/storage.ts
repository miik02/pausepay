import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  AppBackupPayload,
  FreedomGoal,
  ImpulseItem,
  SubscriptionItem,
  TutorialSeenMap,
  UserProfile,
} from '../types';

const PROFILE_KEY = '@pausepay_profile_v1';
const ITEMS_KEY = '@pausepay_items_v1';
const SUBS_KEY = '@pausepay_subs_v1';
const GOALS_KEY = '@pausepay_goals_v1';
const ACTIVE_GOAL_KEY = '@pausepay_active_goal_v1';
const CLEAN_DAYS_KEY = '@pausepay_clean_days_v1';
const TUTORIAL_KEY = '@pausepay_tutorials_v1';

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

export const DEFAULT_GOALS: FreedomGoal[] = [
  {
    id: 'goal-default',
    name: 'Fondo de libertad',
    targetAmount: 1000,
    icon: 'airplane-outline',
  },
];

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

export async function loadGoals(): Promise<{ goals: FreedomGoal[]; activeGoalId: string }> {
  try {
    const [rawGoals, rawActive] = await Promise.all([
      AsyncStorage.getItem(GOALS_KEY),
      AsyncStorage.getItem(ACTIVE_GOAL_KEY),
    ]);
    const parsed = rawGoals ? JSON.parse(rawGoals) : null;
    const goals: FreedomGoal[] =
      Array.isArray(parsed) && parsed.length > 0 ? parsed : DEFAULT_GOALS;
    const activeGoalId =
      rawActive && goals.some((g) => g.id === rawActive) ? rawActive : goals[0].id;
    return { goals, activeGoalId };
  } catch {
    return { goals: DEFAULT_GOALS, activeGoalId: DEFAULT_GOALS[0].id };
  }
}

export async function saveGoals(goals: FreedomGoal[], activeGoalId: string): Promise<void> {
  await Promise.all([
    AsyncStorage.setItem(GOALS_KEY, JSON.stringify(goals)),
    AsyncStorage.setItem(ACTIVE_GOAL_KEY, activeGoalId),
  ]);
}

export async function loadCleanDays(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(CLEAN_DAYS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function saveCleanDays(days: string[]): Promise<void> {
  await AsyncStorage.setItem(CLEAN_DAYS_KEY, JSON.stringify(days));
}

export async function loadTutorialsSeen(): Promise<TutorialSeenMap> {
  try {
    const raw = await AsyncStorage.getItem(TUTORIAL_KEY);
    if (!raw) return {};
    return JSON.parse(raw) || {};
  } catch {
    return {};
  }
}

export async function saveTutorialsSeen(map: TutorialSeenMap): Promise<void> {
  await AsyncStorage.setItem(TUTORIAL_KEY, JSON.stringify(map));
}

export function serializeBackup(
  profile: UserProfile,
  items: ImpulseItem[],
  subscriptions: SubscriptionItem[] = [],
  goals: FreedomGoal[] = DEFAULT_GOALS,
  activeGoalId: string = DEFAULT_GOALS[0].id,
  cleanDays: string[] = []
): string {
  const payload: AppBackupPayload = {
    version: 3,
    app: 'PausePay',
    exportedAt: new Date().toISOString(),
    profile,
    items,
    subscriptions,
    goals,
    activeGoalId,
    cleanDays,
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
    const goals: FreedomGoal[] =
      Array.isArray(parsed.goals) && parsed.goals.length > 0 ? parsed.goals : DEFAULT_GOALS;
    const activeGoalId =
      typeof parsed.activeGoalId === 'string' && goals.some((g) => g.id === parsed.activeGoalId)
        ? parsed.activeGoalId
        : goals[0].id;
    return {
      version: parsed.version,
      app: 'PausePay',
      exportedAt: typeof parsed.exportedAt === 'string' ? parsed.exportedAt : new Date().toISOString(),
      profile: { ...DEFAULT_PROFILE, ...parsed.profile },
      items: parsed.items,
      subscriptions: Array.isArray(parsed.subscriptions) ? parsed.subscriptions : [],
      goals,
      activeGoalId,
      cleanDays: Array.isArray(parsed.cleanDays) ? parsed.cleanDays : [],
    };
  } catch {
    return null;
  }
}
