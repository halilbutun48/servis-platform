# RUNBOOK — M46.5 AI Copilot Action Prioritization + Evidence Calibration

> **Uyumluluk notu (M79+):** Bu M46 runbook'u artık pilot-era exact versiyon etiketi beklemek yerine, aynı davranışın modern Copilot yüzeyinde hâlâ mevcut olup olmadığını doğrulayan legacy compatibility referansı olarak okunmalıdır.
> Exact `copilotVersion` eşitliği yerine davranışsal / yapısal doğrulama esastır.


Tarih: 2026-03-12  
Timezone: Europe/Istanbul

## Amaç
M46.4 üstüne aksiyon önceliklendirme ve kanıt kalibrasyonu katmanı eklenir. Copilot hâlâ read-only / suggestion-first çalışır; write aksiyonu yapmaz.

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