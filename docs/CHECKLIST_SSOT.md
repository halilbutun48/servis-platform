# SERVIS-PLATFORM — PERSONEL SERVİS V1/V2 — CHECKLIST (SSOT)

Timezone: Europe/Istanbul
Last updated: **2026-03-17**

## Current official green ref
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
- **M46.1–M46.9 zinciri green**
- **M47 KVKK NOTICE / CONSENT FRAMEWORK PACK PASS OK**
- **M47.2 CAPACITY & LOAD BASELINE PACK PASS OK**
- **M47.3 PRODUCTION RESILIENCE + EDGE SECURITY PACK PASS OK**
- **M47.4 MOBILE READINESS WEB PASS PACK PASS OK**
- **M47.4-R CLEAN RERUN / REPRO FIX VERIFIED**
- **M48 DRIVER MOBILE FOUNDATION PACK PASS OK**
- **M48.5 ROOM / COMPANY TABLET READINESS PACK PASS OK**
- **M49 MOBILE BETA HARDENING PACK PASS OK**
- **M49.1 DRIVER VOICE GUIDANCE + STOP ETA PACK PASS OK**
- **M50 MOBILE RELEASE READINESS PACK PASS OK**

> Not: Bu checklistte `[x]` yalnızca pack/check ile resmi green doğrulanmış işler içindir. `M51+` satırları aktif rota / ürün kararı olarak izlenir; henüz resmi green promotion değildir.

## Yol haritası
- **Step 0:** V1 Manuel Checklist %100 PASS
- **Step 0.5 (M42):** Check-in modülü optional release olarak doğrulandı
- **Step 0.6:** Stabil ekler resmi green
- **Step 1:** Minimum Security + TOTP Step-up resmi green
- **Step 2 (M43):** Google Auth + Invite Gate resmi green
- **Step 2.5 (M44):** Telematics resmi green
- **Step 2.6 (M45):** Retention + Backup resmi green
- **Step 3 (M46):** AI Copilot zinciri resmi green
- **Step 4.0 (M47):** KVKK / Capacity / Edge Security / Mobile Web Readiness resmi green
- **Step 4.4–4.8 (M48–M50):** Mobil foundation → tablet readiness → beta hardening → voice ETA → release readiness resmi green
- **Active track (M51–M57):** docs/backlog reset → import+geo pipeline → stop/route productization → room dispatch planner → reports/no-show → KVKK+mobile hardening → final pilot readiness

## Resmi green kutular
- [x] `M47 — KVKK Notice / Consent Framework`
- [x] `M47.2 — Capacity & Load Baseline`
- [x] `M47.3 — Production Resilience + Edge Security`
- [x] `M47.4 — Mobile Readiness Web Pass`
- [x] `M47.4-R — Clean Rerun / Repro Fix`
- [x] `M48 — Driver Mobile App Foundation`
- [x] `M48.5 — Room / Company Tablet Readiness`
- [x] `M49 — Mobile Beta Hardening`
- [x] `M49.1 — Driver Voice Guidance + Stop ETA`
- [x] `M50 — Mobile Release Readiness`

## Aktif rota notları (henüz green kutu değil)
- [ ] `M51 — docs/backlog reset` işlendi; resmi pack promotion yok
- [ ] `M52 — Import + Geo Pipeline` ana akış çalışır durumda; resmi pack promotion yok
- [ ] `M53.1 — Stop Policy Contract` docs tarafında işlendi
- [ ] `M53.2-A — Stop Generation Summary` görünürlük/preset testi görüldü
- [ ] `M53.3 — Planlama Merkezi sadeleştirme + tek oluşturma kaynağı` aktif geliştirme alanı
- [ ] `M54 — ROOM Dispatch Planner / draft → ROOM → atama zinciri`
- [ ] `M55 — Reports + No-show`
- [ ] `M56 — KVKK Matrix + Mobile Hardening`
- [ ] `M57 — Final Pilot Readiness`

## Bugünkü ürün kararları
- Company default `maxWalkM = 250`, School default `maxWalkM = 50`, backend hard limit `50..2000`.
- Company tarafında oluşturma için tek kaynak **Planlama Merkezi** olmalıdır.
- **Vardiyalar** ekranı takip / operasyon ekranı olarak kalmalıdır.
- **Organizasyon Merkezi** ikinci üretim motoru olmamalı; Planlama Merkezi yönüne uyarlanmalıdır.
- Stage-3 basic kullanıcı sırası: `Rota önerisi oluştur → Ön izle → Ayrı market teklifi oluştur`.
- Room tarafı gelen teklifi boştaki araçlar, yakınlık, kapasite ve OSRM/solver ile gerçek operasyona çevirmelidir.

## Tool / SSOT notları
- Ana kanıt: `tools\pack.ps1 -To 41`
- `M47.4-R` için ayrı pack yoktur; aynı `tools\pack_m47_4_mobile_readiness_web_pass.ps1` hattının clean rerun PASS vermesi kanıttır.
- `driver@demo.com / demo123` hızlı panel kontrol hesabı olarak korunur; ana driver ürün akışı değildir.
- overlay standardı: **tek zip / tek kök klasör / nested root yok**
