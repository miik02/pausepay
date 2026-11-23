import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { t } from '../constants/i18n';
import { RADIUS, SPACING, TABULAR_NUMS, theme } from '../theme/tokens';
import { CurrencyCode, ImpulseItem, LanguageCode } from '../types';
import { formatCurrency } from '../utils/finance';
import { AnimatedNumber } from './AnimatedNumber';
import { ScalePressable } from './ScalePressable';

export interface CelebrationPayload {
  item: ImpulseItem;
  amountSaved: number;
  hoursSaved: number;
  futureValue: number;
  isSubscription?: boolean;
}

interface VaultCelebrationModalProps {
  payload: CelebrationPayload | null;
  currency: CurrencyCode;
  lang: LanguageCode;
  onClose: () => void;
  onShare: (item: ImpulseItem) => void;
}

const PARTICLES = Array.from({ length: 12 }, (_, idx) => {
  const angle = (idx / 12) * Math.PI * 2;
  const dist = idx % 2 === 0 ? 78 : 56;
  const colors = ['#10B981', '#34D399', '#F59E0B', '#FAFAFA'];
  return {
    dx: Math.cos(angle) * dist,
    dy: Math.sin(angle) * dist,
    size: idx % 3 === 0 ? 7 : 5,
    color: colors[idx % colors.length],
  };
});

export function VaultCelebrationModal({
  payload,
  currency,
  lang,
  onClose,
  onShare,
}: VaultCelebrationModalProps) {
  const insets = useSafeAreaInsets();
  const cardAnim = useRef(new Animated.Value(0)).current;
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;
  const burst = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!payload) return;
    cardAnim.setValue(0);
    ring1.setValue(0);
    ring2.setValue(0);
    burst.setValue(0);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});

    Animated.parallel([
      Animated.spring(cardAnim, {
        toValue: 1,
        useNativeDriver: true,
        damping: 16,
        stiffness: 220,
      }),
      Animated.timing(burst, {
        toValue: 1,
        duration: 720,
        useNativeDriver: true,
      }),
      Animated.timing(ring1, {
        toValue: 1,
        duration: 820,
        useNativeDriver: true,
      }),
      Animated.sequence([
        Animated.delay(140),
        Animated.timing(ring2, {
          toValue: 1,
          duration: 820,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [payload, cardAnim, ring1, ring2, burst]);

  if (!payload) return null;

  return (
    <Modal
      visible={Boolean(payload)}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.overlay,
          {
            paddingTop: Math.max(insets.top, 20),
            paddingBottom: Math.max(insets.bottom, 20),
          },
        ]}
      >
        <Pressable style={styles.backdrop} onPress={onClose} />

        <Animated.View
          style={[
            styles.card,
            {
              opacity: cardAnim,
              transform: [
                {
                  scale: cardAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.88, 1],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.burstStage}>
            <Animated.View
              pointerEvents="none"
              style={[
                styles.ring,
                {
                  opacity: ring1.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.65, 0.4, 0] }),
                  transform: [
                    {
                      scale: ring1.interpolate({ inputRange: [0, 1], outputRange: [0.7, 2.3] }),
                    },
                  ],
                },
              ]}
            />
            <Animated.View
              pointerEvents="none"
              style={[
                styles.ring,
                {
                  opacity: ring2.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.5, 0.3, 0] }),
                  transform: [
                    {
                      scale: ring2.interpolate({ inputRange: [0, 1], outputRange: [0.7, 2.1] }),
                    },
                  ],
                },
              ]}
            />

            {PARTICLES.map((p, idx) => (
              <Animated.View
                key={idx}
                pointerEvents="none"
                style={[
                  styles.particle,
                  {
                    width: p.size,
                    height: p.size,
                    backgroundColor: p.color,
                    opacity: burst.interpolate({
                      inputRange: [0, 0.25, 0.85, 1],
                      outputRange: [0, 1, 0.7, 0],
                    }),
                    transform: [
                      {
                        translateX: burst.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, p.dx],
                        }),
                      },
                      {
                        translateY: burst.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, p.dy],
                        }),
                      },
                      {
                        scale: burst.interpolate({
                          inputRange: [0, 0.3, 1],
                          outputRange: [0.4, 1.15, 0.3],
                        }),
                      },
                    ],
                  },
                ]}
              />
            ))}

            <View style={styles.shieldCore}>
              <Ionicons name="shield-checkmark" size={34} color="#04150E" />
            </View>
          </View>

          <Text style={styles.kicker}>
            {payload.isSubscription ? t(lang, 'subsRescuedToastTitle') : t(lang, 'victoryTitle')}
          </Text>
          <Text style={styles.itemName} numberOfLines={2}>
            {payload.item.name}
          </Text>

          <AnimatedNumber
            value={payload.amountSaved}
            startFromZero
            duration={650}
            format={(val) => `+${formatCurrency(val, currency, 0)}`}
            style={styles.heroAmount}
            numberOfLines={1}
            adjustsFontSizeToFit
          />

          <View style={styles.pillRow}>
            <View style={styles.statPill}>
              <Ionicons name="time-outline" size={14} color={theme.warning} />
              <Text style={styles.statPillText}>
                +{payload.hoursSaved.toFixed(1)} h
              </Text>
            </View>
            <View style={styles.statPill}>
              <Ionicons name="trending-up-outline" size={14} color={theme.accent} />
              <Text style={[styles.statPillText, { color: theme.accent }]}>
                {formatCurrency(payload.futureValue, currency, 0)}
              </Text>
            </View>
          </View>

          <View style={styles.actions}>
            <ScalePressable
              style={styles.shareBtn}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
                onShare(payload.item);
              }}
            >
              <Ionicons name="share-social" size={18} color="#04150E" />
              <Text style={styles.shareBtnText}>{t(lang, 'victoryShareBtn')}</Text>
            </ScalePressable>

            <Pressable style={styles.doneBtn} onPress={onClose}>
              <Text style={styles.doneBtnText}>{t(lang, 'tipGotIt')}</Text>
            </Pressable>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: theme.surface,
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.45)',
    padding: SPACING.lg,
    alignItems: 'center',
    gap: 10,
  },
  burstStage: {
    width: 120,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    width: 66,
    height: 66,
    borderRadius: RADIUS.full,
    borderWidth: 2,
    borderColor: theme.accent,
  },
  particle: {
    position: 'absolute',
    borderRadius: RADIUS.full,
  },
  shieldCore: {
    width: 68,
    height: 68,
    borderRadius: RADIUS.full,
    backgroundColor: theme.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kicker: {
    color: theme.accent,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  itemName: {
    color: theme.textSecondary,
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
  heroAmount: {
    color: theme.textPrimary,
    fontSize: 48,
    fontWeight: '900',
    letterSpacing: -1,
    marginVertical: 2,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  statPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.borderStrong,
    borderRadius: RADIUS.full,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  statPillText: {
    ...TABULAR_NUMS,
    color: theme.textPrimary,
    fontSize: 13,
    fontWeight: '800',
  },
  actions: {
    width: '100%',
    gap: 8,
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.accent,
    borderRadius: RADIUS.md,
    height: 50,
  },
  shareBtnText: {
    color: '#04150E',
    fontSize: 15,
    fontWeight: '800',
  },
  doneBtn: {
    height: 46,
    borderRadius: RADIUS.md,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    color: theme.textSecondary,
    fontSize: 14,
    fontWeight: '700',
  },
});
