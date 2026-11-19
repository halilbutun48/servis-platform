import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const panelSource = readFileSync(new URL("./CopilotPanel.jsx", import.meta.url), "utf8");
const drawerSource = readFileSync(new URL("../../components/copilot/FloatingCopilotDrawer.jsx", import.meta.url), "utf8");

test("full-screen COMPANY copilot keeps a same-tenant agreement selection", () => {
  assert.match(
    panelSource,
    /selectionApplies\(current,\s*path\)/u,
    "the full-screen copilot must use the canonical same-role selection handoff instead of exact-path matching",
  );
  assert.match(
    panelSource,
    /selectionApplies\(current,\s*path\)[\s\S]{0,240}setChatSelection\(next\)/u,
    "the accepted selection must be applied to the chat context",
  );
  assert.match(
    panelSource,
    /selectionApplies\(latestSelection,\s*selectedChatScreen\?\.path\s*\|\|\s*""\)/u,
    "the live request must retain the same-role selected record on the dedicated copilot route",
  );
  assert.match(
    panelSource,
    /selectionApplies\(chatSelection,\s*selectedChatScreen\?\.path\s*\|\|\s*""\)/u,
    "the scoped request fallback must retain the same-role selected record on the dedicated copilot route",
  );
  assert.match(
    panelSource,
    /const shared = readCopilotSharedState\(authScopeKey\);[\s\S]{0,180}readCopilotSelection\(\)\s*\|\|\s*shared\?\.selection/u,
    "the full-screen route must recover the scoped selected record from the existing shared handoff when the lazy panel has a separate module instance",
  );
  assert.match(
    panelSource,
    /readCopilotRouteSelection\(\)[\s\S]{0,180}readCopilotSelection\(\)\s*\|\|\s*shared\?\.selection/u,
    "the full-screen route must prefer the explicit route handoff when the global selection is cleared during SPA navigation",
  );
  assert.match(
    drawerSource,
    /setCopilotSelection\(selection\)[\s\S]{0,260}writeCopilotSharedState\(/u,
    "opening the full-screen route must publish the selected record before the SPA handoff",
  );
  assert.match(
    drawerSource,
    /fullWorkspacePath\(me\)[\s\S]{0,360}copilotEntityType[\s\S]{0,360}openPath\(/u,
    "the full-screen route must carry a minimal selected-record identity when the in-memory handoff cannot survive navigation",
  );
});

test("full-screen copilot keeps screen-only chat usable without a selected business record", () => {
  assert.match(
    panelSource,
    /!effectiveChatEntityId\s*&&\s*!selectedChatScreen\?\.id/u,
    "screen-scoped chat must only stop when neither a selected record nor the current screen exists",
  );
});

test("full-screen entity chat forwards the visible fallback record when no route handoff exists", () => {
  assert.match(
    panelSource,
    /const fallbackEntitySelection\s*=\s*selectedChatItem\s*&&\s*chatEntityType\s*!==\s*"screen"/u,
    "the visible selected business record must be used when no scoped route selection exists",
  );
  assert.match(
    panelSource,
    /const requestSelection\s*=\s*liveSelection\s*\|\|\s*scopedChatSelection\s*\|\|\s*fallbackEntitySelection/u,
    "chat requests must preserve the selected entity instead of asking for a record that the UI already selected",
  );
});
