import { prisma } from "../src/prisma.js";
import { reqJson, assertOk } from "./_harness.js";

const TR_TIME_ZONE = "Europe/Istanbul";

function trDateParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TR_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const map = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    year: Number(map.year || 0),
    month: Number(map.month || 0),
    day: Number(map.day || 0),
  };
}

export function trYmdPlus(days = 0) {
  const now = new Date();
  const { year, month, day } = trDateParts(now);
  const base = new Date(Date.UTC(year, month - 1, day + Number(days || 0), 12, 0, 0));
  return base.toISOString().slice(0, 10);
}

export function makeSmokeTag(prefix = "M91") {
  const stamp = new Date().toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  return `${prefix}-${stamp}`;
}

export function agreementBodyFromSourceShift({ roomId, sourceShiftId, hubLat, hubLng, startDate, endDate, noteTag }) {
  return {
    roomId,
    startDate,
    endDate,
    weekMask: 62,
    startMin: 480,
    endMin: 1020,
    direction: "INBOUND",
    pattern: "ONE_WAY",
    hubLat,
    hubLng,
    sourceShiftId,
    companyOfferAmount: 24000,
    companyOfferNote: `${noteTag} agreement smoke`,
  };
}

function responseSummary(response) {
  return `${response?.status || 0} ${String(response?.text || "").slice(0, 500)}`;
}

export async function createSourceShift({ companyToken, roomId, tag }) {
  const now = Date.now();
  const hubLat = 41.0302;
  const hubLng = 28.9960;
  const startAt = new Date(now + 2 * 60 * 60_000).toISOString();
  const endAt = new Date(now + 3 * 60 * 60_000).toISOString();
  const stopNames = [
    `${tag} Source Stop 1`,
    `${tag} Source Stop 2`,
    `${tag} Source Stop 3`,
  ];
  const body = {
    roomId,
    startAt,
    endAt,
    hubLat,
    hubLng,
    direction: "INBOUND",
    pattern: "ONE_WAY",
    stops: [
      { name: stopNames[0], lat: 41.0310, lng: 28.9964, order: 1, type: "COMMON" },
      { name: stopNames[1], lat: 41.0316, lng: 28.9968, order: 2, type: "COMMON" },
      { name: stopNames[2], lat: 41.0322, lng: 28.9972, order: 3, type: "COMMON" },
    ],
  };

  const created = await reqJson("POST", "/api/shifts", { token: companyToken, body });
  assertOk(created.ok, `source shift created via real company shift create (${responseSummary(created)})`);

  const shiftId = Number(created.json?.id || created.json?.shift?.id || 0);
  assertOk(shiftId > 0, "source shift id present");

  await prisma.shift.update({
    where: { id: shiftId },
    data: {
      routeSnapshotValidatedAt: new Date(),
      routeSnapshotDistanceM: 3600,
      routeSnapshotDurationSec: 780,
    },
  });

  return {
    shiftId,
    hubLat,
    hubLng,
    stopNames,
    startAt,
    endAt,
  };
}

export async function createAgreementBundleFromSource({
  companyToken,
  roomId,
  sourceShiftId,
  hubLat,
  hubLng,
  noteTag,
}) {
  const startDate = trYmdPlus(1);
  const endDate = trYmdPlus(7);
  const body = {
    roomId,
    startDate,
    endDate,
    weekMask: 62,
    items: [
      {
        startMin: 480,
        endMin: 1020,
        direction: "INBOUND",
        pattern: "ONE_WAY",
        label: `${noteTag} slot`,
      },
    ],
    hubLat,
    hubLng,
    sourceShiftId,
    companyOfferAmount: 24000,
    companyOfferNote: `${noteTag} bundle`,
  };

  const created = await reqJson("POST", "/api/agreements/bundle", {
    token: companyToken,
    body,
  });
  assertOk(created.ok, `agreement bundle create from source shift (${responseSummary(created)})`);

  const createdIds = Array.isArray(created.json?.createdIds)
    ? created.json.createdIds.map((item) => Number(item)).filter((item) => item > 0)
    : [];
  assertOk(createdIds.length > 0, "agreement bundle returned createdIds");

  return {
    agreementIds: createdIds,
    agreementId: createdIds[0],
    startDate,
    endDate,
  };
}

