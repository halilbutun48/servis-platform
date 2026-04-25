# REGION SHARDING STATUS V1

Bu not, `TECHNICAL_DECISION_REGION_SHARDING_V1` ve `REGION_SHARDING_READINESS_CHECKLIST_V1` dokumanlarinin kisa durum ozeti olarak kullanilir.

Tek giris kapisi: [REGION_SHARDING_SINGLE_ENTRY_GATE_V1](REGION_SHARDING_SINGLE_ENTRY_GATE_V1.md)

## Kisa hukum

**Logical region hazirlik ve repo-side fiziksel execution paketleri tamamlandi.  
Turkiye geneli saha rollout'u artik altyapi operasyonu olarak ayrik takip edilir.**

Tek bir region cell icin referans kapasite:
- stabil bant: `2000-3000` arac
- stabil tavan: `3000` arac
- sari / stress bant: `3000-3500` arac
- ceiling band: `3500` arac

Bu referans, tek bir sicak cellde calisan operasyon icin gecerlidir. Ulke geneli icin mantiksal shard + zone + region cell modeli gerekir.

## Hazir olanlar

| Alan | Durum | Not |
| --- | --- | --- |
| Region contract | Hazir | `Region` modeli ve `serviceRegionId` mantigi dokumante edildi. |
| Super-admin bolge yonetimi | Hazir | RegionsPanel ve UsersPanel il / ilce / zone / kapasite gorunurlugu veriyor. |
| Region ownership | Hazir | Company, room, user, driver, vehicle ve room-shift yuzeylerinde region sahibi gorunur oldu. |
| Company room scope | Hazir | Company kendi ilindeki room'larla sinirli; cross-region room secimi backend'de engelleniyor. |
| Region-aware read surfaces | Hazir | Room, super-admin, parent, personel ve notification read surface yuzeylerinde bolge dili oturdu. |
| GPS / worker region baglami | Hazir | GPS ingest, auto-reached worker ve route-progress payload'lari region context tasiyor. |
| Region routing enforcement | Hazir | Company shift create/batch same-region guard ile yaziliyor. |
| Fiziksel region cell dagitimi | Hazir | Blueprint, control-plane ve drill pack repo'da hazir. |
| Retention / archive karari | Hazir | 2 yil saklama ve archive ayirimi icin karar ve runbook omurgasi var. |
| Per-region capacity dashboard | Hazir | Super-admin region paneli kapasite sayilarini gosteriyor. |
| Benchmark referansi | Hazir | 3000 arac stabil tavan, 3500 arac stress referansi olarak kayda alindi. |
| Buyuk sehir zone alt-shard | Hazir | district/zone alanlari, zone sayilari ve zone routing helper'lari repo'da hazır. |
| Archive export / restore | Hazir | backup create/restore scriptleri, admin endpoint'leri ve manifest akisi hazır. |
| Failover / rebalancing drill | Hazir | Dry-run pack, run kaydi ve panel gorunurlugu repo'da hazir. |

## Gerceklesen yuzeyler

### Backend
- region ownership helper ve same-region guard
- company shift create / batch region write guard
- GPS ingest region context
- auto-reached worker region context
- region capacity snapshot endpoint
- region-aware company / room / notification / parent / shift / driver / vehicle / offer surfaces

### Super-admin
- RegionsPanel: il, zone ve kapasite gorunurlugu
- UsersPanel: kullanici / company / room region hizasi

### Room
- shifts, drivers, vehicles ve route preview yuzeylerinde region etiketi
- reassign ve operation modallerinde region etiketi
- room shift / vehicle / driver listelerinde region ownership

### Parent / Personel / Notification
- parent canlı takip ozeti
- personel MyRide ozeti
- notification listesi ve detay gorunurlugu

## Kayda gecen uygulamalar

- `backend/src/region/ownership.js` region ownership helper, routing key ve same-region guard'lari tek yerde topluyor.
- `backend/src/routes/shifts/company.js` company shift create / batch akisini region guard ile sinirliyor.
- `backend/src/routes/gps.js` ve `backend/src/jobs/autoReachedQueue.js` region context tasiyor.
- `backend/src/routes/admin.js` region capacity snapshot donduruyor.
- `backend/src/routes/notifications.js`, `backend/src/routes/parent.js`, `backend/src/routes/rooms.js`, `backend/src/routes/companies.js` ve `backend/src/routes/shifts/shared.js` regionOwnership / regionRoutingKey gorunurlugu veriyor.
- `backend/src/routes/drivers.js`, `backend/src/routes/vehicles.js`, `backend/src/routes/offers.js` ve `backend/src/routes/driver.js` region-aware yuzeylerle baglaniyor.
- `web/src/panels/superadmin/RegionsPanel.jsx` il, zone ve kapasite gorunurlugunu veriyor.
- `web/src/panels/superadmin/UsersPanel.jsx` super-admin kullanici okuma / secme dilini region ile hizaliyor.
- `web/src/panels/room/ShiftsPanel.jsx`, `RoomDriversStatusTable.jsx`, `RoomDriversShiftsTable.jsx`, `DriversPanel.jsx`, `VehiclesPanel.jsx`, `roomShiftsPanelRows.jsx`, `roomShiftsPanelCards.jsx`, `roomVehiclesPanelRows.jsx`, `roomVehiclesPanelCards.jsx`, `roomVehiclesPanelSections.jsx` region etiketini room operasyon akislari boyunca tasiyor.
- `web/src/components/RoutePreviewModal.jsx`, `ShiftReassignModal.jsx`, `ShiftOperationEventsModal.jsx` region etiketini operasyon modal'larina tasiyor.
- `web/src/panels/shared/NotificationsPanel.jsx`, `web/src/panels/parent/LivePanel.jsx`, `web/src/panels/personel/MyRidePanel.jsx` region etiketini parent / personel / notification ozetlerine tasiyor.

## Eksik olanlar

Repo-side region open item kalmadi.  
Fiziksel deploy ve failover tatbikati artik saha / altyapi operasyonu olarak ayrik takip edilir.

## Sonraki faz

Detay roadmap: [REGION_SHARDING_NEXT_PHASE_ROADMAP_V1](REGION_SHARDING_NEXT_PHASE_ROADMAP_V1.md)

Detay execution docs:
- [REGION_NEXT_PHASE_EXECUTION_PACK_V1](REGION_NEXT_PHASE_EXECUTION_PACK_V1.md)
- [REGION_PHYSICAL_CELL_DEPLOYMENT_V1](REGION_PHYSICAL_CELL_DEPLOYMENT_V1.md)
- [REGION_ZONE_ALT_SHARD_V1](REGION_ZONE_ALT_SHARD_V1.md)
- [REGION_ARCHIVE_EXPORT_MANIFEST_RESTORE_V1](REGION_ARCHIVE_EXPORT_MANIFEST_RESTORE_V1.md)
- [REGION_FAILOVER_REBALANCING_DRILL_V1](REGION_FAILOVER_REBALANCING_DRILL_V1.md)
- [REGION_FIELD_ROLLOUT_RUNBOOK_V1](REGION_FIELD_ROLLOUT_RUNBOOK_V1.md)

1. Regional API / Redis / DB cell plani saha altyapisina uygulanir.
2. Region bazli go-live drill ve failover tatbikati saha operasyonunda yürütülür.

## Net sonuc

**Repo, logical region, operasyonel gorunurluk ve fiziksel execution paketleri icin hazir duruma getirildi.  
Saha rollout'u artik altyapi operasyonu olarak ayrik takip edilir.**
