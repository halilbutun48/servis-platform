// backend/src/ops/regionCapacity.js
import { prisma } from "../prisma.js";

function toInt(value) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

function createRegionBucket(region) {
  return {
    id: region.id,
    name: region.name,
    createdAt: region.createdAt,
    companyCount: 0,
    roomCount: 0,
    zoneCount: 0,
    zoneSamples: [],
    vehicleCount: 0,
    activeVehicleCount: 0,
    driverCount: 0,
    openShiftCount: 0,
    activeShiftCount: 0,
  };
}

function safeMapGet(map, key) {
  return key == null ? null : map.get(String(key)) || null;
}

function resolveRegionIdFromRoom(roomId, roomMap, companyMap) {
  const room = safeMapGet(roomMap, roomId);
  if (!room) return null;
  const directRegionId = toInt(room.regionId);
  if (directRegionId != null) return directRegionId;
  const company = safeMapGet(companyMap, room.companyId);
  return toInt(company?.regionId);
}

function resolveRegionIdFromCompany(companyId, companyMap) {
  const company = safeMapGet(companyMap, companyId);
  return toInt(company?.regionId);
}

function bump(bucketMap, regionId, field, amount = 1) {
  const id = toInt(regionId);
  if (id == null) return;
  const bucket = bucketMap.get(String(id));
  if (!bucket) return;
  bucket[field] += amount;
}

function pushZoneSample(zoneMapByRegion, regionId, district, amount = 1) {
  const id = toInt(regionId);
  const zoneName = String(district || "").trim();
  if (id == null || !zoneName) return;

  const key = String(id);
  const zoneMap = zoneMapByRegion.get(key) || new Map();
  zoneMap.set(zoneName, (zoneMap.get(zoneName) || 0) + amount);
  zoneMapByRegion.set(key, zoneMap);
}

function finalizeZoneSamples(zoneMapByRegion, bucketMap) {
  for (const [regionKey, zoneMap] of zoneMapByRegion.entries()) {
    const bucket = bucketMap.get(regionKey);
    if (!bucket) continue;
    bucket.zoneCount = zoneMap.size;
    bucket.zoneSamples = Array.from(zoneMap.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "tr"))
      .slice(0, 3);
  }
}

function sumBuckets(items) {
  return items.reduce(
    (acc, item) => {
      acc.companyCount += Number(item.companyCount || 0);
      acc.roomCount += Number(item.roomCount || 0);
      acc.zoneCount += Number(item.zoneCount || 0);
      acc.vehicleCount += Number(item.vehicleCount || 0);
      acc.activeVehicleCount += Number(item.activeVehicleCount || 0);
      acc.driverCount += Number(item.driverCount || 0);
      acc.openShiftCount += Number(item.openShiftCount || 0);
      acc.activeShiftCount += Number(item.activeShiftCount || 0);
      return acc;
    },
    {
      companyCount: 0,
      roomCount: 0,
      zoneCount: 0,
      vehicleCount: 0,
      activeVehicleCount: 0,
      driverCount: 0,
      openShiftCount: 0,
      activeShiftCount: 0,
    }
  );
}

