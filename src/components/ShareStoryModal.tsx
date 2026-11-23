import React, { ComponentRef, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { t } from '../constants/i18n';
import { RADIUS, SPACING, theme } from '../theme/tokens';
import { CurrencyCode, LanguageCode } from '../types';
import { StoryCard, StoryPayload, StoryStyleId } from './StoryCard';

interface ShareStoryModalProps {
  payload: StoryPayload | null;
  currency: CurrencyCode;
  lang: LanguageCode;
  isPro: boolean;
  onClose: () => void;
}

const STYLE_OPTIONS: { id: StoryStyleId; proOnly: boolean }[] = [
  { id: 'obsidian', proOnly: false },
  { id: 'emerald', proOnly: true },
  { id: 'minimal', proOnly: true },
];

export function ShareStoryModal({
  payload,
  currency,
  lang,
  isPro,
  onClose,
}: ShareStoryModalProps) {
  const insets = useSafeAreaInsets();
  const cardRef = useRef<ComponentRef<typeof View>>(null);
  const [styleId, setStyleId] = useState<StoryStyleId>('obsidian');
  const [busy, setBusy] = useState(false);

  if (!payload) return null;

  const activeStyle: StoryStyleId = !isPro && styleId !== 'obsidian' ? 'obsidian' : styleId;

  const getStyleLabel = (id: StoryStyleId) => {
    if (id === 'obsidian') return t(lang, 'shareStyleObsidian');
    if (id === 'emerald') return t(lang, 'shareStyleEmerald');
    return t(lang, 'shareStyleMinimal');
  };

  const handleSelectStyle = (id: StoryStyleId, proOnly: boolean) => {
    if (proOnly && !isPro) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      Alert.alert(t(lang, 'simProLockedTitle'), t(lang, 'simProLockedMsg'));
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setStyleId(id);
  };

  const handleShare = async () => {
    if (!cardRef.current || busy) return;
    setBusy(true);
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert('PausePay', t(lang, 'shareError'));
        return;
      }

      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      const uri = await captureRef(cardRef as Parameters<typeof captureRef>[0], {
        format: 'png',
        quality: 1,
        result: 'tmpfile',
      });

      await Sharing.shareAsync(uri, {
        mimeType: 'image/png',
        dialogTitle: 'PausePay Story',
        UTI: 'public.png',
      });
    } catch {
      Alert.alert('PausePay', t(lang, 'shareError'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      visible={Boolean(payload)}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />

        <View
          style={[
            styles.sheet,
            { paddingBottom: Math.max(insets.bottom, 18) + 10 },
          ]}
        >
          <View style={styles.header}>
            <Text style={styles.title}>{t(lang, 'shareModalTitle')}</Text>
            <Pressable style={styles.closeBtn} onPress={onClose} hitSlop={10}>
              <Ionicons name="close" size={20} color={theme.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollBody}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.previewFrame}>
              <View ref={cardRef} collapsable={false}>
                <StoryCard
                  payload={payload}
                  styleId={activeStyle}
                  currency={currency}
                  lang={lang}
                />
              </View>
            </View>

            <View style={styles.styleRow}>
              {STYLE_OPTIONS.map((opt) => {
                const selected = activeStyle === opt.id;
                const locked = opt.proOnly && !isPro;
                return (
                  <Pressable
                    key={opt.id}
                    style={[styles.styleChip, selected && styles.styleChipActive]}
                    onPress={() => handleSelectStyle(opt.id, opt.proOnly)}
                  >
                    {locked && <Ionicons name="lock-closed" size={11} color={theme.warning} />}
                    <Text style={[styles.styleChipText, selected && styles.styleChipTextActive]}>
                      {getStyleLabel(opt.id)}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.privacy}>{t(lang, 'sharePrivacyNote')}</Text>
          </ScrollView>

          <Pressable
            style={[styles.shareBtn, busy && styles.shareBtnDisabled]}
            onPress={handleShare}
            disabled={busy}
          >
            {busy ? (
              <ActivityIndicator size="small" color="#04150E" />
            ) : (
              <Ionicons name="share-social" size={18} color="#04150E" />
            )}
            <Text style={styles.shareBtnText}>
              {busy ? t(lang, 'shareBusy') : t(lang, 'shareButton')}
            </Text>
          </Pressable>
        </View>
      </View>
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
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
  },
  sheet: {
    maxHeight: '92%',
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
    alignItems: 'center',
    gap: 14,
    paddingBottom: 6,
  },
  previewFrame: {
    padding: 4,
    borderRadius: 26,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
  },
  styleRow: {
    flexDirection: 'row',
    gap: 8,
    width: '100%',
  },
  styleChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 10,
    borderRadius: RADIUS.md,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
  },
  styleChipActive: {
    backgroundColor: theme.accentDim,
    borderColor: theme.accent,
  },
  styleChipText: {
    color: theme.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  styleChipTextActive: {
    color: theme.accent,
  },
  privacy: {
    color: theme.textMuted,
    fontSize: 11,
    textAlign: 'center',
  },
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.accent,
    borderRadius: RADIUS.md,
    height: 52,
  },
  shareBtnDisabled: {
    opacity: 0.7,
  },
  shareBtnText: {
    color: '#04150E',
    fontSize: 15,
    fontWeight: '800',
  },
});
