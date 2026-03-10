# SERVIS-PLATFORM — PERSONEL SERVİS V1/V2 — PRIMER (SSOT)

Tarih: 2026-03-10  
Timezone: Europe/Istanbul

## 0) Güncel durum
- Repo: `D:\servis-platform`
- Current green:
  - **M41 PACK PASS**
  - **M42 OPTIONAL PACK PASS**
  - **STEP 0.6 STABIL PACK PASS**
  - **STEP 1 SECURITY FOUNDATION PACK PASS**
  - **STEP 1 TOTP STEP-UP PACK PASS**
  - **M104 REPO CLEANUP CHECK PASS**
  - **M105 TOOLS HYGIENE CHECK PASS**
- Not: Son TOTP pack satırı logda kesilmiş olsa da runtime + repo-contract PASS görüldüğü için Step 1 green kabul edilir.

## 1) Resmi yeşil kapsam
### V1 ana regresyon
- auth / refresh / revoke / device mismatch
- RBAC / route guard
- agreement / offer / route / live / gps / audit / learning

### M42 optional release
- check-in modülü dormant/optional yapıdadır
- `FEATURE_CHECKIN=0` ile kapalı, `FEATURE_CHECKIN=1` ile ayrı pack doğrulamalıdır

### Step 0.6 stabil ekler
- capacity / pool / auto-split
- split parent cleanup
- school parent invite + public accept
- shift preview external navigation
- company list click details

### Step 1 security
- refresh reuse detection
- export limiter
- login/gps/export limit hattı
- RBAC deny-by-default sanity matrix
- ROOM + SUPER_ADMIN için TOTP setup/enable/verify
- `stepUpRequired` / `stepUpUntil` akışı

### Repo hijyen
- M104 ile stale duplicate dosyalar arşive taşındı
- M105 ile `tools/` kökü kanonik pack/gate/check hattına indirildi

## 2) Kanonik komutlar
- Ana regresyon: `tools\pack.ps1 -To 41`
- Optional check-in: `tools\pack_m42_optional.ps1`
- Step 0.6 stabil: `tools\pack_step06_stabil.ps1`
- Step 1 foundation: `tools\pack_step1_security_foundation.ps1`
- Step 1 TOTP: `tools\pack_step1_totp_stepup.ps1`
- Repo hijyen: `tools\check_repo_cleanup_m104.ps1 -RepoRoot D:\servis-platform`
- Tools hijyen: `tools\check_tools_hygiene_m105.ps1 -RepoRoot D:\servis-platform`

## 3) Link erişim politikası
### Parent invite
- presetler: **1 hafta / 1 ay / 6 ay / 1 yıl**
- backend üst sınır: **365 gün**

### Personel/öğrenci public canlı link
- presetler: **1 hafta / 1 ay / 6 ay / 1 yıl**
- ham token yalnızca ilk üretimde gösterilir
- link, vardiya bitse bile süre dolana kadar açılabilir; ekran `ENDED/final` fazını gösterebilir
- `PassengerLiveLink.expiresAt`, vardiya `endAt` ile zorunlu clamp edilmez

## 4) TOTP step-up özeti
Zorunlu roller:
- `SUPER_ADMIN`
- `ROOM`

Korunan alanlar:
- `/api/admin`
- `/api/admin/logs`
- `/api/logs/export`
- `/api/vehicles`
- `/api/drivers`
- `/api/availability`
- `/api/shifts`

UI kartı:
- `web/src/panels/shared/TotpStepUpCard.jsx`

## 5) SSOT / overlay düzeni
- `tools/CHECKLIST_SSOT.md`
- `docs/CHECKLIST_SSOT.md`
- `docs/PRIMER_SSOT.md`
- `docs/STARTPACK_V1.md`
- `tools/PRIMER_SNAPSHOT.md`
- `docs/overlays/`

## 6) Sıradaki resmi iş — Step 2 / M43
### Kapsam
- Google Auth (GIS)
- Invite Gate
- role/scope güvenliği
- runtime check + repo-contract + tek pack

### M43 detay çekirdeği
- Invite tipleri:
  - `PARENT_INVITE`
  - `PERSONEL_INVITE`
  - opsiyonel `ROOM_USER_INVITE`
- Invite alanları:
  - `email` veya `phone`
  - `role`
  - `companyId` / `roomId`
  - `personelId` veya `childPersonelId`
  - `expiresAt`, `consumedAt`, `createdAt`, `createdByUserId`
  - `tokenHash`
- Backend:
  - `POST /api/auth/google`
  - `UserIdentity(provider, providerSub)`
  - invite varsa create/link + role/scope bind
  - invite yoksa `INVITE_REQUIRED`
- UI:
  - GIS script
  - “Google ile giriş” butonu / One Tap
  - invite yoksa açıklayıcı ekran

## 7) Çalışma kuralları
- Değişiklikler mümkün olduğunca tek seferde overlay (zip)
- Tek Guided Mode/Stepper; diğerleri Advanced
- Yanıtlarda en fazla 3 PowerShell komutu
- Ana M41 regresyon sabit tutulur; yeni işler Step 0.6 / Step 1 / M43 hattında ayrı ve kanıtlı ilerler
