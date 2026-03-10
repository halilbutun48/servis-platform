// backend/scripts/m14check.js
import { login, reqJson, ok, must, getRoomCompanyIds } from "./_harness.js";

function iso(msFromNow) {
  return new Date(Date.now() + msFromNow).toISOString();
}

async function loginFirst(emailCandidates, password) {
  let lastErr = null;
  for (const email of emailCandidates) {
    try {
      return await login(email, password);
    } catch (e) {
      lastErr = e;
      const msg = String(e?.message || e);
      if (msg.toLowerCase().includes("invalid credentials")) continue;
      if (msg.includes("401")) continue;
      continue;
    }
  }
  throw new Error(
    `login failed for all candidates: ${emailCandidates.join(", ")} -> ${
      String(lastErr?.message || lastErr)
    }`
  );
}

async function listVehicles(roomToken) {
  const r = await reqJson("GET", "/api/vehicles", { token: roomToken });
  ok("Vehicle list", r.status === 200);
  return (r.json?.items || r.json || []).map((v) => Number(v.id)).filter(Number.isFinite);
}

async function listDrivers(roomToken) {
  const r = await reqJson("GET", "/api/drivers", { token: roomToken });
  ok("Driver list", r.status === 200);
  return (r.json?.items || r.json || []).map((d) => Number(d.id)).filter(Number.isFinite);
}

async function createVehicle(roomToken) {
  const plate = "M14-" + Math.random().toString(16).slice(2, 7).toUpperCase();
  const c = await reqJson("POST", "/api/vehicles", {
    token: roomToken,
    body: { plate, capacity: 16, speedLimitKmh: 90 },
  });
  ok("Vehicle create (ensure)", c.status === 200 || c.status === 201);
  must("Vehicle id (ensure)", c.json?.id);
  return Number(c.json.id);
}

async function createDriver(roomToken) {
  const name = "M14 Driver " + Math.random().toString(16).slice(2, 6);
  const c = await reqJson("POST", "/api/drivers", {
    token: roomToken,
    body: { fullName: name, phone: "0000000000", deviceInfo: "m14-test" },
  });
  ok("Driver create (ensure)", c.status === 200 || c.status === 201);
  must("Driver id (ensure)", c.json?.id);
  return Number(c.json.id);
}

async function ensureMinVehicles(roomToken, minCount = 3) {
  let ids = await listVehicles(roomToken);
  while (ids.length < minCount) {
    ids.push(await createVehicle(roomToken));
  }
  return ids;
}

async function ensureMinDrivers(roomToken, minCount = 3) {
  let ids = await listDrivers(roomToken);
  while (ids.length < minCount) {
    ids.push(await createDriver(roomToken));
  }
  return ids;
}

async function createShift(companyToken, { roomId, startAt, endAt }) {
  const body = { roomId, startAt, endAt };
  const r = await reqJson("POST", "/api/shifts", { token: companyToken, body });

  if (!(r.status === 200 || r.status === 201)) {
    console.log("shift create status =", r.status);
    console.log("shift create body   =", JSON.stringify(r.json || {}, null, 2));
  }

  ok("Shift create (blocker)", r.status === 200 || r.status === 201);
  const id = r.json?.id ?? r.json?.shift?.id ?? r.json?.item?.id;
  must("Shift id (blocker)", id);
  return Number(id);
}

async function approveShift(roomToken, shiftId, vehicleId, driverId) {
  const a = await reqJson("PUT", `/api/shifts/${shiftId}/approve`, {
    token: roomToken,
    body: { vehicleId, driverId },
  });

  if (a.status !== 200) {
    console.log("approve status =", a.status);
    console.log("approve body   =", JSON.stringify(a.json || {}, null, 2));
  }

  ok("Approve blocker shift", a.status === 200);
}

async function rejectShift(roomToken, id) {
  const r = await reqJson("PUT", `/api/shifts/${id}/reject`, { token: roomToken, body: {} });
  ok(`Shift reject (cleanup) id=${id}`, r.status === 200 || r.status === 409);
}

async function callAvailability(roomToken, { driverId, vehicleId, startAt, endAt }) {
  const qs = new URLSearchParams({
    driverId: String(driverId),
    vehicleId: String(vehicleId),
    startAt: String(startAt),
    endAt: String(endAt),
  }).toString();

  const candidates = [
    `/api/availability?${qs}`,
    `/api/availability/check?${qs}`,
    `/api/shifts/availability?${qs}`,
  ];

  let last = null;
  for (const path of candidates) {
    const r = await reqJson("GET", path, { token: roomToken });
    if (r.status !== 404) return { path, r };
    last = r;
  }
  throw new Error(`availability endpoint not found (tried: ${candidates.join(", ")}) last=${last?.status}`);
}

function isAvailOk(resp) {
  const { r } = resp;
  return (r.status === 200 && r.json && r.json.ok === true) || r.status === 204;
}

