# SERVIS-PLATFORM — PERSONEL SERVİS V1/V2 — CHECKLIST (SSOT)

Timezone: Europe/Istanbul  
Last updated: **2026-03-10**  
Current GREEN ref:
- **M41 PACK PASS**
- **M42 OPTIONAL PACK PASS**
- **STEP 0.6 STABIL PACK PASS**
- **STEP 1 SECURITY FOUNDATION PACK PASS**
- **STEP 1 TOTP STEP-UP PACK PASS**
- **M104 REPO CLEANUP CHECK PASS**
- **M105 TOOLS HYGIENE CHECK PASS**
- **M106 REPO HYGIENE + LINK TTL CHECK PASS**
- **M43 GOOGLE AUTH + INVITE GATE PACK PASS OK**

Bu dosya iki amaç taşır:
1) **V1 Release/Regression Manuel Checklist** (M0→M41 ana regresyon)  
2) **M42 Optional Release + Step 0.6 + Step 1 + Step 2 sonrası ekler** (ana regresyonu bozmadan ayrı doğrulanır)

**Yol Haritası (Sıralı)**
- **Step 0:** V1 Manuel Checklist %100 PASS
- **Step 0.5 (M42):** Check-in modülü **tamam ama opsiyonel release**
- **Step 0.6:** Stabil ekler **ayrı pack ile resmi doğrulanmış**
- **Step 1:** Minimum Security **resmi green**
- **Step 2 (M43):** Google Auth (GIS) + Invite Gate (rol/scope güvenliği) **resmi green**
- **Step 2.5 (M44):** Telematics (Normalize Core + Direct HTTP Push + Vendor Cloud)
- **Step 2.6 (M45):** 2Y Retention + GPS geçmiş (50sn/50m) + Backup/PITR
- **Step 3 (V2):** V2-Scale → V2-Mobile Driver → V2-ProdOps → V2-FieldFeatures

> Kural: `tools/pack.ps1 -To 41` ana kanıttır.  
> M42 bunun üstüne **ayrı optional pack** ile doğrulanır.  
> Step 0.6 ve Step 1 hatları da **ayrı pack/check setleriyle resmi olarak doğrulanmıştır**.  
> Son TOTP pack satırı logda kesilmiş olsa da runtime + repo-contract PASS görüldüğü için Step 1 green kabul edilir.  
> Repo hijyen tarafında M104 + M105 + M106 cleanup/check setleri de PASS durumundadır.
> M43 Google Auth + Invite Gate hattı da runtime + repo-contract + tek pack ile PASS durumundadır.

---

## 0) Test hazırlığı (ortak)

- [ ] COMPANY / ROOM / DRIVER ayrı oturumlar açık
- [ ] Aynı anda en az 2 panel açık (WS invalidate için)
- [ ] Takılınca kanıt topla:
  - [ ] ekran görüntüsü
  - [ ] `docker logs --tail 200 personel_api`
  - [ ] (opsiyonel) `docker logs --tail 200 personel_redis`

---

# STEP 0 — V1 Ana Regresyon (M0→M41)

## 0.1 Smoke
- [ ] Web açılıyor
- [ ] `/health` → `dbOk=true`
- [ ] temel sayfalar render oluyor

## 0.2 RBAC / route guard
- [ ] SUPER_ADMIN / ROOM / COMPANY / DRIVER / PERSONEL login
- [ ] Yetkisiz route → 403/redirect
- [ ] `/admin` sadece SUPER_ADMIN

## 0.3 Auth – M41
- [ ] refresh sonrası oturum düşmüyor
- [ ] logout sonrası korumalı sayfa açılmıyor
- [ ] revoke sonrası eski token 401
- [ ] driver farklı cihaz → `403 DEVICE_MISMATCH`

## 0.4 KVKK – M38
- [ ] revoke iken parent live blok
- [ ] revoke iken driver gps blok
- [ ] accept sonrası blok kalkıyor

## 0.5 Agreement
- [ ] agreement create
- [ ] room approve + vehicle/driver ata
- [ ] generated shift oluşuyor
- [ ] agreement badge var, offer UI kapalı

