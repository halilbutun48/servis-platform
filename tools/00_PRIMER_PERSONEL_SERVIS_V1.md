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
- **ROOM**: operasyon; araç/driver/shift onay-atama; harita
- **COMPANY**: vardiya talebi + personel/durak planı üretir
- **DRIVER**: atanmış araç + stop/rota görür; GPS gönderir; reached ile ilerleme
- **PERSONEL**: kendi atanmış araç + ETA takip (ileride)


## 3) WS Odalar / Event’ler (çekirdek)
Join rooms:
- `vehicle:{vehicleId}`
- `room:{roomId}`
- `company:{companyId}`
- `shift:{shiftId}`


Emit:
- `gps:update` `{vehicleId,lat,lng,speed,at,status}` *(status UI: LIVE/STALE/OFFLINE)*
- `vehicle:status` `{vehicleId,status,ageSec}` *(şu an UI amaçlı LIVE gönderiyoruz; ileride netleştirilecek)*
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
- Backend tek kaynak: `backend/src/gps/status.js`
- UI status (render amaçlı): `LIVE | STALE | OFFLINE`
- LIVE: `ageSec <= 20`
- STALE: `20 < ageSec <= 300`
- OFFLINE: `ageSec > 300` (veya at yok/bozuk)


**DB status mapping kuralı (karar):**
- UI `LIVE` → `GpsLast.status = OK` ve `Vehicle.status = ACTIVE`
- UI `STALE/OFFLINE` → `GpsLast.status = STALE` ve `Vehicle.status = STALE`


## 6) GPS ingest (backend) — güncel davranış ✅
Dosya: `backend/src/routes/gps.js`


POST `/api/gps` (DRIVER):
- `GpsPoint.create` (history)
- `GpsLast.upsert` **status: "OK"** ✅
- `Vehicle.update` **status: "ACTIVE"** ✅
- WS `gps:update` payload **status: "LIVE"** (UI için) ✅
- Overspeed olursa `Notification` üretir + WS `notif:new` yayar ✅
- Shift(ASSIGNED/ACTIVE) stop’larına göre `eta:update` yayınlar ✅


## 7) Notification payload standardı (v1) ✅
Dosya: `backend/src/notifications/service.js` (+ `backend/src/notifications/payloadV1.js`)


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