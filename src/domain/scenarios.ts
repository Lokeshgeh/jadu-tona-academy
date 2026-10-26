import { generateSyntheticSeries, highestHigh, widestRange, type Candle } from "./chart";
import type { QuestionOption } from "./content";
import { runEngine } from "./engine";
import type { TopicId } from "./rules";

export type Difficulty = "intro" | "core" | "stretch";

export interface ScenarioTask {
  prompt: string;
  options: QuestionOption[];
}

/**
 * Everything the UI is allowed to see before a scenario is submitted.
 * It deliberately contains no answer id and no explanation.
 */
export interface PublicScenario {
  id: string;
  title: string;
  difficulty: Difficulty;
  topicId: TopicId;
  objective: string;
  ruleIds: string[];
  synthetic: true;
  sourceNote: string;
  candles: Candle[];
  /** Index of the newest candle that may be shown before the question unlocks. */
  revealAt: number;
  task: ScenarioTask;
  /** Optional horizontal reference line. */
  level?: { value: number; label: string };
}

export interface SealedAnswer {
  answerId: string;
  explanation: string;
}

/* ----------------------------- mechanics ----------------------------- */

const CANDLES_A = generateSyntheticSeries({
  seed: 11,
  length: 40,
  start: 240,
  drift: 0.0009,
  volatility: 0.011,
  shockIndex: 23,
});
const CANDLES_B = generateSyntheticSeries({
  seed: 23,
  length: 36,
  start: 1.087,
  drift: -0.0003,
  volatility: 0.0032,
  shockIndex: 17,
});
const CANDLES_C = generateSyntheticSeries({
  seed: 41,
  length: 32,
  start: 4120,
  drift: 0.0004,
  volatility: 0.0075,
  shockIndex: 12,
});
const CANDLES_D = generateSyntheticSeries({
  seed: 67,
  length: 30,
  start: 76.5,
  drift: 0,
  volatility: 0.009,
  shockIndex: 19,
});

const barOptions = (correctIndex: number, length: number): QuestionOption[] => {
  const indexes = new Set<number>([correctIndex]);
  let offset = 3;
  while (indexes.size < 4) {
    indexes.add((correctIndex + offset * 3) % length);
    offset += 1;
  }
  return [...indexes].sort((a, b) => a - b).map((index) => ({
    id: `bar-${index}`,
    label: `Bar ${String(index).padStart(2, "0")}`,
  }));
};

function buildExtremeScenario(config: {
  id: string;
  title: string;
  difficulty: Difficulty;
  objective: string;
  candles: Candle[];
  revealAt: number;
  metric: "high" | "range";
}): PublicScenario {
  const visible = config.candles.slice(0, config.revealAt + 1);
  const target = config.metric === "high" ? highestHigh(visible) : widestRange(visible);
  if (!target) throw new Error(`Scenario ${config.id} has no visible candles`);
  return {
    id: config.id,
    title: config.title,
    difficulty: config.difficulty,
    topicId: "chart-basics",
    objective: config.objective,
    ruleIds: config.metric === "high" ? ["MEC-001"] : ["MEC-006"],
    synthetic: true,
    sourceNote: "Seeded synthetic candles. Not historical market data. Answer is fixed by the visible window only.",
    candles: config.candles,
    revealAt: config.revealAt,
    task: {
      prompt:
        config.metric === "high"
          ? "Using only the revealed bars, which bar printed the highest high?"
          : "Using only the revealed bars, which bar has the widest high-to-low range?",
      options: barOptions(target.index, visible.length),
    },
  };
}

const scenarioA = buildExtremeScenario({
  id: "SCN-HIGH-01",
  title: "Find the high without the future",
  difficulty: "intro",
  objective: "Read the visible window only and locate its highest high.",
  candles: CANDLES_A,
  revealAt: 24,
  metric: "high",
});

