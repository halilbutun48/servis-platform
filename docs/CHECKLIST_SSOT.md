# SERVIS-PLATFORM — PERSONEL SERVİS V1/V2 — CHECKLIST (SSOT)

Timezone: Europe/Istanbul  
Last updated: **2026-03-14**  
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
- **M46.3 AI COPILOT QUALITY + EVIDENCE PACK PASS OK**
- **M46.4 AI COPILOT DECISION CONSISTENCY + ACTION PLAN PACK PASS OK**
- **M46.5 AI COPILOT ACTION PRIORITIZATION + EVIDENCE CALIBRATION PACK PASS OK**
- **M46.6-A AI JOB GUIDE PACK PASS OK**
- **M46.6-B AI JOB GUIDE PRECHECK PACK PASS OK**
- **M46.6-T AI LOCATION SOURCE GUIDE PACK PASS OK**
- **M46.6-C AI SCREEN HELP PACK PASS OK**
- **M46.6-D AI CHAT SHELL PACK PASS OK**
- **M46.6-D2 AI CONTEXT CHAT PACK PASS OK**
- **M46.6-D3 AI ACTIONABLE CHAT PACK PASS OK**
- **M46.6-C2 SCREEN COVERAGE + TERMINOLOGY PACK PASS OK**
- **M46.6-D4 SIMPLE ROLE MODE PACK PASS OK**
- **M46.7 DRIVER CODE LOGIN + REHBER FIRST PACK PASS OK**

Bu dosya iki amaç taşır:
1) **V1 Release/Regression Manuel Checklist** (M0→M41 ana regresyon)
2) **M42 Optional + Step 0.6 + Step 1 + M43→M46.7 üst katmanları** (ana regresyonu bozmadan ayrı doğrulanır)

## Yol Haritası (Sıralı)
- **Step 0:** V1 Manuel Checklist %100 PASS
- **Step 0.5 (M42):** Check-in modülü tamam, optional release olarak doğrulandı
- **Step 0.6:** Stabil ekler ayrı pack ile resmi green
- **Step 1:** Minimum Security + TOTP Step-up resmi green
- **Step 2 (M43):** Google Auth + Invite Gate resmi green
- **Step 2.5 (M44):** Telematics resmi green
- **Step 2.6 (M45):** Retention + Backup resmi green
- **Step 3 (M46):** AI Copilot Foundation resmi green
- **Step 3.1:** Enrichment resmi green
- **Step 3.2:** Intent Expansion resmi green
- **Step 3.3:** Quality + Evidence resmi green
- **Step 3.4:** Decision Consistency + Action Plan resmi green
- **Step 3.5:** Action Prioritization + Evidence Calibration resmi green
- **Step 3.6-A:** AI Job Guide resmi green
- **Step 3.6-B:** AI Job Guide Precheck resmi green
- **Step 3.6-T:** AI Location Source Guide resmi green
- **Step 3.6-C:** AI Screen Help resmi green
- **Step 3.6-D:** AI Chat Shell resmi green
- **Step 3.6-D2:** AI Context Chat resmi green
- **Step 3.6-D3:** AI Actionable Chat resmi green
- **Step 3.6-C2:** Screen Coverage + Terminology resmi green
- **Step 3.6-D4:** Simple Role Mode resmi green
- **Step 3.7:** Driver Code Login + Rehber First resmi green

> Kural: `tools/pack.ps1 -To 41` ana kanıttır.  
> Üst katmanlar ayrı resmi pack/check hatlarıyla doğrulanır.  
> Overlay standardı: **tek zip / tek kök klasör / nested root yok**.  
> Üst milestone’lar alt milestone check uyumluluğunu bozmaz.

---

## Step 3.6 — M46.6 Yardım / Rehber / Sohbet Hattı

### M46.6-A — Job Guide
- [x] Rehber sekmesi açılıyor
- [x] Gelişmiş sekmesi korunuyor
- [x] Teklif ve atama rehberleri dönüyor
- [x] Araç / sürücü bağlama rehberi dönüyor
- [x] Metinler sade Türkçe

