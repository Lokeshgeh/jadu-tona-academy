# Operations and Maintenance — AS IMPLEMENTED

## Environments
- **Local Development:** `npm run dev` (Vite dev server, HMR)
- **Staging:** Static deployment of `dist/` to preview URL
- **Production:** Static deployment of same `dist/` artifact to production URL
- **No database, no separate secrets per environment** — fully static, local-only

## Deployment

### Build
```bash
npm ci          # Clean install from package-lock.json
npm run verify  # typecheck + test + build (all must pass)
```

### Artifact
- Output: `dist/` (index.html, assets/index-*.js, assets/index-*.css)
- Total: ~429 kB JS (127 kB gzip), 26 kB CSS (6 kB gzip)
- Single-page app, hash routing — works on any static host

### Deploy (Any Static Host)
| Host | Command |
|------|---------|
| Netlify | `netlify deploy --prod --dir=dist` |
| Vercel | `vercel --prod dist` |
| Cloudflare Pages | `wrangler pages deploy dist` |
| GitHub Pages | Push `dist/` to `gh-pages` branch |
| AWS S3 + CloudFront | `aws s3 sync dist/ s3://bucket --delete` |

### Health Check
- Load `/` → should serve `index.html`
- Load `/assets/index-*.js` → 200 OK, correct MIME type
- Open app → Dashboard renders, navigation works

### Smoke Test (Post-Deploy)
1. Open production URL
2. Verify Dashboard shows "Source-traceable chart practice"
3. Navigate: Academy → Lesson → Mark complete (5 XP)
4. Quiz → Chart Basics → Answer question (10 XP)
5. Scenarios → SCN-BOS-01 → Advance to task → Submit correct (25 XP)
6. Settings → Export → Download JSON → Import same file
7. Verify no console errors

### Rollback
- Redeploy previous `dist/` build artifact
- No database migration to roll back
- localStorage is per-browser, unaffected by deploy

### Release Approval
- **Required:** Explicit human approval before production deploy
- **Gate:** All items in `qa/RELEASE_GATES.md` verified
- **No automatic promotion** from staging

## Monitoring

### What to Monitor (Host-Level)
| Metric | Target | Tool |
|--------|--------|------|
| Availability | 99.9% | Host uptime check |
| Error rate (5xx) | 0% | Host logs |
| Latency (p95) | < 200 ms | Host/CDN analytics |
| JS errors | 0/min | Browser error reporting (optional, opt-in only) |

### What NOT to Monitor
- User progress (local only)
- Quiz answers (local only)
- Chart annotations (local only)
- No PII, no secrets, no telemetry by default

## Backups and Recovery

### Local-Only Persistence
- **Server backups do not protect browser-local progress**
- User must export to preserve progress across devices/clears
- Export function tested and documented in Settings

### Corrupt Data Handling
- On load: unreadable localStorage → backed up to `jta.progress.corrupt.v1` → fresh state
- User can download corrupt backup from Settings for manual recovery
- Never silently deleted

### Recovery Procedure (User)
1. Settings → "Download progress JSON" (regular backup)
2. If corruption: Settings → "Download corrupt backup" → manual repair → Import
3. If all lost: Settings → "Clear all local progress" → fresh start

## Dependency Maintenance

### Policy
- Review `npm audit` weekly
- Update dependencies in small batches (patch → minor → major)
- Run `npm run verify` after each batch
- Commit updated `package-lock.json`
- No blind automatic major upgrades

### Current State (2026-10-26)
- `npm audit`: 0 critical, 0 high
- All deps pinned in `package-lock.json`
- 3 production deps, 11 dev deps

## Long-Term Product Health

| Area | Policy |
|------|--------|
| Prioritized backlog | GitHub Issues (or equivalent) |
| Accessibility regression | Manual check per release; `app.test.tsx` covers basics |
| Content review dates | `CONTENT_VERSION` bump on content changes; traceability doc updated |
| Browser support | Last 2 versions of Chrome, Firefox, Safari, Edge |
| Deprecation policy | Progress schema versioned; migration for v2+; content version for question/lesson changes |
| Pine Script sync | When source changes: update `script.txt`, re-run traceability, update `rules.ts`, regenerate fixtures if needed |