# KVKK ENFORCEMENT YÜZEYİ V1

## Amaç
Bu belge M77 altında gerçekten koda inmiş olan KVKK maskeleme ve payload daraltma yüzeylerini listeler.

## Temel yüzeyler
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
- `GET /api/admin/logs/export`
  - text ve meta içinde email / ip / koordinat redaction uygulanır

## School / Veli erişimi yüzeyi
- `GET /api/school/parent-invites`
  - Veli Erişimi geçmişini döner
  - ham email / phone tutulmaz
- `GET /api/auth/parent-invite/info`
  - erişimin aktif / iptal / süre dolmuş durumunu kontrollü döner
  - iletişim verisi yerine child ve şirket özeti taşır

## Ek yüzeyler
- `GET /api/company/personels`
  - `Company.kind = SCHOOL` ise öğrenci iletişim alanları varsayılan olarak daraltılır
- `GET /api/shifts/:id/operation-events`
  - audit meta redacted döner
- `GET /api/logs/preview`
- `GET /api/logs/export`
- `GET /api/admin/logs/preview`
- `GET /api/admin/logs/export`
  - text ve meta içinde email / ip / koordinat redaction uygulanır
