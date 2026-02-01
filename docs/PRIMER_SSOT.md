# SERVIS-PLATFORM — PERSONEL SERVİS V1 — PRIMER (SSOT)
Tarih: 2026-01-31  
Timezone: Europe/Istanbul  

## 0) Bu dosya ne?
Bu dosya “yapıştır & devam et” değil; **tek kaynak (SSOT) seviyesinde** repo özeti ve çalışma standardıdır:
- Repo şu an **ne**?
- Nasıl doğruluyoruz (**Gate/Pack**)?
- “Green milestone” ne demek?
- Bir sonraki işlerin **öncelik sırası** ne?

> Hızlı sohbet başlangıcı için ayrıca: `tools/PRIMER_SNAPSHOT.md`

---

## 1) Repo referansı ve milestone sabitleme
- Repo:
  - https://github.com/halilbutun48/servis-platform
- Branch: `main`
- Stabil referans tag: `v1-m15-green.2`
- Milestone durumu: ✅ PACK PASS (M0..M12) + ✅ FULLCHECK PASS + ✅ SMOKE PASS

**Kural (milestone disiplin):**
- `v1-m15-green.2` = “M15 GREEN referans noktasıdır”.
- Bundan sonraki her değişiklik **yeni milestone/tag mantığıyla** ilerler.
- “Green” olmadan sonraki işe geçilmez.

---

## 2) Ürün amacı (Personel Servisi V1)
Öğrenci/parent yok. GPS tabanlı “personel servisi” platformu:
- Canlı araç takibi (map)
- Vardiya/shift yönetimi
- Rota/durak yönetimi (stop progression + stop state)
- Uyarılar (notifications): overspeed, GPS_STALE, GPS_OFFLINE, recovery
- Personel talepleri (request) → yakın adreslerden stop önerisi (suggestions) → shifte durak ekleme
- Route Templates: Company hazır şablonlar → shift’e REPLACE uygula

---

## 3) Roller (RBAC) ve temel yetkiler
### Roller
1) SUPER_ADMIN
- Company/Room yönetimi, kurulum & seed

2) ROOM (Operasyon/Servis odası)
- Araç/sürücü yönetimi
- Company shift’ini APPROVE + ASSIGN (vehicle/driver)
- Haritada tüm araçlar + bildirimler
- Request kapatma yetkisi (ACCEPTED)

3) COMPANY
- Shift oluşturur
- Template yönetir/uygular
- Açık request’leri görür (kapatamaz)

4) DRIVER
- Kendi shift/rota akışı: active route, next stop, stop state update, complete
- GPS gönderir (yalnızca assigned vehicle ile)
- Bildirimleri görür

5) PERSONEL
- Request açar (lat/lng zorunlu)
- Kendi ride/shift görünümü + live panel

> RBAC ayrıntısı ve endpoint bazlı kurallar: `docs/API_SPEC_V1.md`

---

## 4) Mimari (kısa ama net)
- Backend: Node.js (ESM) + Express + Prisma
- DB: Postgres (Docker)
- Cache/Jobs: Redis (monitor/işler + dedupe)
- Realtime: WebSocket (gps/update, request/update, eta/update, status vb.)
- Web: Vite + React (role-based routing)

Monorepo dizilimi (özet):
- `backend/` API + jobs + ws
- `web/` UI
- `infra/` docker-compose
- `docs/` SSOT dokümanlar
- `tools/` Gate/Pack runner ve primer snapshot’lar

---

## 5) “GreenPack / Gate” standardı (tek doğru doğrulama)
Bu repo için “çalışıyor” demek, **Gate PASS** demektir.

### Gate/Pack mantığı
- `tools/pack.(ps1|cmd)` → M0..M12 check + fullcheck + smoke çalıştırır
- `backend/scripts/*check.js` → her milestone için senaryo doğrulaması
- Hedef: her milestone sonunda **PACK PASS** almadan ilerleme yok

### “Green” tanımı
Bir milestone “GREEN” sayılması için:
- M0..M12 ilgili check’ler PASS
- FULLCHECK PASS
- SMOKE PASS

> Detay check matrisi: `docs/MILESTONE_GATE_MATRIX.md` (varsa/ileride güncellenecek)

---

## 6) Çekirdek iş akışları (konsept seviyesinde)
### 6.1 Shift lifecycle
- COMPANY: shift create
- ROOM: approve/assign (shift → vehicleId + driverId)
- DRIVER: start → reached/skip/reopen (stop progression) → complete
- ETA: REST ile hesap + WS ile anlık güncelleme

### 6.2 GPS & Status
- DRIVER: GPS post eder
- DB mapping: LIVE → Vehicle.ACTIVE + GpsLast.OK
- Monitor: LIVE→STALE, STALE→OFFLINE, OFFLINE→LIVE recovery
- Dedupe: GPS_STALE / GPS_OFFLINE spam engeli (state transition bazlı)

### 6.3 Notifications
- Türler: overspeed, gps_stale, gps_offline, recovery vb.
- Kural: aynı state değişmediği sürece tekrar üretme (dedupeKey / transition gate)

Standart payload: `docs/NOTIFICATION_PAYLOAD_STANDARD.md`

