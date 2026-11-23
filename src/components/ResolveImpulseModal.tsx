import React from 'react';
import { Image, Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { CATEGORY_META, t } from '../constants/i18n';
import { RADIUS, SPACING, TABULAR_NUMS, theme } from '../theme/tokens';
import { CurrencyCode, ImpulseItem, LanguageCode } from '../types';
import { calculateCostPerUse, formatCurrency } from '../utils/finance';
import { HoldToBuyButton } from './HoldToBuyButton';
import { ScalePressable } from './ScalePressable';

interface ResolveImpulseModalProps {
  item: ImpulseItem | null;
  currency: CurrencyCode;
  lang: LanguageCode;
  onClose: () => void;
  onResist: (item: ImpulseItem) => void;
  onExtend: (item: ImpulseItem) => void;
  onBought: (item: ImpulseItem) => void;
  onDelete: (item: ImpulseItem) => void;
}

export function ResolveImpulseModal({
  item,
  currency,
  lang,
  onClose,
  onResist,
  onExtend,
  onBought,
  onDelete,
}: ResolveImpulseModalProps) {
  const insets = useSafeAreaInsets();
  if (!item) return null;

  const isUnlocked = item.unlockAt <= Date.now();
  const cat = CATEGORY_META[item.category] || CATEGORY_META.other;
  const costPerUse = calculateCostPerUse(item.price, item.estimatedUses);

  const handleResistPress = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onResist(item);
  };

  const handleExtendPress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onExtend(item);
  };

  const handleOpenLink = () => {
    if (!item.productUrl) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const trimmed = item.productUrl.trim();
    const safeUrl = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    Linking.openURL(safeUrl).catch(() => {});
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

          <View style={styles.titleRow}>
            {item.imageUri && (
              <Image source={{ uri: item.imageUri }} style={styles.thumb} />
            )}
            <View style={styles.titleBlock}>
              <View style={styles.catRow}>
                <Ionicons
                  name={cat.icon as React.ComponentProps<typeof Ionicons>['name']}
                  size={14}
                  color={theme.textSecondary}
                />
                <Text style={styles.catText}>{lang === 'es' ? cat.es : cat.en}</Text>
              </View>
              <Text style={styles.itemName} numberOfLines={2}>
                {item.name}
              </Text>
              <Text style={styles.itemPrice}>
                {formatCurrency(item.price, currency, 0)}
                {item.frequency === 'monthly' ? (lang === 'es' ? ' / mes' : ' / mo') : ''}
                {costPerUse !== null
                  ? `  ·  ${formatCurrency(costPerUse, currency, 1)} ${t(lang, 'wishPerUseUnit')}`
                  : ''}
              </Text>
            </View>
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

          {Boolean(item.productUrl) && (
            <Pressable style={styles.linkBtn} onPress={handleOpenLink}>
              <Ionicons name="open-outline" size={15} color={theme.textPrimary} />
              <Text style={styles.linkBtnText}>{t(lang, 'wishOpenLink')}</Text>
            </Pressable>
          )}

          <View style={styles.actions}>
            <ScalePressable style={styles.resistBtn} onPress={handleResistPress}>
              <Ionicons name="shield-checkmark" size={20} color="#04150E" />
              <Text style={styles.resistText}>{t(lang, 'modalResistBtn')}</Text>
            </ScalePressable>

            <ScalePressable style={styles.extendBtn} onPress={handleExtendPress}>
              <Ionicons name="time-outline" size={16} color={theme.warning} />
              <Text style={styles.extendText}>{t(lang, 'modalExtendBtn')}</Text>
            </ScalePressable>

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
    gap: 14,
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumb: {
    width: 62,
    height: 62,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: theme.borderStrong,
  },
  titleBlock: {
    flex: 1,
    gap: 3,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  catText: {
    color: theme.textSecondary,
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  itemName: {
    color: theme.textPrimary,
    fontSize: 20,
    fontWeight: '800',
  },
  itemPrice: {
    ...TABULAR_NUMS,
    color: theme.textSecondary,
    fontSize: 14,
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
  linkBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    borderRadius: RADIUS.md,
    paddingVertical: 11,
  },
  linkBtnText: {
    color: theme.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  actions: {
    gap: 10,
    marginTop: 2,
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
  extendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: theme.warningDim,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    borderRadius: RADIUS.md,
    height: 46,
  },
  extendText: {
    color: theme.warning,
    fontSize: 13,
    fontWeight: '800',
  },
});
