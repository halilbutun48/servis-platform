# OVERLAY M49 — Flow Fix (Offer → Counter in Shifts) + Agreement/Offer Collision Guard

## Amaç
- ROOM: Market teklifini (ShiftOffer) **Shifts ekranından** gör + **counter** gönder (menü menü gezmeden).
- COMPANY: PlanBuilder “Toplu Teklif Gönder” bitince **Market Shifts** bölümüne otomatik odaklan.
- Backend: Aynı zaman penceresinde **aktif sözleşme (Agreement)** olan room’lara market teklifi **otomatik atlanır** (çakışmayı azaltır).
- Agreements sayfaları: “Sözleşme rota/durak üretmez” açıklaması eklendi.

## Değişen dosyalar
- backend/src/routes/shifts/company.js
  - POST /api/shifts/:id/offers: Agreement overlap kontrolü → `skippedRoomIds` ile birlikte döner.
- web/src/panels/company/PlanBuilderPanel.jsx
  - Toplu teklif gönderimi bitince `company:shifts:focus` event’i ile Market Shifts’e odaklar.
  - Agreement çakışması olan room’lar için info mesajı (skipped).
- web/src/panels/room/ShiftsPanel.jsx
  - `/api/offers/inbox` yüklenir, shiftId→offer map yapılır.
  - Bekleyen Talepler satırında Market Teklifi kutusu + Counter gönderme UI.
- web/src/panels/company/AgreementsPanel.jsx
- web/src/panels/room/AgreementsPanel.jsx
  - Başlık: “Sözleşmeler” + açıklama kartı.

## Not
- Market teklifi (ShiftOffer) counter: ROOM → `PUT /api/offers/:id/counter`
- Offer oluşturma: COMPANY → `POST /api/shifts/:id/offers`
