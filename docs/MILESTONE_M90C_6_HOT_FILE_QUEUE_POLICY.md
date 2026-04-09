# M90C.6 — HOT-FILE QUEUE POLICY

Amaç: `repo_audit` içindeki hot/large file listesini yalnız sayısal uyarı olmaktan çıkarıp resmi sınıflı queue'ya çevirmek.

## Kapanan kararlar
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

## Bu repo için resmi dağılım
### justified exception
- `backend/src/ai/chat/helpComposer.js`
- `backend/prisma/schema.prisma`

### safe candidate review
- `backend/src/ai/jobGuide/screenCatalog.js`
- `web/src/panels/company/ShiftsPanel.jsx`
- `web/src/panels/room/ShiftsPanel.jsx`
- `web/src/panels/company/GuidedPlanModal.jsx`
- `web/src/panels/room/DriversPanel.jsx`
- `web/src/panels/room/VehiclesPanel.jsx`
- `web/src/panels/company/ShiftPeopleTab.jsx`
- `web/src/panels/organization/PlansPanel.jsx`

### acceptance-sensitive / later
- `backend/src/routes/shifts/room.js`
- `backend/src/routes/shifts/company.js`
- `web/src/panels/shared/CopilotPanel.jsx`
- `mobile/App.js`

## Kaynak gerçek
- Makine-okur kaynak: `tools/repo_contract_state.json > hotFileQueuePolicy`
- Yürütülebilir kapı: `tools\pack_m90_c6_hot_file_queue_policy.ps1 -RepoRoot D:\servis-platform`
- Doğrulama: taze `repo_audit` çıktısı ile policy seti birebir eşleşmelidir.
