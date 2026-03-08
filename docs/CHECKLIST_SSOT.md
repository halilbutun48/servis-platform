"
$raw = [System.IO.File]::ReadAllText($PSCommandPath, [System.Text.Encoding]::UTF8)
$idx = $raw.IndexOf($marker)
if ($idx -lt 0) { throw "content marker missing" }
$content = $raw.Substring($idx + $marker.Length)

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllText($target, $content.TrimStart("`r","`n"), $utf8NoBom)

Write-Host "✅ Updated (user SSOT): $target" -ForegroundColor Green

###__CONTENT_START__###
# SERVIS-PLATFORM — PERSONEL SERVİS V1/V2 — CHECKLIST (SSOT)

Timezone: Europe/Istanbul  
Last updated: **2026-03-06**  
Current GREEN ref: **v1-m41-green.\*** (Gate+Pack PASS)

Bu dosya iki amaç taşır:
1) **V1 Release/Regression Manuel Checklist** (M0→M41 + opsiyonel M42 hazırlığı)  
2) **V2 Yapılacaklar + V2 Test Ekleri** (V1 checklist üzerine eklenir)

**Yol Haritası (Sıralı)**
**Yol Haritası (Sıralı)**
- **Step 0:** V1 Manuel Checklist %100 PASS
- **Step 1 (V1.5):** Minimum Security (WAF + TOTP step-up + refresh reuse detection + RBAC SSOT test)
- **Step 2 (M43):** Google Auth (GIS) + Invite Gate (rol/scope güvenliği)
- **Step 2.5 (M44):** Telematics (Normalize Core + Direct HTTP Push + Vendor Cloud)
- **Step 2.6 (M45):** 2Y Retention + GPS geçmiş (50sn/50m) + Backup/PITR
- **Step 3 (V2):** V2-Scale → V2-Mobile Driver → V2-ProdOps → V2-FieldFeatures

> Kural: V1 checklist “regresyon paketi”dir; mümkün olduğunca stabil tutulur. Yeni özellikler önce V1.5/M43/V2 altına eklenir.


**Hesap/Üyelik Yetki Politikası (SSOT)**
- **SUPER_ADMIN:** tüm kullanıcı/rol/scope create + yönetim
- **ROOM:** **Driver create + bind** (operasyon) — başka rol create yok
- **COMPANY:** **Personel create** (login **opsiyonel**) + Personel invite (opsiyonel)
- **SCHOOL:** Student/Personel create + **Parent link yönetimi** + **Parent invite gönderme**  
  - Parent user hesabını **okul oluşturmaz** (self-serve invite ile parent kendi hesabını açar)
- **PARENT/PERSONEL/DRIVER:** hesap oluşturma yok


---

## 0) Test hazırlığı (ortak)

- [ ] 3 ayrı oturum aç (çakışmasın diye)
  - [ ] **COMPANY**: normal Chrome
  - [ ] **ROOM**: Incognito
  - [ ] **DRIVER**: farklı incognito / farklı profil
  - [ ] (opsiyonel) **SUPER_ADMIN**: ayrı profil
- [ ] Test boyunca aynı anda en az 2 panel açık tut (WS invalidate / realtime için)
- [ ] “Takıldım” anında kanıt topla:
  - [ ] 1 ekran görüntüsü
  - [ ] `docker logs --tail 200 personel_api`
  - [ ] (opsiyonel) `docker logs --tail 200 personel_redis`

---

# STEP 0 — V1 Manuel Check Runbook (M0→M41 + opsiyonel M42 hazırlığı)

## 0.1 Smoke (sistem ayakta mı?)
- [ ] Web açılıyor, login ekranı geliyor
- [ ] `/health` → `dbOk=true`
- [ ] UI temel sayfaları render oluyor (boş beyaz ekran yok)

**Beklenen:** UI açılır, API ayakta, DB ok.

---

