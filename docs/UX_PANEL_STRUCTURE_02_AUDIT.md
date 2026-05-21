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
- Veri katmanı sınırları korunur; bu audit yalnızca panel mimarisi kapsamındadır.

## UX-PANEL-STRUCTURE-02B

- Amaç: kalan P0 uzun panellerin ilk grubunu summary-first + segmented/tab + collapsible secondary detail standardına taşımak.
- Hedef yüzeyler:
  - `web/src/panels/superadmin/CommercialCorePanel.jsx`
  - `web/src/panels/room/VehiclesPanel.jsx`
  - `web/src/panels/room/DriversPanel.jsx`
  - `web/src/panels/company/ShiftsPanel.jsx`
  - `web/src/panels/room/MapPanel.jsx`
- Uygulanan düzen:
  - kritik özet ve ana aksiyonlar üstte açık bırakılır
  - eş düzey alt modlar `PanelSegmentTabs` ile bölünür
  - ikincil detaylar `CollapsibleSection` altında toplanır
- Kapsam notu:
  - `Sefer Abi Terminali`, `Sefer Abi’ye Sor`, NavDock ve ETA güvenli dil alanları korunur
  - backend ve veri modeli sınırları korunur; ürün davranışı değişmez

## Functional tab fix

- `check:uxpaneltabsfix01` ile `PanelSegmentTabs` artık `onChange`, `onSelect` ve click callback desteğiyle işlevsel panel navigation sağlar.
- `CommercialCorePanel` ticari akış sekmelerini ilgili bölüm başlıklarına scroll/focus ile bağlar; sekmeler dekoratif buton olarak kalmaz.
- `Room / Ticari Akışım`, `Company / Ticari Akış` ve `Sözleşmeler` tarafındaki mevcut functional tab davranışı korunur.
- `Room/MapPanel` sekmeleri scroll/focus ile ilgili bölümlere odaklanır; `CompanyShiftsPanelIntro` create/track ayrımını görünür şekilde taşır.
- Bu düzeltme summary-first + collapsible standardını bozmaz; yalnızca sekme davranışını işlevsel hale getirir.

## UX-PANEL-LAYOUT-WIDTH-02C-FIX-01

- `check:uxpanellayoutwidth02cfix01` `Room / Ticari Akışım` kabuğunu geniş dashboard clamp'i ve dengeli split grid ile açar.
- Kritik özet, sekmeler, ana tablo ve seçili kayıt açık kalırken geniş ekranlarda sağ-sol boşluk daha kontrollü olur.
- `PanelSegmentTabs` ve functional tab davranışı korunur; `Room / Ticari Akışım` artık 1600px üst sınırına kadar daha ferah görünür.
- Bu düzeltme UX-PANEL-STRUCTURE-02 / 02B ve UX-PANEL-REALITY-AUDIT-02C zincirini bozmaz; ürün davranışı değiştirmez.

## UX-PANEL-LAYOUT-WIDTH-02C-FIX-02

- `check:uxpanellayoutwidth02cfix02` Room / Ticari Akışım için centered max-width davranışını kaldırır ve gerçek full-width dashboard kabuğunu doğrular.
- Ana içerik app content alanına mümkün olduğunca yayılır; split yapı sol 1fr, sağ clamp(340px, 24vw, 460px) kolon standardına oturur.
- Duplicate KPI/summary blokları kaldırılır; üstteki ana KPI bandı tek kaynak kalır.
- Bu adım, gerçek iş sekmelerine geçiş için full-width kabuğu hazırlar; son durumda `İlk adım` / `Özet` sekmesi kaldırılıp `Sözleşme & Vardiya` default yüzey haline getirilir.
- Sekme davranışı işlevsel kalır; kritik özet, ana tablo ve seçili kayıt görünür kalır.
- Bu düzeltme UX-PANEL-STRUCTURE-02B, UX-PANEL-REALITY-AUDIT-02C ve UX-PANEL-LAYOUT-WIDTH-02C-FIX-01 zincirini bozmaz; ürün davranışını değiştirmez.

## UX-PANEL-LAYOUT-WIDTH-02C-FIX-03

