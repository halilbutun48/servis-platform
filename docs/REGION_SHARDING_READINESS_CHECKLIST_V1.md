# REGION SHARDING READINESS CHECKLIST V1

Bu belge, `TECHNICAL_DECISION_REGION_SHARDING_V1` kararini repo icinde uygulanabilir bir hazirlik listesine cevirir.

Tek giris kapisi icin [REGION_SHARDING_SINGLE_ENTRY_GATE_V1](REGION_SHARDING_SINGLE_ENTRY_GATE_V1.md) belgesini kullan.
Repo-side execution paketleri icin [REGION_SHARDING_NEXT_PHASE_ROADMAP_V1](REGION_SHARDING_NEXT_PHASE_ROADMAP_V1.md) belgesini kullan.

Detay execution docs:
- [REGION_NEXT_PHASE_EXECUTION_PACK_V1](REGION_NEXT_PHASE_EXECUTION_PACK_V1.md)
- [REGION_PHYSICAL_CELL_DEPLOYMENT_V1](REGION_PHYSICAL_CELL_DEPLOYMENT_V1.md)
- [REGION_ZONE_ALT_SHARD_V1](REGION_ZONE_ALT_SHARD_V1.md)
- [REGION_ARCHIVE_EXPORT_MANIFEST_RESTORE_V1](REGION_ARCHIVE_EXPORT_MANIFEST_RESTORE_V1.md)
- [REGION_FAILOVER_REBALANCING_DRILL_V1](REGION_FAILOVER_REBALANCING_DRILL_V1.md)
- [REGION_FIELD_ROLLOUT_RUNBOOK_V1](REGION_FIELD_ROLLOUT_RUNBOOK_V1.md)

## Amac

Turkiye geneli buyumede, il / ilce / zone bazli mantiksal shard modeline gecmeden once repoyu, veri sahipligini ve operasyon akisini hazırlamak.

## Referans kapasite

Tekil infra benchmark referansi:
- stabil bant: `2000-3000` arac
- stabil tavan: `3000` arac
- sari / stress bant: `3000-3500` arac
- ceiling band: `3500` arac

Bu sayilar tek bir region cell icin rehber kabul edilir; ulke geneline dogrudan lineer cogaltma anlamina gelmez.

## Bu turda uygulananlar

- region ownership helper backend'e yerlestirildi
- company shift create / batch akisi same-region guard ile yaziliyor
- super-admin region paneli kapasite snapshot'i goruyor
- room / parent / notification / shift read surfaces region etiketini tasiyor
- company kendi ilindeki room'larla sinirlandi
- region routing enforcement artik kritik write yolunda aktif
- physical region cell blueprint ve drill pack repo'ya yerlestirildi

## 1) Region contract

- [x] `Region` modeli tek resmi kaynak olarak kullaniliyor
- [x] `serviceRegionId` veya esit anlamli region anahtari resmi olarak tanimli
- [x] il / ilce / zone isimlendirme standardi yazili
- [x] buyuk sehir alt-zone kurali dokumante
- [x] control plane ile region cell ayrimi net

## 2) Ownership map

- [x] `vehicle -> homeRegionId`
- [x] `shift -> regionId`
- [x] `company -> default region / org region`
- [x] `room -> region / zone`
- [x] aktif vardiya sirasinda shard hop yapilmiyor
- [x] rebalancing sadece dogal kirilma anlarinda yapiliyor

## 3) Routing readiness

- [x] GPS ingest region-aware
- [x] auto-reached / route-progress isleme region-aware
- [x] WS relay region-local calisiyor
- [x] panel read yuzeyleri region-local veriyi okuyor
- [x] solver / OSRM region bazli calisabiliyor
- [x] merkezi raporlama control plane tarafinda kalabiliyor

## 4) Hot vs archive ayrimi

- [x] `GpsPoint` hot operasyon hattindan ayriliyor
- [x] `ApiRequest` ile `AuditLog` retention sinifi net
- [x] `Notification` gecmisi ayrik lifecycle ile ele aliniyor
- [x] `CheckinEvent` ve `Consent` archive / retain-proof sinifinda
- [x] telemetry ve history hot operasyon verisiyle ayni hot tabloda buyumuyor

## 5) Operasyonel guvenlik

- [x] region degisimi aktif vardiya ortasinda yapilmiyor
- [x] yeni region atamasi icin net manuel / otomatik kural var
- [x] geri alma yolu tanimli
- [x] region cell arizasi durumunda control plane etkilenmeden kalabiliyor
- [x] canli operasyon ile archive okuma ayrik

## 6) Go-live gozlemleri

- [x] region bazli p95 latency izleniyor
- [x] region bazli inflight / queue depth izleniyor
- [x] DB / Redis / event-loop lag region bazli gorunur
- [x] aktif WS baglanti sayisi region bazli gorunur
- [x] notification yazim hizi region bazli gorunur
- [x] per-region capacity dashboard var
- [x] hot shard tavanina ulasinca ne yapilacagi belli

## 7) Benchmark kabul kriteri

- [x] 2000 arac panelsiz ve staggered akista stabil
- [x] 3000 arac stabil tavan olarak kabul ediliyor
- [x] 3500 arac stress / ceiling band olarak kabul ediliyor
- [x] 3750+ icin ayrik kapasite / shard karari gerekiyor

## 8) Sonraki uygulama sirasi

1. region naming / contract zaten repo'da kullaniliyor
2. ownership map zaten repo'da kullaniliyor
3. routing map zaten repo'da kullaniliyor
4. region-aware GPS / panel / worker akisi zaten repo'da kullaniliyor
5. archive ayrimi zaten repo'da kullaniliyor
6. physical region cell / archive export / failover execution pack saha operasyonunda uygulanir

## Not

Bu checklist repo-side region hazirligini kapatir.  
Fiziksel cluster topolojisi ve failover saha operasyonu artik ayrik deploy/runbook konusudur.
