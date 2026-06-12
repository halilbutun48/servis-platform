# COPILOT STOP ROUTE DRAFT 01

Tarih: 2026-06-12
Repo: `servis-platform`

## docs/check milestone
- Bu doküman docs/check milestone kaydıdır; runtime feature, tool execution, stage/commit/tag/push ve browser-smoke artifact açmaz.
- Canonical check: `check:copilotstoproutedraft01`
- Komut: `node backend\scripts\copilot_stop_route_draft_01_check.js`
- Static source of truth gerektiğinde `backend/src/ai/chat/copilotStopRouteDraftPolicy.js` ile taşınır; helper runtime executor değildir.

## Amaç
- `ADDRESS-GEOCODING-CONFIDENCE-01` sonrasında stop / route draft readiness katmanını güvenli ve statik olarak kilitler.
- Inbound / outbound direction modelini, hub readiness sinyallerini, capacity readiness sinyallerini ve human review gate'i docs/check olarak sabitler.
- Public promise overclaim yapmaz.
- Runtime stop create, route apply, dispatch apply, driver/vehicle assignment veya OSRM execute açmaz.
- `COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01` ve `COPILOT-HUMAN-APPROVAL-01` için güvenli bir handoff katmanı sağlar.
- Bu doküman docs/check kilididir; backend route/service/schema veya Prisma açmaz.

## Stop / route draft lifecycle

### STAGE 1 — Signal Intake
- Talep, adres, durak, servis tipi, yön ve kapasite sinyallerini okur.
- Eksik sinyalleri listeler.
- Runtime write yok.

### STAGE 2 — Inbound / Outbound Direction Model
- Sabah inbound ve akşam outbound akışını ayrı taslaklar olarak açıklar.
- Mixed / unknown direction durumunda manuel kontrol gerektiğini söyler.
- Route apply yok.

### STAGE 3 — Stop Draft Scoping
- Durak taslağını ve stop sırasını preview olarak açıklar.
- Stop create yok.
- Yalnız taslak ve kontrol metni üretir.

### STAGE 4 — Hub Readiness
- Telematics hub, provider registry ve route review readiness sinyallerini okur.
- Gerçek provider credential veya runtime geocode çağrısı yapmaz.

### STAGE 5 — Capacity Readiness
- Vehicle, driver, shift ve kapasite sinyallerini birlikte okur.
- Capacity fit riskini açıklar.
- Driver/vehicle assignment yok.

### STAGE 6 — Human Review Gate
- Stop / route draft için explicit human approval gerekir.
- Preview ve risk summary gösterilir.
- Silent execution yok.

### STAGE 7 — Route Review Handoff
- OSRM / route review için hazırlanmış taslak notu üretir.
- Route review approval olmadan route apply açılmaz.
- Handoff yalnız sonraki güvenli halkalara gider.

### STAGE 8 — Next Milestone Handoff
- `OSRM-ROUTE-DRAFT-FROM-EXCEL-01`
- `COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01`
- `COPILOT-DEMAND-INTAKE-01`
- `COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01`

## Direction model
- INBOUND: sabah servis yönü ve pickup odaklı akış.
- OUTBOUND: akşam servis yönü ve dropoff odaklı akış.
- MIXED: aynı hat üzerinde ayrı taslaklar.
- UNKNOWN: direction sinyali eksik; manuel kontrol gerekir.

## Hub readiness
- TELEMATICS_HUB_READY: telematics hub readiness
- ROUTE_DRAFT_PREVIEW_READY: route draft preview readiness
- VEHICLE_DRIVER_READINESS_READY: vehicle / driver readiness
- HUMAN_REVIEW_REQUIRED: human review required

## Capacity readiness
- CAPACITY_READY: capacity ready
- CAPACITY_TIGHT: capacity tight
- CAPACITY_CONSTRAINED: capacity constrained
- CAPACITY_UNKNOWN: capacity unknown

## Canonical tokens
### Task categories
- READ
- EXPLAIN
- RECOMMEND
- PREPARE
- DRAFT
- RISK_SUMMARY
- NEXT_STEP
- HUMAN_APPROVAL_REQUIRED

### Guard requirements
- explicit human approval
- role / RBAC scope check
- tenant / organization boundary check
- dry-run / preview payload
- risk summary
- audit log
- before/after snapshot
- rollback / undo note
- no silent execution
- no hidden background action
- no secret / token exposure
- no runtime AI action
- no tool execution
- no write-action dispatcher
- no route/service/schema mutation
- no Prisma write
- no stop create
- no route draft apply
- no geocode execute
- no OSRM call
- no driver/vehicle assignment
- no SMS/email/push
- KVKK / privacy minimization

