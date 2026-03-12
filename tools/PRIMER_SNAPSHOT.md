# SERVIS-PLATFORM — PERSONEL SERVİS V1/V2 — PRIMER SNAPSHOT (Repo-Verified, Post-M46.6-C)

Tarih: 2026-03-12
Timezone: Europe/Istanbul

## 0) Mevcut durum / referans

Repo: `D:\servis-platform`

Ana resmi green durum:
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
- ✅ `M46.2 AI COPILOT INTENT EXPANSION PACK PASS OK`
- ✅ `M46.3 AI COPILOT QUALITY + EVIDENCE PACK PASS OK`
- ✅ `M46.4 AI COPILOT DECISION CONSISTENCY + ACTION PLAN PACK PASS OK`
- ✅ `M46.5 AI COPILOT ACTION PRIORITIZATION + EVIDENCE CALIBRATION PACK PASS OK`
- ✅ `M46.6-A AI JOB GUIDE PACK PASS OK`
- ✅ `M46.6-B AI JOB GUIDE PRECHECK PACK PASS OK`
- ✅ `M46.6-T AI LOCATION SOURCE GUIDE PACK PASS OK`
- ✅ `M46.6-C AI SCREEN HELP PACK PASS OK`

Önemli referans:
- `tools/STABLE_TO.txt = 41`
- ana stabil taban hâlâ `M41`
- `M42 / Step 0.6 / Step 1 / M43 / M44 / M45 / M46 / M46.1 / M46.2 / M46.3 / M46.4 / M46.5 / M46.6-*` bunun üstünde ayrı resmi pack/check hatlarıyla green kabul edilen ek katmanlardır.

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
- `./tools/pack_m46_2_ai_copilot_intent_expansion.ps1 -RepoRoot D:\servis-platform`
- `./tools/pack_m46_3_ai_copilot_quality_evidence.ps1 -RepoRoot D:\servis-platform`
- `./tools/pack_m46_4_ai_copilot_decision_consistency.ps1 -RepoRoot D:\servis-platform`
- `./tools/pack_m46_5_ai_copilot_action_prioritization.ps1 -RepoRoot D:\servis-platform`
- `./tools/pack_m46_6_a_ai_job_guide.ps1 -RepoRoot D:\servis-platform`
- `./tools/pack_m46_6_b_ai_job_guide_precheck.ps1 -RepoRoot D:\servis-platform`
- `./tools/pack_m46_6_t_ai_location_source_guide.ps1 -RepoRoot D:\servis-platform`
- `./tools/pack_m46_6_c_ai_screen_help.ps1 -RepoRoot D:\servis-platform`

Notlar:
- overlay standardı: **tek zip / tek kök klasör / nested root yok**
- üst milestone’lar alt milestone check uyumluluğunu bozmadan ilerletilir
- bazı M46.6 pack’lerde repo contract checker’ları kırılgan literal string aramaları nedeniyle yerelde uyumluluk marker / checker sağlamlaştırması gerekmişti; final green durumda pack’ler geçiyor

---

## 1) Resmi olarak green kabul edilen kapsam

### 1.1 V1 ana regresyon
`M41 PACK PASS` altında ana sistem green:
- auth / refresh / revoke / device mismatch
- RBAC / route guard
- sözleşme hattı
- teklif / counter / accept
- route / stops
- live / ws / gps
- audit / retention temel hattı
- learning / route learn akışları

### 1.2 M42 Optional Release
- check-in modülü optional release
- `FEATURE_CHECKIN=0` iken dormant
- `FEATURE_CHECKIN=1` iken ayrı optional hat üzerinden doğrulanmış

### 1.3 Step 0.6 Stabil Ekler
- capacity / pool / auto-split
- split parent cleanup
- school parent invite + public accept
- shift preview external nav
- company list click details

### 1.4 Step 1 Security Foundation
- refresh reuse detection
- export limiter
- login/gps/export limit hattı
- RBAC deny-by-default sanity matrix

### 1.5 Step 1 TOTP Step-up
- ROOM ve SUPER_ADMIN için TOTP setup / enable / verify
- login response içinde `stepUpRequired`
- verify olmadan kritik write/admin endpointler kapalı
- verify sonrası geçici `stepUpUntil` ile erişim açılıyor
- COMPANY ve DRIVER bu guard’dan etkilenmiyor

### 1.6 M43 Google Auth + Invite Gate
- Google Auth backend hattı
- `UserIdentity` + `Invite` modeli
- generic invite / accept akışı
- role / scope bağlı kabul
- Company / Room auth invite yönetimi
- public `accept-invite` paneli
- local email+şifre akışı korunuyor

### 1.7 M44 Telematics
- telematics normalize core
- direct device HTTP push
- vendor cloud adapter endpoint
- `GpsDevice` modeli
- provider normalize katmanı
- raw/vendor payload → kanonik GPS/event hattı
- audit + limiter + history gate entegrasyonu

### 1.8 M45 Retention + Backup
- admin retention / backup policy görünürlüğü
- backup create / restore tools
- telematics history retention uyumu
- restore kontrollü opt-in

### 1.9 M46 → M46.5 AI Copilot çekirdeği
- `POST /api/ai/copilot`
- read-only / suggestion-first
- audit: `AI_COPILOT_QUERY`
- ROOM / SUPER_ADMIN için step-up guard
- M46.1–M46.5 alanları:
  - `copilotVersion`
  - `severity / blocks / nextChecks / references`
  - `intentLabel / entityLabel / scope.summary / highlights`
  - `confidence / explanation / evidence / decisionSignals / providerSummary`
  - `overallStatus / actionability / dataFreshness / coverage / recommendedActions / consistencyChecks / missingData / blockers`
  - `recommendedFirstAction / actionPlanSummary / calibrationNotes / priorityScore / whyNow / evidenceLinks / referenceLinks / blockedBy / dependsOn`

