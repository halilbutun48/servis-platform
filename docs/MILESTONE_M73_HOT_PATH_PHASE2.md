# M73 HOT PATH PHASE 2

Hedef:
- M72 sonrası kalan sıcak hatları biraz daha aşağı çekmek
- özellikle `rooms`, `vehicles`, `offers/company`, `reports/shifts/summary`, `route-preview`, `provider-scores` çizgisini sakinleştirmek
- read limiter tarafını endpoint sınıfına göre ayırmak

Ana değişiklikler:
- company data hub default take değerleri küçüldü
- provider score TTL ve concurrency sertleşti
- reports summary cache 20 saniye oldu
- route preview backend cache 30 saniye oldu
- summary / preview / directory için ayrı GET limit kovaları eklendi
