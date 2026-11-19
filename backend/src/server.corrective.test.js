import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const serverSource = fs.readFileSync(new URL("./server.js", import.meta.url), "utf8");

test("signal handlers pass a numeric exit code to shutdown", () => {
  assert.match(serverSource, /process\.on\("SIGTERM", \(\) => shutdown\(0\)\);/);
  assert.match(serverSource, /process\.on\("SIGINT", \(\) => shutdown\(0\)\);/);
});
