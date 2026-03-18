import { prisma } from "../src/prisma.js";
import {
  banner,
  assertOk,
  must,
  reqJson,
  loginFirst,
  getRoomCompanyIds,
  ensureActiveShift,
  closeShiftHard,
  sleep,
} from "./_harness.js";

async function createIsolatedVehicle(roomToken, uniq) {
  const r = await reqJson("POST", "/api/vehicles", {
    token: roomToken,
    body: { plate: `M56-${uniq}`, capacity: 16, speedLimitKmh: 90 },
  });
  assertOk(r.ok, "vehicle create ok");
  const vehicleId = Number(r.json?.id || r.json?.vehicle?.id || 0);
  must("vehicleId present", vehicleId > 0);
  return vehicleId;
}

async function createIsolatedDriver(roomToken, uniq) {
  const r = await reqJson("POST", "/api/drivers", {
    token: roomToken,
    body: { fullName: `M56 Driver ${uniq}`, phone: `90538${uniq}22`, deviceInfo: "m56-device" },
  });
  assertOk(r.ok, "driver create ok");
  const driverId = Number(r.json?.id || r.json?.driver?.id || 0);
  const driverCode = String(r.json?.issuedCredentials?.driverCode || "");
  const temporaryPin = String(r.json?.issuedCredentials?.temporaryPin || "");
  must("driverId present", driverId > 0);
  must("driver code issued", driverCode.length >= 6);
  must("temporary pin issued", temporaryPin.length >= 4);
  return { driverId, driverCode, temporaryPin };
}

async function safeDelete(roomToken, kind, id) {
  if (!id) return;
  const path = kind === "vehicle" ? `/api/vehicles/${id}` : `/api/drivers/${id}`;
  const r = await reqJson("DELETE", path, { token: roomToken });
  if (r.ok || r.status === 404 || r.status === 400) return;
  throw new Error(`${kind} delete failed -> ${r.status}`);
}

