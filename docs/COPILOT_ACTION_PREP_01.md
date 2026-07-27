# COPILOT ACTION PREP 01

Tarih: 2026-07-26
Repo: `servis-platform`

## docs/check milestone
- Bu doküman docs/check milestone kaydıdır; runtime feature, tool execution, stage/commit/tag/push ve browser-smoke artifact açmaz.
- Canonical check: `check:copilotactionprep01`
- Komut: `node backend\scripts\copilot_action_prep_01_check.js`
- Static source of truth gerektiğinde `backend/src/ai/chat/copilotActionPrep.js` ile taşınır; helper runtime executor değildir.

## 1) Amaç
- `COPILOT-ACTION-PREP-01`, `COPILOT-SHIFT-TO-AGREEMENT-PREP-01`, `COPILOT-DISPATCH-ACTION-PREP-01` ve `COPILOT-HUMAN-APPROVAL-01` arasında ortak action-prep owner katmanını dokümante eder.
- Dispatch prep packet, shift-to-agreement prep pack ve human approval policy'yi tek bir read-only owner pack altında toplar.
- Dispatch apply, route apply, driver/vehicle assignment, agreement/contract execute, payment/hakediş execute, messaging/email/SMS/push ve provider credential kullanımı açmaz.
- Human approval boundary korunur; kritik işlemler hâlâ guard ve onay ister.
- Bu milestone yalnızca docs/check/helper seviyesindedir.
- DB persistence, audit event write ve backend write route açmaz.

## 2) Ortak owner modeli
- shared action-prep owner
- `ownerStack`
- `dispatchActionPrep`
- `shiftToAgreementPrep`
- `humanApprovalPolicy`
- `sharedOwner=true`
- `draftOnly=true`
- `noWriteAction=true`
- `humanApprovalRequired=true`
- `noDispatchApply=true`
- `noRouteApply=true`
- `noAgreementExecute=true`
- `noPaymentExecute=true`
- `noMessageSend=true`
- `noProviderCredentialUse=true`

## 3) Action-prep envelope
- `actionPrepId`
- `sourceCapability`
- `actionPrepType`
- `status`
- `approvalType`
- `missingFields`
- `blockers`
- `risks`
- `requiredHumanChecks`
- `currentState`
- `proposedPreparation`
- `safetyBoundary`
- `safetyNotes`
- `visibleAnswer`
- `chips`
- `nextSafeStep`

## 4) Card draft modeli
- `title`
- `subtitle`
- `summary`
- `sourceLabel`
- `primarySafeActionLabel`
- `secondarySafeActionLabels`
- `status=ready_for_review | needs_clarification | risky | blocked`
- `approvalType=review_only | draft_review | missing_field_review | risk_review | final_human_approval_required`
- Kart read-only kalır; teklif kabul / ret, tedarikçi seçimi, sözleşme execute, dispatch apply ve route apply açılmaz.

## 5) Eksik alan policy
- Eksik alanlar maskeleme ile listelenir.
- KVKK / PII maskesi uygulanır.
- Eksik alanlar olmadan işlem uygulanmaz.
- Missing field summary yalnızca netleştirme ve insan onayı içindir.

## 6) Risk / blocker policy
- Blokajlar, riskler ve zorunlu insan kontrolleri tek pakette toplanır.
- `write-action`, `DB write`, `dispatch apply`, `route apply`, `agreement/contract execute` ve `payment/hakediş execute` kapalıdır.
- Belirsiz istekler generic blocker resolution taslağına düşer.
- `No route / service / prisma diff.` korunur.

## 7) Human approval handoff
- Handoff sadece read-only hazırlık içindir.
- `approvalType` ve `nextSafeStep` net biçimde taşınır.
- Kullanıcıya "Sıradaki güvenli adım: hazırlık paketini insan onayına sunmak." çizgisi verilir.
- Human approval checklist ve future lines reuse edilir.

## 8) Türkçe visible answer
- Action prep owner katmanını hazırladım; dispatch, shift ve human approval sınırları tek yerde toplandı.
- Bu çıktı karar değil, read-only hazırlık taslağıdır.
- Dispatch apply, route apply, agreement execute ve payment/hakediş açılmadı.
- Sıradaki güvenli adım: hazırlık paketini insan onayına sunmak.
- No write-action.
- No dispatch apply.
- No route apply.
- No agreement / contract execute.
- No payment / hakediş execute.
- No messaging / email / SMS / push.
- No DB write.
- No audit event write.
- No provider credential management.
- No route / service / prisma diff.

## 9) Runtime reuse
- `backend/src/ai/chat/copilotActionPrep.js`
- `buildActionPrepOwnerPack()`
- `composeActionPrepAnswer()`
- `buildActionPrepEnvelope()`
- `buildActionPrepCardDraft()`
- `buildActionPrepMissingFieldSummary()`
- `buildActionPrepRiskSummary()`
- `buildActionPrepHumanApprovalHandoff()`
- `buildActionPrepSafetyBoundary()`
- `buildActionPrepVisibleAnswer()`
- `dispatchActionPrep.composeDispatchActionPrepAnswer()`
- `shiftToAgreementPrep.buildShiftToAgreementPrepPack()`
- `humanApproval.getCopilotHumanApprovalPolicy()`

## 10) Validation results
- PASS COPILOT-ACTION-PREP-01
- Helper source:
  - `backend/src/ai/chat/copilotActionPrep.js`
  - `backend/src/ai/chat/copilotDispatchActionPrep.js`
  - `backend/src/ai/chat/copilotShiftToAgreementPrep.js`
  - `backend/src/ai/chat/copilotHumanApprovalPolicy.js`

## 11) Next recommended milestone
- `FINANCIAL-OPERATIONS-SURFACE-AND-RBAC-01`
- Bu blok, COPILOT-ACTION-PREP-01 sonrasında resmi roadmap üzerinde gelir.
- Bu doküman voice bloğunu başlatmaz; voice daha sonraki sıradadır.

## 12) Read together with
- `docs/COPILOT_DISPATCH_ACTION_PREP_01.md`
- `docs/COPILOT_SHIFT_TO_AGREEMENT_PREP_01.md`
- `docs/COPILOT_HUMAN_APPROVAL_01.md`
- `docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md`
- `docs/PRIMER_SSOT.md`
