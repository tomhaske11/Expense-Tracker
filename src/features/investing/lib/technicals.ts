import type { PricePoint } from '@/features/investing/lib/types';

/*
 * Technical indicators and historical pattern statistics over daily closes (oldest first).
 * Pure and deterministic: the server computes these for the assistant's market tools, so
 * every number Claude cites comes from here, not from its own arithmetic or memory.
 *
 * Trading-day windows: 5 ≈ a week, 21 ≈ a month, 63 ≈ 3 months, 126 ≈ 6 months, 252 ≈ a year.
 */

const r2 = (n: number) => Math.round(n * 100) / 100;
const pct = (a: number, b: number) => (b === 0 ? 0 : r2((a / b - 1) * 100));

/** Simple moving average of the last `n` values ending at each index; null until there are `n`. */
export function sma(values: number[], n: number): (number | null)[] {
  const out: (number | null)[] = [];
  let sum = 0;
  for (let i = 0; i < values.length; i++) {
    sum += values[i];
    if (i >= n) sum -= values[i - n];
    out.push(i >= n - 1 ? sum / n : null);
  }
  return out;
}

/** Wilder's RSI (default 14 days), 0-100; null until enough data. */
export function rsi(values: number[], n = 14): (number | null)[] {
  const out: (number | null)[] = values.map(() => null);
  if (values.length <= n) return out;
  let gain = 0;
  let loss = 0;
  for (let i = 1; i <= n; i++) {
    const d = values[i] - values[i - 1];
    if (d > 0) gain += d;
    else loss -= d;
  }
  gain /= n;
  loss /= n;
  out[n] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  for (let i = n + 1; i < values.length; i++) {
    const d = values[i] - values[i - 1];
    gain = (gain * (n - 1) + Math.max(d, 0)) / n;
    loss = (loss * (n - 1) + Math.max(-d, 0)) / n;
    out[i] = loss === 0 ? 100 : 100 - 100 / (1 + gain / loss);
  }
  return out;
}

/** Highest value over the `n` values ending at each index (the current one included). */
function rollingMax(values: number[], n: number): number[] {
  return values.map((_, i) => Math.max(...values.slice(Math.max(0, i - n + 1), i + 1)));
}

export interface PriceLevel {
  price: number;
  /** How many swing highs/lows formed near this price in the past year. */
  touches: number;
  lastTouched: string;
  /** Distance from today's price, in percent. */
  distancePercent: number;
}

/**
 * Support and resistance from the past year: swing lows and highs (a close lower/higher than
 * the 5 days on each side), grouped when within 1.5% of each other. Returns the two nearest
 * groups below today's price (support) and above it (resistance), most-touched first on ties.
 */
export function findLevels(points: PricePoint[]): { support: PriceLevel[]; resistance: PriceLevel[] } {
  const year = points.slice(-252);
  const closes = year.map((p) => p.close);
  const price = closes[closes.length - 1];
  const W = 5;
  const pivots: PricePoint[] = [];
  for (let i = W; i < year.length - W; i++) {
    const window = closes.slice(i - W, i + W + 1);
    if (closes[i] === Math.min(...window) || closes[i] === Math.max(...window)) pivots.push(year[i]);
  }
  const groups: { prices: number[]; last: string }[] = [];
  for (const p of [...pivots].sort((a, b) => a.close - b.close)) {
    const g = groups[groups.length - 1];
    if (g && p.close <= g.prices[0] * 1.015) {
      g.prices.push(p.close);
      if (p.date > g.last) g.last = p.date;
    } else groups.push({ prices: [p.close], last: p.date });
  }
  const levels: PriceLevel[] = groups.map((g) => {
    const level = g.prices.reduce((s, v) => s + v, 0) / g.prices.length;
    return { price: r2(level), touches: g.prices.length, lastTouched: g.last, distancePercent: pct(level, price) };
  });
  const near = (a: PriceLevel, b: PriceLevel) => Math.abs(a.distancePercent) - Math.abs(b.distancePercent) || b.touches - a.touches;
  return {
    support: levels.filter((l) => l.price < price * 0.995).sort(near).slice(0, 2),
    resistance: levels.filter((l) => l.price > price * 1.005).sort(near).slice(0, 2),
  };
}

interface Crossing {
  date: string;
  event: string;
}