## 0.2 Rol bazlı menü / yetki (RBAC görsel + erişim)
Her rolde login ol:
- [ ] SUPER_ADMIN
- [ ] ROOM
- [ ] COMPANY
- [ ] DRIVER
- [ ] PERSONEL

Kontrol:
- [ ] Menüde **sadece rolün yetkili olduğu sayfalar** görünüyor
- [ ] Yetkisiz route URL ile açılınca **403/redirect**
- [ ] `/admin` sadece **SUPER_ADMIN** (menüde görünür + sayfa açılır)

**Beklenen:** RBAC görünür ve server-side enforce.

---

## 0.3 Auth – M41 (refresh / logout / revoke / device binding)
- [ ] COMPANY panelinde F5 / refresh → oturum düşmeden devam
- [ ] Logout → geri tuşu ile korumalı sayfaya dön → login’e atmalı
- [ ] Logout/revoke sonrası eski token ile API çağrısı → 401
- [ ] DRIVER: aynı hesapla başka profil/browser giriş → **403 DEVICE_MISMATCH**

**Beklenen:** Sessiz refresh, logout sonrası erişim yok, device bind çalışıyor.

---

## 0.4 KVKK Consent Gate – M38 (kritik)
KVKK **revoke** iken:
- [ ] Parent live ekranı / endpoint → blok
- [ ] Driver GPS post / live → blok
  - **Beklenen:** `403 KVKK_CONSENT_REQUIRED`

KVKK **accept** sonrası:
- [ ] Aynı ekranlar açılır, live veri gelir
  - **Beklenen:** blok kalkar.

---

## 0.5 Agreement akışı – M17/M18 (operasyon)
- [ ] COMPANY → Agreements: “kısa süre preset” ile 1 günlük agreement oluştur → listede görünür
- [ ] ROOM → Agreements: approve + vehicle+driver ata
  - [ ] Conflict yoksa onaylanır; conflict varsa UI doğru gösterir
- [ ] 1–2 dk içinde Shifts listesinde agreement kaynaklı shift oluşur (en az “bugün”)
- [ ] Agreement’lı shiftlerde:
  - [ ] offer/pazarlık UI kapalı
  - [ ] `agreementId` badge görünüyor

**Beklenen:** Agreement onayı sonrası generator shift üretir; offer kapalıdır.

---

## 0.6 Offer akışı (agreement dışı)
- [ ] COMPANY: market/requested shift oluştur
- [ ] 1+ ROOM’a offer gönder
- [ ] ROOM: counter/accept/reject dene
- [ ] COMPANY: karar ver (accept)

**Beklenen:** shift “approved but not assigned” kalmaz; atanmış araç/driver görünür.

---

## 0.7 Route/Stops + OSRM doğruluğu
- [ ] OUTBOUND (Hub → dağıtım): preview’da **ilk nokta hub**
- [ ] INBOUND (Toplama → hub): preview’da **son nokta hub**
- [ ] Stop order / stop sayısı UI’da doğru
- [ ] Preview ile persist (DB) aynı tutarlı

**Beklenen:** Direction kuralları doğru, stop order tutarlı.

---

## 0.8 Live + WS + GPS (gerçek zaman)
- [ ] DRIVER: shift start
- [ ] Driver’da GPS akıyor (live telemetry)
- [ ] COMPANY/ROOM live panelde araç hareketi görünür
- [ ] Sekmeler arası gezinince WS invalidate doğru (bayat veri kalmıyor)

**Beklenen:** canlı akış var; paneller kendi kendine güncellenir.

---

## 0.9 Rate-limit / throttle mini stres testi
- [ ] DRIVER tarafında 10–20 sn “çok hızlı” GPS update dene (varsa)
- [ ] Sistem çökmez, login kilitlenmez
- [ ] 429/rate-limit olursa UI “patlamadan” düzgün hata gösterir

**Beklenen:** throttle devrede; kullanıcı oturumu etkilenmez.

---

