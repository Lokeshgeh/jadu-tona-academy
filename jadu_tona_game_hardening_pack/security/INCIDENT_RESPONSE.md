# Incident Response Playbook — AS IMPLEMENTED

## Preparation
- **Access owners:** Single developer/maintainer (local-only app)
- **Deployment rollback:** Redeploy previous `dist/` artifact (static files)
- **Backups:** User-controlled export (`jadu-tona-progress-YYYY-MM-DD.json`)
- **Emergency credentials:** None — no server, no database, no API keys
- **Production services inventory:** Static host (Netlify/Vercel/CF Pages/GH Pages/S3+CF) + DNS

## Detection
Signals may include:
- Host reports 5xx errors or downtime
- User reports app not loading (JS error, CSP block)
- `npm audit` reports new critical vulnerability
- Pine Script source update breaks traceability

## Response Steps

### 1. Triage Severity and Scope
| Severity | Criteria | Response Time |
|----------|----------|---------------|
| **Critical** | App unavailable, data corruption risk, security breach | < 1 hour |
| **High** | Major feature broken (quiz, replay, export), CSP violation | < 4 hours |
| **Medium** | Minor UI bug, content typo, non-blocking console warning | < 24 hours |
| **Low** | Cosmetic, documentation, backlog item | Next sprint |

- Preserve privacy-safe logs (host access logs, build logs)
- **Never log user progress, annotations, or answers**

### 2. Contain
- **Static host issue:** Redeploy last known-good `dist/` build
- **CSP violation:** Check `Content-Security-Policy` header on host; adjust if needed
- **Dependency vulnerability:** `npm update <pkg>`, `npm run verify`, rebuild, redeploy
- **Content/strategy drift:** Pin `script.txt` to known-good version; update traceability doc

### 3. Secret Exposure (Not Applicable)
- No secrets exist in this application
- If host credentials compromised: rotate at host provider immediately

### 4. Assess User Data Impact
- **No user data on server** — all progress in user's browser localStorage
- **No cross-user impact possible**
- User progress unaffected by deploy/rollback

### 5. Restore
- Redeploy verified `dist/` build
- Verify staging smoke test passes
- Confirm production URL loads Dashboard

### 6. Notify
- **Internal only** (single maintainer)
- No user notification needed (no accounts, no data on server)
- No legal/provider notification (no PII, no breach possible)

### 7. Fix Root Cause + Regression Test
- Add test case for the failure mode if not covered
- Run `npm run verify` before redeploy

### 8. Document
| Field | Example |
|-------|---------|
| Date | 2026-10-26 |
| Severity | Medium |
| Trigger | `npm audit` flagged CVE in transitive dep |
| Impact | None — dev dependency only |
| Containment | Updated dep, rebuilt, redeployed |
| Root Cause | Transitive dependency update |
| Fix | Pinned version in `package-lock.json` |
| Regression Test | `npm audit` in CI |
| Follow-up Owner | Maintainer |
| Prevention | Weekly `npm audit` schedule |

## After Action
- Run blameless review (self-review for solo maintainer)
- Track corrective actions to completion
- **Do not claim there was no data exposure unless evidence supports it** — in this architecture, no user data exists on server, so exposure is impossible by design

---

## Contact
- **Maintainer:** Local developer
- **Host support:** Per hosting provider (Netlify/Vercel/Cloudflare/GitHub/AWS)
- **No third-party incident response team**