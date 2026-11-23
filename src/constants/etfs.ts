import { BillingCycle, CurrencyCode, EtfPresetId, ImpulseCategory, QuarantineHours } from '../types';

export interface EtfPreset {
  id: EtfPresetId;
  label: string;
  shortLabel: string;
  rate: number;
  proOnly: boolean;
}

export const ETF_PRESETS: EtfPreset[] = [
  { id: 'sp500', label: 'S&P 500 (hist.)', shortLabel: 'S&P 500', rate: 10, proOnly: false },
  { id: 'msci_world', label: 'MSCI World (hist.)', shortLabel: 'MSCI', rate: 8, proOnly: true },
  { id: 'conservative', label: 'Cartera 60/40', shortLabel: '60/40', rate: 5, proOnly: true },
  { id: 'savings', label: 'Cuenta Remunerada', shortLabel: '3% Fijo', rate: 3, proOnly: true },
  { id: 'custom', label: 'Personalizado', shortLabel: 'Custom', rate: 7, proOnly: true },
];

export const HORIZON_OPTIONS = [5, 10, 20, 30] as const;

export const QUARANTINE_OPTIONS: { hours: QuarantineHours; labelEs: string; labelEn: string }[] = [
  { hours: 24, labelEs: '24 horas', labelEn: '24 hours' },
  { hours: 48, labelEs: '48 horas', labelEn: '48 hours' },
  { hours: 72, labelEs: '72 horas', labelEn: '72 hours' },
  { hours: 168, labelEs: '7 días', labelEn: '7 days' },
];

export const CURRENCIES: Record<CurrencyCode, { symbol: string; label: string; suffix: boolean }> = {
  EUR: { symbol: '€', label: 'Euro (€)', suffix: true },
  USD: { symbol: '$', label: 'US Dollar ($)', suffix: false },
  GBP: { symbol: '£', label: 'British Pound (£)', suffix: false },
};

export interface SubPreset {
  name: string;
  price: number;
  cycle: BillingCycle;
  category: ImpulseCategory;
  daysAhead: number;
}

export const SUB_PRESETS: SubPreset[] = [
  { name: 'Netflix', price: 13.99, cycle: 'monthly', category: 'entertainment', daysAhead: 15 },
  { name: 'Spotify', price: 10.99, cycle: 'monthly', category: 'entertainment', daysAhead: 15 },
  { name: 'Gym', price: 39.9, cycle: 'monthly', category: 'other', daysAhead: 30 },
  { name: 'Amazon Prime', price: 49.9, cycle: 'yearly', category: 'home', daysAhead: 30 },
  { name: 'ChatGPT / IA', price: 22, cycle: 'monthly', category: 'tech', daysAhead: 14 },
  { name: 'Free Trial', price: 19.99, cycle: 'trial', category: 'tech', daysAhead: 7 },
];

export const FREE_LIMITS = {
  maxActiveQuarantine: 2,
  maxHistoryItems: 5,
  maxActiveSubscriptions: 3,
  allowedFreeEtf: 'sp500' as EtfPresetId,
  allowedFreeHorizon: 10,
} as const;
