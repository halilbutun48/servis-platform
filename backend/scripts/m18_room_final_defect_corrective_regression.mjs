#!/usr/bin/env node

import assert from "node:assert/strict";
import { runCopilotFoundation } from "../src/ai/service.js";
import { resolveCanonicalConversationRequest } from "../src/ai/chat/canonicalSemanticRequest.js";

const user = {
  role: "ROOM",
  roomId: 1,
  companyId: 2,
  companyKind: "ROOM",
  id: 880607,
  sessionVersion: 1,
};

const state = (screenContext) => ({
  recentMessages: [],
  activeGuidedTask: null,
  uiSurface: screenContext,
});

const routeAction = (answer, path) => (Array.isArray(answer?.quickActions) ? answer.quickActions : [])
  .find((action) => action?.actionKind === "OPEN_ROUTE" && action?.path === path) || null;

const shifts = {
  path: "/room/shifts",
  label: "Vardiyalar",
  role: "ROOM",
  companyKind: "ROOM",
  uiHints: { visibleButtons: [] },
};

const agreements = {
  path: "/room/agreements",
  label: "Sözleşmeler",
  role: "ROOM",
  companyKind: "ROOM",
  selectedEntityType: "agreement",
  selectedEntityId: 184,
  selectedLabel: "Sözleşme #184",
  uiHints: {
    visibleButtons: [
      {
        label: "Operasyon Köprüsü",
        semanticType: "button",
        targetKey: "room:agreements:agreement:184:operation-bridge",
        semanticId: "product:room:agreement:184:operation-bridge",
        identitySource: "CANONICAL",
      },
    ],
  },
};

const home = {
  path: "/room",
  label: "Taşımacılık Firması Merkezi",
  role: "ROOM",
  companyKind: "ROOM",
  uiHints: { visibleButtons: [] },
};

function answer(message, screenContext, key) {
  return runCopilotFoundation({
    intent: "CHAT_HELP",
    entityType: "screen",
    entityId: 0,
    user,
    message,
    screenContext,
    conversationState: state(screenContext),
    authSessionId: `m18-room-final-defect-corrective-${key}`,
  });
}

const shiftMessage = "Vardiya 209'un ayrıntısını açar mısın?";
const shiftCanonical = resolveCanonicalConversationRequest({
  message: shiftMessage,
  user,
  screenContext: shifts,
  conversationState: state(shifts),
});
assert.equal(shiftCanonical.request?.operation, "EXPLAIN_RECORD_DETAILS", "explicit shift detail must use the record-details operation");
assert.equal(shiftCanonical.request?.candidateEntityRefs?.find((ref) => ref.type === "SHIFT")?.id, 209, "explicit shift detail must retain #209");
const shiftAnswer = await answer(shiftMessage, shifts, "shift-209");
const shiftAction = routeAction(shiftAnswer, "/room/shifts");
assert.ok(shiftAction, "shift detail must expose a real shifts navigation action");
assert.equal(Number(shiftAction.routeParams?.focusShiftId), 209, "shift detail action must retain #209");

const agreementAnswer = await answer("Bu sözleşmenin ticari akışını aç.", agreements, "agreement-184-commercial");
const commercialAction = routeAction(agreementAnswer, "/room/commercial-flow");
assert.ok(commercialAction, "selected agreement commercial-flow request must expose a real route action");
assert.equal(Number(commercialAction.routeParams?.agreementId), 184, "commercial-flow action must retain agreement #184");
assert.equal(String(commercialAction.routeParams?.tab), "settlement", "commercial-flow action must retain the read-only settlement tab");
assert.notEqual(agreementAnswer.guidedTarget?.targetKey, "room:agreements:agreement:184:operation-bridge", "response must not leave the source agreement bridge as the final action");

const homeAnswer = await answer("Hakedişlerimde sorun var mı?", home, "home-hakedis");
const homeSerialized = JSON.stringify({
  reply: homeAnswer.reply,
  summary: homeAnswer.summary,
  retrievedFacts: homeAnswer.retrievedFacts,
  authorizedRecords: homeAnswer.authorizedRecords,
});
for (const staleId of [151, 150, 147, 146]) {
  assert.doesNotMatch(homeSerialized, new RegExp(`#${staleId}\\b`), `HOME hakediş answer must not cite stale preview #${staleId}`);
}
for (const canonicalId of [186, 187, 188, 189, 190]) {
  assert.match(homeSerialized, new RegExp(`#${canonicalId}\\b`), `HOME hakediş answer must cover canonical reconciliation #${canonicalId}`);
}

console.log(JSON.stringify({
  status: "PASS",
  scenarios: {
    shift209: { operation: shiftCanonical.request?.operation, action: shiftAction },
    agreement184Commercial: { action: commercialAction },
    homeHakedis: { reply: homeAnswer.reply, retrievedFacts: homeAnswer.retrievedFacts },
  },
}, null, 2));
