import test from "node:test";
import assert from "node:assert/strict";
import { buildAppliedEffect } from "./boardingChangeRouteRefresh.js";

test("driver route effect request türünü hatalı apply audit türüne ezdirmez", () => {
  const effect = buildAppliedEffect({
    request: {
      id: 3,
      shiftId: 19,
      personelId: 1,
      personel: { fullName: "Personel One" },
    },
    requestMeta: {
      requestKind: "NO_SHOW",
      requestReason: "Bugün binmeyeceğim",
    },
    applyAudit: {
      id: 1626,
      createdAt: "2026-11-11T12:30:45.482Z",
      meta: {
        requestKind: "DIFFERENT_STOP",
        changeType: "ALTERNATE_STOP_TODAY",
        applicationState: "APPLIED",
        oldStop: { label: "Dropoff 2" },
        newStop: { label: "Dropoff 1" },
        stopAssignmentEffect: { action: "UPDATE_SINGLE", assignmentId: 96, stopId: 47 },
      },
    },
  });

  assert.equal(effect.changeType, "NO_SERVICE_TODAY");
  assert.equal(effect.effectLabel, "Bugün binmeyecek");
  assert.equal(effect.oldStopLabel, "");
  assert.equal(effect.newStopLabel, "");
  assert.equal(effect.stopAssignmentEffect, null);
  assert.ok(effect.warnings.some((item) => item.includes("günlük atama onarımı gerekiyor")));
});
