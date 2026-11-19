import test from "node:test";
import assert from "node:assert/strict";
import { buildPlanningFlowProgress } from "./planningFlowProgress.js";

const completeShift = {
  startAt: "2026-11-10T06:00:00.000Z",
  endAt: "2026-11-10T08:00:00.000Z",
  companyOfferAmount: 1000000,
  routeSnapshotValidatedAt: "2026-11-07T00:00:00.000Z",
  routeSnapshotDistanceM: 12000,
  routeSnapshotDurationSec: 900,
  stops: [{ id: 1 }],
  offers: [{ id: 1, status: "OPEN" }],
};

test("planning flow follows the seven user steps and canonical record evidence", () => {
  const progress = buildPlanningFlowProgress({
    hub: { hubLat: 41, hubLng: 29 },
    personels: [{ id: 1, geoStatus: "OK" }],
    shifts: [completeShift],
  });

  assert.deepEqual(progress.steps.map((step) => step.label), [
    "Konum / hizmet bölgesi",
    "Çalışma günleri ve saatleri",
    "Personel listesi",
    "Durakları oluştur / getir",
    "Durakları sırala ve OSRM rotasını optimize et",
    "Talep bütçesi",
    "Taşımacılık firmalarını seç ve toplu teklif gönder",
  ]);
  assert.equal(progress.allDone, true);
  assert.equal(progress.nextStep, null);
});

test("missing route evidence becomes the next action", () => {
  const progress = buildPlanningFlowProgress({
    hub: { hubLat: 41, hubLng: 29 },
    personels: [{ id: 1 }],
    shifts: [{
      startAt: "2026-11-10T06:00:00.000Z",
      endAt: "2026-11-10T08:00:00.000Z",
      companyOfferAmount: 1000000,
      stops: [{ id: 1 }],
      offers: [],
    }],
  });

  assert.equal(progress.nextStep.key, "route");
  assert.equal(progress.nextStepIndex, 4);
  assert.equal(progress.steps[0].done, true);
  assert.equal(progress.steps[5].done, true);
  assert.equal(progress.steps[6].done, false);
});

test("empty records never appear completed", () => {
  const progress = buildPlanningFlowProgress();

  assert.equal(progress.allDone, false);
  assert.equal(progress.nextStep.key, "location");
  assert.equal(progress.steps.every((step) => step.done === false), true);
});
