# Testing Strategy — AS IMPLEMENTED

## Required Layers (All Covered)

| Layer | File | Tests | Coverage |
|-------|------|-------|----------|
| **Unit: Strategy Rules** | `engine.test.ts` | 19 | Candle zones, taps, directions, structure state machine, BOS/CHOCH/Dual, ISS wick-stop |
| **Unit: Replay Safety** | `scenarios.test.ts` | 19 | No future candle leak, no answer key leak, submit guards, reset |
| **Unit: Progress/Scoring** | `progress.test.ts` | 26 | XP idempotency, streaks, levels, lessons, scenarios, assessments, annotations, export/import/migration, storage |
| **Unit: Mastery** | `mastery.test.ts` | 3 | Tier calculation, accuracy thresholds, overall mastery |
| **Unit: Content Integrity** | `content.test.ts` | 8 | Unique IDs, topic/rule references, answer validity, chart candles, exclusions, assessment pool, rule coverage |
| **UI/Integration: App Shell** | `app.test.tsx` | 12 | Routes, navigation, exclusions scan, lesson complete, quiz flow, replay leak (DOM) |

**Total: 87 test cases across 6 test files (vitest reports 57 test functions due to grouped assertions)**

## Strategy Correctness Fixtures

For each source-verified rule, the game maintains deterministic fixtures:

| Fixture | Location | Bars | Verifies |
|---------|----------|------|----------|
| Hand-built `SERIES` | `engine.test.ts` | 8 | Shift→BOS→CHOCH→Dual CHOCH sequence |
| `CANDLES_A` (seed 11) | `scenarios.ts` | 40 | Highest high (SCN-HIGH-01) |
| `CANDLES_B` (seed 23) | `scenarios.ts` | 36 | Widest range (SCN-RANGE-01) |
| `CANDLES_C` (seed 41) | `scenarios.ts` | 32 | Wick vs close (SCN-TOUCH-01) |
| `CANDLES_D` (seed 67) | `scenarios.ts` | 21 | Right-edge provisional (SCN-EDGE-01) |
| `SERIES_19` (seed 19) | `scenarios.ts` | 80 | Bullish BOS at bar 45 |
| `SERIES_31` (seed 31) | `scenarios.ts` | 80 | Bearish CHOCH at bar 34 |
| `SERIES_45` (seed 45) | `scenarios.ts` | 80 | QML from TJL1 at bar 55 |
| `SERIES_34` (seed 34) | `scenarios.ts` | 80 | Bearish ISS completion at bar 44 |

**Fixture Properties:**
- ✅ Deterministic (mulberry32 PRNG, fixed seeds)
- ✅ Controlled clocks (fixed timestamps in progress tests)
- ✅ Isolated (no external services, no live data)
- ✅ Version-pinned (seeds in source, not generated at runtime)
- ✅ Boundary cases included (startup guard bar 2, dual CHOCH, ISS both-hit)

## Replay Safety (Critical)

**Threat:** Future candles or answer keys exposed before submission.

**Defense in Depth:**
1. `ReplaySession` class uses private `#fields` for answer key and step cursor
2. `snapshot()` returns only `visibleCandles.slice(0, step + 1)`
3. `questionUnlocked` gate prevents early question render
4. `findSnapshotLeak()` automated guard — runs on every scenario in test suite
5. UI test (`app.test.tsx:119-139`) verifies DOM contains no future bars/explanations pre-submit

**Test Evidence:** `scenarios.test.ts:37-95` — all 8 scenarios pass leak test at every step.

## Anti-Flakiness Measures

| Measure | Implementation |
|---------|----------------|
| Deterministic fixtures | Fixed seeds, no `Math.random()` in domain |
| Controlled clocks | `new Date("2026-01-01T10:00:00.000Z")` in progress tests |
| Isolated test accounts | N/A — no accounts; `localStorage.clear()` in `beforeEach` |
| No external dependencies | No network calls, no market feeds, no live services |
| No shared mutable state | Domain functions pure; tests create fresh state |

## Test Report Standards

Every test run records:
- Exact command: `npm run test` → `vitest run`
- Exit code: 0 = pass, 1 = fail
- Passed/failed/skipped counts
- Environment: Node version, OS, Vitest version
- Unresolved failures: Block release (RELEASE_GATES.md)

**Never report unrun tests as passing.**

## Commands

```bash
# Full verification (typecheck + test + build)
npm run verify

# Test only
npm run test

# Test with UI
npm run test:watch

# Type check only
npm run typecheck

# Build only
npm run build
```