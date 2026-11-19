import assert from "node:assert/strict";
import { extractTurkishSemanticFeatures } from "../src/ai/chat/turkishSemanticFeatures.js";
import { composeSemanticEvidence } from "../src/ai/chat/semanticEvidenceComposer.js";

const ROLES = ["ROOM", "COMPANY", "SCHOOL", "ORGANIZATION", "DRIVER", "PERSONEL", "PARENT", "SUPER_ADMIN"];
const FORBIDDEN = [
  "semanticScope", "scope", "semanticAction", "action", "authorization", "route", "uiTarget",
  "capabilityGrant", "capability", "canonicalRequest", "response",
];

function contextFor(role, screen = true) {
  const pathByRole = {
    ROOM: "/room/shifts",
    COMPANY: "/company/operations",
    SCHOOL: "/school/operations",
    ORGANIZATION: "/organization/operations",
    DRIVER: "/driver/today",
    PERSONEL: "/personel/operations",
    PARENT: "/parent/children",
    SUPER_ADMIN: "/superadmin/operations",
  };
  return {
    role,
    currentDomain: screen ? "OPERATIONS" : "",
    currentSurface: screen ? { path: pathByRole[role] || "/company/operations", label: `${role} yüzeyi` } : null,
    evidence: { product: screen, object: [], action: [], relation: false },
    referenceState: { selectedEntity: null, currentTarget: null, uniqueReferent: null },
    freshness: { currentSurface: screen, activeTask: false, target: false },
  };
}

function compose(text, role = "COMPANY", screen = true, extra = {}, contextExtra = {}) {
  const features = extractTurkishSemanticFeatures({ text });
  return composeSemanticEvidence({
    features,
    context: { ...contextFor(role, screen), ...contextExtra },
    conversationState: { recentMessages: [], activeGuidedTask: null, ...extra },
    screenContext: screen ? { path: contextFor(role, true).currentSurface.path, label: `${role} yüzeyi`, role } : {},
  });
}

