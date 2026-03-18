// backend/scripts/m54_4_driver_route_delivery_check.js
// M54.4 Driver Route Delivery:
// - explicit assigned shift route endpoint
// - active route endpoint still works
// - explicit route action remains driver-scoped

import {
  banner,
  step,
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
    body: { plate: `M544-${uniq}`, capacity: 16, speedLimitKmh: 90 },
  });
  assertOk(r.ok, "vehicle create ok");
  const vehicleId = Number(r.json?.id || r.json?.vehicle?.id || 0);
  must("vehicleId present", vehicleId > 0);
  return vehicleId;
}

async function createIsolatedDriver(roomToken, uniq) {
  const r = await reqJson("POST", "/api/drivers", {
    token: roomToken,
    body: { fullName: `M54.4 Driver ${uniq}`, phone: `90539${uniq}11`, deviceInfo: "m54_4-device" },
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
  banner("M54.4 DRIVER ROUTE DELIVERY CHECK");

  const roomToken = await loginFirst("room");
  const companyToken = await loginFirst("company");
  must("room login ok", !!roomToken);
  must("company login ok", !!companyToken);

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
      tag: "M544",
    });
    shiftId = Number(active.shiftId || 0);
    must("active shiftId present", shiftId > 0);

    banner("driver today list");
    const today = await reqJson("GET", "/api/driver/shifts/today", { token: driverToken });
    assertOk(today.ok, "today list ok");
    const allRows = [...(today.json?.today || []), ...(today.json?.tomorrow || [])];
    assertOk(allRows.some((x) => Number(x?.id) === shiftId), "today list includes assigned shift");

    banner("explicit shift route");
    const explicitRoute = await reqJson("GET", `/api/driver/shifts/${shiftId}/route`, { token: driverToken });
    assertOk(explicitRoute.ok, "explicit shift route ok");
    assertOk(Number(explicitRoute.json?.shift?.id || 0) === shiftId, "explicit route returns requested shift");
    assertOk(Array.isArray(explicitRoute.json?.orderedStops) && explicitRoute.json.orderedStops.length >= 1, "explicit route ordered stops present");
    assertOk(["APPROVED", "ACTIVE", "DONE"].includes(String(explicitRoute.json?.shift?.status || "")), "explicit route status allowed");

    banner("active route remains available");
    const activeRoute = await reqJson("GET", "/api/driver/route/active", { token: driverToken });
    assertOk(activeRoute.ok, "active route ok");
    assertOk(Number(activeRoute.json?.shift?.id || 0) === shiftId, "active route returns assigned shift");

    banner("driver scope guard");
    const foreignRoute = await reqJson("GET", `/api/driver/shifts/999999/route`, { token: driverToken });
    assertOk(foreignRoute.status === 404 || foreignRoute.status === 403, "foreign/unknown shift denied");

    console.log("\nOK M54.4 DRIVER ROUTE DELIVERY CHECK PASS");
  } finally {
    if (shiftId && driverToken) {
      step(`cleanup shiftId=${shiftId}`);
      await sleep(150);
      await closeShiftHard({ shiftId, driverToken, roomToken });
    }
    await safeDelete(roomToken, "vehicle", vehicleId);
    await safeDelete(roomToken, "driver", driverId);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
