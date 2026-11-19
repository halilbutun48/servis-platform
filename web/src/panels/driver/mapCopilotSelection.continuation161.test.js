import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(here, "MapPanel.jsx"), "utf8");

test("DRIVER map publishes a safe screen context for the empty state", () => {
  assert.match(source, /setCopilotSelection\(copilotSelection\)/u);
  assert.doesNotMatch(source, /if \(!selectedVehicle && !activeShift\)[\s\S]{0,120}clearCopilotSelection\("\/driver\/map"\)/u);
  assert.match(source, /buildMapFacts\(/u);
});
