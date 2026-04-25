# M47.2 — Capacity & Load Baseline

Bu milestone, uretim oncesi **kapasite baz cizgisi** olusturmak icin minimum gozlem setini ekler.

## Kapsam
- `GET /health` icine anlik capacity ozeti eklenir.
- `GET /api/admin/capacity/policy` ile threshold/politika okunur.
- `GET /api/admin/capacity/snapshot` ile son pencere icindeki istek, gecikme, 429 ve inventory gorulur.
- Request inflight, websocket baglanti sayisi ve event-loop lag tutulur.
- Bu baz cizgi **tekil infra envelope** icinde alinmistir: `1x api + 1x db + 1x redis + 1x osrm + 1x solver`.
- Bu benchmark sonucu, ayni anda coklu region cell ya da ekstra replica varmis gibi genellenmez.

## Queue siniri
- `autoReachedQueue` claim / processing / reclaim / dead-letter katmanlariyla daha dayanıklıdır; yine de **tam enterprise queue** degildir.
- Redis down olursa GPS hot path fallback ile ilerler; worker crash / reclaim / shutdown handoff siniri ayrica `RUNBOOK_AUTO_REACHED_QUEUE_DURABILITY_V1.md` icinde tutulur.
- Lock TTL, backlog, retry, stale reclaim ve graceful shutdown davranisi resmi sinirdir; bu runbook queue omurgasinin enterprise exactly-once iddiasi olmadigini acikca soyler.

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
- Bu baz cizgiyi okurken region / shard kapasite dokumanlarindaki `3000 stabil tavan` ile karistirma; burada yazilan tekil infra adasidir.
