# #2 EXTERNAL-COST-DATA-PROVIDER-AND-FRESHNESS-01

## Amaç

Bu milestone, SeferPakt için provider-bağımsız dış maliyet/piyasa referansı
temelini kurar. Dış referans karar destek verisidir; şirketin veya taşıma
firmasının gerçek maliyeti değildir.

Canonical check: `check:externalcostdataproviderfreshness01`

## Veri sınıfları

- `INTERNAL_ACTUAL`: sözleşme, operasyon, gerçek maliyet, hakediş veya fatura
  gibi tenant iş gerçeği.
- `EXTERNAL_REFERENCE`: dış kaynaktan gelen piyasa, tarife, endeks veya kur
  referansı.
- `DEMO_FIXTURE`: seed ve test verisi.

Bu üç sınıf birbirine dönüştürülmez. `ExternalCostReference` tablosu yalnızca
`EXTERNAL_REFERENCE` kabul eder; `INTERNAL_ACTUAL` verisini değiştiremez ve
`DEMO_FIXTURE` değerini piyasa verisi olarak yükseltemez.

## Canonical owner

- Contract ve normalizer: `backend/src/externalCost/referenceContract.js`
- Provider registry, bounded retry/backoff ve circuit sınırı:
  `backend/src/externalCost/providerRegistry.js`
- DB/read/import service: `backend/src/externalCost/externalCostReferenceService.js`
- API owner: `backend/src/externalCost/router.js`
- Persistence: Prisma `ExternalCostReference` ve migration
  `20260827120000_external_cost_reference_foundation_01`
- Check: `backend/scripts/external_cost_data_provider_freshness_01_check.js`

## Provider stratejisi

İlk gerçek provider `EPDK_PETROL` olarak `genelSorgu` SOAP sözleşmesine
bağlanır. `sorguNo=72` ve il trafik kodu ile alınan bayi raporları Motorin ve
Kurşunsuz Benzin 95 Oktan ailelerine normalize edilir. Kayıtlar bayi değerleri
üzerinde, yalnızca en güncel kaynak tarihindeki tam resmi ürün etiketleri için
deterministik medyan olarak özetlenir; varyantlar (`(Diğer)`, biodizel,
etanol/E10 vb.) temel aileye dahil edilmez. `Fiyat` ham alanı açık ondalık
değerdir; query-72 yanıtında ayrı bir birim alanı bulunmadığında resmi litre
bülteniyle çapraz doğrulanır. Exact litre başına TRY oranı `valueDecimal`
içinde korunur; `valueMinor` yalnızca açık HALF_UP kuruş uyumluluk
dönüşümüdür. Ham XML saklanmaz, yalnızca SHA-256 payload kimliği tutulur.

EPDK LPG servisi (`EPDK_LPG`) ayrı adapter olarak hazırdır ancak resmi sorgu
numarası açıkça yapılandırılmadan etkin sayılmaz. Böylece doğrulanmamış LPG
parametresiyle veri uydurulmaz. `EXTERNAL_REFERENCE_PROVIDER=EPDK` veya
`EPDK_PETROL` seçimi provider registry üzerinden yapılır; manual import yolu
ayrı ve yalnızca `SUPER_ADMIN` step-up yazma kapısından geçer.

EPDK web sayfasında erişilebilen teknik sözleşme, kılavuz, endpoint ve canlı
SOAP cevap şekli doğrulanmıştır. Sitenin genel iletişim/atıf bilgileri dışında
ayrı bir yeniden kullanım lisansı tespit edilmemiştir; bu teknik kabul, hukuki
lisans görüşü yerine geçmez. Provider erişilemezse retry/circuit/freshness
durumu açıkça no-data/unavailable olarak kalır.

## Canonical value contract

Her kayıt family, value, unit, currency (uygunsa), source, provider, as-of,
region, scope, freshness, confidence, completeness, conflict, provider status,
fallback state, retrieved-at ve geçerlilik pencerelerini taşır. Para değerleri
plain decimal string veya integer minor-unit olarak doğrulanır; floating-point
para hesabı yapılmaz. `CURRENCY_PER_L` biriminde exact rate decimalı 12 haneye
kadar korunabilir; ayrı `valueMinor` alanı varsa yalnızca HALF_UP kuruş
uyumluluğu olarak doğrulanır. Unit family ile eşleşmezse kayıt reddedilir.

Supported architecture families:

`FUEL_DIESEL`, `FUEL_GASOLINE`, `FUEL_GASOLINE_95`, `FUEL_LPG`, `FX`, `INFLATION_INDEX`,
`COST_INDEX`, `TOLL`, `BRIDGE`, `TUNNEL`, `FERRY`, `MAINTENANCE_REFERENCE`,
`TYRE_REFERENCE`, `VEHICLE_CLASS_REFERENCE`, `REGIONAL_COST_REFERENCE`.

