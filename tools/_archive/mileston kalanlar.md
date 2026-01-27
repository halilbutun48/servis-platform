M8-Shift’e template uygulama

Bunu en temiz “shift context” içinde yaparsın:

Dosya: backend/src/routes/shifts.js
Stop delete endpoint’i satır 357–377 civarında bitiyor, reorder satır 379’da başlıyor.

✅ Tam araya yeni endpoint ekle (satır 378’e):

POST /api/shifts/:id/stops/from-template

body: { templateId, mode: "REPLACE"|"APPEND" }

REPLACE: shift’teki stopları sil → template stoplarını kopyala

APPEND: mevcut stopların sonuna ekle (order devam ettir)

Bu endpoint io var zaten shiftsRouter(io) içinde; başarılı olunca io.to(room/company/vehicle).emit("route:plan") yapmak M11 için iyi.

M8-Test (gate)

✅ Yeni script:

backend/scripts/m8check.js (yeni)

Gate otomatik buluyor (tools/gate.ps1 7..12 aralığında dosya varsa ekliyor). Sen sadece dosyayı koyacaksın.

M9 — Driver operasyon + Stop state + GPS hardening (M8’den sonra yapmak doğru)
M9-DB) Stop state ekle (skip/reopen için şart)

Dosya: backend/prisma/schema.prisma

1) Yeni enum: StopState

enum StopType bloğu satır 44–48 arası.
✅ enum PickupRequestStatus başlamadan önce (mevcut satır ~50) ekle:

enum StopState { PENDING REACHED SKIPPED }

2) Stop modeline state alanları

Stop modeli satır 201–213.

✅ satır 208 (type StopType) ile satır 210 (shift relation) arasına ekle:

state StopState @default(PENDING)

reachedAt DateTime?

skippedAt DateTime?

updatedAt DateTime @updatedAt

Böylece “next stop” = state=PENDING ilk sıradaki stop olur.

M9-API) “next stop / skip / reopen / end”
1) Driver “active route” nextStop hesabı değişmeli

Dosya: backend/src/routes/driver.js

Şu an:

satır 63: lastReachedOrder...

satır 64: find(order > lastReachedOrder)

✅ satır 63–64’ü değiştir:

nextStop artık shift.stops içinden state === "PENDING" ilk stop (order asc)

progress.lastReachedOrder yine UI için kalsın ama derive edebilirsin: max(REACHED order)

Böyle yapmazsan skip/reopen UI mantığı bozulur.

2) Driver reached endpoint stop.state set etmeli

Dosya: backend/src/routes/driver.js
Route: /driver/shifts/:shiftId/stops/:stopId/reached

✅ Bu endpoint içinde:

ilgili stop’u bul

state=REACHED, reachedAt=now

gerekiyorsa shift status ACTIVE

nextStop’ı yeniden hesapla (PENDING)

3) Yeni endpoint’ler (M9)

Dosya: backend/src/routes/driver.js
Reached endpoint’inin hemen altına ekle:

POST /api/driver/shifts/:shiftId/stops/:stopId/skip

state=SKIPPED, skippedAt=now

POST /api/driver/shifts/:shiftId/stops/:stopId/reopen

state=PENDING, skippedAt=null (veya reopenAt ayrı alan)

POST /api/driver/shifts/:shiftId/complete

shift.status = DONE, progress.completedAt = now

POST /api/driver/shifts/:shiftId/cancel (opsiyonel ama M9 listende var)

shift.status = CANCELLED (ShiftStatus enum/field genişletmen gerekir)

Bu 4’ü koyunca M11 Driver UI çok rahat tamamlanır.

M9-ETA hesapları stop.state’e göre güncellenmeli

Dosya: backend/src/routes/eta.js

Şu an remainingStops = order > lastReachedOrder mantığı var.
✅ Bunu state === PENDING olarak değiştir.

Bu değişiklik yapılmazsa:

reopen/skip sonrası ETA “kafayı yer”

driver panelde “kalan durak/eta” tutarsızlaşır

M9-GPS hardening (driver sadece kendi aracına gps basabilsin)

Dosya: backend/src/routes/gps.js

