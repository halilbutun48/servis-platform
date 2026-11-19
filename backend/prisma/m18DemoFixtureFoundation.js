const FOUNDATION_MARKER = "M18_DEMO_ROOM_FINANCE_FOUNDATION_V1";
const UI_INCOME_ACCEPTANCE_MARKER = "M18_DEMO_FINANCE_UI_ACCEPTANCE_V1";
const SERVICE_EVALUATION_FIXTURE_MARKER = "M18_DEMO_SERVICE_EVALUATION_CANONICAL_V1";
const PARENT_LIVE_FIXTURE_MARKER = "M18_DEMO_PARENT_LIVE_CANONICAL_V1";

const MARKERS = Object.freeze({
  openOffer: "M18_DEMO_OFFER_OPEN",
  counteredOffer: "M18_DEMO_OFFER_COUNTERED",
  acceptedOffer: "M18_DEMO_OFFER_ACCEPTED",
  matchedFinance: "M18_DEMO_FINANCE_MATCHED",
  lossFinance: "M18_DEMO_FINANCE_LOSS",
  missingFinance: "M18_DEMO_FINANCE_MISSING",
});

// All M18 demo monetary values use the canonical integer-kuruş contract.
// Keep these values scoped to this fixture owner; do not migrate unrelated demo data.
const DEMO_MONEY_MINOR = Object.freeze({
  baselineOperationalCost: 6500000,
  quoteFloor: 8531250,
  quoteFloorPerPassenger: 533203,
  companyOffer: 12000000,
  roomOffer: 10000000,
  roomCounterOffer: 11000000,
  matchedHakedis: 10000000,
  matchedInvoice: 10000000,
  lossHakedis: 10000000,
  lossInvoice: 12000000,
});

const DEMO_DATE = Object.freeze({
  agreementStart: new Date("2030-11-01T00:00:00.000Z"),
  agreementEnd: new Date("2030-11-30T00:00:00.000Z"),
  lossAgreementStart: new Date("2031-01-01T00:00:00.000Z"),
  lossAgreementEnd: new Date("2031-01-31T00:00:00.000Z"),
  missingAgreementStart: new Date("2031-02-01T00:00:00.000Z"),
  missingAgreementEnd: new Date("2031-02-28T00:00:00.000Z"),
  matchedShiftStart: new Date("2030-11-04T08:00:00.000Z"),
  matchedShiftEnd: new Date("2030-11-04T09:00:00.000Z"),
  lossShiftStart: new Date("2031-01-04T08:00:00.000Z"),
  lossShiftEnd: new Date("2031-01-04T09:00:00.000Z"),
  missingShiftStart: new Date("2031-02-04T08:00:00.000Z"),
  missingShiftEnd: new Date("2031-02-04T09:00:00.000Z"),
});

// Fixture provenance stays in the existing fixture-owned idempotency fields.
// These note fields are user-facing demo content and must not carry internal markers.
const DEMO_OFFER_NOTE_TEXT = Object.freeze({
  company: "Demo hizmet teklifi; inceleme için hazırlandı.",
  room: "Demo karşı teklif; inceleme için hazırlandı.",
});

function offerData({ status, amountCompany, amountRoom }) {
  return {
    status,
    amountCompany,
    amountRoom: amountRoom ?? null,
    noteCompany: DEMO_OFFER_NOTE_TEXT.company,
    noteRoom: amountRoom == null ? null : DEMO_OFFER_NOTE_TEXT.room,
  };
}

async function findOrCreateAgreement(prisma, data) {
  const existing = await prisma.agreement.findFirst({
    where: { companyId: data.companyId, roomId: data.roomId, companyOfferNote: data.companyOfferNote },
  });
  return existing
    ? prisma.agreement.update({ where: { id: existing.id }, data })
    : prisma.agreement.create({ data });
}

async function findOrCreateShift(prisma, data) {
  const existing = await prisma.shift.findFirst({
    where: { companyId: data.companyId, roomId: data.roomId, companyOfferNote: data.companyOfferNote },
  });
  return existing
    ? prisma.shift.update({ where: { id: existing.id }, data })
    : prisma.shift.create({ data });
}

