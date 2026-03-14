# M46.9 — Session & Refresh Security

Tarih: 2026-03-14

## Amaç
Bu milestone, **access token + refresh token** hattını daha güvenli ve yönetilebilir hale getirir.

Odak:
- Access token tarafında **oturum iptali** (session invalidation)
- Refresh token tarafında **rotasyon + reuse tespiti** ve **session sayısı limiti**
- Kullanıcı kendi oturumlarını görebilir / hepsini iptal edebilir

> Not: Ürün kuralı korunur: AI hattı read-only kalır; otomatik write action eklenmez.

---

## Kapsam

### A) Access token — SessionVersion (sv) doğrulaması
- User tablosuna `sessionVersion` eklendi.
- Access token payload içine `sv` kondu.
- API ve WS tarafında `token.sv != user.sessionVersion` ise istek reddedilir.

Beklenen hata:
- `401` + `{ code: "SESSION_REVOKED" }`

### B) Refresh token — rotasyon + reuse tespiti
- `/api/auth/refresh` başarılı olunca refresh token **rotate** edilir.
- Eski refresh token tekrar kullanılırsa `REFRESH_REUSE_DETECTED` dönülür ve kalan oturumlar revoke edilir.

### C) Refresh session sayısı limiti (anti-sprawl)
- `MAX_REFRESH_SESSIONS_PER_USER` env ile aktif refresh session sayısı sınırlanır.
- Limit aşılan eski session’lar `revokedAt` ile kapatılır.

### D) DeviceId enforcement (prod)
- Session `deviceId` bağlıysa ve refresh çağrısı `deviceId` göndermiyorsa (prod) DRIVER için `DEVICE_ID_REQUIRED` döner.

### E) Oturum görünürlüğü + self revoke-all
- `GET /api/me/sessions` → kullanıcı kendi refresh session’larını görür.
- `POST /api/me/sessions/revoke-all` → kullanıcı tüm refresh session’larını revoke eder ve `sessionVersion` artırılır.

> Sonuç: mevcut access token da iptal olur; kullanıcı tekrar login olur.

---

## Kabul Kriterleri
- [ ] Driver login refreshToken döner
- [ ] Refresh rotate olur (yeni refreshToken)
- [ ] Eski refreshToken reuse edilirse `REFRESH_REUSE_DETECTED` döner
- [ ] `/api/me/sessions` çalışır
- [ ] `revoke-all` sonrası aynı access token ile `/api/me` 401 döner
- [ ] Room `reset-pin` sonrası eski access token’lar 401 döner
- [ ] Audit log’larda ilgili aksiyonlar görünür

---

## Kanıt / Çalıştırma
- Runtime check:
  - `backend/scripts/m46_9_session_refresh_security_check.js`
- Pack:
  - `tools/pack_m46_9_session_refresh_security.ps1`

