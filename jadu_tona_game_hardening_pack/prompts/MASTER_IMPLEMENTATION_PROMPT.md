# MASTER PROMPT — Build, Secure, Test, and Production-Harden JADU TONA Trading Academy

## Role and mission

Act as a senior full-stack engineer, application security engineer, test engineer, UX/accessibility engineer, and technical writer. You are working on the EXISTING JADU TONA Trading Academy game application. Your job is to make it genuinely usable over the long term, reliable, secure by design, maintainable, and verifiably complete—not just visually polished.

Work directly in the current repository and preserve valuable existing functionality. Do not replace the app with a static mockup or create a separate project unless the current repository is unusable and you explain why first. Do not stop after writing a plan: inspect, implement, test, fix, and document the changes.

## Inputs you must inspect first

1. Entire application repository: source files, package scripts, framework, dependencies, routing, database, authentication, storage, tests, deployment configuration, and current UI.
2. The full original Pine Script v6 source for `RM'S JADU TONA`.
3. Existing game content, scoring, chart, replay, user progress, and any current backend.
4. Existing `.env*` files only to identify variable NAMES and accidental secret exposure; never print secret values in logs or reports.
5. Current build/test/type-check/lint results.

If any required input is missing, do not invent source-specific strategy rules. Implement independent infrastructure work where safe, create explicit TODOs for source-dependent parts, and report the missing input. Do not claim completion for blocked items.

## Non-negotiable scope rules

### Completely exclude from the game
Do not include Order Blocks, Fair Value Gaps (FVG), or Kill Zones anywhere in the learning game: navigation, lessons, quizzes, chart annotations, scenarios, generated content, scoring, tests, onboarding, glossary, marketing copy, or documentation for the game. If the source indicator contains code for these concepts, do not expose those features in the game.

### Preserve and verify other intended topics
Use the Pine Script as the source of truth for whether and how these are supported: swing highs/lows, BOS, CHOCH, structural trend/phases, TJL1/TJL2, QML, SBR/RBS, DT/DB, D-CHOCH and promoted A+ levels, ISS1–ISS4 and scenario variations, EMA default length 132 and its actual smoothing options, multi-timeframe trend dashboard, level lifecycle, wick-vs-close tap behavior, and level accuracy analyzer. Do not assume every item is present or that labels mean what they appear to mean. Create rule IDs and source-line references for verified rules. Distinguish implemented code behavior, explanatory interpretation, and unverified behavior.

Do not invent trade entries/exits, profitability claims, guaranteed outcomes, or financial advice. Do not represent synthetic chart data as historical market data. Clearly label educational simulations and synthetic OHLC scenarios.

## Phase 1 — Audit before edits

Create an initial audit report containing:
- App map and user journeys.
- Current stack and dependency inventory.
- Existing feature inventory: working, partially working, broken, absent.
- Data flow map: browser, server, database, storage, third-party services.
- Authentication and authorization model.
- Existing privacy/security weaknesses.
- Current test/build/type-check/lint baseline.
- Risk-ranked remediation plan.
- Exact files expected to change and why.

Do not delete or rewrite major components until you understand how they work. Make a recoverable git checkpoint/branch if git is available. Never overwrite user work without preserving it.

## Phase 2 — Product and UX completion

Implement or finish these real, usable areas:
1. Dashboard: truthful progress, module mastery, recent activity, revision queue, and helpful empty states.
2. Strategy Academy: lessons backed by verified rule IDs and source references.
3. Chart Lab: functional candlestick chart, OHLC inspection, chart navigation, and working annotation create/edit/delete actions for supported structural concepts.
4. Quiz Arena: multiple-choice, true/false, structure identification, chart annotation, rule-violation detection, and next-state prediction only where deterministic verified answer keys exist.
5. Replay: reveal candles sequentially; hide future candles and answer labels until submission. Prevent future-data leakage. Label synthetic data conspicuously.
6. Scenario Library: difficulty, objectives, source rule IDs, verified answer keys, retry/reset.
7. Progress and motivation: XP, achievements, mastery, streaks, and final assessment. Reward correctness and disciplined rule-following over speed. No manipulative streak pressure or punitive loss of earned progress.
8. Analytics: accuracy by verified topic, recurring mistakes, and review recommendations. Do not fabricate data.
9. Settings: data export, data deletion/reset, accessibility preferences, and account/session controls where relevant.
10. Responsive layout, readable typography, keyboard navigation, accessible labels, loading/error/empty states, and useful mobile/tablet/desktop layouts.

