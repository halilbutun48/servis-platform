// backend/scripts/m13check.js
import { login, reqJson, ok, must, getRoomCompanyIds } from "./_harness.js";

function iso(msFromNow) {
  return new Date(Date.now() + msFromNow).toISOString();
}

function pickId(json) {
  return json?.id ?? json?.shift?.id ?? json?.data?.id ?? null;
}

async function createVehicle(roomToken, label) {
  const plate = `${label}-${Math.random().toString(16).slice(2, 7).toUpperCase()}`;
  const r = await reqJson("POST", "/api/vehicles", {
    token: roomToken,
    body: { plate, capacity: 16, speedLimitKmh: 90 },
  });
  if (!(r.status === 200 || r.status === 201)) {
    console.log("FAIL Vehicle create resp:", r.status, (r.text || "").slice(0, 400));
  }
  ok(`Vehicle create (${label})`, r.status === 200 || r.status === 201);
  const id = pickId(r.json);
  must(`Vehicle id (${label})`, !!id);
  return Number(id);
}

async function createDriver(roomToken, label) {
  const fullName = `${label} Driver ${Math.random().toString(16).slice(2, 6)}`;
  const r = await reqJson("POST", "/api/drivers", {
    token: roomToken,
    body: { fullName, phone: "0000000000", deviceInfo: "m13-test" },
  });
  if (!(r.status === 200 || r.status === 201)) {
    console.log("FAIL Driver create resp:", r.status, (r.text || "").slice(0, 400));
  }
  ok(`Driver create (${label})`, r.status === 200 || r.status === 201);
  const id = pickId(r.json);
  must(`Driver id (${label})`, !!id);
  return Number(id);
}

async function createShift(companyToken, { companyId, roomId, startAt, endAt }, label) {
  // Senin sistemde stabil stop type: COMMON
  const body = {
    companyId,
    roomId,
    startAt,
    endAt,
    stops: [
      { order: 1, name: `${label} Stop A`, lat: 41.0306, lng: 28.9964, type: "COMMON" },
      { order: 2, name: `${label} Stop B`, lat: 41.0310, lng: 28.9968, type: "COMMON" },
      { order: 3, name: `${label} Stop C`, lat: 41.0313, lng: 28.9971, type: "COMMON" },
    ],
  };

  const r = await reqJson("POST", "/api/shifts", { token: companyToken, body });
  if (!(r.status === 200 || r.status === 201)) {
    console.log("FAIL Shift create resp:", r.status, (r.text || "").slice(0, 600));
  }
  ok(`Shift create (${label})`, r.status === 200 || r.status === 201);

  const id = pickId(r.json);
  must(`Shift id (${label})`, !!id);
  return Number(id);
}

async function approveShift(roomToken, shiftId, vehicleId, driverId, label) {
  const r = await reqJson("PUT", `/api/shifts/${shiftId}/approve`, {
    token: roomToken,
    body: { vehicleId, driverId },
  });

  if (r.status !== 200) {
    console.log(`FAIL Approve ${label} resp:`, r.status, (r.text || "").slice(0, 600));
  }
  ok(`Approve ${label}`, r.status === 200);
  return r;
}

async function rejectBestEffort(roomToken, shiftId) {
  try {
    await reqJson("PUT", `/api/shifts/${shiftId}/reject`, {
      token: roomToken,
      body: { reason: "m13 cleanup" },
    });
  } catch {}
}

async function main() {
  console.log("OK Starting M13CHECK (overlap rules)");

  const PASS = process.env.DEMO_PASSWORD || "demo123";
  const ROOM_EMAIL = process.env.ROOM_EMAIL || "room@demo.com";
  const COMPANY_EMAIL = process.env.COMPANY_EMAIL || "company@demo.com";

  const roomToken = await login(ROOM_EMAIL, PASS);
  const companyToken = await login(COMPANY_EMAIL, PASS);

  const { roomId, companyId } = await getRoomCompanyIds(roomToken, companyToken);

  // OK DB state’den bağımsız: her run’da test için yeni driver/vehicle
  const v1 = await createVehicle(roomToken, "M13V1");
  const v2 = await createVehicle(roomToken, "M13V2");
  const d1 = await createDriver(roomToken, "M13D1");
  const d2 = await createDriver(roomToken, "M13D2");

  // Overlapping window
  const start1 = iso(10 * 60 * 1000);
  const end1 = iso(70 * 60 * 1000);

  const start2 = iso(20 * 60 * 1000);
  const end2 = iso(80 * 60 * 1000);

  const shift1 = await createShift(companyToken, { companyId, roomId, startAt: start1, endAt: end1 }, "S1");
  const shift2 = await createShift(companyToken, { companyId, roomId, startAt: start2, endAt: end2 }, "S2");
  const shift3 = await createShift(companyToken, { companyId, roomId, startAt: start2, endAt: end2 }, "S3");

  try {
    await approveShift(roomToken, shift1, v1, d1, "shift1");

    // aynı driver (d1) farklı vehicle (v2) → DRIVER_CONFLICT beklenir
    const a2 = await reqJson("PUT", `/api/shifts/${shift2}/approve`, {
      token: roomToken,
      body: { vehicleId: v2, driverId: d1 },
    });
    ok("Driver conflict -> 409", a2.status === 409);
    const code2 = String(a2.json?.code || "");
    if (!code2.includes("DRIVER")) {
      console.log("INFO Driver conflict code payload:", a2.json);
    }
    must("Driver conflict code", code2.includes("DRIVER"));

    // aynı vehicle (v1) farklı driver (d2) → VEHICLE_* conflict beklenir
    const a3 = await reqJson("PUT", `/api/shifts/${shift3}/approve`, {
      token: roomToken,
      body: { vehicleId: v1, driverId: d2 },
    });
    ok("Vehicle conflict -> 409", a3.status === 409);
    const code3 = String(a3.json?.code || "");
    if (!code3.includes("VEHICLE")) {
      console.log("INFO Vehicle conflict code payload:", a3.json);
    }
    must("Vehicle conflict code", code3.includes("VEHICLE"));

    console.log("OK M13CHECK PASS");
  } finally {
    await rejectBestEffort(roomToken, shift1);
    await rejectBestEffort(roomToken, shift2);
    await rejectBestEffort(roomToken, shift3);
  }
}

main().catch((e) => {
  console.error("FAIL M13CHECK FAIL:", e?.message || e);
  process.exit(1);
});

