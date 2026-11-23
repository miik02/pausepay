import React, { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Defs, LinearGradient, Path, RadialGradient, Rect, Stop } from 'react-native-svg';
import { Ionicons } from '@expo/vector-icons';
import { t } from '../constants/i18n';
import { RADIUS, TABULAR_NUMS } from '../theme/tokens';
import { CurrencyCode, ImpulseItem, LanguageCode, VaultStats } from '../types';
import { formatCurrency, generateGrowthSeries } from '../utils/finance';

export type StoryStyleId = 'obsidian' | 'emerald' | 'minimal';

export type StoryPayload =
  | { mode: 'vault'; stats: VaultStats }
  | { mode: 'impulse'; item: ImpulseItem };

interface StoryCardProps {
  payload: StoryPayload;
  styleId: StoryStyleId;
  currency: CurrencyCode;
  lang: LanguageCode;
}

const CARD_W = 264;
const CARD_H = 469; // Exact 9:16 ratio

const PALETTES: Record<
  StoryStyleId,
  {
    bgTop: string;
    bgBottom: string;
    glow: string;
    cardBg: string;
    border: string;
    accent: string;
    textMain: string;
    textSub: string;
    isPro: boolean;
  }
> = {
  obsidian: {
    bgTop: '#0E0E12',
    bgBottom: '#070709',
    glow: '#10B981',
    cardBg: 'rgba(255,255,255,0.04)',
    border: 'rgba(255,255,255,0.10)',
    accent: '#10B981',
    textMain: '#FAFAFA',
    textSub: '#A1A1AA',
    isPro: false,
  },
  emerald: {
    bgTop: '#063B2C',
    bgBottom: '#050908',
    glow: '#34D399',
    cardBg: 'rgba(16,185,129,0.10)',
    border: 'rgba(52,211,153,0.28)',
    accent: '#34D399',
    textMain: '#ECFDF5',
    textSub: '#A7F3D0',
    isPro: true,
  },
  minimal: {
    bgTop: '#16181F',
    bgBottom: '#0D0F14',
    glow: '#E4E4E7',
    cardBg: 'rgba(255,255,255,0.05)',
    border: 'rgba(255,255,255,0.14)',
    accent: '#F59E0B',
    textMain: '#FFFFFF',
    textSub: '#9CA3AF',
    isPro: true,
  },
};

