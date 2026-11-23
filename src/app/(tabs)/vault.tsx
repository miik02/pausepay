import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { ResolveImpulseModal } from '../../components/ResolveImpulseModal';
import { ShareStoryModal } from '../../components/ShareStoryModal';
import { StoryPayload } from '../../components/StoryCard';
import { FREE_LIMITS } from '../../constants/etfs';
import { CATEGORY_META, t } from '../../constants/i18n';
import { useApp } from '../../context/AppContext';
import { RADIUS, SPACING, TABULAR_NUMS, theme } from '../../theme/tokens';
import { ImpulseCategory, ImpulseItem, ImpulseStatus } from '../../types';
import { formatCurrency } from '../../utils/finance';

function formatCountdown(remainingMs: number, lang: 'es' | 'en'): string {
  if (remainingMs <= 0) return t(lang, 'vaultReady');
  const totalMinutes = Math.ceil(remainingMs / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const mins = totalMinutes % 60;

  if (days > 0) return `${t(lang, 'vaultUnlockIn')} ${days}d ${hours}h`;
  if (hours > 0) return `${t(lang, 'vaultUnlockIn')} ${hours}h ${mins}m`;
  return `${t(lang, 'vaultUnlockIn')} ${mins}m`;
}

export default function VaultScreen() {
  const insets = useSafeAreaInsets();
  const { profile, items, vaultStats, isPro, resolveImpulse, deleteImpulse } = useApp();
  const lang = profile.language;

  const [tab, setTab] = useState<ImpulseStatus>('quarantine');
  const [selectedItem, setSelectedItem] = useState<ImpulseItem | null>(null);
  const [sharePayload, setSharePayload] = useState<StoryPayload | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [victoryInfo, setVictoryInfo] = useState<{
    item: ImpulseItem;
    amount: number;
    hours: number;
  } | null>(null);

  const bannerAnim = useRef(new Animated.Value(0)).current;
  const bannerTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 15000);
    return () => {
      clearInterval(interval);
      if (bannerTimer.current) clearTimeout(bannerTimer.current);
    };
  }, []);

  const showVictoryBanner = (item: ImpulseItem, amount: number, hours: number) => {
    if (bannerTimer.current) clearTimeout(bannerTimer.current);
    setVictoryInfo({ item, amount, hours });
    bannerAnim.setValue(0);
    Animated.spring(bannerAnim, {
      toValue: 1,
      useNativeDriver: true,
      damping: 16,
      stiffness: 180,
    }).start();

    bannerTimer.current = setTimeout(() => {
      Animated.timing(bannerAnim, {
        toValue: 0,
        duration: 240,
        useNativeDriver: true,
      }).start(() => setVictoryInfo(null));
    }, 5500);
  };

  const filteredItems = useMemo(
    () => items.filter((item) => item.status === tab),
    [items, tab]
  );

  const visibleItems = useMemo(() => {
    if (tab === 'quarantine' || isPro) return filteredItems;
    return filteredItems.slice(0, FREE_LIMITS.maxHistoryItems);
  }, [filteredItems, tab, isPro]);

  const hiddenHistoryCount = Math.max(0, filteredItems.length - visibleItems.length);

  const categoryBreakdown = useMemo(() => {
    const totals: Partial<Record<ImpulseCategory, number>> = {};
    let grandTotal = 0;
    for (const item of items) {
      if (item.status !== 'resisted') continue;
      const val = item.frequency === 'monthly' ? item.price * 12 : item.price;
      totals[item.category] = (totals[item.category] || 0) + val;
      grandTotal += val;
    }
    if (grandTotal <= 0) return [];
    return (Object.entries(totals) as [ImpulseCategory, number][])
      .map(([cat, amount]) => ({
        cat,
        amount,
        pct: Math.round((amount / grandTotal) * 100),
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 4);
  }, [items]);

  const handleResist = async (item: ImpulseItem) => {
    setSelectedItem(null);
    await resolveImpulse(item.id, 'resisted');
    const savedNow = item.frequency === 'monthly' ? item.price * 12 : item.price;
    showVictoryBanner({ ...item, status: 'resisted' }, savedNow, item.hoursCost);
  };

  const handleBought = async (item: ImpulseItem) => {
    setSelectedItem(null);
    await resolveImpulse(item.id, 'bought');
  };

  const confirmDelete = (item: ImpulseItem) => {
    Alert.alert(t(lang, 'vaultDeleteTitle'), t(lang, 'vaultDeleteMsg'), [
      { text: t(lang, 'vaultCancel'), style: 'cancel' },
      {
        text: t(lang, 'vaultDeleteConfirm'),
        style: 'destructive',
        onPress: async () => {
          setSelectedItem(null);
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
          await deleteImpulse(item.id);
        },
      },
    ]);
  };

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
          <Text style={styles.title}>{t(lang, 'vaultTitle')}</Text>
          <Pressable
            style={styles.shareHeroBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setSharePayload({ mode: 'vault', stats: vaultStats });
            }}
          >
            <Ionicons name="share-outline" size={15} color={theme.accent} />
            <Text style={styles.shareHeroText}>{t(lang, 'vaultShareBtn')}</Text>
          </Pressable>
        </View>

        {victoryInfo && (
          <Animated.View
            style={[
              styles.victoryBanner,
              {
                opacity: bannerAnim,
                transform: [
                  {
                    scale: bannerAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.94, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={styles.victoryInner}>
              <Ionicons name="sparkles" size={20} color={theme.accent} />
              <View style={{ flex: 1 }}>
                <Text style={styles.victoryTitle}>{t(lang, 'victoryTitle')}</Text>
                <Text style={styles.victorySub}>
                  +{formatCurrency(victoryInfo.amount, profile.currency, 0)} · +{victoryInfo.hours.toFixed(1)}h {t(lang, 'victorySub')}
                </Text>
              </View>
              <Pressable
                style={styles.victoryShareBtn}
                onPress={() => {
                  const target = victoryInfo.item;
                  setVictoryInfo(null);
                  setSharePayload({ mode: 'impulse', item: target });
                }}
              >
                <Ionicons name="share-social-outline" size={14} color="#04150E" />
                <Text style={styles.victoryShareText}>{t(lang, 'victoryShareAction')}</Text>
              </Pressable>
            </View>
          </Animated.View>
        )}

        <View style={styles.heroCard}>
          <Text style={styles.heroKicker}>{t(lang, 'vaultRescued')}</Text>
          <Text style={styles.heroValue}>
            {formatCurrency(vaultStats.totalResisted, profile.currency, 0)}
          </Text>

          <View style={styles.heroStatsRow}>
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatNum}>
                {formatCurrency(vaultStats.totalFutureSaved, profile.currency, 0)}
              </Text>
              <Text style={styles.heroStatLbl}>{t(lang, 'vaultFutureRescued')}</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatNum}>{vaultStats.freedomDays.toFixed(1)} d</Text>
              <Text style={styles.heroStatLbl}>{t(lang, 'vaultFreedom')}</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStatItem}>
              <Text style={styles.heroStatNum}>{vaultStats.resistanceRate}%</Text>
              <Text style={styles.heroStatLbl}>{t(lang, 'vaultResistance')}</Text>
            </View>
          </View>
        </View>

        <View style={styles.segmentBar}>
          {(
            [
              { key: 'quarantine', label: t(lang, 'vaultTabActive'), count: vaultStats.activeCount },
              { key: 'resisted', label: t(lang, 'vaultTabResisted'), count: vaultStats.resistedCount },
              { key: 'bought', label: t(lang, 'vaultTabBought'), count: vaultStats.boughtCount },
            ] as const
          ).map((entry) => {
            const active = tab === entry.key;
            return (
              <Pressable
                key={entry.key}
                style={[styles.segmentTab, active && styles.segmentTabActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  setTab(entry.key);
                }}
              >
                <Text style={[styles.segmentTabText, active && styles.segmentTabTextActive]}>
                  {entry.label} ({entry.count})
                </Text>
              </Pressable>
            );
          })}
        </View>

        {visibleItems.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons
              name={
                tab === 'quarantine'
                  ? 'shield-outline'
                  : tab === 'resisted'
                    ? 'trophy-outline'
                    : 'checkmark-done-outline'
              }
              size={28}
              color={theme.textMuted}
            />
            <Text style={styles.emptyText}>
              {tab === 'quarantine'
                ? t(lang, 'vaultEmptyActive')
                : tab === 'resisted'
                  ? t(lang, 'vaultEmptyResisted')
                  : t(lang, 'vaultEmptyBought')}
            </Text>
          </View>
        ) : (
          visibleItems.map((item) => {
            const cat = CATEGORY_META[item.category] || CATEGORY_META.other;
            const totalDuration = Math.max(1, item.unlockAt - item.createdAt);
            const remainingMs = Math.max(0, item.unlockAt - now);
            const elapsedRatio = Math.min(1, Math.max(0, (now - item.createdAt) / totalDuration));
            const isReady = remainingMs <= 0;

            return (
              <Pressable
                key={item.id}
                style={[
                  styles.itemCard,
                  item.status === 'quarantine' && (isReady ? styles.itemCardReady : styles.itemCardQuarantine),
                  item.status === 'resisted' && styles.itemCardResisted,
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  if (item.status === 'quarantine') {
                    setSelectedItem(item);
                  } else if (item.status === 'resisted') {
                    setSharePayload({ mode: 'impulse', item });
                  } else {
                    confirmDelete(item);
                  }
                }}
              >
                <View style={styles.itemHeader}>
                  <View style={styles.itemTitleWrap}>
                    <View style={styles.catIconBox}>
                      <Ionicons
                        name={cat.icon as React.ComponentProps<typeof Ionicons>['name']}
                        size={16}
                        color={
                          item.status === 'resisted'
                            ? theme.accent
                            : item.status === 'bought'
                              ? theme.danger
                              : isReady
                                ? theme.accent
                                : theme.warning
                        }
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemName} numberOfLines={1}>
                        {item.name}
                      </Text>
                      <Text style={styles.itemMeta}>
                        {item.hoursCost.toFixed(1)} h · {formatCurrency(item.futureValue, profile.currency, 0)} ({item.horizonYears}{t(lang, 'simYearsSuffix')[0]})
                      </Text>
                    </View>
                  </View>

                  <View style={styles.rightActions}>
                    <Text
                      style={[
                        styles.itemPrice,
                        item.status === 'resisted' && { color: theme.accent },
                        item.status === 'bought' && { color: theme.textSecondary },
                      ]}
                    >
                      {formatCurrency(item.price, profile.currency, 0)}
                      {item.frequency === 'monthly' ? '/m' : ''}
                    </Text>

                    {item.status === 'resisted' && (
                      <View style={styles.inlineBtns}>
                        <Pressable
                          style={styles.miniIconBtn}
                          onPress={() => setSharePayload({ mode: 'impulse', item })}
                          hitSlop={8}
                        >
                          <Ionicons name="share-outline" size={14} color={theme.accent} />
                        </Pressable>
                        <Pressable
                          style={styles.miniIconBtn}
                          onPress={() => confirmDelete(item)}
                          hitSlop={8}
                        >
                          <Ionicons name="trash-outline" size={14} color={theme.textMuted} />
                        </Pressable>
                      </View>
                    )}
                  </View>
                </View>

                {item.status === 'quarantine' && (
                  <View style={styles.progressWrap}>
                    <View style={styles.progressTrack}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${Math.max(4, Math.round(elapsedRatio * 100))}%`,
                            backgroundColor: isReady ? theme.accent : theme.warning,
                          },
                        ]}
                      />
                    </View>
                    <View style={styles.progressFooter}>
                      <Text
                        style={[
                          styles.itemTimer,
                          { color: isReady ? theme.accent : theme.warning },
                        ]}
                      >
                        {formatCountdown(remainingMs, lang)}
                      </Text>
                      <Text style={styles.tapHint}>{t(lang, 'vaultTapToResolve')} ›</Text>
                    </View>
                  </View>
                )}
              </Pressable>
            );
          })
        )}

        {hiddenHistoryCount > 0 && (
          <View style={styles.lockedHistoryCard}>
            <Ionicons name="lock-closed" size={18} color={theme.warning} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.lockedTitle}>{t(lang, 'vaultHistoryLockedTitle')}</Text>
              <Text style={styles.lockedSub}>
                +{hiddenHistoryCount} {t(lang, 'vaultHistoryLockedSub')}
              </Text>
            </View>
          </View>
        )}

        {categoryBreakdown.length > 0 && (
          <View style={styles.breakdownCard}>
            <Text style={styles.sectionTitle}>{t(lang, 'vaultCategoriesTitle')}</Text>
            {categoryBreakdown.map((row) => {
              const meta = CATEGORY_META[row.cat] || CATEGORY_META.other;
              return (
                <View key={row.cat} style={styles.catBarRow}>
                  <View style={styles.catBarTop}>
                    <View style={styles.catBarLeft}>
                      <Ionicons
                        name={meta.icon as React.ComponentProps<typeof Ionicons>['name']}
                        size={14}
                        color={theme.textSecondary}
                      />
                      <Text style={styles.catBarName}>{lang === 'es' ? meta.es : meta.en}</Text>
                    </View>
                    <Text style={styles.catBarAmt}>
                      {formatCurrency(row.amount, profile.currency, 0)} ({row.pct}%)
                    </Text>
                  </View>
                  <View style={styles.catTrack}>
                    <View style={[styles.catFill, { width: `${Math.max(6, row.pct)}%` }]} />
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      <ResolveImpulseModal
        item={selectedItem}
        currency={profile.currency}
        lang={lang}
        onClose={() => setSelectedItem(null)}
        onResist={handleResist}
        onBought={handleBought}
        onDelete={confirmDelete}
      />

      <ShareStoryModal
        payload={sharePayload}
        currency={profile.currency}
        lang={lang}
        isPro={isPro}
        onClose={() => setSharePayload(null)}
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
  shareHeroBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.accentDim,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.35)',
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  shareHeroText: {
    color: theme.accent,
    fontSize: 12,
    fontWeight: '800',
  },
  victoryBanner: {
    backgroundColor: theme.accentDim,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: theme.accent,
  },
  victoryInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
  },
  victoryTitle: {
    color: theme.accent,
    fontSize: 14,
    fontWeight: '800',
  },
  victorySub: {
    ...TABULAR_NUMS,
    color: theme.textPrimary,
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  victoryShareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.accent,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
  },
  victoryShareText: {
    color: '#04150E',
    fontSize: 11,
    fontWeight: '800',
  },
  heroCard: {
    backgroundColor: theme.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    padding: SPACING.lg,
    alignItems: 'center',
    gap: 6,
  },
  heroKicker: {
    color: theme.textSecondary,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  heroValue: {
    ...TABULAR_NUMS,
    color: theme.accent,
    fontSize: 42,
    fontWeight: '800',
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
    ...TABULAR_NUMS,
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
  segmentBar: {
    flexDirection: 'row',
    backgroundColor: theme.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: theme.border,
    padding: 4,
    gap: 4,
  },
  segmentTab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: RADIUS.sm + 2,
    alignItems: 'center',
  },
  segmentTabActive: {
    backgroundColor: theme.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.borderStrong,
  },
  segmentTabText: {
    ...TABULAR_NUMS,
    color: theme.textMuted,
    fontSize: 12,
    fontWeight: '700',
  },
  segmentTabTextActive: {
    color: theme.textPrimary,
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
  itemCard: {
    backgroundColor: theme.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: theme.border,
    padding: SPACING.md,
    gap: 12,
  },
  itemCardQuarantine: {
    borderColor: 'rgba(245, 158, 11, 0.28)',
  },
  itemCardReady: {
    borderColor: 'rgba(16, 185, 129, 0.45)',
  },
  itemCardResisted: {
    borderColor: 'rgba(16, 185, 129, 0.2)',
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  itemTitleWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  catIconBox: {
    width: 36,
    height: 36,
    borderRadius: RADIUS.md,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemName: {
    color: theme.textPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  itemMeta: {
    ...TABULAR_NUMS,
    color: theme.textSecondary,
    fontSize: 12,
    marginTop: 2,
  },
  rightActions: {
    alignItems: 'flex-end',
    gap: 6,
  },
  itemPrice: {
    ...TABULAR_NUMS,
    color: theme.warning,
    fontSize: 16,
    fontWeight: '800',
  },
  inlineBtns: {
    flexDirection: 'row',
    gap: 6,
  },
  miniIconBtn: {
    width: 28,
    height: 28,
    borderRadius: RADIUS.full,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressWrap: {
    gap: 6,
  },
  progressTrack: {
    height: 5,
    borderRadius: RADIUS.full,
    backgroundColor: theme.bg,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: RADIUS.full,
  },
  progressFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemTimer: {
    ...TABULAR_NUMS,
    fontSize: 12,
    fontWeight: '700',
  },
  tapHint: {
    color: theme.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  lockedHistoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: theme.warningDim,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    padding: SPACING.md,
  },
  lockedTitle: {
    color: theme.warning,
    fontSize: 14,
    fontWeight: '800',
  },
  lockedSub: {
    color: theme.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
  breakdownCard: {
    backgroundColor: theme.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: theme.border,
    padding: SPACING.md,
    gap: 12,
    marginTop: 4,
  },
  sectionTitle: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
  },
  catBarRow: {
    gap: 6,
  },
  catBarTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  catBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  catBarName: {
    color: theme.textPrimary,
    fontSize: 13,
    fontWeight: '600',
  },
  catBarAmt: {
    ...TABULAR_NUMS,
    color: theme.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  catTrack: {
    height: 6,
    borderRadius: RADIUS.full,
    backgroundColor: theme.bg,
    overflow: 'hidden',
  },
  catFill: {
    height: '100%',
    borderRadius: RADIUS.full,
    backgroundColor: theme.accent,
  },
});
