import { prisma as defaultPrisma } from "../src/prisma.js";

const COVERAGE_MARKER = "M18_DEMO_ROOM_HAKEDIS_COVERAGE_V1";

const SCENARIO_MARKERS = Object.freeze({
  noOperation: "M18_DEMO_FINANCE_NO_OPERATION",
  reviewRequired: "M18_DEMO_FINANCE_REVIEW_REQUIRED",
});

const TENANT = Object.freeze({
  companyId: 1,
  roomId: 1,
  vehicleId: 1,
  driverId: 1,
});

const SCENARIOS = {
  noOperation: {
    ...TENANT,
    key: "noOperation",
    marker: SCENARIO_MARKERS.noOperation,
    expectedStatus: "NO_OPERATION",
    hasOperationEvidence: false,
    agreementStart: new Date("2031-03-01T00:00:00.000Z"),
    agreementEnd: new Date("2031-03-31T00:00:00.000Z"),
    periodStart: new Date("2031-03-01T00:00:00.000Z"),
    periodEnd: new Date("2031-03-31T00:00:00.000Z"),
    hakedisAmountMinor: 9500000,
    invoiceAmountMinor: 9500000,
    hakedisSource: "INTERNAL_ACTUAL",
    invoiceSource: "INTERNAL_ACTUAL",
    shiftStart: null,
    shiftEnd: null,
  },
  reviewRequired: {
    ...TENANT,
    key: "reviewRequired",
    marker: SCENARIO_MARKERS.reviewRequired,
    expectedStatus: "REVIEW_REQUIRED",
    hasOperationEvidence: true,
    agreementStart: new Date("2031-04-01T00:00:00.000Z"),
    agreementEnd: new Date("2031-04-30T00:00:00.000Z"),
    periodStart: new Date("2031-04-01T00:00:00.000Z"),
    periodEnd: new Date("2031-04-30T00:00:00.000Z"),
    hakedisAmountMinor: 9750000,
    invoiceAmountMinor: 9750000,
    hakedisSource: "DEMO_FIXTURE",
    invoiceSource: "DEMO_FIXTURE",
    shiftStart: new Date("2031-04-04T08:00:00.000Z"),
    shiftEnd: new Date("2031-04-04T09:00:00.000Z"),
  },
};

function agreementNote(scenario) {
  return `${COVERAGE_MARKER}:${scenario.marker}`;
}

function roomNote(scenario) {
  return `${agreementNote(scenario)}:ROOM_ACCEPTED`;
}

function shiftNote(scenario) {
  return agreementNote(scenario);
}

function hakedisReference(scenario) {
  return `${scenario.marker}:HAKEDIS`;
}

function invoiceReference(scenario) {
  return `${scenario.marker}:INVOICE`;
}

for (const scenario of Object.values(SCENARIOS)) {
  scenario.agreementNote = agreementNote(scenario);
  scenario.hakedisReference = hakedisReference(scenario);
  scenario.invoiceReference = invoiceReference(scenario);
  Object.freeze(scenario);
}
Object.freeze(SCENARIOS);

async function loadTenantPrerequisites(tx) {
  const [company, room, vehicle, driver] = await Promise.all([
    tx.company.findUnique({ where: { id: TENANT.companyId } }),
    tx.room.findUnique({ where: { id: TENANT.roomId } }),
    tx.vehicle.findUnique({ where: { id: TENANT.vehicleId } }),
    tx.driver.findUnique({ where: { id: TENANT.driverId } }),
  ]);

  if (!company || !room || !vehicle || !driver || company.kind !== "COMPANY") {
    throw new Error("M18_FIXTURE_PREREQUISITE_MISSING");
  }
  if (vehicle.roomId !== room.id || driver.roomId !== room.id) {
    throw new Error("M18_FIXTURE_TENANT_RELATION_INVALID");
  }
  return { company, room, vehicle, driver };
}

async function ensureAgreement(tx, scenario) {
  const data = {
    companyId: scenario.companyId,
    roomId: scenario.roomId,
    vehicleId: scenario.vehicleId,
    driverId: scenario.driverId,
    startDate: scenario.agreementStart,
    endDate: scenario.agreementEnd,
    weekMask: 127,
    startMin: 8 * 60,
    endMin: 9 * 60,
    status: "ACTIVE",
    companyOfferAmount: 12000000,
    companyOfferNote: scenario.agreementNote,
    roomOfferAmount: 10000000,
    roomOfferNote: roomNote(scenario),
  };
  const existing = await tx.agreement.findFirst({
    where: {
      companyId: scenario.companyId,
      roomId: scenario.roomId,
      companyOfferNote: scenario.agreementNote,
    },
  });
  return existing
    ? tx.agreement.update({ where: { id: existing.id }, data })
    : tx.agreement.create({ data });
}

