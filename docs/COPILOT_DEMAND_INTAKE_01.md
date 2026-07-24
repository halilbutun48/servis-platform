# COPILOT DEMAND INTAKE 01

Tarih: 2026-07-24
Repo: `servis-platform`

## docs/check milestone
- Bu doküman docs/check milestone kaydıdır; runtime feature, tool execution, stage/commit/tag/push ve browser-smoke artifact açmaz.
- Canonical check: `check:copilotdemandintake01`
- Komut: `node backend\scripts\copilot_demand_intake_01_check.js`
- Static source of truth gerektiğinde `backend/src/ai/chat/copilotDemandIntake.js` ile taşınır; helper runtime executor değildir.

## Amaç
- Sefer Abi’nin servis talebini güvenli draft-only intake olarak anlamasını, sınıflandırmasını ve eksik bilgi için netleştirme soruları üretmesini kilitler.
- Bu milestone runtime AI action açmaz.
- Tool execution, write-action dispatcher, otomatik talep oluşturma, Excel/CSV import execute, route apply, dispatch apply, RFQ send, offer accept/reject, agreement/contract execute, payment/hakediş execute veya provider credential yönetimi açmaz.
- PII, token, cookie, password, raw GPS ve benzeri secret / sensitive veriler görünür halde taşınmaz.
- Kullanıcıya yalnızca draft, summary ve next safe step gösterilir.
- Approval gate ayrı kalır; bu milestone tek başına write path açmaz.

## STAGE 1 — Request Understanding
- Gelen talep okunur.
- Talep içeriği tekil istek değilse bile intent çıkarımı yapılır.
- Draft-only akış korunur.
- Runtime write yok.

## STAGE 2 — Demand Type Classification
### Desteklenen demand tipleri
- Personel servis talebi
- Okul / öğrenci servis talebi
- Vardiya bazlı servis talebi
- Düzenli hat / rota talebi
- Tek seferlik servis talebi
- Mevcut sözleşmeye ek hat / ek vardiya talebi
- Kapasite artırma talebi
- Güzergah değişikliği talebi

### Sınıflandırma modeli
- Intent request
- Intent clarifying
- Intent draft-only
- Belirsiz talep
- Type match confidence
- Missing field visibility
- Privacy-safe summary

## STAGE 3 — Required Fields
### Ortak alanlar
- organization
- serviceType
- location
- headcount
- direction
- dateOrFrequency
- consentSignal

### Opsiyonel alanlar
- requesterRole
- contactName
- contactPhone
- contactEmail
- notes
- routeRef
- shiftRef
- schoolName
- existingContractRef
- effectiveDate
- capacityTarget
- currentCapacity
- currentRouteRef
- changeReason

## STAGE 4 — Clarifying Question Policy
- Eksik alan varsa soru üretilir.
- Belirsiz hizmet tipi netleştirilir.
- KVKK / izin sinyali yoksa önce izin sorulur.
- Tarih / sıklık belirsizse önce zaman bağlamı istenir.
- Kapasite, rota veya sözleşme referansı eksikse önce referans sorulur.
- Soru dili kısa, net ve kullanıcı dostu kalır.

## STAGE 5 — Data Classification
- Servis talebi; kurum, kişi, öğrenci, sözleşme, rota ve iletişim verisi içerebilir.
- Kritik entity matrix talep, kurum, okul, rota, vardiya, sözleşme ve kapasite bağını birlikte okur.
- Referential integrity policy, sahte referans veya kopuk alan üretmez.
- Transaction boundary policy draft-only kalır; write path açılmaz.
- Idempotency ve retry-safety policy, aynı talebin tekrar sorulması halinde duplicate write üretmez.

## STAGE 6 — Privacy / KVKK Safety
- Ham telefon, e-posta, adres, isim, token, cookie, password ve raw GPS taşınmaz.
- KVKK-safe backup/logging dili korunur.
- Generated artifact policy gereği debug log ve commit-external artifaktlar stage'e alınmaz.
- No production DB, no destructive query, no schema/migration, no route/service/prisma diff.

## STAGE 7 — Human Approval Gate
- Gerçek create / apply / send / accept / execute için insan onayı gerekir.
- Draft-only çıktı yalnızca hazırlık niteliğindedir.
- Dışa çıkan her kritik metin önizleme olarak kalır.
- Ayrı approval gate olmadan write path açılmaz.

## STAGE 8 — Next Safe Handoffs
Bu milestone şu güvenli hatlara veri hazırlar:

- `COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01`
- `COPILOT-HUMAN-APPROVAL-01`
- `COPILOT-EXCEL-DEMAND-IMPORT-01`
- `ADDRESS-GEOCODING-CONFIDENCE-01`
- `COPILOT-STOP-ROUTE-DRAFT-01`
- `OSRM-ROUTE-DRAFT-FROM-EXCEL-01`
- `COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01`
- `EXCEL-TO-ROUTE-READINESS-REDTEAM-01`

