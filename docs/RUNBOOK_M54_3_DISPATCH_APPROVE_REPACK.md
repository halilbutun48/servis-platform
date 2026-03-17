# M54.3 — Dispatch Approve + Repack

Bu adımın hedefi şudur:

- `dispatch-preview` ile görülen child plan,
- `auto-split-approve` sırasında DB'ye yazılan child plan

aynı üretim zincirini kullansın.

## Çözdüğü ana sorunlar

- child shift'lerin root stop mirasını alt küme gibi taşıması
- bazı child preview kartlarında km/süre 0 görünmesi
- preview ve approve planının birebir uyuşmaması
- approve sonrası emit edilen child verisinin eksik/stale görünmesi
- notification dedupeKey tarafında `groupKey` runtime hatası

## Yeni yaklaşım

Yeni `backend/src/services/dispatchRepack.js` helper'ı child planı tek yerde üretir:

1. child slice içindeki yolcu/personel birimlerini alır
2. child stop'ları **yeniden** kurar
3. hub + direction + pattern bilgisi ile OSRM/solver çalıştırır
4. preview için stop/path/km/süre çıktısı üretir
5. approve sırasında aynı plan `persistChildPlan()` ile DB'ye yazılır
6. child shift `loadFullChildShift()` ile tekrar okunup emit edilir

Böylece preview ve approve aynı child planı kullanır.

## Stop üretim mantığı

- stop'lar artık `originalStopKey/order` mirasıyla kopyalanmaz
- child slice içindeki gerçek koordinasyon noktalarına göre yeniden bucket edilir
- child'ın kendi stop sırası solver ile belirlenir
- tek durak + hub senaryosunda da km/süre hesaplanır

## Doğrulama

Runtime kontrol script'i:

- `backend/scripts/m54_3_dispatch_approve_repack_check.js`

Kontrol ettiği ana başlıklar:

- dispatch preview başarılı mı
- override conflict kontrolleri çalışıyor mu
- approve sonrası root `SPLIT` oldu mu
- child sayısı preview suggestion sayısı ile uyuşuyor mu
- child stop sırası ve koordinatları preview ile birebir aynı mı
- personeller child'lara tekil olarak dağıldı mı
- approve response `groupKey` bug'ı olmadan dönebiliyor mu

## Çalıştırma

```powershell
powershell -ExecutionPolicy Bypass -File .\tools\pack_m54_3_dispatch_approve_repack.ps1 -RepoRoot D:\servis-platform
```

preview ve approve aynı child planı kullanır

