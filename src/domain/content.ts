import { generateSyntheticSeries, formatPrice, type Candle } from "./chart";
import { runEngine } from "./engine";
import type { TopicId } from "./rules";

export const CONTENT_VERSION = 3;

export interface LessonSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface Lesson {
  id: string;
  title: string;
  topicId: TopicId;
  minutes: number;
  summary: string;
  ruleIds: string[];
  sections: LessonSection[];
  keyPoints: string[];
}

export type QuestionType = "single-choice" | "true-false" | "chart-identify" | "violation";

export interface QuestionOption {
  id: string;
  label: string;
}

export interface ChartContext {
  candles: Candle[];
  caption: string;
  level?: number;
  levelLabel?: string;
}

export interface Question {
  id: string;
  type: QuestionType;
  topicId: TopicId;
  ruleIds: string[];
  prompt: string;
  options: QuestionOption[];
  answerId: string;
  explanation: string;
  chart?: ChartContext;
}

/* ------------------------------------------------------------------ */
/* Deterministic fixtures and option builders                          */
/* ------------------------------------------------------------------ */

const SERIES_19 = generateSyntheticSeries({
  seed: 19,
  length: 80,
  start: 100,
  drift: 0.00036,
  volatility: 0.0095,
});
const SERIES_31 = generateSyntheticSeries({ seed: 31, length: 80, start: 100, drift: 0, volatility: 0.0095 });
const SERIES_45 = generateSyntheticSeries({ seed: 45, length: 80, start: 100, drift: 0, volatility: 0.0095 });
const SERIES_34 = generateSyntheticSeries({
  seed: 34,
  length: 80,
  start: 100,
  drift: 0.00054,
  volatility: 0.0095,
});

const ENGINE_19 = runEngine(SERIES_19);
const ENGINE_31 = runEngine(SERIES_31);
const ENGINE_45 = runEngine(SERIES_45);
const ENGINE_34 = runEngine(SERIES_34);

const demoSeries = generateSyntheticSeries({ seed: 7, length: 28, start: 100, drift: 0.0015, volatility: 0.011 });

function stableIndex(key: string, count: number): number {
  let hash = 2166136261;
  for (let index = 0; index < key.length; index += 1) {
    hash = Math.imul(hash ^ key.charCodeAt(index), 16777619);
  }
  return Math.abs(hash) % count;
}

function placeCorrect(
  correctLabel: string,
  distractors: readonly string[],
  key: string,
): { options: QuestionOption[]; answerId: string } {
  const unique = [...new Set(distractors.filter((label) => label !== correctLabel))];
  if (unique.length !== 3) throw new Error(`Question ${key} needs exactly three distinct distractors.`);
  const index = stableIndex(key, 4);
  const labels = [...unique];
  labels.splice(index, 0, correctLabel);
  return {
    options: labels.map((label, position) => ({ id: `opt-${position}`, label })),
    answerId: `opt-${index}`,
  };
}

function barChoice(
  correctIndex: number,
  length: number,
  key: string,
): { options: QuestionOption[]; answerId: string } {
  const indexes = new Set<number>([correctIndex]);
  let offset = 2;
  while (indexes.size < 4) {
    indexes.add(((correctIndex + offset * 3) % length + length) % length);
    offset += 1;
    if (offset > length * 3) throw new Error(`Cannot build bar options for ${key}`);
  }
  return {
    options: [...indexes]
      .sort((a, b) => a - b)
      .map((index) => ({ id: `bar-${index}`, label: `Bar ${String(index).padStart(2, "0")}` })),
    answerId: `bar-${correctIndex}`,
  };
}

const p = (value: number): string => formatPrice(value, 2);

const barLabel = (index: number): string => `Bar ${String(index).padStart(2, "0")}`;

const chartCaption = (seed: number, lastBar: number): string =>
  `Synthetic series (seed ${seed}), snapshot through bar ${lastBar}. Not historical market data.`;

/* ------------------------------------------------------------------ */
/* Lessons                                                             */
/* ------------------------------------------------------------------ */

