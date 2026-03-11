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
- ✅ `M43 GOOGLE AUTH + INVITE GATE PACK PASS OK`
- ✅ `M44 TELEMATICS PACK PASS OK`

Post-M44 uygulanan ekler:
- ✅ `M44.5 SSOT sync` uygulandı
- ✅ `M44.6 ROOM > Vehicles > Telematics UI` eklendi ve render doğrulandı
- ✅ ROOM panelden device oluşturulup demo direct push testi geçti

Ana kanıt komutları:
- `./tools/pack.ps1 -To 41`
- `./tools/pack_m42_optional.ps1`
- `./tools/pack_step06_stabil.ps1`
- `./tools/pack_step1_security_foundation.ps1`
- `./tools/pack_step1_totp_stepup.ps1`
- `./tools/check_repo_cleanup_m104.ps1 -RepoRoot D:\servis-platform`
- `./tools/check_tools_hygiene_m105.ps1 -RepoRoot D:\servis-platform`
- `./tools/check_repo_hygiene_m106.ps1 -RepoRoot D:\servis-platform`
- `./tools/pack_m43_google_auth_invite_gate.ps1 -RepoRoot D:\servis-platform`
- `./tools/pack_m44_telematics.ps1 -RepoRoot D:\servis-platform`

Notlar:
- Step 1 TOTP green kabulü korunuyor; setup/verify hattı çalışıyor.
- Step 2 resmi olarak M43 ile tamamlandı.
- Step 2.5 resmi olarak M44 ile tamamlandı.
- M44.6 için ayrı resmi pack hattı yok; UI render + manuel demo ile doğrulandı.
- Overlay standardı: tek zip, tek kök klasör, nested root yok.

---

## 1) Resmi olarak yeşil olan kapsam

### 1.1 V1 ana regresyon
- auth / refresh / revoke / device mismatch
- RBAC / route guard
- agreement
- offer / counter / accept
- route / stops
- live / ws / gps
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
- login / gps / export limit hattı
- RBAC deny-by-default sanity matrix

Kanıt:
- `STEP 1 SECURITY FOUNDATION PACK PASS`

### 1.5 Step 1 TOTP Step-up
- `ROOM` + `SUPER_ADMIN` için TOTP setup / enable / verify
- login response içinde `stepUpRequired`
- setup olmadan kritik write/admin endpointler blok
- verify sonrası geçici `stepUpUntil` ile erişim açılıyor
- `COMPANY` ve `DRIVER` bu guard’dan etkilenmiyor

Kanıt:
- `STEP 1 TOTP STEP-UP CHECK PASS`
- `STEP 1 TOTP STEP-UP REPO CONTRACT PASS`

### 1.6 Step 2 — M43 Google Auth + Invite Gate
Kapsam:
- Google Auth backend hattı
- `UserIdentity` + `Invite` modeli
- generic invite / accept akışı
- invite yoksa kabul yok
- role / scope bağlı kabul
- Company / Room tarafında auth invite yönetimi
- public `accept-invite` paneli
- parent invite akışında Google ile kabul desteği
- repo-contract + runtime check + tek pack hattı

Önemli davranış:
- Google login açık olsa bile erişim invite / scope / profile bağlama kurallarıyla sınırlı
- hali hazırda başka user’a bağlı profile tekrar bağlanamaz
- local login modeli tamamen kaldırılmadı; var olan email+şifre akışı korunuyor
- `PERSONEL` için login zorunluluğu getirilmedi; public link modeli korunuyor

Kanıt:
- `M43 GOOGLE AUTH + INVITE GATE CHECK PASS`
- `M43 GOOGLE AUTH + INVITE GATE REPO CONTRACT PASS`
- `M43 GOOGLE AUTH + INVITE GATE PACK PASS OK`

