import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(new URL("./companyHub.js", import.meta.url), "utf8");

test("company hub updates keep an audit trail without raw address data", () => {
  const putStart = source.indexOf('r.put("/",');
  assert.ok(putStart >= 0, "company hub update route must remain present");

  const putBlock = source.slice(putStart);
  assert.match(putBlock, /await audit\(req,\s*\{[\s\S]*?action:\s*["']COMPANY_HUB_UPDATE["']/);
  assert.match(putBlock, /entity:\s*["']Company["']/);
  assert.match(putBlock, /entityId:\s*updated\.id/);
  assert.match(putBlock, /source:\s*["']COMPANY_HUB_UI["']/);
  assert.doesNotMatch(putBlock, /addressLine|rawAddress|geocodeQuery/);
});
