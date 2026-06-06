# UX-MOBILE-OVERFLOW-MINIMAP-READABILITY-01

Tarih: 2026-06-06
Repo: `servis-platform`

## Amaç
- Room / Vardiyalar, School / Operasyon Paneli ve Organization / Planlama yüzeylerinde mobil taşma davranışını tek bir kontrollü düzende tutmak.
- Organization plan mini-map ile boarding route impact mini-map için aynı ortak Leaflet yüzeyini kullanmak.
- Eski abstract SVG grid görünümünü kaldırıp gerçek tile arka planlı mini harita standardına geçmek.

## Ortak bileşen
- Kullanılan bileşen: `web/src/components/map/ReadableMiniRouteMap.jsx`
- Harita katmanı: `MapContainer`, `TileLayer`, `Polyline`, `CircleMarker`, `Tooltip`
- Kadraj: `fitBounds`
- Tile fallback: `tileerror`
- Legend dili: `map-preview-pill`
- Tile attribution: `OpenStreetMap contributors`

## Organization / Planlama
- Kurum planı mini-map gerçek Leaflet tile arka planı üzerinde gösterilir.
- Duraklar `S`, `1..N` ve `E` mantığıyla numaralanır.
- Legend açıkça `Başlangıç`, `Ara duraklar` ve `Bitiş` ayrımı verir.
- Koordinat yoksa açık fallback mesajı gösterilir: `Koordinatlı konum ekleyin.`
- Footer metni, tile arka plan üzerinde rota sıralamasını açıklar.

## Boarding route impact
- `Farklı duraktan bineceğim` önizlemesi aynı shared component ile çizilir.
- Mevcut durak `Eski`, talep edilen durak `Yeni` olarak görünür.
- Rota varsa çizgi tile arka plan üzerinde gösterilir; yoksa metinsel fallback gösterilir.
- Fallback metni: `Harita için yeterli koordinat yok. Rota etkisi metinsel olarak önizleniyor.`
- `Readonly önizleme — rota uygulanmaz` dili korunur.

## Görsel hedef
- Mobilde de desktop'ta da mini-map tile arka planı gerçek map hissi verir.
- Marker label'ları kısa ve okunur kalır.
- Tile yüklenemezse `Harita döşemeleri yüklenemedi` fallback mesajı görünür.
- `390x844` audit viewport ile küçük ekran görünürlüğü kontrol edilir.
- Hedef smoke sonucu: `UX-FIX 0`, `BLOCKER 0`, `NOT-FOUND 0`

## Değişen yüzeyler
- `web/src/panels/organization/organizationPlansShared.jsx`
- `web/src/panels/shared/BoardingRouteImpactPreviewCard.jsx`
- `web/src/components/map/ReadableMiniRouteMap.jsx`
- `web/src/panels/organization/PlansPanel.jsx`
- `web/src/panels/school/OperationsPanel.jsx`
- `web/src/index.css`

## Değişmeyen sınırlar
- Backend route/write-path değişmedi.
- Schema/migration yok.
- Payment, settlement, dispatch, SMS, push ve AI capability açılmadı.
- Runtime-data dosyaları dokunulmadı.
- Browser-smoke ve validation çıktıları yalnızca okunur kanıt üretmek için kullanılır.
- `Sefer Abi` launcher / drawer standardı korunur.

## Doğrulama hedefi
- `check:uxmobileoverflowminimapreadability01`
- `check:product-extensions`
- `check:verifychain01`
- `npm --prefix backend run lint`
- `npm --prefix web run lint`
- `npm run verify:final`

## Notlar
- `tableWrap` standardı Room baseline'ını bozmadan School ve Organization yüzeylerine de uygulanır.
- `organizationPlansLayout` ve `organizationPlansSidebar` mobilde tek sütuna iner.
- `map-preview-pill` legend'ları sade Türkçe ile okunurluğu artırır.
- Browser smoke screenshot seti hem mobile hem desktop görünümü kapsamalıdır.
