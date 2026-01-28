# PERSONEL-SERVIS V1 — API SPEC

> Referans: PROJECT_SPEC_V1.md

Bu doküman, Milestone-0 / iskelet seviyesinde mevcut **REST endpoint'leri** ve **WS event'lerini** listeler.

## Auth
### POST /api/auth/login
Body:
```json
{ "email": "room@demo.com", "password": "demo123" }
```
Response:
```json
{ "token": "...jwt..." }
```

### GET /api/me
Header: `Authorization: Bearer <token>`
Response:
```json
{
  "id": 1,
  "email": "room@demo.com",
  "role": "ROOM",
  "fullName": "Room Operator",
  "phone": "+90 ...",
  "companyId": 1,
  "roomId": 1,
  "driverId": null,
  "personelId": null
}
```

## Vehicles
### GET /api/vehicles
- ROOM: kendi room araçları (+gpsLast, son vardiyalar)
- COMPANY: kendi şirketinin onaylı/aktif vardiyalarında kullanılan araçlar
- DRIVER: kendisine atanmış vardiyalardaki araçlar
- PERSONEL: MVP olarak şirketinin onaylı/aktif vardiyalarındaki araçlar

### POST /api/vehicles  (ROOM)
Body:
```json
{
  "plate": "34ABC123",
  "capacity": 16,
  "speedLimitKmh": 80,
  "nextMaintenanceAt": "2026-01-30T00:00:00.000Z"
}
```

## Shifts & Stops
### POST /api/shifts  (COMPANY)
Shift talebi oluşturur (status=REQUESTED).

Body:
```json
{ "roomId": 1, "startAt": "2026-01-24T08:00:00.000Z", "endAt": "2026-01-24T18:00:00.000Z" }
```

### POST /api/shifts/:id/approve  (ROOM)
Shift onay + araç & driver ataması.

Body:
```json
{ "vehicleId": 1, "driverId": 1 }
```

### POST /api/shifts/:id/stops  (ROOM)
Shift durak planı (route plan). Var olan durakları replace eder.

Body:
```json
{
  "stops": [
    { "name": "Durak A", "lat": 41.017, "lng": 28.98, "order": 1, "type": "COMMON" },
    { "name": "Durak B", "lat": 41.022, "lng": 28.985, "order": 2, "type": "COMMON" }
  ]
}
```

### GET /api/shifts/my
Role'e göre vardiya listesi.

## GPS
### POST /api/gps  (DRIVER)
Driver GPS gönderir.

Body:
```json
{ "vehicleId": 1, "lat": 41.017, "lng": 28.98, "speed": 42, "at": "2026-01-24T19:00:00.000Z" }
```

Sunucu:
- `GpsPoint` history insert
- `GpsLast` upsert
- overspeed -> `Notification(type=OVERSPEED)`
- WS: `gps:update` + `notif:new`

## ETA
### GET /api/eta/vehicle/:id
Son GPS'e göre vardiyalardaki duraklara kalan mesafe ve ETA (yaklaşık).

## Pickup Requests
### POST /api/requests  (PERSONEL)
Body:
```json
{ "shiftId": 1, "lat": 41.015, "lng": 28.979 }
```

### GET /api/requests  (COMPANY/ROOM/SUPER_ADMIN)
PickupRequest listesi.

## Driver
### GET /api/driver/route/active  (DRIVER)
Driver'ın aktif vardiyasını, durakları ve ilerlemeyi döner.

### POST /api/driver/shifts/:shiftId/stops/:stopId/reached  (DRIVER)
Durak geçildi işaretler, `ShiftProgress` günceller ve WS `route:progress` yayar.

## Notifications
### GET /api/notifications/my
Scope bazlı bildirim listesi.

---

# WebSocket (socket.io)

## Bağlantı
Client auth:
```js
io("http://localhost:3001", { auth: { token } })
```

Server otomatik join:
- `user:{userId}`
- `role:{role}`
- `company:{companyId}` (varsa)
- `room:{roomId}` (varsa)
- DRIVER için ayrıca atanmış vardiyalardaki `vehicle:{vehicleId}`

## Event'ler
- `gps:update {vehicleId,lat,lng,speed,at,status}`
- `vehicle:status {vehicleId,status}`
- `notif:new {scope,type,payload}`
- `route:plan {shiftId,stops[]}`
- `route:progress {shiftId,lastReachedOrder,nextStop,completed}`

> Not: Eski istemciler için bazı yerlerde `notify:new` da yayınlanır.
