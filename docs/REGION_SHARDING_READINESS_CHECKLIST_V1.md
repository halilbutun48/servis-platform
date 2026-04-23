# REGION SHARDING READINESS CHECKLIST V1

Bu belge, `TECHNICAL_DECISION_REGION_SHARDING_V1` kararini repo icinde uygulanabilir bir hazirlik listesine cevirir.

## Amac

Turkiye geneli buyumede, il / ilce / zone bazli mantiksal shard modeline gecmeden once repoyu, veri sahipligini ve operasyon akisini hazırlamak.

## Referans kapasite

Tekil infra benchmark referansi:
- stabil bant: `2000-3000` arac
- sari bant: `3000-3500` arac
- ceiling band: `3500` arac

Bu sayilar tek bir region cell icin rehber kabul edilir; ulke geneline dogrudan lineer cogaltma anlamina gelmez.

## 1) Region contract

- [ ] `Region` modeli tek resmi kaynak olarak kullaniliyor
- [ ] `serviceRegionId` veya esit anlamli region anahtari resmi olarak tanimli
- [ ] il / ilce / zone isimlendirme standardi yazili
- [ ] buyuk sehir alt-zone kurali dokumante
- [ ] control plane ile region cell ayrimi net

## 2) Ownership map

- [ ] `vehicle -> homeRegionId`
- [ ] `shift -> regionId`
- [ ] `company -> default region / org region`
- [ ] `room -> region / zone`
- [ ] aktif vardiya sirasinda shard hop yapilmiyor
- [ ] rebalancing sadece dogal kirilma anlarinda yapiliyor

## 3) Routing readiness

- [ ] GPS ingest region-aware
- [ ] auto-reached / route-progress isleme region-aware
- [ ] WS relay region-local calisiyor
- [ ] panel read yuzeyleri region-local veriyi okuyor
- [ ] solver / OSRM region bazli calisabiliyor
- [ ] merkezi raporlama control plane tarafinda kalabiliyor

## 4) Hot vs archive ayrimi

- [ ] `GpsPoint` hot operasyon hattindan ayriliyor
- [ ] `ApiRequest` ile `AuditLog` retention sinifi net
- [ ] `Notification` gecmisi ayrik lifecycle ile ele aliniyor
- [ ] `CheckinEvent` ve `Consent` archive / retain-proof sinifinda
- [ ] telemetry ve history hot operasyon verisiyle ayni hot tabloda buyumuyor

## 5) Operasyonel guvenlik

- [ ] region degisimi aktif vardiya ortasinda yapilmiyor
- [ ] yeni region atamasi icin net manuel / otomatik kural var
- [ ] geri alma yolu tanimli
- [ ] region cell arizasi durumunda control plane etkilenmeden kalabiliyor
- [ ] canli operasyon ile archive okuma ayrik

## 6) Go-live gozlemleri

- [ ] region bazli p95 latency izleniyor
- [ ] region bazli inflight / queue depth izleniyor
- [ ] DB / Redis / event-loop lag region bazli gorunur
- [ ] aktif WS baglanti sayisi region bazli gorunur
- [ ] notification yazim hizi region bazli gorunur
- [ ] hot shard tavanina ulasinca ne yapilacagi belli

## 7) Benchmark kabul kriteri

- [ ] 2000 arac panelsiz ve staggered akista stabil
- [ ] 3000 arac stabil bantta
- [ ] 3500 arac ceiling band olarak kabul ediliyor
- [ ] 3750+ icin ayrik kapasite / shard karari gerekiyor

## 8) Sonraki uygulama sirasi

1. region naming / contract
2. ownership map
3. routing map
4. region-aware GPS / panel / worker akisi
5. archive ayrimi
6. per-region capacity dashboard

## Not

Bu checklist fiziksel shard migration'i zorlamaz.  
Once mantiksal region sahipligi ve routing kurali kurulur; fiziksel cluster topolojisi sonra evrilir.