async function ensureFinanceScenario(prisma, { marker, agreementId, shift, amounts, periodStart, periodEnd }) {
  if (amounts.hakedis != null) {
    await prisma.hakedisRecord.upsert({
      where: { reference: `${marker}:HAKEDIS` },
      update: {
        agreementId,
        companyId: shift.companyId,
        roomId: shift.roomId,
        periodStart,
        periodEnd,
        amountMinor: amounts.hakedis,
        status: "READY",
        source: "INTERNAL_ACTUAL",
        notes: `${FOUNDATION_MARKER}:${marker}`,
      },
      create: {
        reference: `${marker}:HAKEDIS`,
        agreementId,
        companyId: shift.companyId,
        roomId: shift.roomId,
        periodStart,
        periodEnd,
        amountMinor: amounts.hakedis,
        status: "READY",
        source: "INTERNAL_ACTUAL",
        notes: `${FOUNDATION_MARKER}:${marker}`,
      },
    });
  }

  if (amounts.invoice != null) {
    await prisma.invoiceRecord.upsert({
      where: { reference: `${marker}:INVOICE` },
      update: {
        agreementId,
        companyId: shift.companyId,
        roomId: shift.roomId,
        periodStart,
        periodEnd,
        amountMinor: amounts.invoice,
        status: "ISSUED",
        source: "INTERNAL_ACTUAL",
        notes: `${FOUNDATION_MARKER}:${marker}`,
        issuedAt: new Date("2030-10-31T12:00:00.000Z"),
      },
      create: {
        reference: `${marker}:INVOICE`,
        agreementId,
        companyId: shift.companyId,
        roomId: shift.roomId,
        periodStart,
        periodEnd,
        amountMinor: amounts.invoice,
        status: "ISSUED",
        source: "INTERNAL_ACTUAL",
        notes: `${FOUNDATION_MARKER}:${marker}`,
        issuedAt: new Date("2030-10-31T12:00:00.000Z"),
      },
    });
  }
}

async function ensureScenario(prisma, { companyId, roomId, vehicleId, driverId, marker, startAt, endAt, periodStart, periodEnd, amounts }) {
  const agreement = await findOrCreateAgreement(prisma, {
    companyId,
    roomId,
    vehicleId,
    driverId,
    startDate: periodStart,
    endDate: periodEnd,
    weekMask: 127,
    startMin: 8 * 60,
    endMin: 9 * 60,
    status: "ACTIVE",
    companyOfferAmount: DEMO_MONEY_MINOR.companyOffer,
    companyOfferNote: `${FOUNDATION_MARKER}:${marker}`,
    roomOfferAmount: DEMO_MONEY_MINOR.roomOffer,
    roomOfferNote: `${FOUNDATION_MARKER}:${marker}:ROOM_ACCEPTED`,
  });

  const shift = await findOrCreateShift(prisma, {
    companyId,
    roomId,
    vehicleId,
    driverId,
    agreementId: agreement.id,
    startAt,
    endAt,
    status: "DONE",
    companyOfferAmount: DEMO_MONEY_MINOR.companyOffer,
    companyOfferNote: `${FOUNDATION_MARKER}:${marker}`,
    roomOfferAmount: DEMO_MONEY_MINOR.roomOffer,
    roomOfferNote: `${FOUNDATION_MARKER}:${marker}:ROOM_ACCEPTED`,
  });

  await prisma.shiftProgress.upsert({
    where: { shiftId: shift.id },
    update: { lastReachedOrder: 1, completedAt: endAt },
    create: { shiftId: shift.id, lastReachedOrder: 1, completedAt: endAt },
  });

  await ensureFinanceScenario(prisma, { marker, agreementId: agreement.id, shift, amounts, periodStart, periodEnd });
  return { agreement, shift };
}

async function ensureRoomQuoteFloorDraft(prisma, roomId) {
  const baselineSource = `${FOUNDATION_MARKER}:QUOTE_FLOOR`;
  const inputSnapshot = {
    kind: "RoomQuoteFloorDraft",
    source: FOUNDATION_MARKER,
    dataClass: "DEMO_NON_PRODUCTION",
    costInputs: {
      serviceDistanceKm: 42,
      routeDurationMinutes: 75,
      passengerCount: 16,
      vehicleCapacity: 16,
      fuelConsumptionLitersPer100Km: 24,
      fuelUnitPriceMinor: 4200,
      driverBasePerShiftMinor: 18000,
      maintenancePerKmMinor: 95,
      cleaningPerShiftMinor: 1200,
      operationsOverheadFixedMinor: 5000,
    },
  };
  const data = {
    roomId,
    status: "DRAFT",
    currencyCode: "TRY",
    manualBaselineOperationalCostMinor: DEMO_MONEY_MINOR.baselineOperationalCost,
    targetContributionBps: 2000,
    riskReserveBps: 500,
    quoteFloorMinor: DEMO_MONEY_MINOR.quoteFloor,
    quoteFloorPerPassengerMinor: DEMO_MONEY_MINOR.quoteFloorPerPassenger,
    baselineSource,
    inputSnapshot,
    calculationVersion: "ROOM-PROFITABILITY-AND-QUOTE-FLOOR-01",
    version: 1,
  };
  const existing = await prisma.roomQuoteFloorDraft.findFirst({ where: { roomId, baselineSource } });
  return existing
    ? prisma.roomQuoteFloorDraft.update({ where: { id: existing.id }, data })
    : prisma.roomQuoteFloorDraft.create({ data });
}

