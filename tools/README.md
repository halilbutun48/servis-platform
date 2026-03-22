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

## Tools hijyen check
- script: check_tools_hygiene_m105.ps1
- calistirma: .\tools\check_tools_hygiene_m105.ps1 -RepoRoot D:\servis-platform

- M44 telematics pack: tools\pack_m44_telematics.ps1 -RepoRoot D:\servis-platform

- M45 retention/backup pack: tools\pack_m45_retention_backup.ps1 -RepoRoot D:\servis-platform
- M45 backup create helper: tools\backup_create_m45.ps1 -RepoRoot D:\servis-platform
- M45 backup restore helper: tools\backup_restore_m45.ps1 -RepoRoot D:\servis-platform
- M46 AI copilot foundation pack: tools\pack_m46_ai_copilot.ps1 -RepoRoot D:\servis-platform
- M46 AI copilot repo-contract: tools\check_m46_ai_copilot_repo_contract.ps1 -RepoRoot D:\servis-platform

## M47.4 -> M58 markerları
- M47.4 mobile readiness web pass: `tools\pack_m47_4_mobile_readiness_web_pass.ps1 -RepoRoot D:\servis-platform`
- M48.5 tablet readiness: `tools\pack_m48_5_room_company_tablet_readiness.ps1 -RepoRoot D:\servis-platform`
- M49 pack: `tools\pack_m49_mobile_beta_hardening.ps1 -RepoRoot D:\servis-platform`
- M49 repo contract: `tools\check_m49_mobile_beta_hardening_repo_contract.ps1 -RepoRoot D:\servis-platform`
- M49.1 pack: `tools\pack_m49_1_driver_voice_guidance_stop_eta.ps1 -RepoRoot D:\servis-platform`
- M49.1 repo contract: `tools\check_m49_1_driver_voice_guidance_stop_eta_repo_contract.ps1 -RepoRoot D:\servis-platform`
- M50 pack: `tools\pack_m50_mobile_release_readiness.ps1 -RepoRoot D:\servis-platform`
- M50 repo contract: `tools\check_m50_mobile_release_readiness_repo_contract.ps1 -RepoRoot D:\servis-platform`
- M51-M53 pack: `tools\pack_m51_53_backfill_verification.ps1 -RepoRoot D:\servis-platform`
- M51-M53 repo contract: `tools\check_m51_53_backfill_verification_repo_contract.ps1 -RepoRoot D:\servis-platform`
- M54.4 pack: `tools\pack_m54_4_driver_route_delivery.ps1 -RepoRoot D:\servis-platform`
- M54.4 repo contract: `tools\check_m54_4_driver_route_delivery_repo_contract.ps1 -RepoRoot D:\servis-platform`
- M55 pack: `tools\pack_m55_reports_no_show.ps1 -RepoRoot D:\servis-platform`
- M56 pack: `tools\pack_m56_kvkk_eta_quality.ps1 -RepoRoot D:\servis-platform`
- M57 — Mobile Hardening resmi green tabanı sonrasındaki komutlar: `check:m57.1`, `check:m57.2`, `check:m57.3`, `check:m57.4`
- M57 full phase rerun: `tools\_packs\pack_m42_m58.ps1 -To 57 -RepoRoot D:\servis-platform -NoBuild`
- M58 — Final Pilot Readiness komutu: `tools\pack_m58_final_pilot_readiness.ps1 -RepoRoot D:\servis-platform`
- M58 readiness contract manuel pilot kabul ile kapanır.

## M59 -> M65 markerları
- M59 pack: `tools\pack_m59_observability_field_diagnostics.ps1 -RepoRoot D:\servis-platform`
- aktif hat `M60`
- M60 pack: `tools\pack_m60_field_acceptance_center.ps1 -RepoRoot D:\servis-platform`
- M60 green olmadan M61 acilmaz.
- M61 pack: `tools\pack_m61_ssot_milestone_alignment.ps1 -RepoRoot D:\servis-platform`
- Docs/SSOT pack: `tools\pack_docs_ssot.ps1 -RepoRoot D:\servis-platform`
- aktif hat M62
- M62 pack: `tools\pack_m62_commercial_core_strengthening.ps1 -RepoRoot D:\servis-platform`
- M62 green olmadan M63 acilmaz.
- M63 pack: `tools\pack_m63_trust_quality_service_evaluation.ps1 -RepoRoot D:\servis-platform`
- M64 pack: `tools\pack_m64_natural_copilot_layer.ps1 -RepoRoot D:\servis-platform`
- M65 pack: `tools\pack_m65_pilot_launch_gate.ps1 -RepoRoot D:\servis-platform`
