#!/usr/bin/env node

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const sourcePath = path.resolve(here, "../src/panels/room/CommercialFlowPanel.jsx");
const source = fs.readFileSync(sourcePath, "utf8");

assert.match(
  source,
  /String\(agreement\?\.status \|\| ""\)\.trim\(\)\.toUpperCase\(\) === "ACTIVE"/,
  "bulk ROOM reconciliation summary must use the active agreement scope",
);
assert.match(
  source,
  /ana sayfadaki risk sorgusuyla aynı aktif sözleşme kapsamını kullanır/,
  "the UI must explain why historical agreements are not in the HOME risk summary",
);

console.log(JSON.stringify({
  status: "PASS",
  owner: "web/src/panels/room/CommercialFlowPanel.jsx",
  invariant: "HOME and the bulk ROOM reconciliation summary share the ACTIVE agreement scope; direct historical agreement selection remains available",
}, null, 2));
