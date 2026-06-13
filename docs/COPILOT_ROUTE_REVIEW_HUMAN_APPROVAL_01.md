# COPILOT ROUTE REVIEW HUMAN APPROVAL 01

Tarih: 2026-06-13
Repo: `servis-platform`

## docs/check milestone
- Bu doküman route review human approval sınırını docs/check olarak kilitler.
- Canonical check: `check:copilotroutereviewhumanapproval01`
- Komut: `node backend\scripts\copilot_route_review_human_approval_01_check.js`
- Static source of truth gerektiğinde `backend/src/ai/chat/copilotRouteReviewHumanApprovalPolicy.js` ile taşınır; helper runtime executor değildir.

## Amaç
- `OSRM-ROUTE-DRAFT-FROM-EXCEL-01`, `COPILOT-STOP-ROUTE-DRAFT-01`, `ADDRESS-GEOCODING-CONFIDENCE-01`, `COPILOT-EXCEL-DEMAND-IMPORT-01` ve `COPILOT-HUMAN-APPROVAL-01` sonrası insan onaylı route review kapısını statik olarak tanımlar.
- Bu milestone route preview üretmez.
- Bu milestone OSRM call yapmaz.
- Bu milestone runtime route review/action açmaz.
- Demand create execute açılmaz.
- Excel/CSV import execute açılmaz.
- Address/geocode persistent write açılmaz.
- Route apply açılmaz.
- RFQ send açılmaz.
- Offer accept/reject açılmaz.
- Supplier auto-selection açılmaz.
- Agreement/contract execute açılmaz.
- Dispatch apply açılmaz.
- Driver/vehicle assignment açılmaz.
- Stop reached/skipped/complete açılmaz.
- Payment/hakediş execute açılmaz.
- SMS/email/push açılmaz.
- Provider credential management açılmaz.
- User/account/admin write-action açılmaz.
- Cross-organization write açılmaz.
- Voice command execute açılmaz.
- Autopilot real action açılmaz.
- Bu milestone route apply, stop create, route draft create, geocode execute, lat/lng write, DB write, dispatch apply, driver/vehicle assignment, RFQ send, offer accept/reject, agreement/contract execute, payment/hakediş execute, SMS/email/push, provider credential management, user/account/admin write-action, runtime AI action, tool execution veya write-action dispatcher açmaz.
- Route review sadece incelemeye hazır olup olmadığını açıklar.
- Public promise overclaim yok.
- Fake success yasaktır.

## STAGE 1 — Route Review Input Readiness
- Kaynak veri `COPILOT-EXCEL-DEMAND-IMPORT-01`, `ADDRESS-GEOCODING-CONFIDENCE-01`, `COPILOT-STOP-ROUTE-DRAFT-01` ve `OSRM-ROUTE-DRAFT-FROM-EXCEL-01` hattından gelir.
- Bu milestone route preview üretmez.
- Bu milestone OSRM call yapmaz.
- Bu milestone stop/route create/apply yapmaz.
- Sadece insan onayına sunulacak rota inceleme readiness modelini tanımlar.

## STAGE 2 — Review Evidence Checklist
Route review için gösterilmesi gereken kanıtlar:

1. route summary
2. source data lineage
3. affected people/stops/hub
4. direction
5. address/coordinate confidence
6. missing data
7. route risk summary
8. KVKK/cross-organization risk
9. operational impact
10. reversibility
11. audit expectation
12. safe fallback
13. explicit confirmation phrase

## STAGE 3 — Human Approval Decision States

### READY_FOR_HUMAN_REVIEW
- Required readiness kanıtları var.
- Kritik blocked risk yok.
- İnsan review ekranına/akışına hazırlanabilir.
- Execute yok.

### NEEDS_DATA_FIX
- Eksik adres, eksik coordinate, eksik hub, eksik direction veya belirsiz capacity var.
- Önce veri tamamlanmalı.

### MANUAL_REVIEW_REQUIRED
- LOW confidence coordinate/adres, outlier stop, duplicate risk, KVKK belirsizliği veya cross-organization risk var.
- İnsan incelemesi olmadan devam edilemez.

### BLOCKED_FOR_ROUTE_ACTION
- BLOCKED address, missing hub, cross-tenant/cross-organization risk veya KVKK kritik belirsizliği var.
- Route review/action ilerleyemez.

### APPROVAL_REQUIRED_BEFORE_EXECUTION
- Route preview, OSRM call, route apply, dispatch hazırlığı veya agreement/RFQ bağlantısı için açık insan onayı gerekir.
- Bu milestone execute açmaz.

## STAGE 4 — Approval Checklist
İnsan onayı öncesi Sefer Abi şunları hazırlayabilir:

1. Route summary
2. Source data lineage
3. Affected people/stops/hub
4. Direction: inbound/outbound
5. Address/coordinate confidence
6. Missing data
7. Route risk summary
8. KVKK/cross-organization risk
9. Operational impact
10. Reversibility / rollback expectation
11. Audit expectation
12. Safe fallback
13. Explicit confirmation phrase

## STAGE 5 — Review Boundaries
- Sefer Abi “incelemeye hazır” diyebilir.
- “Uyguladım”, “rotayı oluşturdum”, “OSRM ile hesapladım”, “dispatch’e aldım” diyemez.
- Fake success yasaktır.
- Route review readiness ile route execution ayrımı açık olmalı.
- User pressure ile write-action açılmaz.