## 0.10 Audit / Logs / Retention (M39–M40)
- [ ] Log export (user/admin) çalışır
- [ ] AuditLog’da **LOG_EXPORT** kaydı var
- [ ] Retention dryRun çalışır
- [ ] Audit’te **RETENTION_RUN** var

**Beklenen:** export ve retention audit izleri oluşur.

---

## 0.11 M19 Learning (ek)
Aynı **routeKey** ile 3 kez DONE:
- [ ] 1. koşu → `sampleCount=1`
- [ ] 2. koşu → `sampleCount=2`
- [ ] 3. koşu → `source=LEARNED` (>=3)

Negatif:
- [ ] stop order/hub değiştir → yeni routeKey → sayaç yeniden başlar

**Beklenen:** 3’te LEARNED’e döner.

---

## 0.12 M42 (opsiyonel hazırlık) — “kapalıyken sorun çıkarmıyor”
- [ ] `FEATURE_CHECKIN=0` iken sistem GREEN kalır (Gate+Pack PASS)
- [ ] `/api/checkin/*` feature kapalıyken “disabled” (tasarım gereği)

**Beklenen:** V1 stabil; M42 sadece hazırlık.

---

# STEP 1 — V1.5 Minimum Security (V2’den ÖNCE)

Amaç: V2 refactor’a girmeden önce **prod-grade taban**.

## 1.1 WAF (Cloudflare/AWS WAF)
- [ ] `/api/auth/login` brute force / bot kuralı
- [ ] Path-bazlı rate-limit (login, gps, export)
- [ ] (opsiyonel) geo/ASN anomali kuralları
- [ ] False-positive kontrolü (meşru loginleri kilitlemesin)

## 1.2 2FA (TOTP) + Step-up
- [ ] ROOM + SUPER_ADMIN için **zorunlu TOTP**
- [ ] COMPANY için **opsiyonel**; riskli login’de step-up
- [ ] (opsiyonel) SMS sadece **fallback**

## 1.3 Refresh reuse detection
- [ ] Aynı refresh token ikinci kez kullanılırsa: tüm session revoke + audit

## 1.4 RBAC matrisi SSOT + test
- [ ] Endpoint→Role matrisi (tek tablo)
- [ ] Otomatik test: allow/deny doğrulama
- [ ] Prod’da deny-by-default politikası

**Çıkış kriteri:** V1 regresyon + bu 4 madde PASS.

---

# STEP 2 — M43 Google Auth (GIS) + Invite Gate (Rol/Scope güvenliği)

## 2.x Invite modeli (kritik güvenlik kuralı)

**Karar:**  
- Parent hesabı **self-serve invite** (SCHOOL parent hesabı create etmez)  
- Company personel için login hesabı **opsiyonel** (personel kaydı her zaman var; login sadece invite ile)

**Invite tipleri**
- [ ] `PARENT_INVITE` (SCHOOL → Parent)
- [ ] `PERSONEL_INVITE` (COMPANY → Personel)
- [ ] (opsiyonel) `ROOM_USER_INVITE` (ROOM → room içi ikinci kullanıcı)

**Invite alanları (DB)**
- [ ] `email` veya `phone` (en az biri)
- [ ] `role` (PARENT/PERSONEL/ROOM_USER)
- [ ] `companyId` / `roomId` (scope)
- [ ] `personelId` (PERSONEL invite ise) veya `childPersonelId` (PARENT invite ise)
- [ ] `expiresAt`, `consumedAt`, `createdAt`, `createdByUserId`
- [ ] `tokenHash` (raw token tutulmaz)

**Accept akışı**
- [ ] Invite kabulü → kullanıcı Google ile veya şifre ile giriş yapar
- [ ] `PARENT_INVITE` accept:
  - [ ] parent user oluştur/bağla (role=PARENT, scope=school/company)
  - [ ] ParentChild link aktif edilir
- [ ] `PERSONEL_INVITE` accept:
  - [ ] personel user oluştur/bağla (role=PERSONEL, personelId ile)
