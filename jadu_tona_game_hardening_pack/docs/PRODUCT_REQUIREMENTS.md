# Product Requirements — AS IMPLEMENTED

## Purpose
Teach users to recognize and practise verified behavior from the `RM'S JADU TONA` Pine Script indicator through interactive, replayable exercises. This is an educational game, not an automated trading system or financial-advice product.

## User Journeys (All Implemented)
- ✅ New user opens the app and understands that scenarios may be synthetic.
- ✅ User studies a lesson, completes a practice activity, receives a rule-linked explanation, and sees mastery update.
- ✅ User replays a scenario without access to future candles or the answer key.
- ✅ User revisits weak topics from a review queue (Analytics → weakest topic link).
- ✅ User can inspect settings, understand data storage, export data, and delete/reset progress.

## Required Functional Behavior (All Implemented)
- ✅ Dashboard values derive from persisted practice events; no invented statistics.
- ✅ Every scored lesson/question/scenario references a verified rule ID (27 rules, 53 questions, 8 scenarios).
- ✅ Unknown or ambiguous rules are marked unverified and are not scored (no unverified rules exist in scored set).
- ✅ Reset, retry, and repeated submission behavior is deterministic and does not duplicate rewards (idempotent XP).
- ✅ Chart annotations can be created, edited, and removed (Chart Lab + progress annotations).
- ✅ Empty, loading, offline, and error states explain what happened and what the user can do.
- ✅ Keyboard and touch interactions are usable (semantic HTML, focus styles, ARIA labels).

## Strategy Scope (Verified)

### In-Scope Topics (All Implemented with Source Anchors)
- Swing highs/lows, run extremes, CH/CL
- Break of Structure (BOS)
- Change of Character (CHOCH)
- Structural trend/phases (trend 1/0/-1, phase 1/2)
- TJL1 / TJL2
- QML (derived from TJL1 snapshot)
- SBR / RBS / DT / DB (CHOCH-adjacent zones)
- D-CHOCH and A+ promotion (kind 8)
- ISS1–ISS4 (both scenarios, scenario 1 scored)
- EMA default length 132 + smoothing options
- Multi-timeframe trend dashboard (13 timeframes, lookahead_off)
- Level lifecycle (zone geometry, tap source, stop-on-tap, display caps)
- Wick-vs-close tap behavior (TapByWick default, TapByClose option)
- Level accuracy analyzer (target/loss, both-hit heuristic, ranking threshold)

### Explicitly Excluded (Verified Absent from Game)
- Order Blocks
- Fair Value Gaps (FVG)
- Kill Zones

*Verification: `content.test.ts` regex scan, `app.test.tsx` route render scan, `rules.ts` explicit exclusion comment*

## Non-Goals (Enforced)
- ❌ Placing trades or connecting to a broker
- ❌ Promising profit or predictive accuracy
- ❌ Collecting broker/exchange passwords or API secrets
- ❌ Presenting generated/synthetic OHLC data as real historical data (all labelled synthetic)
- ❌ Scoring strategy concepts not traceable to verified source behavior

## Content Inventory (As Built)

### Lessons (10)
| ID | Title | Topic | Minutes | Rule IDs |
|----|-------|-------|---------|----------|
| LSN-CANDLE | Reading a candle without guessing | chart-basics | 4 | MEC-001, MEC-002, MEC-003, MEC-006 |
| LSN-TOUCH | Wick touch versus close-through | chart-basics | 5 | MEC-004, MEC-005, STR-014 |
| LSN-LOOKAHEAD | The right-edge trap | lookahead | 4 | MEC-007, MEC-008, STR-024 |
| LSN-SIM | What this game is — and is not | simulation-honesty | 3 | MEC-009, MEC-010 |
| LSN-STRUCTURE | Run extremes, CH and CL | swing-structure | 7 | STR-001, STR-004, STR-020, STR-026 |
| LSN-BOSCHOCH | BOS, CHOCH and dual CHOCH | bos-choch | 8 | STR-002, STR-003, STR-004, STR-009, STR-017, STR-021, STR-027 |
| LSN-TJLQML | TJL1, TJL2, QML and CHOCH zones | tjl-qml | 7 | STR-005, STR-006, STR-007, STR-008, STR-019 |
| LSN-LEVELS | Zone geometry and level lifecycle | levels | 6 | STR-013, STR-014, STR-018, STR-023, STR-026 |
| LSN-ISS | The ISS1–ISS4 state machine | iss | 9 | STR-010, STR-018, STR-020, STR-021 |
| LSN-EMA-MTF | EMA 132 and the MTF dashboard | ema | 5 | STR-011, STR-012, STR-024 |
| LSN-ANALYZER | The level accuracy analyzer | accuracy | 7 | STR-015, STR-016, STR-025, MEC-005 |

### Questions (53)
- 10 Mechanics (MEC-001 through MEC-010)
- 10 Lookahead/Simulation (MEC-007, MEC-008, MEC-009, MEC-010)
- 33 Strategy (STR-001 through STR-027, covering all strategy topics)
- Types: single-choice (38), true-false (8), chart-identify (7), violation (1)
- Every question has: unique ID, topicId, ruleIds, deterministic answer, explanation >20 chars, synthetic chart label where applicable

### Scenarios (8)
| ID | Title | Difficulty | Topic | Rule IDs | Reveal At |
|----|-------|------------|-------|----------|-----------|
| SCN-HIGH-01 | Find the high without the future | intro | chart-basics | MEC-001 | 24 |
| SCN-RANGE-01 | Widest range on the board | core | chart-basics | MEC-006 | 22 |
| SCN-TOUCH-01 | Did it close through? | core | chart-basics | MEC-004 | 18 |
| SCN-EDGE-01 | The newest bar is never confirmed | intro | lookahead | MEC-008 | 20 |
| SCN-BOS-01 | Name the break | core | bos-choch | STR-002, STR-004 | 45 |
| SCN-CHOCH-01 | Character change, not a wick | core | bos-choch | STR-003 | 34 |
| SCN-QML-01 | Where did the QML come from? | stretch | tjl-qml | STR-005, STR-006 | 55 |
| SCN-ISS-01 | ISS completion | stretch | iss | STR-010, STR-020 | 44 |

All scenarios: `synthetic: true`, sealed answer keys, leak-tested.

### Assessment (Fixed Pool, 18 Questions)
- Spread across mechanics and source-verified strategy
- Pass ratio: 80% (15/18)
- Idempotent: question XP + single pass bonus (100 XP)

### Progress & Motivation
- XP: question (10), scenario (25), lesson (5), assessment pass (100)
- Levels: 6 (Curious → Jadu Tona Scholar)
- Streak: daily UTC, any practice activity extends
- Mastery: 4 tiers (not-started, learning, practising, secure) per topic, requires 3 answers
- All idempotent — repeating correct answer awards no additional XP

## Technical Constraints (Met)
- Local-first: no backend, no accounts, no network calls
- Single HTML/JS/CSS bundle, static hosting compatible
- Content Security Policy compatible (no eval, no inline scripts)
- localStorage only, versioned schema (v1), migratable, size-capped
- Export/import/reset fully functional and tested