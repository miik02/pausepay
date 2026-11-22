import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { t } from '../../constants/i18n';
import { useApp } from '../../context/AppContext';
import { RADIUS, SPACING, TABULAR_NUMS, theme } from '../../theme/tokens';
import { formatCurrency } from '../../utils/finance';

export default function VaultScreen() {
  const insets = useSafeAreaInsets();
  const { profile, items, vaultStats } = useApp();
  const lang = profile.language;

  const activeItems = items.filter((i) => i.status === 'quarantine');

  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 12, paddingBottom: 32 },
      ]}
    >
      <Text style={styles.title}>{t(lang, 'vaultTitle')}</Text>

      <View style={styles.heroCard}>
        <Text style={styles.heroKicker}>{t(lang, 'vaultRescued')}</Text>
        <Text style={styles.heroValue}>
          {formatCurrency(vaultStats.totalResisted, profile.currency, 0)}
        </Text>
        <Text style={styles.heroSub}>
          {vaultStats.freedomDays.toFixed(1)} {t(lang, 'vaultFreedom')}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>
        {t(lang, 'vaultActive')} ({activeItems.length})
      </Text>

      {activeItems.length === 0 ? (
        <View style={styles.emptyCard}>
          <Ionicons name="shield-outline" size={28} color={theme.textMuted} />
          <Text style={styles.emptyText}>{t(lang, 'vaultEmpty')}</Text>
        </View>
      ) : (
        activeItems.map((item) => {
          const remainingMs = Math.max(0, item.unlockAt - Date.now());
          const remHours = Math.ceil(remainingMs / 3600000);
          return (
            <View key={item.id} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemPrice}>
                  {formatCurrency(item.price, profile.currency, 0)}
                  {item.frequency === 'monthly' ? '/mo' : ''}
                </Text>
              </View>
              <View style={styles.itemMetaRow}>
                <Text style={styles.itemMeta}>
                  {item.hoursCost.toFixed(1)} h · {formatCurrency(item.futureValue, profile.currency, 0)} ({item.horizonYears}y)
                </Text>
                <Text style={styles.itemTimer}>
                  {remHours > 0 ? `${t(lang, 'vaultUnlockIn')} ${remHours}h` : t(lang, 'vaultReady')}
                </Text>
              </View>
            </View>
          );
        })
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
    gap: 14,
  },
  title: {
    color: theme.textPrimary,
    fontSize: 24,
    fontWeight: '800',
  },
  heroCard: {
    backgroundColor: theme.surface,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
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
    ...TABULAR_NUMS,
    color: theme.accent,
    fontSize: 40,
    fontWeight: '800',
  },
  heroSub: {
    ...TABULAR_NUMS,
    color: theme.textSecondary,
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.7,
    marginTop: 6,
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
    borderColor: 'rgba(245, 158, 11, 0.25)',
    padding: SPACING.md,
    gap: 8,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemName: {
    color: theme.textPrimary,
    fontSize: 16,
    fontWeight: '700',
  },
  itemPrice: {
    ...TABULAR_NUMS,
    color: theme.warning,
    fontSize: 16,
    fontWeight: '800',
  },
  itemMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemMeta: {
    ...TABULAR_NUMS,
    color: theme.textSecondary,
    fontSize: 12,
  },
  itemTimer: {
    ...TABULAR_NUMS,
    color: theme.warning,
    fontSize: 12,
    fontWeight: '700',
  },
});
