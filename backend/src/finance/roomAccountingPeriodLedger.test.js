import test from "node:test";
import assert from "node:assert/strict";
import {
  ensureAccountingPeriod,
  transitionAccountingPeriodRecord,
} from "./roomAccountingPeriodLedger.js";

function fakePrisma() {
  const rows = [];
  let nextId = 1;
  const client = {
    rows,
    roomAccountingPeriod: {
      findUnique: async ({ where }) => rows.find((row) => (
        where.id
          ? row.id === Number(where.id)
          : row.roomId === Number(where.roomId_periodStart_periodEnd?.roomId)
            && String(row.periodStart instanceof Date ? row.periodStart.toISOString().slice(0, 10) : row.periodStart) === String(where.roomId_periodStart_periodEnd.periodStart instanceof Date ? where.roomId_periodStart_periodEnd.periodStart.toISOString().slice(0, 10) : where.roomId_periodStart_periodEnd.periodStart)
            && String(row.periodEnd instanceof Date ? row.periodEnd.toISOString().slice(0, 10) : row.periodEnd) === String(where.roomId_periodStart_periodEnd.periodEnd instanceof Date ? where.roomId_periodStart_periodEnd.periodEnd.toISOString().slice(0, 10) : where.roomId_periodStart_periodEnd.periodEnd)
      )) || null,
      create: async ({ data }) => {
        const row = { id: nextId++, ...data, version: 1, createdAt: new Date(), updatedAt: new Date() };
        rows.push(row);
        return row;
      },
      updateMany: async ({ where, data }) => {
        const row = rows.find((item) => item.id === Number(where.id) && item.version === Number(where.version));
        if (!row) return { count: 0 };
        Object.assign(row, data, { updatedAt: new Date() });
        return { count: 1 };
      },
      update: async ({ where, data }) => {
        const row = rows.find((item) => item.id === Number(where.id));
        Object.assign(row, data, { updatedAt: new Date() });
        return row;
      },
    },
  };
  client.$transaction = async (callback) => callback(client);
  return client;
}

const actor = { id: 7, role: "ROOM", roomId: 1 };

test("ensures a room-scoped open accounting period without accepting a close policy", async () => {
  const prisma = fakePrisma();
  const period = await ensureAccountingPeriod({
    prisma,
    actor,
    roomId: 1,
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
  });

  assert.equal(period.status, "OPEN");
  assert.equal(period.roomId, 1);
  assert.equal(period.periodStart, "2026-09-01");
  assert.equal(period.periodEnd, "2026-09-30");
});

test("transitions open to review and ready-to-close with an audit callback", async () => {
  const prisma = fakePrisma();
  const audits = [];
  const audit = async (_req, payload) => audits.push(payload);

  const review = await transitionAccountingPeriodRecord({
    prisma,
    actor,
    roomId: 1,
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
    targetStatus: "REVIEW",
    confirmed: true,
    readiness: { blockers: [] },
    audit,
    req: { user: actor },
  });
  const ready = await transitionAccountingPeriodRecord({
    prisma,
    actor,
    roomId: 1,
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
    targetStatus: "READY_TO_CLOSE",
    confirmed: true,
    readiness: { blockers: [] },
    audit,
    req: { user: actor },
  });

  assert.equal(review.status, "REVIEW");
  assert.equal(ready.status, "READY_TO_CLOSE");
  assert.deepEqual(audits.map((item) => item.action), [
    "ROOM_ACCOUNTING_PERIOD_CREATED",
    "ROOM_ACCOUNTING_PERIOD_REVIEW_STARTED",
    "ROOM_ACCOUNTING_PERIOD_READY_TO_CLOSE",
  ]);
});

test("rejects cross-tenant period access and closed transition without policy approval", async () => {
  const prisma = fakePrisma();
  await assert.rejects(
    ensureAccountingPeriod({ prisma, actor: { ...actor, roomId: 2 }, roomId: 1, periodStart: "2026-09-01", periodEnd: "2026-09-30" }),
    (error) => error.code === "ACCOUNTING_PERIOD_ROOM_SCOPE_REQUIRED",
  );

  await transitionAccountingPeriodRecord({
    prisma,
    actor,
    roomId: 1,
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
    targetStatus: "REVIEW",
    confirmed: true,
    readiness: { blockers: [] },
  });
  await transitionAccountingPeriodRecord({
    prisma,
    actor,
    roomId: 1,
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
    targetStatus: "READY_TO_CLOSE",
    confirmed: true,
    readiness: { blockers: [] },
  });

  const result = await transitionAccountingPeriodRecord({
    prisma,
    actor,
    roomId: 1,
    periodStart: "2026-09-01",
    periodEnd: "2026-09-30",
    targetStatus: "CLOSED",
    confirmed: true,
    readiness: { blockers: [] },
    policyApproved: false,
  }).catch((error) => error);
  assert.equal(result.code, "ACCOUNTING_POLICY_APPROVAL_REQUIRED");
});
