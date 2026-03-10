# OVERLAY — Fix M41 device binding regression (2026-03-06)

Fixes:
- Login schema now accepts `deviceId`
- Driver login enforces device binding (bind-on-first-login, mismatch => 403 DEVICE_MISMATCH)
- Adds `/api/auth/refresh` (rotating refresh sessions) + `/api/auth/logout`
- Adds User device fields + RefreshSession model to Prisma schema (db push will apply)
- Ensures docker compose sets `RATE_LIMIT_STORE=redis` so `m41check.js` passes

Apply:
1) Extract zip to repo root
2) Run `./tools/overlay_fix_m41_device_binding.ps1`
3) Run `./tools/pack.ps1 -To 41`
