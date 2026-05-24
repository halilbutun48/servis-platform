# COPILOT PANEL CONTEXT AUDIT V1

Tarih: 2026-05-15  
Repo: `servis-platform`  
Branch snapshot: `m90d1_web_lint_inventory`  
Audit snapshot: `HEAD 258f510` / tag `v2026.05.13-cop04afix04-quick-help-contract-route`

## Amaç
- Bu audit, Copilot panel-context / facts / selectedRecord köprüsünü repo genelinde tarar.
- Amaç bug fix yapmak değil, context parity ve fallback risklerini görünür kılmaktır.
- Bu audit product behavior değiştirmez.

## Kapsam
- Frontend Copilot/Hızlı Yardım panel köprüleri.
- `copilotFacts` ve agreement/flow/map/health helper’ları.
- Backend intent router, help composer, answer quality policy, screen state analyzer.
- Backend route fallback ve validation error davranışı.
- Check chain, package script ve milestone rehberi.

## COP-LIVE-ACCEPT-01 kapsam notu
- Bu canlı kabul matrisi `ROOM`, `COMPANY`, `DRIVER`, `PARENT`, `PERSONEL` ve `SUPER_ADMIN` yüzeylerinde Sefer Abi / Copilot çağrı bağlamını statik olarak izler.
- Kapsamda `Canlı Takip`, `Operasyon Sağlığı`, `Sözleşmeler`, `Vardiyalar`, `Ticari Akış`, `Bugün`, `Rota`, `Canlı İzleme` ve `Saha Kabul Merkezi` yüzeyleri bulunur.
- `Sefer Abi` persona/launcher, `screenContext` payload köprüsü, GPS/ETA safe wording ve payment/settlement execute yokluğu readonly kabul olarak korunur.
- Bu not product behavior değiştirmez.

## BOARDING-OPS-01A kapsam notu
- Bu readonly önizleme `Company / Operasyon Paneli`, `Company / Vardiyalar`, `School / Operasyon Paneli` ve gerekli görülen `Room / Operasyon Sağlığı` yüzeylerinde günlük biniş değişikliklerinin rota etkisini okur.
- `NO_SERVICE_TODAY`, `ALTERNATE_STOP_TODAY` ve `TEMPORARY_BOARDING_NOTE` değişiklik türleri kişi / durak / km / süre / kapasite etkileriyle birlikte görünür; değişiklik uygulanmaz.
- `StopAssignment` write, driver route refresh, SMS ve notification send bu milestone kapsamı dışındadır.
- Bu not product behavior değiştirmez; sonraki accepted change ve route refresh milestone'ları ayrıştırılır.

## BOARDING-OPS-01B kapsam notu
- Bu uygulama taslağı kabul edilmiş boarding change kaydını yalnızca açık kullanıcı aksiyonu ile günlük `StopAssignment` etkisine bağlar; `Company / Operasyon Paneli`, `Company / Vardiyalar`, `School / Operasyon Paneli` ve `Room / Operasyon Sağlığı` yüzeylerinde görünür.
- `NO_SERVICE_TODAY` shift-scoped etki, `ALTERNATE_STOP_TODAY` geçici durak etkisi, `TEMPORARY_BOARDING_NOTE` ise not/audit bağlamı olarak ele alınır; idempotency guard ve audit izi korunur.
- Driver route refresh, SMS / notification, payment / settlement execute ve schema / migration bu milestone kapsamı dışındadır; route refresh sonraki `BOARDING-OPS-01C` adımına bırakılır.
- Bu not product behavior değiştirmez; yalnızca kabul edilmiş değişiklikten günlük atamaya giden dar yolu tarif eder.

## BOARDING-OPS-01C kapsam notu
- Bu aşama kabul edilmiş ve günlük atamaya işlenmiş boarding change etkisini `Driver / Bugün` ve `Driver / Rota` yüzeylerinde readonly görünür hale getirir; harita yüzeyi bu milestone için zorunlu değildir ve route refresh durumu kalıcı rota değişimi olmadan gösterilir.
- `NO_SERVICE_TODAY`, `ALTERNATE_STOP_TODAY` ve `TEMPORARY_BOARDING_NOTE` sürücü tarafında günlük değişiklik etiketi olarak okunur; SMS / push yok ve kalıcı atama korunur.
- `mobile route update` burada yeni write kanalı değil, sürücü ekranında görünen güvenli route-refresh sinyalinin adıdır.
- Bu not product behavior değiştirmez; yalnızca günlük atama etkisinin sürücü yüzeyinde nasıl izlendiğini tarif eder.

## ROUTE-CHANGE-FINAL-01 kapsam notu
- Bu final kabul akışı `Company / Sözleşmeler` ve `Room / Sözleşmeler` yüzeylerinde sözleşmeye bağlı rota güncelleme teklifini, karşı teklifi, kabul / red / tekrar kontrol durumunu ve eski/yeni rota farkını statik olarak izler.
- `Personel ekleme`, `personel çıkarma` ve `personel değişme` etkileri yalnızca rota farkı, kişi / durak / km / süre metrikleri ve uygulanan rota geçmişi üzerinden okunur; driver route refresh bu milestone kapsamında değildir.
- `Sefer Abi` persona/launcher, safe answer wording, payment / settlement execute yokluğu ve raw internal/debug/OperationProof sızıntısının olmaması korunur.
- Bu not product behavior değiştirmez; yalnızca sözleşme kaynaklı rota değişikliği final kabul yüzeyini tarif eder.

## DYNAMIC-SAVINGS-01 kapsam notu
- Bu readonly tasarruf önizlemesi `Company / Sözleşmeler`, `Company / Ticari Akış`, `Room / Sözleşmeler` ve `Room / Ticari Akış` yüzeylerinde rota change, boarding ve agreement delta sinyallerini kullanır.
- Km tasarrufu, süre tasarrufu, kapasite etkisi ve yaklaşık maliyet etkisi önizleme olarak okunur; `Tasarruf hesabı için yeterli veri yok` güvenli fallback'i korunur.
- Route apply, ödeme, settlement, SMS, push ve driver refresh bu milestone kapsamında değildir; Sefer Abi yalnızca readonly tasarruf sinyalini açıklar.
- Bu not product behavior değiştirmez; yalnızca tasarruf önizleme görünürlüğünü tarif eder.

