# SERVIS-PLATFORM — STARTPACK V1/V2 (SSOT)

Tarih: 2026-03-15
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
10. M46.1–M46.9 zinciri resmi green’dir.
11. M47 KVKK, M47.2 Capacity Baseline, M47.3 Edge Security ve M47.4 Mobile Readiness resmi green’dir.
12. M47.4-R clean rerun / repro-fix planlı iştir; green değildir.
13. API / DB / UI / flow değişirse aynı değişiklikte docs güncellenir.
14. SSOT seti aynı değişiklikte birlikte senklenir:
   - `tools/PRIMER_SNAPSHOT.md`
   - `docs/PRIMER_SSOT.md`
   - `docs/CHECKLIST_SSOT.md`
   - `tools/CHECKLIST_SSOT.md`
   - `docs/STARTPACK_V1.md`
   - `tools/README.md`
15. Değişiklikler mümkünse tek seferde **overlay (zip)** paket olarak taşınır.
16. Overlay zip’leri extract sonrası doğrudan apply path ile çalışmalı; nested root üretilmez.
17. Üst milestone’lar alt milestone check uyumluluğunu bozmadan ilerletilir.
18. CHECKLIST’te `[x]` yalnızca pack/check green olduktan sonra işaretlenir.
19. repo/tools hijyen check sürekli korunur.

## 2) Kanonik komutlar
- Ana regresyon: `tools\pack.ps1 -To 41`
- M45 pack: `tools\pack_m45_retention_backup.ps1 -RepoRoot D:\servis-platform`
- M45 backup create: `tools\backup_create_m45.ps1 -RepoRoot D:\servis-platform`
- M45 backup restore: `tools\backup_restore_m45.ps1 -RepoRoot D:\servis-platform -BackupFile <manifest-or-dump>`
- M45 runbook: `docs\RUNBOOK_M45_RETENTION_BACKUP.md`
- M46.9 pack: `tools\pack_m46_9_session_refresh_security.ps1 -RepoRoot D:\servis-platform`
- M47 pack: `tools\pack_m47_kvkk_notice_consent_framework.ps1 -RepoRoot D:\servis-platform`
- M47.2 pack: `tools\pack_m47_2_capacity_load_baseline.ps1 -RepoRoot D:\servis-platform`
- M47.3 pack: `tools\pack_m47_3_production_resilience_edge_security.ps1 -RepoRoot D:\servis-platform`
- M47.4 pack: `tools\pack_m47_4_mobile_readiness_web_pass.ps1 -RepoRoot D:\servis-platform`
- M47.4 runbook: `docs\RUNBOOK_M47_4_MOBILE_READINESS_WEB_PASS.md`

## 3) Green durum özeti
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
- `M46.9 SESSION & REFRESH SECURITY PACK PASS OK`
- `M47 KVKK NOTICE / CONSENT FRAMEWORK PACK PASS OK`
- `M47.2 CAPACITY & LOAD BASELINE PACK PASS OK`
- `M47.3 PRODUCTION RESILIENCE + EDGE SECURITY PACK PASS OK`
- `M47.4 MOBILE READINESS WEB PASS PACK PASS OK`

## 4) Ürün / operasyon kararları
- Driver login ana modeli `Sürücü Kodu + PIN`.
- İlk girişte PIN değişimi zorunlu.
- Driver için telefon uygulaması birincil hedeftir.
- Room / Company için tablet güçlü hedef, telefonda temel kullanım korunur.
- `sürücünün telefon GPS'i` ürün içi birincil konum dili olarak korunur.
- AI hattı read-only / suggestion-first kalır.

## 5) TTL / link presetleri
- Parent invite presetleri: **1 hafta / 1 ay / 6 ay / 1 yıl**
- Personel/öğrenci public canlı link presetleri: **1 hafta / 1 ay / 6 ay / 1 yıl**

## 6) Sonraki rota
- `M47.4-R — Clean Rerun / Repro Fix`
- `M48 — Driver Mobile App Foundation`
- `M48.5 — Room / Company Tablet Readiness`
- `M49 — Mobile Beta Hardening`
- `M49.1 — Driver Voice Guidance + Stop ETA`
- `M50 — Mobile Release Readiness`
- Kanonik route token: `M47.4-R CLEAN RERUN REPRO FIX`
