import React, { useEffect, useRef } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, SPACING, theme } from '../theme/tokens';

interface ContextualTipModalProps {
  visible: boolean;
  title: string;
  body: string;
  actionLabel: string;
  arrowLeftPercent: `${number}%`;
  onDismiss: () => void;
}

export function ContextualTipModal({
  visible,
  title,
  body,
  actionLabel,
  arrowLeftPercent,
  onDismiss,
}: ContextualTipModalProps) {
  const insets = useSafeAreaInsets();
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) return;
    anim.setValue(0);
    Animated.spring(anim, {
      toValue: 1,
      useNativeDriver: true,
      damping: 18,
      stiffness: 240,
    }).start();
  }, [visible, anim]);

  if (!visible) return null;

  // En iOS Modal se dibuja fuera de SafeAreaView: compensamos barra inferior + tabs (58px)
  const bottomOffset = 58 + Math.max(insets.bottom, 10) + 14;

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onDismiss();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <View style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={handleClose} />

        <Animated.View
          style={[
            styles.bubbleWrap,
            {
              bottom: bottomOffset,
              opacity: anim,
              transform: [
                {
                  translateY: anim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [12, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.bubble}>
            <View style={styles.header}>
              <View style={styles.dotBadge}>
                <Ionicons name="sparkles" size={14} color={theme.accent} />
              </View>
              <Text style={styles.title}>{title}</Text>
            </View>

            <Text style={styles.body}>{body}</Text>

            <Pressable style={styles.btn} onPress={handleClose}>
              <Text style={styles.btnText}>{actionLabel}</Text>
            </Pressable>
          </View>

          <View style={[styles.arrow, { left: arrowLeftPercent }]} />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  backdrop: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  bubbleWrap: {
    position: 'absolute',
    left: SPACING.md,
    right: SPACING.md,
  },
  bubble: {
    backgroundColor: theme.surfaceElevated,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: theme.accent,
    padding: SPACING.md,
    gap: 10,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dotBadge: {
    width: 26,
    height: 26,
    borderRadius: RADIUS.full,
    backgroundColor: theme.accentDim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    color: theme.textPrimary,
    fontSize: 15,
    fontWeight: '800',
  },
  body: {
    color: theme.textSecondary,
    fontSize: 13,
    lineHeight: 19,
  },
  btn: {
    alignSelf: 'flex-end',
    backgroundColor: theme.accent,
    borderRadius: RADIUS.full,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  btnText: {
    color: '#04150E',
    fontSize: 12,
    fontWeight: '800',
  },
  arrow: {
    position: 'absolute',
    bottom: -7,
    marginLeft: -7,
    width: 14,
    height: 14,
    backgroundColor: theme.surfaceElevated,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: theme.accent,
    transform: [{ rotate: '45deg' }],
  },
});