## 0.5.1 Link preset sanity
- [ ] school parent invite süre presetleri: `1 hafta / 1 ay / 6 ay / 1 yıl`
- [ ] company/school/organization personel canlı link presetleri: `1 hafta / 1 ay / 6 ay / 1 yıl`

## 0.6 Offer
- [ ] company market shift oluşturur
- [ ] room counter/accept/reject çalışır
- [ ] company accept sonrası shift assigned kalır

## 0.7 Route/Stops
- [ ] OUTBOUND ilk nokta hub
- [ ] INBOUND son nokta hub
- [ ] preview/persist tutarlı

## 0.8 Live / WS / GPS
- [ ] driver start
- [ ] gps akıyor
- [ ] company/room canlı panel güncelleniyor

## 0.9 Rate-limit mini stres
- [ ] hızlı gps spam sistemi kilitlemiyor
- [ ] 429 olursa UI kontrollü davranıyor

## 0.10 Audit / Retention
- [ ] log export audit izi var
- [ ] retention dryRun/run audit izi var

## 0.11 Learning – M19
- [ ] aynı routeKey 3 koşuda LEARNED’e dönüyor
- [ ] routeKey değişince sayaç sıfırlanıyor

**Çıkış kriteri:** `tools/pack.ps1 -To 41` PASS.

---

# STEP 0.5 — M42 Optional Release (Check-in)

## Karar
- M42 **hazır modüldür**; yarım hazırlık değildir.
- **Default OFF:** `FEATURE_CHECKIN=0`
- **Optional release ON:** `FEATURE_CHECKIN=1`
- Ana regresyonu bozmaz; ayrı doğrulama ile kanıtlanır.

## OFF mod doğrulaması
- [ ] `FEATURE_CHECKIN=0` iken `tools/pack.ps1 -To 41` PASS
- [ ] `/api/checkin/*` erişiminde fail-closed davranış var
- [ ] UI/diğer modüllerde yan etki yok

## ON mod doğrulaması
- [ ] `FEATURE_CHECKIN=1` ile base M41 pack yine PASS
- [ ] M42 optional check PASS
- [ ] credential issue → scan → dedupe → revoke akışı PASS
- [ ] room/company event listesi çalışıyor
- [ ] audit aksiyonları yazılıyor (`CREDENTIAL_ISSUE`, `CREDENTIAL_REVOKE`, `CHECKIN_SCAN`)
- [ ] Check-in nav görünürlüğü ilgili rollerde çalışıyor

## Kanonik komut
- [ ] `tools/pack_m42_optional.ps1` PASS

**Beklenen:** M42 açılınca çalışan modül; kapalıyken ana sistemi etkilemeyen dormant feature.

---

# STEP 0.6 — Stabil Ekler (resmi doğrulanmış)

## Durum
- [ ] `tools/pack_step06_stabil.ps1` PASS
- [ ] runtime mini-check PASS
- [ ] repo-contract PASS

## 0.6.1 Capacity / Pool / Split
- [ ] room approve ekranında kapasite yetersizse approve blok
- [ ] room pool summary doğru çalışıyor
- [ ] toplam eşleşebilir koltuk doğru hesaplanıyor
- [ ] araç yeterli / driver yetersiz ayrımı net
- [ ] `Böl & Onayla` gerçek müsait araç kombinasyonuna göre child shift üretiyor
- [ ] parent split kayıt pending/list akışını kirletmiyor

## 0.6.2 School / Parent Invite
- [ ] SCHOOL menüsünde Parent Link görünüyor
- [ ] parent invite link üretme çalışıyor
- [ ] invite geçmişi çalışıyor
- [ ] public accept-parent-invite akışı açılıyor
- [ ] accepted parent login olabiliyor
- [ ] parent `/api/me` doğrulanıyor

## 0.6.3 Shift Preview / External Navigation
- [ ] Shift Harita Önizleme’de `Tam Rotayı Dış Navigasyonda Aç` var
- [ ] `0,0` koordinatı navigasyona gitmiyor
- [ ] OUTBOUND: hub → duraklar
- [ ] INBOUND: duraklar → hub
- [ ] LOOP: hub → duraklar → hub
- [ ] preview notu görünüyor:
  - `Bu önizleme kuş uçuşu/mini görünüm mantığındadır. Kesin rota, km ve dönüşler için dış navigasyona bakın.`

