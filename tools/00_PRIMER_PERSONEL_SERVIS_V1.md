# PERSONEL-SERVIS-V1 — PRIMER (2026-01-25) ✅ Yapıştır & Devam Et


## 0) Repo / Çalışma Ortamı
- Repo: `D:\personel-servis-v1`
- API: `http://127.0.0.1:3000`
- DB (docker): `personel_db` / DB: `servisdb` / user: `servis`
- Monorepo: `backend/`, `web/`, `infra/`, `docs/`, `tools/`


## 1) Ürün Amaç / Kapsam
Öğrenci/parent yok. GPS tabanlı “personel servisi” platformu:
- Canlı araç takibi (map)
- Vardiya + durak planı (Shift/Stop)
- ETA hesaplama (araç→durak remainingKm/etaMin)
- Bildirimler (GPS stale/offline, overspeed, maintenance vb.)
- REST = CRUD/planlama, WS = canlı + bildirim


## 2) Roller (5)
- **SUPER_ADMIN**: Company/Room yönetimi
- **ROOM**: operasyon; araç/driver; shift onay/atama; harita
- **COMPANY**: vardiya talebi + durak/personel planı üretir
- **DRIVER**: atanmış araç + stop/rota görür; GPS gönderir; reached ile ilerleme
- **PERSONEL**: kendi atanmış araç + ETA takip (ileride)


## 3) WS Odalar / Event’ler (çekirdek)
Join rooms:
- `vehicle:{vehicleId}`
- `room:{roomId}`
- `company:{companyId}`
- `shift:{shiftId}`


Emit:
- `gps:update` `{vehicleId,lat,lng,speed,at,status,ageSec}`
- `status` (UI): `LIVE | STALE | OFFLINE`
- `vehicle:status` `{vehicleId,status,ageSec}`
- `status` (UI): `LIVE | STALE | OFFLINE` ✅ (DB enum değil)
- `notif:new` `{scope,type,payload}` *(payload v1 object)*
- `eta:update` `{shiftId,vehicleId,at,stops:[{id,name,order,remainingKm,etaMin}]}`


## 4) DB Model Özeti (çekirdek)
Tablolar:
- `Company`, `Room`
- `Vehicle (roomId, plate, capacity, speedLimitKmh, nextMaintenanceAt, status)`
- `Driver (roomId, fullName, phone, deviceInfo)`
- `Shift (companyId, roomId, vehicleId, driverId, startAt, endAt, status)`
- `Stop (shiftId, name, lat,lng, order, type COMMON/MANUAL)`
- `GpsLast (vehicleId, lat,lng,speed,at,status)` + `GpsPoint` history
- `Notification (scope, type, payloadJson, vehicleId?, roomId?, companyId?, driverId?)`


### 4.1 Enum gerçekleri (KRİTİK)
- **GpsLastStatus (DB)**: `OK | STALE` ✅ (LIVE/OFFLINE DB’ye yazılmaz)
- **VehicleStatus (DB)**: `ACTIVE | PASSIVE | STALE` ✅


## 5) Status Standardı (tek kaynak)
- Tek kaynak: `backend/src/gps/status.js`
- UI status (render amaçlı): `LIVE | STALE | OFFLINE`
- LIVE: `ageSec <= 20`
- STALE: `20 < ageSec <= 300`
- OFFLINE: `ageSec > 300` (veya at yok/bozuk)


DB mapping kuralı (karar):
- UI `LIVE` → `GpsLast.status = OK` ve `Vehicle.status = ACTIVE`
- UI `STALE/OFFLINE` → `GpsLast.status = STALE` ve `Vehicle.status = STALE`


## 6) GPS ingest (backend) — güncel davranış ✅
Dosya: `backend/src/routes/gps.js`


POST `/api/gps` (DRIVER):
- `GpsPoint.create` (history)
- `GpsLast.upsert` → **status: "OK"** ✅
- `Vehicle.update` → **status: "ACTIVE"** ✅
- WS `gps:update` → `status + ageSec` (status.js’den) ✅
- WS `vehicle:status` → `status + ageSec` (gps:update ile aynı standart) ✅
- Overspeed olursa `Notification` üretir + WS `notif:new` yayar ✅
- Shift(APPROVED/ACTIVE) stop’larına göre `eta:update` yayınlar ✅


## 7) Notification payload standardı (v1) ✅
Dosyalar: `backend/src/notifications/service.js` + `backend/src/notifications/payloadV1.js`


DB kuralı:
- `Notification.payloadJson` alanına **daima v1 object (JSONB)** yazılır.


V1 payload:
```json
{
"v": 1,
"title": "string",
"message": "string",
"vehicleId": 1,
"at": "ISO",
"ageSec": 0,
"status": "LIVE|STALE|OFFLINE|null",
"kind": "string|null"
}
8) Frontend (özet)

Driver map çalışıyor; GPS update sonrası araç konumu değişiyor.

Notifications panel v1 payload render ediyor (status/kind/title).

Session/token tarafı Bearer + x-auth-token uyumlu.

9) Şu an “çalışıyor” checklist ✅

POST /api/gps → DB’de GpsLast.OK + Vehicle.ACTIVE ✅

Overspeed → Notification (DRIVER/ROOM/COMPANY) ✅

eta:update WS + ETA hesaplama ✅

/health endpoint ✅

10) Bilinen açık konu (öncelik)
GPS_STALE spam / dedupe (🟡)

STALE/OFFLINE notification’ları “durum değişmediği halde” tekrar tekrar üretebiliyor.

Hedef: yalnızca state transition olunca notif üret:

LIVE→STALE

STALE→OFFLINE

OFFLINE→LIVE (recovery)

Not: DB güncellemesinde “zaten aynıysa continue” kontrolü var ama notif tarafı ayrıca gate’lenmeli.

11) Milestone durumu (özet)

✅ M0: iskelet/auth/roles/seed

🟡 M1: Room/Company CRUD + onay akışı (kısmi)

✅ M2: GPS + Map + ETA core

🟡 M3: Route/stops tam workflow (kısmi)

🟡 M4: WS + Notification standardı (payload v1 DONE; dedupe eksik)

12) Test komutları (tek shot)
cd D:\personel-servis-v1; `
$login = curl.exe -s -X POST "http://127.0.0.1:3000/api/auth/login" -H "Content-Type: application/json" -d '{"email":"driver@demo.com","password":"demo123"}'; `
$TOKEN = ($login | ConvertFrom-Json).token; `
"--- gps ---"; curl.exe -s -X POST "http://127.0.0.1:3000/api/gps" -H "Content-Type: application/json" -H "Authorization: Bearer $TOKEN" -d '{"vehicleId":1,"lat":41.0302,"lng":28.9960,"speed":20}'; `
"--- eta ---"; curl.exe -s "http://127.0.0.1:3000/api/eta?vehicleId=1" -H "Authorization: Bearer $TOKEN"; `
"--- db check ---"; docker exec -it personel_db psql -U servis -d servisdb -c 'select "vehicleId", status, at from 