# M84 Pool capacity fix

- Fix: `/api/availability/pool` artık çoklu araç havuzu hesabında tekil kapasite yetersizliğini araç uygunluğundan ayırır.
- `totalPairCapacity` artık aynı zaman aralığında eşleşebilen araç+driver çiftlerinin toplam koltuğunu doğru hesaplar.
- `enoughSingleVehicle` yalnız gerçekten tek başına yeterli ve driver eşleşmiş araç varsa true olur.
