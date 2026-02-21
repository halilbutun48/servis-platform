# SERVIS-PLATFORM — PRIMER (Yapıştır & Devam Et) — 2026-02-02 (TR)

## 0) Güncel Durum
- Repo: `servis-platform` (monorepo)
- GREEN standardı: `tools/pack.ps1`
- En son durum: ✅ PACK PASS (M0 → M16)
- M16 çekirdeği çalışıyor: personel→request→stop-suggestions→from-suggestion→driver route preview + cleanup

## 1) Şu anki hedef (Sıradaki Milestonelar)
### M16.2 — UI’yi Backend’e Bağlama (Fallback’lı)
**Amaç:** Mevcut M16 UI bozulmadan backend’e “soft switch”.
**Kapsam:**
- `ShiftPeopleTab.jsx`
  - Önce backend’den oku/yaz
  - Endpoint yoksa **404’te localStorage fallback**
- `RoutePreviewModal.jsx`
  - Preview verisini `GET /api/shifts/:id/route-preview` ile doldur
- `RoomShiftsPanel.jsx`
  - “Haritada Önizle” butonu aynı modal ile `route-preview` gösterir
**DoD:**
- UI’da personel ekle/import → preview gerçek payload ile çalışır
- Endpoint yoksa (dev) localStorage ile yine çalışır (fallback)

### M16.3 — Geocode Review UI + Manual Override
**Amaç:** `NEEDS_REVIEW/FAILED` personeller operasyonel düzeltilebilsin.
**Backend:**
- `GET /api/company/personels?geoStatus=NEEDS_REVIEW`
- `PUT /api/company/personels/:id/location`
  - body: `{ lat, lng, geoManualOverride:true, geoStatus:"OK" }`
**UI:**
- Company’de “NEEDS_REVIEW listesi” + düzeltme ekranı
**DoD:**
- Manual fix sonrası preview/generate akışı OK

### M17.0 — Periyodik Anlaşma (Agreement) Backend
**Amaç:** Tarih aralığı + haftanın günleri + saat penceresi ile araç/driver rezervasyonu; bitince DONE; extend/cancel.
**DB Model (Agreement/Contract):**
- companyId, roomId, vehicleId?, driverId?
- startDate, endDate (DATE)
- weekMask (Pzt..Paz bitmask)
- startMin, endMin (dakika)
- midnight aşımı: `endMin < startMin`
- status: REQUESTED/APPROVED/ACTIVE/DONE/CANCELLED/REJECTED
- ops: offer alanları (company/room amount/note)
**API:**
- `POST /api/agreements` (COMPANY request)
- `GET /api/agreements?take=...`
- `PUT /api/agreements/:id/approve` (ROOM assign vehicle+driver)
- `PUT /api/agreements/:id/cancel` (COMPANY)
- `PUT /api/agreements/:id/extend`
**Conflict/Availability:**
- `/api/availability` içine agreement overlap kontrolü
- Onayda 409 conflict code (shiftConflict benzeri)
**Monitor:**
- `agreementMonitor`: endDate+endMin geçince DONE
**Test:**
- `backend/scripts/m17check.js` + `tools/pack.ps1 -To 17`
**DoD:**
- Aynı saat penceresinde aynı araç farklı company’ye verilemez
- Farklı saatlerde aynı araç kullanılabilir
- Süre bitince otomatik DONE
- Extend/cancel çalışır

### M17.1 — Agreement UI (Company + Room)
**Company UI:**
- Preset günler: 5/6/7 + custom checkbox
- Süre preset: 1 hafta / 1 ay / 3 ay / 6 ay / 1 sene
- Saat preset: Sabah/Akşam/Gece + custom (midnight aşımı badge)
- Aksiyon: “Süre uzat” + “İptal”
**Room UI:**
- Pending anlaşma listesi + approve(assign vehicle/driver)
- Opsiyonel “harita önizle” (M16 route-preview ile birleşebilir)
**DoD:** Agreement lifecycle UI’dan uçtan uca yönetilir

### M18 (Opsiyonel) — Agreement → Günlük Shift Otomatik Üretimi
- Cron: bugün schedule pencereleri → shift create (duplicate guard)
- Driver operasyonu Shift akışından yürür

## 2) M16 Referans Endpoint’ler (çalışan gerçekler)
- Suggestions: `GET /api/shifts/:id/stop-suggestions?onlyOpen=1&radiusM=120` (ROOM)
- Accept: `POST /api/shifts/:id/stops/from-suggestion` (ROOM) **lat/lng required**
- Route preview (şu an çalışan): `GET /api/driver/route/active` (DRIVER)

## 3) Çalışma Kuralları
- GREEN olmadan sonraki milestone’a geçme.
- Her milestone: check script + docs update + pack ile doğrula.
- UI’de fallback şartı: backend endpoint 404 → localStorage’dan devam.

## 4) “Şimdi ne yapıyoruz?”
- Önce M16.2: UI soft-switch + route-preview endpoint entegrasyonu + fallback
- Sonra M16.3: geocode review list + manual override
- Sonra M17.0: agreement backend + monitor + availability conflict + m17check + pack -To 17
- Sonra M17.1: agreement UI

## 5) Tek cümle devam
“M0→M16 GREEN. Şimdi M16.2 ile UI’yi backend’e fallback’lı bağlıyoruz; ardından M16.3 geocode review; sonra M17.0 agreement backend + m17check + pack -To 17.”
