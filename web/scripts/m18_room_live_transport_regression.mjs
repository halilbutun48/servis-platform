import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.resolve(here, "../src/live/ws.js"), "utf8");

assert.match(
  source,
  /transports:\s*\[\s*["']polling["']\s*,\s*["']websocket["']\s*\]/,
  "ROOM live client must keep Socket.IO polling available before websocket upgrade",
);
assert.doesNotMatch(
  source,
  /transports:\s*\[\s*["']websocket["']\s*\]/,
  "ROOM live client must not be websocket-only",
);

console.log("M18 ROOM live transport regression: PASS");
