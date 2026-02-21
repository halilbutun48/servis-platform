# STARTPACK_V1 — SERVIS-PLATFORM (PERSONEL SERVİS V1)
Tarih: 2026-02-02  
Timezone: Europe/Istanbul

Bu dosya repo için “tek bakışta çalışma runbook’u”dur:
- Standartlar (SSOT)
- Gate/Pack doğrulama
- Kritik akışlar
- RBAC / endpoint notları
- Debug / sık hata rehberi

> SSOT özet: `docs/PRIMER_SSOT.md`  
> Yeni sohbet yapıştırmalık: `tools/PRIMER_SNAPSHOT.md`

---

## 1) GOLDEN RULES
1) GREEN olmadan ilerleme yok.  
2) API/DB/UI/flow değişirse aynı PR içinde docs güncellenir.  
3) Gate/Pack dışı “çalışıyor” kabul edilmez.

---

## 2) Repo Yapısı
- `backend/` Node(ESM)+Express+Prisma + jobs + ws
- `web/` Vite+React
- `infra/` docker-compose
- `docs/` SSOT dokümanlar
- `tools/` pack/gate ve snapshotlar

---

## 3) Doğrulama Standardı (Gate/Pack)
### Komutlar (referans)
- Tam doğrulama (M16): `tools/pack.ps1 -To 16`
- Sadece M16CHECK:
  - `docker compose -f infra/docker-compose.yml exec -T api sh -lc "cd /app/backend && node scripts/m16check.js"`

**Green tanımı:**
- Milestone check PASS
- FULLCHECK PASS
- SMOKE PASS

---

## 4) Roller (RBAC) Özet
- SUPER_ADMIN: company/room yönetimi
- ROOM: vehicle/driver CRUD, shift approve/assign/start; request close; stop-suggestions + from-suggestion
- COMPANY: shift create; template create/apply; request view
- DRIVER: GPS post; route/active; stop progression; complete
- PERSONEL: request create (lat/lng required)

Detay: `docs/API_SPEC_V1.md`

---

## 5) Kritik Akışlar (Runbook)

### 5.1 Shift Lifecycle
1) COMPANY shift create
2) ROOM approve/assign (vehicleId + driverId)
3) ROOM start (shift ACTIVE)
4) DRIVER reached/skip/reopen → complete
5) ETA: hesap + WS update

### 5.2 GPS Status + Notifications
- DRIVER GPS post eder
- LIVE→STALE→OFFLINE transition monitor
- Dedupe: state değişmeden tekrar notif üretme
- Overspeed notif

### 5.3 Requests → Suggestions → Stops (M16 GREEN)
Bu akış M16 ile doğrulandı.

#### 5.3.1 PERSONEL request create
- Endpoint: `POST /api/requests`
- RBAC: PERSONEL
- Body: lat/lng zorunlu  
  - backend validation “lat/lng required” dönebilir.

#### 5.3.2 ROOM stop suggestions (cluster)
- Endpoint: `GET /api/shifts/:id/stop-suggestions?onlyOpen=1&radiusM=120`
- RBAC: ROOM (bazı kurulumlarda COMPANY de görebilir; SSOT karar: ROOM kesin)
- Çıktı: cluster listesi (suggestions)

#### 5.3.3 ROOM accept suggestion → stop ekleme
- Endpoint: `POST /api/shifts/:id/stops/from-suggestion`
- RBAC: ROOM
- Not: Bazı validasyonlarda body’de `lat/lng` istenebiliyor.  
  Bu yüzden UI/harness tarafında “suggestion payload”tan center lat/lng taşımak gerekir.

**Önerilen body standardı (uyumluluk için):**
- `{ suggestionId, lat, lng, name }` veya backend’in beklediği shape.
- Eğer backend `lat/lng required` diyorsa: suggestion’ın merkez koordinatlarını gönder.

### 5.4 Route Preview (M16 GREEN)
M16CHECK doğrulaması driver endpoint’i üzerinden yapıldı.
- Endpoint: `GET /api/driver/route/active`
- RBAC: DRIVER
- Amaç: driver’ın aktif vardiya rotası + nextStop

> Backlog önerisi: ROOM/COMPANY için ayrı “route preview” endpoint standardize edilebilir (M17/M16.1).

### 5.5 Route Templates
- COMPANY template create + stops add/reorder
- Shift’e apply: REPLACE

---

## 6) M16CHECK Notları (Sık Takılanlar)
1) `companyId required`:
   - shift create body’da companyId/roomId eksik veya token scope yanlış.
2) `DRIVER_CONFLICT / VEHICLE_CONFLICT`:
   - Seed driver/vehicle başka ACTIVE/APPROVED shift’te.  
   - Çözüm: harness isolated driver+vehicle üretmeli veya pre-clean yapmalı.
3) `Cannot POST ...` / 404:
   - Route adı yanlış. Doğru endpoint’i `docs/API_SPEC_V1.md` veya route dosyalarından doğrula.
4) `lat/lng required` (from-suggestion 400):
   - Suggestion accept body’ye merkez koordinatlarını ekle.

---

## 7) Sık Debug Rehberi
- Pack içinde FAIL olursa:
  1) ilgili `backend/scripts/*check.js` çıktısını oku
  2) ilgili endpoint’i manuel doğrula (token + RBAC)
  3) DB’de “ACTIVE/APPROVED shift çakışması” var mı bak

- Garip karakter (Ô£à vb.) konusu:
  - Terminal encoding / font / codepage kaynaklıdır.
  - Standardize: UTF-8 output + PowerShell’de UTF-8 ayarı + scriptlerde emoji direkt basma (istersen ayrıca “encoding standardı” ekleyebiliriz).

---

## 8) Required Docs (M12 Gate)
- `docs/PROJECT_SPEC_V1.md`
- `docs/API_SPEC_V1.md`
- `docs/DB_SCHEMA_V1.md`
- `docs/UI_SPEC_V1.md`
- `docs/STARTPACK_V1.md` (bu dosya)
- `tools/pack.ps1`

---
