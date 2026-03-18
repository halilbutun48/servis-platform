# M56 — KVKK Matrix + ETA/Navigation Quality

Bu paket şu parçaları resmi green seviyesine taşır:
- `/api/kvkk/matrix` görünürlük matrisi
- shared `KVKK` ekranı
- `/api/eta/vehicle/:id` içinde kalite / kalan rota / atlanan durak alanları
- personel canlı ekranlarında rota kalite görünürlüğü

Runtime check şu akışı doğrular:
- ROOM / COMPANY / PERSONEL login
- KVKK matrix + summary endpointleri
- izole shift üzerinde ETA payload kalite alanları
- skipped stop sonrası reroute önerisi
- rota bittiğinde `CONTACT_ROOM` nextAction davranışı

Notlar:
- ETA hesap yaklaşımı bu turda `ROUTE_CHAIN_HAVERSINE` olarak korunur.
- `lastResolvedStop` alanı son REACHED/SKIPPED durağı özetler.
- `M56` ayrı kanonik pack olarak doğrulanır; dış post-M41 runner henüz buna yükseltilmemiştir.
