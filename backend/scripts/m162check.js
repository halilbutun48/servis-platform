// backend/scripts/m162check.js
// M16.2: UI soft-switch destekleyen backend contract testleri
// - /api/shifts/:id/people (GET/PUT)
// - /api/shifts/:id/route-preview (ROOM+COMPANY)
// - route-preview stops[].assignmentCount sanity

import {
  banner,
  step,
  assertOk,
  reqJson,
  loginFirst,
  getRoomCompanyIds,
  ensureActiveShift,
  closeShiftHard,
  sleep,
} from "./_harness.js";

async function createIsolatedVehicle(roomToken, uniq) {
  const plate = `M162-${uniq}`;
  const r = await reqJson("POST", "/api/vehicles", {
    token: roomToken,
    body: { plate, capacity: 16, speedLimitKmh: 80 },
  });
  assertOk(r.ok, "vehicle created");
  const id = r.json?.id ?? r.json?.vehicle?.id;
  assertOk(!!id, "vehicleId present");
  return Number(id);
}

async function createIsolatedDriver(roomToken, uniq) {
  const fullName = `M162 Driver ${uniq}`;
  const phone = `9053${uniq}01`;
  const r = await reqJson("POST", "/api/drivers", {
    token: roomToken,
    body: { fullName, phone, deviceInfo: "m162-device" },
  });
  assertOk(r.ok, "driver created");
  const id = r.json?.id ?? r.json?.driver?.id;
  assertOk(!!id, "driverId present");
  return Number(id);
}

async function safeDelete(roomToken, kind, id) {
  if (!id) return;
  const path = kind === "vehicle" ? `/api/vehicles/${id}` : `/api/drivers/${id}`;
  const r = await reqJson("DELETE", path, { token: roomToken });
  // 200/204/404/400 (bağlı kayıt) => pass
  if (r.ok || r.status === 404 || r.status === 400) return;
  throw new Error(`${kind} delete failed: ${r.status} ${String(r.text || "").slice(0, 300)}`);
}

function countAssignments(assignments) {
  const m = new Map();
  for (const a of assignments || []) {
    const sid = Number(a?.stopId);
    if (!sid) continue;
    m.set(sid, (m.get(sid) || 0) + 1);
  }
  return m;
}

async function main() {
  banner("M16.2 CHECK: shift people + route-preview");

  const companyToken = await loginFirst("company");
  const roomToken = await loginFirst("room");
  const driverToken = await loginFirst("driver");

  const { roomId, companyId } = await getRoomCompanyIds(roomToken, companyToken);
  step(`scope: companyId=${companyId} roomId=${roomId}`);

  const uniq = String(Date.now()).slice(-6);
  let vehicleId = null;
  let driverId = null;
  let shiftId = null;

  try {
    vehicleId = await createIsolatedVehicle(roomToken, uniq);
    driverId = await createIsolatedDriver(roomToken, uniq);

    const act = await ensureActiveShift({
      companyToken,
      roomToken,
      driverToken,
      companyId,
      roomId,
      vehicleId,
      driverId,
      tag: "M162",
    });

    shiftId = act.shiftId;
    assertOk(!!shiftId, "shift ACTIVE created");

    // 1) PUT people (REPLACE)
    banner("M16.2: /shifts/:id/people (PUT/GET)");
    const put = await reqJson("PUT", `/api/shifts/${shiftId}/people?mode=REPLACE`, {
      token: companyToken,
      body: {
        items: [
          {
            fullName: `M162 Person A ${uniq}`,
            phone: `9054${uniq}11`,
            address: "Test Address A",
            lat: 41.0306,
            lng: 28.9964,
          },
          {
            fullName: `M162 Person B ${uniq}`,
            phone: `9054${uniq}22`,
            address: "Test Address B",
            // lat/lng yok => NEEDS_REVIEW
          },
        ],
      },
    });
    assertOk(put.ok, "PUT people ok");

    const get = await reqJson("GET", `/api/shifts/${shiftId}/people`, { token: companyToken });
    assertOk(get.ok, "GET people ok");
    const items = get.json?.items ?? [];
    assertOk(Array.isArray(items) && items.length >= 2, "people count >= 2");

    // 2) generate stops (need at least one eligible point)
    banner("M16.2: generate stops for assignmentCount");
    const gen = await reqJson(
      "POST",
      `/api/shifts/${shiftId}/stops/generate?mode=REPLACE&maxWalkM=250`,
      { token: companyToken, body: {} }
    );
    assertOk(gen.ok, "generate stops ok");

    // 3) route-preview (ROOM)
    banner("M16.2: /shifts/:id/route-preview (ROOM)");
    const prevRoom = await reqJson("GET", `/api/shifts/${shiftId}/route-preview`, { token: roomToken });
    assertOk(prevRoom.ok, "route-preview ok (ROOM)");
    assertOk(Array.isArray(prevRoom.json?.stops), "route-preview stops array");
    assertOk(Array.isArray(prevRoom.json?.assignments), "route-preview assignments array");

    const stops = prevRoom.json?.stops ?? [];
    const assignments = prevRoom.json?.assignments ?? [];
    const byStop = countAssignments(assignments);

    // assignmentCount sanity: field exists (0 allowed) and matches assignments map when present
    const anyWithCount = stops.some((s) => typeof s?.assignmentCount === "number");
    assertOk(anyWithCount, "stops[].assignmentCount present");

    for (const s of stops) {
      const sid = Number(s?.id);
      if (!sid) continue;
      const a = byStop.get(sid) || 0;
      const c = Number(s.assignmentCount ?? 0);
      assertOk(c === a, `assignmentCount match stopId=${sid}`);
    }

    // 4) route-preview (COMPANY)
    banner("M16.2: /shifts/:id/route-preview (COMPANY)");
    const prevComp = await reqJson("GET", `/api/shifts/${shiftId}/route-preview`, { token: companyToken });
    assertOk(prevComp.ok, "route-preview ok (COMPANY)");

    // cleanup
    banner("M16.2: cleanup shift");
    await sleep(150);
    await closeShiftHard({ shiftId, driverToken, roomToken });
    assertOk(true, "cleanup done");

    console.log("\nOK M162CHECK PASS");
  } finally {
    await safeDelete(roomToken, "vehicle", vehicleId);
    await safeDelete(roomToken, "driver", driverId);
  }
}

main().catch((e) => {
  console.error(`FAIL M162CHECK FAIL: ${e?.message ?? e}`);
  process.exit(1);
});

