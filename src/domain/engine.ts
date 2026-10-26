import type { Candle } from "./chart";

/**
 * Faithful TypeScript port of the in-scope structure logic in
 * `jadu_tona_game_hardening_pack/script.txt` (Pine v6).
 *
 * Ported: run highs/lows, CH/CL, trend & phase, BOS, CHOCH, dual CHOCH and
 * A+ promotion, TJL1/TJL2, SBR/RBS/DT/DB, QML, the bull/bear ISS state
 * machines, candle-zone geometry, tap lifecycle, ISS wick-stop, EMA trend.
 *
 * Not ported on purpose (out of game scope): Order Blocks, Fair Value Gaps,
 * Kill Zones, their inputs, drawing code and statistics.
 *
 * The port intentionally keeps the source's evaluation order and its quirks,
 * because the game scores what the indicator actually does, not an idealised
 * version of it.
 */

export type TapSource = "wick" | "close";
export type Trend = -1 | 0 | 1;
export type Phase = 1 | 2;
export type IssScenario = "1" | "2";

export type LevelKind =
  | 1 // TJL1
  | 2 // TJL2
  | 3 // SBR
  | 4 // RBS
  | 5 // DT
  | 6 // DB
  | 7 // QML
  | 8 // promoted best / D-CHOCH
  | 29 // ISS 1
  | 30 // ISS 3 bull
  | 31 // ISS 4 bull
  | 32 // ISS 3 bear
  | 33 // ISS 4 bear
  | 34 // ISS 2 bull
  | 35; // ISS 2 bear

export interface Zone {
  top: number;
  bot: number;
}

export interface EngineConfig {
  zoneBodyPct: number;
  tapSource: TapSource;
  stopOnTap: boolean;
  stopIssOnWickTap: boolean;
  issScenario: IssScenario;
  enableIss: boolean;
  keepOnlyLastChoch: boolean;
  showTjl: boolean;
  showLevels: boolean;
  showIss1: boolean;
  showIss2: boolean;
  showIss3: boolean;
  showIss4: boolean;
}

export const DEFAULT_ENGINE_CONFIG: EngineConfig = {
  zoneBodyPct: 1.0,
  tapSource: "wick",
  stopOnTap: true,
  stopIssOnWickTap: true,
  issScenario: "1",
  enableIss: true,
  keepOnlyLastChoch: false,
  showTjl: true,
  showLevels: true,
  showIss1: false, // source default (script.txt:34)
  showIss2: true,
  showIss3: true,
  showIss4: true,
};

export interface EngineLevel extends Zone {
  id: string;
  kind: LevelKind;
  text: string;
  dir: -1 | 0 | 1;
  leftBar: number;
  rightBar: number;
  bornBar: number;
  sourceBar: number;
  active: boolean;
  deleted: boolean;
  stopReady: boolean;
  stopReadyBar: number | null;
  isHigh: boolean;
  colorKey: string;
}

export type EngineEventType =
  | "level-created"
  | "bull-shift"
  | "bear-shift"
  | "trend-up"
  | "trend-down"
  | "bull-choch"
  | "bear-choch"
  | "bull-bos"
  | "bear-bos"
  | "dual-choch"
  | "a-plus-promoted"
  | "iss-bull-complete"
  | "iss-bear-complete"
  | "level-stopped";

export interface EngineEvent {
  bar: number;
  type: EngineEventType;
  message: string;
  levelIds: string[];
}

export interface Snap {
  bar: number;
  price: number;
}

export interface IssTracker {
  state: 0 | 1 | 2 | 3 | 4;
  baseConfirmed: boolean;
  baseExtreme: number | null;
  baseBar: number | null;
  runExtreme: number | null;
  runBar: number | null;
  iss1Level: number | null;
  iss1Bar: number | null;
  iss2Level: number | null;
  iss2Bar: number | null;
  afterBreakHigh: number | null;
  afterBreakHighBar: number | null;
  afterBreakLow: number | null;
  afterBreakLowBar: number | null;
}

export interface EngineFrame {
  bar: number;
  trend: Trend;
  phase: Phase;
  runHigh: Snap | null;
  runLow: Snap | null;
  lastCH: Snap | null;
  lastCL: Snap | null;
  tjl1: Snap | null;
  tjl2: Snap | null;
  lastChochSide: -1 | 0 | 1;
  bullIss: IssTracker;
  bearIss: IssTracker;
  levels: EngineLevel[];
  events: EngineEvent[];
}

const emptyIss = (): IssTracker => ({
  state: 0,
  baseConfirmed: false,
  baseExtreme: null,
  baseBar: null,
  runExtreme: null,
  runBar: null,
  iss1Level: null,
  iss1Bar: null,
  iss2Level: null,
  iss2Bar: null,
  afterBreakHigh: null,
  afterBreakHighBar: null,
  afterBreakLow: null,
  afterBreakLowBar: null,
});

const cloneIss = (iss: IssTracker): IssTracker => ({ ...iss });

/** `f_candleZone` — script.txt:253-259. */
export function candleZone(candle: Candle, isHigh: boolean, zoneBodyPct: number): Zone {
  const bodyTop = Math.max(candle.open, candle.close);
  const bodyBot = Math.min(candle.open, candle.close);
  const pad = Math.max(bodyTop - bodyBot, 0) * zoneBodyPct * 0.01;
  return isHigh
    ? { top: candle.high, bot: bodyTop - pad }
    : { top: bodyBot + pad, bot: candle.low };
}