async function ensureOffer(prisma, { companyId, roomId, vehicleId, driverId, marker, startAt, endAt, status, amountRoom }) {
  const shift = await findOrCreateShift(prisma, {
    companyId,
    roomId,
    vehicleId,
    driverId,
    startAt,
    endAt,
    status: "REQUESTED",
    companyOfferAmount: DEMO_MONEY_MINOR.companyOffer,
    companyOfferNote: `${FOUNDATION_MARKER}:${marker}`,
  });
  const offer = await prisma.shiftOffer.upsert({
    where: { shiftId_roomId: { shiftId: shift.id, roomId } },
    update: offerData({ status, amountCompany: DEMO_MONEY_MINOR.companyOffer, amountRoom }),
    create: { shiftId: shift.id, roomId, ...offerData({ status, amountCompany: DEMO_MONEY_MINOR.companyOffer, amountRoom }) },
  });
  return { shift, offer };
}

export async function ensureM18RoomFinanceFoundation(prisma) {
  if (process.env.LOCAL_M18_FINANCE_FIXTURE !== "1"
    || process.env.LOCAL_MAINTENANCE_MODE !== "1"
    || process.env.LOCAL_MAINTENANCE_SCOPE !== "DEMO_FIXTURE_ONLY"
    || process.env.NODE_ENV === "production") {
    throw new Error("M18_FINANCE_FIXTURE_EXPLICIT_SCOPE_REQUIRED");
  }
  return prisma.$transaction(async (tx) => {
    const [company, room, vehicle, driver] = await Promise.all([
      tx.company.findUnique({ where: { id: 1 } }),
      tx.room.findUnique({ where: { id: 1 } }),
      tx.vehicle.findUnique({ where: { id: 1 } }),
      tx.driver.findUnique({ where: { id: 1 } }),
    ]);
    if (!company || !room || !vehicle || !driver) {
      throw new Error("M18_FIXTURE_PREREQUISITE_MISSING");
    }
    if (vehicle.roomId !== room.id || driver.roomId !== room.id) {
      throw new Error("M18_FIXTURE_TENANT_RELATION_INVALID");
    }

    const common = { companyId: company.id, roomId: room.id, vehicleId: vehicle.id, driverId: driver.id };
    const open = await ensureOffer(tx, { ...common, marker: MARKERS.openOffer, startAt: new Date("2030-10-02T08:00:00.000Z"), endAt: new Date("2030-10-02T09:00:00.000Z"), status: "OPEN" });
    const countered = await ensureOffer(tx, { ...common, marker: MARKERS.counteredOffer, startAt: new Date("2030-10-03T08:00:00.000Z"), endAt: new Date("2030-10-03T09:00:00.000Z"), status: "COUNTERED", amountRoom: DEMO_MONEY_MINOR.roomCounterOffer });
    const accepted = await ensureOffer(tx, { ...common, marker: MARKERS.acceptedOffer, startAt: new Date("2030-10-04T08:00:00.000Z"), endAt: new Date("2030-10-04T09:00:00.000Z"), status: "ACCEPTED", amountRoom: DEMO_MONEY_MINOR.roomOffer });

    const matched = await ensureScenario(tx, { ...common, marker: MARKERS.matchedFinance, startAt: DEMO_DATE.matchedShiftStart, endAt: DEMO_DATE.matchedShiftEnd, periodStart: DEMO_DATE.agreementStart, periodEnd: DEMO_DATE.agreementEnd, amounts: { hakedis: DEMO_MONEY_MINOR.matchedHakedis, invoice: DEMO_MONEY_MINOR.matchedInvoice } });
    const loss = await ensureScenario(tx, { ...common, marker: MARKERS.lossFinance, startAt: DEMO_DATE.lossShiftStart, endAt: DEMO_DATE.lossShiftEnd, periodStart: DEMO_DATE.lossAgreementStart, periodEnd: DEMO_DATE.lossAgreementEnd, amounts: { hakedis: DEMO_MONEY_MINOR.lossHakedis, invoice: DEMO_MONEY_MINOR.lossInvoice } });
    const missing = await ensureScenario(tx, { ...common, marker: MARKERS.missingFinance, startAt: DEMO_DATE.missingShiftStart, endAt: DEMO_DATE.missingShiftEnd, periodStart: DEMO_DATE.missingAgreementStart, periodEnd: DEMO_DATE.missingAgreementEnd, amounts: { hakedis: null, invoice: null } });
    const quoteFloor = await ensureRoomQuoteFloorDraft(tx, room.id);

    return {
      foundationMarker: FOUNDATION_MARKER,
      offers: { open: open.offer.id, countered: countered.offer.id, accepted: accepted.offer.id },
      finance: { matchedAgreement: matched.agreement.id, lossAgreement: loss.agreement.id, missingAgreement: missing.agreement.id },
      quoteFloorDraft: quoteFloor.id,
      databaseMutations: true,
      externalSideEffects: false,
      idempotencyMarkers: Object.values(MARKERS),
    };
  });
}

