# OSRM ROUTE DRAFT FROM EXCEL 01

Tarih: 2026-06-13
Repo: `servis-platform`

## docs/check milestone
- Bu doküman docs/check milestone kaydıdır; runtime feature, tool execution, stage/commit/tag/push ve browser-smoke artifact açmaz.
- Canonical check: `check:osrmroutedraftfromexcel01`
- Komut: `node backend\scripts\osrm_route_draft_from_excel_01_check.js`
- Static source of truth gerektiğinde `backend/src/ai/chat/osrmRouteDraftFromExcelPolicy.js` ile taşınır; helper runtime executor değildir.

## Amaç
- Excel/import → address confidence → stop/route draft hattından gelen veriyi gerçek OSRM route calculation öncesi güvenli şekilde sınıflandırır.
- Bu milestone runtime OSRM route calculation açmaz.
- OSRM network call, route apply, route draft create, stop create, geocode execute, lat/lng persistent write, DB write, demand/shift/personel create, dispatch apply, driver/vehicle assignment, RFQ send, offer accept/reject, agreement execute, SMS/e-posta/push, provider credential, user/account/admin write-action veya runtime AI action/tool execution açmaz.
- Sadece OSRM route draft readiness modeli, Excel/import + address confidence + stop route draft handoff uyumu, lat/lng readiness kontrolü, inbound/outbound hazırlık ayrımı, risk kategorileri, route preview readiness, missing data ve manual review listesi, insan onayı checklisti, static helper, guard/check ve docs/chain kaydı oluşturur.

## STAGE 1 — Source Draft Readiness
- Kaynak veri `COPILOT-STOP-ROUTE-DRAFT-01`, `ADDRESS-GEOCODING-CONFIDENCE-01` ve `COPILOT-EXCEL-DEMAND-IMPORT-01` hattından gelir.
- Bu milestone stop/route/geocode/OSRM üretmez.
- Sadece OSRM route draft’a hazır olup olmadığını sınıflandırır.

## STAGE 2 — Coordinate Readiness
- OSRM için güvenilir lat/lng gerekir.
- HIGH_CONFIDENCE adresler bile geocode sonucu doğrulanmadan route calculation’a taşınmaz.
- LOW_CONFIDENCE ve BLOCKED_FOR_GEOCODING adresler OSRM input’a alınmaz.
- Lat/lng persistent write yok.
- Geocode execute yok.

## STAGE 3 — Direction-Specific OSRM Input Model
- Sabah inbound: durak/adres adayları → hub.
- Akşam outbound: hub → durak/adres adayları.
- Ring varsayımı yok.
- Araç deposu zorunlu varsayımı yok.
- Sabah ve akşam ayrı OSRM readiness olarak değerlendirilir.
- Direction eksikse OSRM readiness “manual review required” olur.

## STAGE 4 — Hub and Stop Sequence Readiness
- Hub konumu gereklidir.
- Stop candidate listesi gereklidir.
- Durak sırası bu milestone’da hesaplanmaz.
- OSRM waypoint order üretilmez.
- Sadece “sequence için hazır / eksik / riskli / insan kontrolü gerekli” sınıflaması yapılır.

## STAGE 5 — OSRM Risk Categories
- `MISSING_COORDINATE`
- `LOW_CONFIDENCE_COORDINATE`
- `BLOCKED_ADDRESS`
- `MISSING_HUB`
- `MISSING_DIRECTION`
- `TOO_FEW_STOPS`
- `TOO_MANY_STOPS`
- `DUPLICATE_WAYPOINT`
- `POSSIBLE_OUTLIER_STOP`
- `CROSS_ORGANIZATION_ROUTE_RISK`
- `KVKK_CONSENT_UNKNOWN`
- `MANUAL_REVIEW_REQUIRED`
- `OSRM_EXECUTION_NOT_ALLOWED`

## STAGE 6 — Route Draft Preview Readiness
- Bu milestone route preview üretmez.
- Distance/duration/polyline hesaplamaz.
- OSRM call yapmaz.
- Sadece “OSRM route draft preview için hazır / eksik / riskli / insan kontrolü gerekli” sonucunu hazırlar.

## STAGE 7 — Human Review Gate
- OSRM call, route draft create, route preview, route apply ve dispatch hazırlığı için insan onayı gerekir.
- LOW_CONFIDENCE coordinate, missing hub, missing direction, outlier stop, KVKK belirsizliği ve cross-organization risk manuel kontrol gerektirir.
- Bu milestone onay ekranı veya execute akışı açmaz; sadece guard/policy tanımlar.

## STAGE 8 — Handoff to Next Milestones
Bu milestone şu sonraki milestone’lara veri hazırlar:

- `COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01`
- `COPILOT-DEMAND-INTAKE-01`
- `COPILOT-RFQ-PREP-01`
- `COPILOT-DISPATCH-ACTION-PREP-01`

Handoff sadece OSRM readiness/risk/draft-prep diliyle olur.
OSRM call, stop, route, dispatch veya agreement execute yok.

