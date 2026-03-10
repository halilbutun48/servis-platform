# OVERLAY M58.6 (2026-03-06)

## Neyi düzeltir?
1) **Driver 'Görevi Bitir' → Shift DONE**: `backend/src/routes/driver.js` içinde `completeShift()` atomik hale getirilir ve
   `shift:update` WS event'i yayınlanır. Böylece Company/Room listeleri anında güncellenir.

2) **Agreement niye ACTIVE kalıyor?**: Company/Room Agreements panellerine kısa not eklenir:
   Agreement status **per-shift değil, time-based** (endDate+endMin) — end zamanı geçince DONE olur.

## Uygulama
- Zip'i repo köküne aç
- `.	ools\overlay_M58_6_apply.ps1`
- `.	ools\pack.ps1 -To 41`
