# UX-PANEL-INVENTORY-02A Audit

Tarih: 2026-05-20  
Repo: `servis-platform`  
Branch snapshot: `m90d1_web_lint_inventory`

## 1) Taranan panel listesi

Tarama kapsamı:
- `web/src/panels/**/*.jsx`
- `web/src/components/**/*.jsx`
- `web/src/components/PanelChrome.jsx`
- `web/src/panels/shared/OfferQualityRankingCard.jsx`
- `web/src/panels/shared/FinancialOperationsPanel.jsx`
- `web/src/index.css`
- `web/src/layout/NavDock.jsx`
- `web/src/App.jsx` route/menu bağlantıları

Özet envanter:
  - `123` panel-related JSX dosyası: `web/src/panels/**/*.jsx`
- `63` route-backed unique screen component: `web/src/App.jsx` lazy import yüzeyi
- `103` gerçek route surface + `/` root redirect ile `104` unique route literal

### Super Admin (20)
- `/superadmin`
- `/superadmin/telematics`
- `/superadmin/companies`
- `/superadmin/rooms`
- `/superadmin/users`
- `/superadmin/regions`
- `/superadmin/audit`
- `/superadmin/logexport`
- `/superadmin/observability`
- `/superadmin/operations`
- `/superadmin/acceptance`
- `/superadmin/ssot-alignment`
- `/superadmin/commercial-core`
- `/superadmin/trust-quality`
- `/superadmin/natural-copilot`
- `/superadmin/pilot-launch-gate`
- `/superadmin/operation-verification`
- `/superadmin/copilot`

### Room / Oda (14)
- `/room/reports`
- `/room/operation-health`
- `/room/map`
- `/room/live`
- `/room/vehicles`
- `/room/drivers`
- `/room/shifts`
- `/room/agreements`
- `/room/offers`
- `/room/commercial-flow`
- `/room/financial-operations`
- `/room/hub`
- `/room/checkin`
- `/room/copilot`

### Company / Firma (15)
- `/company`
- `/company/reports`
- `/company/operations`
- `/company/map`
- `/company/commercial-flow`
- `/company/financial-operations`
- `/company/shifts`
- `/company/georeview`
- `/company/agreements`
- `/company/hub`
- `/company/checkin`
- `/company/personel-access`
- `/company/access-links`
- `/company/service-evaluation`
- `/company/copilot`

### School (15)
- `/school`
- `/school/reports`
- `/school/operations`
- `/school/map`
- `/school/commercial-flow`
- `/school/financial-operations`
- `/school/shifts`
- `/school/georeview`
- `/school/agreements`
- `/school/hub`
- `/school/checkin`
- `/school/access-links`
- `/school/service-evaluation`
- `/school/parents`
- `/school/copilot`

### Organization (16)
- `/organization`
- `/organization/reports`
- `/organization/operations`
- `/organization/plans`
- `/organization/map`
- `/organization/commercial-flow`
- `/organization/financial-operations`
- `/organization/shifts`
- `/organization/georeview`
- `/organization/agreements`
- `/organization/hub`
- `/organization/checkin`
- `/organization/personel-access`
- `/organization/access-links`
- `/organization/service-evaluation`
- `/organization/copilot`

### Driver (7)
- `/driver`
- `/driver/today`
- `/driver/map`
- `/driver/route`
- `/driver/checkin`
- `/driver/change-pin`
- `/driver/copilot`

### Parent / Veli (3)
- `/parent`
- `/parent/live`
- `/parent/copilot`

### Personel (3)
- `/personel/live`
- `/personel/my`
- `/personel/copilot`

### Shared / System (4)
- `/shared/notifications`
- `/shared/logs`
- `/shared/feedback`
- `/shared/kvkk`

### Utility / Public / Auth (6)
- `/auth/change-password`
- `/accept-parent-invite`
- `/public/passenger-live`
- `/public/personel-live`
- `/public/landing`
- `/landing`

