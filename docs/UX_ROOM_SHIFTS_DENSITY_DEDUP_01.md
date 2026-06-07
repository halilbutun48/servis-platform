# UX-ROOM-SHIFTS-DENSITY-DEDUP-01

Amaç: `Room / Vardiyalar` ekranındaki üst başlık, summary bandı ve tab row tekrarını sadeleştirmek.

Bu milestone ile:
- one top title korunur ama daha kompakt görünür.
- one summary band korunur; ekstra üst açıklama satırı yoktur.
- one tab row korunur.
- active content that actually changes by tab kalır.
- dispatch preview should not dominate when no shift is selected.
- seçili room vardiyada kompakt `Önizlemeyi Uygula: Böl & Onayla` CTA'sı inline satır olarak görünür kalır.
- `Bölme modu aktif` uyarısı full-width band yerine compact inline notice olur.
- sekmeden sonra tekrar eden `Diğer Vardiyalar` heading'i içerik alanında görünmez.
- backend dispatch flow unchanged.
- no route apply addition.
- no payment/settlement.
- no schema/migration.

## Kapsam

- `web/src/panels/room/ShiftsPanel.jsx`
- `web/src/panels/room/roomShiftsOverviewSection.jsx`
- `web/src/panels/room/roomShiftsMainSections.jsx`
- `web/src/panels/room/roomShiftsPanelSections.jsx`
- `web/src/panels/room/roomShiftsPanelRows.jsx`
- `web/src/panels/room/roomShiftsPanelCards.jsx`
- `web/src/panels/room/roomShiftsPanelUtils.js`
- `web/src/index.css`

## Kabul

- Üst özet, tek bir summary band olarak kalır ve mobile viewport'ta kompakt görünür.
- Tab değişince aktif içerik gerçekten değişir.
- Dispatch preview, üst hero kart olarak domine etmez.
- `Önizlemeyi Uygula: Böl & Onayla` akışı seçili room vardiyada görünür olur ama no shift selected durumda baskın olmaz.
- `Bölme modu aktif` uyarısı inline/chip kart içinde kalır.
- `Diğer Vardiyalar` başlığı tab etiketinden sonra ikinci kez görünmez.
- UX-FIX 0 korunur.
- BLOCKER 0 korunur.
- NOT-FOUND 0 korunur.
- Runtime-data commit'e alınmaz.
- Browser-smoke artifact commit'e alınmaz.
- Stage / commit / tag / push bu milestone için yapılmaz.

## Not

Bu çalışma backend route/service/schema, Prisma/migration veya settlement/payment sınırını değiştirmez.
