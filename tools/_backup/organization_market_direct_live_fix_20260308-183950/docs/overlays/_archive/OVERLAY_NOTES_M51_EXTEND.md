# OVERLAY M51 — Vardiya Süre Uzatma (Shift Extend)

Bu overlay şunları ekler:

## Backend
- DB: Shift’e süre uzatma alanları + enum (ShiftExtendDecision)
- API:
  - PUT /api/shifts/:id/extend-request (Company)
  - PUT /api/shifts/:id/extend-decision (Room)
- Notification service uyumlu çağrı formatı:
  - SHIFT_OFFER_DECISION notify fix (type/scope/payload)
  - SHIFT_EXTEND_REQUEST, SHIFT_EXTEND_DECISION

## UI
- Company > Vardiyalar > Liste (ve Bekleyen tablosu): `Süre Uzat` butonu + modal
- Room > Vardiyalar > Tüm Shifts: uzatma talebi gelince `Kabul/Reddet` + not

## Notlar
- Company talep oluşturur; Room kabul ederse `endAt` uzar.
- Aynı anda sadece 1 adet PENDING uzatma talebi izinli (409).

