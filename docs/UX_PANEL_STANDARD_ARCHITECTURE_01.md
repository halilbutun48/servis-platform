# UX-PANEL-STANDARD-ARCHITECTURE-01

Tarih: 2026-05-31
Repo: `servis-platform`

## 1) Standard

1. Üst özet bandı
   - durum
   - risk
   - bekleyen işlem
   - kısa açıklama
2. KPI / mini kartlar
   - sayı
   - durum
   - eksik / uyarı
3. Ana aksiyon alanı
   - en önemli buton
   - ikincil butonlar
   - readonly / execute sınırı
4. İşlevsel sekmeler veya bölümler
   - Özet
   - Bekleyenler
   - Detay
   - Kanıt
   - Geçmiş
5. Detay / sistem kanıtı
   - accordion / drawer altında
   - ana ekranı boğmaz

## 2) Audit Summary

- Panel yüzey sayısı: `63`
- PASS: `19`
- PASS-: `20`
- UX-FIX: `24`
- DEFER: `0`

### Role Summary

- Super Admin: total `17`, PASS `5`, PASS- `9`, UX-FIX `3`, DEFER `0`
- Room: total `10`, PASS `4`, PASS- `2`, UX-FIX `4`, DEFER `0`
- Company: total `14`, PASS `1`, PASS- `6`, UX-FIX `7`, DEFER `0`
- Driver: total `5`, PASS `1`, PASS- `1`, UX-FIX `3`, DEFER `0`
- Personel: total `2`, PASS `2`, PASS- `0`, UX-FIX `0`, DEFER `0`
- Parent/Veli: total `1`, PASS `1`, PASS- `0`, UX-FIX `0`, DEFER `0`
- Organization: total `2`, PASS `1`, PASS- `0`, UX-FIX `1`, DEFER `0`
- Public: total `3`, PASS `2`, PASS- `0`, UX-FIX `1`, DEFER `0`
- Shared: total `7`, PASS `2`, PASS- `2`, UX-FIX `3`, DEFER `0`
- School: total `2`, PASS `0`, PASS- `0`, UX-FIX `2`, DEFER `0`

## 3) Audit Matrix

