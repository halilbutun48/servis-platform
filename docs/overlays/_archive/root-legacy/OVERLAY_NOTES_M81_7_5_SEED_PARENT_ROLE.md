# M81.7.5 — Seed: Parent role fix

## Problem
`parent@demo.com` seed was failing with `Argument role is missing` because `role: Role.PARENT` evaluated to `undefined` in some builds (stale prisma client enum / schema drift). This crashes seed and blocks API health.

## Fix
Replace `Role.PARENT` with string literal `"PARENT"` inside `backend/prisma/seed.js` via script.

## Apply
Run:
- `./tools/patch-seed-parent-role.ps1`
- then `./tools/reset-and-pack.ps1`
