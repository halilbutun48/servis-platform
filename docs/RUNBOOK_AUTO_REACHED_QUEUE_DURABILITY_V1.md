# RUNBOOK — AUTO-REACHED QUEUE DURABILITY

Bu not, `backend/src/jobs/autoReachedQueue.js` icindeki auto-reached akisinin **claim / processing / reclaim / dead-letter** sınırlarini kayda gecirir.

## Kapsam
- `gps:auto-reached:v1` queue listesi
- `gps:auto-reached:processing:v1` claim/processing listesi
- `gps:auto-reached:claims:v1` claim hash kaydi
- `gps:auto-reached:claims:index:v1` stale reclaim indexi
- `gps:auto-reached:dead:v1` dead-letter listesi
- `gps:auto-reached:lock:v1` dedupe lock
- Redis available / unavailable durumlari
- worker crash / requeue davranisi
- graceful shutdown handoff

## Ne yapar
- GPS hot path, auto-reached isi icin queue'ya LPUSH yapar.
- Aynı `(shiftId, stopId)` icin lock alinir; tekrar enqueue dedupe edilir.
- Worker `BRPOPLPUSH` ile task'i processing listesine alir.
- Claim durumu hash + index olarak tutulur; stale claim sweep ile reclaim edilir.
- Task isi hataliysa raw payload yeniden kuyruğa eklenir; tekrar deneme sayisi dolarsa dead-letter listesine gider.
- Is bitince claim kaydi, processing kaydi ve lock temizlenir.

## Sinirlar
- `DEFAULT_LOCK_TTL_MS = 2 saat` civarindadir; bu bir garanti degil, dedupe suresidir.
- Queue artiq processing/reclaim/dead-letter katmani tasir; yine de tam enterprise exactly-once queue degildir.
- Stale reclaim best-effort calisir; Redis / worker / process crash durumunda teslimat garantisi yerine yeniden deneme ve dead-letter governance saglanir.
- Graceful shutdown, calisan task'i best-effort tamamlar; kesin drain garantisi vermez.
- Redis down olursa ingest yolu `REDIS_UNAVAILABLE` doner ve hot path fallback ile doğrudan islem yapar; bu sayede doğruluk korunur ama latency artar.

## Operasyonel guardrail
- Backlog artisi bir capacity sinyalidir; queue boyu uzuyorsa worker sayisi, Redis sagligi ve downstream DB baskisi birlikte okunmalidir.
- Lock TTL ile queue backlog birbirine karistirilmaz: lock, duplicate engeller; backlog, bekleyen isleri temsil eder.
- Claim hash/index ile stale reclaim artık vardir; buna rağmen Redis'i tekil kalici kuyruk sistemi gibi düşünme.
- Dead-letter listesi operasyon incelemesi icindir; backlog ve reclaim davranisi birlikte okunmalidir.
- Bu runbook hala "performans fix var ama tam enterprise queue değil" notunu resmi kabul eder.

## Okuma notu
- Bu kuyruk, `500 -> 1000 -> 3500` kapasite hikayesindeki request-path hafifletmenin parcasidir.
- Queue, worker crash'e karsi dayanıklılığı artirir; ama full durable job system yerine gecmez.
