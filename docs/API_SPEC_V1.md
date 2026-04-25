# PERSONEL-SERVIS V1 — API SPEC (SSOT)

> Referans: `docs/PROJECT_SPEC_V1.md`  
> Amaç: V1’de mevcut **REST endpoint’leri** ve **WS event’lerini** listeler.  
> Durum: M41 ana green + M42 / Step 0.6 / Step 1 / M43 / M44 / M45 / M46 / M46.1–M46.9 / M47 / M47.2 / M47.3 / M47.4 / M48 / M48.5 / M49 / M49.1 / M50 / M51–M53 / M54.3 / M54.4 green katmanları

---

## Auth

### POST `/api/auth/login`
Body:
```json
{ "email": "room@demo.com", "password": "demo123" }

Response:

{ "token": "..." }
GET /api/me

Header: Authorization: Bearer <token>

Response (özet):

{
  "id": 1,
  "email": "room@demo.com",
  "role": "ROOM",
  "fullName": "Room Operator",
  "phone": "+90...",
  "companyId": 1,
  "roomId": 1,
  "driverId": null,
  "personelId": null
}
Health
GET /health

200:

{ "ok": true, "dbOk": true }
Companies (SUPER_ADMIN)
GET /api/companies
POST /api/companies
PUT /api/companies/:id
DELETE /api/companies/:id
Rooms
GET /api/rooms

COMPANY UI dropdown için kullanılır.

ROOM/SUPER_ADMIN için scope’a göre döner.

POST /api/rooms (SUPER_ADMIN)
PUT /api/rooms/:id (SUPER_ADMIN)
DELETE /api/rooms/:id (SUPER_ADMIN)
Vehicles (ROOM)
GET /api/vehicles
POST /api/vehicles

Body (örnek):

{ "plate":"34ABC123", "capacity":16, "speedLimitKmh":80 }
PUT /api/vehicles/:id
DELETE /api/vehicles/:id
PUT /api/vehicles/:id/bind-driver

Body:

{ "driverId": 123 }

409: driver zaten bağlıysa.

PUT /api/vehicles/:id/unbind-driver
Drivers (ROOM)
GET /api/drivers
POST /api/drivers
PUT /api/drivers/:id
DELETE /api/drivers/:id
Shifts
POST /api/shifts (COMPANY)

Shift talebi oluşturur.

{ "roomId": 1, "startAt":"2026-01-24T08:00:00.000Z", "endAt":"2026-01-24T18:00:00.000Z" }
GET /api/shifts/my

Role’e göre “benim vardiyalarım”.

PUT /api/shifts/:id/approve (ROOM)

Shift approve + assign.

{ "vehicleId": 1, "driverId": 1 }
POST /api/shifts/:id/start (ROOM)

Shift’i ACTIVE başlatır.

Stops (shift içi)

POST /api/shifts/:id/stops (ROOM/COMPANY) → stop set REPLACE

PUT /api/shifts/:id/stops/reorder

{ "idsInOrder": [101,102,103] }
Templates

POST /api/route-templates (COMPANY)

POST /api/shifts/:id/stops/from-template (COMPANY) → REPLACE

Driver Route
GET /api/driver/route/active (DRIVER)
GET /api/driver/shifts/:shiftId/route (DRIVER)
POST /api/driver/shifts/:shiftId/complete (DRIVER)
POST /api/driver/shifts/:shiftId/stops/:stopId/skip (DRIVER)
POST /api/driver/shifts/:shiftId/stops/:stopId/reopen (DRIVER)
GET /api/driver/shifts/:shiftId/next-stop (DRIVER)
GPS
POST /api/gps (DRIVER)
{ "vehicleId":1, "lat":41.017, "lng":28.98, "speed":42, "at":"2026-01-24T19:00:00.000Z" }

WS: gps:update + notif:new

ETA
GET /api/eta/vehicle/:id
Pickup Requests
POST /api/requests (PERSONEL)
{ "shiftId": 1, "lat": 41.015, "lng": 28.979 }
GET /api/requests (COMPANY/ROOM/SUPER_ADMIN)

Query: onlyOpen=1 (default)

PUT /api/requests/:id/close (ROOM)
{ "status": "ACCEPTED" }
M16 — Stop Suggestions
GET /api/shifts/:id/stop-suggestions?onlyOpen=1&radiusM=120 (ROOM)
POST /api/shifts/:id/stops/from-suggestion (ROOM)

Bazı validasyonlarda lat/lng zorunlu.

M16.2 — Shift People + Route Preview (COMPANY/ROOM)
GET /api/shifts/:id/people
PUT /api/shifts/:id/people
POST /api/shifts/:id/stops/generate
GET /api/shifts/:id/route-preview

Route preview stop satırında:

assignmentCount (duraktaki kişi sayısı)

M16.3 — Personel Konum Seçici + KVKK Minimizasyonu (COMPANY)
GET /api/company/personels?geoStatus=NEEDS_REVIEW
PUT /api/company/personels/:id/location
{ "lat": 41.0, "lng": 29.0, "geoManualOverride": true, "geoStatus": "OK" }
POST /api/company/personels/bulk-clear
{ "ids": [1], "fields": ["phone", "address"] }
Not: adres/telefon gecici olabilir; kalici esas veri lat/lon'dur.
Availability (ROOM/SUPER_ADMIN)
GET /api/availability?startAt=...&endAt=...&driverId=...

Bulk (önerilen — tek istekle çok araç):
POST /api/availability/bulk (ROOM/SUPER_ADMIN)
{ "startAt": "...", "endAt": "...", "vehicleIds": [1,2,3] }

200: { "ok": true, "items": [ {"vehicleId":1,"driverId":1,"vehicleOk":true,"driverOk":true} ] }

200: { "ok": true }

409: conflict response

Öncelik kuralı (deterministik):

Agreement conflict önce, Shift conflict sonra raporlanır.

Agreements (M17 / M91 canonical)
POST /api/agreements (COMPANY)

Not: doğrudan sözleşme açma kapalıdır. Tekil create için `sourceShiftId` zorunludur.

{
  "roomId": 1,
  "sourceShiftId": 123,
  "startDate": "2026-02-01",
  "endDate": "2026-03-01",
  "weekMask": 127,
  "startMin": 480,
  "endMin": 600,
  "direction": "INBOUND",
  "pattern": "ONE_WAY"
}

POST /api/agreements/bundle (COMPANY)

Agreement Wizard / preset akışının kanonik girişidir. Çoklu slot create burada yapılır.

{
  "roomId": 1,
  "sourceShiftId": 123,
  "startDate": "2026-02-01",
  "endDate": "2026-03-01",
  "weekMask": 62,
  "items": [
    { "startMin": 420, "endMin": 540, "direction": "INBOUND", "pattern": "ONE_WAY" },
    { "startMin": 1020, "endMin": 1140, "direction": "OUTBOUND", "pattern": "ONE_WAY" }
  ]
}

GET /api/agreements?take=50&status=REQUESTED (COMPANY/ROOM/SUPER_ADMIN)
PUT /api/agreements/:id/approve (ROOM)
{ "vehicleId": 1, "driverId": 1 }

409: overlap/reservation conflict.

PUT /api/agreements/:id/cancel (COMPANY)
PUT /api/agreements/:id/extend (COMPANY)
{ "endDate": "2026-04-01" }
M18 — Agreement → Daily Shift Generator

Bu milestone yeni bir REST endpoint eklemez; job, uygun agreement’lardan bugün shift üretir.

Shift model alanı:

agreementId (nullable) — doluysa agreement kaynaklıdır.

WebSocket (socket.io)
Bağlantı
io("http://localhost:3000", { auth: { token } })
Başlıca event’ler

gps:update

notif:new

request:update

eta:update

shift:update (payload’ta agreementId olabilir)

agreement:update (agreements panel auto-refresh için)

UI invalidate standardı: event isimleri “shift/agreement/vehicle/request/eta/notif” içeriyorsa ilgili liste/panel reload eder.
# PERSONEL-SERVIS V1 — API SPEC (SSOT)

> Referans: `docs/PROJECT_SPEC_V1.md`  
> Amaç: V1’de mevcut **REST endpoint’leri** ve **WS event’lerini** listeler.  
> Durum: M41 ana green + M42 / Step 0.6 / Step 1 / M43 / M44 / M45 / M46 / M46.1–M46.9 / M47 / M47.2 / M47.3 / M47.4 / M48 / M48.5 / M49 / M49.1 / M50 / M51–M53 / M54.3 / M54.4 green katmanları

---

## Auth

### POST `/api/auth/login`
Body:
```json
{ "email": "room@demo.com", "password": "demo123" }

