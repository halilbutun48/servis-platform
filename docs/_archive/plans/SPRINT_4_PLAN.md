# Sprint 4 Plan — Ölçek, Ürünleþtirme, Dayanýklýlýk

## Hedef
Sistemi “gerçek saha” yüküne hazýrlamak:
- Büyük dosya/çok personel
- Provider limitleri
- Performans ve operasyonel güvenlik

## Kapsam (In) — Öneri
- Async import/geocode pipeline (queue/worker)
- Geocode provider fallback (Nominatim › Google gibi)
- Büyük rapor/export (CSV/Excel) — async export opsiyonu
- Replace mode politikasý: versioning veya explicit “overwrite”
- Performans: batch insert, batch delete, index iyileþtirmeleri

## DoD
- 5k–50k satýr import senaryolarý timeouts olmadan tamamlanýr (queue ile)
- Geocode rate-limit’e dayanýklý (throttle + retry + fallback)
- Export ölçeklenebilir (async)
