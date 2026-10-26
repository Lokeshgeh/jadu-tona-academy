export interface Candle {
  /** Bar index within the scenario, 0-based. */
  index: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

export const isBullish = (candle: Candle): boolean => candle.close > candle.open;
export const isBearish = (candle: Candle): boolean => candle.close < candle.open;
export const bodyTop = (candle: Candle): number => Math.max(candle.open, candle.close);
export const bodyBottom = (candle: Candle): number => Math.min(candle.open, candle.close);
export const upperWick = (candle: Candle): number => candle.high - bodyTop(candle);
export const lowerWick = (candle: Candle): number => bodyBottom(candle) - candle.low;
export const range = (candle: Candle): number => candle.high - candle.low;
export const midpoint = (candle: Candle): number => (candle.high + candle.low) / 2;

export function isValidCandle(candle: Candle): boolean {
  return (
    Number.isFinite(candle.open) &&
    Number.isFinite(candle.high) &&
    Number.isFinite(candle.low) &&
    Number.isFinite(candle.close) &&
    candle.high >= Math.max(candle.open, candle.close) &&
    candle.low <= Math.min(candle.open, candle.close) &&
    candle.high >= candle.low &&
    candle.index >= 0
  );
}

export function highestHigh(candles: readonly Candle[]): Candle | null {
  let best: Candle | null = null;
  for (const candle of candles) {
    if (!best || candle.high > best.high) best = candle;
  }
  return best;
}

export function lowestLow(candles: readonly Candle[]): Candle | null {
  let best: Candle | null = null;
  for (const candle of candles) {
    if (!best || candle.low < best.low) best = candle;
  }
  return best;
}

export function widestRange(candles: readonly Candle[]): Candle | null {
  let best: Candle | null = null;
  for (const candle of candles) {
    if (!best || range(candle) > range(best)) best = candle;
  }
  return best;
}

/** Tolerance used when comparing prices in tests and displays. */
export const PRICE_EPSILON = 1e-9;

/** true when the bar's high traded at/above the level (wick or body). */
export function touchedFromAbove(candle: Candle, level: number): boolean {
  return candle.high >= level - PRICE_EPSILON;
}

/** true when the bar's low traded at/below the level (wick or body). */
export function touchedFromBelow(candle: Candle, level: number): boolean {
  return candle.low <= level + PRICE_EPSILON;
}

/** true when the bar settled above the level at the close. */
export function closedAbove(candle: Candle, level: number): boolean {
  return candle.close > level + PRICE_EPSILON;
}

/** true when the bar settled below the level at the close. */
export function closedBelow(candle: Candle, level: number): boolean {
  return candle.close < level - PRICE_EPSILON;
}

/**
 * A bar that traded beyond a level but closed back on the original side.
 * Definitional helper, not a claim about any strategy.
 */
export function wickedButRejectedAbove(candle: Candle, level: number): boolean {
  return touchedFromAbove(candle, level) && !closedAbove(candle, level);
}

export function wickedButRejectedBelow(candle: Candle, level: number): boolean {
  return touchedFromBelow(candle, level) && !closedBelow(candle, level);
}

/**
 * Deterministic PRNG (mulberry32) so every synthetic scenario is reproducible.
 * Never used for anything security-sensitive.
 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface SyntheticSeriesOptions {
  seed: number;
  length: number;
  start: number;
  /** Expected drift per bar, as a fraction of price. */
  drift?: number;
  /** Expected bar range, as a fraction of price. */
  volatility?: number;
  /** Index of a deliberate high-volume spike / oversized bar. */
  shockIndex?: number;
}

/**
 * Produces synthetic OHLC candles. Output is deterministic for a given seed.
 * This is simulation data only — it is not, and must never be presented as,
 * historical market data.
 */
export function generateSyntheticSeries(options: SyntheticSeriesOptions): Candle[] {
  const { seed, length, start, drift = 0, volatility = 0.012, shockIndex = -1 } = options;
  const random = mulberry32(seed);
  const candles: Candle[] = [];
  let price = start;

  for (let index = 0; index < length; index += 1) {
    const shock = index === shockIndex ? 1.9 : 1;
    const open = price;
    const move = (random() - 0.5) * 2 * volatility * price + drift * price;
    const close = Math.max(1, open + move);
    const wickScale = volatility * price * (0.35 + random() * 0.65) * shock;
    const high = Math.max(open, close) + wickScale * (0.4 + random());
    const low = Math.max(0.5, Math.min(open, close) - wickScale * (0.4 + random()));

    const candle: Candle = {
      index,
      open: round(open, 2),
      high: round(high, 2),
      low: round(low, 2),
      close: round(close, 2),
    };

    // Rounding can break the OHLC invariant by a cent; repair it.
    candle.high = Math.max(candle.high, candle.open, candle.close);
    candle.low = Math.min(candle.low, candle.open, candle.close);
    candles.push(candle);
    price = candle.close;
  }

  return candles;
}

export function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function formatPrice(value: number, decimals = 2): string {
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Simple moving average, used only for optional visual context. */
export function sma(values: readonly number[], length: number): (number | null)[] {
  const output: (number | null)[] = [];
  let sum = 0;
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index] ?? 0;
    sum += value;
    if (index >= length) sum -= values[index - length] ?? 0;
    output.push(index >= length - 1 ? sum / length : null);
  }
  return output;
}
