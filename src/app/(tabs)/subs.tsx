import React, { useCallback, useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { AddSubscriptionModal } from '../../components/AddSubscriptionModal';
import { AnimatedNumber } from '../../components/AnimatedNumber';
import { ContextualTipModal } from '../../components/ContextualTipModal';
import { ScalePressable } from '../../components/ScalePressable';
import { ShareStoryModal } from '../../components/ShareStoryModal';
import { StoryPayload } from '../../components/StoryCard';
import { SubBurnBar } from '../../components/SubBurnBar';
import {
  CelebrationPayload,
  VaultCelebrationModal,
} from '../../components/VaultCelebrationModal';
import { FREE_LIMITS } from '../../constants/etfs';
import { CATEGORY_META, t } from '../../constants/i18n';
import { useApp } from '../../context/AppContext';
import { useDialog } from '../../context/DialogContext';
import { RADIUS, SPACING, TABULAR_NUMS, theme } from '../../theme/tokens';
import { SubscriptionItem } from '../../types';
import {
  calculateLifeCost,
  formatCurrency,
  getAnnualSubscriptionCost,
} from '../../utils/finance';
import { openSystemSettings, scheduleSubscriptionAlert } from '../../utils/notifications';

export default function SubsScreen() {
  const insets = useSafeAreaInsets();
  const { showDialog } = useDialog();
  const {
    profile,
    subscriptions,
    hourlyRate,
    subStats,
    tutorialsSeen,
    markTutorialSeen,
    isPro,
    addSubscription,
    updateSubscription,
    renewSubscription,
    cancelSubscriptionAndRescue,
    deleteSubscription,
  } = useApp();
  const lang = profile.language;

  const [modalVisible, setModalVisible] = useState(false);
  const [editingSub, setEditingSub] = useState<SubscriptionItem | null>(null);
  const [celebration, setCelebration] = useState<CelebrationPayload | null>(null);
  const [sharePayload, setSharePayload] = useState<StoryPayload | null>(null);
  const [showTip, setShowTip] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (tutorialsSeen.subs) return;
      const timer = setTimeout(() => setShowTip(true), 350);
      return () => clearTimeout(timer);
    }, [tutorialsSeen.subs])
  );

  const activeSubs = useMemo(
    () =>
      subscriptions
        .filter((s) => s.status === 'active')
        .sort((a, b) => a.nextBillingAt - b.nextBillingAt),
    [subscriptions]
  );

  const cancelledSubs = useMemo(
    () => subscriptions.filter((s) => s.status === 'cancelled'),
    [subscriptions]
  );

  const okLabel = lang === 'es' ? 'Entendido' : 'Got it';

  const handleOpenAdd = () => {
    if (!isPro && subStats.activeCount >= FREE_LIMITS.maxActiveSubscriptions) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      showDialog({
        title: t(lang, 'subsLimitTitle'),
        message: t(lang, 'subsLimitMsg'),
        icon: 'lock-closed',
        tone: 'warning',
        actions: [{ label: okLabel, variant: 'warning' }],
      });
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setEditingSub(null);
    setModalVisible(true);
  };

  const handleSubSubmit = async (sub: SubscriptionItem, isEdit: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    const { notificationId, permissionDenied } = await scheduleSubscriptionAlert(
      sub,
      profile.currency,
      lang
    );

    if (isEdit) {
      await updateSubscription({ ...sub, notificationId });
    } else {
      await addSubscription({ ...sub, notificationId });
    }

    if (permissionDenied) {
      setTimeout(() => {
        showDialog({
          title: t(lang, 'notifDeniedTitle'),
          message: t(lang, 'notifDeniedMsg'),
          icon: 'notifications-off-outline',
          tone: 'warning',
          actions: [
            { label: t(lang, 'notifOpenSettings'), variant: 'primary', onPress: openSystemSettings },
            { label: t(lang, 'notifContinue'), variant: 'secondary' },
          ],
        });
      }, 200);
    }
  };

  const handleRenewCycle = async (sub: SubscriptionItem) => {
    const daysToAdd = sub.cycle === 'yearly' ? 365 : 30;
    const base = Math.max(Date.now(), sub.nextBillingAt);
    const nextBillingAt = base + daysToAdd * 24 * 3600 * 1000;
    const { notificationId } = await scheduleSubscriptionAlert(
      { ...sub, nextBillingAt },
      profile.currency,
      lang
    );
    await renewSubscription(sub.id, nextBillingAt, notificationId);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    showDialog({
      title: t(lang, 'subsRenewedTitle'),
      message: t(lang, 'subsRenewedMsg'),
      icon: 'refresh-circle',
      tone: 'accent',
      actions: [{ label: okLabel, variant: 'primary' }],
    });
  };

  const handleManageSub = (sub: SubscriptionItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const annual = getAnnualSubscriptionCost(sub.price, sub.cycle);
    const hrs = calculateLifeCost(annual, hourlyRate).hours;
    const summaryLine = `${formatCurrency(annual, profile.currency, 0)}/yr · ${hrs.toFixed(1)} h`;

    showDialog({
      title: sub.name,
      message: `${summaryLine}\n\n${t(lang, 'subsActionMsg')}`,
      icon: 'shield-checkmark',
      tone: 'accent',
      actions: [
        {
          label: t(lang, 'subsActionRescue'),
          variant: 'primary',
          onPress: async () => {
            const rescued = await cancelSubscriptionAndRescue(sub.id);
            if (rescued) {
              setCelebration({
                item: rescued,
                amountSaved: annual,
                hoursSaved: rescued.hoursCost,
                futureValue: rescued.futureValue,
                isSubscription: true,
              });
            }
          },
        },
        {
          label: t(lang, 'subsActionRenew'),
          variant: 'secondary',
          onPress: () => handleRenewCycle(sub),
        },
        {
          label: t(lang, 'subsActionEdit'),
          variant: 'secondary',
          onPress: () => {
            setEditingSub(sub);
            setModalVisible(true);
          },
        },
        {
          label: t(lang, 'subsActionDelete'),
          variant: 'danger',
          onPress: () => deleteSubscription(sub.id),
        },
      ],
    });
  };

  const handleDeleteCancelled = (sub: SubscriptionItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    showDialog({
      title: t(lang, 'vaultDeleteTitle'),
      message: t(lang, 'vaultDeleteMsg'),
      icon: 'trash-outline',
      tone: 'danger',
      actions: [
        {
          label: t(lang, 'vaultDeleteConfirm'),
          variant: 'danger',
          onPress: () => deleteSubscription(sub.id),
        },
        { label: t(lang, 'vaultCancel'), variant: 'secondary' },
      ],
    });
  };

  const getCycleLabel = (cycle: SubscriptionItem['cycle']) => {
    if (cycle === 'monthly') return t(lang, 'subsCycleMonthly');
    if (cycle === 'yearly') return t(lang, 'subsCycleYearly');
    return t(lang, 'subsCycleTrial');
  };

  const getDaysUntil = (ts: number) => Math.max(0, Math.ceil((ts - Date.now()) / (24 * 3600 * 1000)));

  return (
    <View style={styles.root}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 12, paddingBottom: 36 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Text style={styles.title}>{t(lang, 'subsTitle')}</Text>
          <ScalePressable style={styles.addBtn} onPress={handleOpenAdd}>
            <Ionicons name="add" size={16} color="#04150E" />
            <Text style={styles.addBtnText}>{t(lang, 'subsAddBtn')}</Text>
          </ScalePressable>
        </View>

        <View style={styles.heroCard}>
          <Text style={styles.heroKicker}>{t(lang, 'subsHeroKicker')}</Text>
          <AnimatedNumber
            value={subStats.yearlyBurn}
            format={(v) => formatCurrency(v, profile.currency, 0)}
            style={styles.heroValue}
            numberOfLines={1}
            adjustsFontSizeToFit
          />
          <Text style={styles.heroSub}>
            {formatCurrency(subStats.monthlyBurn, profile.currency, 1)} {t(lang, 'subsMonthlyEq')}
          </Text>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatItem}>
              <AnimatedNumber
                value={subStats.yearlyHours}
                format={(v) => `${v.toFixed(1)} h`}
                style={[styles.heroStatNum, { color: theme.warning }]}
              />
              <Text style={styles.heroStatLbl}>{t(lang, 'subsYearlyHours')}</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStatItem}>
              <AnimatedNumber
                value={subStats.tenYearOpportunityCost}
                format={(v) => formatCurrency(v, profile.currency, 0)}
                style={[styles.heroStatNum, { color: theme.accent }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              />
              <Text style={styles.heroStatLbl}>{t(lang, 'subsTenYearCost')}</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatNum}>
                {subStats.activeCount}
                {!isPro ? `/${FREE_LIMITS.maxActiveSubscriptions}` : ''}
              </Text>
              <Text style={styles.heroStatLbl}>{t(lang, 'subsActiveCount')}</Text>
            </View>
          </View>
        </View>

        <SubBurnBar
          subscriptions={activeSubs}
          currency={profile.currency}
          title={t(lang, 'subsBurnTitle')}
        />

        <Text style={styles.sectionTitle}>
          {t(lang, 'subsSectionActive')} ({activeSubs.length})
        </Text>

        {activeSubs.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="repeat-outline" size={28} color={theme.textMuted} />
            <Text style={styles.emptyText}>{t(lang, 'subsEmpty')}</Text>
          </View>
        ) : (
          activeSubs.map((sub) => {
            const cat = CATEGORY_META[sub.category] || CATEGORY_META.other;
            const days = getDaysUntil(sub.nextBillingAt);
            const isUrgent = days <= 3;
            const annual = getAnnualSubscriptionCost(sub.price, sub.cycle);
            const hrs = calculateLifeCost(annual, hourlyRate).hours;

            return (
              <ScalePressable
                key={sub.id}
                scaleTo={0.98}
                style={[styles.subCard, isUrgent && styles.subCardUrgent]}
                onPress={() => handleManageSub(sub)}
              >
                <View style={styles.subTop}>
                  <View style={styles.subLeft}>
                    <View style={styles.iconBox}>
                      <Ionicons
                        name={cat.icon as React.ComponentProps<typeof Ionicons>['name']}
                        size={16}
                        color={isUrgent ? theme.danger : theme.warning}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.subName} numberOfLines={1}>
                        {sub.name}
                      </Text>
                      <Text style={styles.subMeta}>
                        {getCycleLabel(sub.cycle)} · {hrs.toFixed(1)} h/yr
                      </Text>
                    </View>
                  </View>

                  <View style={styles.subRight}>
                    <Text style={styles.subPrice}>
                      {formatCurrency(sub.price, profile.currency, 2)}
                    </Text>
                    <Text style={styles.subAnnual}>
                      {formatCurrency(annual, profile.currency, 0)}/yr
                    </Text>
                  </View>
                </View>

                <View style={styles.subFooter}>
                  <View
                    style={[
                      styles.duePill,
                      isUrgent ? styles.duePillUrgent : styles.duePillNormal,
                    ]}
                  >
                    <Ionicons
                      name={isUrgent ? 'alert-circle' : 'notifications-outline'}
                      size={12}
                      color={isUrgent ? theme.danger : theme.accent}
                    />
                    <Text
                      style={[
                        styles.dueText,
                        { color: isUrgent ? theme.danger : theme.accent },
                      ]}
                    >
                      {days === 0
                        ? t(lang, 'subsDueToday')
                        : `${t(lang, 'subsDueInDays')} ${days} ${t(lang, 'subsDaysUnit')}`}
                    </Text>
                  </View>

                  <Text style={styles.badgeNote}>
                    {isUrgent ? t(lang, 'subsUrgentBadge') : t(lang, 'subsAlertBadge')} ›
                  </Text>
                </View>
              </ScalePressable>
            );
          })
        )}

        {cancelledSubs.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>
              {t(lang, 'subsSectionCancelled')} ({cancelledSubs.length})
            </Text>
            {cancelledSubs.map((sub) => (
              <Pressable
                key={sub.id}
                style={styles.cancelledCard}
                onPress={() => handleDeleteCancelled(sub)}
              >
                <View style={styles.cancelledLeft}>
                  <Ionicons name="checkmark-circle" size={16} color={theme.accent} />
                  <Text style={styles.cancelledName}>{sub.name}</Text>
                </View>
                <Text style={styles.cancelledSaved}>
                  +{formatCurrency(getAnnualSubscriptionCost(sub.price, sub.cycle), profile.currency, 0)}/yr
                </Text>
              </Pressable>
            ))}
          </>
        )}
      </ScrollView>

      <AddSubscriptionModal
        visible={modalVisible}
        editingSub={editingSub}
        currency={profile.currency}
        lang={lang}
        hourlyRate={hourlyRate}
        onClose={() => {
          setModalVisible(false);
          setEditingSub(null);
        }}
        onSubmit={handleSubSubmit}
      />

      <VaultCelebrationModal
        payload={celebration}
        currency={profile.currency}
        lang={lang}
        onClose={() => setCelebration(null)}
        onShare={(item) => {
          setCelebration(null);
          setTimeout(() => setSharePayload({ mode: 'impulse', item }), 190);
        }}
      />

      <ShareStoryModal
        payload={sharePayload}
        currency={profile.currency}
        lang={lang}
        isPro={isPro}
        onClose={() => setSharePayload(null)}
      />

      <ContextualTipModal
        visible={showTip}
        title={t(lang, 'tipSubsTitle')}
        body={t(lang, 'tipSubsBody')}
        actionLabel={t(lang, 'tipGotIt')}
        arrowLeftPercent="62%"
        onDismiss={() => {
          setShowTip(false);
          markTutorialSeen('subs');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  content: {
    paddingHorizontal: SPACING.md,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: theme.textPrimary,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.accent,
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  addBtnText: {
    color: '#04150E',
    fontSize: 13,
    fontWeight: '800',
  },
  heroCard: {
    backgroundColor: theme.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.28)',
    padding: SPACING.lg,
    alignItems: 'center',
    gap: 4,
  },
  heroKicker: {
    color: theme.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  heroValue: {
    color: theme.danger,
    fontSize: 40,
    fontWeight: '800',
  },
  heroSub: {
    ...TABULAR_NUMS,
    color: theme.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  heroStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginTop: 12,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: theme.border,
  },
  heroStatItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  heroStatNum: {
    color: theme.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  heroStatLbl: {
    color: theme.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  heroDivider: {
    width: 1,
    height: 26,
    backgroundColor: theme.border,
  },
  sectionTitle: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginTop: 4,
  },
  emptyCard: {
    backgroundColor: theme.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: theme.border,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: 10,
  },
  emptyText: {
    color: theme.textMuted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  subCard: {
    backgroundColor: theme.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: theme.border,
    padding: SPACING.md,
    gap: 12,
  },
  subCardUrgent: {
    borderColor: 'rgba(239, 68, 68, 0.45)',
  },
  subTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  subLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  subName: {
    color: theme.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  subMeta: {
    ...TABULAR_NUMS,
    color: theme.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  subRight: {
    alignItems: 'flex-end',
  },
  subPrice: {
    ...TABULAR_NUMS,
    color: theme.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  subAnnual: {
    ...TABULAR_NUMS,
    color: theme.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  subFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  duePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
  },
  duePillNormal: {
    backgroundColor: theme.accentDim,
  },
  duePillUrgent: {
    backgroundColor: theme.dangerDim,
  },
  dueText: {
    ...TABULAR_NUMS,
    fontSize: 11,
    fontWeight: '700',
  },
  badgeNote: {
    color: theme.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  cancelledCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.2)',
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
  },
  cancelledLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cancelledName: {
    color: theme.textSecondary,
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'line-through',
  },
  cancelledSaved: {
    ...TABULAR_NUMS,
    color: theme.accent,
    fontSize: 13,
    fontWeight: '800',
  },
});
