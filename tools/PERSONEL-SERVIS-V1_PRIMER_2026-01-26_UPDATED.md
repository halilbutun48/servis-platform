# PERSONEL-SERVIS-V1 — PRIMER (2026-01-26) — UPDATED

> Tek kaynak “devam dokümanı”. Yeni sohbetlerde burayı yapıştırıp devam edeceğiz.

---

## 0) Repo / Çalışma Ortamı
- Repo: `D:\personel-servis-v1`
- API: `http://127.0.0.1:3000`
- Monorepo: `backend/`, `web/`, `infra/`, `docs/`, `tools/`
- Docker (infra):
  - Postgres: container `personel_db` (DB: `servisdb`, user: `servis`)
  - Redis: `personel_redis`
  - API: `personel_api`

> Not (dev): DB cred mismatch yaşarsan en hızlı çözüm `docker compose down -v` ile volume reset + migrate+seed akışı.

---

## 1) Ürün Amaç / Kapsam
Öğrenci/parent yok. GPS tabanlı “personel servisi” platformu:
- Canlı araç takibi (map)
- Vardiya + durak planlama (Shift/Stop)
- ETA hesaplama (araç → durak `remainingKm/etaMin`)
- Bildirimler (GPS stale/offline, overspeed, maintenance vb.)
- REST = CRUD/planlama, WS = canlı + bildirim

---

## 2) Roller (5)
- **SUPER_ADMIN**: Company/Room yönetimi
- **ROOM**: operasyon; araç/driver; shift onay/atama; harita
- **COMPANY**: vardiya talebi + durak/personel planı üretir
- **DRIVER**: atanmış araç + stop/rota görür; GPS gönderir; reached ile ilerleme
- **PERSONEL**: atanmış araç + ETA takip (ileride)

---

## 3) WS Odalar / Event’ler (çekirdek)

### 3.1 Join rooms
- `vehicle:{vehicleId}`
- `room:{roomId}`
- `company:{companyId}`
- `shift:{shiftId}`
- (varsa) `user:{userId}` *(driver recovery/stale notif için kullanılıyor)*

### 3.2 Emit (server → client)
- `gps:update` `{vehicleId,lat,lng,speed,at,status,ageSec}`
- `vehicle:status` `{vehicleId,status,ageSec}`
- `notif:new` `{scope,type,payload}` *(payload v1 object)*
- `eta:update` `{shiftId,vehicleId,at,stops:[{id,name,order,remainingKm,etaMin}]}`

> UI status string standardı: `LIVE | STALE | OFFLINE` (DB enum değil, render amaçlı)

---

## 4) DB Model Özeti (çekirdek)
Tablolar:
- `Company`, `Room`
- `Vehicle (roomId, plate, capacity, speedLimitKmh, nextMaintenanceAt, status)`
- `Driver (roomId, fullName, phone, deviceInfo, userId?)`
- `Shift (companyId, roomId, vehicleId, driverId, startAt, endAt, status)`
- `Stop (shiftId, name, lat,lng, order, type COMMON/MANUAL)`
- `GpsLast (vehicleId, lat,lng,speed,at,status)` + `GpsPoint` history
- `Notification (scope, type, payloadJson, vehicleId?, roomId?, companyId?, driverId?)`

### 4.1 Enum gerçekleri (KRİTİK)
- **GpsLastStatus (DB)**: `OK | STALE`  (LIVE/OFFLINE DB’ye yazılmaz)
- **VehicleStatus (DB)**: `ACTIVE | PASSIVE | STALE`

---

## 5) Status Standardı (tek kaynak)
- Tek kaynak: `backend/src/gps/status.js`
- UI status (render): `LIVE | STALE | OFFLINE`
- LIVE: `ageSec <= 20`
- STALE: `20 < ageSec <= 300`
- OFFLINE: `ageSec > 300` (veya at yok/bozuk)

### 5.1 DB mapping kuralı (karar)
- UI `LIVE`  → `GpsLast.status = OK` ve `Vehicle.status = ACTIVE`
- UI `STALE` → `GpsLast.status = STALE` ve `Vehicle.status = STALE`
- UI `OFFLINE` → `GpsLast.status = STALE` ve `Vehicle.status = STALE`

---

## 6) GPS ingest (backend) — güncel davranış
Dosya: `backend/src/routes/gps.js`

POST `/api/gps` (DRIVER):
- `GpsPoint.create` (history)
- `GpsLast.upsert` → **status: "OK"**
- `Vehicle.update` → **status: "ACTIVE"**
- WS `gps:update` → `status + ageSec` (status.js’den)
- WS `vehicle:status` → `status + ageSec`
- Overspeed olursa `Notification` üretir + WS `notif:new` yayar
- Shift (APPROVED/ACTIVE) stop’larına göre `eta:update` yayınlar

---

## 7) ETA Endpoint Standardı
Dosya: `backend/src/routes/eta.js`

