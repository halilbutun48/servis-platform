import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const dashboardBulk = fs.readFileSync(path.join(repoRoot, "backend/src/services/dashboardBulk.js"), "utf8");
const commercialCore = fs.readFileSync(path.join(repoRoot, "backend/src/ops/commercialCoreManifest.js"), "utf8");

function must(label, condition) {
  if (!condition) throw new Error(`FAIL ${label}`);
  console.log(`OK ${label}`);
}

must(
  "room commercial items are wrapped as an items section before safeSection",
  /safeSection\(\s*["']items["']\s*,\s*async\s*\(\)\s*=>\s*\(\{\s*items:\s*await\s+buildRoomCommercialItems\(user\)\s*\}\)/u.test(dashboardBulk),
);
must(
  "room commercial agreement items preserve the typed agreement identity",
  /id:\s*`agreement-\$\{a\.id\}`,[\s\S]*?agreementId:\s*a\.id/u.test(commercialCore),
);
must(
  "room commercial agreement items do not require a synthetic screen identity",
  !/agreementItems[\s\S]*?entityType:\s*["']screen["']/u.test(commercialCore),
);
must(
  "room commercial bundle serializes the section items array",
  /items:\s*\{[\s\S]*?items:\s*safeArray\(items\.items\)/u.test(dashboardBulk),
);
must(
  "room operation health drivers are wrapped as an items section",
  /safeSection\(\s*["']drivers["']\s*,\s*async\s*\(\)\s*=>\s*\(\{\s*items:\s*await\s+buildRoomObservabilityDrivers\(user\)\s*\}\)/u.test(dashboardBulk),
);
must(
  "room operation health issues are wrapped as an items section",
  /safeSection\(\s*["']issues["']\s*,\s*async\s*\(\)\s*=>\s*\(\{\s*items:\s*await\s+buildRoomObservabilityIssues\(user\)\s*\}\)/u.test(dashboardBulk),
);

console.log("ROOM COMMERCIAL FLOW ITEMS BINDING CHECK PASS");
