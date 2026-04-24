# BACKEND REGION OWNERSHIP AND ROUTING TASKS V1

Bu belge, `TECHNICAL_DECISION_REGION_SHARDING_V1` kararini backend uygulama islerine cevirir.

## Neden bu dokuman var?

Karar notu mimari yonu soyler. Bu dosya ise backend tarafinda hangi islerin hangi sirayla cikacagini netlestirir.

## Mevcut zemin

Repo su an region bazli dusunmeye hazir parcalar tasiyor:

- `backend/prisma/schema.prisma` icinde `Region` modeli var
- `Company.regionId` ve `Company.district` var
- `Room.regionId` ve `Room.district` var
- company / room listeleri region include ile donuyor
- GPS ve canli operasyon yazilari merkezi hot path olarak calisiyor

## Simdiki durum

Bu dokumanin planladigi ana halkalarin bir kismi artik kodda var:

- `backend/src/region/ownership.js` region ownership helper ve same-region guard'lari tek yerden topluyor
- `backend/src/routes/shifts/company.js` company shift create / batch akisini same-region guard ile sinirliyor
- `backend/src/routes/gps.js` ve `backend/src/jobs/autoReachedQueue.js` region context tasiyor
- `backend/src/routes/rooms.js`, `backend/src/routes/companies.js`, `backend/src/routes/notifications.js`, `backend/src/routes/parent.js` regionOwnership / regionRoutingKey gorunurlugu veriyor
- `backend/src/routes/admin.js` region capacity snapshot donduruyor
- `backend/src/routes/shifts/shared.js`, `backend/src/routes/shifts/room.js`, `backend/src/routes/shifts/helpers.js` dekorlu shift payload'lari tasiyor
- `backend/src/routes/drivers.js`, `backend/src/routes/vehicles.js`, `backend/src/routes/offers.js`, `backend/src/routes/driver.js` region-aware read surfaces olarak hizalaniyor

Repo-side backend backlog kapanmis durumdadir; kalan adimlar fiziksel rollout ve saha tatbikat operasyonudur.

Bu yuzden once logical ownership ve routing katmani kurulabilir.

## Hedef

Backend tarafinda su iki kavrami ayirmak:

1. **Region ownership map**
   - hangi entity hangi region'a aittir
2. **Region routing map**
   - hangi request / worker / panel hangi region'a gider

## 1) Region ownership map taskleri

### 1.1 Ana sahiplik kurallari

- `vehicle -> homeRegionId`
- `shift -> regionId`
- `company -> default region`
- `room -> region / zone`
- `driver -> home region` gerektiginde

### 1.2 Kural kaynaklari

Ownership karari su girdilerden cikar:
- company region
- room region
- district / zone
- aktif vardiya
- operasyonun calistigi il / ilce

### 1.3 Uygulama notu

- aktif vardiya sirasinda shard hop yapilmaz
- region degisimi sadece dogal kirilma anlarinda olur
- `Region` tek resmi referans kalir

## 2) Region routing map taskleri

### 2.1 Ingest tarafi

- GPS ingest region-aware olmalidir
- auto-reached / shift-progress yazimi region bazli calismalidir
- notification worker akisi region bazli dusunulmelidir

### 2.2 Read tarafi

- company / room panelleri region-local veriyi okumali
- centralized raporlar control plane tarafinda kalmali
- WS relay region-local veya region-aware calismali

### 2.3 Worker tarafi

- auto-reached queue / worker region-aware olmalidir
- notification emit worker'i region sinirini bilmelidir
- solver / OSRM cagrilari region bazli sevk edilebilir olmalidir

## 3) Control plane vs region cell ayrimi

### Control plane

Merkezde kalacak yuzeyler:
- auth / login
- rol / tenant / policy
- global config
- kurum / firma / oda ana kayitlari
- merkezi raporlama

### Region cell

Canli operasyonu tasiyacak yuzeyler:
- regional API
- regional Redis
- regional Postgres hot store
- regional WS relay
- regional worker'lar
- regional OSRM
- regional solver

## 4) Backend dosya etkileri

Bu taskler asagidaki backend yuzeylerini etkileyecek adaylardir:

