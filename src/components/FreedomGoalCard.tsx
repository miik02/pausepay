import React, { useEffect, useState } from 'react';
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
import { CURRENCIES } from '../constants/etfs';
import { t } from '../constants/i18n';
import { RADIUS, SPACING, TABULAR_NUMS, theme } from '../theme/tokens';
import { CurrencyCode, FreedomGoal, LanguageCode } from '../types';
import { formatCurrency } from '../utils/finance';

interface FreedomGoalCardProps {
  goals: FreedomGoal[];
  activeGoal: FreedomGoal;
  savedAmount: number;
  currency: CurrencyCode;
  lang: LanguageCode;
  isPro: boolean;
  onSaveGoal: (goal: FreedomGoal) => Promise<void>;
  onAddGoal: (goal: FreedomGoal) => Promise<void>;
  onSelectGoal: (goalId: string) => Promise<void>;
}

const GOAL_PRESETS = [
  { icon: 'airplane-outline', es: 'Viaje', en: 'Trip', amount: 1200 },
  { icon: 'shield-checkmark-outline', es: 'Fondo emergencia', en: 'Emergency fund', amount: 2500 },
  { icon: 'trending-up-outline', es: 'Inversión ETF', en: 'ETF Portfolio', amount: 5000 },
  { icon: 'laptop-outline', es: 'Capricho consciente', en: 'Mindful upgrade', amount: 800 },
];

