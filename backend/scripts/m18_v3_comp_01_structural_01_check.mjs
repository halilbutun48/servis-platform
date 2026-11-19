import { extractTurkishSemanticFeatures } from "../src/ai/chat/turkishSemanticFeatures.js";
import { composeSemanticEvidence } from "../src/ai/chat/semanticEvidenceComposer.js";
import { buildCanonicalSemanticContext } from "../src/ai/chat/canonicalSemanticContext.js";
import { resolveCanonicalConversationRequest } from "../src/ai/chat/canonicalSemanticRequest.js";

const roleUser = (role) => ({ id: 880001, role, companyId: role === "COMPANY" ? 1 : null, roomId: role === "ROOM" ? 1 : null, schoolId: role === "SCHOOL" ? 1 : null, organizationId: role === "ORGANIZATION" ? 1 : null, sessionVersion: 1 });
const screen = (role, variant = "operations") => ({ path: `/${role.toLowerCase()}/${variant}`, label: "Development surface", role, uiHints: { foregroundSurface: { key: `${role.toLowerCase()}-${variant}`, kind: "SURFACE" } } });
const conversation = (activeTask = null, stale = false) => activeTask
  ? { recentMessages: [{ role: "user", content: "Önceki açıklamayı sürdürelim." }], activeGuidedTask: { taskId: "synthetic-active-task", workflowIntent: activeTask, taskState: stale ? "STALE" : "ACTIVE", semanticPlan: { workflowIntent: activeTask, requestedDomains: ["SHIFTS"] } } }
  : { recentMessages: [], activeGuidedTask: null };

function observe(utterance, role = "COMPANY", options = {}) {
  const user = roleUser(role);
  const screenContext = screen(role, options.screenVariant || "operations");
  const conversationState = conversation(options.activeTask || null, Boolean(options.stale));
  const features = extractTurkishSemanticFeatures({ text: utterance });
  const context = buildCanonicalSemanticContext({ message: utterance, user, screenContext, conversationState });
  const evidence = composeSemanticEvidence({ features, context, conversationState, screenContext });
  const canonical = resolveCanonicalConversationRequest({
    message: utterance,
    user,
    screenContext,
    conversationState,
    env: { ...process.env, SEFER_ABI_SEMANTIC_AUTHORITY_MODE: "NEW" },
  });
  return { features, evidence, request: canonical.request, canonical };
}

const checks = [];
function check(id, pass, details) {
  checks.push({ id, pass: Boolean(pass), details });
}
function projection(observed) {
  return {
    scope: observed.request.semanticScope?.class || null,
    action: observed.request.semanticAction?.actionClass || null,
    object: observed.request.semanticAction?.objectClass || null,
    resolution: observed.request.semanticAction?.resolutionStatus || null,
    operation: observed.request.operation || null,
    continuation: observed.request.continuation?.mode || null,
    taskType: observed.canonical.canonicalShape?.taskType || null,
    termDefinition: observed.canonical.canonicalShape?.termDefinitionIntent || false,
    knowledgeKind: observed.canonical.canonicalShape?.screenKnowledgeKind || null,
  };
}

const update = observe("Vardiya saatini değiştir.", "COMPANY");
check("RED-UPDATE-EVIDENCE-MODE", update.evidence.requestMode?.value === "UPDATE", update.evidence.requestMode || null);
check("RED-UPDATE-PROJECTION", projection(update).action === "UPDATE", projection(update));
const updateContrast = observe("Anlaşma kaydını güncelle.", "COMPANY");
check("RED-UPDATE-CONTRAST", projection(updateContrast).action === "UPDATE", projection(updateContrast));

const continuation = observe("Önceki plan açıklamasına devam edelim.", "COMPANY", { activeTask: "CREATE_SHIFT" });
check("RED-CONTINUE-VALID-CONTEXT", projection(continuation).action === "CONTINUE" && projection(continuation).continuation === "CONTINUE", projection(continuation));
const noContinuation = observe("Önceki plan açıklamasına devam edelim.", "COMPANY");
check("NEG-CONTINUE-NO-CONTEXT", !["CONTINUE", "RESUME"].includes(projection(noContinuation).action), projection(noContinuation));

const weather = observe("İstanbul için hava tahmini nedir?", "COMPANY");
check("RED-OOS-POSITIVE-DOMAIN", projection(weather).scope === "OFF_TOPIC_GENUINE" && projection(weather).action === "NONE", projection(weather));
const creative = observe("Bir şiir yazar mısın?", "ROOM");
check("RED-OOS-CREATIVE", projection(creative).scope === "OFF_TOPIC_GENUINE" && projection(creative).action === "NONE", projection(creative));
const unknown = observe("Bunu nasıl yorumlamalıyım?", "SUPER_ADMIN");
check("RED-UNKNOWN-AMBIGUOUS", ["PRODUCT_AMBIGUOUS", "UNRESOLVED"].includes(projection(unknown).scope) && projection(unknown).action === "NONE" && projection(unknown).resolution !== "RESOLVED", projection(unknown));