- `backend/prisma/schema.prisma`
- `backend/src/routes/companies.js`
- `backend/src/routes/rooms.js`
- `backend/src/routes/gps.js`
- `backend/src/routes/shifts/company.js`
- `backend/src/routes/shifts/room.js`
- `backend/src/notifications/service.js`
- `backend/src/notifications/stopProgressNotifs.js`
- `backend/src/jobs/autoReachedQueue.js`
- `backend/src/jobs/index.js`
- `backend/src/routes/admin.js`
- `backend/src/routes/notifications.js`
- `backend/src/routes/parent.js`
- `backend/src/region/ownership.js`
- `backend/src/region/index.js`
- `backend/src/ops/regionCapacity.js`

## 4.1) İlk bağlanan yüzeyler

- `backend/src/routes/companies.js` read/create response'lari
- `backend/src/routes/rooms.js` read/create response'lari
- `backend/src/routes/gps.js` region routing bağlamı
- `backend/src/jobs/autoReachedQueue.js` region-aware worker payload

## 5) Oncelik sirasi

### Faz A - Ownership map
1. region alanlari icin resmi sahibi netlestir
2. vehicle / shift / company / room sahipligini yaz
3. il / ilce / zone map'ini sabitle
4. ortak region helper'i `backend/src/region/ownership.js` icine toplu tut
5. company / room read-create response'larinda helper alanini görünür kıl

### Faz B - Routing map
1. GPS ingest yolunu region-aware yap
2. read yüzeylerini region-local hale getir
3. worker / queue / notification sevkini region bazli kur
4. region routing helper'i ayni modulde tek kaynaktan okunsun

### Faz B durumu

- GPS ingest ve worker payload'lari region-aware
- read yuzeylerinin buyuk kismi region-local gorunurluk verdi
- company shift create / batch same-region guard ile kapatildi
- company, room ve parent/notification read yüzeyleri regionOwnership gorunurlugu veriyor
- kalan routing enforcement fiziksel region cell tasariminda devam eder

### Faz C - Go-live sinirlari
1. region bazli p95 / inflight / lag izleme
2. region bazli panel sayisi ve notification hizi izleme
3. 2000 / 3000 / 3500 benchmark bandini region kabul kriterine baglama
4. archive / zone gorunurlugu repo'da hazir tutulurken fiziksel rollout ve drill ayrik tutulur

### Faz D - Fiziksel rollout ve saha tatbikat doc'lari

- [REGION_NEXT_PHASE_EXECUTION_PACK_V1](REGION_NEXT_PHASE_EXECUTION_PACK_V1.md)
- [REGION_PHYSICAL_CELL_DEPLOYMENT_V1](REGION_PHYSICAL_CELL_DEPLOYMENT_V1.md)
- [REGION_ZONE_ALT_SHARD_V1](REGION_ZONE_ALT_SHARD_V1.md)
- [REGION_ARCHIVE_EXPORT_MANIFEST_RESTORE_V1](REGION_ARCHIVE_EXPORT_MANIFEST_RESTORE_V1.md)
- [REGION_FAILOVER_REBALANCING_DRILL_V1](REGION_FAILOVER_REBALANCING_DRILL_V1.md)

## 6) Kabul kriteri

Bu backend task paketi tamamlandiginda:
- her kritik entity'nin region sahipligi bellidir
- GPS ve canli operasyon tek merkezi hot DB hattina mecbur degildir
- read / write / worker akislari region bazli dusunulebilir
- control plane ile region cell siniri netlesmistir

## 7) Kapsam disi

- fiziksel shard migration bu dokumanin isi degil
- mevcut API contract'ini bu turda degistirmek zorunlu degil
- push notification altyapisi bu turda acilmaz

## Baglanti

Karar notu: [TECHNICAL_DECISION_REGION_SHARDING_V1](TECHNICAL_DECISION_REGION_SHARDING_V1.md)
Hazirlik listesi: [REGION_SHARDING_READINESS_CHECKLIST_V1](REGION_SHARDING_READINESS_CHECKLIST_V1.md)
Sonraki faz roadmap: [REGION_SHARDING_NEXT_PHASE_ROADMAP_V1](REGION_SHARDING_NEXT_PHASE_ROADMAP_V1.md)
