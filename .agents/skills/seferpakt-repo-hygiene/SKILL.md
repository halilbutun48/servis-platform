---
name: seferpakt-repo-hygiene
description: Use when working in D:\\servis-platform with a dirty worktree, generated artifacts, duplicate-looking owners, temporary scripts, or repository cleanup/refactor requests where accepted evidence and another task's changes must be preserved.
---

# SeferPakt Repo Hijyeni

## Core principle

Make the worktree explainable in place. A clean-looking Git status is not the goal; preserved provenance, canonical ownership and safe future maintenance are.

## Required boundaries

- Read root `AGENTS.md`, `docs/AGENTS.md`, current HEAD/branch/status and the relevant durable checkpoint before editing.
- Treat tracked, untracked and ignored paths as user-owned until evidence resolves them. Do not automatically preserve or delete whole families. For every backup/dump/recovery, browser trace/profile/log, acceptance-evidence, runbook, checker, harness, test-script and generated-output sub-family, record producer, consumer, unique proof, restore need, verified alternative, retention reason and owner before deciding.
- Never use `git reset`, `git clean`, `checkout`, `restore`, stash, bulk move or overwrite to make the tree look clean. Do not delete database records, reset/seed/migrate the DEMO DB, commit, tag or push.
- Do not create a second canonical owner, duplicate checker or broad refactor merely because a file is long or a checker is red.

## Workflow

1. **Baseline:** record `git rev-parse --show-toplevel`, HEAD, branch/upstream, `git status --porcelain=v1`, `git ls-files`, non-ignored untracked files and relevant ignored files. Aggregate large output; do not hide it in a stash.
2. **Protect:** write down accepted runtime/evidence identities and active task paths before classifying anything.
3. **Classify each candidate:**
   - `USED/CANONICAL`: imported, exported, dynamically discovered, package/script referenced, or observed in the accepted runtime.
   - `EVIDENCE/PROTECTED`: a specific checkpoint, audit, backup, dump, browser/profile or user-facing artifact whose unique proof or recovery need is verified. Duplicate or superseded evidence is not automatically protected.
   - `TEMPORARY/REMOVE_CANDIDATE`: generated output with no source/runtime/evidence reference, no active-session ownership and an exact reversible path.
   - `UNRESOLVED/PRESERVE`: any ambiguous, duplicate-looking, dynamic or cross-task path.
   - A family classification never substitutes for source-level review of unused functions, unreachable branches, duplicate calculations, old alternate routes or unnecessary dependencies inside backend, web, mobile or Sefer Abi code.
- For a full source audit, automatically census every source-like file under backend/API/Prisma/migrations/scripts/tests, web, mobile, infra/solver/GPS/Socket.IO/security and Sefer Abi. Keep third-party, generated and runtime output families separate; do not silently omit untracked source paths.
- Review meaningful functions, classes, exports, routes, registry entries and code blocks separately from file-family counts. Use static imports/calls plus dynamic loaders, route/package registries, package scripts, Docker/runtime consumers, Git history and real regression evidence. Record coverage counts and an explicit disposition for unresolved dynamic cases.
- A full-source `PASS` requires scope reconciliation, exact physical-removal diffs where applicable, and affected DEMO/API/frontend/mobile/Sefer Abi/security regressions. Lint or a dirty-file-only scan is supporting evidence, never full coverage.
4. **Change only proven candidates:** record exact path or symbol, why it is safe, reference search, dynamic/runtime check, unique-evidence and recovery check, owner, and before/after count. If any proof is missing, do not remove it.
5. **Verify and report:** run `git diff --check`, the relevant existing `npm run verify:snapshot`/`npm run audit:repo` checks, and changed-surface tests only when product source changed. Report PASS/FAIL/NOT_PROVEN, created/removed/preserved paths and final worktree counts.

## Evidence gate for removal

Removal requires all four: no tracked/runtime reference; no package, dynamic-loader or script reference; not evidence/backup/profile/DB material; and no active task or rollback need. “Untracked”, “ignored”, “old”, “generated” or “the checker fails” is not proof. Delete only the exact path after recording the decision; never use a broad glob or directory-wide cleanup.

## Red flags

| Temptation | Correct response |
|---|---|
| “Make status clean with stash/reset/clean.” | Keep the tree in place and publish an inventory; provenance matters more than appearance. |
| “It is generated, so it is harmless.” | Check evidence, active sessions, backups and runtime references first. |
| “No static import means dead code.” | Check dynamic loading, package scripts and runtime evidence; otherwise preserve. |
| “Split or rewrite it while cleaning.” | Keep the canonical owner; refactor only with a concrete responsibility defect and regression proof. |

## Existing controls

Reuse the repository’s existing `verify:snapshot`, `audit:repo`, targeted product tests and real-browser evidence. A new cleanup harness is not justified unless a repeated, evidenced gap cannot be covered by these controls.