const entity = observe("Sözleşme kelimesi ne demek?", "SCHOOL");
check("RED-ENTITY-DEFINITION", projection(entity).action === "EXPLAIN" && projection(entity).object === "AGREEMENT" && projection(entity).termDefinition === true && projection(entity).knowledgeKind === "TERM_DEFINITION", projection(entity));
const objectOnly = observe("Sözleşme", "SCHOOL");
check("NEG-OBJECT-ALONE-NO-OPERATION", !["CREATE", "UPDATE", "DELETE", "SEND", "VIEW", "NAVIGATE"].includes(projection(objectOnly).action), projection(objectOnly));
const concreteBoundary = observe("Bütçe tutarının üst sınırı nedir?", "SUPER_ADMIN");
check("RED-CONCRETE-OBJECT-VETO", concreteBoundary.canonical.canonicalShape?.roleHelpIntent !== true
  && projection(concreteBoundary).action === "EXPLAIN"
  && projection(concreteBoundary).object !== null, projection(concreteBoundary));

const surfaceA = observe("Vardiyaları göster.", "COMPANY", { screenVariant: "operations" });
const surfaceB = observe("Vardiyaları göster.", "COMPANY", { screenVariant: "home" });
check("NEG-CURRENT-SURFACE-PARITY", JSON.stringify([projection(surfaceA).action, projection(surfaceA).object]) === JSON.stringify([projection(surfaceB).action, projection(surfaceB).object]), { a: projection(surfaceA), b: projection(surfaceB) });
const staleExplicit = observe("Yeni vardiya oluştur.", "COMPANY", { activeTask: "EXPLAIN_CURRENT_TARGET", stale: true });
const freshExplicit = observe("Yeni vardiya oluştur.", "COMPANY");
check("NEG-EXPLICIT-INTENT-OVER-STALE", projection(staleExplicit).action === projection(freshExplicit).action && projection(freshExplicit).action === "CREATE", { stale: projection(staleExplicit), fresh: projection(freshExplicit) });

check("NEG-ROLE-ONLY", !["PRODUCT_EXPLICIT", "PRODUCT_CONTEXTUAL"].includes(projection(observe("Şirket operasyonları.", "COMPANY")).scope), projection(observe("Şirket operasyonları.", "COMPANY")));
check("NEG-SURFACE-NOUN-ONLY", !["PRODUCT_EXPLICIT", "PRODUCT_CONTEXTUAL"].includes(projection(observe("Bu ekran.", "ROOM")).scope), projection(observe("Bu ekran.", "ROOM")));
check("NEG-GENERIC-DEICTIC-EXPLANATION", projection(observe("Bunu anlat.", "COMPANY")).action === "NONE" && projection(observe("Bunu anlat.", "COMPANY")).resolution !== "RESOLVED", projection(observe("Bunu anlat.", "COMPANY")));
check("NEG-AMBIGUOUS-DEICTIC", projection(observe("Şunu göster.", "COMPANY")).resolution !== "RESOLVED", projection(observe("Şunu göster.", "COMPANY")));
check("NEG-WEAK-PRODUCT-TOKEN", projection(observe("Vardiya.", "COMPANY")).resolution !== "RESOLVED", projection(observe("Vardiya.", "COMPANY")));
check("NEG-GENUINE-OOS-PRESERVED", projection(observe("Yarın kıyıda rüzgar şiddetlenir mi?", "COMPANY")).scope === "OFF_TOPIC_GENUINE" && projection(observe("Yarın kıyıda rüzgar şiddetlenir mi?", "COMPANY")).action === "NONE", projection(observe("Yarın kıyıda rüzgar şiddetlenir mi?", "COMPANY")));
const unauthorizedMeaningA = observe("Anlaşma alanına gider misin?", "ROOM");
const unauthorizedMeaningB = observe("Anlaşma alanına gider misin?", "COMPANY");
check("NEG-AUTHORIZATION-SEPARATION", projection(unauthorizedMeaningA).action === "NAVIGATE" && projection(unauthorizedMeaningA).action === projection(unauthorizedMeaningB).action, { room: projection(unauthorizedMeaningA), company: projection(unauthorizedMeaningB) });
check("NEG-NO-FABRICATED-UI-TARGET", !Object.prototype.hasOwnProperty.call(unauthorizedMeaningA.request.semanticAction?.targetCandidate || {}, "targetKey"), unauthorizedMeaningA.request.semanticAction?.targetCandidate || null);
check("NEG-ROOM-POLICY-MEANING", projection(observe("Yeni vardiya oluştur.", "ROOM")).action === "CREATE" || projection(observe("Yeni vardiya oluştur.", "ROOM")).action === "NAVIGATE", projection(observe("Yeni vardiya oluştur.", "ROOM")));
check("NEG-NO-BUSINESS-WRITE", unauthorizedMeaningA.request.safety?.writeBoundary === "NO_BUSINESS_WRITE", unauthorizedMeaningA.request.safety || null);

const failures = checks.filter((item) => !item.pass);
console.log(JSON.stringify({
  checkId: "M18-V3-COMP-01-STRUCTURAL-01",
  corpusKind: "SYNTHETIC_DEVELOPMENT_ONLY",
  holdout: false,
  total: checks.length,
  pass: checks.length - failures.length,
  fail: failures.length,
  checks,
}, null, 2));
if (failures.length) process.exitCode = 1;