export function StoryCard({ payload, styleId, currency, lang }: StoryCardProps) {
  const pal = PALETTES[styleId];

  const miniCurve = useMemo(() => {
    if (payload.mode !== 'impulse') return null;
    const item = payload.item;
    const series = generateGrowthSeries(
      Math.max(1, item.price),
      item.annualRate,
      item.horizonYears,
      item.frequency
    );
    const maxVal = Math.max(...series.map((p) => p.total), 1);
    const w = 212;
    const h = 64;
    const pad = 6;

    const coords = series.map((p, idx) => ({
      x: pad + (idx / Math.max(1, series.length - 1)) * (w - pad * 2),
      y: pad + (h - pad * 2) - (p.total / maxVal) * (h - pad * 2),
    }));

    const line = coords
      .map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
      .join(' ');
    const last = coords[coords.length - 1];
    const area = `${line} L ${last.x.toFixed(1)} ${h - pad} L ${coords[0].x.toFixed(1)} ${h - pad} Z`;

    return { line, area, last, w, h };
  }, [payload]);

  const savedNow =
    payload.mode === 'impulse'
      ? payload.item.frequency === 'monthly'
        ? payload.item.price * 12
        : payload.item.price
      : payload.stats.totalResisted;

  return (
    <View style={[styles.card, { borderColor: pal.border }]}>
      <Svg
        width={CARD_W}
        height={CARD_H}
        style={styles.bgSvg}
      >
        <Defs>
          <LinearGradient id={`bg-${styleId}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={pal.bgTop} stopOpacity="1" />
            <Stop offset="1" stopColor={pal.bgBottom} stopOpacity="1" />
          </LinearGradient>
          <RadialGradient id={`glow-${styleId}`} cx="50%" cy="24%" r="55%">
            <Stop offset="0" stopColor={pal.glow} stopOpacity="0.24" />
            <Stop offset="1" stopColor={pal.glow} stopOpacity="0" />
          </RadialGradient>
        </Defs>
        <Rect x="0" y="0" width={CARD_W} height={CARD_H} fill={`url(#bg-${styleId})`} />
        <Rect x="0" y="0" width={CARD_W} height={CARD_H} fill={`url(#glow-${styleId})`} />
      </Svg>

      <View style={styles.topRow}>
        <View style={[styles.tagPill, { backgroundColor: pal.cardBg, borderColor: pal.border }]}>
          <Ionicons name="shield-checkmark" size={12} color={pal.accent} />
          <Text style={[styles.tagText, { color: pal.accent }]}>
            {payload.mode === 'vault' ? t(lang, 'cardVaultTag') : t(lang, 'cardImpulseTag')}
          </Text>
        </View>
      </View>

      <View style={styles.centerBlock}>
        {payload.mode === 'impulse' && (
          <Text style={[styles.impulseTitle, { color: pal.textSub }]} numberOfLines={2}>
            {payload.item.name}
          </Text>
        )}

        <Text style={[styles.kicker, { color: pal.textSub }]}>
          {payload.mode === 'vault'
            ? t(lang, 'cardVaultMainLabel')
            : t(lang, 'cardImpulseSavedLabel')}
        </Text>

        <Text
          style={[styles.heroAmount, { color: pal.textMain }]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          +{formatCurrency(savedNow, currency, 0)}
        </Text>

        {payload.mode === 'vault' ? (
          <View style={[styles.freedomPill, { backgroundColor: pal.cardBg, borderColor: pal.border }]}>
            <Ionicons name="time-outline" size={14} color={pal.accent} />
            <Text style={[styles.freedomText, { color: pal.textMain }]}>
              {payload.stats.freedomDays.toFixed(1)} {t(lang, 'cardVaultDaysUnit')}
            </Text>
          </View>
        ) : (
          <View style={[styles.freedomPill, { backgroundColor: pal.cardBg, borderColor: pal.border }]}>
            <Ionicons name="time-outline" size={14} color={pal.accent} />
            <Text style={[styles.freedomText, { color: pal.textMain }]}>
              +{payload.item.hoursCost.toFixed(1)} h · {t(lang, 'cardImpulseHours')}
            </Text>
          </View>
        )}
      </View>

      {payload.mode === 'vault' ? (
        <View style={[styles.statsBox, { backgroundColor: pal.cardBg, borderColor: pal.border }]}>
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: pal.textSub }]}>
              {t(lang, 'cardVaultFuture')}
            </Text>
            <Text style={[styles.statVal, { color: pal.accent }]}>
              {formatCurrency(payload.stats.totalFutureSaved, currency, 0)}
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: pal.border }]} />
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: pal.textSub }]}>
              {t(lang, 'cardVaultRate')}
            </Text>
            <Text style={[styles.statVal, { color: pal.textMain }]}>
              {payload.stats.resistanceRate}%
            </Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: pal.border }]} />
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: pal.textSub }]}>
              {t(lang, 'cardVaultBeaten')}
            </Text>
            <Text style={[styles.statVal, { color: pal.textMain }]}>
              {payload.stats.resistedCount}
            </Text>
          </View>
        </View>
      ) : (
        <View style={[styles.statsBox, { backgroundColor: pal.cardBg, borderColor: pal.border }]}>
          <View style={styles.statRow}>
            <Text style={[styles.statLabel, { color: pal.textSub }]}>
              {t(lang, 'cardImpulseFuture')} ({payload.item.horizonYears} {t(lang, 'simYearsSuffix')} · {payload.item.annualRate}%)
            </Text>
            <Text style={[styles.statVal, { color: pal.accent }]}>
              {formatCurrency(payload.item.futureValue, currency, 0)}
            </Text>
          </View>

          {miniCurve && (
            <Svg width={miniCurve.w} height={miniCurve.h} style={styles.miniSvg}>
              <Defs>
                <LinearGradient id={`mini-${styleId}`} x1="0" y1="0" x2="0" y2="1">
                  <Stop offset="0" stopColor={pal.accent} stopOpacity="0.35" />
                  <Stop offset="1" stopColor={pal.accent} stopOpacity="0" />
                </LinearGradient>
              </Defs>
              <Path d={miniCurve.area} fill={`url(#mini-${styleId})`} />
              <Path
                d={miniCurve.line}
                fill="none"
                stroke={pal.accent}
                strokeWidth={2.2}
                strokeLinecap="round"
              />
              <Circle
                cx={miniCurve.last.x}
                cy={miniCurve.last.y}
                r={3.5}
                fill={pal.accent}
              />
            </Svg>
          )}
        </View>
      )}

      <View style={styles.footer}>
        <Text style={[styles.watermark, { color: pal.textSub }]}>
          {pal.isPro ? t(lang, 'cardWatermarkPro') : t(lang, 'cardWatermarkFree')}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: CARD_W,
    height: CARD_H,
    borderRadius: 22,
    borderWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: 18,
    paddingVertical: 20,
    justifyContent: 'space-between',
  },
  bgSvg: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
  topRow: {
    alignItems: 'center',
  },
  tagPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: RADIUS.full,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  centerBlock: {
    alignItems: 'center',
    gap: 6,
  },
  impulseTitle: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  kicker: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  heroAmount: {
    ...TABULAR_NUMS,
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: -1,
  },
  freedomPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    marginTop: 4,
  },
  freedomText: {
    ...TABULAR_NUMS,
    fontSize: 12,
    fontWeight: '700',
  },
  statsBox: {
    borderRadius: RADIUS.md,
    borderWidth: 1,
    padding: 12,
    gap: 8,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    flexShrink: 1,
  },
  statVal: {
    ...TABULAR_NUMS,
    fontSize: 14,
    fontWeight: '800',
  },
  statDivider: {
    height: 1,
    width: '100%',
  },
  miniSvg: {
    alignSelf: 'center',
    marginTop: 2,
  },
  footer: {
    alignItems: 'center',
  },
  watermark: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    opacity: 0.78,
  },
});