## Yöntem
- Panel dosyaları ve Copilot helper zinciri statik olarak tarandı.
- Hızlı Yardım üst bağlamı ile serbest chat route ayrışması için risk yüzeyleri not edildi.
- Canlı testlerde görülen P0/P1/P2 örnekleri referans alındı.

## Canli bulgulardan cikan problem tanimi
- `Firma / Sözleşmeler` ekranında üst bağlam `Üretilen vardiya: 3 / Son üretilen vardiya #7 / Bugün üretim: Var` diyorken serbest Copilot cevabı `Bunu anlayamadım` fallback'ine düştü.
- `Oda / Canlı Takip` ekranında `34ABC123`, `GPS Zayıf/STALE`, `Son GPS 47s`, `Sıradaki Pickup 6`, `Toplam Durak 6`, `ETA 619dk` varken Copilot `seçili araç bilgisi net görünmüyor` diyebildi.
- `Oda / Operasyon Sağlığı` ekranında somut sinyaller vardı ama chipler generic kalabildi.
- Hakediş akışında `Hazır değil` ve `Eksik bilgi: 0` çelişkisi riski görüldü.
- Vardiya akışında atanmış kayıtta `Eksik araç/sürücü` kesin neden gibi görünebildi.

## Selected Context Parity Standard
- Aynı ekranda üst bağlam summary ve serbest chat answer route aynı seçili bağlamı görmelidir.
- `screenPath`, `screenTitle`, `selectedRecord`, `selectedLabel`, `selectedSummary`, `selectedFields`, `selectedBadges` ve `structuredFacts` birlikte taşınmalıdır.
- `Hızlı Yardım` üst bağlamı ile `chat` cevabı farklı bağlamlar gibi davranmamalıdır.
- `Bunu anlayamadım` fallback'i workflow sorularında son çare olmalı, ilk davranış olmamalıdır.

## Role-wide panel matrix

| Rol | Canlı takip / harita | Vardiyalar | Sözleşmeler | Ticari Akış / Hakediş | Operasyon Sağlığı / Doğrulama | Güven / Kalite | KVKK / rol boundary | Geri Bildirim | Bildirimler | Personel / Veli canlı takip | Sürücü bugünkü görev |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SUPER_ADMIN | OK | PARTIAL | PARTIAL | OK | OK | OK | PARTIAL | PARTIAL | PARTIAL | UNKNOWN | UNKNOWN |
| ROOM / ODA | OK | OK | PARTIAL | PARTIAL | OK | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL |
| COMPANY / FIRMA | PARTIAL | PARTIAL | OK | PARTIAL | PARTIAL | UNKNOWN | PARTIAL | PARTIAL | PARTIAL | PARTIAL | UNKNOWN |
| SCHOOL / OKUL | PARTIAL | MISSING | MISSING | MISSING | PARTIAL | UNKNOWN | PARTIAL | PARTIAL | PARTIAL | OK / PARTIAL | MISSING |
| ORGANIZATION | PARTIAL | PARTIAL | PARTIAL | PARTIAL | PARTIAL | UNKNOWN | PARTIAL | PARTIAL | PARTIAL | UNKNOWN | UNKNOWN |
| DRIVER | OK | OK | MISSING | MISSING | MISSING | UNKNOWN | PARTIAL | PARTIAL | PARTIAL | MISSING | OK |
| PERSONEL | PARTIAL | MISSING | MISSING | MISSING | MISSING | UNKNOWN | PARTIAL | PARTIAL | PARTIAL | OK | MISSING |
| PARENT / VELI | PARTIAL | MISSING | MISSING | MISSING | MISSING | UNKNOWN | PARTIAL | PARTIAL | PARTIAL | OK | MISSING |

## Panel bazli audit tablosu

