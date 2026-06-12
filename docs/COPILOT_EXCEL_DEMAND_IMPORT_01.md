# COPILOT EXCEL DEMAND IMPORT 01

Tarih: 2026-06-12
Repo: `servis-platform`

## docs/check milestone
- Bu doküman docs/check milestone kaydıdır; runtime Excel/CSV import execute, file upload endpoint, stage/commit/tag/push ve browser-smoke artifact açmaz.
- Canonical check: `check:copilotexceldemandimport01`
- Komut: `node backend\scripts\copilot_excel_demand_import_01_check.js`
- Static source of truth gerektiğinde `backend/src/ai/chat/copilotExcelDemandImportPolicy.js` ile taşınır; helper runtime executor değildir.

## Amaç
- Sefer Abi’nin Excel/CSV’den gelen personel servis talep verisini güvenli şekilde anlaması, kolonları eşleştirmesi, veri kalitesi ve address readiness özetini üretmesi için statik readiness hattını kilitler.
- Bu milestone runtime import execute açmaz.
- File upload endpoint açmaz.
- DB write, demand create, shift create, stop create, route draft/apply, geocode commit, OSRM apply, RFQ send, offer accept/reject, agreement execute, dispatch apply, payment/hakediş execute, SMS/email/push, provider credential management veya user/account/admin write-action açmaz.
- Human approval gate ayrıdır; gerçek import/write, geocode commit ve operasyon uygulamaları insan onayı olmadan yapılmaz.

## STAGE 1 — File Understanding
- Excel/CSV dosyası kullanıcının sağladığı veri kaynağıdır.
- Bu milestone runtime dosya yükleme veya import execute açmaz.
- Sefer Abi ileride dosyadaki kolonları anlamaya hazırlanır.
- Dosya içeriği uygulamaya kaydedilmez.
- DB write yok.

## STAGE 2 — Column Mapping
### Beklenen kolon kategorileri
- ad soyad / personel adı
- adres / servis adresi / durak adresi
- telefon, opsiyonel
- departman / grup / sınıf / organizasyon birimi, opsiyonel
- vardiya tarihi, opsiyonel
- vardiya saati, opsiyonel
- yön: sabah inbound / akşam outbound, opsiyonel
- not / özel ihtiyaç, opsiyonel
- servis tipi, opsiyonel
- KVKK / izin sinyali, opsiyonel
- şirket / okul / organizasyon lokasyonu, opsiyonel
- kapasite / kişi sayısı, türetilebilir
### Kolon eşleme modeli
- Zorunlu alanlar
- Opsiyonel alanlar
- Türetilmiş alanlar
- Belirsiz alanlar
- Riskli / kişisel veri alanları
- Import öncesi insan onayı gerektiren alanlar

## STAGE 3 — Data Quality
- Boş ad / adres kontrolü yapılır.
- Tekrarlı kişi kontrolü yapılır.
- Tekrarlı adres kontrolü yapılır.
- Eksik telefon kontrolü yapılır.
- Eksik vardiya saati kontrolü yapılır.
- Eksik yön bilgisi kontrolü yapılır.
- Belirsiz adres kontrolü yapılır.
- İl / ilçe eksikliği kontrolü yapılır.
- Çok uzun / çok kısa adres kontrolü yapılır.
- KVKK / izin belirsizliği kontrolü yapılır.
- Cross-organization veri riski kontrolü yapılır.
- Kapasite tahmini belirsizliği kontrolü yapılır.

## STAGE 4 — Address Readiness
- Adresler geocode edilmez; sadece geocode readiness analizi yapılır.
- Adres güven skoru ayrı milestone’a bırakılır: `ADDRESS-GEOCODING-CONFIDENCE-01`.
- Bu milestone geocode commit veya lat/lng write yapmaz.
- Adresler `geocode için hazır / eksik / riskli / insan kontrolü gerekli` şeklinde sınıflanır.

## STAGE 5 — Demand Preview
- Sefer Abi talep hazırlık özeti oluşturabilir.
- Kaç kişi, kaç adres, kaç eksik, kaç riskli, kaç tekrar, kaç geocode-ready gibi sayıları açıklar.
- Talep oluşturmaz.
- Shift oluşturmaz.
- Personel kaydı yapmaz.
- Stop oluşturmaz.
- Route draft oluşturmaz.
- Sadece preview/readiness dili kullanılır.

## STAGE 6 — Human Approval Gate
- Import execute için insan onayı gerekir.
- Talep oluşturma için insan onayı gerekir.
- Adres geocode commit için insan onayı gerekir.
- Stop/route draft için insan onayı gerekir.
- DB write yok.
- Human approval checklist `COPILOT-HUMAN-APPROVAL-01` ile uyumlu olmalı.

## STAGE 7 — Next Milestone Handoff
Bu milestone şu sonraki milestone’lara güvenli veri hazırlar:

- `ADDRESS-GEOCODING-CONFIDENCE-01`
- `COPILOT-STOP-ROUTE-DRAFT-01`
- `OSRM-ROUTE-DRAFT-FROM-EXCEL-01`
- `COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01`
- `COPILOT-DEMAND-INTAKE-01`
- `COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01`

