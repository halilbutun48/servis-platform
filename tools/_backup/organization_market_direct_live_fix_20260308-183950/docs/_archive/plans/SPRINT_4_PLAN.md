# Sprint 4 Plan — Ölçek, Ürünleştirme, Dayanıklılık

## Hedef
Sistemi “gerçek saha” yüküne hazırlamak:
- Büyük dosya / çok personel
- Provider limitleri
- Performans ve operasyonel güvenlik

## Kapsam (In) — Öneri
- Async import/geocode pipeline (queue/worker)
- Geocode provider fallback (Nominatim → Google gibi)
- Büyük rapor/export (CSV/Excel) → async export opsiyonu
- Replace mode politikası: versioning veya explicit “overwrite”
- Performans: batch insert, batch delete, index iyileştirmeleri

## DoD
- 5k–50k satır import senaryoları timeouts olmadan tamamlanır (queue ile)
- Geocode rate-limit’e dayanıklı (throttle + retry + fallback)
- Export ölçeklenebilir (async)