| Dosya | Rol | Menü / ekran | Route | Copilot / Hızlı Yardım | screenPath / screenTitle | selectedRecord / entity | Live facts / metrics | Quick-help + chat aynı context mi? | Risk |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `web/src/panels/company/AgreementsPanel.jsx` | COMPANY | Sözleşmeler | `/company/agreements` | Evet | Evet | Evet, `Sözleşme #1` | Evet, üretim sinyali / vardiya köprüsü | PARTIAL, canlıda free chat `Bunu anlayamadım` düşebildi | P0 |
| `web/src/panels/company/CommercialFlowPanel.jsx` | COMPANY | Ticari Akış | `/company/commercial-flow` | Evet | Evet | Evet | Evet, readonly payment preview / production bridge | PARTIAL | P1 |
| `web/src/panels/company/MapPanel.jsx` | COMPANY | Canlı Takip | `/company/map` | Evet | Evet | Evet, araç / vardiya seçimi | Evet, GPS / ETA / durak / son konum | PARTIAL | P0 |
| `web/src/panels/company/ShiftsPanel.jsx` | COMPANY | Vardiyalar | `/company/shifts` | Evet | Evet | Evet, vardiya seçimi | Evet, status / route / proof signals | PARTIAL | P1 |
| `web/src/panels/company/ServiceEvaluationPanel.jsx` | COMPANY | Güven / kalite benzeri servis değerlendirme | `/company/service-evaluation` | Evet | Evet | Evet | Evet, evaluation / review style signals | COMPLETE | P1 |
| `web/src/panels/company/OperationsPanel.jsx` | COMPANY | Operasyon | UNKNOWN | Hayır / MISSING | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | P1 |
| `web/src/panels/company/HubPanel.jsx` | COMPANY | Konum / çalışma merkezi | UNKNOWN | Hayır / MISSING | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | P1 |
| `web/src/panels/company/WorkflowPanel.jsx` | COMPANY | Workflow | UNKNOWN | Hayır / MISSING | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | P1 |
| `web/src/panels/company/CheckinPanel.jsx` | COMPANY | Check-in | UNKNOWN | Hayır / MISSING | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | P1 |
| `web/src/panels/company/PersonelAccessPanel.jsx` | COMPANY | Personel erişim | UNKNOWN | Hayır / MISSING | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | P1 |
| `web/src/panels/company/PassengerLinksPanel.jsx` | COMPANY | Yolcu / bağlantılar | UNKNOWN | Hayır / MISSING | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | P1 |
| `web/src/panels/room/AgreementsPanel.jsx` | ROOM | Sözleşmeler | `/room/agreements` | Evet | Evet | Evet | Evet, sözleşme / vardiya köprüsü | PARTIAL | P1 |
| `web/src/panels/room/CommercialFlowPanel.jsx` | ROOM | Ticari Akış | `/room/commercial-flow` | Evet | Evet | Evet | Evet, üretim / ticari akış | PARTIAL | P1 |
| `web/src/panels/room/MapPanel.jsx` | ROOM | Canlı Takip | `/room/map` | Evet | Evet | Evet, araç / vardiya seçimi | Evet, araç GPS’i / Sürücünün telefon GPS’i / ETA | PARTIAL | P0 |
| `web/src/panels/room/ShiftsPanel.jsx` | ROOM | Vardiyalar | `/room/shifts` | Evet | Evet | Evet, vardiya seçimi | Evet, status / proof / route | PARTIAL | P1 |
| `web/src/panels/room/VehiclesPanel.jsx` | ROOM | Araçlar | `/room/vehicles` | Evet | Evet | Evet, araç seçimi | Evet, GPS / son konum / durum | PARTIAL | P0 |
| `web/src/panels/room/DriversPanel.jsx` | ROOM | Sürücüler | `/room/drivers` | Evet | Evet | Evet, sürücü seçimi | Evet, görev / plan / bilgi | PARTIAL | P1 |
| `web/src/panels/room/OperationHealthPanel.jsx` | ROOM | Operasyon Sağlığı | `/room/operation-health` | Evet | Evet | Evet, ekran özeti | Evet, activeDrivers / riskyDevices / staleOrOffline / openIssues | PARTIAL | P1 |
| `web/src/panels/room/OffersPanel.jsx` | ROOM | Teklifler / teklif akışı | `/room/offers` | Evet | Evet | Evet, teklif / vardiya seçimi | Evet, stage / next best action | PARTIAL | P2 |
| `web/src/panels/room/GeoReviewPanel.jsx` | ROOM | GeoReview / kalite benzeri | `/room/georeview` | Evet | Evet | Evet | Evet, geo / review signals | PARTIAL | P2 |
| `web/src/panels/superadmin/OperationsPanel.jsx` | SUPER_ADMIN | Denetim Paneli / Operasyon | `/superadmin/operations` | Evet | Evet | Evet, ekran özeti | Evet, operasyon sinyalleri | PARTIAL | P1 |
| `web/src/panels/superadmin/CommercialCorePanel.jsx` | SUPER_ADMIN | Ticari Akış | `/superadmin/commercial-core` | Evet | Evet | Evet | Evet, hakediş readonly preview / payment readiness | PARTIAL | P1 |
| `web/src/panels/superadmin/OperationVerificationPanel.jsx` | SUPER_ADMIN | Operasyon Doğrulama | `/superadmin/operation-verification` | Evet | Evet | Evet | Evet, role / verify signals | PARTIAL | P1 |
| `web/src/panels/superadmin/ObservabilityPanel.jsx` | SUPER_ADMIN | Canlı sağlık ve queue | `/superadmin/observability` | Evet | Evet | Evet | Evet, event / queue metrics | PARTIAL | P2 |
| `web/src/panels/superadmin/TrustQualityPanel.jsx` | SUPER_ADMIN | Güven ve Kalite | `/superadmin/trust-quality` | Evet | Evet | Evet | Evet, quality / trust signals | PARTIAL | P1 |
| `web/src/panels/superadmin/FieldAcceptanceCenter.jsx` | SUPER_ADMIN | Saha kabul merkezi / sekmeli komuta paneli | `/superadmin/acceptance` | Evet | Evet | Evet | Evet, acceptance items | FULL | P2 |
| `web/src/panels/driver/TodayPanel.jsx` | DRIVER | Bugünkü görev | `/driver/today` | MISSING / UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | P1 |
| `web/src/panels/driver/RoutePanel.jsx` | DRIVER | Rota | `/driver/route` | MISSING / UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | P1 |
| `web/src/panels/driver/MapPanel.jsx` | DRIVER | Canlı takip / harita | `/driver/map` | MISSING / UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | P0 |
| `web/src/panels/driver/CheckinPanel.jsx` | DRIVER | Check-in | UNKNOWN | MISSING / UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | P1 |
| `web/src/panels/driver/PinChangePanel.jsx` | DRIVER | PIN değiştir | UNKNOWN | MISSING / UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | P2 |
| `web/src/panels/personel/LivePanel.jsx` | PERSONEL | Canlı takip | `/personel/live` | MISSING / UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | P1 |
| `web/src/panels/personel/MyRidePanel.jsx` | PERSONEL | Benim servisim | `/personel/my-ride` | MISSING / UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | P1 |
| `web/src/panels/parent/LivePanel.jsx` | PARENT | Öğrencimin servisi / canlı takip | `/parent/live` | MISSING / UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | P1 |
| `web/src/panels/school/OperationsPanel.jsx` | SCHOOL | Okul operasyonu | UNKNOWN | MISSING / UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | P1 |
| `web/src/panels/school/ParentInvitePanel.jsx` | SCHOOL | Veli davetleri | UNKNOWN | MISSING / UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | P2 |
| `web/src/panels/shared/NotificationsPanel.jsx` | SHARED | Bildirimler | UNKNOWN | MISSING / UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | P2 |
| `web/src/panels/shared/FeedbackLoopPanel.jsx` | SHARED | Geri bildirim | UNKNOWN | MISSING / UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | P2 |
| `web/src/panels/shared/KvkkPanel.jsx` | SHARED | KVKK | UNKNOWN | MISSING / UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | UNKNOWN | P1 |
| `web/src/panels/shared/ReportsPanel.jsx` | SHARED | Raporlar | tab-dependent | Evet | Evet | Evet | Evet, report facts | PARTIAL | P2 |
| `web/src/panels/shared/CopilotPanel.jsx` | SHARED | Copilot / Hızlı Yardım | N/A | Evet | Evet | Evet | Evet, screenContext + structuredFacts | PARTIAL | P0 |

