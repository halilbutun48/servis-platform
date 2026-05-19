# UX-COLLAPSIBLE-PANELS-01 Audit V1

Tarih: 2026-05-20  
Repo: `servis-platform`  
Branch snapshot: `m90d1_web_lint_inventory`

## 1) Taranan panel listesi

Tarama kapsamı:
- `web/src/panels/**/*.jsx`
- `web/src/components/**/*.jsx`
- `web/src/components/PanelChrome.jsx`
- `web/src/index.css`
- korunma kontrolü için `web/src/layout/NavDock.jsx`

Öncelikli uzun panel havuzu:
- `web/src/panels/company/AgreementsPanel.jsx`
- `web/src/panels/superadmin/CommercialCorePanel.jsx`
- `web/src/panels/company/GuidedPlanModal.jsx`
- `web/src/panels/company/ShiftsPanel.jsx`
- `web/src/panels/company/AgreementWizard.jsx`
- `web/src/panels/room/VehiclesPanel.jsx`
- `web/src/panels/room/ShiftsPanel.jsx`
- `web/src/panels/room/DriversPanel.jsx`
- `web/src/panels/company/WorkflowPanel.jsx`
- `web/src/panels/room/AgreementsPanel.jsx`
- `web/src/panels/shared/CopilotPanel.jsx`
- `web/src/panels/room/OffersPanel.jsx`
- `web/src/panels/room/roomVehiclesPanelSections.jsx`
- `web/src/panels/company/ShiftPeopleTab.jsx`
- `web/src/panels/company/GeoReviewPanel.jsx`
- `web/src/panels/driver/RoutePanel.jsx`
- `web/src/panels/company/MapPanel.jsx`
- `web/src/panels/organization/PlansPanel.jsx`
- `web/src/panels/room/MapPanel.jsx`
- `web/src/panels/parent/LivePanel.jsx`
- `web/src/panels/personel/LivePanel.jsx`
- `web/src/panels/company/ShiftTemplatesPanel.jsx`
- `web/src/panels/company/shiftPeopleTabSections.jsx`
- `web/src/panels/superadmin/PilotLaunchGatePanel.jsx`
- `web/src/panels/superadmin/UsersPanel.jsx`

## 2) Uzun panel adayları

| Panel | Satır | Risk | Not |
| --- | ---: | --- | --- |
| `web/src/panels/company/AgreementsPanel.jsx` | 1041 | P0 | Çok katmanlı sözleşme + rota + bridge + wizard akışı |
| `web/src/panels/superadmin/CommercialCorePanel.jsx` | 1002 | P1 | Büyük ama daha çok kompozit / readonly akış |
| `web/src/panels/company/GuidedPlanModal.jsx` | 913 | P2 | Modal, panel değil; bilgi yoğunluğu yüksek |
| `web/src/panels/company/ShiftsPanel.jsx` | 882 | P1 | Liste + ayrıntı + teklif köprüleri |
| `web/src/panels/company/AgreementWizard.jsx` | 878 | P2 | Yaratma akışı; birincil aksiyon önemli |
| `web/src/panels/room/VehiclesPanel.jsx` | 860 | P0 | Araç yönetimi / telematics / atama yoğunluğu |
| `web/src/panels/room/ShiftsPanel.jsx` | 854 | P1 | Büyük listeler ve yan detaylar |
| `web/src/panels/room/DriversPanel.jsx` | 847 | P1 | Sürücü listesi + detay + aksiyonlar |
| `web/src/panels/company/WorkflowPanel.jsx` | 843 | P1 | Akış / yardımcı detay bloğu yoğun |
| `web/src/panels/room/AgreementsPanel.jsx` | 825 | P1 | Sözleşme / route refresh / extend akışları |
| `web/src/panels/shared/CopilotPanel.jsx` | 825 | P0 | Terminal / drawer akışı; boundary korunmalı |
| `web/src/panels/room/OffersPanel.jsx` | 706 | P2 | Teklif odaklı, daha kontrollü |
| `web/src/panels/room/roomVehiclesPanelSections.jsx` | 702 | P1 | Alt sekmeler ve detay bölümleri |
| `web/src/panels/company/ShiftPeopleTab.jsx` | 695 | P1 | Atamalar / katılımcı / bağlantı detayları |
| `web/src/panels/company/GeoReviewPanel.jsx` | 691 | P2 | İnceleme / kalite odaklı yardımcı panel |
| `web/src/panels/driver/RoutePanel.jsx` | 674 | P0 | Durak sırası + ETA + kuyruk detayları |
| `web/src/panels/company/MapPanel.jsx` | 659 | P1 | Harita + canlı seçim + yardımcı detaylar |
| `web/src/panels/organization/PlansPanel.jsx` | 619 | P2 | Planlama / yardımcı bilgi daha baskın |
| `web/src/panels/room/MapPanel.jsx` | 588 | P0 | Canlı takip / araç seçimi / ETA görünümü |
| `web/src/panels/parent/LivePanel.jsx` | 543 | P0 | Canlı takip + yakın durak + shift durakları |
| `web/src/panels/personel/LivePanel.jsx` | 525 | P1 | Canlı takip + ETA + durak önerileri |
| `web/src/panels/company/ShiftTemplatesPanel.jsx` | 525 | P2 | Şablon odaklı yardımcı ekran |
| `web/src/panels/superadmin/PilotLaunchGatePanel.jsx` | 525 | P2 | Kapı / gating paneli |
| `web/src/panels/company/shiftPeopleTabSections.jsx` | 523 | P2 | Tab alt bölümleri |
| `web/src/panels/superadmin/UsersPanel.jsx` | 519 | P2 | Kullanıcı yönetimi, uzun ama daha list odaklı |

