import type { Candle } from "./chart";

/**
 * Level accuracy analyzer — ported from script.txt:371-435 and 2321-2339.
 * The analyzer's both-hit rule is a source heuristic, not evidence of true
 * intrabar order (see MEC-005 / STR-016).
 */

export type AnalyzerPipMode = "auto" | "custom";

export interface AnalyzerConfig {
  targetPips: number;
  lossPips: number;
  pipMode: AnalyzerPipMode;
  customPipSize: number;
}

export const DEFAULT_ANALYZER_CONFIG: AnalyzerConfig = {
  targetPips: 150,
  lossPips: 50,
  pipMode: "auto",
  customPipSize: 0.0001,
};

export interface MarketInfo {
  type: "forex" | "other";
  mintick: number;
}

/** `f_analyzerPipSize` — script.txt:375-376. */
export function pipSize(config: AnalyzerConfig, market: MarketInfo): number {
  if (config.pipMode === "custom") return config.customPipSize;
  return market.type === "forex" ? market.mintick * 10 : market.mintick;
}

export interface AnalyzerStart {
  direction: 1 | -1;
  targetPrice: number;
  lossPrice: number;
  targetMove: number;
  lossMove: number;
}

/** Target/loss set from the tap bar — script.txt:411-424. */
export function startAnalyzer(
  direction: 1 | -1,
  tapCandle: Candle,
  config: AnalyzerConfig,
  pip: number,
): AnalyzerStart {
  const targetMove = config.targetPips * pip;
  const lossMove = config.lossPips * pip;
  return {
    direction,
    targetMove,
    lossMove,
    targetPrice: direction === 1 ? tapCandle.close + targetMove : tapCandle.close - targetMove,
    lossPrice: direction === 1 ? tapCandle.low - lossMove : tapCandle.high + lossMove,
  };
}

export interface AnalyzerBarResult {
  win: boolean;
  loss: boolean;
  /** -1 = loss, 0 = unresolved, 1 = win. */
  result: -1 | 0 | 1;
  /** Source heuristic: true means the high is assumed to have printed first. */
  highFirst: boolean;
}

/** `f_analyzerBothHitResult` — script.txt:378-385. */
export function highPrintedFirst(candle: Candle): boolean {
  return Math.abs(candle.open - candle.high) < Math.abs(candle.open - candle.low);
}

/** `f_analyzerResolveResult` — script.txt:387-395. */
export function resolveAnalyzerBar(
  direction: 1 | -1,
  targetPrice: number,
  lossPrice: number,
  candle: Candle,
): AnalyzerBarResult {
  const win = direction === 1 ? candle.high >= targetPrice : candle.low <= targetPrice;
  const loss = direction === 1 ? candle.low <= lossPrice : candle.high >= lossPrice;
  const highFirst = highPrintedFirst(candle);
  let result: -1 | 0 | 1 = 0;
  if (win && !loss) result = 1;
  else if (loss && !win) result = -1;
  else if (win && loss) result = direction === 1 ? (highFirst ? 1 : -1) : highFirst ? -1 : 1;
  return { win, loss, result, highFirst };
}

/** `f_analyzerRateText` — script.txt:371-373, with #.## style trimming. */
export function formatAccuracy(wins: number, losses: number): string {
  const done = wins + losses;
  if (done <= 0) return "n/a";
  return `${trimRate((wins * 100) / done)}%`;
}

function trimRate(value: number): string {
  const fixed = value.toFixed(2);
  return fixed.replace(/\.?0+$/, "");
}

/** `f_bestAnalyzerSlot` — script.txt:397-409. */
export function bestAnalyzerSlot(
  rows: readonly { wins: number; losses: number; visible: boolean }[],
  minDone: number,
): number {
  let bestSlot = -1;
  let bestRate: number | null = null;
  rows.forEach((row, index) => {
    const done = row.wins + row.losses;
    if (!row.visible || done < minDone) return;
    const rate = row.wins / done;
    if (bestRate === null || rate > bestRate) {
      bestRate = rate;
      bestSlot = index;
    }
  });
  return bestSlot;
}

export const ANALYZER_SLOTS = [
  "BUY TJL1",
  "BUY TJL2",
  "SELL TJL1",
  "SELL TJL2",
  "SBR",
  "RBS",
  "DT",
  "DB",
  "BUY QML",
  "SELL QML",
  "ISS 4",
  "D-CHOCH SBR",
  "D-CHOCH RBS",
  "D-CHOCH DT",
  "D-CHOCH DB",
  "D-CHOCH SELL QML",
  "D-CHOCH BUY QML",
] as const;

export function analyzerSlot(text: string): number {
  return ANALYZER_SLOTS.indexOf(text as (typeof ANALYZER_SLOTS)[number]);
}
