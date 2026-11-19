import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const css = fs.readFileSync(new URL("../../index.css", import.meta.url), "utf8");

test("ROOM finance keeps Sefer Abi out of the selected financial result", () => {
  assert.match(css, /@media \(min-width: 1181px\)[\s\S]*?body:has\(\.pre18-finance-room\) \.shellContent[\s\S]*?padding-right:/);
  assert.match(css, /@media \(max-width: 1180px\)[\s\S]*?body:has\(\.pre18-finance-room\) \.copilotDrawer[\s\S]*?position:\s*static/);
  assert.match(css, /body:has\(\.pre18-finance-room\) \.copilotDrawer[\s\S]*?z-index:\s*1/);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*?body:has\(\.pre18-finance-room\) \.copilotFab--mascot[\s\S]*?position:\s*relative/);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*?body:has\(\.pre18-finance-room\) \.copilotLauncherStack[\s\S]*?position:\s*absolute/);
  assert.match(css, /@media \(max-width: 720px\)[\s\S]*?body:has\(\.pre18-finance-room\) \.shell--has-copilot-fab \.shellContent[\s\S]*?padding-top:/);
});
