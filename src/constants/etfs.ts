import { CurrencyCode, EtfPresetId, QuarantineHours } from '../types';

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

export const FREE_LIMITS = {
  maxActiveQuarantine: 2,
  maxHistoryItems: 5,
  allowedFreeEtf: 'sp500' as EtfPresetId,
  allowedFreeHorizon: 10,
} as const;
