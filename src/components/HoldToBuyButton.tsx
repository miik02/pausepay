import React, { useEffect, useRef, useState } from 'react';
import { Animated, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { RADIUS, theme } from '../theme/tokens';

interface HoldToBuyButtonProps {
  idleLabel: string;
  holdingLabel: string;
  releasedEarlyLabel: string;
  durationMs?: number;
  onConfirm: () => void;
}

export function HoldToBuyButton({
  idleLabel,
  holdingLabel,
  releasedEarlyLabel,
  durationMs = 2500,
  onConfirm,
}: HoldToBuyButtonProps) {
  const [btnWidth, setBtnWidth] = useState(320);
  const [holding, setHolding] = useState(false);
  const [releasedNotice, setReleasedNotice] = useState(false);

  const progress = useRef(new Animated.Value(0)).current;
  const tickInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const noticeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = () => {
    if (tickInterval.current) {
      clearInterval(tickInterval.current);
      tickInterval.current = null;
    }
    if (noticeTimeout.current) {
      clearTimeout(noticeTimeout.current);
      noticeTimeout.current = null;
    }
  };

  useEffect(() => {
    return () => clearTimers();
  }, []);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 40) setBtnWidth(w);
  };

  const handlePressIn = () => {
    clearTimers();
    setReleasedNotice(false);
    setHolding(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

    tickInterval.current = setInterval(() => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }, 450);

    Animated.timing(progress, {
      toValue: 1,
      duration: durationMs,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        clearTimers();
        setHolding(false);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
        onConfirm();
      }
    });
  };

  const handlePressOut = () => {
    if (!holding) return;
    clearTimers();
    setHolding(false);
    progress.stopAnimation((currentVal) => {
      if (currentVal > 0.08 && currentVal < 0.99) {
        setReleasedNotice(true);
        noticeTimeout.current = setTimeout(() => setReleasedNotice(false), 1800);
      }
      Animated.timing(progress, {
        toValue: 0,
        duration: 220,
        useNativeDriver: true,
      }).start();
    });
  };

  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [-btnWidth, 0],
  });

  const label = holding ? holdingLabel : releasedNotice ? releasedEarlyLabel : idleLabel;

  return (
    <Pressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onLayout={onLayout}
      style={[
        styles.container,
        holding && styles.containerHolding,
        releasedNotice && styles.containerSafe,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.fill,
          { width: btnWidth, transform: [{ translateX }] },
        ]}
      />
      <View style={styles.content}>
        <Ionicons
          name={releasedNotice ? 'shield-checkmark' : 'hand-left-outline'}
          size={16}
          color={releasedNotice ? theme.accent : holding ? '#FAFAFA' : theme.danger}
        />
        <Text
          style={[
            styles.label,
            holding && styles.labelHolding,
            releasedNotice && styles.labelSafe,
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    height: 50,
    borderRadius: RADIUS.md,
    backgroundColor: theme.dangerDim,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.35)',
    overflow: 'hidden',
    justifyContent: 'center',
  },
  containerHolding: {
    borderColor: theme.danger,
  },
  containerSafe: {
    backgroundColor: theme.accentDim,
    borderColor: theme.accent,
  },
  fill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: theme.danger,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 14,
  },
  label: {
    color: theme.danger,
    fontSize: 13,
    fontWeight: '700',
  },
  labelHolding: {
    color: '#FAFAFA',
  },
  labelSafe: {
    color: theme.accent,
  },
});
