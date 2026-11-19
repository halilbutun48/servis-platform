import test from "node:test";
import assert from "node:assert/strict";
import { buildBoardingChangeRequestView } from "./boardingChangeRequestView.js";

test("boarding change view request türünü oluşturma audit'inden korur", () => {
  const view = buildBoardingChangeRequestView(
    {
      id: 3,
      status: "ACCEPTED",
      personelId: 1,
      lat: 0,
      lng: 0,
      shift: {
        hubLat: 40.99,
        hubLng: 29.02,
        people: [{ id: 1, personelId: 1 }],
        assignments: [],
        stops: [{ id: 47, name: "Dropoff 1", lat: 41.01, lng: 28.97, order: 1 }],
      },
    },
    {
      requestAudit: { meta: { requestKind: "NO_SHOW", nearestStopId: 47, locationProvided: false } },
      decisionAudit: { meta: { decisionState: "COMPANY_ACCEPTED" } },
      applyAudit: { meta: { applicationState: "APPLIED" } },
    },
  );

  assert.equal(view.requestKind, "NO_SHOW");
  assert.equal(view.decisionState, "COMPANY_ACCEPTED");
  assert.equal(view.boardingChangeApplicationStatus, "APPLIED");
});