## Copilot görev sınırı
- `INTAKE_SUMMARY`: talep özetini çıkarır
- `DEMAND_TYPE_CLASSIFY`: demand tipini sınıflandırır
- `MISSING_FIELD_REPORT`: eksik alanları listeler
- `CLARIFYING_QUESTION_PREPARE`: netleştirme soruları hazırlar
- `PRIVACY_SAFE_MASKING`: PII-safe maskeleme uygular
- `DRAFT_ONLY_PREVIEW`: yalnız draft önizleme hazırlar
- `HUMAN_APPROVAL_REQUIRED`: gerçek write path için insan onayı gerektiğini söyler

## Role bazlı kullanım

### COMPANY
- Talep özetini, eksik alanları ve uygun demand tipini görür.
- Talep oluşturma, RFQ gönderme, teklif kabulü veya sözleşme execute yok.

### ROOM
- Rota, vardiya, kapasite ve operasyon hazırlık sinyallerini görür.
- Dispatch apply, driver/vehicle assignment ve route apply yok.

### SCHOOL / ORGANIZATION
- Plan readiness ve eksik veri listesi görür.
- Cross-organization write yok.

### SUPER_ADMIN
- Platform genelinde intake standardını, risk ve privacy sınırlarını görür.
- Unsafe write-action yok.

### DRIVER
- Sadece güvenli açıklama görür.
- Kendi adına execute yok.

### PERSONEL / PARENT
- Kendi bağlantılı servis görünümünü ve destek açıklamasını görür.
- Başkası adına veri açma veya yazma yok.

## Static helper
- `backend/src/ai/chat/copilotDemandIntake.js` sadece pure static policy/export taşır.
- Runtime execution yoktur.
- Tool execution yoktur.
- Write-action handler yoktur.
- Mutation yoktur.

## Kapsam dışı
- Runtime AI action açılmaz.
- Tool execution açılmaz.
- Write-action dispatcher açılmaz.
- Demand create execute açılmaz.
- Excel/CSV import execute açılmaz.
- Route apply açılmaz.
- Dispatch apply açılmaz.
- RFQ send açılmaz.
- Offer accept/reject açılmaz.
- Agreement/contract execute açılmaz.
- Payment/hakediş execute açılmaz.
- Provider credential management açılmaz.
- User/account/admin write-action açılmaz.
- Backend route/service/schema açılmaz.
- Prisma/schema/migration açılmaz.
- Production DB açılmaz.
- Destructive query açılmaz.
- No route / service / prisma diff.
- No production DB.
- No destructive query.

## Validation results
- `intakeSummary`
- `classificationSummary`
- `privacySummary`
- `clarifyingQuestionSummary`
- `handoffSummary`
- `compatibilitySummary`
- `smokeThresholdSummary`
- `chainWiringSummary`
- `commitExternalSummary`
- `prismaSummary`
- `intakeSummary=draft-only demand intake stays visible`
- `classificationSummary=service type and intent classification stays visible`
- `privacySummary=PII masking and sensitive value redaction stays visible`
- `clarifyingQuestionSummary=missing fields produce short clarifying questions`
- `handoffSummary=COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01 | COPILOT-HUMAN-APPROVAL-01 | COPILOT-EXCEL-DEMAND-IMPORT-01 | ADDRESS-GEOCODING-CONFIDENCE-01 | COPILOT-STOP-ROUTE-DRAFT-01 | OSRM-ROUTE-DRAFT-FROM-EXCEL-01 | COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01`
- `compatibilitySummary=COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01 | COPILOT-HUMAN-APPROVAL-01 | COPILOT-EXCEL-DEMAND-IMPORT-01`
- Smoke threshold: 18/82/82/82
- `smokeThresholdSummary=product-flow PASS 18/0/0/0; premium PASS 82/0/0/0; all-panels PASS 82/0/0/0; mobile all-roles PASS 82/0/0/0; consoleErrorCount=0; pageErrorCount=0; 429=none`
- `chainWiringSummary=package.json + runner + verify chain + harness check/doc + guide + primer`
- `commitExternalSummary=runtime-data/browser-smoke remain commit-external; stage stays empty`
- `prismaSummary=No route/service/prisma diff; no production DB; no schema/migration; read-only only`
- `PASS COPILOT-DEMAND-INTAKE-01`

## Remaining risks
- Belirsiz veya parçalı talep, yanlış demand type'a düşebilir; bu durumda clarifying question gerekir.
- Ham adres veya iletişim alanı yeterince net maskelenmezse privacy-safe görünüm zayıflar.
- Future runtime write milestone'ları bu helper'a yanlışlıkla bağlanmamalıdır.

## Next recommended milestone
`COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01`
