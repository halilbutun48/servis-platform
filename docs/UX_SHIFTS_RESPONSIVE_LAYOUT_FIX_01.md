# UX-SHIFTS-RESPONSIVE-LAYOUT-FIX-01

Tarih: 2026-06-07
Repo: `servis-platform`

> Bu belge, `Room / Vardiyalar` ve `Company / Vardiyalar` yüzeylerinde desktop tabloları daha geniş, mobil yüzeyleri ise card/list olarak daha okunur hale getiren responsive layout milestone notudur. Amaç, desktop'ta sıkışan kolonları gevşetmek; mobilde yatay scroll, zoom ve char-by-char kırılmayı azaltmaktır.

## Amaç

- `Room / Vardiyalar` desktop'ta `desktopShiftTable` + `shiftsDesktopTable` ile geniş kolonları sıkıştırmadan gösterir.
- `Company / Vardiyalar` desktop'ta `desktopShiftTable` + `shiftsDesktopTable` ile geniş kolonları sıkıştırmadan gösterir.
- Mobilde `mobileShiftCards` + `shiftsMobileCards` card/list standardı korunur.
- Kart içi `shiftMobileCard`, `shiftMetaGrid` ve `shiftActionGroup` sınıfları okunur akışı korur.
- Desktop tabloda `table-layout: auto`, `word-break: normal` ve `overflow-wrap: break-word` standardı uygulanır.
- Sefer Abi launcher safe-area padding standardı korunur; alt sabit alanlar kart/tabloları örtmez.

## Layout Standardı

Desktop tablolar:
- `tableWrap`
- `desktopShiftTable`
- `shiftsDesktopTable`

Mobil kartlar:
- `mobileShiftCards`
- `shiftsMobileCards`
- `shiftMobileCard`

Kart içi düzen:
- `shiftMetaGrid`
- `shiftActionGroup`

## CSS Notu

- `shiftsDesktopTable` içinde `table-layout: auto` ile kolonlar içerik genişliğine göre açılır.
- `word-break: normal` korunur.
- `overflow-wrap: break-word` ile uzun metinler kelime bazlı kırılır.
- Mobilde `shiftsMobileCards` görünür olur; desktop tablo kabuğu gizlenir.
- `overflow-x: hidden` + safe-area launcher padding standardı korunur.

## Sınırlar

- Backend route/write-path değişmedi.
- Schema/migration yok.
- Playwright runner policy değişmedi.
- Coverage matrix check değişmedi.
- Runtime-data commit dışı kaldı.
- Browser-smoke artifact commit dışı kaldı.
- Bu milestone yeni business flow eklemez.

## Doğrulama Notu

- `Room / Vardiyalar` ve `Company / Vardiyalar` desktop'ta daha geniş görünür.
- Mobilde card/list akışı korunur.
- `Sefer Abi` launcher ve safe-area boşlukları korunur.

## Referans

- `check:uxshiftsresponsivelayoutfix01`
- `docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md`
