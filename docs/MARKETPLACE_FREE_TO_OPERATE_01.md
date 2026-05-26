# MARKETPLACE-FREE-TO-OPERATE-01

## Amaç
- SeferPakt’ın lisanssız free-to-operate ticari modelini readonly ürün katmanı olarak göstermek.
- Lisanssız free-to-operate ticari model önizlemesi, yalnızca okunur bir ticari katman olarak sunulur.
- Gerçek ödeme, tahsilat, fatura, settlement, ledger veya otomatik kesinti başlatmamak.

## Model
- Lisans ücreti: `0 TL`
- Mevcut / manuel / pilot / legacy / taşınmış kayıt: başarı payı doğmaz.
- Kaynak vardiya / market shift zinciri kanıtlanan yeni / yenilenen SeferPakt kayıt: kaliteye göre `%1-%3` readonly başarı payı önizlenir.
- SeferPuanı eksikse kesin oran verilmez; güvenli fallback kullanılır.

## Güvenli fallback
- `sourceShiftId`, `marketShift`, `commercialSource` veya diğer lineage sinyalleri yoksa preview `EXISTING_IMPORTED` ya da `INSUFFICIENT_LINEAGE` kabul edilir.
- Bu durumda `licenseFee = 0`, `successShare = 0`, `payableNow = false`, `canInvoice = false`, `canCollect = false`.

## Oran mantığı
- `ELITE` / `4.7-5.0` -> `%1`
- `GOOD` / `4.3-4.69` -> `%1.5`
- `STANDARD` / `3.8-4.29` -> `%2`
- `RISKY` / `3.3-3.79` -> `%2.5`
- `CRITICAL` / `<3.3` -> `%3` readonly önizleme + inceleme notu
- Yenileme kaydında oran aralığı daha düşüktür.

## Readonly sınır
- Bu katman sadece önizlemedir.
- Tahsilat, fatura, payment, settlement, ledger, billing export ve offer ranking açılmaz.

## Out of scope
- Payment execute
- Invoice / tahsilat
- Platform fee ledger
- Settlement execute
- Billing export
- Offer ranking veya otomatik ticari sıralama
- Yeni business execution
- Prisma schema / migration
