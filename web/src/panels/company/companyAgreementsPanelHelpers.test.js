import test from "node:test";
import assert from "node:assert/strict";
import { resolveAgreementCopilotRoute } from "../../utils/agreementCopilotRoute.js";

test("sözleşme Copilot bağlamı COMPANY, SCHOOL ve ORGANIZATION rotasını korur", () => {
  assert.equal(resolveAgreementCopilotRoute("/company/agreements"), "/company/agreements");
  assert.equal(resolveAgreementCopilotRoute("/school/agreements"), "/school/agreements");
  assert.equal(resolveAgreementCopilotRoute("/organization/agreements?focusAgreementId=5"), "/organization/agreements");
});

test("bilinmeyen sözleşme rotası güvenli COMPANY varsayılanına döner", () => {
  assert.equal(resolveAgreementCopilotRoute("/organization/copilot"), "/company/agreements");
  assert.equal(resolveAgreementCopilotRoute(""), "/company/agreements");
});
