# FINAL RELEASE EVIDENCE - M90

This file collects the M90 final closure evidence in one place.

## Git references
- Branch: m90d1_web_lint_inventory
- Commit: ed098d0
- Tag: m90_full_green_zero_warning_20260410
- Generated at: 2026-04-11 00:21:42 +03:00

## Closure summary
- Canonical master pack baseline: M0->M89 green
- Living upper route baseline: M89
- State next milestone: M90C.9
- Docs contract mode: state-first-canonical-history-split
- Canonical final verification: `npm run verify:final`
- Canonical CI verification: `npm run verify:ci`
- Web lint summary: 0 error / 0 warning

## Repo audit summary
- exact duplicate groups: 0
- duplicate pack groups: 14
- duplicate check groups: 3
- orphan candidates: 0
- tiny files: 0
- hot files >=1000 and <1200: 11
- large files >=1200: 2
- active docs-contract refs: 85
- runtime json files tracked: 0

## Canonical evidence paths
- This file: `docs/FINAL_RELEASE_EVIDENCE_M90.md`
- Web lint evidence: `artifacts/lint/web_lint_latest.txt`
- Repo audit evidence: `artifacts/repo-audit/repo_audit_latest.json`
- CI workflow: `.github/workflows/vardis_verification_visibility.yml`
- Primer: `docs/PRIMER_SSOT.md`
- Tools guide: `tools/README.md`

## Shareable export summary
- Canonical command: `pwsh -ExecutionPolicy Bypass -File .\tools\export_shareable_repo_bundle.ps1 -RepoRoot D:\servis-platform`
- Hygiene gate: `pwsh -ExecutionPolicy Bypass -File .\tools\pack_m90_c7_export_package_hygiene.ps1 -RepoRoot D:\servis-platform`
- Note: the shareable export output is generated at runtime. This file keeps the command and process reference, not the output artifact itself.

## CI visibility summary
- Workflow: `.github/workflows/vardis_verification_visibility.yml`
- Expected jobs: `repo-verification`, `shareable-export`
- The root verify chain includes the web lint evidence step.

## Final closure order
1. `npm run verify:final`
2. `pwsh -ExecutionPolicy Bypass -File .\tools\pack_m90_c7_export_package_hygiene.ps1 -RepoRoot D:\servis-platform`
3. `pwsh -ExecutionPolicy Bypass -File .\tools\export_shareable_repo_bundle.ps1 -RepoRoot D:\servis-platform`
4. `git status --short`
5. If there are no unexpected changes, continue with commit / tag / push

## Note
- This file does not replace the raw logs. Open the canonical evidence paths above for the source artifacts.
- This file is the primary single-entry summary for the M90 closure decision.