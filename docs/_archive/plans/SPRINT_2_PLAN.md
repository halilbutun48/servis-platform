# Sprint 2 Plan — Otomatik Durak + Draft › ROOM Akýþý (Core)

## Hedef
Excel import + geocode cache (Sprint 1) sonrasý:
- Ayný vardiyadaki personelleri `maxWalkM` kuralýyla duraklara böl
- Duraklarý + kiþi sayýlarýný Shift Draft olarak üret
- ROOM’a “bekleyen talep” düþür
- ROOM araç + driver atayýp driver tarafýna rotayý/duraklarý düþürür

## Kapsam (In)
- Clustering / durak üretimi (maxWalkM garantili)
- Stop - Personel baðlarý (assignment)
- Shift Draft üretimi + status transition (DRAFT › REQUESTED)
- ROOM approve (araç+driver ata)
- WS event’leri: `shift:requested`, `shift:approved` (scope’lu)

## Kapsam Dýþý (Out)
- Company NEEDS_REVIEW UI (Sprint 3)
- Rota optimizasyon (2-opt vs) (Sprint 3/4)
- Büyük dosya/async pipeline (Sprint 4)

## DB Deðiþiklikleri
### StopAssignment (öneri)
- stopId, personelId, shiftId (+ unique/index)

## Service
### `clusterStops(personPoints, maxWalkM)`
- MVP: greedy clustering + medoid stop point
- Doðrulama: her assignment için distance <= maxWalkM

## API / Ýþ Akýþý
- (Opsiyonel) `POST /api/company/shifts/:id/generate-draft`
- ROOM: `POST /api/room/shifts/:id/approve` (vehicleId, driverId)

## WS
- `shift:requested` › `room:{roomId}` ve `company:{companyId}`
- `shift:approved` › `driver:{driverId}` + ilgili scope

## DoD
- Replace modunda eski durak/assign temizlenip yeniden üretilebilir
- maxWalkM garantisi testle doðrulanýr
- ROOM listesinde draft görünür, approve edilebilir
- Driver tarafý duraklarý görür
