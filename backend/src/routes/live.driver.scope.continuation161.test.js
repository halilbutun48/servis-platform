import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(here, "live.js"), "utf8");

test("DRIVER live vehicles exclude ended approved shifts", () => {
  const driverBranch = source.slice(source.indexOf('if (u.role === "DRIVER")'));
  assert.match(driverBranch, /endAt:\s*\{\s*gt:\s*now\s*\}/u);
});
