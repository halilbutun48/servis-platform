import { prisma } from "../prisma.js";
import { buildOperationEvidencePlan } from "./agreementOperationEvidence.js";

function normalizeAgreementIds(agreementIds = []) {
  return Array.from(
    new Set(
      (Array.isArray(agreementIds) ? agreementIds : [])
        .map((x) => Number(x))
        .filter((n) => Number.isFinite(n) && n > 0)
    )
  );
}

function buildAgreementWhere({ agreementIds, companyId, roomId }) {
  const where = { id: { in: normalizeAgreementIds(agreementIds) } };
  if (companyId != null) where.companyId = companyId;
  if (roomId != null) where.roomId = roomId;
  return where;
}

function buildShiftWhere({ agreementIds, companyId, roomId }) {
  const where = {
    agreementId: { in: normalizeAgreementIds(agreementIds) },
    status: { not: "DRAFT" },
  };
  if (companyId != null) where.companyId = companyId;
  if (roomId != null) where.roomId = roomId;
  return where;
}

function compactIdMap(items = [], key = "agreementId") {
  const out = Object.create(null);
  for (const row of items || []) {
    const id = Number(row?.[key] || 0);
    if (id > 0 && !out[id]) out[id] = row;
  }
  return out;
}

function buildSourceSummary(sourceShift) {
  if (!sourceShift) return null;
  return `Kaynak vardiya #${sourceShift.id} • ${Number(sourceShift?._count?.people || 0)} personel • ${Number(sourceShift?._count?.stops || 0)} durak`;
}

function buildCompanyDecisionMap(rows = []) {
  const out = Object.create(null);
  for (const row of rows || []) {
    const agreementId = Number(row?.entityId || 0);
    if (agreementId <= 0 || out[agreementId]) continue;
    const decision = String(row?.meta?.decision || "").trim().toUpperCase();
    const finalStatus = String(row?.meta?.finalStatus || "").trim().toUpperCase();
    if (!["ACCEPT", "REJECT"].includes(decision) || !finalStatus) continue;
    out[agreementId] = {
      decision,
      finalStatus,
      roomOfferAmountMinor: Number.isSafeInteger(Number(row?.meta?.roomOfferAmountMinor))
        ? Number(row.meta.roomOfferAmountMinor)
        : null,
    };
  }
  return out;
}

