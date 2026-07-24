# COPILOT RFQ PREP 01

Tarih: 2026-07-24
Repo: `servis-platform`

## docs/check milestone
- Bu doküman docs/check milestone kaydıdır; runtime feature, tool execution, stage/commit/tag/push ve browser-smoke artifact açmaz.
- Canonical check: `check:copilotrfqprep01`
- Komut: `node backend\scripts\copilot_rfq_prep_01_check.js`
- Static source of truth gerektiğinde `backend/src/ai/chat/copilotRfqPrep.js` ile taşınır; helper runtime executor değildir.

## Amaç
- `COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01` sonrasında Sefer Abi için draft-only RFQ prep companion katmanını kilitler.
- Bu milestone supplier matching, offer collect veya RFQ send açmaz.
- Verified supplier, telematics readiness, capacity fit ve quality risk sinyallerini güvenli shortlist hazırlığı olarak açıklar.
- Human approval gate ayrıdır; gerçek RFQ, teklif toplama veya seçim işlemleri insan onayı olmadan yapılmaz.
- Backend route/service/schema ve Prisma açmaz.
- Public promise overclaim yazmaz.

## RFQ prep lifecycle

### STAGE 1 — RFQ Scope Intake
- Talep kapsamını, aday havuzunu ve hazırlık kaynağını okur.
- Belirsiz hedef, zaman, kapasite veya bölge sinyallerini listeler.
- Runtime write yok.

### STAGE 2 — Candidate Readiness Matrix
- Verified supplier, telematics readiness, capacity fit, quality ve coverage sinyallerini bir matriste toplar.
- Supplier auto-selection yok.
- Offer collect yok.

### STAGE 3 — Risk and Privacy Gate
- KVKK, cross-organization boundary, stale/offline telematics ve eksik veri risklerini özetler.
- PII minimizasyonu korunur.
- Runtime RFQ, supplier matching veya offer collect yok.

### STAGE 4 — Draft-Only RFQ Prep
- RFQ hazırlık notu, shortlist taslağı ve karar öncesi özet üretir.
- Hazırlık dili kullanır: `kontrol edilmeli`, `onaya sun`, `hazırlık notu`, `kısa shortlist`.
- RFQ send açılmaz.
- Supplier matching açılmaz.
- Offer collect açılmaz.

### STAGE 5 — Human Approval Gate
- RFQ send, supplier matching veya offer collect için açık insan onayı gerekir.
- Silent execution yok.
- Reversible olmayan aksiyonlar ayrı onay ister.

### STAGE 6 — Next Milestone Handoff
Bu milestone şu sonraki milestone’lara güvenli veri hazırlar:

- `COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01`
- `COPILOT-HUMAN-APPROVAL-01`
- `SUPPLIER-MATCHING-01`
- `SUPPLIER-OFFER-COLLECT-01`
- `COPILOT-OFFER-ANALYSIS-01`
- `COPILOT-OFFER-RECOMMENDATION-01`
- `COPILOT-SHIFT-TO-AGREEMENT-PREP-01`
- `COPILOT-DISPATCH-ACTION-PREP-01`

## Copilot görev sınırı
- `READ`: mevcut sinyalleri okur
- `EXPLAIN`: aday ve risk durumunu açıklar
- `RECOMMEND`: güvenli sonraki hazırlık adımını önerir
- `PREPARE`: checklist, özet, readiness matrisi ve karar öncesi taslak hazırlar
- `DRAFT`: RFQ hazırlık notu ve kısa taslak üretir
- `RISK_SUMMARY`: kalite, KVKK, capacity ve telematics risklerini özetler
- `NEXT_STEP`: sıradaki güvenli adımı önerir
- `HUMAN_APPROVAL_REQUIRED`: kritik adımlar için insan onayı gerektiğini söyler

## Role bazlı kullanım

### SUPER_ADMIN
- RFQ pipeline readiness, verified supplier readiness ve riskleri görür.
- Execute yok.

### COMPANY
- Talep hazırlığı, aday readiness ve RFQ prep notu görür.
- RFQ send yok.

### ROOM
- Supplier candidate readiness, quality, telematics ve capacity fit görür.
- Supplier matching execute yok.

### SCHOOL
- Öğrenci/personel/route readiness ve privacy risk özeti görür.
- Cross-organization write yok.

### ORGANIZATION
- Grup / organization readiness ve boundary risklerini görür.
- Cross-organization write yok.

### DRIVER
- RFQ prep roadmap gösterilmez.
- Driver action execute yok.

