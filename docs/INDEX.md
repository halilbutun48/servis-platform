# SeferPakt Engineering Knowledge Center

> This is the canonical engineering entrypoint for the repository at the current HEAD. It indexes owners; it does not replace code, schema, configuration, check output, or milestone SSOTs.

## START HERE

1. [Product and architecture](architecture/ENGINEERING_ARCHITECTURE.md)
2. [Codebase index](architecture/CODEBASE_INDEX.md)
3. [Role, CompanyKind, RBAC and tenant model](roles/ROLE_CONTEXT_AND_TENANT_MODEL.md)
4. [Capability ownership map](domains/CAPABILITY_OWNERSHIP_MAP.md)
5. [Database, Prisma and migration owners](PRISMA_SCHEMA_MODULARIZATION_01.md) · [migration contract](DATABASE_MIGRATION_BASELINE_AND_LIVE_ADOPTION_01.md)
6. [Operations, recovery and incidents](operations/OPERATIONS_RECOVERY_AND_INCIDENT_INDEX.md)
7. [Checks, evidence and CI](testing/TEST_CHECK_AND_CI_OWNERSHIP_MAP.md)
8. [Integration ownership](integrations/INTEGRATION_OWNERSHIP_MAP.md)
9. [ADR inventory](adr/INDEX.md)

The machine-readable companion is [the #16 documentation contract](PROJECT_DOCUMENTATION_ARCHITECTURE_AND_CODEBASE_INDEX_01.json). It is validated by `backend/scripts/project_documentation_architecture_and_codebase_index_01_check.js` and is an index, not a business-data SSOT.

## Product overview

SeferPakt is an enterprise shuttle/service operations platform. The current repository joins procurement and marketplace preparation, agreements, shifts, routes, dispatch, GPS/evidence, finance and cost reasoning, reconciliation, accounting-export preparation, Sefer Abi decision support, tenant/security controls, and backup/recovery tooling.

The engineering principle is **İÇERİDE GÜÇLÜ / DIŞARIDA BASİT**: canonical owners and evidence stay detailed; user-facing surfaces expose only the approved, understandable layer.

## Current frontier

### PRE-#18 immutable closure

PRE-#18 acceptance and the No-Surprise Repository Exit are GREEN at the current frontier. The final terminology / Sefer Abi residual and bounded public-runtime recheck are closed (`PUBLIC_RUNTIME_CURRENT_SOURCE_MATCH = PASS`, visible missing/unknown/weak raw-status counts `0`). `487/487` repository-owned candidates are classified with no unexplained state. `#18` has not started; this is the exact immutable closure stage, and proven-closed work is reopened only for concrete newer regression evidence.

At the current repository frontier, #1–#14 and #16 are closed according to the current milestone evidence; #17 remains the role-based navigation/task-home owner and #15 remains a locked future owner. PRE-#18 acceptance and documentation/SSOT reconciliation are green at the current HEAD: `verify:repo` and `verify:final` pass, KVKK is `262/262`, role/data isolation is `216/216`, and active/product unowned is `0`. Foundation Exit is `GREEN PRESERVED`, ROOM/OTHER423 is `PROVEN_CLOSED`, and the No-Surprise Repository Exit classification is green. PRE-#18 is `FINAL CLOSURE READY`; #18 is not started. The canonical gap disposition is in [the #14 gap register](PROJECT_WIDE_GAP_AND_RELEASE_READINESS_AUDIT_01_GAP_REGISTER.json): six discovered gaps, one fixed in #14, five deferred to their locked owners, and no unresolved blocker or critical.

Future ownership is explicit: #15 terminology sweep, #18 UI anchors, #19 natural-language form preparation, #20 optimizer/disruption recovery, #21 safe actions, #22–#29 voice, #30–#33 proactive/autopilot, #35/#38 production security, #36 physical-device proof, and #38 production hardening are not current implementation claims. #17’s current navigation/task-home and single Sefer Abi entry are documented in [the #17 owner map](ROLE_BASED_SIMPLE_NAVIGATION_AND_TASK_HOME_01.md); its future boundaries remain explicitly excluded.

## Canonical authority map

| Question | Authoritative owner |
|---|---|
| Product/milestone truth | [PRIMER_SSOT.md](PRIMER_SSOT.md), [MILESTONE_REGISTRY_V1.md](MILESTONE_REGISTRY_V1.md), [CHECKLIST_SSOT.md](CHECKLIST_SSOT.md) |
| Check command map | [SCRIPT_KILAVUZU_MILESTONE_HARITASI.md](SCRIPT_KILAVUZU_MILESTONE_HARITASI.md) and package scripts |
| Schema and generated client | `backend/prisma/schema.prisma`, `backend/prisma/schema/*.prisma`, #10 owner |
| Business calculations | #1–#6 domain owners in [the capability map](domains/CAPABILITY_OWNERSHIP_MAP.md) |
| Verification | `backend/scripts/run_repo_check_chain.js`, product-extension registry and focused check owners |
| Documentation census | `backend/scripts/lib/documentationRegistryV1.js` and `backend/indexes/documentation_registry_v1.json` |

## Safe change path

Find the canonical owner → read its scope and approval boundary → run the focused check → run the affected regression chain → inspect current-head evidence → stage exact paths → run `npm run check:product-extensions`, `npm run verify:repo`, and `npm run verify:final` as applicable → commit according to milestone policy.

Protected runtime-data is never documentation evidence and remains untouched:

`backend/artifacts/runtime-data/` protected JSON files are excluded from edits, staging, commits, exports, and documentation examples.

## Navigation by domain

- [Architecture](architecture/ENGINEERING_ARCHITECTURE.md)
- [Repository/codebase](architecture/CODEBASE_INDEX.md)
- [Roles and tenant boundaries](roles/ROLE_CONTEXT_AND_TENANT_MODEL.md)
- [Capabilities and owners](domains/CAPABILITY_OWNERSHIP_MAP.md)
- [#17 role navigation and task home](ROLE_BASED_SIMPLE_NAVIGATION_AND_TASK_HOME_01.md)
- [Operations and incidents](operations/OPERATIONS_RECOVERY_AND_INCIDENT_INDEX.md)
- [Checks and CI](testing/TEST_CHECK_AND_CI_OWNERSHIP_MAP.md)
- [Integrations](integrations/INTEGRATION_OWNERSHIP_MAP.md)
- [ADRs](adr/INDEX.md)

Historical and generated material remains discoverable through the existing documentation registry. `docs/_archive/` and `docs/overlays/` are historical/overlay records and are not current product or milestone owners.