- [ ] Invite yoksa:
  - [ ] `INVITE_REQUIRED` (default politika)

**Test**
- [ ] Invite ile login → doğru role/scope
- [ ] Invite yok → reject
- [ ] SCHOOL parent create edemez; sadece invite+link yönetir
- [ ] COMPANY personel login opsiyonel: invite olmadan personel listesi yönetilebilir

Amaç: Google ile giriş/üyelik **UX** sağlar; rol/scope **invite** ile güvenli atanır.

## 2.1 Backend
- [ ] `POST /api/auth/google` (idToken doğrula)
- [ ] `UserIdentity(provider, providerSub)` ile link
- [ ] Invite varsa: user create + rol/scope bağla
- [ ] Invite yoksa: “INVITE_REQUIRED” (veya pending politika)
- [ ] M41 refresh session üretimi + driver için device binding uygulanır
- [ ] Audit: `AUTH_OAUTH_LOGIN`, `INVITE_ACCEPT`

## 2.2 DB
- [ ] `UserIdentity` tablosu (önerilen) **veya** User’a oauth alanları (hızlı)
- [ ] `Invite` tablosu: email, role, companyId/roomId, expiresAt, consumedAt

## 2.3 Web UI
- [ ] GIS script + “Google ile giriş” butonu / One Tap
- [ ] Invite yoksa kullanıcıya açıklayıcı ekran

## 2.4 Test
- [ ] Invite ile Google login → doğru role/scope
- [ ] Invite yok → reject
- [ ] Driver device mismatch + OAuth birleşimi bozulmuyor

**Çıkış kriteri:** V1 regresyon + M43 testleri PASS.

---

# STEP 2.5 — M44 Araç Üzeri GPS Cihazı Entegrasyonu (Telematics)

Amaç: Sürücü telefon GPS’i yerine/yanında, araçta bulunan **GPS cihazı (tracker/telematics)** konumlarını sisteme almak.  
Hedef ölçek: **~1500 araç** (yük/anti-ddos açısından kritik).

> Bu iş en doğal olarak **V2-Scale (ingest ayrıştırma + queue/batch)** ile birlikte yapılır.  
> Ancak “cihaz belli değil, sistem hazır olsun” hedefi için M44’te **çekirdek + 2 connector** kurarız; sonra hangi vendor/cihaz gelirse sadece adapter ekleriz.

## 2.5.1 Mimari: Normalize Core + 2 Connector (hazır sistem)
- [ ] **Normalize Core**: tek bir “NormalizedPosition” hattı (dedupe/throttle/vehicle binding/KVKK/publish/db)
- [ ] **Connector-A (Direct HTTP Push)**: cihaz → bizim endpoint (cihaz HTTP/HTTPS POST atabiliyorsa)
- [ ] **Connector-B (Vendor Cloud)**: Arvento vb. vendor cloud → webhook **veya** poll worker

## 2.5.2 Kimlik & yetkilendirme (Device Auth)
- [ ] `GpsDevice` kaydı: `id`, `vendor`, `serial/imei`, `secretHash`, `vehicleId`, `status`, `lastSeenAt`
- [ ] Cihaz çağrılarında `Authorization: Device <token>` veya `x-device-key` (rotatable)
- [ ] Vendor webhook/poll için “provider token” (ayrı secret)
- [ ] Audit: `GPS_DEVICE_PROVISION`, `GPS_DEVICE_INGEST`, `GPS_VENDOR_INGEST`

## 2.5.3 Veri formatı (normalize + source priority)
- [ ] Normalized payload minimumu:
  - `{ vehicleId, at, lat, lng, speed?, heading?, accuracy?, source, deviceId?, vendor? }`
- [ ] Dedupe: aynı `at` + yakın konum tekrar yazma
- [ ] Source önceliği (config):
  - default: **DEVICE > PHONE**
  - fallback: DEVICE “stale” olursa PHONE’a düş
- [ ] “last known” ve history aynı kurala göre güncellenir

