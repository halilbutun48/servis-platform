import assert from "node:assert/strict";
import { extractTurkishSemanticFeatures } from "../src/ai/chat/turkishSemanticFeatures.js";
import { composeSemanticEvidence } from "../src/ai/chat/semanticEvidenceComposer.js";
import { resolveCanonicalConversationRequest } from "../src/ai/chat/canonicalSemanticRequest.js";

const COMPANY_USER = { id: 910001, role: "COMPANY", companyId: 1 };
const COMPANY_SCREEN = { path: "/company/operations", label: "Operasyon Paneli", role: "COMPANY" };
const NO_SCREEN = null;

function evidence(text, screenContext = COMPANY_SCREEN) {
  return composeSemanticEvidence({
    features: extractTurkishSemanticFeatures({ text }),
    context: {
      role: "COMPANY",
      currentDomain: "OPERATIONS",
      currentSurface: screenContext ? { path: screenContext.path } : null,
      evidence: { product: true },
    },
    conversationState: {},
    screenContext,
  });
}

function canonical(text, screenContext = COMPANY_SCREEN) {
  return resolveCanonicalConversationRequest({
    message: text,
    user: COMPANY_USER,
    conversationState: {},
    screenContext,
    env: { ...process.env, SEFER_ABI_SEMANTIC_AUTHORITY_MODE: "NEW" },
  });
}

function observed(result) {
  return {
    taskType: result.canonicalShape?.taskType || null,
    operation: result.request?.operation || null,
    capability: result.request?.capability || null,
    action: result.request?.semanticAction?.actionClass || null,
    object: result.request?.semanticAction?.objectClass || null,
    scope: result.request?.semanticScope?.class || null,
    resolution: result.request?.semanticAction?.resolutionStatus || null,
    workflow: result.request?.workflowRef?.workflowIntent || null,
  };
}

function expect(label, actual, expected, failures) {
  try {
    assert.deepEqual(actual, expected, label);
  } catch (error) {
    failures.push({ label, message: error.message, actual, expected });
  }
}

function expectPredicate(label, value, failures) {
  if (!value) failures.push({ label, message: `${label}: predicate was false` });
}

const processBoundaryText = "Firma panelinde vardiya kapasitesinin hangi sorumluluk sınırları içinde yönetildiğini açıklar mısın?";
const cases = [
  ["A-process-boundary-with-surface-noun", processBoundaryText, COMPANY_SCREEN, {
    operation: "LOOK_UP_FIELD", capability: "FIELD_LOOKUP", action: "EXPLAIN", object: "SHIFT", scope: "PRODUCT_EXPLICIT",
  }],
  ["B-process-boundary-with-live-surface", processBoundaryText, COMPANY_SCREEN, {
    operation: "LOOK_UP_FIELD", capability: "FIELD_LOOKUP", action: "EXPLAIN", object: "SHIFT", scope: "PRODUCT_EXPLICIT",
  }],
  ["C-process-boundary-without-live-surface", processBoundaryText, NO_SCREEN, {
    operation: "LOOK_UP_FIELD", capability: "FIELD_LOOKUP", action: "EXPLAIN", object: "SHIFT", scope: "PRODUCT_EXPLICIT",
  }],
  ["D-explicit-current-screen-purpose", "Bu panelin amacı nedir, açıklar mısın?", COMPANY_SCREEN, {
    operation: "EXPLAIN_CURRENT_SURFACE", capability: "SCREEN_CONTEXT", action: "EXPLAIN", object: "SURFACE",
  }],
  ["E-deictic-current-screen", "Burada hangi panel açık?", COMPANY_SCREEN, {
    operation: "NAVIGATE_AUTHORIZED_SURFACE", capability: "OPEN_SURFACE", action: "NAVIGATE", object: "SURFACE",
  }],
  ["F-explicit-surface-navigation", "Teklif alanına beni götürür müsün?", COMPANY_SCREEN, {
    operation: "NAVIGATE_AUTHORIZED_SURFACE", action: "NAVIGATE",
  }],
  ["G-direct-surface-navigation", "Anlaşma bölümüne git.", COMPANY_SCREEN, {
    operation: "NAVIGATE_AUTHORIZED_SURFACE", action: "NAVIGATE",
  }],
  ["H-role-process-guidance", "Şirket rolünde hangi vardiya sorumluluklarını yürütürüm?", COMPANY_SCREEN, {
    operation: "GENERAL_INFORMATION", capability: "GENERAL_INFORMATION", action: "EXPLAIN",
  }],
  ["I-surface-noun-only", "Operasyon paneli", COMPANY_SCREEN, { capability: "SCREEN_CONTEXT", action: "EXPLAIN", object: "SURFACE", operation: "EXPLAIN_CURRENT_SURFACE", resolution: "RESOLVED" }],
  ["J-live-surface-only", "Merhaba", COMPANY_SCREEN, { capability: "GENERAL_INFORMATION", action: "NONE", resolution: "UNRESOLVED" }],
  ["K-ambiguous-deictic", "Bunu açıklar mısın?", COMPANY_SCREEN, { resolution: "UNRESOLVED" }],
  ["L-genuine-oos", "Doğum günü davetiyesi tasarlamama yardım eder misin?", COMPANY_SCREEN, {
    operation: "GENERAL_INFORMATION", capability: "GENERAL_INFORMATION", action: "EXPLAIN", object: "SURFACE", scope: "PRODUCT_EXPLICIT",
  }],
];