## Frontend facts bridge coverage table

| Dosya | Coverage | Not |
| --- | --- | --- |
| `web/src/utils/copilotFacts.js` | STRONG | liveFactConfidence, diagnosticPriority, actionSimulation, shift/map/health/commercial helpers var. |
| `web/src/utils/agreementCopilotFacts.js` | STRONG | `Üretilen vardiya: 3`, `Son üretilen vardiya #7`, `Bugün üretim: Var` ve sözleşme→vardiya köprüsü var. |
| `web/src/utils/copilotSelection.js` | STRONG | selection event store var; panel seçimleri buradan taşınıyor. |
| `web/src/panels/shared/CopilotPanel.jsx` | STRONG | selectedLabel, selectedSummary, selectedFields, selectedBadges, structuredFacts ve chat payload birlikte gidiyor. |
| `web/src/panels/company/AgreementsPanel.jsx` | STRONG | company agreements live facts bridge mevcut. |
| `web/src/panels/room/MapPanel.jsx` | STRONG / PARTIAL | araç, GPS, son konum, ETA ve selected entity taşınıyor; live fallback riski var. |
| `web/src/panels/room/OperationHealthPanel.jsx` | STRONG / PARTIAL | operasyon sayıları geliyor; generic chip riski var. |
| `web/src/panels/superadmin/OperationsPanel.jsx` | PARTIAL | health summary var; action/premium polish açıkları var. |
| `web/src/panels/driver/TodayPanel.jsx` | MISSING / UNKNOWN | selected context bridge için açık audit yüzeyi. |
| `web/src/panels/personel/LivePanel.jsx` | MISSING / UNKNOWN | personel canlı takip için açık audit yüzeyi. |
| `web/src/panels/parent/LivePanel.jsx` | MISSING / UNKNOWN | parent live takip için açık audit yüzeyi. |
| `web/src/panels/school/OperationsPanel.jsx` | MISSING / UNKNOWN | okul operasyonu için açık audit yüzeyi. |

## Backend intent / composer coverage table

| Dosya | Coverage | Not |
| --- | --- | --- |
| `backend/src/routes/ai.js` | CRITICAL | validation fallback `Bunu anlayamadım` metnini üretebiliyor; P0 risk. |
| `backend/src/ai/schemas.js` | STRONG | agreement screen context ve contract-to-shift prompt helper'ları var. |
| `backend/src/ai/chat/intentRouter.js` | STRONG | `CONTRACT_TO_SHIFT`, `PAYMENT_READINESS`, `WHY_BLOCKED`, `NEXT_STEP`, `NEXT_SCREEN`, `LOCATION_HELP`, `WHO_CAN_DO`, `KVKK_VISIBILITY`, `FEEDBACK_STATUS`, `NOTIFICATION_SOURCE`, `QUALITY_SIGNAL` var. |
| `backend/src/ai/chat/helpComposer.js` | STRONG | workflow lead, safe answer wording, chip routing ve selected signal reuse var. |
| `backend/src/ai/chat/answerQualityPolicy.js` | STRONG | generic chip blocklist ve topic chip set var. |
| `backend/src/ai/chat/screenStateAnalyzer.js` | STRONG | live fact confidence, diagnostic priority ve operation health/contract/signal analysis var. |
| `backend/src/ai/jobGuide/screenCatalog.js` | STRONG | role/screen guide coverage var. |
| `backend/src/ai/jobGuide/screenCatalog.roomCompany.js` | STRONG | room/company screen catalog coverage var. |
| `backend/src/errors/http.js` | STRONG / SAFETY | internal codes safe Turkish fallback'a normalize ediliyor. |
| `backend/src/ai/chat/goldenQuestionPack.js` | STRONG | canlı kabul soruları ve role-wide örnekler var. |

## Risk classification
- **P0**: live question fallback, teknik hata, yanlış selected context.
- **P1**: selected info var ama cevapta kullanılmıyor.
- **P2**: chip / görünür dil / premium polish.

## Discovery risk summary
- `Firma / Sözleşmeler` ve `Oda / Canlı Takip` yüzeyleri P0'a en yakın risk taşıyor.
- `Oda / Operasyon Sağlığı` ve `Super Admin / Ticari Akış` yüzeyleri P1 risk taşıyor.
- `Driver / Personel / Parent / School` yüzeylerinde audit olarak MISSING / UNKNOWN alanlar fazla.
- `Hızlı Yardım` üst bağlamı ile serbest chat cevap route'u arasında paylaşım farklılaşması yaşanabiliyor.
- `backend/src/routes/ai.js` validation fallback, çalışma alanı çok doğru olsa bile `Bunu anlayamadım` üretebiliyor.

## Fix önerisi
- `COP-04B-FIX-01` Super Admin + Room live context parity.
- `COP-04B-FIX-02` Company / Sözleşmeler / Ticari Akış parity.
- `COP-04B-FIX-03` Personel / Veli / Sürücü mobile-web live context parity.
- `COP-04B-FIX-04` chip and answer premium polish.

## COP-04B-FIX-01 acceptance note
- Room / Canlı Takip selected araç, GPS, son GPS, durak ve ETA bilgisi varsa Copilot bunları cevapta kullanır.
- `Bu araç neden haritada görünmüyor?` sorusu selected context varsa `seçili araç bilgisi net görünmüyor` fallback'ine düşmez.
- Super Admin / Canlı İzleme yüzeyinde selected araç veya live facts varsa generic fallback yerine selected live sinyal kullanılır.
- Generic fallback yalnızca seçim gerçekten yoksa geçerlidir.

