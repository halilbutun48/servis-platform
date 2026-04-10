# RUNBOOK — M90C.9 SAFE CLOSURE / FINAL HYGIENE CHECKLIST

## Amac
Final release/shareable/export/verify kapanisini tek resmi checklist altinda toplamak.

## Sira
1. `npm run verify:final`
2. `type artifacts\lint\web_lint_latest.txt`
3. `pwsh -ExecutionPolicy Bypass -File .\tools\pack_m90_c7_export_package_hygiene.ps1 -RepoRoot D:\servis-platform`
4. `pwsh -ExecutionPolicy Bypass -File .\tools\export_shareable_repo_bundle.ps1 -RepoRoot D:\servis-platform`
5. `git status --short`
6. Beklenen fark disinda degisiklik yoksa commit/tag/push

## Shell notu
- Windows tarafinda export/hijyen kapanisinda `pwsh` tercih edilir.
- `tools/export_shareable_repo_bundle.ps1` yine de PowerShell 5.1 fallback uyumunu korur; `tar.exe` / `.NET ZipFile` fallback kaldirilmaz.

## Kanonik pack
- `tools\pack_m90_c9_safe_closure_final_hygiene.ps1 -RepoRoot D:\servis-platform`
