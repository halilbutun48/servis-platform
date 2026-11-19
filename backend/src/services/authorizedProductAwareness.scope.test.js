import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPersonnelKindScope,
  buildRoomSelectedShiftScope,
  buildRoleScopedShiftNavigationTarget,
  isSelectedAgreementReadContext,
  mergeParentSelectedPersonnelFacts,
  resolveRoleScopedNavigationPath,
} from "./authorizedProductAwareness.js";

test("SCHOOL selected shift navigation stays inside the SCHOOL surface", () => {
  assert.deepEqual(
    buildRoleScopedShiftNavigationTarget("SCHOOL", "/school/shifts", 29),
    {
      path: "/school/shifts",
      label: "Vardiyalar",
      routeParams: { focusShiftId: 29 },
      recordType: "SHIFT",
      recordId: 29,
    },
  );
});

test("COMPANY offer-to-shift navigation stays inside the current role surface", () => {
  assert.equal(resolveRoleScopedNavigationPath("COMPANY", "/company/commercial-flow", "/shifts"), "/company/shifts");
  assert.equal(resolveRoleScopedNavigationPath("ROOM", "/room/offers", "/shifts"), "/room/shifts");
  assert.equal(resolveRoleScopedNavigationPath("SCHOOL", "/school/commercial-flow", "/shifts"), "/school/shifts");
  assert.equal(resolveRoleScopedNavigationPath("ORGANIZATION", "/organization/commercial-flow", "/shifts"), "/organization/shifts");
});

test("selected organization agreement read bypasses only the commercial help boundary", () => {
  const screenContext = {
    selectedEntityType: "agreement",
    selectedEntityId: 13,
  };
  const allowedPlan = { requestedDomains: ["AGREEMENTS", "SHIFTS"] };
  const unsafePlan = { requestedDomains: ["AGREEMENTS", "FINANCE"] };

  assert.equal(isSelectedAgreementReadContext({
    role: "ORGANIZATION",
    screenContext,
    semanticPlan: allowedPlan,
  }), true);
  assert.equal(isSelectedAgreementReadContext({
    role: "ORGANIZATION",
    screenContext,
    semanticPlan: unsafePlan,
  }), false);
  assert.equal(isSelectedAgreementReadContext({
    role: "COMPANY",
    screenContext,
    semanticPlan: allowedPlan,
  }), false);
});

test("ROOM selected market shift keeps tenant scope through its active offer", () => {
  assert.deepEqual(buildRoomSelectedShiftScope(21), {
    OR: [
      { roomId: 21 },
      { offers: { some: { roomId: 21, status: { in: ["OPEN", "COUNTERED", "ACCEPTED"] } } } },
    ],
  });
});

test("ROOM selected shift scope never creates a global market read", () => {
  const scope = buildRoomSelectedShiftScope(21);
  assert.equal(scope.OR.some((branch) => Object.keys(branch).length === 0), false);
  assert.equal(scope.OR[1].offers.some.roomId, 21);
});

test("PARENT selected personnel status keeps the authorized identity and live-operation evidence together", () => {
  const merged = mergeParentSelectedPersonnelFacts(
    {
      count: 1,
      facts: [{ personelId: 2, personLabel: "Demo öğrenci", text: "Öğrenci: Demo öğrenci", evidence: ["personel.id=2"] }],
      records: ["Öğrenci: Demo öğrenci"],
      nextAction: "Kişi kaydını kontrol et.",
    },
    {
      facts: [{ personelId: 2, statusText: "Aktif servis görünmüyor", noLiveVehicle: true, text: "Araç: 0", evidence: ["parent.liveVehicle=none"] }],
      nextAction: "Servis saati veya araç atamasını kontrol et.",
    },
  );

  assert.equal(merged.facts[0].statusText, "Aktif servis görünmüyor");
  assert.equal(merged.facts[0].noLiveVehicle, true);
  assert.match(merged.records[0], /Aktif servis görünmüyor/iu);
  assert.equal(merged.nextAction, "Servis saati veya araç atamasını kontrol et.");
});

test("PARENT selected personnel merge never invents a fact for an unauthorized child", () => {
  const source = { count: 0, facts: [], records: [] };
  const merged = mergeParentSelectedPersonnelFacts(source, {
    facts: [{ personelId: 999, statusText: "Aktif servis görünmüyor" }],
  });

  assert.deepEqual(merged, source);
});

test("PARENT selected child scope accepts linked STUDENT and PERSONEL rows", () => {
  assert.deepEqual(buildPersonnelKindScope("PARENT", "PERSONNEL"), {});
  assert.deepEqual(buildPersonnelKindScope("PARENT", "STUDENT"), {});
  assert.deepEqual(buildPersonnelKindScope("ROOM", "PERSONNEL"), { kind: "PERSONEL" });
  assert.deepEqual(buildPersonnelKindScope("COMPANY", "STUDENT"), { kind: "STUDENT" });
});
