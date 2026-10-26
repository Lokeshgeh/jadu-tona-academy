/**
 * Verified rule register for the JADU TONA Trading Academy game.
 *
 * Source of truth: `jadu_tona_game_hardening_pack/script.txt` (Pine Script v6,
 * 2339 lines). Line references below are 1-based line numbers in that file.
 * Line 1 of the file is the owner's instruction comment; the Pine script
 * starts at line 2 (`//@version=6`).
 *
 * Verification policy:
 *   - `source-verified`: behaviour matched to the Pine source and covered by
 *     an automated test fixture in `src/domain/engine.test.ts` or a content
 *     test.
 *   - `definition`: follows from the OHLC data model, not a strategy claim.
 *   - `unverified`: not safe to teach or score. There are none in this build
 *     for in-scope topics; if a future source change breaks a test, the rule
 *     must be demoted here immediately.
 *
 * Deliberately out of scope for the game (never modelled, taught, tested as a
 * topic, or surfaced): Order Blocks, Fair Value Gaps, and Kill Zones. The Pine
 * indicator keeps its own inputs for those; the game does not read them.
 */

export type RuleStatus = "definition" | "source-verified" | "unverified";

export type TopicId =
  | "chart-basics"
  | "lookahead"
  | "simulation-honesty"
  | "swing-structure"
  | "bos-choch"
  | "tjl-qml"
  | "sbr-rbs-dt-db"
  | "iss"
  | "ema"
  | "mtf"
  | "levels"
  | "accuracy";

export type RuleGroup = "mechanics" | "strategy";

export interface StrategyRule {
  id: string;
  label: string;
  topicId: TopicId;
  group: RuleGroup;
  status: RuleStatus;
  /** True only when status is `definition` or `source-verified`. */
  scored: boolean;
  /** Exact source anchor(s). Null only for pure definitions. */
  sourceRef: string | null;
  summary: string;
  /** What the source actually does, including quirks worth teaching honestly. */
  rationale: string;
  confidence: "high" | "medium";
}

const rule = (input: Omit<StrategyRule, "scored" | "group"> & { group?: RuleGroup }): StrategyRule => ({
  ...input,
  group: input.group ?? "strategy",
  scored: input.status !== "unverified",
});