## 2) Uzun / karmaşık / aşağı scroll riski olan paneller

| Panel | Satır | Risk | Neden |
| --- | ---: | --- | --- |
| `web/src/panels/company/AgreementsPanel.jsx` | 1181 | P0 | Sözleşme, rota, bridge, wizard ve çok sayıda filtre tek akışta |
| `web/src/panels/superadmin/CommercialCorePanel.jsx` | 1041 | P0 | Ticari / settlement çekirdeği; çok kartlı ve yoğun ekran |
| `web/src/panels/company/ShiftsPanel.jsx` | 999 | P1 | Liste + ayrıntı + planlama köprüleri, ağır filtre kümeleri |
| `web/src/panels/company/AgreementWizard.jsx` | 983 | P2 | Yaratma akışı; modal / adım bazlı ama uzun |
| `web/src/panels/room/VehiclesPanel.jsx` | 983 | P0 | Araç yönetimi + telematics + atama yoğunluğu |
| `web/src/panels/company/GuidedPlanModal.jsx` | 977 | P2 | Modal; panel değil ama bilgi yoğun |
| `web/src/panels/room/ShiftsPanel.jsx` | 968 | P1 | Büyük liste, çok filtre ve yardımcı blok |
| `web/src/panels/room/DriversPanel.jsx` | 960 | P0 | Sürücü listesi, detaylar, aksiyonlar ve segmentler |
| `web/src/panels/company/WorkflowPanel.jsx` | 937 | P1 | Akış ve yardımcı açıklamalar tek sayfada |
| `web/src/panels/shared/CopilotPanel.jsx` | 905 | P0 | Terminal / drawer boundary kritik, uzun sohbet yüzeyi |
| `web/src/panels/room/AgreementsPanel.jsx` | 890 | P1 | Sözleşme + route refresh + extend köprüleri |
| `web/src/panels/room/OffersPanel.jsx` | 780 | P1 | Teklif akışı, filtre yoğunluğu yüksek |
| `web/src/panels/company/ShiftPeopleTab.jsx` | 768 | P1 | Atama / katılımcı / erişim detayları |
| `web/src/panels/company/MapPanel.jsx` | 751 | P1 | Harita + seçili kayıt + yardımcı bloklar |
| `web/src/panels/driver/RoutePanel.jsx` | 750 | P0 | Durak sırası, ETA, timeline ve güvenli durum dili |
| `web/src/panels/room/roomVehiclesPanelSections.jsx` | 744 | P1 | Alt bölüm yoğunluğu, çok kartlı parça |
| `web/src/panels/company/GeoReviewPanel.jsx` | 742 | P1 | İnceleme / kalite blokları, yardımcı detay çok |
| `web/src/panels/room/CommercialFlowPanel.jsx` | 728 | P0 | Ticari akış, hakediş, sözleşme, teklif, kalite, ödeme, geçmiş |
| `web/src/panels/organization/PlansPanel.jsx` | 690 | P2 | Planlama yardımı ve destekleyici detaylar |
| `web/src/panels/room/MapPanel.jsx` | 672 | P0 | Canlı takip, araç seçimi, ETA ve harita yoğunluğu |
| `web/src/panels/parent/LivePanel.jsx` | 619 | P0 | Canlı takip + yakın durak + shift durakları |
| `web/src/panels/personel/LivePanel.jsx` | 610 | P1 | Canlı takip ve yardımcı açıklama blokları |
| `web/src/panels/company/ShiftTemplatesPanel.jsx` | 588 | P2 | Şablon odaklı yardımcı ekran |
| `web/src/panels/superadmin/PilotLaunchGatePanel.jsx` | 576 | P2 | Kapı / kabul yüzeyi |
| `web/src/panels/superadmin/UsersPanel.jsx` | 574 | P2 | Yönetim / liste odaklı ekran |

