# M24 — Shift Marketplace Offers (Multi-Room)

## Hedef
Company bir shift talebini **room seçmeden (market)** açabilsin; ardından aynı shift için birden fazla room’dan teklif/counter teklif toplayıp **bir tanesini ACCEPT** edebilsin. ACCEPT sonrası diğer teklifler otomatik **CANCELLED** olur.

## Motivasyon
Gerçek iş modelinde Company aynı vardiya için farklı servis sağlayıcılardan fiyat toplayıp en iyi teklifi seçer. “Room seçmeden shift oluşturma” bu yüzden serbest olmalı.

## Backend (M24.0)
### Prisma
- `Shift.roomId` artık `Int?` (market shift)
- Yeni model: `ShiftOffer`
  - `unique(shiftId, roomId)`
  - `status: OPEN | COUNTERED | ACCEPTED | CANCELLED`
  - `amountCompany/noteCompany`, `amountRoom/noteRoom`

### API
- `POST /api/shifts` (COMPANY): `roomId` opsiyonel → yoksa market shift
- `POST /api/shifts/:id/offers` (COMPANY): `{ roomIds[], amountCompany?, noteCompany? }`
- `GET /api/offers/inbox` (ROOM): gelen teklifler
- `GET /api/offers/shift/:shiftId` (COMPANY): shift teklif listesi
- `PUT /api/offers/:id/counter` (ROOM)
- `PUT /api/offers/:id/accept` (COMPANY)
- `PUT /api/offers/:id/cancel` (COMPANY) (opsiyonel)

### WS
- `offer:update` (company + room scope)
- `shift:update` (accept sonrası shift bağlandı)

## Web (M24.1)
- Company → Shifts:
  - “Market” checkbox ile room seçmeden shift oluşturma
  - Market shift satırında: “Teklif Gönder” + “Teklifler” modal
  - “Kabul Et” → diğer teklifler otomatik iptal
- Room → Offers:
  - Inbox listesi + Counter gönderme

## DoD
- Company market shift oluşturabilir.
- Company aynı shift için 2+ room’a teklif gönderebilir.
- Room karşı teklif gönderebilir.
- Company birini kabul ettiğinde diğerleri CANCELLED olur ve shift `roomId` bağlanır.
- `backend/scripts/m24check.js` PASS
- `tools/pack.ps1 -To 24` PASS
