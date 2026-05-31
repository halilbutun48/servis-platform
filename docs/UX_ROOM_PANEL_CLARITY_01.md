# UX-ROOM-PANEL-CLARITY-01

Bu milestone Room panellerinde summary-first, premium ve daha anlaşılır görünürlük sağlar. Ürün/business flow değiştirmez; backend route/write-path, schema/migration, runtime-data, browser-smoke artifact ve Playwright runner policy'si dışındadır.

## Amaç

- Room / Vardiyalar ekranını ilk bakışta anlaşılır hale getirmek.
- Room / Sözleşmeler ekranında `Detayı aç` ve rota önizleme erişimini netleştirmek.
- Room / Ticari Akış ve Room / Operasyon Sağlığı ekranlarında kritik özet bandını üstte tutmak.

## Kapsam

- Room / Vardiyalar
- Room / Sözleşmeler
- Room / Ticari Akış
- Room / Operasyon Sağlığı

## UX Prensipleri

- Özet üstte; karar, dispatch ve rota önizleme tablarda kalır.
- Ana aksiyonlar görünür olur.
- İkincil detaylar accordion, drawer veya detail alanında kalır.
- Aynı bilgi birden fazla yerde tekrar edilmez.
- `Detayı aç`, `İncele`, `Kayıt seç` gibi CTA'lar yönlendirici olur.
- Teknik kanıt gerekiyorsa `Sistem kanıtı` gibi kontrollü etiketler kullanılır.
- Güvenli ID dili `Vardiya ID`, `Sözleşme ID`, `Talep ID`, `Araç ID`, `Sürücü ID`, `Firma ID` biçimindedir.

## Doğrulama

- `npm run check:uxroompanelclarity01`
- `npm run check:uxlivepanelsmokeaudit01`
- `npm run check:uxlivepanelpremiumsmoke01`
- `npm run check:product-extensions`
- `npm --prefix backend run lint`
- `npm --prefix web run lint`
- `npm run verify:final`
- `npm run smoke:uxlivepanelpremium01`

## Güvenlik Sınırları

- Bu milestone yeni business flow eklemez.
- Payment execute yok.
- Settlement execute yok.
- Invite send yok.
- User create yok.
- Supplier verification execute yok.
- Contract execute yok.
- Route apply yok.
- SMS/push yok.
- Schema/migration yok.
- Backend route/write-path değişikliği yok.
- Runtime-data commit'e alınmaz.
- Browser-smoke artifact commit'e alınmaz.

## Smoke Politikası

- BLOCKER / NOT-FOUND kapatıcıdır; hard-fail policy olarak kalır.
- `AUTH-BLOCKED` report-only auth/session notudur.
- UX-FIX coverage gap olabilir; final premium kabul öncesi görünür kalır.

## Not

Bu çalışma Room yüzeylerindeki metin netliğini ve summary-first okumasını iyileştirir; operasyonel karar ve veri akışı aynı kalır.
