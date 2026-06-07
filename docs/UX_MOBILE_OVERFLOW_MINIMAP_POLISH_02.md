# UX-MOBILE-OVERFLOW-MINIMAP-POLISH-02

Bu polish, `UX-MOBILE-OVERFLOW-MINIMAP-READABILITY-01` sonrası kalan desktop taşma artıklarını kapatır ve mini-map etkileşimini daha net hale getirir.

## Kapsam
- `Room / Vardiyalar`
- `Company / Vardiyalar`
- `Organization / Planlama`

## Neler değişti?
- `ReadableMiniRouteMap` içinde gerçek Leaflet tile tabanlı mini harita korunur; modal açılışı `Haritayı büyüt` ile görünür olur, kapanış `Haritayı kapat` ile netleşir.
- Boarding preview kartındaki map toggle `Haritada göster` metnini korur; modal açılışı `Haritayı büyüt` ile görünür olur, kapanış `Haritayı kapat` ile netleşir.
- `MapContainer`, `TileLayer`, `fitBounds` ve `tileerror` fallback akışı korunur.
- Tile atıf satırı `OpenStreetMap contributors` olarak okunur kalır.
- `tableWrap` üstünden taşan tablolar desktop'ta kırılır, mobile'da kontrollü scroll davranışı korunur.
- `organizationPlansLayout` ve `organizationPlansSidebar` small-screen hizada tek kolona iner.
- Company ve Room filtre/input alanları sabit genişlik yerine responsive genişliklerle çalışır.

## Görsel hedef
- Mini-map önizleme ve modal okunur kalır.
- `map-preview-pill` legend dili korunur.
- Preview kartları, desktop genişlikte taşmadan hizalanır.

## Doğrulama sınırı
- `Backend route/write-path değişmedi.`
- `Schema/migration yok.`
- `runtime-data` commit dışı kaldı.
- `browser-smoke` artifact commit dışı kaldı.
- `Playwright runner policy değişmedi.`
- `Coverage matrix check değişmedi.`
- `Sefer Abi` görünür dili sade ve operasyon odaklı kaldı.

## Beklenen kabul
- `UX-FIX 0`
- `BLOCKER 0`
- `NOT-FOUND 0`
- 390x844 mobile audit görünümü bozulmaz

## Komut
- `node backend\scripts\ux_mobile_overflow_minimap_polish_02_check.js`
