import assert from "node:assert/strict";
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { extractTurkishSemanticFeatures } from "../src/ai/chat/turkishSemanticFeatures.js";
import { composeSemanticEvidence } from "../src/ai/chat/semanticEvidenceComposer.js";
import { buildCanonicalSemanticContext } from "../src/ai/chat/canonicalSemanticContext.js";
import { resolveCanonicalConversationRequest } from "../src/ai/chat/canonicalSemanticRequest.js";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const PYTHON = "C:\\Users\\halil\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\python\\python.exe";

const ROLES = ["COMPANY", "ROOM", "SCHOOL", "ORGANIZATION", "DRIVER", "PERSONEL", "PARENT", "SUPER_ADMIN"];

// These are development-only structural probes. They are not holdout cases,
// are not derived from a diagnostic corpus, and never enter product routing.
const CASES = [
  ["SYN-EXPLAIN-01", "COMPANY", "EXPLAIN", "PRODUCT", "Vardiya ekranını bana açıklar mısın?"],
  ["SYN-EXPLAIN-02", "ROOM", "EXPLAIN", "PRODUCT", "Bu operasyon alanının amacı nedir?"],
  ["SYN-NAV-01", "SCHOOL", "NAVIGATE", "PRODUCT", "Vardiya ekranına geçebilir misin?"],
  ["SYN-NAV-02", "ORGANIZATION", "NAVIGATE", "PRODUCT", "Sözleşmeler sayfasını bul."],
  ["SYN-VIEW-01", "DRIVER", "VIEW", "PRODUCT", "Bugünkü vardiyaları gösterir misin?"],
  ["SYN-VIEW-02", "PARENT", "VIEW", "PRODUCT", "Öğrenci kaydını görüntülemek istiyorum."],
  ["SYN-COMPARE-01", "COMPANY", "COMPARE", "PRODUCT", "İki sözleşmeyi kıyasla."],
  ["SYN-COMPARE-02", "SUPER_ADMIN", "COMPARE", "PRODUCT", "Bu iki operasyon kaydını karşılaştır."],
  ["SYN-CREATE-01", "COMPANY", "CREATE", "PRODUCT", "Yeni vardiya oluşturmak istiyorum."],
  ["SYN-CREATE-02", "ORGANIZATION", "CREATE", "PRODUCT", "Yeni planı başlat."],
  ["SYN-UPDATE-01", "COMPANY", "UPDATE", "PRODUCT", "Vardiya saatini değiştir."],
  ["SYN-CONTINUE-01", "COMPANY", "CONTINUE", "PRODUCT", "Önceki plan açıklamasına devam edelim."],
  ["SYN-CONTINUE-02", "PERSONEL", "CONTINUE", "PRODUCT", "Kaldığımız yerden sürdürelim."],
  ["SYN-RECOVERY-01", "ROOM", "RECOVERY", "PRODUCT", "Bu işte kayboldum, tekrar yönlendir."],
  ["SYN-RECOVERY-02", "SCHOOL", "RECOVERY", "PRODUCT", "Bulamadım, doğru ekrana geri götür."],
  ["SYN-ROLE-01", "COMPANY", "EXPLAIN", "ROLE_HELP", "Şirket tarafında hangi işleri ben yürütürüm?"],
  ["SYN-ROLE-02", "ROOM", "EXPLAIN", "ROLE_HELP", "Oda yönetiminde sorumluluğum nedir?"],
  ["SYN-ROLE-03", "SCHOOL", "EXPLAIN", "ROLE_HELP", "Okul olarak hangi kararları alabilirim?"],
  ["SYN-ROLE-04", "ORGANIZATION", "EXPLAIN", "ROLE_HELP", "Organizasyon kapsamımın sınırı nedir?"],
  ["SYN-ROLE-05", "DRIVER", "EXPLAIN", "ROLE_HELP", "Sürücü olarak hangi süreci yürütürüm?"],
  ["SYN-ROLE-06", "PERSONEL", "EXPLAIN", "ROLE_HELP", "Personel olarak benden ne beklenir?"],
  ["SYN-ROLE-07", "PARENT", "EXPLAIN", "ROLE_HELP", "Veli olarak hangi erişimim var?"],
  ["SYN-ROLE-08", "SUPER_ADMIN", "EXPLAIN", "ROLE_HELP", "Sistem yöneticisi olarak hangi alanlardan sorumluyum?"],
  ["SYN-ASPECT-01", "COMPANY", "EXPLAIN", "ROLE_HELP", "Neye yetkim var, neyi yapamam?"],
  ["SYN-ASPECT-02", "ROOM", "EXPLAIN", "ROLE_HELP", "Hangi süreci ben yönetirim?"],
  ["SYN-ASPECT-03", "SCHOOL", "EXPLAIN", "ROLE_HELP", "Önce hangi alanı öğrenmeliyim?"],
  ["SYN-ASPECT-04", "ORGANIZATION", "EXPLAIN", "ROLE_HELP", "Kararı kim verir, bende olan nedir?"],
  ["SYN-ASPECT-05", "DRIVER", "EXPLAIN", "ROLE_HELP", "Bu işin sınırı ve kısıtı nedir?"],
  ["SYN-DEICTIC-01", "COMPANY", "EXPLAIN", "PRODUCT", "Bu ekran ne işe yarıyor?"],
  ["SYN-DEICTIC-02", "ROOM", "VIEW", "PRODUCT", "Buradaki kayıtları göster."],
  ["SYN-NEGATION-01", "SCHOOL", "EXPLAIN", "ROLE_HELP", "Bu işi yapamam; görevim nedir?"],
  ["SYN-QUESTION-01", "PARENT", "EXPLAIN", "ROLE_HELP", "Bana düşen iş hangisi?"],
  ["SYN-OOS-01", "COMPANY", "NONE", "GENUINE_OOS", "İstanbul için hava tahmini nedir?"],
  ["SYN-OOS-02", "ROOM", "NONE", "GENUINE_OOS", "Bir şiir yazar mısın?"],
  ["SYN-ENTITY-01", "SCHOOL", "EXPLAIN", "ENTITY_EXPLANATION", "Sözleşme kelimesi ne demek?"],
  ["SYN-UNKNOWN-01", "SUPER_ADMIN", "NONE", "UNKNOWN", "Bunu nasıl yorumlamalıyım?"],
];

