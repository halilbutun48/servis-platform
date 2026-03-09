# STARTPACK_V1 — SERVIS-PLATFORM (PERSONEL SERVİS V1)
Tarih: 2026-03-02  
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
3) “Çalışıyor” = **PACK PASS** kanıtı.  
4) Değişiklikleri mümkünse tek seferde **overlay (zip)** olarak taşı.

---

## 2) Repo Yapısı
- `backend/` Node(ESM)+Express+Prisma + jobs + ws
- `web/` Vite+React
- `infra/` docker-compose (+ OSRM profile)
- `docs/` SSOT dokümanlar
- `tools/` gate/pack + primer snapshot

---

## 3) Doğrulama Standardı (Gate/Pack)

### Canonical (bu repo)
- **PACK (M0→M36):** `tools\pack.ps1 -To 36`
- **Gate/check (M0→M36):** `tools\gate.ps1 -To 36`
- Sıfırdan temiz kurulum + OSRM + pack: `tools\reset-and-pack.ps1` (auto max milestone)

> `tools/reset-and-pack.ps1` max milestone’ı `backend/scripts/m{N}check.js` dosyalarından otomatik bulur.

### ExecutionPolicy sorunu (Windows)
- `tools\gate.cmd` ve `tools\pack.cmd` wrapper’ları `-ExecutionPolicy Bypass` ile çalışır.

---

## 4) En kritik akış (sahada “az tık”)
1) Geo Review (NEEDS_REVIEW düzelt)  
2) Agreement/Shift planı oluştur  
3) (Ops.) Market ile çoklu Room’dan teklif topla  
4) 1 teklifi ACCEPT et → diğerleri CANCELLED  
5) ROOM: Onayla + Başlat → ACTIVE  
6) DRIVER: Reached → DONE  

Kullanım sayfaları: `docs/USAGE_GUIDE_V1.md`

---

## 5) Sık Hata / Debug Kısa Rehber
- **429 / rate-limit**:
  - PROD: auth/read/write/gps kovaları ayrı.
  - DEV test: `x-greenpack: 1` limiter/throttle skip (check deterministik olsun diye).
- **409 conflict** (agreement/availability overlap):
  - UI conflict listesine bak; start/end veya weekMask düzelt.
- **403 RBAC**:
  - Rol + scope mismatch; `docs/API_SPEC_V1.md` ve route dosyalarında rol kontrolünü doğrula.
- **Notification payload hataları** (ör. `type required`):
  - Payload standardı: `docs/NOTIFICATION_PAYLOAD_STANDARD.md`
- **WS “gelmiyor”**:
  - event name + scope + topic guess (client `web/src/live/ws.js`) doğrula.

---

## 6) Notlar (numaralandırma)
- Gate/Pack milestone = `m{N}check.js` (şu an en yüksek: **M36**).
- `OVERLAY_NOTES_Mxx` ve “M72/M77” = feature/overlay serisi (Gate ile birebir aynı olmak zorunda değil).

---

## ORGANIZATION demo note

- Demo tenant eklendi: `organization@demo.com` / `demo123` (`Company.kind=ORGANIZATION`). V1 uyumluluğu için lokasyon listesi mevcut Personel tablosu üzerinde etiketlenir; ayrı Destination modeli sonraki milestone.
