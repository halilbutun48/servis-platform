# UX-PANEL-REALITY-AUDIT-02C

Tarih: 2026-05-20  
Repo: `servis-platform`  
Branch snapshot: `m90d1_web_lint_inventory`

## 1) Taranan panel listesi

Tarama kapsamı:
- `web/src/panels/**/*.jsx`
- `web/src/components/**/*.jsx`
- `web/src/layout/NavDock.jsx`
- `web/src/App.jsx` route / lazy bağlantıları
- `web/src/components/PanelSegmentTabs.jsx`
- `web/src/components/CollapsibleSection.jsx`

Static reality summary:
- `105` panel-related JSX dosyası repo envanterinde var.
- `12` yüzey `PanelSegmentTabs` kullanıyor.
- `18` yüzey bu reality audit tablosunda tek tek sınıflandırıldı.
- 0 code-confirmed cosmetic-only tab bulundu.
- 3 focus-model watchlist yüzey browser / DOM smoke için tutuldu; bu yüzeylerde scroll/focus davranışı ekranın net şekilde değiştiğini hissettirmeli.

## 2) Panel reality matrix

| Panel dosyası | Rol / kind | Menü adı | PanelSegmentTabs? | Tab gerçekten functional mı? | Model | Hâlâ uzun scroll var mı? | Room/Araçlar standardı | Öncelik | Önerilen düzeltme |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `web/src/panels/superadmin/CommercialCorePanel.jsx` | SUPER_ADMIN | Ticari Akış | Evet | Evet | section focus / anchor | Evet | Kısmi | P0 | Focus-model hareketi browser smoke ile doğrulanmalı; gerekirse Proof / Risk / History daha küçük parçalara ayrılmalı. |
| `web/src/panels/room/VehiclesPanel.jsx` | ROOM | Araçlar | Evet | Evet | conditional render | Evet | Evet | P0 | Referans yüzey; summary-first yapı korunmalı. |
| `web/src/panels/room/DriversPanel.jsx` | ROOM | Sürücüler | Evet | Evet | conditional render | Evet | Evet | P0 | Referans yüzey; summary-first yapı korunmalı. |
| `web/src/panels/room/CommercialFlowPanel.jsx` | ROOM | Ticari Akışım | Evet | Evet | conditional render | Evet | Kısmi | P0 | Sekmeler gerçek render değiştiriyor; üstteki özet kartları hep açık kalmalı. |
| `web/src/panels/company/CommercialFlowPanel.jsx` | COMPANY | Ticari Akış | Evet | Evet | conditional render | Evet | Kısmi | P1 | Liste / seçili kayıt ayrımı korunmalı; gerekirse daha sıkı segment bölünmesi yapılabilir. |
| `web/src/panels/company/AgreementsPanel.jsx` | COMPANY | Sözleşmeler | Evet | Evet | conditional render + collapsible | Evet | Kısmi | P0 | Sözleşme, bridge ve wizard blokları açık özet + ayrı detay standardında kalmalı. |
| `web/src/panels/company/ShiftsPanel.jsx` | COMPANY | Vardiyalar | Evet | Evet | hybrid composer | Evet | Kısmi | P1 | Ana wrapper tab davranışı doğru; Intro / Track composer akışı korunmalı. |
| `web/src/panels/company/CompanyShiftsPanelIntro.jsx` | COMPANY | Vardiyalar | Evet | Evet | conditional render | Hayır / Orta | Kısmi | P1 | Track / create ayrımı gerçek; create branch only-on-demand kalmalı. |
| `web/src/panels/company/CompanyShiftsPanelTrackView.jsx` | COMPANY | Vardiyalar | Evet | Evet | section focus + hidden sections | Evet | Kısmi | P1 | Track / market / pending / list geçişi browser smoke ile netleştirilmeli. |
| `web/src/panels/room/MapPanel.jsx` | ROOM | Canlı Takip | Evet | Evet | section focus / anchor | Evet | Kısmi | P0 | Focus-model hareketi görünür; sekme basışında net odak değişimi smoke ile doğrulanmalı. |
| `web/src/panels/parent/LivePanel.jsx` | PARENT | Canlı | Evet | Evet | conditional render + collapsible | Evet | Hayır | P1 | Harita / durak listesi açık, ikincil listeler collapsible; metin sade kalmalı. |
| `web/src/panels/personel/LivePanel.jsx` | PERSONEL | Canlı | Evet | Evet | conditional render | Evet | Hayır | P1 | Timeline / harita ayrımı korunmalı; özet hep açık kalmalı. |
| `web/src/panels/superadmin/OperationVerificationPanel.jsx` | SUPER_ADMIN | Operasyon Doğrulama | Evet | Evet | conditional render | Evet | Hayır | P1 | Rol seçimi içerik değiştiriyor; uzun tablo nedeniyle daraltma sonraya kalabilir. |
| `web/src/panels/room/OperationHealthPanel.jsx` | ROOM | Operasyon Sağlığı | Hayır | Hayır | accordion-only | Evet | Hayır | P1 | Özet açık, ikinci seviye detaylar collapsible altında kalmalı. |
| `web/src/panels/driver/RoutePanel.jsx` | DRIVER | Rota | Hayır | Hayır | accordion-only | Evet | Hayır | P0 | Rota / ETA / son bilinen durum sade özet + kollapsibl detay standardında kalmalı. |
| `web/src/panels/driver/TodayPanel.jsx` | DRIVER | Bugün | Hayır | Hayır | accordion-only | Evet | Hayır | P1 | Görev özeti açık, yardımcı detaylar collapsible altında kalmalı. |
| `web/src/panels/shared/CopilotPanel.jsx` | SHARED | Sefer Abi Terminali | Hayır | Hayır | drawer / terminal boundary | Evet | Hayır | P0 | Terminal boundary korunmalı; bu yüzey yeni sekme standardına zorlanmamalı. |
| `web/src/panels/company/MapPanel.jsx` | COMPANY | Harita | Hayır | Hayır | accordion-only | Evet | Hayır | P1 | Harita + seçili kayıt açık, ikincil detaylar kapalı kalmalı. |