/** `f_isTapped` — script.txt:261-265. */
export function isTapped(candle: Candle, zone: Zone, source: TapSource): boolean {
  if (source === "close") return candle.close <= zone.top && candle.close >= zone.bot;
  return candle.high >= zone.bot && candle.low <= zone.top;
}

/** `f_levelDir` — script.txt:267-281. Note kind 29 has no branch and is 0. */
export function levelDirection(kind: LevelKind, isHigh: boolean): -1 | 0 | 1 {
  if (kind === 1 || kind === 2) return isHigh ? 1 : -1;
  if (kind === 4 || kind === 6) return 1;
  if (kind === 3 || kind === 5) return -1;
  if (kind === 7) return isHigh ? -1 : 1;
  if (kind === 30 || kind === 31 || kind === 35) return 1;
  if (kind === 32 || kind === 33 || kind === 34) return -1;
  return 0;
}

/** `f_levelDisplayText` — script.txt:283-289. */
export function levelDisplayText(kind: LevelKind, dir: -1 | 0 | 1, text: string): string {
  if (kind === 1) return text === "BUY TJL1" || text === "SELL TJL1" ? text : dir === 1 ? "BUY TJL1" : "SELL TJL1";
  if (kind === 2) return text === "BUY TJL2" || text === "SELL TJL2" ? text : dir === 1 ? "BUY TJL2" : "SELL TJL2";
  return text;
}

/** `f_bestLevelText` — script.txt:460-474. */
export function bestLevelText(kind: LevelKind, dir: -1 | 0 | 1): string {
  if (kind === 3) return "D-CHOCH SBR";
  if (kind === 4) return "D-CHOCH RBS";
  if (kind === 5) return "D-CHOCH DT";
  if (kind === 6) return "D-CHOCH DB";
  if (kind === 7 && dir === 1) return "D-CHOCH SELL QML";
  if (kind === 7 && dir === -1) return "D-CHOCH BUY QML";
  return "D-CHOCH QML";
}

/** `f_shouldShowLevel` A+ set, excluding the display filters themselves. */
export function isAPlusLevel(level: Pick<EngineLevel, "kind" | "text">): boolean {
  return (
    level.kind === 2 ||
    level.kind === 7 ||
    level.kind === 31 ||
    level.kind === 33 ||
    (level.kind === 8 && level.text.includes("QML"))
  );
}

export const ISS_LEVEL_KINDS: LevelKind[] = [30, 31, 32, 33, 34, 35];

export class JaduTonaEngine {
  readonly candles: readonly Candle[];
  readonly config: EngineConfig;
  readonly #frames: EngineFrame[] = [];
  #levelSeq = 0;
  #levels: EngineLevel[] = [];
  #events: EngineEvent[] = [];

  #trend: Trend = 0;
  #phase: Phase = 1;
  #runHigh: Snap | null = null;
  #runLow: Snap | null = null;
  #lastCH: Snap | null = null;
  #lastCL: Snap | null = null;
  #tjl1: Snap | null = null;
  #tjl2: Snap | null = null;
  #lastChochSide: -1 | 0 | 1 = 0;
  #issOrTjlSinceChoch = false;
  #lastQmlLeft: number | null = null;
  #bullIss: IssTracker = emptyIss();
  #bearIss: IssTracker = emptyIss();

  constructor(candles: readonly Candle[], config: Partial<EngineConfig> = {}) {
    this.candles = candles;
    this.config = { ...DEFAULT_ENGINE_CONFIG, ...config };
    for (let bar = 0; bar < candles.length; bar += 1) {
      if (bar >= 2) this.#processBar(bar);
      this.#frames.push(this.#snapshot(bar));
    }
  }

