# SERVIS-PLATFORM — PERSONEL SERVİS V1/V2 — PRIMER SNAPSHOT (Repo-Verified, Post-M46.6-D4)

Tarih: 2026-03-13
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

Önemli referans:
- `tools/STABLE_TO.txt = 41`
- ana stabil taban hâlâ `M41`
- `M42 / Step 0.6 / Step 1 / M43 / M44 / M45 / M46 / M46.1–M46.5 / M46.6-A/B/T/C / M46.6-D / D2 / D3 / C2 / D4` bunun üstünde ayrı resmi pack/check hatlarıyla green kabul edilen ek katmanlardır.

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

Notlar:
- overlay standardı: **tek zip / tek kök klasör / nested root yok**
- üst milestone’lar alt milestone check uyumluluğunu bozmadan ilerletilir
- C2 repo-contract checker’ı PowerShell UTF-8 / literal eşleşme kırılganlığına karşı yerelde sağlamlaştırılmış son haliyle green alınmıştır

---

## 1) M46.6 resmi kapsam özeti

### M46.6-A — AI Job Guide
- Copilot korunarak üstüne rehber katmanı eklendi
- varsayılan sade Türkçe rehber akışı
- `jobType / jobTitle / guideLevel / plainSummary / whatToDoNow / whatToDoNext / doNotDo / stepByStep / commonMistakes / doneChecklist / simpleTerms / screenExplanation`

### M46.6-B — Precheck + Locked Reason + Quick Actions
- başlamadan önce kontrol
- `canProceed / whyBlocked / lockedActionReasons / quickActions / ifStuck / copyOutputs`
- “neden kapalı / buradan aç / takıldıysan buraya git” mantığı

### M46.6-T — Location Source Guide
- ürün dili:
  - `sürücünün telefon GPS'i`
  - `cihaz GPS'i`
  - `konum kaynağı`
- ana akış sürücünün telefon GPS'i
- cihaz GPS'i ek kaynak olarak anlatılır
- konum kaynağı ve GPS teşhis rehberi var

### M46.6-C — Screen Help + Button/Menu Guide + Role Help
- `SCREEN_MENU_GUIDE`
- `BUTTON_ACTION_GUIDE`
- `ROLE_HELP_GUIDE`
- ekran ne için var / butonlar ne yapar / bu rolde ne yapabilirim

### M46.6-D — Conversational Copilot / Chat Shell
- yeni intent: `CHAT_HELP`
- Sohbet / Rehber / Gelişmiş yapısı
- mesaj listesi + giriş kutusu + hızlı soru chip’leri
- rehber cevabı chat biçimine sarılır
- read-only / suggestion-first çizgisi korunur

### M46.6-D2 — Context-aware Chat
- screen / entity / role mode birlikte işlenir
- `roleMode / activeEntityLabel / screenDefinition` bağlamı cevapta taşınır

### M46.6-D3 — Actionable Chat
- `OPEN_ROUTE / OPEN_GUIDE / ASK / COPY_TEXT`
- `actionPlanLabel` ve `lastQuickActions`
- room shift actionable chat runtime green
- driver simple actionable chat runtime green

### M46.6-C2 — Screen Coverage + Terminology Expansion
- ek ekran kapsamı:
  - `/room/hub`
  - `/company/hub`
  - `/school/hub`
  - `/organization/hub`
  - `/company/georeview`
  - `/shared/notifications`
  - `/shared/logs`
  - auth-invites / check-in varyantları
- ek terimler:
  - Hub
  - Inbound
  - Outbound
  - Giriş daveti
  - Erişim linki
  - Bildirim
  - İşlem kaydı / log
  - Konum İncele
  - OSRM
  - Matrix
  - Check-in

### M46.6-D4 — Simple Role Mode
- `DRIVER / PERSONEL / PARENT` için daha kısa yanıt
- daha az teknik yoğunluk
- daha az chip
- daha çok yönlendirme
- D3 quick action uyumluluğu korunur

---

## 2) Dil ve ürün kararları

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

Yardım dili:
- çok sade Türkçe
- düşük bilgi seviyesine uygun
- kısa cümle
- teknik terim minimum
- kullanıcıyı düşündürmeden yönlendiren metin

---

## 3) Rol bazlı yardım/chat kararı

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

## 4) Korunacak ürün kararları

- Copilot çekirdeği korunur
- `POST /api/ai/copilot` korunur
- AI hattı read-only / suggestion-first kalır
- otomatik write action eklenmez
- step-up kuralları korunur
- telematics mevcut sürücünün telefon GPS'i akışını bozmaz
- cihaz GPS'i ek kaynak olarak anlatılır
- overlay standardı tek zip / tek kök / nested root yok olmalıdır

---

## 5) Docs / SSOT durumu

Bu repo seviyesi için SSOT senki uygulanmış kabul edilir:
- `tools/PRIMER_SNAPSHOT.md`
- `docs/PRIMER_SSOT.md`
- `docs/CHECKLIST_SSOT.md`
- `tools/CHECKLIST_SSOT.md`
- `docs/STARTPACK_V1.md`
- `tools/README.md`

Not:
- C2 sırasında `intentRouter.js` chip kapsamı ve repo-contract checker sağlamlaştırması yapıldı
- D4 sırasında simple role mode + D3 geriye uyum birlikte korundu
- final resmi durum: `C2` ve `D4` green

---

## 6) Yeni sohbet açınca ilk cümle

Repo şu an M41 ana green tabanı üzerinde; M42 optional, Step 0.6 stabil, Step 1 Security, Step 1 TOTP, M104/M105/M106 hijyen, M43 Google Auth, M44 Telematics, M45 Retention + Backup, M46 AI Copilot, M46.1–M46.5 gelişmiş copilot zinciri, M46.6-A/B/T/C rehber hattı, M46.6-D chat shell, M46.6-D2 context-aware chat, M46.6-D3 actionable chat, M46.6-C2 screen coverage + terminology ve M46.6-D4 simple role mode ayrı pack/check hatlarıyla green durumda. Copilot korunuyor; üstüne sade Türkçe rehber, ön kontrol, neden kapalı, buradan aç, konum kaynağı rehberi, ekran/buton rehberi, sohbet, bağlamlı chat, actionable quick action’lar ve simple role mode eklendi.
