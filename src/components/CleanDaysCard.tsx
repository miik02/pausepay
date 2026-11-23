import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { t } from '../constants/i18n';
import { RADIUS, SPACING, TABULAR_NUMS, theme } from '../theme/tokens';
import { CleanStreakStats, LanguageCode } from '../types';

interface CleanDaysCardProps {
  stats: CleanStreakStats;
  lang: LanguageCode;
  onToggleToday: () => Promise<boolean>;
}

export function CleanDaysCard({ stats, lang, onToggleToday }: CleanDaysCardProps) {
  const handlePress = async () => {
    const marked = await onToggleToday();
    if (marked) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{t(lang, 'cleanTitle')}</Text>
          <Text style={styles.meta}>
            {t(lang, 'cleanStreak')}: <Text style={styles.metaStrong}>{stats.currentStreak}{t(lang, 'cleanDaysShort')}</Text>
            {'  ·  '}
            {t(lang, 'cleanBest')}: <Text style={styles.metaStrong}>{stats.bestStreak}{t(lang, 'cleanDaysShort')}</Text>
          </Text>
        </View>

        <Pressable
          style={[styles.toggleBtn, stats.isTodayClean && styles.toggleBtnDone]}
          onPress={handlePress}
        >
          <Ionicons
            name={stats.isTodayClean ? 'checkmark-circle' : 'flame-outline'}
            size={16}
            color={stats.isTodayClean ? '#04150E' : theme.accent}
          />
          <Text style={[styles.toggleText, stats.isTodayClean && styles.toggleTextDone]}>
            {stats.isTodayClean ? t(lang, 'cleanDoneAction') : t(lang, 'cleanTapAction')}
          </Text>
        </Pressable>
      </View>

      <View style={styles.gridWrap}>
        {[0, 1, 2, 3].map((rowIdx) => (
          <View key={rowIdx} style={styles.gridRow}>
            {stats.last28Days.slice(rowIdx * 7, rowIdx * 7 + 7).map((cell) => (
              <View
                key={cell.key}
                style={[
                  styles.cell,
                  cell.clean && styles.cellClean,
                  cell.isToday && styles.cellToday,
                ]}
              />
            ))}
          </View>
        ))}
      </View>

      <Text style={styles.legend}>{t(lang, 'cleanMapLegend')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: theme.border,
    padding: SPACING.md,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  title: {
    color: theme.textPrimary,
    fontSize: 14,
    fontWeight: '800',
  },
  meta: {
    ...TABULAR_NUMS,
    color: theme.textMuted,
    fontSize: 12,
    marginTop: 2,
  },
  metaStrong: {
    color: theme.textPrimary,
    fontWeight: '700',
  },
  toggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: theme.accentDim,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  toggleBtnDone: {
    backgroundColor: theme.accent,
    borderColor: theme.accent,
  },
  toggleText: {
    color: theme.accent,
    fontSize: 11,
    fontWeight: '800',
  },
  toggleTextDone: {
    color: '#04150E',
  },
  gridWrap: {
    gap: 5,
  },
  gridRow: {
    flexDirection: 'row',
    gap: 5,
  },
  cell: {
    flex: 1,
    height: 14,
    borderRadius: 4,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
  },
  cellClean: {
    backgroundColor: theme.accent,
    borderColor: theme.accent,
  },
  cellToday: {
    borderColor: theme.textPrimary,
    borderWidth: 1.5,
  },
  legend: {
    color: theme.textMuted,
    fontSize: 11,
    textAlign: 'right',
    fontWeight: '600',
  },
});
