# KVKK ENFORCEMENT YÜZEYİ V1

## Amaç
Bu belge, M77 altında gerçekten koda inmiş olan ilk KVKK maskeleme / daraltma yüzeylerini listeler.

## M77.2 yüzeyleri
- `GET /api/parent/children`
  - ham `phone` ve `homeAddress` verilmez
  - `phoneMasked` ve `homeAddressMasked` döner
- `GET /api/live/vehicles`
  - `gpsLast.lat/lng` role göre exact veya masked-2dp döner
- `GET /api/parent/live/vehicles`
  - parent sadece masked canlı GPS görür
- `GET /api/me/sessions`
  - `ip` ve `userAgent` ham verilmez
  - `ipMasked` ve `userAgentMasked` döner
- `GET /api/kvkk/matrix`
  - enforcement özeti görünür hale gelir

## M77.3 genişleme yüzeyleri
- `GET /api/school/parent-invites`
  - email / phone listede masked döner
- `GET /api/company/personels`
  - `Company.kind = SCHOOL` ise `phone` ve `homeAddress` list yüzeyinde masked döner
- `GET /api/shifts/:id/operation-events`
  - audit meta redacted döner
- `GET /api/logs/preview`
- `GET /api/logs/export`
- `GET /api/admin/logs/preview`
- `GET /api/admin/logs/export`
  - text ve meta içinde email / ip / koordinat redaction uygulanır

## Not
Bu belge final hukuki yorum değil, çalışan enforcement yüzeyinin teknik envanteridir.


## M77.4 ek yüzeyler
- `GET /api/vehicles` role göre sanitize edilir
- `GET /api/shifts/:id` role göre driver iletişim alanı daraltılır
- `GET /api/auth/invites` ham invite email/phone yerine masked alanlar taşır
