import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

const source = fs.readFileSync(new URL("./companies.js", import.meta.url), "utf8");

test("SUPER_ADMIN company writes keep a safe audit trail", () => {
  assert.match(source, /import \{ audit \} from "\.\.\/audit\.js"/);

  const createStart = source.indexOf('r.post("/"');
  const readStart = source.indexOf('r.get("/:id"');
  const updateStart = source.indexOf('r.put("/:id"');
  const deleteStart = source.indexOf('r.delete("/:id"');
  assert.ok(createStart >= 0 && readStart > createStart && updateStart > readStart && deleteStart > updateStart);

  const createBlock = source.slice(createStart, readStart);
  const updateBlock = source.slice(updateStart, deleteStart);
  const deleteBlock = source.slice(deleteStart);

  for (const [block, action] of [
    [createBlock, "ADMIN_COMPANY_CREATE"],
    [updateBlock, "ADMIN_COMPANY_UPDATE"],
    [deleteBlock, "ADMIN_COMPANY_DELETE"],
  ]) {
    assert.match(block, new RegExp(`await audit\\(req,[\\s\\S]*?action: "${action}"`));
    assert.match(block, /entity: "Company"/);
    assert.match(block, /entityId: item\.id/);
    assert.match(block, /source: "SUPER_ADMIN_COMPANIES_UI"/);
  }

  const auditStart = updateBlock.indexOf("await audit(req");
  assert.ok(auditStart >= 0);
  assert.doesNotMatch(updateBlock.slice(auditStart), /item\.(?:addressLine|contactPhone|contactEmail|taxNo|taxOffice|legalName|notes)/);
});