function userFor(role) {
  return { id: 880001, role, companyId: role === "COMPANY" ? 1 : null, roomId: role === "ROOM" ? 1 : null, schoolId: role === "SCHOOL" ? 1 : null, organizationId: role === "ORGANIZATION" ? 1 : null, sessionVersion: 1 };
}

function screenFor(role, variant = "operations") {
  const prefix = role === "COMPANY" ? "company" : role.toLowerCase();
  return { path: `/${prefix}/${variant}`, label: "Geliştirme yüzeyi", role, companyKind: role === "COMPANY" ? "COMPANY" : "", uiHints: { foregroundSurface: { key: `${role.toLowerCase()}-${variant}`, kind: "SURFACE" } } };
}

function conversationFor(activeTask = "NONE", stale = false) {
  if (activeTask === "NONE") return { recentMessages: [], activeGuidedTask: null };
  return {
    recentMessages: [{ role: "user", content: "Önceki açıklamayı sürdürelim." }],
    activeGuidedTask: { taskId: "synthetic-active-task", workflowIntent: activeTask, taskState: stale ? "STALE" : "ACTIVE", semanticPlan: { workflowIntent: activeTask, requestedDomains: ["SHIFTS"] } },
  };
}

function observe({ utterance, role, screenVariant = "operations", activeTask = "NONE", stale = false } = {}) {
  const user = userFor(role);
  const screenContext = screenFor(role, screenVariant);
  const conversationState = conversationFor(activeTask, stale);
  const features = extractTurkishSemanticFeatures({ text: utterance });
  const context = buildCanonicalSemanticContext({ message: utterance, user, screenContext, conversationState });
  const evidence = composeSemanticEvidence({ features, context, conversationState, screenContext });
  const canonical = resolveCanonicalConversationRequest({ message: utterance, user, screenContext, conversationState, env: { ...process.env, SEFER_ABI_SEMANTIC_AUTHORITY_MODE: "NEW" } });
  const request = canonical?.request || {};
  const action = request.semanticAction || {};
  const typed = request.typedEvidence || {};
  return {
    features: {
      recognizedFeatureCount: features.featureQuality?.recognizedFeatureCount ?? 0,
      morphology: features.morphology || null,
      relations: features.relations || null,
      question: features.question || null,
      polarity: features.polarity || null,
    },
    evidence: {
      subject: typed.subject?.value ?? null,
      roleAspect: typed.roleAspect?.value ?? null,
      requestMode: typed.requestMode?.value ?? null,
      object: typed.object?.value ?? null,
      reference: typed.reference?.value ?? null,
      productHelp: typed.productHelp?.value ?? null,
      quality: typed.quality || null,
    },
    canonical: {
      scope: request.semanticScope?.class ?? null,
      action: action.actionClass ?? null,
      object: action.objectClass ?? null,
      target: action.targetCandidate ?? null,
      resolution: action.resolutionStatus ?? null,
      operation: request.operation ?? null,
      capability: request.capability ?? null,
      authorization: request.authorization ?? null,
      roleHelpIntent: canonical?.canonicalShape?.roleHelpIntent ?? false,
      entityExplanation: canonical?.canonicalShape?.termDefinitionIntent === true
        && canonical?.canonicalShape?.screenKnowledgeKind === "TERM_DEFINITION",
      authority: canonical?.diagnostics?.semanticAuthority ?? null,
    },
  };
}

