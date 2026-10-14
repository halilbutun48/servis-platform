const FOUNDATION_MARKER = "M18_DEMO_ROOM_FINANCE_FOUNDATION_V1";

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
  quoteFloor: 8125000,
  quoteFloorPerPassenger: 507813,
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

export { DEMO_MONEY_MINOR, FOUNDATION_MARKER, MARKERS };