## 3) P0 / P1 / P2 sınıflandırması

### P0
- `web/src/panels/company/AgreementsPanel.jsx`
- `web/src/panels/superadmin/CommercialCorePanel.jsx`
- `web/src/panels/room/VehiclesPanel.jsx`
- `web/src/panels/room/DriversPanel.jsx`
- `web/src/panels/driver/RoutePanel.jsx`
- `web/src/panels/room/CommercialFlowPanel.jsx`
- `web/src/panels/room/MapPanel.jsx`
- `web/src/panels/parent/LivePanel.jsx`
- `web/src/panels/shared/CopilotPanel.jsx`

### P1
- `web/src/panels/company/ShiftsPanel.jsx`
- `web/src/panels/company/WorkflowPanel.jsx`
- `web/src/panels/room/ShiftsPanel.jsx`
- `web/src/panels/room/AgreementsPanel.jsx`
- `web/src/panels/room/OffersPanel.jsx`
- `web/src/panels/company/MapPanel.jsx`
- `web/src/panels/company/GeoReviewPanel.jsx`
- `web/src/panels/company/ShiftPeopleTab.jsx`
- `web/src/panels/organization/PlansPanel.jsx`
- `web/src/panels/personel/LivePanel.jsx`
- `web/src/panels/room/OperationHealthPanel.jsx`
- `web/src/panels/company/OperationsPanel.jsx`

### P2
- `web/src/panels/company/AgreementWizard.jsx`
- `web/src/panels/company/GuidedPlanModal.jsx`
- `web/src/panels/company/ShiftTemplatesPanel.jsx`
- `web/src/panels/superadmin/PilotLaunchGatePanel.jsx`
- `web/src/panels/superadmin/UsersPanel.jsx`
- `web/src/panels/company/companyShiftsPanelSections.jsx`
- `web/src/panels/room/roomAgreementsPanelSections.jsx`

## 4) Her panel için önerilen yapı

| Panel | Öneri | Neden |
| --- | --- | --- |
| `Company / Sözleşmeler` | ayrı alt modlara bölünmeli | sözleşme, bridge, rota güncelleme ve wizard blokları ayrı akmalı |
| `Super Admin / Ticari Akış` | segmented/tab gerekli | aynı ekran içinde ticari çekirdek ve kabul/izleme modları ayrışmalı |
| `Room / Araçlar` | segmented/tab gerekli | referans yüzey; durum, atama, teletmatics, liste ayrımı gerekli |
| `Room / Sürücüler` | segmented/tab gerekli | sürücü listesi, durum, atama ve detay blokları eş düzey |
| `Room / Ticari Akışım` | segmented/tab gerekli | özet, hakediş, sözleşme, teklif, kalite, ödeme, geçmiş ayrışmalı |
| `Company / Ticari Akış` | segmented/tab gerekli | ticari, kalite ve rapor aynı şeritte bırakılmamalı |
| `Company / Vardiyalar` | accordion yeterli | ana özet + detay listeler yeterli, büyük mod bölümü şart değil |
| `Room / Vardiyalar` | accordion yeterli | ana liste açık, yardımcı detaylar kapalı kalabilir |
| `Driver / Rota` | accordion yeterli | ana rota haritası ve durak akışı açık; ikincil analizler kapalı |
| `Driver / Bugün` | accordion yeterli | görev özeti açık, detaylar çekmeceye uygun |
| `Parent / Canlı Takip` | accordion yeterli | harita ve çocuk özeti açık; detaylar kapalı kalabilir |
| `Personel / Canlı Takip` | accordion yeterli | canlı araç özeti açık, yardımcı bloklar kapalı olabilir |
| `Room / Operasyon Sağlığı` | accordion yeterli | özet açık, öneri / kalite blokları kapalı olmalı |
| `Company / Map` | accordion yeterli | harita + seçili kayıt açık, detaylar kapalı olabilir |
| `Company / GeoReview` | accordion yeterli | kalite inceleme blokları collapsed kalabilir |
| `Company / Workflow` | accordion yeterli | ana akış açık, yardımcı notlar kapalı olmalı |
| `Organization / Plans` | mevcut hali korunabilir | destekleyici planlama yüzeyi, ağır bölünme şart değil |
| `Room / Hub` | mevcut hali korunabilir | kısa operasyon yüzeyi |
| `Room / Check-in` | mevcut hali korunabilir | ana aksiyon odaklı, kısa ekran |
| `Shared / Logs` | mevcut hali korunabilir | kayıt odaklı kısa yardımcı yüzey |
| `Shared / KVKK` | mevcut hali korunabilir | belge / bilgilendirme yüzeyi |