const roleFixtures = {
  ROOM: [
    ["CAPABILITY", "Taşıma firmasında hangi görevleri yapabilirim?", "CAPABILITY_GUIDANCE"],
    ["RESPONSIBILITY", "Taşıma tarafında günlük görevleri nasıl takip ederim?", "RESPONSIBILITY_GUIDANCE"],
    ["OWNERSHIP", "Taşıma hesabımda işlerimi nasıl sahiplenirim?", "RESPONSIBILITY_GUIDANCE"],
    ["DECISION_RESPONSIBILITY", "Taşıma operasyonunda kararları hangi sırayla sahiplenmeliyim?", "RESPONSIBILITY_GUIDANCE"],
    ["PROCESS_RESPONSIBILITY", "Taşıma tarafında günlük adımları nasıl yürütmeliyim?", "PROCESS_GUIDANCE"],
    ["BOUNDARY", "Taşıma işlerinde sorumluluğum nerede biter?", "RESPONSIBILITY_GUIDANCE"],
    ["LIMITATION", "Taşıma hesabımda hangi işleri yapmamalıyım?", "RESPONSIBILITY_GUIDANCE"],
    ["ORIENTATION", "Taşıma tarafında neyi öğrenmeliyim?", "ORIENTATION"],
    ["STARTING_GUIDANCE", "Taşıma hesabında ilk olarak nereden başlamalıyım?", "ORIENTATION"],
  ],
  COMPANY: [
    ["CAPABILITY", "Şirket hesabımda hangi alanlara erişebilirim?", "CAPABILITY_GUIDANCE"],
    ["RESPONSIBILITY", "Şirket hesabımda sorumluluklarımı nasıl izlerim?", "RESPONSIBILITY_GUIDANCE"],
    ["OWNERSHIP", "Şirket operasyonunda işlerimi nasıl sahiplenirim?", "RESPONSIBILITY_GUIDANCE"],
    ["DECISION_RESPONSIBILITY", "Şirket tarafında günlük kararları hangi sırayla sahiplenmeliyim?", "RESPONSIBILITY_GUIDANCE"],
    ["PROCESS_RESPONSIBILITY", "Şirket süreçlerindeki adımları nasıl yürütmeliyim?", "PROCESS_GUIDANCE"],
    ["BOUNDARY", "Şirket hesabımda yetki alanım nereye kadar uzanır?", "RESPONSIBILITY_GUIDANCE"],
    ["LIMITATION", "Şirket tarafında hangi işleri yapmamalıyım?", "RESPONSIBILITY_GUIDANCE"],
    ["ORIENTATION", "Şirket hesabımda neyi öğrenmeliyim?", "ORIENTATION"],
    ["STARTING_GUIDANCE", "Şirket tarafında ilk olarak nereden başlamalıyım?", "ORIENTATION"],
  ],
  SCHOOL: [
    ["CAPABILITY", "Okul tarafında neleri kullanabilirim?", "CAPABILITY_GUIDANCE"],
    ["RESPONSIBILITY", "Okul tarafında üzerime düşen işleri nasıl takip ederim?", "RESPONSIBILITY_GUIDANCE"],
    ["OWNERSHIP", "Okul hesabımda kendi işlerimi nasıl sahiplenirim?", "RESPONSIBILITY_GUIDANCE"],
    ["DECISION_RESPONSIBILITY", "Okul süreçlerinde kararları hangi sırayla sahiplenmeliyim?", "RESPONSIBILITY_GUIDANCE"],
    ["PROCESS_RESPONSIBILITY", "Okul tarafındaki günlük adımları nasıl yürütmeliyim?", "PROCESS_GUIDANCE"],
    ["BOUNDARY", "Okul görev sınırım nerede başlar ve biter?", "RESPONSIBILITY_GUIDANCE"],
    ["LIMITATION", "Okul hesabımda hangi işleri yapmamalıyım?", "RESPONSIBILITY_GUIDANCE"],
    ["ORIENTATION", "Okul tarafında hangi bilgileri öğrenmeliyim?", "ORIENTATION"],
    ["STARTING_GUIDANCE", "Okul hesabında işe ilk olarak nasıl başlamalıyım?", "ORIENTATION"],
  ],
  ORGANIZATION: [
    ["CAPABILITY", "Organizasyon hesabımda hangi işleri yapabilirim?", "CAPABILITY_GUIDANCE"],
    ["RESPONSIBILITY", "Organizasyon içinde hangi görevleri takip ederim?", "RESPONSIBILITY_GUIDANCE"],
    ["OWNERSHIP", "Organizasyon işlerimi nasıl sahiplenirim?", "RESPONSIBILITY_GUIDANCE"],
    ["DECISION_RESPONSIBILITY", "Organizasyon rolümde kararları hangi sırayla sahiplenmeliyim?", "RESPONSIBILITY_GUIDANCE"],
    ["PROCESS_RESPONSIBILITY", "Organizasyon süreçlerinin adımlarını nasıl yürütmeliyim?", "PROCESS_GUIDANCE"],
    ["BOUNDARY", "Organizasyon rolümün kapsamı nerede biter?", "RESPONSIBILITY_GUIDANCE"],
    ["LIMITATION", "Organizasyon hesabımda hangi işleri yapmamalıyım?", "RESPONSIBILITY_GUIDANCE"],
    ["ORIENTATION", "Organizasyon tarafında neleri kavramalıyım?", "ORIENTATION"],
    ["STARTING_GUIDANCE", "Organizasyon hesabında başlangıçta nereden başlamalıyım?", "ORIENTATION"],
  ],
  DRIVER: [
    ["CAPABILITY", "Sürücü profilimde hangi alanlara erişebilirim?", "CAPABILITY_GUIDANCE"],
    ["RESPONSIBILITY", "Sürücü olarak günlük sorumluluklarımı nasıl izlerim?", "RESPONSIBILITY_GUIDANCE"],
    ["OWNERSHIP", "Sürücü tarafındaki işlerimi nasıl sahiplenirim?", "RESPONSIBILITY_GUIDANCE"],
    ["DECISION_RESPONSIBILITY", "Sürücü görevlerinde kararları hangi sırayla sahiplenmeliyim?", "RESPONSIBILITY_GUIDANCE"],
    ["PROCESS_RESPONSIBILITY", "Sürücü olarak günlük adımları nasıl yürütmeliyim?", "PROCESS_GUIDANCE"],
    ["BOUNDARY", "Sürücü sorumluluğum hangi noktada biter?", "RESPONSIBILITY_GUIDANCE"],
    ["LIMITATION", "Sürücü hesabımda hangi işleri yapmamalıyım?", "RESPONSIBILITY_GUIDANCE"],
    ["ORIENTATION", "Sürücü profilimde neleri öğrenmeliyim?", "ORIENTATION"],
    ["STARTING_GUIDANCE", "Sürücü olarak ilk adımda nereden başlamalıyım?", "ORIENTATION"],
  ],
  PERSONEL: [
    ["CAPABILITY", "Personel hesabımda hangi işlevleri kullanabilirim?", "CAPABILITY_GUIDANCE"],
    ["RESPONSIBILITY", "Personel tarafında hangi görevleri nasıl takip ederim?", "RESPONSIBILITY_GUIDANCE"],
    ["OWNERSHIP", "Personel işlerimi nasıl sahiplenirim?", "RESPONSIBILITY_GUIDANCE"],
    ["DECISION_RESPONSIBILITY", "Personel rolünde günlük kararları hangi sırayla sahiplenmeliyim?", "RESPONSIBILITY_GUIDANCE"],
    ["PROCESS_RESPONSIBILITY", "Personel süreçlerindeki adımları nasıl yürütmeliyim?", "PROCESS_GUIDANCE"],
    ["BOUNDARY", "Personel tarafında yetki sınırım nereye kadar uzanır?", "RESPONSIBILITY_GUIDANCE"],
    ["LIMITATION", "Personel hesabımda hangi işleri yapmamalıyım?", "RESPONSIBILITY_GUIDANCE"],
    ["ORIENTATION", "Personel tarafında hangi konuları öğrenmeliyim?", "ORIENTATION"],
    ["STARTING_GUIDANCE", "Personel hesabında başlangıç için nereden başlamalıyım?", "ORIENTATION"],
  ],
  PARENT: [
    ["CAPABILITY", "Veli hesabımda hangi bilgilere erişebilirim?", "CAPABILITY_GUIDANCE"],
    ["RESPONSIBILITY", "Veli olarak üzerime düşen işleri nasıl takip ederim?", "RESPONSIBILITY_GUIDANCE"],
    ["OWNERSHIP", "Veli hesabımdaki işleri nasıl sahiplenirim?", "RESPONSIBILITY_GUIDANCE"],
    ["DECISION_RESPONSIBILITY", "Veli tarafında kararları hangi sırayla sahiplenmeliyim?", "RESPONSIBILITY_GUIDANCE"],
    ["PROCESS_RESPONSIBILITY", "Veli olarak günlük adımları nasıl yürütmeliyim?", "PROCESS_GUIDANCE"],
    ["BOUNDARY", "Veli olarak görev alanım nerede biter?", "RESPONSIBILITY_GUIDANCE"],
    ["LIMITATION", "Veli hesabımda hangi işleri yapmamalıyım?", "RESPONSIBILITY_GUIDANCE"],
    ["ORIENTATION", "Veli tarafında neleri anlamalıyım?", "ORIENTATION"],
    ["STARTING_GUIDANCE", "Veli hesabında ilk olarak neye başlamalıyım?", "ORIENTATION"],
  ],
  SUPER_ADMIN: [
    ["CAPABILITY", "Yönetici hesabımda hangi işlevleri kullanabilirim?", "CAPABILITY_GUIDANCE"],
    ["RESPONSIBILITY", "Yönetici tarafında hangi görevleri nasıl izlerim?", "RESPONSIBILITY_GUIDANCE"],
    ["OWNERSHIP", "Yönetici işlerimi nasıl sahiplenirim?", "RESPONSIBILITY_GUIDANCE"],
    ["DECISION_RESPONSIBILITY", "Yönetici rolünde kararları hangi sırayla sahiplenmeliyim?", "RESPONSIBILITY_GUIDANCE"],
    ["PROCESS_RESPONSIBILITY", "Yönetici süreçlerinin adımlarını nasıl yürütmeliyim?", "PROCESS_GUIDANCE"],
    ["BOUNDARY", "Yönetici hesabında müdahale sınırım nereye kadar?", "RESPONSIBILITY_GUIDANCE"],
    ["LIMITATION", "Yönetici tarafında hangi işleri yapmamalıyım?", "RESPONSIBILITY_GUIDANCE"],
    ["ORIENTATION", "Yönetici hesabında hangi konuları öğrenmeliyim?", "ORIENTATION"],
    ["STARTING_GUIDANCE", "Yönetici tarafında başlangıç için nereden başlamalıyım?", "ORIENTATION"],
  ],
};

