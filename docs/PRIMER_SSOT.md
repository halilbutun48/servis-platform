# PERSONEL-SERVİS V1 — PRIMER (SSOT)

Son güncelleme: **30 Ocak 2026**  
Timezone: **Europe/Istanbul (TRT)**  
Repo tipi: **backend/** + **web/** + **infra/** + **docs/** + **tools/**  
Kural: Bu dosya SSOT. V1’e alınan her madde burada güncellenir.

## 1) Amaç ve Kapsam
GPS tabanlı personel servis platformu.

- Canlı araç takibi (harita)
- Vardiya (Shift) → rota/durak yönetimi
- COMPANY talepleri → ROOM onay + araç+sürücü atama
- DRIVER tarafında durak ilerleme (REACHED / SKIPPED / REOPEN)
- Bildirimler: OVERSPEED / GPS_STALE / GPS_OFFLINE / GPS_RECOVERY
- Socket.IO ile canlı güncellemeler (gps/status, ETA, notif, route progress)

> V1’de Excel/cluster/otomatik durak üretimi yok (Backlog’ta). (M7’de sadece “stop suggestions” API var.)

## 2) Son Değişiklikler (Repo’da)
✅ Drivers CRUD (ROOM): list/create/update/delete + opsiyonel DRIVER user oluşturma  
✅ Vehicle → Driver bind/unbind endpoint’i + panel desteği  
✅ Vehicle delete/archive policy (aktif shift varsa engelle; geçmiş shift varsa arşivle; hiç shift yoksa sil)  
✅ GPS hardening: DRIVER yalnızca kendi assigned shift’indeki araca GPS basabilir  
✅ STALE/OFFLINE monitor + dedupe + RECOVERY (job + gate)  
✅ Retention cleanup job (ApiRequest / Notification / AuditLog / GpsPoint vb.)  
✅ **Shift REJECTED** status + ROOM için **/api/shifts/:id/reject** endpoint’i (UI “Reddet”)  
🟡 shifts.js hâlâ büyük; helpers/schemas split var (daha da bölünebilir)

Not: “aktif shift” tanımı pratikte APPROVED/ACTIVE gibi “işleyen/çalışan bağ” anlamına gelir (UI metinleri buna göre hizalanmalı).

## 3) Roller (5)
- **SUPER_ADMIN**: Company/Room yönetimi
- **COMPANY**: Shift/Request oluşturur; kendi kapsamını izler
- **ROOM**: Araç/Sürücü yönetimi; talepleri onaylar, shift’i araç+sürücüye bağlar; tüm araçları izler
- **DRIVER**: Kendi shift rotasını/duraklarını görür; GPS gönderir; durak state günceller
- **PERSONEL**: V1’de minimal (temel kullanıcı)

## 4) Servisler ve Portlar
- Backend API: **http://localhost:3000**
- Socket.IO: **aynı sunucuda** (default path: **/socket.io**)  
- Health: **http://localhost:3000/health**
- Postgres (Docker): host **5433 → 5432**
- Redis (Docker): **6379**
- Web (Vite): genelde **http://localhost:5173**

## 5) Hızlı Çalıştırma (3 komut)
Windows/PowerShell için tek seferlik hızlı ayağa kaldırma. (Detaylar README.md + tools/pack.ps1.)

> Not (Windows): ExecutionPolicy / imza engeline takılırsan `tools\pack.cmd` ve `tools\gate.cmd` wrapper’larını kullan.

1) `cd infra; docker compose up -d`
2) `cd ..\backend; npm run dev`
3) `cd ..\web; npm run dev`

## 6) Seed / Demo Hesaplar
Hepsi: **demo123**

- superadmin@demo.com
- company@demo.com
- room@demo.com
- driver@demo.com
- personel@demo.com

Detay: docs/SEED_USERS.md

## 7) WS Scope / Rooms ve Event’ler
Socket auth: JWT → user → role/scope join.

Tipik room’lar:
- user:{userId}
- room:{roomId}
- company:{companyId}
- vehicle:{vehicleId}
- shift:{shiftId}

Önemli event örnekleri:
- ws:ready (join edilen room’lar)
- gps:update
- vehicle:status
- eta:update
- notify:new
- route:progress

## 8) V1 Durum Matrisi (Tamamlananlar)
### 8.1 Core / Auth / RBAC
- JWT login + authRequired()
- Role bazlı route guard (requireRole)
- /api/me
- Socket auth + scope join

