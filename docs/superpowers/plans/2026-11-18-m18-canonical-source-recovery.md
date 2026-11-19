# M18 Canonical Source Recovery Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Bring every runtime-required M18 source and Prisma migration under an explainable Git ownership boundary and prove that a clean checkout can rebuild the canonical DEMO without changing product data.

**Architecture:** Treat the current canonical Compose runtime and `seferpakt_clean_demo.public` as read-only evidence sources. First classify the 12 untracked migrations, `roomCost.prisma`, protected WIP, generated output and runtime artifacts; then add only proven product source through the existing modular Prisma and ownership manifests. Finally validate the result from a clean checkout without resetting the working tree or the canonical database.

**Tech Stack:** Git, Docker Compose, Node.js/npm, Prisma modular schema, existing `verify:repo`/`verify:final`/locked-invariant scripts.

**Spec:** Current user request: `SEFERPAKT — #18 CANONICAL SOURCE RECOVERY + REPOSITORY FOUNDATION`.

## Global Constraints

- Preserve `seferpakt_clean_demo.public`, migration history, protected WIP, accepted 636/636 and 95/95 evidence, and Sefer Abi evidence.
- Do not use reset, clean, checkout, restore, stash, bulk move, database reset, migration reset, wildcard bypass, or blind hash refresh.
- Do not create a product feature, second semantic engine, second canonical runtime, or new acceptance ledger.
- Treat generated, secrets, runtime logs, browser evidence and temporary outputs separately from product source.
- Do not commit, tag, push or set `FULL_D_LEVEL_CLOSED=true` in this package.

## Review Focus

- A migration is runtime-required but not source-owned: prove its schema consumer and applied migration state before tracking it.
- A schema fragment appears untracked: prove DMMF/schema import ownership and migration parity before adding it.
- Ownership counts overlap: keep exact identity, unexplained paths and unowned delta as separate sets and explain their intersections.
- Clean checkout lacks an ignored or protected file: fail the reconstruction proof rather than copying it silently.
- Existing Sefer Abi or accepted product files are dirty: preserve them and run only directly affected checks.

### Task 1: Canonical runtime and source inventory checkpoint

**Files:**
- Read: `AGENTS.md`, `docs/AGENTS.md`, `docs/PRIMER_SSOT.md`, current repository-exit checkpoint, `infra/docker-compose.clean-demo.yml`.
- Evidence: existing ownership/checkpoint files; no product source edits.

- [ ] Record HEAD, branch, worktree status, tracked/untracked/ignored candidates, Compose project labels, API/frontend images, database identity and migration count.
- [ ] Enumerate the 12 untracked migration directories and `backend/prisma/schema/roomCost.prisma` with Git history, schema import references, package/runtime references and migration table evidence.
- [ ] Classify each candidate as `USED/CANONICAL`, `EVIDENCE/PROTECTED`, `TEMPORARY/REMOVE_CANDIDATE`, or `UNRESOLVED/PRESERVE`; no removal occurs without all four removal gates.
- [ ] Save a bounded checkpoint listing exact paths, owner, purpose, consumer, runtime relation, migration status, retention and rollback decision.
- [ ] Run only read-only identity checks and Prisma status; expected result is a complete candidate table, not a PASS claim.

### Task 2: Prisma source recovery and parity

**Files:**
- Modify only proven source/manifest paths under `backend/prisma/schema`, `backend/prisma/migrations`, and existing ownership/provenance records.
- Test: existing Prisma modularization, current-head, semantic-parity and migration-history checks.

- [ ] Prove that every required modular schema file and migration directory is part of the current product source and is consumed by the canonical runtime.
- [ ] Add only the proven schema/migration source to the repository boundary; preserve migration SQL and `_prisma_migrations` history byte-for-byte.
- [ ] Run `prisma format`, `prisma validate`, generated-client validation, migration status and the existing Prisma acceptance checks against an isolated restore/proof target where required.
- [ ] Reconcile current-head, semantic parity and migration-history evidence without changing historical checksums or the canonical DEMO database.
- [ ] Record before/after path and gate results; unresolved candidates remain preserved and open.

### Task 3: Exact ownership/provenance root correction

**Files:**
- Modify only the existing ownership/provenance manifests and the exact source paths proven in Tasks 1–2.
- Test: `package-ownership-delta`, existing ownership registry/provenance checks, `git diff --check`.

- [ ] Recompute the relationship between unowned, unexplained, stale and changed sets from the same scope, explaining the 55-record arithmetic difference without deleting evidence.
- [ ] Assign canonical owner/lifecycle/retention only to paths with source, runtime and consumer proof; keep generated/transient/deferred and protected WIP classes separate.
- [ ] Correct shared root causes rather than filling hundreds of path entries or adding wildcard exemptions.
- [ ] Run targeted ownership controls and record exact remaining paths and root-cause groups.

### Task 4: Clean-checkout reconstruction and closure handoff

**Files:**
- Read-only isolated checkout/work directory created outside the protected working tree; no commit/tag/push.
- Existing verification scripts and runtime configuration.

- [ ] Reconstruct the product from the proven Git boundary without copying ignored local source or secrets.
- [ ] Install locked dependencies, build frontend/backend, validate Prisma, start an isolated DEMO runtime, and verify health/auth/RBAC/tenant/KVKK boundaries.
- [ ] Run affected source tests, locked invariants, `verify:repo`, `verify:closure`, and `verify:final`; do not turn a failing ownership or reconstruction gate into PASS.
- [ ] Preserve the current canonical runtime and accepted product evidence; record the exact remaining blocker and smallest next correction.
- [ ] Leave `FUNCTIONAL_D_LEVEL_CLOSED=true`, `REPOSITORY_EXIT_CLOSED=false` unless every repository gate genuinely passes, `FULL_D_LEVEL_CLOSED=false` until the later final integration, and `#19=NOT_STARTED`.
