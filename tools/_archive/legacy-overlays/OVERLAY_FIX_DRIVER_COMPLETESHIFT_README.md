# OVERLAY — Fix driver.js crash (2026-03-06)

## Problem
API container crashes at startup:
`SyntaxError: Invalid or unexpected token` in `src/routes/driver.js` around `prisma.\([`
This happens when PowerShell expanded `$transaction` to empty during a previous patch, producing invalid JS.

## Fix
This overlay rewrites `completeShift()` safely and uses:
- `prisma.$transaction([...])` (atomic)
- `emitShift(..., "shift:update")` to refresh Company/Room lists

## Apply
1) Extract zip to repo root
2) Run `./tools/overlay_fix_driver_completeshift_crash.ps1`
3) Run `./tools/pack.ps1 -To 41`
