import assert from "node:assert/strict";
import { extractTurkishSemanticFeatures } from "../src/ai/chat/turkishSemanticFeatures.js";
import { composeSemanticEvidence } from "../src/ai/chat/semanticEvidenceComposer.js";

const context = {
  role: "ORGANIZATION",
  currentDomain: "OPERATIONS",
  currentSurface: { path: "/organization/operations" },
  evidence: { product: true },
};

function compose(text) {
  return composeSemanticEvidence({
    features: extractTurkishSemanticFeatures({ text }),
    context,
    conversationState: {},
    screenContext: { path: context.currentSurface.path },
  });
}

function composeWithoutProductAnchor(text) {
  return composeSemanticEvidence({
    features: extractTurkishSemanticFeatures({ text }),
    context: { role: "ORGANIZATION" },
    conversationState: {},
    screenContext: {},
  });
}

const limitation = compose("Koordinasyon ekibinde benim dışımda kalan kararlar nelerdir?");
assert.equal(limitation.roleAspect.value, "LIMITATION");
assert.equal(limitation.quality.roleHelpCandidate, true);

const capability = compose("Birim hesabıyla hangi iş akışlarına katılabilirim?");
assert.equal(capability.roleAspect.value, "CAPABILITY");
assert.equal(capability.quality.roleHelpCandidate, true);

const decision = compose("Operasyon kararlarının önceliğini kim belirler?");
assert.equal(decision.roleAspect.value, "DECISION_RESPONSIBILITY");
assert.equal(decision.quality.roleHelpCandidate, true);

const purpose = compose("Bu çalışma alanının işlevi nedir?");
assert.equal(purpose.roleAspect.value, "ORIENTATION");
assert.equal(purpose.quality.roleHelpCandidate, true);

const assignment = compose("Plan izleme görevi hangi aşamada bana ait sayılır?");
assert.equal(assignment.roleAspect.value, "OWNERSHIP");
assert.equal(assignment.quality.roleHelpCandidate, true);

const mediumOwnershipFeatures = {
  sourceText: "synthetic corroborated ownership",
  normalizedText: "synthetic corroborated ownership",
  tokens: [{ normalized: "hangi", lemmaCandidates: ["hangi"], sourceSpan: { start: 0, end: 5 } }],
  polarity: { negation: [], modality: [] },
  question: { isQuestion: true, markers: [], form: "SYNTHETIC" },
  relations: {
    actorObject: [], ownership: [
      { featureKind: "OWNERSHIP_RELATION", value: "OWNERSHIP", quality: "MEDIUM" },
      { featureKind: "OWNERSHIP_RELATION", value: "OWNERSHIP", quality: "MEDIUM" },
    ], process: [], assignment: [
      { featureKind: "ASSIGNMENT_RELATION", value: "ASSIGNMENT", quality: "MEDIUM" },
    ], inclusion: [], exclusion: [], purpose: [], orientation: [],
    startingGuidance: [], boundary: [], limitation: [], decision: [], verbNoun: [], local: [],
  },
  temporal: [], order: [], priority: [], structure: { local: [] },
  featureQuality: { overall: "MEDIUM", partial: false, bounded: true, recognizedFeatureCount: 2 },
};
const mediumOwnership = composeSemanticEvidence({ features: mediumOwnershipFeatures, context, conversationState: {}, screenContext: { path: context.currentSurface.path } });
assert.equal(mediumOwnership.roleAspect.value, "OWNERSHIP");
assert.equal(mediumOwnership.quality.roleHelpCandidate, true);

const weakOwnershipFeatures = {
  ...mediumOwnershipFeatures,
  relations: {
    ...mediumOwnershipFeatures.relations,
    ownership: [mediumOwnershipFeatures.relations.ownership[0]],
    assignment: [],
  },
};
const weakOwnership = composeSemanticEvidence({ features: weakOwnershipFeatures, context, conversationState: {}, screenContext: { path: context.currentSurface.path } });
assert.equal(weakOwnership.roleAspect.value, "NONE");
assert.equal(weakOwnership.quality.roleHelpCandidate, false);

const ordinaryExterior = extractTurkishSemanticFeatures({ text: "Dışarıda yağmur başlayabilir." });
assert.equal(ordinaryExterior.relations.limitation.length, 0);
assert.equal(ordinaryExterior.relations.exclusion.length, 0);
assert.equal(ordinaryExterior.relations.inclusion.length, 0);

