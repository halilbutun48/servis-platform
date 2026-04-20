# RUNBOOK — M90 CANONICAL CLOSURE / 10-10 KAPANIŞ PAKETİ

Amaç: yaşayan repo gerçeği ile docs / state / script guide / proof / verification hattını tek resmi davranışta buluşturmak.

## Öncelik sırası
1. `tools\pack.ps1 -To 89`
2. `tools\verify_living_static.ps1`
3. `tools\verify_living_runtime.ps1 -To 89`
4. `tools\check_repo_audit_master.ps1`
5. `tools\pack_m90_b1_canonical_closure_gate.ps1 -RepoRoot D:\servis-platform`

## M90 alt blokları
- `M90A` canonical markdown hizası
- `M90B` state + pack/verify convergence
- `M90B.1` executable closure gate
- `M90C.6` hot-file queue policy
- `M90C.7` export / package hygiene closure
- `M90C.8` CI / verification visibility
- `M90C.9` güvenli kapanış / final hygiene checklist
- `M90C` proof reformu
- `M90D` tek parça script rehberi
- `M90E` repo hijyen kapanışı

## M90B.1 çalışma mantığı
- Bu adım mevcut `M0->M89 green` bazını tekrar tanımlamaz; onu kapanış doğrulamasının ön koşulu olarak kabul eder.
- Komut: `tools\pack_m90_b1_canonical_closure_gate.ps1 -RepoRoot D:\servis-platform`
- Beklenen sonuç: state/pack/verify/audit/script-guide/primer hattı tek resmi gerçeği anlatır ve ölü split kalıntıları source içinde kalmaz.

## M90C.6 çalışma mantığı
- Bu adım repo-audit sıcaklık listesini state-first policy ile bağlar.
- Komut: `tools\pack_m90_c6_hot_file_queue_policy.ps1 -RepoRoot D:\servis-platform`
- Beklenen sonuç: large/hot file seti ile policy sınıflaması birebir eşleşir; justified exception ve acceptance-sensitive dosyalar net adlandırılır; safe candidate review kuyruğu resmi hale gelir.

## M90C.7 çalışma mantığı
- Bu adım shareable repo exportunu temiz zip olarak kilitler.
- Komut: `tools\pack_m90_c7_export_package_hygiene.ps1 -RepoRoot D:\servis-platform`
- Shareable export: `tools\export_shareable_repo_bundle.ps1 -RepoRoot D:\servis-platform`
- Beklenen sonuç: env/build/runtime-json/overlay kalıntısı taşımayan shareable export zip üretilir; satır azaltma hâlâ en sona bırakılır.

## M90C.8 çalışma mantığı
- Bu adım kanonik doğrulama zincirini repo-native görünür hale getirir.
- Root verify komutu: `npm run verify:ci`
- Web lint kanıtı: `artifacts/lint/web_lint_latest.txt`
- Komut: `tools\pack_m90_c8_ci_verification_visibility.ps1 -RepoRoot D:\servis-platform`
- Workflow: `.github/workflows/vardis_verification_visibility.yml`
- Fresh runner hazırlığı: `npm --prefix backend ci` ve `npm --prefix web ci`; npm cache `backend/package-lock.json` ve `web/package-lock.json` ile bağlanır.
- Beklenen sonuç: `repo-verification` ve `shareable-export` işleri repo audit + web lint + sanitized shareable export artefaktlarını görünür kılar; satır azaltma hâlâ en sona bırakılır.

## Değişmez kural
- yeni ürün özelliği açılmaz
- ticari omurgaya yeni domain eklenmez
- odak yalnızca doğrulama / kabul / SSOT / hijyen hizasıdır
- screenshot ana kanıt olarak kullanılmaz


## M90C.9 çalışma mantığı
- Bu adım final release/shareable/export/verify sırasını tek checklist altında sabitler.
- Root verify girişi: `npm run verify:final`
- Web lint kanıtı: `artifacts/lint/web_lint_latest.txt`
- Komut: `tools\pack_m90_c9_safe_closure_final_hygiene.ps1 -RepoRoot D:\servis-platform`
- Windows notu: export/hijyen kapanışında `pwsh` tercih edilir; script yine de PowerShell 5.1 fallback güvenini korur.
- Beklenen sonuç: `verify:final` zinciri, web lint kanıtı, sanitized export pack, shareable bundle üretimi ve temiz `git status` sırası resmi kapanış checklisti olarak görünür olur; satır azaltma hâlâ en sona bırakılır.
