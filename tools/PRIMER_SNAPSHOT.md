# SERVIS-PLATFORM — PERSONEL SERVİS V1/V2 — PRIMER SNAPSHOT (Yapıştır & Devam Et)

Tarih: 2026-03-12  
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
- ✅ `M46.2 AI COPILOT INTENT EXPANSION PACK PASS OK`
- ✅ `M46.3 AI COPILOT QUALITY + EVIDENCE PACK PASS OK`
- ✅ `M46.4 AI COPILOT DECISION CONSISTENCY + ACTION PLAN PACK PASS OK`
- ✅ `M46.5 AI COPILOT ACTION PRIORITIZATION + EVIDENCE CALIBRATION PACK PASS OK`

Önemli referans:
- `tools/STABLE_TO.txt = 41`
- Ana stabil taban hâlâ `M41`
- `M42 / Step 0.6 / Step 1 / M43 / M44 / M45 / M46 / M46.1 / M46.2 / M46.3 / M46.4 / M46.5` bunun üstünde ayrı resmi pack/check hatlarıyla green kabul edilen ek katmanlardır.

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

Notlar:
- Step 1 TOTP green kabulü korunuyor; setup/verify hattı çalışıyor.
- Step 2 resmi olarak `M43` ile tamamlandı.
- Step 2.5 resmi olarak `M44` ile tamamlandı.
- Step 2.6 resmi olarak `M45` ile tamamlandı.
- Step 3 resmi olarak `M46` ile tamamlandı.
- Step 3.1 resmi olarak `M46.1` ile tamamlandı.
- Step 3.2 resmi olarak `M46.2` ile tamamlandı.
- Step 3.3 resmi olarak `M46.3` ile tamamlandı.
- Step 3.4 resmi olarak `M46.4` ile tamamlandı.
- Step 3.5 resmi olarak `M46.5` ile tamamlandı.
- Overlay standardı: tek zip, tek kök klasör, nested root yok.

---

## 1) Resmi olarak green kabul edilen kapsam

### 1.1 V1 ana regresyon
`M41 PACK PASS` altında ana sistem green:
- auth / refresh / revoke / device mismatch
- RBAC / route guard
- agreement
- offer / counter / accept
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
- login / gps / export limit hattı
- RBAC deny-by-default sanity matrix

### 1.5 Step 1 TOTP Step-up
- `ROOM` ve `SUPER_ADMIN` için TOTP setup / enable / verify
- login response içinde `stepUpRequired`
- verify olmadan kritik write/admin endpointler kapalı
- verify sonrası geçici `stepUpUntil` ile erişim açılıyor
- `COMPANY` ve `DRIVER` bu guard’dan etkilenmiyor

### 1.6 M43 Google Auth + Invite Gate
- Google Auth backend hattı
- `UserIdentity` + `Invite` modeli
- generic invite / accept akışı
- invite yoksa kabul yok
- role / scope bağlı kabul
- Company / Room auth invite yönetimi
- public `accept-invite` paneli
- local email+şifre akışı korunuyor
- `PERSONEL` için zorunlu login modeli getirilmedi

### 1.7 M44 Telematics
- telematics normalize core
- direct device HTTP push
- vendor cloud adapter endpoint
- `GpsDevice` modeli
- provider normalize katmanı
- raw/vendor payload → kanonik GPS/event hattı
- audit + limiter + history gate entegrasyonu

Backend yetenekleri:
- `POST /api/telematics/push`
- `POST /api/telematics/vendor/:provider`
- `GET /api/telematics/devices`
- `POST /api/telematics/devices`
- `PATCH /api/telematics/devices/:id`
- `POST /api/telematics/devices/:id/rotate`

### 1.8 M44.6 UI eki — ROOM > Vehicles > Telematics
- `ROOM > Vehicles` içinde `Telematics` sekmesi
- araç bazlı device oluşturma
- device listeleme
- `label` / `status` güncelleme
- token rotate
- create/rotate sonrası ham token tek seferlik gösterim

### 1.9 M45 Retention + Backup
Yeni admin endpointleri:
- `GET /api/admin/retention/policy`
- `GET /api/admin/backup/policy`
- `GET /api/admin/backup/manifest`

Yeni tool’lar:
- `tools/pack_m45_retention_backup.ps1`
- `tools/check_m45_retention_backup_repo_contract.ps1`
- `tools/backup_create_m45.ps1`
- `tools/backup_restore_m45.ps1`

Önemli davranış:
- `ApiRequest` retention görünürlüğü var
- `AuditLog` retention görünürlüğü var
- `GpsPoint` retention görünürlüğü var
- telematics history retention mantığıyla uyumlu
- backup local dir / retention / format admin’den görülebilir
- restore destructive olduğu için kontrollü ve `-Force` opt-in akışta