## Copilot görev sınırı
- `OSRM_READINESS_EXPLAIN`: OSRM route draft’a hazır olup olmadığını açıklar
- `COORDINATE_READINESS_REPORT`: lat/lng/geocode readiness durumunu açıklar
- `DIRECTION_OSRM_INPUT_EXPLAIN`: inbound/outbound OSRM input modelini açıklar
- `HUB_AND_STOP_SEQUENCE_READINESS`: hub ve stop sequence hazırlığını özetler
- `OSRM_RISK_SUMMARY`: OSRM input risklerini listeler
- `OUTLIER_STOP_HINT`: olası uç/aykırı durakları işaretler
- `MANUAL_REVIEW_LIST`: insan kontrolü gereken durak/adres/route adaylarını listeler
- `ROUTE_PREVIEW_READINESS`: route preview için hazır olup olmadığını açıklar
- `HUMAN_APPROVAL_REQUIRED`: OSRM/route preview/apply için insan onayı gerektiğini belirtir

## Role bazlı kullanım

### COMPANY
- Excel/adres/durak hattından gelen servis talebinin OSRM route draft’a hazır olup olmadığını görür.
- Eksik coordinate, hub, direction, capacity/outlier risklerini görür.
- OSRM/route preview/apply execute yok.

### SCHOOL
- Öğrenci/veli/personel adresleri hassas kabul edilir.
- LOW_CONFIDENCE coordinate ve KVKK riskleri manuel kontrol gerektirir.
- OSRM/route execute yok.

### ORGANIZATION
- Grup/ekip/personel adresleri için OSRM readiness ve route preview readiness özetini görür.
- Cross-organization veri yok.
- OSRM/route execute yok.

### SUPER_ADMIN
- Platform genelinde OSRM readiness standardını ve guardrail’i görür.
- Cross-tenant/cross-organization riskleri izler.
- Global write/action yok.

### ROOM
- Operatör tarafında ileride gelecek route preview kalitesini yorumlayabilir.
- Araç/sürücü assignment yok.
- Route apply yok.
- Dispatch apply yok.

### DRIVER
- OSRM route draft roadmap gösterilmez.
- Sadece ileride doğrulanmış rota/check-in açıklamalarında etkilenebilir.
- Driver action execute yok.

### PERSONEL / PARENT
- Kişisel adres/durak/rota verisi hassas kabul edilir.
- OSRM/route/payment/contract execute yok.
- Sadece destek/açıklama bağlamı olabilir.

## KVKK / veri güvenliği sınırı
- Kişi + adres + koordinat + rota adayları kişisel veri riski taşır.
- Öğrenci/veli/personel adresleri hassas operasyonel veri kabul edilir.
- Bu milestone lat/lng, stop, route veya OSRM sonucunu saklama ya da DB’ye yazma açmaz.
- KVKK/izin belirsizliği varsa OSRM readiness “manual review required” olur.
- Cross-organization/cross-tenant veri karışması OSRM route draft için blocked risk sayılır.
- İnsan onayı olmadan OSRM/route preview/apply/write yapılmaz.
- Public dokümanda “Excel’den otomatik rota oluşturur” vaadi yok.
- Testle kanıtlanmamış runtime OSRM kabiliyeti vaat edilmez.

## Static helper
- `backend/src/ai/chat/osrmRouteDraftFromExcelPolicy.js` sadece static config/export taşır.
- Runtime execution yoktur.
- Tool execution yoktur.
- Write-action handler yoktur.
- Mutation yoktur.

## Kapsam dışı
- Runtime OSRM route calculation açılmaz.
- OSRM table/match/route call açılmaz.
- Route preview generation açılmaz.
- Distance/duration/polyline generation açılmaz.
- Stop create açılmaz.
- Route draft create/apply açılmaz.
- Route apply açılmaz.
- Geocode execute açılmaz.
- Lat/lng persistent write açılmaz.
- DB write açılmaz.
- Demand/shift/personel create execute açılmaz.
- Driver/vehicle assignment açılmaz.
- Dispatch apply açılmaz.
- RFQ send açılmaz.
- Offer accept/reject açılmaz.
- Agreement/contract execute açılmaz.
- Payment/hakediş execute açılmaz.
- SMS/email/push açılmaz.
- Provider credential management açılmaz.
- User/account/admin write-action açılmaz.
- Runtime AI action açılmaz.
- Tool execution açılmaz.
- Write-action dispatcher açılmaz.
- Backend route/service/schema açılmaz.
- Prisma/schema/migration açılmaz.

## Public promise / güven stratejisi
- AI her şeyi yapar public promise yok.
- Tek tıkla Excel’den otomatik rota oluşturur vaadi yok.
- Underpromise, overdeliver stratejisi korunur.
- Sefer Abi içeride daha güçlü analiz / öneri hazırlığı yapabilir ama kanıtlanmamış execution vaat edilmez.
- Nihai karar kullanıcıdadır.
- Kritik işlerde insan onayı gerekir.

## Not
- Bu milestone docs/check odaklıdır; runtime OSRM call, route preview executor, route apply, backend route/service/schema, Prisma, smoke policy veya browser-smoke artifact açmaz.
