# PERSONEL-SERVIS V1 — PRIMER (Yapıştır & Devam Et) — 2026-01-27

## Amaç
Öğrenci/parent yok. GPS tabanlı personel servisi:
- Canlı araç takibi (map)
- Rota/durak planı + vardiya (shift) yönetimi
- Hız / bakım / stale-offline uyarıları (notifications)
- Personel taleplerinden ortak durak önerisi + manuel durak yönetimi
- Driver durakları “yakın duraktan başlayarak” yürütür

## Roller (5)
1) SUPER_ADMIN
- Company ekler, Company/Room yetkilerini yönetir

2) ROOM (Operasyon/Servis odası)
- Araç/driver yönetir
- Shift’leri onaylar ve araç+driver atar
- Map: tüm araçlar + LIVE/STALE/OFFLINE durumları
- Bildirimleri takip eder (hız/bakım/gps)

3) COMPANY
- Vardiya talebi açar
- Durak/plan üretimi ve atanan planı görür
- Room’a araç talebi/plan iletir

4) DRIVER
- Kendi shift’i + durak operasyonu (M9 ile tam olacak)

5) PERSONEL
- Pickup request açar, öneri akışını tetikler

## Repo kuralları (sabit)
- Monorepo: backend/ web/ infra/ docs/ scripts/
- Backend modüler, stateless; REST=CRUD/rapor, WS=canlı/bildirim
- DB live/history ayrımı (gps_last vs gps_points partition yaklaşımı)
- Map standardı: 1x fitBounds sonra sadece “Tümünü Göster”; manuel drag/zoom auto-fit’i kapatır
- KVKK/Güvenlik: RBAC+scope, rate limit/abuse, audit log, backup/restore
- “Single source of truth” docs: PROJECT_SPEC_V1, API_SPEC_V1, DB_SCHEMA_V1, UI_SPEC_V1, STARTPACK_V1.md
- Yanıtlarda max 3 PowerShell komutu

## Şu an doğrulanan durum (GATE)
- M0..M8 PASS
- FULLCHECK PASS
- SMOKE PASS
- Son doğrulama: 2026-01-27 (çıktı log’u kullanıcıda)

## M8 (RouteTemplate) DURUMU: ✅ TAMAM
- Template CRUD + stops add/update/delete + reorder ✅
- Shift’e template apply (REPLACE) ✅
- Gate script’leri: M8CHECK PASS ✅

## Web (son UI işleri) ✅
- MapView: Leaflet compat + marker C + FitController + “Tümünü Göster” event ✅
- VehiclesPanel: status pill mapping (LIVE/STALE/OFFLINE) ✅
- NotificationsPanel:
  - Filtreler: search + scope/type/status dropdown ✅
  - Pill renkleri: pillKeyFromAny() ile LIVE/STALE/OFFLINE/GPS_* normalize ✅
  - Detay modal ✅

---

## Şimdi sıradaki roadmap (NET sıra)

### M9 — Driver operasyon + Stop state + GPS hardening ✅ (SIRADAKİ)
**DB**
- StopState enum: PENDING | REACHED | SKIPPED
- Stop modeline:
  - state StopState @default(PENDING)
  - reachedAt DateTime?
  - skippedAt DateTime?
  - updatedAt DateTime @updatedAt

**Driver API**
- nextStop: state=PENDING ilk stop (order asc)
- reached endpoint: state=REACHED + reachedAt=now
- yeni endpointler:
  - POST /api/driver/shifts/:shiftId/stops/:stopId/skip
  - POST /api/driver/shifts/:shiftId/stops/:stopId/reopen
  - POST /api/driver/shifts/:shiftId/complete
  - (opsiyon) cancel

**ETA**
- remainingStops: state === PENDING

**GPS hardening**
- Driver yalnız kendi APPROVED/ACTIVE shift’inde atanmış vehicle için /api/gps basabilsin; yoksa 403

### M10 — Observability
- DB: ApiRequest, AuditLog + index’ler
- Middleware: request latency, status, userId/role, path logla
- Retention job: env ile (örn 90 gün / 2 yıl)
- /health: db ping + version + uptime + (ops) redis/queue status

### M11 — Web UI tamam + build gate
- Nav: ROOM/COMPANY Templates route’ları
- Driver panel: skip/reopen/complete butonları
- WS invalidation (route:plan vs) + canlılık iyileştirme
- Web build kontrolleri (Vite env/HTTPS opsiyonuna hazırlık)

### M12 — Release/Runbook + tek-komut pack
- docs/RUNBOOK.md: backup/restore, env örnekleri, release adımı
- tools/pack.ps1: compose up + gate + web build + (ops) logs/panel-proof

## Notlar
- Shift template apply endpoint’i M8’de zaten geçti (REPLACE).
- M9 ile “durak operasyonu” gerçek anlamda tamamlanacak (skip/reopen/complete).

---

# Repo Tarama (Servis/Backend Checklist) — 2026-01-27

Bu repo snapshot'ı checklist'e göre **dosya bazlı** işaretlendi.

## 1) Backend temel yapı

✅ Var
- backend/src/server.js (REST+WS mount)
- backend/src/env.js
- backend/src/prisma.js + backend/prisma/schema.prisma + migrations/
- backend/src/auth/
- backend/src/routes/: auth, me, companies, rooms, vehicles, drivers, shifts, gps, requests, routeTemplates, driver, personels, notifications, eta
- backend/src/ws/
- backend/src/middleware/apiRequestLog.js
- backend/src/jobs/

✅ Var
- /health endpoint'i db ping + uptime + version içerir (M10/M11 kriteri)
- apiRequestLog middleware server.js'de early mount edilir (M10 kriteri)
- Public router factory'leri `companiesRouter()` gibi **çağrılarak** mount edilir

## 2) Script/Gate paketi

✅ Var
- backend/scripts/smoke.js
- backend/scripts/fullcheck.js
- backend/scripts/m0check.js ... m10check.js

✅ Var
- backend/package.json scripts alias: smoke/fullcheck + m0..m12check

## 3) DB/Model kritik alanlar

✅ Var
- Stop state: PENDING/REACHED/SKIPPED + reachedAt/skippedAt/updatedAt
- Request validation: lat/lng zorunlu + DUPLICATE OPEN 409
- Template stops ordering: order + idsInOrder + reorder endpoint

## 4) Observability (M10)

✅ Var
- Prisma model: ApiRequest
- Middleware: apiRequestLog.js
- Prisma model: AuditLog + helper: src/audit.js

🟡 İyileştirme
- Retention/job (örn 90 gün / 2 yıl) otomasyonu (planlandı)

## 5) Servis klasörü sık kaçanlar

✅ Var
- .env.example
- infra/docker-compose.yml
- docs: PROJECT_SPEC_V1.md, API_SPEC_V1.md, DB_SCHEMA_V1.md
- tools: gate.ps1

✅ Var
- docs/UI_SPEC_V1.md
- docs/STARTPACK_V1.md
- tools/pack.ps1