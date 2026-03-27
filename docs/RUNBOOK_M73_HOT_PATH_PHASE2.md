# M73 HOT PATH PHASE 2

Amaç: Company tarafında en sıcak kalan okuma uçlarını biraz daha sakinleştirmek.

Bu paket ne yapar:
- company ortak veri katmanında ilk yük `take` değerlerini bir kademe daha düşürür
- `provider score` istemci TTL süresini uzatır
- `reports` summary ve `route-preview` backend cache sürelerini artırır
- backend tarafında route bazlı read limiter kovaları ekler:
  - summary uçları
  - route-preview uçları
  - directory/list uçları

Beklenen etki:
- aynı kullanıcı kısa sürede panel değiştirince 429 baskısı azalır
- çok sıcak özet uçlar artık genel GET kovasını daha az kirletir
- route preview ve provider score tekrarları daha sakinleşir