/** The latest values of every indicator plus recent crossings, for one symbol. */
export function computeTrend(points: PricePoint[]) {
  const closes = points.map((p) => p.close);
  const last = closes.length - 1;
  const price = closes[last];
  const s20 = sma(closes, 20);
  const s50 = sma(closes, 50);
  const s200 = sma(closes, 200);
  const r = rsi(closes);
  const ago = (n: number) => (last - n >= 0 ? pct(price, closes[last - n]) : null);
  const yearStart = points.findIndex((p) => p.date >= `${points[last].date.slice(0, 4)}-01-01`);
  const year = closes.slice(-252);
  const high = Math.max(...year);
  const low = Math.min(...year);

  const daily = closes.slice(-64).map((c, i, a) => (i === 0 ? 0 : Math.log(c / a[i - 1]))).slice(1);
  const mean = daily.reduce((s, v) => s + v, 0) / (daily.length || 1);
  const vol = Math.sqrt(daily.reduce((s, v) => s + (v - mean) ** 2, 0) / Math.max(1, daily.length - 1)) * Math.sqrt(252) * 100;

  let peak = year[0];
  let maxDrawdown = 0;
  for (const c of year) {
    peak = Math.max(peak, c);
    maxDrawdown = Math.min(maxDrawdown, c / peak - 1);
  }

  // Crossings in the last ~3 months (63 trading days), newest first.
  const crossings: Crossing[] = [];
  const crossed = (a: (number | null)[], b: (number | null)[], i: number) => {
    const [a0, a1, b0, b1] = [a[i - 1], a[i], b[i - 1], b[i]];
    if (a0 === null || a1 === null || b0 === null || b1 === null) return 0;
    return a0 <= b0 && a1 > b1 ? 1 : a0 >= b0 && a1 < b1 ? -1 : 0;
  };
  for (let i = Math.max(1, last - 62); i <= last; i++) {
    const date = points[i].date;
    const c = closes.map((v) => v as number | null);
    const p50 = crossed(c, s50, i);
    const p200 = crossed(c, s200, i);
    const gc = crossed(s50, s200, i);
    if (p50) crossings.push({ date, event: p50 > 0 ? 'price crossed above its 50-day average' : 'price crossed below its 50-day average' });
    if (p200) crossings.push({ date, event: p200 > 0 ? 'price crossed above its 200-day average' : 'price crossed below its 200-day average' });
    if (gc) crossings.push({ date, event: gc > 0 ? 'golden cross (50-day average crossed above the 200-day)' : 'death cross (50-day average crossed below the 200-day)' });
  }
  crossings.reverse();

  const at = (s: (number | null)[]) => (s[last] === null ? null : { value: r2(s[last] as number), priceVsAveragePercent: pct(price, s[last] as number) });
  const m50 = s50[last];
  const m200 = s200[last];
  const trend =
    m50 !== null && m200 !== null
      ? price > m50 && m50 > m200
        ? 'uptrend (price above its 50-day average, which is above its 200-day)'
        : price < m50 && m50 < m200
          ? 'downtrend (price below the 50-day, which is below the 200-day)'
          : 'mixed (the price and averages are not lined up in either direction)'
      : 'not enough history for the 200-day average';

  return {
    asOf: points[last].date,
    price: r2(price),
    trend,
    returnsPercent: {
      '1d': ago(1),
      '5d': ago(5),
      '1m': ago(21),
      '3m': ago(63),
      '6m': ago(126),
      '1y': ago(252),
      ytd: yearStart > 0 ? pct(price, closes[yearStart - 1]) : null,
    },
    movingAverages: { '20d': at(s20), '50d': at(s50), '200d': at(s200) },
    rsi14: r[last] === null ? null : r2(r[last] as number),
    week52: { high: r2(high), low: r2(low), fromHighPercent: pct(price, high), fromLowPercent: pct(price, low) },
    volatility3mAnnualizedPercent: r2(vol),
    maxDrawdown1yPercent: r2(maxDrawdown * 100),
    levels: findLevels(points),
    recentCrossings: crossings.slice(0, 6),
  };
}

export const PATTERN_CONDITIONS = [
  'price_crosses_above_50d',
  'price_crosses_below_50d',
  'price_crosses_above_200d',
  'price_crosses_below_200d',
  'golden_cross',
  'death_cross',
  'rsi_falls_below_30',
  'rsi_rises_above_70',
  'falls_10pct_from_52w_high',
  'new_52w_high',
  'drops_5pct_in_5_days',
  'crosses_above_level',
  'crosses_below_level',
] as const;
export type PatternCondition = (typeof PATTERN_CONDITIONS)[number];

