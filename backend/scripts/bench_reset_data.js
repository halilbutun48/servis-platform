import { prisma } from "../src/prisma.js";

const DEFAULT_BENCH_PREFIX = "__BENCH_";
const DEFAULT_DRIVER_EMAIL_PREFIXES = ["bench-company-", "bench-room-", "bench-driver-"];
const DEFAULT_DRIVER_CODE_PREFIX = "BENCH-DRV-";
const DEFAULT_VEHICLE_PLATE_PREFIX = "BENCH-";

function parseArgs(argv) {
  const out = {};
  for (const raw of argv) {
    if (!raw.startsWith("--")) continue;
    const body = raw.slice(2);
    if (!body) continue;
    const eq = body.indexOf("=");
    if (eq === -1) {
      out[body] = true;
      continue;
    }
    const key = body.slice(0, eq);
    const value = body.slice(eq + 1);
    out[key] = value;
  }
  return out;
}

function uniqueIds(rows) {
  return [...new Set((rows || []).map((row) => {
    if (typeof row === "number") return row;
    if (typeof row === "string" && row.trim()) return Number(row);
    return Number(row?.id);
  }).filter((n) => Number.isFinite(n)))];
}

function inWhere(field, values) {
  const list = uniqueIds(values);
  if (!list.length) return null;
  return { [field]: { in: list } };
}

function orWhere(...clauses) {
  const list = clauses.filter(Boolean);
  if (!list.length) return null;
  if (list.length === 1) return list[0];
  return { OR: list };
}

function startsWithWhere(field, prefixes) {
  const list = [...new Set((prefixes || []).map((v) => String(v || "").trim()).filter(Boolean))];
  const clauses = list.map((prefix) => ({ [field]: { startsWith: prefix } }));
  return orWhere(...clauses);
}

function banner(title) {
  console.log("");
  console.log(`=== ${title} ===`);
}

async function deleteRows(tx, modelName, where, label, stats) {
  if (!where) return 0;
  const result = await tx[modelName].deleteMany({ where });
  const count = Number(result?.count || 0);
  if (label) stats.deleted[label] = count;
  return count;
}

