import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { resolveDriverMapCopilotTarget } from "./driverMapCopilotSelection.js";

const mapPanelSource = fs.readFileSync(
  path.join(path.dirname(fileURLToPath(import.meta.url)), "MapPanel.jsx"),
  "utf8",
);

test("driver map copilot targets the authorized shift, not only the vehicle", () => {
  assert.deepEqual(
    resolveDriverMapCopilotTarget({ id: 19 }, { id: 2, plate: "34ABC126" }),
    { entityType: "shift", entityId: 19 },
  );
});

test("driver map copilot has no record target when the route has no shift", () => {
  assert.deepEqual(resolveDriverMapCopilotTarget(null, { id: 2 }), { entityType: "screen", entityId: 0 });
});

test("driver map selection cleanup runs only when the panel unmounts", () => {
  assert.match(mapPanelSource, /setCopilotSelection\(copilotSelection\);\s*\}\s*,\s*\[copilotSelection\]\);/u);
  assert.match(mapPanelSource, /useEffect\(\(\) => \(\) => clearCopilotSelection\("\/driver\/map"\), \[\]\);/u);
});