### 1.7 Step 2.5 — M44 Telematics
Kapsam:
- telematics normalize core
- direct device HTTP push
- vendor cloud adapter endpoint
- `GpsDevice` modeli + `Vehicle.gpsDevices` ilişkisi
- provider normalize katmanı
- raw/vendor payload → kanonik GPS/event hattı
- audit + limiter + history gate entegrasyonu
- runtime check + repo-contract + tek pack hattı

Yeni backend yetenekleri:
- `POST /api/telematics/push`
- `POST /api/telematics/vendor/:provider`
- `GET /api/telematics/devices`
- `POST /api/telematics/devices`
- `PATCH /api/telematics/devices/:id`
- `POST /api/telematics/devices/:id/rotate`

Önemli davranış:
- mevcut driver app GPS akışı korunur
- telematics ek kaynak olarak çalışır
- device token hash mantığı kullanılır; ham token sadece create/rotate anında gösterilir
- vendor secret gerekir
- GPS live/history hattına entegre yazım yapılır
- mevcut WS/room/company akışı bozulmaz

Kanıt:
- `M44 TELEMATICS CHECK PASS`
- `M44 TELEMATICS REPO CONTRACT PASS`
- `M44 TELEMATICS PACK PASS OK`

### 1.8 M44.6 UI eki — ROOM Vehicles Telematics
Kapsam:
- `ROOM > Vehicles` içine `Telematics` sekmesi
- araç bazlı device oluşturma
- device listeleme
- `label` / `status` güncelleme
- token rotate
- create/rotate sonrası ham token tek seferlik gösterim

Manuel doğrulama:
- UI render görüldü
- ROOM panelden device oluşturuldu
- gerçek token ile `/api/telematics/push` demo testi geçti
- iki ayrı konum push edilerek `GpsLast/history` yazımı doğrulandı

Not:
- bu kısım için ayrı resmi pack/check hattı yok; mevcut doğrulama manuel demo + ekran doğrulaması ile yapıldı

---

## 2) Personel ve parent link politikası

### 2.1 Parent invite TTL
Presetler:
- `1 hafta`
- `1 ay`
- `6 ay`
- `1 yıl`

Backend üst sınır:
- `365 gün`

### 2.2 Personel public canlı link TTL
Presetler:
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
- M43 bu kararı değiştirmez

---

## 3) Repo ve tools hijyen durumu

### 3.1 M104 Repo Cleanup
Temizlenen / archivelenen ana kalemler:
- stale duplicate route / panel dosyaları
- `.bak` artık dosyaları
- root stray `src/`, `scripts/`, `rlays/`
- dağınık legacy README / TXT kalıntıları

Sonuç:
- kanonik canlı ağaç korunmuş
- stale path’ler archive altına taşınmış
- `M104 REPO CLEANUP CHECK PASS`

### 3.2 M105 Tools Canonical Cleanup
`tools/` kökünde kanonik hat:
- `pack*`
- `gate*`
- `reset-and-pack.ps1`
- kanonik `check_*`
- `README.md`
- `PRIMER_SNAPSHOT.md`
- `CHECKLIST_SSOT.md`
- `STABLE_TO.txt`

Legacy overlay / apply / readme kalıntıları:
- `tools/_archive/legacy-overlays/`
- `tools/_archive/oneoff-hotfixes/`
- `tools/_archive/legacy-docs/`

Sonuç:
- `M105 TOOLS HYGIENE CHECK PASS`

### 3.3 M106 Repo Hygiene + Primer / TTL Sync
Ek temizlenenler:
- `tools/_overlay_payload/primer_refresh`
- `infra/infra/solver/Dockerfile`

Senkronlananlar:
- primer / startpack / checklist
- parent / personel TTL politikası
- kanonik checker hattı

Sonuç:
- `M106 REPO HYGIENE + LINK TTL CHECK PASS`

### 3.4 M44.5 SSOT Sync
Senkronlananlar:
- `tools/PRIMER_SNAPSHOT.md`
- `docs/PRIMER_SSOT.md`
- `docs/CHECKLIST_SSOT.md`
- `tools/CHECKLIST_SSOT.md`
- `docs/STARTPACK_V1.md`
- `tools/README.md`

