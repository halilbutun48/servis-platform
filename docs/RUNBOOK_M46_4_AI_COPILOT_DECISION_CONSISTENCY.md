# RUNBOOK — M46.4 AI Copilot Decision Consistency + Action Plan

Tarih: 2026-03-12  
Timezone: Europe/Istanbul

## Amaç
M46.3 üstüne karar tutarlılığı ve aksiyon planı katmanı eklenir. Copilot hâlâ read-only / suggestion-first çalışır; write aksiyonu yapmaz.

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
