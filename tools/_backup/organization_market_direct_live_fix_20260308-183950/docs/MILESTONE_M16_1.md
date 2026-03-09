# M16.1 — Personel & Rota Backend (Import + Geocode Cache + Stop Generate + Route Preview)

Tarih: 2026-02-01  
Timezone: Europe/Istanbul

## Amaç
Company tarafında “Personel & Rota” akışını backend ile gerçeklemek:
- Shift’e personel listesi ekleme / REPLACE
- Import izi (deterministik test için JSON rows)
- Personel geocode cache (OK / NEEDS_REVIEW / FAILED + manual override)
- Personel noktalarından durak üretimi (maxWalkM garantili) + assignment
- Tek payload ile “route preview” (ROOM modal ve COMPANY preview aynı endpoint)

> Not: M16 UI (tabs + modal) daha önce commit’lendi; M16.1 backend bu UI’nin bağlanacağı API setini getirir.

---

## Kapsam (Scope)
### DB / Prisma
Yeni enum:
- `GeoStatus`: `OK | NEEDS_REVIEW | FAILED`

Personel genişletme (geocode cache):
- `homeAddress?`, `phone?`, `homeLat?`, `homeLng?`
- `geoStatus` (default: `NEEDS_REVIEW`)
- `geoManualOverride` (default: `false`)
- `geoNote?`, `geoUpdatedAt?`
- `updatedAt` (auto)

Yeni tablolar:
- `ShiftPersonel` (shift ↔ personel)
  - unique `(shiftId, personelId)`
- `ShiftImport`, `ShiftImportRow`
  - import trail + row-level rawJson + parsing alanları
- `StopAssignment` (stop ↔ personel)
  - `walkM` (int)
  - unique `(shiftId, personelId)` → her personel tek durağa bağlanır

Stop modeline ilişki:
- `Stop.assignments[]`

Shift modeline ilişkiler:
- `Shift.people[]`, `Shift.imports[]`, `Shift.assignments[]`

---

## API (Minimum Endpoint Set)

### COMPANY (role=COMPANY)
**GET** `/api/shifts/:id/people`  
- Output: shift’e bağlı personel listesi + geoStatus özetleri

**PUT** `/api/shifts/:id/people` *(REPLACE)*  
Body:
```json
{ "items": [ { "fullName": "...", "phone": "...", "address": "...", "lat": 0, "lng": 0, "geoManualOverride": false } ] }