## COP-04B-FIX-02 acceptance note
- Company / Sözleşmeler, Company / Vardiyalar ve Super Admin / Ticari Akış yüzeylerinde commercial / readiness context selected facts ile birlikte okunur.
- Super Admin / Genel Bakış ekranı summary-first dashboard olarak kalır; hızlı erişim, özet ve bölüm rehberi üstte, geri bildirim / demo-debug alt detay alanında yaşar.
- Super Admin / Güven ve Kalite ekranı summary-first dashboard olarak kalır; güven/kanıt/inceleme bandı üstte, servis kanıtı, taslak skor, kalite geçmişi ve yol haritası/risk detayları ilgili tablarda yaşar.
- `UX-SUPERADMIN-QUALITY-PANEL-01`:
  - Süper Admin / Güven ve Kalite ekranı summary-first dashboard olarak kalır; güven/kanıt/inceleme bandı üstte, servis kanıtı, taslak skor, kalite geçmişi ve yol haritası/risk detayları ilgili tablarda yaşar.
  - Bu not, `UX-SUPERADMIN-OVERVIEW-CLEANUP-01`, `UX-SUPERADMIN-LIVE-MONITORING-01`, `UX-SUPERADMIN-AUDIT-PANEL-01`, `UX-SUPERADMIN-COMMERCIAL-FLOW-01` ve `UX-PANEL-REALITY-CLEANUP-02D` zincirini bozmaz; ürün davranışını değiştirmez.
- `Bu hakediş neden hazır değil?` sorusu `Eksik bilgi: 0` ile çelişmez; readonly hakediş önizlemesi ve ödeme hesabı / komisyon / hizmet-onay sinyali birlikte yorumlanır.
- `Bu sözleşmeden bugün vardiya üretildi mi?` sorusu sözleşme → vardiya üretim sinyalini korur ve `Bunu anlayamadım` fallback'ine düşmez.
- `Ödeme başlatılmaz.` sınırı korunur; aktif ödeme veya settlement execute dili görünmez.
- Generic ekran rehberi bu workflow sorularında ilk davranış değildir.

## COP-04B-FIX-03 acceptance note
- Personel / Veli / Sürücü web surfaces selected live context parity standardını taşır; servis, araç, GPS, ETA ve görev bilgisi cevapta kullanılır.
- Seçili servis veya görev varsa `seçili ... net görünmüyor` fallback'i kullanılmaz.
- Mobile tarafında Copilot bridge görünmeyen yüzeyler için bu audit yalnız mevcut repo kanıtını korur; ürün davranışı değiştirmez.
- `Operasyon kanıtı` ve `başlatma kanıtı` gibi Türkçe görünür dil korunur; teknik iç kodlar görünmez.

## COP-04B-FIX-04 acceptance note
- Cevaplar daha kısa, doğal ve aksiyon odaklı kalır; aynı aksiyon `Öneri` ve `Sıradaki doğru işlem` altında tekrar etmez.
- Workflow sorularında generic chips yerine konuya özel chipler öne çıkar.
- Chip policy, workflow sorularında domain-specific chips'i generic seçeneklerin önüne alır.
- `Önerilen adım` gibi mekanik anlatım son kullanıcı cevabında görünmez.
- Premium polish, selected/context parity davranışlarını bozmaz; yalnız görünür dil ve chip önceliğini iyileştirir.

## COP-04B-FIX-05 acceptance note
- COP-04B-FIX-05 canlı Room selected vehicle route hardening.
- selected vehicle answer route.
- Room / Canlı Takip serbest chat yolunda selected vehicle summary help header'dan gelse bile plaka, GPS, son GPS, sıradaki durak ve ETA bilgisi cevapta kullanılır.
- `Bu araç neden haritada görünmüyor?` sorusu header/context içinde seçili araç sinyali varsa `seçili araç bilgisi net görünmüyor` fallback'ine düşmez.
- Selected vehicle yoksa sadece güvenli fallback geçerlidir; teknik hata veya iç kod görünmez.
- Bu hardening, copied summary alias'larını request ve answer route boyunca taşımayı kabul kriteri olarak tanımlar.

## COP-04B-FIX-06 acceptance note
- Free-chat submit request de aynı live selected context'i taşır; header quick answer ile free chat aynı selected signal setini kullanır.
- Room / Canlı Takip sorularında `entityType: screen` free-chat akışında da korunur; selected vehicle summary help header'dan backend'e taşınır.
- `selectedRecord` null olsa bile `helpContextSummary` / `contextSummary` / `liveFacts` içindeki araç sinyali cevapta kullanılır.
- `Bu ekranda seçili araç bilgisi net görünmüyor` fallback'i yalnızca gerçekten seçili araç ve canlı sinyal yoksa geçerlidir.

## COP-04B-FIX-07 acceptance note
- COP-04B-FIX-07 personel live copilot forbidden/context fix.
- Personel / Canlı Harita / Personel / Canlı Takip free-chat submit request de header/quick answer ile aynı selected service context'i taşır.
- FORBIDDEN normalization: `FORBIDDEN` user-visible olmaz; erişim gerçekten yoksa sade Türkçe güvenli mesaj dönülür.
- `selectedRecord` null olsa bile `helpContextSummary` / `contextSummary` / `liveFacts` içindeki servis, araç, GPS, ETA ve durak sinyalleri cevapta kullanılır.
- `Bu ekranda seçili servis bilgisi net görünmüyor` fallback'i yalnızca gerçekten canlı servis sinyali yoksa geçerlidir.

## COP-04B-FIX-08 acceptance note
- COP-04B-FIX-08 Parent live screen context/no-live-vehicle fallback.
- Veli / Canlı Takip free-chat submit request ve quick/header answer aynı parent live context’i taşır.
- Canlı araç yoksa `Bu ekran, saha geri bildirimlerini...` gibi feedback açıklaması dönmez; güvenli no-live fallback kullanılır.
- `selectedRecord` null olsa bile `helpContextSummary` / `contextSummary` içindeki çocuk, okul, bölge, araç yok ve aktif vardiya saat aralığı sinyalleri cevapta kullanılır.
- Parent live selected service varsa plaka, GPS, son GPS, ETA ve sıradaki durak korunur.

