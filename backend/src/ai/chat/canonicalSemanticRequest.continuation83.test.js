import assert from "node:assert/strict";
import test from "node:test";

import { resolveCanonicalConversationRequest } from "./canonicalSemanticRequest.js";

const superAdmin = { id: 77, role: "SUPER_ADMIN" };
const copilotScreen = {
  path: "/superadmin/copilot",
  label: "Sefer Abi",
  role: "SUPER_ADMIN",
  selectedEntityType: null,
  selectedEntityId: null,
  uiHints: {
    visibleButtons: [{ label: "Denetim Paneli", targetKey: "superadmin:operations" }],
  },
};

test("SUPER_ADMIN named Denetim Paneli show request is a supported navigation", () => {
  const result = resolveCanonicalConversationRequest({
    message: "Peki Denetim Paneli'ni göster.",
    user: superAdmin,
    screenContext: copilotScreen,
    conversationState: { lastScreenPath: copilotScreen.path },
  });

  assert.equal(result.request.operation, "NAVIGATE_AUTHORIZED_SURFACE");
  assert.equal(result.request.semanticAction.actionClass, "NAVIGATE");
  assert.equal(result.request.safety.writeBoundary, "NO_BUSINESS_WRITE");
});
