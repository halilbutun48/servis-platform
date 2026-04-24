# REGION PHYSICAL CELL DEPLOYMENT V1

Bu belge, logical region modelini fiziksel region cell topolojisine cevirmek icin repo-donuk bir execution brief olarak kullanilir.

Tek giris kapisi:
- [TECHNICAL_DECISION_REGION_SHARDING_V1](TECHNICAL_DECISION_REGION_SHARDING_V1.md)
- [REGION_SHARDING_READINESS_CHECKLIST_V1](REGION_SHARDING_READINESS_CHECKLIST_V1.md)
- [REGION_SHARDING_NEXT_PHASE_ROADMAP_V1](REGION_SHARDING_NEXT_PHASE_ROADMAP_V1.md)

## Amac

Vardis canli operasyonunu tek sicak merkez yerine region cell'lere ayirmak.  
Bu turda hedef, fiziksel rollout icin gerekli deploy modelini, servis ayrimini ve gozlem hattini netlestirmektir.

## Repo'daki mevcut zemin

- `backend/src/region/ownership.js` ownership / routing key / same-region guard katmanini topluyor
- `backend/src/routes/admin.js` region kapasite ve backup policy gorunurlugu veriyor
- `backend/src/ops/regionCapacity.js` region bazli kapasite snapshot uretiyor
- `web/src/panels/superadmin/RegionsPanel.jsx` region kapasite gorunurlugu tasiyor
- `backend/src/routes/gps.js` ve `backend/src/jobs/autoReachedQueue.js` region context tasiyor
- `backend/src/routes/shifts/company.js` same-region write guard ile yaziyor
- `backend/src/routes/rooms.js` ve `backend/src/routes/companies.js` region ownership gorunurlugu veriyor

## Hedef fiziksel cell modeli

Bir region cell asagidaki parcalardan olusur:

- regional API
- regional Redis
- regional Postgres hot store
- regional WS relay
- regional worker havuzu
- regional solver
- regional OSRM

Control plane ise merkezde kalir:

- auth / login
- rol / tenant / policy
- global config
- region routing map
- merkezi raporlama

## Uygulama mantigi

### 1. Region baglama

- `serviceRegionId` region routing'in ana anahtari olur
- `vehicle -> homeRegionId`
- `shift -> regionId`
- `company -> default region`
- `room -> region / zone`

### 2. Cell routing

- canli GPS ingest ilgili cell'e gider
- auto-reached ve notification worker akisi region-aware calisir
- panel read yuzeyleri local cell verisini okur
- solver / OSRM region bazli sevk edilebilir

### 3. Cutover sirasiyla

1. pilot region sec
2. routing map'i region'e bagla
3. stateless servisleri replica olarak ayir
4. hot DB / Redis / worker baglantilarini cell'e yonlendir
5. p95 / inflight / lag izleyerek cutover yap
6. rollback ve rebalancing adimini onceden tanimla

## Kabul kriterleri

- bir region icin yazma ve okuma akisi belirli bir cell'e route edilir
- region bazli p95 / inflight / event-loop lag gorunur olur
- control plane cell arizasindan etkilenmez
- yeni region cell eklenince eski region akisi bozulmaz

## Dokunulmayacak alanlar

- mevcut API contract'ini bu turda bozma
- logical region ownership modelini geri alma
- notification / WS event isimlerini degistirme
- tek anda tum ulkeyi fiziksel shard'a cevirme

## Bagli dokumanlar

- [REGION_SHARDING_STATUS_V1](REGION_SHARDING_STATUS_V1.md)
- [REGION_SHARDING_SINGLE_ENTRY_GATE_V1](REGION_SHARDING_SINGLE_ENTRY_GATE_V1.md)
- [CONVERSATION_CLOSURE_INDEX_V1](CONVERSATION_CLOSURE_INDEX_V1.md)
- [TURKIYE_GENELI_OLCEK_PLANI_3500_ARAC](TURKIYE_GENELI_OLCEK_PLANI_3500_ARAC.md)

