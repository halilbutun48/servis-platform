# STARTPACK_V1 — SERVIS-PLATFORM (PERSONEL SERVİS V1/V2)
Tarih: 2026-03-06  
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
2) API/DB/UI/flow değişirse aynı pakette docs güncellenir.  
3) “Çalışıyor” = **PACK PASS** kanıtı.  
4) Değişiklikleri mümkünse tek seferde **overlay (zip)** olarak taşı.  
5) Tek **Guided Mode / Stepper** korunur; diğer araçlar **Advanced** kalır.  
6) Yanıtlarda en fazla **3 PowerShell komutu** verilir.

---

## 2) Repo Yapısı
- `backend/` Node (ESM) + Express + Prisma + jobs + ws
- `web/` Vite + React
- `infra/` docker-compose (+ OSRM / solver / data katmanları)
- `docs/` SSOT dokümanlar
- `tools/` gate / pack / primer / overlay yardımcıları

---

## 3) Doğrulama Standardı (Gate/Pack)

### Canonical (bu repo)
- **STABLE_TO:** `tools/STABLE_TO.txt` = **41**
- **PACK:** `tools\pack.ps1 -To 41`
- **Gate/check:** `tools\gate.ps1 -To 41`
- Sıfırdan temiz kurulum + auto max: `tools\reset-and-pack.ps1`

> `tools/reset-and-pack.ps1` max milestone’ı `backend/scripts/m{N}check.js` dosyalarından otomatik bulur.

### Not
- `OVERLAY_NOTES_Mxx`, `M72`, `M77`, `M81` vb. etiketler feature/overlay serisi olabilir; Gate/Pack milestone ile birebir aynı olmak zorunda değildir.

---

## 4) En kritik akış (sahada “az tık”)
1) Geo / hub / personel konumları hazır  
2) Agreement veya market shift oluştur  
3) 1+ room offer / counter  
4) 1 teklif accept → diğerleri CANCELLED  
5) ROOM: approve + start  
6) DRIVER: reached / done  
7) Company + Room canlı panelden takip

---

## 5) Current GREEN çekirdek
- Agreements + extend/counter
- Agreement kaynaklı shift üretimi
- Offer akışı + scope izolasyonu
- Route/OSRM direction kuralları
- KVKK consent gate
- Log export + retention dryRun + audit
- Refresh/logout/revoke + driver device binding
- Company Shifts premium UX
- Anti-429 / GreenPack stabilizasyonu

---

## 6) Sık Hata / Debug Kısa Rehber
- **429 / rate-limit**
  - auth/read/write/gps mantıksal kovalar ayrı tutulur
  - dev/test stabilizasyonu için GreenPack bypass kullanılabilir
- **409 conflict**
  - agreement / availability overlap kontrol edilir
- **403 RBAC**
  - rol + scope eşleşmesini doğrula
- **WS “gelmiyor”**
  - event name + scope + topic guess kontrol et
- **KVKK blok**
  - consent state + publish policy kontrol et
- **DEVICE_MISMATCH**
  - driver cihaz bağı doğru mu bak

---

## 7) Sıradaki resmi sıra
- Step 0: V1 manuel checklist %100 PASS
- Step 1: V1.5 Minimum Security
- Step 2: M43 Google Auth + Invite Gate
- Step 2.5: M44 Telematics
- Step 2.6: M45 Retention + GPS history + Backup/PITR
- Step 3: V2-Scale → V2-Mobile Driver → V2-ProdOps → V2-FieldFeatures

---

## 8) Devam standardı
- Kısa devam için: `tools/PRIMER_SNAPSHOT.md`
- Detay karar için: `docs/PRIMER_SSOT.md`
- Regresyon / runbook için: `docs/CHECKLIST_SSOT.md`