function assertDeepFrozen(value, seen = new Set()) {
  if (!value || typeof value !== "object" || seen.has(value)) return;
  seen.add(value);
  assert.equal(Object.isFrozen(value), true, "composed evidence graph must be deeply frozen");
  for (const child of Object.values(value)) assertDeepFrozen(child, seen);
}

const positive = [];
for (const role of ROLES) {
  for (const [aspect, text, help] of roleFixtures[role]) {
    const result = compose(text, role);
    assert.equal(result.subject.value, "ROLE", `${role}/${aspect} subject`);
    assert.equal(result.roleAspect.value, aspect, `${role}/${aspect} aspect`);
    assert.equal(result.requestMode.value, "EXPLAIN", `${role}/${aspect} mode`);
    assert.equal(result.productHelp.value, help, `${role}/${aspect} help`);
    assert.equal(result.object.value, "NONE", `${role}/${aspect} object`);
    assert.equal(result.targetRequest.value, "PRODUCT_AREA", `${role}/${aspect} target`);
    assert.equal(result.quality.roleHelpCandidate, true, `${role}/${aspect} candidate`);
    assert.ok(result.subject.provenance.includes("AUTH_CONTEXT"), `${role}/${aspect} subject provenance`);
    assert.equal(result.provenance.find((entry) => entry.source === "AUTH_CONTEXT")?.contextRef, `auth:role:${role}`);
    assert.ok(result.provenance.some((entry) => entry.source === "SURFACE_CONTEXT"), `${role}/${aspect} surface provenance`);
    assertDeepFrozen(result);
    positive.push({ role, aspect, help });
  }
}

