import React, { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { CURRENCIES } from '../../constants/etfs';
import { t } from '../../constants/i18n';
import { useApp } from '../../context/AppContext';
import { RADIUS, SPACING, TABULAR_NUMS, theme } from '../../theme/tokens';
import { CurrencyCode, LanguageCode } from '../../types';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { profile, isPro, setDevPro, updateProfile } = useApp();
  const lang = profile.language;

  const [income, setIncome] = useState(String(profile.monthlyNetIncome));
  const [hours, setHours] = useState(String(profile.weeklyHours));
  const [commute, setCommute] = useState(String(profile.commuteWeeklyHours));

  const handleSave = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    await updateProfile({
      monthlyNetIncome: Math.max(100, Number(income.replace(',', '.')) || profile.monthlyNetIncome),
      weeklyHours: Math.max(1, Number(hours.replace(',', '.')) || profile.weeklyHours),
      commuteWeeklyHours: Math.max(0, Number(commute.replace(',', '.')) || 0),
    });
    Alert.alert('PausePay', t(lang, 'settingsSaved'));
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 12, paddingBottom: 32 },
      ]}
      keyboardShouldPersistTaps="handled"
    >
      <Text style={styles.title}>{t(lang, 'settingsTitle')}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t(lang, 'settingsProfile')}</Text>

        <Text style={styles.label}>{t(lang, 'onbLangLabel')}</Text>
        <View style={styles.row}>
          {(['es', 'en'] as LanguageCode[]).map((code) => (
            <Pressable
              key={code}
              style={[styles.pill, profile.language === code && styles.pillActive]}
              onPress={() => updateProfile({ language: code })}
            >
              <Text style={[styles.pillText, profile.language === code && styles.pillTextActive]}>
                {code === 'es' ? 'Español' : 'English'}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>{t(lang, 'onbCurrencyLabel')}</Text>
        <View style={styles.row}>
          {(['EUR', 'USD', 'GBP'] as CurrencyCode[]).map((code) => (
            <Pressable
              key={code}
              style={[styles.pill, profile.currency === code && styles.pillActive]}
              onPress={() => updateProfile({ currency: code })}
            >
              <Text style={[styles.pillText, profile.currency === code && styles.pillTextActive]}>
                {CURRENCIES[code].symbol} {code}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.label}>{t(lang, 'onbIncomeLabel')}</Text>
        <TextInput
          style={styles.input}
          value={income}
          onChangeText={setIncome}
          keyboardType="decimal-pad"
        />

        <Text style={styles.label}>{t(lang, 'onbHoursLabel')}</Text>
        <TextInput
          style={styles.input}
          value={hours}
          onChangeText={setHours}
          keyboardType="decimal-pad"
        />

        <Text style={styles.label}>{t(lang, 'onbCommuteLabel')}</Text>
        <TextInput
          style={styles.input}
          value={commute}
          onChangeText={setCommute}
          keyboardType="decimal-pad"
        />

        <Pressable style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>{t(lang, 'settingsSave')}</Text>
        </Pressable>
      </View>

      {__DEV__ && (
        <View style={styles.devCard}>
          <View style={styles.devRow}>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={styles.devTitle}>{t(lang, 'settingsDevPro')}</Text>
              <Text style={styles.devSub}>{t(lang, 'settingsDevProSub')}</Text>
            </View>
            <Switch
              value={isPro}
              onValueChange={setDevPro}
              trackColor={{ false: theme.surfaceElevated, true: theme.accent }}
              thumbColor="#FAFAFA"
            />
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.bg,
  },
  content: {
    paddingHorizontal: SPACING.md,
    gap: 16,
  },
  title: {
    color: theme.textPrimary,
    fontSize: 24,
    fontWeight: '800',
  },
  card: {
    backgroundColor: theme.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    padding: SPACING.md,
    gap: 10,
  },
  cardTitle: {
    color: theme.textPrimary,
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  label: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  pill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    backgroundColor: theme.bg,
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
    fontSize: 13,
    fontWeight: '700',
  },
  pillTextActive: {
    color: theme.accent,
  },
  input: {
    ...TABULAR_NUMS,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: theme.accent,
    borderRadius: RADIUS.md,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 6,
  },
  saveBtnText: {
    color: '#04150E',
    fontSize: 15,
    fontWeight: '800',
  },
  devCard: {
    backgroundColor: theme.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.35)',
    padding: SPACING.md,
  },
  devRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  devTitle: {
    color: theme.warning,
    fontSize: 14,
    fontWeight: '700',
  },
  devSub: {
    color: theme.textSecondary,
    fontSize: 12,
    lineHeight: 17,
  },
});
