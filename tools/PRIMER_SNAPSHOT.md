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
- ✅ `M106 REPO HYGIENE CHECK PASS`

> Not: Son TOTP pack satırı logda kesilmişti; ancak M41 + Step1 Foundation + TOTP Runtime + TOTP Repo Contract PASS görüldüğü için Step 1 green kabul edilmiştir.

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

## 1) Şu an resmi olarak yeşil olan kapsam

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
- `STEP 0.6 STABIL PACK PASS`

### 1.4 Step 1 Security Foundation
- refresh reuse detection
- export limiter
- login/gps/export limit hattı
- RBAC deny-by-default sanity matrix
- `STEP 1 SECURITY FOUNDATION PACK PASS`

### 1.5 Step 1 TOTP Step-up
- `ROOM` + `SUPER_ADMIN` için TOTP setup/enable/verify
- login response içinde `stepUpRequired`
- setup olmadan kritik write/admin endpointler blok
- verify sonrası geçici `stepUpUntil` ile erişim açılıyor
- `COMPANY` ve `DRIVER` bu guard’dan etkilenmiyor
- `STEP 1 TOTP STEP-UP CHECK PASS`
- `STEP 1 TOTP STEP-UP REPO CONTRACT PASS`

### 1.6 Repo hijyen
- stale duplicate dosyalar arşive alındı
- `tools/` kökü kanonik pack/gate/check hattına indirildi
- `M104 REPO CLEANUP CHECK PASS`
- `M105 TOOLS HYGIENE CHECK PASS`
- `M106 REPO HYGIENE CHECK PASS`

---

## 2) Çalışan erişim/link politikası

### Parent invite
- SCHOOL panelinde parent invite presetleri: **1 hafta / 1 ay / 6 ay / 1 yıl**
- backend üst sınır: **365 gün**

### Personel / öğrenci public canlı link
- COMPANY / SCHOOL / ORGANIZATION panelinde presetler: **1 hafta / 1 ay / 6 ay / 1 yıl**
- ham token yalnızca ilk üretimde gösterilir
- link, vardiya bitse bile süre dolana kadar açılabilir; ekran bu durumda `ENDED/final` fazını gösterir
- `PassengerLiveLink.expiresAt`, vardiya `endAt` ile zorunlu clamp edilmez

---

## 3) TOTP step-up davranışı

Zorunlu step-up rolleri:
- `SUPER_ADMIN`
- `ROOM`

Korunan ana alanlar:
- `/api/admin`
- `/api/admin/logs`
- `/api/logs/export`
- `/api/vehicles`
- `/api/drivers`
- `/api/availability`
- `/api/shifts`

UI tarafı:
- `web/src/panels/shared/TotpStepUpCard.jsx`

---

## 4) SSOT / çalışma düzeni

SSOT hattı:
- `tools/CHECKLIST_SSOT.md`
- `docs/CHECKLIST_SSOT.md`
- `docs/PRIMER_SSOT.md`
- `docs/STARTPACK_V1.md`
- `tools/PRIMER_SNAPSHOT.md`

Çalışma tercihi:
- değişiklikler mümkün olduğunca tek seferde overlay zip
- tek Guided Mode/Stepper, diğerleri Advanced
- yanıtlarda en fazla 3 PowerShell komutu

---

## 5) Repo durumu / kalan bilinçli arşivler

- `tools/_archive/` ve `tools/_backup/` altı bilinçli tarihsel arşivdir
- `docs/_archive/` ve `docs/overlays/_archive/` altı da bilinçli tarihsel arşivdir
- bunlar aktif runtime ile çakışan canlı dosya değildir
- aktif ağaçta kalan kritik stale iz görünmüyor

---

## 6) Bir sonraki resmi iş

## Step 2 — M43 Google Auth + Invite Gate
- Google Auth (GIS)
- invite tablosu / accept akışı
- role/scope bağlama
- invite yoksa reject / `INVITE_REQUIRED`
- runtime check + repo-contract + tek pack

Ardından:
- Step 2.5 / M44 Telematics
- Step 2.6 / M45 Retention + Backup
- sonra V2 başlıkları

---

## 7) Yeni sohbet açınca ilk cümle önerisi

“Repo şu an M41 PACK PASS + M42 OPTIONAL PACK PASS + STEP 0.6 STABIL PACK PASS + STEP 1 SECURITY FOUNDATION PACK PASS + STEP 1 TOTP STEP-UP PACK PASS + M104 REPO CLEANUP CHECK PASS + M105 TOOLS HYGIENE CHECK PASS + M106 REPO HYGIENE CHECK PASS durumunda. Parent invite ve personel public link süre presetleri 1 hafta / 1 ay / 6 ay / 1 yıl. Sıradaki resmi iş M43 Google Auth + Invite Gate; mevcut repoya göre tek overlay zip olarak ilerleyelim.”
