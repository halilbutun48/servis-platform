# Step1 TOTP greenpack path-fix hotfix

This hotfix fixes the previous hotfix payload paths.
It writes the patched files to the real backend tree:

- backend/src/auth/middleware.js
- backend/src/routes/auth.js
- backend/scripts/_harness.js
- backend/scripts/step1_totp_stepup_check.js

Reason:
Earlier hotfix overlays copied files into `src/...` and `scripts/...` at repo root instead of `backend/...`.
