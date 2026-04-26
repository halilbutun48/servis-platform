# RUNBOOK — M46.4 AI Copilot Decision Consistency + Action Plan

> **Uyumluluk notu (M79+):** Bu M46 runbook'u art?k pilot-era exact versiyon etiketi beklemek yerine, ayn? davran???n modern Copilot y?zeyinde h?l? mevcut olup olmad???n? do?rulayan legacy compatibility referans? olarak okunmal?d?r.
> Exact `copilotVersion` eşitliği yerine davranışsal / yapısal doğrulama esastır.


Tarih: 2026-03-12  
Timezone: Europe/Istanbul

## Amaç
M46.3 ?st?ne karar tutarl?l??? ve aksiyon plan? katman? eklenir. Copilot h?l? read-only / suggestion-first ?al???r; write aksiyonu yapmaz.

## Yeni alanlar
- `overallStatus` → `OK | ATTENTION | BLOCKED`
- `actionability` → `READY | REVIEW_NEEDED | NOT_READY`
- `dataFreshness` → `FRESH | STALE | UNKNOWN`
- `coverage` → `SUFFICIENT | PARTIAL | WEAK`
- `recommendedActions[]`
- `consistencyChecks[]`
- `missingData[]`
- `blockers[]`

## Davranış
- mevcut intent seti korunur
- structured JSON genişler
- audit hattı korunur
- ROOM / SUPER_ADMIN step-up korunur
- alt milestone check zinciri bozulmaz

## UI
`web/src/panels/shared/CopilotPanel.jsx` içinde:
- overall/actionability/freshness/coverage rozetleri
- Recommended Actions bölümü
- Missing Data bölümü
- Blockers bölümü
- Consistency Checks bölümü

## Pack / Check
- `tools/pack_m46_4_ai_copilot_decision_consistency.ps1 -RepoRoot D:\servis-platform`
- `tools/check_m46_4_ai_copilot_decision_consistency_repo_contract.ps1 -RepoRoot D:\servis-platform`
- runtime: `backend/scripts/m46_4_ai_copilot_decision_consistency_check.js`