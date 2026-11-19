import test from "node:test";
import assert from "node:assert/strict";
import { clearCopilotSelection, readCopilotSelection, setCopilotSelection } from "./copilotSelection.js";
import { resolveAgreementCopilotRoute } from "./agreementCopilotRoute.js";

test("ORGANIZATION sözleşme seçimi çok turlu Copilot bağlamında korunur", () => {
  const previousWindow = globalThis.window;
  const previousDocument = globalThis.document;
  globalThis.window = {
    location: { hash: "#/organization/agreements?focusAgreementId=5" },
    dispatchEvent() {},
  };
  globalThis.document = { documentElement: {} };

  try {
    const scopeKey = resolveAgreementCopilotRoute("/organization/agreements?focusAgreementId=5");
    setCopilotSelection({
      scopeKey,
      entityType: "agreement",
      entityId: 5,
      facts: { selectedRecordId: 5, period: "2026-09" },
    });
    assert.equal(readCopilotSelection()?.scopeKey, "/organization/agreements");
    assert.equal(readCopilotSelection()?.entityId, 5);
    assert.equal(readCopilotSelection()?.facts?.period, "2026-09");
    clearCopilotSelection(scopeKey);
    assert.equal(readCopilotSelection(), null);
  } finally {
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
    if (previousDocument === undefined) delete globalThis.document;
    else globalThis.document = previousDocument;
  }
});
