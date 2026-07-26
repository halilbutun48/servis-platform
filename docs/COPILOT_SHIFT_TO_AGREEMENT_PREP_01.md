# COPILOT SHIFT TO AGREEMENT PREP 01

Tarih: 2026-07-26
Repo: `servis-platform`

## docs/check milestone
- Bu doküman docs/check milestone kaydıdır; runtime feature, tool execution, stage/commit/tag/push ve browser-smoke artifact açmaz.
- Canonical check: `check:copilotshifttoagreementprep01`
- Komut: `node backend\scripts\copilot_shift_to_agreement_prep_01_check.js`
- Static source of truth gerektiğinde `backend/src/ai/chat/copilotShiftToAgreementPrep.js` ile taşınır; helper runtime executor değildir.

## 1) Amaç
- `COPILOT-OFFER-RECOMMENDATION-01` sonrasında gelen read-only shift-to-agreement prep companion milestone'dır.
- Sözleşme ön hazırlığını, field mapping'i, readiness scorecard'ı ve insan onayı paketini hazırlar.
- Agreement/contract create, approve, sign, execute açmaz.
- Supplier contact, RFQ send, offer accept/reject, messaging/email/SMS/push açmaz.
- DB write, audit event write, route/service/prisma mutation ve backend/prisma diff açmaz.
- No dispatch apply yok.
- Bu milestone yalnızca docs/check/helper seviyesindedir.
- KVKK / PII-safe minimum veri yaklaşımı korunur.

## 2) Kanonik akış
- `COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01`
- `COPILOT-OFFER-ANALYSIS-01`
- `COPILOT-NEGOTIATION-ASSIST-01`
- `COPILOT-OFFER-RECOMMENDATION-01`
- `COPILOT-HUMAN-APPROVAL-01`
- `COPILOT-SHIFT-TO-AGREEMENT-PREP-01`
- `COPILOT-DISPATCH-ACTION-PREP-01`
- Source recommendation handoff: offer recommendation çıktısından gelen ready-to-review aday özeti.
- Source negotiation handoff: pazarlık prep sinyalleri, risk/value notları ve missing field sinyalleri.
- Handoff hedefi: insan onayına gidecek agreement prep packet draft.

## 3) Shift-to-Agreement Input Summary
- offer recommendation state
- negotiation assist state
- offer analysis state
- supplier ref / masked label
- agreement type
- agreement scope
- service scope
- region / province / district
- start date
- term / validity
- pricing summary
- billing summary
- SLA / service quality
- legal / compliance documents
- privacy / KVKK mask state

## 4) Agreement Field Mapping Model
- sourceRecommendationSummary -> agreementPrepSummary
- sourceNegotiationSummary -> agreementPrepContext
- sourceOfferAnalysisSummary -> agreementPrepSignals
- supplierRef -> supplierRef
- supplierLabelMasked -> supplierLabelMasked
- agreementType -> agreementType
- agreementScope -> agreementScope
- serviceScope -> serviceScope
- region -> region
- province -> province
- district -> district
- startDate -> effectiveDate
- validityPeriod -> termSummary
- pricingSummary -> pricingSummary
- billingSummary -> billingSummary
- slaSummary -> slaSummary
- legalTermsSummary -> legalTermsSummary
- complianceSummary -> complianceSummary
- privacySummary -> privacySummary
- missingFields -> missingFields
- riskSignals -> riskSignals
- humanApprovalRequired=true
- draftOnly=true
- notCreated=true
- notApproved=true
- notSigned=true
- notExecuted=true
- noWriteAction=true
- noAuditEventWrite=true
- piiMasked=true
- kvkkSafe=true

## 5) Agreement Readiness Scorecard
- fieldCoverageScore
- legalReadinessScore
- privacyReadinessScore
- operationalReadinessScore
- pricingReadinessScore
- riskScore
- readinessScore
- scoreBand
- readinessLabel
- missingRequiredFields
- missingOptionalFields
- blockingReasons
- humanApprovalRequired
- nextSafeStep

## 6) Agreement Prep Packet Draft
- draftTitle
- openingNote
- agreementPrepSummary
- fieldMappingModel
- readinessScorecard
- missingFieldSummary
- riskSummary
- questionSet
- safeNextStepDraft
- humanApprovalNote
- piiKvkkNote
- executionBoundaryNote
- draftOnly=true
- noWriteAction=true

## 7) Missing Field Summary
- missingRequiredFields
- missingOptionalFields
- missingLegalFields
- missingOperationalFields
- missingPrivacyFields
- missingPricingFields
- missingTimingFields
- missingApprovalFields
- cannotProceedYet
- nextDataToGather

## 8) Risk Summary
- riskType
- riskDetail
- severity
- impact
- mitigation
- owner
- humanReviewRequired
- kvkkImpact
- executionBoundary
- safeFallback

