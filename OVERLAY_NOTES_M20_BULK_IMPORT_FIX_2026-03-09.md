# M20 bulk availability import hotfix

## Problem
`POST /api/availability/bulk` returned 500 with:

- `findAgreementConflictsForRangeBatch is not defined`

Root cause: `backend/src/routes/availability.js` used batch helpers but did not import them.

## Fix
Added these imports:

- `findAgreementConflictsForRangeBatch` from `services/agreementConflictBatch.js`
- `findShiftConflictsForRangeBatch` from `services/shiftConflictBatch.js`

## Scope
Minimal hotfix for M20 regression. No behavior change beyond resolving the missing reference.
