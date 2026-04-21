# RUNBOOK — M90C.7 EXPORT / PACKAGE HYGIENE CLOSURE

Amaç: paylaşılabilir repo paketini çalışma alanı artıklarından arındırmak ve bunu repo-contract + audit + export aracı ile yürütülebilir hale getirmek.

## Komut sırası
1. `tools\_repo_hygiene_preflight.ps1 -RepoRoot D:\servis-platform`
2. `node backend/scripts/repo_audit.js`
3. `tools\export_shareable_repo_bundle.ps1 -RepoRoot D:\servis-platform`
4. `tools\pack_m90_c7_export_package_hygiene.ps1 -RepoRoot D:\servis-platform`

## Preflight neyi temizler
- `web/dist`
- `mobile/dist`
- `pack_living_final.log`
- `pack_living_latest.log`
- `README_M*_OVERLAY*.txt`
- tarihsel güvenli transient script artıkları

## Shareable export zip neyi dışarıda bırakır
- `.env`, `backend/.env`, `infra/.env`
- `artifacts`, `node_modules`, `.next`, `build`, `coverage`, `_archive`, `_backup`
- `web/dist`, `mobile/dist`, `infra/osrm-data`
- `backend/data/*.json`, `data/*.json`
- overlay readme/log kalıntıları
- mevcut zip arşivleri

## Beklenen çıktı
- `artifacts\shareable-export\servis-platform_shareable_<timestamp>.zip`
- Bu zip çalışma alanı sırrı, runtime JSON store ve build artığı taşımaz.
- M90C.7 pack PASS çıktısı alınır.
- Fiziksel snapshot yüzeyi için ayrı soft gate: `npm run verify:snapshot`
