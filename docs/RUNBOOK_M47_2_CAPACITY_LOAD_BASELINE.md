# M47.2 — Capacity & Load Baseline

Bu milestone, uretim oncesi **kapasite baz cizgisi** olusturmak icin minimum gozlem setini ekler.

## Kapsam
- `GET /health` icine anlik capacity ozeti eklenir.
- `GET /api/admin/capacity/policy` ile threshold/politika okunur.
- `GET /api/admin/capacity/snapshot` ile son pencere icindeki istek, gecikme, 429 ve inventory gorulur.
- Request inflight, websocket baglanti sayisi ve event-loop lag tutulur.

## Beklenen gostergeler
- Ortalama istek/dakika
- Son 1 dakika istek sayisi
- p95 gecikme
- 429 orani
- inflight istek sayisi
- aktif websocket baglantisi
- aktif refresh session sayisi

## Kullanım
1. Super admin ile giris yap.
2. `GET /api/admin/capacity/policy` ile warning esiklerini kontrol et.
3. Ornek trafik altinda `GET /api/admin/capacity/snapshot` cagir.
4. `assessment=OK/WARN` ve `warnings[]` alanlarini yorumla.

## Notlar
- Bu ekran tek basina bir stress test degildir; ama resmi baz cizgi icin yeterli ilk gozlem katmanidir.
- 429 orani ve p95 gecikme ilk bakilacak iki sinyaldir.
- Redis rate-limit store acik kalmali; GPS ve telematics ayrik kota mantigi korunmalidir.
