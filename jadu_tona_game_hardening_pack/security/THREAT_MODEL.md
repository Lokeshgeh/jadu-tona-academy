# Threat Model — AS IMPLEMENTED

## Assets Protected
- User learning progress (XP, attempts, streak, annotations)
- Strategy source content integrity (rules, questions, scenarios)
- Application availability and user trust
- No credentials, no API keys, no financial data, no PII

## Trust Boundaries (Actual)

| Boundary | Implementation |
|----------|----------------|
| Browser ↔ Server | **None** — no server, static files only |
| Authenticated ↔ Unauthenticated | **None** — no authentication |
| User A ↔ User B | **None** — single-user localStorage |
| App ↔ Database | **None** — localStorage only |
| App ↔ Third Party | **None** — zero network calls |
| Dev ↔ Prod | Separate `dist/` builds; no shared state |

## Threats and Mitigations (Verified)

| Threat | Example | Mitigation | Verified By |
|--------|---------|------------|-------------|
| Broken access control | User changes ID to read another's progress | N/A — no multi-user, no IDs | Architecture |
| Credential/secret leak | API key in bundle or git | No secrets exist; `.env.example` placeholders only | Repo audit |
| Injection/XSS | Stored annotation contains markup | Zod validation on import; no `dangerouslySetInnerHTML`; React escapes by default | `annotations.ts`, `progress.test.ts` |
| CSRF/session theft | Malicious site triggers state change | No cookies, no sessions, no auth | Architecture |
| Brute force/abuse | Automated quiz submissions | No network endpoints; local rate limit via UI | N/A |
| Replay cheating/data leakage | Future candles or answer key exposed early | `ReplaySession` private fields + `findSnapshotLeak` tests | `scenarios.test.ts:37-95` |
| Score manipulation | Client directly awards XP | Idempotent XP ledger (`xpAwarded` array); server would recompute if cloud | `progress.test.ts:29-55` |
| Data loss | Browser reset or failed migration | Export/import tested; corrupt backup on load; migration from legacy | `progress.test.ts:178-217` |
| Dependency compromise | Vulnerable package | `npm audit` clean; lockfile committed; minimal deps | `package-lock.json` |
| Unsafe upload/import | Malicious JSON or file | Strict Zod schema, 256 KB limit, version check, foreign bundle rejection | `progress.test.ts:186-196` |
| Service exhaustion | Huge payloads/repeated requests | No network service; localStorage quota only | Architecture |
| Privacy leakage | Logs contain personal data/tokens | No persistent logs; console only in dev; no PII collected | `store.tsx`, build output |
| Misleading education | Invented rules scored as correct | All 27 rules source-verified; unverified=unscored; exclusions enforced | `rules.ts`, `content.test.ts:59-61` |
| Synthetic-data confusion | Generated candles labelled historical | Every chart caption + scenario `synthetic: true` + lessons explicit | `content.ts`, `scenarios.ts`, lessons |

## Risk Prioritization (Actual)

| Risk | Likelihood | Impact | Status |
|------|------------|--------|--------|
| User clears browser data without export | Medium | Progress lost | Mitigated: export prominent in Settings, clear warning |
| Pine Script drift vs game engine | Low | Strategy mismatch | Mitigated: traceability doc, engine tests pin behavior |
| Dependency vulnerability | Low | Supply chain | Mitigated: weekly audit, minimal deps, lockfile |
| Static host compromise | Low | Served malicious code | Host responsibility; CSP compatible |
| User misinterprets simulation as real | Low | Financial harm | Mitigated: synthetic labels everywhere, disclaimers |

## Accepted Risks
1. **LocalStorage loss on browser clear** — Accepted; export/import provided; documented in Settings
2. **No cross-device sync** — Accepted; by design for privacy/simplicity
3. **No server-side replay validation** — Accepted; client-only, educational not competitive

*Review date: Next Pine Script update or 2027-10-26, whichever first*