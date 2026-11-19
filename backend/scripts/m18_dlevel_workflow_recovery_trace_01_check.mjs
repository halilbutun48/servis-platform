import { runCopilotFoundation } from '../src/ai/service.js';

const authSessionId = `m18-dlevel-workflow-trace-${Date.now()}`;
const user = { id: 880607, role: 'COMPANY', companyKind: 'COMPANY', companyId: 1 };
const screenContext = {
  path: '/company',
  label: 'Planlama Merkezi',
  role: 'COMPANY',
  uiHints: {
    pageTitles: ['Planlama Merkezi'],
    visibleButtons: [{ label: 'Rehberi Başlat', targetKey: 'company:guided-plan-start' }],
  },
};
const messages = [
  'Ben vardiya oluşturmak istiyorum',
  'Yeni vardiya nereden açılıyor?',
  'Vardiya eklemeyi göster',
  'Beni vardiya oluşturma ekranına göt',
  'Vardiya oluşturma yerini bulamadım',
];

for (const message of messages) {
  const result = await runCopilotFoundation({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 0,
    user,
    message,
    screenContext,
    authSessionId,
  });
  console.log(JSON.stringify({
    message,
    family: result.semanticPlan?.family,
    workflowIntent: result.semanticPlan?.workflowIntent,
    continuationBaseWorkflow: result.semanticPlan?.continuationBasePlan?.workflowIntent,
    workflowEntryState: result.semanticPlan?.workflowEntryState,
    workflowStepReference: result.semanticPlan?.workflowStepReference,
    shapeTaskType: result.semanticPlan?.canonicalRequestEnvelope?.canonicalShape?.taskType,
    shapeWorkflowIntent: result.semanticPlan?.canonicalRequestEnvelope?.canonicalShape?.workflowIntent,
    shapeGeneralProductHelpIntent: result.semanticPlan?.canonicalRequestEnvelope?.canonicalShape?.generalProductHelpIntent,
    shapeRoleHelpIntent: result.semanticPlan?.canonicalRequestEnvelope?.canonicalShape?.roleHelpIntent,
    typedRequest: result.semanticPlan?.canonicalRequestEnvelope?.canonicalShape?.typedRequest,
    typedRequestMode: result.semanticPlan?.canonicalRequestEnvelope?.canonicalShape?.typedRequest?.requestMode,
    planTypedRequest: result.semanticPlan?.typedRequest,
    planRequestMode: result.semanticPlan?.typedRequest?.requestMode,
    planTaskType: result.semanticPlan?.typedRequest?.taskType,
    planContinuationIntent: result.semanticPlan?.typedRequest?.continuationIntent,
    planContinuationAction: result.semanticPlan?.typedRequest?.continuationAction,
    canonicalTypedMode: result.semanticPlan?.canonicalRequest?.typedEvidence?.requestMode,
    canonicalTypedObject: result.semanticPlan?.canonicalRequest?.typedEvidence?.object,
    canonicalTypedTarget: result.semanticPlan?.canonicalRequest?.typedEvidence?.targetRequest,
    canonicalTypedQuality: result.semanticPlan?.canonicalRequest?.typedEvidence?.quality,
    currentTargetReference: result.semanticPlan?.canonicalRequestEnvelope?.canonicalShape?.currentTargetReference,
    canonicalValidationErrors: result.semanticPlan?.canonicalRequestValidation?.errors,
    semanticPlanKeys: Object.keys(result.semanticPlan || {}),
    canonicalValidation: result.semanticPlan?.canonicalRequestValidation,
    currentTarget: result.semanticPlan?.currentTargetReference || result.guidedTarget,
    operation: result.semanticPlan?.canonicalRequest?.operation,
    action: result.semanticPlan?.canonicalRequest?.semanticAction?.actionClass,
    object: result.semanticPlan?.canonicalRequest?.semanticAction?.objectClass,
    reply: result.reply,
  }));
}
