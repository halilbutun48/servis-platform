# SERVIS-PLATFORM — PERSONEL SERVİS V1/V2 — PRIMER SSOT (Repo-Verified, Post-M49.1)

Tarih: 2026-03-15
Timezone: Europe/Istanbul

## 0) Durum / referans

Repo: `D:\servis-platform`

Ana resmi green durum:
- ✅ `M41 PACK PASS`
- ✅ `M42 OPTIONAL PACK PASS`
- ✅ `STEP 0.6 STABIL PACK PASS`
- ✅ `STEP 1 SECURITY FOUNDATION PACK PASS`
- ✅ `STEP 1 TOTP STEP-UP PACK PASS`
- ✅ `M104 REPO CLEANUP CHECK PASS`
- ✅ `M105 TOOLS HYGIENE CHECK PASS`
- ✅ `M106 REPO HYGIENE + LINK TTL CHECK PASS`
- ✅ `M43 GOOGLE AUTH + INVITE GATE PACK PASS OK`
- ✅ `M44 TELEMATICS PACK PASS OK`
- ✅ `M45 RETENTION + BACKUP PACK PASS OK`
- ✅ `M46 AI COPILOT FOUNDATION PACK PASS OK`
- ✅ `M46.1 AI COPILOT ENRICHMENT PACK PASS OK`
- ✅ `M46.2 AI COPILOT INTENT EXPANSION PACK PASS OK`
- ✅ `M46.3 AI COPILOT QUALITY + EVIDENCE PACK PASS OK`
- ✅ `M46.4 AI COPILOT DECISION CONSISTENCY + ACTION PLAN PACK PASS OK`
- ✅ `M46.5 AI COPILOT ACTION PRIORITIZATION + EVIDENCE CALIBRATION PACK PASS OK`
- ✅ `M46.6-A AI JOB GUIDE PACK PASS OK`
- ✅ `M46.6-B AI JOB GUIDE PRECHECK PACK PASS OK`
- ✅ `M46.6-T AI LOCATION SOURCE GUIDE PACK PASS OK`
- ✅ `M46.6-C AI SCREEN HELP PACK PASS OK`
- ✅ `M46.6-D AI CHAT SHELL PACK PASS OK`
- ✅ `M46.6-D2 AI CONTEXT CHAT PACK PASS OK`
- ✅ `M46.6-D3 AI ACTIONABLE CHAT PACK PASS OK`
- ✅ `M46.6-C2 SCREEN COVERAGE + TERMINOLOGY PACK PASS OK`
- ✅ `M46.6-D4 SIMPLE ROLE MODE PACK PASS OK`
- ✅ `M46.7 DRIVER CODE LOGIN + REHBER FIRST PACK PASS OK`
- ✅ `M46.8 DRIVER ACCESS HARDENING PACK PASS OK`
- ✅ `M46.9 SESSION & REFRESH SECURITY PACK PASS OK`
- ✅ `M47 KVKK NOTICE / CONSENT FRAMEWORK PACK PASS OK`
- ✅ `M47.2 CAPACITY & LOAD BASELINE PACK PASS OK`
- ✅ `M47.3 PRODUCTION RESILIENCE + EDGE SECURITY PACK PASS OK`
- ✅ `M47.4 MOBILE READINESS WEB PASS PACK PASS OK`
- ✅ `M48 DRIVER MOBILE FOUNDATION PACK PASS OK`
- ✅ `M48.5 ROOM / COMPANY TABLET READINESS PACK PASS OK`
- ✅ `M49 MOBILE BETA HARDENING PACK PASS OK`
- ✅ `M49.1 DRIVER VOICE GUIDANCE + STOP ETA PACK PASS OK`

Güncel repo-verified ek durum:
- ✅ `M47.4-R CLEAN RERUN / REPRO FIX VERIFIED`

Önemli referans:
- `tools/STABLE_TO.txt = 41`
- ana stabil taban hâlâ `M41`
- son resmi green commit/tag hattı: `e012d43` / `v1-m47.4-green`
- güncel repo çalışma ağacında `tools\pack_m47_4_mobile_readiness_web_pass.ps1 -RepoRoot D:\servis-platform` temiz rerun senaryosunda PASS vermektedir
- güncel repo çalışma ağacında `tools\pack_m48_driver_mobile_foundation.ps1 -RepoRoot D:\servis-platform` PASS vermektedir
- güncel repo çalışma ağacında `tools\pack_m48_5_room_company_tablet_readiness.ps1 -RepoRoot D:\servis-platform` PASS vermektedir
- güncel repo çalışma ağacında `tools\pack_m49_mobile_beta_hardening.ps1 -RepoRoot D:\servis-platform` PASS vermektedir
- güncel repo çalışma ağacında `tools\pack_m49_1_driver_voice_guidance_stop_eta.ps1 -RepoRoot D:\servis-platform` PASS vermektedir
- `M47.4-R` ayrı bir ürün özelliği değil; seed + driver login device binding + rerun/check uyum düzeltmesidir
- `M47.4-R` için ayrı pack script yoktur; resmi kanıt, aynı M47.4 pack hattının artık clean rerun’da da PASS vermesidir

