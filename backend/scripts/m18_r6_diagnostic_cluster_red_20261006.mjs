import { normalizeCopilotShortPrompt } from "../src/ai/schemas.js";
import { resolveCanonicalConversationRequest } from "../src/ai/chat/canonicalSemanticRequest.js";

process.env.SEFER_ABI_SEMANTIC_AUTHORITY_MODE = "NEW";

const checks = [];
const record = (id, pass, actual) => checks.push({ id, pass: Boolean(pass), actual });

const namedSurfaceRequest = "Gözetim Paneli ekranı ne işe yarıyor?";
const normalizedNamedSurface = normalizeCopilotShortPrompt(namedSurfaceRequest);
record("NAMED_SURFACE_TEXT_PRESERVED", normalizedNamedSurface === namedSurfaceRequest, normalizedNamedSurface);

const canonical = resolveCanonicalConversationRequest({
  message: "Bir dağ gölü için kısa bir şiir yazar mısın?",
  user: { role: "COMPANY", companyId: 1, roomId: null },
  screenContext: { path: "/company", label: "Planlama Merkezi", role: "COMPANY", id: 2101, selectedEntity: null },
  conversationState: null,
});
const request = canonical.request;
record("GENERAL_CREATIVE_IS_GENUINE_OOS_MODE", request?.typedEvidence?.requestMode?.value === "GENUINE_OOS", request?.typedEvidence?.requestMode || null);
record("GENERAL_CREATIVE_SCOPE_IS_OOS", request?.semanticScope?.class === "OFF_TOPIC_GENUINE", request?.semanticScope || null);
record("GENERAL_CREATIVE_ACTION_IS_NONE", request?.semanticAction?.actionClass === "NONE", request?.semanticAction || null);
record("GENERAL_CREATIVE_OPERATION_IS_GENERAL_INFORMATION", request?.operation === "GENERAL_INFORMATION", request?.operation);

const failures = checks.filter((check) => !check.pass);
console.log(JSON.stringify({
  checkId: "M18-R6-DIAGNOSTIC-CLUSTER-RED-20261006",
  total: checks.length,
  pass: checks.length - failures.length,
  fail: failures.length,
  checks,
}, null, 2));
if (failures.length) process.exitCode = 1;