## 2.5.4 KVKK / yayın politikası (ingest ≠ publish)
- [ ] Ingest (veri alma) ile **yayın (live map/WS)** ayrıdır
- [ ] KVKK consent yoksa (önerilen “operational” mod):
  - [ ] ingest devam eder (operasyonel kayıt)
  - [ ] live publish/WS bloklanır (kullanıcıya gösterilmez)
- [ ] (opsiyonel) “strict” mod: ingest de bloklanır
- [ ] Seçilen mod checklist’te sabitlenir ve test edilir

## 2.5.5 Rate-limit / dayanıklılık (1500 araç için)
- [ ] Telematics endpoint’i ayrı bucket/store (Redis) ile limitlenir
- [ ] History sampling policy:
  - [ ] min 50sn **veya** min 50m (örnek) + burst drop
- [ ] Backpressure: queue dolarsa örnekleme/düşürme
- [ ] “ingest ayrı servis” (V2-Scale) ile ana API login/CRUD izolasyonu

## 2.5.6 Test
- [ ] Device simulator ile 1Hz/5Hz/10Hz akış
- [ ] Vendor simulator (webhook/poll) ile akış
- [ ] Aynı araçta phone+device aynı anda → “source priority + fallback” doğru
- [ ] KVKK revoke/accept → publish davranışı doğru (ingest/publish ayrımı)
- [ ] **1500 araç** cihaz akışı altında login/CRUD p95 hedefi bozulmuyor

---

# STEP 2.6 — M45 2 Yıl Log Retention + GPS Geçmiş (50sn) + Backup/PITR

Amaç: “Kanun/uyum” gereği **en az 2 yıl** saklanması gereken logları (Audit/API request vb.) güvenli şekilde tutmak; araç geçmişini de depolamayı patlatmadan sağlamak.

## 2.6.1 2 yıl saklanacak kayıtlar (minimum)
- [ ] `AuditLog`: **730 gün** (2 yıl) retention
- [ ] `ApiRequest`: **730 gün** (2 yıl) retention
- [ ] (opsiyonel) `Notification`: 180–365 gün (iş ihtiyacına göre)
- [ ] Log export / retention run işlemleri audit’lenir (zaten var: `LOG_EXPORT`, `RETENTION_RUN`)

## 2.6.2 GPS “geçmiş” stratejisi (1500 araç için önerilen: katmanlı)
> Tam ham GPS’i 2 yıl tutmak çok maliyetlidir. Öneri: **yakın dönem yüksek frekans**, uzun dönem **downsample**.

- [ ] **Last-known**: her ingest’te güncellenir (zaten var)
- [ ] **High-frequency history**: kısa süre tutulur (ör. 7–30 gün)
- [ ] **Downsample history (50sn / 50m)**: 2 yıl tutulur  
  - [ ] kural: aynı araç için history yazımı **min 50 saniye** veya **min 50 metre**
  - [ ] hedef: UI “geçmiş rota/iz” için yeterli doğruluk + makul storage

## 2.6.3 DB/Partition + Retention job
- [ ] GPS history tabloları için **partition** (aylık/haftalık) stratejisi
- [ ] Retention job:
  - [ ] 730 günden eski `ApiRequest`/`AuditLog` temizle
  - [ ] HF GPS partition’ları kısa retention’a göre temizle
  - [ ] Downsample GPS partition’ları 730 gün sonra temizle
- [ ] Admin endpoint: `POST /api/admin/retention/run` (mevcut) → kapsamı bu politikalara genişletilir

## 2.6.4 Backup / Restore (PITR önerisi)
> “Her 50 saniyede full backup” pratik değil. Bunun yerine **PITR (WAL archiving)** + periyodik base backup önerilir.

- [ ] Günlük base backup + WAL archiving (Point-in-Time Recovery)
- [ ] Haftalık doğrulama: restore testi (staging)
- [ ] Şifreleme (at-rest) + erişim kontrolü (least privilege)
- [ ] Runbook: “disaster recovery” adımları