/** Day indexes where the condition first becomes true (a transition, not every day it holds). */
function triggers(points: PricePoint[], condition: PatternCondition, level?: number): number[] {
  const c = points.map((p) => p.close);
  const s50 = sma(c, 50);
  const s200 = sma(c, 200);
  const r = rsi(c);
  const hi = rollingMax(c, 252);
  const out: number[] = [];
  const up = (a: (number | null)[], b: (number | null)[], i: number) =>
    a[i - 1] !== null && a[i] !== null && b[i - 1] !== null && b[i] !== null && (a[i - 1] as number) <= (b[i - 1] as number) && (a[i] as number) > (b[i] as number);
  const cc = c.map((v) => v as number | null);
  const lv = c.map(() => level ?? null);
  for (let i = 1; i < c.length; i++) {
    let hit = false;
    switch (condition) {
      case 'price_crosses_above_50d': hit = up(cc, s50, i); break;
      case 'price_crosses_below_50d': hit = up(s50, cc, i); break;
      case 'price_crosses_above_200d': hit = up(cc, s200, i); break;
      case 'price_crosses_below_200d': hit = up(s200, cc, i); break;
      case 'golden_cross': hit = up(s50, s200, i); break;
      case 'death_cross': hit = up(s200, s50, i); break;
      case 'rsi_falls_below_30': hit = r[i - 1] !== null && r[i] !== null && (r[i - 1] as number) >= 30 && (r[i] as number) < 30; break;
      case 'rsi_rises_above_70': hit = r[i - 1] !== null && r[i] !== null && (r[i - 1] as number) <= 70 && (r[i] as number) > 70; break;
      case 'falls_10pct_from_52w_high': hit = i >= 20 && c[i - 1] > hi[i - 1] * 0.9 && c[i] <= hi[i] * 0.9; break;
      case 'new_52w_high': hit = i >= 252 && c[i] > hi[i - 1]; break;
      case 'drops_5pct_in_5_days': hit = i >= 6 && c[i] / c[i - 5] - 1 <= -0.05 && c[i - 1] / c[i - 6] - 1 > -0.05; break;
      case 'crosses_above_level': hit = level !== undefined && up(cc, lv, i); break;
      case 'crosses_below_level': hit = level !== undefined && up(lv, cc, i); break;
    }
    if (hit) out.push(i);
  }
  return out;
}

function stats(returns: number[]) {
  if (returns.length === 0) return null;
  const sorted = [...returns].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return {
    count: returns.length,
    medianReturnPercent: r2(median),
    averageReturnPercent: r2(returns.reduce((s, v) => s + v, 0) / returns.length),
    percentPositive: r2((returns.filter((v) => v > 0).length / returns.length) * 100),
    worstPercent: r2(sorted[0]),
    bestPercent: r2(sorted[sorted.length - 1]),
  };
}

/**
 * What happened over the next `horizon` trading days after each time `condition` triggered,
 * compared with the same horizon from every day (the baseline). Events closer together than
 * `horizon` days count once, so one long move isn't counted many times.
 */
export function testPattern(points: PricePoint[], condition: PatternCondition, horizon: number, level?: number) {
  const c = points.map((p) => p.close);
  const forward = (i: number) => (c[i + horizon] / c[i] - 1) * 100;
  const events: number[] = [];
  for (const i of triggers(points, condition, level)) {
    if (events.length && i - events[events.length - 1] < horizon) continue;
    events.push(i);
  }
  const done = events.filter((i) => i + horizon < c.length);
  const baseline: number[] = [];
  for (let i = 0; i + horizon < c.length; i++) baseline.push(forward(i));
  const lastEvent = events[events.length - 1];
  return {
    history: { from: points[0]?.date ?? null, to: points[c.length - 1]?.date ?? null, tradingDays: c.length },
    horizonTradingDays: horizon,
    afterCondition: stats(done.map(forward)),
    baselineAnyDay: stats(baseline),
    recentOccurrences: done.slice(-5).reverse().map((i) => ({ date: points[i].date, closeThen: r2(c[i]), returnAfterPercent: r2(forward(i)) })),
    /** Triggered within the last `horizon` days, so its outcome isn't known yet. */
    inProgress: lastEvent !== undefined && lastEvent + horizon >= c.length ? { date: points[lastEvent].date, closeThen: r2(c[lastEvent]) } : null,
  };
}
