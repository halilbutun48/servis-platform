# PERSONEL-SERVIS V1 — PROJECT SPEC (SSOT)

## Amaç
Öğrenci/parent yok. GPS tabanlı **personel servisi** platformu:
- Canlı araç takibi (map), rota/durak planı, vardiya (shift) yönetimi
- Uyarılar (notifications): overspeed, stale/offline, recovery, bakım yaklaşıyor
- Personel talepleri (request) → stop suggestions → shift’e stop ekleme
- Route templates (company) → shift’e REPLACE uygula
- Periyodik rezervasyon (Agreement) + çakışma yönetimi
- Agreement’tan **günlük shift otomatik üretimi** (M18)

---

## Roller (5)

1) **SUPER_ADMIN**
- Company/Room kurulum & seed

2) **ROOM (Operasyon/Servis odası)**
- Vehicle/Driver CRUD
- Shift approve/assign/start
- Request close (ACCEPTED)
- Stop suggestions + from-suggestion
- Agreement approve (vehicle+driver assign) + conflict yönetimi
- Availability kontrolü (shift + agreement)

3) **COMPANY**
- Shift create, template yönetimi
- Agreements create/list/cancel/extend
- Request’leri görür (kapatamaz)

4) **DRIVER**
- Assigned vehicle ile GPS post
- Active route + stop progression + complete

5) **PERSONEL**
- Request create (lat/lng zorunlu)
- Kendi live/my view

---

## Mimari
- Backend: Node.js (ESM) + Express + Prisma
- DB: Postgres (Docker)
- Redis: job/monitor + dedupe
- Realtime: Socket.IO
- Web: Vite + React
- Monorepo: `backend/`, `web/`, `infra/`, `docs/`, `tools/`

---

## GREEN disiplini
- “Çalışıyor” demek: `tools/pack.ps1 -To <hedef>` **PACK PASS**
- Her milestone:
  - check script (backend/scripts/*check.js)
  - docs update (SSOT)
  - pack doğrulama

---

## Kurallar (SSOT)

### 1) Scope/RBAC
- Company sadece kendi company scope’unu görür.
- Room sadece kendi room scope’unu yönetir.
- Driver sadece assigned shift/vehicle ile GPS/route işlemi yapar.
- Personel request açar, kendi view’ını görür.

### 2) Overlap kuralları (Shift)
- Aynı driver aynı zaman aralığında 2 shift’e atanamaz → 409
- Aynı vehicle aynı zaman aralığında 2 shift’e atanamaz → 409

### 3) Agreement rezervasyon kuralları (M17)
- Aynı time window’da aynı vehicle/driver başka agreement’a verilemez → 409
- Availability endpoint hem shift hem agreement rezervasyonunu dikkate alır.
- Determinism: Availability’de **agreement conflict önce** raporlanır (m17check stabil).

### 4) Monitoring & Dedupe
- GPS state transition: LIVE→STALE→OFFLINE→LIVE
- Notif dedupe: aynı transition tekrar tekrar üretmez.
- agreementMonitor: endDate+endMin geçince DONE.

---

## M18 — Agreement → Günlük Shift Otomatik Üretimi ✅

### Amaç
Onaylı anlaşmalardan (Agreement) **günlük vardiya (Shift)** üretmek:
- Agreement tarih aralığı + weekMask + saat penceresine göre “bugün” shift create.
- Üretilen shift normal shift lifecycle’a girer.

### Kurallar
- Sadece `APPROVED/ACTIVE` ve `vehicleId+driverId` atanmış agreements.
- Gün filtresi: `weekMask` bugünün bit’ini içeriyorsa üret.
- Midnight aşımı: `endMin < startMin` → `endAt` ertesi güne taşar.
- Duplicate guard: aynı agreement aynı gün için tek shift:
  - DB: `unique(agreementId, startAt)`

### Conflict/Çakışma
- Üretimden önce shiftConflict kontrol edilir.
- Conflict varsa o gün için üretim **skip** edilir.

### UI (M18)
- Company/Room shift listesinde satırda `Agreement #<id>` badge
- Filtre: “Sadece Agreement shiftleri”

---

## Milestone yol haritası (özet)
✅ M0–M15: CRUD + shift + gps + ws + notifications + overlap/bind  
✅ M16: requests→suggestions→stops + template REPLACE  
✅ M16.2: shift people + route-preview + assignmentCount  
✅ M16.3: geo review + manual override  
✅ M17: agreements + conflict + monitor + availability  
✅ M17.2: agreements UI polish  
✅ M17.3: UI smoke runbook  
✅ **M18: agreement→daily shift generator + UI badge/filter** (GREEN)

---

## DoD (Başarı)
- Pack PASS olmadan milestone tamam sayılmaz.
- Agreement “happy path”: Company create → Room approve → conflict → extend/cancel
- M18 “happy path”: agreement approve → bugün shift oluşur → listede badge görünür.