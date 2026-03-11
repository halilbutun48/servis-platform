# SERVIS-PLATFORM — PERSONEL SERVİS V1/V2 — PRIMER (SSOT)

Tarih: 2026-03-11  
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
- ✅ `M45 RETENTION + BACKUP PACK PASS OK`
- ✅ `M46 AI COPILOT FOUNDATION PACK PASS OK`
- ✅ `M46.1 AI COPILOT ENRICHMENT PACK PASS OK`

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
- `./tools/pack_m45_retention_backup.ps1 -RepoRoot D:\servis-platform`
- `./tools/pack_m46_ai_copilot.ps1 -RepoRoot D:\servis-platform`
- `./tools/pack_m46_1_ai_copilot_enrichment.ps1 -RepoRoot D:\servis-platform`

> Not: Step 1 TOTP green kabulü; M41 + Step1 Foundation + TOTP Runtime + TOTP Repo Contract PASS ile doğrulanmıştır.  
> Not 2: M104/M105/M106 sonrası repo ağacı, tools kökü ve primer/checklist/startpack hattı hizalanmıştır.  
> Not 3: M43 green sonrası Step 2 resmi olarak tamamlanmıştır.  
> Not 4: M44 green sonrası Step 2.5 resmi olarak tamamlanmıştır.  
> Not 5: M45 green sonrası Step 2.6 resmi olarak tamamlanmıştır.  
> Not 6: M46 green sonrası Step 3 resmi olarak tamamlanmıştır.  
> Not 7: M46.1 green sonrası Step 3.1 resmi olarak tamamlanmıştır.  
> Not 8: Repo içinde eski/internal migration adlarında farklı etiketler görülebilir; milestone SSOT anlamı burada yazan primer/checklist üzerinden takip edilir.

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
- direct HTTP push alımı
- vendor cloud adapter
- provider normalize katmanı
- provisioned `GpsDevice` modeli + serial/secret doğrulaması
- raw/vendor payload → kanonik GPS hattına yazım
- runtime check + repo-contract + tek pack hattı

Önemli davranış:
- mevcut driver app GPS akışı korunur; telematics ek kaynak olarak çalışır
- direct device push kaynağı `DEVICE`, vendor cloud push kaynağı `VENDOR` olarak izlenir
- provision edilen cihazın `lastSeenAt` alanı güncellenir
- vendor push aynı aracı serial lookup ile bulup `gpsLast` kaydını güncelleyebilir
- audit / limiter / router mount hattı mevcut backend pattern’iyle korunur

Kanıt:
- `M44 TELEMATICS CHECK PASS`
- `M44 TELEMATICS REPO CONTRACT PASS`
- `M44 TELEMATICS PACK PASS OK`

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

M43 + M44 ile gelen yeni kanıt / araçlar:
- `tools/pack_m43_google_auth_invite_gate.ps1`
- `tools/check_m43_google_auth_invite_gate_repo_contract.ps1`
- `backend/scripts/m43_google_auth_invite_gate_check.js`
- `tools/pack_m44_telematics.ps1`
- `tools/check_m44_telematics_repo_contract.ps1`
- `backend/scripts/m44_telematics_check.js`

M45 ile gelen yeni kanıt / araçlar:
- `tools/pack_m45_retention_backup.ps1`
- `tools/check_m45_retention_backup_repo_contract.ps1`
- `tools/backup_create_m45.ps1`
- `tools/backup_restore_m45.ps1`
- `backend/scripts/m45_retention_backup_check.js`
- `backend/src/ops/retentionBackupPolicy.js`
- `docs/RUNBOOK_M45_RETENTION_BACKUP.md`

Overlay / cleanup notları:
- `docs/overlays/OVERLAY_NOTES_M104_REPO_AUDIT_CLEANUP_2026-03-10.md`
- `docs/overlays/OVERLAY_NOTES_M105_TOOLS_CANONICAL_CLEANUP_2026-03-10.md`
- `docs/overlays/OVERLAY_NOTES_M106_LINK_TTL_AND_HYGIENE_2026-03-10.md`
- `docs/overlays/OVERLAY_NOTES_M106_4_CHECKERS_RESTORE_PRIMER_SYNC_2026-03-10.md`
- `docs/overlays/OVERLAY_NOTES_M44_TELEMATICS_2026-03-10.md`
- `docs/overlays/OVERLAY_NOTES_M44_5_SSOT_SYNC_2026-03-10.md`
- `docs/overlays/OVERLAY_NOTES_M44_6_TELEMATICS_ROOM_UI_2026-03-10.md`
- `docs/overlays/OVERLAY_NOTES_M45_RETENTION_BACKUP_2026-03-10.md`

---

## 5) Güncel resmi iş / yeni hedef durumu

## Step 3 — M46 AI Copilot Foundation — RESMİ GREEN

Bu katman resmi olarak green kabul edilir:
- `M46 AI COPILOT FOUNDATION CHECK PASS`
- `M46 AI COPILOT FOUNDATION REPO CONTRACT PASS`
- `M46 AI COPILOT FOUNDATION PACK PASS OK`