✅ POST /api/gps içinde, driver için:

driver.userId = req.user.id bulunur

DB’de APPROVED/ACTIVE shift var mı? (driverId + vehicleId) yoksa 403

Bu kontrol testlerini bozmaz çünkü seed’de driver+vehicle için approved shift var.

M10 — Observability (api_requests + audit_log + retention + health detay)

Bu repoda şu an observability yok; ekleyince M11’de “niye UI böyle” debug süper kolaylaşır.

M10-DB

Dosya: backend/prisma/schema.prisma
ShiftProgress modeli en sonda bitiyor (son satır 323).

✅ satır 323’ten sonra ekle:

model ApiRequest

model AuditLog

indeksler (createdAt, route, userId, companyId, roomId vs.)

M10-API middleware

Dosya: backend/src/server.js

app.use(morgan("dev")) (satır 34) → production’da kapat (ya da tamamen kaldır)

apiRequestsMiddleware ekle (request start/end ölç, statusCode, latencyMs, userId/role, path)

M10-retention job

Dosya: backend/src/jobs/index.js

yeni startRetentionJob() ekle (örn günlük)

ApiRequest ve AuditLog eski kayıtları sil (örn 90 gün/2 yıl gibi env’den)

M10-health detay

Dosya: backend/src/server.js
/health şu an sadece {ok, ts} dönüyor (satır 45–47).

✅ /health içine:

db SELECT 1 + redis ping + version + uptime + queue/monitor status

M11 — Web UI tamam (templates + driver ops + build kontrolleri)

Repoda map standardın zaten iyi (FitController vs).

M11-1) Nav + Route ekleme

Dosya: web/src/layout/NavDock.jsx

ROOM menüsüne: Templates (satır 23–24 civarına)

COMPANY menüsüne: Templates (satır 27–28 civarına)

Dosya: web/src/App.jsx

yeni panel importları

path mapping:

/room/templates

/company/templates

driver route paneline skip/reopen/complete butonları

M11-2) WS invalidation zaten S0’da düzelecek

Bu olmadan M11 “canlılık” hissi zayıf kalır.

M11-3) Web build kontrolleri

web/vite.config.js şu an http proxy. M12’ye giderken “env template + HTTPS opsiyon” koymak iyi olur.

M12 — Release/Runbook + tek-komut pack

Bu repoda tools/gate.ps1 var, ama “GreenPack tek komut” henüz yok.

M12’de:

docs/RUNBOOK.md (backup/restore, env örnekleri, release adımı)

tools/pack.ps1 (tek komut):

compose up

gate (To param ile)

web build

(ops) export logs / panel-proof screenshot adımları

imdi yol haritası (net sıra + her adımın çıktısı)
1) M8 — RouteTemplate (DB + API + gate)

Çıktı: gate.ps1 -To 8 PASS

DB (Prisma)

RouteTemplate, RouteTemplateStop

Room.routeTemplates relation

routeTemplateId + order unique

API

GET/POST/PUT/DELETE /api/route-templates (ROOM)

POST/PUT/DELETE /api/route-templates/:id/stops

PUT /api/route-templates/:id/stops/reorder (M6 reorder contract aynen)

POST /api/shifts/:id/stops/from-template (REPLACE/APPEND)

Test

backend/scripts/m8check.js

2) M9 — StopState + driver ops + GPS hardening

Çıktı: gate.ps1 -To 9 PASS

Stop’a state(PENDING/REACHED/SKIPPED) + timestamps

Driver: next stop, skip, reopen, complete/cancel

ETA hesapları state=PENDING üzerinden

GPS: driver sadece kendi shift’inde atanmış araca gps basabilsin

3) M10 — Observability

Çıktı: gate.ps1 -To 10 PASS

api_requests, audit_log, retention job, health detay

4) M11 — Web UI tamam + build gate

Çıktı: gate.ps1 -To 11 PASS (+ web build)

templates panel, driver ops UI, ws status update vs.

5) M12 — Release/Runbook

Çıktı: gate.ps1 -To 12 PASS

backup/restore runbook, env templates, tools/pack.ps1 tek komut