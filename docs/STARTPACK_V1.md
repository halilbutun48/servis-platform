# STARTPACK_V1 — SERVIS-PLATFORM (PERSONEL SERVİS V1/V2)

Tarih: 2026-03-12  
Timezone: Europe/Istanbul

Bu dosya repo için kısa çalışma runbook’udur.

## 1) GOLDEN RULES
1. Ana referans **M41 PACK PASS**’tir.
2. M42 optional ayrı doğrulanır.
3. Step 0.6 stabil ekler ayrı pack ile doğrulanmıştır.
4. Step 1 Security Foundation + TOTP Step-up resmi olarak green’dir.
5. M104 + M105 + M106 repo/tools hijyen check’leri PASS durumundadır.
6. M43 Google Auth + Invite Gate hattı resmi green durumundadır.
7. M44 Telematics hattı resmi green durumundadır.
8. M45 Retention + Backup hattı resmi green durumundadır.
9. M46 AI Copilot Foundation hattı resmi green durumundadır.
10. M46.1 AI Copilot Enrichment hattı resmi green durumundadır.
11. M46.2 AI Copilot Intent Expansion hattı resmi green durumundadır.
12. M46.3 AI Copilot Quality + Evidence hattı resmi green durumundadır.
13. M46.4 AI Copilot Decision Consistency + Action Plan hattı resmi green durumundadır.
14. M46.5 AI Copilot Action Prioritization + Evidence Calibration hattı resmi green durumundadır.
15. API / DB / UI / flow değişirse aynı değişiklikte docs güncellenir.
16. Değişiklikler mümkünse tek seferde **overlay (zip)** paket olarak taşınır.
17. Overlay zip’leri extract sonrası doğrudan apply path ile çalışmalı; nested root üretilmez.

## 2) Kanonik komutlar
- Ana regresyon: `tools\pack.ps1 -To 41`
- Optional check-in: `tools\pack_m42_optional.ps1`
- Step 0.6 stabil: `tools\pack_step06_stabil.ps1`
- Step 1 foundation: `tools\pack_step1_security_foundation.ps1`
- Step 1 TOTP: `tools\pack_step1_totp_stepup.ps1`
- Repo hijyen: `tools\check_repo_cleanup_m104.ps1 -RepoRoot D:\servis-platform`
- Tools hijyen: `tools\check_tools_hygiene_m105.ps1 -RepoRoot D:\servis-platform`
- Link TTL + primer hijyen: `tools\check_repo_hygiene_m106.ps1 -RepoRoot D:\servis-platform`
- M43 pack: `tools\pack_m43_google_auth_invite_gate.ps1 -RepoRoot D:\servis-platform`
- M43 repo-contract: `tools\check_m43_google_auth_invite_gate_repo_contract.ps1 -RepoRoot D:\servis-platform`
- M44 pack: `tools\pack_m44_telematics.ps1 -RepoRoot D:\servis-platform`
- M44 repo-contract: `tools\check_m44_telematics_repo_contract.ps1 -RepoRoot D:\servis-platform`
- M45 pack: `tools\pack_m45_retention_backup.ps1 -RepoRoot D:\servis-platform`
- M45 repo-contract: `tools\check_m45_retention_backup_repo_contract.ps1 -RepoRoot D:\servis-platform`
- M46 pack: `tools\pack_m46_ai_copilot.ps1 -RepoRoot D:\servis-platform`
- M46 repo-contract: `tools\check_m46_ai_copilot_repo_contract.ps1 -RepoRoot D:\servis-platform`
- M46.1 pack: `tools\pack_m46_1_ai_copilot_enrichment.ps1 -RepoRoot D:\servis-platform`
- M46.1 repo-contract: `tools\check_m46_1_ai_copilot_enrichment_repo_contract.ps1 -RepoRoot D:\servis-platform`
- M46.2 pack: `tools\pack_m46_2_ai_copilot_intent_expansion.ps1 -RepoRoot D:\servis-platform`
- M46.2 repo-contract: `tools\check_m46_2_ai_copilot_intent_expansion_repo_contract.ps1 -RepoRoot D:\servis-platform`
- M46.3 pack: `tools\pack_m46_3_ai_copilot_quality_evidence.ps1 -RepoRoot D:\servis-platform`
- M46.3 repo-contract: `tools\check_m46_3_ai_copilot_quality_evidence_repo_contract.ps1 -RepoRoot D:\servis-platform`
- M46.4 pack: `tools\pack_m46_4_ai_copilot_decision_consistency.ps1 -RepoRoot D:\servis-platform`
- M46.4 repo-contract: `tools\check_m46_4_ai_copilot_decision_consistency_repo_contract.ps1 -RepoRoot D:\servis-platform`
- M46.5 pack: `tools\pack_m46_5_ai_copilot_action_prioritization.ps1 -RepoRoot D:\servis-platform`
- M46.5 repo-contract: `tools\check_m46_5_ai_copilot_action_prioritization_repo_contract.ps1 -RepoRoot D:\servis-platform`

