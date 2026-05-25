# BUG ROUTE IMPACT PREVIEW BUTTON 01

Tarih: 2026-05-24
Repo: `servis-platform`

## Amaç

- Company, School, Room ve Organization operasyon yüzeylerinde `Rota etkisini önizle` butonu artık görünür sonuç üretir.
- Önizleme alanı seçilen satıra scroll/focus ile taşınır.
- Seçili satır vurgulanır.
- Readonly önizleme dili korunur.

## Davranış

- Butona basınca preview alanı açılır ve seçili satır görünür hale gelir.
- Preview alanında `Readonly önizleme` dili yer alır.
- `Rota uygulanmaz`.
- `Sürücü rotası yenilenmez`.
- `Bildirim gönderilmez`.
- `Sadece etki analizi gösterilir`.
- Veri yoksa `Bu değişiklik için rota etkisi hesaplanamadı / yeterli veri yok.` boş durumu gösterilir.
- Yüklenirken `Önizleme açılıyor…` görünür.
- `Seçimi temizle` ile preview kapatılabilir.

## Kapsam

- Company / Şirket Operasyon Paneli
- School / Okul Operasyon Paneli
- Room / Oda operasyon board
- Company kind `ORGANIZATION` olan yüzeyler

## Sınırlar

- Rota apply yok.
- Sürücü route refresh yok.
- SMS / push / bildirim yok.
- Ödeme / fatura / tahsilat yok.
- Ceza / yaptırım yok.
- Kabul / red yok.
- Assignment / stop kalıcı değişikliği yok.
- Prisma schema / migration yok.

## Beklenen Check

- `npm run check:bugrouteimpactpreviewbutton01`
- `npm run check:product-extensions`
- `npm run verify:repo`
- `npm run verify:final`