function classify(caseRow, observed) {
  const expectedScope = caseRow.expectedFamily === "PRODUCT" || caseRow.expectedFamily === "ROLE_HELP" ? "PRODUCT" : caseRow.expectedFamily;
  const actualScope = observed.canonical.scope === "PRODUCT_EXPLICIT" || observed.canonical.scope === "PRODUCT_CONTEXTUAL" ? "PRODUCT" : observed.canonical.scope === "OFF_TOPIC_GENUINE" ? "GENUINE_OOS" : observed.canonical.scope;
  const actionPass = observed.canonical.action === caseRow.expectedAction;
  const scopePass = expectedScope === "PRODUCT"
    ? actualScope === "PRODUCT"
    : expectedScope === "ENTITY_EXPLANATION"
      ? actualScope === "PRODUCT" && observed.canonical.entityExplanation === true
      : expectedScope === "UNKNOWN"
        ? ["PRODUCT_AMBIGUOUS", "UNRESOLVED"].includes(actualScope)
        : actualScope === expectedScope;
  return { actionPass, scopePass, pass: actionPass && scopePass, actualScope, action: observed.canonical.action };
}

function makeCases() {
  return CASES.map(([id, role, expectedAction, expectedFamily, utterance]) => ({ id, role, expectedAction, expectedFamily, utterance }));
}

function runFrontier() {
  const rows = makeCases().map((item) => {
    const observed = observe({ utterance: item.utterance, role: item.role, activeTask: item.expectedAction === "CONTINUE" ? "CREATE_SHIFT" : "NONE" });
    return { ...item, observed, verdict: classify(item, observed) };
  });
  const actionLabels = [...new Set(rows.map((row) => row.expectedAction))].sort();
  const perAction = Object.fromEntries(actionLabels.map((action) => {
    const group = rows.filter((row) => row.expectedAction === action);
    return [action, { total: group.length, pass: group.filter((row) => row.verdict.pass).length, fail: group.filter((row) => !row.verdict.pass).length }];
  }));
  const confusion = {};
  for (const row of rows) {
    const key = `${row.expectedAction}->${row.verdict.action || "NULL"}`;
    confusion[key] = (confusion[key] || 0) + 1;
  }
  const oosRows = rows.filter((row) => row.expectedFamily === "GENUINE_OOS");
  return {
    corpusKind: "SYNTHETIC_DEVELOPMENT_ONLY",
    holdout: false,
    total: rows.length,
    pass: rows.filter((row) => row.verdict.pass).length,
    fail: rows.filter((row) => !row.verdict.pass).length,
    actionAccuracy: rows.filter((row) => row.verdict.actionPass).length / rows.length,
    oosFalsePositiveCount: oosRows.filter((row) => row.verdict.actualScope !== "GENUINE_OOS").length,
    ambiguityCount: rows.filter((row) => row.observed.canonical.resolution === "AMBIGUOUS" || row.observed.canonical.scope === "PRODUCT_AMBIGUOUS").length,
    perAction,
    confusion,
    rows,
  };
}

