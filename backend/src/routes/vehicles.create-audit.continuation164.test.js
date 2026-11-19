import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(new URL("./vehicles.js", import.meta.url), "utf8");

test("ROOM vehicle create keeps a tenant-scoped audit trail without sensitive GPS data", () => {
  assert.match(source, /action:\s*["']ROOM_VEHICLE_CREATE["']/);
  assert.match(source, /entity:\s*["']Vehicle["']/);
  assert.match(source, /entityId:\s*vehicle\.id/);
  assert.match(source, /source:\s*["']ROOM_MANAGEMENT_UI["']/);
  const auditBlock = source.match(/await audit\(req,\s*\{[\s\S]*?\n\s*\}\);/)?.[0] || "";
  assert.doesNotMatch(auditBlock, /temporaryPin|pin|gpsLast|homeAddress/);
});
