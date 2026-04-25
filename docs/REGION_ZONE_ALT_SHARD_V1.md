# REGION ZONE ALT SHARD V1

Bu belge, buyuk sehirler icin il bazli logical shard uzerine zone / ilce alt-shard ekleme kuralini tanimlar.

Tek giris kapisi:
- [TECHNICAL_DECISION_REGION_SHARDING_V1](TECHNICAL_DECISION_REGION_SHARDING_V1.md)
- [REGION_SHARDING_READINESS_CHECKLIST_V1](REGION_SHARDING_READINESS_CHECKLIST_V1.md)
- [REGION_SHARDING_NEXT_PHASE_ROADMAP_V1](REGION_SHARDING_NEXT_PHASE_ROADMAP_V1.md)

## Neden gerekli?

Il bazli shard kucuk ve orta iller icin yeterlidir.  
Istanbul, Ankara, Izmir, Bursa, Antalya, Kocaeli gibi agir merkezlerde ise tek il icinde birden fazla operasyon parcasi olusur. Bu yuzden ikinci katman olarak zone / ilce ayrimi gerekir.

## Repo'daki mevcut zemin

- `backend/prisma/schema.prisma` icinde `Region` modeli var
- `Company.regionId` ve `Company.district` var
- `Room.regionId` ve `Room.district` var
- super-admin `RegionsPanel` il / ilce / zone ve kapasite gorunurlugu veriyor
- room / company / user / shift / notification read surfaces region dilini tasiyor

## Zone tanimi

Zone, il icindeki operasyon alt parcasi olarak okunur.  
Repo'da bu alanin mevcut tasinma noktasi `district` ve region ownership etiketidir.

### Ornek

- Istanbul -> `IST-1`, `IST-2`, `IST-3`, `IST-4`
- Ankara -> `ANK-1`, `ANK-2`
- Izmir -> `IZM-1`, `IZM-2`
- kucuk iller -> tek zone

## Alt-shard kurallari

- aktif vardiya ortasinda zone hop yapilmaz
- zone degisimi sadece dogal kirilma anlarinda olur
- room / company / vehicle / shift baglami zone ile birlikte tasinir
- region ownership ile zone ownership ayni anda gorunur

## Uygulama modeli

### 1. Label

- `regionKey` il seviyesini temsil eder
- `zoneKey` ilici operasyon parcasi icin ek label olur
- panel ve modal'lar region + zone etiketini birlikte gosterebilir

### 2. Routing

- GPS ve worker akisi her zaman home region üzerinden ilerler
- buyuk sehirlerde aynı region icindeki zone secimi ayrik tutulur
- routing map once logical kalir, fiziksel ayrisma sonra gelir

### 3. Operasyon

- dispatch / reassign / preview ekranlari zone etiketini gosterebilir
- super-admin capacity paneli zone bazli sayilari okuyabilir
- zone degisimi oncesi rebalancing kaydi tutulur

## Kabul kriterleri

- buyuk sehir birden fazla zone ile calisabilir
- kucuk iller tek zone ile calismaya devam eder
- zone degisimi vardiya ortasinda otomatik olmaz
- panel ve backend ayni zone dilini kullanir

## Dokunulmayacak alanlar

- mevcut il bazli region modelini bozma
- new city/zone policy icin eski room/company scope'u kirma
- anlik shard hop uretme

## Bagli dokumanlar

- [REGION_SHARDING_STATUS_V1](REGION_SHARDING_STATUS_V1.md)
- [REGION_PHYSICAL_CELL_DEPLOYMENT_V1](REGION_PHYSICAL_CELL_DEPLOYMENT_V1.md)
- [REGION_SHARDING_NEXT_PHASE_ROADMAP_V1](REGION_SHARDING_NEXT_PHASE_ROADMAP_V1.md)
- [REGION_FIELD_ROLLOUT_RUNBOOK_V1](REGION_FIELD_ROLLOUT_RUNBOOK_V1.md)
