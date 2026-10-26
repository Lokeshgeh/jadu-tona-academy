# Strategy Rule Traceability — FILLED FROM SOURCE

**Source:** `jadu_tona_game_hardening_pack/script.txt` (Pine Script v6, 2,339 lines)  
**Generated from:** `src/domain/rules.ts` (single source of truth for the game)  
**Date:** 2026-10-26  

> This document is the **filled traceability register**. Every scored strategy rule in the game appears here with its exact source anchor. Rules marked `UNVERIFIED` are never scored.

---

## Rule Register

| Rule ID | Display Label | Source File/Line | Preconditions | Rule Behaviour | Expected Result | Confidence | Scored? |
|---------|---------------|------------------|---------------|----------------|-----------------|------------|---------|
| MEC-001 | OHLC bar anatomy | — (definition) | Valid OHLC candle | Candle records open, high, low, close | Arithmetic definitions hold | high | Yes |
| MEC-002 | Body direction | script.txt:1401-1404 | Valid OHLC candle | Bullish if close > open; bearish if close < open; neither if equal | Direction matches close vs open | high | Yes |
| MEC-003 | Wick measurement | — (definition) | Valid OHLC candle | Upper wick = high − max(open,close); lower wick = min(open,close) − low | Arithmetic matches definition | high | Yes |
| MEC-004 | Close-through vs wick-touch | script.txt:261-265 | Level zone defined | TapByWick: high ≥ bot AND low ≤ top; TapByClose: close ≤ top AND close ≥ bot | Correct mode identifies tap | high | Yes |
| MEC-005 | Intrabar order is ambiguous | — (definition) | Single OHLC bar | High/low sequence cannot be known from OHLC alone | Any intrabar sequence claim is invention | high | Yes |
| MEC-006 | Range and midpoint | — (definition) | Valid OHLC candle | Range = high − low; Midpoint = (high + low) / 2 | Arithmetic matches definition | high | Yes |
| MEC-007 | Lookahead bias | script.txt:2225-2241 | Higher-TF data request | Using information not available at decision time | Source uses `lookahead_off` | high | Yes |
| MEC-008 | Right-edge confirmation | — (definition) | Swing near chart edge | Confirmation requires later bars | Label must be provisional | high | Yes |
| MEC-009 | Synthetic data disclosure | — (definition) | Generated OHLC data | Simulations must be labelled synthetic | Never presented as historical | high | Yes |
| MEC-010 | Deterministic answer keys | — (definition) | Scored question | Answer fixed by visible data + stated rule | No judgement calls in scoring | high | Yes |

### Strategy Rules (Source-Verified)

