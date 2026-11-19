import assert from "node:assert/strict";
import { extractTurkishSemanticFeatures } from "../src/ai/chat/turkishSemanticFeatures.js";
import { composeSemanticEvidence } from "../src/ai/chat/semanticEvidenceComposer.js";
import { buildCanonicalSemanticContext } from "../src/ai/chat/canonicalSemanticContext.js";
import { resolveCanonicalConversationRequest } from "../src/ai/chat/canonicalSemanticRequest.js";

const user = { id: 1, role: "ROOM", roomId: 1 };
const screenContext = { path: "/room/shifts", label: "ROOM ekranı", role: "ROOM" };
const authorityEnv = { ...process.env, SEFER_ABI_SEMANTIC_AUTHORITY_MODE: "NEW" };

function inspect(message, conversationState = {}, customScreenContext = screenContext) {
  const context = buildCanonicalSemanticContext({
    message,
    user,
    screenContext: customScreenContext,
    conversationState,
  });
  const evidence = composeSemanticEvidence({
    features: extractTurkishSemanticFeatures({ text: message }),
    context,
    conversationState,
    screenContext: customScreenContext,
  });
  const canonical = resolveCanonicalConversationRequest({
    message,
    user,
    screenContext: customScreenContext,
    conversationState,
    env: authorityEnv,
  });
  return { context, evidence, canonical };
}

const noReferentCases = [
  "Şu kaydı anlat.",
  "Bu kaydı anlat.",
  "Onu açıklar mısın?",
  "Bunu göster.",
];
for (const message of noReferentCases) {
  const { evidence, canonical } = inspect(message);
  assert.notEqual(evidence.reference.value, "UNIQUE", `${message}: lexical deictic cannot establish a unique referent`);
  assert.notEqual(canonical.request.semanticAction.resolutionStatus, "RESOLVED", `${message}: no referent must remain unresolved`);
  assert.ok(["UNRESOLVED", "PRODUCT_AMBIGUOUS"].includes(canonical.request.semanticScope.class), `${message}: no referent must require clarification`);
}

const valid = inspect("Şu kaydı anlat.", {
  uniqueDiscourseReferent: { type: "SHIFT", id: 101, validated: true },
});
assert.equal(valid.evidence.reference.value, "UNIQUE", "validated discourse referent remains unique");
assert.equal(valid.canonical.request.semanticAction.resolutionStatus, "RESOLVED", "validated discourse referent resolves");

const stale = inspect("Şu kaydı anlat.", {
  uniqueDiscourseReferent: { type: "SHIFT", id: 101, validated: true, stale: true },
});
assert.notEqual(stale.evidence.reference.value, "UNIQUE", "stale discourse referent cannot resolve");
assert.notEqual(stale.canonical.request.semanticAction.resolutionStatus, "RESOLVED", "stale discourse referent requires clarification");

const surfaceOnly = inspect("Şu kaydı anlat.", {}, {
  path: "/room/shifts",
  label: "Seferler",
  role: "ROOM",
  uiHints: { foregroundSurface: { key: "ROOM_SHIFTS", kind: "SURFACE" } },
});
assert.notEqual(surfaceOnly.evidence.reference.value, "UNIQUE", "surface context cannot manufacture a record referent");
assert.notEqual(surfaceOnly.canonical.request.semanticAction.resolutionStatus, "RESOLVED", "surface-only context requires clarification");

const surfaceGuidance = inspect("Bu ekranda ilk olarak hangi göstergeleri tanımalıyım?");
assert.equal(surfaceGuidance.evidence.object.value, "SURFACE", "surface guidance keeps its surface semantic object");
assert.equal(surfaceGuidance.evidence.quality.roleHelpCandidate, true, "surface guidance remains role help without a record referent");
assert.equal(surfaceGuidance.canonical.request.semanticAction.resolutionStatus, "RESOLVED", "surface guidance remains resolved role help");

console.log(JSON.stringify({
  status: "PASS",
  noReferentCaseCount: noReferentCases.length,
  validReferentCaseCount: 1,
  staleReferentCaseCount: 1,
  surfaceOnlyCaseCount: 1,
}, null, 2));
