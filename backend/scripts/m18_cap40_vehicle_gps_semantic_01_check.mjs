#!/usr/bin/env node

import assert from "node:assert/strict";
import { resolveCanonicalConversationRequest } from "../src/ai/chat/canonicalSemanticRequest.js";
import { resolveCopilotGuidedTarget } from "../src/ai/chat/copilotUiElementAnchor.js";
import { resolveSemanticIntent } from "../src/ai/chat/semanticIntentPlanner.js";
import { buildVisibleContextDiagnosticResponse } from "../src/ai/service.js";
import { executeSemanticQueryPlan } from "../src/services/queryPlanExecutor.js";

const user = { id: 1, role: "ROOM", roomId: 1 };
const screenContext = {
  path: "/room/operation-health",
  label: "Operasyon Sağlığı",
  selectedEntity: { type: "shift", id: 211 },
  uiHints: {
    visibleButtons: [
      {
        label: "Araçlar",
        targetKey: "room:vehicles",
        semanticType: "nav-item",
        identitySource: "CANONICAL",
      },
      {
        label: "Sürücü & Sorunlar",
        targetKey: "room-operation-health:tab:problems",
        semanticType: "tab",
        identitySource: "CANONICAL",
      },
    ],
  },
};

const selectedVehicleScreenContext = {
  path: "/room/map",
  label: "Canlı Takip",
  selectedEntity: { type: "shift", id: 168 },
  uiHints: {
    visibleButtons: [
      {
        label: "Araçlar",
        targetKey: "room:vehicles",
        semanticType: "nav-item",
        identitySource: "CANONICAL",
      },
    ],
  },
};

const showVehicleCases = [
  "Araçlarımın GPS durumunu göster",
  "Konumu eski olan araçları göster",
];

for (const message of showVehicleCases) {
  const plan = resolveSemanticIntent({ message, user, screenContext });
  assert.equal(plan.family, "UI_GUIDANCE", `${message}: vehicle/GPS show must be UI guidance`);
  assert.equal(plan.explicitUiGuidance, true, `${message}: explicit UI guidance must be preserved`);
  assert.equal(plan.typedRequest?.taskType, "SCREEN_CONTEXT", `${message}: typed task must remain a screen request`);
  assert.equal(plan.typedRequest?.targetEntityType, "VEHICLE", `${message}: typed target must remain a vehicle surface`);
  const canonical = resolveCanonicalConversationRequest({ message, user, screenContext });
  assert.equal(canonical.validation.status, "VALID", `${message}: canonical request must validate`);
  assert.equal(canonical.request.operation, "NAVIGATE_AUTHORIZED_SURFACE", `${message}: canonical operation must navigate safely`);
  assert.equal(canonical.canonicalShape.currentTargetReference?.targetKey, "room:vehicles", `${message}: canonical vehicle target must be retained`);
  assert.equal(canonical.canonicalShape.currentTargetReference?.screenPath, "/room/operation-health", `${message}: current screen must remain bound`);
  const target = resolveCopilotGuidedTarget({
    user,
    screenContext,
    semanticPlan: { ...plan, canonicalRequest: canonical.request },
    message,
  });
  assert.equal(target.status, "FOUND", `${message}: authorized vehicle target must resolve`);
  assert.equal(target.identitySource, "CANONICAL", `${message}: vehicle target must be canonical`);
  assert.equal(target.targetKey, "room:vehicles", `${message}: target resolver must retain vehicle route`);
}

const diagnosticPlan = resolveSemanticIntent({
  message: "Hangi araçların konumu güncel değil?",
  user,
  screenContext,
});
assert.equal(diagnosticPlan.family, "ISSUE_DIAGNOSTIC", "vehicle/GPS diagnostic must remain explanatory");
assert.equal(diagnosticPlan.explicitUiGuidance, false, "diagnostic question must not force navigation");
assert.equal(diagnosticPlan.currentTargetReference, undefined, "diagnostic question must not claim a navigation target");

const diagnosticVariants = [
  "GPS arızası nedir?",
  "GPS arızasını teşhis et",
  "GPS sorununu incele",
  "Aracın GPS'inde ne sorun var?",
  "Konum bilgisi neden güncel değil?",
];

