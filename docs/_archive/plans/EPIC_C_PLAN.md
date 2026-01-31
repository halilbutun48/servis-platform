# EPIC C Plan — No-show / Görev Reddine Ceza

## Hedef
Driver görevi kabul edip “no-show” olursa 3 ay yeni talep alamaz.
- Sayaç (başlangıç/bitiş)
- Bildirim (driver + room)
- Audit trail

## Kapsam (In)
- Ceza state modeli (DB)
- No-show tespiti (kural)
- Enforce: driver’a yeni shift/assignment verilmesini engelle
- Room override (istisna) + audit

## Kapsam Dışı (Out)
- Karmaşık puanlama sistemi
- ML/otomatik davranış analizi

---

## Kural Tanımı (MVP)
No-show tetikleme seçenekleri (birini seç):
1) ROOM manuel “no-show” işaretler (MVP için en güvenlisi)
2) Otomatik: shift start + X dakika geçti, driver hiç GPS göndermedi / hiç hareket yok → no-show

> MVP öneri: 1) manuel işaretleme + audit. Otomatik tespit Sprint sonrası.

---

## DB Önerisi
### DriverPenalty
- `id`
- `driverId`
- `kind`: `NO_SHOW`
- `startsAt`, `endsAt`
- `reason` (text)
- `createdByUserId` (Room admin)
- `createdAt`
- index: `(driverId, endsAt)`

---

## API Taslağı
### C-API-01 No-show işaretle (ROOM)
`POST /api/room/drivers/:id/penalties/no-show`
- body:
```json
{ "reason": "Shift'e gelmedi", "months": 3 }
