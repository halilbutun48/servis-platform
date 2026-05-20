# UX-PANEL-STRUCTURE-02 Audit V1

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

Panel aileleri:
- `web/src/panels/room/*.jsx`
- `web/src/panels/company/*.jsx`
- `web/src/panels/superadmin/*.jsx`
- `web/src/panels/driver/*.jsx`
- `web/src/panels/parent/*.jsx`
- `web/src/panels/personel/*.jsx`
- `web/src/panels/public/*.jsx`
- `web/src/panels/shared/*.jsx`
- `web/src/panels/school/*.jsx`
- `web/src/panels/organization/*.jsx`

Özellikle uzun / bilgi yoğun yüzeyler:
- `web/src/panels/room/CommercialFlowPanel.jsx`
- `web/src/panels/company/AgreementsPanel.jsx`
- `web/src/panels/company/CommercialFlowPanel.jsx`
- `web/src/panels/superadmin/CommercialCorePanel.jsx`
- `web/src/panels/superadmin/OperationVerificationPanel.jsx`
- `web/src/panels/parent/LivePanel.jsx`
- `web/src/panels/personel/LivePanel.jsx`
- `web/src/panels/driver/TodayPanel.jsx`
- `web/src/panels/driver/RoutePanel.jsx`
- `web/src/panels/room/VehiclesPanel.jsx`
- `web/src/panels/room/DriversPanel.jsx`
- `web/src/panels/room/OperationHealthPanel.jsx`
- `web/src/panels/room/AgreementsPanel.jsx`
- `web/src/panels/company/ShiftsPanel.jsx`
- `web/src/panels/company/WorkflowPanel.jsx`
- `web/src/panels/company/ShiftPeopleTab.jsx`
- `web/src/panels/company/MapPanel.jsx`
- `web/src/panels/company/GeoReviewPanel.jsx`
- `web/src/panels/room/MapPanel.jsx`
- `web/src/panels/room/ShiftsPanel.jsx`
- `web/src/panels/room/OffersPanel.jsx`
- `web/src/panels/shared/CopilotPanel.jsx`
- `web/src/panels/organization/PlansPanel.jsx`

## 2) Uzun panel adayları

| Panel | Satır | Risk | Not |
| --- | ---: | --- | --- |
| `web/src/panels/room/CommercialFlowPanel.jsx` | 277 | P0 | Room / Ticari Akışım tek uzun yüzeyde; özet, hakediş, sözleşme, teklif, kalite, ödeme ve geçmiş sekmelerine ayrıldı |
| `web/src/panels/company/AgreementsPanel.jsx` | 1050 | P0 | Sözleşme, rota güncelleme, bridge ve oluşturma akışı tek uzun yüzeyde |
| `web/src/panels/superadmin/CommercialCorePanel.jsx` | 1002 | P1 | Çok katmanlı ticari/settlement omurgası; en yüksek riskli uzun ekranlardan biri |
| `web/src/panels/company/GuidedPlanModal.jsx` | 913 | P2 | Modal; panel değil ama bilgi yoğun |
| `web/src/panels/company/ShiftsPanel.jsx` | 882 | P1 | Liste + detay + teklif / planlama bağlantıları |
| `web/src/panels/company/AgreementWizard.jsx` | 878 | P2 | Oluşturma akışı; ana aksiyon kritik |
| `web/src/panels/room/VehiclesPanel.jsx` | 860 | P0 | Zaten segmented/tab standardı var; referans surface |
| `web/src/panels/room/ShiftsPanel.jsx` | 854 | P1 | Liste + yardımcı detaylar |
| `web/src/panels/room/DriversPanel.jsx` | 847 | P0 | Zaten segmented/tab standardı var; referans surface |
| `web/src/panels/company/WorkflowPanel.jsx` | 843 | P1 | Akış ve yardımcı bloklar |
| `web/src/panels/room/AgreementsPanel.jsx` | 825 | P1 | Sözleşme + route refresh + extend köprüleri |
| `web/src/panels/shared/CopilotPanel.jsx` | 825 | P0 | Terminal / drawer boundary korunmalı |
| `web/src/panels/room/OffersPanel.jsx` | 706 | P2 | Teklif odaklı ama daha kontrollü |
| `web/src/panels/room/roomVehiclesPanelSections.jsx` | 702 | P1 | Alt sekme / alt bölüm yoğunluğu |
| `web/src/panels/company/ShiftPeopleTab.jsx` | 695 | P1 | Atama, katılımcı ve bağlantı detayları |
| `web/src/panels/company/GeoReviewPanel.jsx` | 691 | P2 | İnceleme / kalite odaklı yardımcı ekran |
| `web/src/panels/driver/RoutePanel.jsx` | 676 | P0 | Durak sırası + ETA + helper detayları |
| `web/src/panels/company/MapPanel.jsx` | 659 | P1 | Harita + canlı seçim + detaylar |
| `web/src/panels/organization/PlansPanel.jsx` | 619 | P2 | Planlama / yardımcı bilgi yoğun |
| `web/src/panels/room/MapPanel.jsx` | 588 | P0 | Canlı takip + araç seçimi + ETA görünümü |
| `web/src/panels/parent/LivePanel.jsx` | 543 | P0 | Canlı takip + durak listeleri + harita |
| `web/src/panels/personel/LivePanel.jsx` | 525 | P0 | Canlı takip + ETA + timeline + harita |
| `web/src/panels/company/ShiftTemplatesPanel.jsx` | 525 | P2 | Şablon odaklı yardımcı yüzey |
| `web/src/panels/superadmin/PilotLaunchGatePanel.jsx` | 525 | P2 | Gating / kabul yüzeyi |
| `web/src/panels/company/shiftPeopleTabSections.jsx` | 523 | P2 | Yardımcı alt bölüm dosyası |
| `web/src/panels/superadmin/UsersPanel.jsx` | 519 | P2 | Yönetim paneli; daha çok liste odaklı |

