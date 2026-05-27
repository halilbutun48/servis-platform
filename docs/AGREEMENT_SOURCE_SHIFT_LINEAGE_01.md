# AGREEMENT-SOURCE-SHIFT-LINEAGE-01

## Amaç
- Agreement doğrudan ana ticari kaynak değildir.
- Kaynak vardiya / market shift / teklif seçimi / sözleşmeye dönüşüm zincirini readonly olarak açıklamak.
- Source lineage kanıtı yoksa mevcut / taşınmış / manuel / legacy fallback ile başarı payının doğmamasını güvenceye almak.

## Doğru zincir
- lead / plan / servis talebi
- kaynak vardiya / market shift
- teklif / seçim
- vardiyadan sözleşmeye dönüştürme
- agreement
- active / approved agreement’dan rolling 7 günlük vardiyalar

## Source tipleri
- `SEFERPAKT_NEW`
- `SEFERPAKT_RENEWAL`
- `EXISTING_IMPORTED`
- `MANUAL_INTERNAL`
- `PILOT_FREE`
- `LEGACY`
- `INSUFFICIENT_LINEAGE`

## Kaynak kanıt alanları
- sourceShiftId / marketShift / commercialSource / selectedOfferId
- shiftRootId / shiftId / organizationPlanId / roomId

## Güvenli fallback
- `sourceShiftId`, `marketShift`, `commercialSource`, `selectedOfferId` veya diğer lineage sinyalleri yoksa kayıt `EXISTING_IMPORTED` ya da `INSUFFICIENT_LINEAGE` kabul edilir.
- `EXISTING_IMPORTED` / `MANUAL_INTERNAL` / `PILOT_FREE` / `LEGACY` / `INSUFFICIENT_LINEAGE` için başarı payı doğmaz.
- `billableByMarketplacePolicy = false`, `payableNow = false`, `canInvoice = false`, `canCollect = false`.

## Organization plan özel notu
- Organization plan tek başına billable kanıt değildir.
- Organization plan’dan gelen agreement, kaynak vardiya / market shift / teklif zinciri kanıtı yoksa güvenli fallback olarak kabul edilir.

## Marketplace gate
- Source lineage kanıtlıysa platform fee preview readonly kalır.
- `SEFERPAKT_NEW` ve `SEFERPAKT_RENEWAL` yalnızca kanıtlı lineage ile billable preview üretebilir.
- Gerçek ödeme, tahsilat, fatura, ledger veya settlement execute açılmaz.

## Out of scope
- Prisma schema / migration
- Payment / invoice / settlement execute
- Offer ranking veya görünürlük değişikliği
- Direct contract redesign
- Yeni business execution
