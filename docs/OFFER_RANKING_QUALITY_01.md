# OFFER-RANKING-QUALITY-01

Tarih: 2026-06-11  
Repo: `servis-platform`

## docs/check milestone
- Bu doküman bir docs/check milestone kaydıdır; runtime feature, stage/commit/tag/push ve browser-smoke artifact açmaz.
- Canonical check: `check:offerrankingquality01`
- Komut: `node backend\scripts\offer_ranking_quality_01_check.js`

## Amaç
- `OFFER-RANKING-QUALITY-01` readonly offer quality comparison katmanıdır.
- Company / Room / Super Admin yüzeylerinde kalite, güven, telematics, evidence/check-in ve operasyon riski birlikte okunur.
- Çıktı, otomatik winner seçimi değil karşılaştırmalı karar desteğidir.

## Güven Sınırı
- auto-selection kapalıdır.
- auto-accept kapalıdır.
- contract execute kapalıdır.
- payment/hakediş execute kapalıdır.
- AI runtime action kapalıdır.
- Supplier auto-selection, offer auto-accept ve otomatik karar zinciri açılmaz.
- Kesin seçim yalnız insan onayıyla yapılır.

## Bileşenler
- Helper: `web/src/utils/offerQualityRanking.js`
- Card: `web/src/panels/shared/OfferQualityRankingCard.jsx`

## Okunan sinyaller
- kalite ve güven sinyalleri
- telematics sinyalleri
- evidence / check-in sinyalleri
- proof, draft score ve review decision
- operasyon riski
- readonly fiyat karşılaştırma sinyali

## Kullanım
- Company, Room ve Super Admin panelleri aynı readonly karşılaştırma kartını kullanır.
- Sıralama, kullanıcıya sunulan karar desteğidir; winner otomasyonu değildir.
- Kalite, güven, telematics, evidence/check-in ve operasyon riski birlikte okunur.

## Not
- Bu milestone docs/check zincirinin bir parçasıdır ve yalnızca görünürlük ile doğrulama için yaşar.