### M46.6-B — Precheck + Quick Actions
- [x] Başlamadan önce kontrol görünüyor
- [x] Hazır / Eksik var / Devam edemezsin durumu geliyor
- [x] Bu neden kapalı bölümü görünüyor
- [x] Buradan aç hızlı yönlendirmesi geliyor
- [x] Takıldıysan buraya git bölümü görünüyor

### M46.6-T — Konum Kaynağı Rehberi
- [x] `sürücünün telefon GPS'i` birincil akış olarak anlatılıyor
- [x] `cihaz GPS'i` ek kaynak olarak anlatılıyor
- [x] Konum kaynağı / GPS teşhis rehberi dönüyor
- [x] Terminoloji ürün diliyle uyumlu

### M46.6-C — Screen Help
- [x] Ekran ne için var cevabı geliyor
- [x] Buton / menü rehberi geliyor
- [x] Rol bazlı yardım dönüyor
- [x] DRIVER / PERSONEL / PARENT için de yardım kapsaması var

### M46.6-D — Chat Shell
- [x] CHAT_HELP intent aktif
- [x] Sohbet / Rehber / Gelişmiş yapısı var
- [x] Hızlı soru chip’leri var
- [x] Rehber cevabı chat biçiminde sarılıyor
- [x] read-only / suggestion-first korunuyor

### M46.6-D2 — Context Chat
- [x] Ekran + entity + role mode birlikte taşınıyor
- [x] selected entity ile konuşma mantığı var
- [x] `activeEntityLabel` ve `screenDefinition` cevapta taşınıyor

### M46.6-D3 — Actionable Chat
- [x] `OPEN_ROUTE` aksiyonu var
- [x] `OPEN_GUIDE` aksiyonu var
- [x] `ASK` aksiyonu var
- [x] `COPY_TEXT` aksiyonu var
- [x] `actionPlanLabel` gösteriliyor
- [x] Room actionable chat runtime green
- [x] Driver simple actionable chat runtime green

### M46.6-C2 — Screen Coverage + Terminology
- [x] Room hub / check-in / auth-invites kapsamı var
- [x] Company hub / georeview / check-in / auth-invites kapsamı var
- [x] Shared notifications / logs kapsamı var
- [x] School / Organization hub kapsamı var
- [x] Hub / Inbound / Outbound açıklanıyor
- [x] Giriş daveti / erişim linki farkı açıklanıyor
- [x] Bildirim / log farkı açıklanıyor
- [x] OSRM / Matrix / Check-in açıklanıyor

### M46.6-D4 — Simple Role Mode
- [x] DRIVER / PERSONEL / PARENT için daha kısa cevap var
- [x] Daha az chip gösteriliyor
- [x] Daha az teknik yoğunluk var
- [x] Daha çok yönlendirme veriliyor
- [x] D3 quick action uyumluluğu korunuyor

---

## Step 3.7 — M46.7 Driver Code Login + Rehber First

### M46.7 — Driver Code Login + Rehber First
- [x] Rehber navdock’ta 1. sıraya alındı
- [x] Room login doğrulandı
- [x] Driver create → auto credentials çalışıyor
- [x] Driver code issued doğrulandı
- [x] Temporary PIN issued doğrulandı
- [x] Driver login by code + PIN doğrulandı
- [x] `me.requirePinChange` doğrulandı
- [x] Driver PIN change doğrulandı
- [x] Room reset PIN doğrulandı
- [x] Repo contract pass

---

## Planned Next Route (Not Green Yet)