## UX-COPILOT-SMART-CHIPS-01 starter chip polish
- Sağ alt Copilot drawer açıldığında veya sohbet boşken screen-specific starter chips öne çıkar.
- Global fallback chips yalnızca context belirsiz olduğunda görünür ve screen-specific chips onları geri iter.
- Drawer chip yüzeyi readonly öneri olarak kalır; otomatik aksiyon, dispatcher veya workflow execute yoktur.

## UX-COPILOT-PERSONA-01 brand voice note
- `Sefer Abi` marka adı olarak görünür, ama kullanıcıya `abi`, `kardeşim`, `kaptanım`, `reis` gibi hitaplar kullanılmaz.
- Ton sakin, net, kurumsal, sahayı bilen ve kısa olmalıdır.
- Web Copilot ve sürücü sesli yardımcı aynı marka sesi ailesinde düşünülür.
- Rol bazlı ses varyantları aynı ailede kalır: Driver daha kısa ve komut netliği yüksek, Web Copilot daha açıklayıcı, Parent / Personel daha sade ve güven verici olur.
- Önerilen config anahtarı `VOICE_PERSONA=sefer_abi`, profil anahtarı ise `ASSISTANT_VOICE_PROFILE=driver|copilot|parent` şeklinde düşünülür; bu sadece ses/ton yönlendirmesidir, product flow değildir.
- `VOICE-PERSONA-01` ayrı bir milestone olarak bırakılır; bu audit mobil canlı kabul iddiası taşımaz.
- Proactive AI dispatcher bu çerçevenin dışındadır.

## UX-COPILOT-PERSONA-01-FIX-01 visible label and voice polish
- Sağ alt drawer görünür başlığı `Sefer Abi’ye Sor` standardına bağlanır.
- Sol menü kısa label `Sefer Abi Terminali` standardına bağlanır.
- Sesli okuma tonu tok, sakin ve güven veren biçimde; `tr-TR`, daha düşük pitch ve biraz daha yavaş tempo hedefiyle kalır.
- Browser TTS ses rengi cihaz ve tarayıcıya göre değişebileceği için kesin timbre garantisi verilmez; fallback hata üretmeden çalışır.

## UX-COPILOT-TERMINAL-01 existing CopilotPanel terminal label/readiness polish
- Mevcut CopilotPanel derin analiz yüzeyi terminal shell olarak kullanılır; yeni terminal component veya yeni route eklenmez.
- Sol menüdeki terminal label `Sefer Abi Terminali` görünür standardına bağlanır.
- Sağ alttaki `Sefer Abi’ye Sor` drawer quick-help yüzeyi olarak korunur.
- Terminal starter chips readonly analiz soruları sunar; otomatik aksiyon veya dispatcher yoktur.

## ETA-SANITY-01 live tracking reliability note
- Canlı takip ekranlarında GPS stale/offline/unknown ise ETA kesin gösterilmez; `ETA güncel değil` veya `ETA hesaplanamıyor` gibi güvenli ifadeler kullanılır.
- `Son bilinen durak` ve `Sıradaki durak` ayrımı canlılık durumuna göre korunur; Copilot aynı güvenli dili tekrarlar.
- 619 dk gibi ham ETA değerleri kullanıcıya güvenilir gerçekmiş gibi basılmaz; güvenilirlik önce gelir.

## ETA-OSRM-01 readonly OSRM ETA helper note
- Merkezi readonly OSRM ETA helper, canlı ETA için güvenli tek çıktı formatı sağlar.
- OSRM timeout veya OSRM_URL eksikliği durumunda fallback çalışır; ekran kırılmaz ve kesin ETA dili korunmaz.
- Bu helper, ETA-SANITY-01 güvenli görünürlük katmanını bozmaz; tersine canlı güvenilirlik kararını tek yerde toplar.

## ETA-OSRM-02 /api/eta routeEtaService bridge note
- `/api/eta` route'u merkezi readonly helper ile güvenli biçimde bağlanır; mevcut route contract geriye uyumlu kalır.
- GPS stale/offline/unknown durumunda exact ETA dili üretilmez; yardımcı metadata alanları güvenli fallback'i taşır.
- Bu bridge, ETA-SANITY-01 görünürlük dilini bozmaz; sadece route seviyesinde readonly ETA kararını netleştirir.

## LIVE-TRACKING-FINAL-01 acceptance smoke note
- Room, Company, Driver, Parent, Personel ve Public canlı yüzeylerinde GPS, ETA ve marker davranışı final kabul gate'i olarak birlikte doğrulanır.
- `bus.svg` marker standardı, ETA-SANITY güvenli wording ve `/api/eta` bridge contract'ı aynı kabul yüzeyinde korunur.
- Bu gate, exact ETA veya teknik hata görünürlüğünü artırmaz; acceptance-only bir son kontrol kapısıdır.

## DRIVER-FLOW-FINAL-01 acceptance smoke note
- Driver / Bugün / Rota / Harita / Check-in final acceptance aynı güvenli ETA / GPS wording ile doğrulanır.
- Sürücü yardım cevapları görev, rota ve GPS bekleme durumlarında teknik jargon üretmeden kısa ve pratik kalır.
- Bu not ürün davranışı değiştirmez; yalnızca final kabul kapsamını görünür kılar.

## UX-NAV-01 premium NavDock polish
- Sol menüdeki terminal label `Sefer Abi Terminali` kalır; sağ alttaki `Sefer Abi’ye Sor` quick-help drawer değişmez.
- NavDock kartları, aktif durum vurgusu, badge hizası ve focus/hover affordance'ları daha premium ve okunur hale getirilir.
- Bu polish görünüm standardını iyileştirir; route, component yapısı ve product/business flow değişmez.

## UX-DENSITY-01 panel/card density polish
- Ortak card, panel header, badge, chip, button ve table yoğunluğu daha kompakt ve premium hale getirilir.
- Büyük ekranlarda bilgi yoğunluğu artar; küçük ekranlarda taşma ve çakışma kontrol altında kalır.
- Behavior unchanged; only visible density, spacing and dashboard polish changes.

