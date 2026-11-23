import React, { useEffect, useState } from 'react';
import {
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
import { Ionicons } from '@expo/vector-icons';
import { CURRENCIES } from '../../constants/etfs';
import { t } from '../../constants/i18n';
import { useApp } from '../../context/AppContext';
import { useDialog } from '../../context/DialogContext';
import { RADIUS, SPACING, TABULAR_NUMS, theme } from '../../theme/tokens';
import { CurrencyCode, LanguageCode } from '../../types';
import { exportBackupFile, pickAndParseBackup } from '../../utils/backup';

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const { showDialog } = useDialog();
  const { profile, items, subscriptions, goals, activeGoal, cleanDays, isPro, setDevPro, updateProfile, resetTutorials, replaceAllData } = useApp();
  const lang = profile.language;

  const [income, setIncome] = useState(String(profile.monthlyNetIncome));
  const [hours, setHours] = useState(String(profile.weeklyHours));
  const [commute, setCommute] = useState(String(profile.commuteWeeklyHours));

  useEffect(() => {
    setIncome(String(profile.monthlyNetIncome));
    setHours(String(profile.weeklyHours));
    setCommute(String(profile.commuteWeeklyHours));
  }, [profile.monthlyNetIncome, profile.weeklyHours, profile.commuteWeeklyHours]);

  const okLabel = lang === 'es' ? 'Entendido' : 'Got it';

  const handleSave = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    await updateProfile({
      monthlyNetIncome: Math.max(100, Number(income.replace(',', '.')) || profile.monthlyNetIncome),
      weeklyHours: Math.max(1, Number(hours.replace(',', '.')) || profile.weeklyHours),
      commuteWeeklyHours: Math.max(0, Number(commute.replace(',', '.')) || 0),
    });
    showDialog({
      title: t(lang, 'settingsSaved'),
      icon: 'checkmark-circle',
      tone: 'accent',
      actions: [{ label: okLabel, variant: 'primary' }],
    });
  };

  const handleExport = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const res = await exportBackupFile(profile, items, subscriptions, goals, activeGoal.id, cleanDays);
    if (!res.ok) {
      showDialog({
        title: 'PausePay',
        message: t(lang, 'backupExportErr'),
        icon: 'alert-circle-outline',
        tone: 'danger',
        actions: [{ label: okLabel, variant: 'secondary' }],
      });
    }
  };

  const handleImport = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const res = await pickAndParseBackup();
    if (res.status === 'cancelled') return;

    if (res.status === 'invalid') {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      showDialog({
        title: t(lang, 'backupInvalidTitle'),
        message: t(lang, 'backupInvalidMsg'),
        icon: 'alert-circle-outline',
        tone: 'danger',
        actions: [{ label: okLabel, variant: 'secondary' }],
      });
      return;
    }

    const totalEntries = res.data.items.length + (res.data.subscriptions?.length ?? 0);
    showDialog({
      title: t(lang, 'backupConfirmTitle'),
      message: `${t(lang, 'backupConfirmMsg')} ${totalEntries}`,
      icon: 'cloud-upload-outline',
      tone: 'warning',
      actions: [
        {
          label: t(lang, 'backupConfirmAction'),
          variant: 'primary',
          onPress: async () => {
            await replaceAllData(res.data.profile, res.data.items, res.data.subscriptions ?? [], res.data.goals, res.data.activeGoalId, res.data.cleanDays ?? []);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            showDialog({
              title: t(lang, 'backupSuccessTitle'),
              message: t(lang, 'backupSuccessMsg'),
              icon: 'checkmark-circle',
              tone: 'accent',
              actions: [{ label: okLabel, variant: 'primary' }],
            });
          },
        },
        { label: t(lang, 'vaultCancel'), variant: 'secondary' },
      ],
    });
  };

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 12, paddingBottom: 36 },
      ]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
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

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t(lang, 'settingsBackupTitle')}</Text>
        <Text style={styles.subText}>{t(lang, 'settingsBackupSub')}</Text>

        <View style={styles.backupRow}>
          <Pressable style={styles.secondaryBtn} onPress={handleExport}>
            <Ionicons name="download-outline" size={16} color={theme.accent} />
            <Text style={styles.secondaryBtnText}>{t(lang, 'settingsExportBtn')}</Text>
          </Pressable>

          <Pressable style={styles.secondaryBtn} onPress={handleImport}>
            <Ionicons name="cloud-upload-outline" size={16} color={theme.textPrimary} />
            <Text style={[styles.secondaryBtnText, { color: theme.textPrimary }]}>
              {t(lang, 'settingsImportBtn')}
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t(lang, 'settingsTutorialTitle')}</Text>
        <Pressable
          style={styles.secondaryBtn}
          onPress={async () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            await resetTutorials();
            showDialog({
              title: t(lang, 'settingsTutorialTitle'),
              message: t(lang, 'settingsTutorialResetMsg'),
              icon: 'sparkles',
              tone: 'accent',
              actions: [{ label: okLabel, variant: 'primary' }],
            });
          }}
        >
          <Ionicons name="help-circle-outline" size={16} color={theme.accent} />
          <Text style={styles.secondaryBtnText}>{t(lang, 'settingsTutorialBtn')}</Text>
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
  },
  subText: {
    color: theme.textSecondary,
    fontSize: 12,
    lineHeight: 17,
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
  backupRow: {
    gap: 8,
    marginTop: 4,
  },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    borderRadius: RADIUS.md,
    paddingVertical: 13,
  },
  secondaryBtnText: {
    color: theme.accent,
    fontSize: 14,
    fontWeight: '700',
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
