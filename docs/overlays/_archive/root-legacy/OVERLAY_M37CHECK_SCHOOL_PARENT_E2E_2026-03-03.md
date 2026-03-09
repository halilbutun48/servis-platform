# OVERLAY — M37CHECK: School + Parent E2E (M80/M81 doğrulama)

Tarih: 2026-03-03

## Ne içerir?

- `backend/scripts/m37check.js`
  - School (Company.kind=SCHOOL) + Parent (PARENT) akışını tek senaryoda uçtan uca test eder.

- `tools/gate.ps1`
  - Check listesine **M37** eklendi. Artık `-To 37` ile çalıştırılabilir.

- Docs
  - `docs/overlays/M81/OVERLAY_NOTES_M81_12_M37CHECK_SCHOOL_PARENT_E2E.md`
  - `docs/overlays/M81/README.md` + `docs/overlays/INDEX.md` güncellendi.

## Beklenen

- `stops/generate` stop.order **1’den başlamalı** (M37CHECK bunu assert eder)
- School’da yaratılan kayıtlar `kind=STUDENT` olmalı (ParentChild bağlama bununla çalışır)

## Çalıştırma

- `tools/pack.ps1 -To 37`

