import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

const source = readFileSync(new URL("./CopilotPanel.jsx", import.meta.url), "utf8");

test("screen guide actions use the screen entity instead of the selected record", () => {
  assert.match(source, /const SCREEN_GUIDE_JOB_TYPES = new Set\(\["SCREEN_MENU_GUIDE", "BUTTON_ACTION_GUIDE", "ROLE_HELP_GUIDE"\]\)/u);
  assert.match(source, /const screenGuide = SCREEN_GUIDE_JOB_TYPES\.has\(nextJobType\)/u);
    assert.match(source, /SCREEN_GUIDE_JOB_TYPES\.has\(jobType\) \? "screen" : selectedJob\.entityType/u);
  assert.match(source, /setEntityType\(screenGuide \? "screen" : \(guide\?\.entityType \|\| activeEntityType\)\)/u);
  assert.match(source, /setEntityId\(String\(screenGuide \? chatScreenId : \(effectiveChatEntityId \|\| chatScreenId \|\| ""\)\)\)/u);
});
