# M22 — Room Directory + Agreement UX (Company)

Tarih: 2026-02-22  
Timezone: Europe/Istanbul

## M22 Hedef
Room artık Company’ye bağlı değil (Agreement üzerinden bağlanıyor). M22 ile Company tarafında “Room Directory” UX’i gelir:
- Company panellerinde **room seçimi + arama**
- Agreement create ekranında **Room dropdown** (GET `/api/rooms`) + “hub var mı?” görünürlüğü
- (Opsiyon) WS `agreement:update` ile auto refresh (zaten M17.1’de var)

## M22 DoD
1) Company → Agreement oluştururken room **dropdown** ile seçilir.
2) Room listesinde **search** vardır (`name contains`).
3) Room’da hub yoksa UI’da **Hub yok** görünür; agreement oluşturmak için:
   - ya room hub tanımlı olmalı,
   - ya da company formunda **manual hub lat/lng** girilmeli.
4) Backend: `GET /api/rooms?q=...&hasHub=1` çalışır.
5) Gate: `tools/pack.ps1 -To 22` **PACK PASS**.

---

## M22.0 — Backend
### /api/rooms (Directory + Search)
**Endpoint:** `GET /api/rooms`
- Roles:
  - `ROOM`: sadece kendi room’u (filters ignore)
  - `COMPANY`: directory (aktif room’lar)
  - `SUPER_ADMIN`: tüm aktif room’lar
- Query:
  - `q` (opsiyonel): name contains (case-insensitive)
  - `hasHub=1` (opsiyonel): `hubLat/hubLng != null`
  - `take` (opsiyonel): max 500

### M22 Check
**Script:** `backend/scripts/m22check.js`
- SUPER_ADMIN room create + hub set
- COMPANY: GET /api/rooms?q=... & hasHub=1
- COMPANY: POST /api/agreements (roomId ile)

---

## M22.1 — Web
### Company AgreementsPanel
- Room dropdown `GET /api/rooms` ile doldurulur.
- Arama input’u (`roomQ`) + opsiyonel “Sadece hub’lı” filtresi.
- Seçili room hub bilgisi UI’da görünür.
- `company:lastRoomId` localStorage ile son room hatırlanır.

### Company ShiftsPanel
- Room directory `GET /api/rooms` ile gelir.
- Room arama input’u (`roomQ`) eklenir.
- Seçili room hub bilgisi görünür.
- `company:lastRoomId` localStorage ile son room hatırlanır.

---

## M22.2 — Gate / Pack
- `tools/gate.ps1` içine M22 check eklenir.
- `tools/pack.ps1` `-To 22` destekler.