async function main() {
  banner("M56 KVKK MATRIX + ETA QUALITY CHECK");

  const roomToken = await loginFirst("room");
  const companyToken = await loginFirst("company");
  const personelToken = await loginFirst("personel");
  must("room login ok", !!roomToken);
  must("company login ok", !!companyToken);
  must("personel login ok", !!personelToken);

  const matrix = await reqJson("GET", "/api/kvkk/matrix", { token: roomToken });
  assertOk(matrix.ok, "kvkk matrix ok");
  assertOk(Array.isArray(matrix.json?.rows) && matrix.json.rows.length >= 4, "kvkk matrix rows present");
  assertOk(String(matrix.json?.version || "").length >= 8, "kvkk matrix version present");

  const kvkkSummary = await reqJson("GET", "/api/kvkk/summary", { token: personelToken });
  assertOk(kvkkSummary.ok, "personel kvkk summary ok");

  const kvkkRequired = await reqJson("GET", "/api/kvkk/required", { token: personelToken });
  assertOk(kvkkRequired.ok, "personel kvkk required ok");

  const { roomId, companyId } = await getRoomCompanyIds(roomToken, companyToken);
  const uniq = String(Date.now()).slice(-6);

  let vehicleId = null;
  let driverId = null;
  let driverToken = null;
  let shiftId = null;

  try {
    vehicleId = await createIsolatedVehicle(roomToken, uniq);
    const createdDriver = await createIsolatedDriver(roomToken, uniq);
    driverId = createdDriver.driverId;

    const loginResp = await reqJson("POST", "/api/auth/login", {
      body: { identifier: createdDriver.driverCode, password: createdDriver.temporaryPin },
    });
    assertOk(loginResp.ok, "isolated driver login ok");
    driverToken = String(loginResp.json?.token || "");
    must("isolated driver token present", driverToken.length > 20);

    const active = await ensureActiveShift({
      companyToken,
      roomToken,
      driverToken,
      companyId,
      roomId,
      vehicleId,
      driverId,
      tag: "M56",
    });
    shiftId = Number(active.shiftId || 0);
    must("active shiftId present", shiftId > 0);

    await prisma.gpsLast.upsert({
      where: { vehicleId },
      update: { lat: 41.0304, lng: 28.9962, speed: 32, at: new Date() },
      create: { vehicleId, lat: 41.0304, lng: 28.9962, speed: 32, at: new Date() },
    });

    const eta1 = await reqJson("GET", `/api/eta/vehicle/${vehicleId}?shiftId=${shiftId}`, { token: companyToken });
    assertOk(eta1.ok, "company eta ok");
    assertOk(String(eta1.json?.etaMode || "") === "ROUTE_CHAIN_HAVERSINE", "eta mode ok");
    assertOk(Number(eta1.json?.remainingStopsCount || 0) >= 1, "eta remaining stops count ok");
    assertOk(!!eta1.json?.navigation?.lat && !!eta1.json?.navigation?.lng, "eta navigation present");
    assertOk(String(eta1.json?.routeProgressState || "").length > 0, "eta progress state present");

    const personelEta = await reqJson("GET", `/api/eta/vehicle/${vehicleId}?shiftId=${shiftId}`, { token: personelToken });
    assertOk(personelEta.ok, "personel eta ok");

    const personelShifts = await reqJson("GET", "/api/personel/shifts?take=20", { token: personelToken });
    assertOk(personelShifts.ok, "personel shifts list ok");

    const stops = await prisma.stop.findMany({ where: { shiftId }, orderBy: { order: "asc" } });
    must("isolated shift stops present", stops.length >= 3);

    await prisma.stop.update({ where: { id: stops[0].id }, data: { state: "REACHED", reachedAt: new Date() } });
    await prisma.stop.update({ where: { id: stops[1].id }, data: { state: "SKIPPED", skippedAt: new Date() } });
    await sleep(100);

    const eta2 = await reqJson("GET", `/api/eta/vehicle/${vehicleId}?shiftId=${shiftId}`, { token: companyToken });
    assertOk(eta2.ok, "eta after skip ok");
    assertOk(Number(eta2.json?.skippedStopsCount || 0) === 1, "skipped stop count ok");
    assertOk(Array.isArray(eta2.json?.skippedStops) && eta2.json.skippedStops.length === 1, "skipped stop list ok");
    assertOk(eta2.json?.rerouteSuggested === true, "reroute suggested after skip");
    assertOk(String(eta2.json?.nextAction || "") === "CONTINUE_TO_NEXT_PENDING", "next action after skip ok");
    assertOk(Number(eta2.json?.remainingStopsCount || 0) === 1, "remaining stop count after skip ok");

    await prisma.stop.update({ where: { id: stops[2].id }, data: { state: "REACHED", reachedAt: new Date() } });
    await sleep(100);

    const eta3 = await reqJson("GET", `/api/eta/vehicle/${vehicleId}?shiftId=${shiftId}`, { token: companyToken });
    assertOk(eta3.ok, "eta done ok");
    assertOk(String(eta3.json?.routeProgressState || "") === "DONE_WITH_SKIPS", "done with skips state ok");
    assertOk(String(eta3.json?.nextAction || "") === "CONTACT_ROOM", "done next action ok");
    assertOk(!!eta3.json?.lastResolvedStop, "last resolved stop present");

    console.log("\nOK M56 KVKK MATRIX + ETA QUALITY CHECK PASS");
  } finally {
    if (shiftId && driverToken) {
      await sleep(150);
      await closeShiftHard({ shiftId, driverToken, roomToken });
    }
    await prisma.gpsLast.deleteMany({ where: { vehicleId: Number(vehicleId || 0) } });
    await safeDelete(roomToken, "vehicle", vehicleId);
    await safeDelete(roomToken, "driver", driverId);
  }
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});