// Final residual Stage 1: synthetic structural controls. These intentionally
// use fresh wording and exercise local morphology/relations rather than the
// exposed diagnostic corpus.
const relationalExclusion = compose("Birimde dışarıda tutulan karar alanları hangileridir?");
assert.equal(relationalExclusion.roleAspect.value, "LIMITATION");
assert.equal(relationalExclusion.quality.roleHelpCandidate, true);

const possessiveAttribution = compose("Hangi plan bilgisini izlemek benim işim?");
assert.equal(possessiveAttribution.roleAspect.value, "RESPONSIBILITY");
assert.equal(possessiveAttribution.quality.roleHelpCandidate, true);

const accountabilityOwnership = compose("İş akışında benim payım nerede?");
assert.equal(accountabilityOwnership.roleAspect.value, "OWNERSHIP");
assert.equal(accountabilityOwnership.quality.roleHelpCandidate, true);

const relativeAttribution = compose("Platformun bana sağladığı görev alanını anlatır mısın?");
assert.notEqual(relativeAttribution.roleAspect.value, "NONE");
assert.equal(relativeAttribution.quality.roleHelpCandidate, true);

const finiteCapability = compose("Merkez hesabı hangi günlük iş bilgisini toplar?");
assert.equal(finiteCapability.roleAspect.value, "CAPABILITY");
assert.equal(finiteCapability.quality.roleHelpCandidate, true);

const priorityDecision = compose("Ekip tarafında iş önceliğini hangi etken belirler?");
assert.equal(priorityDecision.roleAspect.value, "DECISION_RESPONSIBILITY");
assert.equal(priorityDecision.quality.roleHelpCandidate, true);

const operationalOrientation = compose("Sistem alanında iş dağılımını nasıl yorumlarım?");
assert.equal(operationalOrientation.roleAspect.value, "ORIENTATION");
assert.equal(operationalOrientation.quality.roleHelpCandidate, true);

const nonParticipationLimit = compose("Hangi başlıkları takip ederim, hangilerine müdahale etmem?");
assert.equal(nonParticipationLimit.roleAspect.value, "LIMITATION");
assert.equal(nonParticipationLimit.quality.roleHelpCandidate, true);

const physicalExterior = extractTurkishSemanticFeatures({ text: "Dışarıda çocuklar oynuyor." });
assert.equal(physicalExterior.relations.limitation.length, 0);
assert.equal(physicalExterior.relations.exclusion.length, 0);

const unrelatedPossessive = compose("Benim kitabım rafta mı?");
assert.equal(unrelatedPossessive.roleAspect.value, "NONE");
assert.equal(unrelatedPossessive.quality.roleHelpCandidate, false);

const genericFiniteVerb = composeWithoutProductAnchor("Mahallede hangi kuşlar uçar?");
assert.notEqual(genericFiniteVerb.roleAspect.value, "CAPABILITY");
assert.equal(genericFiniteVerb.quality.roleHelpCandidate, false);

const genericPriority = composeWithoutProductAnchor("Öncelik sırası neden önemlidir?");
assert.notEqual(genericPriority.roleAspect.value, "DECISION_RESPONSIBILITY");
assert.equal(genericPriority.quality.roleHelpCandidate, false);

const genericInterpretation = composeWithoutProductAnchor("Bir hikâyeyi nasıl yorumlarım?");
assert.notEqual(genericInterpretation.roleAspect.value, "ORIENTATION");
assert.equal(genericInterpretation.quality.roleHelpCandidate, false);

const unrelatedNegation = compose("Yarın toplantıya katılmam.");
assert.equal(unrelatedNegation.roleAspect.value, "NONE");
assert.equal(unrelatedNegation.quality.roleHelpCandidate, false);

const concreteObjectControl = compose("Teklif kaydını aç.");
assert.equal(concreteObjectControl.requestMode.value, "VIEW");
assert.equal(concreteObjectControl.quality.roleHelpCandidate, false);

const genuineOosControl = compose("Akşam sıcaklık düşer mi?");
assert.equal(genuineOosControl.requestMode.value, "GENUINE_OOS");
assert.equal(genuineOosControl.quality.roleHelpCandidate, false);

console.log("status=PASS");
console.log("structuralCases=22");