function assertAvailOk(title, resp) {
  ok(title, isAvailOk(resp));
  if (!isAvailOk(resp)) {
    const { r } = resp;
    throw new Error(`${title} failed: status=${r.status} body=${JSON.stringify(r.json || {})}`);
  }
}

function assertConflict(title, resp, expectedCode) {
  const { r } = resp;

  if (r.status === 409) {
    ok(`${title} -> 409`, true);
    const code = String(r.json?.code || "");
    if (expectedCode === "VEHICLE_CONFLICT") {
      must(`${title} code`, code === "VEHICLE_CONFLICT" || code.startsWith("VEHICLE"));
    } else {
      must(`${title} code`, code === expectedCode);
    }
    return;
  }

  if (r.status === 200 && r.json && r.json.ok === false) {
    ok(`${title} -> ok:false`, true);
    const code = String(r.json?.code || "");
    if (expectedCode === "VEHICLE_CONFLICT") {
      must(`${title} code`, code === "VEHICLE_CONFLICT" || code.startsWith("VEHICLE"));
    } else {
      must(`${title} code`, code === expectedCode);
    }
    return;
  }

  console.log("conflict unexpected status =", r.status);
  console.log("conflict unexpected body   =", JSON.stringify(r.json || {}, null, 2));
  throw new Error(`${title} unexpected response: status=${r.status}`);
}

async function pickAvailablePair(roomToken, vehicles, drivers, startAt, endAt, { excludeVehicles = new Set(), excludeDrivers = new Set() } = {}) {
  for (const vehicleId of vehicles) {
    if (excludeVehicles.has(vehicleId)) continue;
    for (const driverId of drivers) {
      if (excludeDrivers.has(driverId)) continue;
      const resp = await callAvailability(roomToken, { vehicleId, driverId, startAt, endAt });
      if (isAvailOk(resp)) return { vehicleId, driverId };
    }
  }
  return null;
}

async function main() {
  console.log("=== M14 ===");
  console.log("API_URL = http://127.0.0.1:3000");

  const PASS = process.env.SEED_PASS || "demo123";

  const roomToken = await loginFirst(
    [process.env.ROOM_EMAIL || "room@demo.com", "room_seed@demo.com"],
    PASS
  );
  const companyToken = await loginFirst(
    [process.env.COMPANY_EMAIL || "company@demo.com", "company_seed@demo.com"],
    PASS
  );

  const { roomId } = await getRoomCompanyIds(roomToken, companyToken);

  // blocker shift: [start1,end1)
  const start1 = iso(10 * 60 * 1000);
  const end1   = iso(70 * 60 * 1000);

  // query window (overlap)
  const startQ = iso(20 * 60 * 1000);
  const endQ   = iso(60 * 60 * 1000);

  // OK flake önleme: en az 3 araç + 3 driver
  const vehicleIds = await ensureMinVehicles(roomToken, 3);
  const driverIds  = await ensureMinDrivers(roomToken, 3);

  const blockerId = await createShift(companyToken, { roomId, startAt: start1, endAt: end1 });

  try {
    // 1) blocker approve için free pair bul
    const blockerPair = await pickAvailablePair(roomToken, vehicleIds, driverIds, start1, end1);
    if (!blockerPair) throw new Error("No free (vehicle,driver) pair found for blocker approve");

    await approveShift(roomToken, blockerId, blockerPair.vehicleId, blockerPair.driverId);

    // 2) OK testi için blocker pair HARİÇ free pair bul (aynı overlap penceresinde)
    const okPair = await pickAvailablePair(
      roomToken,
      vehicleIds,
      driverIds,
      startQ,
      endQ,
      {
        excludeVehicles: new Set([blockerPair.vehicleId]),
        excludeDrivers: new Set([blockerPair.driverId]),
      }
    );
    if (!okPair) {
      throw new Error("No second free pair found for availability ok test (excluding blocker pair)");
    }

    // availability ok
    const a1 = await callAvailability(roomToken, {
      driverId: okPair.driverId,
      vehicleId: okPair.vehicleId,
      startAt: startQ,
      endAt: endQ,
    });
    assertAvailOk("availability ok (free driver+vehicle)", a1);

    // driver conflict: blocker driver + ok vehicle
    const a2 = await callAvailability(roomToken, {
      driverId: blockerPair.driverId,
      vehicleId: okPair.vehicleId,
      startAt: startQ,
      endAt: endQ,
    });
    assertConflict("availability driver conflict", a2, "DRIVER_CONFLICT");

    // vehicle conflict: ok driver + blocker vehicle
    const a3 = await callAvailability(roomToken, {
      driverId: okPair.driverId,
      vehicleId: blockerPair.vehicleId,
      startAt: startQ,
      endAt: endQ,
    });
    assertConflict("availability vehicle conflict", a3, "VEHICLE_CONFLICT");

    console.log("OK M14CHECK PASS");
  } finally {
    await rejectShift(roomToken, blockerId);
  }
}

main().catch((e) => {
  console.error("FAIL M14CHECK FAIL:", e?.message || e);
  process.exit(1);
});

