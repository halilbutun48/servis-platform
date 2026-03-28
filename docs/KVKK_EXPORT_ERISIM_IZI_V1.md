# KVKK EXPORT / ERİŞİM İZİ V1

## Amaç
Hassas export ve retention işlemlerinin audit izi ham kişisel filtreleri tekrar yazmasın; ama kim, neyi, ne kadar export etti izlenebilir kalsın.

## M77.5 ile izlenen ana olaylar
- `LOG_EXPORT`
- `RETENTION_RUN`
- `KVKK_DOC_ACCEPT`
- `KVKK_DOC_REVOKE`

## Export audit meta kuralı
`buildKvkkExportAuditMeta()` şu alanları yazar:
- `endpoint`
- `kind`
- `targetType` / `targetId`
- `format`
- `take`
- `rowCount`
- `rangeTR`
- `filters`
- `policyVersion`

Ama şu alanları ham haliyle tekrar yazmaz:
- ham `email`
- ham `ip`
- ham `userAgent`
- ham `token`

## Bağlı yüzeyler
- `GET /api/logs/export`
- `GET /api/admin/logs/export`
- `POST /api/admin/retention/run`
- `GET /api/kvkk/retention`

## Not
Bu adım export'u kapatmaz. Export audit izini KVKK açısından daha temiz, daha ölçülebilir ve daha savunulabilir hale getirir.
