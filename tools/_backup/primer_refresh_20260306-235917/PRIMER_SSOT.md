# PERSONEL SERVİS V1 — PRIMER (SSOT)

Tarih: 2026-03-02  
Timezone: Europe/Istanbul  

## Repo & doğrulama (kanıt standardı)
- Repo path: `D:\servis-platform`
- Gate/Pack stage: `tools/gate.ps1` + `tools/pack.ps1`
  - `backend/scripts/m{N}check.js` dosyaları **contiguous** ise `tools/reset-and-pack.ps1` otomatik en yüksek N’i bulur.
  - Bu repoda en yüksek check: **M36** → canonical kanıt: `tools\pack.ps1 -To 36` → **PACK PASS**.

> Not: `OVERLAY_NOTES_Mxx` ve “M72/M77” gibi etiketler feature/overlay serisidir; Gate/Pack milestone ile birebir eşleşmesi şart değildir.

---

## Ürün modeli (kafa karışıklığı yok)
- **Agreement** = anlaşma takvimi + fiyat/koşul (uzun/kısa süreli)
- **Shift** = operasyon (durak/rota/personel/maxWalk/araç-şoför)

---

## Ölçek / Anti-429 (M72/M77)
- Backend: express-rate-limit **route bazlı** kovalar (auth/read/write/gps ayrı).
- GPS ingest throttle: ~1.2s altı update “ignore” (200 `{ ok:true, throttled:true }`).
- Web: WS invalidate “topic guess” + dedupe + in-flight guard (self-DDOS engeli).

**GreenPack (dev/test):**
- Request header `x-greenpack: 1` → limiter/throttle skip (deterministic check).
- Market offer’da (dev/test) agreement block bypass (pack stabilizasyonu).

---

## KVKK / Time-window gate
- COMPANY/PERSONEL canlı harita “şu an aralığı” ile sınırlı:
  - `GET /api/vehicles` COMPANY/PERSONEL → `startAt<=now<=endAt` filtresi uygular.
  - UI: `GET /api/shifts?onlyNow=1` + harita bileşenleri parity.

---

## M36 — SUPER_ADMIN ops
- Company/Room CRUD + soft delete
- Region(İl) CRUD + Company/Room `regionId`
- District(İlçe) alanı (opsiyonel)
- Users panel: create (scope bind), temp password, disable/enable, reset password, email ile arama
- Audit logs: admin aksiyonları audit’e yazılır + panel
- Market: cross-region offer engeli (legacy `regionId=null` tolerans)

---

## SSOT dosyaları (değişince güncelle)
- `docs/PROJECT_SPEC_V1.md`
- `docs/API_SPEC_V1.md`
- `docs/DB_SCHEMA_V1.md`
- `docs/UI_SPEC_V1.md`
- `docs/STARTPACK_V1.md`
- `docs/PRIMER_SSOT.md` (bu dosya)
- `tools/PRIMER_SNAPSHOT.md` (yeni sohbet yapıştırmalık)

---

## Next (taslak) — School/Parent mode
- `Company.kind = COMPANY | SCHOOL`
- `Personel.kind = PERSONEL | STUDENT`
- Role: `PARENT`
- `ParentChild` link (parent ↔ student)
- Parent UI: live map + ETA + timeline (time-window gate zorunlu)
