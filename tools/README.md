# TOOLS README

## Kanonik komutlar
- `tools\pack.ps1 -To 41`
- `tools\pack_m44_telematics.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m45_retention_backup.ps1 -RepoRoot D:\servis-platform`
- `tools\backup_create_m45.ps1 -RepoRoot D:\servis-platform`
- `tools\backup_restore_m45.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m46_ai_copilot.ps1 -RepoRoot D:\servis-platform`
- `tools\check_m46_ai_copilot_repo_contract.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m51_53_backfill_verification.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m54_3_dispatch_approve_repack.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m54_4_driver_route_delivery.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m55_reports_no_show.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m56_kvkk_eta_quality.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m57_mobile_hardening.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m57_mobile_hardening.ps1 -RepoRoot D:\servis-platform -ScaffoldOnly`
- `tools\pack_post_m41_to_m57.ps1 -RepoRoot D:\servis-platform -NoBuild`
- `tools\pack_post_m41_to_m54_4.ps1 -RepoRoot D:\servis-platform -NoBuild` (compat wrapper)
- `tools\pack_m58_final_pilot_readiness.ps1 -RepoRoot D:\servis-platform`

## Güncel çalışma notu
- Resmi green çizgi `M57` seviyesine kadar uzanır.
- Post-M41 pack scripts self-only calisir; tam `M42 -> M57` green hatti `tools\pack_post_m41_to_m57.ps1` ile disaridan orkestre edilir.
- `tools\pack_post_m41_to_m54_4.ps1` adi uyumluluk icin korunur ve yeni orchestrator'a forward eder.
- `M44`, `M45`, `M46`, `M51–M53`, `M54.3`, `M54.4`, `M55`, `M56` ve `M57` resmi green kanıt setinin parçasıdır.
- Sonraki ana urun isi `M58 — Final Pilot Readiness` olarak devam eder.
- `M58` readiness contract pack'i repo tarafini kontrol eder; resmi green icin manuel pilot kabul gerekir.
- SSOT seti değişikliklerde birlikte güncellenmelidir.
- Geçici `_m*` overlay klasörleri repo içine commitlenmez.

## M57 full pack
- `tools\pack_m57_mobile_hardening.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m57_mobile_hardening.ps1 -RepoRoot D:\servis-platform -ScaffoldOnly`
- Full komut `M57.1 -> M57.4` zincirini dogrular.
- Scaffold komutu hizli dosya/runbook kontrolunu korur.

## M58 readiness pack
- `tools\pack_m58_final_pilot_readiness.ps1 -RepoRoot D:\servis-platform`
- Repo hazirlik kontratini ve pilot checklist baglantisini kontrol eder.
- Resmi green icin manuel pilot kabul gerekir.

## Mobile script alias
- `npm run check:m57.1`
- `npm run check:m57.2`
- `npm run check:m57.3`
- `npm run check:m57.4`

- `tools\pack_m48_5_room_company_tablet_readiness.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m49_mobile_beta_hardening.ps1 -RepoRoot D:\servis-platform`
- `tools\check_m49_mobile_beta_hardening_repo_contract.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m49_1_driver_voice_guidance_stop_eta.ps1 -RepoRoot D:\servis-platform`
- `tools\check_m49_1_driver_voice_guidance_stop_eta_repo_contract.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m50_mobile_release_readiness.ps1 -RepoRoot D:\servis-platform`
- `tools\check_m50_mobile_release_readiness_repo_contract.ps1 -RepoRoot D:\servis-platform`
- `tools\check_m51_53_backfill_verification_repo_contract.ps1 -RepoRoot D:\servis-platform`
- `tools\check_m54_4_driver_route_delivery_repo_contract.ps1 -RepoRoot D:\servis-platform`