Every button and navigation item must perform a real action or be clearly disabled with an explanation. No fake counters, fake testimonials, dead controls, placeholder pages, or decorative controls that imply functionality.

## Phase 3 — Architecture and maintainability

- Keep UI, domain rules, data access, and infrastructure separated.
- Use strict types and validate untrusted data at runtime.
- Centralize strategy rules in deterministic, testable domain modules.
- Use migrations for database schema changes.
- Use versioned content schemas so lessons and scenarios can evolve without corrupting old progress.
- Add stable IDs for rules, lessons, questions, scenarios, achievements, and events.
- Make scoring idempotent so retries/network resubmissions do not award XP multiple times.
- Add error boundaries and graceful failure handling.
- Use structured, privacy-safe logging with request correlation IDs; never log passwords, access tokens, secrets, or unnecessary personal data.
- Pin and review dependency versions sensibly; remove unused dependencies.
- Keep configuration per environment; do not hardcode credentials or production URLs.
- Document setup, local development, test, build, migration, deployment, rollback, backup/restore, and incident response.

Do not add a complex backend just for appearance. If accounts, cloud sync, leaderboards, payments, or remote analytics are not needed, do not introduce them by default. Prefer a simple architecture with a clear upgrade path.

## Phase 4 — Security requirements

Follow `security/THREAT_MODEL.md` and `security/SECURITY_CHECKLIST.md`. At minimum:
- Validate and normalize all client-controlled inputs on the server as well as client-side.
- Enforce authorization server-side for every protected resource and action. Never trust a hidden button or client-side role.
- Use a mature authentication provider/library if accounts are needed; do not implement custom cryptography or roll your own password/session system.
- Use secure, HttpOnly, SameSite cookies for browser sessions when applicable; use Secure in HTTPS environments. Protect state-changing requests against CSRF when cookie auth is used.
- Rate-limit login, registration, password recovery, quiz submission, export, and expensive endpoints as appropriate.
- Prevent SQL/NoSQL injection using parameterized queries or safe ORM APIs.
- Prevent XSS: escape untrusted output, sanitize allowed rich text, avoid unsafe HTML injection.
- Prevent SSRF, path traversal, open redirects, insecure file upload, and mass assignment where applicable.
- Apply a restrictive Content Security Policy and appropriate security headers compatible with the app.
- Configure CORS narrowly; do not use wildcard origins with credentials.
- Keep secrets in the deployment secret manager/environment, never in source control, frontend bundles, screenshots, generated docs, or client storage.
- Check for leaked secrets without displaying them. If a real secret is found, report the variable/file location without repeating its value and recommend immediate rotation.
- Use least-privilege database/service credentials and row-level security where supported.
- Keep user data private by default; no public profiles/leaderboards unless explicitly requested and access-controlled.
- Do not collect financial account credentials, broker passwords, or exchange API keys.
- Do not send user chart annotations or personal data to third-party AI services unless the user explicitly opts in and the data flow is documented.
- Add dependency and static security checks appropriate to the actual stack.
- Never claim the app is “unhackable” or “fully secure”; report tested controls and residual risks.

## Phase 5 — Data integrity and privacy

Use `docs/DATA_AND_PRIVACY.md`. Minimize collection. Make progress storage resilient and schema-versioned. If using local-only storage, explain that clearing browser data or switching devices may remove progress; provide export/import if feasible. If using cloud storage, implement proper user isolation and access control. Make data deletion work and test it. Keep analytics derived from actual practice events. Avoid collecting precise location, contacts, or unrelated profile information.

