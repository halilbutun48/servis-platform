# OVERLAY M58.4 (2026-03-06)

Sorun: DRIVER 'Görevi Bitir' (complete) sonrası Company/Room listeleri ACTIVE'de kalıyor.
Sebep: backend `completeShift()` sadece `route:progress` emit ediyordu; UI bu event'i dinlemiyor.
Çözüm: `completeShift()` içinde `emitShift(..., "shift:update", ...)` emit edilir.

Dosya:
- backend/src/routes/driver.js

Uygulama:
- zip'i repo köküne aç
- `.	ools\overlay_M58_4_apply.ps1`
- `.	ools\pack.ps1 -To 41`

Beklenen:
- Driver complete → Company/Room/Vardiyalar listesi otomatik refresh (ACTIVE kaybolur / DONE olur).