## 0.6.4 Company List Click Details
- [ ] company listede araç plakası tıklanınca araç detay açılıyor
- [ ] company listede sürücü adı tıklanınca sürücü detay açılıyor
- [ ] araç/sürücü detail modal başlıkları mevcut

**Çıkış kriteri:** `tools/pack_step06_stabil.ps1` PASS.

---

# STEP 1 — V1.5 Minimum Security (resmi green)

## 1.1 Security Foundation
- [ ] refresh reuse detection
- [ ] export limiter
- [ ] login/gps/export limit hattı
- [ ] RBAC deny-by-default sanity matrix
- [ ] `tools/pack_step1_security_foundation.ps1` PASS

## 1.2 TOTP Step-up
- [ ] `ROOM` + `SUPER_ADMIN` için TOTP setup/enable/verify
- [ ] login response içinde `stepUpRequired`
- [ ] setup olmadan kritik write/admin endpointler blok
- [ ] verify sonrası geçici `stepUpUntil` ile erişim açılıyor
- [ ] `COMPANY` ve `DRIVER` bu guard’dan etkilenmiyor
- [ ] `tools/pack_step1_totp_stepup.ps1` PASS

## 1.3 Korunan ana alanlar
- [ ] `/api/admin`
- [ ] `/api/admin/logs`
- [ ] `/api/logs/export`
- [ ] `/api/vehicles`
- [ ] `/api/drivers`
- [ ] `/api/availability`
- [ ] `/api/shifts`

## 1.4 UI / Greenpack notu
- [ ] `web/src/panels/shared/TotpStepUpCard.jsx` mevcut
- [ ] greenpack/dev bypass mantığı legacy M0→M41 check’lerini bozmuyor
- [ ] gerçek TOTP runtime check bypass’sız koşuyor

**Çıkış kriteri:** Security Foundation + TOTP pack/check PASS.

> Not: Step 2 (M43) hattı bu repoda resmi olarak green kabul edilmiştir.

---

# STEP 2 — M43 Google Auth (GIS) + Invite Gate (Rol/Scope güvenliği) — RESMİ GREEN

## 2.x Invite modeli (kritik güvenlik kuralı)

**Karar:**
- [x] Parent hesabı **self-serve invite** mantığında ilerler; SCHOOL parent hesabı doğrudan create etmez
- [x] Company personel için login hesabı **opsiyonel**; personel kaydı her zaman var olabilir, login sadece invite ile açılır

**Invite tipleri**
- [x] `PARENT_INVITE` (SCHOOL → Parent)
- [x] `PERSONEL_INVITE` (COMPANY → Personel)
- [x] opsiyonel `ROOM_USER_INVITE` (ROOM → room içi ikinci kullanıcı)

**Invite alanları (DB)**
- [x] `email` veya `phone` (en az biri)
- [x] `role` (PARENT / PERSONEL / ROOM_USER)
- [x] `companyId` / `roomId` (scope)
- [x] `personelId` veya `childPersonelId`
- [x] `expiresAt`, `consumedAt`, `createdAt`, `createdByUserId`
- [x] `tokenHash` (raw token tutulmaz)

**Accept akışı**
- [x] Invite kabulü → kullanıcı Google ile veya şifre ile giriş yapar
- [x] `PARENT_INVITE` accept:
  - [x] parent user oluştur/bağla
  - [x] parent-child link aktif edilir
- [x] `PERSONEL_INVITE` accept:
  - [x] personel user oluştur/bağla
- [x] Invite yoksa varsayılan politika: `INVITE_REQUIRED`

**Güvenlik testi**
- [x] Invite ile login → doğru role/scope
- [x] Invite yok → reject
- [x] SCHOOL parent create edemez; sadece invite+link yönetir
- [x] COMPANY personel login opsiyonel: invite olmadan personel listesi yönetilebilir

## 2.1 Backend
- [x] `POST /api/auth/google` (idToken doğrula)
- [x] `UserIdentity(provider, providerSub)` ile link
- [x] Invite varsa: user create + rol/scope bağla
- [x] Invite yoksa: `INVITE_REQUIRED`
- [x] M41 refresh session üretimi + driver için device binding korunur
- [x] Audit: `AUTH_OAUTH_LOGIN`, `INVITE_ACCEPT`

