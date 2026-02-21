# PERSONEL-SERVIS V1 — API SPEC (SSOT)

> Referans: `docs/PROJECT_SPEC_V1.md`  
> Amaç: V1’de mevcut **REST endpoint’leri** ve **WS event’lerini** listeler.  
> Durum: M0→M18 (GREEN)

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

M16.3 — Geo Review (COMPANY)
GET /api/company/personels?geoStatus=NEEDS_REVIEW
PUT /api/company/personels/:id/location
{ "lat": 41.0, "lng": 29.0, "geoManualOverride": true, "geoStatus": "OK" }
Availability (ROOM/SUPER_ADMIN)
GET /api/availability?startAt=...&endAt=...&driverId=...

200: { "ok": true }

409: conflict response

Öncelik kuralı (deterministik):

Agreement conflict önce, Shift conflict sonra raporlanır.

Agreements (M17)
POST /api/agreements (COMPANY)
{
  "roomId": 1,
  "startDate": "2026-02-01",
  "endDate": "2026-03-01",
  "weekMask": 127,
  "startMin": 480,
  "endMin": 600
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
> Durum: M0→M18 (GREEN)

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

M16.3 — Geo Review (COMPANY)
GET /api/company/personels?geoStatus=NEEDS_REVIEW
PUT /api/company/personels/:id/location
{ "lat": 41.0, "lng": 29.0, "geoManualOverride": true, "geoStatus": "OK" }
Availability (ROOM/SUPER_ADMIN)
GET /api/availability?startAt=...&endAt=...&driverId=...

200: { "ok": true }

409: conflict response

Öncelik kuralı (deterministik):

Agreement conflict önce, Shift conflict sonra raporlanır.

Agreements (M17)
POST /api/agreements (COMPANY)
{
  "roomId": 1,
  "startDate": "2026-02-01",
  "endDate": "2026-03-01",
  "weekMask": 127,
  "startMin": 480,
  "endMin": 600
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