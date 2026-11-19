import { buildChatHelpResponse } from './helpComposer.js';
import { buildGoldenQuestionPack } from './goldenQuestionPack.js';
import { getScreenDefinitionForUser } from '../jobGuide/screenCatalog.js';
import { detectQuestionIntent } from './intentRouter.js';

// These cases intentionally take a documented response-composition path after
// canonical intent routing.  They are explicit public contracts, not a second
// semantic classifier.
const COMPOSER_PUBLIC_TYPE_OVERRIDES = Object.freeze({
  'room-shifts-ready-assigned': 'WHY_BLOCKED',
  'room-agreements-route-refresh-offer': 'READINESS_CHECK',
  'room-agreements-route-refresh-history': 'READINESS_CHECK',
  'room-agreements-dynamic-savings-preview': 'READINESS_CHECK',
  'superadmin-commercial-core-csv-preview': 'SCREEN_PURPOSE',
  'superadmin-selected-shift-start-diagnostic': 'WHY_BLOCKED',
  'superadmin-selected-contract-shift-today': 'READINESS_CHECK',
  'room-agreements-contract-readiness': 'READINESS_CHECK',
  'room-shifts-missing-data': 'MISSING_DATA_HELP',
  'superadmin-operations-start-blocked': 'WHY_BLOCKED',
  'organization-shift-contract': 'SEMANTIC_RELATION_LOOKUP',
  'organization-plan-source-lineage': 'SEMANTIC_AUTHORIZATION_BOUNDARY',
});

const SAFE_ACTION_KINDS = new Set(['ASK', 'OPEN_ROUTE', 'OPEN_GUIDE', 'COPY_TEXT', 'CLEAR_FILTER']);
const ACTION_LED_PUBLIC_TYPES = new Set([
  'NEXT_SCREEN',
  'NEXT_BEST_ACTION',
  'NEXT_STEP',
  'FIRST_CONTROL',
  'WHY_BLOCKED',
  'STATUS_HELP',
  'READINESS_CHECK',
  'PAYMENT_READINESS',
  'PAYMENT_MISSING',
]);

function makeUser(role) {
  if (role === 'SCHOOL') return { role: 'COMPANY', companyKind: 'SCHOOL' };
  if (role === 'ORGANIZATION') return { role: 'COMPANY', companyKind: 'ORGANIZATION' };
  return { role };
}

function canonicalExpectation(row, user, screenContext) {
  const roleMode = ['DRIVER', 'PERSONEL', 'PARENT'].includes(String(row?.role || '')) ? 'SIMPLE' : 'OPERATIONS';
  const canonicalIntent = detectQuestionIntent(row?.message || '', {
    entityType: row?.entityType || 'screen',
    screenPath: row?.path || screenContext?.path || '',
    sourceScreenPath: row?.path || screenContext?.path || '',
    userRole: user?.role || '',
    roleMode,
    conversationState: {
      lastScreenPath: row?.path || '',
      ...(row?.conversationState && typeof row.conversationState === 'object' ? row.conversationState : {}),
    },
    originalMessage: row?.message || '',
  });
  const publicType = COMPOSER_PUBLIC_TYPE_OVERRIDES[row?.id] || canonicalIntent.questionType;
  return {
    publicType,
    minimumConfidence: COMPOSER_PUBLIC_TYPE_OVERRIDES[row?.id]
      || ['PRODUCT_OVERVIEW_HELP', 'ROLE_EXPLANATION_HELP'].includes(publicType)
      ? Number(row?.minConfidence || 0)
      : Number(canonicalIntent?.confidence || 0),
  };
}

function gradeCase(row, response, expectation) {
  const safeActions = Array.isArray(response?.quickActions)
    && response.quickActions.length > 0
    && response.quickActions.every((action) => SAFE_ACTION_KINDS.has(String(action?.actionKind || '')));
  const requiresActionLead = ACTION_LED_PUBLIC_TYPES.has(String(expectation?.publicType || ''));
  const checks = {
    questionType: String(response?.questionType || '') === String(expectation?.publicType || ''),
    confidence: Number(response?.intentConfidence || 0) >= Number(expectation?.minimumConfidence || 0),
    reply: Boolean(String(response?.reply || '').trim()),
    bounded: String(response?.reply || '').length <= 760,
    qualityHints: Boolean(response?.qualityHints),
    quickActions: safeActions,
    firstActionKind: safeActions,
    actionLed: !requiresActionLead
      || /(?:^|[.!?]\s+)(Şimdi:|Şimdi yap:|Önce:|İlk kontrol:|İlk bakılacak yer:|Sıradaki doğru işlem:)/i.test(String(response?.reply || ''))
      || Boolean(String(response?.bestNextAction || '').trim()),
  };
  const passed = Object.values(checks).filter(Boolean).length;
  const total = Object.keys(checks).length;
  const score = total ? Number((passed / total).toFixed(3)) : 0;
  return { checks, passed, total, score };
}

export function scoreGoldenQuestionPack() {
  const cases = buildGoldenQuestionPack();
  const results = cases.map((row) => {
    const user = makeUser(String(row?.role || 'ROOM'));
    const screenContext = row?.screenContext || { path: row?.path || '', label: row?.path || '' };
    const screenDefinition = getScreenDefinitionForUser(user, screenContext, 0);
    const response = buildChatHelpResponse({
      entityType: row?.entityType || 'screen',
      entityId: Number(row?.context?.id || row?.screenContext?.id || 0),
      user,
      message: row?.message || '',
      context: row?.context || null,
      entityLabel: row?.screenContext?.selectedLabel || row?.screenContext?.label || '',
      scope: { roleMode: ['DRIVER', 'PERSONEL', 'PARENT'].includes(String(row?.role || '')) ? 'SIMPLE' : 'OPERATIONS' },
      conversationState: {
        lastScreenPath: row?.path || '',
        ...(row?.conversationState && typeof row.conversationState === 'object' ? row.conversationState : {}),
      },
      screenContext,
      screenDefinition,
    });
    const expectation = canonicalExpectation(row, user, screenContext);
    const grade = gradeCase(row, response, expectation);
    return { id: row.id, role: row.role, expectedType: row.expectedType, canonicalExpectedType: expectation.publicType, response, ...grade };
  });

  const aggregate = (items) => {
    const count = items.length;
    const passed = items.reduce((sum, row) => sum + row.passed, 0);
    const total = items.reduce((sum, row) => sum + row.total, 0);
    return { count, score: total ? Number((passed / total).toFixed(3)) : 0 };
  };

  const byRole = Object.fromEntries([...new Set(results.map((row) => row.role))].map((role) => [role, aggregate(results.filter((row) => row.role === role))]));
  const byType = Object.fromEntries([...new Set(results.map((row) => row.expectedType))].map((type) => [type, aggregate(results.filter((row) => row.expectedType === type))]));
  return {
    ok: true,
    totalCases: results.length,
    overall: aggregate(results),
    byRole,
    byType,
    weakestCases: [...results].sort((a, b) => a.score - b.score).slice(0, 5).map((row) => ({ id: row.id, role: row.role, score: row.score, expectedType: row.expectedType })),
    results,
  };
}