export async function getRegionCapacitySnapshot() {
  const [regions, companyRows, roomRows, companyGroups, roomGroups, companyZoneGroups, roomZoneGroups, vehicleGroups, activeVehicleGroups, driverGroups, openShiftRoomGroups, openShiftCompanyGroups, activeShiftRoomGroups, activeShiftCompanyGroups] = await Promise.all([
    prisma.region.findMany({ orderBy: [{ name: "asc" }, { id: "asc" }] }),
    prisma.company.findMany({
      where: { status: { not: "DELETED" } },
      select: { id: true, regionId: true, district: true },
    }),
    prisma.room.findMany({
      where: { status: { not: "DELETED" } },
      select: { id: true, companyId: true, regionId: true, district: true },
    }),
    prisma.company.groupBy({
      by: ["regionId"],
      where: { regionId: { not: null }, status: { not: "DELETED" } },
      _count: { _all: true },
    }),
    prisma.room.groupBy({
      by: ["regionId"],
      where: { regionId: { not: null }, status: { not: "DELETED" } },
      _count: { _all: true },
    }),
    prisma.company.groupBy({
      by: ["regionId", "district"],
      where: { regionId: { not: null }, district: { not: null }, status: { not: "DELETED" } },
      _count: { _all: true },
    }),
    prisma.room.groupBy({
      by: ["regionId", "district"],
      where: { regionId: { not: null }, district: { not: null }, status: { not: "DELETED" } },
      _count: { _all: true },
    }),
    prisma.vehicle.groupBy({
      by: ["roomId"],
      _count: { _all: true },
    }),
    prisma.vehicle.groupBy({
      by: ["roomId"],
      where: { status: "ACTIVE" },
      _count: { _all: true },
    }),
    prisma.driver.groupBy({
      by: ["roomId"],
      _count: { _all: true },
    }),
    prisma.shift.groupBy({
      by: ["roomId"],
      where: { roomId: { not: null }, status: { in: ["REQUESTED", "APPROVED"] } },
      _count: { _all: true },
    }),
    prisma.shift.groupBy({
      by: ["companyId"],
      where: { roomId: null, status: { in: ["REQUESTED", "APPROVED"] } },
      _count: { _all: true },
    }),
    prisma.shift.groupBy({
      by: ["roomId"],
      where: { roomId: { not: null }, status: "ACTIVE" },
      _count: { _all: true },
    }),
    prisma.shift.groupBy({
      by: ["companyId"],
      where: { roomId: null, status: "ACTIVE" },
      _count: { _all: true },
    }),
  ]);

  const bucketMap = new Map(regions.map((region) => [String(region.id), createRegionBucket(region)]));
  const zoneMapByRegion = new Map();
  const companyMap = new Map(companyRows.map((row) => [String(row.id), row]));
  const roomMap = new Map(roomRows.map((row) => [String(row.id), row]));

  const applyRegionCount = (group, field) => {
    const regionId = group.regionId;
    const bucket = bucketMap.get(String(regionId));
    if (!bucket) return;
    bucket[field] += Number(group._count?._all || 0);
  };

  companyGroups.forEach((group) => applyRegionCount(group, "companyCount"));
  roomGroups.forEach((group) => applyRegionCount(group, "roomCount"));

  companyZoneGroups.forEach((group) => pushZoneSample(zoneMapByRegion, group.regionId, group.district, group._count?._all || 0));
  roomZoneGroups.forEach((group) => pushZoneSample(zoneMapByRegion, group.regionId, group.district, group._count?._all || 0));
  finalizeZoneSamples(zoneMapByRegion, bucketMap);

  for (const group of vehicleGroups) {
    const regionId = resolveRegionIdFromRoom(group.roomId, roomMap, companyMap);
    bump(bucketMap, regionId, "vehicleCount", Number(group._count?._all || 0));
  }
  for (const group of activeVehicleGroups) {
    const regionId = resolveRegionIdFromRoom(group.roomId, roomMap, companyMap);
    bump(bucketMap, regionId, "activeVehicleCount", Number(group._count?._all || 0));
  }
  for (const group of driverGroups) {
    const regionId = resolveRegionIdFromRoom(group.roomId, roomMap, companyMap);
    bump(bucketMap, regionId, "driverCount", Number(group._count?._all || 0));
  }
  for (const group of openShiftRoomGroups) {
    const regionId = resolveRegionIdFromRoom(group.roomId, roomMap, companyMap);
    bump(bucketMap, regionId, "openShiftCount", Number(group._count?._all || 0));
  }
  for (const group of openShiftCompanyGroups) {
    const regionId = resolveRegionIdFromCompany(group.companyId, companyMap);
    bump(bucketMap, regionId, "openShiftCount", Number(group._count?._all || 0));
  }
  for (const group of activeShiftRoomGroups) {
    const regionId = resolveRegionIdFromRoom(group.roomId, roomMap, companyMap);
    bump(bucketMap, regionId, "activeShiftCount", Number(group._count?._all || 0));
  }
  for (const group of activeShiftCompanyGroups) {
    const regionId = resolveRegionIdFromCompany(group.companyId, companyMap);
    bump(bucketMap, regionId, "activeShiftCount", Number(group._count?._all || 0));
  }

  const items = Array.from(bucketMap.values()).sort((a, b) => a.name.localeCompare(b.name, "tr"));
  return {
    ok: true,
    capturedAt: new Date().toISOString(),
    items,
    totals: sumBuckets(items),
  };
}