Response:

{ "token": "..." }
GET /api/me

Header: Authorization: Bearer <token>

Response (özet):

{
  "id": 1,
  "email": "room@demo.com",
  "role": "ROOM",
  "fullName": "Room Operator",
  "phone": "+90...",
  "companyId": 1,
  "roomId": 1,
  "driverId": null,
  "personelId": null
}
Health
GET /health

200:

{ "ok": true, "dbOk": true }
Companies (SUPER_ADMIN)
GET /api/companies
POST /api/companies
PUT /api/companies/:id
DELETE /api/companies/:id
Rooms
GET /api/rooms

COMPANY UI dropdown için kullanılır.

ROOM/SUPER_ADMIN için scope’a göre döner.

POST /api/rooms (SUPER_ADMIN)
PUT /api/rooms/:id (SUPER_ADMIN)
DELETE /api/rooms/:id (SUPER_ADMIN)
Vehicles (ROOM)
GET /api/vehicles
POST /api/vehicles

Body (örnek):

{ "plate":"34ABC123", "capacity":16, "speedLimitKmh":80 }
PUT /api/vehicles/:id
DELETE /api/vehicles/:id
PUT /api/vehicles/:id/bind-driver

Body:

{ "driverId": 123 }

409: driver zaten bağlıysa.