### 1.10 M46 AI Copilot Foundation
Kapsam:
- read-only / suggestion-first copilot hattı
- `POST /api/ai/copilot`
- role/scope kontrollü AI erişimi
- `ROOM` ve `SUPER_ADMIN` için step-up guard
- audit: `AI_COPILOT_QUERY`
- structured JSON response
- write action yok

İlk intent seti:
- `SHIFT_SUMMARY`
- `CONFLICT_EXPLAIN`
- `TELEMATICS_HEALTH`
- `OPS_NOTE_DRAFT`

Web:
- shared `CopilotPanel`
- `ROOM / COMPANY / SUPER_ADMIN` copilot route’ları
- nav bağlı

Önemli ilke:
- LLM provider zorunlu değil
- foundation deterministic / rule-based çalışabilir
- önce read-only + suggestion, otomatik işlem yok

### 1.11 M46.1 AI Copilot Enrichment
M46 üstüne eklenenler:
- `copilotVersion`
- `generatedAt`
- `severity`
- `blocks`
- `nextChecks`
- `references`
- UI’da `Kopyala özet`
- UI’da `Kopyala not`
- UI’da `Son 5 analiz`

Önemli davranış:
- enrichment sürümü structured JSON döndürür
- `severity / blocks / nextChecks` alanları üretir
- ops note draft metni korunur
- audit log hattı devam eder

### 1.12 M46.2 AI Copilot Intent Expansion
M46.1 üstüne eklenenler:
- yeni intentler:
  - `ASSIGNMENT_READINESS`
  - `OFFER_DECISION_HELP`
  - `GPS_SIGNAL_DIAGNOSIS`
- `intentLabel`
- `entityLabel`
- `scope.summary`
- `highlights`
- daha zengin `references`
- UI’da hızlı seçim araması
- UI’da highlights bölümü
- UI’da scope summary görünümü

Önemli davranış:
- `copilotVersion` artık `M46.2`
- read-only / suggestion-first çizgisi korunur
- audit hattı korunur
- `ROOM / SUPER_ADMIN` için step-up guard korunur
- mevcut foundation/enrichment yapısı bozulmadan intent kapsamı genişletilir

### 1.13 M46.3 AI Copilot Quality + Evidence
M46.2 üstüne eklenenler:
- `confidence`
- `explanation`
- `evidence`
- `decisionSignals`
- `providerSummary`
- UI’da confidence görünümü
- UI’da explanation bölümü
- UI’da evidence bölümü
- UI’da decision signals bölümü

Önemli davranış:
- `copilotVersion` artık `M46.3`
- read-only / suggestion-first çizgisi korunur
- audit hattı korunur
- `ROOM / SUPER_ADMIN` için step-up guard korunur
- M46.1 ve M46.2 check zinciri ileri uyumlu tutulur
- explanation / evidence kalitesi artırılır ama otomatik write davranışı eklenmez

### 1.14 M46.4 AI Copilot Decision Consistency + Action Plan
M46.3 üstüne eklenenler:
- `overallStatus`
- `actionability`
- `dataFreshness`
- `coverage`
- `recommendedActions`
- `consistencyChecks`
- `missingData`
- `blockers`
- UI’da decision badge görünümü
- UI’da recommended actions bölümü
- UI’da missing data / blockers bölümü
- UI’da consistency checks bölümü

Önemli davranış:
- `copilotVersion` artık `M46.4`
- read-only / suggestion-first çizgisi korunur
- audit hattı korunur
- `ROOM / SUPER_ADMIN` için step-up guard korunur
- M46.1 / M46.2 / M46.3 check zinciri ileri uyumlu tutulur
- karar özeti + aksiyon planı üretilir ama otomatik write davranışı eklenmez

### 1.15 M46.5 AI Copilot Action Prioritization + Evidence Calibration
M46.4 üstüne eklenenler:
- `recommendedFirstAction`
- `actionPlanSummary`
- `calibrationNotes`
- `priorityScore`
- `whyNow`
- `evidenceLinks`
- `referenceLinks`
- `blockedBy`
- `dependsOn`
- UI’da first action bölümü
- UI’da calibration notes bölümü
- UI’da priority score / whyNow / evidence-reference link görünümü

Önemli davranış:
- `copilotVersion` artık `M46.5`
- read-only / suggestion-first çizgisi korunur
- audit hattı korunur
- `ROOM / SUPER_ADMIN` için step-up guard korunur
- M46.1 / M46.2 / M46.3 / M46.4 check zinciri ileri uyumlu tutulur
- aksiyon önceliği ve kanıt kalibrasyonu güçlenir ama otomatik write davranışı eklenmez

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
- personel public link vardiya `endAt` ile zorunlu clamp edilmez
- ham token yalnızca ilk üretimde gösterilir
- revoke / expired link aktifmiş gibi tutulmaz

