# M81.7.2 — Prisma schema: Company.kind + Personel.kind

> Tarihsel not (2026-04-01): Bu dosyadaki M80/M81/M82 numarası Mart 2026 overlay serisine aittir. Güncel aktif milestone anlamı için `docs/PRIMER_SSOT.md` ve `docs/MILESTONE_REGISTRY_V1.md` baz alınır.


## Problem
Seed/UI started using `Company.kind=SCHOOL` and `Personel.kind=STUDENT`, but `schema.prisma` did not have these fields.
This caused Prisma validation errors during seed (API health timeout).

## Fix
Add enums and fields:
- `enum CompanyKind { COMPANY SCHOOL }`
- `enum PersonelKind { PERSONEL STUDENT }`
- `Company.kind CompanyKind @default(COMPANY)` + indexes
- `Personel.kind PersonelKind @default(PERSONEL)` + index

## Apply
Run:
- `tools/patch-m81_7_2-company-kind.ps1`

Then run your normal `reset-and-pack.ps1`.
