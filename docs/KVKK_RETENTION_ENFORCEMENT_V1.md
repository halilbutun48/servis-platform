# KVKK RETENTION ENFORCEMENT V1

## Amaç
Bu belge retention / silme / archive kararını sadece yazıda bırakmaz; koddaki gerçek policy, hot cleanup ve archive snapshot yaklaşımı ile eşler.

## Aktif teknik policy
- `API_REQUEST_RETENTION_DAYS = 730`
- `AUDIT_LOG_RETENTION_DAYS = 730`
- `NOTIFICATION_RETENTION_DAYS = 180`
- `CHECKIN_EVENT_RETENTION_DAYS = 180`
- `GPS_POINT_RETENTION_DAYS = 30`
- `BACKUP_LOCAL_RETENTION_DAYS = 730`
- `LOG_RETENTION_ENABLED = true`

## M77.6 ile açılan enforcement omurgası
- `backend/src/kvkk/retention.js`
- `GET /api/kvkk/retention`
- `POST /api/admin/retention/run` audit meta artık `buildKvkkRetentionRunAuditMeta()` ile yazılır
- retention sonucu `cutoffs` ve `counts` sanitize edilmiş özet olarak izlenir
- archive snapshot policy ayrıca `backend/src/ops/retentionBackupPolicy.js` ve `tools/backup_create_m45.ps1` üzerinden görünür

## Tablo / alan yaklaşımı
| Alan | Bugün canlı davranış | Not |
|---|---|---|
| `ApiRequest` | retention ile silme | 730 gün hot |
| `AuditLog` | retention ile silme | 730 gün hot |
| `Notification` | hot retention + archive snapshot | 180 gün hot |
| `CheckinEvent` | hot retention + archive snapshot | 180 gün hot |
| `GpsPoint` | hot retention + archive snapshot | 30 gün hot |
| `Consent` | retain-proof / archive snapshot | otomatik anonymize yok |
| `ParentChild / Personel iletişim alanları` | response masking | DB anonymize bu turda yok |
| `RefreshSession`, `Invite`, `ParentInvite` | kısa ömürlü state | expiry / revoke odaklı, archive hedefi değil |

## Önemli ayrım
- response masking = veriyi DB'de tutup response'ta daraltmak
- retention delete = süre dolunca kaydı silmek
- archive snapshot = hot tabloda kısa/orta pencere tutup kanıtı dump/manifest ile uzun süre saklamak
- anonymize = kaydı tutup kişisel alanı geri döndürülemez biçimde temizlemek

Bu üçü aynı şey değildir; M77.6 bunları aynı omurgada görünür kılar.
