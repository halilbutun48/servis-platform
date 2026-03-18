# Tools (Windows friendly)

Bu klasörün kökü sadece **kanonik runtime / pack / check** script'leri için kullanılır.

## Kökte kalması gereken kanonik script'ler
- `tools\gate.ps1`
- `tools\pack.ps1`
- `tools\pack_m42_optional.ps1`
- `tools\pack_step06_stabil.ps1`
- `tools\pack_step1_security_foundation.ps1`
- `tools\pack_step1_totp_stepup.ps1`
- `tools\pack_m43_google_auth_invite_gate.ps1`
- `tools\pack_m44_telematics.ps1`
- `tools\pack_m45_retention_backup.ps1`
- `tools\backup_create_m45.ps1`
- `tools\backup_restore_m45.ps1`
- `tools\pack_m46_ai_copilot.ps1`
- `tools\check_m46_ai_copilot_repo_contract.ps1`
- `tools\pack_m46_1_ai_copilot_enrichment.ps1`
- `tools\pack_m46_2_ai_copilot_intent_expansion.ps1`
- `tools\pack_m46_3_ai_copilot_quality_evidence.ps1`
- `tools\pack_m46_4_ai_copilot_decision_consistency.ps1`
- `tools\pack_m46_5_ai_copilot_action_prioritization.ps1`
- `tools\pack_m46_6_a_ai_job_guide.ps1`
- `tools\pack_m46_6_b_ai_job_guide_precheck.ps1`
- `tools\pack_m46_6_t_ai_location_source_guide.ps1`
- `tools\pack_m46_6_c_ai_screen_help.ps1`
- `tools\pack_m46_6_c2_screen_coverage_terminology.ps1`
- `tools\pack_m46_6_d_ai_chat_shell.ps1`
- `tools\pack_m46_6_d2_ai_context_chat.ps1`
- `tools\pack_m46_6_d3_ai_actionable_chat.ps1`
- `tools\pack_m46_6_d4_simple_role_mode.ps1`
- `tools\pack_m46_7_driver_code_login_rehber_first.ps1`
- `tools\pack_m46_8_driver_access_hardening.ps1`
- `tools\pack_m46_9_session_refresh_security.ps1`
- `tools\pack_m47_kvkk_notice_consent_framework.ps1`
- `tools\pack_m47_2_capacity_load_baseline.ps1`
- `tools\pack_m47_3_production_resilience_edge_security.ps1`
- `tools\pack_m47_4_mobile_readiness_web_pass.ps1`
- `tools\pack_m48_driver_mobile_foundation.ps1`
- `tools\pack_m48_5_room_company_tablet_readiness.ps1`
- `tools\pack_m49_mobile_beta_hardening.ps1`
- `tools\check_m49_mobile_beta_hardening_repo_contract.ps1`
- `tools\pack_m49_1_driver_voice_guidance_stop_eta.ps1`
- `tools\check_m49_1_driver_voice_guidance_stop_eta_repo_contract.ps1`
- `tools\pack_m50_mobile_release_readiness.ps1`
- `tools\check_m50_mobile_release_readiness_repo_contract.ps1`
- `tools\pack_m51_53_backfill_verification.ps1`
- `tools\check_m51_53_backfill_verification_repo_contract.ps1`
- `tools\pack_m54_3_dispatch_approve_repack.ps1`
- `tools\check_m54_3_dispatch_approve_repack_repo_contract.ps1`
- `tools\pack_m54_4_driver_route_delivery.ps1`
- `tools\check_m54_4_driver_route_delivery_repo_contract.ps1`
- `tools\pack_post_m41_to_m54_4.ps1`
- `tools\check_*.ps1` repo-contract / hygiene kontrol script'leri
- `tools\check_tools_hygiene_m105.ps1`
- `tools\_console_status.ps1`

## Kökte kalan doküman pointer'ları
- `tools\PRIMER_SNAPSHOT.md`
- `tools\CHECKLIST_SSOT.md`
- `tools\README.md`
- `tools\STABLE_TO.txt`

## Resmi green tekrar-koşturma komutları
- `tools\pack.ps1 -To 41`
- `tools\pack_m51_53_backfill_verification.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m54_3_dispatch_approve_repack.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m54_4_driver_route_delivery.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_post_m41_to_m54_4.ps1 -RepoRoot D:\servis-platform -NoBuild`

## Güncel çalışma notu
- Resmi green çizgi `M54.4` seviyesine kadar uzanır.
- Post-M41 pack scripts self-only çalışır; tam M42 -> M54.4 hattı `tools\pack_post_m41_to_m54_4.ps1` ile dışarıdan orkestre edilir.
- `M51–M53`, `M54.3` ve `M54.4` artık resmi green kanıt setinin parçasıdır.
- Tek araç yeterli / non-dispatch işlerde paket-kopyala UI kolaylığı korunur.
- Sıradaki ana ürün işi `M55 — Reports + No-show` olacaktır.
- SSOT seti değişikliklerde birlikte güncellenmelidir.


## M55 — Reports + Gelmedi Kaydı
- Reports endpointleri ve ROOM/COMPANY rapor ekranı iskeleti eklendi.
- Gelmedi kaydı (NO_SHOW) veri modeli ve backend guard açıldı.
- Aktif kayıtlı sürücü approve/apply aşamasında `ACTIVE_NO_SHOW_PENALTY` ile bloklanır.

- `tools\pack_m55_reports_no_show.ps1`
- `tools\check_m55_reports_no_show_repo_contract.ps1`
