// backend/scripts/m2check.js
import { prisma } from "../src/prisma.js";
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
} from "./_harness.js";

function ok(msg) {
  console.log(`✅ ${msg}`);
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
    tag: "M2",
  });
  ok(`shift ACTIVE (id=${h.shiftId})`);

  try {
    // GPS ingest
    await postGps(driverToken, {
      vehicleId: h.vehicleId,
      lat: 41.0302,
      lng: 28.996,
      speed: 20,
      speedKmh: 20,
    });
    ok("POST /api/gps (LIVE)");

    // DB mapping
    const v = await prisma.vehicle.findUnique({ where: { id: h.vehicleId }, select: { status: true } });
    const gl = await prisma.gpsLast.findUnique({
      where: { vehicleId: h.vehicleId },
      select: { status: true, at: true },
    });
    if (v?.status !== "ACTIVE" || gl?.status !== "OK") {
      throw new Error(`❌ DB mapping wrong: Vehicle=${v?.status} GpsLast=${gl?.status}`);
    }
    ok("DB mapping LIVE -> Vehicle.ACTIVE + GpsLast.OK");

    // ETA
    const eta = await reqJson("GET", `/api/eta?vehicleId=${h.vehicleId}`, { token: driverToken });
    if (!eta.ok) throw new Error(`❌ GET /api/eta failed -> ${eta.status}\n${eta.text}`);
    if (!Array.isArray(eta.json?.stops)) throw new Error("❌ /api/eta invalid (stops[])");
    ok(`/api/eta ok (stops=${eta.json.stops.length})`);

    console.log("\n✅ M2CHECK PASS");
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
