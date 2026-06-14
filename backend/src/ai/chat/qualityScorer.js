import { buildChatHelpResponse } from './helpComposer.js';
import { buildGoldenQuestionPack } from './goldenQuestionPack.js';
import { getScreenDefinitionForUser } from '../jobGuide/screenCatalog.js';

function makeUser(role) {
  if (role === 'SCHOOL') return { role: 'COMPANY', companyKind: 'SCHOOL' };
  if (role === 'ORGANIZATION') return { role: 'COMPANY', companyKind: 'ORGANIZATION' };
  return { role };
}

function gradeCase(row, response) {
  const checks = {
    questionType: String(response?.questionType || '') === String(row?.expectedType || ''),
    confidence: Number(response?.intentConfidence || 0) >= Number(row?.minConfidence || 0),
    reply: Boolean(String(response?.reply || '').trim()),
    bounded: String(response?.reply || '').length <= 760,
    qualityHints: Boolean(response?.qualityHints),
    quickActions: Array.isArray(response?.quickActions) && response.quickActions.length > 0,
    firstActionKind: String(response?.quickActions?.[0]?.actionKind || '') === String(row?.expectedFirstActionKind || ''),
    actionLed: !row?.expectedActionLed ? true : /^Şimdi:|^Şimdi yap:|^Önce:/i.test(String(response?.reply || '')),
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
    const grade = gradeCase(row, response);
    return { id: row.id, role: row.role, expectedType: row.expectedType, response, ...grade };
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
