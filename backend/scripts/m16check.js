// backend/scripts/m16check.js
import {
  ok,
  must,
  reqJson,
  login,
  getRoomCompanyIds,
  ensureActiveShift,
  closeShiftHard,
  sleep,
} from "./_harness.js";

function banner(msg) {
  console.log(`\n=== ${msg} ===`);
}

function jstr(v) {
  try {
    return JSON.stringify(v);
  } catch {
    return String(v);
  }
}

async function tryMany({ method, paths, token, bodies = [undefined] }) {
  let last = null;

  for (const p of paths) {
    for (const body of bodies) {
      const r = await reqJson(method, p, { token, body });
      last = { method, path: p, body, r };

      if (r.ok) return last;

      // route yoksa diğer path’e geç
      if (r.status === 404) break;
    }
  }

  const msg =
    `expected ok\n` +
    `method=${last?.method}\n` +
    `last.path=${last?.path}\n` +
    `last.status=${last?.r?.status}\n` +
    `last.body=${jstr(last?.r?.json ?? last?.r?.text)}\n`;

  throw new Error(msg);
}

async function createIsolatedVehicle(roomToken, uniq) {
  const plate = `M16-${uniq}`;

  const r = await tryMany({
    method: "POST",
    paths: ["/api/vehicles"],
    token: roomToken,
    bodies: [
      { plate, capacity: 16, speedLimitKmh: 80 },
      { plate, capacity: 16 },
      { plate },
      { name: plate, plate, capacity: 16 },
    ],
  });

  const vehicleId = r.r.json?.id ?? r.r.json?.vehicle?.id;
  must("vehicleId created", !!vehicleId);
  ok(`isolated vehicleId=${vehicleId}`);
  return Number(vehicleId);
}

async function createIsolatedDriver(roomToken, uniq) {
  const fullName = `M16 Driver ${uniq}`;
  const phone = `9053${uniq}01`;

  const r = await tryMany({
    method: "POST",
    paths: ["/api/drivers"],
    token: roomToken,
    bodies: [
      { fullName, phone, deviceInfo: "m16-device" },
      { name: fullName, phone, deviceInfo: "m16-device" },
      { fullName, phone, deviceId: null, deviceInfo: "m16-device" },
      { name: fullName, phone, deviceId: null, deviceInfo: "m16-device" },
    ],
  });

  const driverId = r.r.json?.id ?? r.r.json?.driver?.id;
  must("driverId created", !!driverId);
  ok(`isolated driverId=${driverId}`);
  return Number(driverId);
}

/**
 * Cleanup helper:
 * - OK / 404 => pass
 * - 400 => genelde "bağlı kayıt var" / "cannot delete"; test için PASS say
 * - diğer => hata
 */
async function safeDelete(roomToken, kind, id) {
  if (!id) return;

  const path = kind === "vehicle" ? `/api/vehicles/${id}` : `/api/drivers/${id}`;
  const r = await reqJson("DELETE", path, { token: roomToken });

  if (r.ok || r.status === 404 || r.status === 400) {
    ok(`${kind} delete ${id} (${r.status})`);
    return;
  }

  throw new Error(`${kind} delete ${id} failed -> ${r.status}\n${String(r.text || "").slice(0, 400)}`);
}

function pickLatLngFromSuggestion(s) {
  // En yaygın ihtimaller: {lat,lng} | {center:{lat,lng}} | {stop:{lat,lng}} | {point:{lat,lng}}
  const candidates = [
    s,
    s?.center,
    s?.stop,
    s?.point,
    s?.centroid,
    s?.location,
  ];

  for (const c of candidates) {
    const lat = c?.lat;
    const lng = c?.lng;
    if (Number.isFinite(Number(lat)) && Number.isFinite(Number(lng))) {
      return { lat: Number(lat), lng: Number(lng) };
    }
  }
  return null;
}