PUT /api/vehicles/:id/unbind-driver
Drivers (ROOM)
GET /api/drivers
POST /api/drivers
PUT /api/drivers/:id
DELETE /api/drivers/:id
Shifts
POST /api/shifts (COMPANY)

Shift talebi oluşturur.

{ "roomId": 1, "startAt":"2026-01-24T08:00:00.000Z", "endAt":"2026-01-24T18:00:00.000Z" }
GET /api/shifts/my

Role’e göre “benim vardiyalarım”.

PUT /api/shifts/:id/approve (ROOM)

Shift approve + assign.

{ "vehicleId": 1, "driverId": 1 }
POST /api/shifts/:id/start (ROOM)

Shift’i ACTIVE başlatır.

Stops (shift içi)

POST /api/shifts/:id/stops (ROOM/COMPANY) → stop set REPLACE

PUT /api/shifts/:id/stops/reorder

{ "idsInOrder": [101,102,103] }
Templates

POST /api/route-templates (COMPANY)

POST /api/shifts/:id/stops/from-template (COMPANY) → REPLACE

Driver Route
GET /api/driver/route/active (DRIVER)
GET /api/driver/shifts/:shiftId/route (DRIVER)
POST /api/driver/shifts/:shiftId/complete (DRIVER)
POST /api/driver/shifts/:shiftId/stops/:stopId/skip (DRIVER)
POST /api/driver/shifts/:shiftId/stops/:stopId/reopen (DRIVER)
GET /api/driver/shifts/:shiftId/next-stop (DRIVER)
GPS
POST /api/gps (DRIVER)
{ "vehicleId":1, "lat":41.017, "lng":28.98, "speed":42, "at":"2026-01-24T19:00:00.000Z" }

WS: gps:update + notif:new

ETA
GET /api/eta/vehicle/:id
Pickup Requests
POST /api/requests (PERSONEL)
{ "shiftId": 1, "lat": 41.015, "lng": 28.979 }
GET /api/requests (COMPANY/ROOM/SUPER_ADMIN)

Query: onlyOpen=1 (default)

PUT /api/requests/:id/close (ROOM)
{ "status": "ACCEPTED" }
M16 — Stop Suggestions
GET /api/shifts/:id/stop-suggestions?onlyOpen=1&radiusM=120 (ROOM)
POST /api/shifts/:id/stops/from-suggestion (ROOM)

Bazı validasyonlarda lat/lng zorunlu.

M16.2 — Shift People + Route Preview (COMPANY/ROOM)
GET /api/shifts/:id/people
PUT /api/shifts/:id/people
POST /api/shifts/:id/stops/generate
GET /api/shifts/:id/route-preview

