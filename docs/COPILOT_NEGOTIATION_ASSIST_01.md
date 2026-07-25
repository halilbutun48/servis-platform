# COPILOT NEGOTIATION ASSIST 01

Tarih: 2026-07-25
Repo: `servis-platform`

## docs/check milestone
- Bu doküman docs/check milestone kaydıdır; runtime feature, tool execution, stage/commit/tag/push ve browser-smoke artifact açmaz.
- Canonical check: `check:copilotnegotiationassist01`
- Komut: `node backend\scripts\copilot_negotiation_assist_01_check.js`
- Static source of truth gerektiğinde `backend/src/ai/chat/copilotNegotiationAssist.js` ile taşınır; helper runtime executor değildir.

## 1) Amaç
- `COPILOT-OFFER-ANALYSIS-01` sonrasında gelen draft-only negotiation prep companion milestone'dır.
- Teklifleri pazarlık hazırlık taslağına, karşı teklif draftına, soru setine, readiness table'a ve value / risk summary'ye çevirir.
- Mesaj göndermez, RFQ send yapmaz, teklif kabul / ret yapmaz, tedarikçi seçmez, sözleşme başlatmaz.
- Bu milestone yalnızca docs/check/helper seviyesindedir.
- DB persistence, audit event write, route/service/prisma mutation ve browser/public probe açmaz.
- Supplier contact, messaging/email/SMS/push ve any write-action açmaz.

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
- Source offer analysis handoff: supplier offer collect shortlistinden gelen comparison matrix ve read-only recommendation taslağı.
- Source negotiation handoff: offer analysis çıktısından gelen pazarlık fırsatları, masked supplier labels ve risk/value sinyali.
- Next safe step: pazarlık taslağını kontrol edip insan onayına sunmak.

## 3) Supported negotiation types
- Fiyat iyileştirme
- Kapsam netleştirme
- Dahil kalemler
- Hariç kalemler
- Kapasite taahhüdü
- Zamanlama taahhüdü
- SLA taahhüdü
- Belge / uyum netliği
- Sigorta / güvenlik
- Geçerlilik uzatma
- Ödeme şartları
- Servis kalitesi
- Rota / vardiya netliği
- Genel pazarlık

## 4) Input summary
- RFQ type
- offer analysis state
- candidate suppliers / masked labels
- service scope
- region / province / district
- start date
- day / period / hour / shift
- passenger / personnel / student count
- vehicle capacity requirement
- SLA / quality expectation
- document / license / safety requirement
- analyzed offer count
- missing / risky offer count

## 5) Opportunity model
- supplierRef
- supplierLabelMasked
- opportunityType
- currentIssue
- suggestedAsk
- rationale
- riskIfUnresolved
- priority
- humanReviewRequired=true

## 6) Counter-offer draft
- supplierRef
- supplierLabelMasked
- draftTitle
- openingNote
- requestedChanges
- clarificationQuestions
- nonBindingLanguage
- approvalRequired=true
- notSent=true
- notContacted=true
- notAccepted=true
- notRejected=true
- notSelected=true
- draftOnly=true

## 7) Readiness table
- candidate supplier
- negotiation topic
- priority
- requested improvement
- missing / unclear area
- risk
- ready?
- human approval note

## 8) Value / risk policy
- En düşük fiyat tek başına karar değildir.
- Kapsam, SLA, kapasite, belge ve ödeme netliği birlikte değerlendirilir.
- Riskler görünür kalır; sessiz/eski kabul varsayımı yoktur.
- Analiz puanı karar değildir; insan onayı gerekir.
- Belirsizlikler supplier contact veya RFQ send ile kapatılmaz.

## 9) Safety / boundary
- draftOnly=true
- notSent=true
- notContacted=true
- notAccepted=true
- notRejected=true
- notSelected=true
- approvalRequired=true
- humanReviewRequired=true
- executionState=negotiation_assist_draft_only / not_sent / not_contacted / not_accepted / not_rejected / not_selected / not_executed
- nextSafeStep=pazarlık taslağını kontrol edip insan onayına sunmak
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

## 10) Türkçe visible answer
- Pazarlık hazırlık taslağını oluşturdum; henüz hiçbir tedarikçiye mesaj gönderilmedi.
- Hiçbir teklif kabul edilmedi veya reddedilmedi.
- Tedarikçi seçimi yapılmadı ve sözleşme başlatılmadı.
- Pazarlık için öne çıkan başlıklar: fiyat kapsamı, dahil/hariç kalemler, SLA, kapasite ve belge netliği.
- Sıradaki güvenli adım: pazarlık taslağını kontrol edip insan onayına sunmak.

## 11) Static helper
- `backend/src/ai/chat/copilotNegotiationAssist.js`
- Exportlar: `COPILOT_NEGOTIATION_ASSIST_VERSION`, `COPILOT_NEGOTIATION_ASSIST_STAGES`, `COPILOT_NEGOTIATION_ASSIST_CATEGORIES`, `COPILOT_NEGOTIATION_ASSIST_SUPPORTED_TYPES`, `COPILOT_NEGOTIATION_ASSIST_INPUT_SUMMARY`, `COPILOT_NEGOTIATION_ASSIST_OPPORTUNITY_FIELDS`, `COPILOT_NEGOTIATION_ASSIST_COUNTER_OFFER_FIELDS`, `COPILOT_NEGOTIATION_ASSIST_READINESS_FIELDS`, `COPILOT_NEGOTIATION_ASSIST_BOUNDARY_FLAGS`, `COPILOT_NEGOTIATION_ASSIST_BLOCKED_ACTIONS`, `COPILOT_NEGOTIATION_ASSIST_NEVER_AUTOMATE`, `COPILOT_NEGOTIATION_ASSIST_HANOFFS`, `COPILOT_NEGOTIATION_ASSIST_TURKISH_VISIBLE_PHRASES`, `COPILOT_NEGOTIATION_ASSIST_BLOCKED_PHRASES`, `COPILOT_NEGOTIATION_ASSIST_SAFETY_EXAMPLES`, `COPILOT_NEGOTIATION_ASSIST_EXECUTION_STATE`, `COPILOT_NEGOTIATION_ASSIST_NEXT_SAFE_STEP`, `COPILOT_NEGOTIATION_ASSIST_ROLE_NAMES`, `COPILOT_NEGOTIATION_ASSIST_POLICY`, `detectNegotiationAssistIntent`, `buildNegotiationAssistInput`, `buildNegotiationInputSummary`, `buildNegotiationOpportunityModel`, `buildCounterOfferDraft`, `buildNegotiationReadinessTable`, `buildNegotiationQuestionSet`, `buildNegotiationRiskSummary`, `buildNegotiationValueSummary`, `composeNegotiationAssistAnswer`, `maskNegotiationSensitiveValue`, `normalizeNegotiationField`, `classifyNegotiationOpportunityTypes`, `listCopilotNegotiationAssistRoles`, `getCopilotNegotiationAssistPolicy`, `buildNegotiationAssistRole`.

## 12) Validation
- `check:copilotnegotiationassist01`
- `node backend\scripts\copilot_negotiation_assist_01_check.js`
- Smoke threshold: `product-flow PASS 18/0/0/0`, `premium PASS 82/0/0/0`, `all-panels PASS 82/0/0/0`, `mobile all-roles PASS 82/0/0/0`
- `PASS COPILOT-NEGOTIATION-ASSIST-01`
- runtime-data ve debug.log commit dışı kalır.
