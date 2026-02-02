
---

## 2) `docs/PRIMER_SSOT.md` (FULL REPLACE)

> Bu versiyon mevcut içeriğini **temizleyip tek SSOT** haline getiriyor; M15 GREEN’i koruyor, M16 UI’yi “mevcut ama henüz GREEN tag’e sabit değil” diye notluyor, M16.1’i de “backend milestone” olarak ekliyor ve doğrulama satırlarını koyuyor.

```md
# SERVIS-PLATFORM — PERSONEL SERVİS V1 — PRIMER (SSOT)
Tarih: 2026-02-01  
Timezone: Europe/Istanbul

## 0) Bu dosya ne?
Bu dosya “yapıştır & devam et” değil; **tek kaynak (SSOT) seviyesinde** repo özeti ve çalışma standardıdır:
- Repo şu an **ne**?
- Nasıl doğruluyoruz (**Gate/Pack**)?
- “Green milestone” ne demek?
- Bir sonraki işlerin **öncelik sırası** ne?

> Hızlı sohbet başlangıcı için ayrıca: `tools/PRIMER_SNAPSHOT.md`

---

## 1) Stabil referans ve doğrulama (milestone disiplin)
### Son GREEN referans (değişmez)
- Stable tag: `v1-m15-green.5`
- Green tanımı: ✅ PACK PASS (M0..M15 + FULLCHECK + SMOKE)

### Nasıl doğrularız?
- M15 için: `tools/pack.ps1 -To 15`

> Not: M16/M16.1 tamamlandığında doğrulama: `tools/pack.ps1 -To 16`

**Kural:**
- GREEN olmadan sonraki işe geçilmez.
- Her milestone değişikliği aynı PR/commit serisinde docs güncellenir.

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
- `tools/pack.(ps1|cmd)` → milestone check + fullcheck + smoke
- `backend/scripts/*check.js` → her milestone için senaryo doğrulaması
- Hedef: her milestone sonunda **PACK PASS** almadan ilerleme yok

### “Green” tanımı
Bir milestone “GREEN” sayılması için:
- İlgili milestone check PASS
- FULLCHECK PASS
- SMOKE PASS

---

## 6) Çekirdek iş akışları (konsept)
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

---

## 9) Windows satır sonu (LF/CRLF) — repo stabilitesi notu
Amaç: platformlar arası tutarlılık ve “LF will be replaced by CRLF” uyarılarını azaltmak.

Öneri:
- Repo root’ta `.gitattributes` ile `text=auto` + eol politikası belirlenebilir.
- Bu değişiklik yapılırsa yeni bir GREEN tag ile sabitlemek önerilir (mevcut GREEN referansı kirletmemek için).

---

## 10) M15 GREEN kapsamında doğrulananlar (özet)
✅ CRUD (company/room/vehicle/driver)  
✅ Shift approve/assign/start/reached/complete  
✅ GPS + ETA + WS updates  
✅ Notifications + dedupe + stale/offline monitors  
✅ Requests + RBAC close + suggestions  
✅ Route templates + apply (REPLACE)  
✅ Driver route endpoints (skip/reopen/next-stop)  
✅ Observability (M10) + required docs (M12)  

Referans: `v1-m15-green.5`

---

## 11) M16 UI (mevcut durum notu)
UI tarafında Company/Room shift ekranlarına şu yetenekler eklendi:
- Company ShiftsPanel: Yeni Talep / Vardiya Şablonları / Personel & Rota tab yapısı
- Ortak modal: RoutePreviewModal (ROOM “Haritada Önizle” hedefi)
- Personel tablo bileşeni (opsiyonel) ve tab component’e bölme

> Bu UI, M16.1 backend endpoint’lerine bağlanmak üzere hazırlandı.

---

## 12) NEXT — M16.1 (Backend) kısa kayıt (SSOT)
**M16.1 hedefi:** Company shift için personel ekleme + import izi + geocode cache + durak üret + map önizleme; ROOM tarafında aynı preview modal.

**Detay doküman:** `docs/MILESTONE_M16_1.md`

**Doğrulama (tamamlandığında):**
- `tools/pack.ps1 -To 16`

---

## 13) Yeni sohbet başlangıç cümlesi
“`servis-platform` repo `v1-m15-green.5` referansından devam ediyoruz. Sıradaki hedef: **M16.1 backend** (people/import + stop generate + route preview) ve `tools/pack.ps1 -To 16` ile GREEN almak.”