## STAGE 6 — Handoff to Next Milestones
Bu milestone şu sonraki milestone’lara güvenli veri hazırlar:

- `COPILOT-DEMAND-INTAKE-01`
- `COPILOT-RFQ-PREP-01`
- `SUPPLIER-MATCHING-01`
- `COPILOT-DISPATCH-ACTION-PREP-01`
- `EXCEL-TO-ROUTE-READINESS-REDTEAM-01`

Handoff sadece review/readiness/human-approval diliyle olur.
Route apply, OSRM call, dispatch veya agreement execute yok.

## Copilot görev sınırı
- `ROUTE_REVIEW_READINESS_EXPLAIN`: rota incelemeye hazır mı açıklar
- `REVIEW_EVIDENCE_SUMMARY`: rota review kanıtlarını özetler
- `ROUTE_APPROVAL_CHECKLIST_PREPARE`: insan onayı checklist’i hazırlar
- `ROUTE_RISK_SUMMARY`: route/OSRM/coordinate/hub/direction risklerini özetler
- `MANUAL_REVIEW_LIST`: insan kontrolü gereken stop/adres/route adaylarını listeler
- `SAFE_FALLBACK_RECOMMENDATION`: eksik/veri riskinde güvenli sonraki adımı önerir
- `EXPLICIT_CONFIRMATION_PHRASE_PREPARE`: ileride onay ekranında gösterilecek açık onay cümlesi hazırlar
- `HUMAN_APPROVAL_REQUIRED`: route/OSRM/apply/dispatch için insan onayı gerektiğini belirtir

## Role bazlı kullanım

### COMPANY
- Route review readiness, eksik veri, risk, etki ve onay checklist’ini görür.
- Route apply / OSRM call / dispatch execute yok.

### SCHOOL
- Öğrenci/veli/personel adresleri hassas kabul edilir.
- LOW confidence coordinate, KVKK ve cross-organization riskleri manuel kontrol gerektirir.
- Route review readiness olabilir; route execute yok.

### ORGANIZATION
- Grup/ekip/personel adresleri için route review readiness ve risk özeti görür.
- Cross-organization veri yok.
- Route execute yok.

### SUPER_ADMIN
- Platform genelinde route review guardrail standardını ve cross-tenant riskleri görür.
- Global write/action yok.

### ROOM
- Operatör tarafında route review sonucu ileride dispatch hazırlığına girdi olabilir.
- Araç/sürücü assignment yok.
- Route apply yok.
- Dispatch apply yok.

### DRIVER
- Route review human approval roadmap gösterilmez.
- Sadece ileride doğrulanmış rota/check-in açıklamalarında etkilenebilir.
- Driver action execute yok.

### PERSONEL / PARENT
- Kişisel adres/durak/rota verisi hassas kabul edilir.
- Route/payment/contract/dispatch execute yok.
- Sadece destek/açıklama bağlamı olabilir.

## KVKK / veri güvenliği sınırı
- Kişi + adres + koordinat + rota adayları kişisel veri riski taşır.
- Öğrenci/veli/personel adresleri hassas operasyonel veri kabul edilir.
- Bu milestone lat/lng, stop, route, OSRM sonucu veya review decision’ı DB’ye yazmaz.
- KVKK/izin belirsizliği varsa route review “manual review required” olur.
- Cross-organization/cross-tenant veri karışması `BLOCKED_FOR_ROUTE_ACTION` veya kritik risk sayılır.
- İnsan onayı olmadan OSRM/route preview/apply/write yapılmaz.
- Public dokümanda “rotayı otomatik uygular” vaadi yok.
- Testle kanıtlanmamış runtime route review/approval kabiliyeti vaat edilmez.

## Public promise / güven stratejisi
- AI her şeyi yapar public promise yok.
- Tek tıkla her şeyi halleder gibi bir overclaim yok.
- Sefer Abi karar verici değil, karar destekleyici ve hazırlayıcıdır.
- İnsan onayı olmadan kritik işlem yapılmaz.
- Testle kanıtlanmamış kabiliyet public dokümanda vaat edilmez.
- Underpromise, overdeliver stratejisi korunur.

## Static helper
- `backend/src/ai/chat/copilotRouteReviewHumanApprovalPolicy.js` sadece static config/export taşır.
- Runtime execution yoktur.
- Tool execution yoktur.
- Write-action handler yoktur.
- Mutation yoktur.

## Kapsam dışı
- OSRM route calculation yok.
- OSRM table/match/route call yok.
- Route preview generation yok.
- Distance/duration/polyline generation yok.
- stop create yok.
- route draft create yok.
- route apply yok.
- geocode execute yok.
- lat/lng write yok.
- DB write yok.
- review decision persistent write yok.
- shift/demand/personel create yok.
- driver/vehicle assignment yok.
- dispatch apply yok.
- RFQ send yok.
- offer accept/reject yok.
- agreement/contract execute yok.
- payment/hakediş execute yok.
- SMS/email/push yok.
- provider credential management yok.
- user/account/admin write-action yok.
- runtime AI action yok.
- tool execution yok.
- write-action dispatcher yok.
- backend route/service/schema yok.
- Prisma/schema/migration yok.

## Not
- Bu milestone docs/check odaklıdır; route review readiness için güvenli temel tanımlar.
