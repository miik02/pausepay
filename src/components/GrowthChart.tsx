import React, { useMemo, useState } from 'react';
import { LayoutChangeEvent, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, Line, LinearGradient, Path, Stop } from 'react-native-svg';
import { RADIUS, SPACING, TABULAR_NUMS, theme } from '../theme/tokens';
import { CurrencyCode, GrowthPoint } from '../types';
import { formatCurrency } from '../utils/finance';

interface GrowthChartProps {
  points: GrowthPoint[];
  currency: CurrencyCode;
  yearsLabel: string;
}

const CHART_HEIGHT = 138;
const PAD_TOP = 16;
const PAD_BOTTOM = 12;
const PAD_X = 8;

export function GrowthChart({ points, currency, yearsLabel }: GrowthChartProps) {
  const [width, setWidth] = useState(300);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 40) setWidth(w);
  };

  const geometry = useMemo(() => {
    if (points.length < 2) return null;
    const maxVal = Math.max(...points.map((p) => p.total), 1);
    const drawW = Math.max(40, width - PAD_X * 2);
    const drawH = CHART_HEIGHT - PAD_TOP - PAD_BOTTOM;

    const mapX = (idx: number) => PAD_X + (idx / (points.length - 1)) * drawW;
    const mapY = (val: number) => PAD_TOP + drawH - (Math.max(0, val) / maxVal) * drawH;

    const curveCoords = points.map((p, i) => ({ x: mapX(i), y: mapY(p.total) }));
    const principalCoords = points.map((p, i) => ({ x: mapX(i), y: mapY(p.principal) }));

    let linePath = `M ${curveCoords[0].x.toFixed(1)} ${curveCoords[0].y.toFixed(1)}`;
    for (let i = 1; i < curveCoords.length; i++) {
      const prev = curveCoords[i - 1];
      const curr = curveCoords[i];
      const midX = ((prev.x + curr.x) / 2).toFixed(1);
      linePath += ` Q ${prev.x.toFixed(1)} ${prev.y.toFixed(1)}, ${midX} ${((prev.y + curr.y) / 2).toFixed(1)}`;
    }
    const last = curveCoords[curveCoords.length - 1];
    linePath += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;

    const baselineY = (PAD_TOP + drawH).toFixed(1);
    const areaPath = `${linePath} L ${last.x.toFixed(1)} ${baselineY} L ${curveCoords[0].x.toFixed(1)} ${baselineY} Z`;

    const principalPath = principalCoords
      .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
      .join(' ');

    return {
      linePath,
      areaPath,
      principalPath,
      lastPoint: last,
      startTotal: points[0].total,
      endTotal: points[points.length - 1].total,
      endYear: points[points.length - 1].year,
    };
  }, [points, width]);

  if (!geometry) return null;

  return (
    <View style={styles.container} onLayout={onLayout}>
      <Svg width={width} height={CHART_HEIGHT}>
        <Defs>
          <LinearGradient id="vaultGrad" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={theme.accent} stopOpacity="0.32" />
            <Stop offset="1" stopColor={theme.accent} stopOpacity="0.0" />
          </LinearGradient>
        </Defs>

        <Line
          x1={PAD_X}
          y1={CHART_HEIGHT - PAD_BOTTOM}
          x2={width - PAD_X}
          y2={CHART_HEIGHT - PAD_BOTTOM}
          stroke={theme.border}
          strokeWidth={1}
        />

        <Path d={geometry.areaPath} fill="url(#vaultGrad)" />
        <Path
          d={geometry.principalPath}
          fill="none"
          stroke={theme.textMuted}
          strokeWidth={1.25}
          strokeDasharray="4 4"
        />
        <Path
          d={geometry.linePath}
          fill="none"
          stroke={theme.accent}
          strokeWidth={2.5}
          strokeLinecap="round"
        />
        <Circle
          cx={geometry.lastPoint.x}
          cy={geometry.lastPoint.y}
          r={4.5}
          fill={theme.accent}
          stroke={theme.bg}
          strokeWidth={2}
        />
      </Svg>

      <View style={styles.axisRow}>
        <Text style={styles.axisText}>0 {yearsLabel}</Text>
        <Text style={styles.axisText}>
          {Math.round(geometry.endYear / 2)} {yearsLabel}
        </Text>
        <Text style={[styles.axisText, styles.axisHighlight]}>
          {geometry.endYear} {yearsLabel} · {formatCurrency(geometry.endTotal, currency, 0)}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    backgroundColor: theme.bg,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: theme.border,
    paddingTop: SPACING.xs,
    paddingBottom: SPACING.sm,
    overflow: 'hidden',
  },
  axisRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.sm + 2,
    marginTop: 2,
  },
  axisText: {
    ...TABULAR_NUMS,
    color: theme.textMuted,
    fontSize: 11,
    fontWeight: '500',
  },
  axisHighlight: {
    color: theme.accent,
    fontWeight: '700',
  },
});
