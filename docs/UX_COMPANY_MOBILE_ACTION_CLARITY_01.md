# UX-COMPANY-MOBILE-ACTION-CLARITY-01

Company mobil ve dar ekran yüzeylerinde ana aksiyonların görünür, tıklanabilir ve yönlendirici kalmasını sağlayan görünürlük düzeltmesi.

## Amaç

- Company / Vardiyalar ekranında ana CTA'lar mobilde kaybolmasın.
- `Vardiyayı sözleşmeye dönüştür` akışı net bir mobile-safe primary CTA olarak kalsın.
- Company / Sözleşmeler ekranı draft ve readonly preview için açık yön versin.
- Company / Ticari Akış satır aksiyonları belirsiz kalmasın.
- NavDock, floating assistant/drawer ve alt sabit alanlar ana butonları örtmesin.

## Ne Değişti?

- Summary-first yerleşim korunur; ana aksiyonlar üstte ve erişilebilir kalır.
- `Vardiyayı sözleşmeye dönüştür` aksiyonu görünür primary CTA olarak korunur.
- `Taslağı incele` dili draft ve preview yüzeylerinde açık yön verir.
- `Sözleşmeden üretilen vardiyaya git` ve benzeri etiketler hedef bölümü açık anlatır.
- Mobilde safe-area ve z-index hizası ile alt sabit alan çakışması azaltılır.
- Readonly preview ile gerçek execute ayrımı net kalır.

## Yüzeyler

- Company / Vardiyalar
- Company / Sözleşmeler
- Company / Ticari Akış
- Sözleşme taslağı / önizleme

## Sınırlar

- Backend route/write-path değişmedi.
- Schema/migration yok.
- Runtime-data commit dışı kaldı.
- Browser-smoke artifact commit dışı kaldı.
- Playwright runner policy değişmedi.
- Coverage matrix check değişmedi.
- Payment/settlement/contract execute yok.
- Invite send yok.
- User create yok.
- Supplier verification execute yok.
- AI/Copilot capability eklenmedi.
- `Vardiyayı sözleşmeye dönüştür` akışı yeni execute yolu açmaz; yalnızca görünürlük, etiket ve yerleşim netleştirir.

## Doğrulama Notu

- `NavDock`, floating assistant/drawer ve alt sabit alanlar için safe-area padding korunur.
- Bu milestone yeni business flow eklemez.
- Geçici log dosyaları commit dışı bırakılır.