const scenarioB = buildExtremeScenario({
  id: "SCN-RANGE-01",
  title: "Widest range on the board",
  difficulty: "core",
  objective: "Compare body and wick sizes across the revealed window.",
  candles: CANDLES_B,
  revealAt: 22,
  metric: "range",
});

const revealC = 18;
const levelCandle = CANDLES_C[6]!;
const level = levelCandle.high;
const revealBar = CANDLES_C[revealC]!;
const closedThrough = revealBar.close > level;

const scenarioC: PublicScenario = {
  id: "SCN-TOUCH-01",
  title: "Did it close through?",
  difficulty: "core",
  topicId: "chart-basics",
  objective: "Distinguish a wick test from a close-through at a marked level.",
  ruleIds: ["MEC-004"],
  synthetic: true,
  sourceNote: "Seeded synthetic candles. The marked level is the high of an earlier visible bar.",
  candles: CANDLES_C,
  revealAt: revealC,
  level: { value: level, label: `Level ${level.toFixed(2)}` },
  task: {
    prompt: `The horizontal line marks ${level.toFixed(2)}, taken from an earlier bar. At the newest revealed bar, what happened?`,
    options: [
      { id: "above", label: "It closed above the level" },
      { id: "wick", label: "It traded above the level but closed below it" },
      { id: "untouched", label: "It never reached the level" },
      { id: "below", label: "It stayed entirely below the level and did not touch it" },
    ],
  },
};

const scenarioD: PublicScenario = {
  id: "SCN-EDGE-01",
  title: "The newest bar is never confirmed",
  difficulty: "intro",
  topicId: "lookahead",
  objective: "Recognise which conclusion the visible snapshot can and cannot support.",
  ruleIds: ["MEC-008"],
  synthetic: true,
  sourceNote: "Seeded synthetic candles, deliberately truncated at bar 20 of a longer series.",
  candles: CANDLES_D.slice(0, 21),
  revealAt: 20,
  task: {
    prompt: "The last visible bar is the highest in the snapshot. Which statement is safe at this moment?",
    options: [
      { id: "confirmed", label: "Its high is a confirmed swing high" },
      { id: "provisional", label: "Its high is provisional because no later bars exist yet" },
      { id: "breakout", label: "Price will break above it next" },
      { id: "irrelevant", label: "The high can be ignored because the bar is green" },
    ],
  },
};

/* ------------------------- source-verified ------------------------- */

const SERIES_19 = generateSyntheticSeries({ seed: 19, length: 80, start: 100, drift: 0.00036, volatility: 0.0095 });
const SERIES_31 = generateSyntheticSeries({ seed: 31, length: 80, start: 100, drift: 0, volatility: 0.0095 });
const SERIES_45 = generateSyntheticSeries({ seed: 45, length: 80, start: 100, drift: 0, volatility: 0.0095 });
const SERIES_34 = generateSyntheticSeries({ seed: 34, length: 80, start: 100, drift: 0.00054, volatility: 0.0095 });

const ENGINE_19 = runEngine(SERIES_19);
const ENGINE_31 = runEngine(SERIES_31);
const ENGINE_45 = runEngine(SERIES_45);
const ENGINE_34 = runEngine(SERIES_34);

const structuralEventAt = (engine: ReturnType<typeof runEngine>, bar: number): string | null => {
  const types = engine
    .frame(bar)
    .events.filter((event) => event.bar === bar)
    .map((event) => event.type);
  const order = ["bull-bos", "bear-bos", "bull-choch", "bear-choch", "iss-bull-complete", "iss-bear-complete"] as const;
  return order.find((type) => types.includes(type)) ?? null;
};

const bosEvent = structuralEventAt(ENGINE_19, 45);
const chochEvent = structuralEventAt(ENGINE_31, 34);
const issEvent = structuralEventAt(ENGINE_34, 44);

