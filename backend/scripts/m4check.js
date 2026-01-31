// backend/scripts/m4check.js
import {
  BASE_URL,
  login,
  getRoomCompanyIds,
  pickVehicleDriver,
  preCleanDriverShifts,
  ensureActiveShift,
  closeShiftHard,
  postGps,
  reqJson,
  sleep,
  callAny,
  itemsOf,
} from "./_harness.js";
import { prisma } from "../src/prisma.js";

function ok(msg) {
  console.log(`✅ ${msg}`);
}

async function listNotifs(token) {
  const res = await callAny("GET", ["/api/notifications/my", "/api/notifications", "/api/notifs"], { token });
  if (!res.ok) return { ok: false, items: [], raw: res.r, path: res.path };
  const items = itemsOf(res.r);
  return { ok: true, items, raw: res.r, path: res.path };
}

function payloadOf(n) {
  const p = n?.payloadJson ?? n?.payload ?? null;
  if (!p) return null;
  try {
    return typeof p === "string" ? JSON.parse(p) : p;
  } catch {
    return null;
  }
}

function countKind(items, kind, vehicleId) {
  let c = 0;
  for (const n of items ?? []) {
    const p = payloadOf(n);
    if (p?.kind !== kind) continue;
    if (vehicleId && Number(p?.vehicleId) !== Number(vehicleId)) continue;
    c++;
  }
  return c;
}

async function main() {
  console.log(`API_URL = ${BASE_URL}`);

  const driverToken = await login("driver@demo.com", "demo123");
  const roomToken = await login("room@demo.com", "demo123");
  const companyToken = await login("company@demo.com", "demo123");
  ok("login(driver/room/company)");

  const { roomId, companyId } = await getRoomCompanyIds(roomToken, companyToken);
  const { vehicleId, driverId } = await pickVehicleDriver(roomToken);

  const pre = await preCleanDriverShifts({ roomToken, driverToken, driverId });
  if (pre.found) console.log(`🧹 pre-clean: found=${pre.found} cleaned=${pre.cleaned}`);

  const h = await ensureActiveShift({
    companyToken,
    roomToken,
    driverToken,
    companyId,
    roomId,
    vehicleId,
    driverId,
    tag: "M4",
  });
  ok(`shift ACTIVE (id=${h.shiftId})`);

  try {
    // baseline LIVE
    await postGps(driverToken, { vehicleId: h.vehicleId, lat: 41.0309, lng: 28.9966, speed: 10, speedKmh: 10 });

    // overspeed
    const d0 = await listNotifs(driverToken);
    const r0 = await listNotifs(roomToken);
    const c0 = await listNotifs(companyToken);
    const d0n = countKind(d0.items, "OVERSPEED", h.vehicleId);
    const r0n = countKind(r0.items, "OVERSPEED", h.vehicleId);
    const c0n = countKind(c0.items, "OVERSPEED", h.vehicleId);

    await postGps(driverToken, { vehicleId: h.vehicleId, lat: 41.031, lng: 28.9967, speed: 200, speedKmh: 200 });
    await sleep(800);

    const d1 = await listNotifs(driverToken);
    const r1 = await listNotifs(roomToken);
    const c1 = await listNotifs(companyToken);

    if (countKind(d1.items, "OVERSPEED", h.vehicleId) <= d0n) throw new Error("❌ OVERSPEED not created for DRIVER");
    if (countKind(r1.items, "OVERSPEED", h.vehicleId) <= r0n) throw new Error("❌ OVERSPEED not created for ROOM");
    if (countKind(c1.items, "OVERSPEED", h.vehicleId) <= c0n) throw new Error("❌ OVERSPEED not created for COMPANY");
    ok("OVERSPEED notif (driver/room/company)");

    // LIVE->STALE
    console.log("⏳ waiting ~45s for LIVE->STALE monitor tick...");
    await sleep(45_000);

    const sD = await listNotifs(driverToken);
    const sR = await listNotifs(roomToken);
    const sC = await listNotifs(companyToken);
    if (countKind(sD.items, "GPS_STALE", h.vehicleId) < 1) throw new Error("❌ GPS_STALE missing (driver)");
    if (countKind(sR.items, "GPS_STALE", h.vehicleId) < 1) throw new Error("❌ GPS_STALE missing (room)");
    if (countKind(sC.items, "GPS_STALE", h.vehicleId) < 1) throw new Error("❌ GPS_STALE missing (company)");
    ok("LIVE->STALE notif created (driver/room/company)");

    // dedupe STALE
    const stale1 = countKind(sD.items, "GPS_STALE", h.vehicleId);
    console.log("⏳ waiting ~45s for STALE dedupe tick...");
    await sleep(45_000);
    const sD2 = await listNotifs(driverToken);
    const stale2 = countKind(sD2.items, "GPS_STALE", h.vehicleId);
    if (stale2 > stale1) throw new Error("❌ GPS_STALE dedupe FAIL (count increased)");
    ok("GPS_STALE dedupe OK");

    // STALE->OFFLINE
    // Status standardına göre OFFLINE için ageSec > 300 (5dk) gerekir.
    // Gate testini hızlı ve deterministik tutmak için gpsLast.at'i ileri alıp
    // monitor tick'ini bekliyoruz (FULLCHECK ile aynı yaklaşım).
    console.log("⏳ forcing STALE->OFFLINE (gpsLast.at -350s) and waiting ~20s for monitor tick...");
    await prisma.gpsLast.update({
      where: { vehicleId: h.vehicleId },
      data: { at: new Date(Date.now() - 350_000) },
    });
    await sleep(20_000);

    const oD = await listNotifs(driverToken);
    const oR = await listNotifs(roomToken);
    const oC = await listNotifs(companyToken);
    if (countKind(oD.items, "GPS_OFFLINE", h.vehicleId) < 1) throw new Error("❌ GPS_OFFLINE missing (driver)");
    if (countKind(oR.items, "GPS_OFFLINE", h.vehicleId) < 1) throw new Error("❌ GPS_OFFLINE missing (room)");
    if (countKind(oC.items, "GPS_OFFLINE", h.vehicleId) < 1) throw new Error("❌ GPS_OFFLINE missing (company)");
    ok("STALE->OFFLINE notif created (driver/room/company)");

    // recovery
    await postGps(driverToken, { vehicleId: h.vehicleId, lat: 41.0312, lng: 28.9969, speed: 20, speedKmh: 20 });
    await sleep(800);

    const rD = await listNotifs(driverToken);
    const rR = await listNotifs(roomToken);
    const rC = await listNotifs(companyToken);
    if (countKind(rD.items, "GPS_RECOVERY", h.vehicleId) < 1) throw new Error("❌ GPS_RECOVERY missing (driver)");
    if (countKind(rR.items, "GPS_RECOVERY", h.vehicleId) < 1) throw new Error("❌ GPS_RECOVERY missing (room)");
    if (countKind(rC.items, "GPS_RECOVERY", h.vehicleId) < 1) throw new Error("❌ GPS_RECOVERY missing (company)");
    ok("OFFLINE->LIVE recovery notif created (driver/room/company)");

    console.log("\n✅ M4CHECK PASS");
  } finally {
    const closed = await closeShiftHard({ shiftId: h.shiftId, driverToken, roomToken });
    if (closed) ok(`shift complete (cleanup) shiftId=${h.shiftId}`);
    else console.log(`⚠️ cleanup failed shiftId=${h.shiftId}`);
  }
}

main().catch((e) => {
  console.error(String(e?.stack ?? e));
  process.exit(1);
});