| Rule ID | Display Label | Source File/Line | Preconditions | Rule Behaviour | Expected Result | Confidence | Scored? |
|---------|---------------|------------------|---------------|----------------|-----------------|------------|---------|
| STR-001 | Swing tracking: run high/low, CH/CL | script.txt:1394-1399, 1742-1760 | bar_index ≥ 2 | runHigh/runLow track extremes; shift freezes opposite as CH/CL | CH/CL recorded on shift bar | high | Yes |
| STR-002 | Break of Structure (BOS) | script.txt:1598-1612, 1670-1684 | Trend=±1, Phase=2 | Bull BOS: close > lastCH; Bear BOS: close < lastCL | Phase→1, TJL1/2 set, ISS reset | high | Yes |
| STR-003 | Change of Character (CHOCH) | script.txt:1412-1435, 1506-1526 | Trend=±1, lastCL/CH exists | Bear CHOCH: redP ∧ redC ∧ close[1],close < lastCL; Bull mirrors | Trend flips, phase→1, QML/SBR created | high | Yes |
| STR-004 | Trend and phase state | script.txt:1269-1270, 1458-1461, 1549-1552, 1742-1760 | — | Trend ∈ {1,0,-1}; Phase ∈ {1,2}; BOS/CHOCH→Phase 1 | State machine transitions match source | high | Yes |
| STR-005 | TJL1 and TJL2 levels | script.txt:1602-1612, 1674-1684 | BOS confirmed | Bull BOS: TJL1=lastCH, TJL2=lastCL; Bear BOS: TJL1=lastCL, TJL2=lastCH | Zones from CH/CL snapshot bars | high | Yes |
| STR-006 | QML levels | script.txt:1436-1443, 1527-1534 | Non-dual CHOCH, TJL1 exists | QML from TJL1 snapshot bar, then TJL1 deleted | QML zone ≠ CHOCH bar | high | Yes |
| STR-007 | SBR and RBS levels | script.txt:1428-1435, 1518-1526 | Non-dual CHOCH | Bear CHOCH: SBR from lastCL (low-type); Bull: RBS from lastCH (high-type) | Kind 3/4 zones created | high | Yes |
| STR-008 | DT and DB levels | script.txt:1433-1435, 1524-1526 | Non-dual CHOCH | Bear CHOCH: DT from runHigh unless runHigh.bar==TJL1.bar; Bull mirrors DB | Kind 5/6 zones, duplicate guard | high | Yes |
| STR-009 | D-CHOCH and A+ promotion | script.txt:479-545, 1416-1427, 1507-1517 | Dual CHOCH (prev opposite, no ISS/TJL since) | Promote kinds 3-7 with same bornBar as QML to kind 8; add D-CHOCH DT/DB | Promoted levels active, originals deleted | medium | Yes |
| STR-010 | ISS1–ISS4 state machine | script.txt:1765-2142 | After CHOCH, enableIss=true | 4-state tracker per side; scenario 1 default; completion resets structure | ISS4 drawn, trend/phase/CH/CL reset | medium | Yes |
| STR-011 | EMA default and smoothing | script.txt:152-183 | — | EMA(close,132); smoothing: None/SMA/SMA+BB/EMA/SMMA/WMA/VWMA on EMA output | Length 132, smoothing len 14, BB 2.0 | high | Yes |
| STR-012 | MTF trend dashboard | script.txt:1254-1256, 2225-2237, 2256-2314 | — | 13 TFs; each: close > EMA→BULLISH, <→BEARISH, =→NEUTRAL | lookahead_off, renders last bar only | high | Yes |
| STR-013 | Level zone geometry & lifecycle | script.txt:253-259, 592-637 | Level created | High-type: high → bodyTop−pad; Low-type: bodyBot+pad → low; pad = body×ZoneBody%×0.01 | Tap check after birth bar only | high | Yes |
| STR-014 | Wick vs close tap behaviour | script.txt:261-265, 615-620, 69-72 | Level active, bar > bornBar | Default Wick: high≥bot ∧ low≤top; Close: close≤top ∧ close≥bot; StopOnTap default on | First tap after birth deactivates | high | Yes |
| STR-015 | Level accuracy analyzer math | script.txt:411-435, 371-376, 2321-2339 | Analyzer enabled, first tap | Target/loss from tap bar; win/loss/unresolved on later bars; Accuracy = wins/(wins+losses) | PipSize auto: mintick×10 (FX) else mintick | high | Yes |
| STR-016 | Analyzer both-hit heuristic | script.txt:378-395 | Target and loss both hit | Compare \|open−high\| vs \|open−low\|; nearer assumed first | Heuristic flagged as guess, not evidence | high | Yes |
| STR-017 | A+ level filter set | script.txt:39-40, 672-675 | ShowOnlyAPlus input | Keep kinds 2,7,31,33; kind 8 only if text contains "QML" | D-CHOCH SBR/RBS/DT/DB filtered out | high | Yes |
| STR-018 | ISS 3/4 wick-stop sequence | script.txt:603-614 | ISS kinds 30-35 | Needs close beyond zone → stopReady; later wick overlap → stop | ISS1 (kind 29) not in this rule | high | Yes |
| STR-019 | Level display text overrides | script.txt:283-289, 267-281 | TJL1/TJL2 created | Text forced to BUY/SELL by computed dir; BUY TJL2 stored dir=-1 | Display ≠ stored direction possible | high | Yes |
| STR-020 | ISS shift definition | script.txt:1401-1410 | — | Bear shift: redP ∧ redC ∧ close < prevLow; Bull: greenP ∧ greenC ∧ close > prevHigh | Two-bar close condition | high | Yes |
| STR-021 | Dual CHOCH condition | script.txt:1416-1427, 1507-1517 | CHOCH occurs | lastChochSide opposite ∧ ¬issOrTjlSinceChoch | Promotion instead of fresh SBR/RBS/... | high | Yes |
| STR-022 | D-CHOCH QML colour | script.txt:476-477, 61 | QML promoted to kind 8 | Kind 7→inpBestQMLColor; other kinds keep srcCol | Gold for promoted QML | high | Yes |
| STR-023 | Live level cap & history window | script.txt:65-67, 623-637, 2200-2223 | — | Max 140 live levels; left edge ≤ bar_index−4000 | Display limits only | high | Yes |
| STR-024 | Dashboard lookahead setting | script.txt:2225-2241 | request.security calls | lookahead=barmerge.lookahead_off explicitly passed | Non-repainting historical rows | high | Yes |
| STR-025 | Analyzer ranking threshold | script.txt:126, 397-409, 2321-2339 | Finished tests ≥ inpAnalyzerMinDone | Only eligible if done ≥ 3 (default); tie keeps earlier (strict >) | Min 3 finished tests for "best" | high | Yes |
| STR-026 | Bar processing requires 2 prior bars | script.txt:1336, 1353, 2143-2145 | — | Main logic runs only when bar_index ≥ 2 | Bars 0-1 never evaluated | high | Yes |
| STR-027 | Promoted QML label swap | script.txt:267-281, 460-474 | QML promoted to kind 8 | High-type SELL QML (dir -1)→"D-CHOCH BUY QML"; Low-type BUY QML (dir 1)→"D-CHOCH SELL QML" | Source quirk reproduced exactly | high | Yes |

