import React, { useMemo, useState } from 'react';
import {
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
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { CURRENCIES } from '../constants/etfs';
import { t } from '../constants/i18n';
import { useApp } from '../context/AppContext';
import { RADIUS, SPACING, TABULAR_NUMS, theme } from '../theme/tokens';
import { CurrencyCode, LanguageCode } from '../types';
import {
  calculateFutureValue,
  calculateHourlyRate,
  calculateLifeCost,
  formatCurrency,
} from '../utils/finance';

export function OnboardingFlow() {
  const insets = useSafeAreaInsets();
  const { profile, updateProfile } = useApp();

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [lang, setLang] = useState<LanguageCode>(profile.language);
  const [currency, setCurrency] = useState<CurrencyCode>(profile.currency);
  const [income, setIncome] = useState(String(profile.monthlyNetIncome));
  const [hours, setHours] = useState(String(profile.weeklyHours));
  const [commute, setCommute] = useState(String(profile.commuteWeeklyHours));

  const parsedIncome = Math.max(100, Number(income.replace(',', '.')) || 0);
  const parsedHours = Math.max(1, Number(hours.replace(',', '.')) || 40);
  const parsedCommute = Math.max(0, Number(commute.replace(',', '.')) || 0);

  const hourlyRate = useMemo(
    () => calculateHourlyRate(parsedIncome, parsedHours, parsedCommute),
    [parsedIncome, parsedHours, parsedCommute]
  );

  const samplePrice = 120;
  const sampleLife = calculateLifeCost(samplePrice, hourlyRate);
  const sampleFuture = calculateFutureValue(samplePrice, 10, 10, 'once');

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    if (step === 1) setStep(2);
    else if (step === 2) setStep(3);
  };

  const handleFinish = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    await updateProfile({
      language: lang,
      currency,
      monthlyNetIncome: parsedIncome,
      weeklyHours: parsedHours,
      commuteWeeklyHours: parsedCommute,
      onboardingCompleted: true,
    });
  };

  return (
    <KeyboardAvoidingView
      style={[styles.root, { paddingTop: insets.top + 16, paddingBottom: Math.max(insets.bottom, 20) }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.progressRow}>
        {[1, 2, 3].map((idx) => (
          <View
            key={idx}
            style={[styles.progressBar, idx <= step && styles.progressBarActive]}
          />
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {step === 1 && (
          <View style={styles.stepBlock}>
            <View style={styles.badge}>
              <Ionicons name="shield-checkmark" size={18} color={theme.accent} />
              <Text style={styles.badgeText}>PausePay</Text>
            </View>
            <Text style={styles.title}>{t(lang, 'onbStep1Title')}</Text>
            <Text style={styles.subtitle}>{t(lang, 'onbStep1Sub')}</Text>

            <Text style={styles.fieldLabel}>{t(lang, 'onbLangLabel')}</Text>
            <View style={styles.pillRow}>
              {(['es', 'en'] as LanguageCode[]).map((code) => (
                <Pressable
                  key={code}
                  style={[styles.pill, lang === code && styles.pillActive]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    setLang(code);
                  }}
                >
                  <Text style={[styles.pillText, lang === code && styles.pillTextActive]}>
                    {code === 'es' ? 'Español' : 'English'}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.fieldLabel}>{t(lang, 'onbCurrencyLabel')}</Text>
            <View style={styles.pillRow}>
              {(['EUR', 'USD', 'GBP'] as CurrencyCode[]).map((code) => (
                <Pressable
                  key={code}
                  style={[styles.pill, currency === code && styles.pillActive]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                    setCurrency(code);
                  }}
                >
                  <Text style={[styles.pillText, currency === code && styles.pillTextActive]}>
                    {CURRENCIES[code].symbol} {code}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        )}

        {step === 2 && (
          <View style={styles.stepBlock}>
            <Text style={styles.title}>{t(lang, 'onbStep2Title')}</Text>
            <Text style={styles.subtitle}>{t(lang, 'onbStep2Sub')}</Text>

            <Text style={styles.fieldLabel}>
              {t(lang, 'onbIncomeLabel')} ({CURRENCIES[currency].symbol})
            </Text>
            <TextInput
              style={styles.input}
              value={income}
              onChangeText={setIncome}
              keyboardType="decimal-pad"
              placeholder="1800"
              placeholderTextColor={theme.textMuted}
            />

            <View style={styles.rowInputs}>
              <View style={styles.halfCol}>
                <Text style={styles.fieldLabel}>{t(lang, 'onbHoursLabel')}</Text>
                <TextInput
                  style={styles.input}
                  value={hours}
                  onChangeText={setHours}
                  keyboardType="decimal-pad"
                  placeholder="40"
                  placeholderTextColor={theme.textMuted}
                />
              </View>
              <View style={styles.halfCol}>
                <Text style={styles.fieldLabel}>{t(lang, 'onbCommuteLabel')}</Text>
                <TextInput
                  style={styles.input}
                  value={commute}
                  onChangeText={setCommute}
                  keyboardType="decimal-pad"
                  placeholder="5"
                  placeholderTextColor={theme.textMuted}
                />
              </View>
            </View>

            <View style={styles.rateCard}>
              <Text style={styles.rateLabel}>{t(lang, 'onbRealRate')}</Text>
              <Text style={styles.rateValue}>
                {formatCurrency(hourlyRate, currency, 2)} / h
              </Text>
            </View>
          </View>
        )}

        {step === 3 && (
          <View style={styles.stepBlock}>
            <Text style={styles.title}>{t(lang, 'onbStep3Title')}</Text>
            <Text style={styles.subtitle}>{t(lang, 'onbStep3Sub')}</Text>

            <View style={styles.impactCard}>
              <Text style={styles.impactKicker}>
                {formatCurrency(samplePrice, currency, 0)} =
              </Text>
              <Text style={styles.impactBig}>
                {sampleLife.hours.toFixed(1)} h
              </Text>
              <Text style={styles.impactSub}>
                {t(lang, 'simHoursOfLife')} ({sampleLife.workDays.toFixed(1)} {t(lang, 'simWorkDays')})
              </Text>

              <View style={styles.divider} />

              <Text style={styles.impactFutureLabel}>{t(lang, 'simFutureValue')} (10 {t(lang, 'simYearsSuffix')})</Text>
              <Text style={styles.impactFutureValue}>
                {formatCurrency(sampleFuture, currency, 0)}
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      <View style={styles.footer}>
        {step > 1 ? (
          <Pressable
            style={styles.backBtn}
            onPress={() => setStep((s) => (s === 3 ? 2 : 1))}
          >
            <Text style={styles.backBtnText}>{t(lang, 'onbBack')}</Text>
          </Pressable>
        ) : (
          <View />
        )}

        <Pressable
          style={styles.primaryBtn}
          onPress={step === 3 ? handleFinish : handleNext}
        >
          <Text style={styles.primaryBtnText}>
            {step === 3 ? t(lang, 'onbStart') : t(lang, 'onbNext')}
          </Text>
          <Ionicons name="arrow-forward" size={18} color="#04150E" />
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.bg,
    paddingHorizontal: SPACING.lg,
  },
  progressRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: SPACING.xl,
  },
  progressBar: {
    flex: 1,
    height: 4,
    borderRadius: RADIUS.full,
    backgroundColor: theme.surfaceElevated,
  },
  progressBarActive: {
    backgroundColor: theme.accent,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: SPACING.lg,
  },
  stepBlock: {
    gap: SPACING.md,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    backgroundColor: theme.accentDim,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
  },
  badgeText: {
    color: theme.accent,
    fontWeight: '700',
    fontSize: 13,
    letterSpacing: 0.4,
  },
  title: {
    color: theme.textPrimary,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.6,
  },
  subtitle: {
    color: theme.textSecondary,
    fontSize: 15,
    lineHeight: 22,
  },
  fieldLabel: {
    color: theme.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 10,
  },
  pill: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: RADIUS.md,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
  },
  pillActive: {
    backgroundColor: theme.accentDim,
    borderColor: theme.accent,
  },
  pillText: {
    color: theme.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  pillTextActive: {
    color: theme.accent,
  },
  input: {
    ...TABULAR_NUMS,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    borderRadius: RADIUS.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: theme.textPrimary,
    fontSize: 18,
    fontWeight: '700',
  },
  rowInputs: {
    flexDirection: 'row',
    gap: 12,
  },
  halfCol: {
    flex: 1,
    gap: 6,
  },
  rateCard: {
    marginTop: SPACING.sm,
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.accent,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
  },
  rateLabel: {
    color: theme.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  rateValue: {
    ...TABULAR_NUMS,
    color: theme.accent,
    fontSize: 32,
    fontWeight: '800',
    marginTop: 6,
  },
  impactCard: {
    backgroundColor: theme.surface,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    borderRadius: RADIUS.lg,
    padding: SPACING.lg,
    alignItems: 'center',
    marginTop: SPACING.sm,
  },
  impactKicker: {
    ...TABULAR_NUMS,
    color: theme.textSecondary,
    fontSize: 16,
    fontWeight: '600',
  },
  impactBig: {
    ...TABULAR_NUMS,
    color: theme.warning,
    fontSize: 48,
    fontWeight: '800',
    marginTop: 4,
  },
  impactSub: {
    color: theme.textSecondary,
    fontSize: 13,
    fontWeight: '600',
    marginTop: 2,
  },
  divider: {
    width: '100%',
    height: 1,
    backgroundColor: theme.border,
    marginVertical: SPACING.lg,
  },
  impactFutureLabel: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  impactFutureValue: {
    ...TABULAR_NUMS,
    color: theme.accent,
    fontSize: 36,
    fontWeight: '800',
    marginTop: 4,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: SPACING.md,
  },
  backBtn: {
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  backBtnText: {
    color: theme.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: theme.accent,
    paddingVertical: 15,
    paddingHorizontal: 24,
    borderRadius: RADIUS.full,
  },
  primaryBtnText: {
    color: '#04150E',
    fontSize: 15,
    fontWeight: '800',
  },
});
