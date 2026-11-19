import test from "node:test";
import assert from "node:assert/strict";
import { buildCompanyCheckinCopilotSelection } from "./checkinCopilotSelection.js";

test("company check-in binds Sefer Abi to the selected shift and its visible vehicle/driver facts", () => {
  const selection = buildCompanyCheckinCopilotSelection({
    shift: {
      id: 27,
      status: "APPROVED",
      vehicle: { plate: "34ABC126" },
      driver: { fullName: "Driver One" },
    },
    counts: { BOARD: 0, ALIGHT: 0 },
  });

  assert.equal(selection.scopeKey, "/company/checkin");
  assert.equal(selection.entityType, "shift");
  assert.equal(selection.entityId, 27);
  assert.equal(selection.facts.selectedShiftId, 27);
  assert.equal(selection.facts.vehiclePlate, "34ABC126");
  assert.equal(selection.facts.driverName, "Driver One");
  assert.match(selection.summary, /Araç 34ABC126/);
  assert.match(selection.summary, /Sürücü Driver One/);
});

test("company check-in clears selection when no shift is selected", () => {
  assert.equal(buildCompanyCheckinCopilotSelection({ shift: null }), null);
});

test("school and organization check-in keep their own route scopes", () => {
  const school = buildCompanyCheckinCopilotSelection({ shift: { id: 29, status: "APPROVED" }, scopeKey: "/school/checkin" });
  const organization = buildCompanyCheckinCopilotSelection({ shift: { id: 29, status: "APPROVED" }, scopeKey: "/organization/checkin" });
  assert.equal(school.scopeKey, "/school/checkin");
  assert.equal(organization.scopeKey, "/organization/checkin");
});
