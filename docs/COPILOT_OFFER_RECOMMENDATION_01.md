# COPILOT OFFER RECOMMENDATION 01

Tarih: 2026-07-25
Repo: `servis-platform`

## docs/check milestone
- Bu doküman docs/check milestone kaydıdır; runtime feature, tool execution, stage/commit/tag/push ve browser-smoke artifact açmaz.
- Canonical check: `check:copilotofferrecommendation01`
- Komut: `node backend\scripts\copilot_offer_recommendation_01_check.js`
- Static source of truth gerektiğinde `backend/src/ai/chat/copilotOfferRecommendation.js` ile taşınır; helper runtime executor değildir.

## 1) Amaç
- `COPILOT-NEGOTIATION-ASSIST-01` sonrasında gelen read-only recommendation companion milestone'dır.
- Teklif analizi ve pazarlık hazırlığı sinyallerini öneri taslağına ve onay paketi draftına çevirir.
- Supplier selection, offer accept/reject, supplier contact ve RFQ send açmaz.
- Bu milestone yalnızca docs/check/helper seviyesindedir.
- DB persistence, audit event write, route/service/prisma mutation ve browser/public probe açmaz.
- Kullanıcıya sadece karar destek taslağı ve insan onayına gidecek güvenli bir next step sunar.

## 2) Kanonik akış
- `COPILOT-RFQ-PREP-01`
- `SUPPLIER-MATCHING-01`
- `SUPPLIER-OFFER-COLLECT-01`
- `COPILOT-OFFER-ANALYSIS-01`
- `COPILOT-NEGOTIATION-ASSIST-01`
- `COPILOT-OFFER-RECOMMENDATION-01`
- `COPILOT-HUMAN-APPROVAL-01`
- `COPILOT-SHIFT-TO-AGREEMENT-PREP-01`
- `COPILOT-DISPATCH-ACTION-PREP-01`
- Source offer analysis handoff: supplier offer collect kısa listesinden gelen comparison matrix ve masked supplier labels.
- Source negotiation assist handoff: offer analysis çıktısından gelen pazarlık fırsatları, risk/value sinyali ve readiness notları.
- Source RFQ prep handoff: demand-to-agreement yolundan gelen RFQ draft çerçevesi ve kapsam sinyali.
- Recommendation handoff: insan onayına sunulacak öneri taslağı ve approval packet hazırlığı.

## 3) Supported recommendation types
- en iyi değer önerisi
- en düşük risk önerisi
- bütçe duyarlı öneri
- SLA öncelikli öneri
- kapasite öncelikli öneri
- uygunluk öncelikli öneri
- alternatif aday önerisi
- engellenen öneri isteği
- onay paketi hazırlığı
- genel öneri

## 4) Recommendation input summary
- RFQ type
- offer analysis state
- negotiation assist state
- comparison matrix rows
- opportunity count
- candidate suppliers / masked labels
- service scope
- region / province / district
- start date
- day / period / hour / shift
- passenger / personnel / student count
- vehicle capacity requirement
- SLA / quality expectation
- document / license / safety requirement
- analysis / opportunity mismatch count
- alternative candidate count

## 5) Criteria model
- supplierRef
- supplierLabelMasked
- recommendationType
- recommendationTypeLabel
- analysisScore
- valueScore
- riskScore
- recommendationScore
- fitLevel
- riskLevel
- priority
- missingFields
- supportingOpportunityTypes
- supportingSignals
- recommendationReason
- humanReviewRequired=true
- notAccepted=true
- notRejected=true
- notSelected=true
- notContacted=true
- notSent=true
- draftOnly=true

## 6) Scorecard output model
- rank
- supplierRef
- supplierLabelMasked
- recommendationType
- recommendationTypeLabel
- analysisScore
- valueScore
- riskScore
- recommendationScore
- scoreBand
- priority
- fitLevel
- riskLevel
- missingFields
- supportingOpportunityTypes
- supportingSignals
- recommendationReason

## 7) Recommendation draft policy
- Fiyat, kapsam, SLA, kapasite ve risk birlikte okunur.
- En düşük fiyat tek başına karar değildir.
- Alternatif adaylar ayrı tutulur; otomatik seçim yapılmaz.
- Öneri taslağı bağlayıcı değildir.
- Human approval boundary korunur.
- Eksik alanlar tamamlanmadan kesin karar verilmez.
- Supplier contact, RFQ send, teklif kabul / ret ve tedarikçi seçimi açılmaz.

## 8) Approval packet draft
- Approval packet draft insan onayına gidecek kısa paket görünümüdür.
- Paket, en güçlü adayın neden öne çıktığını ve hangi alanların kontrol edilmesi gerektiğini özetler.
- Adaylar, alternatifler, risk özeti ve eksik alanlar birlikte görünür.
- `Approval packet draft` yalnızca karar destek taslağıdır.
- Paket onayı olmadan teklif kabul / ret, seçim, contact veya send yapılmaz.

## 9) Safety / boundary
- `No route / service / prisma diff.`
- `No production DB.`
- `No destructive query.`
- `No browser / public probe.`
- `No write-action.`
- `No message / email / SMS / push.`
- `No supplier selection.`
- `No offer accept / reject.`
- `No agreement / contract execute.`
- `No dispatch apply.`
- `No route apply.`
- `No payment / hakediş execute.`
- `No provider credential management.`

## 10) Türkçe visible answer
- Teklif öneri taslağını hazırladım; henüz hiçbir teklif kabul edilmedi veya reddedilmedi.
- Tedarikçi seçimi yapılmadı ve sözleşme başlatılmadı.
- Bu sonuç karar değil, insan onayına sunulacak karar destek taslağıdır.
- Öne çıkan aday, fiyat, kapsam, SLA, kapasite ve risk dengesine göre görünür.
- Sıradaki güvenli adım: öneri paketini kontrol edip insan onayına sunmak.

## 11) Static helper
- Static helper: `backend/src/ai/chat/copilotOfferRecommendation.js`
- Export edilen sabitler: version, supported types, criteria model, scorecard fields, draft fields ve approval packet fields.
- Export edilen yüzeyler: `composeOfferRecommendationAnswer`, `buildOfferRecommendationInput`, `buildRecommendationCriteriaModel`, `buildRecommendationScorecard`, `buildOfferRecommendationDraft`, `buildApprovalPacketDraft`.
- Helper yalnızca read-only recommendation üretir; runtime executor değildir.

## 12) What is not changed
- No route / service / prisma diff.
- No production DB.
- No destructive query.
- No browser / public probe.
- No write-action.
- No message / email / SMS / push.
- No supplier selection.
- No offer accept / reject.
- No agreement / contract execute.
- No dispatch apply.
- No route apply.
- No payment / hakediş execute.
- No provider credential management.

## 13) Validation results
- PASS COPILOT-OFFER-RECOMMENDATION-01
- Read-only recommendation flow keeps draftOnly, approvalRequired and humanReviewRequired boundaries.
- Guard cases are preserved by the check script.

## 14) Remaining risks
- Nihai karar yine insan onayı ister.
- Recommendation taslağı, execution boundary ile karışmamalıdır.
- Supplier contact, RFQ send ve offer accept/reject hala kapalı kalmalıdır.

## 15) Next recommended milestone
- `COPILOT-HUMAN-APPROVAL-01`
- Sonraki güvenli adım, öneri taslağını insan onay akışına bağlamaktır.