GET `/api/eta?vehicleId=1` (auth required):
- **Response format (standart):**
```json
{
  "shiftId": 2,
  "vehicleId": 1,
  "at": "2026-01-26T08:00:00.000Z",
  "stops": [{ "id": 1, "name": "Stop 1", "order": 1, "remainingKm": 0.7, "etaMin": 2 }],
  "last": { "lat": 41.03, "lng": 28.99, "speed": 20, "at": "...", "status": "LIVE", "ageSec": 3 }
}
```

**Yetki kuralı (kritik):**
- DRIVER bu endpoint’i ancak `vehicleId` üzerinde **APPROVED/ACTIVE bir shift’e atanmışsa** görür. Aksi halde **403 Forbidden**.

---

## 8) Notification payload standardı (v1)
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
  "at": "2026-01-26T12:34:56.000Z",
  "ageSec": 0,
  "status": "LIVE|STALE|OFFLINE|null",
  "kind": "string|null"
}
```

---

## 9) Monitoring (server.js şişmesin) — güncel mimari ✅
- `server.js` artık monitoring kodu şişirmiyor.
- Monitör başlangıcı: `backend/src/jobs/index.js`
  - `startMonitors(io)` → interval’lar burada
  - SIGINT/SIGTERM’de stop/cleanup

### 9.1 GPS stale/offline monitor ✅
- Dosya: `backend/src/jobs/gpsStaleMonitor.js`
- **Transition gate / dedupe** aktif:
  - `LIVE → STALE` → `kind=GPS_STALE`
  - `STALE → OFFLINE` → `kind=GPS_OFFLINE`
  - `OFFLINE → LIVE` → `kind=GPS_RECOVERY`
- Scope: ROOM + COMPANY + (aktif shift üzerinden) DRIVER tarafına da gider.
- WS `vehicle:status` yayınlar.

### 9.2 Maintenance monitor ✅ (temel)
- Dosya: `backend/src/jobs/maintenanceMonitor.js`
- Periyodik yaklaşan bakım kontrolü + dedupe (24h) mantığı mevcut.

---

## 10) Seed / Demo hesaplar (dev)
Seed komutu: `npm run seed` (container içinde)
- Şifre (hepsi): **demo123**
- Kullanıcılar:
  - `superadmin@demo.com`
  - `company@demo.com`
  - `room@demo.com`
  - `driver@demo.com`
  - `personel@demo.com`

> Not: `npx prisma db seed` için `package.json > prisma.seed` tanımı yok; seed için **npm run seed** kullanılacak.

---

## 11) Frontend (özet)
- Driver map canlı güncelleniyor (gps update sonrası araç konumu değişiyor).
- Notifications panel v1 payload render ediyor (status/kind/title).
- Session/token: Bearer + `x-auth-token` uyumlu.
- UI renk/marker dosyaları eski haline geri alındı (konu kapalı).

---

## 12) “Çalışıyor” checklist ✅ (kanıtlı)
✅ **SMOKE PASS + FULLCHECK PASS** ile doğrulandı:
- `/health` ✅
- POST `/api/gps` → DB’de `GpsLast.OK` + `Vehicle.ACTIVE` ✅
- WS `gps:update` + `vehicle:status` (driver/room/company) ✅
- Overspeed → Notification + WS `notif:new` (driver/room/company) ✅
- `/api/eta` formatı (`stops[]`) ✅
- WS `eta:update` ✅
- GPS transitions + dedupe ✅
  - LIVE→STALE ✅
  - STALE→OFFLINE ✅
  - OFFLINE→LIVE (recovery) ✅

---

## 13) Test Paketleri (repo içi)
- Smoke: `backend/scripts/smoke.js` ✅
- FullCheck: `backend/scripts/fullcheck.js` ✅
  - WS + DB + notif + transition/dedupe + recovery dahil.
  - Not: `/api/eta` driver yetkisi için araç üzerinde APPROVED/ACTIVE shift olmalı.

---

## 14) Milestone durumu (özet)
✅ M0: iskelet/auth/roles/seed  
🟡 M1: Room/Company CRUD + onay akışı (kısmi)  
✅ M2: GPS + Map + ETA core  
🟡 M3: Route/stops tam workflow (kısmi)  
✅ M4: WS + Notification standardı (**payload v1 + transition dedupe DONE**)  

---

## 15) Açık konular (güncel)
- 🟡 M1/M3’ü “DONE” yapmak:
  - Room/Company CRUD eksikleri
  - Shift/Stop workflow tamamlanması (approve/activate, reached/progress, vs.)
- 🟡 Maintenance tarafını ürün seviyesinde netleştirme (eşik, scope, payload kind’leri, panel render)

---

## 16) Tek-shot smoke test (PowerShell) ✅
> Tek blok, tek komut (PS7 kuralına uygun)

```powershell
cd D:\personel-servis-v1\infra; docker compose exec -T api sh -lc "npm run seed >/dev/null 2>&1 || true; npm run smoke"
```

## 17) FullCheck run (PowerShell)
```powershell
cd D:\personel-servis-v1\infra; docker compose exec -T api node scripts/fullcheck.js
```
