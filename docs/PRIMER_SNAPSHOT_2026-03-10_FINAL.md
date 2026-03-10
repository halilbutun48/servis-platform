# SERVIS-PLATFORM — PERSONEL SERVİS V1/V2 — PRIMER SNAPSHOT (Yapıştır & Devam Et)

Tarih: 2026-03-10  
Timezone: Europe/Istanbul

## 0) Mevcut durum / referans

Repo: `D:\servis-platform`

Current GREEN ref:
- ✅ `M41 PACK PASS`
- ✅ `M42 OPTIONAL PACK PASS`
- ✅ `STEP 0.6 STABIL PACK PASS`
- ✅ `STEP 1 SECURITY FOUNDATION PACK PASS`
- ✅ `STEP 1 TOTP STEP-UP PACK PASS`
- ✅ `M104 REPO CLEANUP CHECK PASS`
- ✅ `M105 TOOLS HYGIENE CHECK PASS`
- ✅ `M106 REPO HYGIENE + LINK TTL CHECK PASS`

> Not: Step 1 TOTP için green kabulü; M41 + Step1 Foundation + TOTP Runtime + TOTP Repo Contract PASS ile doğrulanmıştır.  
> Not 2: M104/M105/M106 sonrası repo ağacı, tools kökü ve primer/checklist/startpack hattı yeniden hizalanmıştır.

Ana kanıt komutları:
- `./tools/pack.ps1 -To 41`
- `./tools/pack_m42_optional.ps1`
- `./tools/pack_step06_stabil.ps1`
- `./tools/pack_step1_security_foundation.ps1`
- `./tools/pack_step1_totp_stepup.ps1`
- `./tools/check_repo_cleanup_m104.ps1 -RepoRoot D:\servis-platform`
- `./tools/check_tools_hygiene_m105.ps1 -RepoRoot D:\servis-platform`
- `./tools/check_repo_hygiene_m106.ps1 -RepoRoot D:\servis-platform`

---

## 1) Resmi olarak yeşil olan kapsam

### 1.1 V1 ana regresyon
- auth / refresh / revoke / device mismatch
- RBAC / route guard
- agreement
- offer / counter / accept
- route/stops
- live/ws/gps
- rate-limit mini stres
- audit / retention
- learning
- hepsi `M41 PACK PASS` altında yeşil

### 1.2 M42 Optional Release
- check-in modülü optional release olarak hazır
- `FEATURE_CHECKIN=0` iken dormant
- `FEATURE_CHECKIN=1` iken ayrı optional pack ile doğrulanmış
- `M42 OPTIONAL PACK PASS`

### 1.3 Step 0.6 Stabil Ekler
- capacity / pool / auto-split
- split parent cleanup
- school parent invite + public accept
- shift preview external nav
- company list click details

Kanıt:
- `STEP 0.6 STABIL PACK PASS`

### 1.4 Step 1 Security Foundation
- refresh reuse detection
- export limiter
- login/gps/export limit hattı
- RBAC deny-by-default sanity matrix

Kanıt:
- `STEP 1 SECURITY FOUNDATION PACK PASS`

### 1.5 Step 1 TOTP Step-up
- `ROOM` + `SUPER_ADMIN` için TOTP setup/enable/verify
- login response içinde `stepUpRequired`
- setup olmadan kritik write/admin endpointler blok
- verify sonrası geçici `stepUpUntil` ile erişim açılıyor
- `COMPANY` ve `DRIVER` bu guard’dan etkilenmiyor

Kanıt:
- `STEP 1 TOTP STEP-UP CHECK PASS`
- `STEP 1 TOTP STEP-UP REPO CONTRACT PASS`

---

## 2) Personel ve parent link politikası

### 2.1 Parent invite TTL
Presetler artık:
- `1 hafta`
- `1 ay`
- `6 ay`
- `1 yıl`

Backend üst sınır:
- `365 gün`

### 2.2 Personel public canlı link TTL
Presetler artık:
- `1 hafta`
- `1 ay`
- `6 ay`
- `1 yıl`

Backend üst sınır:
- `365 gün`

Önemli davranış:
- personel public link, vardiya `endAt` ile zorunlu clamp edilmez
- ham token sadece ilk üretimde gösterilir
- revoke / expired link ekranda aktif gibi tutulmaz