- `check:uxpanellayoutwidth02cfix03` Room / Ticari Akışım içindeki `İlk adım` / `Özet` sekmesini tamamen kaldırır.
- Default görünüm `Sözleşme & Vardiya` olur; üst KPI bandı tek ana özet olarak kalır.
- Sağ kolon seçili kayıt, hızlı erişim ve sekme rehberi alanlarının tek sahibi olur; ana alanda tekrar eden seçili kayıt / hızlı erişim blokları gösterilmez.
- Bu düzeltme UX-PANEL-LAYOUT-WIDTH-02C-FIX-02 ve functional tab akışını bozmadan görünür tekrarları kaldırır; ürün davranışını değiştirmez.

## UX-PANEL-REALITY-CLEANUP-02D

- `check:uxpanelrealitycleanup02d` Room / Sözleşmeler panelini gerçek tab mimarisine taşır: Operasyon Köprüsü, Rota Talepleri, Uygulanan Rota, Uzatma Talepleri, Bekleyen ve Diğer Sözleşmeler ayrı görünür.
- Üst bilgi bandı yalnızca yeni talep / karar yönlendirmesi yapar; detay tablosunu tekrar etmez ve CTA ile ilgili taba geçirir.
- Bu follow-up, Room / Ticari Akışım ve Room / Canlı Takip üzerinde kurulu summary-first + functional tab standardını bozmaz; yalnızca Room / Sözleşmeler için tablo-merkezli uzun akışı kırar.
- Ürün davranışı değişmez; sözleşme kabul / red / karşı teklif / rota önizleme / uzatma aksiyonları aynı kalır.

## UX-ROOM-OPS-PANEL-TABS-01

- `check:uxroomopspaneltabs01` Oda Operasyon Paneli içindeki uzun alt blokları gerçek tab yapısına taşır; Şartlı Küme, Oda Operasyon Özeti, Sorunlu Sürücüler ve Açık Sorunlar aynı anda alt alta görünmez.
- Üst mini özet, filtre ve sayaç bandı açık kalır; seçilen sekmenin içeriği tek başına render edilir.
- Bu düzeltme UX-COLLAPSIBLE-PANELS-01, UX-PANEL-STRUCTURE-02, UX-PANEL-STRUCTURE-02B ve UX-PANEL-REALITY-CLEANUP-02D zincirini bozmaz; ürün davranışını değiştirmez.

## UX-ROOM-SHIFTS-TABS-01

- `check:uxroomshiftstabs01` Room / Vardiyalar ekranını üç gerçek taba böler: Bekleyen Talepler, Sözleşmeden Üretilen ve Diğer Vardiyalar.
- Üst KPI bandı açık kalır; Bekleyen Talepler ile Tüm Vardiyalar gibi tek uzun akış yerine seçili tabın içeriği tek başına render edilir.
- Bu düzenleme UX-PANEL-STRUCTURE-02, UX-PANEL-STRUCTURE-02B, UX-ROOM-OPS-PANEL-TABS-01 ve UX-PANEL-REALITY-CLEANUP-02D zincirini bozmaz; ürün davranışını değiştirmez.

## UX-COMPANY-OPS-PANEL-TABS-01

- `check:uxcompanyopspaneltabs01` Company / Operasyon Paneli'ni gerçek tab yapısına taşır; Özet, Servis Kümesi, Personel, Servis Zamanları, İstisnalar / Değişiklikler ve Bildirimler aynı anda alt alta görünmez.
- Üst KPI / durum bandı ve bildirim yönlendirme bandı açık kalır; bildirim CTA'sı ilgili taba geçirir ve detaylar yalnızca Bildirimler sekmesinde render edilir.
- İstisnalar / Değişiklikler tabı, eksik değişiklikleri, bugün servis kullanmayacak personelleri ve farklı duraktan binecek personelleri tek bölümde toplar.
- Bu düzeltme UX-COLLAPSIBLE-PANELS-01, UX-PANEL-STRUCTURE-02, UX-PANEL-STRUCTURE-02B ve UX-PANEL-REALITY-CLEANUP-02D zincirini bozmaz; ürün davranışını değiştirmez.

## UX-COMPANY-SHIFTS-TABS-01

