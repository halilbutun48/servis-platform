import test from "node:test";
import assert from "node:assert/strict";
import { resolveAgreementCopilotRoute } from "../../utils/agreementCopilotRoute.js";
import { canReadReconciliationPreview } from "./companyAgreementsPanelHelpers.js";

test("sözleşme Copilot bağlamı COMPANY, SCHOOL ve ORGANIZATION rotasını korur", () => {
  assert.equal(resolveAgreementCopilotRoute("/company/agreements"), "/company/agreements");
  assert.equal(resolveAgreementCopilotRoute("/school/agreements"), "/school/agreements");
  assert.equal(resolveAgreementCopilotRoute("/organization/agreements?focusAgreementId=5"), "/organization/agreements");
});

test("bilinmeyen sözleşme rotası güvenli COMPANY varsayılanına döner", () => {
  assert.equal(resolveAgreementCopilotRoute("/organization/copilot"), "/company/agreements");
  assert.equal(resolveAgreementCopilotRoute(""), "/company/agreements");
});

test("mutabakat önizlemesi yalnız yetkili ROOM ve COMPANY görünümünde açılır", () => {
  assert.equal(canReadReconciliationPreview({ role: "ROOM" }), true);
  assert.equal(canReadReconciliationPreview({ role: "COMPANY", companyKind: "COMPANY" }), true);
  assert.equal(canReadReconciliationPreview({ role: "COMPANY", companyKind: "SCHOOL" }), false);
  assert.equal(canReadReconciliationPreview({ role: "COMPANY", companyKind: "ORGANIZATION" }), false);
  assert.equal(canReadReconciliationPreview({ role: "SCHOOL", companyKind: "SCHOOL" }), false);
});