export const LESSONS: Lesson[] = [
  {
    id: "LSN-CANDLE",
    title: "Reading a candle without guessing",
    topicId: "chart-basics",
    minutes: 4,
    summary: "Every candle packs four numbers. Learn to read them in order before you interpret anything.",
    ruleIds: ["MEC-001", "MEC-002", "MEC-003", "MEC-006"],
    sections: [
      {
        heading: "Four numbers, one bar",
        paragraphs: [
          "A candle summarises one period with four prices: open, high, low and close. The body spans open to close. The thin lines above and below are wicks.",
          "Nothing in the drawing is extra information. Every visual feature can be reconstructed from the four numbers, which means every candle question has an arithmetic answer.",
        ],
      },
      {
        heading: "The body tells direction, not strength",
        paragraphs: [
          "Close above open is bullish; close below open is bearish. That is all the colour claims. A large green candle is a large move, not a promise that price keeps going.",
        ],
      },
      {
        heading: "Measuring the wick",
        paragraphs: [
          "Upper wick is high minus the higher of open and close. Lower wick is the lower of open and close minus low. Range is simply high minus low, and the midpoint is the average of the two.",
        ],
        bullets: ["Upper wick = high − max(open, close)", "Lower wick = min(open, close) − low", "Range = high − low"],
      },
      {
        heading: "Why this is safe to score",
        paragraphs: [
          "These are definitions of the data format, not claims about a strategy. The indicator rules are separately marked source-verified against the supplied Pine Script v6 file and covered by regression fixtures.",
        ],
      },
    ],
    keyPoints: [
      "Body = open to close; wick = the rest of the high–low range.",
      "Direction comes from close versus open.",
      "Every candle answer can be checked with arithmetic.",
    ],
  },
  {
    id: "LSN-TOUCH",
    title: "Wick touch versus close-through",
    topicId: "chart-basics",
    minutes: 5,
    summary:
      "The same bar can touch a level and reject it. Learn to describe what actually happened instead of what it felt like.",
    ruleIds: ["MEC-004", "MEC-005", "STR-014"],
    sections: [
      {
        heading: "Two different events",
        paragraphs: [
          "A wick test means price traded at or beyond a level during the bar but did not settle there. A close-through means the closing price finished beyond the level.",
          "These are different observations. Mixing them is one of the most common ways a chart description becomes untrue.",
        ],
      },
      {
        heading: "What the indicator does",
        paragraphs: [
          "The JADU TONA source defaults to TapByWick. A zone is tapped when the bar's high reaches at least the zone bottom and the bar's low reaches at most the zone top. In TapByClose mode only the close must sit inside the zone.",
        ],
      },
      {
        heading: "The intrabar problem",
        paragraphs: [
          "If a bar's low pierces support and its high pierces resistance, a single OHLC bar does not say which happened first. Lower-timeframe data or tick data would be needed. Any narrative that assumes an order is inventing information.",
          "The source's accuracy analyzer makes one explicit guess when both its target and loss are hit: it compares the distance from the open to the high against the distance from the open to the low. That is a heuristic, not evidence.",
        ],
      },
      {
        heading: "A testable habit",
        paragraphs: [
          "Before describing a touch, name the measurement: high/low for a wick test, close for a close-through. If the sentence needs a sequence inside the bar, stop and mark it ambiguous.",
        ],
      },
    ],
    keyPoints: [
      "Wick test = high/low reached the zone.",
      "Close-through = close finished beyond the level.",
      "Intrabar order is unknowable from OHLC alone.",
    ],
  },
  {
    id: "LSN-LOOKAHEAD",
    title: "The right-edge trap",
    topicId: "lookahead",
    minutes: 4,
    summary:
      "A replay only trains judgement if the future stays hidden. Learn to spot decisions that cheat with later bars.",
    ruleIds: ["MEC-007", "MEC-008", "STR-024"],
    sections: [
      {
        heading: "What lookahead bias is",
        paragraphs: [
          "Lookahead bias is using information that was not available when the decision had to be made. In a replay it usually arrives quietly: a label drawn with hindsight, a level confirmed by bars that had not printed yet, or a chart auto-scaled to a future high.",
        ],
      },
      {
        heading: "Confirmation needs the future",
        paragraphs: [
          "A swing point is only final once later bars fail to exceed it. Near the right edge of a chart, that evidence does not exist. The honest label is provisional, not confirmed.",
        ],
      },
      {
        heading: "The source's own setting",
        paragraphs: [
          "The multi-timeframe dashboard and alerts call request.security with barmerge.lookahead_off. That is the correct non-repainting choice for historical dashboard rows. It does not make the live higher-timeframe bar predictive: the current row can still change until that timeframe closes.",
        ],
      },
      {
        heading: "How this app protects the exercise",
        paragraphs: [
          "Replay screens hold only the revealed candles. Future candles and the answer key are not part of the visible state until you submit. The test suite attacks that boundary directly.",
        ],
      },
    ],
    keyPoints: [
      "If you could not have known it at the decision bar, you cannot use it.",
      "Right-edge structure is provisional until later bars arrive.",
      "lookahead_off prevents borrowing future security data, not live-bar updates.",
    ],
  },
  {
    id: "LSN-SIM",
    title: "What this game is — and is not",
    topicId: "simulation-honesty",
    minutes: 3,
    summary:
      "This is a practice environment for chart literacy and source traceability. It is not a signal service, a backtest, or financial advice.",
    ruleIds: ["MEC-009", "MEC-010"],
    sections: [
      {
        heading: "Synthetic means synthetic",
        paragraphs: [
          "Scenarios are generated with a fixed random seed so every learner sees the same chart. That makes them reproducible and fair. It does not make them historical. They are labelled synthetic wherever they appear.",
          "Some fixtures are hand-built to force a specific source condition. Those are labelled as designed sequences, still synthetic.",
        ],
      },
      {
        heading: "Only deterministic answers are scored",
        paragraphs: [
          "A question is scorable only when the visible data and a stated rule fix the answer. If two careful readers could disagree, the question is not scored — it becomes a discussion prompt or is removed.",
        ],
      },
      {
        heading: "What is included and excluded",
        paragraphs: [
          "The game implements the indicator's in-scope structure logic from the supplied Pine Script v6 source: swings, CH/CL, BOS, CHOCH, TJL, QML, SBR/RBS/DT/DB, ISS, EMA and the accuracy analyzer. Rules are registered with source line anchors and covered by tests.",
          "Some source modules are outside this game's scope and are not modelled, taught, quizzed, or scored. The audit document lists that boundary. Excluding a module is a scope decision, not a claim that those concepts are invalid.",
        ],
      },
    ],
    keyPoints: [
      "Seeded synthetic data is reproducible, not historical.",
      "Scored answers must be deterministic.",
      "Excluded concepts stay out of the game entirely.",
    ],
  },
  {
    id: "LSN-STRUCTURE",
    title: "Run extremes, CH and CL",
    topicId: "swing-structure",
    minutes: 7,
    summary:
      "How the indicator decides that a pullback has started, and which high or low it freezes as the reference point.",
    ruleIds: ["STR-001", "STR-004", "STR-020", "STR-026"],
    sections: [
      {
        heading: "The two running extremes",
        paragraphs: [
          "From bar 2 onward the source tracks the highest high and lowest low since the last reset. These are runHigh and runLow. They are not confirmed swing points; they are running extremes.",
          "Bars 0 and 1 are never evaluated for structure because the logic reads close[1], low[1] and high[1]. That startup guard is part of the source, and the game engine reproduces it.",
        ],
      },
      {
        heading: "The shift that arms a retracement",
        paragraphs: [
          "A bearish shift requires the previous bar to be red, the current bar to be red, and the current close to be below the previous bar's low. A bullish shift is the mirror: two green closes with the second above the previous high.",
        ],
      },
      {
        heading: "CH and CL are frozen snapshots",
        paragraphs: [
          "In phase 1, a bearish shift under a non-bearish trend freezes runHigh as CH, switches trend to bullish and phase to 2. A bullish shift under a non-bullish trend freezes runLow as CL, switches trend to bearish and phase to 2.",
          "A snapshot stores both the price and the bar that produced it. That bar later supplies level zones, even if price has moved far away.",
        ],
        bullets: [
          "Phase 1 = tracking / impulse.",
          "Phase 2 = retracement, with CH or CL recorded.",
          "A BOS or CHOCH returns phase to 1.",
        ],
      },
      {
        heading: "Order matters",
        paragraphs: [
          "The source updates existing levels first, then run extremes, then structure, then the ISS trackers. The game engine keeps that order because it changes which bar a snapshot can reference.",
        ],
      },
    ],
    keyPoints: [
      "runHigh/runLow are running extremes, not confirmed swings.",
      "A shift is a two-bar close condition.",
      "CH/CL snapshots carry their source bar.",
    ],
  },
  {
    id: "LSN-BOSCHOCH",
    title: "BOS, CHOCH and dual CHOCH",
    topicId: "bos-choch",
    minutes: 8,
    summary:
      "The exact close conditions that mark a break or a character change, plus the promotion path that creates D-CHOCH levels.",
    ruleIds: ["STR-002", "STR-003", "STR-004", "STR-009", "STR-017", "STR-021", "STR-027"],
    sections: [
      {
        heading: "BOS",
        paragraphs: [
          "A bullish BOS needs trend 1, phase 2 and a close above lastCH. A bearish BOS needs trend -1, phase 2 and a close below lastCL. A wick through the level is not enough.",
          "BOS resets phase to 1, refreshes the opposite reference, sets TJL1/TJL2, and starts the opposite ISS tracker.",
        ],
      },
      {
        heading: "CHOCH",
        paragraphs: [
          "A bearish CHOCH needs trend 1, an existing lastCL, a red previous bar, and both the previous close and the current close below lastCL. The current bar's colour is not checked directly, but the previous bar must be red. A bullish CHOCH mirrors this above lastCH.",
          "That makes CHOCH a two-close confirmation rather than a single wick event.",
        ],
      },
      {
        heading: "Dual CHOCH",
        paragraphs: [
          "A CHOCH is dual when the previous CHOCH was in the opposite direction and no ISS or TJL event has occurred since. Instead of building a fresh SBR/RBS/DT/DB/QML group, the source promotes the previous group to kind-8 best levels and adds one D-CHOCH DT or DB from the current run extreme.",
        ],
      },
      {
        heading: "A+ filtering",
        paragraphs: [
          "The A+ filter keeps TJL2, QML, both ISS4 kinds (31 and 33), and kind-8 levels whose text contains QML. D-CHOCH SBR/RBS/DT/DB are kind 8 but not QML, so they disappear under this filter.",
        ],
      },
      {
        heading: "A label quirk worth knowing",
        paragraphs: [
          "When a high-type SELL QML (dir -1) is promoted, the source's best-text function labels it D-CHOCH BUY QML. A low-type BUY QML (dir 1) becomes D-CHOCH SELL QML. The game models this exactly and treats it as a source quirk, not a correction.",
        ],
      },
    ],
    keyPoints: [
      "BOS = phase 2 plus a close through CH/CL.",
      "CHOCH = opposite trend plus two closes beyond the reference.",
      "Dual CHOCH promotes levels instead of creating a new group.",
      "A+ filter drops D-CHOCH SBR/RBS/DT/DB.",
    ],
  },
  {
    id: "LSN-TJLQML",
    title: "TJL1, TJL2, QML and the CHOCH zones",
    topicId: "tjl-qml",
    minutes: 7,
    summary: "Which snapshot supplies each level, and why the displayed BUY/SELL text is not always the stored direction.",
    ruleIds: ["STR-005", "STR-006", "STR-007", "STR-008", "STR-019"],
    sections: [
      {
        heading: "TJL on a BOS",
        paragraphs: [
          "On a bullish BOS, TJL1 comes from lastCH and TJL2 from the refreshed lastCL. On a bearish BOS, TJL1 comes from lastCL and TJL2 from the refreshed lastCH. Each is drawn as a candle zone from the source bar's OHLC.",
          "The levels are born on the BOS bar, so they cannot stop on that same bar. The tap check only starts on the next bar.",
        ],
      },
      {
        heading: "Why BUY TJL2 has dir -1",
        paragraphs: [
          "Direction is computed from level kind and zone type, not from the text. BUY TJL2 is built from a low-type CL zone, so its stored direction is -1 even though its label says BUY. The analyzer uses the stored direction; the label is display text.",
        ],
      },
      {
        heading: "QML comes from TJL1",
        paragraphs: [
          "On a non-dual CHOCH, if a TJL1 snapshot exists, the source creates a QML from that snapshot's bar and then deletes the TJL1 level. QML does not come from the CHOCH bar.",
          "A bearish CHOCH makes SELL QML from a high-type TJL1 bar. A bullish CHOCH makes BUY QML from a low-type TJL1 bar.",
        ],
      },
      {
        heading: "SBR/RBS/DT/DB",
        paragraphs: [
          "SBR is built from lastCL with a low-type zone. RBS is built from lastCH with a high-type zone. DT is built from the runHigh bar unless that bar is already the TJL1 bar. DB mirrors this from runLow.",
          "SBR and DT are created on a bearish CHOCH. RBS and DB are created on a bullish CHOCH.",
        ],
      },
    ],
    keyPoints: [
      "TJL1/TJL2 are CH/CL snapshots, not the BOS bar.",
      "QML is derived from the TJL1 snapshot.",
      "Stored direction can differ from displayed BUY/SELL text.",
    ],
  },
  {
    id: "LSN-LEVELS",
    title: "Zone geometry and level lifecycle",
    topicId: "levels",
    minutes: 6,
    summary:
      "How a candle becomes a zone, when a tap counts, and why ISS levels follow a different stop rule.",
    ruleIds: ["STR-013", "STR-014", "STR-018", "STR-023", "STR-026"],
    sections: [
      {
        heading: "The zone formula",
        paragraphs: [
          "Let bodyTop = max(open, close) and bodyBot = min(open, close). Pad = body size × Zone Body % × 0.01. Zone Body % defaults to 1.0.",
          "A high-type zone runs from the bar high down to bodyTop − pad. A low-type zone runs from bodyBot + pad down to the bar low. A tiny body still produces a pad of zero.",
        ],
      },
      {
        heading: "When a tap stops a level",
        paragraphs: [
          "Default tap source is wick. A bar taps a zone when its high is at least the zone bottom and its low is at most the zone top. TapByClose instead requires the close to sit inside the zone.",
          "With Stop On Tap enabled (default), a tap stops the level. The check only runs on bars after the level's birth bar, so a level cannot stop on the bar that created it.",
        ],
      },
      {
        heading: "ISS levels are special",
        paragraphs: [
          "Kinds 30–35 do not use the generic tap rule. They first need a close beyond the zone to arm stopReady, then a later bar that overlaps the zone stops them. Kind 29 (ISS1) is not in that range, and ISS1 is hidden by default anyway.",
          "The input is named Stop ISS 3/4 on Wick Tap, but the implementation covers all ISS level kinds 30–35.",
        ],
      },
      {
        heading: "Display limits",
        paragraphs: [
          "The default live-level cap is 140; the oldest levels are trimmed. A zone's left edge is never drawn more than 4000 bars back, and label/line pools are capped at 180 each. These are display limits, not market rules.",
        ],
      },
    ],
    keyPoints: [
      "High-type: high down to bodyTop − pad.",
      "Low-type: bodyBot + pad down to low.",
      "Levels cannot stop on their birth bar.",
      "ISS levels need a close beyond, then a later wick.",
    ],
  },
  {
    id: "LSN-ISS",
    title: "The ISS1–ISS4 state machine",
    topicId: "iss",
    minutes: 9,
    summary:
      "A four-state tracker that records a base, a run, a break and a post-break pullback before resetting structure.",
    ruleIds: ["STR-010", "STR-018", "STR-020", "STR-021"],
    sections: [
      {
        heading: "Two mirrored trackers",
        paragraphs: [
          "Bull and bear ISS trackers run independently. After a bearish CHOCH the bullish tracker starts; after a bullish CHOCH the bearish tracker starts. A BOS starts the opposite tracker and clears the other.",
          "Each tracker keeps a base extreme, a running extreme, an ISS1 level, an ISS2 level, and post-break high/low runs.",
        ],
      },
      {
        heading: "The default path",
        paragraphs: [
          "In scenario 1, state 1 waits for a shift after a running extreme that is older than the base bar. That sets ISS1 from the run extreme and ISS2 from the current extreme, and moves to state 2.",
          "A close through ISS1 moves to state 3. A later opposing shift moves to state 4. In state 4 the tracker either resets to state 1 if the post-break extreme undercuts ISS2 (bull case), or completes when price closes through the post-break high.",
        ],
      },
      {
        heading: "What completion creates",
        paragraphs: [
          "Bull completion draws ISS2 from the state-2 low (kind 34), ISS3 from the post-break high (kind 30), and ISS4 from the post-break low (kind 31). ISS1 (kind 29) is hidden by default because its input defaults to off.",
          "Bear completion mirrors it: ISS2 high-type (35), ISS3 low-type (32), ISS4 high-type (33). Completion also resets trend, phase, CH/CL and TJL snapshots.",
        ],
      },
      {
        heading: "Scenario 2",
        paragraphs: [
          "Scenario 2 confirms the base with a shift before tracking a run, and its state-3 path updates post-break runs differently. The game implements both and lets you switch in Chart Lab; all scored content uses scenario 1, the source default.",
        ],
      },
    ],
    keyPoints: [
      "ISS1 comes from the state-1 run extreme.",
      "ISS3 is the break extreme; ISS4 is the post-break pullback.",
      "ISS1 is hidden by default.",
      "Scenario 1 is the source default and the scored path.",
    ],
  },
  {
    id: "LSN-EMA-MTF",
    title: "EMA 132 and the MTF dashboard",
    topicId: "ema",
    minutes: 5,
    summary: "The plotted average and the thirteen-row trend dashboard, including the smoothing layer and its source defaults.",
    ruleIds: ["STR-011", "STR-012", "STR-024"],
    sections: [
      {
        heading: "The plotted EMA",
        paragraphs: [
          "EMA length defaults to 132 and source defaults to close. The plot is ta.ema(close, 132). Smoothing defaults to None; optional modes apply SMA, SMA plus Bollinger Bands, EMA, SMMA (RMA), WMA or VWMA to the EMA output, not to raw close.",
          "Smoothing length defaults to 14 and Bollinger StdDev to 2.0. The bands are built from the smoothed EMA output.",
        ],
      },
      {
        heading: "Dashboard rows",
        paragraphs: [
          "Each of thirteen timeframe rows is classified against that timeframe's own EMA(close, 132): close above is bullish, below is bearish, equal is neutral. Default labels run from 1m through 1M.",
          "Data is requested with lookahead_off. The dashboard renders only on the chart's last bar, and the live row can still update until its timeframe closes.",
        ],
      },
      {
        heading: "What the game simulates",
        paragraphs: [
          "The dashboard widget here uses synthetic per-timeframe close series so it can run offline. It is clearly labelled as a simulation. It is not resampled historical data and not a live dashboard.",
        ],
      },
    ],
    keyPoints: [
      "EMA length 132 on close by default.",
      "Smoothing applies to the EMA output.",
      "Bullish row = close > EMA; neutral = equal.",
      "lookahead_off, not future data.",
    ],
  },
  {
    id: "LSN-ANALYZER",
    title: "The level accuracy analyzer",
    topicId: "accuracy",
    minutes: 7,
    summary:
      "How the indicator scores a level, including its ambiguous both-hit heuristic and its ranking threshold.",
    ruleIds: ["STR-015", "STR-016", "STR-025", "MEC-005"],
    sections: [
      {
        heading: "Starting a test",
        paragraphs: [
          "The analyzer is off by default. When enabled, a level's first tap after its birth starts a test and increments its test count. Target and loss are set from that tap bar.",
          "For a bullish level: target = close + targetPips × pipSize, loss = low − lossPips × pipSize. For bearish, target = close − move and loss = high + move. Defaults are 150 and 50 pips.",
        ],
      },
      {
        heading: "Resolving a bar",
        paragraphs: [
          "A bullish test wins if the bar's high reaches the target and loses if the low reaches the loss. Bearish is mirrored. Only one resolution is recorded per level, and unresolved bars leave the test open.",
          "Pip size Auto is mintick × 10 on forex and mintick otherwise. Custom uses the entered pip size.",
        ],
      },
      {
        heading: "When both are hit",
        paragraphs: [
          "If both target and loss are touched on one bar, the source compares |open − high| with |open − low| and assumes the nearer extreme printed first. That is a heuristic for otherwise unknowable intrabar order, not lower-timeframe evidence.",
        ],
      },
      {
        heading: "Ranking",
        paragraphs: [
          "Accuracy = wins ÷ (wins + losses), shown as a percentage. A level type only becomes eligible to be highlighted as best after at least 3 finished tests by default. Ties keep the earlier slot because the comparison is strictly greater.",
          "This is the indicator's own descriptive statistic. The game does not present it as a profitability claim, and the small-sample caveat applies.",
        ],
      },
    ],
    keyPoints: [
      "First tap after birth starts the test.",
      "Target/loss come from the tap bar.",
      "Both-hit is a heuristic, not proof of order.",
      "Ranking needs 3 finished tests by default.",
    ],
  },
];