const eventOptions = (correct: string, key: string): { options: QuestionOption[]; answerId: string } => {
  const labels: Record<string, string> = {
    "bull-bos": "A bullish BOS",
    "bear-bos": "A bearish BOS",
    "bull-choch": "A bullish CHOCH",
    "bear-choch": "A bearish CHOCH",
    "iss-bull-complete": "A bullish ISS completion",
    "iss-bear-complete": "A bearish ISS completion",
  };
  const others = Object.keys(labels).filter((id) => id !== correct).slice(0, 3);
  const ids = [correct, ...others];
  const offset = key.length % 4;
  const rotated = [...ids.slice(offset), ...ids.slice(0, offset)];
  return {
    options: rotated.map((id) => ({ id, label: labels[id] ?? id })),
    answerId: correct,
  };
};

if (bosEvent !== "bull-bos") throw new Error(`SCN-BOS fixture drifted: got ${String(bosEvent)}`);
if (chochEvent !== "bear-choch") throw new Error(`SCN-CHOCH fixture drifted: got ${String(chochEvent)}`);
if (issEvent !== "iss-bear-complete") throw new Error(`SCN-ISS fixture drifted: got ${String(issEvent)}`);

const qmlLevel = ENGINE_45.frame(55).levels.find((item) => item.kind === 7 && !item.deleted && item.active);
if (!qmlLevel) throw new Error("SCN-QML fixture drifted: no active QML at bar 55");
const qmlSource = qmlLevel.sourceBar;

const bosTask = eventOptions("bull-bos", "scn-bos");
const chochTask = eventOptions("bear-choch", "scn-choch");
const issTask = eventOptions("iss-bear-complete", "scn-iss");
const qmlOptions = barOptions(qmlSource, 56);

const scenarioBos: PublicScenario = {
  id: "SCN-BOS-01",
  title: "Name the break",
  difficulty: "core",
  topicId: "bos-choch",
  objective: "Classify the newest confirmed structure event from the visible bars only.",
  ruleIds: ["STR-002", "STR-004"],
  synthetic: true,
  sourceNote: "Seeded synthetic candles. Engine settings are the source defaults; the answer uses bars 0–45 only.",
  candles: SERIES_19,
  revealAt: 45,
  task: {
    prompt: "The newest revealed bar is bar 45. Which structure event does the source confirm on this bar?",
    options: bosTask.options,
  },
};

const scenarioChoch: PublicScenario = {
  id: "SCN-CHOCH-01",
  title: "Character change, not a wick",
  difficulty: "core",
  topicId: "bos-choch",
  objective: "Use the two-close CHOCH condition instead of reacting to the candle colour alone.",
  ruleIds: ["STR-003"],
  synthetic: true,
  sourceNote: "Seeded synthetic candles. Engine settings are the source defaults; the answer uses bars 0–34 only.",
  candles: SERIES_31,
  revealAt: 34,
  task: {
    prompt: "The newest revealed bar is bar 34. Which structure event does the source confirm on this bar?",
    options: chochTask.options,
  },
};

const scenarioQml: PublicScenario = {
  id: "SCN-QML-01",
  title: "Where did the QML come from?",
  difficulty: "stretch",
  topicId: "tjl-qml",
  objective: "Trace a QML zone back to the snapshot that created it.",
  ruleIds: ["STR-005", "STR-006"],
  synthetic: true,
  sourceNote: "Seeded synthetic candles. The QML is created on bar 55 from an earlier TJL1 snapshot.",
  candles: SERIES_45,
  revealAt: 55,
  task: {
    prompt: "A SELL QML is created on the newest revealed bar (55). Which bar supplies its candle zone?",
    options: qmlOptions,
  },
};

