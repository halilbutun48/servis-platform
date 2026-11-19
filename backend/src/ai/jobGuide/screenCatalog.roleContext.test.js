import assert from "node:assert/strict";
import test from "node:test";
import { resolveAuthorizedScreenContext } from "./screenCatalog.js";

test("SCHOOL finans rehberi okul bağlamını korur", () => {
  const result = resolveAuthorizedScreenContext(
    { role: "COMPANY", companyKind: "SCHOOL", companyId: 7 },
    { path: "/school/financial-operations" },
  );

  assert.equal(result.status, "FOUND");
  assert.equal(result.effectiveRoleKey, "SCHOOL");
  assert.match(result.screen.menuPurpose, /okul/i);
  assert.doesNotMatch(result.screen.menuPurpose, /şirket bütçe|hizmet alan firma/i);
  assert.match(result.screen.forWhom, /okul/i);
});

test("ORGANIZATION finans rehberi organizasyon bağlamını korur", () => {
  const result = resolveAuthorizedScreenContext(
    { role: "COMPANY", companyKind: "ORGANIZATION", companyId: 8 },
    { path: "/organization/financial-operations" },
  );

  assert.equal(result.status, "FOUND");
  assert.equal(result.effectiveRoleKey, "ORGANIZATION");
  assert.match(result.screen.menuPurpose, /organizasyon/i);
  assert.doesNotMatch(result.screen.menuPurpose, /şirket bütçe|hizmet alan firma/i);
  assert.match(result.screen.forWhom, /organizasyon/i);
});
