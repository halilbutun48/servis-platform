# OVERLAY M57 — Agreement Extend: Counter + Accept/Reject (2026-03-06)

Bu overlay şunları ekler:

## Backend
- Agreement modeline `extendStatus` ve extend pazarlık alanları eklendi.
- Yeni endpointler:
  - PUT `/api/agreements/:id/extend-request` (COMPANY)  -> uzatma teklifi (endDate + opsiyonel fiyat/not)
  - PUT `/api/agreements/:id/extend-decision` (ROOM)   -> ACCEPT / REJECT
  - PUT `/api/agreements/:id/extend-counter` (ROOM)    -> karşı teklif (fiyat/not)
  - PUT `/api/agreements/:id/extend-accept-counter` (COMPANY)
  - PUT `/api/agreements/:id/extend-reject-counter` (COMPANY) -> counter reddet, tekrar PENDING
- Eski PUT `/api/agreements/:id/extend` geriye dönük uyum için kaldı ve `extend-request` gibi davranır.

## UI
- Company Agreements panel:
  - Uzatma butonları artık "extend request" gönderir (fiyat/not prompt ile opsiyonel)
  - Room uzatma counter gönderirse "Uzatma Counter Kabul/Red" aksiyonları görünür
- Room Agreements panel:
  - "Uzatma Talepleri" bölümü: kabul / reddet / counter

## Uygulama
Repo köküne unzip edip pack çalıştır.
