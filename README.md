# SERVIS-PLATFORM — PERSONEL SERVİS V1

Bu repo, **servis aracı sağlayıcıları ile servis ihtiyacı olan firma / okul / organizasyonları buluşturan teklif–pazarlık–uzlaşma pazaryeri + operasyon yönetim platformunun** canlı çalışma ağacıdır.

## Hızlı referans
- Primer snapshot: `tools/PRIMER_SNAPSHOT.md`
- Primer SSOT: `docs/PRIMER_SSOT.md`
- Checklist SSOT: `docs/CHECKLIST_SSOT.md`
- Startpack: `docs/STARTPACK_V1.md`
- Project spec: `docs/PROJECT_SPEC_V1.md`
- API spec: `docs/API_SPEC_V1.md`
- DB spec: `docs/DB_SCHEMA_V1.md`
- UI spec: `docs/UI_SPEC_V1.md`
- Overlay notları: `docs/overlays/`

## Resmi green çizgisi
- `M41 PACK PASS`
- `M42 OPTIONAL PACK PASS`
- `STEP 0.6 STABIL PACK PASS`
- `STEP 1 SECURITY FOUNDATION PACK PASS`
- `STEP 1 TOTP STEP-UP PACK PASS`
- `M104 REPO CLEANUP CHECK PASS`
- `M105 TOOLS HYGIENE CHECK PASS`
- `M106 REPO HYGIENE + LINK TTL CHECK PASS`
- `M43 GOOGLE AUTH + INVITE GATE PACK PASS OK`
- `M44 TELEMATICS PACK PASS OK`
- `M45 RETENTION + BACKUP PACK PASS OK`
- `M46 AI COPILOT FOUNDATION PACK PASS OK`
- `M46.1–M46.9 zinciri green`
- `M47 KVKK NOTICE / CONSENT FRAMEWORK PACK PASS OK`
- `M47.2 CAPACITY & LOAD BASELINE PACK PASS OK`
- `M47.3 PRODUCTION RESILIENCE + EDGE SECURITY PACK PASS OK`
- `M47.4 MOBILE READINESS WEB PASS PACK PASS OK`
- `M47.4-R CLEAN RERUN / REPRO FIX VERIFIED`
- `M48 DRIVER MOBILE FOUNDATION PACK PASS OK`
- `M48.5 ROOM / COMPANY TABLET READINESS PACK PASS OK`
- `M49 MOBILE BETA HARDENING PACK PASS OK`
- `M49.1 DRIVER VOICE GUIDANCE + STOP ETA PACK PASS OK`
- `M50 MOBILE RELEASE READINESS PACK PASS OK`
- `M51–M53 BACKFILL VERIFICATION PACK PASS OK`
- `M54.3 DISPATCH APPROVE + REPACK PACK PASS OK`
- `M54.4 DRIVER ROUTE DELIVERY PACK PASS OK`
- `M55 REPORTS + NO_SHOW PACK PASS OK`
- `M56 KVKK MATRIX + ETA QUALITY PACK PASS OK`
- `M57 MOBILE HARDENING PACK PASS OK`
- `M58 FINAL PILOT READINESS PACK PASS OK`
- `POST-M41 EXTERNAL PACK RUNNER (M42 -> M58) PASS OK`

## Güncel aktif ürün hattı (2026-03-19)
- Post-M41 tam hat için kanonik komut: `tools\pack_post_m41_to_m58.ps1 -RepoRoot D:\servis-platform -NoBuild`
- `M58 — Final Pilot Readiness` teknik readiness kapısı geçti; `tools\pack_m58_final_pilot_readiness.ps1 -RepoRoot D:\servis-platform` komutu tarihsel kontrat olarak korunur.
- `M58` için `manuel pilot kabul` / manuel pilot signoff ifadesi tarihsel not olarak korunur; gerçek saha çıkış kapısı artık `M65 — Pilot Launch Gate` altında kapatılacaktır.
- Yeni resmi saha öncesi rota: `M59 → M65`
- Kural: **M59 bitmeden M60'a, M60 bitmeden M61'e geçilmez. Paralel dağınık ilerleme yok.**
- Kural: **M65 green olmadan sahaya çıkılmayacak.**

## Ürün kimliği
- Ürünün ana kimliği **B2B servis pazaryeri + operasyon platformu**dur.
- Ticari katman: ihtiyaç, teklif, pazarlık, uzlaşma, sözleşme.
- Operasyon katmanı: vardiya, araç, sürücü, rota, canlı takip, rapor, kalite.
- Güven katmanı: KVKK, audit, gözlemleme, acceptance, checklist, pack/check disiplini.

## Bugünkü sabit ürün kararları
- Driver login ana akışı `Sürücü Kodu + PIN` olarak korunur.
- İlk girişte PIN değişimi zorunludur.
- Ürün içi konum dili `sürücünün telefon GPS'i` olarak korunur.
- Company default `maxWalkM = 250`, School default `maxWalkM = 50`.
- Oluşturma için tek kaynak **Planlama Merkezi** olmalıdır.
- **Vardiyalar** ekranı oluşturma değil, takip / operasyon ekranı olarak kalmalıdır.
- DRAFT / REQUESTED ayrımı korunur.
- Room seçip teklif göndermeden iş markete düşmemelidir.
- Guided Mode kullanıcıyı gereksiz draft mantığıyla uğraştırmamalıdır.
- Dispatch preview shift bazlı çalışmalıdır.
- Aktif gelmedi kaydı olan sürücü, atama / onay hattında server tarafında engellenmelidir.
- Overlay standardı: **tek zip / tek kök klasör / nested root yok**.

## Yeni resmi rota
- `M58 — Final Pilot Readiness` _(teknik gate geçti, saha çıkışı M65'e taşındı)_
- `M59 — Gözlemleme + Saha Teşhis`
- `M60 — Saha Acceptance Merkezi`
- `M61 — SSOT + Milestone Hizası`
- `M62 — Ticari Omurga Güçlendirme`
- `M63 — Güven + Kalite + Hizmet Değerlendirme`
- `M64 — Doğal Copilot Katmanı`
- `M65 — Pilot Launch Gate`

## Kanonik komutlar
- Ana regresyon: `tools\pack.ps1 -To 41`
- Post-M41 tam hat: `tools\pack_post_m41_to_m58.ps1 -RepoRoot D:\servis-platform -NoBuild`
- M58 hazirlik komutu: `tools\pack_m58_final_pilot_readiness.ps1 -RepoRoot D:\servis-platform`
- M59 pack: `tools\pack_m59_observability_field_diagnostics.ps1 -RepoRoot D:\servis-platform`

## Çalışma kuralı
- Önce SSOT güncellenir.
- Sonra milestone resmi olarak açılır.
- Her milestone için runbook + milestone + pack + check + kod iskeleti birlikte eklenir.
- Checklist'te `[x]` yalnızca resmi pack/check green sonrası işaretlenir.
