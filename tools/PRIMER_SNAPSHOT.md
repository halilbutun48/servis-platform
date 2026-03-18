# SERVIS-PLATFORM — PERSONEL SERVİS V1 — PRIMER SNAPSHOT

Tarih: 2026-03-19
Timezone: Europe/Istanbul
Repo: `D:\servis-platform`
Branch: `main`

## 0) Resmi green taban

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
- ✅ `M46.1–M46.9 zinciri green`
- ✅ `M47 KVKK NOTICE / CONSENT FRAMEWORK PACK PASS OK`
- ✅ `M47.2 CAPACITY & LOAD BASELINE PACK PASS OK`
- ✅ `M47.3 PRODUCTION RESILIENCE + EDGE SECURITY PACK PASS OK`
- ✅ `M47.4 MOBILE READINESS WEB PASS PACK PASS OK`
- ✅ `M47.4-R CLEAN RERUN / REPRO FIX VERIFIED`
- ✅ `M48 DRIVER MOBILE FOUNDATION PACK PASS OK`
- ✅ `M48.5 ROOM / COMPANY TABLET READINESS PACK PASS OK`
- ✅ `M49 MOBILE BETA HARDENING PACK PASS OK`
- ✅ `M49.1 DRIVER VOICE GUIDANCE + STOP ETA PACK PASS OK`
- ✅ `M50 MOBILE RELEASE READINESS PACK PASS OK`
- ✅ `M51–M53 BACKFILL VERIFICATION PACK PASS OK`
- ✅ `M54.3 DISPATCH APPROVE + REPACK PACK PASS OK`
- ✅ `M54.4 DRIVER ROUTE DELIVERY PACK PASS OK`
- ✅ `M55 REPORTS + NO_SHOW PACK PASS OK`
- ✅ `M56 KVKK MATRIX + ETA QUALITY PACK PASS OK`
- ✅ `M57 MOBILE HARDENING PACK PASS OK`
- ✅ `M58 FINAL PILOT READINESS PACK PASS OK`
- ✅ `POST-M41 EXTERNAL PACK RUNNER (M42 -> M58) PASS OK`

Not:
- Resmi green çizgi artık `M58` teknik readiness seviyesine kadar doğrulanmıştır.
- Post-M41 tam hat için kanonik komut `tools\pack_post_m41_to_m58.ps1 -RepoRoot D:\servis-platform -NoBuild` seklindedir.
- `M58 hazirlik komutu`: `tools\pack_m58_final_pilot_readiness.ps1 -RepoRoot D:\servis-platform`.
- `M58` için `resmi green` / `manuel pilot kabul` notu tarihsel olarak korunur; saha çıkış kararı artık `M65` altında kapatılacaktır.

## 1) Güncel aktif durum
- Ürün kimliği artık açık şekilde **B2B servis pazaryeri + operasyon platformu** olarak yazılmıştır.
- Saha testi en son adım olacak; `M65` green olmadan sahaya çıkılmayacaktır.
- Yeni resmi rota `M59 → M65` olarak açıldı.
- İlk aktif iş `M59 — Gözlemleme + Saha Teşhis`.
- `M59` bitmeden `M60`a geçilmeyecektir.

## 2) Sabit ürün / repo kuralları
- Driver login ana akışı `Sürücü Kodu + PIN` olarak korunur.
- İlk girişte PIN değişimi zorunludur.
- Ürün içi konum dili: `sürücünün telefon GPS'i`.
- Company default `maxWalkM = 250`, School default `maxWalkM = 50`.
- Oluşturma için tek kaynak **Planlama Merkezi** olmalıdır.
- **Vardiyalar** ekranı oluşturma değil, takip / operasyon ekranı olarak kalmalıdır.
- Room seçip teklif göndermeden iş markete düşmemelidir.
- Guided Mode kullanıcıyı gereksiz draft mantığıyla uğraştırmamalıdır.
- Overlay standardı: **tek zip / tek kök klasör / nested root yok**.
- CHECKLIST'te `[x]` yalnızca pack/check green sonrası işaretlenir.

## 3) Yeni resmi saha öncesi rota
- `M59 — Gözlemleme + Saha Teşhis`
- `M60 — Saha Acceptance Merkezi`
- `M61 — SSOT + Milestone Hizası`
- `M62 — Ticari Omurga Güçlendirme`
- `M63 — Güven + Kalite + Hizmet Değerlendirme`
- `M64 — Doğal Copilot Katmanı`
- `M65 — Pilot Launch Gate`

## 4) Kanonik komutlar
- Ana regresyon: `tools\pack.ps1 -To 41`
- Post-M41 tam hat: `tools\pack_post_m41_to_m58.ps1 -RepoRoot D:\servis-platform -NoBuild`
- M58 hazirlik komutu: `tools\pack_m58_final_pilot_readiness.ps1 -RepoRoot D:\servis-platform`
- M59 pack: `tools\pack_m59_observability_field_diagnostics.ps1 -RepoRoot D:\servis-platform`

## 5) Yeni sohbet için ilk cümle
Repo su an `M58` teknik readiness seviyesine kadar green; yeni resmi saha öncesi rota `M59 → M65` olarak açıldı. İlk aktif iş `M59 — Gözlemleme + Saha Teşhis`; kanonik komut `tools\pack_m59_observability_field_diagnostics.ps1 -RepoRoot D:\servis-platform`.
