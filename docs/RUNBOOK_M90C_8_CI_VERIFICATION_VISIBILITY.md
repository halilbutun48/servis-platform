# RUNBOOK — M90C.8 CI / VERIFICATION VISIBILITY

## Yerel yürütme
1. `Set-Location D:\servis-platform`
2. `npm run verify:ci`
3. `type artifacts\lint\web_lint_latest.txt`
4. `powershell -ExecutionPolicy Bypass -File .\tools\pack_m90_c8_ci_verification_visibility.ps1 -RepoRoot D:\servis-platform`

## Workflow yolu
- Dosya: `.github/workflows/vardis_verification_visibility.yml`
- Fresh runner hazırlığı:
  - `npm --prefix backend ci`
  - `npm --prefix web ci`
  - npm cache lockfile kaynakları: `backend/package-lock.json`, `web/package-lock.json`
- İşler:
  - `repo-verification` -> `npm run verify:ci`
  - `shareable-export` -> `tools/pack_m90_c7_export_package_hygiene.ps1`

## Beklenen görünür kanıt
- `artifacts/repo-audit/repo_audit_latest.json`
- `artifacts/lint/web_lint_latest.txt`
- `artifacts/shareable-export/servis-platform_shareable_*.zip`
- job isimleri: `repo-verification`, `shareable-export`

## Not
- M90C.8 yeni ürün davranışı açmaz; mevcut closure zincirini repo-native görünür yapar.
- Fresh runner dependency kurulumu explicit kalır; local node_modules varlığına güvenilmez.
- Satır azaltma hâlâ sona bırakılır.
