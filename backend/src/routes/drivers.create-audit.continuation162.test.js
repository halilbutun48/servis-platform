import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(path.join(here, "drivers.js"), "utf8");

test("ROOM driver creation keeps a tenant-scoped audit trail", () => {
  const createStart = source.indexOf('r.post("/", authRequired(), requireRole("ROOM")');
  const resetPinStart = source.indexOf('r.post("/:id/reset-pin"');
  assert.ok(createStart >= 0, "ROOM driver create route must remain present");
  assert.ok(resetPinStart > createStart, "driver create route must precede reset-pin route");

  const createBlock = source.slice(createStart, resetPinStart);
  assert.match(createBlock, /await audit\(req,\s*\{[\s\S]*?action:\s*["']ROOM_DRIVER_CREATE["']/);
  assert.match(createBlock, /entity:\s*["']Driver["']/);
  assert.match(createBlock, /entityId:\s*result\.driver\.id/);
  assert.match(createBlock, /roomId:\s*u\.roomId/);

  const auditStart = createBlock.indexOf("await audit(req");
  const emitStart = createBlock.indexOf("io?.to(`room:${u.roomId}`)");
  assert.ok(auditStart >= 0 && emitStart > auditStart, "create audit must run before the room update event");
  assert.doesNotMatch(createBlock.slice(auditStart, emitStart), /temporaryPin/);
});