export function FreedomGoalCard({
  goals,
  activeGoal,
  savedAmount,
  currency,
  lang,
  isPro,
  onSaveGoal,
  onAddGoal,
  onSelectGoal,
}: FreedomGoalCardProps) {
  const insets = useSafeAreaInsets();
  const [modalOpen, setModalOpen] = useState(false);
  const [editingNew, setEditingNew] = useState(false);
  const [name, setName] = useState(activeGoal.name);
  const [targetText, setTargetText] = useState(String(activeGoal.targetAmount));
  const [icon, setIcon] = useState(activeGoal.icon);
  const [inlineNotice, setInlineNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!editingNew) {
      setName(activeGoal.name);
      setTargetText(String(activeGoal.targetAmount));
      setIcon(activeGoal.icon);
    }
  }, [activeGoal, editingNew, modalOpen]);

  const target = Math.max(1, activeGoal.targetAmount);
  const pct = Math.min(100, Math.round((savedAmount / target) * 100));
  const reached = savedAmount >= target;

  const openEditor = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setEditingNew(false);
    setInlineNotice(null);
    setModalOpen(true);
  };

  const handleStartNew = () => {
    if (!isPro) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      setInlineNotice(t(lang, 'goalProLockedNotice'));
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setInlineNotice(null);
    setEditingNew(true);
    setName('');
    setTargetText('1500');
    setIcon('airplane-outline');
  };

  const handleSave = async () => {
    const parsedTarget = Math.max(50, Number(targetText.replace(',', '.')) || 1000);
    const cleanName = name.trim() || (lang === 'es' ? 'Fondo de libertad' : 'Freedom Fund');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    if (editingNew) {
      await onAddGoal({
        id: `goal-${Date.now()}`,
        name: cleanName,
        targetAmount: parsedTarget,
        icon,
      });
    } else {
      await onSaveGoal({
        ...activeGoal,
        name: cleanName,
        targetAmount: parsedTarget,
        icon,
      });
    }
    setEditingNew(false);
    setModalOpen(false);
  };

  return (
    <>
      <Pressable style={styles.card} onPress={openEditor}>
        <View style={styles.topRow}>
          <View style={styles.leftRow}>
            <View style={styles.iconCircle}>
              <Ionicons
                name={activeGoal.icon as React.ComponentProps<typeof Ionicons>['name']}
                size={16}
                color={theme.accent}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.kicker}>{t(lang, 'goalKicker')}</Text>
              <Text style={styles.goalName} numberOfLines={1}>
                {activeGoal.name}
              </Text>
            </View>
          </View>

          <View style={styles.rightCol}>
            <Text style={[styles.pctText, reached && { color: theme.accent }]}>{pct}%</Text>
            <Text style={styles.editHint}>{t(lang, 'goalEditHint')} ›</Text>
          </View>
        </View>

        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.max(4, pct)}%` }]} />
        </View>

        <View style={styles.bottomRow}>
          <Text style={styles.progressText}>
            {formatCurrency(savedAmount, currency, 0)} / {formatCurrency(target, currency, 0)}
          </Text>
          {reached && <Text style={styles.reachedText}>{t(lang, 'goalCompleted')}</Text>}
        </View>
      </Pressable>

      <Modal
        visible={modalOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setModalOpen(false)}
      >
        <KeyboardAvoidingView
          style={styles.overlay}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <Pressable style={styles.backdrop} onPress={() => setModalOpen(false)} />

          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 18) + 10 }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t(lang, 'goalModalTitle')}</Text>
              <Pressable style={styles.closeBtn} onPress={() => setModalOpen(false)} hitSlop={10}>
                <Ionicons name="close" size={18} color={theme.textSecondary} />
              </Pressable>
            </View>

            <ScrollView
              contentContainerStyle={styles.modalBody}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.modalSub}>{t(lang, 'goalModalSub')}</Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
              >
                {goals.map((g) => {
                  const selected = !editingNew && g.id === activeGoal.id;
                  return (
                    <Pressable
                      key={g.id}
                      style={[styles.chip, selected && styles.chipActive]}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                        setEditingNew(false);
                        setInlineNotice(null);
                        onSelectGoal(g.id);
                      }}
                    >
                      <Text style={[styles.chipText, selected && styles.chipTextActive]}>
                        {g.name}
                      </Text>
                    </Pressable>
                  );
                })}
                <Pressable style={styles.chipNew} onPress={handleStartNew}>
                  {!isPro && <Ionicons name="lock-closed" size={11} color={theme.warning} />}
                  <Text style={styles.chipNewText}>{t(lang, 'goalAddProBtn')}</Text>
                </Pressable>
              </ScrollView>

              <Text style={styles.label}>{t(lang, 'goalPresetsLabel')}</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipRow}
              >
                {GOAL_PRESETS.map((p) => (
                  <Pressable
                    key={p.es}
                    style={styles.presetChip}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                      setName(lang === 'es' ? p.es : p.en);
                      setTargetText(String(p.amount));
                      setIcon(p.icon);
                    }}
                  >
                    <Ionicons
                      name={p.icon as React.ComponentProps<typeof Ionicons>['name']}
                      size={13}
                      color={theme.accent}
                    />
                    <Text style={styles.presetText}>{lang === 'es' ? p.es : p.en}</Text>
                  </Pressable>
                ))}
              </ScrollView>

              <Text style={styles.label}>{t(lang, 'goalNameLabel')}</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder={lang === 'es' ? 'Ej. Viaje a Japón' : 'e.g. Trip to Japan'}
                placeholderTextColor={theme.textMuted}
                maxLength={32}
              />

              <Text style={styles.label}>
                {t(lang, 'goalTargetLabel')} ({CURRENCIES[currency].symbol})
              </Text>
              <TextInput
                style={styles.input}
                value={targetText}
                onChangeText={setTargetText}
                keyboardType="decimal-pad"
                placeholder="1000"
                placeholderTextColor={theme.textMuted}
                maxLength={8}
              />

              {inlineNotice && (
                <View style={styles.inlineNotice}>
                  <Ionicons name="lock-closed" size={14} color={theme.warning} />
                  <Text style={styles.inlineNoticeText}>{inlineNotice}</Text>
                </View>
              )}
            </ScrollView>

            <Pressable style={styles.saveBtn} onPress={handleSave}>
              <Text style={styles.saveBtnText}>{t(lang, 'goalSaveBtn')}</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: theme.border,
    padding: SPACING.md,
    gap: 10,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
  },
  leftRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: RADIUS.full,
    backgroundColor: theme.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: {
    color: theme.textMuted,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  goalName: {
    color: theme.textPrimary,
    fontSize: 15,
    fontWeight: '700',
    marginTop: 1,
  },
  rightCol: {
    alignItems: 'flex-end',
  },
  pctText: {
    ...TABULAR_NUMS,
    color: theme.textPrimary,
    fontSize: 16,
    fontWeight: '800',
  },
  editHint: {
    color: theme.textMuted,
    fontSize: 11,
    fontWeight: '600',
  },
  track: {
    height: 7,
    borderRadius: RADIUS.full,
    backgroundColor: theme.bg,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: RADIUS.full,
    backgroundColor: theme.accent,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressText: {
    ...TABULAR_NUMS,
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  reachedText: {
    color: theme.accent,
    fontSize: 12,
    fontWeight: '800',
  },
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
    maxHeight: '86%',
    backgroundColor: theme.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: theme.borderStrong,
    paddingHorizontal: SPACING.md,
    paddingTop: 16,
    gap: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
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
  modalBody: {
    gap: 10,
    paddingBottom: 6,
  },
  modalSub: {
    color: theme.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  chipRow: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipActive: {
    backgroundColor: theme.accentDim,
    borderColor: theme.accent,
  },
  chipText: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  chipTextActive: {
    color: theme.accent,
  },
  chipNew: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  chipNewText: {
    color: theme.textPrimary,
    fontSize: 12,
    fontWeight: '700',
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: RADIUS.full,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  presetText: {
    color: theme.textPrimary,
    fontSize: 12,
    fontWeight: '600',
  },
  label: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  input: {
    ...TABULAR_NUMS,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.textPrimary,
    fontSize: 16,
    fontWeight: '700',
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
    fontWeight: '600',
    lineHeight: 16,
  },
  saveBtn: {
    backgroundColor: theme.accent,
    borderRadius: RADIUS.md,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveBtnText: {
    color: '#04150E',
    fontSize: 15,
    fontWeight: '800',
  },
});
