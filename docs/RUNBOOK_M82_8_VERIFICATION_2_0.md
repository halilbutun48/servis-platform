# M82.8 — Verification 2.0 Runbook

## Amaç
M82.4 → M82.7 arasında mobil hatta yapılan sertleştirmeleri tek kabul omurgasında tekrar doğrulamak ve son anda çıkan web runtime kırıklarını da statik guard ile yakalamaktır.

Bu fazın yaklaşımı şudur:
- backend tek gerçeklik olmaya devam eder
- mobil ve web bu kontrata bağlı istemcilerdir
- check zinciri eski kırık davranışa değil yeni doğru davranışa hizalanır
- "pack geçsin yeter" değil, tekrar edilebilir kabul hedeflenir

## Kapsam
- mobil selected-shift / snapshot / pending-session-event omurgası
- mobil route ops + offline/backoff + release/env kabul hattı
- company vardiyalar panelindeki `computePackageShiftIds` runtime guard'ı
- mobil acceptance zincirine M82.8 final verification adımı

## Kanonik komutlar
- `cd mobile`
- `npm run check:m82.8`
- `npm run acceptance:mobile`
- `node ..\web\scripts\m82_8_company_shifts_runtime_guard_check.cjs`
- `powershell -ExecutionPolicy Bypass -File tools\pack_m82_8_verification_2_0.ps1 -RepoRoot D:\servis-platform`

## Beklenen çıktı
- `M82.8 VERIFICATION 2.0 CHECK PASS`
- `M82.8 COMPANY SHIFTS RUNTIME GUARD PASS`
- `M82.8 VERIFICATION 2.0 PACK PASS OK`

## Bu faz kapanınca
- M82.4, M82.5, M82.6, M82.7 ve M82.8 zinciri birlikte tekrar edilebilir hale gelir.
- M82 sonrası saha hazırlık ve sonraki ticari omurga işlerine daha güvenli geçilir.
