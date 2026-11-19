import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const css = readFileSync(new URL("../../index.css", import.meta.url), "utf8");

test("shared Sefer Abi drawer stays interactive above route guidance", () => {
  assert.match(css, /\.copilotDrawer\s*\{[\s\S]*?z-index:\s*4310;[\s\S]*?pointer-events:\s*auto;/);
  assert.match(css, /\.copilotDrawer\s*>\s*\*\s*\{\s*pointer-events:\s*auto;\s*\}/);
  assert.match(css, /\.copilotDrawerHeader\s*\{\s*pointer-events:\s*auto;\s*\}/);
  assert.match(css, /\.copilotDrawer \.copilotChatSurface\s*\{[\s\S]*?pointer-events:\s*auto;[\s\S]*?overscroll-behavior:\s*contain;/);
  assert.match(css, /\.copilotDrawer \.copilotComposer,\s*\.copilotDrawer \.copilotComposerInputRow\s*\{\s*pointer-events:\s*auto;/);

  const drawer = readFileSync(new URL("./FloatingCopilotDrawer.jsx", import.meta.url), "utf8");
  assert.match(drawer, /zIndex:\s*activeOverlayLayer === "copilot" \|\| \(guidedTargetActive && activeOverlayLayer !== "guide"\) \? 9130 : 4210/);
  assert.match(drawer, /const SCREEN_GUIDE_JOB_TYPES = new Set\(\["SCREEN_MENU_GUIDE", "BUTTON_ACTION_GUIDE", "ROLE_HELP_GUIDE"\]\)/u);
  assert.match(drawer, /entityType: isScreenGuide \? "screen" : \(selection\?\.entityType \|\| "screen"\)/u);
  assert.match(drawer, /entityId: Number\(isScreenGuide \? screenContext\.screen\.id : \(selection\?\.entityId \|\| screenContext\.screen\.id\)\)/u);
});
