# OVERLAY M85/M86 — AUTO SPLIT BY REAL ROOM POOL COMBINATION

Tarih: 2026-03-08

## Amaç
Tek araç kapasitesi yetmediğinde sabit 16+16+8 gibi bölmek yerine,
aynı zaman aralığında müsait olan gerçek araç + driver havuzundan
kişi sayısını karşılayan en iyi kombinasyonu seçmek.

## Bu overlay ne yapar?
- availability/pool artık kombinasyonu greedy değil, daha doğru kombinasyon çözücüsü ile üretir
- kombinasyon çıktısında araç başına `allocatedPax` döner
- ROOM Bekleyen Talepler ekranında:
  - önerilen kombinasyon `kapasite -> atanacak kişi` olarak görünür
  - `Havuz Kombinasyonuyla Böl & Onayla` butonu gelir
- backend yeni aksiyon:
  - `POST /api/shifts/:id/auto-split-approve`
- bu aksiyon:
  - root shift'i `SPLIT` yapar
  - havuz kombinasyonuna göre APPROVED child shift'ler oluşturur
  - her child shift'e gerçek vehicle + driver bağlar
  - kişi yükünü araç kapasitesine göre dağıtır
  - açık offer kayıtlarını cancel eder

## Prisma / veri modeli
Shift modeline eklendi:
- `requiredPaxOverride`
- `splitRootId`
- `splitGroupKey`
- `splitIndex`
- `splitTotal`
- `ShiftStatus.SPLIT`

## Not
- Agreement shift auto-split şimdilik kapalı bırakıldı
- Child shift'lerde demand hesapları `requiredPaxOverride` ile çalışır
- Kök shift operasyonel listeden düşer çünkü status `SPLIT` olur
