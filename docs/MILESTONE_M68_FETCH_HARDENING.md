# M68 — Fetch Sertleştirme

## Hedef
Kurumsal ölçek hazırlığı için company tarafındaki tekrar okuma yükünü düşürmek.

## Kabul noktaları
- Company panelleri ortak veri katmanını kullanır.
- Ağır ilk-frame `take` değerleri düşürülür.
- `company/personels` arama ve limit destekler.
- Trust-quality provider score batch okunabilir.
- M68 pack PASS verir.

## Kapsam dışı
- Tam yük testi
- Connection pool tuning
- Read replica
- Tüm panellerin sonsuz scroll/pagination dönüşümü