## Copilot görev sınırı
- `READINESS_EXPLAIN`: Excel/import hazırlık durumunu açıklar
- `COLUMN_MAP_PREPARE`: kolon eşleme önerisi hazırlar
- `DATA_QUALITY_SUMMARY`: veri kalitesi özeti hazırlar
- `MISSING_FIELD_REPORT`: eksik alan raporu çıkarır
- `DUPLICATE_RISK_REPORT`: muhtemel tekrarları açıklar
- `ADDRESS_READINESS_REPORT`: adreslerin geocode’a hazır olup olmadığını açıklar
- `KVKK_CONSENT_WARNING`: KVKK / izin belirsizliği uyarısı yapar
- `DEMAND_PREVIEW`: talep hazırlık önizlemesi sunar
- `HUMAN_APPROVAL_REQUIRED`: gerçek import/write için insan onayı gerektiğini söyler

## Role bazlı kullanım

### COMPANY
- Personel servis talep verisini Excel/CSV’den hazırlama rehberi görür.
- Eksik kolonlar, adres belirsizliği, kişi sayısı, vardiya yönü ve talep özeti görür.
- Import execute yok.
- Talep oluşturma yok.

### SCHOOL
- Öğrenci / personel taşıma plan verisi için kolon hazırlığı ve address readiness görür.
- Sınıf / grup / veli / öğrenci gibi hassas veri riskleri için uyarı görür.
- Cross-organization veri yok.
- Import execute yok.

### ORGANIZATION
- Organizasyon personel / grup bazlı servis planı için kolon hazırlığı ve address readiness görür.
- Cross-organization veri yok.
- Import execute yok.

### SUPER_ADMIN
- Platform genelinde import readiness standardını ve risk sınırlarını görür.
- Cross-tenant / cross-organization veri riski için uyarı görür.
- User / account / admin write-action yok.

### ROOM
- Operatör tarafında import edilmiş veri değil, sadece ileride gelecek talep / route hazırlık kalitesini yorumlayabilir.
- Araç / sürücü assignment yok.
- Route apply yok.

### DRIVER
- Excel demand import roadmap gösterilmez.
- Sadece ileride route/check-in/safe-drive açıklamalarında etkilenebilir.
- Driver action execute yok.

### PERSONEL / PARENT
- Excel demand import roadmap gösterilmez.
- Kişisel veri / KVKK uyarıları sadece rol bağlamında açıklanır.
- Talep / route / payment / contract execute yok.

## KVKK / veri güvenliği sınırı
- Excel/CSV kişisel veri içerebilir.
- Ad soyad, telefon, adres, okul/organizasyon bilgisi hassas operasyonel veridir.
- Bu milestone dosyayı saklama, import etme veya DB’ye yazma açmaz.
- KVKK / izin belirsizliği varsa import önerisi `kontrol gerekli` olur.
- Cross-organization / cross-tenant veri karışması kritik risk sayılır.
- İnsan onayı olmadan hiçbir kayıt/write yapılmaz.
- Public dokümanda “Excel yükle her şeyi otomatik yapar” vaadi yok.
- Testle kanıtlanmamış runtime import kabiliyeti vaat edilmez.

## Static helper
- `backend/src/ai/chat/copilotExcelDemandImportPolicy.js` sadece static config/export taşır.
- Runtime execution yoktur.
- Tool execution yoktur.
- Write-action handler yoktur.
- Mutation yoktur.

## Kapsam dışı
- Runtime AI action açılmaz.
- Tool execution açılmaz.
- Write-action dispatcher açılmaz.
- Excel/CSV import execute açılmaz.
- File upload endpoint açılmaz.
- DB write açılmaz.
- Demand create execute açılmaz.
- Shift create execute açılmaz.
- Stop create execute açılmaz.
- Route draft create/apply açılmaz.
- Geocode execute/commit açılmaz.
- OSRM route apply açılmaz.
- RFQ send açılmaz.
- Offer accept/reject açılmaz.
- Agreement/contract execute açılmaz.
- Dispatch apply açılmaz.
- Payment/hakediş execute açılmaz.
- SMS/email/push açılmaz.
- Provider credential management açılmaz.
- User/account/admin write-action açılmaz.
- Cross-organization write açılmaz.
- Supplier auto-selection açılmaz.
- Driver/vehicle assignment açılmaz.
- Backend route/service/schema açılmaz.
- Prisma/schema/migration açılmaz.

## Public promise / güven stratejisi
- AI her şeyi yapar public promise yok.
- Tek tıkla dosya yükle ve her şey otomatik olsun vaadi yok.
- Underpromise, overdeliver stratejisi korunur.
- Sefer Abi hazırlık ve önizleme üretir; gerçek import/write ayrı human approval milestone’larına kalır.
- Kullanıcıya yalnız testle kanıtlanmış kabiliyetler vaat edilir.
- Nihai karar kullanıcıdadır.

## Not
- Bu milestone docs/check odaklıdır; runtime import execute, tool execution, write-action dispatcher, backend route/service/schema, Prisma, smoke policy veya browser-smoke artifact açmaz.