---

## 2) M46.6 hattı — yeni resmi kapsam

### 2.1 M46.6-A — AI Job Guide
Copilot korunarak üstüne rehber katmanı eklendi.

Yeni yapı:
- Copilot içinde **Rehber** + **Gelişmiş** ayrımı
- varsayılan görünüm: **Rehber**
- sade Türkçe iş rehberi
- ilk job’lar:
  - Teklifi inceleme
  - Teklifi onaylama
  - Atamaya hazır mı
  - Araç ile sürücüyü bağlama

Yeni rehber alanları:
- `jobType`
- `jobTitle`
- `guideLevel`
- `plainSummary`
- `whatToDoNow`
- `whatToDoNext`
- `doNotDo`
- `stepByStep`
- `commonMistakes`
- `doneChecklist`
- `simpleTerms`
- `screenExplanation`

### 2.2 M46.6-B — Precheck + Locked Reason + Quick Actions
Yeni yetenekler:
- **Başlamadan önce kontrol**
- **Hazır / Eksik var / Bu yüzden devam edemezsin**
- **Bu neden kapalı?**
- **Buradan aç**
- **Takıldıysan buraya git**
- **Hazır metin**

Yeni alanlar:
- `beforeYouStart`
- `canProceed`
- `whyBlocked`
- `lockedActionReasons`
- `quickActions`
- `ifStuck`
- `copyOutputs`

### 2.3 M46.6-T — Location Source Guide
Konum tarafında rehber eklendi.

Yeni rehber işleri:
- `TELEMATICS_DEVICE_CREATE`
- `LOCATION_SOURCE_GUIDE`
- `GPS_SIGNAL_DIAGNOSIS_GUIDE`

Ürün dili kararı:
- **sürücünün telefon GPS'i**
- **cihaz GPS'i**
- **konum kaynağı**

Ürün mantığı:
- ana akış sürücünün telefon GPS'i
- cihaz GPS'i ek konum kaynağı olarak anlatılır
- mevcut araç GPS’ini sisteme dahil etme rehberi vardır

### 2.4 M46.6-C — Screen Help + Button/Menu Guide + Role Help
Yeni rehber işleri:
- `SCREEN_MENU_GUIDE`
- `BUTTON_ACTION_GUIDE`
- `ROLE_HELP_GUIDE`

Yeni yetenekler:
- **Bu ekran ne için var?**
- **Bu ekrandaki butonlar**
- **Bu rolde ne yapabilirim?**
- `screen` entity type desteği
- DRIVER / PERSONEL / PARENT için de ekran rehberi

Yeni kartlar:
- `MenuPurposeCard`
- `ButtonGuidesCard`
- `ScreenMenusCard`

---

## 3) Dil ve ürün kararları

Kullanıcıya görünen yerde önce Türkçe kullanılır:
- agreement → **sözleşme**
- offer → **teklif**
- assignment → **atama**
- backup → **yedek**
- retention → **saklama süresi**
- audit → **işlem kaydı**
- step-up → **ek güvenlik doğrulaması**
- driver GPS → **sürücünün telefon GPS'i**
- device GPS → **cihaz GPS'i**

Yardım dili:
- çok sade Türkçe
- düşük bilgi seviyesine uygun
- kısa cümle
- teknik terim minimum
- kullanıcıyı düşündürmeden yönlendiren metin

---

## 4) Rol bazlı yardım/chat kararı

### Operasyon Copilot
- SUPER_ADMIN
- ROOM
- COMPANY
- SCHOOL
- ORGANIZATION

### Basit Rehber
- DRIVER
- PERSONEL
- PARENT

Temel kural:
- kullanıcı sadece kendi rolü, kendi ekranı, kendi yetkisi kadar soru sorabilir
- scope dışı bilgi verilmez
- gerekiyorsa ilgili adıma yönlendirilir

---

## 5) Korunacak ürün kararları
- Copilot çekirdeği korunur
- `POST /api/ai/copilot` korunur
- AI hattı read-only / suggestion-first kalır
- otomatik write action eklenmez
- step-up kuralları korunur
- telematics, mevcut sürücünün telefon GPS'i akışını bozmaz
- cihaz GPS'i ek kaynak olarak anlatılır
- overlay standardı tek zip / tek kök / nested root yok

---

## 6) Bir sonraki resmi hedef

M46.6 hattı A/B/T/C olarak tamamlandı.
Bir sonraki hedef henüz sabitlenmedi.

Doğal devam adayları:
- M46.6-D: conversational copilot / chat shell
- M46.7: ilk kullanım mikro eğitim kartları / yardım analitiği / kalite sertleştirme
- M47: daha geniş operasyon akışları için tutor genişlemesi

---

## 7) Yeni sohbet açınca ilk cümle

> Repo şu an `M41` ana green tabanı üzerinde; `M42 optional`, `Step 0.6 stabil`, `Step 1 Security`, `Step 1 TOTP`, `M104/M105/M106 hijyen`, `M43 Google Auth`, `M44 Telematics`, `M45 Retention + Backup`, `M46 AI Copilot`, `M46.1–M46.5` gelişmiş copilot zinciri ve `M46.6-A/B/T/C` rehber hattı ayrı pack/check hatlarıyla green durumda. Copilot korunuyor; üstüne sade Türkçe iş rehberi, ön kontrol, neden kapalı, buradan aç, konum kaynağı rehberi ve ekran/buton rehberi eklendi. Ürün dilinde “sözleşme”, “sürücünün telefon GPS'i”, “cihaz GPS'i” kullanılıyor.
