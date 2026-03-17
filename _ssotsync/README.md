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

## Güncel aktif ürün hattı (2026-03-17)
- `M51` docs/backlog reset hattı işlendi.
- `M52 Import + Geo Pipeline` ana akış olarak çalışır duruma geldi.
- `M53 Stop & Route Productization` aktif üründür.
- `M53.1` stop policy contract docs tarafında işlendi.
- `M53.2-A` stop generation summary + preset görünürlüğü test edildi.
- `M53.3` Planlama Merkezi sadeleştirme ve tek oluşturma kaynağı kararı işlendi.
- `M53.4` Organization / Gezi modu Planlama Merkezi içinde görünür hale getirildi.
- `M53.5` round-trip temeli, gidilecek yer kartları, manuel lat/lng fallback, haritadan seç, navigasyon, preview pax fallback ve market öncesi plan-tamlık kontrolü repo durumuna işlendi.
- `Organization Copilot` rehberi company kopyası olmaktan ayrıştırılmaya başlandı.
- Not: Bu satırlar resmi pack-green promotion değildir; güncel repo yönünü taşır.

## Bugünkü resmi ürün kararları
- Company default `maxWalkM = 250`, School default `maxWalkM = 50`.
- Backend hard limit `50..2000`.
- Oluşturma için tek kaynak **Planlama Merkezi** olmalıdır.
- **Vardiyalar** ekranı oluşturma değil, takip / operasyon ekranı olarak kalmalıdır.
- **Organizasyon Merkezi** ikinci plan motoru gibi yaşamamalı; Planlama Merkezi içindeki organization/gezi moduna yönlenmelidir.
- Organization akışı: `Toplanma noktası → Plan paketi → Tahmini kişi sayısı / gidilecek yerler → Ön izleme / teklif → Vardiyalar`.
- Gidilecek yerler ayrı kart/satır mantığında tutulmalı; adres bulunamazsa manuel `lat/lng` ve haritadan seçim ile tamamlanmalıdır.
- Koordinat eksiği olan organization planı markete düşmemelidir.
- Company taslak plan / teklif hazırlar; Room gerçek araç / sürücü / kapasite kararı ile operasyonel planı tamamlar.

## Sonraki resmi rota
- `M54 — Room Dispatch Planner / draft → ROOM → atama zinciri`
- `M55 — Reports + No-show`
- `M56 — KVKK Matrix + Mobile Hardening`
- `M57 — Final Pilot Readiness`
