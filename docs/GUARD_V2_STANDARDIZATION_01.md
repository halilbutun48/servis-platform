# GUARD-V2-STANDARDIZATION-01

Guard-V2 standardization defines the common validation contracts used by future milestones.

## Canonical contracts

- Text integrity uses strict UTF-8 decoding.
- Invalid UTF-8 is rejected.
- BOM handling is explicit.
- Bare `CR` is rejected.
- `CRLF` normalizes to `LF`.
- Terminal newlines are preserved.
- One canonical SHA is accepted per normalized text file.

## Git scope contract

- Commit-ready validation must distinguish staged, unstaged, and untracked state.
- Exact path-set comparison is preferred over snapshot heuristics.
- Committed product paths must not be expected to remain dirty.
- Do not use dirty-path expectations for committed product files.
- Historical dirty-snapshot checks stay out of the default core path.
- historical guards automatically entering core regression are prohibited.

## Validation environment contract

- Disposable clones use explicit status preflight.
- Dependency parity is handled separately from product checks.
- Evidence parity is explicit and local-only.
- No process-wide Git configuration changes are required.
- Windows/Linux checkout stability is explicit.

## Regression tiers

- `check:core-regression`
  - fast, stable checks that should run on every normal milestone
  - must not depend on historical dirty snapshots

- `check:extended-regression`
  - includes core regression plus broader AI, UX, marketplace, and integrity checks

- `check:release-regression`
  - includes core, extended, product-extensions, repo verification, and release hygiene

## Policy

- Do not add raw migration.sql hashing to new checkers.
- Do not accept dual LF/CRLF hashes.
- Do not copy dirty-snapshot expectations for committed product paths into new core checks.
- Do not duplicate private Git/hash helpers when shared helpers already exist.
- Do not reduce case counts merely to obtain PASS.
- Do not widen product scope to make a focused checker pass.
