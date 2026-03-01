# OVERLAY — M77.0 — Anti-429 / Scale Pack

Bu overlay iki şeyi **kalıcı** çözer:

1) **Self‑DDOS zinciri** (WS spam → UI invalidate → HTTP spam → 429)
2) **Login’in kilitlenmesi** (global limiter yerine **route‑bazlı limiter**)

---

## 1) Web (UI/WS)

### 1.1 Topic split (kritik)
- `gps:update` → **gps** topic
- `vehicle:*` → **vehicles** topic

> Böylece GPS akışı artık Shifts ekranlarını tetiklemez.

### 1.2 WS invalidate debounce (kritik)
- `invalidate(topic, { source: "ws" })` çağrıları topic bazlı **1sn** coalesce edilir.
- Local/UI invalidate (source yok) **anında** çalışır.

### 1.3 Map panellerinde HTTP reload kaldırıldı
- Company/Room/Driver map panelleri `gps:update` payload’ını state’e **patch** eder.
- GPS event’lerinde `/api/*` çağrısı yok.

### 1.4 Shifts panelleri artık “vehicles” dinlemez
- Shift listesi GPS ile değişmediği için `useAutoReload("vehicles", load)` kaldırıldı.

---

## 2) Backend

### 2.1 Route‑bazlı rate limit
- `/api/auth/login` → **AUTH limiter** (IP + email)
- `/api/gps` → **GPS limiter** (token/user bazlı ayrı kova)
- `/api/*` → GET için **READ**, write için **WRITE** limiter

> Böylece GPS trafiği artsa bile `/api/me` ve `/api/auth/login` “başka bir kovadan” çalışır.

### 2.2 Yeni endpoint: `/api/live/vehicles`
Harita/telemetri için minimal alanlar döner:
- `id, plate, capacity, room{name}, gpsLast{lat,lng,at}, gpsState{lastUiStatus}`

Company Map artık buradan okur.

---

## 3) Uygulama

Bu overlay “overlay copy” mantığıyla root’a kopyalanır.

Önerilen doğrulama (en fazla 3 komut):

```powershell
cd D:\servis-platform
.\tools\gate.ps1 compose up --detach
.\tools\pack.ps1 -To 17
```

---

## 4) Notlar / Beklenen Etki

- Shifts ekranında GPS yüzünden 429 ve “login olamama” zinciri kesilir.
- Map ekranları canlı akarken backend’e **saniyede onlarca** HTTP isteği atılmaz.
- DDoS senaryosunda login endpoint’i kendi limiter’ıyla ayrı korunur.
