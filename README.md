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
- `M46.9 SESSION & REFRESH SECURITY PACK PASS OK`
- `M47 KVKK NOTICE / CONSENT FRAMEWORK PACK PASS OK`
- `M47.2 CAPACITY & LOAD BASELINE PACK PASS OK`
- `M47.3 PRODUCTION RESILIENCE + EDGE SECURITY PACK PASS OK`
- `M47.4 MOBILE READINESS WEB PASS PACK PASS OK`

## Sonraki resmi rota
- `M47.4-R — Clean Rerun / Repro Fix`
- `M48 — Driver Mobile App Foundation`
- `M48.5 — Room / Company Tablet Readiness`
- `M49 — Mobile Beta Hardening`
- `M49.1 — Driver Voice Guidance + Stop ETA`
- `M50 — Mobile Release Readiness`

## Kanonik tools düzeni
- `tools/` kökü sadece kanonik çalıştırma/doğrulama script’leri için kullanılır.
- Sabit komutlar: `pack.ps1`, `pack_m42_optional.ps1`, `pack_step06_stabil.ps1`, `pack_step1_security_foundation.ps1`, `pack_step1_totp_stepup.ps1`, `gate.ps1`, repo-contract `check_*.ps1` script’leri.
- Eski tek seferlik `apply_*`, `overlay_*`, `OVERLAY_*` ve hotfix script’leri `tools/_archive/` altına taşınır.
- Otomatik yedekler `tools/_backup/` altında kalır; bu klasör canlı komut alanı değildir.
- Kod değişirse aynı overlay içinde ilgili SSOT dosyaları da güncellenir.
