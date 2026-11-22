import { TextStyle } from 'react-native';

export interface AppTheme {
  mode: 'dark' | 'light';
  bg: string;
  surface: string;
  surfaceElevated: string;
  border: string;
  borderStrong: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentDim: string;
  warning: string;
  warningDim: string;
  danger: string;
  dangerDim: string;
}

export const DARK_THEME: AppTheme = {
  mode: 'dark',
  bg: '#09090B',
  surface: '#121216',
  surfaceElevated: '#1A1A21',
  border: 'rgba(255, 255, 255, 0.08)',
  borderStrong: 'rgba(255, 255, 255, 0.16)',
  textPrimary: '#FAFAFA',
  textSecondary: '#A1A1AA',
  textMuted: '#71717A',
  accent: '#10B981',
  accentDim: 'rgba(16, 185, 129, 0.14)',
  warning: '#F59E0B',
  warningDim: 'rgba(245, 158, 11, 0.14)',
  danger: '#EF4444',
  dangerDim: 'rgba(239, 68, 68, 0.14)',
};

// Preparado para activar en V1.0.1 sin refactorizar pantallas
export const LIGHT_THEME: AppTheme = {
  mode: 'light',
  bg: '#F8F7F4',
  surface: '#FFFFFF',
  surfaceElevated: '#F1F0EC',
  border: 'rgba(9, 9, 11, 0.08)',
  borderStrong: 'rgba(9, 9, 11, 0.16)',
  textPrimary: '#09090B',
  textSecondary: '#52525B',
  textMuted: '#71717A',
  accent: '#059669',
  accentDim: 'rgba(5, 150, 105, 0.12)',
  warning: '#D97706',
  warningDim: 'rgba(217, 119, 6, 0.12)',
  danger: '#DC2626',
  dangerDim: 'rgba(220, 38, 38, 0.12)',
};

export const theme = DARK_THEME;

export const TABULAR_NUMS: TextStyle = {
  fontVariant: ['tabular-nums'],
};

export const SPACING = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

export const RADIUS = {
  sm: 8,
  md: 14,
  lg: 20,
  full: 999,
} as const;
