# SERVIS-PLATFORM — PERSONEL SERVİS V1/V2 — CHECKLIST (SSOT)

Timezone: Europe/Istanbul  
Last updated: **2026-03-07**  
Current GREEN ref: **v1-m41-green.* + M42 optional release**

Bu dosya iki amaç taşır:
1) **V1 Release/Regression Manuel Checklist** (M0→M41 ana regresyon)  
2) **M42 Optional Release + V2 Ekleri** (ana regresyonu bozmadan ayrı doğrulanır)

**Yol Haritası (Sıralı)**
- **Step 0:** V1 Manuel Checklist %100 PASS
- **Step 0.5 (M42):** Check-in modülü **tamam ama opsiyonel release**
- **Step 1 (V1.5):** Minimum Security (WAF + TOTP step-up + refresh reuse detection + RBAC SSOT test)
- **Step 2 (M43):** Google Auth (GIS) + Invite Gate (rol/scope güvenliği)
- **Step 2.5 (M44):** Telematics (Normalize Core + Direct HTTP Push + Vendor Cloud)
- **Step 2.6 (M45):** 2Y Retention + GPS geçmiş (50sn/50m) + Backup/PITR
- **Step 3 (V2):** V2-Scale → V2-Mobile Driver → V2-ProdOps → V2-FieldFeatures

> Kural: `tools/pack.ps1 -To 41` ana kanıttır. M42 bunun üstüne **ayrı optional pack** ile doğrulanır; ana pack zorla M42’ye yükseltilmez.

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
- **Default OFF**: `FEATURE_CHECKIN=0`
- **Optional release ON**: `FEATURE_CHECKIN=1`
- Ana regresyonu bozmaz; ayrı doğrulama ile kanıtlanır.

## OFF mod doğrulaması
- [ ] `FEATURE_CHECKIN=0` iken `tools/pack.ps1 -To 41` PASS
- [ ] `/api/checkin/*` erişiminde fail-closed davranış var
- [ ] UI/diğer modüllerde yan etki yok

## ON mod doğrulaması
- [ ] `FEATURE_CHECKIN=1` ile base M41 pack yine PASS
- [ ] M42 optional check PASS
- [ ] COMPANY/SCHOOL panelinde QR görseli oluşuyor
- [ ] DRIVER panelinde kamera ile QR okutma çalışıyor (destek varsa)
- [ ] credential issue → scan → dedupe → revoke akışı PASS
- [ ] room/company event listesi çalışıyor
- [ ] audit aksiyonları yazılıyor (`CREDENTIAL_ISSUE`, `CREDENTIAL_REVOKE`, `CHECKIN_SCAN`)

## Kanonik komut
- [ ] `tools/pack_m42_optional.ps1` PASS

**Beklenen:** M42 açılınca çalışan modül; kapalıyken ana sistemi etkilemeyen dormant feature.

---

# STEP 1 — V1.5 Minimum Security
- [ ] WAF login/gps/export path limitleri
- [ ] ROOM + SUPER_ADMIN zorunlu TOTP
- [ ] refresh reuse detection
- [ ] RBAC matrisi + deny-by-default testleri

---

# STEP 2 — M43 Google Auth + Invite Gate
- [ ] invite tablosu / accept akışı
- [ ] Google auth role/scope bağlama
- [ ] invite yoksa reject

---

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

# STEP 3 — V2
- [ ] V2-Scale
- [ ] V2-Mobile Driver
- [ ] V2-ProdOps
- [ ] V2-FieldFeatures

---

## Notlar
- Tek Guided Mode/Stepper; diğerleri Advanced
- Değişiklikler mümkün olduğunca tek seferde overlay (zip)
- Yanıtlarda en fazla 3 PowerShell komutu


## SCHOOL Parent Invite
- [ ] `#/school/parents` paneli açılıyor
- [ ] öğrenci seçip invite link üretilebiliyor
- [ ] panel parent id / şifre göstermiyor
- [ ] public invite accept akışı parent hesabı oluşturuyor

- Manual smoke sonucu: Driver kamera UI açılıyor; destek olmayan desktop/tarayıcıda fallback mod kabul. Parent invite revoke/expired/used/not-found durumları artık formu kapatır. Public paylaşım linki için `VITE_PUBLIC_BASE_URL` kullanılır.