### PERSONEL / PARENT
- RFQ prep roadmap gösterilmez.
- Kişisel veri / approval / offer akışı açılmaz.

## Uyum / sinyal katmanları
- `COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01` ile uyumludur; talep -> teklif -> sözleşme hazırlığının RFQ prep companion katmanıdır.
- `COPILOT-HUMAN-APPROVAL-01` ile uyumludur; kritik işlem insan onayına bağlı kalır.
- `VERIFIED-SUPPLIER-01` ile uyumludur; verified supplier sinyalini hazırlık girdisi olarak kullanır.
- `OFFER-RANKING-QUALITY-01` ile uyumludur; kalite ve risk sinyallerini okur ama otomatik seçim yapmaz.
- `TELEMATICS-PROVIDER-HUB-01` ile uyumludur; telematics readiness ve provider boundary korunur.
- `SAFE-DRIVE-01` ile uyumludur; safety ve risk görünürlüğü korunur.
- `UX-MARKETPLACE-PANELS-01` ile uyumludur; readiness / preview görünürlüğünü bozmadan ilerler.

## Güven / public promise stratejisi
- Kullanıcıya "AI her şeyi yapar" denmez.
- Public promise sadece testle kanıtlanmış kabiliyeti söyler.
- Underpromise, overdeliver stratejisi korunur.
- Sefer Abi içeride daha güçlü analiz / hazırlık yapabilir ama kanıtlanmamış execution vaat edilmez.
- Nihai karar kullanıcıdadır.
- Kritik işlerde insan onayı gerekir.

## Static helper
- `backend/src/ai/chat/copilotRfqPrep.js` sadece static config/export taşır.
- Runtime execution yoktur.
- Tool execution yoktur.
- Write-action handler yoktur.
- Mutation yoktur.

## Kapsam dışı
- Runtime AI action yok.
- Tool execution yok.
- Write-action dispatcher yok.
- RFQ send açılmaz.
- Supplier matching açılmaz.
- Offer collect açılmaz.
- Offer accept/reject açılmaz.
- Agreement/contract execute açılmaz.
- Dispatch apply açılmaz.
- Route apply açılmaz.
- Driver/vehicle assignment açılmaz.
- Payment/hakediş execute açılmaz.
- SMS/email/push açılmaz.
- Provider credential management açılmaz.
- User/account/admin write-action açılmaz.
- Backend route/service/schema açılmaz.
- Prisma/schema/migration açılmaz.
- No production DB.
- No destructive query.
- No route/service/prisma diff.

## Validation results
- `rfqPrepSummary`
- `candidateReadinessSummary`
- `humanApprovalBoundarySummary`
- `compatibilitySummary`
- `smokeThresholdSummary`
- `chainWiringSummary`
- `commitExternalSummary`
- `prismaSummary`
- `rfqPrepSummary=draft-only RFQ prep stays visible`
- `candidateReadinessSummary=verified supplier, telematics readiness, capacity fit and quality signals stay visible`
- `humanApprovalBoundarySummary=No RFQ send, supplier matching, offer collect, offer accept/reject, agreement execute, dispatch apply, route apply, payment/hakediş execute, messaging, provider credential or user/admin write`
- `compatibilitySummary=COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01 | COPILOT-HUMAN-APPROVAL-01 | SUPPLIER-MATCHING-01 | SUPPLIER-OFFER-COLLECT-01 | COPILOT-OFFER-ANALYSIS-01 | COPILOT-OFFER-RECOMMENDATION-01 | COPILOT-SHIFT-TO-AGREEMENT-PREP-01 | COPILOT-DISPATCH-ACTION-PREP-01`
- `smokeThresholdSummary=product-flow PASS 18/0/0/0; premium PASS 82/0/0/0; all-panels PASS 82/0/0/0; mobile all-roles PASS 82/0/0/0; consoleErrorCount=0; pageErrorCount=0; 429=none`
- `chainWiringSummary=package.json + runner + verify chain + harness check/doc + guide + primer`
- `commitExternalSummary=runtime-data/browser-smoke remain commit-external; stage stays empty`
- `prismaSummary=No route/service/prisma diff; no production DB; no schema/migration; read-only only`
- `PASS COPILOT-RFQ-PREP-01`

## Remaining risks
- Kandidat readiness matrisi yanlış veya eksik veri ile doldurulursa RFQ hazırlık notu eksik kalabilir.
- Supplier matching veya offer collect hattı yanlışlıkla bu milestone’a bağlanmamalıdır.
- Human approval olmadan kritik işlemler açılmamalıdır.

## Next recommended milestone
`SUPPLIER-MATCHING-01`