---

## Rule Review Checklist (Per Master Prompt)

For every rule above:
1. ✅ Exact source block or stable code anchor cited
2. ✅ Inputs, conditions, state transitions, outputs explained
3. ✅ Positive, negative, boundary test fixtures exist in `engine.test.ts`, `scenarios.test.ts`, `content.test.ts`
4. ✅ Repainting/lookahead implications identified (STR-007, STR-024, MEC-007, MEC-008)
5. ✅ Ambiguity marked explicitly (MEC-005, STR-016, STR-027)
6. ✅ Implementation reviewed against source (engine.ts ports source logic 1:1)
7. ✅ No unverified rules in scored content

---

## Scope Exclusions — Verified Absent

| Excluded Concept | Game UI | Lessons | Quizzes | Scenarios | Tests | Register |
|------------------|---------|---------|---------|-----------|-------|----------|
| Order Blocks | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Fair Value Gaps (FVG) | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Kill Zones | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

*Verified by:* `content.test.ts:59-61` (regex scan), `app.test.tsx:50-80` (route render scan), `rules.ts:18-20` (explicit comment)

---

## Test Fixtures Summary

| Fixture | Source | Bars | Purpose |
|---------|--------|------|---------|
| `SERIES` (engine.test.ts) | Hand-built | 8 | Forces shift→BOS→CHOCH→Dual CHOCH |
| `CANDLES_A` (scenarios.ts) | Seed 11 | 40 | Highest high (SCN-HIGH-01) |
| `CANDLES_B` (scenarios.ts) | Seed 23 | 36 | Widest range (SCN-RANGE-01) |
| `CANDLES_C` (scenarios.ts) | Seed 41 | 32 | Wick vs close (SCN-TOUCH-01) |
| `CANDLES_D` (scenarios.ts) | Seed 67 | 21 | Right-edge provisional (SCN-EDGE-01) |
| `SERIES_19` | Seed 19 | 80 | Bullish BOS at bar 45 |
| `SERIES_31` | Seed 31 | 80 | Bearish CHOCH at bar 34 |
| `SERIES_45` | Seed 45 | 80 | QML from TJL1 at bar 55 |
| `SERIES_34` | Seed 34 | 80 | Bearish ISS completion at bar 44 |

All fixtures are deterministic (mulberry32 PRNG), seeded, and version-pinned.