## 3) PanelSegmentTabs kullanılan yüzeyler

Bu dosyalar kod seviyesinde gerçek tab davranışı taşıyor:
- `web/src/panels/superadmin/CommercialCorePanel.jsx`
- `web/src/panels/room/VehiclesPanel.jsx`
- `web/src/panels/room/DriversPanel.jsx`
- `web/src/panels/room/CommercialFlowPanel.jsx`
- `web/src/panels/company/CommercialFlowPanel.jsx`
- `web/src/panels/company/AgreementsPanel.jsx`
- `web/src/panels/company/ShiftsPanel.jsx`
- `web/src/panels/company/CompanyShiftsPanelIntro.jsx`
- `web/src/panels/company/CompanyShiftsPanelTrackView.jsx`
- `web/src/panels/room/MapPanel.jsx`
- `web/src/panels/parent/LivePanel.jsx`
- `web/src/panels/personel/LivePanel.jsx`
- `web/src/panels/superadmin/OperationVerificationPanel.jsx`

Supporting composer notları:
- `web/src/panels/company/CompanyShiftsPanelIntro.jsx` track / create ayrımını gerçek render ile taşır.
- `web/src/panels/company/CompanyShiftsPanelTrackView.jsx` market / pending / list geçişini section focus + görünürlük ile taşır.

## 4) Functional / cosmetic / focus verdict

Static scan sonucu:
- Functional tab: `12`
- Focus-model watchlist: `3`
- Accordion-only: `5`
- Cosmetic-only (code-confirmed): `0`
- Hâlâ uzun scroll: `14`

Cosmetic-only risk watchlist:
- `web/src/panels/superadmin/CommercialCorePanel.jsx`
- `web/src/panels/room/MapPanel.jsx`
- `web/src/panels/company/CompanyShiftsPanelTrackView.jsx`

Bu üç yüzey kodda işlevsel görünse de, gerçek kullanıcı algısı sekme basışında yeterince net hareket vermiyorsa dekoratif hissedebilir. Bu yüzden browser / DOM smoke önerilir.
Bu watchlist özellikle scroll/focus değişiminin açıkça görülebildiği yüzeyleri kapsar.

## 5) P0 / P1 / P2

### P0
- `web/src/panels/superadmin/CommercialCorePanel.jsx`
- `web/src/panels/room/VehiclesPanel.jsx`
- `web/src/panels/room/DriversPanel.jsx`
- `web/src/panels/room/CommercialFlowPanel.jsx`
- `web/src/panels/company/AgreementsPanel.jsx`
- `web/src/panels/room/MapPanel.jsx`
- `web/src/panels/driver/RoutePanel.jsx`
- `web/src/panels/shared/CopilotPanel.jsx`

