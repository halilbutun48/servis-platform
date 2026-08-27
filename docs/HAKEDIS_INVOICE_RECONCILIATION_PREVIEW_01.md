# HAKEDİŞ-FATURA MUTABAKAT ÖNİZLEMESİ - #3

Durum: `green / preview-only / immutable closure`

## Kapsam

Bu milestone, gerçek sözleşme, operasyon kanıtı, hakediş kaydı ve fatura kaydını dönem bazında karşılaştıran salt-okunur bir karar destek önizlemesidir. Önemli tutarlar tam sayı minor biriminde tutulur; hesaplama sunucu tarafındadır.

Mutabakat gerçeği şu sırayı izler:

`Sözleşme` -> `vardiya/operasyon kanıtı` -> `hakediş kaydı` -> `fatura kaydı` -> `fark ve gerekçe`

`EXTERNAL_REFERENCE` yalnızca bağlam sağlayabilir; hakediş, fatura, sözleşme veya operasyon gerçeğine yükseltilemez. `DEMO_FIXTURE` gerçek mutabakat kanıtı değildir.

## Ayrı anlamlar

- Sözleşme değeri: anlaşmadaki firma ve taşımacılık firması tutarlarıdır.
- Operasyon kanıtı: sözleşmeye bağlı, dönem içindeki vardiya ve tamamlanma kanıtıdır.
- Hakediş önizlemesi: karşılaştırmanın beklenen iç tutarıdır.
- Fatura tutarı: fatura kaydının iç tutarıdır.
- Fark: fatura tutarı eksi hakediş tutarıdır; negatif fark fatura düşüklüğünü, pozitif fark fatura fazlalığını gösterir.

## Sonuç durumları

`MATCHED`, `UNDER_INVOICED`, `OVER_INVOICED`, `NO_AGREEMENT`, `NO_OPERATION`, `NO_HAKEDIS`, `NO_INVOICE`, `PARTIAL_OPERATION_EVIDENCE`, `PERIOD_MISMATCH`, `DUPLICATE_HAKEDIS`, `DUPLICATE_INVOICE`, `CURRENCY_MISMATCH` ve `REVIEW_REQUIRED` durumları desteklenir. Eksik veya belirsiz kanıt, sıfır tutar veya uyumlu sonucu olarak sunulmaz.

## API

`GET /api/reconciliation/preview?agreementId={id}`

- `COMPANY` yalnızca kendi `CompanyKind=COMPANY` tenantındaki sözleşmeleri görür.
- `ROOM` yalnızca kendi taşımacılık firması tenantına bağlı sözleşmeleri görür.
- `SUPER_ADMIN` denetim kapsamındadır.
- `SCHOOL` ve `ORGANIZATION` için mutabakat finans yetkisi yoktur.
- Endpoint yalnızca `GET` kabul eder; fatura onayı, hakediş kesinleştirme, ödeme veya muhasebe yazımı yapmaz.
- `periodStart` ve `periodEnd` `YYYY-AA-GG` biçimindedir ve bitiş tarihi başlangıçtan önce olamaz.

## Kanıt ve güvenlik

Sonuç; sözleşme, vardiya kimlikleri/tamamlanma sayıları, hakediş referansı, fatura referansı, dönem, eksik veri, güven seviyesi ve sonraki inceleme adımını taşır. Aynı dönem için birden fazla etkin hakediş veya fatura kaydı bulunduğunda sonuç güvenli biçimde incelemeye düşer.

## Kabul sahipleri

- Saf davranış kontrolü: `npm run check:hakedisinvoicereconciliationpreview01`
- Gerçek API + DB kabulü: `npm run accept:hakedisinvoicereconciliationpreview01`
- Prisma migration: `backend/prisma/migrations/20260827130000_hakedis_invoice_reconciliation_preview_01`
- Sunucu sahibi: `backend/src/finance/hakedisInvoiceReconciliation.js` ve `backend/src/routes/reconciliation.js`
- Kullanıcı yüzeyi: `web/src/components/ReconciliationPreviewCard.jsx`

## Kapanış kanıtı

- Saf davranış kontrolü, gerçek API + DB kabulü ve browser kabulü yeşildir.
- Sonuç salt-okunur önizlemedir; ödeme, fatura onayı, hakediş kesinleştirmesi ve muhasebe yazımı açılmaz.
- `EXTERNAL_REFERENCE` ve `DEMO_FIXTURE` yalnızca bağlam/test provenance'ı olarak kalır; mutabakat gerçeği değildir.
- Sonraki kanonik frontier: `#4 COST-SCENARIO-FORECAST-AND-SAVINGS-01`.

Bu milestone ödeme yürütme, muhasebe kaydı, otomatik fatura onayı veya otomatik hakediş kesinleştirmesi değildir.
