# TOOLS README

## Kanonik komutlar
- `tools\pack.ps1 -To 41`
- `tools\pack_post_m41_to_m58.ps1 -RepoRoot D:\servis-platform -NoBuild`
- `tools\pack_m58_final_pilot_readiness.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m59_observability_field_diagnostics.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m60_field_acceptance_center.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m61_ssot_milestone_alignment.ps1 -RepoRoot D:\servis-platform`

## Güncel çalışma notu
- Resmi green çizgi `M58` teknik readiness seviyesine kadar uzanır.
- `M58 readiness contract` tarihsel olarak korunur; `manuel pilot kabul` notu artık saha çıkış kapısı olarak değil, geçmiş pilot readiness bağlamı olarak saklanır.
- Yeni resmi saha öncesi rota `M59 -> M65` olarak acilmistir.
- `M59 green`; `M60 green`; aktif hat `M61`.
- `M61 green olmadan M62 acilmaz`.
- SSOT seti değişikliklerde birlikte güncellenmelidir.
- Geçici `_m*` overlay klasörleri repo içine commitlenmez.

## M58 readiness pack
- `tools\pack_m58_final_pilot_readiness.ps1 -RepoRoot D:\servis-platform`
- Repo hazirlik kontratini ve tarihsel pilot checklist baglantisini kontrol eder.

## M59 observability pack
- `tools\pack_m59_observability_field_diagnostics.ps1 -RepoRoot D:\servis-platform`
- Repo-contract: `tools\check_m59_observability_field_diagnostics_repo_contract.ps1`
- Runtime/check: `backend\scripts\m59_observability_field_diagnostics_check.js`
- Kapsam: mobil sağlık olayları, cihaz sağlık özeti, GPS güven skoru, sorun bildir ve web gözlem paneli iskeleti.

## M60 field acceptance pack
- `tools\pack_m60_field_acceptance_center.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m61_ssot_milestone_alignment.ps1 -RepoRoot D:\servis-platform`
- Repo-contract: `tools\check_m60_field_acceptance_center_repo_contract.ps1`
- Runtime/check: `backend\scripts\m60_field_acceptance_center_check.js`
- Kapsam: pilot test oturumu, acceptance checklist, karar seçenekleri ve acceptance merkezi iskeleti.


## M61 ssot alignment pack
- `tools\pack_m61_ssot_milestone_alignment.ps1`
- `tools\check_m61_ssot_milestone_alignment_repo_contract.ps1`
- Amaç: resmi ürün gerçeğini tek milestone kaydı ve drift kontrolü ile hizalamak.
