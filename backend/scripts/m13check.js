// backend/scripts/m13check.js
import { login, reqJson, ok, must, getRoomCompanyIds, pickVehicleDriver } from "./_harness.js";

function iso(msFromNow) {
  return new Date(Date.now() + msFromNow).toISOString();
}

function pickId(json) {
  return json?.id ?? json?.shift?.id ?? json?.data?.id ?? null;
}

async function ensureSecondVehicle(roomToken, v1) {
  const r = await reqJson("GET", "/api/vehicles", { token: roomToken });
  ok("Vehicle list", r.status === 200);

  const items = r.json?.items || r.json || [];
  const found = items.find((v) => Number(v.id) !== Number(v1));
  if (found) return Number(found.id);

  const plate = "M13-" + Math.random().toString(16).slice(2, 7).toUpperCase();
  const c = await reqJson("POST", "/api/vehicles", {
    token: roomToken,
    body: { plate, capacity: 16, speedLimitKmh: 90 },
  });
  ok("Vehicle create (for conflict test)", c.status === 200 || c.status === 201);
  return Number(c.json?.id);
}

async function ensureSecondDriver(roomToken, d1) {
  const r = await reqJson("GET", "/api/drivers", { token: roomToken });
  ok("Driver list", r.status === 200);

  const items = r.json?.items || r.json || [];
  const found = items.find((d) => Number(d.id) !== Number(d1));
  if (found) return Number(found.id);

  const name = "M13 Driver " + Math.random().toString(16).slice(2, 6);
  const c = await reqJson("POST", "/api/drivers", {
    token: roomToken,
    body: { fullName: name, phone: "0000000000", deviceInfo: "m13-test" },
  });
  ok("Driver create (for conflict test)", c.status === 200 || c.status === 201);
  return Number(pickId(c.json));
}

async function createShift(companyToken, { companyId, roomId, startAt, endAt }) {
  // ⚠️ Senin projede en stabil stop type: COMMON (PICKUP/DROP bazı versiyonlarda enum değil)
  const body = {
    companyId,
    roomId,
    startAt,
    endAt,
    stops: [
      { order: 1, name: "M13 Stop A", lat: 41.0306, lng: 28.9964, type: "COMMON" },
      { order: 2, name: "M13 Stop B", lat: 41.0310, lng: 28.9968, type: "COMMON" },
      { order: 3, name: "M13 Stop C", lat: 41.0313, lng: 28.9971, type: "COMMON" },
    ],
  };

  const r = await reqJson("POST", "/api/shifts", { token: companyToken, body });

  // Debug: create fail olursa sebebi görelim
  if (!(r.status === 200 || r.status === 201)) {
    console.log("❌ Shift create response:", r.status, (r.text || "").slice(0, 500));
  }

  ok("Shift create", r.status === 200 || r.status === 201);
  const id = pickId(r.json);
  must("Shift id", !!id);

  return Number(id);
}

async function rejectShift(roomToken, id) {
  const r = await reqJson("PUT", `/api/shifts/${id}/reject`, {
    token: roomToken,
    body: { reason: "m13 cleanup" },
  });
  ok(`Shift reject (cleanup) id=${id}`, r.status === 200 || r.status === 409);
}

async function main() {
  console.log("✅ Starting M13CHECK (overlap rules)");

  const PASS = process.env.DEMO_PASSWORD || "demo123";
  const ROOM_EMAIL = process.env.ROOM_EMAIL || "room@demo.com";
  const COMPANY_EMAIL = process.env.COMPANY_EMAIL || "company@demo.com";

  const roomToken = await login(ROOM_EMAIL, PASS);
  const companyToken = await login(COMPANY_EMAIL, PASS);

  const { roomId, companyId } = await getRoomCompanyIds(roomToken, companyToken);

  const { vehicleId: v1, driverId: d1 } = await pickVehicleDriver(roomToken);
  const v2 = await ensureSecondVehicle(roomToken, v1);
  const d2 = await ensureSecondDriver(roomToken, d1);

  // Overlapping window
  const start1 = iso(10 * 60 * 1000);
  const end1 = iso(70 * 60 * 1000);

  const start2 = iso(20 * 60 * 1000);
  const end2 = iso(80 * 60 * 1000);

  const shift1 = await createShift(companyToken, { companyId, roomId, startAt: start1, endAt: end1 });
  const shift2 = await createShift(companyToken, { companyId, roomId, startAt: start2, endAt: end2 });
  const shift3 = await createShift(companyToken, { companyId, roomId, startAt: start2, endAt: end2 });

  try {
    const a1 = await reqJson("PUT", `/api/shifts/${shift1}/approve`, {
      token: roomToken,
      body: { vehicleId: v1, driverId: d1 },
    });
    ok("Approve shift1", a1.status === 200);

    const a2 = await reqJson("PUT", `/api/shifts/${shift2}/approve`, {
      token: roomToken,
      body: { vehicleId: v2, driverId: d1 },
    });
    ok("Driver conflict -> 409", a2.status === 409);
    must("Driver conflict code", a2.json?.code === "DRIVER_CONFLICT");

    const a3 = await reqJson("PUT", `/api/shifts/${shift3}/approve`, {
      token: roomToken,
      body: { vehicleId: v1, driverId: d2 },
    });
    ok("Vehicle conflict -> 409", a3.status === 409);
    must("Vehicle conflict code", a3.json?.code === "VEHICLE_CONFLICT");

    console.log("✅ M13CHECK PASS");
  } finally {
    await rejectShift(roomToken, shift1);
    await rejectShift(roomToken, shift2);
    await rejectShift(roomToken, shift3);
  }
}

main().catch((e) => {
  console.error("❌ M13CHECK FAIL:", e?.message || e);
  process.exit(1);
});