## 3) P0 / P1 / P2 sınıflandırması

### P0
- Kritik özet ve ana aksiyonlar açık kalmalı.
- Eş düzey alt modlar tab / segmented button olmalı.
- İkincil bilgiler accordion altında toplanmalı.
- Örnek yüzeyler:
  - Room / Araçlar
  - Room / Sürücüler
  - Room / Ticari Akışım
  - Company / Sözleşmeler
  - Company / Ticari Akış
  - Super Admin / Operasyon Doğrulama
  - Parent / Canlı Takip
  - Personel / Canlı Takip
  - Room / Canlı Takip
  - Driver / Rota
  - Driver / Bugün
  - Shared / Copilot terminal yüzeyi

### P1
- Ekran uzunluğu yüksek ama ana özet kolay erişilebilir.
- Tab / accordion standardı faydalı ama daha az kritik.
- Örnek yüzeyler:
  - Super Admin / Ticari Akış
  - Room / Sözleşmeler
  - Company / Vardiyalar
  - Company / Workflow
  - Company / Harita
  - Room / Harita
  - Room / Shift panelleri

### P2
- Yardımcı modal, şablon, inceleme veya yönetim ekranları.
- Sonraki dalga için uygun; gerekirse tek accordion veya küçük bir section standardı yeterli.

## 4) Hep açık kalacak kritik alanlar

- Panel başlığı
- Kısa açıklama
- Seçili kayıt özeti
- Kritik durum / risk bandı
- Ana filtreler
- Ana tablo / liste
- Birincil aksiyonlar
- Canlı harita varsa seçili araç / seçili rota özeti

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
- Çok satırlı checklist / kontrol listeleri
- Route refresh / bridge detayları
- Yakın durak listeleri
- Shift duraklarının detayları
- İleri seviye ödeme / settlement blokları

## 6) Tab olarak kalacak eş düzey alt modlar

Aynı kaydın eş düzey alt modları accordion içine atılmamalı:
- Durum
- Yönetim
- Atamalar
- Müsaitlik
- Telematics
- Bağlantı
- Özet
- Liste
- Seçili Kayıt
- Duraklar
- Harita

## 7) Bu patchte düzenlenen paneller

- `web/src/components/PanelSegmentTabs.jsx`
- `web/src/index.css`
- `web/src/panels/room/CommercialFlowPanel.jsx`
- `web/src/panels/company/AgreementsPanel.jsx`
- `web/src/panels/company/CommercialFlowPanel.jsx`
- `web/src/panels/superadmin/OperationVerificationPanel.jsx`
- `web/src/panels/parent/LivePanel.jsx`
- `web/src/panels/personel/LivePanel.jsx`

## 8) Sonraya bırakılan paneller

- `web/src/panels/superadmin/CommercialCorePanel.jsx`
- `web/src/panels/company/ShiftsPanel.jsx`
- `web/src/panels/company/WorkflowPanel.jsx`
- `web/src/panels/company/MapPanel.jsx`
- `web/src/panels/company/ShiftPeopleTab.jsx`
- `web/src/panels/company/GeoReviewPanel.jsx`
- `web/src/panels/room/AgreementsPanel.jsx`
- `web/src/panels/room/ShiftsPanel.jsx`
- `web/src/panels/room/MapPanel.jsx`
- `web/src/panels/room/OffersPanel.jsx`
- `web/src/panels/room/OperationHealthPanel.jsx`
- `web/src/panels/organization/PlansPanel.jsx`
- `web/src/panels/company/ShiftTemplatesPanel.jsx`
- `web/src/panels/superadmin/PilotLaunchGatePanel.jsx`
- `web/src/panels/superadmin/UsersPanel.jsx`
- `web/src/panels/shared/CopilotPanel.jsx`

## 9) Notlar

- Room / Araçlar ve Room / Sürücüler yüzeyleri zaten segmented/tab standardı taşıdığı için bu dalgada korunup referans yüzey olarak bırakıldı.
- `Sefer Abi Terminali` ve sağ alttaki `Sefer Abi’ye Sor` bu milestone’da dokunulmaz.
- NavDock role/kind standardı bozulmaz.
- UX-COLLAPSIBLE-PANELS-01 ile kurulan summary-first + accordion standardı korunur; bu dalga onun üstüne tab/segmented bölüm standardı ekler.
- Runtime-data dosyalarına dokunulmadı.
