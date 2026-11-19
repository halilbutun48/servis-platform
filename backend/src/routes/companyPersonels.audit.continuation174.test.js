import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(new URL("./companyPersonels.js", import.meta.url), "utf8");

test("GeoReview location writes keep a tenant-scoped audit trail without raw address data", () => {
  const bulkStart = source.indexOf('r.post("/bulk-clear"');
  const locationStart = source.indexOf('r.put("/:id/location"');
  assert.ok(bulkStart >= 0, "bulk-clear route must remain present");
  assert.ok(locationStart > bulkStart, "location route must follow bulk-clear route");

  const bulkBlock = source.slice(bulkStart, locationStart);
  assert.match(bulkBlock, /await audit\(req,\s*\{[\s\S]*?action:\s*["']COMPANY_PERSONEL_GEO_BULK_CLEAR["']/);
  assert.match(bulkBlock, /entity:\s*["']Personel["']/);
  assert.match(bulkBlock, /companyId:\s*u\.companyId/);
  assert.match(bulkBlock, /source:\s*["']COMPANY_GEOREVIEW_UI["']/);
  const bulkAuditStart = bulkBlock.indexOf("await audit(req");
  assert.ok(bulkAuditStart >= 0, "bulk audit call must be present");
  assert.doesNotMatch(bulkBlock.slice(bulkAuditStart), /homeAddress|phone/);

  const locationBlock = source.slice(locationStart);
  assert.match(locationBlock, /await audit\(req,\s*\{[\s\S]*?action:\s*["']COMPANY_PERSONEL_GEO_UPDATE["']/);
  assert.match(locationBlock, /entityId:\s*updated\.id/);
  assert.match(locationBlock, /companyId:\s*u\.companyId/);
  assert.match(locationBlock, /hasCoordinates:/);
  assert.match(locationBlock, /source:\s*["']COMPANY_GEOREVIEW_UI["']/);
  const locationAuditStart = locationBlock.indexOf("await audit(req");
  assert.ok(locationAuditStart >= 0, "location audit call must be present");
  assert.doesNotMatch(locationBlock.slice(locationAuditStart), /homeAddress|phone/);
});
