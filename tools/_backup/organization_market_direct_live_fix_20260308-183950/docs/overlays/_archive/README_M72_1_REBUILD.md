# OVERLAY M72.1 (REBUILD) — AutoFlush + QueueDetail + GPS RateLimit

Bu zip, önceki link “sayfa kullanılmıyor” dediği için **yeniden paketlenmiş** bir M72.1 overlay’idir.
Repo yapın birebir aynı olmayabileceği için, içerik **drop-in yardımcı modüller + entegrasyon checklist** şeklindedir.

## 0) Hedef Davranış
- Online olunca otomatik flush (butona basmadan)
- Queue satırlarında `retry` + `lastError` (küçük tablo)
- Offline badge hem Driver Today hem Driver Route ekranında
- `/api/gps` rate-limit: **1.2 saniyeden sık gelen** GPS isteklerini server **ignore eder** ve şu yanıtı döner:
  `{ ok:true, throttled:true }`

---

## 1) Backend — /api/gps throttle (1.2s)

### 1.1 Dosyayı ekle
`backend/src/middleware/gpsThrottle1200ms.js`

### 1.2 /api/gps handler’ına middleware’i tak
Repo’da `/api/gps` POST handler’ını bul (genelde `backend/src/routes/gps*.js` veya `backend/src/modules/gps/*.js`).

Handler’ın **işlem yapan kısmından önce** middleware’i ekle:

```js
const { gpsThrottle1200ms } = require("../middleware/gpsThrottle1200ms");

// Örnek (mount'a göre değişebilir):
router.post("/gps", auth, gpsThrottle1200ms({ minIntervalMs: 1200 }), gpsPostHandler);
```

> Not: Auth middleware’in req.user set etmesi iyi olur; yoksa throttle key olarak `vehicleId` veya IP kullanır.

---

## 2) Web — Online olunca otomatik flush

### 2.1 Hook’u ekle
`web/src/live/useOnlineStatus.js`
`web/src/live/useAutoFlushOnOnline.js`

### 2.2 Driver Today / Route ekranında kullan
Queue flush fonksiyonunu nerede tutuyorsan (örn. `flushQueue()`), aşağıdaki gibi çağır:

```js
const isOnline = useOnlineStatus();
useAutoFlushOnOnline({ isOnline, queueLength: queue.length, flush: flushQueue });
```

- `flushQueue` **idempotent** olmalı (aynı anda 2 flush başlamasın). Hook zaten korumaya çalışır.

---

## 3) Web — Offline badge (Today + Route)

Driver ekranında görünür küçük bir pill/badge:
- `OFFLINE` (isOnline=false)
- online iken gizle veya “ONLINE” göstermeden sadece offline’da göster.

Hook:
```js
const isOnline = useOnlineStatus();
```

UI:
```jsx
{!isOnline && <span className="pill pill-offline">OFFLINE</span>}
```

---

## 4) Web — Queue Detail: retry + lastError tablo

`web/src/components/QueueDetailTable.jsx` küçük bir tablo component’i.
Queue item’larında şu alanlar beklenir:
- `retryCount` (number)
- `lastError` (string | null)
- `lastTriedAt` (iso | ms)

Queue sende başka isimdeyse map’leyip ver.

---

## 5) Queue item alanları (önerilen)
Flush denemelerinde:
- başarılı -> item sil
- başarısız -> item üzerinde:
  - `retryCount += 1`
  - `lastError = err.message || String(err)`
  - `lastTriedAt = new Date().toISOString()`

Bu alanları localStorage/IndexedDB’de tuttuğun kuyruk yapısına ekle.

---

## 6) Uygulama (max 2 PowerShell)
```powershell
cd D:\servis-platform
Expand-Archive -Path .\OVERLAY_M72_1_AUTOFLSH_QUEUEDETAIL_GPSRATELIMIT_REBUILD.zip -DestinationPath . -Force
```

Sonra normal akışınla backend/web restart (docker vs.) yap.

---

## 7) Hızlı doğrulama
- İnterneti kapat → driver OFFLINE + kuyruk artıyor
- İnterneti aç → butona basmadan flush başlıyor
- Queue Detail → satırlarda retry/lastError görünüyor
- GPS’i 1 saniyeden sık at → `{ ok:true, throttled:true }` dönüyor, backend işlem yapmıyor

