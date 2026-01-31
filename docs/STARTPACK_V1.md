# STARTPACK_V1 — Quick entry point (SSOT)

Bu dosya “başlangıç noktasıdır”. Güncel ürün/akış/kurallar için:
- SSOT: docs/PRIMER_SSOT.md
- Kısa yapıştır: tools/PRIMER_SNAPSHOT.md

# STARTPACK_V1 — Personel Servis Platformu (Single Source of Truth)

Bu dosya **tek kaynak**tır:
- Yeni sohbette yapıştırılacak **PRIMER**
- Çalıştırma / doğrulama adımları
- Mini runbook (en sık hatalar)
- Standartlar (WS scope, dedupe, kritik DB kuralları)

> Diğer dokümanlar (PROJECT_SPEC_V1, API_SPEC_V1, DB_SCHEMA_V1, UI_SPEC_V1) detay içerir.
> “Ne çalışıyor / nasıl test ederim / en hızlı debug” = burası.

---

## 1) PRIMER (Yeni Sohbet İçin Yapıştır)

### Güncel Durum
- **Tarih:** 28 Ocak 2026
- **Stack:** Backend + Web + Postgres(docker) + Redis ✅
- **Check PASS:** `npm run smoke` ✅, `npm run fullcheck` ✅
- **Health:** `/health` → `dbOk:true`, `dbLatencyMs`, `version` ✅
- **State machine:** LIVE → STALE → OFFLINE → LIVE + **dedupe** ✅
- **Not:** 3000 port çakışırsa eski node process kapatılmalı (EADDRINUSE)

### Amaç
GPS tabanlı **personel servisi** platformu:
- Canlı araç takibi (harita)
- Vardiya → rota/durak planı
- Company talebini Room onaylar, araca+sürücüye bağlar
- Driver’a rota/durak düşer
- Bildirimler: **OVERSPEED / GPS_STALE / GPS_OFFLINE / RECOVERY**
- WS ile canlı yayınlar: `gps:update`, `vehicle:status`, `eta:update`, `notify:new`

**İleri hedef (Company):** Vardiya bazlı Excel personel listesi yükle → adres yakınlığına göre grupla → durak öner → kapasiteye göre araç talebi oluştur → rota/durak bilgisi Room’a düşsün.

### Roller (5)
1) **SUPER_ADMIN**: Company oluştur/yönet, rol/yetki  
2) **COMPANY**: Vardiya şablonlarıyla talep açar, talepleri yönetir (v1 temel)  
3) **ROOM (Operasyon)**: Araç/sürücü yönetir, talepleri onaylar, haritada tüm araçları izler  
4) **DRIVER**: Kendi rotasını/duraklarını görür, GPS gönderir, bildirim alır  
5) **PERSONEL (çalışan)**: Adres/konum yönetimi (v1 minimum)

### Seed / Demo Hesaplar
Şifre (hepsi): **demo123**
- `superadmin@demo.com`
- `company@demo.com`
- `room@demo.com`
- `driver@demo.com`
- `personel@demo.com`

### Portlar / Servisler
- API: `http://localhost:3000`  (Health: `/health`)
- Postgres: `localhost:5433` → container `5432`
- Redis: `localhost:6379`
- Web (Vite): genelde `http://localhost:5173`

### Repo Yapısı (Özet)
- `backend/src/server.js`: REST + WS mount, `/health`, rate-limit, request log, socket auth/scope join  
- `backend/src/routes/*`: auth, me, companies, rooms, vehicles, drivers, shifts, gps, requests, routeTemplates, driver, personels, notifications, eta  
- `backend/src/jobs/*`: stale/offline monitor + dedupe  
- `backend/scripts/*`: smoke/fullcheck (+ varsa m-check’ler)
- `infra/`: docker-compose (postgres + redis)
- `docs/`: PROJECT/API/DB/UI + bu dosya
- `tools/pack.ps1`: GreenPack / kontrol paketleri (varsa)

---

## 2) Hızlı Doğrulama (Gate)

> Not (Windows): `tools\pack.ps1` / `tools\gate.ps1` ExecutionPolicy (imza) engeline takılırsa **`tools\pack.cmd`** ve **`tools\gate.cmd`** wrapper’larını kullan.

### Minimum doğrulama
- `/health` çağrısı `dbOk:true` dönmeli
- `npm run smoke` PASS
- `npm run fullcheck` PASS
  - WS connect + `ws:ready`
  - `gps:update` + `vehicle:status`
  - LIVE→STALE→OFFLINE→LIVE transition + **dedupe** (aynı state’te spam yok)

