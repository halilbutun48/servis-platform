# PERSONEL-SERVIS-V1 — PRIMER (2026-01-25)  ✅ Yapıştır & Devam Et

## 0) Repo / Çalışma Ortamı
- Repo: D:\personel-servis-v1
- API: http://localhost:3000
- Compose: .\infra\docker-compose.yml  (servisler: db, redis, api)

## 1) Ürün Amaç / Kapsam
Öğrenci/parent yok. GPS tabanlı “personel servisi” platformu:
- Canlı araç takibi (map)
- Vardiya + durak planı (Shift/Stops)
- ETA hesaplama (araç→durak mesafe/eta)
- Bildirimler (stale/overspeed/maintenance vb.)
- REST = CRUD/planlama, WS = canlı/bildirim

## 2) Roller
- SUPER_ADMIN: Company/Room yönetir
- ROOM: araç/driver yönetir, shift onay/atama, operasyon paneli
- COMPANY: shift talebi ve personel/durak planı üretir
- DRIVER: atanmış araç + rota/durak görür, GPS gönderir
- PERSONEL: atanmış aracı görür, ETA takip eder

## 3) WS Odalar / Event’ler (çekirdek)
Join rooms:
- vehicle:{vehicleId}, room:{roomId}, company:{companyId}, shift:{shiftId}

Emit (hedef):
- gps:update {vehicleId,lat,lng,speed,at,status,ageSec}
- notif:new {scope,type,payload}
- route:plan {shiftId,stops[]}
- route:progress {shiftId,lastReachedOrder,nextStop,completed}

## 4) Çekirdek Veri Modeli (özet)
Company, Room
Vehicle (roomId, plate, capacity, speedLimitKmh, nextMaintenanceAt, status)
Driver (roomId, fullName, phone, deviceInfo)
Shift (companyId, roomId, vehicleId, driverId, startAt, endAt, status)
Stop (shiftId, name, lat,lng, order, type COMMON/MANUAL)
GpsLast (vehicleId, lat,lng,speed,at,status)
Notification (scope ROOM|COMPANY|DRIVER, type ..., payloadJson)

## 5) SON DURUM (çalışıyor ✅)
- Driver Map çalışıyor; GPS update sonrası haritalarda araç yer değiştiriyor.
- ETA çalışıyor:
  - GET /api/eta?vehicleId=1
  - payload: last gps + shifts(APPROVED/ACTIVE) + stops (remainingKm, etaMin)

## 6) Yapılan Fix’ler (önemli)
### 6.1 Auth middleware token okuma (✅ DONE)
- Dosya: backend/src/auth/middleware.js
- Artık hem
  - Authorization: Bearer <token>
  - x-auth-token: <token>
  kabul ediyor.
- Böylece curl ile POST /api/gps “Missing token” vermiyor.

### 6.2 Driver Map shifts endpoint (✅ DONE)
- Dosya: web/src/panels/driver/MapPanel.jsx
- /api/shifts (404 idi) yerine /api/shifts/my kullanıyor (driver için doğru).
- 3 sn polling + gps:update auto-reload ile canlılık.

### 6.3 ETA payload standardizasyonu (✅ DONE)
- Dosya: backend/src/routes/eta.js
- Import eklendi:
  - import { gpsStatusFromAt } from "../gps/status.js";
- computeEtaPayload() içinde last gps için tek kaynaktan status + ageSec üretiliyor:
  - status: LIVE / STALE / OFFLINE
  - ageSec: saniye yaşı

## 7) Status Standardı (A) — Tek Kaynak Kural (✅ DONE)
- Dosya: backend/src/gps/status.js
- Kural (tek yer):
  - LIVE   : ageSec <= 20
  - STALE  : 20 < ageSec <= 300
  - OFFLINE: ageSec > 300 veya at yok/bozuk
- UI/CSS standardı hedef: marker + list aynı renk/badge mantığı

## 8) UI/CSS Durumu
- markers.css içinde vehicle marker class’ları LIVE/STALE/OFFLINE ile standarda yaklaştırıldı.
- Status badge css eklendi (listelerde kullanılacak sınıf):
  - .statusBadge + .statusBadge--live/--stale/--offline

## 9) Test Komutu (tek shot)
```powershell
cd D:\personel-servis-v1; `
$login = curl.exe -s -X POST "http://localhost:3000/api/auth/login" -H "Content-Type: application/json" -d '{"email":"driver@demo.com","password":"demo123"}'; `
$TOKEN = ($login | ConvertFrom-Json).token; `
"--- shifts/my ---"; curl.exe -s "http://localhost:3000/api/shifts/my" -H "x-auth-token: $TOKEN" -H "Authorization: Bearer $TOKEN"; `
"--- gps update ---"; curl.exe -s -X POST "http://localhost:3000/api/gps" -H "Content-Type: application/json" -H "x-auth-token: $TOKEN" -H "Authorization: Bearer $TOKEN" -d '{"vehicleId":1,"lat":41.0302,"lng":28.9960,"speed":40}'; `
"--- eta ---"; curl.exe -s "http://localhost:3000/api/eta?vehicleId=1" -H "x-auth-token: $TOKEN" -H "Authorization: Bearer $TOKEN"