### 8.2 ROOM Operasyon
- Vehicle CRUD (list/create/update)
- Vehicle delete/archive policy
- Driver CRUD (list/create/update/delete)
- Driver’a opsiyonel login user oluşturma (role=DRIVER)
- Vehicle ↔ Driver bind/unbind

### 8.3 GPS / Bildirimler
- DRIVER GPS ingest: POST /api/gps
- GPS Last + History (GpsLast / GpsPoint)
- gps:update + vehicle:status WS broadcast (company/room/vehicle)
- Overspeed notification
- STALE/OFFLINE monitor job + dedupe
- RECOVERY notification + gate

### 8.4 Shift / Rota / Durak
- Shift lifecycle (draft/request → approved → active → done)
- **REJECTED** (ROOM reddetti)
- Stop state: PENDING / REACHED / SKIPPED + timestamp
- Driver route endpoints: active route, next stop, reached/skip/reopen, complete
- Route progress WS (route:progress)
- ETA hesap + WS (eta:update)
- M7 stop-suggestions (cluster) + accept (COMMON stop oluştur)

### 8.5 Observability / Operasyon
- /health
- ApiRequest middleware log
- Audit log helper
- Retention cleanup job

### 8.6 Web UI (Vite)
- Auth/session + role based routes
- ROOM: VehiclesPanel (yönetim + bind)
- ROOM: DriversPanel
- ROOM: MapPanel + MapView
- ROOM: ShiftsPanel (bekleyen talepler: Approve + **Reddet**; liste: **filtre + ara + temizle**) 
- Notifications panel

## 9) Bilinen “Kopukluk / Çakışma / Temizlik”
### 9.1 UI ↔ Backend davranış uyumsuzlukları
- VehiclesPanel “Sil/Arşivle” metni: UI’da “shift bağlıysa otomatik arşivlenir” gibi görünebilir.
- Backend davranışı: aktif/işleyen shift varsa 400 (HAS_ACTIVE_SHIFTS).

Öneri: UI bu hata kodunu yakalayıp “Aktif vardiya var, işlem yapılamaz” toast göstermeli.

### 9.2 Doküman/Encoding tekrarı
docs/_quarantine içinde benzer içerik kopyaları olabilir. Canonical: **docs/** altındaki dosyalardır.

### 9.3 Repo temizlik notları
- `backend/src/routes/driver.js.bak` gibi artefact dosyaları repo’da kalmamalı.
- shifts.js satır sayısı yüksek; modül bazlı split yapılabilir.

### 9.4 API Spec güncelleme ihtiyacı
- Socket.IO path/port bilgileri repo gerçekleriyle hizalı olmalı (3000 + /socket.io).

## 10) Test / Gate (Repo’da)
- backend/scripts/smoke.js
- backend/scripts/fullcheck.js
- backend/scripts/m10check.js … m12check.js
- tools/gate.ps1 / tools/pack.ps1 (Windows wrapper: tools\\gate.cmd / tools\\pack.cmd)

## 11) NEXT / UPDATE BACKLOG
A) Company Excel → Personel/Adres → Otomatik Durak & Rota
- Excel upload (vardiya seç + saat şablonu)
- Geocode + cache
- Clustering → stop önerisi + seatDemand
- Otomatik rota sıralama (NN + opsiyonel 2-opt)

B) Log/Rapor/Export (Excel/CSV)
- Araç günlük km / hız ihlali / durak geçiş zamanları
- Tarih aralığı filtreleri

C) No-show / görev reddi cezası

D) KVKK Onay + 2 yıl saklama politikası

## 12) SSOT (Tek Kaynak) Düzeni
- **docs/**: PROJECT_SPEC_V1.md, API_SPEC_V1.md, DB_SCHEMA_V1.md, UI_SPEC_V1.md, PRIMER_SSOT.md (bu dosya)
- **tools/**: sadece script’ler (pack.ps1, gate.ps1, pack.cmd, gate.cmd, dev.ps1 vb.)

Ek: “Haritada yok” hızlı teşhis
- Araç listede “LIVE” görünse bile gpsLast yoksa MapView marker çizmez.
- Çözüm: DRIVER’dan en az 1 adet POST /api/gps gelmeli (ya da seed demo GPS).
