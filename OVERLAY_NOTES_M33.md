M33 — Plan Builder contract + gate

Bu overlay şunları ekler/düzeltir:

- `/api/plan-builder` router mount (server.js)
- `GET /api/plan-builder/precheck` (Guided Flow Step-0 için tek endpoint)
- `backend/scripts/m33check.js` gate
- tools `pack.ps1` / `gate.ps1` `-To 33` desteği
- docs: `API_SPEC_V1.md` Plan Builder bölümü + `RUNBOOK_M34_STEP0.md`

Notlar:
- OSRM + solver compose’da `--profile osrm` altında olduğu için default PACK’te çalışmaması normal.
- M33CHECK bu yüzden OSRM/solver’ı **optional** kabul eder (200 + ok=false).
