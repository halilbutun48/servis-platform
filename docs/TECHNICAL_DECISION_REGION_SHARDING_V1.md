# TECHNICAL_DECISION_REGION_SHARDING_V1

## Amaç
Türkiye geneli büyümede, canlı operasyon yükünü tek bir sıcak veri hattında toplamayarak sistemi bölgesel olarak ölçekleyebilmek.

## Kısa karar
Vardis için hedef ölçekleme modeli:

- il bazlı **mantıksal shard**
- büyükşehirlerde **ilçe / zone alt-shard**
- canlı operasyonun **bölgesel hücrelerde** çalışması
- auth, üst yönetim ve merkezi politika yüzeylerinin **merkezi control plane** içinde kalması
- telemetry / log / archive verisinin **ayrı archive omurgasında** tutulması

Tekil region cell icin planlama bandi:
- `3000` arac civari: stabil operasyon tavani
- `3500` arac: stress / üst sinir referansi

## Neden bu karar alındı
Mevcut benchmark ve soak sonuçları şunu gösterdi:

- sistem belli bir noktadan sonra sadece araç sayısına değil, **arrival rate / saturation** sınırına çarpıyor
- request-path hafifletme ve queue/worker split ile ciddi iyileşme sağlandı
- fakat ülke geneli ve çok yüksek araç sayıları için tek sıcak Postgres hattına dayanmak uzun vadede doğru değil
- özellikle canlı GPS, vardiya ilerleme, notification üretimi ve telemetry/log verisi aynı ölçekleme stratejisiyle yönetilmemeli

Bu nedenle doğru yön:
- stateless katmanları çoğaltmak
- stateful sıcak veriyi bölgeselleştirmek
- history / telemetry / archive yükünü sıcak operasyon hattından ayırmak

## Kapsam
Bu karar notu aşağıdaki alanları kapsar:

- bölgesel canlı operasyon mimarisi
- serviceRegionId tabanlı mantıksal shard yaklaşımı
- büyükşehir alt-zone modeli
- hot operational data ile telemetry/archive ayrımı
- control plane ve region cell sorumluluk sınırı

## Kapsam dışı
Bu not aşağıdakileri doğrudan uygulamaz:

- hemen fiziksel shard migration
- mevcut API contract’larının bu turda değiştirilmesi
- kullanıcı rol modeli veya scope modelinin bölgeye göre yeniden yazılması
- anlık cluster topolojisi commit’i
- push notification altyapısı

## Temel prensip
Tek cümleyle:

**Stateless olanı çoğalt, stateful sıcak veriyi böl, history verisini archive’a ayır.**

## Mimari model

### 1. Control Plane
Merkezi ve görece hafif yüzeyler burada kalır:

- auth / login / rol / tenant yönetimi
- kurum / okul / firma / oda ana kayıtları
- policy / feature flag / global config
- region routing map
- merkezi raporlama özeti
- üst yönetim / sözleşme / finansın global katmanı

### 2. Region Cell
Canlı operasyonu taşıyan bölgesel hücre:

- regional API
- regional Redis
- regional Postgres hot operational store
- regional WS relay
- regional worker’lar
- regional OSRM
- regional solver

## Bölgeleme modeli

### Ana anahtar
`serviceRegionId`

### Kural
- küçük ve orta iller: tek region
- büyük şehirler: birden fazla zone

### Örnek
- Denizli -> `DEN-1`
- Uşak -> `USA-1`
- Ankara -> `ANK-1`, `ANK-2`
- İzmir -> `IZM-1`, `IZM-2`
- İstanbul -> `IST-1`, `IST-2`, `IST-3`, `IST-4` ...

## Önemli not
Buradaki yapı **mantıksal shard** yapısıdır. Bu karar:
- 81 fiziksel DB kurulsun anlamına gelmez
- önce routing ve veri sahipliği mantığı kurulsun
- fiziksel cluster dağılımı yük büyüdükçe evrilsin demektir

## Veri sınıfları

### A. Hot operational data
Bölgesel sıcak veri olarak tutulur:

- aktif shift
- aktif stop
- `GpsLast`
- `ShiftProgress`
- `VehicleGpsState`
- aktif assignment / canlı rota durumu

Bu veri:
- sık yazılır
- sık okunur
- düşük gecikme ister
- bölgesel hücre içinde yaşamalıdır

### B. Telemetry / log / archive data
Ayrı lifecycle ile ele alınır:

- `GpsPoint`
- `ApiRequest`
- `AuditLog`
- `Notification` geçmişi
- `CheckinEvent`
- `Consent` retain-proof / archive yüzeyi

Bu veri sıcak operasyon verisiyle aynı ölçekleme hattında taşınmamalıdır.

## Araç ve vardiya sahipliği
Her aracın ve aktif vardiyanın bir home region’ı olmalıdır.

Örnek mantık:
- `vehicleId -> homeRegionId`
- `shiftId -> regionId`

### Kural
- GPS event’leri daima ilgili home region / shift region’a akar
- araç hareket ettikçe anlık shard değiştirilmez
- shard / region değişimi sadece doğal kırılma anlarında yapılır

### Doğal kırılma anları
- yeni vardiya
- kurum veya operasyon bölgesi değişimi
- yönetimsel rebalancing
- kalıcı rota / hizmet alanı değişimi

## Ölçekleme prensipleri

### API
- stateless olduğu için yatay çoğaltılır

### Redis
- throttle, queue, dedupe, cache yükü için bölgesel ve zamanla clustered yapı düşünülür

### Solver
- worker pool mantığında çoğaltılır

