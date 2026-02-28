# OVERLAY_NOTES — M53 (Room teklif görünürlüğü + WS auto-refresh + Notification)

Tarih: 2026-02-28 (Europe/Istanbul)

## Amaç
- ROOM tarafında Agreement kayıtlarında **Company teklifini** net görmek (companyOfferAmount + companyOfferNote).
- `agreement:update` WS event’i gelince panel otomatik yenilensin.
- Agreement lifecycle aksiyonlarında **notification scope/type** doğru olsun ve ROOM/COMPANY kesin bildirim alsın.

## Değişiklikler

### Web
- `web/src/panels/room/AgreementsPanel.jsx`
  - Pending ve Diğer kayıtlar tablolarına **Company Teklif** kolonu eklendi.
  - Approve panelinde company teklif özeti gösteriliyor.
  - `useAutoReload("agreements", loadAll)` zaten vardı → aynı şekilde devam.
- `web/src/panels/company/AgreementsPanel.jsx`
  - `useAutoReload("agreements")` hatalıydı (fn yoktu) → `useAutoReload("agreements", load, !!token)` düzeltildi.

### Backend
- `backend/src/routes/agreements.js`
  - Agreement event’lerinde `createAndEmitNotification` eklendi:
    - CREATE (COMPANY) → ROOM: `AGREEMENT_REQUESTED`
    - APPROVE (ROOM) → COMPANY: `AGREEMENT_APPROVED`
    - CANCEL (COMPANY) → ROOM: `AGREEMENT_CANCELLED`
    - EXTEND (COMPANY) → ROOM: `AGREEMENT_EXTENDED`
  - WS tarafında zaten `agreement:update` emit ediliyordu → aynen korunuyor.

## DoD
- Room AgreementsPanel: Company teklif (₺amount + note) görünür ✅
- Agreement create/extend/cancel/approve sonrası:
  - Room/Company panel auto-refresh (WS) ✅
  - Notifications panelinde ilgili kayıtlar görünür ✅
