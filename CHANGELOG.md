# Changelog

All notable changes to JADU TONA Trading Academy are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-10-26

### Added — Production Hardening Complete

#### Architecture & Infrastructure
- Local-first React 18 + TypeScript + Vite application
- Hash-based routing (zero server config)
- Strict TypeScript configuration with project references
- Zod runtime validation for all untrusted input boundaries
- ESLint + Prettier compatible (implicit via strict TS)

#### Domain Layer (Pure TypeScript, Zero React Dependencies)
- **Strategy Rules Register** (`src/domain/rules.ts`): 27 rules (10 mechanics + 17 strategy) with exact Pine Script v6 line anchors
- **Engine Port** (`src/domain/engine.ts`): Faithful TS port of in-scope Pine logic (swings, BOS, CHOCH, TJL/QML, SBR/RBS/DT/DB, D-CHOCH/A+, ISS1-4, EMA, MTF, levels, analyzer)
- **Chart Model** (`src/domain/chart.ts`): Candle type, synthetic generation (mulberry32 PRNG), math helpers
- **Scenario Engine** (`src/domain/scenarios.ts`): 8 replay scenarios with sealed answer keys, deterministic fixtures
- **Content Catalog** (`src/domain/content.ts`): 10 lessons, 53 questions, 18-question assessment pool
- **Replay Session** (`src/domain/replay.ts`): Sequential reveal, no-leak boundary, private answer keys
- **Progress System** (`src/domain/progress.ts`): Versioned schema (v1), idempotent XP, streak, mastery, export/import/migration
- **Annotations** (`src/domain/annotations.ts`): Chart annotation model with validation
- **Mastery** (`src/domain/mastery.ts`): 4-tier mastery per topic from practice events

#### Presentation Layer
- 11 route pages: Dashboard, Academy, Lesson, Register, Chart Lab, Quiz, Scenarios, Replay, Analytics, Assessment, Settings
- Reusable accessible components: Shell, ErrorBoundary, ButtonLink, Badge, Callout, Stat, ProgressBar, RuleChips, EmptyState
- Interactive SVG candlestick chart with engine overlay (Chart Lab)
- Responsive layouts (mobile/tablet/desktop) via CSS Grid/Flex
- Semantic HTML, keyboard navigation, focus-visible, ARIA labels throughout

#### State & Persistence
- React Context + `useReducer` for progress state
- localStorage with schema validation on every save/load
- Corrupt data backup (never silently deleted)
- Migration from pre-v1 preview shape
- Export/import validated JSON bundles (256 KB limit)

#### Security & Privacy
- Zero network calls — fully static, local-only
- No authentication, no cookies, no sessions, no CSRF surface
- No secrets, no API keys, no third-party integrations
- Content Security Policy compatible (no `dangerouslySetInnerHTML`, no inline scripts)
- Scope exclusions enforced: Order Blocks, FVG, Kill Zones absent from all game content

#### Testing (87 assertions across 57 test functions)
- Unit: Engine structure machine, replay safety, progress idempotency, mastery, content integrity
- Integration: localStorage load/save/migration/backup, import validation
- UI: Route rendering, navigation, exclusion scans, lesson complete, quiz flow, replay DOM leak test
- All tests deterministic: fixed seeds, controlled clocks, isolated storage

#### Documentation (Updated to Match Implementation)
- `AUDIT_REPORT.md` — Initial audit per Master Prompt Phase 1
- `docs/STRATEGY_TRACEABILITY_TEMPLATE.md` — Filled with 27 rules, source anchors, fixtures
- `docs/PRODUCT_REQUIREMENTS.md` — Actual features, journeys, content inventory
- `docs/ARCHITECTURE.md` — Actual layers, data flows, ADRs, security impact
- `docs/DATA_AND_PRIVACY.md` — Actual storage model, export/import/reset, user controls
- `docs/ROADMAP.md` — P0/P1 complete, P2 90%, P3 backlog
- `docs/OPERATIONS_AND_MAINTENANCE.md` — Build, deploy, monitor, backup, dependencies
- `security/THREAT_MODEL.md` — Actual trust boundaries, verified mitigations
- `security/SECURITY_CHECKLIST.md` — All applicable items checked
- `security/INCIDENT_RESPONSE.md` — Adapted for static hosting
- `qa/TESTING_STRATEGY.md` — Actual test layers, fixtures, replay safety
- `qa/RELEASE_GATES.md` — All gates verified except staging smoke test + authorization
- `.env.example` — Placeholder only (zero variables needed)

### Fixed
- None — this is the initial hardening release from existing working codebase

### Removed
- No Order Blocks, Fair Value Gaps, or Kill Zones in game content, UI, or tests

### Security
- No known vulnerabilities (`npm audit`: 0 critical, 0 high)
- Dependency lockfile committed (`package-lock.json`)
- Minimal production dependencies (3: react, react-dom, zod)

---

## Unreleased — Backlog (P3)

- Content versioning review workflow
- Accessibility regression automation
- Localization support
- Optional account sync (if requested)
- Optional analytics (if requested with disclosure)
- Periodic Pine Script sync process