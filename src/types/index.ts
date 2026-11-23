export type CurrencyCode = 'EUR' | 'USD' | 'GBP';
export type LanguageCode = 'es' | 'en';
export type EtfPresetId = 'savings' | 'conservative' | 'msci_world' | 'sp500' | 'custom';
export type PurchaseFrequency = 'once' | 'monthly';
export type QuarantineHours = 24 | 48 | 72 | 168;
export type ImpulseStatus = 'quarantine' | 'resisted' | 'bought';
export type BillingCycle = 'monthly' | 'yearly' | 'trial';
export type SubscriptionStatus = 'active' | 'cancelled';
export type TutorialTabKey = 'simulate' | 'vault' | 'subs';

export type ImpulseCategory =
  | 'tech'
  | 'fashion'
  | 'food'
  | 'entertainment'
  | 'home'
  | 'other';

export interface UserProfile {
  monthlyNetIncome: number;
  weeklyHours: number;
  commuteWeeklyHours: number;
  currency: CurrencyCode;
  language: LanguageCode;
  onboardingCompleted: boolean;
  defaultEtf: EtfPresetId;
  customRate: number;
}

export interface ImpulseItem {
  id: string;
  name: string;
  price: number;
  frequency: PurchaseFrequency;
  category: ImpulseCategory;
  etfId: EtfPresetId;
  annualRate: number;
  horizonYears: number;
  hoursCost: number;
  futureValue: number;
  status: ImpulseStatus;
  createdAt: number;
  unlockAt: number;
  resolvedAt?: number;
  notificationId?: string;
  productUrl?: string;
  imageUri?: string;
  estimatedUses?: number;
}

export interface SubscriptionItem {
  id: string;
  name: string;
  price: number;
  cycle: BillingCycle;
  category: ImpulseCategory;
  nextBillingAt: number;
  status: SubscriptionStatus;
  createdAt: number;
  cancelledAt?: number;
  notificationId?: string;
}

export interface FreedomGoal {
  id: string;
  name: string;
  targetAmount: number;
  icon: string;
}

export type TutorialSeenMap = Partial<Record<TutorialTabKey, boolean>>;

export interface GrowthPoint {
  year: number;
  principal: number;
  total: number;
}

export interface VaultStats {
  totalResisted: number;
  totalFutureSaved: number;
  freedomHours: number;
  freedomDays: number;
  resistanceRate: number;
  activeCount: number;
  resistedCount: number;
  boughtCount: number;
}

export interface SubStats {
  monthlyBurn: number;
  yearlyBurn: number;
  yearlyHours: number;
  tenYearOpportunityCost: number;
  activeCount: number;
  urgentCount: number;
  cancelledCount: number;
}

export interface CleanDayCell {
  key: string;
  clean: boolean;
  isToday: boolean;
}

export interface CleanStreakStats {
  currentStreak: number;
  bestStreak: number;
  isTodayClean: boolean;
  totalCleanDays: number;
  last28Days: CleanDayCell[];
}

export interface AppBackupPayload {
  version: number;
  app: 'PausePay';
  exportedAt: string;
  profile: UserProfile;
  items: ImpulseItem[];
  subscriptions?: SubscriptionItem[];
  goals?: FreedomGoal[];
  activeGoalId?: string;
  cleanDays?: string[];
}
