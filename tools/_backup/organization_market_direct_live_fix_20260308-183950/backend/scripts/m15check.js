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
  throw new Error(
    `login failed: ${emailCandidates.join(", ")} -> ${String(lastErr?.message || lastErr)}`
  );
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

async function delDriver(roomToken, driverId) {
  const r = await reqJson("DELETE", `/api/drivers/${driverId}`, { token: roomToken });
  ok(`Driver delete id=${driverId}`, r.status === 200 || r.status === 201);
}

async function listVehicles(roomToken) {
  const r = await reqJson("GET", "/api/vehicles", { token: roomToken });
  ok("Vehicle list", r.status === 200);
  return Array.isArray(r.json) ? r.json : [];
}

function normDriverId(v) {
  const id =
    v?.driverId != null ? Number(v.driverId) :
    v?.driver?.id != null ? Number(v.driver.id) :
    null;

  if (!id || Number.isNaN(id)) return null;
  return id;
}

async function assertVehicleDriver(roomToken, vehicleId, expectedDriverIdOrNull, title) {
  const items = await listVehicles(roomToken);
  const v = items.find((x) => Number(x.id) === Number(vehicleId));
  must(`${title}: vehicle exists id=${vehicleId}`, !!v);

  const got = normDriverId(v);
  const exp = expectedDriverIdOrNull == null ? null : Number(expectedDriverIdOrNull);

  if (exp == null) {
    must(`${title}: driverId should be null`, got === null);
  } else {
    must(`${title}: driverId should be ${exp}`, got === exp);
  }
}

function dump(label, r) {
  try {
    const body = r?.json != null ? JSON.stringify(r.json) : String(r?.text || "");
    console.log(`ℹ️ ${label}: status=${r?.status} body=${body.slice(0, 800)}`);
  } catch {
    console.log(`ℹ️ ${label}: status=${r?.status}`);
  }
}

async function main() {
  console.log("=== M15 ===");
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

  // Deterministik: yeni 2 araç + yeni 1 driver
  const vA = await createVehicle(roomToken, `M15-A-${rand()}`);
  const vB = await createVehicle(roomToken, `M15-B-${rand()}`);
  const d1 = await createDriver(roomToken, `M15 Driver ${rand(4)}`);

  try {
    // 1) bind ok: vA <- d1
    const b1 = await bind(roomToken, vA, d1);
    ok("Bind ok (vA<-d1)", b1.status === 200);
    must("Bind response ok:true", b1.json?.ok === true || b1.json?.vehicle?.id === vA);
    await assertVehicleDriver(roomToken, vA, d1, "after bind vA<-d1");

    // 2) bind vB <- d1: iki olası contract
    const b2 = await bind(roomToken, vB, d1);

    if (b2.status === 200) {
      // MODE A: auto-unbind (200)
      ok("Bind ok (vB<-d1) auto-unbind", true);
      await assertVehicleDriver(roomToken, vB, d1, "after bind vB<-d1");
      await assertVehicleDriver(roomToken, vA, null, "after auto-unbind vA");
    } else if (b2.status === 409) {
      // MODE B: conflict (409) -> önce vA unbind, sonra vB bind
      ok("Bind conflict -> 409 (driver already bound)", true);

      const code = String(b2.json?.code || "");
      // tolerans: farklı code isimleri olabilir
      must(
        "Bind conflict code (expected driver-bound type)",
        ["DRIVER_ALREADY_BOUND", "DRIVER_CONFLICT", "DRIVER_IN_USE"].includes(code) || !!b2.json?.conflictingVehicle
      );

      const cid = Number(b2.json?.conflictingVehicle?.id || 0);
      if (cid) must("conflictingVehicle.id == vA", cid === vA);
      else dump("bind conflict body", b2);

      // unbind vA
      const uA = await bind(roomToken, vA, null);
      ok("Unbind ok (vA)", uA.status === 200);

      // now bind vB ok
      const b3 = await bind(roomToken, vB, d1);
      ok("Bind ok after unbind (vB<-d1)", b3.status === 200);
      await assertVehicleDriver(roomToken, vB, d1, "after bind vB<-d1 post-unbind");
      await assertVehicleDriver(roomToken, vA, null, "after unbind vA (still null)");
    } else {
      dump("unexpected bind vB<-d1", b2);
      must("Bind vB<-d1 should be 200 or 409", false);
    }

    // 3) unbind vB ok (idempotent)
    const uB = await bind(roomToken, vB, null);
    ok("Unbind ok (vB)", uB.status === 200);
    await assertVehicleDriver(roomToken, vB, null, "after unbind vB");

    // 4) RBAC: company bind denemesi 403/401 olmalı
    const rb = await bind(companyToken, vA, d1);
    ok("RBAC: company cannot bind-driver", rb.status === 403 || rb.status === 401);

    console.log("✅ M15CHECK PASS");
  } finally {
    // best-effort cleanup
    try { await bind(roomToken, vA, null); } catch {}
    try { await bind(roomToken, vB, null); } catch {}
    try { await delVehicle(roomToken, vA); } catch {}
    try { await delVehicle(roomToken, vB); } catch {}
    try { await delDriver(roomToken, d1); } catch {}
  }
}

main().catch((e) => {
  console.error("❌ M15CHECK FAIL:", e?.message || e);
  process.exit(1);
});
