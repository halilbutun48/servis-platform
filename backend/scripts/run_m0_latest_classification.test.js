import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

test("M0 static-only runner classifies browser/network checks as integration", () => {
  const result = spawnSync(process.execPath, [
    "backend/scripts/run_m0_latest.js",
    "--static-only",
    "--from",
    "m18_h03_basic_help_service_01_check",
    "--to",
    "m18_h03_basic_help_service_01_check",
    "--continue",
  ], { encoding: "utf8" });
  const output = `${result.stdout || ""}\n${result.stderr || ""}`;
  assert.equal(result.status, 0, output);
  assert.match(output, /PASS: 0  FAIL: 0  SKIP: 1/u, output);
});
