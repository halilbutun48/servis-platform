# STARTPACK_V1 — SERVIS-PLATFORM (PERSONEL SERVİS V1)
Tarih: 2026-02-24  
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
- `infra/` docker-compose
- `docs/` SSOT dokümanlar
- `tools/` gate/pack + primer snapshot

---

## 3) Doğrulama Standardı (Gate/Pack)

### Canonical
- **PACK (M0→M32):** `tools/pack.ps1 -To 32`
- **Gate/check (M0→M32):** `tools/gate.ps1 -To 32`

### ExecutionPolicy sorunu (Windows)
- `tools\gate.cmd` ve `tools\pack.cmd` wrapper’ları `-ExecutionPolicy Bypass` ile çalışır.

---

## 4) En kritik akış (sahada “az tık”)
1) Geo Review (NEEDS_REVIEW düzelt)  
2) Agreement Wizard ile plan oluştur  
3) (Ops.) Market ile çoklu room’dan teklif topla  
4) 1 teklifi ACCEPT et → diğerleri CANCELLED  
5) ROOM: Onayla + Başlat → ACTIVE  
6) DRIVER: Reached → DONE  

Kullanım sayfaları: `docs/USAGE_GUIDE_V1.md`

---

## 5) Sık Hata / Debug Kısa Rehber
- **409 conflict** (agreement/availability overlap):
  - UI conflict listesine bak; start/end veya weekMask düzelt.
- **403 RBAC**:
  - Rol + scope mismatch; `docs/API_SPEC_V1.md` ve route dosyalarında rol kontrolünü doğrula.
- **Notification payload hataları** (ör. `type required`):
  - Payload standardı: `docs/NOTIFICATION_PAYLOAD_STANDARD.md`
- **WS “gelmiyor”**:
  - `ws:ready` logu + topic/scope doğrula; event isimlerinde `shift` / `offer` ayrımı tutarlı olmalı.

---

## 6) SSOT Dosyaları (Değişince güncelle)
- `docs/PROJECT_SPEC_V1.md`
- `docs/API_SPEC_V1.md`
- `docs/DB_SCHEMA_V1.md`
- `docs/UI_SPEC_V1.md`
- `docs/PRIMER_SSOT.md`
- `docs/STARTPACK_V1.md` (bu dosya)
- `tools/PRIMER_SNAPSHOT.md`

---
