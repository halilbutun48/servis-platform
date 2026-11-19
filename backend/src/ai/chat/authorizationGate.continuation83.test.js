import assert from "node:assert/strict";
import test from "node:test";

import { getRoleDomainCapabilities } from "./semanticIntentPlanner.js";

test("SCHOOL seçili vardiyanın yetkili sürücü alanını okuyabilir", () => {
  const result = getRoleDomainCapabilities({
    role: "COMPANY",
    companyKind: "SCHOOL",
    companyId: 2,
  });

  assert.equal(result.role, "SCHOOL");
  assert.equal(result.capabilities.VEHICLES, "ALLOW_READ");
  assert.equal(result.capabilities.DRIVERS, "ALLOW_READ");
});

test("SCHOOL sürücü okuması tenant erişimini genişletmez", () => {
  const result = getRoleDomainCapabilities({
    role: "COMPANY",
    companyKind: "SCHOOL",
    companyId: 2,
  });

  assert.equal(result.capabilities.TENANT_ACCESS, undefined);
  assert.equal(result.capabilities.PERSONNEL, "ALLOW_READ");
});

test("ORGANIZATION seçili sözleşme okumasını kendi tenant kaydıyla sınırlar", () => {
  const result = getRoleDomainCapabilities({
    role: "COMPANY",
    companyKind: "ORGANIZATION",
    companyId: 1,
  });

  assert.equal(result.role, "ORGANIZATION");
  assert.equal(result.capabilities.AGREEMENTS, "CONDITIONAL_RECORD_SCOPE");
  assert.notEqual(result.capabilities.AGREEMENTS, "ALLOW_READ");
});
