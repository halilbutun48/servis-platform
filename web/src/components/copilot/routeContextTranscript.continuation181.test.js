import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const source = fs.readFileSync(new URL("./FloatingCopilotDrawer.jsx", import.meta.url), "utf8");

test("floating copilot clears normal screen-to-screen transcript but preserves copilot handoff", () => {
  assert.match(source, /isDetailedCopilotHandoff\s*=\s*\/\\\/copilot\$\/.test\(previousPath\)\s*\|\|\s*\/\\\/copilot\$\/.test\(currentPath\)/u);
  assert.match(source, /setMessages\(\[\]\)/u);
  assert.match(source, /localStorage\.removeItem\(`\$\{HISTORY_KEY\}:\$\{authScopeKey\}`\)/u);
  assert.match(source, /writeCopilotSharedState\(\{[\s\S]{0,700}messages:\s*\[\]/u);
});

test("floating copilot hydrates a full-screen handoff transcript when drawer history is empty", () => {
  assert.match(source, /FULL_WORKSPACE_HANDOFF_KEY\s*=\s*"psv1:copilot:full-workspace-handoff:v1"/u);
  assert.match(source, /function loadHydratedMessages\(scopeKey = ""\)/u);
  assert.match(source, /localStorage\.getItem\(FULL_WORKSPACE_HANDOFF_KEY\)/u);
  assert.match(source, /useState\(\(\) => loadHydratedMessages\(authScopeKey\)\)/u);
  assert.match(source, /const hydratedMessages\s*=/u);
  assert.match(source, /const sharedMessages\s*=\s*Array\.isArray\(scopedState\?\.messages\)/u);
  assert.match(source, /sharedMessages\.length\s*>=\s*scopedMessages\.length\s*\?\s*sharedMessages\s*:\s*scopedMessages/u);
  assert.match(source, /setMessages\(hydratedMessages\)/u);
  assert.match(source, /setConversationState\(scopedState\?\.conversationState\s*\|\|\s*null\)/u);
  assert.match(source, /writeCopilotSharedState\(\{[\s\S]{0,700}messages:\s*hydratedMessages/u);
  assert.match(source, /localStorage\.setItem\(FULL_WORKSPACE_HANDOFF_KEY, JSON\.stringify\(\{/u);
  assert.match(source, /if \(!isCopilotPage\) \{\s*writeCopilotSharedState\(\{/u);
  assert.match(source, /if \(isCopilotPage\) return;\s*if \(skipPersistenceRef\.current\)/u);
});

test("floating copilot does not clear same-route handoff transcript during transient selection reload", () => {
  assert.match(source, /shouldPreserveDetailedTranscript\s*=\s*\(nextSelectionContextKey\)\s*=>/u);
  assert.match(source, /isDetailedCopilotPath\s*=\s*\/\\\/copilot\$\//u);
  assert.match(source, /if \(nextSelectionContextKey && !isDetailedCopilotPath\) return false;/u);
  assert.match(source, /isDetailedCopilotPath\s*\|\|\s*normalizeScopePath\(shared\?\.sourceScreenPath\)\s*===\s*normalizeScopePath\(currentPath\)/u);
  assert.doesNotMatch(source, /!nextSelectionContextKey\s*\n\s*&& Array\.isArray\(shared\?\.messages\)/u);
  assert.match(source, /previousSelectionContextKey\s*&&\s*previousSelectionContextKey\s*!==\s*nextSelectionContextKey\s*&&\s*!preserveDetailedTranscript/u);
});
