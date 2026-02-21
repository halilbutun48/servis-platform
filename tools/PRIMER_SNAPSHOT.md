# SERVIS-PLATFORM — PERSONEL SERVİS V1 — PRIMER SNAPSHOT (Yapıştır & Devam Et)
Tarih: **2026-02-21** (Europe/Istanbul)

## 0) Durum / Referans
- Repo: `servis-platform`
- Son GREEN (güncel): **`v1-m18-green.2`** ✅ `tools/pack.ps1 -To 18` **PASS**
  - İçerik: **M0→M18** (M16.2+M16.3 + M17 Agreements + M18 Agreement→Daily Shift + M18 UI badge/filter)
- Doğrulama komutu: `tools/pack.ps1 -To 18`

Check’leri tek tek çalıştırmak istersen (container içinde):
- M16CHECK:
  - `docker compose -f infra/docker-compose.yml exec -T api sh -lc "cd /app/backend && node scripts/m16check.js"`
- M16.2 / M16.3:
  - `docker compose -f infra/docker-compose.yml exec -T api sh -lc "cd /app/backend && node scripts/m162check.js"`
  - `docker compose -f infra/docker-compose.yml exec -T api sh -lc "cd /app/backend && node scripts/m163check.js"`
- M17CHECK:
  - `docker compose -f infra/docker-compose.yml exec -T api sh -lc "cd /app/backend && node scripts/m17check.js"`
- M18CHECK:
  - `docker compose -f infra/docker-compose.yml exec -T api sh -lc "cd /app/backend && node scripts/m18check.js"`

> Not (PowerShell): `tools/gate.ps1` içinde compose up için `--detach` kullanılır (PowerShell’de `-d` bazen common param gibi yakalanabildiği için).

---

## 1) Amaç (V1)
Öğrenci/parent yok. GPS tabanlı personel servis platformu:
- Live map + GPS status (LIVE/STALE/OFFLINE)
- Shift yönetimi + durak akışı (start/reached/skip/reopen/complete)
- Notifications (overspeed + gps stale/offline + recovery) + dedupe
- Personel request → stop suggestions → shift’e stop ekleme
- Route templates (company) → shift’e REPLACE uygula
- Shift People + Route Preview standardı (M16.2)
- Geo Review + Manual Override (M16.3)
- Agreements (M17): periyodik rezervasyon + conflict + monitor + availability entegrasyonu
- **M18:** Agreement → “bugün” için otomatik shift üretimi + duplicate guard
- **M18 UI:** Company/Room shift listesinde `Agreement #id` badge + “Sadece Agreement shiftleri” filtresi

---

## 2) Roller
- SUPER_ADMIN: kurulum, company/room yönetimi
- ROOM: araç+sürücü CRUD, shift approve/assign/start, request close(ACCEPTED), stop-suggestions + from-suggestion, route-preview, agreement approve
- COMPANY: shift create, template yönetimi, request’leri görür (kapatamaz), agreements create/cancel/extend, shift people UI soft-switch
- DRIVER: GPS post (assigned vehicle), active route, stop progression, complete
- PERSONEL: request create (lat/lng zorunlu), own view

---

## 3) M16 doğrulanan akış (kısa)
1) COMPANY shift create
2) ROOM approve/assign(vehicleId+driverId) + start
3) PERSONEL request create (lat/lng required)
4) ROOM stop-suggestions (cluster) → POST stops/from-suggestion  
   - Bazı validasyonlarda body lat/lng isteyebilir
5) DRIVER route preview: GET /api/driver/route/active
6) Cleanup: shift complete

---

## 4) M16.2 — UI Soft-Switch + Route Preview (ROOM/COMPANY) + assignmentCount
**Amaç:** UI bozulmadan backend’e “soft switch” + preview standardı.

- ShiftPeopleTab:
  - Önce backend’den oku/yaz (`/api/shifts/:id/people`)
  - Endpoint yoksa **404 → localStorage fallback**
