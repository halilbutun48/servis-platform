import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs";

const source = fs.readFileSync(new URL("./CopilotPanel.jsx", import.meta.url), "utf8");
const shiftsSource = fs.readFileSync(new URL("../company/ShiftsPanel.jsx", import.meta.url), "utf8");

test("full-screen Copilot return preserves the selected-screen query context", () => {
  assert.match(
    source,
    /const candidate = String\(sharedContext\?\.sourceScreenPath \|\| sharedContext\?\.screenPath \|\| ""\)\.trim\(\);/u,
  );
  assert.match(source, /chatSelection \|\| readCopilotRouteSelection\(\)/u);
  assert.match(source, /params\.set\("focusShiftId", String\(entityId\)\)/u);
  assert.match(source, /window\.localStorage\.setItem\(focusStorageKey, String\(entityId\)\)/u);
  assert.doesNotMatch(
    source,
    /sourceScreenPath \|\| sharedContext\?\.screenPath \|\| ""\)\.split\("\?"\)\[0\]/u,
  );
});

test("company shifts restores a selected shift from the return URL after reload", () => {
  assert.match(shiftsSource, /queryFocusRaw = new URLSearchParams\(query\)\.get\("focusShiftId"\)/u);
  assert.match(shiftsSource, /persistedFocusRaw = focusRaw \|\| queryFocusRaw/u);
});

test("full-screen Copilot keeps the source-record continuity key", () => {
  assert.match(source, /const continuityPath = String\(/u);
  assert.match(source, /chatSelection\?\.scopeKey/u);
  assert.match(source, /routeSelection\?\.scopeKey/u);
  assert.match(source, /sharedContext\?\.sourceScreenPath/u);
  assert.match(source, /const sourceScope = chatSelection\?\.scopeKey \|\| routeSelection\?\.scopeKey \|\| sharedContext\?\.sourceScreenPath/u);
  assert.match(source, /return \[continuityPath, continuityType, continuityId\]\.join\("\|"\)/u);
});

test("full-screen Copilot hydrates an auth-scoped transcript before auto-running", () => {
  assert.match(source, /FULL_WORKSPACE_HANDOFF_KEY\s*=\s*"psv1:copilot:full-workspace-handoff:v1"/u);
  assert.match(source, /function readFullWorkspaceHandoff\(scopeKey = ""\)/u);
  assert.match(source, /function isFullWorkspaceRoute\(path\)/u);
  assert.match(source, /function hydrateFullWorkspaceState\(scopeKey, shared\)/u);
  assert.match(source, /const routeSelection = readCopilotRouteSelection\(\)/u);
  assert.match(source, /chatContextKey = routeSelection\s*\?/u);
  assert.match(source, /selection: shared\?\.selection \|\| routeSelection \|\| null/u);
  assert.match(source, /const hydrated = hydrateFullWorkspaceState\(authScopeKey, readCopilotSharedState\(authScopeKey\)\)/u);
  assert.match(source, /setChatMessages\(scopedMessages\)/u);
  assert.match(source, /window\.localStorage\.removeItem\(FULL_WORKSPACE_HANDOFF_KEY\)/u);
  assert.match(source, /const authReady = Boolean\(token && me\?\.id\)/u);
  assert.match(source, /const shouldAutoRunChat = authReady &&/u);
  assert.match(source, /const isFullWorkspace = isFullWorkspaceRoute\(routeContext\.path \|\| screenMetadata\.path \|\| getPath\(\)\)/u);
  assert.match(source, /!isFullWorkspace && !hasPendingFullWorkspaceHandoff/u);
  assert.match(source, /if \(isFullWorkspaceRoute\(fullWorkspacePath\) && !chatMessages\.length\) return;/u);
  assert.match(source, /if \(!authReady\) return;/u);
  assert.match(source, /!isFullWorkspaceRoute\(routeContext\.path \|\| screenMetadata\.path \|\| getPath\(\)\)/u);
});
