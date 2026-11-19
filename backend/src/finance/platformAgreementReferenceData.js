import { createHash } from "node:crypto";
import { resolveAgreementCommercialEvidence } from "./agreementCommercialEvidence.js";

export const CONTROLLED_DEMO_PLATFORM_REFERENCE_MARKER = "SEFERPAKT_PLATFORM_REFERENCE_DEMO_V1";
export const CONTROLLED_DEMO_PLATFORM_REFERENCE_CONSUMER_MARKER = "SEFERPAKT_PLATFORM_REFERENCE_DEMO_CONSUMER_V1";

// This is a bounded acceptance protocol, not the live platform policy. The
// live path never opts into this dataset mode and therefore remains closed
// until an independently approved production policy is supplied.
export const CONTROLLED_DEMO_PLATFORM_REFERENCE_POLICY = Object.freeze({
  enabled: true,
  datasetMode: "CONTROLLED_DEMO",
  demoOnly: true,
  policyAuthority: "USER_APPROVED_BOUNDED_DEMO_ACCEPTANCE_20261030",
  minComparableSampleCount: 6,
  minDistinctRoomCount: 6,
  excludeDemoData: true,
  privacySafe: true,
  competitionApproved: true,
  reidentificationRisk: "LOW",
});

const ACCEPTED_STATUSES = new Set(["APPROVED", "ACTIVE", "DONE"]);

function text(value) {
  return String(value ?? "").trim();
}
function upper(value) {
  return text(value).toUpperCase();
}

function positiveNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
}

function dateOnly(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function countScheduledDays(startValue, endValue, weekMask) {
  const start = startValue instanceof Date ? new Date(startValue) : new Date(startValue);
  const end = endValue instanceof Date ? new Date(endValue) : new Date(endValue);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return null;
  const mask = Number(weekMask);
  if (!Number.isInteger(mask) || mask < 1 || mask > 127) return null;
  const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate()));
  const last = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), end.getUTCDate()));
  let count = 0;
  while (cursor <= last) {
    const mondayIndex = (cursor.getUTCDay() + 6) % 7;
    if ((mask & (1 << mondayIndex)) !== 0) count += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count || null;
}

function stableRoomHash(room) {
  const seed = `${CONTROLLED_DEMO_PLATFORM_REFERENCE_MARKER}:${text(room?.id)}`;
  return createHash("sha256").update(seed).digest("hex").slice(0, 24);
}

export function isControlledDemoRoom(room, { nodeEnv = process.env.NODE_ENV } = {}) {
  return String(nodeEnv || "").toLowerCase() !== "production"
    && upper(room?.status) === "ACTIVE"
    && text(room?.notes).includes(CONTROLLED_DEMO_PLATFORM_REFERENCE_MARKER);
}

export function isControlledDemoConsumerRoom(room, { nodeEnv = process.env.NODE_ENV } = {}) {
  return String(nodeEnv || "").toLowerCase() !== "production"
    && upper(room?.status) === "ACTIVE"
    && text(room?.notes).includes(CONTROLLED_DEMO_PLATFORM_REFERENCE_CONSUMER_MARKER);
}

export function isControlledDemoCompany(company, { nodeEnv = process.env.NODE_ENV } = {}) {
  return String(nodeEnv || "").toLowerCase() !== "production"
    && upper(company?.status) === "ACTIVE"
    && upper(company?.kind) === "COMPANY";
}

function comparableShift(agreement) {
  return (Array.isArray(agreement?.shifts) ? agreement.shifts : [])
    .filter((shift) => positiveNumber(shift?.routeSnapshotDistanceM) != null)
    .sort((left, right) => Number(left?.id || 0) - Number(right?.id || 0))[0] || null;
}

export function buildControlledDemoPlatformObservation({ room, agreement, auditLogs = [] } = {}) {
  if (!isControlledDemoRoom(room)) return null;
  if (!agreement || !ACCEPTED_STATUSES.has(upper(agreement.status))) return null;

  const shift = comparableShift(agreement);
  const commercialEvidence = resolveAgreementCommercialEvidence({ agreement, auditLogs });
  const serviceDayCount = countScheduledDays(agreement.startDate, agreement.endDate, agreement.weekMask);
  const observedShiftCount = Array.isArray(agreement.shifts) ? agreement.shifts.length : 0;
  const observedServiceDays = new Set(
    (Array.isArray(agreement.shifts) ? agreement.shifts : [])
      .map((shiftItem) => dateOnly(shiftItem?.startAt))
      .filter(Boolean),
  ).size;
  const dailyMovementCount = observedServiceDays > 0 && observedShiftCount > 0
    ? observedShiftCount / observedServiceDays
    : null;
  const vehicleType = text(agreement?.vehicle?.type) || null;
  const vehicleCapacity = Number.isInteger(Number(agreement?.vehicle?.capacity))
    ? Number(agreement.vehicle.capacity)
    : null;
  const routeKey = text(shift?.routeSnapshotInputHash) || null;
  const totalDistanceKm = positiveNumber(shift?.routeSnapshotDistanceM) == null
    ? null
    : Number((Number(shift.routeSnapshotDistanceM) / 1000).toFixed(2));
  const serviceType = agreement?.direction && agreement?.pattern
    ? `${upper(agreement.direction)}:${upper(agreement.pattern)}`
    : null;

  return Object.freeze({
    isDemo: true,
    isTest: false,
    roomHash: stableRoomHash(room),
    commercialReference: commercialEvidence.commercialReference,
    negotiationEvidence: commercialEvidence.negotiationEvidence,
    operationalEvidence: commercialEvidence.operationalEvidence,
    dimensions: Object.freeze({
      vehicleType,
      vehicleCapacity,
      routeKey,
      totalDistanceKm,
      dailyMovementCount,
      serviceDayCount,
      serviceType,
      agreementMonth: dateOnly(agreement.startDate)?.slice(0, 7) || null,
    }),
  });
}

