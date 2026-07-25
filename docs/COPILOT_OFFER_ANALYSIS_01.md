# COPILOT OFFER ANALYSIS 01

Tarih: 2026-07-25
Repo: `servis-platform`

## docs/check milestone
- Bu doküman docs/check milestone kaydıdır; runtime feature, tool execution, stage/commit/tag/push ve browser-smoke artifact açmaz.
- Canonical check: `check:copilotofferanalysis01`
- Komut: `node backend\scripts\copilot_offer_analysis_01_check.js`
- Static source of truth gerektiğinde `backend/src/ai/chat/copilotOfferAnalysis.js` ile taşınır; helper runtime executor değildir.

## 1) Amaç
- `SUPPLIER-OFFER-COLLECT-01` sonrasında teklifleri read-only, human-approved ve draft-only şekilde analiz eden companion milestone'dır.
- Teklif toplama çıktısını normalize teklif modeli, comparison matrix, value/risk summary ve analiz taslağına çevirir.
- Kazanan seçmez, teklif kabul/ret yapmaz, sözleşme başlatmaz.
- Bu milestone yalnızca docs/check/helper seviyesindedir.
- DB persistence, audit event write ve backend write route açmaz.
- Supplier contact, RFQ send, provider credential use, messaging/email/SMS/push ve any write-action açmaz.

## 2) Kanonik akış
- `COPILOT-RFQ-PREP-01`
- `SUPPLIER-MATCHING-01`
- `SUPPLIER-OFFER-COLLECT-01`
- `COPILOT-OFFER-ANALYSIS-01`
- `COPILOT-OFFER-RECOMMENDATION-01`
- `COPILOT-NEGOTIATION-ASSIST-01`
- `COPILOT-SHIFT-TO-AGREEMENT-PREP-01`
- `COPILOT-DISPATCH-ACTION-PREP-01`
- Source supplier offer collect handoff: supplier matching shortlistinden gelen offer collection inputu ve draft-only teklif durumu.
- Source supplier matching handoff: RFQ prep shortlist matrixinden gelen aday uygunluk hazırlığı.
- Source RFQ prep handoff: demand-to-agreement yolundan gelen RFQ draft çerçevesi.
- Offer recommendation handoff: `COPILOT-OFFER-RECOMMENDATION-01`
- Audit trace handoff: `AUDIT-LOG-AND-APPROVAL-TRACE-01`

## 3) Supported analysis types
- personel servis offer analysis
- okul servis offer analysis
- vardiya bazli offer analysis
- regular route offer analysis
- one-off service offer analysis
- existing contract add-on offer analysis
- capacity increase offer analysis
- route change offer analysis
- general offer analysis

## 4) Offer analysis input summary
- RFQ type
- shortlist / candidate suppliers
- offer collection state
- service scope
- region / province / district
- start date
- day / period / hour / shift
- passenger / personnel / student count
- vehicle capacity requirement
- SLA / quality expectation
- document / license / safety requirement
- incoming offer count
- missing offer count

## 5) Normalized offer model
- supplierRef
- supplierLabelMasked
- offerState: `complete` / `partial` / `missing_fields` / `blocked`
- priceAmount, sadece fixture/user-provided ise
- priceCurrency: `TRY`
- pricePeriod: `daily` / `monthly` / `perShift` / `perKm` / `unknown`
- includedItems
- excludedItems
- vehicleCapacity
- vehicleType
- startAvailability
- shiftAvailability
- licenseCompliance
- insuranceSafety
- slaCommitment
- validityUntil
- missingOfferFields
- riskNotes
- humanReviewRequired=true

## 6) Comparison matrix output model
- supplierRef
- supplierLabelMasked
- normalizedPriceSummary
- scopeCompleteness
- capacityFit
- timingFit
- slaFit
- complianceFit
- riskLevel
- missingFields
- analysisScore
- fitLevel: `strong` / `acceptable` / `weak` / `blocked`
- notAccepted=true
- notRejected=true
- notSelected=true

## 7) Value / risk analysis policy
- En düşük fiyat tek başına seçilmez.
- Fiyat-kapsam dengesi gösterilir.
- Kapsam, kapasite, SLA ve uygunluk birlikte değerlendirilir.
- Analiz puanı karar değildir; insan onayı gerekir.
- Eksik dahil / hariç kalemler risk olarak işaretlenir.
- Kapasite veya saat uyumsuzluğu risk olarak işaretlenir.
- Belge / ruhsat / sigorta belirsizliği risk olarak işaretlenir.
- SLA taahhüdü eksikse risk olarak işaretlenir.
- Geçerlilik tarihi yoksa risk olarak işaretlenir.
- Price / scope / SLA / capacity / compliance comparison policy bu sırayla uygulanır.

## 8) Missing offer field policy
- Eksik alanlar karar öncesi görünür tutulur.
- Eksik alan tamamlanmadan kesin seçim yapılmaz.
- Eksik alanlar supplier contact veya RFQ send ile kapatılmaz.
- Eksik alanlar sadece insan onayına hazır taslak olarak kalır.
- No supplier selection boundary korunur.
- No offer accept/reject boundary korunur.
- No supplier contact boundary korunur.
- No RFQ send boundary korunur.

