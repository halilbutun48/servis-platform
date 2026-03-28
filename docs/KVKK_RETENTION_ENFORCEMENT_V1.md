# KVKK RETENTION ENFORCEMENT V1

## Amaç
Bu belge retention / silme / anonimleştirme kararını sadece yazıda bırakmaz; koddaki gerçek policy ve audit izi ile eşler.

## Aktif teknik policy
- `API_REQUEST_RETENTION_DAYS = 730`
- `AUDIT_LOG_RETENTION_DAYS = 730`
- `NOTIFICATION_RETENTION_DAYS = 0`
- `GPS_POINT_RETENTION_DAYS = 0`
- `LOG_RETENTION_ENABLED = true`

## M77.5 ile açılan enforcement omurgası
- `backend/src/kvkk/retention.js`
- `GET /api/kvkk/retention`
- `POST /api/admin/retention/run` audit meta artık `buildKvkkRetentionRunAuditMeta()` ile yazılır
- retention sonucu `cutoffs` ve `counts` sanitize edilmiş özet olarak izlenir

## Tablo / alan yaklaşımı
| Alan | Bugün canlı davranış | Not |
|---|---|---|
| `ApiRequest` | retention ile silme | 730 gün |
| `AuditLog` | retention ile silme | 730 gün |
| `Notification` | opsiyonel silme | 0 ise kapalı |
| `GpsPoint` | opsiyonel silme | 0 ise kapalı |
| `Consent` | kanıt kaydı tutulur | otomatik anonymize yok |
| `ParentChild / Personel iletişim alanları` | response masking | DB anonymize bu turda yok |

## Önemli ayrım
- response masking = veriyi DB'de tutup response'ta daraltmak
- retention delete = süre dolunca kaydı silmek
- anonymize = kaydı tutup kişisel alanı geri döndürülemez biçimde temizlemek

Bu üçü aynı şey değildir; M77.5 bunları aynı omurgada görünür kılar.