Route preview stop satırında:

assignmentCount (duraktaki kişi sayısı)

M16.3 — Personel Konum Seçici + KVKK Minimizasyonu (COMPANY)
GET /api/company/personels?geoStatus=NEEDS_REVIEW
PUT /api/company/personels/:id/location
{ "lat": 41.0, "lng": 29.0, "geoManualOverride": true, "geoStatus": "OK" }
POST /api/company/personels/bulk-clear
{ "ids": [1], "fields": ["phone", "address"] }
Not: adres/telefon gecici olabilir; kalici esas veri lat/lon'dur.
Availability (ROOM/SUPER_ADMIN)
GET /api/availability?startAt=...&endAt=...&driverId=...

200: { "ok": true }

409: conflict response

Öncelik kuralı (deterministik):

Agreement conflict önce, Shift conflict sonra raporlanır.

Agreements (M17 / M91 canonical)
POST /api/agreements (COMPANY)

Not: doğrudan sözleşme açma kapalıdır. Tekil create için `sourceShiftId` zorunludur.

{
  "roomId": 1,
  "sourceShiftId": 123,
  "startDate": "2026-02-01",
  "endDate": "2026-03-01",
  "weekMask": 127,
  "startMin": 480,
  "endMin": 600,
  "direction": "INBOUND",
  "pattern": "ONE_WAY"
}

POST /api/agreements/bundle (COMPANY)

Agreement Wizard / preset akışının kanonik girişidir. Çoklu slot create burada yapılır.

{
  "roomId": 1,
  "sourceShiftId": 123,
  "startDate": "2026-02-01",
  "endDate": "2026-03-01",
  "weekMask": 62,
  "items": [
    { "startMin": 420, "endMin": 540, "direction": "INBOUND", "pattern": "ONE_WAY" },
    { "startMin": 1020, "endMin": 1140, "direction": "OUTBOUND", "pattern": "ONE_WAY" }
  ]
}

GET /api/agreements?take=50&status=REQUESTED (COMPANY/ROOM/SUPER_ADMIN)
PUT /api/agreements/:id/approve (ROOM)
{ "vehicleId": 1, "driverId": 1 }

409: overlap/reservation conflict.

PUT /api/agreements/:id/cancel (COMPANY)
PUT /api/agreements/:id/extend (COMPANY)
{ "endDate": "2026-04-01" }
M18 — Agreement → Daily Shift Generator

Bu milestone yeni bir REST endpoint eklemez; job, uygun agreement’lardan bugün shift üretir.

Shift model alanı:

agreementId (nullable) — doluysa agreement kaynaklıdır.

WebSocket (socket.io)
Bağlantı
io("http://localhost:3000", { auth: { token } })
Başlıca event’ler

gps:update

notif:new

request:update

eta:update

shift:update (payload’ta agreementId olabilir)

agreement:update (agreements panel auto-refresh için)

UI invalidate standardı: event isimleri “shift/agreement/vehicle/request/eta/notif” içeriyorsa ilgili liste/panel reload eder.

---

## Plan Builder (COMPANY)

> Amaç: Guided Flow Step-0 ve Plan Builder V1 için OSRM matris + solver.
> Not: Default pack çalıştırmada OSRM+solver profile kapalı olabilir; endpoint’ler 200 dönüp {ok:false} ile “optional” davranır.

### GET `/api/plan-builder/precheck`
- Company hub/personel konumları + OSRM/solver durumu özet.

Response (özet):
```json
{
  "ok": true,
  "companyHub": {"ok": true, "hubLat": 41.0, "hubLng": 29.0},
  "personels": {"total": 10, "missingLatLng": 0, "zeroLatLng": 0, "needsReview": 0, "failed": 0},
  "osrm": {"configured": true, "ok": false, "error": "osrm:fetchFailed"},
  "solver": {"configured": false, "reachable": false, "ok": false, "mode": "heuristic"},
  "hints": []
}
```

### POST `/api/plan-builder/osrm-table`
Body:
```json
{
  "profile": "driving",
  "points": [{"id": 1, "lat": 41.0, "lng": 29.0}, {"id": 2, "lat": 41.01, "lng": 28.99}]
}
```