### OSRM
- bölgesel erişim / replica mantığında ölçeklenir

### DB
- ana ölçekleme kararı buradadır
- sıcak operasyon verisi bölgeselleşir
- telemetry/history archive ile ayrılır
- tek sıcak merkez DB’ye sonsuz büyüme varsayılmaz

## Mevcut repo ile uyum
Bu karar, mevcut repo çizgisiyle uyumludur:

- backend stateless tasarım hedefi korunur
- queue/worker split yaklaşımı güçlenir
- live operational state ile history/archive ayrımı korunur
- KVKK / retention sınıflarıyla çelişmez
- mevcut role/scope yapısı bozulmadan arkada bölgesel routing katmanı eklenebilir

## Repo'da bugun uygulananlar

- region ownership helper, routing key ve same-region guard backend'e yerlestirildi
- super-admin region paneli kapasite snapshot'i gosteriyor
- super-admin user paneli il / zone bilgisiyle region hizasi veriyor
- room / company / parent / notification / shift / driver / vehicle read surfaces region etiketi tasiyor
- route preview, reassign ve operation modallari region etiketini tasiyor
- GPS ingest ve auto-reached worker region context tasiyor
- company kendi ilindeki room'larla sinirli
- company shift create / batch akisi same-region guard ile kapali
- per-region capacity dashboard super-admin panelde gorunur

## Uygulama sırası

### Faz 1 — Karar ve isimlendirme
- `serviceRegionId` kavramını resmi hale getir
- region / zone isimlendirme standardını sabitle
- hazirlik checklisti: [REGION_SHARDING_READINESS_CHECKLIST_V1](REGION_SHARDING_READINESS_CHECKLIST_V1.md)
- backend task paketi: [BACKEND_REGION_OWNERSHIP_AND_ROUTING_TASKS_V1](BACKEND_REGION_OWNERSHIP_AND_ROUTING_TASKS_V1.md)
- next phase roadmap: [REGION_SHARDING_NEXT_PHASE_ROADMAP_V1](REGION_SHARDING_NEXT_PHASE_ROADMAP_V1.md)

### Faz 2 — Routing hazırlığı
- araç, shift, kurum için region bağlama kuralları netleşsin
- region routing map tanımlansın

### Faz 3 — Region-aware servisleşme
- GPS ingest
- canlı panel read yüzeyleri
- WS relay
- auto-reached / notification worker akışı
region-aware hale gelsin

### Faz 4 — Büyükşehir alt-zone
- İstanbul, Ankara, İzmir, Bursa, Antalya, Kocaeli gibi yerlerde alt bölgeleme açılsın

### Faz 5 — Archive / analytics ayrımı
- history / telemetry / denetimsel veri sıcak operasyon hattından ayrıştırılsın

## Hazırlık checklisti ile bağ

Karar notu teorik çerçeveyi verir.  
Operasyonel olarak ilerlemek için [REGION_SHARDING_READINESS_CHECKLIST_V1](REGION_SHARDING_READINESS_CHECKLIST_V1.md) ve [BACKEND_REGION_OWNERSHIP_AND_ROUTING_TASKS_V1](BACKEND_REGION_OWNERSHIP_AND_ROUTING_TASKS_V1.md) kullanılır.
Repo-side execution paketleri icin [REGION_SHARDING_NEXT_PHASE_ROADMAP_V1](REGION_SHARDING_NEXT_PHASE_ROADMAP_V1.md) kullanilir.

Detay execution docs:
- [REGION_NEXT_PHASE_EXECUTION_PACK_V1](REGION_NEXT_PHASE_EXECUTION_PACK_V1.md)
- [REGION_PHYSICAL_CELL_DEPLOYMENT_V1](REGION_PHYSICAL_CELL_DEPLOYMENT_V1.md)
- [REGION_ZONE_ALT_SHARD_V1](REGION_ZONE_ALT_SHARD_V1.md)
- [REGION_ARCHIVE_EXPORT_MANIFEST_RESTORE_V1](REGION_ARCHIVE_EXPORT_MANIFEST_RESTORE_V1.md)
- [REGION_FAILOVER_REBALANCING_DRILL_V1](REGION_FAILOVER_REBALANCING_DRILL_V1.md)

Tek giris kapisi olarak [REGION_SHARDING_SINGLE_ENTRY_GATE_V1](REGION_SHARDING_SINGLE_ENTRY_GATE_V1.md) kullan.

## Riskler
Bu karar uygulanırken özellikle şunlara dikkat edilir:

- region mantığı yetki modeliyle karıştırılmamalı
- canlı shard hop’laması yapılmamalı
- sıcak veri ile archive veri aynı tabloda büyütülmemeli
- büyükşehir alt-zone kararı erken ve gereksiz karmaşıklaştırılmamalı
- fiziksel cluster planı, mantıksal region kararından önce zorlanmamalı

## Başarı ölçütü
Bu karar doğru uygulanmış sayılırsa:

- canlı operasyon yükü tek sıcak veri hattında boğulmaz
- API replica sayısı arttığında sistem gerçekten ölçek alır
- telemetry/history büyümesi canlı operasyon performansını bozmaz
- region bazlı kapasite ve rollout yönetimi mümkün olur
- büyükşehirler kontrollü biçimde alt-zone’lara ayrılabilir

## Net sonuç
Vardis için Türkiye geneli hedef mimari:

**İl bazlı mantıksal shard, büyükşehirlerde zone alt-shard, canlı operasyon bölgesel hücrelerde, merkezi auth/yönetim ayrı, telemetry ve history archive omurgasında.**
