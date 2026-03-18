# RUNBOOK — M51-M53 BACKFILL VERIFICATION

Tarih: 2026-03-18  
Timezone: Europe/Istanbul

## Amaç
Bu runbook, `M51–M53` için repo içinde zaten bulunan ama resmi tek kanıtta toplanmamış akışları birleştirir.

Bu paketin hedefi:
- `M52` import + geo review hattını runtime ile kanıtlamak
- `M53` stop generation + `route-preview` ürün davranışını runtime ile kanıtlamak
- `Organization / Gezi` yüzeyinin repo-contract içinde görünür olduğunu doğrulamak
- SSOT tarafında “var ama doğrulanmamış” boşluğunu azaltmak

Bu paket şunu iddia etmez:
- `M51–M53` resmi green promotion oldu
- bütün organization senaryoları her seed ortamında canlı çalıştırıldı
- yeni ürün akışı yazıldı

## Kanıt kapsamı
### M52
- `POST /api/shifts/:id/people/import`
- import summary içinde `needsReviewRows`
- `GET /api/company/personels?geoStatus=NEEDS_REVIEW`
- `PUT /api/company/personels/:id/location`

### M53
- `POST /api/shifts/:id/stops/generate`
- `GET /api/shifts/:id/route-preview`
- summary, path points, passenger count ve source alanları

### Organization / Gezi
- `/api/organization/plans`
- `/api/organization/rooms`
- GuidedPlanModal + PlansPanel repo-contract görünürlüğü

## Dosyalar
- `backend/scripts/m51_53_backfill_verification_check.js`
- `tools/pack_m51_53_backfill_verification.ps1`
- `tools/check_m51_53_backfill_verification_repo_contract.ps1`
- `docs/RUNBOOK_M51_53_BACKFILL_VERIFICATION.md`

## Kanıt komutu
```powershell
.	ools\pack_m51_53_backfill_verification.ps1 -RepoRoot D:\servis-platform
```

## Not
Bu adım, `M54` öncesi eksik kalan doğrulama hattını toparlar.
SSOT tarafında yine de `M51+` aktif ürün hattı olarak izlenmeye devam eder; resmi green çizgi ayrı tutulur.
