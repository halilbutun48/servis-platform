import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const panelSource = readFileSync(new URL("./CopilotPanel.jsx", import.meta.url), "utf8");
const stateSource = readFileSync(new URL("../../utils/copilotSharedState.js", import.meta.url), "utf8");

test("full-screen copilot persists a record-scoped chat context", () => {
  assert.match(panelSource, /const chatContextKey = useMemo\(/u);
  assert.match(panelSource, /chatContextKey,\n\s*routeContextStatus/u);
  assert.match(stateSource, /chatContextKey: compactText\(/u);
});

test("full-screen copilot clears legacy or mismatched transcript before reuse", () => {
  assert.match(panelSource, /legacyOrMismatchedTranscript/u);
  assert.match(panelSource, /setChatMessages\(\[\]\)/u);
  assert.match(panelSource, /setChatConversationState\(null\)/u);
});
