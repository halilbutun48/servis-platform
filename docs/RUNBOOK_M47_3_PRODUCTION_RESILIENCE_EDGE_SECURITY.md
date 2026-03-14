# M47.3 — Production Resilience + Edge Security

## Amaç
Bu milestone uygulama seviyesinde temel edge guard ekler:
- her istekte `x-request-id`
- sabit güvenlik header'ları
- şüpheli user-agent filtreleme
- `TRACE` method kapatma
- admin için policy + snapshot görünürlüğü
- `/health` içinde edge security özeti

## Yeni endpoint'ler
- `GET /api/admin/edge-security/policy`
- `GET /api/admin/edge-security/snapshot`

## Beklenen davranış
- normal cevaplarda `x-request-id` bulunur
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: no-referrer`
- `Cross-Origin-Opener-Policy: same-origin`
- `sqlmap` benzeri user-agent 403 alır
- `TRACE` method 405 alır

## Not
Bu katman tek başına WAF değildir.
Prod ortamında LB / reverse proxy / HTTPS redirect / rate-limit / log korelasyonu birlikte korunmalıdır.
