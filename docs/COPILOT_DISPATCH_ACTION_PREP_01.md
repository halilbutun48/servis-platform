# COPILOT DISPATCH ACTION PREP 01

Tarih: 2026-07-26
Repo: `servis-platform`

## docs/check milestone
- Bu doküman docs/check milestone kaydıdır; runtime feature, tool execution, stage/commit/tag/push ve browser-smoke artifact açmaz.
- Canonical check: `check:copilotdispatchactionprep01`
- Komut: `node backend\scripts\copilot_dispatch_action_prep_01_check.js`
- Static source of truth gerektiğinde `backend/src/ai/chat/copilotDispatchActionPrep.js` ile taşınır; helper runtime executor değildir.

## 1) Amaç
- `COPILOT-SHIFT-TO-AGREEMENT-PREP-01` sonrasında gelen read-only dispatch prep companion milestone'dır.
- Dispatch readiness, driver/vehicle readiness, GPS/safe-drive readiness ve evidence checklist hazırlar.
- Dispatch apply, route apply, driver/vehicle assignment ve stop reached/skipped/complete açmaz.
- Messaging/email/SMS/push, provider credential management, agreement/contract execute ve any write-action açmaz.
- Bu milestone yalnızca docs/check/helper seviyesindedir.
- No route / service / prisma diff.
- No backend/prisma diff.
- KVKK / PII-safe minimum veri yaklaşımı korunur.

## 2) Kanonik akış
- `COPILOT-DEMAND-TO-AGREEMENT-ROADMAP-01`
- `COPILOT-SHIFT-TO-AGREEMENT-PREP-01`
- `COPILOT-DISPATCH-ACTION-PREP-01`
- `COPILOT-ACTION-PREP-01`
- Source agreement handoff: sözleşme ön hazırlığından gelen route, driver, vehicle ve evidence sinyalleri.
- Source route review handoff: route review çıktısından gelen readiness notları ve human approval izi.
- Handoff hedefi: insan onayına gidecek dispatch prep packet draft.

## 3) Dispatch Action Input Summary
- agreement prep state
- route review state
- route summary
- dispatch window
- driver readiness
- vehicle readiness
- GPS / safe-drive readiness
- evidence checklist
- handoff notes
- region / province / district
- service scope
- risk signals
- privacy / KVKK mask state

## 3.1) Supported Dispatch Types
- `dispatch_readiness_review`
- `driver_vehicle_readiness`
- `gps_safe_drive_readiness`
- `evidence_checklist`
- `route_or_stop_coverage_review`
- `departure_window_review`
- `handoff_readiness`
- `general_dispatch_prep`

## 4) Dispatch Readiness Model
- dispatchPrepSummary -> dispatchPrepSummary
- routeSummary -> routeSummary
- maskedDriverLabel -> maskedDriverLabel
- maskedVehicleLabel -> maskedVehicleLabel
- dispatchWindow -> dispatchWindow
- gpsSummary -> gpsSummary
- safeDriveSummary -> safeDriveSummary
- evidenceChecklist -> evidenceChecklist
- missingFields -> missingFields
- riskSignals -> riskSignals
- fieldCoverageScore
- readinessScore
- scoreBand
- readinessLabel
- humanApprovalRequired=true
- draftOnly=true
- notAssigned=true
- notApplied=true
- notExecuted=true
- noWriteAction=true
- noRouteApply=true
- noDispatchApply=true
- piiMasked=true
- kvkkSafe=true

## 5) Dispatch Readiness Scorecard
- routeCoverageScore
- driverReadinessScore
- vehicleReadinessScore
- gpsReadinessScore
- safeDriveReadinessScore
- evidenceReadinessScore
- handoffReadinessScore
- riskScore
- readinessScore
- scoreBand
- readinessLabel
- missingRequiredFields
- missingOptionalFields
- blockingReasons
- humanApprovalRequired
- nextSafeStep

## 6) Dispatch Prep Packet Draft
- draftTitle
- openingNote
- dispatchPrepSummary
- readinessModel
- readinessScorecard
- missingFieldSummary
- riskSummary
- questionSet
- safeNextStepDraft
- humanApprovalNote
- evidenceNote
- executionBoundaryNote
- draftOnly=true
- noWriteAction=true

## 7) Missing Field Summary
- missingRequiredFields
- missingOptionalFields
- missingRouteFields
- missingDriverFields
- missingVehicleFields
- missingGpsFields
- missingEvidenceFields
- missingTimingFields
- missingApprovalFields
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
- dispatchCue
- nextSafeStepCue

## 10) Safe Next-Step Draft
- stepId
- title
- whatToDo
- whatNotToDo
- humanApprovalRequired
- draftOnly
- notApplied
- notExecuted
- Next safe step: `dispatch hazırlık paketini kontrol edip insan onayına sunmak`

## 11) Safety / Boundary
- `draftOnly=true`
- `notAssigned=true`
- `notApplied=true`
- `notExecuted=true`
- `notCompleted=true`
- `notContacted=true`
- `notSent=true`
- `noWriteAction=true`
- `noDBWrite=true`
- `noAuditEventWrite=true`
- `noRouteApply=true`
- `noDispatchApply=true`
- `piiMasked=true`
- `kvkkSafe=true`
- `humanApprovalRequired=true`
- No route apply.
- No dispatch apply.
- No driver/vehicle assignment.
- No stop reached/skipped/complete.
- No messaging/email/SMS/push.
- No provider credential use.
- No DB write.
- No audit event write.
- No backend route/service/prisma mutation.