const scenarioIss: PublicScenario = {
  id: "SCN-ISS-01",
  title: "ISS completion",
  difficulty: "stretch",
  topicId: "iss",
  objective: "Recognise a completed ISS sequence and distinguish it from BOS and CHOCH.",
  ruleIds: ["STR-010", "STR-020"],
  synthetic: true,
  sourceNote: "Seeded synthetic candles. Engine settings are the source defaults (ISS scenario 1).",
  candles: SERIES_34,
  revealAt: 44,
  task: {
    prompt: "The newest revealed bar is bar 44. Which event completes on this bar?",
    options: issTask.options,
  },
};

export const SCENARIOS: PublicScenario[] = [
  scenarioA,
  scenarioB,
  scenarioC,
  scenarioD,
  scenarioBos,
  scenarioChoch,
  scenarioQml,
  scenarioIss,
];

export function getScenario(id: string): PublicScenario | undefined {
  return SCENARIOS.find((scenario) => scenario.id === id);
}

/**
 * Answer keys live in a separate module so page components never receive them.
 * `ReplaySession` consumes this and keeps the values in ECMAScript private
 * fields, which do not survive JSON serialisation.
 */
export const SEALED_ANSWERS: Record<string, SealedAnswer> = {
  [scenarioA.id]: {
    answerId: `bar-${highestHigh(CANDLES_A.slice(0, scenarioA.revealAt + 1))!.index}`,
    explanation: `Within bars 0–${scenarioA.revealAt}, the highest high is on bar ${highestHigh(CANDLES_A.slice(0, scenarioA.revealAt + 1))!.index}. Bars after ${scenarioA.revealAt} are hidden and were not used.`,
  },
  [scenarioB.id]: {
    answerId: `bar-${widestRange(CANDLES_B.slice(0, scenarioB.revealAt + 1))!.index}`,
    explanation: `The widest high-to-low range in bars 0–${scenarioB.revealAt} belongs to bar ${widestRange(CANDLES_B.slice(0, scenarioB.revealAt + 1))!.index}.`,
  },
  [scenarioC.id]: {
    answerId: closedThrough ? "above" : revealBar.high > level ? "wick" : "untouched",
    explanation: closedThrough
      ? `The newest bar closed at ${revealBar.close.toFixed(2)}, above the ${level.toFixed(2)} level. That is a close-through.`
      : revealBar.high > level
        ? `The newest bar traded up to ${revealBar.high.toFixed(2)} but closed at ${revealBar.close.toFixed(2)}, back below ${level.toFixed(2)}. That is a wick test, not a close-through.`
        : `The newest bar's high of ${revealBar.high.toFixed(2)} stayed below ${level.toFixed(2)}, so the level was not reached.`,
  },
  [scenarioD.id]: {
    answerId: "provisional",
    explanation:
      "The snapshot ends at the newest bar. A swing high is only confirmed by later bars that fail to exceed it, so the label must stay provisional.",
  },
  [scenarioBos.id]: {
    answerId: "bull-bos",
    explanation:
      "The source was already in trend 1, phase 2. Bar 45 closes above lastCH, so a bullish BOS is confirmed. Bar 45's shift does not change that: BOS is evaluated first, and the close-through is required.",
  },
  [scenarioChoch.id]: {
    answerId: "bear-choch",
    explanation:
      "Trend was bullish, the previous bar was red, and both the previous and current closes were below lastCL. That is the source's bearish CHOCH condition. A wick or one red candle would not be enough.",
  },
  [scenarioQml.id]: {
    answerId: `bar-${qmlSource}`,
    explanation: `The QML is built from the TJL1 snapshot, which was taken at bar ${qmlSource} (high ${qmlLevel.top.toFixed(2)}). The CHOCH bar itself does not supply the QML zone.`,
  },
  [scenarioIss.id]: {
    answerId: "iss-bear-complete",
    explanation:
      "The bearish ISS tracker reaches state 4 and the close is below its post-break low, so the ISS sequence completes and resets structure bearish. It is not a BOS or CHOCH.",
  },
};

export function scenarioLevel(scenario: PublicScenario): { value: number; label: string } | null {
  return scenario.level ?? null;
}
