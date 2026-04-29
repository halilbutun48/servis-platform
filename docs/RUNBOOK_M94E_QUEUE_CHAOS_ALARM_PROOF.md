# RUNBOOK M94-E QUEUE CHAOS / ALARM PROOF

Bu runbook, `autoReachedQueue` için güvenli ve tekrarlanabilir alarm proof hattını açıklar.

## Amaç
- Redis unavailable durumunu görünür kılmak
- Stale claim reclaim sinyalini okumak
- Poison kayıtları dead-letter üzerinden görmek
- Dead-letter requeue / resolve akışını doğrulamak
- Threshold WARN / CRITICAL sonucunu notification veya ops event olarak görünür hale getirmek

## Kanonik yüzeyler
- Sağlık görünürlüğü: `GET /api/admin/queues/auto-reached`
- Proof görünürlüğü: `GET /api/admin/queues/auto-reached/proof`
- Threshold görünürlüğü: `GET /api/admin/queues/auto-reached/thresholds`
- Incident eşitleme: `POST /api/admin/queues/auto-reached/incident-sync`
- Dead-letter geri alma: `POST /api/admin/queues/auto-reached/dead-letter/:taskId/requeue`
- Dead-letter çözme: `POST /api/admin/queues/auto-reached/dead-letter/:taskId/resolve`

## Güvenli çalışma sırası
1. Önce statik check:
   - `node backend/scripts/m94e_queue_chaos_alarm_check.js`
2. Sonra güvenli runtime probe:
   - `node backend/scripts/m94e_queue_chaos_alarm_probe.js`
3. Son olarak repo kapanışı:
   - `npm run verify:final`

## Probe ne yapar?
- Gerçek Redis'i kapatmaz.
- Production queue verisine dokunmaz.
- Synthetic mock Redis ile çalışır.
- `simulated: true` döner.

## Alarm yorumlama
- `REDIS_NOT_CONNECTED` -> Redis bağlantısı yok veya sağlıklı değil.
- `OLDEST_CLAIM_STALE` -> Worker reclaim gecikmiş olabilir.
- `DEAD_LETTER_DEPTH_HIGH` -> Dead-letter birikimi artmış olabilir.
- `QUEUE_DEPTH_HIGH` / `PROCESSING_DEPTH_HIGH` / `CLAIMS_DEPTH_HIGH` -> backlog baskısı vardır.

## Ops notu
- `incident-sync`, threshold ya da alarm proof'unu Super Admin notification akışına taşır.
- `requeue` sadece replay edilebilir dead-letter kayıtları için kullanılır.
- `resolve` kaydı kapatır; veriyi yeniden kuyruklamaz.
- Alarm/notification dedupe key ile spam üretmemelidir.

## Beklenen çıktı
Probe sonunda şu alanlar görünür:
- `ok`
- `simulated`
- `redisUnavailableProof`
- `staleClaimProof`
- `poisonDeadLetterProof`
- `deadLetterRequeueResolveProof`
- `thresholdAlarmProof`

## Not
- Bu runbook destructive değildir; alarm proof ve synthetic probe içindir.
- Redis stop/restart veya worker öldürme adımı içermez.
- Eğer canlı drill gerekirse önce ayrı bir bakım penceresi ve açık izin gerekir.