### P1
- `web/src/panels/company/CommercialFlowPanel.jsx`
- `web/src/panels/company/ShiftsPanel.jsx`
- `web/src/panels/company/CompanyShiftsPanelIntro.jsx`
- `web/src/panels/company/CompanyShiftsPanelTrackView.jsx`
- `web/src/panels/parent/LivePanel.jsx`
- `web/src/panels/personel/LivePanel.jsx`
- `web/src/panels/superadmin/OperationVerificationPanel.jsx`
- `web/src/panels/room/OperationHealthPanel.jsx`
- `web/src/panels/driver/TodayPanel.jsx`
- `web/src/panels/company/MapPanel.jsx`

### P2
- `web/src/panels/company/WorkflowPanel.jsx`
- `web/src/panels/company/GeoReviewPanel.jsx`
- `web/src/panels/room/OffersPanel.jsx`
- `web/src/panels/room/ShiftsPanel.jsx`
- `web/src/panels/superadmin/ObservabilityPanel.jsx`
- `web/src/panels/superadmin/FieldAcceptanceCenter.jsx`
- `web/src/panels/organization/PlansPanel.jsx`
- `web/src/panels/superadmin/UsersPanel.jsx`

## 6) Referans standardı

`Room / Araçlar` ve `Room / Sürücüler` yüzeyleri gerçek segmented/tab standardının referansıdır.

Tam uyumlu yüzeyler:
- `web/src/panels/room/VehiclesPanel.jsx`
- `web/src/panels/room/DriversPanel.jsx`

Yakın ama tam aynı olmayan yüzeyler:
- `web/src/panels/room/CommercialFlowPanel.jsx`
- `web/src/panels/company/CommercialFlowPanel.jsx`
- `web/src/panels/company/AgreementsPanel.jsx`
- `web/src/panels/superadmin/CommercialCorePanel.jsx`
- `web/src/panels/room/MapPanel.jsx`

## 7) Browser / DOM smoke notu

Bu workspace içinde headless browser paketi bulunmadığı için gerçek click / tabpanel smoke çalıştırılmadı.

UX-LIVE-MAP-TABS-FIX-01 notu:
- `web/src/panels/room/MapPanel.jsx` için live-map sekmeleri gerçek tab render standardına geçirildi.
- Sekme tıklaması gerçekten içerik değiştirir; Harita ve Araçlar ana yüzeyler olarak kalır.
- Harita sekmesi büyük harita alanını ve canlı listeyi birlikte gösterir.
- GPS / ETA güvenli wording korunur.
- `bus.svg` marker referansı korunur.

UX-LIVE-MAP-TABS-SIMPLIFY-01 notu:
- `web/src/panels/room/MapPanel.jsx` tab yüzeyi Harita / Araçlar'a sadeleştirildi.
- `Özet`, `Rota / Durak`, `GPS Durumu`, `Riskler`, `Geçmiş` ayrı tab olmaktan çıkarıldı.
- Bu bilgiler Harita görünümünde kısa badge, mini özet ve kısa geçmiş satırı olarak korunur.
- Panel artık aynı anda çoklu alt blok yerine tek ana harita akışı gösterir.

Bu yüzden:
- code-confirmed functional tab yüzeyleri belirlendi,
- focus-model yüzeyler watchlist'e alındı,
- dekoratif-only risk kod seviyesinde görülmedi.

## 8) Sonuç

- `UX-PANEL-STRUCTURE-02B` kod seviyesi açısından commit-ready görünür.
- Ancak `CommercialCorePanel`, `Room / Canlı Takip` ve `CompanyShiftsPanelTrackView` için browser smoke önerilir.
- `Room / Araçlar` ve `Room / Sürücüler` referans standardı korunur.
- `NavDock`, `Sefer Abi Terminali` ve `Sefer Abi’ye Sor` sınırları bu audit kapsamında korunur.

## UX-PANEL-REALITY-CLEANUP-02D follow-up

- Room / Sözleşmeler stacked long-page görünümünden gerçek tab mimarisine taşınır.
- Operasyon Köprüsü, Rota Talepleri, Uygulanan Rota, Uzatma Talepleri, Bekleyen ve Diğer Sözleşmeler ayrı render edilir; aynı viewport içinde aynı amaçlı detaylar tekrar etmez.
- Üst bilgi bandı yalnızca yönlendirme / uyarı katmanı olarak kalır; detay tablosunu tekrar etmez.
- Bu follow-up, PanelSegmentTabs gerçek functional tab standardını bozmadan room agreements yüzeyini okunur ve tek kaynaklı hale getirir.
