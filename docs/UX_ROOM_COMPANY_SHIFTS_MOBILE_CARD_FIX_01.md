# UX-ROOM-COMPANY-SHIFTS-MOBILE-CARD-FIX-01

Tarih: 2026-06-07
Repo: `servis-platform`

> Bu belge, `Room / Vardiyalar` ve `Company / Vardiyalar` yüzeylerinde mobilde tablo zorlamasını kaldırıp card/list standardına geçiren milestone notudur. Amaç, küçük ekranda kolonların harf harf kırılmasını, sağ aksiyonların kaybolmasını ve yatay scroll/zoom zorunluluğunu ortadan kaldırmaktır.

## Amaç

- `Room / Vardiyalar` mobilde tablo gibi render edilmez; `mobileShiftCards` ile card/list görünümü kullanılır.
- `Company / Vardiyalar` mobilde tablo gibi render edilmez; `mobileShiftCards` ile card/list görünümü kullanılır.
- Desktop'ta `tableWrap` ve `desktopShiftTable` korunur.
- Body/page horizontal overflow zorunlu olmaz.
- Sefer Abi launcher alt safe-area alanını korur; son kart aksiyonları launcher altında kalmaz.

## Kart Standardı

Kartların üstünde:
- `Vardiya ID`
- `Durum badge`
- `Şirket / Oda`

Kart metası içinde:
- `Araç`
- `Sürücü`
- `Başlangıç`
- `Bitiş`
- `Teklif / sözleşme özeti`
- `Ödeme / hakediş`

Kart alt aksiyonları:
- `Rota Önizleme`
- `İşlem Kaydı`
- `Atamayı Değiştir`
- `Süre Uzat`

Disabled aksiyonlarda kısa neden metni görünür kalır.

## CSS Notu

- `desktopShiftTable` desktop'ta görünür kalır.
- `mobileShiftCards` mobile breakpoint'te görünür olur.
- `tableWrap` içinde hücreler için `word-break: normal` ve `overflow-wrap: anywhere` kullanılır.
- Uzun id/hash alanları dışında harf harf kırılma beklenmez.
- `overflow-x: hidden` body/page için korunur; ana kullanım için yatay scroll/zoom gerekmez.

## Sınırlar

- Backend route/write-path değişmedi.
- Backend route/service/schema değişmedi.
- Schema/migration yok.
- Prisma değişmedi.
- Runtime-data commit dışı kaldı.
- Browser-smoke commit dışı kaldı.
- Playwright runner policy değişmedi.
- Coverage matrix check değişmedi.
- Bu milestone yeni business flow eklemez.

## Kabul Hedefi

- `UX-FIX 0`
- `BLOCKER 0`
- `NOT-FOUND 0`
- `PASS-` artmamalı
- Desktop tablo görünümü korunmalı
- Mobilde harf harf kırılan kolonlar kalmamalı
- Mobilde ana aksiyonlar görünür olmalı
- Sefer Abi launcher aksiyonları kapatmamalı

## Referans

- `check:uxroomcompanyshiftsmobilecardfix01`
- `docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md`
