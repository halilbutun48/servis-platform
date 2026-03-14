# SERVIS-PLATFORM — PERSONEL SERVİS V1/V2 — PRIMER SNAPSHOT (Repo-Verified, Post-M46.8)

Tarih: 2026-03-14
Timezone: Europe/Istanbul

## 0) Durum / referans

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
- ✅ `M46.6-D AI CHAT SHELL PACK PASS OK`
- ✅ `M46.6-D2 AI CONTEXT CHAT PACK PASS OK`
- ✅ `M46.6-D3 AI ACTIONABLE CHAT PACK PASS OK`
- ✅ `M46.6-C2 SCREEN COVERAGE + TERMINOLOGY PACK PASS OK`
- ✅ `M46.6-D4 SIMPLE ROLE MODE PACK PASS OK`
- ✅ `M46.7 DRIVER CODE LOGIN + REHBER FIRST PACK PASS OK`
- ✅ `M46.8 DRIVER ACCESS HARDENING PACK PASS OK`

Önemli referans:
- `tools/STABLE_TO.txt = 41`
- ana stabil taban hâlâ `M41`
- `M42 / Step 0.6 / Step 1 / M43 / M44 / M45 / M46 / M46.1–M46.5 / M46.6-A/B/T/C / M46.6-D / D2 / D3 / C2 / D4 / M46.7` bunun üstünde ayrı resmi pack/check hatlarıyla green kabul edilen ek katmanlardır.

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
- `./tools/pack_m46_6_d_ai_chat_shell.ps1 -RepoRoot D:\servis-platform`
- `./tools/pack_m46_6_d2_ai_context_chat.ps1 -RepoRoot D:\servis-platform`
- `./tools/pack_m46_6_d3_ai_actionable_chat.ps1 -RepoRoot D:\servis-platform`
- `./tools/pack_m46_6_c2_screen_coverage_terminology.ps1 -RepoRoot D:\servis-platform`
- `./tools/pack_m46_6_d4_simple_role_mode.ps1 -RepoRoot D:\servis-platform`
- `./tools/pack_m46_7_driver_code_login_rehber_first.ps1 -RepoRoot D:\servis-platform`

Notlar:
- overlay standardı: **tek zip / tek kök klasör / nested root yok**
- üst milestone’lar alt milestone check uyumluluğunu bozmadan ilerletilir
- docs/SSOT seti aynı değişiklikte güncel tutulur
- `M46.7` ile sürücü giriş modeli ve rehber önceliği resmileşmiştir

---

## 1) M46.6 sonrası rehber/chat resmi kapsam

### M46.6-A — AI Job Guide
- sade Türkçe rehber akışı
- `jobType / jobTitle / guideLevel / plainSummary / whatToDoNow / whatToDoNext / doNotDo / stepByStep / commonMistakes / doneChecklist / simpleTerms / screenExplanation`

### M46.6-B — Precheck + Locked Reason + Quick Actions
- başlamadan önce kontrol
- `canProceed / whyBlocked / lockedActionReasons / quickActions / ifStuck / copyOutputs`

### M46.6-T — Location Source Guide
- ürün dili:
  - `sürücünün telefon GPS'i`
  - `cihaz GPS'i`
  - `konum kaynağı`
- ana akış sürücünün telefon GPS'i
- cihaz GPS'i ek kaynak olarak anlatılıyor

### M46.6-C — Screen Help
- `SCREEN_MENU_GUIDE`
- `BUTTON_ACTION_GUIDE`
- `ROLE_HELP_GUIDE`

### M46.6-D — Chat Shell
- rehber cevaplarını sohbet biçiminde sunan kabuk
- yeni intent: `CHAT_HELP`

### M46.6-D2 — Context-aware Chat
- `screen / entity / roleMode` birlikte işleniyor
- seçili kayıtla konuşma mantığı var

### M46.6-D3 — Actionable Chat
- `OPEN_ROUTE / OPEN_GUIDE / ASK / COPY_TEXT`
- `actionPlanLabel`
- `lastQuickActions`

### M46.6-C2 — Screen Coverage + Terminology Expansion
Kapsam genişletildi:
- `/room/hub`
- `/company/hub`
- `/school/hub`
- `/organization/hub`
- `/company/georeview`
- `/shared/notifications`
- `/shared/logs`
- ilgili auth-invites/check-in ekranları

