# Roadmap — AS IMPLEMENTED

## P0 — Stabilize and Protect ✅ COMPLETE
- ✅ Audit current repository and source (AUDIT_REPORT.md created)
- ✅ Fix broken critical user flows (all routes work, no dead buttons)
- ✅ Remove fake data and nonfunctional controls (dashboard derives from real events)
- ✅ Establish rule traceability and scope exclusions (27 rules, 53 questions, 8 scenarios, all verified)
- ✅ Fix secret handling, input validation, authorization and data exposure issues (local-only, Zod validated, no leaks)
- ✅ Add core regression tests and reliable persistence (57 tests pass, localStorage with migration/backup)

## P1 — Complete the Learning Loop ✅ COMPLETE
- ✅ Finish lessons, quiz feedback, chart annotations, replay, scoring and review queue
  - 10 lessons with rule-linked sections and key points
  - 53 questions across all topics with instant feedback and explanations
  - Chart Lab with interactive SVG chart, engine overlay, config panel
  - 8 scenarios with sequential reveal, sealed answers, leak tests
  - Idempotent scoring (XP awarded once per correct answer)
  - Analytics with topic accuracy, mastery tiers, weakest-topic link
- ✅ Make progress, mastery, and analytics derive from real events
  - XP from recorded attempts only
  - Mastery from 3+ answers per topic
  - Streak from actual practice days
  - No fabricated counters
- ✅ Add accessible responsive states and export/reset controls
  - Semantic HTML, keyboard navigation, focus visible, ARIA labels
  - Settings page: export/import/reset, storage diagnostics
  - Mobile/tablet/desktop layouts via CSS grid/flex

## P2 — Production Readiness 🟡 MOSTLY COMPLETE
- ✅ Add integration/e2e/security tests
  - 57 unit/integration tests (domain, replay, progress, content, app shell)
  - Replay leak tests for all 8 scenarios
  - Cross-route exclusion scan (Order Blocks, FVG, Kill Zones)
  - Import validation, corrupt backup, migration tests
- ✅ Add safe logs, monitoring, migrations and recovery plan
  - Structured console logging (dev)
  - Progress schema migration (v1 + legacy)
  - Corrupt data backup on load
  - localStorage save validation
- ✅ Complete privacy, deployment and incident-response docs
  - DATA_AND_PRIVACY.md updated
  - OPERATIONS_AND_MAINTENANCE.md updated (below)
  - INCIDENT_RESPONSE.md updated (below)
  - SECURITY_CHECKLIST.md updated (below)
  - THREAT_MODEL.md updated (below)
- 🟡 Test staging and rollback
  - Build produces `dist/` ready for static hosting
  - Staging preview: deploy `dist/` to any static host (Netlify, Vercel, Cloudflare Pages, GitHub Pages, S3+CloudFront)
  - Rollback: redeploy previous `dist/` build
  - **Action needed:** Deploy to staging, smoke test, authorize production

## P3 — Long-Term Improvements 📋 BACKLOG
- 📋 Content versioning and review workflow (current `CONTENT_VERSION=3`, progress schema v1)
- 📋 Better accessibility and localization (current: English, semantic HTML, focus styles)
- 📋 Optional account sync only when privacy and authorization are ready (not planned)
- 📋 Optional analytics only with transparent disclosure and data minimization (not planned)
- 📋 Periodic strategy-rule review when the Pine Script changes (traceability doc enables this)

---

## Current Status Summary

| Phase | Status | Blockers |
|-------|--------|----------|
| P0 | ✅ Done | None |
| P1 | ✅ Done | None |
| P2 | 🟡 90% | Staging deploy + smoke test |
| P3 | 📋 Backlog | Not prioritized |

## Next Steps for Release

1. **Deploy `dist/` to staging** (any static host)
2. **Run staging smoke test** — verify all 11 routes load, quiz/replay work, export/import works
3. **Authorize production deployment** — explicit approval required per RELEASE_GATES.md
4. **Deploy to production** — same `dist/` artifact
5. **Post-deploy verification** — confirm CSP headers, HTTPS, cache headers on host