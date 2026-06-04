# UX-PREMIUM-CRITICAL-UXFIX-CLEANUP-01

Bu milestone, evidence-based smoke classification sonrası kalan kritik `UX-FIX` satırlarını sıfırlamak için çalışır.

## Hedef

- `UX-FIX: 20 → 0`
- `BLOCKER: 0`
- `NOT-FOUND: 0`
- `backend lint: PASS, 0 warning`
- `web lint: PASS, 0 warning`
- `npm run verify:final PASS`
- `npm run check:product-extensions PASS`

`PASS-` bucket'ı bu milestone'da zorunlu olarak sıfırlanmaz.
Ama yeni PASS- üretilmemeli; mevcut PASS-minus evidence bucket'ı bozulmamalı.

## Kritik aileler

- Super Admin Audit
- Room Shifts
- Room Agreements
- Room Vehicles
- Room Drivers
- Company Agreements
- School Agreements
- Organization Agreements
- Driver Route
- Driver Check-in

## Güvenli görünen metinler

- `Sistem kanıtı`
- `Okuma kodu`
- `GPS durumu`
- `Yeni cihaz erişim kodu`
- `Sürücü kaydı`
- `Düşük canlılık`
- `Güncel değil`
- `Çevrim dışı`
- `Detayları göster`
- `Detayı aç`
- `Detayı kapat`
- `Önizlemeyi Uygula: Böl & Onayla`
- `Bu alan önizlemedir; işlem başlatmaz.`

## Dokunulan yüzeyler

- `backend/src/kvkk/matrix.js`
- `web/src/components/checkin/CameraQrScannerCard.jsx`
- `web/src/panels/driver/CheckinPanel.jsx`
- `web/src/panels/driver/RoutePanel.jsx`
- `web/src/panels/room/ShiftsPanel.jsx`
- `web/src/panels/room/roomShiftsOverviewSection.jsx`
- `web/src/panels/room/AgreementsPanel.jsx`
- `web/src/components/AgreementOpsBridgeCard.jsx`
- `web/src/panels/company/AgreementsPanel.jsx`
- `web/src/layout/AppShell.jsx`
- `web/src/panels/room/VehiclesPanel.jsx`
- `web/src/panels/room/roomVehiclesPanelCards.jsx`
- `web/src/panels/room/roomVehiclesPanelSections.jsx`
- `web/src/panels/superadmin/AuditLogsPanel.jsx`
- `web/src/panels/room/DriversPanel.jsx`
- `web/src/panels/room/RoomDriversShiftsTable.jsx`
- `web/src/panels/room/RoomDriversStatusTable.jsx`
- `web/src/panels/room/RoomDriversEditModal.jsx`

## Mobil güvenlik sınırı

- `roomCriticalFixScope`
- `roomActionCTA`
- `companyActionClarityScope`
- `shell--agreements-detail`
- `navDock`
- `safe-area`
- `z-index`

## Güvenli çalışma sınırı

- Bu milestone yeni business flow eklemez.
- Backend route/write-path değiştirmez.
- Schema/migration açmaz.
- Playwright runner policy değiştirmez.
- Coverage matrix fail policy değiştirmez.
- Runtime-data commit/stage dışı kalır.
- Browser-smoke artifact stage edilmez.
- Evidence-based PASS-minus davranışı korunur.

## Doğrulama

- `npm run check:uxpremiumcriticaluxfixcleanup01`
- `npm run check:uxsmokepassminusevidence01`
- `npm run check:uxlivepanelpremiumsmoke01`
- `npm run check:uxlivepanelsmokeaudit01`
- `npm run check:product-extensions`
- `npm --prefix backend run lint`
- `npm --prefix web run lint`
- `npm run verify:final`

## Not

- PASS-minus bucket'ı 23'ü aşmamalı.
- UX-FIX 0 olmalı.
- `BLOCKER` ve `NOT-FOUND` 0 kalmalı.
