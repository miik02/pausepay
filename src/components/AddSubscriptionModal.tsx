import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { CURRENCIES, SUB_PRESETS } from '../constants/etfs';
import { CATEGORY_META, t } from '../constants/i18n';
import { RADIUS, SPACING, TABULAR_NUMS, theme } from '../theme/tokens';
import {
  BillingCycle,
  CurrencyCode,
  ImpulseCategory,
  LanguageCode,
  SubscriptionItem,
} from '../types';
import {
  calculateLifeCost,
  formatCurrency,
  getAnnualSubscriptionCost,
} from '../utils/finance';

interface AddSubscriptionModalProps {
  visible: boolean;
  currency: CurrencyCode;
  lang: LanguageCode;
  hourlyRate: number;
  onClose: () => void;
  onSubmit: (sub: SubscriptionItem) => Promise<void>;
}

const QUICK_DAYS = [3, 7, 14, 30];
const CATEGORIES = Object.keys(CATEGORY_META) as ImpulseCategory[];

export function AddSubscriptionModal({
  visible,
  currency,
  lang,
  hourlyRate,
  onClose,
  onSubmit,
}: AddSubscriptionModalProps) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState('');
  const [priceText, setPriceText] = useState('12.99');
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [category, setCategory] = useState<ImpulseCategory>('entertainment');
  const [daysAhead, setDaysAhead] = useState(14);
  const [saving, setSaving] = useState(false);
  const [inlineNotice, setInlineNotice] = useState<string | null>(null);

  const numericPrice = useMemo(() => {
    const clean = priceText.replace(',', '.').replace(/[^0-9.]/g, '');
    const parsed = parseFloat(clean);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }, [priceText]);

  const annualCost = useMemo(
    () => getAnnualSubscriptionCost(numericPrice, cycle),
    [numericPrice, cycle]
  );

  const annualHours = useMemo(
    () => calculateLifeCost(annualCost, hourlyRate).hours,
    [annualCost, hourlyRate]
  );

  const estimatedDateLabel = useMemo(() => {
    const date = new Date(Date.now() + daysAhead * 24 * 3600 * 1000);
    return date.toLocaleDateString(lang === 'es' ? 'es-ES' : 'en-US', {
      day: 'numeric',
      month: 'short',
    });
  }, [daysAhead, lang]);

  const applyPreset = (preset: (typeof SUB_PRESETS)[number]) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setName(preset.name);
    setPriceText(String(preset.price));
    setCycle(preset.cycle);
    setCategory(preset.category);
    setDaysAhead(preset.daysAhead);
  };

  const handleSave = async () => {
    if (saving) return;
    if (numericPrice <= 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      setInlineNotice(t(lang, 'simMissingPrice'));
      return;
    }
    setInlineNotice(null);

    setSaving(true);
    try {
      const now = Date.now();
      const sub: SubscriptionItem = {
        id: `sub-${now}-${Math.random().toString(36).slice(2, 6)}`,
        name: name.trim() || (cycle === 'trial' ? t(lang, 'subsCycleTrial') : 'Subscription'),
        price: numericPrice,
        cycle,
        category,
        nextBillingAt: now + Math.max(1, daysAhead) * 24 * 3600 * 1000,
        status: 'active',
        createdAt: now,
      };
      await onSubmit(sub);
      setName('');
      setPriceText('12.99');
      setDaysAhead(14);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 18) + 10 }]}>
          <View style={styles.header}>
            <Text style={styles.title}>{t(lang, 'subsModalTitle')}</Text>
            <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={20} color={theme.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollBody}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.label}>{t(lang, 'subsPresetsLabel')}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {SUB_PRESETS.map((preset) => (
                <Pressable
                  key={preset.name}
                  style={styles.presetChip}
                  onPress={() => applyPreset(preset)}
                >
                  <Text style={styles.presetText}>{preset.name}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={t(lang, 'subsNamePlaceholder')}
              placeholderTextColor={theme.textMuted}
              maxLength={36}
            />

            <View style={styles.rowTwo}>
              <View style={{ flex: 1, gap: 6 }}>
                <Text style={styles.label}>
                  {t(lang, 'subsPriceLabel')} ({CURRENCIES[currency].symbol})
                </Text>
                <TextInput
                  style={styles.priceInput}
                  value={priceText}
                  onChangeText={setPriceText}
                  keyboardType="decimal-pad"
                  placeholder="9.99"
                  placeholderTextColor={theme.textMuted}
                  maxLength={8}
                />
              </View>

              <View style={styles.previewBox}>
                <Text style={styles.previewAmt}>
                  {formatCurrency(annualCost, currency, 0)}/yr
                </Text>
                <Text style={styles.previewHrs}>{annualHours.toFixed(1)} h</Text>
              </View>
            </View>

            <Text style={styles.label}>{t(lang, 'subsCycleLabel')}</Text>
            <View style={styles.cycleRow}>
              {(
                [
                  { id: 'monthly', label: t(lang, 'subsCycleMonthly') },
                  { id: 'yearly', label: t(lang, 'subsCycleYearly') },
                  { id: 'trial', label: t(lang, 'subsCycleTrial') },
                ] as const
              ).map((opt) => {
                const active = cycle === opt.id;
                return (
                  <Pressable
                    key={opt.id}
                    style={[styles.cycleBtn, active && styles.cycleBtnActive]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      setCycle(opt.id);
                      if (opt.id === 'trial' && daysAhead > 14) setDaysAhead(7);
                    }}
                  >
                    <Text style={[styles.cycleText, active && styles.cycleTextActive]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <View style={styles.dateHeader}>
              <Text style={styles.label}>{t(lang, 'subsNextChargeLabel')}</Text>
              <Text style={styles.estDate}>
                {t(lang, 'subsEstimatedDate')} {estimatedDateLabel}
              </Text>
            </View>

            <View style={styles.daysRow}>
              {QUICK_DAYS.map((d) => {
                const active = daysAhead === d;
                return (
                  <Pressable
                    key={d}
                    style={[styles.dayChip, active && styles.dayChipActive]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      setDaysAhead(d);
                    }}
                  >
                    <Text style={[styles.dayChipText, active && styles.dayChipTextActive]}>
                      {d}d
                    </Text>
                  </Pressable>
                );
              })}

              <View style={styles.stepper}>
                <Pressable
                  style={styles.stepBtn}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    setDaysAhead((d) => Math.max(1, d - 1));
                  }}
                >
                  <Ionicons name="remove" size={16} color={theme.textPrimary} />
                </Pressable>
                <Text style={styles.stepVal}>{daysAhead}d</Text>
                <Pressable
                  style={styles.stepBtn}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    setDaysAhead((d) => Math.min(365, d + 1));
                  }}
                >
                  <Ionicons name="add" size={16} color={theme.textPrimary} />
                </Pressable>
              </View>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {CATEGORIES.map((cat) => {
                const meta = CATEGORY_META[cat];
                const active = category === cat;
                return (
                  <Pressable
                    key={cat}
                    style={[styles.catChip, active && styles.catChipActive]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      setCategory(cat);
                    }}
                  >
                    <Ionicons
                      name={meta.icon as React.ComponentProps<typeof Ionicons>['name']}
                      size={13}
                      color={active ? theme.accent : theme.textSecondary}
                    />
                    <Text style={[styles.catChipText, active && styles.catChipTextActive]}>
                      {lang === 'es' ? meta.es : meta.en}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </ScrollView>

          {inlineNotice && (
            <View style={styles.inlineNotice}>
              <Ionicons name="alert-circle" size={15} color={theme.warning} />
              <Text style={styles.inlineNoticeText}>{inlineNotice}</Text>
            </View>
          )}

          <Pressable
            style={[styles.saveBtn, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Ionicons name="notifications-outline" size={18} color="#04150E" />
            <Text style={styles.saveBtnText}>{t(lang, 'subsSaveBtn')}</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
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
    backgroundColor: 'rgba(0, 0, 0, 0.76)',
  },
  sheet: {
    maxHeight: '90%',
    backgroundColor: theme.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: theme.borderStrong,
    paddingHorizontal: SPACING.md,
    paddingTop: 16,
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: theme.textPrimary,
    fontSize: 18,
    fontWeight: '800',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.full,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollBody: {
    gap: 12,
    paddingBottom: 6,
  },
  label: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  presetChip: {
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  presetText: {
    color: theme.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  input: {
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.textPrimary,
    fontSize: 15,
    fontWeight: '600',
  },
  rowTwo: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  priceInput: {
    ...TABULAR_NUMS,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.textPrimary,
    fontSize: 22,
    fontWeight: '800',
  },
  previewBox: {
    backgroundColor: theme.warningDim,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
    alignItems: 'flex-end',
    minWidth: 108,
  },
  previewAmt: {
    ...TABULAR_NUMS,
    color: theme.warning,
    fontSize: 14,
    fontWeight: '800',
  },
  previewHrs: {
    ...TABULAR_NUMS,
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  cycleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  cycleBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
  },
  cycleBtnActive: {
    backgroundColor: theme.accentDim,
    borderColor: theme.accent,
  },
  cycleText: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  cycleTextActive: {
    color: theme.accent,
  },
  dateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  estDate: {
    ...TABULAR_NUMS,
    color: theme.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  daysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dayChip: {
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: RADIUS.md,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
  },
  dayChipActive: {
    backgroundColor: theme.warningDim,
    borderColor: theme.warning,
  },
  dayChipText: {
    ...TABULAR_NUMS,
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  dayChipTextActive: {
    color: theme.warning,
  },
  stepper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 8,
  },
  stepBtn: {
    width: 30,
    height: 30,
    borderRadius: RADIUS.full,
    backgroundColor: theme.surfaceElevated,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepVal: {
    ...TABULAR_NUMS,
    color: theme.textPrimary,
    fontSize: 13,
    fontWeight: '800',
    minWidth: 32,
    textAlign: 'center',
  },
  catChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: RADIUS.full,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  catChipActive: {
    backgroundColor: theme.accentDim,
    borderColor: theme.accent,
  },
  catChipText: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  catChipTextActive: {
    color: theme.accent,
  },
  inlineNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.warningDim,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.4)',
    borderRadius: RADIUS.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  inlineNoticeText: {
    flex: 1,
    color: theme.warning,
    fontSize: 12,
    fontWeight: '700',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.accent,
    borderRadius: RADIUS.md,
    height: 52,
  },
  saveBtnText: {
    color: '#04150E',
    fontSize: 15,
    fontWeight: '800',
  },
});
