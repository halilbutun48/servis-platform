# OVERLAY NOTES — M89 Split Parent Cleanup (2026-03-09)

Bu overlay, **Bol & Onayla** sonrası oluşan `SPLIT` root kaydının UI tarafında yarattığı karışıklığı temizler.

## Değişiklikler

### Company / Organization → Vardiyalar
- **Bekleyen Talepler** listesinden `SPLIT` root satırı çıkarıldı.
- Böylece Bol & Onayla sonrası parent kayıt artık pending sayaç ve pending tabloyu kirletmez.
- Child shift'lerde ID altında şu özet gösterilir:
  - `Paket #<rootShiftId> • <splitIndex>/<splitTotal>`

### Room → Vardiyalar
- **Tüm Shifts** listesinden `SPLIT` root satırı gizlendi.
- Operasyonel olarak sadece child shift'ler görünür kaldı.
- Child shift'lerde ID altında şu özet gösterilir:
  - `Paket #<rootShiftId> • <splitIndex>/<splitTotal>`

## Not
- Backend durum modeli değiştirilmedi; root kayıt DB'de `SPLIT` olarak kalır.
- Bu overlay yalnızca **listeleme/UX cleanup** yapar.
- Child shift üretimi veya auto-split motoruna dokunmaz.
