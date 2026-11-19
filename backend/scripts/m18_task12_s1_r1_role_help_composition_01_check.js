import assert from "node:assert/strict";
import { composeSemanticEvidence } from "../src/ai/chat/semanticEvidenceComposer.js";

function token(normalized) {
  return { normalized, lemmaCandidates: [normalized] };
}

function evidenceFixture({ object = null, requestMode = "EXPLAIN", reference = "ABSENT", question = true } = {}) {
  return {
    tokens: [token("hesabı"), token("servis"), token("akışı"), token("nasıl"), token("yönetilir")],
    question: { isQuestion: question, markers: question ? [{ value: "QUESTION_MARK" }] : [], form: question ? "PUNCTUATION" : "NONE" },
    relations: {
      actorObject: [{ featureKind: "ACTOR_OBJECT_RELATION", value: "ACTOR_OBJECT", quality: "MEDIUM" }],
      ownership: [{ featureKind: "OWNERSHIP_RELATION", value: "OWNERSHIP", quality: "MEDIUM" }],
      process: [{ featureKind: "PROCESS_RELATION", value: "PROCESS", quality: "MEDIUM" }],
    },
    objectEvidence: object ? [{ kind: "CONCRETE_OBJECT", value: object, provenance: ["STRUCTURE"], quality: "HIGH" }] : [],
    referenceEvidence: [{ value: reference, provenance: ["STRUCTURE"], quality: "HIGH" }],
    featureQuality: { overall: "HIGH", partial: false },
    ...(requestMode !== "EXPLAIN" ? { explicitRequestMode: requestMode } : {}),
  };
}

function compose(features) {
  return composeSemanticEvidence({
    features,
    context: { role: "COMPANY", currentDomain: "PRODUCT", currentSurface: { path: "/company" } },
    conversationState: {},
    screenContext: {},
  });
}

function run() {
  const roleHelpWithDomainObject = compose(evidenceFixture({ object: "SHIFT" }));
  assert.equal(roleHelpWithDomainObject.quality.roleHelpCandidate, true, "S1_R1_ROLE_HELP_MUST_SURVIVE_DOMAIN_OBJECT_MAPPING");
  assert.equal(roleHelpWithDomainObject.productHelp.value, "PROCESS_GUIDANCE", "S1_R1_PRODUCT_HELP_MUST_REMAIN_TYPED");
  assert.equal(roleHelpWithDomainObject.object.value, "SHIFT", "S1_R1_MUST_PRESERVE_OBJECT_EVIDENCE");

  const roleHelpWithoutObject = compose(evidenceFixture());
  assert.equal(roleHelpWithoutObject.quality.roleHelpCandidate, true, "ROLE_HELP_WITHOUT_OBJECT_MUST_REMAIN_SUPPORTED");

  const explicitReference = compose(evidenceFixture({ object: "AGREEMENT", reference: "UNIQUE" }));
  assert.equal(explicitReference.quality.roleHelpCandidate, false, "EXPLICIT_REFERENCE_MUST_RETAIN_OBJECT_PRECEDENCE");

  const currentSurfaceGuidance = compose(evidenceFixture({ object: "SURFACE", reference: "UNIQUE" }));
  assert.equal(currentSurfaceGuidance.quality.roleHelpCandidate, true, "CURRENT_SURFACE_GUIDANCE_MAY_RETAIN_ROLE_HELP_MEANING");
  assert.equal(currentSurfaceGuidance.object.value, "SURFACE", "CURRENT_SURFACE_OBJECT_EVIDENCE_MUST_REMAIN_VISIBLE");

  const explicitAction = compose({
    ...evidenceFixture({ object: "SHIFT", question: false }),
    tokens: [token("vardiyayı"), token("göster")],
    question: { isQuestion: false, markers: [], form: "NONE" },
  });
  assert.equal(explicitAction.requestMode.value, "VIEW", "EXPLICIT_VIEW_MODE_MUST_REMAIN_VISIBLE");
  assert.equal(explicitAction.quality.roleHelpCandidate, false, "EXPLICIT_VIEW_MUST_NOT_BE_PROMOTED_TO_ROLE_HELP");
  assert.equal(explicitAction.object.value, "SHIFT", "EXPLICIT_VIEW_OBJECT_MUST_REMAIN_VISIBLE");

  console.log(JSON.stringify({
    status: "PASS",
    checks: [
      "ROLE_HELP_WITH_DOMAIN_OBJECT",
      "ROLE_HELP_WITHOUT_OBJECT",
      "EXPLICIT_REFERENCE_PRECEDENCE",
      "EXPLICIT_ACTION_PRECEDENCE",
    ],
  }));
}

run();
