import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { resolveCanonicalConversationRequest } from '../src/ai/chat/canonicalSemanticRequest.js';

const repoRoot = process.cwd();
const checker = 'backend/scripts/m18_run_e_e01_scope_precedence_regression_01_check.js';

function canonical(message, overrides = {}) {
  const user = overrides.user || { role: 'COMPANY', companyId: 1 };
  return resolveCanonicalConversationRequest({
    message,
    user,
    selectedEntity: null,
    conversationState: overrides.conversationState || null,
    screenContext: overrides.screenContext || { path: '/company/operations', label: 'Operasyonlar', role: user.role },
    interpreterMode: 'DETERMINISTIC',
    env: { ...process.env, SEFER_ABI_SEMANTIC_AUTHORITY_MODE: 'NEW' },
  });
}

function runE01WithoutAmbientAuthorityOverride() {
  const env = { ...process.env };
  delete env.SEFER_ABI_SEMANTIC_AUTHORITY_MODE;
  delete env.SEMANTIC_AUTHORITY_MODE;
  delete env.M18_SEMANTIC_AUTHORITY_MODE;
  return spawnSync(process.execPath, [checker], {
    cwd: repoRoot,
    env,
    encoding: 'utf8',
  });
}

const e01Run = runE01WithoutAmbientAuthorityOverride();
assert.equal(e01Run.status, 0, e01Run.stderr || e01Run.stdout || 'E01 checker did not pass');
assert.match(e01Run.stdout, /"status":\s*"PASS"/);

const ambiguous = canonical('Bu kayıtlar arasında hangisi?');
assert.equal(ambiguous.request.semanticScope.class, 'PRODUCT_AMBIGUOUS');
assert.equal(ambiguous.request.semanticAction.resolutionStatus, 'UNRESOLVED');

const unresolved = canonical('Bu seçili kayıt hakkında hangisi doğru?');
assert.equal(unresolved.request.semanticAction.resolutionStatus, 'UNRESOLVED');

const genuineOos = canonical('Akşam için film önerir misin?');
assert.equal(genuineOos.request.semanticScope.class, 'OFF_TOPIC_GENUINE');

const explicitProduct = canonical('Sefer kayıtlarını incele.');
assert.equal(explicitProduct.request.semanticScope.class, 'PRODUCT_EXPLICIT');

const contextual = canonical('Buradan ilerlemeye devam edelim.', {
  conversationState: {
    activeGuidedTask: { taskId: 'active-guidance', semanticPlan: { workflowIntent: 'CREATE_SHIFT' } },
    lastSettledResult: { requestId: 'settled', continuationDepth: 1 },
  },
});
assert.equal(contextual.request.semanticScope.class, 'PRODUCT_CONTEXTUAL');

const pureNavigation = canonical('Sözleşme ekranına geçelim.');
assert.equal(pureNavigation.request.semanticAction.actionClass, 'NAVIGATE');

const mixedNavigation = canonical('Taşımacılık ekranına geçip başlangıcı anlat.');
assert.equal(mixedNavigation.request.semanticAction.actionClass, 'NAVIGATE');

console.log(JSON.stringify({
  status: 'PASS',
  controls: 7,
  ambientAuthorityOverrideRequired: true,
  semanticAuthorityMode: 'NEW',
}, null, 2));
