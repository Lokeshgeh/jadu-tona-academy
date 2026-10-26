# JADU TONA Trading Academy — Production Hardening Pack

This pack is a set of implementation instructions and starter documents for hardening the existing JADU TONA Trading Academy game into a maintainable, testable, secure web application.

## Start here

1. Open the existing game repository in your AI developer (Claude Code CLI, another coding agent, or your web-app builder).
2. Give it `prompts/MASTER_IMPLEMENTATION_PROMPT.md`.
3. Attach/provide the original Pine Script v6 source for `RM'S JADU TONA` and the existing application repository.
4. Require the agent to work in the current project, not create an unrelated mockup.
5. Require it to complete the release gates in `qa/RELEASE_GATES.md` before calling the work complete.

## Scope exclusions

The game must not teach, display, implement, test, or include lessons/scenarios for:
- Order Blocks
- Fair Value Gaps (FVG)
- Kill Zones

Do not alter the source indicator merely to satisfy this game scope. These exclusions apply to the learning game and its content.

## Important limits

No prompt or checklist can guarantee that an application is completely secure or production-ready in one pass. This pack requires the developer to implement, test, document, and report evidence, with unresolved risks clearly listed. Never claim a security audit, compliance, strategy parity, or passing test unless evidence exists.

## Pack contents

- `prompts/MASTER_IMPLEMENTATION_PROMPT.md` — main build-and-harden prompt.
- `docs/PRODUCT_REQUIREMENTS.md` — product behavior and quality requirements.
- `docs/ARCHITECTURE.md` — target architecture and engineering principles.
- `docs/DATA_AND_PRIVACY.md` — data minimization and privacy.
- `security/THREAT_MODEL.md` — threat model and mitigations.
- `security/SECURITY_CHECKLIST.md` — security implementation checklist.
- `security/INCIDENT_RESPONSE.md` — incident handling plan.
- `qa/TESTING_STRATEGY.md` — testing approach.
- `qa/RELEASE_GATES.md` — go/no-go release criteria.
- `docs/STRATEGY_TRACEABILITY_TEMPLATE.md` — traceability template to fill from the actual Pine Script.
- `docs/OPERATIONS_AND_MAINTENANCE.md` — backups, monitoring, upgrades, and support.
- `docs/ROADMAP.md` — phased delivery plan.
- `docs/ENVIRONMENT_TEMPLATE.md` — safe environment variable template; never place secrets in this file.