## 9) Recommendation draft policy
- Kesin seçim dili kullanılmaz.
- Öne çıkan aday teklif dili kullanılır.
- Daha güçlü görünen teklif dili kullanılır.
- İncelenmesi önerilen teklif dili kullanılır.
- İnsan onayı notu zorunludur.
- Eksik bilgiler tamamlanmadan öneri kesinleştirilmez.
- Offer recommendation handoff: `COPILOT-OFFER-RECOMMENDATION-01`

## 10) Safety / boundary
- draftOnly=true
- notAccepted=true
- notRejected=true
- notSelected=true
- notContacted=true
- notSent=true
- approvalRequired=true
- executionState=offer_analysis_draft_only / not_accepted / not_rejected / not_selected / not_executed
- nextSafeStep=teklif analizini kontrol edip insan onayına sunmak
- No provider credential boundary korunur.
- No message/email/SMS/push boundary korunur.
- No agreement/dispatch/route/payment boundary korunur.
- No audit trace write boundary korunur.
- No write-action boundary korunur.

## 11) Türkçe visible answer
- Teklif analiz taslağını hazırladım; henüz hiçbir teklif kabul edilmedi veya reddedilmedi.
- Tedarikçi seçimi yapılmadı ve sözleşme başlatılmadı.
- En düşük fiyat tek başına karar için yeterli değildir.
- Kapsam, kapasite, SLA ve riskler birlikte değerlendirilmelidir.
- Eksik teklif alanları tamamlanmadan karar önerilmez.
- Sıradaki güvenli adım: analiz taslağını kontrol edip insan onayına sunmak.
- Safety examples: `Teklifleri analiz et.`, `Bu teklifleri karşılaştır.`, `Hangisi daha avantajlı görünüyor?`, `En ucuz teklif güvenli mi?`, `Fiyat/kapsam farklarını çıkar.`, `Eksik teklif bilgileri neler?`, `Riskli teklifleri sırala.`, `Analizi onaya hazırla.`
- Blocked execution phrases: `Teklifi kabul ettim.`, `Teklifi reddettim.`, `Bu tedarikçiyi seçtim.`, `Kazanan tedarikçi budur.`, `Sözleşmeyi başlattım.`, `RFQ gönderdim.`, `Tedarikçiye mesaj gönderdim.`, `Teklifleri topladım.`, `Onayladım.`, `Uyguladım.`

## 12) Static helper
- `backend/src/ai/chat/copilotOfferAnalysis.js`
- Runtime execution yoktur.
- Tool execution yoktur.
- Write-action dispatcher yoktur.
- DB / network / model call yoktur.
- Role/tenant scope policy: `SUPER_ADMIN`, `COMPANY`, `ROOM`, `SCHOOL` ve `ORGANIZATION` analysis preview görür; `DRIVER`, `PERSONEL` ve `PARENT` görmez.
- PII/KVKK safe handling: raw token, credential, cookie, password, raw GPS trace ve raw PII yok; supplier contact info masked; production offer data okunmaz.
- Pure deterministic helper export'ları:
  - `detectOfferAnalysisIntent(input)`
  - `buildOfferAnalysisInput(offerCollection, context)`
  - `normalizeOfferForAnalysis(offerDraft)`
  - `buildOfferComparisonMatrix(offerCollection)`
  - `scoreOfferAnalysisCandidate(normalizedOffer, rfqContext)`
  - `buildOfferRiskSummary(comparisonMatrix)`
  - `buildOfferMissingFieldSummary(comparisonMatrix)`
  - `buildOfferValueSummary(comparisonMatrix)`
  - `buildOfferAnalysisDraft(comparisonMatrix)`
  - `composeOfferAnalysisAnswer(context)`
  - `maskOfferAnalysisSensitiveValue(value)`
  - `normalizeOfferAnalysisField(field, value)`

## 13) What is not changed
- Backend route/service/prisma genişlemesi yok.
- Production DB yok.
- Real supplier/provider data yok.
- Messaging/email/SMS/push yok.
- Offer collect / offer accept-reject yok.
- Supplier selection yok.
- Agreement/dispatch/route/payment execute yok.
- Audit trace write yok.
- Human approval boundary korunur.

## 14) Validation results
- `offerAnalysisIntentSummary`
- `offerAnalysisTypeSummary`
- `normalizedOfferSummary`
- `comparisonMatrixSummary`
- `valueSummary`
- `riskSummary`
- `missingFieldSummary`
- `analysisDraftSummary`
- `draftOnlySummary`
- `safetyPhraseSummary`
- `kvkkSafeSummary`
- `auditApprovalSummary`
- `noWriteActionSummary`
- `chainWiringSummary`
- `smokeThresholdSummary`
- `commitExternalSummary`
- `prismaSummary`
- `lineCountSummary`

## 15) Remaining risks
- Static fixture coverage only; production variability görünmez.
- Eksik offer alanları artarsa human review zorunluluğu artar.
- Offer accept/reject veya supplier selection akışı bu milestone'a bağlanmamalıdır.

## 16) Next recommended milestone
- `COPILOT-NEGOTIATION-ASSIST-01`
- `COPILOT-OFFER-RECOMMENDATION-01`

## Not
- Bu belge sadece docs/check milestone'udur; runtime feature açmaz ve stage/commit/tag/push içermez.
