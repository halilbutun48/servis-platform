import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(new URL("./rooms.js", import.meta.url), "utf8");

test("ROOM hub updates keep a tenant-scoped audit trail without raw address data", () => {
  const hubStart = source.indexOf('r.put("/:id/hub"');
  const deleteStart = source.indexOf('r.delete("/:id"');
  assert.ok(hubStart >= 0, "hub update route must remain present");
  assert.ok(deleteStart > hubStart, "hub update route must precede room delete route");

  const hubBlock = source.slice(hubStart, deleteStart);
  assert.match(hubBlock, /await audit\(req,\s*\{[\s\S]*?action:\s*["']ROOM_HUB_UPDATE["']/);
  assert.match(hubBlock, /entity:\s*["']Room["']/);
  assert.match(hubBlock, /entityId:\s*updated\.id/);
  assert.match(hubBlock, /source:\s*["']ROOM_HUB_UI["']/);
  assert.doesNotMatch(hubBlock, /addressLine|rawAddress|geocodeQuery/);
});