## 9) Question Set
- question
- whyNeeded
- blockingIfUnanswered
- whoCanAnswer
- safeFallback
- maskRequirement
- humanApprovalCue
- kvkkNote
- agreementScopeCue
- nextSafeStepCue

## 10) Safe Next-Step Draft
- stepId
- title
- whatToDo
- whatNotToDo
- humanApprovalRequired
- draftOnly
- notCreated
- notExecuted
- Next safe step: `sözleşme taslağını kontrol edip insan onayına sunmak`

## 11) Safety / Boundary
- `draftOnly=true`
- `notCreated=true`
- `notApproved=true`
- `notSigned=true`
- `notExecuted=true`
- `notSelected=true`
- `notContacted=true`
- `notSent=true`
- `noWriteAction=true`
- `noDBWrite=true`
- `noAuditEventWrite=true`
- `noRouteServicePrismaMutation=true`
- `piiMasked=true`
- `kvkkSafe=true`
- `humanApprovalRequired=true`
- No agreement / contract create.
- No agreement / contract approve.
- No agreement / contract execute.
- No signature execute.
- No supplier selection.
- No supplier contact.
- No RFQ send.
- No offer accept/reject.
- No message/email/SMS/push.
- No provider credential use.
- No DB write.
- No audit event write.
- No route apply.
- No dispatch apply.
- No payment/hakediş execute.
- No user/account/admin write-action.
- No backend route/service/prisma/schema migration.
- No route/service/prisma/backend/prisma diff.

## 12) PII / KVKK Safe Handling
- minimum necessary data only
- masked contact details
- no raw secrets
- no cross-organization leakage
- raw contact details are masked
- cross-organization data stays separated
- no secret / token exposure
- public text never exposes raw PII

## 13) Türkçe Visible Answer
- Sözleşme ön hazırlığını hazırladım; henüz hiçbir sözleşme oluşturulmadı, onaylanmadı veya yürütülmedi.
- Tedarikçi seçimi, contact ve RFQ send açılmadı.
- Bu çıktı karar değil, insan onayına gidecek taslaktır.
- Kişisel veriler maskelenerek işlendi.
- KVKK açısından yalnızca gerekli minimum veri kullanıldı.
- Sıradaki güvenli adım: sözleşme taslağını kontrol edip insan onayına sunmak.

## 14) Audit / Human Approval Handoff
- READ
- EXPLAIN
- RECOMMEND
- PREPARE
- DRAFT
- RISK_SUMMARY
- NEXT_STEP
- HUMAN_APPROVAL_REQUIRED
- Approval packet is read-only.
- Human approval note is shown before any later stage.
- No execution boundary stays visible in the handoff.

## 15) Static helper
- Static helper: `backend/src/ai/chat/copilotShiftToAgreementPrep.js`
- Export edilen sabitler: version, stages, categories, supported types, input summary, field mapping model, readiness scorecard fields, packet draft fields, missing field summary, risk summary, question set, safe next-step draft, boundary flags, blocked actions, never automate, visible phrases, blocked phrases, safety examples, handoffs, public promise, role names, execution state, next safe step, PII/KVKK safe handling ve policy.
- Export edilen yüzeyler: `buildShiftToAgreementPrepInput`, `buildAgreementFieldMappingModel`, `buildAgreementReadinessScorecard`, `buildAgreementPrepPacketDraft`, `buildAgreementMissingFieldSummary`, `buildAgreementRiskSummary`, `buildAgreementQuestionSet`, `buildSafeNextStepDraft`, `composeShiftToAgreementPrepAnswer`, `maskShiftToAgreementSensitiveValue`, `normalizeShiftToAgreementField`, `detectShiftToAgreementPrepIntent`, `listCopilotShiftToAgreementPrepRoles`, `getCopilotShiftToAgreementPrepPolicy`.
- Helper yalnızca read-only agreement prep üretir; runtime executor değildir.

## 16) Kapsam dışı
- No route / service / prisma diff.
- No backend/prisma diff.
- No route/service/prisma/backend.prisma diff.
- No production DB.
- No destructive query.
- No browser / public probe.
- No write-action.
- No execution.
- No agreement / contract execute.
- No supplier selection.
- No supplier contact.
- No RFQ send.
- No offer accept/reject.
- No dispatch apply.
- No route apply.
- No payment / hakediş execute.
- No provider credential management.

## 17) Validation results
- PASS COPILOT-SHIFT-TO-AGREEMENT-PREP-01
- Guard cases are preserved by the check script.
- PII / KVKK-safe handling stays masked and read-only.

## 18) Remaining Risks
- Nihai karar yine insan onayı ister.
- Agreement prep taslağı, execution boundary ile karışmamalıdır.
- Ham contact / PII verisi maskesiz gösterilmemelidir.

## 19) Next Recommended Milestone
- `COPILOT-DISPATCH-ACTION-PREP-01`
- Sonraki güvenli adım, agreement prep packet'ı dispatch hazırlık hattına bağlamaktır.