## Phase 6 — Strategy and replay correctness

- Create `docs/STRATEGY_TRACEABILITY_TEMPLATE.md` from the actual source.
- Each scored question/scenario must map to a verified rule ID, source location, expected answer, and rationale.
- If a rule cannot be confidently extracted, mark it `UNVERIFIED` and do not score it.
- Keep deterministic answer evaluation separate from presentation.
- Prevent lookahead bias: at replay step N, no UI, API response, state, tooltip, chart scale, or answer key may expose candles after N unless that exposure is part of the exercise after submission.
- Handle ambiguous OHLC intrabar order explicitly; do not assume whether high or low happened first without lower-timeframe data.
- Test wick-touch and close-through conditions exactly as the source defines them.
- Do not claim exact TradingView parity unless tested against a documented set of fixtures.

## Phase 7 — Required tests and verification

Add tests appropriate to the actual stack:
- Unit tests for domain rules and scoring.
- Integration tests for persistence, authorization, validation, export/delete, and session behavior.
- UI tests for critical flows, keyboard usability, and error states.
- Replay tests that prove future candles and answer keys are not leaked before submission.
- Regression tests for wick-versus-close behavior, level classification/lifecycle, ISS transitions, and all other source-verified concepts.
- Security tests for unauthorized access, cross-user data access, input validation, XSS payload handling, CSRF where applicable, rate limits, and safe error responses.
- Dependency audit and static analysis.
- Production build, type check, lint, migrations, and smoke tests.

Do not merely add tests that always pass or mock away the behavior under test. Run the tests and fix failures. If a command cannot run, record the reason and the exact command.

## Phase 8 — Documentation and handoff

Create or update:
- `README.md`
- `docs/PRODUCT_REQUIREMENTS.md`
- `docs/ARCHITECTURE.md`
- `docs/DATA_AND_PRIVACY.md`
- `docs/STRATEGY_TRACEABILITY_TEMPLATE.md`
- `docs/ROADMAP.md`
- `docs/OPERATIONS_AND_MAINTENANCE.md`
- `security/THREAT_MODEL.md`
- `security/SECURITY_CHECKLIST.md`
- `security/INCIDENT_RESPONSE.md`
- `qa/TESTING_STRATEGY.md`
- `qa/RELEASE_GATES.md`
- `.env.example` with placeholders only
- A changelog entry for this implementation.

Do not replace existing useful documentation blindly. Merge it, preserving relevant content.

## Phase 9 — Release gates

Use `qa/RELEASE_GATES.md`. Do not publish/deploy to production, enable billing, expose user data, or change production credentials without explicit authorization. Prepare deployment instructions and a staging preview. Ask before destructive data migrations or actions that affect production users.

## Work method

1. Inspect and report baseline.
2. Write a concise plan with risks and file-level changes.
3. Implement in small, coherent batches.
4. Run tests after each batch.
5. Review the actual diff for regressions, secrets, and scope exclusions.
6. Run final test/build/security checks.
7. Produce a handoff report with:
   - What changed and files touched.
   - Features genuinely implemented.
   - Commands run and their exact results.
   - Security controls implemented and evidence.
   - Tests passed/failed/not run.
   - Strategy rules verified/unverified.
   - Known issues and residual risks.
   - Deployment/rollback instructions.
   - Any required user decisions.

Do not stop after planning. Do not claim a command passed unless you ran it. Do not claim security certification. If time or context limits prevent finishing, prioritize data safety, core functionality, tests, and clear remaining-work notes.

## Definition of done

Done means the existing app has been improved in code; critical user flows work; scope exclusions are absent from game UI/content/tests; strategy content is source-traceable; persistence and privacy behavior are documented; authorization and input validation are tested where applicable; build and tests have been run; no known critical/high-severity issue is silently ignored; and the handoff report distinguishes verified facts from remaining uncertainty.
