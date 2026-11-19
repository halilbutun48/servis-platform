import assert from "node:assert/strict";
import test from "node:test";

import { resolveCopilotGuidedTarget } from "./copilotUiElementAnchor.js";

test("SUPER_ADMIN Denetim Paneli navigation resolves the live control", () => {
  const result = resolveCopilotGuidedTarget({
    user: { id: 77, role: "SUPER_ADMIN" },
    screenContext: {
      id: 6104,
      path: "/superadmin/copilot",
      label: "Sefer Abi Terminali",
      role: "SUPER_ADMIN",
      uiHints: {
        visibleButtons: [{
          label: "Denetim Paneli",
          targetKey: "superadmin:operations",
          semanticType: "button",
          identitySource: "CANONICAL",
        }],
      },
    },
    semanticPlan: {
      family: "UI_GUIDANCE",
      explicitUiGuidance: true,
      workflowIntent: "OPEN_SURFACE",
      typedRequest: { taskType: "SCREEN_CONTEXT", screenContextIntent: true, targetEntityType: "SURFACE" },
      canonicalRequest: {
        operation: "NAVIGATE_AUTHORIZED_SURFACE",
        currentRequest: { normalizedMeaning: "denetim paneli ac." },
      },
    },
    message: "Denetim Paneli aç.",
  });

  assert.equal(result.status, "FOUND");
  assert.equal(result.targetKey, "superadmin:operations");
  assert.equal(result.safeAction, "NAVIGATE");
});