Sonuç:
- M44 green sonrası SSOT hattı senkron

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

M43 ile gelen araçlar:
- `tools/pack_m43_google_auth_invite_gate.ps1`
- `tools/check_m43_google_auth_invite_gate_repo_contract.ps1`
- `backend/scripts/m43_google_auth_invite_gate_check.js`

M44 ile gelen araçlar:
- `tools/pack_m44_telematics.ps1`
- `tools/check_m44_telematics_repo_contract.ps1`
- `backend/scripts/m44_telematics_check.js`

Overlay / cleanup notları:
- `docs/overlays/OVERLAY_NOTES_M104_REPO_AUDIT_CLEANUP_2026-03-10.md`
- `docs/overlays/OVERLAY_NOTES_M105_TOOLS_CANONICAL_CLEANUP_2026-03-10.md`
- `docs/overlays/OVERLAY_NOTES_M106_LINK_TTL_AND_HYGIENE_2026-03-10.md`
- `docs/overlays/OVERLAY_NOTES_M106_4_CHECKERS_RESTORE_PRIMER_SYNC_2026-03-10.md`
- `docs/overlays/OVERLAY_NOTES_M44_TELEMATICS_2026-03-10.md`
- `docs/overlays/OVERLAY_NOTES_M44_5_SSOT_SYNC_2026-03-10.md`

---

## 5) Bir sonraki net adım

## Step 2.6 — M45 Retention + Backup
Sıradaki resmi iş:
- retention politikalarının netleştirilmesi
- backup / restore runbook
- kritik tablolar için export/restore güvenliği
- telematics dahil yeni veri kaynakları için retention uyumu
- runtime check + repo-contract + tek pack

Uygulama notu:
- mevcut GPS/history/telematics hattını bozma
- audit ve retention kuralları tek yerden yönetilsin
- backup/restore belgeleri STARTPACK/SSOT ile senkron olsun
- operasyonel geri dönüş senaryosu net olsun

Ardından:
- Step 2.7 ve V2 başlıkları

---

## 6) M44 sonrası dikkat edilmesi gereken kararlar

- `PERSONEL` hâlâ public link öncelikli modelde
- Google Auth geldi diye personel için zorunlu hesap / login’e dönülmeyecek
- invite-based access kontrolü `COMPANY / ROOM / DRIVER / PERSONEL` tarafında role/scope mantığıyla kullanılacak
- mevcut parent invite akışı bozulmamalı
- local login ile Google login birlikte yaşamaya devam ediyor
- telematics, mevcut driver GPS akışını ikame etmez; ek kaynak olarak çalışır
- ROOM tarafı device provisioning sahibi olmaya devam eder
- overlay zip standardı: tek kök klasör, nested root yok

---

## 7) Yeni sohbet açınca ilk cümle önerisi

"Repo şu an M41 PACK PASS + M42 OPTIONAL PACK PASS + STEP 0.6 STABIL PACK PASS + STEP 1 SECURITY FOUNDATION PACK PASS + STEP 1 TOTP STEP-UP PACK PASS + M104 REPO CLEANUP CHECK PASS + M105 TOOLS HYGIENE CHECK PASS + M106 REPO HYGIENE + LINK TTL CHECK PASS + M43 GOOGLE AUTH + INVITE GATE PACK PASS OK + M44 TELEMATICS PACK PASS OK durumunda. M44.5 ile SSOT sync yapıldı, M44.6 ile ROOM > Vehicles içine Telematics UI eklendi ve demo device push testi geçti. Personel login zorunlu değil; public link TTL presetleri parent ve personelde 1 hafta / 1 ay / 6 ay / 1 yıl olarak hizalı. Sıradaki resmi iş M45 Retention + Backup. Mevcut repoya göre tek overlay zip olarak ilerleyelim."