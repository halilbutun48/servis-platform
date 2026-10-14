# Locked invariant reconciliation inventory

This inventory is the bounded foundation-hardening record for the canonical
registry in [`LOCKED_INVARIANT_REGISTRY_V1.json`](LOCKED_INVARIANT_REGISTRY_V1.json).
The JSON registry is the single machine-readable authority. This document
records the deterministic source reconciliation used to build it; it is not a
second rule authority.

## Sources inspected

- `docs/PRIMER_SSOT.md` — current Sefer Abi semantic, authorization, lifecycle,
  terminology, and M18 contracts.
- `docs/AGENTS.md` — repository workflow, verification, scope, and no-surprise
  rules.
- `docs/MILESTONE_GATE_MATRIX.md` — milestone and closure gate obligations.
- `docs/CONVERSATION_CLOSURE_INDEX_V1.md` — closure/evidence precedence.
- `docs/AI_RESPONSE_SEMANTIC_QUALITY_GATE_01.md` — semantic truth and
  response-quality expectations.
- `docs/KVKK_AYDINLATMA_ENVANTERI_V1.md` and the security/KVKK check owners —
  privacy and scope boundaries.
- `docs/FINANCIAL_OPERATIONS_SURFACE_AND_RBAC_01.md`,
  `docs/COMPANY_BUDGET_AND_SERVICE_COST_01.md`, and the financial check owners —
  financial/reference truth.
- Existing permanent check owners named in the registry, including the M18
  anchor, guided-task, guided-draft, terminology, security, financial,
  ownership, current-head, audit, and verification checks.

## Reconciliation outcome

- Durable rules were normalized into stable `INVARIANT_ID` records by family.
- Repeated prose aliases (for example, guidance-versus-execution,
  task-state-versus-authorization, and future-step-versus-live-step) are
  represented once and retain aliases in the registry metadata.
- Historical HEADs, tunnel URLs, draft IDs, transient counts, and runtime
  incidents were excluded as non-invariants.
- No contradictory active rule was promoted. The visible approval terminology
  rule is normalized to `Kullanıcı onayı` / `Onayınız gerekli`.
- Existing checks without a registry record are retained as legacy owners until
  their coverage is explicitly mapped; they are not silently treated as proof.
- Rules that have an owner but no current, machine-verifiable proof are marked
  `REGISTERED_UNPROVEN`. The global suite reports these as `COVERAGE_GAP` and
  stops progression.
- Applicability is phase-aware. Each invariant and subrule declares activation
  phases; only rules activated by the current phase are `DUE_NOW`. Later
  lifecycle requirements remain registered as `NOT_DUE_YET` and are not
  counted as proof or silently treated as passing.
- Every subrule also carries a `ruleLifecycleStatus` and `lifecycleAudit`
  trace. The current audit found `ACTIVE=107`, `CONTEXTUAL=8`, and
  `REVISED=SUPERSEDED=RETIRED=REQUIRES_REVIEW=0`; the eight contextual rules
  are the later-phase closure requirements. No historical rule was retired or
  superseded merely to remove a blocker.
- M18 proof records use the existing current-head/current-closure identity
  owners with `RAW_SHA256_PER_FILE` over the declared proof-relevant source
  sets. The ledger records the exact working-tree path, byte count, and SHA-256
  for that snapshot. This does not replace committed-head, immutable-tag, push,
  or remote-parity checks; those remain mandatory at their declared phases.
- The status ledger separates `PROVEN_FAIL` from `UNPROVEN`,
  `COVERAGE_GAP`, `REPO_STATE_BLOCK`, `ENVIRONMENT_BLOCK`, and
  `NOT_DUE_YET`. `VIOLATED_INVARIANT_IDS` contains only concrete
  `PROVEN_FAIL` evidence.
- Each umbrella invariant carries stable `SUBRULE_KEY` records in the same
  JSON SSOT. Subrules are traceability keys, not duplicate invariant entries.
- Existing proof adapters record the owner command, evidence summary, and
  exact classification (`EXISTING_PERMANENT_PROOF_NOT_WIRED`,
  `EXISTING_PROOF_INSUFFICIENT`, or a current environment/repository block).

## Current reconciliation counts

The authoritative counts are emitted by:

```text
npm run check:lockedinvariantregistry01
npm run check:globallockedinvariantsuite01
```

The suite writes the machine-readable and human-readable violation ledger to
`docs/LOCKED_INVARIANT_VIOLATION_LEDGER_V1.json` and
`docs/LOCKED_INVARIANT_VIOLATION_LEDGER_V1.md`.

The ledger validator is `npm run check:lockedinvariantledger01`.

Each ledger entry stores the lifecycle status, phase, due-now flag, proof
state, owner, and blocker for all 115 subrules. `lifecycleChangedEntries` is
reserved for a future `REVISED`, `SUPERSEDED`, or `RETIRED` decision and must
include the old rule, current rule, reason, superseding source, and owner
effect.

The current report has separate `ACTUAL_CURRENT_STATUS` and
`FUTURE_PACKAGE_REQUIREMENT` sections. A current `FAIL` is never followed by
an unqualified future `PASS` line.

## Future package requirement

```text
ACTUAL_CURRENT_STATUS:
GLOBAL_LOCKED_INVARIANT_SUITE = <current result>

FUTURE_PACKAGE_REQUIREMENT:
Required before progression: DUE_NOW_PROVEN_FAIL = 0,
DUE_NOW_UNPROVEN = 0, DUE_NOW_COVERAGE_GAP = 0,
DUE_NOW_UNKNOWN_OWNER = 0.
At the applicable closure phases the required value is:
GLOBAL_LOCKED_INVARIANT_SUITE = PASS.

If any DUE_NOW invariant/subrule is `PROVEN_FAIL`, `UNPROVEN`, a coverage
gap, an environment/repository-state block, or has an unknown owner: STOP and
report its stable `INVARIANT_ID`. `NOT_DUE_YET` requirements remain active but
do not block the earlier phase; they become DUE_NOW when their activation phase
begins.
```
