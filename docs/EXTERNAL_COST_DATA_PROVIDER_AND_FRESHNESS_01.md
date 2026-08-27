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

Üretim varsayılanı provider yok (`EXTERNAL_REFERENCE_PROVIDER=none`). Bu
çalışma gerçek provider'a bağlanmaz, veri çekmez ve örnek piyasa değeri
üretmez. İlk kontrollü yol, açık kaynak/as-of/bölge/kapsam bilgisi ile yalnızca
SUPER_ADMIN tarafından girilen `MANUAL_CONTROLLED_REFERENCE` kaydıdır.

İleride ücretsiz veya düşük maliyetli provider adapter'ları registry'ye
eklenebilir. Test provider'ları yalnızca checker içinde kullanılır ve üretim
market truth'u olamaz.

## Canonical value contract

Her kayıt family, value, unit, currency (uygunsa), source, provider, as-of,
region, scope, freshness, confidence, completeness, conflict, provider status,
fallback state, retrieved-at ve geçerlilik pencerelerini taşır. Para değerleri
plain decimal string veya integer minor-unit olarak doğrulanır; floating-point
para hesabı yapılmaz. Unit family ile eşleşmezse kayıt reddedilir.

Supported architecture families:

`FUEL_DIESEL`, `FUEL_GASOLINE`, `FUEL_LPG`, `FX`, `INFLATION_INDEX`,
`COST_INDEX`, `TOLL`, `BRIDGE`, `TUNNEL`, `FERRY`, `MAINTENANCE_REFERENCE`,
`TYRE_REFERENCE`, `VEHICLE_CLASS_REFERENCE`, `REGIONAL_COST_REFERENCE`.

Actual configured provider families: none by default; manual import is
explicitly controlled and provider-neutral.

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

## Sefer Abi / downstream seam

Contract, ileride Sefer Abi'nin şu kanıtları açıklayabilmesini sağlar:

`Piyasa referansı`, `Kaynak`, `Veri tarihi`, `Güncellik`, `Güven seviyesi` ve
`Bu piyasa referansıdır; gerçek maliyetiniz farklı olabilir.`

Bu milestone #4 forecast veya #5 tam maliyet asistanını uygulamaz. Belirsiz,
stale, conflict veya eksik provenance durumunda kesin piyasa hükmü verilmez.
