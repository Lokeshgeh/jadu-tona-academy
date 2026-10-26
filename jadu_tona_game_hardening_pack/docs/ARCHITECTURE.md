# Architecture — AS IMPLEMENTED

## Actual Layer Structure

```
src/
├── components/          # Presentation: reusable UI, chart, error boundary
├── pages/               # Presentation: route-level pages (11 routes)
├── domain/              # Domain: pure functions, zero React deps
│   ├── rules.ts         # 27 StrategyRule definitions with source anchors
│   ├── engine.ts        # JaduTonaEngine — faithful TS port of Pine logic
│   ├── chart.ts         # Candle model, synthetic generation, math helpers
│   ├── scenarios.ts     # 8 PublicScenario + sealed answer keys
│   ├── content.ts       # 10 Lessons, 53 Questions, assessment pool
│   ├── replay.ts        # ReplaySession — no-leak sequential reveal
│   ├── progress.ts      # ProgressState, XP, streak, mastery, export/import
│   ├── annotations.ts   # Chart annotation model + validation
│   ├── mastery.ts       # Mastery calculation from progress events
│   └── *.test.ts        # 57 unit/integration tests
├── state/
│   └── store.tsx        # React Context + useReducer (ProgressProvider)
├── lib/
│   ├── router.tsx       # Hash-based routing, Route type
│   └── storage.ts       # localStorage load/save/migrate/backup
└── styles/
    └── global.css       # Design tokens, component styles, dark mode
```

## Domain Boundaries (Enforced)

| Module | Responsibility | Dependencies |
|--------|----------------|--------------|
| `rules.ts` | Rule register, topics, lookup | — |
| `engine.ts` | Structure state machine, levels, events | `chart.ts`, `rules.ts` (types only) |
| `chart.ts` | Candle model, synthetic series, math | — |
| `scenarios.ts` | Scenario catalog, sealed answers | `chart.ts`, `engine.ts`, `content.ts` |
| `content.ts` | Lessons, questions, assessment pool | `chart.ts`, `engine.ts`, `rules.ts` |
| `replay.ts` | Reveal cursor, submission, leak guard | `scenarios.ts` |
| `progress.ts` | State schema, XP, streak, mastery, I/O | `annotations.ts`, `content.ts` (types) |
| `annotations.ts` | Annotation model, validation | `chart.ts` |
| `mastery.ts` | Mastery tiers from progress | `progress.ts`, `content.ts` |

**Key invariant:** Domain modules have **zero React imports**. They are pure TypeScript, testable in isolation.

## Data Flow

```
User Action (click, submit)
    ↓
Page Component (calls domain pure functions)
    ↓
Domain Function (returns new state / result)
    ↓
ProgressProvider (dispatches reducer action)
    ↓
Reducer (validates via Zod, updates state)
    ↓
storage.saveProgress() (validates via Zod, writes localStorage)
    ↓
UI Re-renders (subscribed to Context)
```

- **No network layer** — fully local-first
- **No authentication** — single-user, no sessions
- **Client-only state is not an authorization boundary** — acknowledged, no cross-user data exists
- **All untrusted input validated at domain boundary** (import, annotation creation)

## Reliability Measures (Implemented)

| Measure | Implementation |
|---------|----------------|
| Content versioning | `CONTENT_VERSION = 3` in `content.ts`; progress schema version `1` |
| Migrations | `migrateProgress()` handles pre-v1 preview shape; rejects unknown versions |
| Rollback strategy | Corrupt localStorage backed up to `jta.progress.corrupt.v1` before reset |
| Idempotency | XP ledger (`xpAwarded` array) prevents duplicate awards |
| Error boundaries | `ErrorBoundary` wraps app; per-page try/catch in async handlers |
| Structured logging | Console only (dev); no PII, no secrets; production hosting adds own |
| Dependency pinning | `package-lock.json` committed; `npm audit` clean |
| Config per environment | No runtime config needed; `.env.example` documents zero variables |

## Architecture Decision Record

| Decision | Context | Chosen Option | Consequences |
|----------|---------|---------------|--------------|
| **Local-only persistence** | No backend needed for educational game | localStorage + export/import | Clearing browser data loses progress; export mitigates |
| **Hash routing** | Static hosting, no server | `window.location.hash` + `HashChangeEvent` | No server config needed; SEO not required |
| **Zod for all validation** | Runtime safety for untrusted import | Strict schemas on load/save/import | Slight bundle cost (~40 kB); catches corruption early |
| **Pine Script port in TS** | Source traceability required | Faithful port in `engine.ts` | 1,200 lines; quirks preserved (label swaps, startup guard) |
| **Sealed answer keys** | Replay cheating prevention | Private `#fields` in `ReplaySession` + separate module | Keys never in UI state; leak tests verify |
| **No auth provider** | No accounts needed | N/A | Simpler; no CSRF, no session mgmt, no password storage |
| **Synthetic data only** | Honesty requirement | `generateSyntheticSeries()` with seeds | Reproducible, fair, labelled; no market data dependency |
| **Excluded concepts omitted** | Scope rule | Not modeled in domain, not in content, not in tests | Indicator keeps them; game does not |

## Security/Privacy Impact

- **No secrets in frontend** — none exist
- **No user data leaves browser** — verified by zero network calls in build
- **Import validation** — strict Zod schema, size limit (256 KB), version check
- **Corrupt data never silently deleted** — backed up to separate key
- **CSP compatible** — no `dangerouslySetInnerHTML`, no inline scripts, no eval

## Revisit Conditions

- If backend/sync added → introduce auth provider, server authZ, CSRF, RLS
- If Pine Script updated → re-run traceability, update rules.ts, regenerate fixtures
- If content schema changes → bump `CONTENT_VERSION`, add migration if progress schema changes
- If dependency vulnerability found → patch in minor, test, rebuild