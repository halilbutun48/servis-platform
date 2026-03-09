# Dependency Map — Modül/Dosya Etki Haritası

Amaç: Yeni özellik eklerken “nereleri kırar?” hızlıca görmek.

> Repo kısaltma:
- Backend routes: `backend/src/routes/*`
- Jobs: `backend/src/jobs/*`
- WS: `backend/src/ws/*`
- Services (önerilen): `backend/src/services/*`
- Docs: `docs/*`

---

## Ortak Çapraz Etkiler (Her Epic’te dikkat)
- Auth/RBAC: `backend/src/auth/*`, route guards, scope kontrol
- Observability: `ApiRequest` middleware, `/health`, (varsa) `AuditLog`
- WS rooms/scope: `backend/src/ws/*` (join odaları, publish scope)
- Notifications: `routes/notifications`, `notify:new` yayınları
- DB: `prisma/schema.prisma` + migrations

---

## M1 — EPIC C (No-show / Ceza)
### Dokunulan yerler
- DB: `prisma/schema.prisma` (DriverPenalty)
- Routes:
  - `routes/drivers` (penalty list)
  - `routes/room/*` veya `routes/shifts` (no-show create)
- Enforcement noktası:
  - Shift approve / driver assignment akışı (muhtemelen `routes/shifts` veya `routes/driver`)
- WS/Notify:
  - Notification create + `notify:new` publish
- Audit:
  - `AuditLog` insert (kritik aksiyon)

### Risk / Hotspots
- Approval/assignment akışına gate eklemek regression riski taşır → mutlaka check senaryosu

---

## M2 — EPIC D (KVKK Onay)
### Dokunulan yerler
- DB: `ConsentDocument`, `UserConsent`
- Routes:
  - `routes/consent` (yeni)
  - `routes/me` (consent state ekle)
- Policy gate (soft/strict):
  - Konum/harita veya personel işleme noktaları (A epic’e başlamadan netleşsin)
- Audit: consent accept kaydı

### Risk / Hotspots
- Policy’yi strict yaparsan operasyon bloklayabilir → önce soft önerilir

---

## M3 — EPIC A / Sprint 1 (Excel Import + Geocode Cache)
### Dokunulan yerler
- DB:
  - `Personel` alanları (addressText/addressNorm/geo*)
  - `ShiftImport`, `ShiftImportRow`
- Routes:
  - `routes/shifts` (company shift create)
  - `routes/personels` (adres update/geo status)
  - (yeni) `routes/import` veya shifts altında `import-excel`
- Services (önerilen):
  - `services/geocode.js` (normalize + cache + throttle)
  - `services/excelParse.js` (xlsx/csv parse)
- Observability:
  - import summary log + ApiRequest

### Risk / Hotspots
- Geocode provider rate-limit → throttle şart
- Adres normalizasyonu kötü olursa cache bozulur

---

## M4 — EPIC A / Sprint 2 (Cluster + Draft → ROOM)
### Dokunulan yerler
- DB:
  - `StopAssignment`
  - `Stop` ile ilişkiler
- Services:
  - `services/clusterStops.js`
  - (opsiyon) `services/routeOrder.js`
- Routes:
  - draft üretimi (company veya internal job)
  - ROOM approve akışı
- WS:
  - `shift:requested`, `shift:approved` publish
- UI (varsa):
  - Room “pending requests” listesi
  - Driver “route/stops” ekranı

### Risk / Hotspots
- Replace mode (yeniden üretim) veri tutarlılığı: stop + assignment temizliği atomik olmalı
- maxWalkM garantisi: mutlaka test

---

## M5 — EPIC A / Sprint 3 (Review UI + Kalite)
### Dokunulan yerler
- Routes:
  - `GET personels?geoStatus=...`
  - `PUT personels/:id/location` (manual override)
- Services:
  - rota sıralama iyileştirme (2-opt opsiyon)
- Checks:
  - smoke/fullcheck’e “excel→draft” senaryosu ekleme

### Risk / Hotspots
- Manual override kuralı: otomatik süreçlerin override’ı ezmemesi

---

## M6 — EPIC B (Rapor/Export)
### Dokunulan yerler
- Routes:
  - `routes/reports` (yeni)
- DB/query:
  - Notification/GPS/Stop tabloları üzerinde ağır query
- Export:
  - CSV generator (streaming tercih)
- RBAC:
  - scope filtresi rapor query’lerinin içine gömülmeli

### Risk / Hotspots
- km hesabı: GPS history yoksa tanım belirsiz → B’yi MVP/Advanced diye böl
- Büyük export: sync response timeout riski → Sprint 4’te async

---
