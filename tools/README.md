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
- `tools\check_*.ps1` repo-contract / hygiene check’leri
- `tools\reset-and-pack.ps1`
- `tools\_console_status.ps1`

## Kökte kalan doküman pointer’ları
- `tools\PRIMER_SNAPSHOT.md`
- `tools\CHECKLIST_SSOT.md`
- `tools\README.md`
- `tools\STABLE_TO.txt`

## Arşiv düzeni
- `tools\_archive\legacy-overlays\` → eski `apply_*`, `overlay_*`, `OVERLAY_*` dosyaları
- `tools\_archive\oneoff-hotfixes\` → tek seferlik hotfix yardımcı script’leri
- `tools\_archive\legacy-docs\` → deprecated tools içi metin dosyaları
- `tools\_backup\` → otomatik backup çıktıları

## Kanonik green komutları
- `tools\pack.ps1 -To 41` → ana regresyon
- `tools\pack_m42_optional.ps1` → M42 optional
- `tools\pack_step06_stabil.ps1` → Step 0.6 stabil
- `tools\pack_step1_security_foundation.ps1` → Step 1 foundation
- `tools\pack_step1_totp_stepup.ps1` → Step 1 TOTP
- `tools\pack_m43_google_auth_invite_gate.ps1 -RepoRoot D:\servis-platform` → Step 2 / M43
- `tools\pack_m44_telematics.ps1 -RepoRoot D:\servis-platform` → Step 2.5 / M44
- `tools\pack_m45_retention_backup.ps1 -RepoRoot D:\servis-platform` → Step 2.6 / M45
- `tools\backup_create_m45.ps1 -RepoRoot D:\servis-platform` → M45 yedek oluşturma
- `tools\backup_restore_m45.ps1 -RepoRoot D:\servis-platform -BackupFile <manifest-or-dump>` → M45 yedek geri yükleme
- `tools\pack_m46_ai_copilot.ps1 -RepoRoot D:\servis-platform` → Step 3 / M46
- `tools\pack_m46_1_ai_copilot_enrichment.ps1 -RepoRoot D:\servis-platform` → Step 3.1 / M46.1
- `tools\pack_m46_2_ai_copilot_intent_expansion.ps1 -RepoRoot D:\servis-platform` → Step 3.2 / M46.2
- `tools\pack_m46_3_ai_copilot_quality_evidence.ps1 -RepoRoot D:\servis-platform` → Step 3.3 / M46.3
- `tools\pack_m46_4_ai_copilot_decision_consistency.ps1 -RepoRoot D:\servis-platform` → Step 3.4 / M46.4
- `tools\pack_m46_5_ai_copilot_action_prioritization.ps1 -RepoRoot D:\servis-platform` → Step 3.5 / M46.5
- `tools\pack_m46_6_a_ai_job_guide.ps1 -RepoRoot D:\servis-platform` → Step 3.6-A / M46.6-A
- `tools\pack_m46_6_b_ai_job_guide_precheck.ps1 -RepoRoot D:\servis-platform` → Step 3.6-B / M46.6-B
- `tools\pack_m46_6_t_ai_location_source_guide.ps1 -RepoRoot D:\servis-platform` → Step 3.6-T / M46.6-T
- `tools\pack_m46_6_c_ai_screen_help.ps1 -RepoRoot D:\servis-platform` → Step 3.6-C / M46.6-C
- `tools\pack_m46_6_d_ai_chat_shell.ps1 -RepoRoot D:\servis-platform` → Step 3.6-D / M46.6-D
- `tools\pack_m46_6_d2_ai_context_chat.ps1 -RepoRoot D:\servis-platform` → Step 3.6-D2 / M46.6-D2
- `tools\pack_m46_6_d3_ai_actionable_chat.ps1 -RepoRoot D:\servis-platform` → Step 3.6-D3 / M46.6-D3
- `tools\pack_m46_6_c2_screen_coverage_terminology.ps1 -RepoRoot D:\servis-platform` → Step 3.6-C2 / M46.6-C2
- `tools\pack_m46_6_d4_simple_role_mode.ps1 -RepoRoot D:\servis-platform` → Step 3.6-D4 / M46.6-D4
- `tools\pack_m46_7_driver_code_login_rehber_first.ps1 -RepoRoot D:\servis-platform` → Step 3.7 / M46.7

## Windows ExecutionPolicy
PowerShell imza/ExecutionPolicy engelinde wrapper kullan:
- `tools\gate.cmd`
- `tools\pack.cmd`

## Hijyen kontrolü
- `tools\check_repo_cleanup_m104.ps1` → repo cleanup kontrolü
- `tools\check_tools_hygiene_m105.ps1` → tools kök hijyen kontrolü
- `tools\check_repo_hygiene_m106.ps1` → link TTL + primer/hygiene kontrolü
- `tools\check_m43_google_auth_invite_gate_repo_contract.ps1` → M43 repo-contract kontrolü
- `tools\check_m44_telematics_repo_contract.ps1` → M44 repo-contract kontrolü
- `tools\check_m45_retention_backup_repo_contract.ps1` → M45 repo-contract kontrolü
- `tools\check_m46_ai_copilot_repo_contract.ps1` → M46 repo-contract kontrolü
- `tools\check_m46_1_ai_copilot_enrichment_repo_contract.ps1` → M46.1 repo-contract kontrolü
- `tools\check_m46_2_ai_copilot_intent_expansion_repo_contract.ps1` → M46.2 repo-contract kontrolü
- `tools\check_m46_3_ai_copilot_quality_evidence_repo_contract.ps1` → M46.3 repo-contract kontrolü
- `tools\check_m46_4_ai_copilot_decision_consistency_repo_contract.ps1` → M46.4 repo-contract kontrolü
- `tools\check_m46_5_ai_copilot_action_prioritization_repo_contract.ps1` → M46.5 repo-contract kontrolü
- `tools\check_m46_6_a_ai_job_guide_repo_contract.ps1` → M46.6-A repo-contract kontrolü
- `tools\check_m46_6_b_ai_job_guide_precheck_repo_contract.ps1` → M46.6-B repo-contract kontrolü
- `tools\check_m46_6_t_ai_location_source_guide_repo_contract.ps1` → M46.6-T repo-contract kontrolü
- `tools\check_m46_6_c_ai_screen_help_repo_contract.ps1` → M46.6-C repo-contract kontrolü
- `tools\check_m46_6_d_ai_chat_shell_repo_contract.ps1` → M46.6-D repo-contract kontrolü
- `tools\check_m46_6_d2_ai_context_chat_repo_contract.ps1` → M46.6-D2 repo-contract kontrolü
- `tools\check_m46_6_d3_ai_actionable_chat_repo_contract.ps1` → M46.6-D3 repo-contract kontrolü
- `tools\check_m46_6_c2_screen_coverage_terminology_repo_contract.ps1` → M46.6-C2 repo-contract kontrolü
- `tools\check_m46_6_d4_simple_role_mode_repo_contract.ps1` → M46.6-D4 repo-contract kontrolü
- `tools\check_m46_7_driver_code_login_rehber_first_repo_contract.ps1` → M46.7 repo-contract kontrolü

## SSOT / plan kuralı
- `tools\PRIMER_SNAPSHOT.md` ve checklist dosyaları mevcut green durumu + resmi sonraki rotayı taşır.
- README yalnızca gerçekten var olan script adlarını taşır; planlanan milestone script isimleri yazılmaz.
- Sonraki resmi odak: driver access hardening, session security, KVKK notice/consent, capacity baseline, production resilience, mobile readiness, driver mobile foundation.
- Daha sonraki aday faz: driver voice guidance + stop ETA.

## M46.8 (green)
- `tools\pack_m46_8_driver_access_hardening.ps1` → prisma sync + runtime check + repo contract
- `tools\check_m46_8_driver_access_hardening_repo_contract.ps1` → repo-contract kontrolü
- `backend\scripts\m46_8_driver_access_hardening_check.js` → runtime check (PIN lock/cooldown, weak PIN reject, reset hygiene, audit)
- `docs\RUNBOOK_M46_8_DRIVER_ACCESS_HARDENING.md` → kapsam / kabul kriteri / runbook

## M46.9 (green)
- `tools\pack_m46_9_session_refresh_security.ps1` → prisma sync + runtime check + repo contract
- `tools\check_m46_9_session_refresh_security_repo_contract.ps1` → repo-contract kontrolü
- `backend\scripts\m46_9_session_refresh_security_check.js` → runtime check (refresh rotate, reuse detect, revoke-all, pin reset invalidation)
- `docs\RUNBOOK_M46_9_SESSION_REFRESH_SECURITY.md` → kapsam / kabul kriteri / runbook

## M47 scaffold
- `tools\pack_m47_kvkk_notice_consent_framework.ps1` → M46.9 zinciri + runtime check + repo contract
- `tools\check_m47_kvkk_notice_consent_framework_repo_contract.ps1` → repo-contract kontrolü
- `backend\scripts\m47_kvkk_notice_consent_framework_check.js` → runtime check (current docs, accept-many, me kvkk summary, revoke, audit)
- `docs\RUNBOOK_M47_KVKK_NOTICE_CONSENT_FRAMEWORK.md` → kapsam / kabul kriteri / runbook


Kural 1: yeni tek seferlik overlay/apply script’i repo kalıcı araç setine eklenmez; işi bittikten sonra `tools/_archive/` altında tutulur.  
Kural 2: overlay zip’leri nested root üretmeden extract sonrası doğrudan apply path ile çalışmalıdır.  
Kural 3: üst milestone’lar alt milestone check uyumluluğunu bozmamalıdır.  
Kural 4: PowerShell 5 / UTF-8 literal karşılaştırmalarında repo-contract checker’ları mümkünse normalize veya ASCII-safe yazılmalıdır.