const failures = [];
const observations = {};
for (const [label, text, screenContext, expected] of cases) {
  const result = canonical(text, screenContext);
  const actual = observed(result);
  observations[label] = actual;
  for (const [field, value] of Object.entries(expected)) {
    expect(`${label}.${field}`, actual[field], value, failures);
  }
}

const typed = evidence(processBoundaryText, COMPANY_SCREEN);
expect("typedEvidence.requestMode", typed.requestMode?.value, "EXPLAIN", failures);
expect("typedEvidence.roleAspect", typed.roleAspect?.value, "BOUNDARY", failures);
expectPredicate("typedEvidence.productHelp", typed.productHelp?.value === "NONE", failures);
expect("typedEvidence.authorizationEffect", typed.quality?.authorizationEffect, "NONE", failures);

const processOnly = observed(canonical("Yönetim sürecini yönetiyorum.", COMPANY_SCREEN));
expectPredicate("management/process predicate alone does not create navigation", processOnly.action !== "NAVIGATE" && processOnly.operation !== "NAVIGATE_AUTHORIZED_SURFACE", failures);

expectPredicate(
  "concrete field evidence remains authoritative with a live surface",
  observations["B-process-boundary-with-live-surface"].operation === "LOOK_UP_FIELD"
    && observations["B-process-boundary-with-live-surface"].capability === "FIELD_LOOKUP",
  failures,
);
expectPredicate(
  "concrete field evidence remains authoritative without a live surface",
  observations["C-process-boundary-without-live-surface"].operation === "LOOK_UP_FIELD"
    && observations["C-process-boundary-without-live-surface"].capability === "FIELD_LOOKUP",
  failures,
);

// Historical owner replay is intentionally limited to RO-001 itself. It is a
// regression check for the bounded seam; no Run O holdout content is loaded.
const historicalRo001 = canonical("Şirket panelinde vardiya bütçesinin hangi sınırlar içinde yönetildiğini anlatır mısın?", COMPANY_SCREEN);
expect("RO-001 current.operation", historicalRo001.request?.operation, "LOOK_UP_FIELD", failures);
expect("RO-001 current.capability", historicalRo001.request?.capability, "FIELD_LOOKUP", failures);
expect("RO-001 current.action", historicalRo001.request?.semanticAction?.actionClass, "EXPLAIN", failures);
expect("RO-001 current.object", historicalRo001.request?.semanticAction?.objectClass, "SHIFT", failures);

if (failures.length) {
  console.error(JSON.stringify({ status: "RED", failureCount: failures.length, failures, observations }, null, 2));
  process.exitCode = 1;
} else {
  console.log(JSON.stringify({ status: "PASS", caseCount: cases.length, observations }, null, 2));
}
