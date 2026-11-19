import assert from "node:assert/strict";
import test from "node:test";

import { resolveSemanticIntent } from "../ai/chat/semanticIntentPlanner.js";
import {
  buildDriverShiftNavigationTarget,
  composeMultiPartExecutionReply,
} from "./authorizedProductAwareness.js";

const schoolUser = {
  id: 7,
  role: "COMPANY",
  companyId: 2,
  companyKind: "SCHOOL",
};

const selectedSchoolShift = {
  path: "/school/shifts",
  label: "Vardiyalar",
  selectedEntity: { id: 29, type: "SHIFT" },
  selectedLabel: "Vardiya #29",
  selectedEntityPresent: true,
};

test("selected school shift passenger question stays in the selected record context", () => {
  const plan = resolveSemanticIntent({
    user: schoolUser,
    message: "Bu serviste hangi öğrenciler var?",
    screenContext: selectedSchoolShift,
  });

  assert.equal(plan.family, "ENTITY_LOOKUP");
  assert.equal(plan.typedRequest?.taskType, "FIELD_LOOKUP");
  assert.equal(plan.typedRequest?.domain, "OPERATIONS");
  assert.equal(plan.entity?.type, "shift");
  assert.equal(plan.entity?.id, 29);
  assert.deepEqual(plan.requestedFields, [{ key: "PASSENGER_LIST", domain: "OPERATIONS" }]);
});

test("authorized selected shift passenger reply is grounded and role-scoped", () => {
  const result = composeMultiPartExecutionReply({
    role: "SCHOOL",
    plan: {
      entity: { type: "shift", id: 29 },
      requestedFields: [{ key: "PASSENGER_LIST", domain: "OPERATIONS" }],
    },
    execution: {
      items: [{
        domain: "OPERATIONS",
        status: "RESOLVED",
        facts: [{
          shiftId: 29,
          passengerCount: 2,
          passengers: [
            { personelId: 2, fullName: "Student One", kind: "STUDENT" },
            { personelId: 3, fullName: "Student Two", kind: "STUDENT" },
          ],
        }],
      }],
    },
    baseReply: "Vardiya okundu.",
  });

  assert.match(result.reply, /Vardiya #29/iu);
  assert.match(result.reply, /Student One/iu);
  assert.match(result.reply, /Student Two/iu);
  assert.doesNotMatch(result.reply, /genel|rolünde|OFF_TOPIC/iu);
});

test("driver does not receive the school-only selected passenger list composer", () => {
  const result = composeMultiPartExecutionReply({
    role: "DRIVER",
    plan: {
      entity: { type: "shift", id: 29 },
      requestedFields: [{ key: "PASSENGER_LIST", domain: "OPERATIONS" }],
    },
    execution: {
      items: [{
        domain: "OPERATIONS",
        status: "RESOLVED",
        facts: [{ shiftId: 29, passengerCount: 2, passengers: [{ fullName: "Student One" }] }],
      }],
    },
    baseReply: "Bu görev için öğrenci listesi yetkili kapsamda gösterilmiyor.",
  });

  assert.equal(result.reply, "Bu görev için öğrenci listesi yetkili kapsamda gösterilmiyor.");
});

test("driver selected-shift navigation targets the authorized route surface", () => {
  const target = buildDriverShiftNavigationTarget({
    user: { id: 9, role: "DRIVER" },
    screenContext: {
      path: "/driver/today",
      selectedEntityType: "SHIFT",
      selectedEntityId: 19,
    },
  });

  assert.equal(target?.path, "/driver/route");
  assert.equal(target?.label, "Rota");
  assert.deepEqual(target?.routeParams, { shift: 19 });
  assert.equal(target?.recordType, "SHIFT");
  assert.equal(target?.recordId, 19);
});
