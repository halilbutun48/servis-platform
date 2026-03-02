# OVERLAY M71 — DRIVER Auto-Reached (Geofence) + Undo Window

## Summary
- Adds **AUTO-REACHED** based on vehicle GPS ingest (`POST /api/gps`).
  - When vehicle is within **80m** of the **next pending stop** and (speed ≤ **15 km/h** if provided), stop is marked `REACHED` automatically.
  - Emits `route:progress` WS to `shift:*`, `room:*`, `company:*`, `vehicle:*`.
  - If no pending stops remain → shift becomes `DONE`.

- Adds **Undo (2 minutes)** endpoint:
  - `POST /api/driver/shifts/:shiftId/stops/:stopId/undo`
  - Works only for `REACHED`/`SKIPPED` within 120 seconds.

- Improves driver progress consistency:
  - `lastReachedOrder` is derived from stop states so undo/reopen doesn't leave progress stuck.

## Test
1) Driver starts a shift (APPROVED → ACTIVE)
2) Send GPS to `/api/gps` near next stop (lat/lng ~ stop)
3) Observe stop becomes reached without manual click.
4) Call `/api/driver/shifts/:id/stops/:stopId/undo` within 2 minutes.