Actual configured provider families: none by default; manual import is
explicitly controlled and provider-neutral. Provider refresh uses the same
external-only boundary and cannot write tenant actuals.

## Üç katman ve bölge çözümü

`backend/src/externalCost/referenceLayers.js` üç değeri ayrı taşır:

- `Dış Piyasa Referansı`: resmi dış provider snapshotı.
- `SeferPakt Bölgesel Referansı`: yeterli, anonimleştirilmiş ve aykırı
  değerlere dayanıklı gözlem agregası.
- `Senin Gerçek Verilerin`: aynı tenant/operasyonun açık actual girdisi.

Resolver sonucu seçilen değerin nedenini, as-of/pencereyi, coğrafyayı, güveni,
tamlığı ve örnek bilgisini taşır; üç katman tek etiketsiz sayıya birleştirilmez.
Bölge çözümü önce exact il, sonra açıkça sağlanan bölgesel/Türkiye kapsamlarını
izler. İl bilgisi yoksa `NO_GEOGRAPHY` döner; İstanbul sessiz fallback değildir.
Platform referansı configurable sample threshold altında hiç açılmaz.

`/api/external-cost-references/layers` operation-level, salt okunur görünüm
sağlar. Default ekran kısa toplam/teklif rehberi özetidir; bileşen ayrıntıları
`Detaylar` altında kapalıdır. ROOM gözlenen teklif bandını yalnızca threshold
geçerse görür. COMPANY katmanı ROOM iç maliyetini veya ham teklif verisini
görmez.

## Freshness and fallback

Fresh TTL family'e göre değişir. Stale pencere içinde değer açıkça `STALE`
ve `STALE_CACHE` olarak işaretlenir. Hard-expired değer current reference
olarak servis edilmez. Provider veya güvenli fallback yoksa `NO_DATA`,
`SOURCE_UNAVAILABLE` veya `NO_SAFE_FALLBACK` döner; sistem değer uydurmaz.

Retry yalnızca transient provider hatalarında en fazla üç deneme ve capped
exponential backoff ile yapılır. Geçersiz istek, credential/config hatası,
unsupported family ve scope/unit uyuşmazlığı tekrar denenmez. Provider
devresi `HEALTHY`, `DEGRADED`, `UNAVAILABLE` durumlarını ifade edebilir.

## Cache and traceability

Okuma cache'i mevcut `responseCache` owner'ını kullanır. Key; family, provider,
unit, currency, region ve scope boyutlarını içerir. Persisted canonical record
source/as-of/provider bilgisiyle açıklama ve sonraki milestone'lar için iz
sağlar. Ham provider payload'ı kalıcı olarak tutulmaz; yalnızca sınırlı source
metadata ve payload hash kabul edilir.

## Security and authority

Provider credential bu repoya, browser'a veya loglara girmez. Import endpoint'i
auth + SUPER_ADMIN + mevcut step-up yazma kapısından geçer. Reference API,
budget/cost/offer/payment API'lerinden ayrıdır. COMPANY, SCHOOL, ORGANIZATION
ve ROOM için dış referans gerçek tenant maliyetinin yerine geçmez; #1'in
approved budget ve ROOM cost hesaplarını değiştirmez.

## Destekleyici provider durumu

KGM, TÜİK ve TCMB için bu corrective run içinde canlı absolute maliyet provider
aktivasyonu yapılmadı: KGM’de kırılgan scrape yerine kontrollü import seam’i,
TÜİK’te SDMX endeks desteği, TCMB’de FX/makro desteği ayrı provider olarak
bekletilir. Endeks, kaynaklı bir baseline olmadan TL/km veya TL/sefer üretmez.
Driver labor, maintenance ve vehicle consumption için onaylı versioned source
yoksa no-data/actual yolu korunur; rastgele maaş sitesi veya magic constant
kullanılmaz.

## Sefer Abi / downstream seam

Contract, ileride Sefer Abi'nin şu kanıtları açıklayabilmesini sağlar:

`Piyasa referansı`, `Kaynak`, `Veri tarihi`, `Güncellik`, `Güven seviyesi` ve
`Bu piyasa referansıdır; gerçek maliyetiniz farklı olabilir.`

Bu milestone #4 forecast veya #5 tam maliyet asistanını uygulamaz. #1 quote
floor/profitability owner olarak kalır; #4 scenario engine tekrarlanmaz. Belirsiz,
stale, conflict veya eksik provenance durumunda kesin piyasa hükmü verilmez.
