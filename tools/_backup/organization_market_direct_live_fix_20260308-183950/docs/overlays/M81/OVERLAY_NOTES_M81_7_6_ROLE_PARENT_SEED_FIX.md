# OVERLAY — M81.7.6 — Seed Parent role + Prisma Role enum fix

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
