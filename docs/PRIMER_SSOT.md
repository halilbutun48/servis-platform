# SERVIS-PLATFORM — PERSONEL SERVİS V1 — PRIMER (SSOT)
Tarih: 2026-02-21  
Timezone: Europe/Istanbul

## 0) Bu dosya ne?
Bu dosya “yapıştır & devam et” değil; **tek kaynak (SSOT)** seviyesinde repo özeti ve çalışma standardıdır:
- Repo şu an **ne** durumda?
- Nasıl doğruluyoruz (**Gate/Pack**)?
- “GREEN milestone” ne demek?
- Sıradaki işlerin **öncelik sırası** ne?

> Hızlı sohbet başlangıcı için: `tools/PRIMER_SNAPSHOT.md`

---

## 1) Stabil referans ve doğrulama (milestone disiplini)

### Son GREEN referans (değişmez)
- Stable tag: **`v1-m18-green.2`**
- Green tanımı: ✅ `tools/pack.ps1 -To 18` → **PACK PASS** (Gate + tüm milestone check’leri)

### Nasıl doğrularız?
- M18 için: `tools/pack.ps1 -To 18`

**Kural:**
- GREEN olmadan sonraki milestone’a geçilmez.
- API/DB/UI/flow değişirse aynı PR içinde ilgili `docs/*` güncellenir.

---

## 2) Ürün amacı (Personel Servisi V1)
Öğrenci/parent yok. GPS tabanlı “personel servisi” platformu:
- Canlı araç takibi (map)
- Shift yönetimi + durak akışı (start/reached/skip/reopen/complete)
- Notifications: overspeed, GPS_STALE/OFFLINE, recovery + dedupe
- Personel request → stop-suggestions → shift’e stop ekleme
- Route templates (company) → shift’e REPLACE uygula
- Agreements (M17): periyodik rezervasyon + conflict
- Daily shift generator (M18): Agreement → “bugün” için otomatik shift üretimi
- UI polish (M17.2) + UI smoke runbook (M17.3)
- M18 UI: Shift listesinde **Agreement badge + filtre**

---

## 3) Roller (RBAC)

1) **SUPER_ADMIN**
- Kurulum/seed, company/room yönetimi

2) **ROOM (Operasyon/Servis odası)**
- Vehicle/Driver yönetimi
- Shift approve/assign/start
- Request close (ACCEPTED)
- Stop suggestions + from-suggestion ile stop üretme
- Agreement approve (vehicle+driver assign) + conflict yönetimi
- Availability endpoint ile driver/vehicle uygunluk kontrolü

3) **COMPANY**
- Shift oluşturur, template yönetir/uygular
- Agreement oluşturur, cancel/extend
- Request’leri görür (kapatamaz)
- M18 UI: shift listesinde agreement kaynaklı vardiyayı görür

4) **DRIVER**
- Assigned vehicle ile GPS gönderir
- Active route + stop progression + complete

5) **PERSONEL**
- Request açar (lat/lng zorunlu)
- Kendi live/my view

---

## 4) Mimari (kısa)
- Backend: Node.js (ESM) + Express + Prisma
- DB: Postgres (Docker)
- Jobs/Dedupe: Redis (monitor’lar)
- Realtime: Socket.IO (ws)
- Web: Vite + React (role-based routing)
- Monorepo: `backend/`, `web/`, `infra/`, `docs/`, `tools/`

---

## 5) Doğrulanan çekirdek akışlar (özet)

### 5.1 Shift lifecycle
- COMPANY shift create (REQUESTED/DRAFT)
- ROOM approve/assign(vehicleId+driverId)
- ROOM start → DRIVER reached/skip/reopen → complete (DONE)

### 5.2 GPS & Status + Notifications
- DRIVER GPS post
- Monitor: LIVE→STALE→OFFLINE→LIVE
- Dedupe: state transition bazlı (spam yok)

### 5.3 Requests → Suggestions → Stops (M16 / M7 dahil)
- PERSONEL request create (lat/lng required)
- ROOM stop-suggestions → POST stops/from-suggestion
- Stop plan + ETA + driver route preview

### 5.4 Shift People + Route Preview (M16.2)
- `/api/shifts/:id/people` set/list
- `stops/generate` ile assignment üretimi
- `/api/shifts/:id/route-preview` (COMPANY/ROOM) + `assignmentCount`

### 5.5 Geo Review (M16.3)
- NEEDS_REVIEW listesi → manual override ile OK

### 5.6 Agreements (M17)
- Company request (date range + weekMask + time window)
- Room approve(assign vehicle+driver)
- Conflict: overlap 409
- agreementMonitor: bitince DONE
- Availability: agreement conflict’i de dikkate alır (**agreement-first**)

### 5.7 M18 — Agreement → Daily Shift Generator ✅
- APPROVED/ACTIVE + assigned (vehicleId+driverId) agreement’lardan “bugün” shift üretimi
- Duplicate guard: `unique(agreementId, startAt)`
- Conflict varsa üretim o gün skip
- UI: Company/Room shift listelerinde **Agreement #id badge** + “Sadece Agreement shiftleri” filtresi

---

## 6) Milestone durumu (özet)

✅ M0–M15: temel CRUD + shift + gps + ws + notifications + overlap/bind rules  
✅ M16: requests→suggestions→stops + route/eta + template REPLACE  
✅ M16.2: shift people + route-preview + assignmentCount  
✅ M16.3: geo review + manual override  
✅ M17: agreements + conflict + monitor + availability integration  
✅ M17.2: agreements UI polish (room dropdown/fallback label, status pill, extend prompt)  
✅ M17.3: UI smoke runbook (manuel)  
✅ **M18: agreement→daily shift generator + UI badge/filter** (GREEN)

---

## 7) SSOT dosyaları
- `docs/PROJECT_SPEC_V1.md`
- `docs/API_SPEC_V1.md`
- `docs/DB_SCHEMA_V1.md`
- `docs/UI_SPEC_V1.md`
- `docs/STARTPACK_V1.md`
- (ops) `web/scripts/ui-smoke.md`

---

## 8) Devam
- İstersen sıradaki: “M19 — Agreement shift’leri için stop/template otomasyonu” veya “M18 UI iyileştirme (badge renk/pill, filtre presetleri)”.