/**
 * Prepares one isolated, one-day completed-service prerequisite for the real
 * ROOM income-chain UI acceptance. This is deliberately separate from the
 * foundation's seeded finance rows: the UI must create the HakedisRecord and
 * InvoiceRecord, while this helper only establishes an explicit
 * TEST_SIMULATED operation prerequisite in an isolated maintenance database.
 */
export async function ensureM18RoomIncomeUiAcceptanceFixture(prisma) {
  if (process.env.LOCAL_M18_FINANCE_FIXTURE !== "1"
    || process.env.LOCAL_MAINTENANCE_MODE !== "1"
    || process.env.LOCAL_MAINTENANCE_SCOPE !== "DEMO_FIXTURE_ONLY"
    || process.env.SEFERPAKT_DATABASE_MODE !== "isolated"
    || process.env.NODE_ENV === "production") {
    throw new Error("M18_UI_INCOME_FIXTURE_EXPLICIT_ISOLATED_SCOPE_REQUIRED");
  }

  return prisma.$transaction(async (tx) => {
    const [company, room, vehicle, driver] = await Promise.all([
      tx.company.findUnique({ where: { id: 1 } }),
      tx.room.findUnique({ where: { id: 1 } }),
      tx.vehicle.findUnique({ where: { id: 1 } }),
      tx.driver.findUnique({ where: { id: 1 } }),
    ]);
    if (!company || company.kind !== "COMPANY" || !room || !vehicle || !driver) {
      throw new Error("M18_UI_INCOME_FIXTURE_PREREQUISITE_MISSING");
    }
    if (vehicle.roomId !== room.id || driver.roomId !== room.id) {
      throw new Error("M18_UI_INCOME_FIXTURE_TENANT_RELATION_INVALID");
    }

    const periodStart = new Date("2026-11-01T00:00:00.000Z");
    const periodEnd = new Date("2026-11-01T00:00:00.000Z");
    const startAt = new Date("2026-11-01T08:00:00.000Z");
    const endAt = new Date("2026-11-01T09:00:00.000Z");
    const agreementNote = UI_INCOME_ACCEPTANCE_MARKER;
    const roomOfferNote = `${UI_INCOME_ACCEPTANCE_MARKER}:ROOM_ACCEPTED`;
    const routeSnapshotInputHash = `${UI_INCOME_ACCEPTANCE_MARKER}:ROUTE_TEMPLATE`;

    let agreement = await tx.agreement.findFirst({
      where: { companyId: company.id, roomId: room.id, companyOfferNote: agreementNote },
    });
    if (!agreement) {
      agreement = await tx.agreement.create({
        data: {
          companyId: company.id,
          roomId: room.id,
          vehicleId: vehicle.id,
          driverId: driver.id,
          startDate: periodStart,
          endDate: periodEnd,
          weekMask: 127,
          startMin: 8 * 60,
          endMin: 9 * 60,
          status: "ACTIVE",
          companyOfferAmount: 12000000,
          companyOfferNote: agreementNote,
          roomOfferAmount: 10000000,
          roomOfferNote,
        },
      });
    } else {
      const financeCount = await Promise.all([
        tx.hakedisRecord.count({ where: { agreementId: agreement.id } }),
        tx.invoiceRecord.count({ where: { agreementId: agreement.id } }),
      ]);
      if (financeCount.some((count) => count > 0)) {
        throw new Error("M18_UI_INCOME_FIXTURE_ALREADY_HAS_FINANCE_RECORD");
      }
    }

    let shift = await tx.shift.findFirst({
      where: { agreementId: agreement.id, companyOfferNote: agreementNote },
    });
    if (!shift) {
      shift = await tx.shift.create({
        data: {
          companyId: company.id,
          roomId: room.id,
          vehicleId: vehicle.id,
          driverId: driver.id,
          agreementId: agreement.id,
          startAt,
          endAt,
          status: "DONE",
          routeSnapshotDistanceM: 13530,
          routeSnapshotDurationSec: 1344,
          routeSnapshotValidatedAt: endAt,
          routeSnapshotInputHash,
          companyOfferAmount: 12000000,
          companyOfferNote: agreementNote,
          roomOfferAmount: 10000000,
          roomOfferNote,
          roomOfferDecision: "ACCEPTED",
          roomOfferDecisionAt: endAt,
          roomOfferDecisionNote: "TEST_SIMULATED isolated acceptance prerequisite",
        },
      });
    }

    await tx.shiftProgress.upsert({
      where: { shiftId: shift.id },
      update: { lastReachedOrder: 2, startedAt: startAt, completedAt: endAt },
      create: { shiftId: shift.id, lastReachedOrder: 2, startedAt: startAt, completedAt: endAt },
    });

    let audit = await tx.auditLog.findFirst({
      where: {
        action: "TEST_SIMULATED_SERVICE_FIXTURE_PREPARED",
        entity: "Shift",
        entityId: shift.id,
      },
      orderBy: { id: "asc" },
    });
    if (!audit) {
      audit = await tx.auditLog.create({
        data: {
          actorUserId: 3,
          actorRole: "ROOM",
          action: "TEST_SIMULATED_SERVICE_FIXTURE_PREPARED",
          entity: "Shift",
          entityId: shift.id,
          meta: {
            marker: UI_INCOME_ACCEPTANCE_MARKER,
            dataClass: "TEST_SIMULATED",
            businessExecution: false,
            financeRecordsCreated: false,
            source: "existing_fixture_mechanism",
          },
        },
      });
    }

    const [hakedisCount, invoiceCount] = await Promise.all([
      tx.hakedisRecord.count({ where: { agreementId: agreement.id } }),
      tx.invoiceRecord.count({ where: { agreementId: agreement.id } }),
    ]);
    if (hakedisCount !== 0 || invoiceCount !== 0) {
      throw new Error("M18_UI_INCOME_FIXTURE_FINANCE_RECORD_GUARD_FAILED");
    }

    return {
      fixtureMarker: UI_INCOME_ACCEPTANCE_MARKER,
      dataClass: "TEST_SIMULATED",
      businessExecution: false,
      financeRecordsCreated: false,
      companyId: company.id,
      roomId: room.id,
      vehicleId: vehicle.id,
      driverId: driver.id,
      agreementId: agreement.id,
      shiftId: shift.id,
      auditId: audit.id,
      periodStart: "2026-11-01",
      periodEnd: "2026-11-01",
    };
  });
}