async function collectTargets(tx, prefix) {
  const companyWhere = orWhere(
    startsWithWhere("name", [prefix]),
    startsWithWhere("notes", [prefix])
  );
  const roomWhere = orWhere(
    startsWithWhere("name", [prefix]),
    startsWithWhere("notes", [prefix])
  );

  const [companies, rooms] = await Promise.all([
    tx.company.findMany({ where: companyWhere, select: { id: true, name: true, notes: true } }),
    tx.room.findMany({ where: roomWhere, select: { id: true, name: true, notes: true } }),
  ]);

  const companyIds = uniqueIds(companies);
  const roomIds = uniqueIds(rooms);

  const userWhere = orWhere(
    startsWithWhere("email", DEFAULT_DRIVER_EMAIL_PREFIXES),
    inWhere("companyId", companyIds),
    inWhere("roomId", roomIds)
  );
  const users = userWhere
    ? await tx.user.findMany({
        where: userWhere,
        select: { id: true, email: true, companyId: true, roomId: true, role: true },
      })
    : [];
  const userIds = uniqueIds(users);

  const driverWhere = orWhere(
    startsWithWhere("driverCode", [DEFAULT_DRIVER_CODE_PREFIX]),
    inWhere("roomId", roomIds),
    inWhere("userId", userIds)
  );
  const drivers = driverWhere
    ? await tx.driver.findMany({
        where: driverWhere,
        select: { id: true, driverCode: true, roomId: true, userId: true },
      })
    : [];
  const driverIds = uniqueIds(drivers);

  const vehicleWhere = orWhere(
    startsWithWhere("plate", [DEFAULT_VEHICLE_PLATE_PREFIX]),
    inWhere("roomId", roomIds),
    inWhere("driverId", driverIds)
  );
  const vehicles = vehicleWhere
    ? await tx.vehicle.findMany({
        where: vehicleWhere,
        select: { id: true, plate: true, roomId: true, driverId: true },
      })
    : [];
  const vehicleIds = uniqueIds(vehicles);

  const shiftWhere = orWhere(
    inWhere("companyId", companyIds),
    inWhere("roomId", roomIds),
    inWhere("vehicleId", vehicleIds),
    inWhere("driverId", driverIds)
  );
  const shifts = shiftWhere
    ? await tx.shift.findMany({
        where: shiftWhere,
        select: { id: true, companyId: true, roomId: true, vehicleId: true, driverId: true },
      })
    : [];
  const shiftIds = uniqueIds(shifts);

  const stopWhere = inWhere("shiftId", shiftIds);
  const stops = stopWhere ? await tx.stop.findMany({ where: stopWhere, select: { id: true } }) : [];
  const _stopIds = uniqueIds(stops);

  return {
    companies,
    rooms,
    users,
    drivers,
    vehicles,
    shifts,
    stops,
    ids: { companyIds, roomIds, userIds, driverIds, vehicleIds, shiftIds, stopIds: _stopIds },
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const benchPrefix = String(args.prefix || process.env.BENCH_PREFIX || DEFAULT_BENCH_PREFIX).trim();
  const dryRun = String(args.dryRun || process.env.BENCH_DRY_RUN || "").trim() === "1" || args.dryRun === true;
  const force = String(args.force || process.env.BENCH_FORCE || "").trim() === "1" || args.force === true;

  banner("BENCHMARK DATA RESET");
  console.log(`benchPrefix: ${benchPrefix}`);
  console.log(`dryRun: ${dryRun ? "yes" : "no"}`);
  console.log(`force: ${force ? "yes" : "no"}`);

  if (!force && !dryRun) {
    throw new Error("refusing to reset benchmark data without --force or --dryRun");
  }

  const targets = await prisma.$transaction(
    async (tx) => collectTargets(tx, benchPrefix),
    { maxWait: 30_000, timeout: 120_000 }
  );

  const summary = {
    companies: targets.ids.companyIds.length,
    rooms: targets.ids.roomIds.length,
    users: targets.ids.userIds.length,
    drivers: targets.ids.driverIds.length,
    vehicles: targets.ids.vehicleIds.length,
    shifts: targets.ids.shiftIds.length,
    stops: targets.ids.stopIds.length,
  };

  console.log(`matched: ${JSON.stringify(summary)}`);

  if (dryRun) {
    banner("BENCHMARK DATA RESET DRY RUN PASS");
    await prisma.$disconnect();
    return;
  }

  const stats = { deleted: {} };
  const companyIds = targets.ids.companyIds;
  const roomIds = targets.ids.roomIds;
  const userIds = targets.ids.userIds;
  const driverIds = targets.ids.driverIds;
  const vehicleIds = targets.ids.vehicleIds;
  const shiftIds = targets.ids.shiftIds;

  await prisma.$transaction(
    async (tx) => {
      await deleteRows(
        tx,
        "notification",
        orWhere(
          inWhere("companyId", companyIds),
          inWhere("roomId", roomIds),
          inWhere("driverId", driverIds),
          inWhere("userId", userIds),
          inWhere("vehicleId", vehicleIds),
          inWhere("shiftId", shiftIds)
        ),
        "Notification",
        stats
      );

      await deleteRows(tx, "apiRequest", inWhere("userId", userIds), "ApiRequest", stats);
      await deleteRows(tx, "auditLog", inWhere("actorUserId", userIds), "AuditLog", stats);

      await deleteRows(tx, "driverPenalty", orWhere(inWhere("driverId", driverIds), inWhere("shiftId", shiftIds), inWhere("createdByUserId", userIds)), "DriverPenalty", stats);
      await deleteRows(tx, "shiftProgress", inWhere("shiftId", shiftIds), "ShiftProgress", stats);
      await deleteRows(tx, "pickupRequest", inWhere("shiftId", shiftIds), "PickupRequest", stats);
      await deleteRows(tx, "stop", inWhere("shiftId", shiftIds), "Stop", stats);
      await deleteRows(tx, "gpsPoint", inWhere("vehicleId", vehicleIds), "GpsPoint", stats);
      await deleteRows(tx, "gpsLast", inWhere("vehicleId", vehicleIds), "GpsLast", stats);

      await deleteRows(
        tx,
        "agreement",
        orWhere(
          inWhere("companyId", companyIds),
          inWhere("roomId", roomIds),
          inWhere("vehicleId", vehicleIds),
          inWhere("driverId", driverIds)
        ),
        "Agreement",
        stats
      );

      await deleteRows(tx, "commercialSource", inWhere("companyId", companyIds), "CommercialSource", stats);
      await deleteRows(tx, "organizationPlan", inWhere("companyId", companyIds), "OrganizationPlan", stats);
      await deleteRows(tx, "routeTemplate", inWhere("roomId", roomIds), "RouteTemplate", stats);
      await deleteRows(tx, "paymentAccount", orWhere(inWhere("companyId", companyIds), inWhere("roomId", roomIds)), "PaymentAccount", stats);
      await deleteRows(tx, "commissionRule", inWhere("roomId", roomIds), "CommissionRule", stats);

      await deleteRows(tx, "shift", inWhere("id", shiftIds), "Shift", stats);
      await deleteRows(tx, "vehicle", inWhere("id", vehicleIds), "Vehicle", stats);
      await deleteRows(tx, "driver", inWhere("id", driverIds), "Driver", stats);

      await deleteRows(tx, "parentChild", inWhere("parentUserId", userIds), "ParentChild", stats);
      await deleteRows(tx, "user", inWhere("id", userIds), "User", stats);

      await deleteRows(tx, "room", inWhere("id", roomIds), "Room", stats);
      await deleteRows(tx, "company", inWhere("id", companyIds), "Company", stats);
    },
    { maxWait: 60_000, timeout: 1_200_000 }
  );

  console.log(`deleted: ${JSON.stringify(stats.deleted)}`);
  banner("BENCHMARK DATA RESET PASS");
  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error(err?.stack || String(err));
  try {
    await prisma.$disconnect();
  } catch {
    // no-op
  }
  process.exit(1);
});
