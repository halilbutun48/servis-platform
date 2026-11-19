import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const routeSource = fs.readFileSync(path.join(here, "RoutePanel.jsx"), "utf8");

test("DRIVER günlük biniş değişikliği Sefer Abi için servis talebi olarak seçilebilir", () => {
  assert.match(routeSource, /boardingChangeCopilotSelectionIdentity/);
  assert.match(routeSource, /setCopilotSelection/);
  assert.match(routeSource, /entityType:\s*identity\.entityType/);
  assert.match(routeSource, /boardingChangeEffects\.map[\s\S]*onClick=\{\(\) => handleBoardingChangeSelect\(effect\)\}/);
  assert.match(routeSource, /activeCopilotSelection\s*=\s*boardingChangeCopilotSelection\s*\|\|\s*copilotSelection/);
  assert.match(routeSource, /sessionStorage\.setItem\(DRIVER_BOARDING_SELECTION_STORAGE_KEY/);
  assert.match(routeSource, /boardingChangeEffects\.find\(\(effect\) => Number\(effect\?\.requestId/);
  assert.equal(routeSource.includes("driver\\/copilot$/u.test(nextPath)"), true);
  assert.match(routeSource, /clearCopilotSelection\("\/driver\/route"\)/u);
});