Açıklanan terimler:
- `Hub`
- `Inbound`
- `Outbound`
- `Giriş daveti`
- `Erişim linki`
- `Bildirim`
- `İşlem kaydı / log`
- `Konum İncele`
- `OSRM`
- `Matrix`
- `Check-in`

### M46.6-D4 — Simple Role Mode
- `DRIVER / PERSONEL / PARENT` için daha kısa
- daha az teknik
- daha düşük bilgi yoğunluğu
- yönlendirme ağırlıklı cevaplar

---

## 2) M46.7 ile gelen resmi kapsam

### M46.7 — Driver Code Login + Rehber First

Bu milestone ile iki ana ürün kararı resmileşti:

#### A) Rehber navdock’ta 1. sıraya alındı
- Copilot artık sadece yardımcı panel değil, ürün içi rehber
- kullanıcı tarafında `Rehber` öne çıkarıldı
- `room / company / driver` tarafında nav sırası buna göre güncellendi

#### B) Driver email/şifre yerine Sürücü Kodu + PIN modeline geçti
Yeni akış:
- room tarafında yeni sürücü oluşturulunca sistem otomatik:
  - `Sürücü Kodu`
  - `Geçici PIN`
  üretir
- room panelinde bu bilgiler gösterilir
- sürücü girişi artık:
  - `Sürücü Kodu`
  - `PIN`
  ile yapılır
- ilk girişte sürücü yeni PIN belirler
- room tarafı gerektiğinde yeni geçici PIN üretebilir

M46.7 resmi kapsam:
- `driverCode`
- `pinTemporary`
- login identifier desteği
- driver pin change endpoint
- `/driver/change-pin` ekranı
- `DriversPanel` içinde issued credentials görünümü
- PIN reset akışı
- M31 / M43 / M45 / M46 eski hatlarıyla uyum için pack/check düzeltmeleri

---

## 3) Dil ve ürün kararları

Kullanıcıya görünen yerde önce Türkçe kullanılır:
- `agreement → sözleşme`
- `offer → teklif`
- `assignment → atama`
- `backup → yedek`
- `retention → saklama süresi`
- `audit → işlem kaydı`
- `step-up → ek güvenlik doğrulaması`
- `driver GPS → sürücünün telefon GPS'i`
- `device GPS → cihaz GPS'i`
- `Copilot nav label → Rehber`
- `driver login identifier → Sürücü Kodu`
- `password for driver flow → PIN / Geçici PIN`

Yardım dili:
- çok sade Türkçe
- düşük bilgi seviyesine uygun
- kısa cümle
- teknik terim minimum

---

## 4) Rol bazlı yardım/chat kararı

Operasyon Copilot:
- `SUPER_ADMIN`
- `ROOM`
- `COMPANY`
- `SCHOOL`
- `ORGANIZATION`

Basit rehber / sade sohbet:
- `DRIVER`
- `PERSONEL`
- `PARENT`

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
- telematics mevcut sürücünün telefon GPS'i akışını bozmaz
- cihaz GPS'i ek kaynak olarak anlatılır
- overlay standardı tek zip / tek kök / nested root yok
- driver login ana akışı artık `Sürücü Kodu + PIN`
- room tarafında sürücü için geçici PIN üret / sıfırla mantığı korunur

---

## 6) Docs / SSOT durumu

M46.7 sonrası güncel tutulması gereken SSOT seti:
- `tools/PRIMER_SNAPSHOT.md`
- `docs/PRIMER_SSOT.md`
- `docs/CHECKLIST_SSOT.md`
- `tools/CHECKLIST_SSOT.md`
- `docs/STARTPACK_V1.md`
- `tools/README.md`

M46.8 scaffold başlangıcında ayrıca staged tutulacak dosyalar:
- `backend/scripts/m46_8_driver_access_hardening_check.js`
- `tools/pack_m46_8_driver_access_hardening.ps1`
- `tools/check_m46_8_driver_access_hardening_repo_contract.ps1`
- `docs/RUNBOOK_M46_8_DRIVER_ACCESS_HARDENING.md`

M46.7 ile özellikle şu yeni konu artık SSOT’a yansımış olmalıdır:
- Rehber navdock’ta ilk sırada
- Driver login modeli: `Sürücü Kodu + PIN`
- ilk girişte PIN değişimi
- room panelinden PIN reset
- buna bağlı pack/check uyumluluk düzeltmeleri

