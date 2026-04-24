# REGION SHARDING NEXT PHASE ROADMAP V1

Bu belge, region sharding calismasinda repo-side tamamlanan execution paketlerini ve saha uygulama rotasini toplar.

Tek giris kapisi:
- [TECHNICAL_DECISION_REGION_SHARDING_V1](TECHNICAL_DECISION_REGION_SHARDING_V1.md)
- [REGION_SHARDING_READINESS_CHECKLIST_V1](REGION_SHARDING_READINESS_CHECKLIST_V1.md)
- [REGION_SHARDING_STATUS_V1](REGION_SHARDING_STATUS_V1.md)
- [REGION_NEXT_PHASE_EXECUTION_PACK_V1](REGION_NEXT_PHASE_EXECUTION_PACK_V1.md)

## Amac

Logical region modeli, region ownership ve region-aware read/write gorunurlugu artik repoda yasiyor.  
Bu roadmap, repo tarafinda tamamlanan execution paketleri ile saha uygulama rotasini tek sayfada netlestirir.

## 1) Fiziksel region cell dagitimi

### Hedef

Canli operasyonun tek sicak merkez yerine region cell'lere dagitilmasi.

### Kapsam

- regional API replica plani
- regional Redis ayrimi
- regional Postgres hot store topolojisi
- regional WS relay
- regional worker havuzu
- regional solver / OSRM yerlesimi

### Kabul kriteri

- bir region icin yazma ve okuma akisi belirli bir cell'e route edilir
- region bazli p95 / inflight / lag gozlenir
- failover aninda control plane etkilenmez

### Repo durumu

- physical region cell deployment blueprint repo'da hazir
- control plane / region cell ayrimi tanimli
- admin region paneli blueprint'i goruyor

### Detay doc

- [REGION_PHYSICAL_CELL_DEPLOYMENT_V1](REGION_PHYSICAL_CELL_DEPLOYMENT_V1.md)

## 2) Buyuk sehir ilce / zone alt-shard

### Hedef

Istanbul, Ankara, Izmir, Bursa, Antalya, Kocaeli gibi agir sehirleri zone bazinda daha ince parcaya ayirmak.

### Repo durumu

- district / zone ownership ve capacity gorunurlugu repo'da hazir
- helper ve panel etiketleri zone dilini tasiyor
- operasyonel alt-shard cutover saha / deploy karari

### Kapsam

- il -> zone map
- room / company / vehicle / shift baglama kurali
- zone degisim kriterleri
- zone bazli kapasite planlamasi

### Kabul kriteri

- tek il icinde birden fazla operasyon parcasi calisabilir
- aktif vardiya ortasinda shard hop yok
- zone bazli read/write dili region modeline uyumlu

### Detay doc

- [REGION_ZONE_ALT_SHARD_V1](REGION_ZONE_ALT_SHARD_V1.md)

## 3) Archive export / manifest / restore

### Hedef

Telemetry, log ve denetim verisini hot operasyon hattindan cikarmak; ama kanit ve inceleme izini kaybetmemek.

### Repo durumu

- archive policy ve backup manifest endpoint'leri hazir
- create / restore host scripts hazir
- admin create / restore endpoint'leri hazir
- hot delete ile archive snapshot ayrimi repo'da okunur durumda

### Kapsam

- `GpsPoint`, `ApiRequest`, `AuditLog`, `Notification` gecmisi, `CheckinEvent`, `Consent` icin export sinifi
- gunluk / tablo bazli export
- manifest ve checksum
- restore ve inceleme yolu

### Kabul kriteri

- hot retention tamamlanmadan once export dogrulaniyor
- archive dosyasi manifest ile teyit ediliyor
- gerekirse staging/inspect restore calisiyor

### Detay doc

- [REGION_ARCHIVE_EXPORT_MANIFEST_RESTORE_V1](REGION_ARCHIVE_EXPORT_MANIFEST_RESTORE_V1.md)

## 4) Failover / rebalancing drill

### Hedef

Region cell kaybi veya overload durumunda sistemin nasil davranacagini tatbik etmek.

### Kapsam

- region cell outage senaryosu
- routing map yeniden dagitimi
- worker yeniden sevki
- geri alma / rebalancing tatbikati

### Kabul kriteri

- drill runbook'u var
- failover denemesi kaydediliyor
- geri alma adimi acik ve tekrar edilebilir

### Repo durumu

- failover / rebalancing drill pack repo'da hazir
- dry-run kaydi ve admin gorunurlugu var
- saha tatbikati artik bu paketten yürütülebilir

### Detay doc

- [REGION_FAILOVER_REBALANCING_DRILL_V1](REGION_FAILOVER_REBALANCING_DRILL_V1.md)

## 5) Kapasite notu

Tekil infra referansi:
- `3000` arac: stabil operasyon tavanina yakin
- `3500` arac: stress / ceiling band

Bu sayilar fiziksel rollout icin referans kapasitesidir; tek basina ulke geneli dogrudan lineer cogaltma anlamina gelmez.

## 6) Repo kapanis notu

Bu roadmap'teki fiziksel rollout icin repo-side kalan acik artik yoktur.  
Geriye kalan is, deploy ve tatbikatin saha ortaminda uygulanmasidir.

## Bagli dokumanlar

- [TURKIYE_GENELI_OLCEK_PLANI_3500_ARAC](TURKIYE_GENELI_OLCEK_PLANI_3500_ARAC.md)
- [RUNBOOK_M45_RETENTION_BACKUP](RUNBOOK_M45_RETENTION_BACKUP.md)
- [KVKK_RETENTION_ENFORCEMENT_V1](KVKK_RETENTION_ENFORCEMENT_V1.md)
- [KVKK_RETENTION_ANONIMLESTIRME_V1](KVKK_RETENTION_ANONIMLESTIRME_V1.md)
