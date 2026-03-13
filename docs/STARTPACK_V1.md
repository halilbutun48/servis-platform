# SERVIS-PLATFORM — STARTPACK V1/V2 (SSOT)

Tarih: 2026-03-13  
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
10. M46.1 Enrichment, M46.2 Intent Expansion, M46.3 Quality + Evidence, M46.4 Decision Consistency, M46.5 Action Prioritization hatları resmi green’dir.
11. M46.6-A/B/T/C/D/D2/D3/C2/D4 rehber/sohbet zinciri resmi green’dir.
12. API / DB / UI / flow değişirse aynı değişiklikte docs güncellenir.
13. Değişiklikler mümkünse tek seferde **overlay (zip)** paket olarak taşınır.
14. Overlay zip’leri extract sonrası doğrudan apply path ile çalışmalı; nested root üretilmez.
15. Üst milestone’lar alt milestone check uyumluluğunu bozmadan ilerletilir.

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
- M44 pack: `tools\pack_m44_telematics.ps1 -RepoRoot D:\servis-platform`
- M45 pack: `tools\pack_m45_retention_backup.ps1 -RepoRoot D:\servis-platform`
- M46 pack: `tools\pack_m46_ai_copilot.ps1 -RepoRoot D:\servis-platform`
- M46.1 pack: `tools\pack_m46_1_ai_copilot_enrichment.ps1 -RepoRoot D:\servis-platform`
- M46.2 pack: `tools\pack_m46_2_ai_copilot_intent_expansion.ps1 -RepoRoot D:\servis-platform`
- M46.3 pack: `tools\pack_m46_3_ai_copilot_quality_evidence.ps1 -RepoRoot D:\servis-platform`
- M46.4 pack: `tools\pack_m46_4_ai_copilot_decision_consistency.ps1 -RepoRoot D:\servis-platform`
- M46.5 pack: `tools\pack_m46_5_ai_copilot_action_prioritization.ps1 -RepoRoot D:\servis-platform`
- M46.6-A pack: `tools\pack_m46_6_a_ai_job_guide.ps1 -RepoRoot D:\servis-platform`
- M46.6-B pack: `tools\pack_m46_6_b_ai_job_guide_precheck.ps1 -RepoRoot D:\servis-platform`
- M46.6-T pack: `tools\pack_m46_6_t_ai_location_source_guide.ps1 -RepoRoot D:\servis-platform`
- M46.6-C pack: `tools\pack_m46_6_c_ai_screen_help.ps1 -RepoRoot D:\servis-platform`
- M46.6-D pack: `tools\pack_m46_6_d_ai_chat_shell.ps1 -RepoRoot D:\servis-platform`
- M46.6-D2 pack: `tools\pack_m46_6_d2_ai_context_chat.ps1 -RepoRoot D:\servis-platform`
- M46.6-D3 pack: `tools\pack_m46_6_d3_ai_actionable_chat.ps1 -RepoRoot D:\servis-platform`
- M46.6-C2 pack: `tools\pack_m46_6_c2_screen_coverage_terminology.ps1 -RepoRoot D:\servis-platform`
- M46.6-D4 pack: `tools\pack_m46_6_d4_simple_role_mode.ps1 -RepoRoot D:\servis-platform`

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
- `M46.5 AI COPILOT ACTION PRIORITIZATION + EVIDENCE CALIBRATION PACK PASS OK`
- `M46.6-A AI JOB GUIDE PACK PASS OK`
- `M46.6-B AI JOB GUIDE PRECHECK PACK PASS OK`
- `M46.6-T AI LOCATION SOURCE GUIDE PACK PASS OK`
- `M46.6-C AI SCREEN HELP PACK PASS OK`
- `M46.6-D AI CHAT SHELL PACK PASS OK`
- `M46.6-D2 AI CONTEXT CHAT PACK PASS OK`
- `M46.6-D3 AI ACTIONABLE CHAT PACK PASS OK`
- `M46.6-C2 SCREEN COVERAGE + TERMINOLOGY PACK PASS OK`
- `M46.6-D4 SIMPLE ROLE MODE PACK PASS OK`

## 4) M46.6 Yardım / Sohbet kararı
- Copilot read-only / suggestion-first kalır.
- Chat shell, context chat, actionable chat ve simple role mode tek zincir olarak düşünülür.
- C2 ile ekran kapsamı ve terim sözlüğü genişletilmiştir.
- D4 ile DRIVER / PERSONEL / PARENT için sade mod resmileştirilmiştir.
- Ürün dili Türkçedir; `sürücünün telefon GPS'i`, `cihaz GPS'i`, `sözleşme`, `teklif`, `işlem kaydı` tercih edilir.

## 5) Sonraki iş kuralı
- Kod green olduktan sonra docs/SSOT senki geciktirilmez.
- Tek seferlik overlay/apply script’leri repo kalıcı araç setine eklenmez; işi bittikten sonra `tools/_archive/` altında tutulur.
- Repo-contract checker’ları PowerShell 5 / UTF-8 kırılganlıklarına karşı mümkünse ASCII-safe veya normalize edilmiş şekilde yazılır.
- M45 runbook: `docs\RUNBOOK_M45_RETENTION_BACKUP.md`