---

## 7) Bu sohbet sonunda kesin durum

Kesin green:
- `M46.7 DRIVER CODE LOGIN + REHBER FIRST PACK PASS OK`

Bu, şu akışların fiilen doğrulandığı anlamına gelir:
- room login
- driver create → auto credentials
- driver code issued
- temporary pin issued
- driver login by code + pin
- `me.requirePinChange`
- driver pin change
- room reset pin
- rehber nav reorder
- repo contract pass

---

## 8) Sonraki resmi rota (Not Green Yet)

İleride sorun çıkmaması için bir sonraki resmi rota şu sırayla ele alınmalıdır:

### M46.8 — Driver Access Hardening
Alt kapsam:
- `M46.8-A — Login / PIN Abuse Guard`
  - login limiter `identifier` bazlı çalışmalı
  - driver login için daha sıkı bucket olmalı
  - `driver/change-pin` için ayrı limiter olmalı
  - hatalı PIN sayacı ve geçici lock / cooldown eklenmeli
- `M46.8-B — PIN Policy + Reset Hygiene`
  - minimum PIN kuralı netleşmeli
  - kolay tahmin edilebilir PIN bloklanmalı
  - room reset sonrası lock/counter temizlenmeli
  - geçici PIN yeniden `pinTemporary=true` akışını korumalı
- `M46.8-C — Auth Audit Strengthening`
  - login success / fail / lock / reset / change-pin olayları audit’e düşmeli
  - `driverId / driverCode / ip / ua / deviceId / reason` alanları netleşmeli
- `M46.8-D — Device Trust Lite`
  - driver login `deviceId` akışı netleşmeli
  - web login helper driver için `deviceId` göndermeli
  - mismatch / reset davranışı sade ve anlaşılır olmalı

Scaffold dosyaları staged (green değil):
- `backend/scripts/m46_8_driver_access_hardening_check.js`
- `tools/pack_m46_8_driver_access_hardening.ps1`
- `tools/check_m46_8_driver_access_hardening_repo_contract.ps1`
- `docs/RUNBOOK_M46_8_DRIVER_ACCESS_HARDENING.md`

Sonraki resmi sıra:
- `M47 — KVKK Notice/Consent Framework`
- [ ] `M47.2 — Capacity & Load Baseline`
- `M47.3 — Production Resilience + Edge Security`
- `M47.3 — Production Resilience + Edge Security`
- `M47.4 — Mobile Readiness Web Pass`
- `M48 — Driver Mobile Foundation`
- `M49 — Driver Mobile Beta Hardening`

Daha sonraki aday faz:
- `M49.1 — Driver Voice Guidance + Stop ETA`
  - planlı durak sayısı / sıradaki durak / varış süresi / kalan km
  - navigasyon doğrulamalı sesli yönlendirme
  - “bu duraktan şu kadar kişi binecek” gibi operasyonel sesli kılavuz
  - rota dışına çıkma / durak kaçırma / gecikme uyarıları
  - not: bu iş mobil foundation + GPS/session hardening sonrası ele alınmalıdır

---

## 9) Yeni sohbet açınca ilk cümle

Repo şu an M41 ana green tabanı üzerinde; M42 optional, Step 0.6 stabil, Step 1 Security, Step 1 TOTP, M104/M105/M106 hijyen, M43 Google Auth, M44 Telematics, M45 Retention + Backup, M46 AI Copilot, M46.1–M46.5 gelişmiş copilot zinciri, M46.6-A/B/T/C rehber hattı, M46.6-D chat shell, M46.6-D2 context-aware chat, M46.6-D3 actionable chat, M46.6-C2 screen coverage + terminology, M46.6-D4 simple role mode ve M46.7 driver code login + rehber first ayrı pack/check hatlarıyla green durumda. Copilot/Rehber navdock’ta ilk sıraya alındı. Driver akışı artık email/şifre yerine Sürücü Kodu + Geçici PIN ile çalışıyor; ilk girişte PIN değişimi zorunlu, room tarafında PIN reset mümkün. Repo şu an M47 KVKK Notice/Consent hattını da taşıyor; sonraki doğru rota M47.2 Capacity & Load Baseline, ardından M47.3 Production Resilience + Edge Security ve M47.4 Mobile Readiness Web Pass tir.