export function buildM18ServiceEvaluationFixtureRows({ schoolCompanyId, organizationCompanyId, roomId, vehicleId, driverId }) {
  return [
    {
      role: "SCHOOL",
      companyId: Number(schoolCompanyId),
      roomId: Number(roomId),
      vehicleId: Number(vehicleId),
      driverId: Number(driverId),
      marker: `${SERVICE_EVALUATION_FIXTURE_MARKER}:SCHOOL`,
      startAt: new Date("2026-11-14T08:00:00.000Z"),
      endAt: new Date("2026-11-14T09:00:00.000Z"),
    },
    {
      role: "ORGANIZATION",
      companyId: Number(organizationCompanyId),
      roomId: Number(roomId),
      vehicleId: Number(vehicleId),
      driverId: Number(driverId),
      marker: `${SERVICE_EVALUATION_FIXTURE_MARKER}:ORGANIZATION`,
      startAt: new Date("2026-11-15T08:00:00.000Z"),
      endAt: new Date("2026-11-15T09:00:00.000Z"),
    },
  ];
}

/**
 * Prepares only the business prerequisite for service-evaluation acceptance.
 * The fixture never marks a service complete and never creates finance rows;
 * the ROOM UI must perform the TEST_SIMULATED completion before evaluation.
 */