export async function createGeneratedAgreementShift({
  agreementId,
  companyId,
  roomId,
  hubLat,
  hubLng,
  startAt,
  endAt,
  stopSpec = [],
  withSnapshot = false,
}) {
  const shift = await prisma.shift.create({
    data: {
      agreementId,
      companyId,
      roomId,
      startAt,
      endAt,
      status: "REQUESTED",
      hubLat,
      hubLng,
      direction: "INBOUND",
      pattern: "ONE_WAY",
      routeSnapshotValidatedAt: withSnapshot ? new Date() : null,
      routeSnapshotDistanceM: withSnapshot ? 4200 : null,
      routeSnapshotDurationSec: withSnapshot ? 900 : null,
    },
  });

  if (Array.isArray(stopSpec) && stopSpec.length) {
    await prisma.stop.createMany({
      data: stopSpec.map((item, index) => ({
        shiftId: shift.id,
        name: item.name,
        lat: item.lat,
        lng: item.lng,
        order: Number(item.order || index + 1),
        type: item.type || "COMMON",
      })),
    });
  }

  return shift;
}

export async function fetchOpsBridge(companyToken, agreementId) {
  const response = await reqJson("POST", "/api/agreements/ops-bridge", {
    token: companyToken,
    body: { agreementIds: [agreementId] },
  });
  assertOk(response.ok, "ops bridge loaded");
  const byId = response.json?.byId || {};
  return byId[String(agreementId)] || byId[agreementId] || null;
}

export async function cleanupAgreementSmokeArtifacts({ agreementIds = [], shiftIds = [] } = {}) {
  const cleanAgreementIds = Array.from(new Set((agreementIds || []).map((item) => Number(item)).filter((item) => item > 0)));
  const cleanShiftIds = Array.from(new Set((shiftIds || []).map((item) => Number(item)).filter((item) => item > 0)));
  if (!cleanAgreementIds.length && !cleanShiftIds.length) return;

  const agreementNotificationKeys = cleanAgreementIds.flatMap((id) => [
    `agreement:${id}:requested`,
    `agreement:${id}:approved`,
    `agreement:${id}:counter`,
    `agreement:${id}:counterAccepted`,
    `agreement:${id}:counterRejected`,
    `agreement:${id}:rejected`,
    `agreement:${id}:cancelled`,
  ]);

  const sourceRows = await prisma.commercialSource.findMany({
    where: {
      OR: [
        cleanAgreementIds.length ? { agreementId: { in: cleanAgreementIds } } : undefined,
        cleanShiftIds.length ? { shiftRootId: { in: cleanShiftIds } } : undefined,
      ].filter(Boolean),
    },
    select: { id: true },
  });
  const sourceIds = sourceRows.map((row) => Number(row.id)).filter((id) => id > 0);

  await prisma.$transaction([
    prisma.notification.deleteMany({
      where: {
        OR: [
          cleanShiftIds.length ? { shiftId: { in: cleanShiftIds } } : undefined,
          agreementNotificationKeys.length ? { dedupeKey: { in: agreementNotificationKeys } } : undefined,
        ].filter(Boolean),
      },
    }),
    prisma.driverPenalty.deleteMany({ where: cleanShiftIds.length ? { shiftId: { in: cleanShiftIds } } : { id: -1 } }),
    prisma.passengerLiveLink.deleteMany({ where: cleanShiftIds.length ? { shiftId: { in: cleanShiftIds } } : { id: -1 } }),
    prisma.checkinEvent.deleteMany({ where: cleanShiftIds.length ? { shiftId: { in: cleanShiftIds } } : { id: -1 } }),
    prisma.routeLearnSample.deleteMany({ where: cleanShiftIds.length ? { shiftId: { in: cleanShiftIds } } : { id: -1 } }),
    prisma.shiftProgress.deleteMany({ where: cleanShiftIds.length ? { shiftId: { in: cleanShiftIds } } : { id: -1 } }),
    prisma.pickupRequest.deleteMany({ where: cleanShiftIds.length ? { shiftId: { in: cleanShiftIds } } : { id: -1 } }),
    prisma.stopAssignment.deleteMany({ where: cleanShiftIds.length ? { shiftId: { in: cleanShiftIds } } : { id: -1 } }),
    prisma.shiftOffer.deleteMany({ where: cleanShiftIds.length ? { shiftId: { in: cleanShiftIds } } : { id: -1 } }),
    prisma.shiftPersonel.deleteMany({ where: cleanShiftIds.length ? { shiftId: { in: cleanShiftIds } } : { id: -1 } }),
    prisma.shiftImport.deleteMany({ where: cleanShiftIds.length ? { shiftId: { in: cleanShiftIds } } : { id: -1 } }),
    prisma.stop.deleteMany({ where: cleanShiftIds.length ? { shiftId: { in: cleanShiftIds } } : { id: -1 } }),
    prisma.commercialSource.deleteMany({ where: sourceIds.length ? { id: { in: sourceIds } } : { id: -1 } }),
    prisma.shift.deleteMany({ where: cleanShiftIds.length ? { id: { in: cleanShiftIds } } : { id: -1 } }),
    prisma.agreement.deleteMany({ where: cleanAgreementIds.length ? { id: { in: cleanAgreementIds } } : { id: -1 } }),
  ]);
}
