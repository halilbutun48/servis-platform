import assert from "node:assert/strict";
import test from "node:test";

import { inferRoomCostSemanticRequest } from "./canonicalSemanticRequest.js";

const roomUser = { id: 17, role: "ROOM", roomId: 1 };
const financeScreen = {
  path: "/room/financial-operations",
  role: "ROOM",
  surfaceRole: "ROOM",
  structuredFacts: {},
};

test("ROOM receivable question is not captured by a stale cost draft", () => {
  const result = inferRoomCostSemanticRequest({
    text: "Bu ay ne kadar alacağım kaldı?",
    user: roomUser,
    screenContext: financeScreen,
    conversationState: {
      roomCostConversationState: {
        subject: "ROOM_COST_DRAFT",
        intent: "COST_MISSING_DATA",
        roomId: 1,
        draft: {},
      },
    },
    inferred: { domain: "FINANCE" },
    targetCandidates: [],
  });

  assert.equal(result, null);
});

test("ROOM receivable question is not treated as a cost draft on a fresh finance turn", () => {
  const result = inferRoomCostSemanticRequest({
    text: "Bu ay ne kadar alacağım kaldı?",
    user: roomUser,
    screenContext: financeScreen,
    conversationState: null,
    inferred: { domain: "FINANCE" },
    targetCandidates: [],
  });

  assert.equal(result, null);
});

test("ROOM cost-missing follow-up still continues the existing cost draft", () => {
  const result = inferRoomCostSemanticRequest({
    text: "Peki hangi maliyet bilgileri eksik?",
    user: roomUser,
    screenContext: financeScreen,
    conversationState: {
      roomCostConversationState: {
        subject: "ROOM_COST_DRAFT",
        intent: "COST_MISSING_DATA",
        roomId: 1,
        draft: {},
      },
    },
    inferred: { domain: "FINANCE" },
    targetCandidates: [],
  });

  assert.equal(result?.intent, "COST_MISSING_DATA");
});
