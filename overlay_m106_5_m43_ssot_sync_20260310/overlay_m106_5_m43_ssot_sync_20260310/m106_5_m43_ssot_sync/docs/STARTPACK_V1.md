# STARTPACK_V1 — SERVIS-PLATFORM (PERSONEL SERVİS V1/V2)

Tarih: 2026-03-10  
Timezone: Europe/Istanbul

Bu dosya repo için kısa çalışma runbook’udur.

## 1) GOLDEN RULES
1. Ana referans **M41 PACK PASS**’tir.
2. M42 optional ayrı doğrulanır.
3. Step 0.6 stabil ekler ayrı pack ile doğrulanmıştır.
4. Step 1 Security Foundation + TOTP Step-up resmi olarak green’dir.
5. M104 + M105 + M106 repo/tools hijyen check’leri PASS durumundadır.
6. M43 Google Auth + Invite Gate hattı resmi green durumundadır.
7. API / DB / UI / flow değişirse aynı değişiklikte docs güncellenir.
8. Değişiklikler mümkünse tek seferde **overlay (zip)** paket olarak taşınır.

## 2) Kanonik komutlar
- Ana regresyon: `tools\pack.ps1 -To 41`
- Optional check-in: `tools\pack_m42_optional.ps1`
- Step 0.6 stabil: `tools\pack_step06_stabil.ps1`
- Step 1 foundation: `tools\pack_step1_security_foundation.ps1`
- Step 1 TOTP: `tools\pack_step1_totp_stepup.ps1`
- Repo hijyen: `tools\check_repo_cleanup_m104.ps1 -RepoRoot D:\servis-platform`
- Tools hijyen: `tools\check_tools_hygiene_m105.ps1 -RepoRoot D:\servis-platform`
- Link TTL + primer hijyen: `tools\check_repo_hygiene_m106.ps1 -RepoRoot D:\servis-platform`
- M43 pack: `tools\pack_m43_google_auth_invite_gate.ps1 -RepoRoot D:\servis-platform`
- M43 repo-contract: `tools\check_m43_google_auth_invite_gate_repo_contract.ps1 -RepoRoot D:\servis-platform`

## 3) Resmi green durum
- `M41 PACK PASS`
- `M42 OPTIONAL PACK PASS`
- `STEP 0.6 STABIL PACK PASS`
- `STEP 1 SECURITY FOUNDATION PACK PASS`
- `STEP 1 TOTP STEP-UP PACK PASS`
- `M104 REPO CLEANUP CHECK PASS`
- `M105 TOOLS HYGIENE CHECK PASS`
- `M106 REPO HYGIENE + LINK TTL CHECK PASS`
- `M43 GOOGLE AUTH + INVITE GATE PACK PASS OK`

## 4) Link erişim politikası
- Parent invite presetleri: **1 hafta / 1 ay / 6 ay / 1 yıl**
- Personel/öğrenci public canlı link presetleri: **1 hafta / 1 ay / 6 ay / 1 yıl**
- Personel public link ham tokenı sadece ilk üretimde gösterilir
- Personel public link TTL’i vardiya `endAt` ile zorunlu clamp edilmez

## 5) Step 1 özeti
### Security Foundation
- refresh reuse detection
- export limiter
- login/gps/export limit hattı
- RBAC deny-by-default sanity matrix

### TOTP Step-up
- ROOM + SUPER_ADMIN zorunlu
- `stepUpRequired` login cevabı
- verify sonrası `stepUpUntil`
- korunan ana alanlar:
  - `/api/admin`
  - `/api/admin/logs`
  - `/api/logs/export`
  - `/api/vehicles`
  - `/api/drivers`
  - `/api/availability`
  - `/api/shifts`

## 6) Step 2 özeti — M43 resmi green
- Google Auth (GIS) hattı mevcut
- Invite Gate aktif
- role/scope bağlama doğrulandı
- invite yoksa `INVITE_REQUIRED`
- runtime check + repo-contract + tek pack PASS

Detay çekirdek:
- `Invite` tablosu
- `UserIdentity` tablosu
- `POST /api/auth/google`
- `PARENT_INVITE` / `PERSONEL_INVITE` / opsiyonel `ROOM_USER_INVITE`

## 6.1) Sıradaki hedef — Step 2.5 / M44
- telematics normalize core
- direct HTTP push alımı
- vendor cloud adapter
- provider normalize katmanı
- mevcut GPS/live/ws hattını bozmadan ek kaynak mimarisi

## 7) SSOT dosyaları
- `tools/CHECKLIST_SSOT.md`
- `docs/CHECKLIST_SSOT.md`
- `docs/PRIMER_SSOT.md`
- `docs/STARTPACK_V1.md`
- `tools/PRIMER_SNAPSHOT.md`
- `tools/README.md`
- `docs/overlays/INDEX.md`

## 8) Repo hijyen / cleanup standardı
- Canlı kaynak ağacında `.bak` dosyası bırakılmaz; `tools/_backup/` altına taşınır.
- Repo kökünde geçici overlay README/TXT dosyası bırakılmaz; `docs/_archive/root-legacy/` altına alınır.
- Aynı işi yapan stale panel/route dosyaları canlı ağaçta tutulmaz; arşive taşınır.
- `tools/` kökünde sadece kanonik run/pack/check script’leri tutulur.
- Eski `apply_*`, `overlay_*`, `OVERLAY_*` ve tek seferlik hotfix script’leri `tools/_archive/` altına taşınır.
