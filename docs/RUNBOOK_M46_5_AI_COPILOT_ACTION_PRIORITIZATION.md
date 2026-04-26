# RUNBOOK — M46.5 AI Copilot Action Prioritization + Evidence Calibration

> **Uyumluluk notu (M79+):** Bu M46 runbook'u art?k pilot-era exact versiyon etiketi beklemek yerine, ayn? davran???n modern Copilot y?zeyinde h?l? mevcut olup olmad???n? do?rulayan legacy compatibility referans? olarak okunmal?d?r.
> Exact `copilotVersion` eşitliği yerine davranışsal / yapısal doğrulama esastır.


Tarih: 2026-03-12  
Timezone: Europe/Istanbul

## Amaç
M46.4 ?st?ne aksiyon ?nceliklendirme ve kan?t kalibrasyonu katman? eklenir. Copilot h?l? read-only / suggestion-first ?al???r; write aksiyonu yapmaz.

## Yeni alanlar
- `recommendedFirstAction`
- `actionPlanSummary`
- `calibrationNotes[]`
- `recommendedActions[].priorityScore`
- `recommendedActions[].whyNow`
- `recommendedActions[].evidenceLinks[]`
- `recommendedActions[].referenceLinks[]`
- `recommendedActions[].blockedBy[]`
- `recommendedActions[].dependsOn[]`

## Davranış
- mevcut intent seti korunur
- structured JSON genişler
- recommendedActions artık sıralı ve puanlı döner
- ilk aksiyon ayrıca özetlenir
- evidence / reference bağları aksiyon seviyesinde görünür
- audit hattı korunur
- ROOM / SUPER_ADMIN step-up korunur
- alt milestone check zinciri bozulmaz

## UI
`web/src/panels/shared/CopilotPanel.jsx` içinde:
- First Action kartı
- Calibration Notes bölümü
- aksiyonlarda priority score rozeti
- `Neden şimdi`
- `blockedBy / dependsOn`
- `Evidence links / Reference links`

## Pack / Check
- `tools/pack_m46_5_ai_copilot_action_prioritization.ps1 -RepoRoot D:\servis-platform`
- `tools/check_m46_5_ai_copilot_action_prioritization_repo_contract.ps1 -RepoRoot D:\servis-platform`
- runtime: `backend/scripts/m46_5_ai_copilot_action_prioritization_check.js`