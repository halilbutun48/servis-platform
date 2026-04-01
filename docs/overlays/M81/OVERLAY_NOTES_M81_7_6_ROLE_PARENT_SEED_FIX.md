# OVERLAY — M81.7.6 — Seed Parent role + Prisma Role enum fix

> Tarihsel not (2026-04-01): Bu dosyadaki M80/M81/M82 numarası Mart 2026 overlay serisine aittir. Güncel aktif milestone anlamı için `docs/PRIMER_SSOT.md` ve `docs/MILESTONE_REGISTRY_V1.md` baz alınır.


## Problem
`reset-and-pack.ps1` sırasında API container seed aşamasında düşüyor:
- `Argument role is missing` (parent@demo.com)

Root cause:
- `enum Role` içinde `PARENT` yok → `Role.PARENT` undefined
- Seed `upsertUser` create/update’da `role` zorunlu olduğu için Prisma validation error → API health timeout

## Fix
- `backend/prisma/schema.prisma`
  - `enum Role` içine `PARENT` eklendi.
- `backend/prisma/seed.js`
  - parent user seed: `role: "PARENT"` (string)

## DoD
- `reset-and-pack.ps1` seed aşamasını geçer
- Demo kullanıcılar: superadmin/company/room/driver/personel/school/parent oluşturulur
