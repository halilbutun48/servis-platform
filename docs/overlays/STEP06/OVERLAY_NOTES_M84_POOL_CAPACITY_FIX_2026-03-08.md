# M84 Pool capacity fix

> Tarihsel not (2026-04-01): Bu dosya Step 0.6 tarihsel overlay geçmişidir. Güncel aktif davranış için ilgili SSOT belgeleri baz alınır.


- Fix: `/api/availability/pool` artık çoklu araç havuzu hesabında tekil kapasite yetersizliğini araç uygunluğundan ayırır.
- `totalPairCapacity` artık aynı zaman aralığında eşleşebilen araç+driver çiftlerinin toplam koltuğunu doğru hesaplar.
- `enoughSingleVehicle` yalnız gerçekten tek başına yeterli ve driver eşleşmiş araç varsa true olur.
