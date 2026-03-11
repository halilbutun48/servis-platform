# SERVIS-PLATFORM — PERSONEL SERVİS V1/V2 — CHECKLIST (SSOT)

Timezone: Europe/Istanbul  
Last updated: **2026-03-11**  
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
- **M44 TELEMATICS PACK PASS OK**
- **M45 RETENTION + BACKUP PACK PASS OK**
- **M46 AI COPILOT FOUNDATION PACK PASS OK**
- **M46.1 AI COPILOT ENRICHMENT PACK PASS OK**
- **M46.2 AI COPILOT INTENT EXPANSION PACK PASS OK**

Bu dosya iki amaç taşır:
1) **V1 Release/Regression Manuel Checklist** (M0→M41 ana regresyon)  
2) **M42 Optional Release + Step 0.6 + Step 1 + Step 2 / Step 3 sonrası ekler** (ana regresyonu bozmadan ayrı doğrulanır)

**Yol Haritası (Sıralı)**
- **Step 0:** V1 Manuel Checklist %100 PASS
- **Step 0.5 (M42):** Check-in modülü **tamam ama opsiyonel release**
- **Step 0.6:** Stabil ekler **ayrı pack ile resmi doğrulanmış**
- **Step 1:** Minimum Security **resmi green**
- **Step 2 (M43):** Google Auth (GIS) + Invite Gate (rol/scope güvenliği) **resmi green**
- **Step 2.5 (M44):** Telematics (Normalize Core + Direct HTTP Push + Vendor Cloud) **resmi green**
- **Step 2.6 (M45):** 2Y Retention + GPS geçmiş + Backup/PITR **resmi green**
- **Step 3 (M46):** AI Copilot Foundation **resmi green**
- **Step 3.1 (M46.1):** AI Copilot Enrichment **resmi green**
- **Step 3.2 (M46.2):** AI Copilot Intent Expansion **resmi green**
- **Step 3.3:** Sonraki AI katmanı / M46.3 **henüz sabitlenmedi**

> Kural: `tools/pack.ps1 -To 41` ana kanıttır.  
> M42 bunun üstüne **ayrı optional pack** ile doğrulanır.  
> Step 0.6 ve Step 1 hatları da **ayrı pack/check setleriyle resmi olarak doğrulanmıştır**.  
> Repo hijyen tarafında M104 + M105 + M106 cleanup/check setleri PASS durumundadır.  
> M43, M44, M45, M46, M46.1 ve M46.2 hatları runtime + repo-contract + tek pack ile PASS durumundadır.  
> Üst milestone’lar alt milestone check’lerini bozmayacak şekilde ilerletilir.  
> Overlay standardı: **tek zip / tek kök klasör / nested root yok**.

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

**Çıkış kriteri:** Security Foundation + TOTP pack/check PASS.

---

# STEP 2 — M43 Google Auth + Invite Gate — RESMİ GREEN
- [ ] `tools/pack_m43_google_auth_invite_gate.ps1` PASS
- [ ] `tools/check_m43_google_auth_invite_gate_repo_contract.ps1 -RepoRoot D:\servis-platform` PASS
- [ ] `POST /api/auth/google` çalışıyor
- [ ] `Invite` + `UserIdentity` akışı doğru
- [ ] invite yoksa kabul yok
- [ ] role/scope bağlı kabul korunuyor

# STEP 2.5 — M44 Telematics — RESMİ GREEN
- [ ] `tools/pack_m44_telematics.ps1` PASS
- [ ] `tools/check_m44_telematics_repo_contract.ps1 -RepoRoot D:\servis-platform` PASS
- [ ] `POST /api/telematics/push` çalışıyor
- [ ] `POST /api/telematics/vendor/:provider` çalışıyor
- [ ] `GpsDevice` create/list/patch/rotate çalışıyor
- [ ] ROOM > Vehicles > Telematics akışı çalışıyor

# STEP 2.6 — M45 Retention + Backup — RESMİ GREEN
- [ ] `tools/pack_m45_retention_backup.ps1` PASS
- [ ] `tools/check_m45_retention_backup_repo_contract.ps1 -RepoRoot D:\servis-platform` PASS
- [ ] retention policy görünürlüğü var
- [ ] backup policy + manifest görünürlüğü var
- [ ] dryRun/run audit izi var
- [ ] create/restore tool hattı çalışıyor
- [ ] tools\backup_create_m45.ps1 mevcut
- [ ] tools\backup_restore_m45.ps1 mevcut

# STEP 3 — M46 AI Copilot Foundation — RESMİ GREEN
- [ ] `tools/pack_m46_ai_copilot.ps1` PASS
- [ ] `tools/check_m46_ai_copilot_repo_contract.ps1 -RepoRoot D:\servis-platform` PASS
- [ ] `POST /api/ai/copilot` çalışıyor
- [ ] read-only / suggestion-first davranış korunuyor
- [ ] `AI_COPILOT_QUERY` audit izi var
- [ ] ROOM + SUPER_ADMIN için step-up guard var

# STEP 3.1 — M46.1 AI Copilot Enrichment — RESMİ GREEN
- [ ] `tools/pack_m46_1_ai_copilot_enrichment.ps1` PASS
- [ ] `tools/check_m46_1_ai_copilot_enrichment_repo_contract.ps1 -RepoRoot D:\servis-platform` PASS
- [ ] `copilotVersion` mevcut
- [ ] `severity / blocks / nextChecks / references` üretiliyor
- [ ] UI’da `Kopyala özet` + `Kopyala not` + `Son 5 analiz` var

# STEP 3.2 — M46.2 AI Copilot Intent Expansion — RESMİ GREEN
- [ ] `tools/pack_m46_2_ai_copilot_intent_expansion.ps1` PASS
- [ ] `tools/check_m46_2_ai_copilot_intent_expansion_repo_contract.ps1 -RepoRoot D:\servis-platform` PASS
- [ ] yeni intentler çalışıyor:
  - [ ] `ASSIGNMENT_READINESS`
  - [ ] `OFFER_DECISION_HELP`
  - [ ] `GPS_SIGNAL_DIAGNOSIS`
- [ ] `intentLabel` + `entityLabel` üretiliyor
- [ ] `scope.summary` + `highlights` üretiliyor
- [ ] zengin `references` + `nextChecks` korunuyor
- [ ] UI’da hızlı seçim araması çalışıyor
- [ ] UI’da highlights bölümü görünüyor
- [ ] UI’da scope summary görünüyor
- [ ] read-only / suggestion-first çizgisi korunuyor
- [ ] audit ve step-up davranışı korunuyor

---

## Kapanış kuralı
- Ana referans yine **M41 PACK PASS**’tir.
- Üst katmanlar ayrı resmi green hatları olarak korunur.
- Yeni AI milestone’ları M46 → M46.1 → M46.2 çizgisini ve alt check uyumluluğunu bozmadan ilerlemelidir.