## 12) Safety Examples
- Dispatch hazırlık taslağı oluştur.
- Sürücü ve araç readinessini özetle.
- GPS / safe-drive risklerini göster.
- Evidence checklisti çıkar.
- Hangi alanlar insan onayı istiyor?
- Route apply yapmadan durumu açıkla.
- Dispatch apply açılmadan önceki eksikleri listele.
- Sıradaki güvenli adım ne?

## 13) PII / KVKK Safe Handling
- minimum necessary location data only
- masked driver and contact details
- no raw GPS traces
- no cross-organization leakage
- no secret / token exposure

## 14) Türkçe Visible Answer
- Dispatch hazırlık taslağını hazırladım; henüz hiçbir dispatch apply, route apply veya sürücü/araç ataması yapılmadı.
- GPS / safe-drive ve evidence checklist read-only olarak kontrol edildi.
- Bu çıktı karar değil, insan onayına gidecek taslaktır.
- Kişisel veriler maskelenerek işlendi.
- KVKK açısından yalnızca gerekli minimum veri kullanıldı.
- Sıradaki güvenli adım: dispatch hazırlık paketini kontrol edip insan onayına sunmak.

## 15) Audit / Human Approval Handoff
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
- Roles: `SUPER_ADMIN`, `COMPANY`, `ROOM`, `SCHOOL`, `ORGANIZATION`, `DRIVER`, `PERSONEL`, `PARENT`

## 15) Static helper
- `backend/src/ai/chat/copilotDispatchActionPrep.js`
- Export edilen sabitler: version, stages, categories, supported types, input summary, readiness model fields, readiness scorecard fields, packet draft fields, missing field summary, risk summary, question set, safe next-step draft, boundary flags, blocked actions, never automate, safety examples, handoffs, public promise, role names, execution state, next safe step, PII/KVKK safe handling ve policy.
- Export edilen yüzeyler: `buildDispatchActionPrepInput`, `buildDispatchFieldMappingModel`, `buildDispatchReadinessModel`, `buildDispatchReadinessScorecard`, `buildDispatchPrepPacketDraft`, `buildDispatchMissingFieldSummary`, `buildDispatchRiskSummary`, `buildDispatchQuestionSet`, `buildSafeNextStepDraft`, `composeDispatchActionPrepAnswer`, `maskDispatchActionPrepSensitiveValue`, `normalizeDispatchActionPrepField`, `detectDispatchActionPrepIntent`, `listCopilotDispatchActionPrepRoles`, `getCopilotDispatchActionPrepPolicy`, `buildDispatchActionPrepRole`.
- Helper yalnızca read-only dispatch prep üretir; runtime executor değildir.

## 16) Kapsam dışı
- No route / service / prisma diff.
- No backend/prisma diff.
- No production DB.
- No destructive query.
- No browser / public probe.
- No write-action.
- No dispatch apply.
- No route apply.
- No driver/vehicle assignment.
- No stop reached/skipped/complete.
- No payment / hakediş execute.
- No provider credential management.

## 17) Validation results
- PASS COPILOT-DISPATCH-ACTION-PREP-01
- Guard cases are preserved by the check script.
- Dispatch prep stays read-only and human-approved.

## 18) Remaining Risks
- Nihai karar yine insan onayı ister.
- PII / GPS verisi maskesiz gösterilmemelidir.

## 19) Next Recommended Milestone
- `COPILOT-ACTION-PREP-01`
- Sonraki güvenli adım, dispatch preparation packet'i action prep hattına bağlamaktır.

## 20) Reference Lists
### Blocked Actions
- dispatch apply
- route apply
- driver/vehicle assignment
- stop reached/skipped/complete
- agreement/contract execute
- payment/hakediş execute
- messaging/email/SMS/push
- provider credential use
- DB write
- audit event write
- backend route/service/storage mutation
- write-action dispatcher

### Never Automate
- otomatik dispatch apply
- otomatik route apply
- otomatik driver/vehicle assignment
- otomatik stop reached/skipped/complete
- otomatik agreement/contract execute
- otomatik payment/hakediş execute
- otomatik messaging/email/SMS/push
- otomatik provider credential use
- otomatik DB write
- otomatik audit write

### Blocked Phrases
- Dispatch apply yaptım.
- Route apply yaptım.
- Sürücü/araç atamasını yaptım.
- Stop reached dedim.
- Stop skipped dedim.
- Stop complete dedim.
- Bunu operasyona uyguladım.
- RFQ gönderdim.
- Sözleşmeyi yürürlüğe aldım.
- Ödemeyi başlattım.
- Onayladım.

### Handoffs
- COPILOT-SHIFT-TO-AGREEMENT-PREP-01
- COPILOT-ROUTE-REVIEW-HUMAN-APPROVAL-01
- COPILOT-HUMAN-APPROVAL-01
- OSRM-ROUTE-DRAFT-FROM-EXCEL-01
- EXCEL-TO-ROUTE-READINESS-REDTEAM-01
- AUDIT-LOG-AND-APPROVAL-TRACE-01
- SECURITY-KVKK-FINAL-01
- ROLE-DATA-ISOLATION-REDTEAM-01
- DATA-INTEGRITY-AND-RECOVERY-01

### Public Promise
- AI her şeyi dispatch eder public promise yok.
- Dispatch hazırlığı execution değildir.
- Sefer Abi karar destekleyici ve hazırlayıcıdır.
- Nihai karar kullanıcıdadır.
- İnsan onayı olmadan dispatch/route apply yapılmaz.
- Testle kanıtlanmamış kabiliyet public dokümanda vaat edilmez.
