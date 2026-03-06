# OVERLAY M56 — Agreement Uzatma Teklifi (Request+Room Decision) + Room Scope Leak Fix + Bulk Offer Counter

Tarih: 2026-03-06

## Ne düzeltir?
1) **Room scope leak** (kritik):
   - Room, sadece **aktif** (OPEN/COUNTERED/ACCEPTED) teklif varsa market shift detaylarını görebilir.
   - Offer CANCELLED olduktan sonra başka room, shift'i **listede/detayda görmez**.

2) **Market offer accept sonrası**
   - Company bir offer'ı kabul edince diğer room offer'ları DB'de CANCELLED olur.
   - WS event payload'ında doğru `offerId` gönderilir (room UI satırı doğru invalid olur).

3) **Agreement uzatma artık direkt değil (teklif modeli)**
   - Company: `PUT /api/agreements/:id/extend-request`
   - Room: `PUT /api/agreements/:id/extend-decision` (ACCEPT/REJECT)
   - Eski `PUT /api/agreements/:id/extend` path'i **geri uyum için** extend-request gibi çalışır.

4) **Room Offers bulk/package counter**
   - Room Offers panelinde satır seçip tek hamlede counter.
   - Backend: `POST /api/offers/bulk-counter`

## Dosyalar
- backend/prisma/schema.prisma (AgreementExtendStatus + alanlar)
- backend/src/routes/agreements.js (extend request/decision)
- backend/src/routes/offers.js (accept event fix + bulk-counter)
- backend/src/routes/shifts/shared.js (offered scope status gate)
- web/src/panels/room/OffersPanel.jsx (bulk counter UI)
- web/src/panels/room/AgreementsPanel.jsx (extend decision UI)
- web/src/panels/company/AgreementsPanel.jsx (extend-request UI)

## Uygulama
Zip'i repo köküne **overwrite** edecek şekilde çıkart.

Sonra normal şekilde compose up / pack ile doğrula.
