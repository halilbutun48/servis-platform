import test from "node:test";
import assert from "node:assert/strict";
import { completeRoomTestSimulatedService } from "./roomTestSimulatedService.js";

const actor = { id: 7, role: "ROOM", roomId: 1 };
const shift = {
  id: 22,
  roomId: 1,
  companyId: 1,
  agreementId: 9,
  vehicleId: 2,
  driverId: 1,
  status: "APPROVED",
  startAt: new Date("2026-11-16T04:00:00.000Z"),
  endAt: new Date("2026-11-16T06:00:00.000Z"),
  agreement: { id: 9, roomId: 1, status: "APPROVED" },
  progress: null,
};

function buildDb({ currentShift = shift, audits = [] } = {}) {
  const state = {
    shift: { ...currentShift, agreement: currentShift?.agreement ? { ...currentShift.agreement } : null, progress: currentShift?.progress ? { ...currentShift.progress } : null },
    audits: audits.map((row) => ({ ...row })),
  };
  const db = {
    state,
    shift: {
      findUnique: async () => state.shift ? { ...state.shift, agreement: state.shift.agreement && { ...state.shift.agreement }, progress: state.shift.progress && { ...state.shift.progress } } : null,
      update: async ({ data }) => {
        state.shift = { ...state.shift, ...data };
        return { ...state.shift };
      },
    },
    shiftProgress: {
      upsert: async ({ update, create }) => {
        state.shift.progress = { ...(state.shift.progress || {}), ...(state.shift.progress ? update : create), shiftId: state.shift.id };
        return { ...state.shift.progress };
      },
    },
    auditLog: {
      findFirst: async ({ where }) => state.audits.find((row) => row.action === where.action && row.entity === where.entity && Number(row.entityId) === Number(where.entityId) && row.meta?.sourceRef === where.meta?.equals) || null,
      create: async ({ data }) => {
        const row = { id: state.audits.length + 1, ...data };
        state.audits.push(row);
        return row;
      },
    },
    $transaction: async (callback) => callback(db),
  };
  return db;
}

const input = {
  userApproval: true,
  dataClass: "TEST_SIMULATED",
  sourceRef: "SEFERPAKT_DEMO_CONT251_SHIFT22",
};

const runtime = { mode: "canonical_demo", nodeEnv: "development" };
const now = new Date("2026-11-16T06:05:00.000Z");

test("canonical DEMO ROOM tamamlanması ShiftProgress ve audit ile idempotent kaydedilir", async () => {
  const db = buildDb();
  const result = await completeRoomTestSimulatedService({ prisma: db, actor, shiftId: 22, input, runtime, now });

  assert.equal(result.idempotent, false);
  assert.equal(result.status, "DONE");
  assert.equal(result.dataClass, "TEST_SIMULATED");
  assert.equal(db.state.shift.status, "DONE");
  assert.equal(db.state.shift.progress.completedAt.toISOString(), now.toISOString());
  assert.equal(db.state.audits.length, 1);
  assert.equal(db.state.audits[0].action, "ROOM_TEST_SIMULATED_SERVICE_COMPLETED");

  const replay = await completeRoomTestSimulatedService({ prisma: db, actor, shiftId: 22, input, runtime, now });
  assert.equal(replay.idempotent, true);
  assert.equal(db.state.audits.length, 1);
});

test("gelecekteki vardiya TEST_SIMULATED tamamlanamaz", async () => {
  const db = buildDb({ currentShift: { ...shift, endAt: new Date("2026-11-16T07:00:00.000Z") } });
  await assert.rejects(
    completeRoomTestSimulatedService({ prisma: db, actor, shiftId: 22, input, runtime, now }),
    (error) => error?.code === "TEST_SIMULATED_SHIFT_NOT_ELAPSED" && error?.status === 409,
  );
  assert.equal(db.state.shift.status, "APPROVED");
  assert.equal(db.state.audits.length, 0);
});

test("TEST_SIMULATED kaynak etiketi, kullanıcı onayı ve ROOM tenant sınırı zorunludur", async () => {
  const db = buildDb();
  await assert.rejects(
    completeRoomTestSimulatedService({ prisma: db, actor: { ...actor, roomId: 2 }, shiftId: 22, input, runtime, now }),
    (error) => error?.code === "TEST_SIMULATED_TENANT_SCOPE_REQUIRED" && error?.status === 403,
  );
  await assert.rejects(
    completeRoomTestSimulatedService({ prisma: buildDb(), actor, shiftId: 22, input: { ...input, userApproval: false }, runtime, now }),
    (error) => error?.code === "EXPLICIT_CONFIRMATION_REQUIRED" && error?.status === 409,
  );
  await assert.rejects(
    completeRoomTestSimulatedService({ prisma: buildDb(), actor, shiftId: 22, input: { ...input, sourceRef: "REAL_FIELD_EVENT" }, runtime, now }),
    (error) => error?.code === "TEST_SIMULATED_SOURCE_REQUIRED" && error?.status === 422,
  );
});
