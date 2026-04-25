# REGION FAILOVER REBALANCING DRILL V1

Bu belge, region cell outage veya overload durumunda sistemin nasil davranacagini tatbik eden drill runbook'udur.

Tek giris kapisi:
- [TECHNICAL_DECISION_REGION_SHARDING_V1](TECHNICAL_DECISION_REGION_SHARDING_V1.md)
- [REGION_SHARDING_READINESS_CHECKLIST_V1](REGION_SHARDING_READINESS_CHECKLIST_V1.md)
- [REGION_SHARDING_NEXT_PHASE_ROADMAP_V1](REGION_SHARDING_NEXT_PHASE_ROADMAP_V1.md)

## Amac

Fiziksel region cell kaybi, Redis / DB / worker baglantisi bozulmasi veya regional overload aninda:

- kontrol ucunun ayakta kalmasi
- router'in degismesi
- region bazli servislerin tekrar dagitilmasi
- rollback / rebalancing adiminin kayit altina alinmasi

## Tatbikat senaryolari

### 1. Cell outage

- bir region cell durur
- routing map komsu veya yedek cell'e kayar
- write path ve read path gozlenir

### 2. Overload

- bir region cell'in p95 / inflight degerleri yukselir
- kapasite dashboard alarm verir
- ilgili region'da is yuk redistribution tetiklenir

### 3. Rebalance

- bir region'dan digerine kontrollu cikis yapilir
- zone / region tekrar dagitimi kayda alin
- vardiya ortasi hop yapilmadigi dogrulanir

## Izlenecek sinyaller

- `/health` event-loop lag
- DB latency
- inflight ve concurrency
- region bazli p95
- region capacity snapshot
- notification ve worker dagilimi
- WS baglanti yogunlugu

## Drill adimlari

1. drill hedef region'u sec
2. mevcut kapasite snapshot'ini al
3. trafik akisini observe et
4. failover / reroute adimini uygula
5. kalan isteklere ait p95 / error / throttle sayilarini izle
6. geri alma adimini kaydet
7. drill sonucunu runbook'a ekle

## Kabul kriterleri

- kontrol plane dusemez
- failover denemesi tekrar edilebilir olur
- rebalancing sonucu region bazli metrikler okunur kalir
- rollback yolu yazili ve calisabilir olur

## Dokunulmayacak alanlar

- tek seferlik manuel kurtarma ile yetinme
- region cell kavramini yetki modeliyle karistirma
- failover'i API contract degistirerek yapma

## Bagli dokumanlar

- [REGION_SHARDING_STATUS_V1](REGION_SHARDING_STATUS_V1.md)
- [REGION_PHYSICAL_CELL_DEPLOYMENT_V1](REGION_PHYSICAL_CELL_DEPLOYMENT_V1.md)
- [REGION_SHARDING_NEXT_PHASE_ROADMAP_V1](REGION_SHARDING_NEXT_PHASE_ROADMAP_V1.md)
- [REGION_FIELD_ROLLOUT_RUNBOOK_V1](REGION_FIELD_ROLLOUT_RUNBOOK_V1.md)
