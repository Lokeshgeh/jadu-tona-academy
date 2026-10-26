import { generateSyntheticSeries, mulberry32 } from "./chart";

/**
 * EMA helpers. Pine's `ta.ema` seeds with the SMA of the first `length`
 * values and then applies alpha = 2 / (length + 1). We mirror that so demo
 * values match the indicator's convention, not a different EMA convention.
 */
export function emaSeries(values: readonly number[], length: number): (number | null)[] {
  if (length <= 0) throw new Error("EMA length must be positive");
  const alpha = 2 / (length + 1);
  const output: (number | null)[] = [];
  let sum = 0;
  let previous: number | null = null;
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index]!;
    if (index < length) sum += value;
    if (index === length - 1) {
      previous = sum / length;
      output.push(previous);
    } else if (index < length - 1) {
      output.push(null);
    } else {
      previous = previous === null ? value : previous + alpha * (value - previous);
      output.push(previous);
    }
  }
  return output;
}

/** `f_dashEmaTrendCalc` — script.txt:1254-1256. */
export function emaTrend(closes: readonly number[], length: number): { trend: -1 | 0 | 1; ema: number | null; close: number | null } {
  const series = emaSeries(closes, length);
  const last = series[series.length - 1] ?? null;
  const close = closes[closes.length - 1] ?? null;
  if (last === null || close === null) return { trend: 0, ema: last, close };
  return { trend: close > last ? 1 : close < last ? -1 : 0, ema: last, close };
}

export const DASHBOARD_TIMEFRAMES = [
  { label: "1m", seed: 101 },
  { label: "3m", seed: 103 },
  { label: "5m", seed: 105 },
  { label: "15m", seed: 115 },
  { label: "30m", seed: 130 },
  { label: "45m", seed: 145 },
  { label: "1H", seed: 160 },
  { label: "2H", seed: 200 },
  { label: "3H", seed: 300 },
  { label: "4H", seed: 400 },
  { label: "1D", seed: 1040 },
  { label: "1W", seed: 1700 },
  { label: "1M", seed: 3100 },
] as const;

export interface DashboardRow {
  label: string;
  closes: number[];
  trend: -1 | 0 | 1;
  ema: number | null;
  close: number | null;
}

/**
 * Produces a clearly-labelled SIMULATED per-timeframe close series for the
 * dashboard teaching widget. It is not resampled market data. The source
 * computes each row with request.security(..., lookahead_off) on the real
 * timeframe; this helper exists so the lesson can be practised offline.
 */
export function simulateDashboard(emaLength = 132): DashboardRow[] {
  return DASHBOARD_TIMEFRAMES.map(({ label, seed }) => {
    const random = mulberry32(seed);
    const start = 50 + random() * 450;
    const candles = generateSyntheticSeries({
      seed,
      length: Math.max(160, emaLength + 40),
      start,
      drift: (random() - 0.5) * 0.0016,
      volatility: 0.005 + random() * 0.008,
    });
    const closes = candles.map((candle) => candle.close);
    const { trend, ema, close } = emaTrend(closes, emaLength);
    return { label, closes, trend, ema, close };
  });
}

export function trendText(trend: -1 | 0 | 1): "BULLISH" | "BEARISH" | "NEUTRAL" {
  return trend === 1 ? "BULLISH" : trend === -1 ? "BEARISH" : "NEUTRAL";
}