### 2.3 Ürün kararı
- `COMPANY / ROOM / SUPER_ADMIN / DRIVER` login tabanlı kalır
- `PERSONEL` düşük sürtünmeli, süreli public link modeliyle çalışır
- `M43` ve sonrası bu kararı değiştirmez
- Google Auth geldi diye `PERSONEL` zorunlu hesap modeline dönülmez

---

## 3) Repo ve tools hijyen durumu

### 3.1 M104 Repo Cleanup
- stale duplicate route / panel dosyaları temizlendi
- `.bak` kalıntıları temizlendi
- stray root dosyaları temizlendi
- stale path’ler archive altına alındı

### 3.2 M105 Tools Hygiene
Kanonik tools hattı:
- `pack*`
- `gate*`
- `reset-and-pack.ps1`
- `check_*`
- `README.md`
- `PRIMER_SNAPSHOT.md`
- `CHECKLIST_SSOT.md`
- `STABLE_TO.txt`

### 3.3 M106 Repo Hygiene + Primer / TTL Sync
- primer / checklist / startpack senkronlandı
- parent + personel TTL politikası hizalandı
- kanonik checker hattı doğrulandı

### 3.4 M44.5 SSOT Sync
Senkron hat:
- `tools/PRIMER_SNAPSHOT.md`
- `docs/PRIMER_SSOT.md`
- `docs/CHECKLIST_SSOT.md`
- `tools/CHECKLIST_SSOT.md`
- `docs/STARTPACK_V1.md`
- `tools/README.md`

### 3.5 M45 SSOT / Runbook Sync
- `docs/RUNBOOK_M45_RETENTION_BACKUP.md`
- `tools/README.md`
- `docs/STARTPACK_V1.md`
- `docs/PRIMER_SSOT.md`
- `tools/PRIMER_SNAPSHOT.md`
- `docs/CHECKLIST_SSOT.md`
- `tools/CHECKLIST_SSOT.md`

### 3.6 Post-M46 / Post-M46.1 / Post-M46.2 not
- `M46`, `M46.1` ve `M46.2` artık “sıradaki hedef” değil “green katman”dır
- yeni sohbetlerde AI copilot hattı foundation + enrichment + intent expansion olarak green kabul edilir
- üst milestone’lar alt milestone check’lerini bozmayacak şekilde ilerlenir

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

Araçlar:
- `M43`: `tools/pack_m43_google_auth_invite_gate.ps1`
- `M44`: `tools/pack_m44_telematics.ps1`
- `M45`: `tools/pack_m45_retention_backup.ps1`
- `M46`: `tools/pack_m46_ai_copilot.ps1`
- `M46.1`: `tools/pack_m46_1_ai_copilot_enrichment.ps1`
- `M46.2`: `tools/pack_m46_2_ai_copilot_intent_expansion.ps1`

---

## 5) Korunacak ürün kararları

- `PERSONEL` public link öncelikli modelde kalır
- Google Auth geldi diye personelde zorunlu hesap modeline dönülmez
- invite-based access role/scope mantığı korunur
- parent invite akışı bozulmaz
- local login + Google login birlikte yaşar
- telematics mevcut driver GPS akışının yerine geçmez; ek kaynak olarak çalışır
- `ROOM` device provisioning sahibi olmaya devam eder
- retention + backup hattı operasyonel görünürlükle birlikte korunur
- AI copilot read-only / suggestion-first kalır
- AI otomatik write işlem yapmaz
- overlay üretim standardı: tek zip, tek kök klasör, nested root yok

---

## 6) Bir sonraki resmi hedef

Sıradaki resmi hedef:
- henüz sabitlenmedi
- çalışma adı olarak `M46.6` açılabilir

Önerilen yön:
- AI Product Tutor + Contextual Help akışını ekleme
- rol bazlı onboarding ve kullanım yardımı
- İngilizce terim → Türkçe açıklama desteği
- ekran bağlamına göre yardım ve takip soruları
- mevcut read-only + audit + step-up çizgisini bozmadan ilerleme

---

## 7) Yeni sohbet açınca ilk cümle

> Repo şu an `M41` ana green tabanı üzerinde; `M42 optional`, `Step 0.6 stabil`, `Step 1 Security`, `Step 1 TOTP`, `M104/M105/M106 hijyen`, `M43 Google Auth`, `M44 Telematics`, `M45 Retention + Backup`, `M46 AI Copilot Foundation`, `M46.1 AI Copilot Enrichment`, `M46.2 AI Copilot Intent Expansion`, `M46.3 AI Copilot Quality + Evidence`, `M46.4 AI Copilot Decision Consistency + Action Plan` ve `M46.5 AI Copilot Action Prioritization + Evidence Calibration` ayrı pack/check hatlarıyla green durumda. Personel login zorunlu değil; public link TTL presetleri parent ve personelde `1 hafta / 1 ay / 6 ay / 1 yıl` olarak hizalı. AI katmanı şu an read-only / suggestion-first, audit’li ve step-up kurallarıyla kontrollü.
