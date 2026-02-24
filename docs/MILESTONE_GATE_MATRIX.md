# Milestone Gate Matrix — PASS Kriterleri (LEGACY)

⚠️ Not: Bu dosya erken dönem (M1–M6) gate notlarını içeriyor ve **tam kapsamlı** değil.
Güncel kanıt standardı:
- `tools/gate.ps1` ve `tools/pack.ps1` (M0→M32)
- per-milestone açıklamalar: `docs/MILESTONE_M22.md` … `docs/MILESTONE_M32.md`
- check script’leri: `backend/scripts/m*check.js`

Aşağıdaki içerik “referans/legacy” olarak tutuluyor.

---

Amaç: Her milestone sonrası “çalışıyor mu?” tartışması olmasın.
Kural: Her milestone merge/commit sonrası aşağıdaki gate’ler PASS olacak.

> Genel: `npm run smoke` + `npm run fullcheck` her zaman PASS.

---

## Ortak Gate’ler (Her Milestone)
- ✅ API ayakta: `/health` → `dbOk:true`, `dbLatencyMs`, `version`
- ✅ `npm run smoke` PASS
- ✅ `npm run fullcheck` PASS
  - WS connect + `ws:ready`
  - `gps:update` + `vehicle:status`
  - LIVE→STALE→OFFLINE→LIVE + dedupe doğrulaması
- ✅ Log retention job (ENV açıkken) çalışır; silme varsa `retentionCleanup:` logu basar (silme yoksa sessiz olması normal)

---

## M1 — EPIC C (No-show / Ceza)
### Ek Gate’ler
- ✅ ROOM ceza verebilir: `POST /api/room/drivers/:id/penalties/no-show` → 200/201
- ✅ Enforcement: aktif ceza varken driver’a assignment/approve denemesi → 403/409
- ✅ Audit: “NO_SHOW_PENALTY_CREATED” (veya eşdeğer) audit log’a düşer
- ✅ Notify/WS: ceza oluşturulunca `notify:new` driver + room scope’a gider

### “Break glass” (opsiyon)
- ROOM override/iptal varsa: audit zorunlu + test senaryosu

---

## M2 — EPIC D (KVKK Onay, Soft Policy)
### Ek Gate’ler
- ✅ `GET /api/consent/current` → current document döner
- ✅ `POST /api/consent/accept` → accept kaydı oluşur
- ✅ `/api/me` → `consent.ok` doğru görünür
- ✅ Policy (soft): consent yokken kritik aksiyon/ekranlar “kısıt/uyarı” üretir (bloklamayı strict’e çekme sonradan)

---

## M3 — EPIC A / Sprint 1 (Excel Import + Geocode Cache)
### Ek Gate’ler
- ✅ `POST /api/company/shifts` → shift DRAFT/created
- ✅ `POST /api/company/shifts/:id/import-excel` → import summary (rowsTotal/ok/failed/review)
- ✅ Cache: aynı addressNorm tekrar import → geocode tekrar çağrılmaz (en az 1 senaryo)
- ✅ Manual override korunur: `geoManualOverride=true` iken import otomatik ezmez
- ✅ Rate limit riskine karşı throttle aktif (log/metric ile anlaşılabilir)

---

## M4 — EPIC A / Sprint 2 (Cluster + Draft → ROOM)
### Ek Gate’ler
- ✅ `clusterStops` çıktısı: her assignment için distance <= maxWalkM (unit/integration test)
- ✅ Draft üretimi: shift status DRAFT→REQUESTED
- ✅ ROOM draft listesinde görünür, approve sonrası driver tarafına düşer
- ✅ WS: `shift:requested` ve `shift:approved` doğru scope’a gider
- ✅ Replace policy net: aynı shift için yeniden üretme çakışma yaratmaz

---

## M5 — EPIC A / Sprint 3 (Review UI + Kalite + Check Pack)
### Ek Gate’ler
- ✅ `GET /api/company/personels?geoStatus=NEEDS_REVIEW`
- ✅ `PUT /api/company/personels/:id/location` → manual override set + geoStatus OK
- ✅ fullcheck/m-check: import→cache→cluster→draft→approve minimal senaryo PASS
- ✅ Rota sıralama MVP (nearest-neighbor) test: en az “çalışıyor” seviyesi

---

## M6 — EPIC B (Rapor/Export)
### B-MVP Gate’ler
- ✅ En az 2 rapor endpoint’i + CSV export çalışır
- ✅ RBAC/scope: başka company verisi görülemez (403)
- ✅ Pagination/limit (liste endpoint’leri)

### B-Advanced Gate’ler (sonraya)
- ✅ km hesap doğruluğu için referans senaryo
- ✅ Async export (queue) + timeout’suz büyük rapor

---