export async function buildAgreementOpsBridgeById({ agreementIds = [], companyId = null, roomId = null, actorRole = null } = {}) {
  const ids = normalizeAgreementIds(agreementIds);
  if (!ids.length) return {};

  const agreements = await prisma.agreement.findMany({
    where: buildAgreementWhere({ agreementIds: ids, companyId, roomId }),
    select: {
      id: true,
      status: true,
      startDate: true,
      endDate: true,
      vehicleId: true,
      driverId: true,
      hubLat: true,
      hubLng: true,
      direction: true,
      pattern: true,
      startMin: true,
      endMin: true,
      weekMask: true,
      vehicle: { select: { id: true, plate: true } },
      driver: { select: { id: true, fullName: true } },
    },
  });

  const allowedIds = normalizeAgreementIds(agreements.map((row) => row.id));
  if (!allowedIds.length) return {};

  // The agreement scope above is the tenant boundary. Only the latest
  // commercial decision summary is projected; actor/audit internals and
  // ROOM cost data remain server-side.
  const decisionRows = await prisma.auditLog.findMany({
    where: {
      entity: "Agreement",
      entityId: { in: allowedIds },
      action: "COMPANY_AGREEMENT_DECISION",
    },
    select: { entityId: true, meta: true },
    orderBy: { id: "desc" },
  });
  const companyDecisionByAgreement = buildCompanyDecisionMap(decisionRows);

  const sourceRows = await prisma.commercialSource.findMany({
    where: { agreementId: { in: allowedIds }, shiftRootId: { not: null } },
    select: { agreementId: true, shiftRootId: true },
    orderBy: { id: "asc" },
  });
  const firstSourceByAgreement = compactIdMap(sourceRows, "agreementId");
  const sourceShiftIdByAgreement = Object.create(null);
  for (const [agreementId, row] of Object.entries(firstSourceByAgreement)) {
    sourceShiftIdByAgreement[Number(agreementId)] = Number(row?.shiftRootId || 0);
  }

  const sourceShiftIds = normalizeAgreementIds(Object.values(sourceShiftIdByAgreement));
  const sourceShiftRows = sourceShiftIds.length
    ? await prisma.shift.findMany({
        where: { id: { in: sourceShiftIds } },
        select: {
          id: true,
          agreementId: true,
          startAt: true,
          endAt: true,
          status: true,
          routeSnapshotValidatedAt: true,
          routeSnapshotDistanceM: true,
          routeSnapshotDurationSec: true,
          routeSnapshotInputHash: true,
          _count: { select: { stops: true, people: true } },
        },
      })
    : [];
  const sourceShiftById = Object.create(null);
  for (const row of sourceShiftRows || []) sourceShiftById[Number(row.id)] = row;

  const shiftWhere = buildShiftWhere({ agreementIds: allowedIds, companyId, roomId });
  const [counts, lastShifts] = await Promise.all([
    prisma.shift.groupBy({ by: ["agreementId"], where: shiftWhere, _count: { _all: true } }),
    prisma.shift.findMany({
      where: shiftWhere,
      orderBy: [{ startAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        agreementId: true,
        startAt: true,
        endAt: true,
        status: true,
        vehicleId: true,
        driverId: true,
        hubLat: true,
        hubLng: true,
        direction: true,
        pattern: true,
        routeSnapshotValidatedAt: true,
        routeSnapshotDistanceM: true,
        routeSnapshotDurationSec: true,
        routeSnapshotInputHash: true,
        vehicle: { select: { id: true, plate: true } },
        driver: { select: { id: true, fullName: true } },
        _count: { select: { stops: true, people: true } },
      },
    }),
  ]);

  const countMap = Object.create(null);
  for (const row of counts || []) countMap[Number(row.agreementId)] = Number(row?._count?._all ?? 0);

  const lastByAgreement = Object.create(null);
  for (const row of lastShifts || []) {
    const agreementId = Number(row?.agreementId || 0);
    if (!agreementId || lastByAgreement[agreementId]) continue;

    const sourceShift = sourceShiftById[Number(sourceShiftIdByAgreement[agreementId] || 0)] || null;
    const generatedStopCount = Number(row?._count?.stops ?? 0) || 0;
    const generatedPeopleCount = Number(row?._count?.people ?? 0) || 0;
    const sourceStopCount = Number(sourceShift?._count?.stops ?? 0) || 0;
    const sourcePeopleCount = Number(sourceShift?._count?.people ?? 0) || 0;
    const stopCount = generatedStopCount > 1 ? generatedStopCount : Math.max(generatedStopCount, sourceStopCount);
    const peopleCount = generatedPeopleCount > 0 ? generatedPeopleCount : sourcePeopleCount;
    const previewAvailable = Boolean(
      row?.routeSnapshotValidatedAt ||
      sourceShift?.routeSnapshotValidatedAt ||
      stopCount ||
      peopleCount ||
      sourceShiftIdByAgreement[agreementId]
    );

    lastByAgreement[agreementId] = {
      id: row.id,
      startAt: row.startAt,
      endAt: row.endAt,
      status: row.status,
      vehicleId: row.vehicleId,
      driverId: row.driverId,
      hubLat: row.hubLat,
      hubLng: row.hubLng,
      direction: row.direction,
      pattern: row.pattern,
      routeSnapshotValidatedAt: row.routeSnapshotValidatedAt || sourceShift?.routeSnapshotValidatedAt || null,
      routeSnapshotDistanceM: row.routeSnapshotDistanceM ?? sourceShift?.routeSnapshotDistanceM ?? null,
      routeSnapshotDurationSec: row.routeSnapshotDurationSec ?? sourceShift?.routeSnapshotDurationSec ?? null,
      routeSnapshotInputHash: row.routeSnapshotInputHash || sourceShift?.routeSnapshotInputHash || null,
      stopCount,
      peopleCount,
      previewAvailable,
      vehicle: row.vehicle ? { id: row.vehicle.id, plate: row.vehicle.plate || null } : null,
      driver: row.driver ? { id: row.driver.id, fullName: row.driver.fullName || null } : null,
    };
  }

  const byId = {};
  for (const agreement of agreements) {
    const agreementId = Number(agreement.id);
    const sourceShift = sourceShiftById[Number(sourceShiftIdByAgreement[agreementId] || 0)] || null;
    byId[agreementId] = {
      generatedCount: Number(countMap[agreementId] || 0),
      sourceShiftId: Number(sourceShiftIdByAgreement[agreementId] || 0) || null,
      sourceSummary: buildSourceSummary(sourceShift),
      companyDecision: companyDecisionByAgreement[agreementId] || null,
      agreementVehicle: agreement.vehicle
        ? { id: agreement.vehicle.id, plate: agreement.vehicle.plate || null }
        : (agreement.vehicleId ? { id: agreement.vehicleId, plate: null } : null),
      agreementDriver: agreement.driver
        ? { id: agreement.driver.id, fullName: agreement.driver.fullName || null }
        : (agreement.driverId ? { id: agreement.driverId, fullName: null } : null),
      plan: {
        hubLat: agreement.hubLat,
        hubLng: agreement.hubLng,
        direction: agreement.direction,
        pattern: agreement.pattern,
        startMin: agreement.startMin,
        endMin: agreement.endMin,
        weekMask: agreement.weekMask,
      },
      lastShift: lastByAgreement[agreementId] || null,
    };
    byId[agreementId].operationEvidencePlan = buildOperationEvidencePlan({
      agreement,
      companyDecision: byId[agreementId].companyDecision,
      sourceShift,
      generatedCount: byId[agreementId].generatedCount,
      lastShift: byId[agreementId].lastShift,
      actorRole,
    });
  }

  return byId;
}