## 3) P0 / P1 / P2 sınıflandırması

### P0
- Kritik özet ve ana liste açık kalmazsa kullanıcı kaybolur.
- İkincil detaylar accordion altında toplanmalıdır.
- Örnekler:
  - Room / Operasyon Sağlığı
  - Room / Araçlar
  - Room / Canlı Takip
  - Driver / Bugün
  - Driver / Rota
  - Parent / Canlı Takip
  - Company / Sözleşmeler
  - Shared / Copilot terminal yüzeyi

### P1
- Ekran uzunluğu yüksek ama ana özet hâlâ kolay görünür.
- Sekmeler, özet kartları ve detay blokları dengeli tutulmalıdır.
- Örnekler:
  - Room / Sözleşmeler
  - Company / Vardiyalar
  - Company / Workflow
  - Company / Ticari Akış
  - Personel / Canlı Takip
  - Super Admin / Ticari Akış

### P2
- Yardımcı modal, şablon, inceleme veya küçük yönetim ekranları.
- Accordion standardı varsa uygulanır; yoksa sonraki dalgaya bırakılır.

## 4) Hep açık kalacak kritik alanlar

- Panel başlığı
- Kısa açıklama
- Seçili kayıt özeti
- Kritik durum / risk bandı
- Ana filtreler
- Ana tablo / liste
- Birincil aksiyonlar

## 5) Accordion / çekmece olacak ikincil alanlar

- Son 5 çalışma
- Kısa not
- Takip önerileri
- Kalite özeti
- Detaylı tanı
- Bağlantı detayları
- Telematics detayları
- Geçmiş kayıtlar
- Yardımcı açıklama blokları
- Secondary rehber blokları
- Çok satırlı kontrol checklisteleri
- Kuyruk detayı
- Kaynak vardiya bağlantısı
- Rota güncelleme detayları
- Yakın durak listeleri
- Shift duraklarının detayları

## 6) Tab olarak kalacak eş düzey alt modlar

Aynı kaydın eş düzey alt modları, accordion içine atılmamalı; tab olarak kalmalı:
- Durum
- Yönetim
- Atamalar
- Müsaitlik
- Telematics
- Bağlantı

## 7) Bu patchte düzenlenen paneller

- `web/src/components/CollapsibleSection.jsx`
- `web/src/index.css`
- `web/src/panels/room/OperationHealthPanel.jsx`
- `web/src/panels/driver/TodayPanel.jsx`
- `web/src/panels/driver/RoutePanel.jsx`
- `web/src/panels/parent/LivePanel.jsx`
- `web/src/panels/company/AgreementsPanel.jsx`
- `web/src/panels/company/companyAgreementsRouteRefreshPendingSection.jsx`
- `web/src/panels/company/companyAgreementsSourceShiftSection.jsx`

## 8) Sonraya bırakılan paneller

- `web/src/panels/room/VehiclesPanel.jsx`
- `web/src/panels/room/AgreementsPanel.jsx`
- `web/src/panels/room/ShiftsPanel.jsx`
- `web/src/panels/room/DriversPanel.jsx`
- `web/src/panels/room/OffersPanel.jsx`
- `web/src/panels/company/ShiftsPanel.jsx`
- `web/src/panels/company/WorkflowPanel.jsx`
- `web/src/panels/company/MapPanel.jsx`
- `web/src/panels/company/ShiftPeopleTab.jsx`
- `web/src/panels/personel/LivePanel.jsx`
- `web/src/panels/superadmin/CommercialCorePanel.jsx`
- `web/src/panels/superadmin/UsersPanel.jsx`
- `web/src/panels/superadmin/PilotLaunchGatePanel.jsx`
- `web/src/panels/shared/CopilotPanel.jsx`
- `web/src/panels/organization/PlansPanel.jsx`
- `web/src/panels/company/GuidedPlanModal.jsx`
- `web/src/panels/company/AgreementWizard.jsx`

## 9) Notlar

- `Sefer Abi Terminali` bu patchte değişmedi; terminal boundary korunur.
- Sağ alttaki `Sefer Abi’ye Sor` drawer değişmedi.
- NavDock role/kind label standardı korunur.
- ETA-SANITY / ETA-OSRM / LIVE-TRACKING / DRIVER-FLOW final zinciri korunur.
- Runtime-data dosyalarına dokunulmadı.

