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
- `POST-M41 EXTERNAL PACK RUNNER PASS OK`

## Güncel aktif ürün hattı (2026-03-18)
- Post-M41 pack script'leri self-only çalışır; tam M42 → M54.4 hattı `tools\pack_post_m41_to_m54_4.ps1` ile dışarıdan koşturulur.
- `M52 Import + Geo Pipeline` ve `M53 Stop & Route Productization / Organization-Gezi` backfill hattı ile resmi olarak tekrar doğrulandı.
- `M54.1` Dispatch Preview ve `M54.2` Editable Dispatch Preview, `M54.3` pack-green sonucu ile fiilen doğrulanmış kabul edilir.
- `M54.4` Driver Route Delivery explicit shift route endpoint'i ve `Today → Route` deep link'i ile resmi verify hattından geçti.
- Tek araç yeterli / dispatch gerektirmeyen işlerde paket-kopyala UI kolaylığı korunur.

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
- `M55 — Reports + No-show` ✅ green
- `M56 — KVKK Matrix + ETA/Navigation Quality`
- `M57 — Mobile Hardening`
- `M58 — Final Pilot Readiness`

## M55 — Reports + Gelmedi Kaydı
- Reports endpointleri ve ROOM/COMPANY rapor ekranı iskeleti eklendi.
- Gelmedi kaydı (NO_SHOW) veri modeli ve backend guard açıldı.
- Aktif kayıtlı sürücü approve/apply aşamasında `ACTIVE_NO_SHOW_PENALTY` ile bloklanır.


## M56.1 foundation
- KVKK matrix endpointi eklendi: `/api/kvkk/matrix`
- ETA payload rota zinciri toplam km/süre özetini döner
- Personel ekranlarında kalan durak / rota ETA / rota km görünürlüğü açıldı

## M56.2 in-progress
- `/shared/kvkk` ekranı ile rol bazlı KVKK görünürlüğü UI’ya taşındı
- ETA payload artık `routeQuality`, `progressLabel`, `gpsFreshness`, `skippedStopsCount`, `reachedStopsCount`, `totalStopsCount` alanlarını döner
- Personel ekranlarında “GPS gecikmeli / atlanan durak var / rota tamamlandı” gibi sade kalite durumu görünür oldu
