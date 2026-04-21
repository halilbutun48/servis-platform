# M90C.7 — EXPORT / PACKAGE HYGIENE CLOSURE

Amaç: repo green bazını bozmadan, paylaşılabilir repo paketi için temiz export kapısı koymak ve çalışma alanı artıklarını kanonik kurala bağlamak.

## Neden gerekli
- Repo audit green olabilir; ama paylaşım/export paketi yine de `.env`, `dist`, runtime JSON store veya overlay/log kalıntısı taşıyabilir.
- M90C.6 hot-file queue policy kapanmıştır; satır azaltma en sona bırakılırken önce export/package hijyeni kapanmalıdır.

## Kapsam
- `tools/export_shareable_repo_bundle.ps1` ile temiz shareable zip üretmek
- `tools/_repo_hygiene_preflight.ps1` ve `tools/_packs/_repo_hygiene_preflight.ps1` içinde güvenli transient temizliği genişletmek
- `.gitignore` içinde export kalıntılarını görünür biçimde engellemek
- `tools/repo_contract_state.json > shareablePackageHygiene` ile state-first policy tanımlamak

## Zorunlu dışlama listesi
- `.env`, `backend/.env`, `infra/.env`
- `artifacts/`
- `node_modules/`
- `.next/`, `dist/`, `build/`, `coverage/`
- `web/dist/`, `mobile/dist/`
- `infra/osrm-data/`
- `backend/data/*.json`
- `data/*.json`
- `pack_living_final.log`, `pack_living_latest.log`
- `README_M*_OVERLAY*.txt`
- `*.zip`

## Çalışma kuralı
- Satır azaltma en sona bırakılır.
- Bu adım davranış refactor'u değildir.
- Yalnız acceptance-safe hijyen ve export güveni hedeflenir.
- Runtime JSON store repoda kalıcı kaynak sayılmaz; shareable pakete girmez.
- `export-clean` ile `physical snapshot clean` aynı şey değildir; fiziksel yüzey ölçümü ayrı soft gate ile izlenir.

## Yürütülebilir kapı
- `tools\pack_m90_c7_export_package_hygiene.ps1 -RepoRoot D:\servis-platform`

## Beklenen sonuç
- Shareable repo zip temiz üretilir.
- Repo hygiene preflight yalnız güvenli transient artıklarını temizler.
- Canonical docs M90C.7'yi sıradaki resmi iş değil, kapanan export/package hijyen kapısı olarak taşır.
