# OVERLAY M72 — Driver Offline Queue + Audit + Pause/Resume

## Goal
Sahada internet kesilse bile sürücü operasyonu devam etsin:
- Start / Reached / Undo / Pause / Resume / Complete aksiyonları offline iken kuyruğa alınır.
- Online olunca otomatik/manuel flush ile sırayla gönderilir.
- Backend tarafında tüm driver/auto aksiyonları AuditLog’a düşer.

## Policy
- **Pause (Molaya Al)** varken (A) **Reached/Skip kapalı**. Sadece Resume ile devam.
- Shift status enum değişmez (ACTIVE kalır). Pause state: `ShiftProgress.pausedAt`.

## Backend
- `ShiftProgress`: `startedAt`, `pausedAt` eklendi (db push ile)
- New endpoints:
  - `POST /api/driver/shifts/:id/pause`
  - `POST /api/driver/shifts/:id/resume`
- Reached/Skip: pausedAt varsa `409 { code: "SHIFT_PAUSED" }`
- Auto-geofence: pausedAt varsa stop reached yapmaz.
- Audit actions:
  - DRIVER_SHIFT_START / PAUSE / RESUME / COMPLETE
  - DRIVER_STOP_REACHED / SKIPPED / REOPEN / UNDO
  - AUTO_STOP_REACHED / AUTO_SHIFT_COMPLETE

## Web (Driver)
- Offline badge + queue counter
- Queue flush button (online iken)
- Route ekranında Pause/Resume butonu