  /** State after the given bar has fully processed. */
  frame(bar: number): EngineFrame {
    if (this.#frames.length === 0) {
      return {
        bar: 0,
        trend: 0,
        phase: 1,
        runHigh: null,
        runLow: null,
        lastCH: null,
        lastCL: null,
        tjl1: null,
        tjl2: null,
        lastChochSide: 0,
        bullIss: emptyIss(),
        bearIss: emptyIss(),
        levels: [],
        events: [],
      };
    }
    const clamped = Math.max(0, Math.min(bar, this.#frames.length - 1));
    return this.#frames[clamped]!;
  }

  get lastBar(): number {
    return this.#frames.length - 1;
  }

  levelsAt(bar: number, options: { activeOnly?: boolean } = {}): EngineLevel[] {
    const levels = this.frame(bar).levels;
    return options.activeOnly ? levels.filter((level) => level.active && !level.deleted) : levels;
  }

  eventsAt(bar: number): EngineEvent[] {
    return this.frame(bar).events;
  }

  eventsBetween(fromBar: number, toBar: number): EngineEvent[] {
    return this.#events.filter((event) => event.bar >= fromBar && event.bar <= toBar);
  }

  findEvents(type: EngineEventType): EngineEvent[] {
    return this.#events.filter((event) => event.type === type);
  }

  #snapshot(bar: number): EngineFrame {
    return {
      bar,
      trend: this.#trend,
      phase: this.#phase,
      runHigh: this.#runHigh ? { ...this.#runHigh } : null,
      runLow: this.#runLow ? { ...this.#runLow } : null,
      lastCH: this.#lastCH ? { ...this.#lastCH } : null,
      lastCL: this.#lastCL ? { ...this.#lastCL } : null,
      tjl1: this.#tjl1 ? { ...this.#tjl1 } : null,
      tjl2: this.#tjl2 ? { ...this.#tjl2 } : null,
      lastChochSide: this.#lastChochSide,
      bullIss: cloneIss(this.#bullIss),
      bearIss: cloneIss(this.#bearIss),
      levels: this.#levels.map((level) => ({ ...level })),
      events: this.#events.map((event) => ({ ...event, levelIds: [...event.levelIds] })),
    };
  }

  #emit(type: EngineEventType, bar: number, message: string, levelIds: string[] = []): void {
    this.#events.push({ bar, type, message, levelIds });
  }

  #addLevel(input: {
    bar: number;
    sourceBar: number;
    isHigh: boolean;
    kind: LevelKind;
    text: string;
    bornBar?: number;
    leftBar?: number;
    colorKey: string;
    stopReady?: boolean;
    stopReadyBar?: number | null;
  }): EngineLevel {
    const candle = this.candles[input.sourceBar];
    if (!candle) throw new Error(`Missing source bar ${input.sourceBar}`);
    const zone = candleZone(candle, input.isHigh, this.config.zoneBodyPct);
    const dir = levelDirection(input.kind, input.isHigh);
    const level: EngineLevel = {
      id: `lvl-${++this.#levelSeq}`,
      kind: input.kind,
      text: levelDisplayText(input.kind, dir, input.text),
      dir,
      leftBar: input.leftBar ?? input.sourceBar,
      rightBar: input.bar,
      bornBar: input.bornBar ?? input.bar,
      sourceBar: input.sourceBar,
      top: zone.top,
      bot: zone.bot,
      active: true,
      deleted: false,
      stopReady: input.stopReady ?? false,
      stopReadyBar: input.stopReadyBar ?? null,
      isHigh: input.isHigh,
      colorKey: input.colorKey,
    };
    this.#levels.push(level);
    this.#emit("level-created", input.bar, `${level.text} created`, [level.id]);
    return level;
  }

