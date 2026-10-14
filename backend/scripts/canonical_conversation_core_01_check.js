#!/usr/bin/env node

import {
  resolveCanonicalConversationRequest,
  validateCanonicalConversationRequest,
} from '../src/ai/chat/canonicalSemanticRequest.js';
import {
  applyCanonicalConversationTransition,
  projectPersistableConversationState,
} from '../src/ai/chat/canonicalConversationState.js';
import {
  SEFER_ABI_SEMANTIC_TRACE_VERSION,
  createSemanticTrace,
} from '../src/ai/chat/canonicalConversationTrace.js';
import { authorizeSemanticRequest } from '../src/ai/chat/authorizationGate.js';
import { resolveConversationRoute } from '../src/ai/chat/conversationRouting.js';
import { runCopilotFoundation } from '../src/ai/service.js';
import { buildCanonicalSemanticContext } from '../src/ai/chat/canonicalSemanticContext.js';
import {
  MODEL_FALLBACK_FAILURE_CODES,
  evaluateSemanticFallbackEligibility,
  invokeProviderNeutralSemanticProposer,
  validateProviderNeutralInput,
  validateProviderNeutralProposal,
} from '../src/ai/chat/semanticCandidateFallback.js';

function assert(condition, message) {
  if (!condition) throw new Error(`FAIL ${message}`);
}

function buildRequest(message, conversationState = null) {
  return resolveCanonicalConversationRequest({
    message,
    user: { role: 'COMPANY', companyId: 1 },
    selectedEntity: null,
    conversationState,
    screenContext: {
      path: '/company/planning-center',
      label: 'Planlama Merkezi',
      role: 'COMPANY',
    },
    interpreterMode: 'DETERMINISTIC',
  });
}

function buildSchoolOperationsRequest(message, screenContext = {}) {
  return resolveCanonicalConversationRequest({
    message,
    user: { role: 'COMPANY', companyId: 2, companyKind: 'SCHOOL' },
    selectedEntity: null,
    conversationState: null,
    screenContext: {
      path: '/school/operations',
      label: 'Okul Operasyon Paneli',
      role: 'COMPANY',
      ...screenContext,
    },
    interpreterMode: 'DETERMINISTIC',
  });
}

function assertScope(result, expected, label) {
  assert(result?.request?.semanticScope?.class === expected, `${label} semantic scope is ${expected}`);
  assert(typeof result?.request?.semanticScope?.evidence === 'string' && result.request.semanticScope.evidence, `${label} semantic scope evidence is present`);
}

function assertAction(result, actionClass, objectClass, label) {
  const action = result?.request?.semanticAction;
  assert(action?.actionClass === actionClass, `${label} semantic action is ${actionClass}`);
  assert(action?.objectClass === objectClass, `${label} semantic object is ${objectClass}`);
  assert(action?.resolutionStatus === 'RESOLVED', `${label} semantic action is resolved`);
  assert(action?.modifiers && !Array.isArray(action.modifiers)
    && ['new', 'current', 'next', 'explicitTarget'].every((key) => typeof action.modifiers[key] === 'boolean'), `${label} semantic action uses the frozen modifier object contract`);
  assert(Array.isArray(action?.evidence) && action.evidence.length > 0, `${label} semantic action has evidence`);
}