### 2.3 Ürün kararı
- `COMPANY / ROOM / SUPER_ADMIN / DRIVER` login tabanlı kalır
- `PERSONEL` için login zorunlu değildir; varsayılan düşük sürtünmeli model süreli public linktir
- gerekirse ileride opsiyonel account-upgrade yapılabilir

---

## 3) Repo ve tools hijyen durumu

### 3.1 M104 Repo Cleanup
Temizlenen/archivelenen ana kalemler:
- stale duplicate route/panel dosyaları
- `.bak` artık dosyaları
- root stray `src/`, `scripts/`, `rlays/`
- dağınık legacy README/TXT kalıntıları

Sonuç:
- kanonik canlı ağaç korunmuş
- stale path’ler archive altına taşınmış
- `M104 REPO CLEANUP CHECK PASS`

### 3.2 M105 Tools Canonical Cleanup
`tools/` kökünde artık sadece kanonik hat var:
- `pack*`
- `gate*`
- `reset-and-pack.ps1`
- kanonik `check_*`
- `README.md`
- `PRIMER_SNAPSHOT.md`
- `CHECKLIST_SSOT.md`
- `STABLE_TO.txt`

Legacy overlay/apply/readme kalıntıları:
- `tools/_archive/legacy-overlays/`
- `tools/_archive/oneoff-hotfixes/`
- `tools/_archive/legacy-docs/`

Sonuç:
- `M105 TOOLS HYGIENE CHECK PASS`

### 3.3 M106 Repo Hygiene + Primer/TTL Sync
Ek temizlenenler:
- `tools/_overlay_payload/primer_refresh`
- `infra/infra/solver/Dockerfile`

Senkronlananlar:
- primer/startpack/checklist
- parent/personel TTL politikası
- kanonik checker hattı

Sonuç:
- `M106 REPO HYGIENE + LINK TTL CHECK PASS`

---

## 4) SSOT / doküman düzeni

Kanonik hat:
- `tools/PRIMER_SNAPSHOT.md`
- `tools/CHECKLIST_SSOT.md`
- `tools/README.md`
- `docs/PRIMER_SSOT.md`
- `docs/CHECKLIST_SSOT.md`
- `docs/STARTPACK_V1.md`
- `docs/API_SPEC_V1.md`
- `docs/UI_SPEC_V1.md`
- `docs/DB_SCHEMA_V1.md`
- `docs/PROJECT_SPEC_V1.md`

Overlay/cleanup notları:
- `docs/overlays/OVERLAY_NOTES_M104_REPO_AUDIT_CLEANUP_2026-03-10.md`
- `docs/overlays/OVERLAY_NOTES_M105_TOOLS_CANONICAL_CLEANUP_2026-03-10.md`
- `docs/overlays/OVERLAY_NOTES_M106_LINK_TTL_AND_HYGIENE_2026-03-10.md`
- `docs/overlays/OVERLAY_NOTES_M106_4_CHECKERS_RESTORE_PRIMER_SYNC_2026-03-10.md`

---

## 5) Bir sonraki net adım

## Step 2 — M43 Google Auth + Invite Gate
Sıradaki resmi iş:
- Google Auth (GIS)
- invite tablosu / accept akışı
- role/scope bağlama
- invite yoksa reject
- runtime check + repo-contract + tek pack

Uygulama notu:
- mevcut `parent invite` desenini bozma
- generic invite/access gate tasarımıyla ilerle
- personel için login zorunluluğu getirme; public link modeli korunmalı

Ardından:
- Step 2.5 / M44 Telematics
- Step 2.6 / M45 Retention + Backup
- sonra V2 başlıkları

---

## 6) Yeni sohbet açınca ilk cümle önerisi

"Repo şu an M41 PACK PASS + M42 OPTIONAL PACK PASS + STEP 0.6 STABIL PACK PASS + STEP 1 SECURITY FOUNDATION PACK PASS + STEP 1 TOTP STEP-UP PACK PASS + M104 REPO CLEANUP CHECK PASS + M105 TOOLS HYGIENE CHECK PASS + M106 REPO HYGIENE + LINK TTL CHECK PASS durumunda. Personel login zorunlu değil; public link TTL presetleri parent ve personelde 1 hafta / 1 ay / 6 ay / 1 yıl olarak hizalandı. Sıradaki iş M43 Google Auth + Invite Gate; mevcut repoya göre tek overlay zip olarak ilerleyelim." 
