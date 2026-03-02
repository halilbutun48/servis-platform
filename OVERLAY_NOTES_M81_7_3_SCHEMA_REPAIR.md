# OVERLAY — M81.7.3 — Prisma schema repair

## Why?
A previous patch wrote literal `\n` sequences into `backend/prisma/schema.prisma`, which breaks Prisma validation (P1012).

## What this overlay adds
- `tools/repair-schema-kind.ps1`
  - Converts accidental literal `\n` / `\r\n` sequences to real newlines
  - Dedupes accidental duplicate fields (e.g. `User.notifications`, `Company.kind`, `Personel.kind`)
  - Creates a timestamped backup in `tools/_backup/`

## Run
1) Extract this overlay to repo root.
2) Run:
- `cd D:\servis-platform; .\tools\repair-schema-kind.ps1`
- `.\tools\reset-and-pack.ps1`
