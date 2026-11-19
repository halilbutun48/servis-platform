import assert from "node:assert/strict";
import test from "node:test";

import { validateGuidedHubCoordinates } from "./guidedPlanModalCoordinates.js";
import {
  buildGuidedDraftCopilotSelection,
  buildGuidedResumeCompanyOfferPatch,
  buildGuidedResumeFormState,
} from "./guidedPlanModalUtils.js";

test("guided plan does not persist an empty service location", () => {
  assert.deepEqual(validateGuidedHubCoordinates("", ""), {
    ok: false,
    message: "Önce hizmet konumunu belirle.",
  });
});

test("guided plan keeps latitude and longitude as a pair", () => {
  assert.deepEqual(validateGuidedHubCoordinates("41.01", ""), {
    ok: false,
    message: "Konum enlem ve boylamı birlikte olmalı.",
  });
});

test("guided plan accepts a valid non-zero coordinate pair", () => {
  assert.deepEqual(validateGuidedHubCoordinates("41.01", "29.01"), {
    ok: true,
    hubLat: 41.01,
    hubLng: 29.01,
  });
});

test("guided draft resume restores the server-owned schedule, capacity and stops", () => {
  const restored = buildGuidedResumeFormState({
    id: 35,
    startAt: "2026-11-16T14:00:00.000Z",
    endAt: "2026-11-16T16:00:00.000Z",
    hubLat: 41.025,
    hubLng: 28.989,
    requiredPaxOverride: 4,
    direction: "OUTBOUND",
    pattern: "LOOP",
    stops: [
      { name: "Demo Destinasyon A", lat: 41.048, lng: 28.82 },
      { name: "Demo Destinasyon B", lat: 40.976, lng: 28.824 },
    ],
  });

  assert.equal(restored.packKey, "WK_EVENING");
  assert.equal(restored.startDate, "2026-11-16");
  assert.equal(restored.endDate, "2026-11-16");
  assert.equal(restored.orgEstimatedPax, "4");
  assert.equal(restored.orgReturnType, "RETURN_TO_START");
  assert.deepEqual(restored.orgDestinations.map((item) => [item.title, item.lat, item.lng]), [
    ["Demo Destinasyon A", "41.048", "28.82"],
    ["Demo Destinasyon B", "40.976", "28.824"],
  ]);
});

test("guided draft resume publishes the selected shift context for Sefer Abi", () => {
  const selection = buildGuidedDraftCopilotSelection(
    {
      id: 35,
      status: "DRAFT",
      requiredPaxOverride: 4,
      stops: [{ name: "Demo Destinasyon A" }, { name: "Demo Destinasyon B" }],
    },
    { screenType: "SHIFTS", selectedRecordStatus: "Durum: DRAFT" }
  );

  assert.equal(selection.entityType, "shift");
  assert.equal(selection.entityId, 35);
  assert.equal(selection.selectedRecordLabel, "Taslak vardiya #35");
  assert.equal(selection.summary, "Taslak vardiya #35 • Durum DRAFT • 2 durak");
  assert.equal(selection.facts.selectedRecordId, 35);
  assert.equal(selection.badges[1].value, "DEMO");
  assert.equal(buildGuidedDraftCopilotSelection({ id: 0 }), null);
});

test("guided draft resume persists entered company budget without clearing omitted fields", () => {
  assert.deepEqual(
    buildGuidedResumeCompanyOfferPatch({
      draftAmount: "12000",
      draftNote: "TEST_SIMULATED plan",
    }),
    {
      companyOfferAmount: 1200000,
      companyOfferNote: "TEST_SIMULATED plan",
    },
  );

  assert.deepEqual(buildGuidedResumeCompanyOfferPatch({ draftAmount: "", draftNote: "" }), {});
});