/* ------------------------------------------------------------------ */
/* Questions                                                           */
/* ------------------------------------------------------------------ */

const highest = demoSeries.reduce((best, candle) => (candle.high > best.high ? candle : best), demoSeries[0]!);
const longestUpper = demoSeries.reduce(
  (best, candle) =>
    candle.high - Math.max(candle.open, candle.close) > best.high - Math.max(best.open, best.close) ? candle : best,
  demoSeries[0]!,
);
const longestLower = demoSeries.reduce(
  (best, candle) =>
    Math.min(candle.open, candle.close) - candle.low > Math.min(best.open, best.close) - best.low ? candle : best,
  demoSeries[0]!,
);

const bosFrame = ENGINE_19.frame(45);
const bosTjl1 = bosFrame.levels.find((level) => level.kind === 1)!;
const bosTjl2 = bosFrame.levels.find((level) => level.kind === 2)!;

const chochBefore = ENGINE_31.frame(33);
const qmlFrame = ENGINE_45.frame(55);
const qmlLevel = qmlFrame.levels.find((level) => level.kind === 7)!;

const issFrame = ENGINE_34.frame(44);
const iss4 = issFrame.levels.find((level) => level.kind === 33)!;

const zoneHighOptions = placeCorrect("top 110.00 / bottom 105.94", ["top 110.00 / bottom 106.00", "top 105.94 / bottom 100.00", "top 106.00 / bottom 90.00"], "zone-high");
const zoneLowOptions = placeCorrect("top 100.06 / bottom 90.00", ["top 100.00 / bottom 90.00", "top 110.00 / bottom 100.06", "top 90.00 / bottom 100.06"], "zone-low");
const lossOptions = placeCorrect("1.0930", ["1.1150", "1.1180", "1.0950"], "analyzer-loss");
const qmlTopOptions = placeCorrect(p(qmlLevel.top), [p(qmlLevel.bot), "101.63", "96.52"], "qml-top");
const tjl1SourceOptions = barChoice(bosTjl1.sourceBar, 46, "tjl1-source");
const tjl2TopOptions = placeCorrect(p(bosTjl2.top), [p(bosTjl2.bot), "101.14", "96.52"], "tjl2-top");
const iss4SourceOptions = barChoice(iss4.sourceBar, 45, "iss4-source");