- RoutePreviewModal:
  - `GET /api/shifts/:id/route-preview` ile doldurur
  - 404 olursa **/stops fallback** ile yine preview açar
- Route Preview payload:
  - `stops[].assignmentCount` alanı vardır (duraktaki kişi sayısı)

---

## 5) M16.3 — Geocode Review + Manual Override
**Amaç:** `NEEDS_REVIEW/FAILED` personeller operasyonel düzeltilebilsin.

- `GET /api/company/personels?geoStatus=NEEDS_REVIEW`
- `PUT /api/company/personels/:id/location`
  - body: `{ lat, lng, geoManualOverride:true, geoStatus:"OK" }`
- UI: `#/company/georeview` + ShiftPeopleTab’dan “tek tık” link

---

## 6) M17 — Agreements (Periyodik rezervasyon)
**Amaç:** Tarih aralığı + hafta günleri + saat penceresi ile vehicle/driver rezervasyonu; bitince DONE; extend/cancel.

- COMPANY: `POST /api/agreements`, `GET /api/agreements`, `PUT /cancel`, `PUT /extend`
- ROOM: `PUT /api/agreements/:id/approve` (vehicle+driver assign)
- Conflict:
  - Onayda 409
  - Availability içinde agreement reservation dikkate alınır
  - **Deterministik kural:** Availability’de **agreement conflict önce**, shift conflict sonra.

---

## 7) M18 — Agreement → Günlük Shift Otomatik Üretimi (GREEN)
**Amaç:** APPROVED/ACTIVE agreement’lardan “bugün” için shift üretmek.

- Job: `agreementShiftGenerator`
- Kurallar:
  - weekMask bugünü içeriyorsa üret
  - midnight aşımı destekli
  - Conflict varsa o gün skip
  - Duplicate guard: **`unique(agreementId, startAt)`**
- UI:
  - Company/Room ShiftsPanel’de `Agreement #id` badge
  - Filtre: “Sadece Agreement shiftleri”

---

## 8) SSOT dokümanlar
- `docs/PRIMER_SSOT.md`
- `docs/API_SPEC_V1.md`
- `docs/DB_SCHEMA_V1.md`
- `docs/PROJECT_SPEC_V1.md`
- `docs/UI_SPEC_V1.md`
- `docs/STARTPACK_V1.md`
- (ops) `web/scripts/ui-smoke.md`

---

# Ek — M16 Endpoints (Requests → Suggestions → Stops, Route Preview)

## A) GET `/api/shifts/:id/stop-suggestions`
**Amaç:** OPEN request’leri cluster’layıp öneri listesi döndürür.  
**RBAC:** `ROOM`, `COMPANY`, `SUPER_ADMIN`

Query:
- `onlyOpen=1` (default)
- `radiusM=120` (default)

200:
```json
{
  "items": [
    { "id": "s-485-0", "lat": 41.0306, "lng": 28.9964, "count": 2, "requestIds": [113, 114] }
  ]
}
B) POST /api/shifts/:id/stops/from-suggestion

Amaç: cluster önerisini Stop’a çevirir.
RBAC: ROOM, SUPER_ADMIN
Body (örnek):

{ "suggestionId": "s-485-0", "lat": 41.0306, "lng": 28.9964 }
C) GET /api/driver/route/active (referans)

Amaç: Driver’ın aktif shift rota/durak akışını döndürür.
RBAC: DRIVER

D) GET /api/shifts/:id/route-preview (M16.2 standardı)

Amaç: ROOM/COMPANY için shift “durak + atama” önizlemesi.
RBAC: ROOM, COMPANY, SUPER_ADMIN

200 (özet):

{
  "ok": true,
  "shift": { "id": 519, "status": "ACTIVE" },
  "people": [],
  "stops": [
    { "id": 1727, "lat": 41.03, "lng": 28.99, "order": 1, "assignmentCount": 2 }
  ],
  "assignments": [
    { "stopId": 1727, "personelId": 18, "walkM": 120 }
  ],
  "skipped": []
}
::contentReference[oaicite:0]{index=0}