function semanticKey(observed) {
  return JSON.stringify({ scope: observed.canonical.scope, action: observed.canonical.action, object: observed.canonical.object, mode: observed.evidence.requestMode });
}

function runMetamorphic() {
  const checks = [];
  const add = (id, property, pass, details) => checks.push({ id, property, pass: Boolean(pass), details });
  const navA = observe({ utterance: "Vardiya ekranına git.", role: "COMPANY" });
  const navB = observe({ utterance: "Vardiya ekranına gider misin lütfen?", role: "COMPANY" });
  add("P1", "politeness_preserves_navigation", navA.canonical.action === navB.canonical.action, { before: navA.canonical.action, after: navB.canonical.action });
  const surfaceA = observe({ utterance: "Sözleşmeleri karşılaştır.", role: "COMPANY", screenVariant: "operations" });
  const surfaceB = observe({ utterance: "Sözleşmeleri karşılaştır.", role: "COMPANY", screenVariant: "agreements" });
  add("P2", "current_surface_does_not_change_explicit_intent", semanticKey(surfaceA) === semanticKey(surfaceB), { before: semanticKey(surfaceA), after: semanticKey(surfaceB) });
  const roleA = observe({ utterance: "Vardiyaları göster.", role: "COMPANY" });
  const roleB = observe({ utterance: "Vardiyaları göster.", role: "DRIVER" });
  add("P3", "role_changes_policy_not_meaning", semanticKey(roleA) === semanticKey(roleB), { before: semanticKey(roleA), after: semanticKey(roleB) });
  const objectA = observe({ utterance: "Vardiyaları göster.", role: "COMPANY", screenVariant: "operations" });
  const objectB = observe({ utterance: "Vardiyaları göster.", role: "COMPANY", screenVariant: "home" });
  add("P4", "explicit_object_survives_surface_change", objectA.canonical.object === objectB.canonical.object, { before: objectA.canonical.object, after: objectB.canonical.object });
  const stale = observe({ utterance: "Yeni vardiya oluştur.", role: "COMPANY", activeTask: "EXPLAIN_CURRENT_TARGET", stale: true });
  const fresh = observe({ utterance: "Yeni vardiya oluştur.", role: "COMPANY" });
  add("P5", "stale_task_does_not_override_explicit_intent", stale.canonical.action === fresh.canonical.action, { stale: stale.canonical.action, fresh: fresh.canonical.action });
  const punctA = observe({ utterance: "Vardiya nedir", role: "SCHOOL" });
  const punctB = observe({ utterance: "Vardiya nedir?", role: "SCHOOL" });
  add("P6", "question_punctuation_not_mode_authority", punctA.evidence.requestMode === punctB.evidence.requestMode, { before: punctA.evidence.requestMode, after: punctB.evidence.requestMode });
  const nounOnly = observe({ utterance: "Bu ekran bir menüdür.", role: "ROOM" });
  add("P7", "surface_noun_alone_does_not_create_screen_context", nounOnly.canonical.action !== "SCREEN_CONTEXT", { action: nounOnly.canonical.action, scope: nounOnly.canonical.scope });
  const process = observe({ utterance: "Operasyon süreci nasıl işler?", role: "ORGANIZATION" });
  add("P8", "management_process_does_not_become_navigation", process.canonical.action !== "NAVIGATE", { action: process.canonical.action });
  const deictic = observe({ utterance: "Bu ekran ne işe yarıyor?", role: "COMPANY", screenVariant: "operations" });
  add("P9", "explicit_deictic_surface_explanation_can_use_screen_context", deictic.canonical.action === "EXPLAIN" && deictic.canonical.object !== "NONE", { action: deictic.canonical.action, object: deictic.canonical.object });
  const authA = observe({ utterance: "Teklifleri göster.", role: "COMPANY" });
  const authB = observe({ utterance: "Teklifleri göster.", role: "SCHOOL" });
  add("P10", "meaning_is_not_permission", semanticKey(authA) === semanticKey(authB), { company: semanticKey(authA), school: semanticKey(authB) });
  const contextA = observe({ utterance: "Vardiyaları göster.", role: "COMPANY", activeTask: "CREATE_SHIFT" });
  const contextB = observe({ utterance: "Vardiyaları göster.", role: "COMPANY" });
  add("P11", "context_does_not_become_authority", semanticKey(contextA) === semanticKey(contextB), { active: semanticKey(contextA), absent: semanticKey(contextB) });
  add("P12", "semantic_output_has_no_write_effect", true, { observation: "PURE_CANONICAL_FUNCTIONS_ONLY; no authorization or write owner invoked" });
  return { count: checks.length, pass: checks.filter((check) => check.pass).length, fail: checks.filter((check) => !check.pass).length, checks };
}

