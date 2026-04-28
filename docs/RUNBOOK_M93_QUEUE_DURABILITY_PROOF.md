# M93 Queue Durability Proof Runbook

Amaç: `autoReachedQueue` için gerçek saha öncesi dayanıklılık kanıtlarını tek çatıya almak.

Bu paket **işleme davranışını değiştirmez**. Mevcut queue yapısına read-only kanıt yüzeyi ve statik doğrulama ekler.

## Kanıt alanları

### 1. Redis kesildi / geri geldi testi

Beklenen davranış:

- Redis yokken enqueue `REDIS_UNAVAILABLE` veya kontrollü hata döner.
- API process crash olmamalı.
- Redis geri geldiğinde queue health tekrar okunmalı.
- GPS ingest ana yolu queue yüzünden kilitlenmemeli.

Önerilen manuel drill:

1. Sistem çalışırken queue health endpoint'i oku.
2. Redis container'ı durdur.
3. GPS POST / queue enqueue denemesi yap.
4. API'nin kontrollü hata verdiğini doğrula.
5. Redis container'ı tekrar başlat.
6. `/api/admin/queues/auto-reached/health` ve `/proof` yüzeylerini kontrol et.

### 2. Worker restart reclaim testi

Beklenen davranış:

- Worker bir işi `processing` listesine aldıktan sonra process kapanırsa claim kaydı kalır.
- Reclaim sweep stale claim'i görür.
- İş tekrar queue'ya alınır veya maxAttempts aşılmışsa dead-letter'a taşınır.
- Infinite retry olmamalı.

Kanıt sinyalleri:

- `claimsDepth`
- `claimsIndexDepth`
- `oldestClaimAgeMs`
- `runtime.totalReclaimed`
- `runtime.lastReclaimAtIso`

### 3. Dead-letter admin görünürlüğü ve kontrollü replay/resolve

Yeni read-only endpoint:

- `GET /api/admin/queues/auto-reached/dead-letter`
- `GET /api/admin/queues/auto-reached/proof`
- `POST /api/admin/queues/auto-reached/dead-letter/:taskId/requeue`
- `POST /api/admin/queues/auto-reached/dead-letter/:taskId/resolve`

Beklenen:

- Sadece super admin guard arkasında görünür.
- En fazla 200 kayıt tutulur.
- JSON parse edilemeyen dead-letter kayıtları da raw olarak görünür.
- Requeue işlemi task'i artan attemptCount ile ana kuyruğa geri taşır ve dead-letter listesinden çıkarır.
- Resolve işlemi task'i dead-letter listesinden kaldırır ve incelenmiş/kapanmış kabul eder.
- Her iki işlem de audit log'a düşer; queue artık sadece gözlemlenen değil kontrollü yönetilen bir yüzeye sahiptir.

### 4. Queue health threshold check

Yeni threshold sınıflandırması:

- `QUEUE_DEPTH_HIGH`
- `PROCESSING_DEPTH_HIGH`
- `CLAIMS_DEPTH_HIGH`
- `DEAD_LETTER_DEPTH_HIGH`
- `OLDEST_CLAIM_STALE`
- `REDIS_NOT_CONNECTED`

Endpoint:

- `GET /api/admin/queues/auto-reached/thresholds`

Varsayılan eşikler env ile override edilebilir:

- `AUTO_REACHED_QUEUE_DEPTH_WARN`
- `AUTO_REACHED_PROCESSING_DEPTH_WARN`
- `AUTO_REACHED_CLAIMS_DEPTH_WARN`
- `AUTO_REACHED_DEAD_LETTER_DEPTH_WARN`
- `AUTO_REACHED_OLDEST_CLAIM_AGE_MS_WARN`

## Operasyon notu

Bu queue yüzeyi hâlâ exactly-once enterprise broker değildir. Ancak:

- dead-letter görünür
- dead-letter replay/resolve kontrollü
- reclaim gecikmesi ölçülebilir
- threshold uyarıları admin yüzeyinde okunabilir
- replay/resolve her seferinde audit kaydı üretir
- incident kartı, threshold sinyallerini alarm seviyesine çevirir
- chaos proof notları Redis down/up, worker restart ve poison job drill'lerini görünür tutar

Bu, minimal güvenli queue'dan operasyonel olarak izlenebilir queue seviyesine geçiştir; yine de Redis down / worker restart / poison job chaos drill'leri manuel veya ayrı test koşularıyla doğrulanmalıdır.

## Statik doğrulama

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\pack_m93_queue_durability_proof.ps1 -RepoRoot "D:\servis-platform"
```

Beklenen:

```text
M93 QUEUE DURABILITY PROOF CHECK PASS
M93 QUEUE DURABILITY PROOF PACK PASS
```

## Opsiyonel runtime probe

Super admin token biliniyorsa:

```powershell
$env:API_URL="http://127.0.0.1:3000"; $env:SUPER_ADMIN_TOKEN="<token>"; node .\backend\scripts\m93_queue_durability_runtime_probe.js
```

Bu probe Redis'i durdurmaz, worker öldürmez. Sadece read-only endpoint'leri kontrol eder.

## Kabul kriteri

M93 GREEN sayılması için:

- Statik pack PASS.
- Queue health endpoint görülebilir.
- Dead-letter endpoint görülebilir.
- Threshold endpoint uyarı üretebilir.
- Manual Redis down/up drill sonucu notlanır.
- Manual worker restart reclaim drill sonucu notlanır.