| Panel / route | Rol | Üst özet bandı | KPI / mini kart | Ana aksiyon | Readonly / execute | Sekme / bölüm | Detay / kanıt | Mobile CTA | Teknik metin | Durum |
|---|---|---|---|---|---|---|---|---|---|---|
| `web/src/panels/company/AgreementsPanel.jsx` | Company | Var | Yok | Var | Net | Var | Var | Var | Temiz | PASS- |
| `web/src/panels/company/CheckinPanel.jsx` | Company | Yok | Yok | Var | Net | Var | Yok | Var | Risk | UX-FIX |
| `web/src/panels/company/CommercialFlowPanel.jsx` | Company | Var | Yok | Var | Kısmi/Belirsiz | Var | Yok | Var | Risk | UX-FIX |
| `web/src/panels/company/GeoReviewPanel.jsx` | Company | Var | Yok | Var | Kısmi/Belirsiz | Var | Yok | Var | Temiz | PASS- |
| `web/src/panels/company/HubPanel.jsx` | Company | Var | Yok | Var | Net | Yok | Yok | Var | Temiz | PASS- |
| `web/src/panels/company/MapPanel.jsx` | Company | Var | Yok | Var | Net | Yok | Var | Var | Risk | UX-FIX |
| `web/src/panels/company/OperationsPanel.jsx` | Company | Var | Yok | Var | Net | Var | Var | Var | Risk | UX-FIX |
| `web/src/panels/company/PassengerLinksPanel.jsx` | Company | Var | Yok | Var | Kısmi/Belirsiz | Var | Var | Yok | Risk | UX-FIX |
| `web/src/panels/company/PersonelAccessPanel.jsx` | Company | Var | Yok | Var | Kısmi/Belirsiz | Var | Yok | Yok | Risk | UX-FIX |
| `web/src/panels/company/PlanBuilderPanel.jsx` | Company | Yok | Yok | Var | Net | Yok | Yok | Yok | Temiz | PASS- |
| `web/src/panels/company/ServiceEvaluationPanel.jsx` | Company | Var | Var | Var | Net | Var | Var | Var | Temiz | PASS |
| `web/src/panels/company/ShiftsPanel.jsx` | Company | Var | Yok | Var | Net | Var | Yok | Yok | Temiz | PASS- |
| `web/src/panels/company/ShiftTemplatesPanel.jsx` | Company | Var | Yok | Var | Net | Var | Yok | Var | Temiz | PASS- |
| `web/src/panels/company/WorkflowPanel.jsx` | Company | Var | Var | Var | Net | Var | Yok | Var | Risk | UX-FIX |
| `web/src/panels/driver/CheckinPanel.jsx` | Driver | Yok | Yok | Var | Kısmi/Belirsiz | Var | Yok | Var | Risk | UX-FIX |
| `web/src/panels/driver/MapPanel.jsx` | Driver | Var | Yok | Var | Net | Yok | Var | Var | Risk | UX-FIX |
| `web/src/panels/driver/PinChangePanel.jsx` | Driver | Yok | Yok | Var | Kısmi/Belirsiz | Yok | Yok | Var | Temiz | PASS- |
| `web/src/panels/driver/RoutePanel.jsx` | Driver | Var | Yok | Var | Net | Var | Var | Var | Risk | UX-FIX |
| `web/src/panels/driver/TodayPanel.jsx` | Driver | Var | Var | Var | Net | Var | Var | Yok | Temiz | PASS |
| `web/src/panels/organization/CenterPanel.jsx` | Organization | Var | Var | Var | Net | Var | Yok | Yok | Temiz | PASS |
| `web/src/panels/organization/PlansPanel.jsx` | Organization | Yok | Yok | Var | Net | Yok | Yok | Var | Risk | UX-FIX |
| `web/src/panels/parent/LivePanel.jsx` | Parent/Veli | Var | Var | Var | Net | Var | Var | Var | Temiz | PASS |
| `web/src/panels/personel/LivePanel.jsx` | Personel | Var | Var | Var | Net | Var | Var | Var | Temiz | PASS |
| `web/src/panels/personel/MyRidePanel.jsx` | Personel | Var | Var | Var | Kısmi/Belirsiz | Var | Yok | Var | Temiz | PASS |
| `web/src/panels/public/AcceptParentInvitePanel.jsx` | Public | Yok | Yok | Var | Kısmi/Belirsiz | Yok | Var | Var | Risk | UX-FIX |
| `web/src/panels/public/PassengerLivePanel.jsx` | Public | Var | Var | Var | Net | Yok | Var | Var | Temiz | PASS |
| `web/src/panels/public/PublicLandingPage.jsx` | Public | Var | Var | Var | Net | Yok | Var | Var | Temiz | PASS |
| `web/src/panels/room/AgreementsPanel.jsx` | Room | Var | Yok | Var | Net | Var | Var | Var | Temiz | PASS- |
| `web/src/panels/room/CheckinPanel.jsx` | Room | Yok | Yok | Var | Net | Var | Yok | Yok | Risk | UX-FIX |
| `web/src/panels/room/CommercialFlowPanel.jsx` | Room | Var | Var | Var | Net | Var | Var | Var | Temiz | PASS |
| `web/src/panels/room/DriversPanel.jsx` | Room | Var | Var | Var | Net | Var | Var | Var | Temiz | PASS |
| `web/src/panels/room/HubPanel.jsx` | Room | Var | Yok | Var | Net | Yok | Yok | Var | Temiz | PASS- |
| `web/src/panels/room/MapPanel.jsx` | Room | Var | Yok | Var | Net | Var | Var | Var | Risk | UX-FIX |
| `web/src/panels/room/OffersPanel.jsx` | Room | Var | Yok | Var | Net | Yok | Yok | Yok | Risk | UX-FIX |
| `web/src/panels/room/OperationHealthPanel.jsx` | Room | Var | Var | Var | Net | Var | Var | Var | Temiz | PASS |
| `web/src/panels/room/ShiftsPanel.jsx` | Room | Var | Yok | Var | Net | Var | Yok | Yok | Risk | UX-FIX |
| `web/src/panels/room/VehiclesPanel.jsx` | Room | Var | Var | Var | Kısmi/Belirsiz | Var | Var | Yok | Temiz | PASS |
| `web/src/panels/school/OperationsPanel.jsx` | School | Var | Var | Var | Net | Var | Var | Var | Risk | UX-FIX |
| `web/src/panels/school/ParentInvitePanel.jsx` | School | Var | Yok | Var | Net | Var | Var | Var | Risk | UX-FIX |
| `web/src/panels/shared/CopilotPanel.jsx` | Shared | Var | Var | Var | Net | Var | Var | Yok | Risk | UX-FIX |
| `web/src/panels/shared/FeedbackLoopPanel.jsx` | Shared | Var | Yok | Var | Kısmi/Belirsiz | Yok | Yok | Yok | Temiz | PASS- |
| `web/src/panels/shared/ForcePasswordChangePanel.jsx` | Shared | Yok | Yok | Var | Kısmi/Belirsiz | Yok | Var | Var | Risk | UX-FIX |
| `web/src/panels/shared/KvkkPanel.jsx` | Shared | Var | Yok | Var | Kısmi/Belirsiz | Yok | Yok | Var | Risk | UX-FIX |
| `web/src/panels/shared/LogsPanel.jsx` | Shared | Var | Yok | Var | Net | Var | Var | Var | Temiz | PASS- |
| `web/src/panels/shared/NotificationsPanel.jsx` | Shared | Var | Var | Var | Net | Var | Var | Var | Temiz | PASS |
| `web/src/panels/shared/ReportsPanel.jsx` | Shared | Var | Var | Var | Kısmi/Belirsiz | Var | Yok | Var | Temiz | PASS |
| `web/src/panels/superadmin/AuditLogsPanel.jsx` | Super Admin | Yok | Var | Var | Net | Var | Var | Var | Temiz | PASS- |
| `web/src/panels/superadmin/CommercialCorePanel.jsx` | Super Admin | Var | Var | Var | Net | Var | Var | Var | Temiz | PASS |
| `web/src/panels/superadmin/CompaniesPanel.jsx` | Super Admin | Var | Yok | Var | Kısmi/Belirsiz | Yok | Yok | Var | Temiz | PASS- |
| `web/src/panels/superadmin/LogExportPanel.jsx` | Super Admin | Yok | Var | Var | Net | Var | Var | Var | Temiz | PASS- |
| `web/src/panels/superadmin/NaturalCopilotPanel.jsx` | Super Admin | Var | Yok | Var | Net | Yok | Yok | Yok | Temiz | PASS- |
| `web/src/panels/superadmin/ObservabilityPanel.jsx` | Super Admin | Var | Var | Var | Net | Var | Var | Var | Temiz | PASS |
| `web/src/panels/superadmin/OperationsPanel.jsx` | Super Admin | Var | Var | Var | Net | Var | Var | Yok | Risk | UX-FIX |
| `web/src/panels/superadmin/OperationVerificationPanel.jsx` | Super Admin | Var | Yok | Var | Net | Var | Var | Var | Temiz | PASS- |
| `web/src/panels/superadmin/ParentChildMiniPanel.jsx` | Super Admin | Yok | Yok | Var | Kısmi/Belirsiz | Yok | Yok | Yok | Temiz | PASS- |
| `web/src/panels/superadmin/PilotLaunchGatePanel.jsx` | Super Admin | Var | Var | Var | Net | Var | Var | Var | Temiz | PASS |
| `web/src/panels/superadmin/PublicLeadReviewPanel.jsx` | Super Admin | Var | Var | Var | Net | Var | Yok | Yok | Risk | UX-FIX |
| `web/src/panels/superadmin/RegionsPanel.jsx` | Super Admin | Yok | Yok | Var | Kısmi/Belirsiz | Var | Yok | Var | Temiz | PASS- |
| `web/src/panels/superadmin/RoomsPanel.jsx` | Super Admin | Var | Yok | Var | Kısmi/Belirsiz | Yok | Yok | Var | Temiz | PASS- |
| `web/src/panels/superadmin/SsotAlignmentPanel.jsx` | Super Admin | Var | Yok | Var | Kısmi/Belirsiz | Yok | Yok | Var | Temiz | PASS- |
| `web/src/panels/superadmin/SuperAdminPanel.jsx` | Super Admin | Var | Var | Var | Net | Var | Var | Var | Risk | UX-FIX |
| `web/src/panels/superadmin/TrustQualityPanel.jsx` | Super Admin | Var | Var | Var | Net | Var | Var | Var | Temiz | PASS |
| `web/src/panels/superadmin/UsersPanel.jsx` | Super Admin | Var | Var | Var | Kısmi/Belirsiz | Var | Var | Var | Temiz | PASS |

## 4) Shared Primitives

- `web/src/components/FlowSummaryStrip.jsx`
- `web/src/components/PanelChrome.jsx`
- `web/src/components/PanelSegmentTabs.jsx`
- `web/src/components/CollapsibleSection.jsx`
- `web/src/components/SystemModeSummaryBand.jsx`

## 5) Notes

- Check alias: `check:uxpanelstandardarchitecture01`
- Check command: `node backend\scripts\ux_panel_standard_architecture_01_check.js`
- Doc: `docs/UX_PANEL_STANDARD_ARCHITECTURE_01.md`
- Bu standart ürün/business flow değiştirmez.
- Backend route/write-path değiştirmez.
- Schema/migration açmaz.
- Runtime-data dosyalarına dokunmaz.
- Payment/settlement/contract/invite/supplier execute başlatmaz.
- AI/Copilot yeni capability eklemez.
- Playwright runner policy ve coverage matrix fail policy değişmez.
- Teknik/debug/raw/null/undefined görünür metinler ana ekranda kalmamalıdır.