const currentScreen = compose("Bu sistemde hangi işleri takip ederim?", "COMPANY", true);
assert.equal(currentScreen.productHelp.value, "RESPONSIBILITY_GUIDANCE");
assert.equal(currentScreen.quality.roleHelpCandidate, true);
assert.ok(currentScreen.provenance.some((entry) => entry.source === "SURFACE_CONTEXT"));

const globalHelp = compose("Bu sistemde nereden başlamalıyım?", "COMPANY", false);
assert.equal(globalHelp.productHelp.value, "ORIENTATION");
assert.equal(globalHelp.targetRequest.value, "PRODUCT_AREA");
assert.equal(globalHelp.provenance.some((entry) => entry.source === "SURFACE_CONTEXT"), false);
assert.equal(globalHelp.targetRequest.provenance.includes("SURFACE_CONTEXT"), false);
assert.equal(globalHelp.temporal.value, "NONE");
assert.equal(globalHelp.temporal.provenance.includes("RAW_TEXT"), false);

const contextualReferent = compose("Bunu anlat.", "COMPANY", true, {}, {
  referenceState: { uniqueReferent: { type: "SHIFT", id: 42 }, freshness: "FRESH", validated: true },
});
assert.equal(contextualReferent.reference.value, "UNIQUE");
assert.equal(contextualReferent.reference.contextRef, "reference:unique:SHIFT:42");
assert.ok(contextualReferent.reference.provenance.includes("REFERENCE_HISTORY"));
assert.equal(contextualReferent.object.value, "SHIFT");
assert.equal(contextualReferent.targetRequest.value, "ENTITY");

const activeContinuation = compose("Devam et.", "COMPANY", true, { activeGuidedTask: { taskId: "task-42" } });
assert.equal(activeContinuation.requestMode.value, "CONTINUE");
assert.ok(activeContinuation.requestMode.provenance.includes("ACTIVE_TASK"));

for (const key of FORBIDDEN) assert.equal(Object.hasOwn(globalHelp, key), false, `forbidden result field: ${key}`);
assert.equal(globalHelp.provenance.every((item) => item.authorizationEffect === "NONE"), true);
assert.equal(globalHelp.quality.authorizationEffect, "NONE");
assert.deepEqual(compose("Günlük kararları hangi sırayla sahiplenmeliyim?"), compose("Günlük kararları hangi sırayla sahiplenmeliyim?"));

console.log("status=PASS");
console.log(`roles=${ROLES.length}`);
console.log(`positiveCases=${positive.length}`);
console.log(`roleAspects=${new Set(positive.map((item) => item.aspect)).size}`);
console.log(`productHelpFamilies=${new Set(positive.map((item) => item.help)).size}`);
