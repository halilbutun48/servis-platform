import assert from "node:assert/strict";
import test from "node:test";
import { buildActionableEventsForUser } from "./actionableEvents.js";

test("organization company-kind gets organization action paths when session role is COMPANY", async () => {
  const snapshot = await buildActionableEventsForUser({
    id: 7,
    role: "COMPANY",
    companyId: 3,
  });

  assert.equal(snapshot.role, "ORGANIZATION");
  const offerEvent = snapshot.events.find((event) => event.category === "OFFER");
  assert.ok(offerEvent, "isolated organization fixture should expose an open offer event");
  assert.equal(offerEvent.actionPath, "/organization/commercial-flow");
});
