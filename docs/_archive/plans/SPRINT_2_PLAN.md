# Sprint 2 Plan — Otomatik Durak + Draft → ROOM Akışı (Core)

## Hedef
Excel import + geocode cache (Sprint 1) sonrasında:
- Aynı vardiyadaki personelleri `maxWalkM` kuralıyla duraklara böl
- Durakları + kişi sayılarını Shift Draft olarak üret
- ROOM’a “bekleyen talep” düşür
- ROOM araç + driver atayıp Driver tarafına rota/durakları düşürür

## Kapsam (In)
- Clustering / durak üretimi (maxWalkM garantili)
- Stop ↔ Personel bağları (assignment)
- Shift Draft üretimi + status transition (DRAFT → REQUESTED)
- ROOM approve (araç + driver ata)
- WS event’leri: `shift:requested`, `shift:approved` (scope’lu)

## Kapsam Dışı (Out)
- Company NEEDS_REVIEW UI (Sprint 3)
- Rota optimizasyon (2-opt vb.) (Sprint 3/4)
- Büyük dosya/async pipeline (Sprint 4)

## DB Değişiklikleri
### StopAssignment (öneri)
- stopId, personelId, shiftId (+ unique/index)

## Service
### `clusterStops(personPoints, maxWalkM)`
- MVP: greedy clustering + medoid stop point
- Doğrulama: her assignment için distance <= maxWalkM

## API / İş Akışı
- (Opsiyonel) `POST /api/company/shifts/:id/generate-draft`
- ROOM: `POST /api/room/shifts/:id/approve` (vehicleId, driverId)

## WS
- `shift:requested` → `room:{roomId}` ve `company:{companyId}`
- `shift:approved` → `driver:{driverId}` + ilgili scope

## DoD
- Replace modunda eski durak/assign temizlenip yeniden üretilebilir
- maxWalkM garantisi testle doğrulanır
- ROOM listesinde draft görünür, approve edilebilir
- Driver tarafı durakları görür
