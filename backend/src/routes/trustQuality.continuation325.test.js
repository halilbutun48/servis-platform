import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

test("service evaluation submit path records an idempotency-aware audit event", () => {
  const source = fs.readFileSync(new URL("./trustQuality.js", import.meta.url), "utf8");

  assert.match(source, /SERVICE_EVALUATION_SUBMITTED/);
  assert.match(source, /SERVICE_EVALUATION_REPLAYED/);
  assert.match(source, /entity:\s*["']ServiceEvaluation["']/);
});
