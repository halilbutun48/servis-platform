# RUNBOOK — AUTO-REACHED QUEUE DURABILITY

Bu not, `backend/src/jobs/autoReachedQueue.js` icindeki auto-reached akisinin **minimal guvenli queue** sınırlarini kayda gecirir.

## Kapsam
- `gps:auto-reached:v1` queue listesi
- `gps:auto-reached:lock:v1` dedupe lock
- Redis available / unavailable durumlari
- worker crash / requeue davranisi
- graceful shutdown handoff

## Ne yapar
- GPS hot path, auto-reached isi icin queue'ya LPUSH yapar.
- Aynı `(shiftId, stopId)` icin lock alinir; tekrar enqueue dedupe edilir.
- Worker `BRPOP` ile task alir, isleyince lock'ı temizler.
- Task isi hataliysa raw payload yeniden kuyruğa eklenir.

## Sinirlar
- `DEFAULT_LOCK_TTL_MS = 2 saat` civarindadir; bu bir garanti degil, dedupe suresidir.
- Queue **ack/visibility timeout/dead letter** seviyesinde tam enterprise queue degildir.
- Worker `BRPOP` sonrasinda crash olursa, o task icin otomatik reclaim yoktur.
- Graceful shutdown, calisan task'i best-effort tamamlar; kesin drain garantisi vermez.
- Redis down olursa ingest yolu `REDIS_UNAVAILABLE` doner ve hot path fallback ile doğrudan islem yapar; bu sayede doğruluk korunur ama latency artar.

## Operasyonel guardrail
- Backlog artisi bir capacity sinyalidir; queue boyu uzuyorsa worker sayisi, Redis sagligi ve downstream DB baskisi birlikte okunmalidir.
- Lock TTL ile queue backlog birbirine karistirilmaz: lock, duplicate engeller; backlog, bekleyen isleri temsil eder.
- Redis'te kalici kuyruk veya yeniden dagitma mekanizmasi yoktur; bu nedenle bu runbook "performans fix var ama tam enterprise queue değil" notunu resmi kabul eder.

## Okuma notu
- Bu kuyruk, `500 -> 1000 -> 3500` kapasite hikayesindeki request-path hafifletmenin parcasidir.
- Queue, worker crash'e karsi dayanıklılığı artirir; ama full durable job system yerine gecmez.
