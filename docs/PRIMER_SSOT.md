# SERVIS-PLATFORM — PERSONEL SERVİS V1/V2 — PRIMER SNAPSHOT

Tarih: 2026-03-18
Timezone: Europe/Istanbul
Repo: `D:\servis-platform`
Branch: `main`

## 0) Resmi green taban

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
- ✅ `M46.1–M46.9 zinciri green`
- ✅ `M47 KVKK NOTICE / CONSENT FRAMEWORK PACK PASS OK`
- ✅ `M47.2 CAPACITY & LOAD BASELINE PACK PASS OK`
- ✅ `M47.3 PRODUCTION RESILIENCE + EDGE SECURITY PACK PASS OK`
- ✅ `M47.4 MOBILE READINESS WEB PASS PACK PASS OK`
- ✅ `M47.4-R CLEAN RERUN / REPRO FIX VERIFIED`
- ✅ `M48 DRIVER MOBILE FOUNDATION PACK PASS OK`
- ✅ `M48.5 ROOM / COMPANY TABLET READINESS PACK PASS OK`
- ✅ `M49 MOBILE BETA HARDENING PACK PASS OK`
- ✅ `M49.1 DRIVER VOICE GUIDANCE + STOP ETA PACK PASS OK`
- ✅ `M50 MOBILE RELEASE READINESS PACK PASS OK`
- ✅ `M51–M53 BACKFILL VERIFICATION PACK PASS OK`
- ✅ `M54.3 DISPATCH APPROVE + REPACK PACK PASS OK`
- ✅ `M54.4 DRIVER ROUTE DELIVERY PACK PASS OK`
- ✅ `M55 REPORTS + NO_SHOW PACK PASS OK`
- ✅ `M56 KVKK MATRIX + ETA QUALITY PACK PASS OK`
- ✅ `M57 MOBILE HARDENING PACK PASS OK`
- ✅ `POST-M41 EXTERNAL PACK RUNNER PASS OK`

Not:
- Resmi green çizgi artık `M57` seviyesine kadar doğrulanmıştır.
- `M42+` pack script'leri self-only calisir; tam `M42 -> M57` green hatti ve M57 full kontrolunun kanonik komutu `tools\pack_post_m41_to_m57.ps1 -RepoRoot D:\servis-platform -NoBuild` seklindedir.
- `tools\pack_post_m41_to_m54_4.ps1` uyumluluk icin korunur ve yeni orchestrator'a forward eder.
- `M44` ayri kanonik pack olarak `tools\pack_m44_telematics.ps1 -RepoRoot D:\servis-platform` ile dogrulanir.
- `M45` ayri kanonik pack olarak `tools\pack_m45_retention_backup.ps1 -RepoRoot D:\servis-platform` ile dogrulanir.
- `M46` ayri kanonik pack olarak `tools\pack_m46_ai_copilot.ps1 -RepoRoot D:\servis-platform` ile dogrulanir.
- `M55` ayri kanonik pack olarak `tools\pack_m55_reports_no_show.ps1 -RepoRoot D:\servis-platform` ile dogrulanir.
- `M56` ayri kanonik pack olarak `tools\pack_m56_kvkk_eta_quality.ps1 -RepoRoot D:\servis-platform` ile dogrulanir.
- `M57` full implementation komutu: `tools\pack_m57_mobile_hardening.ps1 -RepoRoot D:\servis-platform`.
- `M57` scaffold/files komutu korunur: `tools\pack_m57_mobile_hardening.ps1 -RepoRoot D:\servis-platform -ScaffoldOnly`.

## 1) Güncel aktif durum
- `M57` genel green oldu.
- `M57.1 foreground GPS publish` green.
- `M57.2 offline/online toparlama + retry` green.
- `M57.3 session failure + KVKK blocking gorunurlugu` green.
- `M57.4 Android preview/internal build disiplini` green.
- Post-M41 external runner ile `M42 -> M57` green hatti tek komutla tekrar kosturulabilir.
- Sonraki ana resmi rota `M58 — Final Pilot Readiness`.

## 2) Sabit ürün / repo kuralları
- Driver login ana akışı `Sürücü Kodu + PIN` olarak korunur.
- İlk girişte PIN değişimi zorunludur.
- Ürün içi konum dili: `sürücünün telefon GPS'i`.
- Company default `maxWalkM = 250`, School default `maxWalkM = 50`.
- Oluşturma için tek kaynak **Planlama Merkezi** olmalıdır.
- **Vardiyalar** ekranı oluşturma değil, takip / operasyon ekranı olarak kalmalıdır.
- Overlay standardı: **tek zip / tek kök klasör / nested root yok**.
- CHECKLIST'te `[x]` yalnızca pack/check green sonrası işaretlenir.

## 3) M57 — Mobile Hardening kapanis ozeti
- `/api/gps` foreground publish hattı mobilde görünür duruma geldi.
- İzin yoksa `GPS iznini yenile` ve gerekirse `Ayarlari ac` akışı var.
- Bağlantı kartı ile offline/online toparlama dili sade şekilde görünür.
- Session refresh bozulursa uygulama `Oturum kapandi. Yeniden giris yapin.` diyerek temiz düşer.
- KVKK eksikleri mobilde görünür ve GPS publish blok diline bağlanır.
- Android preview/internal build disiplini `app.json`, `eas.json`, `.env.example`, Today release kartı ve `m57_4` checker ile sabitlendi.

## 4) Yakın resmi rota
- `M57 — Mobile Hardening` ✅ green
- `M58 — Final Pilot Readiness`

## 5) Kanonik komutlar
- Ana regresyon: `tools\pack.ps1 -To 41`
- Post-M41 tam hat: `tools\pack_post_m41_to_m57.ps1 -RepoRoot D:\servis-platform -NoBuild`
- M44: `tools\pack_m44_telematics.ps1 -RepoRoot D:\servis-platform`
- M45: `tools\pack_m45_retention_backup.ps1 -RepoRoot D:\servis-platform`
- M46: `tools\pack_m46_ai_copilot.ps1 -RepoRoot D:\servis-platform`
- M55: `tools\pack_m55_reports_no_show.ps1 -RepoRoot D:\servis-platform`
- M56: `tools\pack_m56_kvkk_eta_quality.ps1 -RepoRoot D:\servis-platform`
- M57 full: `tools\pack_m57_mobile_hardening.ps1 -RepoRoot D:\servis-platform`
- M57 scaffold: `tools\pack_m57_mobile_hardening.ps1 -RepoRoot D:\servis-platform -ScaffoldOnly`

## 6) Yeni sohbet için ilk cümle
Repo su an `M57`'ye kadar resmi green; kanonik post-M41 dis runner `tools\pack_post_m41_to_m57.ps1` ile `M42 -> M57` green hatti birlikte kosturulur. Sonraki odak `M58 — Final Pilot Readiness`; guncel repo elimde.

## 7) M57
- `M57 green`
- `M57.4 Android preview/internal build disiplini green`
- `M58 — Final Pilot Readiness`
