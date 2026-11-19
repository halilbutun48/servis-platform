import test from "node:test";
import assert from "node:assert/strict";
import { resolvePassengerLinksCopilotScopeKey } from "./passengerLinksCopilotSelection.js";

test("passenger links publishes the SCHOOL selected shift under the SCHOOL scope", () => {
  assert.equal(resolvePassengerLinksCopilotScopeKey("/school/access-links"), "/school/access-links");
});

test("passenger links keeps the COMPANY selected shift under the COMPANY scope", () => {
  assert.equal(resolvePassengerLinksCopilotScopeKey("/company/access-links"), "/company/access-links");
  assert.equal(resolvePassengerLinksCopilotScopeKey(""), "/company/access-links");
});
