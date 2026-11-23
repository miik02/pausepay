import React, { useCallback, useMemo, useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { ContextualTipModal } from '../../components/ContextualTipModal';
import { GrowthChart } from '../../components/GrowthChart';
import {
  CURRENCIES,
  ETF_PRESETS,
  FREE_LIMITS,
  HORIZON_OPTIONS,
  QUARANTINE_OPTIONS,
} from '../../constants/etfs';
import { CATEGORY_META, t } from '../../constants/i18n';
import { useApp } from '../../context/AppContext';
import { useDialog } from '../../context/DialogContext';
import { RADIUS, SPACING, TABULAR_NUMS, theme } from '../../theme/tokens';
import {
  EtfPresetId,
  ImpulseCategory,
  ImpulseItem,
  PurchaseFrequency,
  QuarantineHours,
} from '../../types';
import {
  calculateCostPerUse,
  calculateFutureValue,
  calculateLifeCost,
  formatCurrency,
  generateGrowthSeries,
} from '../../utils/finance';
import { openSystemSettings, scheduleQuarantineNotification } from '../../utils/notifications';

const CATEGORIES = Object.keys(CATEGORY_META) as ImpulseCategory[];
const QUICK_AMOUNTS = [25, 60, 120, 300, 600];
const USE_OPTIONS = [1, 5, 15, 30, 100];

export default function SimulatorScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { showDialog } = useDialog();
  const {
    profile,
    hourlyRate,
    vaultStats,
    isPro,
    tutorialsSeen,
    markTutorialSeen,
    addImpulse,
  } = useApp();
  const lang = profile.language;
  const currencySymbol = CURRENCIES[profile.currency].symbol;
  const okLabel = lang === 'es' ? 'Entendido' : 'Got it';

  const [priceText, setPriceText] = useState('120');
  const [name, setName] = useState('');
  const [frequency, setFrequency] = useState<PurchaseFrequency>('once');
  const [category, setCategory] = useState<ImpulseCategory>('tech');
  const [etfId, setEtfId] = useState<EtfPresetId>('sp500');
  const [customRate, setCustomRate] = useState(profile.customRate || 7);
  const [horizonYears, setHorizonYears] = useState<number>(10);
  const [quarantineHours, setQuarantineHours] = useState<QuarantineHours>(48);

  // Wishlist plegable (cerrada por defecto para cero fricción)
  const [wishExpanded, setWishExpanded] = useState(false);
  const [productUrl, setProductUrl] = useState('');
  const [imageUri, setImageUri] = useState<string | undefined>(undefined);
  const [estimatedUses, setEstimatedUses] = useState<number | undefined>(undefined);
  const [showTip, setShowTip] = useState(false);

  useFocusEffect(
    useCallback(() => {
      if (tutorialsSeen.simulate) return;
      const timer = setTimeout(() => setShowTip(true), 350);
      return () => clearTimeout(timer);
    }, [tutorialsSeen.simulate])
  );

  const numericPrice = useMemo(() => {
    const clean = priceText.replace(',', '.').replace(/[^0-9.]/g, '');
    const parsed = parseFloat(clean);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }, [priceText]);

  const activeRate = useMemo(() => {
    if (etfId === 'custom') return customRate;
    return ETF_PRESETS.find((e) => e.id === etfId)?.rate ?? 10;
  }, [etfId, customRate]);

  const displayPriceForLife = frequency === 'monthly' ? numericPrice * 12 : numericPrice;
  const lifeCost = useMemo(
    () => calculateLifeCost(displayPriceForLife, hourlyRate),
    [displayPriceForLife, hourlyRate]
  );

  const futureValue = useMemo(
    () => calculateFutureValue(numericPrice, activeRate, horizonYears, frequency),
    [numericPrice, activeRate, horizonYears, frequency]
  );

  const costPerUse = useMemo(
    () => calculateCostPerUse(numericPrice, estimatedUses),
    [numericPrice, estimatedUses]
  );

  const growthPoints = useMemo(
    () => generateGrowthSeries(Math.max(numericPrice, 1), activeRate, horizonYears, frequency),
    [numericPrice, activeRate, horizonYears, frequency]
  );

  const hasWishExtras = Boolean(productUrl.trim() || imageUri || estimatedUses);

  const promptPro = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    showDialog({
      title: t(lang, 'simProLockedTitle'),
      message: t(lang, 'simProLockedMsg'),
      icon: 'lock-closed',
      tone: 'warning',
      actions: [{ label: okLabel, variant: 'warning' }],
    });
  };

  const handleFrequency = (next: PurchaseFrequency) => {
    if (next === 'monthly' && !isPro) {
      promptPro();
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setFrequency(next);
  };

  const handleSelectEtf = (id: EtfPresetId, proOnly: boolean) => {
    if (proOnly && !isPro) {
      promptPro();
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setEtfId(id);
  };

  const handleSelectHorizon = (yrs: number) => {
    if (yrs !== FREE_LIMITS.allowedFreeHorizon && !isPro) {
      promptPro();
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setHorizonYears(yrs);
  };

  const handlePickPhoto = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      showDialog({
        title: t(lang, 'wishPhotoDeniedTitle'),
        message: t(lang, 'wishPhotoDeniedMsg'),
        icon: 'images-outline',
        tone: 'warning',
        actions: [
          { label: t(lang, 'notifOpenSettings'), variant: 'primary', onPress: openSystemSettings },
          { label: t(lang, 'vaultCancel'), variant: 'secondary' },
        ],
      });
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleLockImpulse = async () => {
    if (numericPrice <= 0) {
      showDialog({
        title: 'PausePay',
        message: t(lang, 'simMissingPrice'),
        icon: 'alert-circle-outline',
        tone: 'warning',
        actions: [{ label: okLabel, variant: 'primary' }],
      });
      return;
    }
    if (!isPro && vaultStats.activeCount >= FREE_LIMITS.maxActiveQuarantine) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      showDialog({
        title: t(lang, 'simLimitTitle'),
        message: t(lang, 'simLimitMsg'),
        icon: 'lock-closed',
        tone: 'warning',
        actions: [{ label: okLabel, variant: 'warning' }],
      });
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
    const now = Date.now();
    const baseItem: ImpulseItem = {
      id: `${now}-${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim() || t(lang, 'simDefaultName'),
      price: numericPrice,
      frequency,
      category,
      etfId,
      annualRate: activeRate,
      horizonYears,
      hoursCost: lifeCost.hours,
      futureValue,
      status: 'quarantine',
      createdAt: now,
      unlockAt: now + quarantineHours * 3600 * 1000,
      productUrl: productUrl.trim() || undefined,
      imageUri,
      estimatedUses,
    };

    const { notificationId, permissionDenied } = await scheduleQuarantineNotification(
      baseItem,
      profile.currency,
      lang
    );

    await addImpulse({ ...baseItem, notificationId });
    setName('');
    setProductUrl('');
    setImageUri(undefined);
    setEstimatedUses(undefined);
    setWishExpanded(false);

    if (permissionDenied) {
      showDialog({
        title: t(lang, 'notifDeniedTitle'),
        message: t(lang, 'notifDeniedMsg'),
        icon: 'notifications-off-outline',
        tone: 'warning',
        actions: [
          {
            label: t(lang, 'notifOpenSettings'),
            variant: 'primary',
            onPress: () => {
              openSystemSettings();
              router.push('/(tabs)/vault');
            },
          },
          {
            label: t(lang, 'notifContinue'),
            variant: 'secondary',
            onPress: () => router.push('/(tabs)/vault'),
          },
        ],
      });
    } else {
      router.push('/(tabs)/vault');
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 12, paddingBottom: 32 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>{t(lang, 'simHeader')}</Text>
          <View style={styles.ratePill}>
            <Text style={styles.ratePillText}>
              {formatCurrency(hourlyRate, profile.currency, 1)}/h
            </Text>
          </View>
        </View>

        <View style={styles.inputCard}>
          <View style={styles.priceRow}>
            <Text style={styles.currencyPrefix}>{currencySymbol}</Text>
            <TextInput
              style={styles.priceInput}
              value={priceText}
              onChangeText={setPriceText}
              keyboardType="decimal-pad"
              placeholder={t(lang, 'simPricePlaceholder')}
              placeholderTextColor={theme.textMuted}
              maxLength={8}
            />
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickRow}>
            {QUICK_AMOUNTS.map((amt) => {
              const selected = numericPrice === amt;
              return (
                <Pressable
                  key={amt}
                  style={[styles.quickChip, selected && styles.quickChipActive]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    setPriceText(String(amt));
                  }}
                >
                  <Text style={[styles.quickChipText, selected && styles.quickChipTextActive]}>
                    {formatCurrency(amt, profile.currency, 0)}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <TextInput
            style={styles.nameInput}
            value={name}
            onChangeText={setName}
            placeholder={t(lang, 'simNamePlaceholder')}
            placeholderTextColor={theme.textMuted}
            maxLength={40}
          />

          <View style={styles.segmentRow}>
            <Pressable
              style={[styles.segmentBtn, frequency === 'once' && styles.segmentActive]}
              onPress={() => handleFrequency('once')}
            >
              <Text style={[styles.segmentText, frequency === 'once' && styles.segmentTextActive]}>
                {t(lang, 'simOnce')}
              </Text>
            </Pressable>
            <Pressable
              style={[styles.segmentBtn, frequency === 'monthly' && styles.segmentActive]}
              onPress={() => handleFrequency('monthly')}
            >
              <View style={styles.inlineIcon}>
                {!isPro && <Ionicons name="lock-closed" size={12} color={theme.warning} />}
                <Text
                  style={[
                    styles.segmentText,
                    frequency === 'monthly' && styles.segmentTextActive,
                  ]}
                >
                  {t(lang, 'simMonthly')}
                </Text>
              </View>
            </Pressable>
          </View>
        </View>

        <View style={styles.metricsGrid}>
          <View style={[styles.metricBox, styles.metricWarning]}>
            <Text style={styles.metricKicker}>{t(lang, 'simHoursOfLife')}</Text>
            <Text style={[styles.metricValue, { color: theme.warning }]}>
              {lifeCost.hours.toFixed(1)} h
            </Text>
            <Text style={styles.metricSub}>
              {lifeCost.workDays.toFixed(1)} {t(lang, 'simWorkDays')}
              {frequency === 'monthly' ? ' / yr' : ''}
            </Text>
          </View>

          <View style={[styles.metricBox, styles.metricAccent]}>
            <Text style={styles.metricKicker}>
              {t(lang, 'simFutureValue')} ({horizonYears} {t(lang, 'simYearsSuffix')})
            </Text>
            <Text
              style={[styles.metricValue, { color: theme.accent }]}
              numberOfLines={1}
              adjustsFontSizeToFit
            >
              {formatCurrency(futureValue, profile.currency, 0)}
            </Text>
            <Text style={styles.metricSub}>{activeRate}% / yr</Text>
          </View>
        </View>

        <GrowthChart
          points={growthPoints}
          currency={profile.currency}
          yearsLabel={t(lang, 'simYearsSuffix')}
        />

        <Text style={styles.sectionLabel}>{t(lang, 'simEtfTitle')}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {ETF_PRESETS.map((preset) => {
            const active = etfId === preset.id;
            const locked = preset.proOnly && !isPro;
            return (
              <Pressable
                key={preset.id}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => handleSelectEtf(preset.id, preset.proOnly)}
              >
                {locked && <Ionicons name="lock-closed" size={11} color={theme.warning} />}
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {preset.shortLabel} ({preset.id === 'custom' ? `${customRate}%` : `${preset.rate}%`})
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {etfId === 'custom' && isPro && (
          <View style={styles.stepperRow}>
            <Pressable
              style={styles.stepperBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                setCustomRate((r) => Math.max(1, r - 1));
              }}
            >
              <Ionicons name="remove" size={18} color={theme.textPrimary} />
            </Pressable>
            <Text style={styles.stepperVal}>{customRate}%</Text>
            <Pressable
              style={styles.stepperBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                setCustomRate((r) => Math.min(20, r + 1));
              }}
            >
              <Ionicons name="add" size={18} color={theme.textPrimary} />
            </Pressable>
          </View>
        )}

        <Text style={styles.sectionLabel}>{t(lang, 'simHorizonTitle')}</Text>
        <View style={styles.horizonRow}>
          {HORIZON_OPTIONS.map((yrs) => {
            const active = horizonYears === yrs;
            const locked = yrs !== FREE_LIMITS.allowedFreeHorizon && !isPro;
            return (
              <Pressable
                key={yrs}
                style={[styles.horizonBtn, active && styles.chipActive]}
                onPress={() => handleSelectHorizon(yrs)}
              >
                {locked && <Ionicons name="lock-closed" size={11} color={theme.warning} />}
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {yrs} {t(lang, 'simYearsSuffix')}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {CATEGORIES.map((cat) => {
            const meta = CATEGORY_META[cat];
            const active = category === cat;
            return (
              <Pressable
                key={cat}
                style={[styles.chip, active && styles.chipActive]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                  setCategory(cat);
                }}
              >
                <Ionicons
                  name={meta.icon as React.ComponentProps<typeof Ionicons>['name']}
                  size={14}
                  color={active ? theme.accent : theme.textSecondary}
                />
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {lang === 'es' ? meta.es : meta.en}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View style={styles.wishBox}>
          <Pressable
            style={styles.wishToggle}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              setWishExpanded((v) => !v);
            }}
          >
            <View style={styles.inlineIcon}>
              <Ionicons
                name={wishExpanded ? 'chevron-up' : 'add-circle-outline'}
                size={16}
                color={hasWishExtras ? theme.accent : theme.textSecondary}
              />
              <Text style={[styles.wishToggleText, hasWishExtras && { color: theme.accent }]}>
                {wishExpanded ? t(lang, 'wishToggleOpen') : t(lang, 'wishToggleClosed')}
              </Text>
            </View>
            {hasWishExtras && !wishExpanded && (
              <View style={styles.wishDot} />
            )}
          </Pressable>

          {wishExpanded && (
            <View style={styles.wishBody}>
              <TextInput
                style={styles.nameInput}
                value={productUrl}
                onChangeText={setProductUrl}
                placeholder={t(lang, 'wishUrlPlaceholder')}
                placeholderTextColor={theme.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />

              <View style={styles.photoRow}>
                <Pressable style={styles.photoBtn} onPress={handlePickPhoto}>
                  <Ionicons name="image-outline" size={16} color={theme.textPrimary} />
                  <Text style={styles.photoBtnText}>
                    {imageUri ? t(lang, 'wishPhotoChange') : t(lang, 'wishPhotoPick')}
                  </Text>
                </Pressable>

                {imageUri && (
                  <View style={styles.thumbWrap}>
                    <Image source={{ uri: imageUri }} style={styles.thumb} />
                    <Pressable
                      style={styles.thumbRemove}
                      onPress={() => setImageUri(undefined)}
                      hitSlop={8}
                    >
                      <Ionicons name="close" size={12} color="#FAFAFA" />
                    </Pressable>
                  </View>
                )}
              </View>

              <Text style={styles.wishLabel}>{t(lang, 'wishUsesLabel')}</Text>
              <View style={styles.horizonRow}>
                {USE_OPTIONS.map((uses) => {
                  const active = estimatedUses === uses;
                  return (
                    <Pressable
                      key={uses}
                      style={[styles.usesBtn, active && styles.chipActive]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                        setEstimatedUses(active ? undefined : uses);
                      }}
                    >
                      <Text style={[styles.chipText, active && styles.chipTextActive]}>
                        {uses}x
                      </Text>
                    </Pressable>
                  );
                })}
              </View>

              {costPerUse !== null && (
                <View style={styles.costPerUsePill}>
                  <Text style={styles.costPerUseLbl}>{t(lang, 'wishCostPerUse')}</Text>
                  <Text style={styles.costPerUseVal}>
                    {formatCurrency(costPerUse, profile.currency, 1)} {t(lang, 'wishPerUseUnit')}
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        <View style={styles.quarantineCard}>
          <Text style={styles.sectionLabelNoTop}>{t(lang, 'simQuarantineTitle')}</Text>
          <View style={styles.horizonRow}>
            {QUARANTINE_OPTIONS.map((opt) => {
              const active = quarantineHours === opt.hours;
              return (
                <Pressable
                  key={opt.hours}
                  style={[styles.horizonBtn, active && styles.quarantineActive]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    setQuarantineHours(opt.hours);
                  }}
                >
                  <Text style={[styles.chipText, active && { color: theme.warning }]}>
                    {lang === 'es' ? opt.labelEs : opt.labelEn}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable style={styles.lockBtn} onPress={handleLockImpulse}>
            <Ionicons name="lock-closed" size={18} color="#04150E" />
            <Text style={styles.lockBtnText}>{t(lang, 'simLockButton')}</Text>
          </Pressable>
        </View>

        <Text style={styles.disclaimer}>{t(lang, 'simDisclaimer')}</Text>
      </ScrollView>

      <ContextualTipModal
        visible={showTip}
        title={t(lang, 'tipSimTitle')}
        body={t(lang, 'tipSimBody')}
        actionLabel={t(lang, 'tipGotIt')}
        arrowLeftPercent="12%"
        onDismiss={() => {
          setShowTip(false);
          markTutorialSeen('simulate');
        }}
      />
    </KeyboardAvoidingView>
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
  headerTitle: {
    color: theme.textPrimary,
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -0.4,
  },
  ratePill: {
    backgroundColor: theme.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  ratePillText: {
    ...TABULAR_NUMS,
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  inputCard: {
    backgroundColor: theme.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    padding: SPACING.md,
    gap: 12,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  currencyPrefix: {
    color: theme.textMuted,
    fontSize: 34,
    fontWeight: '800',
  },
  priceInput: {
    ...TABULAR_NUMS,
    flex: 1,
    color: theme.textPrimary,
    fontSize: 44,
    fontWeight: '800',
    paddingVertical: 0,
  },
  quickRow: {
    flexDirection: 'row',
    gap: 8,
  },
  quickChip: {
    backgroundColor: theme.bg,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  quickChipActive: {
    backgroundColor: theme.accentDim,
    borderColor: theme.accent,
  },
  quickChipText: {
    ...TABULAR_NUMS,
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  quickChipTextActive: {
    color: theme.accent,
  },
  nameInput: {
    backgroundColor: theme.bg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: theme.border,
    paddingHorizontal: 14,
    paddingVertical: 11,
    color: theme.textPrimary,
    fontSize: 15,
  },
  segmentRow: {
    flexDirection: 'row',
    backgroundColor: theme.bg,
    borderRadius: RADIUS.md,
    padding: 4,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.sm + 2,
    alignItems: 'center',
  },
  segmentActive: {
    backgroundColor: theme.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.borderStrong,
  },
  segmentText: {
    color: theme.textMuted,
    fontSize: 13,
    fontWeight: '700',
  },
  segmentTextActive: {
    color: theme.textPrimary,
  },
  inlineIcon: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
  },
  metricBox: {
    flex: 1,
    backgroundColor: theme.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    padding: 14,
    gap: 4,
  },
  metricWarning: {
    borderColor: 'rgba(245, 158, 11, 0.28)',
  },
  metricAccent: {
    borderColor: 'rgba(16, 185, 129, 0.28)',
  },
  metricKicker: {
    color: theme.textSecondary,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  metricValue: {
    ...TABULAR_NUMS,
    fontSize: 26,
    fontWeight: '800',
  },
  metricSub: {
    ...TABULAR_NUMS,
    color: theme.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  sectionLabel: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginTop: 2,
  },
  sectionLabelNoTop: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: RADIUS.full,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  chipActive: {
    backgroundColor: theme.accentDim,
    borderColor: theme.accent,
  },
  chipText: {
    ...TABULAR_NUMS,
    color: theme.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: theme.accent,
  },
  stepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    backgroundColor: theme.surface,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: theme.border,
    paddingVertical: 8,
  },
  stepperBtn: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.full,
    backgroundColor: theme.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepperVal: {
    ...TABULAR_NUMS,
    color: theme.accent,
    fontSize: 18,
    fontWeight: '800',
    minWidth: 46,
    textAlign: 'center',
  },
  horizonRow: {
    flexDirection: 'row',
    gap: 8,
  },
  horizonBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: RADIUS.md,
    paddingVertical: 10,
  },
  wishBox: {
    backgroundColor: theme.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: 'hidden',
  },
  wishToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    paddingVertical: 13,
  },
  wishToggleText: {
    color: theme.textSecondary,
    fontSize: 13,
    fontWeight: '700',
  },
  wishDot: {
    width: 8,
    height: 8,
    borderRadius: RADIUS.full,
    backgroundColor: theme.accent,
  },
  wishBody: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingTop: 12,
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  photoBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    borderRadius: RADIUS.md,
    paddingVertical: 11,
  },
  photoBtnText: {
    color: theme.textPrimary,
    fontSize: 13,
    fontWeight: '700',
  },
  thumbWrap: {
    position: 'relative',
  },
  thumb: {
    width: 44,
    height: 44,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: theme.borderStrong,
  },
  thumbRemove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 18,
    height: 18,
    borderRadius: RADIUS.full,
    backgroundColor: theme.danger,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wishLabel: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  usesBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: RADIUS.md,
    paddingVertical: 8,
  },
  costPerUsePill: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: theme.warningDim,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  costPerUseLbl: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  costPerUseVal: {
    ...TABULAR_NUMS,
    color: theme.warning,
    fontSize: 14,
    fontWeight: '800',
  },
  quarantineCard: {
    backgroundColor: theme.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    padding: SPACING.md,
    gap: 12,
  },
  quarantineActive: {
    backgroundColor: theme.warningDim,
    borderColor: theme.warning,
  },
  lockBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.accent,
    borderRadius: RADIUS.md,
    paddingVertical: 15,
  },
  lockBtnText: {
    color: '#04150E',
    fontSize: 16,
    fontWeight: '800',
  },
  disclaimer: {
    color: theme.textMuted,
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 16,
    paddingHorizontal: SPACING.sm,
  },
});