### 6.4 Requests → Suggestions → Stops
- PERSONEL: request create (lat/lng required)
- WS: request:update (create/close) personel/company/room
- ROOM: request close (ACCEPTED)
- Shift suggestions: stop-suggestions → from-suggestion ile stop ekleme

### 6.5 Route templates
- COMPANY: template create + stops add/reorder
- Shift’e apply: from-template (REPLACE) ile stop set’i güncellenir

### 6.6 Driver stop state
- Driver: next-stop / stop skip / stop reopen / stop reached
- Pending stops bitince shift complete

---

## 7) Dokümantasyon (SSOT dosyalar)
M12 “required files” (Gate tarafından kontrol edilir):
- `docs/PROJECT_SPEC_V1.md`
- `docs/API_SPEC_V1.md`
- `docs/DB_SCHEMA_V1.md`
- `docs/UI_SPEC_V1.md`
- `docs/STARTPACK_V1.md`
- `tools/pack.ps1`

Ek standartlar:
- `docs/STATUS_STANDARD.md`
- `docs/NOTIFICATION_PAYLOAD_STANDARD.md`
- `docs/PRIMER_SSOT.md` (bu dosya)

**SSOT kuralı:**
Uygulama değişirse (API/DB/UI/flow) **aynı PR içinde** ilgili docs güncellenir.

---

## 8) Event/Scope isimlendirme kuralı (WS)
Genel kural:
- WS event isimleri “shift bağlamı” ile uyumlu olmalı (client invalidate/guessTopics mantığıyla).
- Event payload’larında mümkünse shiftId/vehicleId bağlamı taşınır.

> Detay event isimleri ve payload örnekleri: `docs/API_SPEC_V1.md` ve ilgili standard dokümanları.

---

## 9) Windows satır sonu (LF/CRLF) — repo stabilitesi notu
Amaç: platformlar arası tutarlılık ve “LF will be replaced by CRLF” uyarılarını azaltmak.

Öneri:
- Repo root’ta `.gitattributes` ile `text=auto` + eol politikası belirlenebilir.
- Bu değişiklik yapılırsa **yeni bir tag** ile sabitlenmesi önerilir (mevcut `v1-m15-green.2` referansını kirletmemek için).

---

## 10) Şu anki durum (M15 GREEN kapsamında doğrulananlar)
✅ CRUD (company/room/vehicle/driver)  
✅ Shift approve/assign/start/reached/complete  
✅ GPS + ETA + WS updates  
✅ Notifications + dedupe + stale/offline monitors  
✅ Requests + RBAC close + suggestions  
✅ Route templates + apply (REPLACE)  
✅ Driver route endpoints (skip/reopen/next-stop)  
✅ Observability (M10) + required docs (M12)  

Referans: tag `v1-m15-green.2`

---

## 11) NEXT backlog (öncelik sırası — kısa ama net)
1) Vehicle ↔ Driver “bind” kuralı (overlap rules)
- Aynı vardiya saatinde driver başka room/vehicle’a bağlanamasın (overlap check)
- Farklı saatlerde farklı room’da çalışabilsin (allowed)
- UI: ROOM panelinde bind/atama UX’i (hata mesajları + uygunluk göstergesi)

2) Company shift template preset’leri
- Sabah/Akşam/Gece gibi hazır preset + custom template builder

3) Availability endpoint (opsiyonel ama UX’i güçlendirir)
- Driver/vehicle uygunluk sorgusu (çatışma kontrolüyle)

4) KVKK/Güvenlik genişletme
- rate limit/abuse + audit + retention + backup/restore runbook

---

## 12) Yeni sohbet başlangıç cümlesi (SSOT referanslı)
“`servis-platform` repo, tag `v1-m15-green.2` referansından devam ediyoruz. Next hedef: Vehicle↔Driver bind (M15) + UI: Vehicles panel bind/unbind + tek source of truth + M15 check

---
# PERSONEL-SERVIS V1 — PRIMER_SSOT

## Stable Reference
- stable: v1-m15-green.5
- date: 2026-02-01
- commit: 1b3efc5
- gate: PACK PASS (M0..M15 + FULLCHECK + SMOKE)

## How to verify
- run: tools/pack.ps1 -To 15

## Notes
- GreenPack header (dev): x-greenpack: 1  (rate limit bypass only for gate scripts)
- Deterministic monitors: stale/offline tests use gpsLast.at back + poll


PERSONEL-SERVIS V1 — NEXT (M16) PRIMER

Hedef: Company shift için personel ekleme + import + geocode review + durak üret + map önizleme; ROOM tarafında rota/durak önizleme.

UI:

Company ShiftsPanel tabs: Yeni Talep / Vardiya Şablonları / Personel & Rota

Personel & Rota tab:

Shift seç → personel ekle/import → geocode status → maxWalkM ile durak üret (REPLACE) → map preview

Room pending list: “Haritada Önizle” modalı (aynı component)

Backend:

Personel cache: geoStatus (OK/NEEDS_REVIEW/FAILED), geoManualOverride

Import izleri: ShiftImport, ShiftImportRow

Durak üretimi: clusterStops(maxWalkM) + StopAssignment

Gate/Test:

M16CHECK: shift oluştur → import (deterministik sample) → draft üret → stop sayısı + maxWalkM garantisi → UI preview endpointleri 200.




