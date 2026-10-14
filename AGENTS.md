# AGENTS.md

## Repository governance entrypoint

Before any bounded work in this repository, read [`docs/AGENTS.md`](docs/AGENTS.md). It is the detailed, canonical execution-governance instruction for all milestones and platforms.

The canonical state owners remain unchanged:

- `docs/NEXT_BACKLOG_V1.md` owns the executing active frontier.
- `docs/MILESTONE_REGISTRY_V1.md` owns milestone contracts and freeze provenance.
- `docs/PRIMER_SSOT.md` is the canonical living product/execution primer.
- `docs/LOCKED_INVARIANT_REGISTRY_V1.json` and its violation ledger own locked-invariant status.

Do not create a competing governance registry, state owner or platform-specific interpretation of these rules. Preserve the current repository/source precedence, locked product and security decisions, immutable evidence, and the existing 40-step closure chain.

The standing conditional local `personel_api` restart policy is defined in `docs/AGENTS.md`; it is not permission to restart production, Docker Desktop, databases, other services, or to start a second backend.

## Permanent acceptance boundaries

- A checker or code GREEN result alone is not product acceptance; claims require current backend/frontend, real Chromium/mobile, role/tenant and semantic user-visible evidence.
- Package acceptance, ROOM D-Level acceptance, M18 closure and final product acceptance remain separate decisions.
- Do not reopen proven-closed work without concrete regression evidence; resolve proven defects at the smallest structural canonical owner.
- No external LLM/API/SDK, unauthorized action or business-data mutation is allowed; operations requiring user approval must not be applied silently.
- Keep the existing 40-step roadmap and its state owners; stable rules belong here and changing progress belongs in `docs/NEXT_BACKLOG_V1.md`.
- Keep total monthly infrastructure cost within 15,000 TL.