export const MECHANICS_RULES: StrategyRule[] = [
  rule({
    id: "MEC-001",
    label: "OHLC bar anatomy",
    topicId: "chart-basics",
    group: "mechanics",
    status: "definition",
    sourceRef: null,
    summary:
      "A candle records open, high, low and close. High is the highest traded price in the period and low is the lowest.",
    rationale: "Definition of the OHLC data model every chart uses.",
    confidence: "high",
  }),
  rule({
    id: "MEC-002",
    label: "Body direction",
    topicId: "chart-basics",
    group: "mechanics",
    status: "definition",
    sourceRef: "script.txt:1401-1404",
    summary: "A bullish candle closes above its open; a bearish candle closes below its open.",
    rationale:
      "The source defines green/red candles exactly this way: close > open and close < open, with an equality case counted as neither.",
    confidence: "high",
  }),
  rule({
    id: "MEC-003",
    label: "Wick measurement",
    topicId: "chart-basics",
    group: "mechanics",
    status: "definition",
    sourceRef: null,
    summary: "Upper wick = high − max(open, close). Lower wick = min(open, close) − low.",
    rationale: "Arithmetic on the OHLC data model.",
    confidence: "high",
  }),
  rule({
    id: "MEC-004",
    label: "Close-through versus wick-touch",
    topicId: "chart-basics",
    group: "mechanics",
    status: "source-verified",
    sourceRef: "script.txt:261-265",
    summary:
      "Wick mode taps when the bar's range overlaps the zone; close mode taps only when the close is inside the zone.",
    rationale:
      "`f_isTapped`: TapByClose checks `close <= top and close >= bot`; TapByWick checks `high >= bot and low <= top`. Default input is TapByWick (script.txt:72).",
    confidence: "high",
  }),
  rule({
    id: "MEC-005",
    label: "Intrabar order is ambiguous",
    topicId: "chart-basics",
    group: "mechanics",
    status: "definition",
    sourceRef: null,
    summary: "On a single bar you cannot know whether the high or the low occurred first without lower-timeframe data.",
    rationale:
      "Data-model limitation. The source makes one explicit exception for its own analyzer: it guesses which level was hit first from open-to-high versus open-to-low distance (script.txt:378-385). That guess is the indicator's heuristic, not evidence of true order.",
    confidence: "high",
  }),
  rule({
    id: "MEC-006",
    label: "Range and midpoint",
    topicId: "chart-basics",
    group: "mechanics",
    status: "definition",
    sourceRef: null,
    summary: "Bar range = high − low. Midpoint = (high + low) / 2.",
    rationale: "Arithmetic on the OHLC data model.",
    confidence: "high",
  }),
  rule({
    id: "MEC-007",
    label: "Lookahead bias",
    topicId: "lookahead",
    group: "mechanics",
    status: "definition",
    sourceRef: "script.txt:2225-2241",
    summary: "Lookahead bias is using information that was not available at the moment a decision had to be made.",
    rationale:
      "The source explicitly requests higher-timeframe data with `barmerge.lookahead_off`, which is the correct setting for non-repainting dashboard values.",
    confidence: "high",
  }),
  rule({
    id: "MEC-008",
    label: "Right-edge confirmation",
    topicId: "lookahead",
    group: "mechanics",
    status: "definition",
    sourceRef: null,
    summary:
      "A swing point near the right edge of a chart cannot be confirmed as final without later bars; any label implying confirmation is provisional.",
    rationale: "Follows from time ordering: confirmation requires information from the future.",
    confidence: "high",
  }),
  rule({
    id: "MEC-009",
    label: "Synthetic data disclosure",
    topicId: "simulation-honesty",
    group: "mechanics",
    status: "definition",
    sourceRef: null,
    summary:
      "Generated OHLC candles are a simulation. They must be labelled synthetic and must never be described as historical market data.",
    rationale: "Honesty requirement for educational simulations.",
    confidence: "high",
  }),
  rule({
    id: "MEC-010",
    label: "Deterministic answer keys",
    topicId: "simulation-honesty",
    group: "mechanics",
    status: "definition",
    sourceRef: null,
    summary:
      "A question may only be scored when its answer is fixed by the visible data and a stated rule, with no judgement call left to the marker.",
    rationale: "Prevents scoring opinions or ambiguous interpretations.",
    confidence: "high",
  }),
];