Not:
- `Room / Araçlar` ve `Room / Sürücüler` zaten segmented/tab referans yüzeyleridir.
- `Room / Ticari Akışım` ve `Company / Sözleşmeler` son kullanıcı için hâlâ en yoğun iki ticari yüzeydir.

## 5) İlk düzeltilecek 5 panel önerisi

1. `web/src/panels/company/AgreementsPanel.jsx`
2. `web/src/panels/superadmin/CommercialCorePanel.jsx`
3. `web/src/panels/company/ShiftsPanel.jsx`
4. `web/src/panels/room/VehiclesPanel.jsx`
5. `web/src/panels/room/DriversPanel.jsx`

Ek yakın aday:
- `web/src/panels/room/CommercialFlowPanel.jsx`

## 6) Sonraya bırakılacak paneller

- `web/src/panels/company/AgreementWizard.jsx`
- `web/src/panels/company/GuidedPlanModal.jsx`
- `web/src/panels/company/ShiftTemplatesPanel.jsx`
- `web/src/panels/superadmin/PilotLaunchGatePanel.jsx`
- `web/src/panels/superadmin/UsersPanel.jsx`
- `web/src/panels/company/OperationsPanel.jsx`
- `web/src/panels/company/WorkflowPanel.jsx`
- `web/src/panels/company/GeoReviewPanel.jsx`
- `web/src/panels/organization/PlansPanel.jsx`
- `web/src/panels/shared/LogsPanel.jsx`
- `web/src/panels/shared/NotificationsPanel.jsx`
- `web/src/panels/public/AcceptParentInvitePanel.jsx`
- `web/src/panels/public/PassengerLivePanel.jsx`
- `web/src/panels/public/PassengerLinksPanel.jsx`
- `web/src/panels/driver/CheckinPanel.jsx`
- `web/src/panels/driver/PinChangePanel.jsx`
- `web/src/panels/room/HubPanel.jsx`
- `web/src/panels/company/HubPanel.jsx`
- `web/src/panels/company/CheckinPanel.jsx`
- `web/src/panels/school/ParentInvitePanel.jsx`

## 7) Notlar

- `PanelChrome.jsx` ve `NavDock.jsx` tarama kapsamındadır; role/kind rota bağlantıları korunur.
- `Sefer Abi Terminali` ve sağ alttaki `Sefer Abi’ye Sor` bu envanter dalgasında korunur.
- Bu audit yalnızca envanter, risk sınıflandırması ve panel mimarisi önerisidir.
- Bu dalga ürün davranışını değiştirmez; yalnızca sonraki UX kararlarını hizalar.

## UX-PANEL-STRUCTURE-02B follow-up

- 02A envanterinde işaretlenen P0 uzun panel grubunun ilk dalgası 02B ile summary-first + segmented/tab + collapsible standardına taşınır.
- Öncelikli yüzeyler: `CommercialCorePanel`, `VehiclesPanel`, `DriversPanel`, `ShiftsPanel`, `MapPanel`.
- Bu follow-up, envanter sayımlarını değiştirmez; yalnızca mimari uygulama sırasını netleştirir.
