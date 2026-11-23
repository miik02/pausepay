import React from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORY_META, t } from '../constants/i18n';
import { RADIUS, SPACING, TABULAR_NUMS, theme } from '../theme/tokens';
import { CurrencyCode, ImpulseItem, LanguageCode } from '../types';
import { formatCurrency } from '../utils/finance';
import { HoldToBuyButton } from './HoldToBuyButton';

interface ResolveImpulseModalProps {
  item: ImpulseItem | null;
  currency: CurrencyCode;
  lang: LanguageCode;
  onClose: () => void;
  onResist: (item: ImpulseItem) => void;
  onBought: (item: ImpulseItem) => void;
  onDelete: (item: ImpulseItem) => void;
}

export function ResolveImpulseModal({
  item,
  currency,
  lang,
  onClose,
  onResist,
  onBought,
  onDelete,
}: ResolveImpulseModalProps) {
  const insets = useSafeAreaInsets();
  if (!item) return null;

  const isUnlocked = item.unlockAt <= Date.now();
  const cat = CATEGORY_META[item.category] || CATEGORY_META.other;

  const handleResistPress = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onResist(item);
  };

  return (
    <Modal
      visible={Boolean(item)}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 20) + 12 },
          ]}
        >
          <View style={styles.handle} />

          <View style={styles.topRow}>
            <View style={[styles.statusBadge, isUnlocked ? styles.badgeReady : styles.badgeWait]}>
              <Ionicons
                name={isUnlocked ? 'checkmark-circle' : 'time-outline'}
                size={14}
                color={isUnlocked ? theme.accent : theme.warning}
              />
              <Text
                style={[
                  styles.statusText,
                  { color: isUnlocked ? theme.accent : theme.warning },
                ]}
              >
                {isUnlocked ? t(lang, 'modalUnlocked') : t(lang, 'modalStillLocked')}
              </Text>
            </View>

            <Pressable style={styles.iconBtn} onPress={() => onDelete(item)} hitSlop={10}>
              <Ionicons name="trash-outline" size={18} color={theme.textMuted} />
            </Pressable>
          </View>

          <View style={styles.titleBlock}>
            <View style={styles.catRow}>
              <Ionicons
                name={cat.icon as React.ComponentProps<typeof Ionicons>['name']}
                size={15}
                color={theme.textSecondary}
              />
              <Text style={styles.catText}>{lang === 'es' ? cat.es : cat.en}</Text>
            </View>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemPrice}>
              {formatCurrency(item.price, currency, 0)}
              {item.frequency === 'monthly' ? (lang === 'es' ? ' / mes' : ' / mo') : ''}
            </Text>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>{t(lang, 'modalCostLabel')}</Text>
              <Text style={[styles.metricValue, { color: theme.warning }]}>
                {item.hoursCost.toFixed(1)} h
              </Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>
                {t(lang, 'modalFutureLabel')} ({item.horizonYears} {t(lang, 'simYearsSuffix')})
              </Text>
              <Text style={[styles.metricValue, { color: theme.accent }]}>
                {formatCurrency(item.futureValue, currency, 0)}
              </Text>
            </View>
          </View>

          <View style={styles.actions}>
            <Pressable style={styles.resistBtn} onPress={handleResistPress}>
              <Ionicons name="shield-checkmark" size={20} color="#04150E" />
              <Text style={styles.resistText}>{t(lang, 'modalResistBtn')}</Text>
            </Pressable>

            <HoldToBuyButton
              idleLabel={t(lang, 'modalHoldHint')}
              holdingLabel={t(lang, 'modalHolding')}
              releasedEarlyLabel={t(lang, 'modalReleasedEarly')}
              onConfirm={() => onBought(item)}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
  },
  sheet: {
    backgroundColor: theme.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: theme.borderStrong,
    paddingHorizontal: SPACING.lg,
    paddingTop: 10,
    gap: 16,
  },
  handle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: RADIUS.full,
    backgroundColor: theme.borderStrong,
    marginBottom: 4,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  badgeReady: {
    backgroundColor: theme.accentDim,
  },
  badgeWait: {
    backgroundColor: theme.warningDim,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '700',
  },
  iconBtn: {
    padding: 6,
    borderRadius: RADIUS.full,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
  },
  titleBlock: {
    gap: 4,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  catText: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  itemName: {
    color: theme.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
  itemPrice: {
    ...TABULAR_NUMS,
    color: theme.textSecondary,
    fontSize: 18,
    fontWeight: '700',
  },
  metricsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: theme.bg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 12,
    gap: 4,
  },
  metricLabel: {
    color: theme.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  metricValue: {
    ...TABULAR_NUMS,
    fontSize: 20,
    fontWeight: '800',
  },
  actions: {
    gap: 10,
    marginTop: 4,
  },
  resistBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.accent,
    borderRadius: RADIUS.md,
    height: 54,
  },
  resistText: {
    color: '#04150E',
    fontSize: 16,
    fontWeight: '800',
  },
});
