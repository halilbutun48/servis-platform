import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { extractTurkishSemanticFeatures } from "../src/ai/chat/turkishSemanticFeatures.js";
import { composeSemanticEvidence } from "../src/ai/chat/semanticEvidenceComposer.js";

function run(text, context = {}) {
  return composeSemanticEvidence({
    features: extractTurkishSemanticFeatures({ text }),
    context: {
      role: "COMPANY",
      currentDomain: "OPERATIONS",
      currentSurface: { path: "/company/operations", label: "Operasyon Paneli" },
      evidence: { product: true, object: [], action: [], relation: false },
      referenceState: { selectedEntity: null, currentTarget: null, uniqueReferent: null },
      freshness: { currentSurface: true, activeTask: false, target: false },
      ...context,
    },
    conversationState: { recentMessages: [], activeGuidedTask: null },
    screenContext: { path: "/company/operations", label: "Operasyon Paneli", role: "COMPANY" },
  });
}

const composerSource = await readFile(new URL("../src/ai/chat/semanticEvidenceComposer.js", import.meta.url), "utf8");
const forbiddenIoPatterns = [
  /node:(?:fs|http|https|net|child_process)/u,
  /\b(?:fetch|XMLHttpRequest|writeFile|appendFile|unlink|rm|exec|spawn)\s*\(/u,
];
const pureModuleForbiddenIoReferences = forbiddenIoPatterns.filter((pattern) => pattern.test(composerSource)).length;
assert.equal(pureModuleForbiddenIoReferences, 0, "pure composer must not reference write/network APIs");
const originalFetch = globalThis.fetch;
let observedNetworkCalls = 0;
globalThis.fetch = () => {
  observedNetworkCalls += 1;
  throw new Error("network call is forbidden in pure evidence composition");
};

const cases = [
  ["SHIFT_VIEW", "Vardiya kayıtlarını görüntüle.", "SHIFT", "VIEW"],
  ["AGREEMENT_EXPLANATION", "Sözleşme kaydının kapsamını açıkla.", "AGREEMENT", "EXPLAIN"],
  ["OFFER_NAVIGATE", "Teklife git.", "OFFER", "NAVIGATE"],
  ["ROUTE_LIMIT", "Rota sınırı nerede?", "ROUTE", null],
  ["RECORD_VIEW", "Kayıtları görüntüle.", "RECORD", "VIEW"],
  ["SURFACE_VIEW", "Operasyon panelini göster.", "SURFACE", "VIEW"],
  ["ENTITY_EXPLANATION", "Bu vardiyanın durumunu açıkla.", "SHIFT", "EXPLAIN"],
  ["FINANCIAL_LIMIT", "Maaş tarihini açıkla.", "FINANCIAL", "EXPLAIN"],
  ["DATE_TIME_LIMIT", "Bugün hangi tarihteyiz?", "NONE", "EXPLAIN"],
  ["AMBIGUOUS_REFERENCE", "Şunu anlat.", "NONE", "EXPLAIN"],
  ["GENUINE_OOS", "2+2 kaç eder?", "NONE", null],
  ["UNAUTHORIZED_ACTION", "Yeni vardiya oluşturmak istiyorum.", "SHIFT", null],
  ["INCIDENTAL_ROLE_WORDING", "Bu role uygun muyum?", "NONE", "EXPLAIN"],
];

const negative = [];
try {
  for (const [id, text, object, mode] of cases) {
    const result = run(text, id === "AMBIGUOUS_REFERENCE" ? { referenceState: { selectedEntity: null, currentTarget: null, uniqueReferent: null } } : {});
    assert.equal(result.quality.roleHelpCandidate, false, `${id} role-help veto`);
    assert.equal(result.object.value, object, `${id} object`);
    if (mode) assert.equal(result.requestMode.value, mode, `${id} mode`);
    // The current V3 evidence contract represents an explicit deictic with
    // no resolved referent as UNRESOLVED.  AMBIGUOUS is a context-layer
    // status, not a raw composer reference value.
    if (id === "AMBIGUOUS_REFERENCE") assert.equal(result.reference.value, "UNRESOLVED");
    if (id === "UNAUTHORIZED_ACTION") assert.notEqual(result.quality.authorizationEffect, "ALLOW");
    negative.push({ id, object: result.object.value, mode: result.requestMode.value });
  }
} finally {
  globalThis.fetch = originalFetch;
}

const limited = run("Hangi işleri yapmamalıyım?");
assert.equal(limited.roleAspect.value, "LIMITATION");
assert.equal(limited.polarity.value, "NEGATIVE");
assert.equal(limited.quality.roleHelpCandidate, true);

assert.ok(run("Vardiya kayıtlarını görüntüle.").contradictions.some((item) => item.value === "CONCRETE_OBJECT_OVERRIDES_BROAD_ROLE_ASPECT"));
assert.ok(run("Operasyon panelini göster.").contradictions.some((item) => item.value === "CONCRETE_REQUEST_MODE_OVERRIDES_BROAD_ROLE_ASPECT"));

console.log("status=PASS");
console.log(`negativeCases=${negative.length}`);
console.log(`vetoFamilies=${new Set(cases.map((item) => item[0].replace(/_.*/u, ""))).size}`);
console.log(`pureModuleForbiddenIoReferences=${pureModuleForbiddenIoReferences}`);
console.log(`observedNetworkCalls=${observedNetworkCalls}`);
