# Tools (Windows friendly)

Bu klasörün kökü sadece **kanonik runtime / pack / check** script’leri için kullanılır.

## Kökte kalması gereken kanonik script’ler
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
- `tools\pack_m46_1_ai_copilot_enrichment.ps1`
- `tools\pack_m46_2_ai_copilot_intent_expansion.ps1`
- `tools\pack_m46_3_ai_copilot_quality_evidence.ps1`
- `tools\pack_m46_4_ai_copilot_decision_consistency.ps1`
- `tools\pack_m46_5_ai_copilot_action_prioritization.ps1`
- `tools\pack_m46_6_a_ai_job_guide.ps1`
- `tools\pack_m46_6_b_ai_job_guide_precheck.ps1`
- `tools\pack_m46_6_t_ai_location_source_guide.ps1`
- `tools\pack_m46_6_c_ai_screen_help.ps1`
- `tools\pack_m46_6_d_ai_chat_shell.ps1`
- `tools\pack_m46_6_d2_ai_context_chat.ps1`
- `tools\pack_m46_6_d3_ai_actionable_chat.ps1`
- `tools\pack_m46_6_c2_screen_coverage_terminology.ps1`
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
- `tools\check_*.ps1` repo-contract / hygiene kontrol script’leri
- `tools\check_tools_hygiene_m105.ps1`
- `tools\reset-and-pack.ps1`
- `tools\_console_status.ps1`

## Kökte kalan doküman pointer’ları
- `tools\PRIMER_SNAPSHOT.md`
- `tools\CHECKLIST_SSOT.md`
- `tools\README.md`
- `tools\STABLE_TO.txt`

## Kanonik green komutları
- `tools\pack.ps1 -To 41` → ana regresyon
- `tools\pack_m44_telematics.ps1 -RepoRoot D:\servis-platform` → M44
- `tools\pack_m45_retention_backup.ps1 -RepoRoot D:\servis-platform` → M45
- `tools\backup_create_m45.ps1 -RepoRoot D:\servis-platform` → M45 yedek oluşturma
- `tools\backup_restore_m45.ps1 -RepoRoot D:\servis-platform -BackupFile <manifest-or-dump>` → M45 yedek geri yükleme
- `tools\pack_m46_ai_copilot.ps1 -RepoRoot D:\servis-platform` → M46
- `tools\pack_m46_9_session_refresh_security.ps1 -RepoRoot D:\servis-platform` → M46.9
- `tools\pack_m47_kvkk_notice_consent_framework.ps1 -RepoRoot D:\servis-platform` → M47
- `tools\pack_m47_2_capacity_load_baseline.ps1 -RepoRoot D:\servis-platform` → M47.2
- `tools\pack_m47_3_production_resilience_edge_security.ps1 -RepoRoot D:\servis-platform` → M47.3
- `tools\pack_m47_4_mobile_readiness_web_pass.ps1 -RepoRoot D:\servis-platform` → M47.4 mobile readiness web pass
- `tools\pack_m48_driver_mobile_foundation.ps1 -RepoRoot D:\servis-platform` → M48 driver mobile foundation
- `tools\pack_m48_5_room_company_tablet_readiness.ps1 -RepoRoot D:\servis-platform` → M48.5 room / company tablet readiness
- `tools\pack_m49_mobile_beta_hardening.ps1 -RepoRoot D:\servis-platform` → M49 mobile beta hardening

## Hijyen kontrolü
- `tools\check_repo_cleanup_m104.ps1` → repo cleanup kontrolü
- `tools\check_tools_hygiene_m105.ps1` → tools kök hijyen kontrolü
- `tools\check_repo_hygiene_m106.ps1` → link TTL + primer/hijyen kontrolü
- `tools\check_m45_retention_backup_repo_contract.ps1` → M45 repo-contract kontrolü
- `tools\check_m46_ai_copilot_repo_contract.ps1` → M46 repo-contract kontrolü
- `tools\check_m47_4_mobile_readiness_web_pass_repo_contract.ps1` → M47.4 repo-contract kontrolü
- `tools\check_m48_driver_mobile_foundation_repo_contract.ps1` → M48 repo-contract kontrolü
- `tools\check_m48_5_room_company_tablet_readiness_repo_contract.ps1` → M48.5 repo-contract kontrolü
- `tools\check_m49_mobile_beta_hardening_repo_contract.ps1` → M49 repo-contract kontrolü

## SSOT / plan kuralı
- `tools\PRIMER_SNAPSHOT.md` ve checklist dosyaları mevcut green durumu + resmi sonraki rotayı taşır.
- README yalnızca gerçekten var olan script adlarını taşır; planlanan milestone script isimleri yazılmaz.
- `M47.4-R` ayrı script değil; clean rerun / repro uyum doğrulamasıdır.
- `driver@demo.com / demo123` hızlı panel kontrol hesabı olarak korunabilir; ana driver ürün akışı `Sürücü Kodu + PIN` kalır.
- Sonraki resmi odak: `M49 MOBILE BETA HARDENING`.