export async function ensureM18ServiceEvaluationCompletionFixture(prisma) {
  if (process.env.LOCAL_M18_SERVICE_EVALUATION_FIXTURE !== "1"
    || process.env.LOCAL_MAINTENANCE_MODE !== "1"
    || process.env.LOCAL_MAINTENANCE_SCOPE !== "DEMO_FIXTURE_ONLY"
    || process.env.SEFERPAKT_DATABASE_MODE !== "canonical_demo"
    || process.env.M18_CANONICAL_FIXTURE_CONFIRM !== "SERVICE_EVALUATION_ONLY"
    || process.env.NODE_ENV === "production") {
    throw new Error("M18_SERVICE_EVALUATION_FIXTURE_EXPLICIT_CANONICAL_SCOPE_REQUIRED");
  }

  return prisma.$transaction(async (tx) => {
    const [room, school, organization, vehicle, driver, roomActor] = await Promise.all([
      tx.room.findUnique({ where: { id: 1 } }),
      tx.company.findFirst({ where: { kind: "SCHOOL", name: "DemoOkul" } }),
      tx.company.findFirst({ where: { kind: "ORGANIZATION", name: "DemoOrganizasyon" } }),
      tx.vehicle.findFirst({ where: { roomId: 1, id: 2 } }),
      tx.driver.findFirst({ where: { roomId: 1, id: 1 } }),
      tx.user.findFirst({ where: { role: "ROOM", roomId: 1 }, select: { id: true } }),
    ]);

    if (!room || !school || !organization || !vehicle || !driver || !roomActor) {
      throw new Error("M18_SERVICE_EVALUATION_FIXTURE_PREREQUISITE_MISSING");
    }
    if (room.regionId != null && [school, organization].some((company) => company.regionId != null && Number(company.regionId) !== Number(room.regionId))) {
      throw new Error("M18_SERVICE_EVALUATION_FIXTURE_TENANT_REGION_MISMATCH");
    }
    if (vehicle.roomId !== room.id || driver.roomId !== room.id) {
      throw new Error("M18_SERVICE_EVALUATION_FIXTURE_TENANT_RELATION_INVALID");
    }

    const rows = buildM18ServiceEvaluationFixtureRows({
      schoolCompanyId: school.id,
      organizationCompanyId: organization.id,
      roomId: room.id,
      vehicleId: vehicle.id,
      driverId: driver.id,
    });

    const scenarios = [];
    for (const row of rows) {
      let agreement = await tx.agreement.findFirst({
        where: { companyId: row.companyId, roomId: row.roomId, companyOfferNote: row.marker },
      });
      if (!agreement) {
        agreement = await tx.agreement.create({
          data: {
            companyId: row.companyId,
            roomId: row.roomId,
            vehicleId: row.vehicleId,
            driverId: row.driverId,
            startDate: row.startAt,
            endDate: row.endAt,
            weekMask: 127,
            startMin: 8 * 60,
            endMin: 9 * 60,
            status: "ACTIVE",
            companyOfferAmount: 10000000,
            companyOfferNote: row.marker,
            roomOfferAmount: 8000000,
            roomOfferNote: `${row.marker}:ROOM_ACCEPTED`,
          },
        });
      }

      const existingFinance = await Promise.all([
        tx.hakedisRecord.count({ where: { agreementId: agreement.id } }),
        tx.invoiceRecord.count({ where: { agreementId: agreement.id } }),
      ]);
      if (existingFinance.some((count) => count > 0)) {
        throw new Error("M18_SERVICE_EVALUATION_FIXTURE_FINANCE_CONFLICT");
      }

      let shift = await tx.shift.findFirst({
        where: { agreementId: agreement.id, companyOfferNote: row.marker },
      });
      if (!shift) {
        shift = await tx.shift.create({
          data: {
            companyId: row.companyId,
            roomId: row.roomId,
            vehicleId: row.vehicleId,
            driverId: row.driverId,
            agreementId: agreement.id,
            startAt: row.startAt,
            endAt: row.endAt,
            status: "APPROVED",
            companyOfferAmount: 10000000,
            companyOfferNote: row.marker,
            roomOfferAmount: 8000000,
            roomOfferNote: `${row.marker}:ROOM_ACCEPTED`,
            roomOfferDecision: "ACCEPTED",
            roomOfferDecisionAt: row.endAt,
            roomOfferDecisionNote: "TEST_SIMULATED service-evaluation prerequisite; not a completed service",
          },
        });
      } else if (!["APPROVED", "ACTIVE", "DONE"].includes(String(shift.status || "").toUpperCase())) {
        throw new Error("M18_SERVICE_EVALUATION_FIXTURE_SHIFT_STATE_INVALID");
      }

      let audit = await tx.auditLog.findFirst({
        where: {
          action: "TEST_SIMULATED_SERVICE_EVALUATION_FIXTURE_PREPARED",
          entity: "Shift",
          entityId: shift.id,
        },
        orderBy: { id: "asc" },
      });
      if (!audit) {
        audit = await tx.auditLog.create({
          data: {
            actorUserId: roomActor.id,
            actorRole: "ROOM",
            action: "TEST_SIMULATED_SERVICE_EVALUATION_FIXTURE_PREPARED",
            entity: "Shift",
            entityId: shift.id,
            meta: {
              marker: SERVICE_EVALUATION_FIXTURE_MARKER,
              role: row.role,
              companyId: row.companyId,
              roomId: row.roomId,
              dataClass: "TEST_SIMULATED",
              businessExecution: false,
              completedService: false,
              financeRecordsCreated: false,
              source: "canonical_demo_test_fixture",
              nextAction: "ROOM_UI_TEST_SIMULATED_COMPLETION",
            },
          },
        });
      }

      scenarios.push({
        role: row.role,
        companyId: row.companyId,
        roomId: row.roomId,
        vehicleId: row.vehicleId,
        driverId: row.driverId,
        agreementId: agreement.id,
        shiftId: shift.id,
        shiftStatus: shift.status,
        auditId: audit.id,
        dataClass: "TEST_SIMULATED",
        completedService: false,
        financeRecordsCreated: false,
      });
    }

    return {
      fixtureMarker: SERVICE_EVALUATION_FIXTURE_MARKER,
      scenarios,
      idempotent: true,
      databaseMutations: true,
      externalSideEffects: false,
      productionEnabled: false,
    };
  });
}