## 3) Resmi green durum
- `M41 PACK PASS`
- `M42 OPTIONAL PACK PASS`
- `STEP 0.6 STABIL PACK PASS`
- `STEP 1 SECURITY FOUNDATION PACK PASS`
- `STEP 1 TOTP STEP-UP PACK PASS`
- `M104 REPO CLEANUP CHECK PASS`
- `M105 TOOLS HYGIENE CHECK PASS`
- `M106 REPO HYGIENE + LINK TTL CHECK PASS`
- `M43 GOOGLE AUTH + INVITE GATE PACK PASS OK`
- `M44 TELEMATICS PACK PASS OK`
- `M45 RETENTION + BACKUP PACK PASS OK`
- `M46 AI COPILOT FOUNDATION PACK PASS OK`
- `M46.1 AI COPILOT ENRICHMENT PACK PASS OK`
- `M46.2 AI COPILOT INTENT EXPANSION PACK PASS OK`
- `M46.3 AI COPILOT QUALITY + EVIDENCE PACK PASS OK`
- `M46.4 AI COPILOT DECISION CONSISTENCY + ACTION PLAN PACK PASS OK`

## 4) Link erişim politikası
- Parent invite presetleri: **1 hafta / 1 ay / 6 ay / 1 yıl**
- Personel/öğrenci public canlı link presetleri: **1 hafta / 1 ay / 6 ay / 1 yıl**
- Personel public link ham tokenı sadece ilk üretimde gösterilir
- Personel public link TTL’i vardiya `endAt` ile zorunlu clamp edilmez

## 5) Step 1 özeti
### Security Foundation
- refresh reuse detection
- export limiter
- login/gps/export limit hattı
- RBAC deny-by-default sanity matrix

### TOTP Step-up
- ROOM + SUPER_ADMIN zorunlu
- `stepUpRequired` login cevabı
- verify sonrası `stepUpUntil`
- korunan ana alanlar:
  - `/api/admin`
  - `/api/admin/logs`
  - `/api/logs/export`
  - `/api/vehicles`
  - `/api/drivers`
  - `/api/availability`
  - `/api/shifts`

## 6) Step 2 özeti — M43 resmi green
- Google Auth (GIS) hattı mevcut
- Invite Gate aktif
- role/scope bağlama doğrulandı
- invite yoksa `INVITE_REQUIRED`
- runtime check + repo-contract + tek pack PASS

Detay çekirdek:
- `Invite` tablosu
- `UserIdentity` tablosu
- `POST /api/auth/google`
- `PARENT_INVITE` / `PERSONEL_INVITE` / opsiyonel `ROOM_USER_INVITE`

## 6.1) Step 2.5 özeti — M44 resmi green
- telematics normalize core aktif
- direct HTTP push alımı mevcut
- vendor cloud adapter mevcut
- provider normalize katmanı mevcut
- `GpsDevice` modeli + source tracking (`DEVICE` / `VENDOR`) mevcut
- runtime check + repo-contract + tek pack PASS

## 6.2) Step 2.6 özeti — M45 resmi green
- retention policy görünürlüğü mevcut
- backup policy + manifest görünürlüğü mevcut
- yerel SQL backup create / kontrollü restore tool hattı mevcut
- runtime check + repo-contract + tek pack PASS

## 6.3) Step 3 özeti — M46 resmi green
- `POST /api/ai/copilot` mevcut
- read-only / suggestion-first foundation aktif
- role/scope kontrollü erişim var
- `ROOM` + `SUPER_ADMIN` için step-up guard var
- structured JSON output var
- `AI_COPILOT_QUERY` audit izi var
- runtime check + repo-contract + tek pack PASS

## 6.4) Step 3.1 özeti — M46.1 resmi green
- `copilotVersion` alanı mevcut
- `severity / blocks / nextChecks / references` alanları mevcut
- UI: `Kopyala özet` + `Kopyala not` + `Son 5 analiz` mevcut
- runtime check + repo-contract + tek pack PASS

