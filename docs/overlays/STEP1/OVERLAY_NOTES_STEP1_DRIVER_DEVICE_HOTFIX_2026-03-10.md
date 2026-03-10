# STEP1 Driver Device Hotfix (2026-03-10)

## Problem
`tools/pack_step1_security_foundation.ps1` runtime check failed on:
- `login ok driver@demo.com`

Root cause:
- `backend/scripts/step1_security_foundation_check.js` used a hardcoded deviceId.
- After M41/device-binding checks, seeded driver may already be bound to another deviceId.
- That produced `403 DEVICE_MISMATCH` even though Step 1 logic itself was correct.

## Fix
- Runtime check now resolves the current driver `deviceId` directly from DB via Prisma.
- If driver is not yet bound, it falls back to `step1-driver-device`.

## Result
- Step 1 foundation runtime check becomes stable across reruns and after prior M41 checks.