# SERVIS-PLATFORM — PERSONEL SERVİS V1/V2

Bu repo PERSONEL SERVİS V1/V2 uygulamasının canlı çalışma ağacıdır.

## Hızlı referans
- Primer snapshot: `tools/PRIMER_SNAPSHOT.md`
- Primer SSOT: `docs/PRIMER_SSOT.md`
- Checklist SSOT: `docs/CHECKLIST_SSOT.md`
- Startpack: `docs/STARTPACK_V1.md`
- Project spec: `docs/PROJECT_SPEC_V1.md`
- API spec: `docs/API_SPEC_V1.md`
- DB spec: `docs/DB_SCHEMA_V1.md`
- UI spec: `docs/UI_SPEC_V1.md`
- Overlay notları: `docs/overlays/`

## Resmi green çizgisi
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
- `M51–M53 BACKFILL VERIFICATION PACK PASS OK`
- `M54.3 DISPATCH APPROVE + REPACK PACK PASS OK`
- `M54.4 DRIVER ROUTE DELIVERY PACK PASS OK`
- `M55 REPORTS + NO_SHOW PACK PASS OK`
- `M56 KVKK MATRIX + ETA QUALITY PACK PASS OK`
- `M57 MOBILE HARDENING PACK PASS OK`
- `POST-M41 EXTERNAL PACK RUNNER PASS OK`

## Güncel aktif ürün hattı (2026-03-18)
- Post-M41 pack script'leri self-only calisir; tam `M42 -> M57` green hatti `tools\pack_post_m41_to_m57.ps1 -RepoRoot D:\servis-platform -NoBuild` ile disaridan kosturulur.
- Uyumluluk icin `tools\pack_post_m41_to_m54_4.ps1` dosyasi korunur; yeni orchestrator'a forward eder.
- `M57` artik resmi green cizgiye girdi. `M57.1` foreground GPS publish, `M57.2` offline/online toparlama, `M57.3` session + KVKK blocking ve `M57.4` Android preview/internal build disiplini birlikte kapandi.
- Sonraki ana urun hatti `M58 — Final Pilot Readiness` olarak devam eder.
- `tools\pack_m58_final_pilot_readiness.ps1 -RepoRoot D:\servis-platform` komutu repo hazirlik kontratini kontrol eder; resmi green icin manuel pilot kabul gerekir.

## Bugünkü resmi ürün kararları
- Company default `maxWalkM = 250`, School default `maxWalkM = 50`.
- Backend hard limit `50..2000`.
- Oluşturma için tek kaynak **Planlama Merkezi** olmalıdır.
- **Vardiyalar** ekranı oluşturma değil, takip / operasyon ekranı olarak kalmalıdır.
- Driver login ana akışı `Sürücü Kodu + PIN` olarak korunur.
- Ürün içi konum dili `sürücünün telefon GPS'i` olarak korunur.
- Overlay standardı: **tek zip / tek kök klasör / nested root yok**.

## Sonraki resmi rota
- `M55 — Reports + No-show` ✅ green
- `M56 — KVKK Matrix + ETA/Navigation Quality` ✅ green
- `M57 — Mobile Hardening` ✅ green
- `M58 — Final Pilot Readiness`
- M58 hazirlik komutu: `tools\pack_m58_final_pilot_readiness.ps1 -RepoRoot D:\servis-platform`

## M57 — Mobile Hardening
- Foreground GPS publish hattı `/api/gps` ile çalışır.
- Bağlantı kopma/toparlanma dili mobilde sade görünür.
- Session failure temiz düşüş ve KVKK blocking görünürlüğü vardır.
- Android preview/internal build disiplini `app.json + eas.json + .env.example + runbook + checker` hattına bağlanmıştır.
- Full pack: `tools\pack_m57_mobile_hardening.ps1 -RepoRoot D:\servis-platform`
- Scaffold pack: `tools\pack_m57_mobile_hardening.ps1 -RepoRoot D:\servis-platform -ScaffoldOnly`
- Post-M41 orchestrator: `tools\pack_post_m41_to_m57.ps1 -RepoRoot D:\servis-platform -NoBuild`

## M58 — Final Pilot Readiness
- Komut: `tools\pack_m58_final_pilot_readiness.ps1 -RepoRoot D:\servis-platform`
- Amaç: final pilot checklist, saha testi akışları ve go / no-go kararını tek hatta toplamak.
- Not: Bu komut tek basina resmi green anlamına gelmez; manuel pilot kabul gerekir.
