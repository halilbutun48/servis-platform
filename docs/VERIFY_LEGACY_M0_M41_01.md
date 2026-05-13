# VERIFY-LEGACY-M0-M41-01 Discovery

## Scope
This report is a discovery-only classification for `backend/scripts/m0check.js` through `backend/scripts/m41check.js`.

Rules followed:
- No product patching.
- No runtime behavior changes.
- No new route, endpoint, schema, or migration.
- Only static classification of test harness / check intent.

## Method
I classified each check by:
- script header and inline comments
- route usage patterns
- current auth/security model markers in the repo
- current step-up / TOTP / password-change / rate-limit surfaces

Current model anchors used for the classification:
- `backend/src/auth/middleware.js` emits `TOTP_SETUP_REQUIRED` and `STEP_UP_REQUIRED`
- `backend/src/bootstrap/routeMounts.js` step-up protects room/super write surfaces such as vehicles, drivers, shifts, admin logs, and export paths
- `backend/src/bootstrap/rateLimits.js` returns `RATE_LIMITED`
- `backend/scripts/_totp_harness.js` is the current step-up/TOTP harness reference

## Classification

### Product regression, current-model compatible
These checks are still valid product regression checks in the current repo state.

- `backend/scripts/m0check.js`
  - Health + `GET /api/me` smoke.
  - No step-up-sensitive write flow.

- `backend/scripts/m21check.js`
  - SUPER_ADMIN panels backend readiness for companies/rooms create/list.
  - This is a core admin readiness check, not a legacy auth-model probe.

- `backend/scripts/m37check.js`
  - Already uses `ensureTotpStepUp`.
  - Includes modern auth flow coverage and `change-password`.

- `backend/scripts/m38check.js`
  - Already uses `ensureTotpStepUp`.
  - Covers KVKK consent gate under the current model.

- `backend/scripts/m41check.js`
  - Refresh token, device binding, and Redis rate-limit coverage.
  - This is the current auth/rate-limit model, not a legacy one.

### Needs adaptation to the current security model
These checks still describe real product behavior, but they are using legacy harness assumptions and are the likely source of `STEP_UP_REQUIRED`, `TOTP_SETUP_REQUIRED`, or `RATE_LIMITED` failures.

- `backend/scripts/m1check.js` through `backend/scripts/m10check.js`
  - Core CRUD, shift, route, vehicle, driver, and lifecycle flows.
  - Several of these hit step-up-protected room/super write surfaces.

- `backend/scripts/m13check.js` through `backend/scripts/m20check.js`
  - Vehicle/driver/shift/agreement/availability flows.
  - These are still product regressions, but the harness needs current step-up/TOTP-aware handling.

- `backend/scripts/m22check.js` through `backend/scripts/m36check.js`
  - Agreement wizard, offer flows, plan builder, and admin user CRUD/reset-password paths.
  - `m36check.js` is especially sensitive because admin user reset-password now sits under the current admin security model.

- `backend/scripts/m39check.js`
  - Admin retention job endpoint.
  - Current admin step-up handling is part of the model now.

- `backend/scripts/m40check.js`
  - RBAC matrix + log export audit trail.
  - Export/admin log surfaces are current step-up-protected surfaces.

### Legacy / historical
These are infrastructure or compatibility gates, not active product regression tests.

- `backend/scripts/m11check.js`
  - Security hardening + `/health` smoke.
  - Legacy infra gate behavior.

- `backend/scripts/m12check.js`
  - StartPack + Pack tool file-system gate.
  - Historical file existence / pack gate.

## Notes

- `backend/scripts/m162check.js` and `backend/scripts/m163check.js` were also discovered during the scan, but they are historical alias checks outside the requested M0-M41 range.
- The modern security model in this repo is step-up aware, TOTP aware, and rate-limit aware.
- Password-change is now a separate current auth surface; it should be treated as a harness/model concern, not as a product regression signal by itself.
- No runtime or product code was changed for this discovery pass.

## Summary

- Product regression, current-model compatible: `M0`, `M21`, `M37`, `M38`, `M41`
- Needs adaptation to current security model: `M1-M10`, `M13-M20`, `M22-M36`, `M39-M40`
- Legacy / historical: `M11`, `M12`