### POST `/api/plan-builder/solve-vrp`
Body:
```json
{
  "durationsSec": [[0,10],[10,0]],
  "depotIndex": 0,
  "returnToDepot": false,
  "preferOrtools": true
}
```


---

## M102/M104 sync — Login'siz personel/öğrenci canlı link akışı

### COMPANY / SCHOOL / ORGANIZATION erişim linkleri

#### GET `/api/company/passenger-links?shiftId=:shiftId`
Belirli vardiyaya bağlı personel/öğrenci canlı linklerini listeler.

Response (özet):
```json
{
  "items": [
    {
      "id": 12,
      "shiftId": 45,
      "personelId": 301,
      "expiresAt": "2026-03-10T18:00:00.000Z",
      "revokedAt": null,
      "lastOpenedAt": null
    }
  ]
}
```

#### POST `/api/company/passenger-links`
Tek kişiye özel, süreli canlı erişim linki üretir.

Body (örnek):
```json
{ "shiftId": 45, "personelId": 301, "ttlDays": 30 }
```

Response (özet):
```json
{
  "ok": true,
  "item": { "id": 12, "expiresAt": "2026-03-10T18:00:00.000Z" },
  "token": "raw_token_only_once",
  "url": "/public/passenger-live?token=raw_token_only_once"
}
```

Not: Ham token/URL yalnız ilk üretim cevabında döner; sonradan tekrar okunamaz.

#### POST `/api/company/passenger-links/:id/revoke`
Aktif linki revoke eder.

Response:
```json
{ "ok": true }
```

### Public canlı ekran

#### GET `/api/public/passenger-live?token=...`
Login gerektirmeden tek kişiye özel canlı durum ekranı döner.

Response (özet):
```json
{
  "ok": true,
  "personel": { "id": 301, "fullName": "Demo Personel" },
  "shift": { "id": 45, "status": "APPROVED" },
  "vehicle": { "id": 7, "plate": "34 ABC 123" },
  "eta": { "minutes": 8 },
  "navigation": { "lat": 37.77, "lng": 29.08 }
}
```

Amaç sadece canlı takip / ETA / navigasyon bilgisidir; kalıcı profil işlemleri bu link üstünden yapılmaz.

### ORGANIZATION planları

Organization plan endpoint'leri `/api/organization/*` altında servis edilir.
Kanonik plan yolları:
- `GET /api/organization/plans`
- `GET /api/organization/plans/:id`
- `POST /api/organization/plans`
- `PUT /api/organization/plans/:id`
- `POST /api/organization/plans/:id/publish-shift`
- `POST /api/organization/plans/:id/create-agreement`
- `POST /api/organization/plans/:id/send-offers`


## M44 — Telematics

Device provisioning (ROOM / SUPER_ADMIN)
- `GET /api/telematics/devices`
- `POST /api/telematics/devices`
  - body: `{ "vehicleId": 1, "vendor": "GENERIC", "serial": "IMEI-001", "label": "Front Tracker" }`
  - response: ham `token` sadece create anında döner
- `POST /api/telematics/devices/:id/rotate`
- `PATCH /api/telematics/devices/:id`
  - body: `{ "status": "ACTIVE|DISABLED", "label": "..." }`

Device direct push
- `POST /api/telematics/push`
- auth: `Authorization: Device <token>` veya `x-device-key`
- body: `{ "lat": 41.01, "lng": 29.01, "speed": 33, "at": "2026-03-10T18:00:00.000Z" }`

Vendor cloud push
- `POST /api/telematics/vendor/:provider`
- auth: `x-telematics-timestamp` + `x-telematics-signature`
- secret source: provider-specific HMAC secret
- supported providers: `generic`, `traccar`
- generic body: `{ "serial": "IMEI-001", "lat": 41.02, "lng": 29.02, "speed": 40, "at": "..." }`
- legacy shared-secret compat only local/test yolu olarak tutulur; production akisi signed webhook kullanir.

Publish
- existing `gps:update` korunur
- ek event: `telematics:update`


---

## M46 → M46.6 — AI Copilot / Rehber API özeti

### POST `/api/ai/copilot`