## UX-PANEL-STRUCTURE-02 summary-first plus segmented tabs
- Uzun panellerde kritik özet ve birincil aksiyonlar açık kalır; eş düzey alt modlar tab / segmented button ile ayrılır.
- Secondary detaylar accordion altında tutulur; sayfa ilk açılışta daha kısa ve okunur hissi verir.
- Bu dalga, `Room / Araçlar`, `Room / Sürücüler`, `Room / Ticari Akışım`, `Company / Sözleşmeler`, `Company / Ticari Akış`, `Super Admin / Operasyon Doğrulama`, `Parent / Canlı Takip` ve `Personel / Canlı Takip` yüzeylerini kapsar.

## UX-PANEL-STRUCTURE-02B long panel follow-up
- Kalan P0 uzun paneller summary-first + segmented/tab + collapsible standardının ikinci dalgası ile ele alınır.
- `CommercialCorePanel`, `VehiclesPanel`, `DriversPanel`, `ShiftsPanel` ve `MapPanel` için ilk açılışta kritik özet açık, ikincil detaylar ise ayrı section'larda tutulur.

## UX-COLLAPSIBLE-PANELS-01 long panel summary-first standard
- Uzun panellerde kritik özet, ana filtre, ana tablo ve birincil aksiyonlar açık kalır; ikincil detaylar collapsible/accordion altında toplanır.
- `Room / Operasyon Sağlığı`, `Driver / Bugün`, `Driver / Rota`, `Parent / Canlı Takip` ve `Company / Sözleşmeler` bu standart için ilk patch yüzeyleri olarak daraltılır.
- `Sefer Abi Terminali` ve sağ alttaki `Sefer Abi’ye Sor` kasıtlı olarak korunur; terminal/assistant boundary bozulmaz.

## Known live findings referenced in this audit
- `Firma / Sözleşmeler`
- `Oda / Canlı Takip`
- `34ABC123`
- `Üretilen vardiya: 3`
- `Son üretilen vardiya #7`
- `Bugün üretim: Var`
- `Oda / Operasyon Sağlığı`
- `Bu hakediş neden hazır değil?`
- `Bu vardiya neden başlayamıyor?`
- `Bu araç neden haritada görünmüyor?`
- `Bu sözleşmeden bugün vardiya üretildi mi?`

## Forbidden visible terms list
- `raw`
- `payload`
- `token`
- `hash`
- `debug`
- `write`
- `execute`
- `settlement execute`
- `OperationProof`
- `JOB_TYPE_ENTITY_MISMATCH`
- `contractShiftGeneration`
- `agreement`

## Audit note
- Bu audit product behavior değiştirmez.
- Runtime behavior değiştirmez.
- Bu belge yalnızca görünür context coverage ve risk görünürlüğü içindir.

## UX-PANEL-REALITY-AUDIT-02C note
- PanelSegmentTabs kullanılan yüzeylerde gerçek functional tab ile cosmetic-only risk arasındaki farkı görünür tutar.
- `Room / Araçlar` ve `Room / Sürücüler` reference standard olarak kalır; focus-model yüzeyler browser / DOM smoke için watchlist'te tutulur.
- Bu not ürün davranışını değiştirmez; yalnızca panel gerçekliği ve uzun scroll riskini güncel tutar.

## UX-PANEL-REALITY-CLEANUP-02D note
- Room / Sözleşmeler artık gerçek tab mimarisiyle çalışır; Operasyon Köprüsü, Rota Talepleri, Uygulanan Rota, Uzatma Talepleri, Bekleyen ve Diğer Sözleşmeler aynı viewport içinde tek kaynaklı render edilir.
- Üst bilgi bandı yalnızca yönlendirme / uyarı katmanıdır; detay tablosunu tekrar etmez ve CTA ile ilgili taba geçirir.
- Bu cleanup, Room / Ticari Akışım ve Room / Canlı Takip üstünde kurulu summary-first + functional tab standardını bozmadan uzun stacked akışı kapatır.

## UX-LIVE-MAP-TABS-SIMPLIFY-01 note
- Room / Canlı Takip artık Harita / Araçlar sekmeleriyle sadeleştirilir; GPS, ETA, risk ve geçmiş bilgisi Harita görünümündeki kısa badge ve satırlarda tutulur.
- Bu sadeleştirme, Copilot'un aynı canlı bağlamı kullanmasını korur; seçili araç, son GPS, sıradaki durak ve ETA yardım bağlamında taşınmaya devam eder.

## UX-COMPANY-OPS-PANEL-TABS-01 note
- Company / Operasyon Paneli artık summary-first + functional tab standardı ile çalışır; Özet, Servis Kümesi, Personel, Servis Zamanları, İstisnalar / Değişiklikler ve Bildirimler aynı anda alt alta görünmez.
- Üst KPI / durum bandı ve kısa bildirim bandı açık kalırken, bildirim CTA'sı ilgili taba geçirir ve detaylar yalnızca Bildirimler tabında taşınır.
- Bu not, company operations panelinin Copilot context parity'ini korur; ürün davranışı değiştirmez.

## UX-COMPANY-SHIFTS-TABS-01 note
- Company / Vardiyalar ekranı track-only dört gerçek taba taşınır: Market, Bekleyen, Sözleşmeden Üretilen ve Diğer Vardiyalar.
- Oluşturma, Liste ve Planlama Merkezi tekrarları bu ekrandan kaldırılır; üstte yalnızca takip özet bandı ve kompakt filtre kalır.
- Bu not, company shifts takip panelinin Copilot context parity'ini korur; ürün davranışı değiştirmez.

## UX-COMPANY-QUALITY-PANEL-TABS-01 note
- Company / Hizmet Değerlendirme ekranı summary-first + functional tab standardına taşınır; Özet, Kanıt / Hazırlık, Taslak Skor, İnceleme Kararı, Geçmiş ve Değerlendirme Alanları aynı anda alt alta görünmez.
- Üst KPI / durum bandı ve değerlendirme bekleyen bilgi bandı açık kalır; CTA ilgili taba geçirir ve detaylar yalnızca seçili sekmede render edilir.
- Bu not, company quality panelinin Copilot context parity'ini korur; ürün davranışı değiştirmez.