## 2.2 DB
- [x] `UserIdentity` tablosu
- [x] `Invite` tablosu: email, role, companyId/roomId, personelId/childPersonelId, expiresAt, consumedAt, tokenHash

## 2.3 Web UI
- [x] GIS script + “Google ile giriş” butonu / One Tap
- [x] Invite yoksa kullanıcıya açıklayıcı ekran
- [x] Invite accept ve login akışı çakışmadan çalışır

## 2.4 Test / Pack
- [x] Invite ile Google login → doğru role/scope
- [x] Invite yok → reject
- [x] Driver device mismatch + OAuth birleşimi bozulmuyor
- [x] runtime check + repo-contract hazır
- [x] tek M43 pack ile kanıtlanır

**Kanıt:**
- [x] `tools/pack_m43_google_auth_invite_gate.ps1 -RepoRoot D:\servis-platform`
- [x] `tools/check_m43_google_auth_invite_gate_repo_contract.ps1 -RepoRoot D:\servis-platform`
- [x] `backend/scripts/m43_google_auth_invite_gate_check.js`

**Çıkış kriteri:** V1 regresyon + M43 testleri PASS.


# STEP 2.5 — M44 Telematics
- [ ] normalize core
- [ ] direct push connector
- [ ] vendor cloud connector
- [ ] source priority + fallback
- [ ] 1500 araç altında login/CRUD izolasyonu

---

# STEP 2.6 — M45 Retention / Backup
- [ ] AuditLog + ApiRequest 730 gün
- [ ] GPS downsample 50sn/50m
- [ ] partition + retention job
- [ ] base backup + WAL / PITR restore testi

---

# REPO HYGIENE — M104 Repo Audit + Cleanup

Amaç: canlı çalışma ağacını sadeleştirip yanlış dosyaya bakma riskini azaltmak.

- [x] aktif kaynak ağacındaki `.bak` dosyaları arşive taşınır
- [x] stale duplicate panel/route dosyaları canlı ağaçtan çıkarılır
- [x] repo kökündeki tek seferlik overlay/readme notları arşivlenir
- [x] public personel link akışı API/UI/DB/PROJECT SSOT dosyalarına işlenir
- [x] `tools/check_repo_cleanup_m104.ps1` ile hızlı repo hijyen kontrolü yapılır

> Not: Bu bölüm bakım/hijyen overlay'idir; resmi green referansını değiştirmez.

# STEP 3 — V2
- [ ] V2-Scale
- [ ] V2-Mobile Driver
- [ ] V2-ProdOps
- [ ] V2-FieldFeatures

---

# Bir sonraki net resmi iş
- [ ] M44 Telematics
- [ ] mevcut GPS/live/ws hattını bozmadan telematics normalize katmanı eklemek
- [ ] mevcut repo pattern’ine göre tek overlay zip hazırlanacak

# TOOLS HYGIENE — M105 Tools Canonical Cleanup
- [x] `tools/` kökünde yalnızca kanonik runtime / pack / check script'leri bırakılır
- [x] Eski `apply_*`, `overlay_*`, `OVERLAY_*` dosyaları `tools/_archive/legacy-overlays/` altına taşınır
- [x] Tek seferlik hotfix script'leri `tools/_archive/oneoff-hotfixes/` altına taşınır
- [x] Deprecated tools içi metin dosyaları `tools/_archive/legacy-docs/` altına taşınır
- [x] `tools/README.md` kanonik araç düzenini açıkça listeler
- [x] `tools/check_tools_hygiene_m105.ps1` PASS


# LINK TTL / PRIMER HYGIENE — M106
- [x] `tools/_overlay_payload/primer_refresh` canlı ağaçtan arşive taşınır
- [x] `infra/infra/solver/Dockerfile` stale duplicate’i arşive taşınır
- [x] Parent invite presetleri `1 hafta / 1 ay / 6 ay / 1 yıl` olur
- [x] Personel/öğrenci public link presetleri `1 hafta / 1 ay / 6 ay / 1 yıl` olur
- [x] Backend üst sınırları `365 gün` ile hizalanır
- [x] `tools/check_repo_hygiene_m106.ps1` PASS