export const QUESTIONS: Question[] = [
  {
    id: "Q-MEC-01",
    type: "single-choice",
    topicId: "chart-basics",
    ruleIds: ["MEC-003"],
    prompt: "A candle opens at 100.20, high 101.40, low 99.80, close 100.90. What is the upper wick?",
    options: [
      { id: "a", label: "0.50" },
      { id: "b", label: "1.20" },
      { id: "c", label: "0.90" },
      { id: "d", label: "1.60" },
    ],
    answerId: "a",
    explanation: "Upper wick = high − max(open, close) = 101.40 − 100.90 = 0.50. The 1.20 figure is the full high-to-low range.",
  },
  {
    id: "Q-MEC-02",
    type: "true-false",
    topicId: "chart-basics",
    ruleIds: ["MEC-006"],
    prompt: "If a bar's high is 102 and its low is 99, the bar's range is 3.",
    options: [
      { id: "true", label: "True" },
      { id: "false", label: "False" },
    ],
    answerId: "true",
    explanation: "Range = high − low = 102 − 99 = 3.",
  },
  {
    id: "Q-MEC-03",
    type: "single-choice",
    topicId: "chart-basics",
    ruleIds: ["MEC-002"],
    prompt: "A bar opens at 50.00 and closes at 47.00. How is it described?",
    options: [
      { id: "bull", label: "Bullish" },
      { id: "bear", label: "Bearish" },
      { id: "doji", label: "Neither — it is a doji" },
      { id: "unknown", label: "Cannot be determined without the high and low" },
    ],
    answerId: "bear",
    explanation: "Close is below open, so the bar is bearish. High and low change the wicks but not the direction of the body.",
  },
  {
    id: "Q-MEC-04",
    type: "chart-identify",
    topicId: "chart-basics",
    ruleIds: ["MEC-001"],
    prompt: "Which bar in this window printed the highest high?",
    options: barChoice(highest.index, demoSeries.length, "mec-highest").options,
    answerId: barChoice(highest.index, demoSeries.length, "mec-highest").answerId,
    explanation: `Bar ${String(highest.index).padStart(2, "0")} reached ${formatPrice(highest.high)}, the highest high in the window.`,
    chart: { candles: demoSeries, caption: "Synthetic window — 28 generated bars. Not historical data." },
  },
  {
    id: "Q-MEC-05",
    type: "chart-identify",
    topicId: "chart-basics",
    ruleIds: ["MEC-003"],
    prompt: "Which bar in this window has the longest upper wick?",
    options: barChoice(longestUpper.index, demoSeries.length, "mec-upper").options,
    answerId: barChoice(longestUpper.index, demoSeries.length, "mec-upper").answerId,
    explanation: `Bar ${String(longestUpper.index).padStart(2, "0")} has the longest upper wick: high ${formatPrice(longestUpper.high)} minus max(open, close) ${formatPrice(Math.max(longestUpper.open, longestUpper.close))}.`,
    chart: { candles: demoSeries, caption: "Synthetic window — 28 generated bars. Not historical data." },
  },
  {
    id: "Q-MEC-06",
    type: "chart-identify",
    topicId: "chart-basics",
    ruleIds: ["MEC-003", "MEC-006"],
    prompt: "Which bar has the longest lower wick?",
    options: barChoice(longestLower.index, demoSeries.length, "mec-lower").options,
    answerId: barChoice(longestLower.index, demoSeries.length, "mec-lower").answerId,
    explanation: `Bar ${String(longestLower.index).padStart(2, "0")} has the deepest lower wick below its body.`,
    chart: { candles: demoSeries, caption: "Synthetic window — 28 generated bars. Not historical data." },
  },
  {
    id: "Q-MEC-07",
    type: "single-choice",
    topicId: "chart-basics",
    ruleIds: ["MEC-004"],
    prompt:
      "Price trades up to resistance at 1.1050, prints a high of 1.1053, then closes at 1.1042. Which description is accurate?",
    options: [
      { id: "close", label: "Price closed through resistance" },
      { id: "wick", label: "Price wicked above resistance but did not close above it" },
      { id: "never", label: "Price never reached resistance" },
      { id: "ambiguous", label: "The bar is bullish, so it must have closed above resistance" },
    ],
    answerId: "wick",
    explanation: "The high exceeded 1.1050, so the level was touched. The close at 1.1042 finished back below it, so this is a wick test, not a close-through.",
  },
  {
    id: "Q-MEC-08",
    type: "true-false",
    topicId: "chart-basics",
    ruleIds: ["MEC-004"],
    prompt: "A close at 1.1042 against resistance at 1.1050 counts as a close-through of that resistance.",
    options: [
      { id: "true", label: "True" },
      { id: "false", label: "False" },
    ],
    answerId: "false",
    explanation: "1.1042 is below 1.1050, so the close stayed on the original side of the level.",
  },
  {
    id: "Q-MEC-09",
    type: "single-choice",
    topicId: "chart-basics",
    ruleIds: ["MEC-005"],
    prompt:
      "A daily candle has a low of 98 and a high of 106. What can you say about whether the low or the high happened first?",
    options: [
      { id: "low", label: "The low came first because the close is bullish" },
      { id: "high", label: "The high came first because the candle has an upper wick" },
      { id: "unknown", label: "The order cannot be known from daily OHLC alone" },
      { id: "equal", label: "They printed at the same time" },
    ],
    answerId: "unknown",
    explanation: "A single OHLC bar records four prices, not a sequence. Establishing intrabar order needs lower-timeframe or tick data.",
  },
  {
    id: "Q-MEC-10",
    type: "true-false",
    topicId: "chart-basics",
    ruleIds: ["MEC-005"],
    prompt: "On a single daily candle you can always tell whether the high or the low printed first.",
    options: [
      { id: "true", label: "True" },
      { id: "false", label: "False" },
    ],
    answerId: "false",
    explanation: "Daily OHLC does not encode intrabar sequence.",
  },
  {
    id: "Q-LOOK-01",
    type: "violation",
    topicId: "lookahead",
    ruleIds: ["MEC-007"],
    prompt: "You are working at bar 5 of a 40-bar replay. Which action uses information you could not have had at bar 5?",
    options: [
      { id: "a", label: "Comparing bar 5's close with bar 4's close" },
      { id: "b", label: "Noting the highest high among bars 0–5" },
      { id: "c", label: "Labeling the highest high of all 40 bars as 'the' swing high" },
      { id: "d", label: "Measuring bar 5's upper wick" },
    ],
    answerId: "c",
    explanation: "At bar 5, bars 6–39 have not happened yet. Choosing the highest high across the full 40-bar set uses future information. The other options only use bars up to 5.",
  },
  {
    id: "Q-LOOK-02",
    type: "single-choice",
    topicId: "lookahead",
    ruleIds: ["MEC-008"],
    prompt: "What is the honest description of a swing high that sits on the newest bar of a live chart?",
    options: [
      { id: "confirmed", label: "Confirmed, because it is the highest point visible" },
      { id: "provisional", label: "Provisional, because no later bars exist to confirm it" },
      { id: "invalid", label: "Invalid, because swing highs need at least 50 bars" },
      { id: "future", label: "Certain, because price always reverses at swing highs" },
    ],
    answerId: "provisional",
    explanation: "Confirmation requires later bars to fail to exceed the point. At the right edge that evidence does not exist yet, so the label is provisional.",
  },
  {
    id: "Q-SIM-01",
    type: "true-false",
    topicId: "simulation-honesty",
    ruleIds: ["MEC-009"],
    prompt: "Synthetic candles may be described as real historical prices if they look realistic.",
    options: [
      { id: "true", label: "True" },
      { id: "false", label: "False" },
    ],
    answerId: "false",
    explanation: "Realism is not provenance. Generated data must stay labelled synthetic wherever it appears.",
  },
  {
    id: "Q-SIM-02",
    type: "single-choice",
    topicId: "simulation-honesty",
    ruleIds: ["MEC-010"],
    prompt: "Which question is safe to score?",
    options: [
      { id: "a", label: "Which of these two valid interpretations feels more likely?" },
      { id: "b", label: "Which bar has the highest high in the visible window?" },
      { id: "c", label: "Will price reverse at this level next week?" },
      { id: "d", label: "Which entry would have made the most profit?" },
    ],
    answerId: "b",
    explanation: "The highest high is fixed by the visible data and can be checked by anyone. The other options depend on opinion, prediction, or hindsight profitability.",
  },

  {
    id: "Q-STR-01",
    type: "single-choice",
    topicId: "swing-structure",
    ruleIds: ["STR-020"],
    prompt: "Which condition defines a bearish ISS shift in the source?",
    options: placeCorrect(
      "Previous bar red, current bar red, and current close below the previous low",
      [
        "Any two red candles, regardless of their closes",
        "Current close below the 132 EMA",
        "Current low below the previous low, regardless of candle colour",
      ],
      "str-01",
    ).options,
    answerId: placeCorrect(
      "Previous bar red, current bar red, and current close below the previous low",
      [
        "Any two red candles, regardless of their closes",
        "Current close below the 132 EMA",
        "Current low below the previous low, regardless of candle colour",
      ],
      "str-01",
    ).answerId,
    explanation: "script.txt:1401-1410. Both bars must be red and the second close must be below the first bar's low. A low below the previous low without the two red closes is not enough.",
  },
  {
    id: "Q-STR-02",
    type: "single-choice",
    topicId: "swing-structure",
    ruleIds: ["STR-026", "STR-001"],
    prompt: "At the earliest, which bar can supply the first CH snapshot?",
    options: placeCorrect("Bar 2", ["Bar 0", "Bar 1", "Bar 3"], "str-02").options,
    answerId: placeCorrect("Bar 2", ["Bar 0", "Bar 1", "Bar 3"], "str-02").answerId,
    explanation: "The structure block only runs when bar_index >= 2, and run extremes start tracking there. Bars 0 and 1 are not evaluated, so the first CH/CL cannot come from them.",
  },
  {
    id: "Q-STR-03",
    type: "single-choice",
    topicId: "bos-choch",
    ruleIds: ["STR-002"],
    prompt: "Which set is sufficient for a bullish BOS?",
    options: placeCorrect(
      "Trend = 1, phase = 2, and close > lastCH",
      [
        "Trend = 1, phase = 1, and close > lastCH",
        "Trend = 1, phase = 2, and high > lastCH",
        "Trend = 0, phase = 2, and close > lastCH",
      ],
      "str-03",
    ).options,
    answerId: placeCorrect(
      "Trend = 1, phase = 2, and close > lastCH",
      [
        "Trend = 1, phase = 1, and close > lastCH",
        "Trend = 1, phase = 2, and high > lastCH",
        "Trend = 0, phase = 2, and close > lastCH",
      ],
      "str-03",
    ).answerId,
    explanation: "A BOS needs the retracement phase and a close beyond the recorded level. A wick or a phase-1 break does not qualify.",
  },
  {
    id: "Q-STR-04",
    type: "single-choice",
    topicId: "bos-choch",
    ruleIds: ["STR-003"],
    prompt: "Which condition is required for a bearish CHOCH?",
    options: placeCorrect(
      "Previous bar red, and both previous and current closes below lastCL",
      [
        "Current high above lastCL and current close below it",
        "Current bar red and current close below lastCL",
        "Two red bars with the second close below the previous low, regardless of lastCL",
      ],
      "str-04",
    ).options,
    answerId: placeCorrect(
      "Previous bar red, and both previous and current closes below lastCL",
      [
        "Current high above lastCL and current close below it",
        "Current bar red and current close below lastCL",
        "Two red bars with the second close below the previous low, regardless of lastCL",
      ],
      "str-04",
    ).answerId,
    explanation: "The source checks redP plus close[1] < lastCL and close < lastCL. That is a two-close condition, not just a wick or a single red bar.",
  },
  {
    id: "Q-STR-05",
    type: "single-choice",
    topicId: "bos-choch",
    ruleIds: ["STR-021"],
    prompt: "What makes a CHOCH 'dual'?",
    options: placeCorrect(
      "The previous CHOCH was opposite, and no ISS or TJL event has happened since",
      [
        "Two CHOCH events occur on the same bar",
        "The CHOCH happens in phase 1",
        "The CHOCH is confirmed by a wick instead of a close",
      ],
      "str-05",
    ).options,
    answerId: placeCorrect(
      "The previous CHOCH was opposite, and no ISS or TJL event has happened since",
      [
        "Two CHOCH events occur on the same bar",
        "The CHOCH happens in phase 1",
        "The CHOCH is confirmed by a wick instead of a close",
      ],
      "str-05",
    ).answerId,
    explanation: "Dual uses lastChochSide plus the issOrTjlSinceChoch flag. It is about the sequence, not two events on one bar.",
  },
  {
    id: "Q-STR-06",
    type: "single-choice",
    topicId: "tjl-qml",
    ruleIds: ["STR-005"],
    prompt: "On a bullish BOS, which snapshot supplies TJL1?",
    options: placeCorrect("The most recent CH snapshot", ["The most recent CL snapshot", "The BOS bar's open", "The QML bar"], "str-06").options,
    answerId: placeCorrect("The most recent CH snapshot", ["The most recent CL snapshot", "The BOS bar's open", "The QML bar"], "str-06").answerId,
    explanation: "Bullish BOS: TJL1 = lastCH, TJL2 = refreshed lastCL. Bearish BOS reverses the pairing.",
  },
  {
    id: "Q-STR-07",
    type: "single-choice",
    topicId: "tjl-qml",
    ruleIds: ["STR-019"],
    prompt: "A bullish BOS creates BUY TJL2 from a low-type CL zone. What stored direction does that level get?",
    options: placeCorrect("−1", ["+1", "0", "It depends on the colour of the BOS bar"], "str-07").options,
    answerId: placeCorrect("−1", ["+1", "0", "It depends on the colour of the BOS bar"], "str-07").answerId,
    explanation: "For kind 2, f_levelDir returns isHigh ? 1 : -1. A low-type TJL2 gets -1 even though its display text says BUY TJL2.",
  },
  {
    id: "Q-STR-08",
    type: "single-choice",
    topicId: "tjl-qml",
    ruleIds: ["STR-006"],
    prompt: "On a non-dual CHOCH, which snapshot supplies the QML zone?",
    options: placeCorrect("The TJL1 snapshot", ["The CHOCH bar", "The runLow bar", "The ISS2 bar"], "str-08").options,
    answerId: placeCorrect("The TJL1 snapshot", ["The CHOCH bar", "The runLow bar", "The ISS2 bar"], "str-08").answerId,
    explanation: "The source deletes TJL1 and builds QML from that same TJL1 snapshot's bar. QML does not use the CHOCH bar.",
  },
  {
    id: "Q-STR-09",
    type: "single-choice",
    topicId: "bos-choch",
    ruleIds: ["STR-027"],
    prompt: "A high-type SELL QML is promoted to a kind-8 best level. What text does the source give it?",
    options: placeCorrect("D-CHOCH BUY QML", ["D-CHOCH SELL QML", "D-CHOCH SBR", "D-CHOCH DT"], "str-09").options,
    answerId: placeCorrect("D-CHOCH BUY QML", ["D-CHOCH SELL QML", "D-CHOCH SBR", "D-CHOCH DT"], "str-09").answerId,
    explanation: "The high-type QML has dir -1, and f_bestLevelText maps dir -1 to D-CHOCH BUY QML. It is a genuine label swap in the source, reproduced by the engine.",
  },
  {
    id: "Q-STR-33",
    type: "single-choice",
    topicId: "bos-choch",
    ruleIds: ["STR-022"],
    prompt: "When a QML is promoted to a best level, which colour input does the source use?",
    options: placeCorrect("Best QML Color", ["QML Color", "DT/DB Color", "ISS Color"], "str-33").options,
    answerId: placeCorrect("Best QML Color", ["QML Color", "DT/DB Color", "ISS Color"], "str-33").answerId,
    explanation: "f_bestLevelColor checks the original kind: only a kind-7 QML changes to inpBestQMLColor. Other promoted kinds keep their source colour.",
  },
  {
    id: "Q-STR-10",
    type: "single-choice",
    topicId: "sbr-rbs-dt-db",
    ruleIds: ["STR-007"],
    prompt: "Which level is built from the last CL bar as a low-type zone on a bearish CHOCH?",
    options: placeCorrect("SBR", ["RBS", "DT", "QML"], "str-10").options,
    answerId: placeCorrect("SBR", ["RBS", "DT", "QML"], "str-10").answerId,
    explanation: "SBR is kind 3, built from lastCL with isHigh=false. RBS is the bullish mirror from lastCH.",
  },
  {
    id: "Q-STR-11",
    type: "single-choice",
    topicId: "sbr-rbs-dt-db",
    ruleIds: ["STR-008"],
    prompt: "When does the source skip creating a DT level on a bearish CHOCH?",
    options: placeCorrect(
      "When the runHigh bar is the same bar as the TJL1 snapshot",
      ["When the runHigh is above the CHOCH close", "When SBR is already active", "When phase is 2"],
      "str-11",
    ).options,
    answerId: placeCorrect(
      "When the runHigh bar is the same bar as the TJL1 snapshot",
      ["When the runHigh is above the CHOCH close", "When SBR is already active", "When phase is 2"],
      "str-11",
    ).answerId,
    explanation: "The guard is `runHigh.bar != tjl1.bar`. It suppresses a duplicate zone when the same source bar is already represented.",
  },
  {
    id: "Q-STR-12",
    type: "single-choice",
    topicId: "bos-choch",
    ruleIds: ["STR-017"],
    prompt: "Which level survives the 'Show Only A+ Levels' filter?",
    options: placeCorrect("ISS4 (kind 31 or 33)", ["D-CHOCH SBR", "ISS3 (kind 30 or 32)", "D-CHOCH DT"], "str-12").options,
    answerId: placeCorrect("ISS4 (kind 31 or 33)", ["D-CHOCH SBR", "ISS3 (kind 30 or 32)", "D-CHOCH DT"], "str-12").answerId,
    explanation: "The A+ set is kinds 2, 7, 31, 33, plus kind-8 levels whose text contains QML. ISS4 is kinds 31/33; ISS3 and non-QML D-CHOCH zones are filtered out.",
  },
  {
    id: "Q-STR-13",
    type: "single-choice",
    topicId: "bos-choch",
    ruleIds: ["STR-017", "STR-009"],
    prompt: "A D-CHOCH SBR has kind 8. Why is it removed by the A+ filter?",
    options: placeCorrect(
      "Kind 8 only survives if its text contains 'QML'",
      ["Kind 8 is always removed", "SBR is not a valid level type", "It has direction 0"],
      "str-13",
    ).options,
    answerId: placeCorrect(
      "Kind 8 only survives if its text contains 'QML'",
      ["Kind 8 is always removed", "SBR is not a valid level type", "It has direction 0"],
      "str-13",
    ).answerId,
    explanation: "The A+ rule for kind 8 is `str.contains(txt, \"QML\")`. D-CHOCH SBR/RBS/DT/DB do not contain QML, so the filter drops them.",
  },
  {
    id: "Q-STR-14",
    type: "single-choice",
    topicId: "levels",
    ruleIds: ["STR-013"],
    prompt: "Bar: open 100, high 110, low 90, close 106. Zone Body % = 1.0. What is the high-type zone?",
    options: zoneHighOptions.options,
    answerId: zoneHighOptions.answerId,
    explanation: "bodyTop = 106, pad = 6 × 1.0 × 0.01 = 0.06. High-type: top = high = 110, bottom = 106 − 0.06 = 105.94.",
  },
  {
    id: "Q-STR-15",
    type: "single-choice",
    topicId: "levels",
    ruleIds: ["STR-013"],
    prompt: "Same bar: open 100, high 110, low 90, close 106, Zone Body % = 1.0. What is the low-type zone?",
    options: zoneLowOptions.options,
    answerId: zoneLowOptions.answerId,
    explanation: "bodyBot = 100, pad = 0.06. Low-type: top = 100.06, bottom = low = 90.",
  },
  {
    id: "Q-STR-16",
    type: "single-choice",
    topicId: "levels",
    ruleIds: ["STR-013"],
    prompt: "How is the zone pad calculated?",
    options: placeCorrect(
      "Body size × Zone Body % × 0.01",
      ["Bar range × Zone Body %", "Body size × Zone Body %", "High − low, divided by 100"],
      "str-16",
    ).options,
    answerId: placeCorrect(
      "Body size × Zone Body % × 0.01",
      ["Bar range × Zone Body %", "Body size × Zone Body %", "High − low, divided by 100"],
      "str-16",
    ).answerId,
    explanation: "The source multiplies the body size by the percentage and then by 0.01. A 6-point body at 1.0% gives a 0.06 pad, not 6.",
  },
  {
    id: "Q-STR-17",
    type: "single-choice",
    topicId: "levels",
    ruleIds: ["STR-014"],
    prompt: "In the default wick mode, which condition counts as a tap of a zone with top 105 and bottom 101?",
    options: placeCorrect(
      "High ≥ 101 and low ≤ 105",
      ["Close is between 101 and 105", "High ≥ 105 and low ≤ 101", "High > 105 and close > 105"],
      "str-17",
    ).options,
    answerId: placeCorrect(
      "High ≥ 101 and low ≤ 105",
      ["Close is between 101 and 105", "High ≥ 105 and low ≤ 101", "High > 105 and close > 105"],
      "str-17",
    ).answerId,
    explanation: "The source checks high >= bot and low <= top. It only requires overlap with the zone, not a full traversal.",
  },
  {
    id: "Q-STR-18",
    type: "single-choice",
    topicId: "levels",
    ruleIds: ["STR-014"],
    prompt: "Which condition counts as a tap in close mode?",
    options: placeCorrect(
      "Close ≤ top and close ≥ bottom",
      ["High ≥ bottom and low ≤ top", "Close > top", "Close < bottom"],
      "str-18",
    ).options,
    answerId: placeCorrect(
      "Close ≤ top and close ≥ bottom",
      ["High ≥ bottom and low ≤ top", "Close > top", "Close < bottom"],
      "str-18",
    ).answerId,
    explanation: "TapByClose checks `close <= top and close >= bot`. A wick through the zone does not count in this mode.",
  },
  {
    id: "Q-STR-19",
    type: "true-false",
    topicId: "levels",
    ruleIds: ["STR-013"],
    prompt: "A level can be stopped by a tap on the same bar that created it.",
    options: [
      { id: "true", label: "True" },
      { id: "false", label: "False" },
    ],
    answerId: "false",
    explanation: "The tap check requires barNum > bornBar. On the birth bar, the condition is false.",
  },
  {
    id: "Q-STR-20",
    type: "single-choice",
    topicId: "iss",
    ruleIds: ["STR-018"],
    prompt: "How are ISS level kinds 30–35 stopped by default?",
    options: placeCorrect(
      "First a close beyond the zone, then a later bar that overlaps it",
      ["Any wick overlap on any later bar", "A close beyond the zone on the same bar", "They never stop"],
      "str-20",
    ).options,
    answerId: placeCorrect(
      "First a close beyond the zone, then a later bar that overlaps it",
      ["Any wick overlap on any later bar", "A close beyond the zone on the same bar", "They never stop"],
      "str-20",
    ).answerId,
    explanation: "The ISS branch arms stopReady with a close beyond the zone, then only a later bar's wick overlap stops it. This is different from the generic stop-on-tap rule.",
  },
  {
    id: "Q-STR-21",
    type: "single-choice",
    topicId: "accuracy",
    ruleIds: ["STR-015"],
    prompt: "Why can ISS1 never appear in the accuracy analyzer table?",
    options: placeCorrect(
      "Its direction is 0, and the analyzer skips levels with dir 0",
      ["It is always hidden by the A+ filter", "It has no price zone", "The analyzer only accepts TJL levels"],
      "str-21",
    ).options,
    answerId: placeCorrect(
      "Its direction is 0, and the analyzer skips levels with dir 0",
      ["It is always hidden by the A+ filter", "It has no price zone", "The analyzer only accepts TJL levels"],
      "str-21",
    ).answerId,
    explanation: "f_levelDir has no branch for kind 29, so it returns 0. The analyzer requires lv.dir != 0.",
  },
  {
    id: "Q-STR-22",
    type: "single-choice",
    topicId: "iss",
    ruleIds: ["STR-010"],
    prompt: "Which ISS level is NOT drawn by default because its display input defaults to false?",
    options: placeCorrect("ISS1", ["ISS2", "ISS3", "ISS4"], "str-22").options,
    answerId: placeCorrect("ISS1", ["ISS2", "ISS3", "ISS4"], "str-22").answerId,
    explanation: "`inpShowISS1` defaults to false. ISS2/3/4 default to true. The tracker still computes ISS1 internally.",
  },
  {
    id: "Q-STR-23",
    type: "single-choice",
    topicId: "ema",
    ruleIds: ["STR-011"],
    prompt: "What are the default EMA length and source?",
    options: placeCorrect("132 on close", ["200 on close", "132 on hl2", "50 on open"], "str-23").options,
    answerId: placeCorrect("132 on close", ["200 on close", "132 on hl2", "50 on open"], "str-23").answerId,
    explanation: "The source defaults emaLen to 132 and emaSrc to close.",
  },
  {
    id: "Q-STR-24",
    type: "single-choice",
    topicId: "ema",
    ruleIds: ["STR-011"],
    prompt: "When a smoothing mode other than None is selected, what does the source smooth?",
    options: placeCorrect("The EMA output", ["Raw close", "The high/low midpoint", "The dashboard rows"], "str-24").options,
    answerId: placeCorrect("The EMA output", ["Raw close", "The high/low midpoint", "The dashboard rows"], "str-24").answerId,
    explanation: "The EMA is computed first, then the selected MA/BB layer is applied to that EMA output.",
  },
  {
    id: "Q-STR-25",
    type: "single-choice",
    topicId: "mtf",
    ruleIds: ["STR-012"],
    prompt: "A dashboard row's timeframe close is exactly equal to its EMA(close, 132). How is the row classified?",
    options: placeCorrect("Neutral", ["Bullish", "Bearish", "The row is omitted"], "str-25").options,
    answerId: placeCorrect("Neutral", ["Bullish", "Bearish", "The row is omitted"], "str-25").answerId,
    explanation: "The source returns 1 above, -1 below, and 0 when equal. Zero renders as neutral.",
  },
  {
    id: "Q-STR-26",
    type: "single-choice",
    topicId: "mtf",
    ruleIds: ["STR-024"],
    prompt: "Which lookahead setting does the source use for dashboard/alerts security requests?",
    options: placeCorrect("barmerge.lookahead_off", ["barmerge.lookahead_on", "lookahead default", "No security request is used"], "str-26").options,
    answerId: placeCorrect("barmerge.lookahead_off", ["barmerge.lookahead_on", "lookahead default", "No security request is used"], "str-26").answerId,
    explanation: "The source explicitly passes lookahead_off. That avoids borrowing future higher-timeframe values on historical bars.",
  },
  {
    id: "Q-STR-27",
    type: "single-choice",
    topicId: "accuracy",
    ruleIds: ["STR-015"],
    prompt:
      "Bullish test: tap bar close 1.1000, low 1.0980. Target 150 pips, loss 50 pips, auto pip size 0.0001. What is the loss price?",
    options: lossOptions.options,
    answerId: lossOptions.answerId,
    explanation: "Bullish loss = low − lossPips × pip = 1.0980 − 50 × 0.0001 = 1.0930. The target would be 1.1000 + 0.0150 = 1.1150.",
  },
  {
    id: "Q-STR-28",
    type: "single-choice",
    topicId: "accuracy",
    ruleIds: ["STR-016"],
    prompt:
      "A bullish test's target and loss are both touched on one bar. Open 100, high 110, low 95. Using the source heuristic, what is recorded?",
    options: placeCorrect(
      "A loss, because the low is closer to the open",
      ["A win, because the high is farther from the open", "Unresolved, because the order is ambiguous", "A win, because the bar closed green"],
      "str-28",
    ).options,
    answerId: placeCorrect(
      "A loss, because the low is closer to the open",
      ["A win, because the high is farther from the open", "Unresolved, because the order is ambiguous", "A win, because the bar closed green"],
      "str-28",
    ).answerId,
    explanation: "|100 − 110| = 10 and |100 − 95| = 5, so the low is assumed to have printed first. For a bullish test that is the loss. The true order remains unknown.",
  },
  {
    id: "Q-STR-29",
    type: "single-choice",
    topicId: "accuracy",
    ruleIds: ["STR-015"],
    prompt: "A level type has 7 wins and 3 losses. What accuracy does the source display?",
    options: placeCorrect("70%", ["7%", "30%", "77.78%"], "str-29").options,
    answerId: placeCorrect("70%", ["7%", "30%", "77.78%"], "str-29").answerId,
    explanation: "7 ÷ (7 + 3) = 0.70, displayed as 70%.",
  },
  {
    id: "Q-STR-30",
    type: "single-choice",
    topicId: "accuracy",
    ruleIds: ["STR-025"],
    prompt: "With the default minimum of 3 finished tests, can a level type with 2 wins and 0 losses be highlighted as best?",
    options: placeCorrect("No, it has fewer than 3 finished tests", ["Yes, because it has a 100% rate", "Yes, if every other type has a worse rate", "No, because ties are not allowed"], "str-30").options,
    answerId: placeCorrect("No, it has fewer than 3 finished tests", ["Yes, because it has a 100% rate", "Yes, if every other type has a worse rate", "No, because ties are not allowed"], "str-30").answerId,
    explanation: "The ranking loop skips slots whose finished tests are below inpAnalyzerMinDone (default 3), regardless of rate.",
  },
  {
    id: "Q-STR-31",
    type: "single-choice",
    topicId: "levels",
    ruleIds: ["STR-023"],
    prompt: "What is the default maximum number of live levels?",
    options: placeCorrect("140", ["100", "180", "500"], "str-31").options,
    answerId: placeCorrect("140", ["100", "180", "500"], "str-31").answerId,
    explanation: "`inpMaxLiveLevels` defaults to 140. Label and line pools separately default to 180; boxes permit 500.",
  },
  {
    id: "Q-STR-32",
    type: "single-choice",
    topicId: "levels",
    ruleIds: ["STR-026"],
    prompt: "Which bar is the first one processed by the main structure logic?",
    options: placeCorrect("Bar 2", ["Bar 0", "Bar 1", "Bar 3"], "str-32").options,
    answerId: placeCorrect("Bar 2", ["Bar 0", "Bar 1", "Bar 3"], "str-32").answerId,
    explanation: "The guard is bar_index >= 2, because the logic reads values from one and two bars back.",
  },

  {
    id: "Q-ENG-BOS",
    type: "chart-identify",
    topicId: "bos-choch",
    ruleIds: ["STR-002"],
    prompt: "This synthetic snapshot ends at bar 45. Which structure event is confirmed on the newest bar?",
    options: placeCorrect(
      "A bullish BOS",
      ["A bearish BOS", "A bullish CHOCH", "A bearish CHOCH"],
      "eng-bos",
    ).options,
    answerId: placeCorrect("A bullish BOS", ["A bearish BOS", "A bullish CHOCH", "A bearish CHOCH"], "eng-bos").answerId,
    explanation: "Before bar 45 the engine is in trend 1, phase 2 with lastCH at 101.14 (bar 4). Bar 45 closes at 101.35, above lastCH, so a bullish BOS is confirmed. A CHOCH would require an opposite trend and two closes beyond the other reference.",
    chart: { candles: SERIES_19.slice(0, 46), caption: chartCaption(19, 45) },
  },
  {
    id: "Q-ENG-TJL1",
    type: "chart-identify",
    topicId: "tjl-qml",
    ruleIds: ["STR-005"],
    prompt: "After the bullish BOS on bar 45, which bar supplies the BUY TJL1 zone?",
    options: tjl1SourceOptions.options,
    answerId: tjl1SourceOptions.answerId,
    explanation: `Bullish BOS sets TJL1 to the lastCH snapshot, which is ${barLabel(bosTjl1.sourceBar)} (high ${p(bosTjl1.top)}). It does not use the BOS bar itself.`,
    chart: { candles: SERIES_19.slice(0, 46), caption: chartCaption(19, 45) },
  },
  {
    id: "Q-ENG-ZONE",
    type: "chart-identify",
    topicId: "levels",
    ruleIds: ["STR-013", "STR-005"],
    prompt: "What is the top of the BUY TJL2 zone created on bar 45? (Zone Body % = 1.0)",
    options: tjl2TopOptions.options,
    answerId: tjl2TopOptions.answerId,
    explanation: `BUY TJL2 is a low-type zone from ${barLabel(bosTjl2.sourceBar)}. bodyBot = 97.16, pad = 0.89 × 0.01 = 0.0089, so top = ${p(bosTjl2.top)} and bottom = ${p(bosTjl2.bot)}.`,
    chart: { candles: SERIES_19.slice(0, 46), caption: chartCaption(19, 45) },
  },
  {
    id: "Q-ENG-CHOCH",
    type: "chart-identify",
    topicId: "bos-choch",
    ruleIds: ["STR-003"],
    prompt: "This synthetic snapshot ends at bar 34. Which structure event is confirmed on the newest bar?",
    options: placeCorrect(
      "A bearish CHOCH",
      ["A bullish CHOCH", "A bullish BOS", "A bearish BOS"],
      "eng-choch",
    ).options,
    answerId: placeCorrect("A bearish CHOCH", ["A bullish CHOCH", "A bullish BOS", "A bearish BOS"], "eng-choch").answerId,
    explanation: `The trend was bullish, the previous bar was red, and both close[33] = ${p(SERIES_31[33]!.close)} and close[34] = ${p(SERIES_31[34]!.close)} sat below lastCL = ${p(chochBefore.lastCL?.price ?? 0)}. That is a bearish CHOCH. A BOS would need an existing bearish trend and a close through the opposite reference.`,
    chart: { candles: SERIES_31.slice(0, 35), caption: chartCaption(31, 34) },
  },
  {
    id: "Q-ENG-QML",
    type: "chart-identify",
    topicId: "tjl-qml",
    ruleIds: ["STR-006"],
    prompt: "This snapshot ends at bar 55, where a bearish CHOCH is confirmed. What is the top of the SELL QML zone?",
    options: qmlTopOptions.options,
    answerId: qmlTopOptions.answerId,
    explanation: `QML comes from the TJL1 snapshot at ${barLabel(qmlLevel.sourceBar)}, not the CHOCH bar. Its high-type zone top is that bar's high, ${p(qmlLevel.top)}.`,
    chart: { candles: SERIES_45.slice(0, 56), caption: chartCaption(45, 55) },
  },
  {
    id: "Q-ENG-ISS",
    type: "chart-identify",
    topicId: "iss",
    ruleIds: ["STR-010"],
    prompt: "This snapshot ends at bar 44. Which event completes on the newest bar?",
    options: placeCorrect(
      "A bearish ISS completion",
      ["A bullish ISS completion", "A bullish BOS", "A bullish CHOCH"],
      "eng-iss",
    ).options,
    answerId: placeCorrect("A bearish ISS completion", ["A bullish ISS completion", "A bullish BOS", "A bullish CHOCH"], "eng-iss").answerId,
    explanation: "The bearish ISS tracker reaches state 4 and the newest close is below its post-break low, so it completes and resets structure bearish. A BOS/CHOCH would be labelled separately and requires different phase/trend conditions.",
    chart: { candles: SERIES_34.slice(0, 45), caption: chartCaption(34, 44) },
  },
  {
    id: "Q-ENG-ISS4",
    type: "chart-identify",
    topicId: "iss",
    ruleIds: ["STR-010", "STR-018"],
    prompt: "At bar 44, which bar supplies the ISS 4 zone?",
    options: iss4SourceOptions.options,
    answerId: iss4SourceOptions.answerId,
    explanation: `Bearish ISS completion builds ISS4 as a high-type zone from the post-break high run, which is ${barLabel(iss4.sourceBar)}. ISS3 comes from the post-break low in the bearish tracker.`,
    chart: { candles: SERIES_34.slice(0, 45), caption: chartCaption(34, 44) },
  },
  {
    id: "Q-ENG-PHASE",
    type: "chart-identify",
    topicId: "swing-structure",
    ruleIds: ["STR-001", "STR-004"],
    prompt: "Immediately before the BOS (at bar 44), what were the trend and phase?",
    options: placeCorrect("Trend 1, phase 2", ["Trend 1, phase 1", "Trend -1, phase 2", "Trend 0, phase 1"], "eng-phase").options,
    answerId: placeCorrect("Trend 1, phase 2", ["Trend 1, phase 1", "Trend -1, phase 2", "Trend 0, phase 1"], "eng-phase").answerId,
    explanation: "The bar-9 bearish shift set trend 1 and phase 2 after recording CH. Nothing had broken lastCH before bar 45, so the phase was still 2.",
    chart: { candles: SERIES_19.slice(0, 45), caption: chartCaption(19, 44) },
  },
];