export const STRATEGY_RULES: StrategyRule[] = [
  rule({
    id: "STR-001",
    label: "Swing tracking: run high / run low, CH and CL",
    topicId: "swing-structure",
    status: "source-verified",
    sourceRef: "script.txt:1394-1399, 1742-1760",
    summary:
      "The indicator tracks the highest high (runHigh) and lowest low (runLow) since its last reset. A pullback shift freezes the opposite extreme as CH or CL.",
    rationale:
      "runHigh/runLow update with every new extreme. On a bearish shift in phase 1, lastCH is set to runHigh and trend becomes 1 (phase 2). On a bullish shift in phase 1, lastCL is set to runLow and trend becomes -1. The shift bar's own high/low becomes the new opposite run extreme. Run tracking begins only when bar_index >= 2 (script.txt:1336), so the first CH/CL cannot come from bars 0-1.",
    confidence: "high",
  }),
  rule({
    id: "STR-002",
    label: "Break of Structure (BOS)",
    topicId: "bos-choch",
    status: "source-verified",
    sourceRef: "script.txt:1598-1612, 1670-1684",
    summary:
      "Bullish BOS: trend is 1, phase is 2, and close > lastCH. Bearish BOS: trend is -1, phase is 2, and close < lastCL.",
    rationale:
      "A BOS is evaluated on the close only. It flips phase back to 1, refreshes lastCL/lastCH from the opposite run extreme, sets TJL1/TJL2, and creates BUY/SELL TJL1 and TJL2 zones.",
    confidence: "high",
  }),
  rule({
    id: "STR-003",
    label: "Change of Character (CHOCH)",
    topicId: "bos-choch",
    status: "source-verified",
    sourceRef: "script.txt:1412-1413, 1415-1435, 1506-1526",
    summary:
      "Bearish CHOCH: trend is 1, lastCL exists, the previous bar is red, and both the previous and current closes are below lastCL. Bullish CHOCH mirrors it above lastCH.",
    rationale:
      "`redP`/`greenP` test the previous bar. The current bar must also be red/green (redC/greenC) for a shift, and the CHOCH condition checks close[1] and close against the level. So it is a two-bar confirmation, evaluated on close.",
    confidence: "high",
  }),
  rule({
    id: "STR-004",
    label: "Trend and phase state",
    topicId: "swing-structure",
    status: "source-verified",
    sourceRef: "script.txt:1269-1270, 1458-1461, 1549-1552, 1742-1760",
    summary:
      "Trend is 1 (bullish), -1 (bearish) or 0 (unset). Phase is 1 (impulse/tracking) or 2 (retracement). BOS and CHOCH both return phase to 1.",
    rationale:
      "Phase 1 arms a retracement shift. The shift sets phase 2 and records CH/CL. A phase-2 close through the recorded level is a BOS. A CHOCH resets trend and phase and starts the opposite ISS tracker.",
    confidence: "high",
  }),
  rule({
    id: "STR-005",
    label: "TJL1 and TJL2 levels",
    topicId: "tjl-qml",
    status: "source-verified",
    sourceRef: "script.txt:1602-1612, 1674-1684",
    summary:
      "On a bullish BOS, TJL1 is the last CH and TJL2 is the new last CL. On a bearish BOS, TJL1 is the last CL and TJL2 is the new last CH. Both are drawn as candle zones.",
    rationale:
      "Bullish BOS draws BUY TJL1 from the CH bar as a high-type zone and BUY TJL2 from the CL bar as a low-type zone. Bearish BOS draws SELL TJL1 from the CL bar (low-type) and SELL TJL2 from the CH bar (high-type).",
    confidence: "high",
  }),
  rule({
    id: "STR-006",
    label: "QML levels",
    topicId: "tjl-qml",
    status: "source-verified",
    sourceRef: "script.txt:1436-1443, 1527-1534",
    summary:
      "On a non-dual CHOCH, if a TJL1 snapshot exists, the indicator creates a SELL QML (bearish CHOCH) or BUY QML (bullish CHOCH) from the TJL1 bar, then deletes the TJL1 level.",
    rationale:
      "QML is always derived from the TJL1 snapshot, not from the CHOCH bar. Its kind is 7 and it is recorded as `lastQmlLeft` for later A+ promotion.",
    confidence: "high",
  }),
  rule({
    id: "STR-007",
    label: "SBR and RBS levels",
    topicId: "sbr-rbs-dt-db",
    status: "source-verified",
    sourceRef: "script.txt:1428-1435, 1518-1526",
    summary:
      "A bearish CHOCH adds an SBR zone from the last CL bar. A bullish CHOCH adds an RBS zone from the last CH bar.",
    rationale:
      "SBR is kind 3, built from lastCL with a low-type candle zone. RBS is kind 4, built from lastCH with a high-type zone. They are created in the non-dual CHOCH branch.",
    confidence: "high",
  }),
  rule({
    id: "STR-008",
    label: "DT and DB levels",
    topicId: "sbr-rbs-dt-db",
    status: "source-verified",
    sourceRef: "script.txt:1433-1435, 1524-1526",
    summary:
      "A bearish CHOCH adds a DT zone from the runHigh bar unless that bar is the TJL1 bar. A bullish CHOCH mirrors this with a DB zone from the runLow bar.",
    rationale:
      "DT is kind 5 (high-type) and DB is kind 6 (low-type). The `runHigh.bar != tjl1.bar` / `runLow.bar != tjl1.bar` guard suppresses a duplicate when the same bar is already represented.",
    confidence: "high",
  }),
  rule({
    id: "STR-009",
    label: "D-CHOCH and A+ promotion",
    topicId: "bos-choch",
    status: "source-verified",
    sourceRef: "script.txt:479-545, 1416-1427, 1507-1517",
    summary:
      "A dual CHOCH promotes the previous CHOCH's SBR/RBS/DT/DB/QML levels to kind 8 'best' levels, and adds a D-CHOCH DT or DB on the dual-CHOCH bar.",
    rationale:
      "Dual means the previous CHOCH was in the opposite direction and no ISS/TJL event happened since. Promotion starts from the QML level whose left edge is lastQmlLeft, takes its bornBar, then converts every kind 3–7 level with that bornBar.",
    confidence: "medium",
  }),
  rule({
    id: "STR-010",
    label: "ISS1–ISS4 state machine",
    topicId: "iss",
    status: "source-verified",
    sourceRef: "script.txt:1765-2142",
    summary:
      "ISS tracks a base extreme, a run extreme, and an ISS1 level; a close through ISS1 arms ISS3/ISS4 tracking. A later close through the post-break extreme completes ISS4 and resets structure.",
    rationale:
      "Bull and bear trackers mirror each other. Scenario '1' (the source default) and scenario '2' differ in when the base is confirmed and in the scenario-1 reset path. Both are implemented; scoring uses scenario '1'.",
    confidence: "medium",
  }),
  rule({
    id: "STR-011",
    label: "EMA default and smoothing options",
    topicId: "ema",
    status: "source-verified",
    sourceRef: "script.txt:152-183",
    summary:
      "EMA length defaults to 132 on close. Smoothing type defaults to None; the other options are SMA, SMA + Bollinger Bands, EMA, SMMA (RMA), WMA and VWMA, with smoothing length 14 and BB StdDev 2.0.",
    rationale:
      "`ta.ema(emaSrc, emaLen)` drives the plotted EMA. Smoothing is applied to the EMA output, not to raw close. Bollinger bands are SMA ± stdev × multiplier of the EMA output.",
    confidence: "high",
  }),
  rule({
    id: "STR-012",
    label: "Multi-timeframe trend dashboard",
    topicId: "mtf",
    status: "source-verified",
    sourceRef: "script.txt:1254-1256, 2225-2237, 2256-2314",
    summary:
      "Each dashboard row is BULLISH when that timeframe's close is above EMA(close, 132), BEARISH when below, and NEUTRAL when equal.",
    rationale:
      "`f_dashEmaTrendCalc` returns 1 / -1 / 0. Thirteen timeframes default to 1m, 3m, 5m, 15m, 30m, 45m, 1H, 2H, 3H, 4H, 1D, 1W, 1M. Data is requested with lookahead_off. The dashboard renders only on the last bar.",
    confidence: "high",
  }),
  rule({
    id: "STR-013",
    label: "Level zone geometry and lifecycle",
    topicId: "levels",
    status: "source-verified",
    sourceRef: "script.txt:253-259, 592-637",
    summary:
      "A high-type zone spans from the bar high down to body top minus a pad. A low-type zone spans from body bottom plus a pad down to the bar low. Pad = body size × Zone Body % × 0.01.",
    rationale:
      "Default Zone Body % is 1.0, so the pad is 1% of the body. Zones are only tap-checked on bars after their birth bar, and are deactivated on the first accepted tap.",
    confidence: "high",
  }),
  rule({
    id: "STR-014",
    label: "Wick versus close tap behaviour",
    topicId: "levels",
    status: "source-verified",
    sourceRef: "script.txt:261-265, 615-620, 69-72",
    summary:
      "Default Tap Source is TapByWick: any overlap between the bar's range and the zone counts. TapByClose requires the close to sit inside the zone. With Stop On Tap on (default), the level deactivates on the first tap after birth.",
    rationale:
      "For a tap-by-wick check the source uses `high >= bot and low <= top`. Note the direction of the comparisons: the bar's high must reach the zone bottom and the low must reach the zone top.",
    confidence: "high",
  }),
  rule({
    id: "STR-015",
    label: "Level accuracy analyzer math",
    topicId: "accuracy",
    status: "source-verified",
    sourceRef: "script.txt:411-435, 371-376, 2321-2339",
    summary:
      "On a level's first tap, the analyzer sets a target and a loss from the tap bar, then records win, loss, or unresolved on later bars. Accuracy = wins ÷ (wins + losses).",
    rationale:
      "Target = close + targetPips × pipSize for bullish levels (close − move for bearish). Loss = low − lossPips × pipSize for bullish (high + move for bearish). Pip size Auto = mintick × 10 on forex, otherwise mintick.",
    confidence: "high",
  }),
  rule({
    id: "STR-016",
    label: "Analyzer both-hit heuristic",
    topicId: "accuracy",
    status: "source-verified",
    sourceRef: "script.txt:378-395",
    summary:
      "If a bar touches both target and loss, the source decides by comparing |open − high| with |open − low|: the nearer extreme is assumed to have printed first.",
    rationale:
      "This is an explicit heuristic for ambiguous intrabar order, not lower-timeframe evidence. The game teaches it as a source behaviour and flags its ambiguity.",
    confidence: "high",
  }),
  rule({
    id: "STR-017",
    label: "A+ level filter set",
    topicId: "bos-choch",
    status: "source-verified",
    sourceRef: "script.txt:39-40, 672-675",
    summary:
      "When 'Show Only A+ Levels' is on, the source keeps TJL2, QML, ISS4 (bull kind 31 and bear kind 33) and kind-8 levels whose text contains 'QML'. D-CHOCH SBR/RBS/DT/DB are kind 8 but do not contain QML, so they are filtered out.",
    rationale:
      "`isAPlus = kind == 2 or kind == 7 or kind == 31 or kind == 33 or (kind == 8 and str.contains(txt, \"QML\"))`. Both 31 and 33 are ISS4 levels, not ISS3. The analyzer table visibility input names at script.txt:142-143 are paired with the opposite QML label text; that naming confusion does not change level creation.",
    confidence: "high",
  }),
  rule({
    id: "STR-018",
    label: "ISS 3/4 wick-stop sequence",
    topicId: "iss",
    status: "source-verified",
    sourceRef: "script.txt:603-614",
    summary:
      "ISS levels are not stopped by the generic tap rule. With the default on, they first need a close beyond the zone (stopReady), and only a later bar that overlaps the zone stops them.",
    rationale:
      "The check applies to kinds 30–35 (ISS2/ISS3/ISS4), not to ISS1 (kind 29). Named 'Stop ISS 3/4 on Wick Tap' in the inputs, but implemented for all ISS level kinds in that range.",
    confidence: "high",
  }),
  rule({
    id: "STR-019",
    label: "Level display text overrides",
    topicId: "levels",
    status: "source-verified",
    sourceRef: "script.txt:283-289, 267-281",
    summary:
      "TJL1 and TJL2 override their stored text with BUY/SELL based on the computed direction. TJL2 created on a bullish BOS is still stored with a bearish direction (-1) even though its text reads BUY TJL2.",
    rationale:
      "`f_levelDir`: kind 1/2 use isHigh ? 1 : -1. BUY TJL2 is built from a low-type CL zone, so its dir is -1. Text is preserved when already BUY/SELL TJL1 or TJL2.",
    confidence: "high",
  }),
  rule({
    id: "STR-020",
    label: "ISS shift definition",
    topicId: "iss",
    status: "source-verified",
    sourceRef: "script.txt:1401-1410",
    summary:
      "Bearish ISS shift = previous bar red AND current bar red AND current close < previous low. Bullish ISS shift = previous bar green AND current green AND current close > previous high.",
    rationale:
      "The same two-bar shift is used for retracement detection and for ISS base/confirmation logic.",
    confidence: "high",
  }),
  rule({
    id: "STR-021",
    label: "Dual CHOCH condition",
    topicId: "bos-choch",
    status: "source-verified",
    sourceRef: "script.txt:1416-1427, 1507-1517",
    summary:
      "A CHOCH is dual when the previous CHOCH side was opposite and no ISS/TJL event has occurred since. Dual CHOCH triggers promotion instead of creating a fresh SBR/RBS/DT/DB/QML group.",
    rationale:
      "`lastChochSide` is set to 1 after a bearish CHOCH and -1 after a bullish CHOCH. `issOrTjlSinceChoch` is set by BOS TJL creation and ISS completion, and cleared on each CHOCH.",
    confidence: "high",
  }),
  rule({
    id: "STR-022",
    label: "D-CHOCH QML colour",
    topicId: "bos-choch",
    status: "source-verified",
    sourceRef: "script.txt:476-477, 61",
    summary:
      "Promoted kind-8 QML levels use the Best QML colour (default gold, rgb(255,215,0)); other promoted levels keep their original colour.",
    rationale: "`f_bestLevelColor`: kind 7 returns inpBestQMLColor, otherwise srcCol.",
    confidence: "high",
  }),
  rule({
    id: "STR-023",
    label: "Live level cap and history window",
    topicId: "levels",
    status: "source-verified",
    sourceRef: "script.txt:65-67, 623-637, 2200-2223",
    summary:
      "The indicator keeps at most 140 live levels by default and draws a zone's left edge no further back than 4000 bars.",
    rationale:
      "`inpMaxLiveLevels` default 140. `f_trimLevels` deletes the oldest beyond the cap. Drawing uses `max(left, bar_index - 4000)`. These are display limits, not strategy rules.",
    confidence: "high",
  }),
  rule({
    id: "STR-024",
    label: "Dashboard lookahead setting",
    topicId: "mtf",
    status: "source-verified",
    sourceRef: "script.txt:2225-2241",
    summary:
      "Dashboard and alert data use `lookahead=barmerge.lookahead_off`, so a higher-timeframe value is not borrowed from the future.",
    rationale:
      "Lookahead off is the non-repainting choice for request.security on historical bars. This does not make the live bar predictive; it can still update until the higher timeframe closes.",
    confidence: "high",
  }),
  rule({
    id: "STR-025",
    label: "Analyzer ranking threshold",
    topicId: "accuracy",
    status: "source-verified",
    sourceRef: "script.txt:126, 397-409, 2321-2339",
    summary:
      "A level type is only eligible to be highlighted as best once it has at least 3 finished tests (default). Ties keep the earlier slot because the comparison is strict `rate > bestRate`.",
    rationale:
      "`inpAnalyzerMinDone = 3`. `f_bestAnalyzerSlot` iterates slots 0–16 and replaces the best only on a strictly greater rate.",
    confidence: "high",
  }),
  rule({
    id: "STR-026",
    label: "Bar processing requires two prior bars",
    topicId: "levels",
    status: "source-verified",
    sourceRef: "script.txt:1336, 1353, 2143-2145",
    summary:
      "The main structure logic only runs when at least two earlier bars exist (`bar_index >= 2`); the first two bars of the chart are not evaluated.",
    rationale:
      "The logic reads close[1], low[1], high[1] and, for the excluded gap logic, high[2]. The game engine mirrors the same startup guard so event indices match the source.",
    confidence: "high",
  }),
  rule({
    id: "STR-027",
    label: "Promoted QML label swap",
    topicId: "bos-choch",
    status: "source-verified",
    sourceRef: "script.txt:267-281, 460-474",
    summary:
      "When a QML is promoted to a D-CHOCH best level, its text can flip between BUY and SELL: a high-type SELL QML (dir -1) becomes 'D-CHOCH BUY QML', and a low-type BUY QML (dir 1) becomes 'D-CHOCH SELL QML'.",
    rationale:
      "`f_levelDir` assigns kind 7 dir -1 for high-type and 1 for low-type zones. `f_bestLevelText` maps dir 1 to SELL QML and dir -1 to BUY QML. The game models this exactly and flags it as a source quirk rather than silently correcting it.",
    confidence: "high",
  }),
];