for (const message of diagnosticVariants) {
  const plan = resolveSemanticIntent({
    message,
    user,
    screenContext: selectedVehicleScreenContext,
  });
  assert.equal(plan.family, "ISSUE_DIAGNOSTIC", `${message}: GPS diagnosis must remain issue diagnostic`);
  assert.equal(plan.explicitUiGuidance, false, `${message}: diagnosis must not become navigation`);
  const canonical = resolveCanonicalConversationRequest({
    message,
    user,
    screenContext: selectedVehicleScreenContext,
  });
  assert.equal(canonical.validation.status, "VALID", `${message}: canonical diagnosis must validate`);
  assert.equal(canonical.request.operation, "DIAGNOSE_CURRENT_ISSUE", `${message}: canonical diagnosis operation must be preserved`);
  assert.equal(canonical.canonicalShape.taskType, "ISSUE", `${message}: canonical diagnosis task must be ISSUE`);
  assert.equal(canonical.request.semanticAction.actionClass, "EXPLAIN", `${message}: diagnosis must explain safely`);
  assert.equal(canonical.canonicalShape.uiContext?.selectedId, 168, `${message}: selected shift context must be preserved`);
  assert.equal(canonical.canonicalShape.uiContext?.selectedType, "SHIFT", `${message}: selected entity type must remain a shift`);

  const visibleContextResponse = buildVisibleContextDiagnosticResponse({
    user,
    entityType: "screen",
    entityId: 1101,
    message,
    screenContext: {
      path: "/room/map",
      label: "Canlı Takip",
      selectedLabel: "Vardiya #168",
      selectedEntityType: "shift",
      selectedEntityId: 168,
      selectedFields: [
        { label: "Araç", value: "34 ABC 124" },
        { label: "Son konum sinyali", value: "59 dk önce" },
      ],
      selectedBadges: [{ label: "Konum sinyali", value: "Güncel değil" }],
      structuredFacts: { gpsFresh: false },
    },
    semanticPlan: plan,
  });
  if (visibleContextResponse) {
    assert.equal(visibleContextResponse.questionType, "ISSUE_DIAGNOSTIC", `${message}: visible-context adapter must preserve canonical issue diagnostic type`);
    assert.equal(visibleContextResponse.activeTopic, "ISSUE_DIAGNOSTIC", `${message}: visible-context adapter must preserve canonical issue topic`);
    assert.equal(visibleContextResponse.assistantIntent, "ISSUE_DIAGNOSTIC", `${message}: visible-context adapter must preserve canonical issue assistant intent`);
  }
  if (message === "Aracın GPS'inde ne sorun var?") {
    assert.ok(visibleContextResponse, `${message}: selected-map visible-context adapter must remain exercised`);
  }
}

const fieldPlan = resolveSemanticIntent({
  message: "Son konum ne zaman geldi?",
  user,
  screenContext,
});
// The canonical planner owns GPS/location facts as LOCATION_GPS.  This is
// still a read-only factual lookup; ENTITY_LOOKUP was the obsolete historical
// fixture label and would misclassify the established GPS contract.
assert.equal(fieldPlan.family, "LOCATION_GPS", "last-location question must remain a factual GPS lookup");
assert.equal(fieldPlan.explicitUiGuidance, false, "last-location question must not force navigation");

const gpsFieldPlan = {
  requestedDomains: ["SHIFTS"],
  entity: { type: "shift", id: 168 },
  entities: [{ type: "shift", id: 168 }],
  requestedFields: [{ key: "GPS", domain: "SHIFTS" }],
  typedRequest: { taskType: "FIELD_LOOKUP" },
  intentFamily: "LOCATION_GPS",
  answerMode: "FIELD_LOOKUP",
};
const readGpsFact = async (freshness, gps = "Canlı") => executeSemanticQueryPlan({
  plan: gpsFieldPlan,
  allowedDomains: ["SHIFTS"],
  readDomain: async () => ({
    count: 1,
    facts: [{ id: 168, shiftId: 168, gps, freshness }],
  }),
});
const staleGps = await readGpsFact("STALE");
assert.match(staleGps.reply, /Konum sinyali güncel değil/,
  "stale GPS must be explained as not current");
assert.doesNotMatch(staleGps.reply, /konum: Canlı/,
  "stale GPS must not expose the cached Canlı label as current");
const freshGps = await readGpsFact("FRESH");
assert.match(freshGps.reply, /konum: Canlı/,
  "fresh GPS must retain the live label");

console.log(JSON.stringify({
  status: "PASS",
  showVehicleCases: showVehicleCases.length,
  diagnosticFamily: diagnosticPlan.family,
  diagnosticVariants: diagnosticVariants.length,
  fieldFamily: fieldPlan.family,
  staleGpsReply: staleGps.reply,
  freshGpsReply: freshGps.reply,
  targetKey: "room:vehicles",
}, null, 2));