/**
 * Prepares the software-only prerequisite for PARENT live-surface acceptance.
 * This creates no finance rows, GPS event, boarding event, or completed service.
 * The active window exists only so the normal parent read model can expose the
 * authorized child's vehicle, stops, and StopAssignment in a real browser.
 */
export async function ensureM18ParentLiveFixture(prisma) {
  if (process.env.LOCAL_M18_PARENT_LIVE_FIXTURE !== "1"
    || process.env.LOCAL_MAINTENANCE_MODE !== "1"
    || process.env.LOCAL_MAINTENANCE_SCOPE !== "DEMO_FIXTURE_ONLY"
    || process.env.SEFERPAKT_DATABASE_MODE !== "canonical_demo"
    || process.env.M18_CANONICAL_FIXTURE_CONFIRM !== "PARENT_LIVE_ONLY"
    || process.env.NODE_ENV === "production") {
    throw new Error("M18_PARENT_LIVE_FIXTURE_EXPLICIT_CANONICAL_SCOPE_REQUIRED");
  }

  return prisma.$transaction(async (tx) => {
    const [room, school, vehicle, driver, parent, student, roomActor] = await Promise.all([
      tx.room.findUnique({ where: { id: 1 } }),
      tx.company.findFirst({ where: { kind: "SCHOOL", name: "DemoOkul" } }),
      tx.vehicle.findFirst({ where: { id: 2, roomId: 1, archivedAt: null } }),
      tx.driver.findFirst({ where: { id: 1, roomId: 1 } }),
      tx.user.findUnique({ where: { email: "parent@demo.com" } }),
      tx.personel.findUnique({ where: { id: 2 } }),
      tx.user.findFirst({ where: { role: "ROOM", roomId: 1 }, select: { id: true } }),
    ]);

    if (!room || !school || !vehicle || !driver || !parent || !student || !roomActor) {
      throw new Error("M18_PARENT_LIVE_FIXTURE_PREREQUISITE_MISSING");
    }
    if (student.companyId !== school.id || vehicle.roomId !== room.id || driver.roomId !== room.id) {
      throw new Error("M18_PARENT_LIVE_FIXTURE_TENANT_RELATION_INVALID");
    }

    const now = new Date();
    const startAt = new Date(now.getTime() - 5 * 60 * 1000);
    const endAt = new Date(now.getTime() + 90 * 60 * 1000);
    const note = `${PARENT_LIVE_FIXTURE_MARKER}:SHIFT`;
    let shift = await tx.shift.findFirst({ where: { companyId: school.id, companyOfferNote: note } });
    if (!shift) {
      shift = await tx.shift.create({
        data: {
          companyId: school.id,
          roomId: room.id,
          vehicleId: vehicle.id,
          driverId: driver.id,
          startAt,
          endAt,
          status: "APPROVED",
          companyOfferNote: note,
          roomOfferNote: `${PARENT_LIVE_FIXTURE_MARKER}:ROOM_ASSIGNMENT`,
        },
      });
    } else {
      shift = await tx.shift.update({
        where: { id: shift.id },
        data: { roomId: room.id, vehicleId: vehicle.id, driverId: driver.id, startAt, endAt, status: "APPROVED" },
      });
    }

    const stopRows = [
      { order: 1, name: "TEST_SIMULATED Başlangıç Durağı", lat: 41.018, lng: 28.982, type: "COMMON" },
      { order: 2, name: "TEST_SIMULATED Öğrenci Durağı", lat: 41.022, lng: 28.985, type: "COMMON" },
      { order: 3, name: "TEST_SIMULATED Son Durak", lat: 41.026, lng: 28.989, type: "MANUAL" },
    ];
    const stops = [];
    for (const row of stopRows) {
      let stop = await tx.stop.findFirst({ where: { shiftId: shift.id, order: row.order } });
      stop = stop
        ? await tx.stop.update({ where: { id: stop.id }, data: { ...row, state: "PENDING" } })
        : await tx.stop.create({ data: { shiftId: shift.id, ...row, state: "PENDING" } });
      stops.push(stop);
    }
    const childStop = stops.find((stop) => stop.order === 2);

    await tx.shiftPersonel.upsert({
      where: { shiftId_personelId: { shiftId: shift.id, personelId: student.id } },
      update: { note: `${PARENT_LIVE_FIXTURE_MARKER}:STUDENT` },
      create: { shiftId: shift.id, personelId: student.id, note: `${PARENT_LIVE_FIXTURE_MARKER}:STUDENT` },
    });
    const assignment = await tx.stopAssignment.upsert({
      where: { shiftId_personelId: { shiftId: shift.id, personelId: student.id } },
      update: { stopId: childStop.id, walkM: 120 },
      create: { shiftId: shift.id, stopId: childStop.id, personelId: student.id, walkM: 120 },
    });

    let audit = await tx.auditLog.findFirst({
      where: { action: "TEST_SIMULATED_PARENT_LIVE_FIXTURE_PREPARED", entity: "Shift", entityId: shift.id },
      orderBy: { id: "asc" },
    });
    if (!audit) {
      audit = await tx.auditLog.create({
        data: {
          actorUserId: roomActor.id,
          actorRole: "ROOM",
          action: "TEST_SIMULATED_PARENT_LIVE_FIXTURE_PREPARED",
          entity: "Shift",
          entityId: shift.id,
          meta: {
            marker: PARENT_LIVE_FIXTURE_MARKER,
            dataClass: "TEST_SIMULATED",
            businessExecution: false,
            externalSideEffects: false,
            parentUserId: parent.id,
            personelId: student.id,
            stopAssignmentId: assignment.id,
            vehicleId: vehicle.id,
            noGpsEventCreated: true,
            noFinanceRecordsCreated: true,
            fieldValidation: "OPEN",
          },
        },
      });
    }

    return {
      marker: PARENT_LIVE_FIXTURE_MARKER,
      parentUserId: parent.id,
      companyId: school.id,
      roomId: room.id,
      vehicleId: vehicle.id,
      driverId: driver.id,
      shiftId: shift.id,
      shiftStatus: shift.status,
      startAt: shift.startAt,
      endAt: shift.endAt,
      stopIds: stops.map((stop) => stop.id),
      childStopId: childStop.id,
      stopAssignmentId: assignment.id,
      auditId: audit.id,
      dataClass: "TEST_SIMULATED",
      completedService: false,
      gpsEventCreated: false,
      financeRecordsCreated: false,
    };
  });
}

export {
  DEMO_MONEY_MINOR,
  FOUNDATION_MARKER,
  MARKERS,
  SERVICE_EVALUATION_FIXTURE_MARKER,
  UI_INCOME_ACCEPTANCE_MARKER,
};
