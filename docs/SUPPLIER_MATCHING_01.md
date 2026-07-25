# SUPPLIER-MATCHING-01 — insan onaylı aday tedarikçi uygunluk taslağı

Tarih: 2026-07-24
Repo: `servis-platform`

Bu doküman, `COPILOT-RFQ-PREP-01` sonrası aday tedarikçi uygunluk hazırlığını draft-only, human-approved ve commit-external sınırda kilitler. Amaç, RFQ prep çıktısını supplier matching inputuna dönüştürmek; adayları yalnızca static/fixture veriyle ön değerlendirmeden geçirmek ve hiçbir tedarikçiyle gerçek temas kurmamaktır.
Bu taslak, downstream `SUPPLIER-OFFER-COLLECT-01`, `COPILOT-OFFER-ANALYSIS-01` ve `COPILOT-OFFER-RECOMMENDATION-01` hatlarına güvenli shortlist hazırlar.

## 1) Amaç
- RFQ prep çıktısını supplier matching inputuna dönüştürür.
- Aday tedarikçileri yalnızca static/fixture veri üzerinden değerlendirir.
- İnsan onayı olmadan tedarikçi seçimi, iletişim, RFQ gönderimi ve teklif toplama açmaz.
- Bu milestone yalnızca docs/check/helper seviyesindedir.
- DB persistence, audit event write ve backend write route açmaz.

## 2) Kanonik akış
- `COPILOT-RFQ-PREP-01`
- `VERIFIED-SUPPLIER-01`
- `SUPPLIER-MATCHING-01`
- `SUPPLIER-OFFER-COLLECT-01`
- `COPILOT-OFFER-ANALYSIS-01`
- `COPILOT-OFFER-RECOMMENDATION-01`
- `UX-MARKETPLACE-PANELS-01`
- `PRODUCT-FLOW-BUTTON-AUDIT-01`

## 3) Matching input summary
- RFQ type
- service scope
- region / province / district
- start date or missing start date
- day / period / hour / shift
- passenger / personnel / student count
- vehicle capacity requirement
- pickup / drop-off region
- SLA / quality expectation
- document / license / safety requirement

## 4) Matching criteria
- region fit
- capacity fit
- vehicle type / fleet fit
- start date fit
- shift / schedule fit
- service type experience
- document / license fit
- SLA / quality fit
- risk / missing data fit
- historical quality / performance signal when available and PII-safe

## 5) Candidate evaluation
- candidateId
- opaque supplier ref
- supplierNameMasked
- supplierLabel
- score
- fitLevel
- matchReasons
- missingSupplierFields
- riskNotes
- disqualifiers
- nextQuestionsForSupplier
- humanReviewRequired=true
- score modeli deterministic helper ile hesaplanır.
- score; bölge, kapasite, araç tipi, başlangıç tarihi, vardiya, servis deneyimi, belge / ruhsat, SLA / kalite ve PII-safe geçmiş sinyallerinden oluşur.
- fitLevel; `high`, `medium`, `low`, `blocked` bantlarını kullanır.
- candidateMatrix yalnızca opaque ref ve maskeli label kullanır; raw name / contact / token göstermez.

## 6) Shortlist draft
- best candidates
- why they fit
- missing information
- questions for supplier
- risk notes
- human approval note
- henüz seçilmedi/gönderilmedi/teklif istenmedi
- shortlistDraft sadece ön değerlendirme taslağıdır.
- shortlistDraft içinde seçilmiş tedarikçi, gönderilmiş RFQ veya tamamlanmış iletişim iddiası yoktur.
- shortlistDraft en uygun adayları, eksik alanları, soru setini ve insan onayı notunu taşır.
- shortlistDraft her zaman `draftOnly=true`, `notSelected=true`, `notContacted=true`, `notSent=true`, `approvalRequired=true` sınırında kalır.

## 7) Safety / boundary
- draftOnly=true
- notContacted=true
- notSent=true
- notSelected=true
- approvalRequired=true
- executionState=supplier_match_draft_only / not_contacted / not_selected / not_executed
- nextSafeStep=aday kısa listeyi kontrol edip insan onayına sunmak
- Supplier/provider contact açılmaz.
- RFQ send açılmaz.
- Offer collect açılmaz.
- Offer accept/reject açılmaz.
- Provider credential read/write/use açılmaz.
- Agreement/dispatch/route/payment write-action açılmaz.
- Audit event yazılmaz.
- Messaging/email/SMS/push açılmaz.
- User/account/admin write açılmaz.
- Runtime execution yoktur.
- PII-safe olmayan kayıtlar gösterilmez.

## 8) Türkçe visible answer
- Aday tedarikçi uygunluk taslağını hazırladım; henüz hiçbir tedarikçi seçilmedi veya aranmadı.
- Tedarikçiye RFQ göndermek için insan onayı gerekir.
- Bu liste sadece ön değerlendirmedir.
- Eksik bilgiler tamamlanmadan tedarikçiye gönderim önerilmez.
- Sıradaki güvenli adım: kısa listeyi kontrol edip onaya sunmak.

## 9) Static helper
- `backend/src/ai/chat/supplierMatching.js`
- Runtime execution yoktur.
- Tool execution yoktur.
- Write-action dispatcher yoktur.
- Prisma/schema/migration yoktur.
- Pure deterministic helper export'ları:
  - `detectSupplierMatchingIntent(input)`
  - `buildSupplierMatchingInput(rfqDraft, context)`
  - `scoreSupplierCandidate(rfqDraft, supplierProfile)`
  - `buildSupplierCandidateMatrix(rfqDraft, supplierProfiles)`
  - `buildSupplierShortlistDraft(candidateMatrix)`
  - `getSupplierMatchingMissingFields(rfqDraft, supplierProfiles)`
  - `buildSupplierQuestionSet(candidateMatrix)`
  - `composeSupplierMatchingAnswer(context)`
  - `maskSupplierSensitiveValue(value)`
  - `normalizeSupplierMatchingField(field, value)`
- Helper yalnız static / fixture veri ile çalışır.
- Helper raw token, credential, cookie, password, GPS trace veya raw PII üretmez.
- Helper insan onayı olmadan dış dünya aksiyonu üretmez.

## 10) What is not changed
- Backend route/service/prisma genişlemesi yok.
- Production DB yok.
- Real supplier/provider data yok.
- Messaging/email/SMS/push yok.
- Offer collect / offer accept-reject yok.
- Agreement/dispatch/route/payment execute yok.

## 11) Validation results
- `guardCases`
- `passCount`
- `failCount`
- `matchingInputSummary`
- `matchingCriteriaSummary`
- `candidateEvaluationSummary`
- `shortlistDraftSummary`
- `safetyBoundarySummary`
- `turkishVisibleSummary`
- `chainWiringSummary`
- `commitExternalSummary`
- `prismaSummary`
- `matchingIntentSummary`
- `matchingTypeSummary`
- `candidateMatrixSummary`
- `supplierQuestionSummary`
- `draftOnlySummary`
- `safetyPhraseSummary`
- `kvkkSafeSummary`
- `auditApprovalSummary`
- `noWriteActionSummary`

## 12) Remaining risks
- Supplier quality sadece verilen static/fixture veri kadar görünür.
- Eksik veri varsa human review zorunludur.
- PII-safe olmayan geçmiş sinyaller kullanılmaz.

## 13) Next recommended milestone
- `COPILOT-HUMAN-APPROVAL-01`
- `SUPPLIER-OFFER-COLLECT-01`

## Not
- Bu belge sadece docs/check/helper kilididir.
