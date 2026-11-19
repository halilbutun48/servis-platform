import assert from "node:assert/strict";

import { extractTurkishSemanticFeatures } from "../src/ai/chat/turkishSemanticFeatures.js";
import { buildCanonicalSemanticContext } from "../src/ai/chat/canonicalSemanticContext.js";
import { composeSemanticEvidence } from "../src/ai/chat/semanticEvidenceComposer.js";
import { resolveCanonicalConversationRequest } from "../src/ai/chat/canonicalSemanticRequest.js";

const ROLE_CONTEXT = Object.freeze({
  ORGANIZATION: { role: "ORGANIZATION", organizationId: 1 },
  DRIVER: { role: "DRIVER", companyId: 1 },
  PERSONEL: { role: "PERSONEL", companyId: 1 },
});

function observe({ role, text, activeTask = null }) {
  const user = { id: 880001, sessionVersion: 1, ...ROLE_CONTEXT[role] };
  const screenContext = {
    path: `/${role.toLowerCase()}/operations`,
    label: "Geliştirme yüzeyi",
    role,
    uiHints: { foregroundSurface: { key: `${role.toLowerCase()}-operations`, kind: "SURFACE" } },
  };
  const conversationState = activeTask
    ? {
      recentMessages: [{ role: "user", content: "Önceki açıklamayı sürdürelim." }],
      activeGuidedTask: {
        taskId: "lang-01-structural-task",
        workflowIntent: activeTask,
        taskState: "ACTIVE",
        semanticPlan: { workflowIntent: activeTask, requestedDomains: ["SHIFTS"] },
      },
    }
    : { recentMessages: [], activeGuidedTask: null };
  const features = extractTurkishSemanticFeatures({ text });
  const context = buildCanonicalSemanticContext({ message: text, user, screenContext, conversationState });
  const evidence = composeSemanticEvidence({ features, context, conversationState, screenContext });
  const canonical = resolveCanonicalConversationRequest({
    message: text,
    user,
    screenContext,
    conversationState,
    env: { ...process.env, SEFER_ABI_SEMANTIC_AUTHORITY_MODE: "NEW" },
  });
  const action = canonical?.request?.semanticAction || {};
  const typed = canonical?.request?.typedEvidence || {};
  return {
    evidence: {
      requestMode: typed.requestMode?.value ?? null,
      requestModeProvenance: typed.requestMode?.provenance || [],
    },
    canonical: {
      action: action.actionClass ?? null,
      scope: canonical?.request?.semanticScope?.class ?? null,
      resolution: action.resolutionStatus ?? null,
    },
  };
}

const cases = [
  {
    id: "SYN-NAV-02",
    role: "ORGANIZATION",
    text: "Sözleşmeler sayfasını bul.",
    expectedMode: "NAVIGATE",
    expectedAction: "NAVIGATE",
  },
  {
    id: "SYN-VIEW-01",
    role: "DRIVER",
    text: "Bugünkü vardiyaları gösterir misin?",
    expectedMode: "VIEW",
    expectedAction: "VIEW",
  },
  {
    id: "SYN-CONTINUE-02",
    role: "PERSONEL",
    text: "Kaldığımız yerden sürdürelim.",
    expectedMode: "CONTINUE",
    expectedAction: "CONTINUE",
    activeTask: "CREATE_SHIFT",
  },
];

const rows = cases.map((item) => {
  const actual = observe(item);
  return {
    id: item.id,
    expectedMode: item.expectedMode,
    expectedAction: item.expectedAction,
    actual,
    pass: actual.evidence.requestMode === item.expectedMode
      && actual.canonical.action === item.expectedAction,
  };
});

for (const row of rows) assert.equal(row.pass, true, `${row.id} structural language projection`);

assert.equal(rows.length, 3);
assert.equal(rows.filter((row) => row.pass).length, 3);
assert.ok(rows.every((row) => row.actual.evidence.requestModeProvenance.length > 0));

console.log(JSON.stringify({
  checkId: "M18-LANG-01-STRUCTURAL-01",
  corpusKind: "SYNTHETIC_DEVELOPMENT_ONLY",
  holdout: false,
  total: rows.length,
  pass: rows.filter((row) => row.pass).length,
  fail: rows.filter((row) => !row.pass).length,
  rows,
}, null, 2));
