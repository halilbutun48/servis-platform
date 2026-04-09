# REPO CONTRACT MARKER POLİTİKASI V1

Tarih: 2026-04-09  
Amaç: repo içindeki state, markdown ve script doğrulamalarının aynı gerçeği göstermesi.

## 1) Temel ilke
Repo contract doğrulaması önce `tools/repo_contract_state.json` dosyasını okur.  
Markdown ve script yorumları bu makine-okur state'in üstüne oturur; state'i ezmez.

## 2) Split state modeli
Bu repo artık tek sayılı düz bir hat gibi okunmaz. Aşağıdaki ayrım resmidir:

- `latestMasterPack = 89`
- `nextMilestone = M90`
- `latestHistoricalMasterPack = 79`
- `historicalNextMilestone = M80`
- `stableTo = 78`
- `livingUpperRouteFrom = 80`
- `livingUpperRouteTo = 89`
- `docsContractMode = state-first-canonical-history-split`

## 3) Hangi marker neyi anlatır?
- **Historical marker**: eski tam master anchor veya compatibility alanını anlatır.
- **Living marker**: güncel üst hattı ve yaşayan doğrulama rotasını anlatır.
- **Stable marker**: `STABLE_TO=78` gibi backward-compatibility sınırını anlatır.
- **Canonical docs marker**: README, PRIMER, STARTPACK, CHECKLIST, REGISTRY, BACKLOG ve SCRIPT_KILAVUZU gibi resmi anlatıyı taşır.

## 4) Doğrulama kuralı
Repo contract check'leri aşağıdaki sırayla karar verir:

1. `tools/repo_contract_state.json`
2. kanonik markdown seti
3. `tools/milestone_pack_manifest.json`
4. pack/check/runtime dosya varlığı
5. runbook/checklist bağları

## 5) Yanlış kullanım örnekleri
Aşağıdakiler artık hatalı kabul edilir:

- `latestMasterPack` değerini tarihsel `79` diye okumak
- `nextMilestone` değerini yaşayan rota yerine `M80` diye sabitlemek
- living route görünürlüğünü yalnız tek bir markdown cümlesine dar bağlamak
- tarihsel marker ile yaşayan route marker'ı karıştırmak

## 6) Temizlik kuralı
- `.bak` dosyaları acceptance zincirine girmemelidir.
- `mobile/dist`, `web/dist` ve transient overlay kalıntıları repo görünürlüğünde yaşamamalıdır.
- tarihsel yönlendirme dosyaları `_archive` altında tutulmalıdır.
- runtime json store'ları (`backend/data/*.json`) duplicate code/doc olarak değerlendirilmez.

## 7) M80→M89 contract sweep
`tools/check_m80_m89_contract_sweep.ps1`, M80→M89 hattındaki kanonik pack/check/runtime/runbook varlığını ve state-first split marker mantığını hızlıca taramak için kullanılır.
