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
9. M46 AI Copilot Foundation hattı ve M46.1–M46.9 zinciri resmi green durumundadır.
10. M47 KVKK, M47.2 Capacity Baseline, M47.3 Edge Security ve M47.4 Mobile Readiness resmi green’dir.
11. M47.4-R clean rerun / repro fix güncel repo’da doğrulanmıştır; aynı M47.4 pack hattı temiz rerun’da PASS verir.
12. M48 Driver Mobile Foundation güncel repo’da green doğrulanmıştır.
13. M48.5 Room / Company Tablet Readiness güncel repo’da green doğrulanmıştır.
14. M49 Mobile Beta Hardening güncel repo’da green doğrulanmıştır.
15. M49.1 Driver Voice Guidance + Stop ETA güncel repo’da green doğrulanmıştır.
16. M50 Mobile Release Readiness güncel repo’da green doğrulanmıştır.
17. Son resmi tag docs tarafında hâlâ `v1-m47.4-green` olabilir; `.git` olmayan arşivden resmi tag promotion kararı verilmez.
18. Post-M50 resmi iş sırası: son resmi tag doğrula → M50 kanıtını canlı repo’da tekrar çalıştır → resmi tag/commit promotion → roadmap/backlog refresh.
19. Tek seferlik `apply_* / overlay_*` script’leri tools kökünde tutulmaz; legacy archive altında saklanır.
20. API / DB / UI / flow değişirse aynı değişiklikte docs güncellenir.
21. SSOT seti aynı değişiklikte birlikte senklenir:
   - `tools/PRIMER_SNAPSHOT.md`
   - `docs/PRIMER_SSOT.md`
   - `docs/CHECKLIST_SSOT.md`
   - `tools/CHECKLIST_SSOT.md`
   - `docs/STARTPACK_V1.md`
   - `tools/README.md`
22. Değişiklikler mümkünse tek seferde **overlay (zip)** paket olarak taşınır.
23. Overlay zip’leri extract sonrası doğrudan apply path ile çalışmalı; nested root üretilmez.
24. Üst milestone’lar alt milestone check uyumluluğunu bozmadan ilerletilir.
25. CHECKLIST’te `[x]` yalnızca pack/check green olduktan sonra işaretlenir.
26. repo/tools hijyen check sürekli korunur.
27. `driver@demo.com / demo123` hızlı panel kontrol hesabı olarak kalabilir; ana ürün driver girişi yine `Sürücü Kodu + PIN` akışıdır.

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
- M48 pack: `tools\pack_m48_driver_mobile_foundation.ps1 -RepoRoot D:\servis-platform`
- M48 runbook: `docs\RUNBOOK_M48_DRIVER_MOBILE_FOUNDATION.md`
- M48.5 pack: `tools\pack_m48_5_room_company_tablet_readiness.ps1 -RepoRoot D:\servis-platform`
- M48.5 runbook: `docs\RUNBOOK_M48_5_ROOM_COMPANY_TABLET_READINESS.md`
- M49 pack: `tools\pack_m49_mobile_beta_hardening.ps1 -RepoRoot D:\servis-platform`
- M49 runbook: `docs\RUNBOOK_M49_MOBILE_BETA_HARDENING.md`
- M49.1 pack: `tools\pack_m49_1_driver_voice_guidance_stop_eta.ps1 -RepoRoot D:\servis-platform`
- M49.1 runbook: `docs\RUNBOOK_M49_1_DRIVER_VOICE_GUIDANCE_STOP_ETA.md`
- M50 pack: `tools\pack_m50_mobile_release_readiness.ps1 -RepoRoot D:\servis-platform`
- M50 runbook: `docs\RUNBOOK_M50_MOBILE_RELEASE_READINESS.md`

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
- `M46 AI COPILOT FOUNDATION PACK PASS OK`
- `M46.1–M46.9 zinciri green`
- `M47 KVKK NOTICE / CONSENT FRAMEWORK PACK PASS OK`
- `M47.2 CAPACITY & LOAD BASELINE PACK PASS OK`
- `M47.3 PRODUCTION RESILIENCE + EDGE SECURITY PACK PASS OK`
- `M47.4 MOBILE READINESS WEB PASS PACK PASS OK`
- `M47.4-R CLEAN RERUN / REPRO FIX VERIFIED`
- `M48 DRIVER MOBILE FOUNDATION PACK PASS OK`
- `M48.5 ROOM / COMPANY TABLET READINESS PACK PASS OK`
- `M49 MOBILE BETA HARDENING PACK PASS OK`
- `M49.1 DRIVER VOICE GUIDANCE + STOP ETA PACK PASS OK`
- `M50 MOBILE RELEASE READINESS PACK PASS OK`

## 4) Ürün / operasyon kararları
- Driver login ana modeli `Sürücü Kodu + PIN`.
- İlk girişte PIN değişimi zorunlu.
- `driver@demo.com / demo123` yalnızca hızlı panel/smoke kontrol hesabı olarak korunur.
- Driver için telefon uygulaması birincil hedeftir.
- Room / Company için tablet güçlü hedef, telefonda temel kullanım korunur.
- Room / Company tablet hazırlığı aynı web uygulaması içinde ilerler; ayrı native tablet app henüz yoktur.
- M49.1 ile sürücü mobilde sesli rehber ve durak ETA desteği açılmıştır.
- M50 ile mobil yayın öncesi release hazırlık katmanı açılmıştır.
- `sürücünün telefon GPS'i` ürün içi birincil konum dili olarak korunur.
- AI hattı read-only / suggestion-first kalır.

## 5) TTL / link presetleri
- Parent invite presetleri: **1 hafta / 1 ay / 6 ay / 1 yıl**
- Personel/öğrenci public canlı link presetleri: **1 hafta / 1 ay / 6 ay / 1 yıl**

## 6) Sonraki rota
- `POST-M50 — Release / Tag / Roadmap Refresh`
- İş sırası: son resmi tag doğrula → M50 kanıtını canlı repo’da tekrar çalıştır → resmi tag/commit promotion → roadmap/backlog refresh
- Kanonik route token: `POST-M50 RELEASE TAG ROADMAP REFRESH`