  #deleteLatestTjl1ByLeft(leftBar: number): void {
    for (let index = this.#levels.length - 1; index >= 0; index -= 1) {
      const level = this.#levels[index]!;
      if (!level.deleted && level.active && level.kind === 1 && level.leftBar === leftBar) {
        level.deleted = true;
        level.active = false;
        return;
      }
    }
  }

  #freezePreviousChochLevels(): void {
    for (const level of this.#levels) {
      if (!level.deleted && level.active && level.kind >= 3 && level.kind <= 7) {
        level.active = false;
      }
    }
  }

  /** Level tap / stop handling — script.txt:592-621. Runs before structure. */
  #updateLevels(bar: number): void {
    const candle = this.candles[bar]!;
    for (const level of this.#levels) {
      if (level.deleted) continue;
      level.rightBar = bar;
      if (!level.active) continue;

      const issWickLevel = ISS_LEVEL_KINDS.includes(level.kind);
      if (issWickLevel) {
        if (!this.config.stopIssOnWickTap || bar <= level.bornBar) continue;
        const crossed = level.dir === 1 ? candle.close > level.top : candle.close < level.bot;
        if (!level.stopReady && crossed) {
          level.stopReady = true;
          level.stopReadyBar = bar;
        }
        if (level.stopReady && level.stopReadyBar !== null && bar > level.stopReadyBar) {
          const tapped = candle.high >= level.bot && candle.low <= level.top;
          if (tapped) {
            level.active = false;
            level.rightBar = bar;
            this.#emit("level-stopped", bar, `${level.text} stopped after wick tap`, [level.id]);
          }
        }
      } else if (this.config.stopOnTap && bar > level.bornBar) {
        if (isTapped(candle, level, this.config.tapSource)) {
          level.active = false;
          level.rightBar = bar;
          this.#emit("level-stopped", bar, `${level.text} stopped on tap`, [level.id]);
        }
      }
    }
  }

  /** `f_promoteLastChochLevelsToBest` — script.txt:479-545. */
  #promoteLastChochLevelsToBest(bar: number, qmlLeft: number | null, events: EngineEvent[]): void {
    if (qmlLeft === null) return;
    let srcBornBar: number | null = null;
    for (let index = this.#levels.length - 1; index >= 0; index -= 1) {
      const level = this.#levels[index]!;
      if (level.kind === 7 && !level.deleted && level.leftBar === qmlLeft) {
        srcBornBar = level.bornBar;
        break;
      }
    }
    if (srcBornBar === null) return;

    for (let index = this.#levels.length - 1; index >= 0; index -= 1) {
      const src = this.#levels[index]!;
      if (!(src.kind >= 3 && src.kind <= 7) || src.deleted || src.bornBar !== srcBornBar) continue;

      const bestText = bestLevelText(src.kind, src.dir);
      const bestColor = src.kind === 7 ? "gold" : src.colorKey;
      const sourceZone = { top: src.top, bot: src.bot };
      const sourceDir = src.dir;
      const sourceLeft = src.leftBar;

      // Retire the original level.
      src.deleted = true;
      src.active = false;

      const existing = this.#levels.find(
        (level) =>
          level.kind === 8 &&
          !level.deleted &&
          level.leftBar === sourceLeft &&
          level.top === sourceZone.top &&
          level.bot === sourceZone.bot &&
          level.text === bestText,
      );

      if (existing) {
        existing.active = true;
        existing.rightBar = bar;
        existing.bornBar = bar;
        existing.stopReady = false;
        existing.stopReadyBar = null;
        existing.colorKey = bestColor;
        existing.text = bestText;
        events.push({ bar, type: "a-plus-promoted", message: `${bestText} re-armed`, levelIds: [existing.id] });
      } else {
        const promoted: EngineLevel = {
          id: `lvl-${++this.#levelSeq}`,
          kind: 8,
          text: bestText,
          dir: sourceDir,
          leftBar: sourceLeft,
          rightBar: bar,
          bornBar: bar,
          sourceBar: src.sourceBar,
          top: sourceZone.top,
          bot: sourceZone.bot,
          active: true,
          deleted: false,
          stopReady: false,
          stopReadyBar: null,
          isHigh: src.isHigh,
          colorKey: bestColor,
        };
        this.#levels.push(promoted);
        events.push({ bar, type: "a-plus-promoted", message: `${bestText} promoted`, levelIds: [promoted.id] });
      }
    }
  }

  #resetBullIss(bar: number, mode: "start" | "clear"): void {
    if (mode === "clear") {
      this.#bullIss = emptyIss();
      return;
    }
    const candle = this.candles[bar]!;
    this.#bullIss = {
      ...emptyIss(),
      state: 1,
      baseExtreme: candle.low,
      baseBar: bar,
      runExtreme: candle.high,
      runBar: bar,
    };
  }

  #resetBearIss(bar: number, mode: "start" | "clear"): void {
    if (mode === "clear") {
      this.#bearIss = emptyIss();
      return;
    }
    const candle = this.candles[bar]!;
    this.#bearIss = {
      ...emptyIss(),
      state: 1,
      baseExtreme: candle.high,
      baseBar: bar,
      runExtreme: candle.low,
      runBar: bar,
    };
  }

  /** Bullish ISS tracker — script.txt:1765-1953. */
  #updateBullIss(bar: number, bearishShift: boolean, bullishShift: boolean, events: EngineEvent[]): void {
    const candle = this.candles[bar]!;
    const iss = this.#bullIss;
    const invalidated = iss.state >= 2 && iss.baseExtreme !== null && candle.close < iss.baseExtreme;
    if (invalidated) {
      this.#bullIss = emptyIss();
      return;
    }

    if (iss.state === 1) {
      if (this.config.issScenario === "1") {
        if (
          bearishShift &&
          iss.runBar !== null &&
          iss.runBar < bar &&
          iss.runBar !== iss.baseBar &&
          iss.runExtreme !== null
        ) {
          iss.iss1Level = iss.runExtreme;
          iss.iss1Bar = iss.runBar;
          iss.state = 2;
          iss.iss2Level = candle.low;
          iss.iss2Bar = bar;
          return;
        }
        if (iss.baseExtreme === null || candle.low < iss.baseExtreme) {
          iss.baseExtreme = candle.low;
          iss.baseBar = bar;
          iss.runExtreme = candle.high;
          iss.runBar = bar;
        } else if (iss.runExtreme === null || candle.high > iss.runExtreme) {
          iss.runExtreme = candle.high;
          iss.runBar = bar;
        }
      } else {
        if (iss.baseExtreme === null || candle.low < iss.baseExtreme) {
          iss.baseExtreme = candle.low;
          iss.baseBar = bar;
          iss.runExtreme = candle.high;
          iss.runBar = bar;
          iss.baseConfirmed = false;
        }
        if (!iss.baseConfirmed) {
          if (bullishShift) {
            iss.baseConfirmed = true;
            iss.runExtreme = candle.high;
            iss.runBar = bar;
          }
        } else {
          if (iss.runExtreme === null || candle.high > iss.runExtreme) {
            iss.runExtreme = candle.high;
            iss.runBar = bar;
          }
          if (bearishShift && iss.runBar !== null && iss.runBar < bar && iss.runExtreme !== null) {
            iss.iss1Level = iss.runExtreme;
            iss.iss1Bar = iss.runBar;
            iss.state = 2;
            iss.iss2Level = candle.low;
            iss.iss2Bar = bar;
          }
        }
      }
      return;
    }

    if (iss.state === 2) {
      if (iss.iss2Level === null || candle.low < iss.iss2Level) {
        iss.iss2Level = candle.low;
        iss.iss2Bar = bar;
      }
      if (iss.iss1Level !== null && candle.close > iss.iss1Level) {
        iss.afterBreakHigh = candle.high;
        iss.afterBreakHighBar = bar;
        iss.afterBreakLow = candle.low;
        iss.afterBreakLowBar = bar;
        iss.state = 3;
      }
      return;
    }

    if (iss.state === 3) {
      if (iss.iss2Level === null || candle.low < iss.iss2Level) {
        iss.iss2Level = candle.low;
        iss.iss2Bar = bar;
      }
      if (this.config.issScenario === "1") {
        if (iss.afterBreakHigh === null || candle.high > iss.afterBreakHigh) {
          iss.afterBreakHigh = candle.high;
          iss.afterBreakHighBar = bar;
        }
        if (iss.afterBreakLow === null || candle.low < iss.afterBreakLow) {
          iss.afterBreakLow = candle.low;
          iss.afterBreakLowBar = bar;
        }
        if (bearishShift && iss.afterBreakHighBar !== null && iss.afterBreakLowBar !== null) {
          iss.afterBreakLow = candle.low;
          iss.afterBreakLowBar = bar;
          iss.state = 4;
        }
      } else {
        if (iss.afterBreakHigh === null || candle.high > iss.afterBreakHigh) {
          iss.afterBreakHigh = candle.high;
          iss.afterBreakHighBar = bar;
          iss.afterBreakLow = candle.low;
          iss.afterBreakLowBar = bar;
        } else if (iss.afterBreakLow === null || candle.low < iss.afterBreakLow) {
          iss.afterBreakLow = candle.low;
          iss.afterBreakLowBar = bar;
        }
        if (bearishShift && iss.afterBreakHighBar !== null && iss.afterBreakLowBar !== null) {
          iss.state = 4;
        }
      }
      return;
    }

    if (iss.state === 4) {
      if (iss.afterBreakLow === null || candle.low < iss.afterBreakLow) {
        iss.afterBreakLow = candle.low;
        iss.afterBreakLowBar = bar;
      }

      if (
        this.config.issScenario === "1" &&
        iss.afterBreakLow !== null &&
        iss.iss2Level !== null &&
        iss.afterBreakLow < iss.iss2Level
      ) {
        const resetLow = iss.afterBreakLow;
        const resetLowBar = iss.afterBreakLowBar;
        this.#resetBullIss(bar, "start");
        if (resetLowBar !== null) {
          this.#bullIss.baseExtreme = resetLow;
          this.#bullIss.baseBar = resetLowBar;
        }
        this.#bullIss.runExtreme = candle.high;
        this.#bullIss.runBar = bar;
        return;
      }

      if (
        iss.afterBreakHigh !== null &&
        iss.afterBreakLowBar !== null &&
        iss.afterBreakLow !== null &&
        candle.close > iss.afterBreakHigh
      ) {
        // Snapshot values before the tracker is cleared.
        const iss1Bar = iss.iss1Bar;
        const iss2Bar = iss.iss2Bar;
        const highBar = iss.afterBreakHighBar;
        const lowBar = iss.afterBreakLowBar;

        if (this.config.showLevels && this.config.showIss1 && iss1Bar !== null) {
          this.#addLevel({
            bar,
            sourceBar: iss1Bar,
            isHigh: true,
            kind: 29,
            text: "ISS 1",
            colorKey: "iss",
            bornBar: bar,
            leftBar: iss1Bar,
          });
        }
        if (this.config.showLevels && this.config.showIss2 && iss2Bar !== null) {
          this.#addLevel({
            bar,
            sourceBar: iss2Bar,
            isHigh: false,
            kind: 34,
            text: "ISS 2",
            colorKey: "iss",
            bornBar: bar,
            leftBar: iss2Bar,
          });
        }
        if (this.config.showLevels && this.config.showIss3 && highBar !== null) {
          this.#addLevel({
            bar,
            sourceBar: highBar,
            isHigh: true,
            kind: 30,
            text: "ISS 3",
            colorKey: "iss",
            bornBar: bar,
            leftBar: highBar,
          });
        }
        if (this.config.showLevels && this.config.showIss4 && lowBar !== null) {
          this.#addLevel({
            bar,
            sourceBar: lowBar,
            isHigh: false,
            kind: 31,
            text: "ISS 4",
            colorKey: "iss",
            bornBar: bar,
            leftBar: lowBar,
          });
        }

        this.#trend = 1;
        this.#phase = 1;
        this.#lastCH = highBar !== null && iss.afterBreakHigh !== null ? { bar: highBar, price: iss.afterBreakHigh } : this.#lastCH;
        this.#lastCL = lowBar !== null && iss.afterBreakLow !== null ? { bar: lowBar, price: iss.afterBreakLow } : this.#lastCL;
        this.#tjl1 = this.#lastCH ? { ...this.#lastCH } : null;
        this.#tjl2 = this.#lastCL ? { ...this.#lastCL } : null;
        this.#runHigh = { bar, price: candle.high };
        this.#runLow = { bar, price: candle.low };
        this.#issOrTjlSinceChoch = true;
        this.#resetBullIss(bar, "clear");
        this.#resetBearIss(bar, "start");

        events.push({
          bar,
          type: "iss-bull-complete",
          message: `Bullish ISS completed; structure reset to bullish`,
          levelIds: [],
        });
      }
    }
  }

  /** Bearish ISS tracker — script.txt:1955-2142. */
  #updateBearIss(bar: number, bearishShift: boolean, bullishShift: boolean, events: EngineEvent[]): void {
    const candle = this.candles[bar]!;
    const iss = this.#bearIss;
    const invalidated = iss.state >= 2 && iss.baseExtreme !== null && candle.close > iss.baseExtreme;
    if (invalidated) {
      this.#bearIss = emptyIss();
      return;
    }

    if (iss.state === 1) {
      if (this.config.issScenario === "1") {
        if (
          bullishShift &&
          iss.runBar !== null &&
          iss.runBar < bar &&
          iss.runBar !== iss.baseBar &&
          iss.runExtreme !== null
        ) {
          iss.iss1Level = iss.runExtreme;
          iss.iss1Bar = iss.runBar;
          iss.state = 2;
          iss.iss2Level = candle.high;
          iss.iss2Bar = bar;
          return;
        }
        if (iss.baseExtreme === null || candle.high > iss.baseExtreme) {
          iss.baseExtreme = candle.high;
          iss.baseBar = bar;
          iss.runExtreme = candle.low;
          iss.runBar = bar;
        } else if (iss.runExtreme === null || candle.low < iss.runExtreme) {
          iss.runExtreme = candle.low;
          iss.runBar = bar;
        }
      } else {
        if (iss.baseExtreme === null || candle.high > iss.baseExtreme) {
          iss.baseExtreme = candle.high;
          iss.baseBar = bar;
          iss.runExtreme = candle.low;
          iss.runBar = bar;
          iss.baseConfirmed = false;
        }
        if (!iss.baseConfirmed) {
          if (bearishShift) {
            iss.baseConfirmed = true;
            iss.runExtreme = candle.low;
            iss.runBar = bar;
          }
        } else {
          if (iss.runExtreme === null || candle.low < iss.runExtreme) {
            iss.runExtreme = candle.low;
            iss.runBar = bar;
          }
          if (bullishShift && iss.runBar !== null && iss.runBar < bar && iss.runExtreme !== null) {
            iss.iss1Level = iss.runExtreme;
            iss.iss1Bar = iss.runBar;
            iss.state = 2;
            iss.iss2Level = candle.high;
            iss.iss2Bar = bar;
          }
        }
      }
      return;
    }

    if (iss.state === 2) {
      if (iss.iss2Level === null || candle.high > iss.iss2Level) {
        iss.iss2Level = candle.high;
        iss.iss2Bar = bar;
      }
      if (iss.iss1Level !== null && candle.close < iss.iss1Level) {
        iss.afterBreakLow = candle.low;
        iss.afterBreakLowBar = bar;
        iss.afterBreakHigh = candle.high;
        iss.afterBreakHighBar = bar;
        iss.state = 3;
      }
      return;
    }

    if (iss.state === 3) {
      if (iss.iss2Level === null || candle.high > iss.iss2Level) {
        iss.iss2Level = candle.high;
        iss.iss2Bar = bar;
      }
      if (this.config.issScenario === "1") {
        if (iss.afterBreakLow === null || candle.low < iss.afterBreakLow) {
          iss.afterBreakLow = candle.low;
          iss.afterBreakLowBar = bar;
          iss.afterBreakHigh = candle.high;
          iss.afterBreakHighBar = bar;
        } else if (iss.afterBreakHigh === null || candle.high > iss.afterBreakHigh) {
          iss.afterBreakHigh = candle.high;
          iss.afterBreakHighBar = bar;
        }
        if (bullishShift && iss.afterBreakLowBar !== null && iss.afterBreakHighBar !== null) {
          iss.afterBreakHigh = candle.high;
          iss.afterBreakHighBar = bar;
          iss.state = 4;
        }
      } else {
        if (iss.afterBreakLow === null || candle.low < iss.afterBreakLow) {
          iss.afterBreakLow = candle.low;
          iss.afterBreakLowBar = bar;
          iss.afterBreakHigh = candle.high;
          iss.afterBreakHighBar = bar;
        } else if (iss.afterBreakHigh === null || candle.high > iss.afterBreakHigh) {
          iss.afterBreakHigh = candle.high;
          iss.afterBreakHighBar = bar;
        }
        if (bullishShift && iss.afterBreakLowBar !== null && iss.afterBreakHighBar !== null) {
          iss.state = 4;
        }
      }
      return;
    }

    if (iss.state === 4) {
      if (iss.afterBreakHigh === null || candle.high > iss.afterBreakHigh) {
        iss.afterBreakHigh = candle.high;
        iss.afterBreakHighBar = bar;
      }

      if (
        this.config.issScenario === "1" &&
        iss.afterBreakHigh !== null &&
        iss.iss2Level !== null &&
        iss.afterBreakHigh > iss.iss2Level
      ) {
        const resetHigh = iss.afterBreakHigh;
        const resetHighBar = iss.afterBreakHighBar;
        this.#resetBearIss(bar, "start");
        if (resetHighBar !== null) {
          this.#bearIss.baseExtreme = resetHigh;
          this.#bearIss.baseBar = resetHighBar;
        }
        this.#bearIss.runExtreme = candle.low;
        this.#bearIss.runBar = bar;
        return;
      }

      if (
        iss.afterBreakLow !== null &&
        iss.afterBreakHighBar !== null &&
        iss.afterBreakHigh !== null &&
        candle.close < iss.afterBreakLow
      ) {
        const iss1Bar = iss.iss1Bar;
        const iss2Bar = iss.iss2Bar;
        const lowBar = iss.afterBreakLowBar;
        const highBar = iss.afterBreakHighBar;

        if (this.config.showLevels && this.config.showIss1 && iss1Bar !== null) {
          this.#addLevel({
            bar,
            sourceBar: iss1Bar,
            isHigh: false,
            kind: 29,
            text: "ISS 1",
            colorKey: "iss",
            bornBar: bar,
            leftBar: iss1Bar,
          });
        }
        if (this.config.showLevels && this.config.showIss2 && iss2Bar !== null) {
          this.#addLevel({
            bar,
            sourceBar: iss2Bar,
            isHigh: true,
            kind: 35,
            text: "ISS 2",
            colorKey: "iss",
            bornBar: bar,
            leftBar: iss2Bar,
          });
        }
        if (this.config.showLevels && this.config.showIss3 && lowBar !== null) {
          this.#addLevel({
            bar,
            sourceBar: lowBar,
            isHigh: false,
            kind: 32,
            text: "ISS 3",
            colorKey: "iss",
            bornBar: bar,
            leftBar: lowBar,
          });
        }
        if (this.config.showLevels && this.config.showIss4 && highBar !== null) {
          this.#addLevel({
            bar,
            sourceBar: highBar,
            isHigh: true,
            kind: 33,
            text: "ISS 4",
            colorKey: "iss",
            bornBar: bar,
            leftBar: highBar,
          });
        }

        this.#trend = -1;
        this.#phase = 1;
        this.#lastCH = highBar !== null && iss.afterBreakHigh !== null ? { bar: highBar, price: iss.afterBreakHigh } : this.#lastCH;
        this.#lastCL = lowBar !== null && iss.afterBreakLow !== null ? { bar: lowBar, price: iss.afterBreakLow } : this.#lastCL;
        this.#tjl1 = this.#lastCL ? { ...this.#lastCL } : null;
        this.#tjl2 = this.#lastCH ? { ...this.#lastCH } : null;
        this.#runHigh = { bar, price: candle.high };
        this.#runLow = { bar, price: candle.low };
        this.#issOrTjlSinceChoch = true;
        this.#resetBearIss(bar, "clear");
        this.#resetBullIss(bar, "start");

        events.push({
          bar,
          type: "iss-bear-complete",
          message: `Bearish ISS completed; structure reset to bearish`,
          levelIds: [],
        });
      }
    }
  }

  #processBar(bar: number): void {
    const candle = this.candles[bar]!;
    const prev = this.candles[bar - 1]!;
    const events: EngineEvent[] = [];

    this.#updateLevels(bar);

    if (this.#runHigh === null || candle.high > this.#runHigh.price) {
      this.#runHigh = { bar, price: candle.high };
    }
    if (this.#runLow === null || candle.low < this.#runLow.price) {
      this.#runLow = { bar, price: candle.low };
    }

    const redP = prev.close < prev.open;
    const greenP = prev.close > prev.open;
    const redC = candle.close < candle.open;
    const greenC = candle.close > candle.open;
    const bearishShift = redP && redC && candle.close < prev.low;
    const bullishShift = greenP && greenC && candle.close > prev.high;
    const bullRetracement = bearishShift;
    const bearRetracement = bullishShift;

    if (bearishShift) this.#emit("bear-shift", bar, "Bearish ISS shift (two red closes below prior low)", []);
    if (bullishShift) this.#emit("bull-shift", bar, "Bullish ISS shift (two green closes above prior high)", []);

    const bearChoch =
      this.#trend === 1 &&
      this.#lastCL !== null &&
      redP &&
      prev.close < this.#lastCL.price &&
      candle.close < this.#lastCL.price;
    const bullChoch =
      this.#trend === -1 &&
      this.#lastCH !== null &&
      greenP &&
      prev.close > this.#lastCH.price &&
      candle.close > this.#lastCH.price;

    if (bearChoch) {
      this.#emit("bear-choch", bar, "Bearish CHOCH confirmed", []);
      if (this.#tjl1 !== null && this.config.showTjl) this.#deleteLatestTjl1ByLeft(this.#tjl1.bar);

      const dual = this.#lastChochSide === -1 && !this.#issOrTjlSinceChoch;
      if (dual) {
        this.#emit("dual-choch", bar, "Dual CHOCH: previous bearish levels promoted", []);
        this.#promoteLastChochLevelsToBest(bar, this.#lastQmlLeft, events);
        if (this.config.showLevels && this.#runHigh) {
          this.#addLevel({
            bar,
            sourceBar: this.#runHigh.bar,
            isHigh: true,
            kind: 5,
            text: "D-CHOCH DT",
            colorKey: "dtdb",
          });
        }
      } else {
        if (this.config.keepOnlyLastChoch) this.#freezePreviousChochLevels();
        if (this.config.showLevels) {
          if (this.#lastCL) {
            this.#addLevel({
              bar,
              sourceBar: this.#lastCL.bar,
              isHigh: false,
              kind: 3,
              text: "SBR",
              colorKey: "sbr",
            });
          }
          if (this.#runHigh && (!this.#tjl1 || this.#runHigh.bar !== this.#tjl1.bar)) {
            this.#addLevel({
              bar,
              sourceBar: this.#runHigh.bar,
              isHigh: true,
              kind: 5,
              text: "DT",
              colorKey: "dtdb",
            });
          }
          if (this.#tjl1) {
            this.#addLevel({
              bar,
              sourceBar: this.#tjl1.bar,
              isHigh: true,
              kind: 7,
              text: "SELL QML",
              colorKey: "qml",
            });
            this.#lastQmlLeft = this.#tjl1.bar;
          }
        }
      }

      this.#trend = -1;
      this.#phase = 1;
      if (this.#runHigh) this.#lastCH = { ...this.#runHigh };
      this.#runHigh = { bar, price: candle.high };
      this.#runLow = { bar, price: candle.low };
      this.#lastChochSide = 1;
      this.#issOrTjlSinceChoch = false;
      this.#resetBullIss(bar, "start");
      this.#resetBearIss(bar, "clear");
    } else if (bullChoch) {
      this.#emit("bull-choch", bar, "Bullish CHOCH confirmed", []);
      if (this.#tjl1 !== null && this.config.showTjl) this.#deleteLatestTjl1ByLeft(this.#tjl1.bar);

      const dual = this.#lastChochSide === 1 && !this.#issOrTjlSinceChoch;
      if (dual) {
        this.#emit("dual-choch", bar, "Dual CHOCH: previous bullish levels promoted", []);
        this.#promoteLastChochLevelsToBest(bar, this.#lastQmlLeft, events);
        if (this.config.showLevels && this.#runLow) {
          this.#addLevel({
            bar,
            sourceBar: this.#runLow.bar,
            isHigh: false,
            kind: 6,
            text: "D-CHOCH DB",
            colorKey: "dtdb",
          });
        }
      } else {
        if (this.config.keepOnlyLastChoch) this.#freezePreviousChochLevels();
        if (this.config.showLevels) {
          if (this.#lastCH) {
            this.#addLevel({
              bar,
              sourceBar: this.#lastCH.bar,
              isHigh: true,
              kind: 4,
              text: "RBS",
              colorKey: "rbs",
            });
          }
          if (this.#runLow && (!this.#tjl1 || this.#runLow.bar !== this.#tjl1.bar)) {
            this.#addLevel({
              bar,
              sourceBar: this.#runLow.bar,
              isHigh: false,
              kind: 6,
              text: "DB",
              colorKey: "dtdb",
            });
          }
          if (this.#tjl1) {
            this.#addLevel({
              bar,
              sourceBar: this.#tjl1.bar,
              isHigh: false,
              kind: 7,
              text: "BUY QML",
              colorKey: "qml",
            });
            this.#lastQmlLeft = this.#tjl1.bar;
          }
        }
      }

      this.#trend = 1;
      this.#phase = 1;
      if (this.#runLow) this.#lastCL = { ...this.#runLow };
      this.#runHigh = { bar, price: candle.high };
      this.#runLow = { bar, price: candle.low };
      this.#lastChochSide = -1;
      this.#issOrTjlSinceChoch = false;
      this.#resetBearIss(bar, "start");
      this.#resetBullIss(bar, "clear");
    } else if (this.#trend === 1 && this.#phase === 2 && this.#lastCH && candle.close > this.#lastCH.price) {
      this.#emit("bull-bos", bar, "Bullish BOS confirmed", []);
      if (this.#runLow) this.#lastCL = { ...this.#runLow };
      this.#tjl1 = this.#lastCH ? { ...this.#lastCH } : null;
      this.#tjl2 = this.#lastCL ? { ...this.#lastCL } : null;
      if (this.config.showTjl) {
        if (this.config.showLevels && this.#tjl1) {
          this.#addLevel({
            bar,
            sourceBar: this.#tjl1.bar,
            isHigh: true,
            kind: 1,
            text: "BUY TJL1",
            colorKey: "tjl-bull",
          });
        }
        if (this.config.showLevels && this.#tjl2) {
          this.#addLevel({
            bar,
            sourceBar: this.#tjl2.bar,
            isHigh: false,
            kind: 2,
            text: "BUY TJL2",
            colorKey: "tjl-bull",
          });
        }
        this.#issOrTjlSinceChoch = true;
      }
      this.#phase = 1;
      this.#runHigh = { bar, price: candle.high };
      this.#runLow = { bar, price: candle.low };
      this.#resetBearIss(bar, "start");
      this.#resetBullIss(bar, "clear");
    } else if (this.#trend === -1 && this.#phase === 2 && this.#lastCL && candle.close < this.#lastCL.price) {
      this.#emit("bear-bos", bar, "Bearish BOS confirmed", []);
      if (this.#runHigh) this.#lastCH = { ...this.#runHigh };
      this.#tjl1 = this.#lastCL ? { ...this.#lastCL } : null;
      this.#tjl2 = this.#lastCH ? { ...this.#lastCH } : null;
      if (this.config.showTjl) {
        if (this.config.showLevels && this.#tjl1) {
          this.#addLevel({
            bar,
            sourceBar: this.#tjl1.bar,
            isHigh: false,
            kind: 1,
            text: "SELL TJL1",
            colorKey: "tjl-bear",
          });
        }
        if (this.config.showLevels && this.#tjl2) {
          this.#addLevel({
            bar,
            sourceBar: this.#tjl2.bar,
            isHigh: true,
            kind: 2,
            text: "SELL TJL2",
            colorKey: "tjl-bear",
          });
        }
        this.#issOrTjlSinceChoch = true;
      }
      this.#phase = 1;
      this.#runHigh = { bar, price: candle.high };
      this.#runLow = { bar, price: candle.low };
      this.#resetBullIss(bar, "start");
      this.#resetBearIss(bar, "clear");
    } else if (this.#phase === 1) {
      if (this.#trend !== -1 && bullRetracement) {
        if (this.#runHigh) this.#lastCH = { ...this.#runHigh };
        this.#trend = 1;
        this.#phase = 2;
        this.#emit("trend-up", bar, "Bullish retracement: CH recorded, phase 2", []);
        this.#runLow =
          candle.low < prev.low
            ? { bar, price: candle.low }
            : { bar: bar - 1, price: prev.low };
      } else if (this.#trend !== 1 && bearRetracement) {
        if (this.#runLow) this.#lastCL = { ...this.#runLow };
        this.#trend = -1;
        this.#phase = 2;
        this.#emit("trend-down", bar, "Bearish retracement: CL recorded, phase 2", []);
        this.#runHigh =
          candle.high > prev.high
            ? { bar, price: candle.high }
            : { bar: bar - 1, price: prev.high };
      }
    }

    if (this.config.enableIss) {
      this.#updateBullIss(bar, bearishShift, bullishShift, events);
      this.#updateBearIss(bar, bearishShift, bullishShift, events);
    }

    this.#events.push(...events);
  }
}

export function runEngine(candles: readonly Candle[], config: Partial<EngineConfig> = {}): JaduTonaEngine {
  return new JaduTonaEngine(candles, config);
}