export const ALL_RULES: StrategyRule[] = [...MECHANICS_RULES, ...STRATEGY_RULES];

const ruleIndex = new Map(ALL_RULES.map((item) => [item.id, item]));

export function getRule(id: string): StrategyRule | undefined {
  return ruleIndex.get(id);
}

export function getRules(ids: readonly string[]): StrategyRule[] {
  return ids
    .map((id) => ruleIndex.get(id))
    .filter((item): item is StrategyRule => Boolean(item));
}

export function scoredRules(): StrategyRule[] {
  return ALL_RULES.filter((item) => item.scored);
}

export interface Topic {
  id: TopicId;
  name: string;
  group: RuleGroup;
  description: string;
}

export const TOPICS: Topic[] = [
  {
    id: "chart-basics",
    name: "Chart mechanics",
    group: "mechanics",
    description: "Candle construction, wick measurement, and what a single bar cannot tell you.",
  },
  {
    id: "lookahead",
    name: "Lookahead discipline",
    group: "mechanics",
    description: "Spotting decisions that quietly rely on information from the right side of the chart.",
  },
  {
    id: "simulation-honesty",
    name: "Simulation honesty",
    group: "mechanics",
    description: "What a synthetic scenario can and cannot claim to be.",
  },
  {
    id: "swing-structure",
    name: "Swing structure",
    group: "strategy",
    description: "Run highs/lows, CH/CL, trend and phase tracking.",
  },
  {
    id: "bos-choch",
    name: "BOS / CHOCH / D-CHOCH",
    group: "strategy",
    description: "Breaks, character changes, dual CHOCH, and promoted A+ levels.",
  },
  {
    id: "tjl-qml",
    name: "TJL / QML",
    group: "strategy",
    description: "TJL1, TJL2 and the QML levels derived from TJL1.",
  },
  {
    id: "sbr-rbs-dt-db",
    name: "SBR / RBS / DT / DB",
    group: "strategy",
    description: "The four CHOCH-adjacent zones and when each is created.",
  },
  {
    id: "iss",
    name: "ISS1–ISS4",
    group: "strategy",
    description: "The bull and bear ISS state machines, shifts, and wick-stop handling.",
  },
  {
    id: "ema",
    name: "EMA settings",
    group: "strategy",
    description: "Length 132 on close, plus the optional smoothing layer.",
  },
  {
    id: "mtf",
    name: "MTF dashboard",
    group: "strategy",
    description: "Thirteen timeframe rows, each classified against its own EMA.",
  },
  {
    id: "levels",
    name: "Levels & lifecycle",
    group: "strategy",
    description: "Zone geometry, tap source, stop-on-tap, and display caps.",
  },
  {
    id: "accuracy",
    name: "Accuracy analyzer",
    group: "strategy",
    description: "Target/loss resolution, both-hit heuristic, and ranking.",
  },
];

export function getTopic(id: TopicId): Topic {
  const topic = TOPICS.find((item) => item.id === id);
  if (!topic) throw new Error(`Unknown topic: ${id}`);
  return topic;
}
