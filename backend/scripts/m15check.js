// backend/scripts/m15check.js
import { login, reqJson, ok, must } from "./_harness.js";

function rand(n = 6) {
  return Math.random().toString(16).slice(2, 2 + n).toUpperCase();
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
  throw new Error(`login failed: ${emailCandidates.join(", ")} -> ${String(lastErr?.message || lastErr)}`);
}

async function createVehicle(roomToken, plate) {
  const r = await reqJson("POST", "/api/vehicles", {
    token: roomToken,
    body: { plate, capacity: 16, speedLimitKmh: 90 },
  });
  ok(`Vehicle create ${plate}`, r.status === 200 || r.status === 201);
  must(`Vehicle id ${plate}`, r.json?.id);
  return Number(r.json.id);
}

async function createDriver(roomToken, fullName) {
  const r = await reqJson("POST", "/api/drivers", {
    token: roomToken,
    body: { fullName, phone: "0000000000", deviceInfo: "m15-test" },
  });
  ok(`Driver create ${fullName}`, r.status === 200 || r.status === 201);
  must(`Driver id ${fullName}`, r.json?.id);
  return Number(r.json.id);
}

async function bind(roomToken, vehicleId, driverIdOrNull) {
  return await reqJson("PUT", `/api/vehicles/${vehicleId}/bind-driver`, {
    token: roomToken,
    body: { driverId: driverIdOrNull },
  });
}

async function delVehicle(roomToken, vehicleId) {
  const r = await reqJson("DELETE", `/api/vehicles/${vehicleId}`, { token: roomToken });
  ok(`Vehicle delete id=${vehicleId}`, r.status === 200 || r.status === 201);
}

async function main() {
  console.log("=== M15 ===");
  console.log("API_URL = http://127.0.0.1:3000");

  const PASS = process.env.SEED_PASS || "demo123";
  const roomToken = await loginFirst(
    [process.env.ROOM_EMAIL || "room@demo.com", "room_seed@demo.com"],
    PASS
  );

  // Deterministik: yeni 2 araç + yeni 1 driver
  const vA = await createVehicle(roomToken, `M15-A-${rand()}`);
  const vB = await createVehicle(roomToken, `M15-B-${rand()}`);
  const d1 = await createDriver(roomToken, `M15 Driver ${rand(4)}`);

  try {
    // bind ok
    const b1 = await bind(roomToken, vA, d1);
    ok("Bind ok (vA<-d1)", b1.status === 200);
    ok("Bind response ok", b1.json?.ok === true);

    // conflict: aynı driver başka araca
    const b2 = await bind(roomToken, vB, d1);
    ok("Bind conflict -> 409", b2.status === 409);
    must("Bind conflict code", String(b2.json?.code || "") === "DRIVER_ALREADY_BOUND");
    must("conflictingVehicle.id", Number(b2.json?.conflictingVehicle?.id || 0) === vA);

    // unbind vA
    const u1 = await bind(roomToken, vA, null);
    ok("Unbind ok (vA)", u1.status === 200);

    // now bind vB ok
    const b3 = await bind(roomToken, vB, d1);
    ok("Bind ok after unbind (vB<-d1)", b3.status === 200);

    // cleanup: unbind vB
    const u2 = await bind(roomToken, vB, null);
    ok("Unbind ok (vB)", u2.status === 200);

    console.log("✅ M15CHECK PASS");
  } finally {
    // best-effort cleanup vehicles
    try { await delVehicle(roomToken, vA); } catch {}
    try { await delVehicle(roomToken, vB); } catch {}
  }
}

main().catch((e) => {
  console.error("❌ M15CHECK FAIL:", e?.message || e);
  process.exit(1);
});
