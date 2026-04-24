# REGION NEXT PHASE EXECUTION PACK V1

Bu belge, region sharding icin repo-side tamamlanan fiziksel execution paketlerini tek uygulama sirasina baglar.

Tek giris kapisi:
- [TECHNICAL_DECISION_REGION_SHARDING_V1](TECHNICAL_DECISION_REGION_SHARDING_V1.md)
- [REGION_SHARDING_SINGLE_ENTRY_GATE_V1](REGION_SHARDING_SINGLE_ENTRY_GATE_V1.md)
- [REGION_SHARDING_NEXT_PHASE_ROADMAP_V1](REGION_SHARDING_NEXT_PHASE_ROADMAP_V1.md)

## Amac

Fiziksel bölge fazlarini repo'da somut, okunabilir ve run edilebilir paketlere cevirir:

1. fiziksel region cell blueprint
2. buyuk sehir ilce / zone alt-shard
3. archive export / manifest / restore
4. failover / rebalancing drill

## Calisma ilkesi

- once logical ownership bozulmadan fiziksel yerlesim blueprint'i kurulur
- sonra buyuk sehir zone ayrimi netlestirilir
- archive, hot retention'dan koparilip dogrulanir
- en son failover / rebalancing drill dry-run olarak kaydedilir

## Uygulama sirasI

### 1) Fiziksel region cell dagitimi

Oncelik:
- regional API replica
- regional Redis
- regional Postgres hot store
- regional WS relay
- regional worker havuzu
- regional solver / OSRM

Kabul:
- bir region ilgili cell'e route edilir
- region bazli p95 / inflight / lag gorunur
- control plane etkilenmez

Repo durumu:
- blueprint ve region panel gorunurlugu hazir
- control plane / region cell ayrimi tanimli

Bagli doc:
- [REGION_PHYSICAL_CELL_DEPLOYMENT_V1](REGION_PHYSICAL_CELL_DEPLOYMENT_V1.md)

### 2) Buyuk sehir ilce / zone alt-shard

Oncelik:
- Istanbul / Ankara / Izmir / Bursa / Antalya / Kocaeli icin zone map
- room / company / vehicle / shift baglama kurali
- zone degisim kriteri

Kabul:
- tek il icinde birden fazla operasyon parcasi calisir
- aktif vardiyada shard hop olmaz
- panel ve backend ayni zone dilini kullanir

Repo durumu:
- zone ownership ve kapasite gorunurlugu repo'da hazir

Bagli doc:
- [REGION_ZONE_ALT_SHARD_V1](REGION_ZONE_ALT_SHARD_V1.md)

### 3) Archive export / manifest / restore

Oncelik:
- `GpsPoint`, `ApiRequest`, `AuditLog`, `Notification` gecmisi, `CheckinEvent`, `Consent`
- gunluk veya tablo bazli export
- manifest ve checksum
- restore / inspect yolu

Kabul:
- hot delete oncesi export dogrulanir
- manifest hash backup dosyasini teyit eder
- restore kontrolsuz calismaz

Repo durumu:
- backup create/restore scriptleri, manifest endpoint'leri ve admin gorunurlugu hazir

Bagli doc:
- [REGION_ARCHIVE_EXPORT_MANIFEST_RESTORE_V1](REGION_ARCHIVE_EXPORT_MANIFEST_RESTORE_V1.md)

### 4) Failover / rebalancing drill

Oncelik:
- region cell outage senaryosu
- routing map yeniden dagitimi
- worker yeniden sevki
- rollback / rebalancing tatbikati

Kabul:
- drill runbook'u var
- failover denemesi kaydediliyor
- geri alma adimi tekrar edilebilir

Repo durumu:
- dry-run pack, run kaydi ve admin gorunurlugu hazir

Bagli doc:
- [REGION_FAILOVER_REBALANCING_DRILL_V1](REGION_FAILOVER_REBALANCING_DRILL_V1.md)

## Teslim kriteri

Bu pack tamamlandiginda:
- region cell modeli sahaya indirilebilir olur
- buyuk sehir zone ayrimi resmi olur
- archive ve restore kaniti denetlenebilir olur
- failover / rebalancing oyunu tatbik edilmis olur

## Bagli dokumanlar

- [REGION_SHARDING_STATUS_V1](REGION_SHARDING_STATUS_V1.md)
- [REGION_SHARDING_READINESS_CHECKLIST_V1](REGION_SHARDING_READINESS_CHECKLIST_V1.md)
- [REGION_SHARDING_NEXT_PHASE_ROADMAP_V1](REGION_SHARDING_NEXT_PHASE_ROADMAP_V1.md)
- [CONVERSATION_CLOSURE_INDEX_V1](CONVERSATION_CLOSURE_INDEX_V1.md)