Kapsam:
- `POST /api/ai/copilot`
- read-only / suggestion-first copilot hattı
- role/scope kontrollü AI erişimi
- structured JSON output
- whitelist resolver / tool yaklaşımı
- `ROOM` + `SUPER_ADMIN` için step-up guard
- `AI_COPILOT_QUERY` audit izi
- vardiya özeti / conflict açıklama / telematics health / operasyon notu taslağı
- write aksiyon yok; foundation katmanı yalnız açıklama ve öneri üretir

Repo izi:
- `backend/src/routes/ai.js`
- `backend/src/ai/schemas.js`
- `backend/src/ai/service.js`
- `backend/src/ai/tools.js`
- `backend/scripts/m46_ai_copilot_check.js`
- `web/src/panels/shared/CopilotPanel.jsx`
- `docs/RUNBOOK_M46_AI_COPILOT.md`
- `tools/pack_m46_ai_copilot.ps1`
- `tools/check_m46_ai_copilot_repo_contract.ps1`

## Step 3.1 — M46.1 AI Copilot Enrichment — RESMİ GREEN

Bu katman da resmi olarak green kabul edilir:
- `M46.1 AI COPILOT ENRICHMENT CHECK PASS`
- `M46.1 AI COPILOT ENRICHMENT REPO CONTRACT PASS`
- `M46.1 AI COPILOT ENRICHMENT PACK PASS OK`

Kapsam:
- `copilotVersion` alanı
- `severity` üretimi
- `blocks` üretimi
- `nextChecks` üretimi
- `references` üretimi
- UI’da `Kopyala özet`
- UI’da `Kopyala not`
- UI’da `Son 5 analiz`
- read-only / deterministic enrichment korunur; write aksiyon yoktur

Repo izi:
- `backend/scripts/m46_1_ai_copilot_enrichment_check.js`
- `tools/pack_m46_1_ai_copilot_enrichment.ps1`
- `tools/check_m46_1_ai_copilot_enrichment_repo_contract.ps1`
- `docs/RUNBOOK_M46_1_AI_COPILOT_ENRICHMENT.md`
- `web/src/panels/shared/CopilotPanel.jsx`

Bir sonraki resmi hedef:
- **M46.2 AI Copilot Intent Expansion**
- intent/entity picker güçlendirme
- daha zengin scoped explanation / references üretimi
- foundation ve enrichment green zemini korunarak ilerleme

---

## 6) Korunacak ürün kararları

- `PERSONEL` hâlâ public link öncelikli modelde
- Google Auth geldi diye personel için zorunlu hesap / login’e dönülmeyecek
- invite-based access kontrolü role/scope mantığıyla korunacak
- mevcut parent invite akışı bozulmayacak
- local login ile Google login birlikte yaşamaya devam edecek
- telematics, mevcut driver GPS akışını ikame etmez; ek kaynak olarak çalışır
- ROOM tarafı device provisioning sahibi olmaya devam eder
- AI hattı read-only / suggestion-first kalır; otomatik write aksiyon yapmaz
- overlay zip standardı: tek kök klasör, nested root yok

---

## 7) Yeni sohbet açınca ilk cümle önerisi

"Repo şu an M41 PACK PASS + M42 OPTIONAL PACK PASS + STEP 0.6 STABIL PACK PASS + STEP 1 SECURITY FOUNDATION PACK PASS + STEP 1 TOTP STEP-UP PACK PASS + M104 REPO CLEANUP CHECK PASS + M105 TOOLS HYGIENE CHECK PASS + M106 REPO HYGIENE + LINK TTL CHECK PASS + M43 GOOGLE AUTH + INVITE GATE PACK PASS OK + M44 TELEMATICS PACK PASS OK + M45 RETENTION + BACKUP PACK PASS OK + M46 AI COPILOT FOUNDATION PACK PASS OK + M46.1 AI COPILOT ENRICHMENT PACK PASS OK durumunda. M44.5 ile SSOT sync yapıldı, M44.6 ile ROOM > Vehicles içine Telematics UI eklendi. Personel login zorunlu değil; public link TTL presetleri parent ve personelde 1 hafta / 1 ay / 6 ay / 1 yıl olarak hizalı. Sıradaki resmi hedef M46.2 AI Copilot Intent Expansion."

Kanonik M45 araçları:
- `tools\pack_m45_retention_backup.ps1`
- `tools\check_m45_retention_backup_repo_contract.ps1`
- `tools\backup_create_m45.ps1`
- `tools\backup_restore_m45.ps1`
- `docs\RUNBOOK_M45_RETENTION_BACKUP.md`

Kanonik M46 araçları:
- `tools\pack_m46_ai_copilot.ps1`
- `tools\check_m46_ai_copilot_repo_contract.ps1`
- `backend\scripts\m46_ai_copilot_check.js`
- `backend\src\routes\ai.js`
- `backend\src\ai\schemas.js`
- `backend\src\ai\service.js`
- `backend\src\ai\tools.js`
- `docs\RUNBOOK_M46_AI_COPILOT.md`

Kanonik M46.1 araçları:
- `tools\pack_m46_1_ai_copilot_enrichment.ps1`
- `tools\check_m46_1_ai_copilot_enrichment_repo_contract.ps1`
- `backend\scripts\m46_1_ai_copilot_enrichment_check.js`
- `docs\RUNBOOK_M46_1_AI_COPILOT_ENRICHMENT.md`