### M46.8 — Driver Access Hardening
- [ ] Login limiter `identifier` bazlı çalışır
- [ ] Driver login için ayrı daha sıkı bucket vardır
- [ ] `driver/change-pin` için ayrı limiter vardır
- [ ] Hatalı PIN sayacı vardır
- [ ] Geçici lock / cooldown davranışı vardır
- [ ] Room reset sonrası lock/counter temizlenir
- [ ] Minimum PIN policy + kolay PIN blokları vardır
- [ ] Login / fail / lock / reset / change-pin audit alanları genişletilmiştir
- [ ] Driver login `deviceId` akışı netleşmiştir
- [ ] Runtime + repo contract green olmuştur

Scaffold staged (henüz green değil):
- [ ] `backend/scripts/m46_8_driver_access_hardening_check.js`
- [ ] `tools/pack_m46_8_driver_access_hardening.ps1`
- [ ] `tools/check_m46_8_driver_access_hardening_repo_contract.ps1`
- [ ] `docs/RUNBOOK_M46_8_DRIVER_ACCESS_HARDENING.md`

### Sonraki resmi sıra
- [ ] `M46.9 — Session & Refresh Security`
- [ ] `M47 — KVKK Notice/Consent Framework`
- [ ] `M47.2 — Capacity & Load Baseline`
- [ ] `M47.3 — Production Resilience + Edge Security`
- [ ] `M47.4 — Mobile Readiness Web Pass`
- [ ] `M48 — Driver Mobile Foundation`
- [ ] `M49 — Driver Mobile Beta Hardening`

### Daha sonraki aday faz
- [ ] `M49.1 — Driver Voice Guidance + Stop ETA`
  - sıradaki durak / kalan km / tahmini süre
  - navigasyon doğrulamalı sesli yönlendirme
  - durakta binecek kişi sayısı / operasyonel sesli kılavuz
  - rota dışı / durak kaçırma / gecikme uyarıları

> Not: Planned maddeler resmi green değildir; scaffold dosyaları staged olsa bile runtime + repo-contract pack/check üretilmeden `[x]` yapılmaz.

---

## Kanonik komutlar
- `tools\pack.ps1 -To 41`
- `tools\pack_m42_optional.ps1`
- `tools\pack_step06_stabil.ps1`
- `tools\pack_step1_security_foundation.ps1`
- `tools\pack_step1_totp_stepup.ps1`
- `tools\pack_m43_google_auth_invite_gate.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m44_telematics.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m45_retention_backup.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m46_ai_copilot.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m46_1_ai_copilot_enrichment.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m46_2_ai_copilot_intent_expansion.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m46_3_ai_copilot_quality_evidence.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m46_4_ai_copilot_decision_consistency.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m46_5_ai_copilot_action_prioritization.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m46_6_a_ai_job_guide.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m46_6_b_ai_job_guide_precheck.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m46_6_t_ai_location_source_guide.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m46_6_c_ai_screen_help.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m46_6_d_ai_chat_shell.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m46_6_d2_ai_context_chat.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m46_6_d3_ai_actionable_chat.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m46_6_c2_screen_coverage_terminology.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m46_6_d4_simple_role_mode.ps1 -RepoRoot D:\servis-platform`
- `tools\pack_m46_7_driver_code_login_rehber_first.ps1 -RepoRoot D:\servis-platform`

## Kapanış kuralı
- Ana referans yine **M41 PACK PASS**’tir.
- Üst katmanlar ayrı resmi green hatları olarak korunur.
- Yeni AI milestone’ları `M46 → M46.1 → M46.2 → M46.3 → M46.4 → M46.5 → M46.6-A/B/T/C/D/D2/D3/C2/D4 → M46.7` çizgisini ve alt check uyumluluğunu bozmadan ilerlemelidir.
- `M46.8+` hattı güvenlik / session / KVKK / kapasite / mobil hazırlık olarak kademeli ele alınmalıdır.
- `M49.1` aday sesli kılavuz fazıdır; mobil foundation ve saha verisi oturmadan öne çekilmez.
- M45 backup create tool: tools\backup_create_m45.ps1
- M45 backup restore tool: tools\backup_restore_m45.ps1
