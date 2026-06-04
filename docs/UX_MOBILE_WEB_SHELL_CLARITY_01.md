# UX-MOBILE-WEB-SHELL-CLARITY-01

Mobil web shell için içerik öncelikli, drawer tabanlı ve safe-area uyumlu menü akışı.

## Amaç

- Mobilde sidebar default closed kalsın.
- Menü açıldığında drawer/backdrop akışı net olsun.
- Content-first düzen korunurken ana içerik geri planda sıkışmasın.
- Copilot launcher alt CTA'ları örtmesin.
- Desktop unchanged kalsın.

## Ne Değişti?

- `shellTopMenu` ile mobil menü açma/kapatma hareketi görünür hale geldi.
- `NavDock`, mobilde off-canvas drawer olarak çalışır.
- `navDockBackdrop` ile dış tıklama/kapama davranışı netleşti.
- `shell--has-copilot-fab` alt safe-area padding'i artırır.
- `shell--nav-open` durumunda body scroll kilidi devreye girer.
- Copilot launcher mobile'da daha kompakt görünür; subtitle/status gizlenir.

## Yüzeyler

- `web/src/layout/AppShell.jsx`
- `web/src/layout/NavDock.jsx`
- `web/src/index.css`
- `web/src/components/copilot/FloatingCopilotDrawer.jsx`

## Gözlenen Etki

- `Sefer Abi Terminali` görünür kalır.
- `Sefer Abi’ye Sor` drawer standardı korunur.
- Menü, content-first düzeni bozmaz.
- Alt CTA'lar ve floating launcher arasında daha güvenli boşluk kalır.

## Sınırlar

- Backend route/write-path değişmedi.
- Schema/migration yok.
- Playwright runner policy değişmedi.
- Coverage matrix check değişmedi.
- Runtime-data commit/stage dışı kaldı.
- Browser-smoke artifact commit/stage dışı kaldı.
- Desktop unchanged.
- Yeni business flow eklenmedi.
- Payment/settlement/contract execute yok.
- AI/Copilot capability eklenmedi.

## Doğrulama

- `npm run check:uxmobilewebshellclarity01`
- `npm run check:product-extensions`
- `npm --prefix backend run lint`
- `npm --prefix web run lint`
- `npm run verify:final`

## Not

- `default closed`
- `drawer`
- `backdrop`
- `content-first`
- `safe-area`
- `shell--has-copilot-fab`
- `shell--nav-open`
- `navDockBackdrop`
