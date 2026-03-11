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
- `tools\pack_m46_ai_copilot.ps1`
- `tools\pack_m46_1_ai_copilot_enrichment.ps1`
- `tools\pack_m46_2_ai_copilot_intent_expansion.ps1`
- `tools\pack_m46_3_ai_copilot_quality_evidence.ps1`
- `tools\pack_m46_4_ai_copilot_decision_consistency.ps1`
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
- `tools\pack_m46_ai_copilot.ps1 -RepoRoot D:\servis-platform` → Step 3 / M46
- `tools\pack_m46_1_ai_copilot_enrichment.ps1 -RepoRoot D:\servis-platform` → Step 3.1 / M46.1
- `tools\pack_m46_2_ai_copilot_intent_expansion.ps1 -RepoRoot D:\servis-platform` → Step 3.2 / M46.2
- `tools\pack_m46_3_ai_copilot_quality_evidence.ps1 -RepoRoot D:\servis-platform` → Step 3.3 / M46.3
- `tools\pack_m46_4_ai_copilot_decision_consistency.ps1 -RepoRoot D:\servis-platform` → Step 3.4 / M46.4

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

Kural: yeni tek seferlik overlay/apply script’i repo kalıcı araç setine eklenmez; işi bittikten sonra `tools/_archive/` altında tutulur.  
Kural 2: overlay zip’leri nested root üretmeden extract sonrası doğrudan apply path ile çalışmalıdır.  
Kural 3: üst milestone’lar alt milestone check uyumluluğunu bozmamalıdır.

## M45 Retention + Backup
- `tools\pack_m45_retention_backup.ps1`
- `tools\backup_create_m45.ps1`
- `tools\backup_restore_m45.ps1`
- `tools\check_m45_retention_backup_repo_contract.ps1`
- `docs\RUNBOOK_M45_RETENTION_BACKUP.md`

## M46 AI Copilot Foundation
- `tools\pack_m46_ai_copilot.ps1`
- `tools\check_m46_ai_copilot_repo_contract.ps1`
- `backend\scripts\m46_ai_copilot_check.js`
- `backend\src\routes\ai.js`
- `backend\src\ai\schemas.js`
- `backend\src\ai\service.js`
- `backend\src\ai\tools.js`
- `web\src\panels\shared\CopilotPanel.jsx`
- `docs\RUNBOOK_M46_AI_COPILOT.md`

## M46.1 AI Copilot Enrichment
- `tools\pack_m46_1_ai_copilot_enrichment.ps1`
- `tools\check_m46_1_ai_copilot_enrichment_repo_contract.ps1`
- `backend\scripts\m46_1_ai_copilot_enrichment_check.js`
- `web\src\panels\shared\CopilotPanel.jsx`
- `docs\RUNBOOK_M46_1_AI_COPILOT_ENRICHMENT.md`

## M46.2 AI Copilot Intent Expansion
- `tools\pack_m46_2_ai_copilot_intent_expansion.ps1`
- `tools\check_m46_2_ai_copilot_intent_expansion_repo_contract.ps1`
- `backend\scripts\m46_2_ai_copilot_intent_expansion_check.js`
- `backend\src\ai\schemas.js`
- `backend\src\ai\service.js`
- `backend\src\ai\tools.js`
- `web\src\panels\shared\CopilotPanel.jsx`
- `docs\RUNBOOK_M46_2_AI_COPILOT_INTENT_EXPANSION.md`

## M46.3 AI Copilot Quality + Evidence
- `tools\pack_m46_3_ai_copilot_quality_evidence.ps1`
- `tools\pack_m46_4_ai_copilot_decision_consistency.ps1`
- `tools\check_m46_3_ai_copilot_quality_evidence_repo_contract.ps1`
- `backend\scripts\m46_3_ai_copilot_quality_evidence_check.js`
- `backend\src\ai\service.js`
- `backend\src\ai\tools.js`
- `web\src\panels\shared\CopilotPanel.jsx`
- `docs\RUNBOOK_M46_3_AI_COPILOT_QUALITY_EVIDENCE.md`

## M46.4 AI Copilot Decision Consistency + Action Plan
- `tools\pack_m46_4_ai_copilot_decision_consistency.ps1`
- `tools\check_m46_4_ai_copilot_decision_consistency_repo_contract.ps1`
- `backend\scripts\m46_4_ai_copilot_decision_consistency_check.js`
- `backend\src\ai\service.js`
- `backend\src\ai\tools.js`
- `web\src\panels\shared\CopilotPanel.jsx`
- `docs\RUNBOOK_M46_4_AI_COPILOT_DECISION_CONSISTENCY.md`

