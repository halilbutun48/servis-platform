# STEP1 DRIVER DEVICE HOTFIX V2 — 2026-03-10

- Fixes runtime check flake caused by hardcoded driver `deviceId`
- Reuses currently bound driver device from DB when present
- Safe to apply over Step 1 foundation overlay