# REGION FIELD ROLLOUT RUNBOOK V1

Bu runbook, region sharding hazirligini saha / altyapi ortaminda pilot rollout'a cevirmek icin kullanilir.

Tek giris kapisi:
- [TECHNICAL_DECISION_REGION_SHARDING_V1](TECHNICAL_DECISION_REGION_SHARDING_V1.md)
- [REGION_SHARDING_SINGLE_ENTRY_GATE_V1](REGION_SHARDING_SINGLE_ENTRY_GATE_V1.md)
- [REGION_SHARDING_STATUS_V1](REGION_SHARDING_STATUS_V1.md)
- [REGION_NEXT_PHASE_EXECUTION_PACK_V1](REGION_NEXT_PHASE_EXECUTION_PACK_V1.md)

## Amac

Repo-side tamamlanan region hazirligini:

1. pilot bir region cell uzerinde denemek
2. zone / archive / failover akislarini saha ortaminda calistirmak
3. control plane ile region cell ayrimini bozmadan go-live karari vermek

## Rollout oncesi kontrol listesi

- [ ] super-admin region paneli blueprint ve drill pack goruyor
- [ ] region capacity snapshot guncel
- [ ] archive create / restore host scriptleri calisiyor
- [ ] same-region write guard aktif
- [ ] company kendi ilindeki room'larla sinirli
- [ ] rotation / ownership helper'lari calisiyor
- [ ] staging ortaminda dry-run failover kaydi alinabiliyor
- [ ] 3000 stabil / 3500 stress kapasite referansi kabul edildi

## Pilot rollout akisi

### 1) Pilot region secimi

Secim kriterleri:
- yeterli company / room / vehicle hacmi
- zone dagilimi anlamli
- saha ekibi tarafindan izlenebilir

Girdi:
- region capacity snapshot
- region next-phase execution pack
- physical region cell blueprint

### 2) Physical cell yerlesimi

Yerlesim:
- regional API replica
- regional Redis
- regional Postgres hot store
- regional WS relay
- regional worker / solver / OSRM

Kabul:
- region bazli trafik belirlenen cell'e route edilir
- control plane ayri kalir

### 3) Zone alt-shard aktivasyonu

Kapsam:
- buyuk sehirlerde zone ayrimi
- room / company / vehicle / shift baglama kurali

Kabul:
- aktif vardiya ortasinda shard hop olmaz
- panel ve backend ayni zone dilini kullanir

### 4) Archive / restore tatbikati

Kapsam:
- `GpsPoint`, `ApiRequest`, `AuditLog`, `Notification`, `CheckinEvent`, `Consent`
- backup create / manifest dogrulama
- restore / inspect dry-run

Kabul:
- hot retention tamamlanmadan once archive dogrulanir
- manifest hash backup ile uyumludur

### 5) Failover / rebalancing drill

Kapsam:
- cell outage dry-run
- routing map sevki
- worker yeniden dagitimi
- rollback notu

Kabul:
- drill runbook'a kayit edilir
- geri alma yolu tekrar edilebilir

## Go / No-Go karari

Go icin:
- blueprint, archive, drill ve zone hazirliklari tamam
- region bazli p95 / inflight / lag stabil
- saha ekipleri dry-run sonucunu onayladi

No-Go icin:
- control plane etkileniyorsa
- region write guard bozuluyorsa
- archive veya restore dogrulandiysa
- failover drill kaydi eksikse

## Kabul artefaktlari

- region panel screenshot
- blueprint output
- dry-run failover kaydi
- backup manifest
- archive / restore sonucu
- pilot karar notu

## Bagli dokumanlar

- [REGION_PHYSICAL_CELL_DEPLOYMENT_V1](REGION_PHYSICAL_CELL_DEPLOYMENT_V1.md)
- [REGION_ZONE_ALT_SHARD_V1](REGION_ZONE_ALT_SHARD_V1.md)
- [REGION_ARCHIVE_EXPORT_MANIFEST_RESTORE_V1](REGION_ARCHIVE_EXPORT_MANIFEST_RESTORE_V1.md)
- [REGION_FAILOVER_REBALANCING_DRILL_V1](REGION_FAILOVER_REBALANCING_DRILL_V1.md)