async function main() {
  console.log('=== SEFER ABI CANONICAL CONVERSATION CORE 01 ===');

  // Without a selected entity or server-owned discourse state, the deictic
  // reference is not grounded.  The canonical contract must fail closed and
  // request clarification rather than manufacture PRODUCT_CONTEXTUAL scope.
  const result = buildRequest('bu sözleşmenin günü ne');
  const envelope = result?.request;
  assert(result?.requestId, 'canonical request has requestId');
  assert(envelope?.version === 'SEFER-ABI-CANONICAL-REQUEST-V3', 'canonical request uses V3 envelope');
  assertScope(result, 'UNRESOLVED', 'unresolved product referent without state');
  assert(result?.canonicalShape?.taskType === 'CLARIFY', 'unresolved product referent requests clarification');
  assert(result?.request?.semanticAction?.resolutionStatus === 'UNRESOLVED', 'unresolved product referent remains unresolved');
  assert(typeof envelope?.operation === 'string' && envelope.operation, 'canonical request has operation');
  assert(typeof envelope?.domain === 'string' && envelope.domain, 'canonical request has domain');
  assert(typeof envelope?.capability === 'string' && envelope.capability, 'canonical request has capability');
  assert(Array.isArray(envelope?.candidateEntityRefs), 'candidateEntityRefs are present before authorization');
  assert(Array.isArray(envelope?.requestedFields), 'requestedFields are present');
  assert(envelope?.safety?.actionPolicy === 'READ_ONLY' || envelope?.safety?.actionPolicy === 'SAFE_UI_ONLY', 'actionPolicy is deny-by-default');
  assert(envelope?.safety?.writeBoundary === 'NO_BUSINESS_WRITE', 'writeBoundary is no-business-write');
  assert(envelope?.ambiguity && typeof envelope.ambiguity.status === 'string', 'ambiguity state is explicit');
  assert(envelope?.provenance && typeof envelope.provenance.interpreter === 'string', 'provenance is explicit');
  assert(result?.validation?.status === 'VALID' || result?.validation?.status === 'SEMANTIC_UNRESOLVED', 'validation status is explicit');

  // V3 RED: semantic equivalents must carry one action/object meaning before
  // product policy and authorization. These are behavior classes, not
  // production routing phrases.
  const createShift = buildRequest('Vardiya oluşturmak istiyorum');
  const createShiftStart = buildRequest('yeni vardiya planı başlatmak istiyorum');
  for (const [label, candidate] of [['create shift', createShift], ['create shift start', createShiftStart]]) {
    assertScope(candidate, 'PRODUCT_EXPLICIT', label);
    assertAction(candidate, 'CREATE', 'SHIFT', label);
    assert(candidate?.request?.operation === 'CREATE_SHIFT', `${label} maps to CREATE_SHIFT`);
    assert(candidate?.request?.workflowRef?.workflowIntent === 'CREATE_SHIFT', `${label} maps to the COMPANY guided workflow requirement`);
  }

  // Attempt-03 RED: create meaning must be composed from a goal predicate,
  // the SHIFT object, and their relation. These are development/regression
  // cases; production must not branch on any literal utterance.
  const compositionalCreateCases = [
    ['create compositional kur goal', 'Yeni bir servis vardiyası kurmak istiyorum'],
    ['create compositional sefer kur goal', 'Yeni servis seferi kurmam gerekiyor'],
    ['create compositional vardiya ayarla goal', 'Sıfırdan bir vardiya ayarlamak istiyorum'],
  ];
  for (const [label, message] of compositionalCreateCases) {
    const candidate = buildRequest(message);
    assertScope(candidate, 'PRODUCT_EXPLICIT', label);
    assertAction(candidate, 'CREATE', 'SHIFT', label);
    assert(candidate?.request?.operation === 'CREATE_SHIFT', `${label} maps to CREATE_SHIFT`);
    assert(candidate?.request?.semanticAction?.evidence?.includes('COMPOSITIONAL_PREDICATE_OBJECT_GOAL'), `${label} records compositional predicate/object evidence`);
  }
  const negatedCreate = buildRequest('Yeni bir vardiya oluşturmak istemiyorum');
  assert(negatedCreate?.request?.semanticAction?.actionClass !== 'CREATE', 'negated shift creation does not become affirmative CREATE');
  assert(negatedCreate?.request?.operation !== 'CREATE_SHIFT', 'negated shift creation does not map to CREATE_SHIFT');

  const navigateAgreement = buildSchoolOperationsRequest('Sözleşmeler ekranını aç');
  assertAction(navigateAgreement, 'VIEW', 'AGREEMENT', 'agreement surface view');
  assert(navigateAgreement?.request?.operation === 'VIEW_AUTHORIZED_SURFACE', 'agreement surface uses authorized view operation');
  assert(navigateAgreement?.request?.workflowRef?.workflowIntent === 'OPEN_AGREEMENTS_SURFACE', 'agreement surface keeps the canonical workflow intent');
  assert(navigateAgreement?.request?.operation !== 'CREATE_SHIFT', 'agreement surface view does not become create');
  const viewShifts = buildRequest('Vardiyalar ekranını görüntüle');
  assertAction(viewShifts, 'VIEW', 'SHIFT', 'shift surface view');
  assert(viewShifts?.request?.operation !== 'CREATE_SHIFT', 'shift view does not become create');
  const explainScreen = buildRequest('Bu ekran ne işe yarıyor?');
  assertAction(explainScreen, 'EXPLAIN', 'SURFACE', 'current screen explanation');
  const continueTask = buildRequest('Devamını anlat', {
    activeGuidedTask: { taskId: 'task-v3-continue', semanticPlan: { workflowIntent: 'CREATE_SHIFT' } },
    lastSettledResult: { requestId: 'settled-v3-continue', continuationDepth: 1 },
  });
  assertAction(continueTask, 'CONTINUE', 'SHIFT', 'guided continuation');
  const resumeTask = buildRequest('Nerede kaldık?', {
    activeGuidedTask: { taskId: 'task-v3-resume', semanticPlan: { workflowIntent: 'CREATE_SHIFT' } },
    lastSettledResult: { requestId: 'settled-v3-resume', continuationDepth: 1 },
  });
  assertAction(resumeTask, 'RESUME', 'SHIFT', 'guided resume');

  // Frozen V3 action-frame contract: comparison is distinct from EXPLAIN,
  // and a missing object candidate remains nullable instead of becoming an
  // UNKNOWN product object. The action itself is retained for safe
  // clarification/grounding downstream.
  const compareRequest = buildRequest("A ile B'yi karşılaştır");
  const compareAction = compareRequest?.request?.semanticAction;
  assert(compareAction?.actionClass === 'COMPARE', 'comparison resolves to the frozen COMPARE action');
  assert(compareRequest?.request?.operation === 'COMPARE_AUTHORIZED_RECORDS', 'comparison maps to the canonical compare operation');
  assert(compareAction?.objectClass === null && compareAction?.targetCandidate === null, 'comparison keeps an unresolved object candidate nullable');
  assert(compareAction?.resolutionStatus === 'UNRESOLVED', 'comparison with insufficient object evidence stays unresolved without losing COMPARE');
  assert(compareRequest?.request?.ambiguity?.status === 'UNRESOLVED', 'insufficient comparison evidence stays explicitly unresolved');
  assert(compareAction?.modifiers && !Array.isArray(compareAction.modifiers)
    && compareAction.modifiers.current === true && compareAction.modifiers.new === false, 'comparison uses object-style modifiers');
  const ambiguousCompare = buildRequest('Hangisi daha iyi?', {
    activeComparisonSet: [{ type: 'OFFER', id: 1 }, { type: 'OFFER', id: 2 }, { type: 'OFFER', id: 3 }],
  });
  assert(ambiguousCompare?.request?.semanticAction?.actionClass === 'COMPARE', 'multiple comparison candidates retain COMPARE');
  assert(ambiguousCompare?.request?.semanticAction?.resolutionStatus === 'AMBIGUOUS', 'multiple comparison candidates use AMBIGUOUS status');
  assert(ambiguousCompare?.request?.ambiguity?.status === 'AMBIGUOUS', 'AMBIGUOUS action status is reflected in the request ambiguity state');
  const contradictoryCompare = { ...compareRequest.request, operation: 'EXPLAIN_CURRENT_SURFACE' };
  const contradictoryCompareValidation = validateCanonicalConversationRequest(contradictoryCompare);
  assert(!contradictoryCompareValidation.valid, 'COMPARE action cannot validate with an unrelated EXPLAIN operation');
  assert(contradictoryCompareValidation.failureClass === 'ACTION_MAPPING_FAILURE', 'action mapping failure stays distinct from product ambiguity');

  // Restart is a typed task transition represented by the existing
  // RETURN_TO_PRODUCT operation. It must not be collapsed into CONTINUE, and
  // “baştan anlat” remains an explanation request rather than a restart.
  const restartTask = buildRequest('Baştan al', {
    activeGuidedTask: { taskId: 'task-v3-restart', semanticPlan: { workflowIntent: 'CREATE_SHIFT' } },
    lastSettledResult: { requestId: 'settled-v3-restart', continuationDepth: 1 },
  });
  assert(restartTask?.request?.semanticAction?.actionClass !== 'CONTINUE', 'restart request is not interpreted as CONTINUE');
  assert(restartTask?.request?.continuation?.mode === 'RESTART', 'restart request uses the typed restart continuation mode');
  assert(restartTask?.request?.semanticAction?.modifiers?.new === true, 'restart request marks a new-start modifier');
  const restartStartOver = buildRequest('Akışı sıfırdan başlatalım', {
    activeGuidedTask: { taskId: 'task-v3-restart-start-over', semanticPlan: { workflowIntent: 'CREATE_SHIFT' } },
    lastSettledResult: { requestId: 'settled-v3-restart-start-over', continuationDepth: 1 },
  });
  assert(restartStartOver?.request?.continuation?.mode === 'RESTART', 'start-over wording uses the typed restart continuation mode');
  assert(restartStartOver?.request?.semanticAction?.modifiers?.new === true, 'start-over wording marks a new-start modifier');
  const explainFromBeginning = buildRequest('Baştan anlat', {
    activeGuidedTask: { taskId: 'task-v3-explain', semanticPlan: { workflowIntent: 'CREATE_SHIFT' } },
    lastSettledResult: { requestId: 'settled-v3-explain', continuationDepth: 1 },
  });
  assert(explainFromBeginning?.request?.semanticAction?.actionClass === 'EXPLAIN', 'explain-from-beginning remains an explanation request');

  const contradictoryCreate = {
    ...createShiftStart.request,
    operation: 'EXPLAIN_CURRENT_SURFACE',
  };
  assert(!validateCanonicalConversationRequest(contradictoryCreate).valid, 'CREATE + SHIFT with surface explanation fails validation');
  const contradictoryNavigation = {
    ...navigateAgreement.request,
    operation: 'CREATE_SHIFT',
  };
  assert(!validateCanonicalConversationRequest(contradictoryNavigation).valid, 'NAVIGATE + AGREEMENT with create fails validation');
  const contradictoryOffTopic = {
    ...buildRequest('Pizza mı makarna mı?')?.request,
    operation: 'CREATE_SHIFT',
  };
  assert(!validateCanonicalConversationRequest(contradictoryOffTopic).valid, 'genuine OOS with create fails validation');
  const v2TransportOnlyRoute = resolveConversationRoute({
    message: 'Vardiya oluşturmak istiyorum',
    canonicalRequest: { request: { ...createShift.request, version: 'SEFER-ABI-CANONICAL-REQUEST-V2' }, validation: { status: 'VALID' } },
    canonicalShape: createShift.canonicalShape,
  });
  assert(v2TransportOnlyRoute?.route === 'UNCLEAR_OR_AMBIGUOUS', 'V2 transport compatibility cannot re-interpret V3 semantic action');

  const genuineOffTopic = buildRequest('Pizza mı makarna mı?');
  assertScope(genuineOffTopic, 'OFF_TOPIC_GENUINE', 'genuine off-topic request');
  assert(genuineOffTopic?.request?.operation === 'GENERAL_INFORMATION', 'genuine off-topic request maps to general information');

  const ambiguousProduct = buildRequest('Buradaki duruma bakabilir misin?');
  assert(['PRODUCT_AMBIGUOUS', 'UNRESOLVED'].includes(ambiguousProduct?.request?.semanticScope?.class), 'ambiguous product request remains clarification scope');
  assert(ambiguousProduct?.request?.semanticScope?.class !== 'OFF_TOPIC_GENUINE', 'ambiguous product request is not genuine OOS');

  const explicitProduct = buildSchoolOperationsRequest('Sözleşmeler ekranını aç');
  assertScope(explicitProduct, 'PRODUCT_EXPLICIT', 'explicit product navigation');

  const deicticProduct = buildRequest('Burası ne?', {
    activeGuidedTask: { taskId: 'task-deictic', semanticPlan: { workflowIntent: 'CREATE_SHIFT' } },
    lastSettledResult: { requestId: 'settled-deictic', continuationDepth: 0 },
  });
  assertScope(deicticProduct, 'PRODUCT_CONTEXTUAL', 'deictic live-surface request');
  assert(deicticProduct?.request?.operation === 'EXPLAIN_CURRENT_TARGET', 'deictic live-surface request maps to EXPLAIN_CURRENT_TARGET');

  const continuation = buildRequest('Devam et', {
    activeGuidedTask: { taskId: 'task-continuation', semanticPlan: { workflowIntent: 'CREATE_SHIFT' } },
    lastSettledResult: { requestId: 'settled-continuation', continuationDepth: 1 },
  });
  assertScope(continuation, 'PRODUCT_CONTEXTUAL', 'continuation request');

  // V3 continuation behavior-class RED: a natural request to continue from
  // the settled task must resolve as CONTINUE even when it does not contain
  // the shorter "devam et" cue.  The active task supplies context only; it
  // must not force unrelated requests into continuation.
  const activeContinuationState = {
    activeGuidedTask: { taskId: 'task-continuation-unseen', semanticPlan: { workflowIntent: 'CREATE_SHIFT', family: 'UI_GUIDANCE' } },
    lastSettledResult: { requestId: 'settled-continuation-unseen', continuationDepth: 1 },
  };
  const unseenContinuation = buildRequest('Kaldığımız yerden ilerleyelim', activeContinuationState);
  assertAction(unseenContinuation, 'CONTINUE', 'SHIFT', 'unseen active-task continuation');
  assert(unseenContinuation?.request?.continuation?.mode === 'CONTINUE', 'unseen active-task continuation keeps typed CONTINUE mode');
  const equivalentContinuation = buildRequest('Buradan sürdürelim, sıradaki adıma geçelim', activeContinuationState);
  assertAction(equivalentContinuation, 'CONTINUE', 'SHIFT', 'equivalent active-task continuation');
  const explicitNewIntentDuringTask = buildRequest('Sözleşmeler ekranına geçelim', activeContinuationState);
  assertAction(explicitNewIntentDuringTask, 'NAVIGATE', 'AGREEMENT', 'explicit new intent outranks continuation');
  const activeTaskCostQuestion = buildRequest('Maliyet ne kadar?', activeContinuationState);
  assert(activeTaskCostQuestion?.request?.operation !== 'CONTINUE_CURRENT_TASK', 'active task alone does not force cost question into continuation');
  assert(activeTaskCostQuestion?.canonicalShape?.taskType === 'RISK' || activeTaskCostQuestion?.request?.domain === 'BUDGET', 'active task does not steal genuine cost intent');
  const activeTaskAmbiguity = buildRequest('Şu konuyu nasıl ele alalım?', activeContinuationState);
  assert(['UNRESOLVED', 'PRODUCT_AMBIGUOUS'].includes(activeTaskAmbiguity?.request?.semanticScope?.class), 'active task does not manufacture continuation for genuine ambiguity');
  const activeTaskOffTopic = buildRequest('Pizza mı makarna mı?', activeContinuationState);
  assertScope(activeTaskOffTopic, 'OFF_TOPIC_GENUINE', 'active-task genuine off-topic request');

  // Browser-originated SCHOOL operations canary: an authorized operational
  // planning/evidence question must be interpreted at the canonical boundary
  // before downstream routing.  This is intentionally a behavior-class
  // assertion; it must not depend on one literal utterance in production.
  const schoolPlanning = buildSchoolOperationsRequest('Bu servis planında neye bakmalıyım?');
  assert(schoolPlanning?.request?.operation === 'CHECK_EVIDENCE_SUFFICIENCY', 'SCHOOL operational planning question keeps evidence operation');
  assert(schoolPlanning?.request?.domain === 'OPERATIONS', 'SCHOOL operational planning question keeps operations domain');
  assert(schoolPlanning?.canonicalShape?.taskType === 'EVIDENCE_SUFFICIENCY', 'SCHOOL operational planning question keeps evidence task');
  assert(!schoolPlanning?.request?.candidateEntityRefs?.some((ref) => ref?.type === 'ORGANIZATION_PLAN'), 'SCHOOL operations does not borrow organization-plan entity candidate');

  const schoolPlanningParaphrase = buildSchoolOperationsRequest('Bu operasyon planında hangi kanıtlara bakayım?');
  assert(schoolPlanningParaphrase?.request?.operation === 'CHECK_EVIDENCE_SUFFICIENCY', 'SCHOOL planning paraphrase keeps evidence operation');
  assert(schoolPlanningParaphrase?.request?.domain === 'OPERATIONS', 'SCHOOL planning paraphrase keeps operations domain');
  assert(schoolPlanningParaphrase?.canonicalShape?.taskType === 'EVIDENCE_SUFFICIENCY', 'SCHOOL planning paraphrase keeps evidence task');

  const schoolCost = buildSchoolOperationsRequest('Maliyet ne kadar?');
  assert(schoolCost?.canonicalShape?.taskType === 'RISK' && schoolCost?.request?.domain === 'BUDGET', 'explicit SCHOOL cost intent remains a cost/risk candidate');

  // Attempt-02 RED coverage: an authorized School navigation request must
  // resolve to the canonical Agreements surface instead of generic clarify.
  const schoolAgreements = buildSchoolOperationsRequest('Sözleşmeler ekranını aç');
  assert(schoolAgreements?.canonicalShape?.taskType === 'SCREEN_CONTEXT', 'SCHOOL agreements navigation resolves as screen context');
  assert(schoolAgreements?.request?.domain === 'AGREEMENTS', 'SCHOOL agreements navigation resolves to agreements domain');
  assert(schoolAgreements?.canonicalShape?.workflowIntent === 'OPEN_AGREEMENTS_SURFACE', 'SCHOOL agreements navigation has the authorized surface transition');
  const schoolAgreementsParaphrase = buildSchoolOperationsRequest('sözleşmelere git');
  assert(schoolAgreementsParaphrase?.canonicalShape?.taskType === 'SCREEN_CONTEXT' && schoolAgreementsParaphrase?.request?.domain === 'AGREEMENTS', 'SCHOOL agreements navigation paraphrase keeps the same semantic class');
  const schoolAgreementsMovementParaphrase = buildSchoolOperationsRequest('Sözleşmelere geç');
  assert(schoolAgreementsMovementParaphrase?.canonicalShape?.taskType === 'SCREEN_CONTEXT' && schoolAgreementsMovementParaphrase?.request?.domain === 'AGREEMENTS', 'SCHOOL agreements movement paraphrase keeps the same semantic class');
  assert(schoolAgreementsMovementParaphrase?.request?.semanticScope?.class === 'PRODUCT_EXPLICIT', 'SCHOOL agreements movement paraphrase is explicitly product scoped');
  const schoolAgreementsProgressionParaphrase = buildSchoolOperationsRequest('Sözleşme sayfasına ilerle');
  assert(schoolAgreementsProgressionParaphrase?.canonicalShape?.taskType === 'SCREEN_CONTEXT' && schoolAgreementsProgressionParaphrase?.request?.domain === 'AGREEMENTS', 'SCHOOL agreements progression paraphrase keeps the same semantic class');
  const schoolAgreementStatusQuestion = buildSchoolOperationsRequest('Sözleşmelerin durumu nedir?');
  assert(schoolAgreementStatusQuestion?.canonicalShape?.workflowIntent !== 'OPEN_AGREEMENTS_SURFACE', 'agreement status question does not become navigation');
  const companyShiftProgressionParaphrase = buildRequest('Planlama Merkezi ekranına geçip vardiya akışını gösterir misin?');
  assert(companyShiftProgressionParaphrase?.canonicalShape?.taskType === 'SCREEN_CONTEXT' && companyShiftProgressionParaphrase?.request?.domain === 'SHIFTS', 'company shift progression paraphrase resolves to the shift surface');
  assert(companyShiftProgressionParaphrase?.canonicalShape?.workflowIntent === 'OPEN_SHIFT_SURFACE', 'company shift progression paraphrase keeps the navigation workflow');
  assert(companyShiftProgressionParaphrase?.request?.candidateEntityRefs?.length === 0, 'resolved shift surface navigation does not manufacture a record candidate');
  const companyShiftSurfaceAuthorization = await authorizeSemanticRequest({ user: { role: 'COMPANY', companyId: 1 }, request: companyShiftProgressionParaphrase.request });
  assert(companyShiftSurfaceAuthorization?.authorizationStatus === 'AUTHORIZED', 'resolved shift surface navigation is authorized without a selected record');
  const vagueNavigation = buildSchoolOperationsRequest('oraya git');
  assert(vagueNavigation?.request?.semanticScope?.class !== 'PRODUCT_EXPLICIT', 'vague navigation without a unique target remains non-explicit');

  // Attempt-02 RED coverage: ROOM is operational/read-only for shifts and
  // must never inherit the COMPANY-only guided create workflow.
  const roomCreate = resolveCanonicalConversationRequest({
    message: 'vardiya oluşturmak istiyorum',
    user: { role: 'ROOM', roomId: 1, companyId: 2 },
    selectedEntity: null,
    conversationState: null,
    screenContext: { path: '/room', label: 'Taşımacılık Firması Merkezi', role: 'ROOM' },
    interpreterMode: 'DETERMINISTIC',
  });
  assertScope(roomCreate, 'PRODUCT_EXPLICIT', 'ROOM role-aware product request');
  assert(roomCreate?.canonicalShape?.workflowModel?.id !== 'COMPANY_GUIDED_NEW_PLAN', 'ROOM never selects the COMPANY guided workflow');
  assert(roomCreate?.canonicalShape?.workflowIntent !== 'CREATE_SHIFT', 'ROOM create intent remains outside COMPANY create workflow');
  assert(roomCreate?.canonicalShape?.workflowIntent === 'OPEN_SHIFT_SURFACE', 'ROOM create request resolves to the existing-shift surface');
  assert(roomCreate?.canonicalShape?.roleCapabilityBoundary === 'ROOM_CREATE_UNSUPPORTED', 'ROOM create request carries the role capability boundary');
  const roomStartGoal = resolveCanonicalConversationRequest({
    message: 'yeni vardiya planı başlatmak istiyorum',
    user: { role: 'ROOM', roomId: 1, companyId: 2 },
    screenContext: { path: '/room', label: 'Taşımacılık Firması Merkezi', role: 'ROOM' },
    interpreterMode: 'DETERMINISTIC',
  });
  assertAction(roomStartGoal, 'CREATE', 'SHIFT', 'ROOM create semantic meaning before policy');
  assert(roomStartGoal?.request?.operation === 'OPEN_EXISTING_SHIFT_OPERATIONS', 'ROOM create semantic meaning maps to the truthful operational surface');
  assert(roomStartGoal?.canonicalShape?.workflowIntent === 'OPEN_SHIFT_SURFACE', 'ROOM create semantic meaning never selects COMPANY_GUIDED_NEW_PLAN');

  // Production-path regression: a valid canonical evidence request must not
  // be replaced by the independent raw-text cost classifier downstream.
  // This intentionally exercises runCopilotFoundation, the same service path
  // used by /api/ai/copilot, rather than asserting only the interpreter.
  const serviceSchoolEvidence = await runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 1,
    user: { role: 'COMPANY', companyId: 2, companyKind: 'SCHOOL' },
    screenContext: { path: '/school/operations', label: 'School Operations' },
    message: 'Bu servis planında hangi kanıtlara bakmalıyım?',
    authSessionId: `canonical-core-school-${Date.now()}`,
  });
  assert(serviceSchoolEvidence?.semanticPlan?.canonicalRequest?.operation === 'CHECK_EVIDENCE_SUFFICIENCY', 'service keeps unseen SCHOOL evidence operation');
  assert(serviceSchoolEvidence?.semanticPlan?.canonicalRequest?.domain === 'OPERATIONS', 'service keeps unseen SCHOOL operations domain');
  assert(serviceSchoolEvidence?.semanticPlan?.canonicalRequest?.capability === 'EVIDENCE_SUFFICIENCY', 'service keeps unseen SCHOOL evidence capability');
  assert(serviceSchoolEvidence?.semanticPlan?.family === 'EVIDENCE_SUFFICIENCY', 'service keeps unseen SCHOOL evidence semantic family');
  assert(serviceSchoolEvidence?.questionType !== 'COST_REASONING', 'service does not replace canonical SCHOOL evidence with cost reasoning');

  const serviceSchoolAgreements = await runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 1,
    user: { role: 'COMPANY', companyId: 2, companyKind: 'SCHOOL' },
    screenContext: { path: '/school/operations', label: 'Okul Operasyon Paneli' },
    message: 'Sözleşmeler ekranını aç',
    authSessionId: `canonical-core-school-agreements-${Date.now()}`,
  });
  assert(serviceSchoolAgreements?.semanticPlan?.workflowIntent === 'OPEN_AGREEMENTS_SURFACE', 'service resolves SCHOOL agreements navigation');
  assert(serviceSchoolAgreements?.questionType === 'AUTHORIZED_DOMAIN_UI_GUIDANCE', 'SCHOOL agreements navigation remains authorized UI guidance');
  assert(serviceSchoolAgreements?.readOnly === true, 'SCHOOL agreements navigation remains read-only');

  const serviceCost = await runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 1,
    user: { role: 'COMPANY', companyId: 1, companyKind: 'COMPANY' },
    screenContext: { path: '/company/financial-operations', label: 'Finans ve Maliyet' },
    message: 'Maliyet ne kadar?',
    authSessionId: `canonical-core-cost-${Date.now()}`,
  });
  const canonicalCost = resolveCanonicalConversationRequest({
    message: 'Maliyet ne kadar?',
    user: { role: 'COMPANY', companyId: 1, companyKind: 'COMPANY' },
    screenContext: { path: '/company/financial-operations', label: 'Finans ve Maliyet' },
    interpreterMode: 'DETERMINISTIC',
  });
  assert(canonicalCost?.request?.operation === 'ASSESS_CURRENT_RISK', 'canonical cost request keeps cost operation');
  assert(serviceCost?.questionType === 'COST_REASONING', 'canonical cost request reaches cost reasoning');

  const serviceCreateShift = await runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 1,
    user: { role: 'COMPANY', companyId: 1, companyKind: 'COMPANY' },
    screenContext: { path: '/company', label: 'Planlama Merkezi' },
    message: 'Vardiya oluşturmak istiyorum',
    authSessionId: `canonical-core-create-shift-${Date.now()}`,
  });
  assert(serviceCreateShift?.semanticPlan?.workflowIntent === 'CREATE_SHIFT', 'CREATE_SHIFT request keeps workflow authority');
  assert(serviceCreateShift?.semanticPlan?.canonicalRequest?.semanticAction?.actionClass === 'CREATE', 'service keeps V3 CREATE action through authorization and routing');
  assert(serviceCreateShift?.questionType !== 'COST_REASONING', 'CREATE_SHIFT request is not stolen by cost reasoning');

  const serviceCreateShiftStart = await runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 1,
    user: { role: 'COMPANY', companyId: 1, companyKind: 'COMPANY' },
    screenContext: { path: '/company', label: 'Planlama Merkezi' },
    message: 'yeni vardiya planı başlatmak istiyorum',
    authSessionId: `canonical-core-create-start-${Date.now()}`,
  });
  assert(serviceCreateShiftStart?.semanticPlan?.canonicalRequest?.semanticAction?.actionClass === 'CREATE', 'service keeps equivalent V3 CREATE action');
  assert(serviceCreateShiftStart?.semanticPlan?.workflowIntent === 'CREATE_SHIFT', 'equivalent V3 CREATE action maps to COMPANY guided workflow');
  assert(serviceCreateShiftStart?.readOnly === true, 'equivalent V3 CREATE guidance remains read-only');

  // Production-path continuation regression: the browser/API service must
  // carry the settled guided task into a natural continuation request rather
  // than returning the canonical clarification fallback.
  const serviceContinuationSession = `canonical-core-continuation-${Date.now()}`;
  const serviceContinuationBase = {
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 1,
    user: { role: 'COMPANY', companyId: 1, companyKind: 'COMPANY' },
    screenContext: { path: '/company', label: 'Planlama Merkezi', role: 'COMPANY' },
    authSessionId: serviceContinuationSession,
  };
  const serviceContinuationStart = await runCopilotFoundation({
    ...serviceContinuationBase,
    message: 'Vardiya oluşturmak istiyorum',
  });
  assert(serviceContinuationStart?.semanticPlan?.workflowIntent === 'CREATE_SHIFT', 'service continuation setup establishes the COMPANY guided task');
  const serviceNaturalContinuation = await runCopilotFoundation({
    ...serviceContinuationBase,
    message: 'Kaldığımız yerden ilerleyelim',
  });
  assert(serviceNaturalContinuation?.semanticPlan?.family === 'CONTINUE_CURRENT_REASONING', 'service keeps natural continuation in the continuation family');
  assert(serviceNaturalContinuation?.semanticPlan?.canonicalRequest?.operation === 'CONTINUE_EXPLANATION', 'service maps natural continuation to the canonical continuation operation');
  assert(serviceNaturalContinuation?.semanticPlan?.canonicalRequest?.semanticAction?.actionClass === 'CONTINUE', 'service preserves the canonical CONTINUE action');
  assert(serviceNaturalContinuation?.semanticPlan?.workflowIntent === 'CREATE_SHIFT', 'service preserves the active guided workflow during continuation');
  assert(!/Hangi kayıt veya konuyu/iu.test(String(serviceNaturalContinuation?.reply || '')), 'service natural continuation does not fall into generic clarification');
  assert(String(serviceNaturalContinuation?.reply || '') !== String(serviceContinuationStart?.reply || ''), 'service continuation does not repeat the settled Step-1 response');
  assert(/devam|kaldık|aynı/iu.test(String(serviceNaturalContinuation?.reply || '')), 'service continuation response names the current continuation state');

  const serviceRestart = await runCopilotFoundation({
    ...serviceContinuationBase,
    message: 'Baştan al',
  });
  assert(serviceRestart?.semanticPlan?.canonicalRequest?.continuation?.mode === 'RESTART', 'service restart keeps the typed RESTART mode');
  assert(serviceRestart?.semanticPlan?.canonicalRequest?.semanticAction?.actionClass !== 'CONTINUE', 'service restart is not downgraded to CONTINUE');
  assert(String(serviceRestart?.reply || '') !== String(serviceNaturalContinuation?.reply || ''), 'service restart does not reuse the continuation response');
  assert(/baştan|yeniden|sıfırdan/iu.test(String(serviceRestart?.reply || '')), 'service restart response names the restart transition');

  const serviceInterveningSession = `canonical-core-intervening-${Date.now()}`;
  const serviceInterveningBase = { ...serviceContinuationBase, authSessionId: serviceInterveningSession };
  const serviceInterveningStart = await runCopilotFoundation({
    ...serviceInterveningBase,
    message: 'Vardiya oluşturmak istiyorum',
  });
  await runCopilotFoundation({
    ...serviceInterveningBase,
    message: 'Bu ekran ne işe yarıyor?',
  });
  const serviceContinuationAfterInfo = await runCopilotFoundation({
    ...serviceInterveningBase,
    message: 'Kaldığımız yerden ilerleyelim',
  });
  assert(serviceContinuationAfterInfo?.semanticPlan?.canonicalRequest?.semanticAction?.actionClass === 'CONTINUE', 'continuation after an informational turn keeps CONTINUE');
  assert(String(serviceContinuationAfterInfo?.reply || '') !== String(serviceInterveningStart?.reply || ''), 'continuation after an informational turn does not reuse stale Step-1 prose');
  assert(/devam|kaldık|aynı/iu.test(String(serviceContinuationAfterInfo?.reply || '')), 'continuation after an informational turn names the current task state');

  const serviceNewIntent = await runCopilotFoundation({
    ...serviceContinuationBase,
    message: 'Sözleşmeler ekranını aç',
  });
  assert(serviceNewIntent?.semanticPlan?.canonicalRequest?.semanticAction?.actionClass === 'NAVIGATE', 'service new intent remains an explicit navigation');
  assert(!/Vardiya oluşturma akışında 1\. adım/iu.test(String(serviceNewIntent?.reply || '')), 'service new intent does not reuse stale Step-1 prose');

  // An explicit object named by the user must outrank stale SHIFT task
  // context even when the current route is still Planlama Merkezi.
  const explicitAgreementSession = `canonical-core-explicit-agreement-${Date.now()}`;
  const explicitAgreementBase = { ...serviceContinuationBase, authSessionId: explicitAgreementSession };
  await runCopilotFoundation({
    ...explicitAgreementBase,
    message: 'Vardiya oluşturmak istiyorum',
  });
  const serviceExplicitAgreement = await runCopilotFoundation({
    ...explicitAgreementBase,
    message: 'Sözleşmeleri görmek istiyorum',
  });
  const agreementRequest = serviceExplicitAgreement?.semanticPlan?.canonicalRequest;
  assert(agreementRequest?.semanticAction?.actionClass === 'VIEW', 'explicit agreement intent remains VIEW');
  assert(agreementRequest?.semanticAction?.objectClass === 'AGREEMENT', 'explicit agreement object outranks stale SHIFT context');
  assert(agreementRequest?.operation === 'VIEW_AUTHORIZED_SURFACE', 'explicit agreement intent keeps authorized surface operation');
  assert(!/İstenen alanı bu ifadeden güvenle çıkaramadım/iu.test(String(serviceExplicitAgreement?.reply || '')), 'explicit agreement view does not fall into field clarification');
  assert(/sözleşme|sozlesme/iu.test(String(serviceExplicitAgreement?.reply || '')), 'explicit agreement view names the agreement surface');

  // Browser-originated pre-wizard regression: Planlama Merkezi can keep its
  // guided-entry control inside the ordinary collapsed work-area disclosure.
  // The live route proves the entry surface and the absence of a workflow
  // marker proves that Step 1 is not current. The exact child control still
  // has to be resolved by the existing guided-target owner before display.
  const serviceCompanyPreWizard = await runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 1,
    user: { role: 'COMPANY', companyId: 1, companyKind: 'COMPANY' },
    screenContext: {
      path: '/company',
      label: 'Planlama Merkezi',
      role: 'COMPANY',
      uiHints: {
        visibleButtons: [{
          label: 'Ayrıntılı çalışma alanını göster',
          targetKey: 'company:task-workspace-disclosure',
          semanticType: 'disclosure',
          identitySource: 'CANONICAL',
        }],
        workflowState: null,
        guidedDraftAvailability: {
          state: 'SAVED_DRAFT_CHOOSER',
          count: 1,
          maxResumeStep: 3,
          source: 'SERVER_GUIDED_DRAFTS',
        },
      },
    },
    message: 'yeni vardiya planı başlatmak istiyorum',
    authSessionId: `canonical-core-pre-wizard-${Date.now()}`,
  });
  assert(serviceCompanyPreWizard?.semanticPlan?.workflowEntryState === 'PRE_WIZARD', 'collapsed Planlama Merkezi entry remains pre-wizard');
  assert(serviceCompanyPreWizard?.semanticPlan?.workflowStepReference == null, 'collapsed Planlama Merkezi does not manufacture Step 1 as current');
  assert(serviceCompanyPreWizard?.semanticPlan?.workflowEntryTarget?.targetKey === 'company:guided-plan-start', 'pre-wizard entry keeps the exact canonical guided-start target');
  assert(!/Vardiya oluşturma akışında 1\. adım/iu.test(String(serviceCompanyPreWizard?.reply || '')), 'pre-wizard response does not describe future Step 1 as current');
  assert(/Rehberi Başlat/iu.test(String(serviceCompanyPreWizard?.reply || '')), 'pre-wizard response identifies the current safe entry action');

  const serviceCompanyEntryRecovery = await runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 2101,
    user: { role: 'COMPANY', companyId: 1, companyKind: 'COMPANY' },
    screenContext: {
      path: '/company',
      label: 'Planlama Merkezi',
      role: 'COMPANY',
      uiHints: {
        visibleButtons: [{
          label: 'Ayrıntılı çalışma alanını göster',
          targetKey: 'company:task-workspace-disclosure',
          semanticType: 'disclosure',
          identitySource: 'CANONICAL',
        }],
        workflowState: null,
        guidedDraftAvailability: {
          state: 'SAVED_DRAFT_CHOOSER',
          count: 1,
          maxResumeStep: 3,
          source: 'SERVER_GUIDED_DRAFTS',
        },
      },
    },
    message: 'Bu düğme açılmıyor.',
    authSessionId: `canonical-core-pre-wizard-recovery-${Date.now()}`,
  });
  assert(serviceCompanyEntryRecovery?.semanticPlan?.continuationAction === 'RECOVER', 'generic failure language recovers the canonical pre-wizard target');
  assert(serviceCompanyEntryRecovery?.semanticPlan?.workflowEntryTarget?.targetKey === 'company:guided-plan-start', 'pre-wizard recovery keeps the exact guided-start target');
  assert(!/Hangi kayıt veya konuyu/iu.test(String(serviceCompanyEntryRecovery?.reply || '')), 'pre-wizard recovery does not become generic clarification');
  assert(/Rehberi Başlat/iu.test(String(serviceCompanyEntryRecovery?.reply || '')), 'pre-wizard recovery names the current safe entry action');

  // A foreground server-backed chooser is more specific than its containing
  // Planlama Merkezi route. A deictic screen question must explain the
  // chooser's real actions without treating Step 1 as current or suggesting
  // an implicit destructive discard.
  const serviceGuidedDraftChooser = await runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 2101,
    user: { role: 'COMPANY', companyId: 1, companyKind: 'COMPANY' },
    screenContext: {
      path: '/company',
      label: 'Planlama Merkezi',
      role: 'COMPANY',
      uiHints: {
        foregroundSurface: { key: 'company:guided-draft-chooser', kind: 'SAVED_DRAFT_CHOOSER', source: 'LIVE_UI' },
        visibleButtons: [
          { label: 'Devam et', targetKey: 'company:guided-draft-resume', semanticType: 'button', identitySource: 'CANONICAL' },
          { label: 'Yeni plan', targetKey: 'company:guided-draft-new', semanticType: 'button', identitySource: 'CANONICAL' },
          { label: 'Taslağı sil', targetKey: 'company:guided-draft-discard', semanticType: 'button', identitySource: 'CANONICAL' },
        ],
        workflowState: null,
        guidedDraftAvailability: {
          state: 'SAVED_DRAFT_CHOOSER',
          count: 1,
          maxResumeStep: 2,
          source: 'SERVER_GUIDED_DRAFTS',
        },
      },
    },
    message: 'Bu ekran ne işe yarıyor?',
    authSessionId: `canonical-core-guided-draft-chooser-${Date.now()}`,
  });
  assert(serviceGuidedDraftChooser?.semanticPlan?.guidedDraftChooserIntent === true, 'foreground saved-draft chooser is the canonical current surface');
  assert(/Kayıtlı taslaklar/iu.test(String(serviceGuidedDraftChooser?.reply || '')), 'foreground chooser explanation names the live chooser');
  assert(/Devam et/iu.test(String(serviceGuidedDraftChooser?.reply || '')), 'foreground chooser explanation describes the safe resume action');
  assert(!/Vardiya oluşturma akışında 1\. adım/iu.test(String(serviceGuidedDraftChooser?.reply || '')), 'foreground chooser does not manufacture Step 1 as current');
  assert(serviceGuidedDraftChooser?.guidedTarget?.targetKey !== 'company:guided-plan-start', 'foreground chooser clears the stale pre-wizard target instead of retaining Rehberi Başlat');

  const serviceRoomCreate = await runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 1,
    user: { role: 'ROOM', roomId: 1, companyId: 2 },
    screenContext: { path: '/room', label: 'Taşımacılık Firması Merkezi' },
    message: 'vardiya oluşturmak istiyorum',
    authSessionId: `canonical-core-room-${Date.now()}`,
  });
  assert(serviceRoomCreate?.semanticPlan?.workflowIntent === 'OPEN_SHIFT_SURFACE', 'ROOM service path resolves to existing-shift guidance');
  assert(serviceRoomCreate?.semanticPlan?.workflowIntent !== 'CREATE_SHIFT', 'ROOM service path never exposes create workflow');
  assert(serviceRoomCreate?.semanticPlan?.canonicalRequest?.semanticAction?.actionClass === 'CREATE', 'ROOM semantic action remains CREATE before policy and authorization');
  assert(/yeni vardiya veya talep kaydı oluşturulmaz/iu.test(String(serviceRoomCreate?.reply || '')), 'ROOM service guidance states the create boundary');
  assert(serviceRoomCreate?.readOnly === true, 'ROOM create guidance remains read-only');

  const ambiguousWithoutSurface = resolveCanonicalConversationRequest({
    message: 'Neye bakmalıyım?',
    user: { role: 'COMPANY', companyId: 2, companyKind: 'SCHOOL' },
    screenContext: null,
    conversationState: null,
    interpreterMode: 'DETERMINISTIC',
  });
  assert(ambiguousWithoutSurface?.canonicalShape?.taskType !== 'EVIDENCE_SUFFICIENCY', 'passive context cannot fabricate SCHOOL evidence intent');

  const malformed = resolveCanonicalConversationRequest({
    message: 'malformed contract probe',
    user: { role: 'COMPANY', companyId: 1 },
    screenContext: null,
    conversationState: null,
    interpreterMode: 'DETERMINISTIC',
  });
  if (malformed?.validation?.status === 'SEMANTIC_UNRESOLVED') {
    assert(malformed?.failureClass === 'SAFE_CLARIFICATION' || malformed?.request?.ambiguity?.status === 'UNRESOLVED', 'invalid envelope maps to safe clarification');
  }

  assert(!Object.prototype.hasOwnProperty.call(envelope || {}, 'authorizationStatus'), 'authorization is separate from pre-auth envelope');
  assert(!Object.prototype.hasOwnProperty.call(envelope || {}, 'authorizedEntityRefs'), 'authorized refs are not embedded in candidate envelope');
  const authorization = await authorizeSemanticRequest({ user: { role: 'COMPANY', companyId: 1 }, request: envelope });
  assert(['AUTHORIZED', 'DENIED', 'NOT_FOUND', 'REQUIRES_CLARIFICATION'].includes(authorization?.authorizationStatus), 'authorization result has deterministic status');
  assert(Array.isArray(authorization?.authorizedEntityRefs), 'authorization result separates authorized refs');
  assert(Array.isArray(authorization?.deniedCandidateRefs), 'authorization result separates denied candidates');
  const state = {
    activeGuidedTask: { taskId: 'task-1', semanticPlan: { workflowIntent: 'CREATE_SHIFT' } },
    guidedTarget: { targetKey: 'company:guided-plan-start' },
    productContext: { semanticPlan: { family: 'UI_GUIDANCE' }, screenPath: '/company' },
    uniqueDiscourseReferent: { type: 'agreement', id: 184 },
    lastSettledResult: { requestId: result.requestId, reply: 'redacted result' },
  };
  const suspended = applyCanonicalConversationTransition({ state, transition: 'SUSPEND_TASK', reason: 'EXPLICIT_NEW_DOMAIN' });
  assert(suspended?.transition?.type === 'SUSPEND_TASK', 'task suspension is typed');
  assert(suspended?.productContext?.suspended === true, 'explicit new intent suspends product context');
  const invalidated = applyCanonicalConversationTransition({ state: suspended, transition: 'INVALIDATE_STALE_CONTEXT', reason: 'ROUTE_CHANGED' });
  assert(invalidated?.guidedTarget === null, 'stale target is invalidated by typed transition');
  const persisted = projectPersistableConversationState(state);
  assert(!persisted?.rawEnvelope && !persisted?.rawMessage, 'persisted state excludes unrestricted raw envelope/message');
  const trace = createSemanticTrace({
    requestId: result.requestId,
    authScope: { role: 'COMPANY', companyId: 1 },
    canonicalRequest: envelope,
    contextResolution: { source: 'LIVE_UI', status: 'RESOLVED' },
    entityResolution: { status: 'CANDIDATE_ONLY' },
    authorizationDecision: { status: 'ALLOW' },
    groundingSources: [{ source: 'CURRENT_RUNTIME', status: 'KNOWN' }],
    semanticOutcome: { operation: envelope.operation, domain: envelope.domain },
    targetResolution: { status: 'NOT_REQUESTED' },
    responseRenderer: { status: 'PENDING' },
    failureClass: null,
  });
  assert(trace?.schemaVersion === SEFER_ABI_SEMANTIC_TRACE_VERSION, 'semantic trace uses V1 schema');
  assert(!trace?.rawText && !trace?.canonicalRequest?.currentRequest?.rawText, 'semantic trace is redacted');
  assert(trace?.canonicalRequest?.semanticAction?.actionClass === envelope.semanticAction?.actionClass, 'semantic trace preserves the redacted V3 action result');

  // Stage-A RED matrix: provider-neutral seam, strict proposal validation,
  // fail-closed behavior, and deterministic-first eligibility.
  const highConfidenceEligibility = evaluateSemanticFallbackEligibility({
    semanticScopeClass: 'PRODUCT_EXPLICIT',
    resolutionStatus: 'RESOLVED',
    hasProductEvidence: true,
  });
  assert(highConfidenceEligibility.eligible === false, 'high-confidence deterministic result is not fallback eligible');
  assert(highConfidenceEligibility.reasonCode === 'HIGH_CONFIDENCE_DETERMINISTIC', 'high-confidence eligibility reason is explicit');

  const b02Regression = buildRequest('Bugünkü sefer kayıtlarına göz atabilir miyim?');
  const b02Eligibility = evaluateSemanticFallbackEligibility({
    semanticScopeClass: b02Regression?.request?.semanticScope?.class,
    resolutionStatus: b02Regression?.request?.semanticAction?.resolutionStatus,
    confidence: b02Regression?.request?.semanticScope?.confidence <= 0.65 ? 'LOW' : 'HIGH',
    hasProductEvidence: true,
  });
  assertAction(b02Regression, 'VIEW', 'SHIFT', 'B02 internal contextual regression');
  assert(b02Eligibility.eligible === false, 'B02 resolved internal context does not invoke fallback');
  assert(b02Eligibility.reasonCode === 'HIGH_CONFIDENCE_DETERMINISTIC', 'B02 uses the deterministic internal context path');
  const unresolvedEligibility = evaluateSemanticFallbackEligibility({
    semanticScopeClass: 'UNRESOLVED',
    resolutionStatus: 'UNRESOLVED',
    hasProductEvidence: true,
  });
  assert(unresolvedEligibility.eligible === true, 'unresolved product evidence reaches the bounded fallback seam');
  const b02Service = await runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 1,
    user: { role: 'COMPANY', companyId: 1, companyKind: 'COMPANY' },
    screenContext: { path: '/company', label: 'Planlama Merkezi', role: 'COMPANY' },
    message: 'Bugünkü sefer kayıtlarına göz atabilir miyim?',
    authSessionId: `canonical-core-stage-a-b02-${Date.now()}`,
  });
  assert(b02Service?.semanticPlan?.canonicalRequest?.semanticAction?.actionClass === 'VIEW', 'service path resolves B02 through internal context');
  assert(b02Service?.semanticPlan?.canonicalFallbackEligibility?.eligible === false, 'service path keeps B02 provider-free after internal resolution');
  assert(b02Service?.semanticPlan?.canonicalFallbackEligibility?.invoked === false, 'service path keeps provider invocation disabled');

  const ambiguousEligibility = evaluateSemanticFallbackEligibility({
    semanticScopeClass: 'PRODUCT_AMBIGUOUS',
    resolutionStatus: 'AMBIGUOUS',
    hasProductEvidence: true,
  });
  assert(ambiguousEligibility.eligible === false, 'genuine ambiguity does not invoke fallback');
  const oosEligibility = evaluateSemanticFallbackEligibility({
    semanticScopeClass: 'OFF_TOPIC_GENUINE',
    resolutionStatus: 'NOT_APPLICABLE',
    hasProductEvidence: false,
  });
  assert(oosEligibility.eligible === false, 'genuine OOS does not invoke fallback');

  const validProposal = {
    actionClass: 'VIEW',
    objectClass: 'SHIFT',
    targetCandidate: null,
    modifiers: { new: false, current: true, next: false, explicitTarget: false },
    explicitness: 'EXPLICIT',
    evidence: ['MOCK_COMPOSITIONAL_VIEW'],
    confidence: 'HIGH',
    resolutionStatus: 'RESOLVED',
  };
  assert(validateProviderNeutralProposal(validProposal).valid === true, 'valid typed proposal passes provider-neutral validation');
  assert(validateProviderNeutralProposal({ ...validProposal, actionClass: 'INVENTED' }).failureCode === 'UNSUPPORTED_ENUM', 'unsupported action enum fails closed');
  assert(validateProviderNeutralProposal({ ...validProposal, objectClass: 'INVENTED' }).failureCode === 'UNSUPPORTED_ENUM', 'unsupported object enum fails closed');
  assert(validateProviderNeutralProposal({ ...validProposal, operation: 'CREATE_SHIFT' }).failureCode === 'UNEXPECTED_AUTHORITY_FIELD', 'unexpected authoritative field fails closed');
  assert(validateProviderNeutralProposal({ ...validProposal, confidence: 'LOW' }).failureCode === 'LOW_CONFIDENCE', 'low-confidence proposal fails closed');
  assert(validateProviderNeutralProposal({ ...validProposal, resolutionStatus: 'AMBIGUOUS' }).failureCode === 'AMBIGUOUS_PROPOSAL', 'ambiguous proposal fails closed');
  assert(validateProviderNeutralProposal({ ...validProposal, targetCandidate: { objectClass: 'AGREEMENT' } }).failureCode === 'SCHEMA_INVALID', 'candidate/object mismatch fails closed');
  assert(validateProviderNeutralProposal({ ...validProposal, targetCandidate: { objectClass: 'SHIFT', semanticId: '12345' } }).failureCode === 'SCHEMA_INVALID', 'record-like semantic id fails closed');
  assert(validateProviderNeutralProposal({ ...validProposal, actionClass: 'NONE', objectClass: null }).failureCode === 'SCHEMA_INVALID', 'resolved NONE proposal fails closed');
  for (const authorityField of ['authorization', 'tenant', 'entityId', 'workflow', 'route', 'uiTarget', 'recordId', 'writeAction']) {
    assert(validateProviderNeutralProposal({ ...validProposal, [authorityField]: 'forbidden' }).valid === false, `${authorityField} authority field fails closed`);
  }
  assert(validateProviderNeutralInput({
    utterance: 'bounded input',
    tenantRecords: [{ id: 1 }],
  }).valid === false, 'forbidden tenant data is rejected from proposer input');
  assert(validateProviderNeutralInput({
    utterance: 'bounded input',
    roleContext: { role: 'COMPANY' },
    surfaceMetadata: { key: 'company:planning-center' },
  }).valid === true, 'least-context proposer input remains accepted');

  const eligibleProposal = await invokeProviderNeutralSemanticProposer({
    proposer: async () => validProposal,
    input: { utterance: 'bounded product coverage gap', roleContext: { role: 'COMPANY' } },
  });
  assert(eligibleProposal.result?.status === 'PROPOSAL_ACCEPTED', 'eligible low-confidence seam accepts only a validated proposal');
  assert(eligibleProposal.trace?.invoked === true && eligibleProposal.trace?.proposerKind === 'MOCK', 'injected proposer is the only Stage-A invocation');

  const deterministicResult = { actionClass: 'VIEW', objectClass: 'SHIFT', resolutionStatus: 'RESOLVED', confidence: 'HIGH' };
  const conflict = await invokeProviderNeutralSemanticProposer({
    proposer: async () => ({ ...validProposal, actionClass: 'CREATE' }),
    input: { utterance: 'mock conflict', semanticContext: { productEvidence: true } },
    deterministicResult,
  });
  assert(conflict.result?.status === 'SAFE_CLARIFICATION' || conflict.result?.status === 'DETERMINISTIC_PRESERVED', 'deterministic/proposal conflict fails closed or preserves deterministic result');

  for (const failureCode of Object.values(MODEL_FALLBACK_FAILURE_CODES)) {
    const failure = await invokeProviderNeutralSemanticProposer({
      proposer: async () => ({ failureCode }),
      input: { utterance: 'mock failure', semanticContext: { productEvidence: true } },
    });
    assert(failure.result?.status === 'SAFE_CLARIFICATION', `${failureCode} maps to safe clarification`);
  }
  assert(b02Regression?.fallbackEligibility?.eligible === false, 'canonical result keeps B02 on the internal deterministic path');
  assert(b02Regression?.fallbackEligibility?.invoked === false, 'Stage-A default path does not invoke a proposer');

  // Internal contextual semantic regression: product-domain, temporal,
  // inspection and foreground context are composed before the canonical
  // action is formed. This is deliberately a structural B02 development
  // regression, not an exact phrase rule.
  const b02Context = buildCanonicalSemanticContext({
    message: 'Bugünkü sefer kayıtlarına göz atabilir miyim?',
    user: { role: 'COMPANY', companyId: 1, companyKind: 'COMPANY' },
    screenContext: { path: '/company/vardiyalar', label: 'Vardiyalar', role: 'COMPANY' },
    conversationState: null,
  });
  assert(b02Context?.currentDomain === 'SHIFTS', 'canonical context derives the current shift domain');
  assert(b02Context?.evidence?.temporal?.includes('CURRENT_TIME_WINDOW'), 'canonical context preserves bounded temporal evidence');
  assert(b02Context?.evidence?.object?.includes('PRODUCT_SHIFT_RECORD'), 'canonical context derives typed shift-record evidence');
  assert(b02Context?.evidence?.action?.includes('NON_MUTATING_INSPECTION'), 'canonical context derives non-mutating inspection evidence');
  const staleContext = buildCanonicalSemanticContext({
    message: 'Buna bak',
    user: { role: 'COMPANY', companyId: 1, companyKind: 'COMPANY' },
    screenContext: { path: '/company/agreements', label: 'Sözleşmeler', role: 'COMPANY' },
    conversationState: {
      activeDomain: 'SHIFTS',
      uniqueDiscourseReferent: { type: 'SHIFT', id: 99 },
      activeGuidedTask: { taskId: 'stale-shift', semanticPlan: { workflowIntent: 'CREATE_SHIFT' } },
    },
  });
  assert(staleContext?.currentDomain === 'AGREEMENTS', 'live foreground surface outranks stale stored domain');
  assert(staleContext?.referenceState?.uniqueReferent === null, 'incompatible discourse referent is rejected as stale');
  const b02Contextual = resolveCanonicalConversationRequest({
    message: 'Bugünkü sefer kayıtlarına göz atabilir miyim?',
    user: { role: 'COMPANY', companyId: 1, companyKind: 'COMPANY' },
    screenContext: { path: '/company/vardiyalar', label: 'Vardiyalar', role: 'COMPANY' },
    conversationState: null,
    semanticContext: b02Context,
  });
  assertAction(b02Contextual, 'VIEW', 'SHIFT', 'B02 contextual view');
  assert(b02Contextual?.request?.operation === 'VIEW_AUTHORIZED_SURFACE', 'B02 contextual view maps to authorized view operation');
  assert(b02Contextual?.request?.semanticScope?.class === 'PRODUCT_CONTEXTUAL' || b02Contextual?.request?.semanticScope?.class === 'PRODUCT_EXPLICIT', 'B02 contextual view remains product-scoped');

  const contextualContrastCases = [
    ['Bugünkü servisleri görmek istiyorum', 'VIEW', 'SHIFT'],
    ['Aktif seferlere bakabilir miyim?', 'VIEW', 'SHIFT'],
    ['Şu anki vardiyaları incele', 'VIEW', 'SHIFT'],
  ];
  for (const [message, expectedAction, expectedObject] of contextualContrastCases) {
    const context = buildCanonicalSemanticContext({
      message,
      user: { role: 'COMPANY', companyId: 1, companyKind: 'COMPANY' },
      screenContext: { path: '/company/vardiyalar', label: 'Vardiyalar', role: 'COMPANY' },
      conversationState: null,
    });
    const contextual = resolveCanonicalConversationRequest({
      message,
      user: { role: 'COMPANY', companyId: 1, companyKind: 'COMPANY' },
      screenContext: { path: '/company/vardiyalar', label: 'Vardiyalar', role: 'COMPANY' },
      conversationState: null,
      semanticContext: context,
    });
    assertAction(contextual, expectedAction, expectedObject, `contextual contrast ${message}`);
  }

  const negatedContext = buildCanonicalSemanticContext({
    message: 'Bugünkü vardiyaları görmek istemiyorum',
    user: { role: 'COMPANY', companyId: 1, companyKind: 'COMPANY' },
    screenContext: { path: '/company/vardiyalar', label: 'Vardiyalar', role: 'COMPANY' },
    conversationState: null,
  });
  const negatedContextual = resolveCanonicalConversationRequest({
    message: 'Bugünkü vardiyaları görmek istemiyorum',
    user: { role: 'COMPANY', companyId: 1, companyKind: 'COMPANY' },
    screenContext: { path: '/company/vardiyalar', label: 'Vardiyalar', role: 'COMPANY' },
    conversationState: null,
    semanticContext: negatedContext,
  });
  assert(negatedContextual?.request?.semanticAction?.actionClass !== 'VIEW', 'contextual negation vetoes affirmative view');
  console.log('PASS canonical envelope structural contract');
  console.log('PASS canonical conversation core structural checks');
}

try {
  await main();
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
