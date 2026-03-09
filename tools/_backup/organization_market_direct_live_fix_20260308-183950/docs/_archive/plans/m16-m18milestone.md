M16.0 — Repo Temizliği + Doküman Arşivi

Amaç: UI commit’lerin tamam; repoda kalan doküman/plan parçalarını “tek, temiz docs commit” ile kapatmak.

Kapsam

docs/PRIMER_SSOT.md güncellemesini commit’e almak

docs/_archive/plans.zip ve plan dosyalarını (istersen) arşiv olarak repoya almak

(Opsiyonel) ileride büyürse docs/_archive/ için gitignore/kurallar

DoD

git status temiz (docs tarafı da commitlenmiş)

tools/pack.ps1 -To 15 PASS (mevcut gate bozulmadı)

M16.1 — People & Route Backend MVP (Import + Cache + Durak Üret + Preview)

Amaç: Company’nin “Personel & Rota” tabını gerçek backend data ile beslemek; ROOM tarafı aynı preview payload’u görsün.

DB (Prisma)

Personel alanlarını genişlet:

homeAddress?, geoStatus (OK/NEEDS_REVIEW/FAILED), geoManualOverride (bool)

opsiyonel: geoUpdatedAt?, geoNote?

Yeni tablolar:

ShiftPersonel (shift ↔ personel join, unique (shiftId, personelId))

ShiftImport, ShiftImportRow (import izi + satır ham verisi)

StopAssignment (shiftStop ↔ personel eşlemesi + walkM)

API (minimum set)

GET /api/shifts/:id/people

PUT /api/shifts/:id/people (REPLACE)

POST /api/shifts/:id/people/import (ilk etap JSON rows)

POST /api/shifts/:id/stops/generate?maxWalkM=...&mode=REPLACE

GET /api/shifts/:id/route-preview (shift + stops + assignment + people özet)

Algoritma (maxWalkM garantili)

“seed + maxWalkM içinde cluster” + medoid merkez

Her personel için walkM <= maxWalkM garanti (DoD’de test)

Test/Gate

backend/scripts/m16check.js

tools/pack.ps1 / gate → -To 16 desteği

M16CHECK: import → generate → assignment doğrula → preview 200

DoD

M16CHECK PASS

M0..M15 + FULLCHECK + SMOKE PASS kalır 

# YAPILDI

M16.2 — UI’yi Backend’e Bağlama (Fallback’lı)

Amaç: Senin yaptığın M16 UI bozulmadan backend’e “soft switch”.

Kapsam

ShiftPeopleTab.jsx:

önce backend’den oku/yaz; endpoint yoksa 404’te localStorage fallback

RoutePreviewModal.jsx:

preview’yu /api/shifts/:id/route-preview ile doldur

RoomShiftsPanel.jsx:

“Haritada Önizle” butonu aynı modal ile /route-preview gösterir

DoD

UI’da personel ekle/import → preview gerçek payload ile çalışır

endpoint yoksa (dev ortam) localStorage ile yine çalışır

M16.3 — Geocode Review UI + Manual Override

Amaç: NEEDS_REVIEW/FAILED personeller operasyonel düzeltilebilsin.

Backend

GET /api/company/personels?geoStatus=NEEDS_REVIEW

PUT /api/company/personels/:id/location (lat/lng + geoManualOverride=true + geoStatus=OK)

UI

Company’de “NEEDS_REVIEW listesi” + düzeltme ekranı

DoD

Manual fix sonrası preview/generate akışı OK

M17.0 — Periyodik Anlaşma (Agreement) Backend

Amaç: “Tarih aralığı + haftanın günleri + saat penceresi” ile aracı sadece o zamanlarda company’ye rezerve etmek; bitince otomatik kapanmak; süre uzat/iptal.

DB

Agreement (veya Contract) modeli:

companyId, roomId, vehicleId?, driverId?

startDate, endDate (DATE)

weekMask (Pzt..Paz bitmask)

startMin, endMin (dakika)

midnight aşımı: endMin < startMin

status: REQUESTED/APPROVED/ACTIVE/DONE/CANCELLED/REJECTED

ops: offer alanları (company/room amount/note)

API

POST /api/agreements (COMPANY request)

GET /api/agreements?take=...

PUT /api/agreements/:id/approve (ROOM assign vehicle+driver)

PUT /api/agreements/:id/cancel (COMPANY)

PUT /api/agreements/:id/extend (policy’ye göre)

Conflict/Availability entegrasyonu

/api/availability içine agreement overlap kontrolü

Onay sırasında 409 conflict code ile dön (shiftConflict mantığına benzer)

Monitor

agreementMonitor: endDate + endMin geçince DONE

Test

m17check.js + pack -To 17

DoD

Aynı saat penceresinde farklı company’ye aynı araç verilemez

Farklı saatlerde aynı araç kullanılabilir

Süre bitince otomatik DONE

Extend/cancel çalışır

M17.1 — Agreement UI (Company + Room)

Company

Preset’ler:

Haftada 5/6/7 gün + custom checkbox

Süre preset: 1 hafta / 1 ay / 3 ay / 6 ay / 1 sene

Saat preset: Sabah/Akşam/Gece + custom (midnight aşımı badge)

“Süre uzat” ve “İptal” aksiyonları

Room

Pending anlaşma listesi + approve(assign vehicle/driver)

İstersek burada da “harita önizle” (M16 route-preview ile birleşir)

DoD

Agreement lifecycle UI’dan uçtan uca yönetilir

M18 — (Opsiyonel) Agreement → Günlük Shift Otomatik Üretimi

Amaç: “Anlaşma var, bugün için operasyonel shift otomatik oluşsun” (ileride istersen).

Cron: bugün için schedule pencereleri → shift create (duplicate guard)

Driver operasyonu aynen Shift akışından yürür