Amaç:
- mevcut Copilot analizleri
- sade Türkçe iş rehberi
- ekran / buton yardımı
- konum kaynağı rehberi

Genel notlar:
- read-only / suggestion-first
- audit: `AI_COPILOT_QUERY`
- ROOM / SUPER_ADMIN için step-up guard korunur
- write action yoktur

Örnek request (job guide):
```json
{
  "intent": "JOB_GUIDE",
  "entityType": "shift",
  "entityId": 42,
  "jobType": "OFFER_APPROVAL",
  "guideLevel": "SHORT"
}
```

Örnek request (screen help):
```json
{
  "intent": "JOB_GUIDE",
  "entityType": "screen",
  "entityId": "room-offers",
  "jobType": "SCREEN_MENU_GUIDE",
  "guideLevel": "SHORT"
}
```

Örnek response alanları (özet):
```json
{
  "copilotVersion": "M46.6-C",
  "mode": "JOB_GUIDE",
  "jobType": "SCREEN_MENU_GUIDE",
  "jobTitle": "Bu ekran ne için var?",
  "plainSummary": "Bu ekran teklifleri görmek ve yönetmek için kullanılır.",
  "whatToDoNow": "Önce listedeki kaydı seç.",
  "beforeYouStart": [{ "label": "Yetki uygun mu?", "status": "OK" }],
  "quickActions": [{ "label": "Sözleşme ekranını aç", "route": "/room/agreements" }],
  "buttonGuides": [{ "label": "Onay Ver", "purpose": "Seçili teklifi kabul eder." }],
  "menuPurpose": "Bu ekran teklif operasyonu içindir.",
  "screenMenus": ["Liste", "Filtre", "Detay"],
  "simpleTerms": [{ "term": "sözleşme", "meaning": "uzun süreli anlaşmalı çalışma kaydı" }]
}
```

### M46.6-A Job Guide jobType örnekleri
- `OFFER_REVIEW`
- `OFFER_APPROVAL`
- `ASSIGNMENT_READINESS_GUIDE`
- `VEHICLE_DRIVER_BIND`

### M46.6-B precheck alanları
- `beforeYouStart`
- `canProceed`
- `whyBlocked`
- `lockedActionReasons`
- `quickActions`
- `ifStuck`
- `copyOutputs`

### M46.6-T konum rehberi jobType örnekleri
- `TELEMATICS_DEVICE_CREATE`
- `LOCATION_SOURCE_GUIDE`
- `GPS_SIGNAL_DIAGNOSIS_GUIDE`

Ürün dili:
- **sürücünün telefon GPS'i**
- **cihaz GPS'i**
- **konum kaynağı**

### M46.6-C screen help jobType örnekleri
- `SCREEN_MENU_GUIDE`
- `BUTTON_ACTION_GUIDE`
- `ROLE_HELP_GUIDE`

`entityType: "screen"` ile kullanılır. DRIVER / PERSONEL / PARENT için de izinli ekran rehberleri vardır.


## M55 — Reports + Gelmedi Kaydı
## M55 Reports Contract Marker
- M55
- /api/reports/shifts/summary
- /api/penalties/no-show

- Reports endpointleri ve ROOM/COMPANY rapor ekranı iskeleti eklendi.
- Gelmedi kaydı (NO_SHOW) veri modeli ve backend guard açıldı.
- Aktif kayıtlı sürücü approve/apply aşamasında `ACTIVE_NO_SHOW_PENALTY` ile bloklanır.




## M56 — KVKK Matrix + ETA/Navigation Quality
## M56 Contract Marker
- M56
- /api/kvkk/matrix
- /api/eta/vehicle/:id

KVKK
GET /api/kvkk/matrix
- version
- rows[] { role, panels[], dataScopes[], canView[], canWrite[], notes }

ETA
GET /api/eta/vehicle/:id
Ek alanlar:
- etaMode
- routeQuality
- routeProgressState
- progressLabel
- gpsFreshness
- totalStopsCount
- reachedStopsCount
- skippedStopsCount
- remainingStopsCount
- remainingRouteKm
- remainingRouteEtaMin
- nextStop
- navigation
- lastResolvedStop
- skippedStops[]
- rerouteSuggested
- rerouteReason
- nextAction
