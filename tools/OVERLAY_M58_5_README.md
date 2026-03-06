# OVERLAY M58.5 (2026-03-06)

**Amaç:** Driver "Görevi Bitir" sonrası Company/Room tarafında shift'in ACTIVE kalmasını kalıcı olarak engellemek.

## Ne yapar?
1) `completeShift()` artık **transaction** ile:
- `shiftProgress.completedAt` set
- `shift.status = DONE` set
Bu sayede yarım kalma olmaz.

2) Yeni monitor: `shiftCompletionMonitor`
- Eğer bir şekilde `completedAt` yazılmış ama status DONE olmamışsa (partial/crash/edge),
  monitor bunu **reconcile** eder ve `shift:update` yayınlar.

## Dosyalar
- `backend/src/jobs/shiftCompletionMonitor.js` (yeni)
- `backend/src/jobs/index.js` (wire)
- `backend/src/routes/driver.js` (completeShift transaction)

## Uygulama
- Zip'i repo köküne aç
- `.	ools\overlay_M58_5_apply.ps1`
- `.	ools\pack.ps1 -To 41`

## Beklenen
- Driver complete → Company/Room vardiya listesi otomatik refresh; shift ACTIVE kalmaz.