const questionIndex = new Map(QUESTIONS.map((question) => [question.id, question]));

export function getQuestion(id: string): Question | undefined {
  return questionIndex.get(id);
}

export function getQuestions(ids: readonly string[]): Question[] {
  return ids.map((id) => questionIndex.get(id)).filter((question): question is Question => Boolean(question));
}

export function getLesson(id: string): Lesson | undefined {
  return LESSONS.find((lesson) => lesson.id === id);
}

export const QUESTIONS_BY_TOPIC = QUESTIONS.reduce<Record<string, Question[]>>((acc, question) => {
  (acc[question.topicId] ??= []).push(question);
  return acc;
}, {});

/**
 * Fixed assessment set, spread across mechanics and source-verified strategy.
 * Kept explicit so a content edit cannot silently change the pass mark pool.
 */
export const ASSESSMENT_QUESTION_IDS: string[] = [
  "Q-MEC-01",
  "Q-MEC-07",
  "Q-LOOK-01",
  "Q-SIM-02",
  "Q-STR-01",
  "Q-STR-03",
  "Q-STR-04",
  "Q-STR-06",
  "Q-STR-08",
  "Q-STR-14",
  "Q-STR-17",
  "Q-STR-20",
  "Q-STR-23",
  "Q-STR-27",
  "Q-ENG-BOS",
  "Q-ENG-ISS",
];