async function ensureShift(tx, scenario, agreementId) {
  const data = {
    companyId: scenario.companyId,
    roomId: scenario.roomId,
    vehicleId: scenario.vehicleId,
    driverId: scenario.driverId,
    agreementId,
    startAt: scenario.shiftStart,
    endAt: scenario.shiftEnd,
    status: "DONE",
    companyOfferAmount: 12000000,
    companyOfferNote: shiftNote(scenario),
    roomOfferAmount: 10000000,
    roomOfferNote: roomNote(scenario),
  };
  const existing = await tx.shift.findFirst({
    where: {
      companyId: scenario.companyId,
      roomId: scenario.roomId,
      companyOfferNote: shiftNote(scenario),
    },
  });
  const shift = existing
    ? await tx.shift.update({ where: { id: existing.id }, data })
    : await tx.shift.create({ data });
  await tx.shiftProgress.upsert({
    where: { shiftId: shift.id },
    update: { lastReachedOrder: 1, completedAt: scenario.shiftEnd },
    create: { shiftId: shift.id, lastReachedOrder: 1, completedAt: scenario.shiftEnd },
  });
  return shift;
}

async function ensureFinanceRecords(tx, scenario, agreementId) {
  const common = {
    agreementId,
    companyId: scenario.companyId,
    roomId: scenario.roomId,
    periodStart: scenario.periodStart,
    periodEnd: scenario.periodEnd,
    currencyCode: "TRY",
    status: "READY",
    source: scenario.hakedisSource,
    notes: `${COVERAGE_MARKER}:${scenario.marker}`,
    amountMinor: scenario.hakedisAmountMinor,
  };
  await tx.hakedisRecord.upsert({
    where: { reference: scenario.hakedisReference },
    update: common,
    create: { reference: scenario.hakedisReference, ...common },
  });

  await tx.invoiceRecord.upsert({
    where: { reference: scenario.invoiceReference },
    update: {
      ...common,
      status: "ISSUED",
      source: scenario.invoiceSource,
      amountMinor: scenario.invoiceAmountMinor,
      issuedAt: new Date("2031-03-01T12:00:00.000Z"),
    },
    create: {
      reference: scenario.invoiceReference,
      ...common,
      status: "ISSUED",
      source: scenario.invoiceSource,
      amountMinor: scenario.invoiceAmountMinor,
      issuedAt: new Date("2031-03-01T12:00:00.000Z"),
    },
  });
}

async function ensureScenario(tx, scenario) {
  const agreement = await ensureAgreement(tx, scenario);
  const existingShifts = await tx.shift.count({ where: { agreementId: agreement.id } });
  if (!scenario.hasOperationEvidence && existingShifts > 0) {
    throw new Error("M18_FIXTURE_NO_OPERATION_SCENARIO_ALREADY_HAS_SHIFT");
  }
  if (scenario.hasOperationEvidence) {
    const ownedShifts = await tx.shift.count({ where: { agreementId: agreement.id, companyOfferNote: shiftNote(scenario) } });
    if (ownedShifts > 1) throw new Error("M18_FIXTURE_REVIEW_SCENARIO_HAS_MULTIPLE_SHIFTS");
    await ensureShift(tx, scenario, agreement.id);
  }
  await ensureFinanceRecords(tx, scenario, agreement.id);
  return { agreementId: agreement.id };
}

export async function ensureM18HakedisCoverageFixture(prisma = defaultPrisma) {
  return prisma.$transaction(async (tx) => {
    await loadTenantPrerequisites(tx);
    const noOperation = await ensureScenario(tx, SCENARIOS.noOperation);
    const reviewRequired = await ensureScenario(tx, SCENARIOS.reviewRequired);
    return {
      coverageMarker: COVERAGE_MARKER,
      tenant: { ...TENANT },
      scenarios: {
        noOperation,
        reviewRequired,
      },
      databaseMutations: true,
      externalSideEffects: false,
      businessExecution: false,
      idempotencyMarkers: Object.values(SCENARIO_MARKERS),
    };
  });
}

export {
  COVERAGE_MARKER,
  SCENARIO_MARKERS,
  SCENARIOS,
};