> Dedupe standardı: bildirim/WS yayınları **yalnızca state transition** olduğunda üretilir (LIVE→STALE gibi).
> State değişmediyse aynı tip notification tekrar üretilmez.

---

## 3) Standartlar (Kısa)

### 3.1 WS Scope / Rooms
- Socket auth: token → user → role/scope
- `ws:ready`: join olunan odalar döner
- Event’ler:
  - `gps:update` (konum güncellemesi)
  - `vehicle:status` (LIVE/STALE/OFFLINE state)
  - `eta:update`
  - `notify:new`

### 3.2 DB / Model kritik kuralları
- Stop state: `PENDING / REACHED / SKIPPED`
  - `reachedAt`, `skippedAt`, `updatedAt`
- Request validation:
  - `lat/lng` zorunlu
  - aynı scope’da duplicate **OPEN** request → **409**
- Template stop sırası:
  - `order` alanı (veya reorder mekanizması)

### 3.3 Güvenlik & RBAC
- RBAC + scope zorunlu
- Rate limit / abuse guard açık
- **/admin ekranı sadece SUPER_ADMIN** (UI link + backend guard)

### 3.4 Observability (M10)
- `ApiRequest` middleware insert ✅
- `/health` db ping + latency ✅
- (Varsa) `AuditLog` ✅
- ✅ Log retention/cleanup job: `backend/src/jobs/retentionCleanup.js`
  - Varsayılan: **ApiRequest + AuditLog = 730 gün (2 yıl)**
  - Batch delete (lock riskini azaltır), periyodik (varsayılan 24 saatte 1)

**ENV ayarları (opsiyonel):**
- `LOG_RETENTION_ENABLED=1|0` (default 1)
- `LOG_RETENTION_INTERVAL_HOURS=24` (default 24)
- `LOG_RETENTION_INTERVAL_HOURS` küsuratlı verilebilir (test için); minimum 1 dakika
- `LOG_RETENTION_BATCH_SIZE=5000` (default 5000)
- `API_REQUEST_RETENTION_DAYS=730` (default 730)
- `AUDIT_LOG_RETENTION_DAYS=730` (default 730)
- `NOTIFICATION_RETENTION_DAYS=0` (default 0=kapalı)

---

## 4) Mini Runbook (En Sık Hatalar)

### 4.1 `EADDRINUSE: address already in use :::3000`
- 3000 portunda başka process vardır → PID bulunup kapatılır.

### 4.2 Prisma: `Can't reach database server at localhost:5433`
- DB container çalışmıyor/healthy değil veya port yanlış.
- Önce `infra` docker db/redis ayağa kalkmalı, sonra migrate/seed.

### 4.3 Docker: `open //./pipe/dockerDesktopLinuxEngine`
- Docker Desktop/Engine çalışmıyor ya da context sorunlu.
- Docker’ı başlat, doğru context’i seç, tekrar dene.

### 4.4 Backend log: `gpsStaleMonitor: DB not ready`
- DB bağlanmadan monitor tick atlamıştır.
- DB’yi ayağa kaldır → backend restart.

### 4.5 Web çalışıyor ama API çağrıları düşmüyor
- `VITE_API_URL` / proxy / baseURL yanlış olabilir.
- `http://127.0.0.1:3000` hedeflenmeli; CORS ve header uyumu kontrol.

### 4.6 Windows TIME_WAIT çok
- Normal. Kritik olan 3000 LISTENING’in tek PID’de olması.

---
### 4.7 Retention job çalışıyor mu?
- Backend açılışında `retentionCleanup:` log satırı görülebilir (silme varsa yazar).
- Ayarlar ENV ile kontrol edilir: `LOG_RETENTION_ENABLED`, `*_RETENTION_DAYS`, `LOG_RETENTION_INTERVAL_HOURS`.

## 5) Değişiklik Politikası (Basit)
- Bu dosya değiştiyse: PRIMER da değişmiş sayılır.
- Yeni bir doğrulama script’i eklendiyse (smoke/fullcheck/m-check): Gate bölümüne eklenir.
- Yeni bir “sık hata” görüldüyse: Runbook’a 1 madde olarak eklenir.
V1 sonrası backlog SSOT: docs/NEXT_BACKLOG_V1.md