# OVERLAY — M57 HOTFIX — Agreement Bargaining API

Problem: UI calls `PUT /api/agreements/:id/counter` but backend returns `Cannot PUT ...` (route missing).

Fix:
- Adds AgreementStatus `COUNTERED` to Prisma schema.
- Adds endpoints:
  - `PUT /api/agreements/:id/counter` (ROOM)
  - `PUT /api/agreements/:id/accept-counter` (COMPANY)
  - `PUT /api/agreements/:id/reject-counter` (COMPANY)
- Blocks `approve` while status=COUNTERED.
- Emits `agreement:update` and sends notifications via `createAndEmitNotification`.

Apply:
- Extract to repo root.
- Run `tools/pack.ps1 -To 35` (rebuild containers, prisma db push runs).