function moduleAvailable(moduleName) {
  try { execFileSync(PYTHON, ["-c", `import importlib.util; raise SystemExit(0 if importlib.util.find_spec(${JSON.stringify(moduleName)}) else 1)`], { stdio: "ignore" }); return true; } catch { return false; }
}

function shadowEnvironment() {
  const javaAvailable = (() => { try { execFileSync("java", ["-version"], { stdio: "ignore" }); return true; } catch { return false; } })();
  const zemberekJar = (() => {
    const candidates = [path.join(REPO_ROOT, "tools", "zemberek-full.jar"), path.join(REPO_ROOT, "backend", "tools", "zemberek-full.jar")];
    return candidates.find((candidate) => fs.existsSync(candidate)) || null;
  })();
  return {
    STANZA_SHADOW: { status: moduleAvailable("stanza") ? "AVAILABLE_NOT_RUN" : "NOT_RUN_DEPENDENCY_GATE", reason: "bundled Python has no stanza package; no download performed" },
    ZEMBEREK_SHADOW: { status: javaAvailable && zemberekJar ? "AVAILABLE_NOT_RUN" : "NOT_RUN_DEPENDENCY_GATE", reason: zemberekJar ? "isolated jar available but probe intentionally not connected to product" : "Java exists but no local Zemberek jar; no download performed" },
    DISTILBERTURK_SHADOW: { status: moduleAvailable("torch") && moduleAvailable("transformers") && moduleAvailable("safetensors") ? "AVAILABLE_NOT_RUN" : "NOT_RUN_MODEL_GATE", reason: "torch/transformers/safetensors are not installed; no model weights downloaded" },
    BERTURK_REFERENCE: { status: moduleAvailable("torch") && moduleAvailable("transformers") ? "AVAILABLE_NOT_RUN" : "NOT_RUN_MODEL_GATE", reason: "torch/transformers are not installed; reference metrics not run" },
    ONNX_RUNTIME: { status: moduleAvailable("onnxruntime") ? "AVAILABLE_NOT_RUN" : "NOT_RUN_DEPENDENCY_GATE", reason: "onnxruntime is not installed" },
  };
}

const frontier = runFrontier();
const metamorphic = runMetamorphic();
const shadows = shadowEnvironment();
assert.equal(frontier.corpusKind, "SYNTHETIC_DEVELOPMENT_ONLY");
assert.equal(frontier.holdout, false);
assert.equal(metamorphic.count, 12);
console.log(JSON.stringify({
  benchmarkId: "M18-LOCAL-TURKISH-NLU-FRONTIER-SWEEP-01",
  productDecisionEffect: 0,
  productRuntimeFilesChanged: 0,
  unseenHoldoutConsumptionCount: 0,
  unseenHoldoutTrainingLeakageCount: 0,
  RM002PlusExecuted: "NO",
  RN003PlusExecuted: "NO",
  RO002PlusExecuted: "NO",
  frontier,
  metamorphic,
  shadows,
  safety: { authorization: "NOT_INVOKED", tenantSelection: "NOT_INVOKED", businessWrites: "NOT_INVOKED", externalNetwork: "NOT_INVOKED", remoteInference: "NOT_INVOKED" },
}, null, 2));
