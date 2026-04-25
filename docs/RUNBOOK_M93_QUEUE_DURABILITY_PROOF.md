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
6. `/api/admin/queue/auto-reached/health` ve `/proof` yüzeylerini kontrol et.

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

### 3. Dead-letter admin görünürlüğü

Yeni read-only endpoint:

- `GET /api/admin/queue/auto-reached/dead-letter`
- `GET /api/admin/queue/auto-reached/proof`

Beklenen:

- Sadece super admin guard arkasında görünür.
- En fazla 200 kayıt tutulur.
- JSON parse edilemeyen dead-letter kayıtları da raw olarak görünür.

### 4. Queue health threshold check

Yeni threshold sınıflandırması:

- `QUEUE_DEPTH_HIGH`
- `PROCESSING_DEPTH_HIGH`
- `CLAIMS_DEPTH_HIGH`
- `DEAD_LETTER_DEPTH_HIGH`
- `OLDEST_CLAIM_STALE`
- `REDIS_NOT_CONNECTED`

Endpoint:

- `GET /api/admin/queue/auto-reached/thresholds`

Varsayılan eşikler env ile override edilebilir:

- `AUTO_REACHED_QUEUE_DEPTH_WARN`
- `AUTO_REACHED_PROCESSING_DEPTH_WARN`
- `AUTO_REACHED_CLAIMS_DEPTH_WARN`
- `AUTO_REACHED_DEAD_LETTER_DEPTH_WARN`
- `AUTO_REACHED_OLDEST_CLAIM_AGE_MS_WARN`

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
