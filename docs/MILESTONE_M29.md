# M29 — Onboarding Checklist + Offer Flow Clarity

## Amaç
Sahada kullanıcı hatasını azaltmak ve “minimum tık” ile doğru akışa yönlendirmek.

## M29-A — Company Onboarding / Rehber Modu
- Company Home (WorkflowPanel) içindeki “Kısa akış” bölümü, otomatik durum okuyan bir checklist’e dönüştürüldü.
- Progress: `x/4` (Geo Review / Agreement / Offers / Shifts).
- GeoReview gerekiyorsa daha görünür uyarı + hızlı yönlendirme + “Yenile”.

## M29-B — Teklif Akışı Netleştirme
- Company Home’da “Açık Teklifler” kartına tıklayınca direkt **Offers Modal** açılır.
  - Status filtresi (OPEN+COUNTERED / OPEN / COUNTERED / ALL)
  - Arama (shiftId/room/status/not)
  - Tablo: shiftId, shiftStatus, room, offerStatus, tutar, not, updatedAt
- ROOM Offers inbox’ta artık **Shift status badge** gösterilir (REQUESTED/APPROVED/ACTIVE...).
  - Arama alanına `shift.status` dahil edildi.

## DoD
- `tools/pack.ps1 -To 29` => **PACK PASS ✅**
- `backend/scripts/m29check.js` PASS

## Dosyalar
- REPLACE:
  - `web/src/panels/company/WorkflowPanel.jsx`
  - `web/src/panels/room/OffersPanel.jsx`
- NEW:
  - `backend/scripts/m29check.js`
  - `docs/MILESTONE_M29.md`
