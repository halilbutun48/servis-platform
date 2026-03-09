# OVERLAY M81.7.8 — maxWalkM clamp (no-crash)

## Problem
`POST /api/shifts/:id/stops/generate?maxWalkM=...` çağrısında UI bazen `maxWalkM=0` veya boş string gönderiyordu.
`qMaxWalkSchema` `min(50)` olduğundan Zod parse throw ediyordu ve async route handler içinde yakalanmadığı için **Node process crash** oluyordu.

## Fix
- `maxWalkM` için preprocess:
  - `""/null/undefined` → default 250
  - `0..49` → **50** (clamp)
  - `>2000` → **2000** (clamp)
  - NaN → default 250

Bu sayede invalid param crash yerine güvenli değere clamp olur.

## Files
- `backend/src/routes/shifts/people.js`