### Blocked actions
- runtime stop create execute
- route draft create/apply
- route apply
- dispatch apply
- driver/vehicle assignment
- geocode execute
- OSRM route apply
- lat/lng write
- DB write
- RFQ send
- offer accept/reject
- agreement/contract execute
- payment/hakediş execute
- SMS/email/push
- provider credential management
- user/account/admin write-action
- runtime AI action
- tool execution
- write-action dispatcher
- backend route/service/schema change
- Prisma/schema/migration change

### Never automate
- otomatik durak oluşturma
- otomatik route draft apply
- otomatik route apply
- otomatik dispatch uygulama
- otomatik atama
- otomatik mesaj gönderimi
- otomatik provider credential yönetimi
- otomatik kullanıcı / rol / admin yazma

### Handoffs
- ADDRESS-GEOCODING-CONFIDENCE-01
- COPILOT-EXCEL-DEMAND-IMPORT-01
- OSRM-ROUTE-DRAFT-FROM-EXCEL-01
- COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01
- COPILOT-DEMAND-INTAKE-01
- COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01

## Role bazlı kullanım

### SUPER_ADMIN
- Route draft readiness, hub readiness ve capacity risklerini görür.
- Execute yok.

### COMPANY
- Demand yönü, route draft preview ve capacity fit notu görür.
- Route apply yok.

### ROOM
- Vehicle / driver readiness ve route review checklist görür.
- Assignment execute yok.

### DRIVER
- Stop order ve direction preview görür.
- Reached / skipped / complete execute yok.

### PERSONEL / PARENT
- Servis yönü ve destek notu görür.
- Başkası adına aksiyon yok.

### SCHOOL / ORGANIZATION
- Plan readiness ve capacity summary görür.
- Cross-organization write yok.

## Uyum / sinyal katmanları
- `ADDRESS-GEOCODING-CONFIDENCE-01` ile uyumludur; güvenli adres readiness'ten sonra stop / route draft preview'e geçer.
- `COPILOT-EXCEL-DEMAND-IMPORT-01` ile uyumludur; import önizleme sonrası stop / route draft hattı hazırlanır.
- `COPILOT-HUMAN-APPROVAL-01` ile uyumludur; kritik adımlar insan onayına bağlı kalır.
- `COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01` ile uyumludur; talep -> teklif -> sözleşme hazırlığının güvenli bir ara halkasıdır.

## Public promise / güven stratejisi
- Kullanıcıya "AI her şeyi yapar" denmez.
- Public promise sadece testle kanıtlanmış kabiliyeti söyler.
- Underpromise, overdeliver stratejisi korunur.
- Sefer Abi içeride daha güçlü analiz / öneri hazırlığı yapabilir ama kanıtlanmamış execution vaat edilmez.
- Nihai karar kullanıcıdadır.
- Kritik işlerde insan onayı gerekir.

## KVKK / data safety boundary
- Kişisel veri minimizasyonu ve privacy sınırı korunur.
- Route draft / readiness analizi, açık veri sınırları içinde kalır.
- Token, credential ve secret taşınmaz.

## Static helper
- `backend/src/ai/chat/copilotStopRouteDraftPolicy.js` sadece static config/export taşır.
- Runtime execution yoktur.
- Tool execution yoktur.
- Write-action handler yoktur.
- Mutation yoktur.

## Kapsam dışı
- Runtime stop create açılmaz.
- Route apply açılmaz.
- Dispatch apply açılmaz.
- Driver/vehicle assignment açılmaz.
- Geocode execute açılmaz.
- OSRM route apply açılmaz.
- Payment / billing / hakediş execute açılmaz.
- Contract / agreement execute açılmaz.
- Offer accept/reject açılmaz.
- Supplier auto-selection açılmaz.
- Provider credential management açılmaz.
- User / account / admin write-action açılmaz.
- SMS / email / push açılmaz.
- Runtime AI action açılmaz.
- Tool execution açılmaz.
- Write-action dispatcher açılmaz.
- Backend route / service / schema açılmaz.
- Prisma / schema / migration açılmaz.

## Not
- Bu milestone docs/check odaklıdır; downstream route review ve OSRM hazırlık halkaları için güvenli sınır çizer.
- Stop / route draft ancak ayrı milestone, guard ve audit modeli ile ilerleyebilir.
