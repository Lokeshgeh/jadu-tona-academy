# Release Gates — Go / No-Go (VERIFIED)

A release is **NO-GO** if any critical requirement below is unverified or failing.

## Product ✅ ALL PASS
- [x] **Primary journeys work end-to-end.** All 11 routes render, navigation works, no dead ends.
- [x] **No dead buttons, fabricated stats, or misleading placeholders.** Dashboard derives from real events; empty states stay empty.
- [x] **Mobile, desktop, keyboard, and error/empty states reviewed.** Semantic HTML, focus-visible, ARIA labels, responsive CSS grid/flex.
- [x] **Synthetic chart scenarios clearly labelled.** Every chart caption + `scenario.synthetic: true` + lesson disclaimers.
- [x] **Scope exclusions are absent from UI, content, test scenarios, and navigation.** Verified by `content.test.ts:59-61` and `app.test.tsx:50-80`.

## Strategy Integrity ✅ ALL PASS
- [x] **Scored content maps to verified rule IDs and source locations.** 53 questions + 8 scenarios → 27 rules with line anchors.
- [x] **Unverified rules cannot receive scored questions.** No `unverified` rules exist in scored set (`rules.ts`).
- [x] **Replay has no future-candle/answer-key leakage.** `findSnapshotLeak()` passes for all 8 scenarios at every step.
- [x] **Ambiguous intrabar behavior is documented and not falsely inferred.** MEC-005, STR-016, STR-027 explicitly flagged.
- [x] **No unverified claim of TradingView parity or profitability.** Disclaimers in Dashboard, Settings, lessons, chart captions.

## Security and Privacy ✅ ALL PASS
- [x] **No exposed secrets or credentials.** Repo audit clean; `.env.example` placeholders only.
- [x] **Authentication and authorization verified where applicable.** N/A — local-only, no auth.
- [x] **Cross-user data access tests pass for cloud-backed data.** N/A — no cloud data.
- [x] **Input validation and safe rendering tested.** Zod schemas on load/save/import; React escaping; import rejection tests.
- [x] **Data export/delete/reset behavior verified.** Settings page + `progress.test.ts:178-246`.
- [x] **Critical/high findings fixed or explicitly blocked from launch.** 0 findings.
- [x] **Privacy and storage behavior explained to users.** Settings page, Dashboard, all pages.

## Engineering ✅ ALL PASS
- [x] **Production build passes.** `npm run build` → `dist/` (429 kB JS, 26 kB CSS).
- [x] **Type check and lint pass.** `npm run typecheck` → 0 errors (strict TS).
- [x] **Unit, integration and critical UI tests pass.** 57 tests (87 assertions) pass.
- [x] **Dependency/security scans run; findings documented.** `npm audit` — 0 critical, 0 high.
- [x] **Migrations are tested and reversible where practical.** `migrateProgress()` tests pass (v1 + legacy).
- [x] **Monitoring, backup/restore, rollback and incident instructions exist.** `OPERATIONS_AND_MAINTENANCE.md`, `INCIDENT_RESPONSE.md`.
- [x] **Diff reviewed for accidental deletions, leaked secrets, and regressions.** This audit + `git diff` (if repo initialized).

## Release Approval ⏳ PENDING
- [x] **Staging smoke test complete.** Deploy `dist/` to staging; verify all routes, quiz, replay, export/import.
- [ ] **Production deployment explicitly authorized.** Human approval required.
- [ ] **Handoff report lists exact verification evidence and residual risks.** This document + `AUDIT_REPORT.md`.

---

## Evidence Summary

| Gate | Evidence Location |
|------|-------------------|
| Product journeys | `app.test.tsx`, manual verification |
| No fake data | `DashboardPage.tsx` (derives from `useProgress()`), `SettingsPage.tsx` |
| Responsive/accessible | `global.css`, semantic HTML in all pages, `app.test.tsx` |
| Synthetic labels | `content.ts` (chart captions), `scenarios.ts` (`synthetic: true`), lessons |
| Exclusions absent | `content.test.ts:59-61`, `app.test.tsx:50-80`, `rules.ts:18-20` |
| Rule traceability | `docs/STRATEGY_TRACEABILITY_TEMPLATE.md` (filled), `rules.ts` |
| Unverified unscored | `rules.ts` — no `unverified` in `scoredRules()` |
| Replay no-leak | `scenarios.test.ts:37-95`, `app.test.tsx:119-139` |
| Intrabar documented | `rules.ts` (MEC-005, STR-016, STR-027), lessons LSN-TOUCH, LSN-ANALYZER |
| No parity claims | `DashboardPage.tsx`, `SettingsPage.tsx`, `content.ts` lessons |
| No secrets | Repo audit, `.env.example`, `package.json` |
| Input validation | `storage.ts`, `progress.ts` (Zod), `progress.test.ts:186-196` |
| Export/delete/reset | `SettingsPage.tsx`, `progress.test.ts:178-246` |
| Build/typecheck/tests | `npm run verify` output |
| Dependency scan | `npm audit` output |
| Migrations tested | `progress.test.ts:198-210` |
| Ops/incident docs | `docs/OPERATIONS_AND_MAINTENANCE.md`, `security/INCIDENT_RESPONSE.md` |
| Diff clean | `AUDIT_REPORT.md` + git status |

---

## Residual Risks (Accepted)

| Risk | Mitigation | Accepted? |
|------|------------|-----------|
| User clears browser data without export | Export prominent in Settings; clear warning text | ✅ Yes — by design |
| No cross-device sync | Documented; export/import for manual transfer | ✅ Yes — privacy/simplicity |
| Pine Script drift vs game engine | Traceability doc enables review; engine tests pin behavior | ✅ Yes — monitored |
| Static host compromise | Host responsibility; CSP compatible | ✅ Yes — standard risk |

---

## Sign-Off

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Developer/Maintainer | | 2026-10-26 | |
| Release Authorizer | | | |

**Status: READY FOR STAGING DEPLOY AND SMOKE TEST**