Ana kanıt komutları:
- `./tools/pack.ps1 -To 41`
- `./tools/pack_m45_retention_backup.ps1 -RepoRoot D:\servis-platform`
- `./tools/backup_create_m45.ps1 -RepoRoot D:\servis-platform`
- `./tools/backup_restore_m45.ps1 -RepoRoot D:\servis-platform -BackupFile <manifest-or-dump>`
- `./tools/pack_m46_9_session_refresh_security.ps1 -RepoRoot D:\servis-platform`
- `./tools/pack_m47_kvkk_notice_consent_framework.ps1 -RepoRoot D:\servis-platform`
- `./tools/pack_m47_2_capacity_load_baseline.ps1 -RepoRoot D:\servis-platform`
- `./tools/pack_m47_3_production_resilience_edge_security.ps1 -RepoRoot D:\servis-platform`
- `./tools/pack_m47_4_mobile_readiness_web_pass.ps1 -RepoRoot D:\servis-platform`
- `./tools/pack_m48_driver_mobile_foundation.ps1 -RepoRoot D:\servis-platform`
- `./tools/pack_m48_5_room_company_tablet_readiness.ps1 -RepoRoot D:\servis-platform`
- `./tools/pack_m49_mobile_beta_hardening.ps1 -RepoRoot D:\servis-platform`
- `./tools/pack_m49_1_driver_voice_guidance_stop_eta.ps1 -RepoRoot D:\servis-platform`

M47.4-R ile netleşen teknik sonuç:
- demo kullanıcı seed’i rerun’da `demo123` parolasını tekrar yazabilir durumdadır
- driver compat login hattı bound `deviceId` değerini reuse eder
- `M41` device binding check’i rerun-uyumlu çalışır
- `driver@demo.com / demo123` hızlı panel kontrol hesabı olarak korunur; ana ürün girişi değildir

M48 ile netleşen teknik sonuç:
- `mobile/` altında Expo SDK 54 tabanlı sürücü uygulama iskeleti vardır
- mobil login hattı `Sürücü Kodu + PIN` akışını ve refresh + `deviceId` uyumunu taşır
- `requirePinChange` varsa mobilde doğrudan PIN değişim ekranı açılır
- `Bugün` ekranı vardiya özeti, rota özeti, sonraki durak, haritada aç ve GPS hazırlık kartını içerir

M48.5 ile netleşen teknik sonuç:
- Room / Company tablet hazırlığı aynı web uygulaması içinde açılmıştır
- `TabletOpsQuickBar` ile hızlı işlem / harita / kaydırmasız erişim kabuğu eklenmiştir
- tablet odaklı grid ve shell düzeni `web/src/index.css` içinde tanımlanmıştır
- ayrı native room/company tablet uygulaması henüz açılmamıştır

M49 ile netleşen teknik sonuç:
- mobil beta hardening ile foreground `active` olduğunda otomatik veri yenileme eklenmiştir
- 30 saniyelik periyodik yenileme ve backend health pingi görünürlüğü vardır
- `Beta durum` kartında API tabanı, `Device ID`, son senkron ve son hata bilgisi görünür
- `Güvenli çıkış` akışı refresh session revoke denemesiyle desteklenir

M49.1 ile netleşen teknik sonuç:
- `expo-speech` tabanlı sesli rehber mobilde açılmıştır
- sürücü `Sıradaki durağı oku` ve `ETA oku` işlemlerini mobil içinden çalıştırabilir
- sesli rehber açık/kapalı tercihi saklanır
- aynı durak/ETA için tekrar anonslarını azaltan temel dedupe uygulanmıştır

Ürün / operasyon kararları:
- Driver login ana akışı `Sürücü Kodu + PIN` olarak korunur.
- İlk girişte PIN değişimi zorunludur.
- Driver için birincil hedef telefon uygulamasıdır.
- Room / Company için tablet güçlü hedef, telefonda temel kullanım korunur.
- Super Admin / büyük log-rapor işleri masaüstü önceliklidir.
- Rehber ürün içinde birincil yardımcı yüzdür.
- AI hattı read-only / suggestion-first kalır.
- overlay standardı: **tek zip / tek kök klasör / nested root yok**.
- Üst milestone’lar alt milestone check uyumluluğunu bozmadan ilerler.
- ürün dili içinde `sürücünün telefon GPS'i` ifadesi korunur.

TTL / public link özeti:
- Parent invite ve personel/öğrenci public link süre presetleri 1 hafta / 1 ay / 6 ay / 1 yıl.

Sonraki doğru rota:
- `M50 — Mobile Release Readiness`
Kanonik next-route token: `M50 MOBILE RELEASE READINESS`

Yeni sohbet açınca ilk cümle:
Repo şu an M41 ana green tabanı üzerinde; M42 optional, Step 0.6 stabil, Step 1 Security, Step 1 TOTP, M104/M105/M106 hijyen, M43 Google Auth, M44 Telematics, M45 Retention + Backup, M46 AI Copilot zinciri, M46.7 driver code login + rehber first, M46.8 driver access hardening, M46.9 session & refresh security, M47 KVKK, M47.2 capacity baseline, M47.3 edge security, M47.4 mobile readiness web pass, M47.4-R clean rerun / repro fix, M48 driver mobile foundation, M48.5 room/company tablet readiness, M49 mobile beta hardening ve M49.1 driver voice guidance + stop ETA repo-verified green durumda. Sonraki doğru rota M50 — Mobile Release Readiness.