## 6.5) Step 3.2 özeti — M46.2 resmi green
- yeni intentler mevcut:
  - `ASSIGNMENT_READINESS`
  - `OFFER_DECISION_HELP`
  - `GPS_SIGNAL_DIAGNOSIS`
- `intentLabel` + `entityLabel` mevcut
- `scope.summary` + `highlights` mevcut
- daha zengin `references` mevcut
- UI: hızlı seçim araması + highlights + scope summary mevcut
- runtime check + repo-contract + tek pack PASS

## 6.6) Step 3.3 özeti — M46.3 resmi green
- yeni structured alanlar mevcut:
  - `confidence`
  - `explanation`
  - `evidence`
  - `decisionSignals`
- `providerSummary` mevcut
- UI: confidence + explanation + evidence + decision signals bölümleri mevcut
- M46.1 / M46.2 check zinciri ileri uyumlu tutulur
- runtime check + repo-contract + tek pack PASS

## 6.7) Step 3.4 özeti — M46.4 resmi green
- yeni karar alanları mevcut:
  - `overallStatus`
  - `actionability`
  - `dataFreshness`
  - `coverage`
  - `recommendedActions`
  - `consistencyChecks`
  - `missingData`
  - `blockers`
- UI: decision badges + recommended actions + missing data / blockers + consistency checks mevcut
- M46.1 / M46.2 / M46.3 check zinciri ileri uyumlu tutulur
- runtime check + repo-contract + tek pack PASS

## 6.8) Step 3.5 özeti — M46.5 resmi green
- yeni aksiyon önceliklendirme alanları mevcut:
  - `recommendedFirstAction`
  - `actionPlanSummary`
  - `calibrationNotes`
  - `priorityScore`
  - `whyNow`
  - `evidenceLinks`
  - `referenceLinks`
  - `blockedBy`
  - `dependsOn`
- UI: first action + calibration notes + action priority details görünür
- M46.1 / M46.2 / M46.3 / M46.4 check zinciri ileri uyumlu tutulur
- runtime check + repo-contract + tek pack PASS

## 6.9) Bir sonraki resmi hedef
- **henüz sabitlenmedi**
- çalışma adı olarak **M46.6** açılabilir
- M46 / M46.1 / M46.2 / M46.3 / M46.4 / M46.5 artık sıradaki hedef değil, resmi green katmanlardır

## 7) SSOT dosyaları
- `tools/CHECKLIST_SSOT.md`
- `docs/CHECKLIST_SSOT.md`
- `docs/PRIMER_SSOT.md`
- `docs/STARTPACK_V1.md`
- `tools/PRIMER_SNAPSHOT.md`
- `tools/README.md`
- `docs/overlays/INDEX.md`

## 8) Repo hijyen / cleanup standardı
- Canlı kaynak ağacında `.bak` dosyası bırakılmaz; `tools/_backup/` altına taşınır.
- Repo kökünde geçici overlay README/TXT dosyası bırakılmaz; `docs/_archive/root-legacy/` altına alınır.
- Aynı işi yapan stale panel/route dosyaları canlı ağaçta tutulmaz; arşive taşınır.
- `tools/` kökünde sadece kanonik run/pack/check script’leri tutulur.
- Eski `apply_*`, `overlay_*`, `OVERLAY_*` ve tek seferlik hotfix script’leri `tools/_archive/` altına taşınır.

## M45 Retention + Backup
- `tools\pack_m45_retention_backup.ps1`
- `tools\check_m45_retention_backup_repo_contract.ps1`
- `tools\backup_create_m45.ps1`
- `tools\backup_restore_m45.ps1`
- `backend\scripts\m45_retention_backup_check.js`
- `backend\src\ops\retentionBackupPolicy.js`
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


## M46.5 AI Copilot Action Prioritization + Evidence Calibration
- `tools\pack_m46_5_ai_copilot_action_prioritization.ps1`
- `tools\check_m46_5_ai_copilot_action_prioritization_repo_contract.ps1`
- `backend\scripts\m46_5_ai_copilot_action_prioritization_check.js`
- `backend\src\ai\service.js`
- `backend\src\ai\tools.js`
- `web\src\panels\shared\CopilotPanel.jsx`
- `docs\RUNBOOK_M46_5_AI_COPILOT_ACTION_PRIORITIZATION.md`
