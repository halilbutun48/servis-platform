# EPIC B Plan — Log / Rapor / Export (CSV/Excel)

## Hedef
Company/Room/Driver için tarih aralığına göre raporlar:
- Araç günlük km, hız ihlali, sürüş süreleri
- Durak geçiş/atlama zamanları (REACHED/SKIPPED)
- Export: CSV (MVP) + (opsiyon) Excel

## Kapsam (In)
- Rapor endpoint’leri (filtreli, sayfalı)
- Export: CSV (MVP)
- Format standardı (kolon isimleri, timezone, tarih formatı)
- RBAC/scope enforcement

## Kapsam Dışı (Out)
- Async export / büyük rapor kuyruğu (Sprint 4+)
- Çok gelişmiş BI dashboard

---

## Veri Kaynakları
- `ApiRequest` (opsiyonel: trafik analizi)
- `Notification` (overspeed/stale/offline/recovery sayıları)
- `GpsPoints/GpsLast` veya mevcut GPS history (km hesap için)
- `Stop` + stop state alanları (durak zamanları)
- (Varsa) `AuditLog`

> Not: km hesabı için GPS history yoksa Sprint B1’de en azından “trip points” veya “odometer-like” yaklaşım netleştirilmeli.

---

## MVP Endpoint Taslağı

### B-API-01 Araç özet raporu
`GET /api/reports/vehicle-summary?from=YYYY-MM-DD&to=YYYY-MM-DD&vehicleId=...`
- response örnek:
```json
{
  "vehicleId": 1,
  "from": "2026-01-01",
  "to": "2026-01-07",
  "totalKm": 123.4,
  "overspeedCount": 5,
  "offlineMinutes": 42
}
