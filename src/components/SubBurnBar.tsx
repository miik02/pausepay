import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { RADIUS, SPACING, TABULAR_NUMS, theme } from '../theme/tokens';
import { CurrencyCode, SubscriptionItem } from '../types';
import { formatCurrency, getAnnualSubscriptionCost } from '../utils/finance';

interface SubBurnBarProps {
  subscriptions: SubscriptionItem[];
  currency: CurrencyCode;
  title: string;
}

const SEGMENT_COLORS = ['#EF4444', '#F59E0B', '#3B82F6', '#A855F7', '#71717A'];

export function SubBurnBar({ subscriptions, currency, title }: SubBurnBarProps) {
  const breakdown = useMemo(() => {
    const active = subscriptions
      .filter((s) => s.status === 'active')
      .map((s) => ({
        id: s.id,
        name: s.name,
        annual: getAnnualSubscriptionCost(s.price, s.cycle),
      }))
      .filter((s) => s.annual > 0)
      .sort((a, b) => b.annual - a.annual);

    const total = active.reduce((acc, s) => acc + s.annual, 0);
    if (total <= 0) return [];

    const top = active.slice(0, 4);
    const restAnnual = active.slice(4).reduce((acc, s) => acc + s.annual, 0);
    if (restAnnual > 0) {
      top.push({ id: 'others', name: '+', annual: restAnnual });
    }

    return top.map((row, idx) => ({
      ...row,
      pct: Math.max(4, Math.round((row.annual / total) * 100)),
      color: SEGMENT_COLORS[idx % SEGMENT_COLORS.length],
    }));
  }, [subscriptions]);

  if (breakdown.length === 0) return null;

  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>

      <View style={styles.barTrack}>
        {breakdown.map((seg) => (
          <View
            key={seg.id}
            style={[
              styles.barSeg,
              { flex: seg.annual, backgroundColor: seg.color },
            ]}
          />
        ))}
      </View>

      <View style={styles.legendWrap}>
        {breakdown.map((seg) => (
          <View key={seg.id} style={styles.legendItem}>
            <View style={[styles.dot, { backgroundColor: seg.color }]} />
            <Text style={styles.legendName} numberOfLines={1}>
              {seg.name}
            </Text>
            <Text style={styles.legendVal}>
              {formatCurrency(seg.annual, currency, 0)} ({seg.pct}%)
            </Text>
          </View>
        ))}
      </View>
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
  title: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  barTrack: {
    flexDirection: 'row',
    height: 10,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
    gap: 2,
    backgroundColor: theme.bg,
  },
  barSeg: {
    height: '100%',
    borderRadius: 3,
  },
  legendWrap: {
    gap: 6,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.full,
  },
  legendName: {
    flex: 1,
    color: theme.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  legendVal: {
    ...TABULAR_NUMS,
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
});
