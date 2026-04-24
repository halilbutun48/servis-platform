# M90C.6 — HOT-FILE QUEUE POLICY

Amaç: `repo_audit` içindeki hot/large file listesini yalnız sayısal uyarı olmaktan çıkarıp resmi sınıflı queue'ya çevirmek.

## Kapanan Kararlar
- `backend/src/ai/chat/helpComposer.js` -> `justified exception`
- `backend/prisma/schema.prisma` -> `justified exception / decision closed`

## Sınıflar
### 1) justified exception
- line-count düşürme hedefi yok
- agresif refactor yok
- yalnız acceptance-safe lokal düzeltme

### 2) safe candidate review
- davranış değiştirmeden kontrollü parçalara ayırma / section extraction yapılabilir
- refactor öncesi acceptance zinciri korunur

### 3) acceptance-sensitive / later
- sırf satır sayısı için açılmaz
- yalnız explicit acceptance gerekçesi ve dar kapsamla ele alınır

## Bu Repo İçin Resmi Dağılım
### justified exception
- `backend/src/ai/chat/helpComposer.js`
- `backend/prisma/schema.prisma`
- `backend/scripts/bench_gps_publish_only.js`
- `tools/milestone_pack_manifest.json`

### safe candidate review
- `backend/src/ai/jobGuide/screenCatalog.js`
- `web/src/panels/room/AgreementsPanel.jsx`
- `web/src/panels/company/ShiftPeopleTab.jsx`
- `web/src/panels/room/ShiftsPanel.jsx`
- `web/src/panels/room/VehiclesPanel.jsx`

### completed controlled extraction
- `web/src/panels/company/AgreementWizard.jsx` -> preset/config ve modal kabuğu ayrıldı; dosya 1000 satır altına indi ve hot-file kuyruğundan çıktı.
- `web/src/panels/company/ShiftsPanel.jsx` -> sozlesmeye donusum state helper'i ve market odak helper'i ayrıldı; dosya 1000 satır altına indi ve hot-file kuyruğundan çıktı.
- `web/src/panels/company/AgreementsPanel.jsx` -> source-shift, route-refresh ve selected summary extraction'lariyla dosya 1000 satır altına indi ve hot-file kuyruğundan çıktı.

### acceptance-sensitive / later
- `backend/src/routes/agreements.js`
- `backend/src/routes/shifts/room.js`
- `backend/src/routes/shifts/company.js`
- `web/src/panels/company/GuidedPlanModal.jsx`
- `web/src/panels/shared/CopilotPanel.jsx`
- `mobile/App.js`

## Kaynak Gerçek
- Makine-okur kaynak: `tools/repo_contract_state.json > hotFileQueuePolicy`
- Yürütülebilir kapı: `tools\pack_m90_c6_hot_file_queue_policy.ps1 -RepoRoot D:\servis-platform`
- Doğrulama: taze `repo_audit` çıktısı ile policy seti birebir eşleşmelidir.