- `check:uxcompanyshiftstabs01` Company / Vardiyalar ekranını track-only yapıda dört gerçek taba böler; Market, Bekleyen, Sözleşmeden Üretilen ve Diğer Vardiyalar aynı anda alt alta görünmez.
- `Oluşturma`, `Liste` ve `Planlama Merkezi` tekrarları bu ekrandan kaldırılır; üstte yalnızca takip özet bandı ve kompakt filtre kalır.
- Bu düzeltme UX-ROOM-SHIFTS-TABS-01, UX-COMPANY-OPS-PANEL-TABS-01, UX-PANEL-STRUCTURE-02B ve UX-PANEL-REALITY-CLEANUP-02D zincirini bozmaz; ürün davranışını değiştirmez.

## UX-COMPANY-QUALITY-PANEL-TABS-01

- `check:uxcompanyqualitytabs01` Company / Hizmet Değerlendirme ekranını summary-first + functional tab standardına taşır; Özet, Kanıt / Hazırlık, Taslak Skor, İnceleme Kararı, Geçmiş ve Değerlendirme Alanları aynı anda alt alta görünmez.
- Üst KPI / durum bandı ve değerlendirme bekleyen bilgi bandı açık kalır; CTA ilgili taba geçirir ve detaylar yalnız seçili sekmede render edilir.
- Bu düzenleme UX-COMPANY-OPS-PANEL-TABS-01, UX-COMPANY-SHIFTS-TABS-01, UX-ROOM-SHIFTS-TABS-01, UX-PANEL-REALITY-CLEANUP-02D ve UX-PANEL-STRUCTURE-02B zincirini bozmaz; ürün davranışını değiştirmez.

## UX-SEFER-ABI-LAUNCHER-01

- `check:uxseferabilauncher01` sağ alttaki Sefer Abi’ye Sor launcher’ını marka/persona odaklı kompakt karta çevirir; kapalı halde yalnız launcher görünür, chat içeriği görünmez.
- Drawer açıldığında mevcut 3 kademe boyut korunur; varsayılan açılış küçük/orta çizgide kalır ve büyük boyut launcher’dan tetiklenmiş olsa bile ilk durumda agresif açılmaz.
- Bu düzenleme UX-COPILOT-PERSONA-01, UX-COPILOT-TERMINAL-01, UX-COPILOT-SMART-CHIPS-01 ve UX-NAV-01 zincirini bozmaz; ürün davranışını değiştirmez.

## UX-COMPANY-PANELS-FINAL-POLISH-01

- `check:uxcompanypanelsfinalpolish01` Company / Vardiyalar, Sözleşmeler ve Ticari Akış yüzeylerini son gerçeklik düzeltmesiyle hizalar.
- `Company / Vardiyalar` default olarak `Diğer Vardiyalar` tabını açar; ana vardiya alanı kapalı başlamaz ve create / list / planning-center tekrarları görünmez.
- `Company / Vardiyalar` içindeki Market, Bekleyen, Sözleşmeden Üretilen ve Diğer Vardiyalar accordion başlıkları varsayılan açık gelir; takip yüzeyi ilk bakışta kapalı blok bırakmaz.
- `Company / Sözleşmeler` default `Liste` ile açılır; boş ya da anlamsız özet yüzeyi kaldırılır ve operasyon bağlantısı artık ayrı summary shell yerine ilgili iş tablarında taşınır.
- `Company / Ticari Akış` tek sayfa split layout’a döner; Özet / Liste / Seçili Kayıt tabları kaldırılır, liste ve seçili kayıt aynı viewport içinde tek kaynaklı render edilir.
- `Company / Ticari Akış` satır aksiyonları artık agreement-bağlı final kayıtları `Sözleşmeden Üretilen` veya `Diğer Vardiyalar` yüzeyine yönlendirir; misleading `Listeyi aç` dili kaldırılır.
- Bu final polish, UX-COMPANY-SHIFTS-TABS-01, UX-COMPANY-OPS-PANEL-TABS-01, UX-COMPANY-QUALITY-PANEL-TABS-01, UX-ROOM-SHIFTS-TABS-01 ve UX-PANEL-REALITY-CLEANUP-02D zincirini bozmaz; ürün davranışını değiştirmez.

## UX-SCHOOL-ORGANIZATION-PANELS-01

