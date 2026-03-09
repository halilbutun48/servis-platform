# M16.1 — Backend Plan: Shift Personel + Import + Durak Üret + Route Preview
Tarih: 2026-02-01  
Hedef: Company shift için personel ekleme + import + geocode review + durak üret + map önizleme; ROOM tarafında rota/durak önizleme.

---

## 1) Done kriteri (Acceptance)
M16.1 “DONE” sayılması için:

1) DB şema hazır:
- Personel geocode cache alanları
- ShiftPersonel join
- ShiftImport + ShiftImportRow izleri
- StopAssignment (shift personel → stop eşlemesi + walkM)

2) API endpoint seti hazır:
- COMPANY: people CRUD/REPLACE + import (JSON rows) + stops generate + route-preview
- ROOM: route-preview (scope check ile)

3) Algoritma:
- maxWalkM garantisi (her personel atandığı durağa ≤ maxWalkM)

4) Gate:
- `backend/scripts/m16check.js` PASS
- `tools/pack.ps1 -To 16` destekler hale gelir (gate/pack güncellendi)

---

## 2) DB / Prisma (schema) değişiklikleri
### 2.1 Enum
- `GeoStatus`: `OK | NEEDS_REVIEW | FAILED`

### 2.2 Personel (geocode cache)
Ek alanlar (hepsi nullable/default’lu):
- `homeAddress` (string, nullable)
- `homeLat` / `homeLng` (Float?, nullable)  *(mevcut zorunluluk varsa nullable yapılır)*
- `geoStatus` (GeoStatus, default NEEDS_REVIEW)
- `geoManualOverride` (bool, default false)
- opsiyonel: `geoUpdatedAt`, `geoNote`

> Not: Repoda Personel+User ilişkisi var; import’ta “login user” üretmeden sadece Personel kaydı da tutabilmek için Personel’in bazı alanları opsiyonel kalmalıdır.

### 2.3 Yeni tablolar
#### ShiftPersonel
- `shiftId`, `personelId`
- opsiyonel: `note`, `pickupLat`, `pickupLng` (snapshot istersen)
- unique: `(shiftId, personelId)`

#### ShiftImport
- `shiftId`
- `createdByUserId`
- `fileName` (nullable)
- `createdAt`

#### ShiftImportRow
- `importId`, `rowNo`
- `rawJson` (Json)
- `fullName`, `phone`, `address` (nullable)
- `lat`, `lng` (nullable)
- `geoStatus` (GeoStatus)
- `personelId` (nullable)  *(upsert sonrası bağlanır)*

#### StopAssignment
- `shiftId`, `stopId`, `personelId`, `walkM`
- unique: `(shiftId, personelId)` (her personel tek durağa)

---

## 3) Endpoint seti (minimum, UI + test için)
### 3.1 Authorization / scope kuralı
- COMPANY: shift.companyId == user.companyId
- ROOM: shift.roomId == user.roomId
- SUPER_ADMIN: allow

### 3.2 Company (COMPANY)
#### GET `/api/shifts/:id/people`
- return: shift people list + geocode summary

#### PUT `/api/shifts/:id/people` (REPLACE)
Body:
```json
{ "items":[ { "fullName":"..", "phone":"..", "address":"..", "lat":.., "lng":.., "geoManualOverride":false } ] }
