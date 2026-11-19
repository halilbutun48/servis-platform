import assert from "node:assert/strict";
import test from "node:test";

import { resolveCanonicalConversationRequest } from "./canonicalSemanticRequest.js";

test("selected ROOM shift route question resolves to the planned route field", () => {
  const result = resolveCanonicalConversationRequest({
    message: "Bu vardiyanın durakları ve planlanan mesafesi nedir?",
    user: { id: 17, role: "ROOM", roomId: 1 },
    screenContext: {
      path: "/room/shifts",
      role: "ROOM",
      surfaceRole: "ROOM",
      selectedEntityType: "SHIFT",
      selectedEntityId: 47,
    },
  });

  assert.deepEqual(result.request.requestedFields, ["ROUTE"]);
  assert.equal(result.request.domain, "SHIFTS");
  assert.equal(result.request.safety.writeBoundary, "NO_BUSINESS_WRITE");
});