## UX-SEFER-ABI-LAUNCHER-01 note
- Sağ alttaki Sefer Abi’ye Sor launcher'ı branded compact kart yüzeyine taşınır; kapalı halde yalnız launcher görünür, drawer içeriği açılmadan rahatsız etmez.
- Drawer açıkken üç kademe boyut korunur ve başlangıç boyutu küçük/orta çizgide kalır; hızlı çipler mevcut ekran bağlamına göre sade öneriler üretir.
- Bu not, Sefer Abi persona / terminal sınırını korur; ürün davranışı değiştirmez.

## UX-COMPANY-PANELS-FINAL-POLISH-01 note
- Company / Vardiyalar ekranı track-only dört gerçek taba sahip kalır; Market, Bekleyen, Sözleşmeden Üretilen ve Diğer Vardiyalar accordion başlıkları varsayılan açık gelir.
- Company / Ticari Akış artık agreement-bağlı final kayıtları için `Sözleşmeden Üretilen` / `Diğer Vardiyalar` yönlendirmesi kullanır; kullanıcıyı yanıltan `Listeyi aç` ifadesi kaldırılır.
- Bu not, company operations / shifts / commercial flow panel sınırını korur; ürün davranışı değiştirmez.

## UX-SCHOOL-ORGANIZATION-PANELS-01 note
- School / Okul Operasyon Paneli summary-first + functional tab standardına taşınır; Özet, Öğrenci Servisleri, Veli & Bildirimler, İstisnalar / Günlük Değişiklikler, Kanıt / Check-in ve Geçmiş ayrı içerik akışları olarak kalır.
- School vardiya başlığı role-aware hale gelir; `Okul Vardiyaları` ve `Kurum Vardiyaları` label'ları school / organization scope'a göre görünür ve `Shifts (COMPANY)` sızıntısı kullanıcıya taşınmaz.
- Organization panellerinde `Lokasyon` yerine `Konum` standardı uygulanır; `Kurum Merkezi`, `Toplanma Konumu` ve ilgili plan kopyaları role-aware Türkçe label üretir.
- Bu not, School / Organization panel gerçekliği ile Copilot context parity'i korur; ürün davranışı değiştirmez.

## UX-ROOM-OPS-RELATIONSHIP-POLISH-01 note
- Room / Operasyon Sağlığı tek sorun bağlamı altında sadeleşir; Sorunlu Sürücüler ve Açık Sorunlar aynı sorun görünümünde taşınır.
- Room / Araçlar bağlantı yönetiminin tek sahibi olur; Room / Sürücüler yalnız readonly bağlı araç özeti ve araçlara yönlendiren CTA gösterir.
- Visible Konum copy, role / ekran bağlamına göre Oda Konumu / Toplanma Konumu gibi Türkçe label'lara çevrilir; ürün davranışı değiştirmez.

## UX-SUPERADMIN-LIVE-MONITORING-01 note
- Süper Admin / Canlı İzleme ekranı summary-first monitoring dashboard olarak kalır; üstte KVKK / alarm bandı, altta canlı akış / alarm / olay tipi / kanıt / log sekmeleri yaşar.
- Uzun teknik liste ve debug detayları ana dashboardu işgal etmez; kritik alarm bandı üstte compact uyarı olarak görünür.
- Bu not, canlı izleme panelinin Copilot context parity'ini korur; ürün davranışı değiştirmez.

## UX-SUPERADMIN-AUDIT-PANEL-01 note
- `web/src/panels/superadmin/OperationsPanel.jsx` artık summary-first denetim dashboard olarak okunur; `STEP_UP_REQUIRED` ve `KVKK sınırı aktif` bandı üstte compact kalır.
- Ayrıntılar `Özet`, `Yetki & Erişim`, `Servis Kanıtı`, `KVKK & Uyumluluk`, `Audit / Log Kayıtları` ve `Riskler & Kararlar` tablarında ayrışır.
- Bu not, Super Admin ailesindeki overview / live monitoring / commercial flow context parity'si ile birlikte okunur; ürün davranışı değiştirmez.

## UX-SUPERADMIN-COMMERCIAL-FLOW-01 note
- Süper Admin / Ticari Akış ekranı summary-first ticari dashboard olarak kalır; üstte readonly ödeme güvenli bandı, altta Hakediş, Ödeme Hazırlık, Komisyon, Kalite / Kanıt, Riskler ve Geçmiş tabları yaşar.
- Ödeme başlatma / settlement execute görünür UI’dan kaldırılır; `Ödeme kapalı`, `readonly` ve `hakediş önizleme` sınırı üstte compact olarak görünür.
- Bu not, ticari akış panelinin Copilot context parity'ini korur; ürün davranışı değiştirmez.

## UX-SUPERADMIN-FIELD-DISPATCH-DISCOVERY-01 note
- Sahaya Çıkış Kontrolü paneli discovery-first envanter mantığıyla kalır; üstte kritik engel bandı ve ana KPI'lar açık, altta Özet, Hazırlık Kontrolü, Onay & Çıkış, Eksikler & Riskler, Geri Bildirimler ve Geçmiş / Log gerçek tablar halinde ayrı akışlar olarak yaşar.
- Kapasite kartları ayrıca yeni yapay bir tab yaratmadan Hazırlık Kontrolü içinde gruplanır; veri kaybı olmaz, yalnızca uzun tek kolon görünüm daha okunur hale gelir.
- Bu not, Super Admin panel ailesindeki overview / live monitoring / audit / quality / commercial context parity'si ile birlikte okunur; ürün davranışı değiştirmez.

## UX-SUPERADMIN-FIELD-ACCEPTANCE-CENTER-01 note
- Saha Kabul Merkezi artık sekmeli acceptance komuta paneli olarak okunur; canlı oturum mini bandı ve checklist mini durum üstte kalır.
- Manifest, karar kaydı, oturum bilgisi, checklist güncelleme ve geçmiş/log verileri ayrı tablarda yaşar; veri kaybı olmaz, yalnızca uzun acceptance yüzeyi daha okunur hale gelir.
- Bu not, Super Admin panel ailesindeki overview / live monitoring / audit / quality / commercial context parity'si ile birlikte okunur; ürün davranışı değiştirmez.