- `check:uxschoolorganizationpanels01` School / Okul Operasyon Paneli'ni summary-first + functional tab standardına taşır; `Özet`, `Öğrenci Servisleri`, `Veli & Bildirimler`, `İstisnalar / Günlük Değişiklikler`, `Kanıt / Check-in` ve `Geçmiş` aynı anda alt alta görünmez.
- `School / Vardiyalar` başlığı role-aware hale gelir; `Okul Vardiyaları` ve `Kurum Vardiyaları` label'ları School / Organization scope'a sızmadan doğru bağlamı gösterir.
- Organization yüzeylerinde görünen `Lokasyon` kopyası `Konum` standardına çekilir; `Kurum Merkezi`, `Toplanma Konumu` ve ilgili plan/özet label'ları yanlış role metni üretmez.
- Bu not, UX-ROOM-OPS-RELATIONSHIP-POLISH-01, UX-COMPANY-PANELS-FINAL-POLISH-01, UX-ROOM-SHIFTS-TABS-01 ve UX-COMPANY-SHIFTS-TABS-01 zincirini bozmaz; ürün davranışını değiştirmez.

## UX-ROOM-OPS-RELATIONSHIP-POLISH-01

- `check:uxroomopsrelationshippolish01` `Room / Operasyon Sağlığı` içindeki `Sorunlu Sürücüler` ve `Açık Sorunlar` görünümünü tek sorun bağlamında toplar; ekran iki ayrı sorun sekmesine bölünmez.
- `Room / Araçlar` bağlantı yönetiminin tek sahibi olur; seçili araç mevcut bağlı sürücüyü önceden doldurur ve bağlantı akışı güvenli okunur / bağlanır modelini korur.
- `Room / Sürücüler` duplicate bağlantı formunu kaldırır; bağlı araç yalnızca readonly özet ve araçlar ekranına yönlendiren CTA olarak görünür.
- Visible `Hub` copy, role / ekran bağlamına göre `Oda Konumu` ve `Toplanma Konumu` gibi Türkçe label'lara çevrilir; teknik field adları iç yüzeyde kalır.
- Bu polish, `UX-ROOM-OPS-PANEL-TABS-01`, `UX-ROOM-SHIFTS-TABS-01`, `UX-PANEL-REALITY-CLEANUP-02D` ve `UX-COMPANY-PANELS-FINAL-POLISH-01` zincirini bozmaz; ürün davranışını değiştirmez.

## UX-SUPERADMIN-OVERVIEW-CLEANUP-01

- `check:uxsuperadminoverviewcleanup01` Süper Yönetici Genel Bakış ekranını summary-first dashboard yapısına taşır.
- `Hızlı erişim`, `Özet` ve `Bölüm rehberi` ana dashboardta kalır; `Geri Bildirimler`, `Demo / Debug` ve `Sistem Detayları` alt functional alanlara taşınır.
- `Kritik geri bildirim` bandı üstte kompakt görünür ve CTA ile geri bildirim detay alanını açar; ana sayfa uzun listeye dönüşmez.
- Bu cleanup, `UX-COMPANY-PANELS-FINAL-POLISH-01`, `UX-COMPANY-QUALITY-PANEL-TABS-01`, `UX-COMPANY-SHIFTS-TABS-01`, `UX-ROOM-SHIFTS-TABS-01` ve `UX-PANEL-REALITY-CLEANUP-02D` zincirini bozmaz; ürün davranışını değiştirmez.

## UX-SUPERADMIN-LIVE-MONITORING-01

- `check:uxsuperadminlivemonitoring01` Süper Admin / Canlı İzleme ekranını summary-first monitoring dashboard yapısına taşır.
- `Canlı Sağlık ve Risk Özeti` üstte kalır; `Özet`, `Canlı Akış`, `Alarmlar & Riskler`, `İzlenen Olaylar`, `Sistem Kanıtı` ve `Geçmiş / Log` gerçek tablar halinde ayrılır.
- `KVKK / alarm` bandı üstte kompakt görünür; uzun canlı akış ve olay listeleri ana sayfayı işgal etmez.
- Bu cleanup, `UX-SUPERADMIN-OVERVIEW-CLEANUP-01`, `UX-COMPANY-PANELS-FINAL-POLISH-01`, `UX-SCHOOL-ORGANIZATION-PANELS-01` ve `UX-PANEL-REALITY-CLEANUP-02D` zincirini bozmaz; ürün davranışını değiştirmez.
