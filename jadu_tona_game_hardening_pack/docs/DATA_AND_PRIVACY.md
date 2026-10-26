# Data and Privacy — AS IMPLEMENTED

## Data Minimization (Enforced)
The application collects **only** data needed for learning progress:
- ✅ XP ledger (question/scenario/lesson/assessment awards)
- ✅ Attempt history (question ID, topic, selected answer, correct, mode, timestamp)
- ✅ Scenario attempt history (scenario ID, selected answer, correct, timestamp)
- ✅ Assessment records (score, pass/fail, timestamp)
- ✅ Lesson completion flags
- ✅ Daily streak counter (current, best, last day)
- ✅ Chart annotations (kind, price, bar index, text, timestamp)
- ❌ No precise location
- ❌ No contacts
- ❌ No financial account credentials
- ❌ No broker passwords
- ❌ No exchange API keys

## Storage Model (Honest Disclosure)

| Data Category | Where Stored | Cross-Device Sync | Survives Browser Clear |
|---------------|--------------|-------------------|------------------------|
| Progress (XP, attempts, streak, lessons, assessments) | localStorage (`jta.progress.v1`) | ❌ No — browser-only | ❌ No — export to preserve |
| Chart annotations | localStorage (inside progress) | ❌ No | ❌ No — export to preserve |
| Corrupt backup | localStorage (`jta.progress.corrupt.v1`) | ❌ No | ❌ No |
| No other storage | — | — | — |

> **Clear statement:** There is no account, no cloud sync, no backend. Progress lives in this browser's localStorage until you export it or clear it. Clearing site data removes all progress irreversibly unless you exported first.

## Export and Deletion (Implemented & Tested)

### Export
- **Format:** JSON bundle (`jadu-tona-academy`, bundleVersion 1)
- **Contents:** Full ProgressState (all categories above)
- **Validation:** Strict Zod schema on import; size limit 256 KB
- **Filename:** `jadu-tona-progress-YYYY-MM-DD.json`
- **Trigger:** Settings page → "Download progress JSON"

### Import
- **Validation:** Bundle schema → progress schema migration → strict parse
- **Rejection reasons:** Invalid JSON, wrong app/bundle version, oversized, unsupported progress version, validation failure
- **Behavior:** Failed import leaves existing progress untouched
- **Trigger:** Settings page → "Choose JSON file"

### Reset
- **Action:** Clears `jta.progress.v1`, creates fresh empty state in memory
- **Confirmation:** Requires typing "RESET"
- **Preserves:** Corrupt backup key (`jta.progress.corrupt.v1`)
- **Trigger:** Settings page → "Clear all local progress"

### Tested
- Round-trip export/import: ✅ `progress.test.ts:179-184`
- Malformed/oversized/foreign rejection: ✅ `progress.test.ts:186-196`
- Legacy migration: ✅ `progress.test.ts:198-210`
- Corrupt backup on load: ✅ `progress.test.ts:232-239`
- Invalid state rejected on save: ✅ `progress.test.ts:241-246`

## Third Parties and AI (None)

| Integration | Status |
|-------------|--------|
| Analytics service | ❌ Not used |
| AI provider (for user data) | ❌ Not used |
| CDN for code | ❌ Vite bundles all deps |
| External fonts | ❌ System fonts only |
| Market data feed | ❌ Synthetic only |

**No user practice history, annotations, or profile data is sent anywhere.**

## Retention and Telemetry

| Data | Retention | Notes |
|------|-----------|-------|
| localStorage progress | Until user clears or exports | No automatic expiry |
| Corrupt backup | Until overwritten or cleared | Single backup slot |
| Application logs | Console only (dev) | No persistent logging in production build |
| Build artifacts | `dist/` only | No telemetry in bundle |

## User Controls (Implemented in Settings Page)

- ✅ **View storage diagnostics** — keys, sizes, last activity, record timestamps
- ✅ **Export progress** — validated JSON bundle
- ✅ **Import progress** — validated, size-limited, schema-checked
- ✅ **Download corrupt backup** — if one exists
- ✅ **Reset all progress** — confirmed by typing "RESET"
- ✅ **Read privacy/scope summary** — plain language, no legalese

## Privacy Notice (Displayed in Settings)

> "There is no account, sync, analytics service, or backend. Progress lives in localStorage until you export it or clear it."
>
> "Clearing browser data is irreversible unless you exported first. The app cannot recover localStorage after the browser removes it."
>
> "Charts are synthetic and labelled; no live or historical market feed exists in this app."

## Compliance Notes

- **GDPR/CCPA:** No personal data collected → no regulatory obligations beyond honest disclosure
- **COPPA:** No accounts, no data from children knowingly collected
- **Financial regulations:** Not a trading platform, no advice, no execution, no broker integration