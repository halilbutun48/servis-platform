# PERSONEL-SERVİS V1 — PRIMER (Yeni Sohbet İçin Yapıştır)

## Güncel Durum (En son)
- **Tarih:** 28 Ocak 2026
- **Çalışıyor:** Backend + Web + DB (docker) + Redis ✅
- **Doğrulama:** `npm run smoke` ✅, `npm run fullcheck` ✅
- **Health:** `/health` → `dbOk:true`, `dbLatencyMs` dönüyor ✅
- **Stale/Offline:** LIVE→STALE→OFFLINE→LIVE geçişleri + **dedupe** ✅
- **Not:** 3000 port çakışırsa eski node process kapatılmalı (EADDRINUSE)

---

## Amaç
GPS tabanlı **personel servisi** platformu:
- Canlı araç takibi (harita)
- Vardiya → rota/durak planı
- Company’den gelen taleplerin Room tarafından araca+sürücüye bağlanması
- Driver’a rota/durakların düşmesi
- Bildirimler: **OVERSPEED / GPS_STALE / GPS_OFFLINE / RECOVERY**
- WS ile canlı güncellemeler (gps:update, vehicle:status, eta:update, notify:new)

> İleri hedef (Company tarafı): Vardiya bazlı **Excel** personel listesi yükleme → adresleri yakınlığa göre grupla → durak öner → araç kapasitesine göre talep oluştur → rota bilgisi Room’a düşsün.

---

## Roller (5)
1) **SUPER_ADMIN**
- Company oluşturur/yönetir
- Yetki/rol yönetimi

2) **COMPANY**
- Vardiya şablonlarıyla talep açar (sabah/akşam vs)
- Personel listesi/talep yönetimi (v1 temel)

3) **ROOM (Operasyon)**
- Araç ekler (plaka, kapasite, hız limiti, bakım/donanım)
- Sürücü ekler/atanır (opsiyonel yedek)
- Company taleplerini onaylar, araca+sürücüye bağlar
- Haritada tüm araçları izler

4) **DRIVER**
- Kendi rotasını/duraklarını görür
- GPS gönderir
- Bildirim alır

5) **PERSONEL**
- Temel kullanıcı (konum/adres yönetimi v1 minimum)

---

## Çalışan Durum / Doğrulama (PASS)
- `/health` → `dbOk`, `dbLatencyMs`, `version` ✅
- `npm run smoke` ✅
- `npm run fullcheck` ✅  
  - WS connect + `ws:ready`
  - `gps:update` + `vehicle:status`
  - LIVE→STALE→OFFLINE→LIVE transition + **dedupe** doğrulandı

---

## Seed / Demo Hesaplar
Şifre (hepsi): **demo123**
- `superadmin@demo.com`
- `company@demo.com`
- `room@demo.com`
- `driver@demo.com`
- `personel@demo.com`

---

## Portlar / Servisler
- Backend API: `http://localhost:3000`
- Health: `http://localhost:3000/health`
- Postgres (Docker): `localhost:5433` → container 5432
- Redis (Docker): `localhost:6379`
- Web (Vite): genelde `http://localhost:5173`

---

## Repo Yapısı (Önemli)
- `backend/src/server.js`
  - REST mount + WS (socket.io) mount
  - `/health` detaylı
  - rate-limit, request log, socket auth + scope join
- `backend/src/env.js` (ENV.PORT vb.)
- `backend/src/prisma.js` + `backend/prisma/schema.prisma` + migrations
- `backend/src/auth/*` (jwt verify/login)
- `backend/src/routes/`
  - `auth, me, companies, rooms, vehicles, drivers, shifts, gps, requests, routeTemplates, driver, personels, notifications, eta`
- `backend/src/ws/*` (scopeRoomsForUser, join odaları)
- `backend/src/middleware/apiRequestLog.js` (M10)
- `backend/src/jobs/*` (stale/offline monitor + dedupe)
- `backend/scripts/`
  - `smoke.js`, `fullcheck.js`, `m0..m12check.js` (varsa)
- `infra/` (docker-compose: postgres + redis)
- `docs/`
  - `PROJECT_SPEC_V1, API_SPEC_V1, DB_SCHEMA_V1, UI_SPEC_V1, STARTPACK_V1.md`
- `tools/pack.ps1` (GreenPack / M12)

---

## DB / Model Kritik Kurallar
- Stop state: `PENDING / REACHED / SKIPPED`
  - `reachedAt`, `skippedAt`, `updatedAt`
- Request validation:
  - `lat/lng` zorunlu
  - aynı kapsamda duplicate **OPEN** request → **409**
- Template stops ordering:
  - `order` alanı (veya reorder mekanizması)

---

## Observability (M10 Kriterleri)
- `ApiRequest` modeli + middleware insert ✅
- `/health` db ping + latency ✅
- `AuditLog` (varsa) ✅
- 🟡 Plan: retention/cleanup job (varsa eklenecek)

---

## WS Scope / Rooms
- Socket auth: token → user → role/scope
- `ws:ready` event’i ile joined room’lar döner
- yayınlanan event örnekleri:
  - `gps:update`, `vehicle:status`, `eta:update`, `notify:new`

---

## Güvenlik / Operasyon Standartları (Kısa)
- RBAC + scope
- rate limit / abuse guard
- audit log (en az kritik aksiyonlar)
- backup/restore yaklaşımı
- stateless backend; canlı + history ayrımı prensibi

---

## Gate / Komutlar (Hatırlatma)
- `npm run smoke`
- `npm run fullcheck`
- (varsa) `npm run m11check`, `npm run m12check`

---

## Bilinen Notlar / İyileştirme
- 🟡 AuditLog retention job (plan)
- 🟡 Docs isim/tekrar düzeni (tek kaynak standardına sıkılaştırma)

---

## Sık Hata / Çözüm (Mini Runbook)

### 1) `EADDRINUSE: address already in use :::3000`
- 3000 portunda başka process vardır.
- Çözüm: `netstat -ano | findstr :3000` ile PID bul → Görev Yöneticisi’nden kapat ya da `taskkill /PID <pid> /F`.

### 2) Prisma: `Can't reach database server at localhost:5433`
- DB container çalışmıyor veya henüz **healthy** değil.
- Çözüm:
  - `cd infra` → `docker compose up -d db redis`
  - `docker compose ps` → db **healthy** olana kadar bekle
  - Sonra backend tarafında: `npx prisma migrate deploy` + seed.

### 3) Docker error: `open //./pipe/dockerDesktopLinuxEngine`
- Docker Desktop/Engine çalışmıyor ya da context/WSL tarafında sorun var.
- Çözüm:
  - Docker Desktop’ı aç (Engine running)
  - Gerekirse `docker context use desktop-linux`
  - Tekrar: `docker compose ps`

### 4) Backend log: `gpsStaleMonitor: DB not ready`
- Backend DB’ye bağlanmadan monitor tick atlamıştır.
- Çözüm: DB’yi ayağa kaldır, backend’i restart et (`rs` ile nodemon).

### 5) Web çalışıyor ama API çağrıları düşmüyor
- Web env’de API_URL yanlış olabilir (proxy / baseURL).
- Çözüm: Web’in `VITE_API_URL`/proxy ayarını `http://127.0.0.1:3000` yap; CORS açık.

### 6) Windows’ta TIME_WAIT çok görünüyor
- Normal (tarayıcı kısa bağlantılar aç/kapat).
- Sorun değil; önemli olan LISTENING’in tek PID’de olması.