function sameRegion(room, region) {
  const requested = upper(region?.regionName || region?.regionCode);
  if (!requested) return true;
  const roomRegion = upper(room?.region?.name || room?.regionName || room?.regionCode);
  return roomRegion === requested || (requested === "34" && roomRegion === "ISTANBUL");
}

export async function loadControlledDemoPlatformReference({
  prismaClient,
  actor = null,
  region = null,
  windowDays = 90,
  now = new Date(),
} = {}) {
  const empty = {
    mode: "LIVE",
    policy: null,
    observations: [],
    eligibleRoomCount: 0,
    eligibleAgreementCount: 0,
    sourceAgreementIds: [],
  };
  const actorRole = upper(actor?.role);
  if (!prismaClient || !["ROOM", "COMPANY"].includes(actorRole)) return empty;

  let actorRoom = null;
  let actorCompany = null;
  if (actorRole === "ROOM") {
    if (!actor?.roomId) return empty;
    actorRoom = await prismaClient.room.findUnique({
      where: { id: Number(actor.roomId) },
      select: { id: true, name: true, status: true, notes: true, region: { select: { id: true, name: true } } },
    });
  } else {
    if (!actor?.companyId) return empty;
    actorCompany = await prismaClient.company.findUnique({
      where: { id: Number(actor.companyId) },
      select: { id: true, kind: true, status: true },
    });
  }
  const actorIsSourceRoom = actorRole === "ROOM" && isControlledDemoRoom(actorRoom);
  const actorIsConsumerRoom = actorRole === "ROOM" && isControlledDemoConsumerRoom(actorRoom);
  const actorIsConsumerCompany = actorRole === "COMPANY" && isControlledDemoCompany(actorCompany);
  if (!actorIsSourceRoom && !actorIsConsumerRoom && !actorIsConsumerCompany) return empty;

  const cutoff = new Date(now);
  cutoff.setUTCDate(cutoff.getUTCDate() - Math.max(1, Number(windowDays) || 90));
  const rooms = await prismaClient.room.findMany({
    where: { status: "ACTIVE", notes: { contains: CONTROLLED_DEMO_PLATFORM_REFERENCE_MARKER } },
    select: { id: true, name: true, status: true, notes: true, region: { select: { id: true, name: true } } },
    orderBy: { id: "asc" },
  });
  const eligibleRooms = rooms.filter((room) => sameRegion(room, region) && isControlledDemoRoom(room));
  if (!actorIsConsumerRoom && !actorIsConsumerCompany && !eligibleRooms.some((room) => Number(room.id) === Number(actorRoom?.id))) return empty;

  const agreements = await prismaClient.agreement.findMany({
    where: {
      roomId: { in: eligibleRooms.map((room) => Number(room.id)) },
      status: { in: [...ACCEPTED_STATUSES] },
      startDate: { lte: new Date(now) },
      endDate: { gte: cutoff },
    },
    select: {
      id: true,
      roomId: true,
      status: true,
      startDate: true,
      endDate: true,
      weekMask: true,
      direction: true,
      pattern: true,
      companyOfferAmount: true,
      roomOfferAmount: true,
      vehicle: { select: { id: true, type: true, capacity: true } },
      shifts: {
        where: { status: { not: "DRAFT" } },
        select: { id: true, status: true, startAt: true, routeSnapshotDistanceM: true, routeSnapshotInputHash: true },
        orderBy: { id: "asc" },
      },
    },
    orderBy: [{ roomId: "asc" }, { id: "asc" }],
  });
  const auditLogs = agreements.length
    ? await prismaClient.auditLog.findMany({
      where: { entity: "Agreement", entityId: { in: agreements.map((agreement) => Number(agreement.id)) } },
      select: { id: true, entityId: true, action: true, meta: true, createdAt: true },
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    })
    : [];
  const logsByAgreement = new Map();
  for (const log of auditLogs) {
    const id = Number(log.entityId);
    if (!logsByAgreement.has(id)) logsByAgreement.set(id, []);
    logsByAgreement.get(id).push(log);
  }
  const roomById = new Map(eligibleRooms.map((room) => [Number(room.id), room]));
  const observations = agreements
    .map((agreement) => buildControlledDemoPlatformObservation({
      room: roomById.get(Number(agreement.roomId)),
      agreement,
      auditLogs: logsByAgreement.get(Number(agreement.id)) || [],
    }))
    .filter(Boolean);
  return {
    mode: "CONTROLLED_DEMO",
    policy: CONTROLLED_DEMO_PLATFORM_REFERENCE_POLICY,
    observations,
    eligibleRoomCount: eligibleRooms.length,
    eligibleAgreementCount: agreements.length,
    sourceAgreementIds: agreements.map((agreement) => Number(agreement.id)),
  };
}