async function main() {
  banner("M16CHECK: personel->requests->suggestions->stops->eta");

  const PASS = process.env.DEMO_PASS ?? process.env.SEED_PASS ?? "demo123";

  const companyToken = await login("company@demo.com", PASS);
  const roomToken = await login("room@demo.com", PASS);
  const driverToken = await login("driver@demo.com", PASS);

  const { roomId, companyId } = await getRoomCompanyIds(roomToken, companyToken);
  ok(`ids: companyId=${companyId} roomId=${roomId}`);

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
      tag: "M16",
    });

    shiftId = act.shiftId;
    must("shift ACTIVE created", !!shiftId);

    // -----------------------------
    // 1) create personels + requests
    // -----------------------------
    banner("M16: create personels + requests");

    async function createPersonelAndLogin(suffix, lat, lng) {
      const email = `m16.personel.${suffix}.${uniq}@demo.local`;
      const fullName = `M16 Personel ${suffix} ${uniq}`;
      const phone = `9054${uniq}${suffix === "A" ? "11" : "22"}`;

      const created = await tryMany({
        method: "POST",
        paths: ["/api/personels"],
        token: companyToken,
        bodies: [
          { email, password: PASS, fullName, phone, deviceInfo: "m16-personel-device" },
          { email, password: PASS, name: fullName, phone, deviceInfo: "m16-personel-device" },
        ],
      });

      const personelId = created.r.json?.id ?? created.r.json?.personel?.id;
      must(`personel created (${suffix}) id`, !!personelId);
      ok(`personel created (${suffix}) id=${personelId}`);

      const token = await login(email, PASS);
      ok(`personel login ok (${suffix})`, !!token);

      // request
      const req = await tryMany({
        method: "POST",
        paths: ["/api/requests"],
        token,
        bodies: [{ shiftId, lat, lng, address: `M16 addr ${suffix}` }],
      });

      const reqId = req.r.json?.id ?? req.r.json?.request?.id;
      must("request created id", !!reqId);
      ok(`request created id=${reqId}`);

      return { personelId: Number(personelId), token, reqId: Number(reqId) };
    }

    // iki farklı nokta
    await createPersonelAndLogin("A", 41.0306, 28.9964);
    await createPersonelAndLogin("B", 41.0313, 28.9971);

    // -----------------------------
    // 2) suggestions + accept
    // -----------------------------
    banner("M16: stop suggestions + accept");

    const sug = await tryMany({
      method: "GET",
      paths: [`/api/shifts/${shiftId}/stop-suggestions?onlyOpen=1&radiusM=120`],
      token: roomToken,
      bodies: [undefined],
    });

    ok("suggestions returned");

    const items = sug.r.json?.items ?? sug.r.json?.suggestions ?? [];
    must("suggestions count>0", Array.isArray(items) && items.length > 0);
    ok(`suggestions count=${items.length} (${sug.path})`);

    const first = items[0];
    const ll = pickLatLngFromSuggestion(first) ?? { lat: 41.0306, lng: 28.9964 };

    // Endpoint 400 "lat/lng required" dediği için: HER denemede lat/lng gönderiyoruz.
    await tryMany({
      method: "POST",
      paths: [`/api/shifts/${shiftId}/stops/from-suggestion`],
      token: roomToken,
      bodies: [
        { lat: ll.lat, lng: ll.lng, clusterIndex: 0 },
        { lat: ll.lat, lng: ll.lng, index: 0 },
        { lat: ll.lat, lng: ll.lng, suggestionIndex: 0 },
        { lat: ll.lat, lng: ll.lng, i: 0 },
        { lat: ll.lat, lng: ll.lng },
        { lat: ll.lat, lng: ll.lng, radiusM: 120 },
      ],
    });

    ok(`accept suggestion ok (POST /api/shifts/${shiftId}/stops/from-suggestion)`);

    // -----------------------------
    // 3) route preview (driver)
    // -----------------------------
    banner("M16: route preview");

    const prev = await tryMany({
      method: "GET",
      paths: ["/api/driver/route/active", "/api/driver/route", "/api/driver/route/preview"],
      token: driverToken,
      bodies: [undefined],
    });

    ok(`route preview ok (driver ${prev.path})`);

    // -----------------------------
    // cleanup
    // -----------------------------
    banner("M16: cleanup shift");
    await sleep(150);
    await closeShiftHard({ shiftId, driverToken, roomToken });
    ok(`cleanup shiftId=${shiftId}`);

    console.log("\nOK M16CHECK PASS");
  } finally {
    await safeDelete(roomToken, "vehicle", vehicleId);
    await safeDelete(roomToken, "driver", driverId);
  }
}

main().catch((e) => {
  console.error(`FAIL M16CHECK FAIL: ${e?.message ?? e}`);
  process.exit(1);
});

