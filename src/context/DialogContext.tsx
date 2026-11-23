import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Animated, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, SPACING, theme } from '../theme/tokens';

export type DialogTone = 'accent' | 'warning' | 'danger' | 'neutral';
export type DialogActionVariant = 'primary' | 'warning' | 'danger' | 'secondary';

export interface DialogAction {
  label: string;
  variant?: DialogActionVariant;
  onPress?: () => void | Promise<void>;
}

export interface DialogOptions {
  title: string;
  message?: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  tone?: DialogTone;
  actions?: DialogAction[];
}

interface DialogContextValue {
  showDialog: (options: DialogOptions) => void;
  closeDialog: () => void;
}

const DialogContext = createContext<DialogContextValue | null>(null);

const TONE_STYLES: Record<DialogTone, { color: string; bg: string; border: string }> = {
  accent: {
    color: theme.accent,
    bg: theme.accentDim,
    border: 'rgba(16, 185, 129, 0.35)',
  },
  warning: {
    color: theme.warning,
    bg: theme.warningDim,
    border: 'rgba(245, 158, 11, 0.35)',
  },
  danger: {
    color: theme.danger,
    bg: theme.dangerDim,
    border: 'rgba(239, 68, 68, 0.35)',
  },
  neutral: {
    color: theme.textPrimary,
    bg: theme.surfaceElevated,
    border: theme.borderStrong,
  },
};

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [options, setOptions] = useState<DialogOptions | null>(null);
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!options) return;
    anim.setValue(0);
    Animated.spring(anim, {
      toValue: 1,
      useNativeDriver: true,
      damping: 20,
      stiffness: 260,
    }).start();
  }, [options, anim]);

  const showDialog = useCallback((next: DialogOptions) => {
    setOptions(next);
  }, []);

  const closeDialog = useCallback(() => {
    setOptions(null);
  }, []);

  const handleAction = (action: DialogAction) => {
    Haptics.impactAsync(
      action.variant === 'danger'
        ? Haptics.ImpactFeedbackStyle.Medium
        : Haptics.ImpactFeedbackStyle.Light
    ).catch(() => {});

    const callback = action.onPress;
    setOptions(null);

    if (callback) {
      setTimeout(() => {
        Promise.resolve(callback()).catch(() => {});
      }, 170);
    }
  };

  const toneCfg = TONE_STYLES[options?.tone ?? 'neutral'];
  const actions: DialogAction[] =
    options?.actions && options.actions.length > 0
      ? options.actions
      : [{ label: 'OK', variant: 'primary' }];

  return (
    <DialogContext.Provider value={{ showDialog, closeDialog }}>
      {children}

      <Modal
        visible={Boolean(options)}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={closeDialog}
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
          <Pressable style={styles.backdrop} onPress={closeDialog} />

          {options && (
            <Animated.View
              style={[
                styles.card,
                { borderColor: toneCfg.border },
                {
                  opacity: anim,
                  transform: [
                    {
                      scale: anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0.92, 1],
                      }),
                    },
                  ],
                },
              ]}
            >
              <Pressable style={styles.closeX} onPress={closeDialog} hitSlop={10}>
                <Ionicons name="close" size={16} color={theme.textMuted} />
              </Pressable>

              {options.icon && (
                <View
                  style={[
                    styles.iconBadge,
                    { backgroundColor: toneCfg.bg, borderColor: toneCfg.border },
                  ]}
                >
                  <Ionicons name={options.icon} size={24} color={toneCfg.color} />
                </View>
              )}

              <Text style={styles.title}>{options.title}</Text>

              {Boolean(options.message) && (
                <Text style={styles.message}>{options.message}</Text>
              )}

              <View style={styles.actionsWrap}>
                {actions.map((act, idx) => {
                  const variant = act.variant ?? 'secondary';
                  return (
                    <Pressable
                      key={`${act.label}-${idx}`}
                      style={[
                        styles.btn,
                        variant === 'primary' && styles.btnPrimary,
                        variant === 'warning' && styles.btnWarning,
                        variant === 'danger' && styles.btnDanger,
                        variant === 'secondary' && styles.btnSecondary,
                      ]}
                      onPress={() => handleAction(act)}
                    >
                      <Text
                        style={[
                          styles.btnText,
                          variant === 'primary' && styles.btnTextDark,
                          variant === 'warning' && styles.btnTextDark,
                          variant === 'danger' && styles.btnTextDanger,
                          variant === 'secondary' && styles.btnTextSecondary,
                        ]}
                      >
                        {act.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Animated.View>
          )}
        </View>
      </Modal>
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('useDialog must be used inside DialogProvider');
  return ctx;
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
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: theme.surface,
    borderRadius: 22,
    borderWidth: 1,
    padding: SPACING.lg,
    alignItems: 'center',
    gap: 10,
  },
  closeX: {
    position: 'absolute',
    top: 14,
    right: 14,
    width: 28,
    height: 28,
    borderRadius: RADIUS.full,
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  title: {
    color: theme.textPrimary,
    fontSize: 19,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.2,
    paddingHorizontal: 18,
  },
  message: {
    color: theme.textSecondary,
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  actionsWrap: {
    width: '100%',
    gap: 8,
    marginTop: 10,
  },
  btn: {
    width: '100%',
    height: 46,
    borderRadius: RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  btnPrimary: {
    backgroundColor: theme.accent,
  },
  btnWarning: {
    backgroundColor: theme.warning,
  },
  btnDanger: {
    backgroundColor: theme.dangerDim,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.45)',
  },
  btnSecondary: {
    backgroundColor: theme.bg,
    borderWidth: 1,
    borderColor: theme.borderStrong,
  },
  btnText: {
    fontSize: 14,
    fontWeight: '800',
  },
  btnTextDark: {
    color: '#04150E',
  },
  btnTextDanger: {
    color: theme.danger,
  },
  btnTextSecondary: {
    color: theme.textSecondary,
  },
});
