# Sprint 1 Plan — Company Excel Import + Geocode Cache (MVP)

## Hedef
Company vardiya bazında Excel/CSV yükleyebilsin. Satırlar DB’de izlenebilsin. Adres → lat/lng **cache**’lensin (adres değişmedikçe tekrar geocode yok). Hatalı adresler “NEEDS_REVIEW/FAILED” olarak görünür olsun.

---

## Kapsam (In)
1) DB: Personel geocode cache alanları
2) DB: Import izleri (ShiftImport, ShiftImportRow)
3) API: Shift oluşturma (Company) + Excel import endpoint
4) Service: Geocode normalize + cache + throttle + status yönetimi
5) Minimal log/observability: import summary + error detayları

## Kapsam Dışı (Out)
- Clustering / otomatik durak üretimi (Sprint 2)
- Room’a draft düşürme (Sprint 2)
- Company “review UI” (Sprint 3) — Sprint 1’de sadece endpoint hazır olabilir

---

## DB Değişiklikleri

### 1) Personel (geocode cache)
Önerilen alanlar (mevcut yapıya göre isimler uyarlanır):
- `addressText` (String?, raw)
- `addressNorm` (String?, index)
- `lat` (Float?, nullable)
- `lng` (Float?, nullable)
- `geoSource` (String?, `nominatim|google|manual`)
- `geoUpdatedAt` (DateTime?)
- `geoStatus` (Enum/String: `OK|NEEDS_REVIEW|FAILED`, default `NEEDS_REVIEW`)
- `geoAccuracyM` (Int?, opsiyon)
- `geoManualOverride` (Boolean, default false)
- Not: Eğer `homeLat/homeLng` zorunluysa **nullable** yapılmalı.

**Kurallar:**
- `geoManualOverride=true` ise otomatik geocode lat/lng’yi **ezmez**
- `addressNorm` değişmediyse geocode tekrar yapılmaz

### 2) ShiftImport (import izleri)
- `ShiftImport`:
  - `id, companyId, shiftId, fileName`
  - `rowsTotal, rowsOk, rowsFailed, rowsNeedsReview`
  - `createdAt`
- `ShiftImportRow`:
  - `id, shiftImportId, rowNo`
  - `fullName, phone, addressText, addressNorm`
  - `status` (`OK|NEEDS_REVIEW|FAILED`)
  - `errorText`
  - `personelId` (nullable, eşleştiyse)

---

## API Tasarımı (Sprint 1)

### A) Shift oluşturma (Company)
`POST /api/company/shifts`
- body (örnek):
```json
{
  "title": "Sabah Vardiyası",
  "templateKey": "SABAH_V1",
  "startTime": "07:30",
  "endTime": "09:00",
  "serviceDays": ["MON","TUE","WED","THU","FRI"]
}
