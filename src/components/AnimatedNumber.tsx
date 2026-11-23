import React, { useEffect, useRef, useState } from 'react';
import { StyleProp, Text, TextStyle } from 'react-native';
import { TABULAR_NUMS } from '../theme/tokens';

interface AnimatedNumberProps {
  value: number;
  format: (val: number) => string;
  duration?: number;
  startFromZero?: boolean;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
  adjustsFontSizeToFit?: boolean;
}

export function AnimatedNumber({
  value,
  format,
  duration = 320,
  startFromZero = false,
  style,
  numberOfLines,
  adjustsFontSizeToFit,
}: AnimatedNumberProps) {
  const safeTarget = Number.isFinite(value) ? value : 0;
  const initialVal = startFromZero ? 0 : safeTarget;
  const [display, setDisplay] = useState(initialVal);
  const currentRef = useRef(initialVal);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = currentRef.current;
    const to = safeTarget;

    if (Math.abs(to - from) < 0.001) {
      currentRef.current = to;
      setDisplay(to);
      return;
    }

    const startTs = Date.now();

    const step = () => {
      const elapsed = Date.now() - startTs;
      const t = Math.min(1, elapsed / Math.max(1, duration));
      // Ease-out cubic: arranque vivo y frenada elegante
      const eased = 1 - Math.pow(1 - t, 3);
      const next = from + (to - from) * eased;

      currentRef.current = next;
      setDisplay(next);

      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        currentRef.current = to;
        setDisplay(to);
      }
    };

    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, [safeTarget, duration]);

  return (
    <Text
      style={[TABULAR_NUMS, style]}
      numberOfLines={numberOfLines}
      adjustsFontSizeToFit={adjustsFontSizeToFit}
    >
      {format(display)}
    </Text>
  );
}
