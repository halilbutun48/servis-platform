import { listScreensForUser } from '../src/ai/jobGuide/screenCatalog.js';
import { resolveCanonicalConversationRequest } from '../src/ai/chat/canonicalSemanticRequest.js';

const roles = ['COMPANY', 'ROOM', 'SCHOOL', 'ORGANIZATION', 'DRIVER', 'PERSONEL', 'PARENT', 'SUPER_ADMIN'];
const users = {
  COMPANY: { role: 'COMPANY', companyKind: 'COMPANY', companyId: 1 },
  ROOM: { role: 'ROOM', roomId: 1 },
  SCHOOL: { role: 'COMPANY', companyKind: 'SCHOOL', companyId: 1 },
  ORGANIZATION: { role: 'COMPANY', companyKind: 'ORGANIZATION', companyId: 1 },
  DRIVER: { role: 'DRIVER', companyId: 1 },
  PERSONEL: { role: 'PERSONEL', companyId: 1 },
  PARENT: { role: 'PARENT' },
  SUPER_ADMIN: { role: 'SUPER_ADMIN' },
};
const runtimeRole = (role) => ['SCHOOL', 'ORGANIZATION'].includes(role) ? 'COMPANY' : role;
const summarize = (result) => ({
  semanticScope: result.request?.semanticScope?.class ?? null,
  requestMode: result.request?.typedEvidence?.requestMode?.value ?? null,
  semanticAction: result.request?.semanticAction?.actionClass ?? null,
  action: result.request?.semanticAction?.actionClass ?? null,
  object: result.request?.semanticAction?.objectClass ?? null,
  reference: result.request?.typedEvidence?.reference?.value ?? result.request?.semanticAction?.referenceClass ?? null,
  resolutionStatus: result.request?.semanticAction?.resolutionStatus ?? null,
  task: result.request?.task ?? result.request?.taskType ?? null,
  operation: result.request?.operation ?? null,
  operationReason: result.request?.operationReason ?? null,
});

const templates = [
  (label) => `${label} ekranının temel akışını anlaşılır biçimde özetler misin?`,
  (label) => `${label} bölümüne geçip ilk kullanımı gösterir misin?`,
  (label) => `${label} bölümündeki güncel durumu incelemek istiyorum.`,
  (label) => `${label} içinde bu ayki durumu değerlendirebilir misin?`,
  (label) => `${label} ekranındaki bu alanı nasıl kullanırım?`,
  (label) => `${label} üzerinde ilk adımı tamamladım.`,
  (label) => `Şimdi ${label} üzerinde sıradaki adıma geçelim.`,
  (label) => `Bir kaydın durumunu değiştirmek istiyorum, ama hangi kaydı kastettiğimi belirleyemiyorum.`,
  (label) => `Bu akşam için evde kolay bir yemek tarifi önerir misin?`,
];

for (const role of roles) {
  const user = users[role];
  const screen = listScreensForUser(user)[0];
  const screenContext = { ...screen, role: runtimeRole(role) };
  const rows = [];
  for (const template of templates) {
    const message = template(screen.label);
    const result = resolveCanonicalConversationRequest({
      message,
      user,
      screenContext,
      env: { ...process.env, SEFER_ABI_SEMANTIC_AUTHORITY_MODE: 'NEW' },
    });
    rows.push({ message, ...summarize(result) });
  }
  console.log(JSON.stringify({ role, screen, rows }, null, 2));
}
