# TOOLS README

## Kanonik komutlar
- Tam master hat: `tools\pack.ps1 -To 66 -RepoDir D:\servis-platform -NoBuild`
- Reset + full hat: `tools\reset-and-pack.ps1 -To 66 -NoBuild`
- Repo audit: `tools\check_repo_audit_master.ps1 -RepoRoot D:\servis-platform`
- M66 özel pack: `tools\pack_m66_operation_reassignment.ps1 -RepoRoot D:\servis-platform`

## Güncel çalışma notu
- Repo şu an **post-M66 functional** durumdadır.
- `M59 -> M65` hattı green taban olarak durur.
- `M66` fonksiyonel olarak eklidir; tam kapanış için smoke + saha testi + yeniden doğrulama gerekir.
- SSOT seti değişikliklerde birlikte güncellenmelidir.
- Geçici `_m*` overlay klasörleri repo içine commitlenmez.

## Master pack
`tools\pack.ps1 -To 66` tek çatı girişidir.

Akış:
1. `M104 / M105 / M106` statik repo check'leri
2. `M0 -> M41` gate
3. `M42 -> M66` milestone pack zinciri
4. repo audit

## Repo audit
- wrapper: `tools\check_repo_audit_master.ps1`
- script: `backend\scripts\repo_audit.js`
- rapor: `artifacts/repo-audit/repo_audit_latest.json`

Audit çıktısı:
- duplicate dosyalar
- benzer pack/check script grupları
- orphan / legacy adayları
- tiny dosyalar
- archive/live shadow çiftleri
- temel performans kokuları