## 2.6.5 Test
- [ ] Retention dryRun → kaç kayıt silinecek doğru raporlanır
- [ ] Retention gerçek run (staging) → sadece hedef tablolar etkilenir
- [ ] GPS downsample kuralı (50sn/50m) doğru uygulanır
- [ ] Restore testi: base backup + WAL ile belirli zamana dönüş yapılabilir

---

# STEP 3 — V2 Plan (V1 + V1.5 + M43 sonrası)

## 3.1 V2-Scale (Önerilen ilk hedef)
### Yapılacaklar
- [ ] GPS ingest’i ana API’dan ayır (ayrı service / ayrı process)
- [ ] Queue/stream ile ingest → worker → batch write
- [ ] DB: GPS history partition/timeseries (sorgu hız + retention)
- [ ] Live/read endpointleri için kısa TTL Redis cache
- [ ] Socket.IO: Redis adapter + fanout limit + delta updates

### Test
- [ ] 500/1000/1500 araç simülasyonu (load pack)
- [ ] Backpressure: GPS flood → login/CRUD p95 bozulmamalı
- [ ] WS fanout: disconnect rate kontrol

---

## 3.2 V2-Mobile Driver (Phase 1/Phase 2)

Amaç: Mobil sürücü uygulamasını **V2-Scale sonrasında** devreye almak (offline/background yükünü kaldırabilecek altyapı hazırken).

### Phase 1 — Online Driver (hızlı değer)
- [ ] Login (M41 refresh ile uyumlu) + device binding policy (driver)
- [ ] Shift listesi + shift start/stop
- [ ] Canlı konum gönderimi (PHONE source) + live map görüntüsü
- [ ] Basit hata/tekrar deneme (retry) + kullanıcı dostu mesajlar

### Phase 2 — Offline + Background (saha stabilitesi)
- [ ] Offline queue (gps + check-in eventleri) → online olunca flush
- [ ] Background location (OS izinleri + enerji optimizasyonu)
- [ ] “Stale/offline” durumları ile uyumlu UI
- [ ] (Opsiyonel) Push onay (yeni cihaz/şüpheli login step-up), passkey/biometric

### Mobil test ekleri
- [ ] Uçtan uca senaryo: start → live → done
- [ ] Offline 10 dk → online flush (kayıp yok, duplicate yok)
- [ ] Background 1 saat → batarya/ısı/bağlantı stabil
- [ ] 1500 araç yük altında mobil login/shift ekranı gecikmiyor

---

## 3.3 V2-ProdOps (SLO/Alarm)
- [ ] SLO dashboard: p95 latency, error rate, ws disconnect, gps ingest lag, db connections
- [ ] Alarm kuralları (login 5xx, gps lag, redis memory, db pool)
- [ ] Runbook/rollback

---

## 3.4 V2-FieldFeatures
- [ ] Learning v2 (sabah/akşam segment, kalite skoru, drift)
- [ ] Check-in (QR/NFC) ürünselleştirme (feature flag + company-level enable)

---

## 3.5 V2 Definition of Done
- [ ] V1 checklist %100 PASS (regresyon)
- [ ] V1.5 minimum security PASS
- [ ] M43 PASS (varsa)
- [ ] V2 ek testler PASS + load test raporu
- [ ] SLO+alarmlar prod’da aktif
- [ ] Rollback planı ve veri migrasyon planı hazır

---

## 4) Notlar / kararlar
- Tek Guided Mode/Stepper; diğerleri Advanced
- Değişiklikler mümkün olduğunca tek seferde overlay (zip)
- Yanıtlarda en fazla 3 PowerShell komutu (sohbet standardı)

## Passenger Live Link

- Passenger Live Link (login-optional): COMPANY/SCHOOL tekil süreli canlı takip linki üretebilir; public link sadece ilgili kişi için kendi durak + ETA + navigasyon gösterir; revoke/expire desteklidir.
