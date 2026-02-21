M16.1 — Milestone Tanımı

Ad: M16.1 Shift People + Stop Generate + Route Preview (Backend)
Çıktılar:

DB: GeoStatus, ShiftPersonel, ShiftImport, ShiftImportRow, StopAssignment

API:

GET /api/shifts/:id/people (COMPANY)

PUT /api/shifts/:id/people?mode=REPLACE|MERGE (COMPANY)

POST /api/shifts/:id/people/import?mode=REPLACE|MERGE (COMPANY)

POST /api/shifts/:id/stops/generate?maxWalkM=250&mode=REPLACE (COMPANY)

GET /api/shifts/:id/route-preview (COMPANY + ROOM)

Algoritma: maxWalkM garantili medoid-cluster (her kişi durağa ≤ maxWalkM)

Gate: tools/gate.ps1 içine M16 eklenecek

Check: backend/scripts/m16check.js

Doğrulama: tools/pack.ps1 -To 16
