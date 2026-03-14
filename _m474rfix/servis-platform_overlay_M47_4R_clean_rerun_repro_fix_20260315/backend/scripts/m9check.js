// backend/scripts/m9check.js
// Usage:
//   node scripts/m9check.js
// Requires:
//   - API running (default: http://127.0.0.1:3000)
//   - DB seeded (driver@demo.com / room@demo.com / demo123)

import http from "http";
import https from "https";
import { resolveLoginBody } from "./_harness.js";

const BASE_URL = process.env.API_URL ?? "http://127.0.0.1:3000";
const tag = new Date().toISOString().replace(/[:.TZ-]/g, "").slice(0, 14);

function reqJson(method, path, { token, body } = {}) {
  const url = new URL(path, BASE_URL);
  const lib = url.protocol === "https:" ? https : http;

  const headers = { "Content-Type": "application/json", "x-greenpack": process.env.GREENPACK_HEADER ?? "1" };
  if (token) headers.Authorization = `Bearer ${token}`;

  return new Promise((resolve) => {
    const req = lib.request(
      {
        method,
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        headers,
      },
      (res) => {
        let data = "";
        res.on("data", (c) => (data += c));
        res.on("end", () => {
          const text = data || "";
          let json = null;
          try {
            json = text ? JSON.parse(text) : null;
          } catch {}
          resolve({
            ok: (res.statusCode ?? 0) >= 200 && (res.statusCode ?? 0) < 300,
            status: res.statusCode ?? 0,
            json,
            text,
          });
        });
      }
    );
    req.on("error", (e) => resolve({ ok: false, status: 0, json: null, text: String(e) }));
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function login(email, password) {
  const r = await reqJson("POST", "/api/auth/login", { body: await resolveLoginBody(email, password) });
  if (!r.ok) throw new Error(`login failed ${email} -> ${r.status}\n${r.text}`);
  const token = r.json?.token;
  if (!token) throw new Error(`login token missing: ${email}`);
  return token;
}

function ok(msg) {
  console.log(`OK ${msg}`);
}

async function main() {
  console.log(`API_URL = ${BASE_URL}`);

  const driverToken = await login("driver@demo.com", "demo123");
  const roomToken = await login("room@demo.com", "demo123");
  ok("login(driver/room)");

  // NOTE:
  // Earlier milestone checks (ex: M3 pre-clean) may close any pre-seeded open shifts.
  // M9 should be deterministic and not rely on pre-existing DB state.
  // If the driver has no active/approved shift, create one and assign it.

  async function ensureDriverHasShift() {
    const active0 = await reqJson("GET", "/api/driver/route/active", { token: driverToken });
    if (active0.ok && active0.json?.mode === "OK") return active0;

    console.log(`INFO M9: no active shift found (${active0.json?.mode ?? active0.status}). Creating one for test...`);

    const companyToken = await login("company@demo.com", "demo123");
    const driversRes = await reqJson("GET", "/api/drivers", { token: roomToken });
    if (!driversRes.ok) throw new Error(`drivers -> ${driversRes.status}\n${driversRes.text}`);
    const demoDriver = (driversRes.json ?? []).find((d) => d?.user?.email === "driver@demo.com") ?? (driversRes.json ?? [])[0];
    if (!demoDriver?.id) throw new Error("demo driver not found");

    const vehiclesRes = await reqJson("GET", "/api/vehicles", { token: roomToken });
    if (!vehiclesRes.ok) throw new Error(`vehicles -> ${vehiclesRes.status}\n${vehiclesRes.text}`);
    const demoVehicle = (vehiclesRes.json ?? [])[0];
    if (!demoVehicle?.id) throw new Error("no vehicle found");

    const now = Date.now();
    const startAt = new Date(now + 5 * 60 * 1000).toISOString();
    const endAt = new Date(now + 65 * 60 * 1000).toISOString();

    const createShift = await reqJson("POST", "/api/shifts", {
      token: companyToken,
      body: {
        roomId: 1,
        startAt,
        endAt,
        stops: [
          { name: "M9 Stop A", lat: 41.008, lng: 28.978, order: 1, type: "MANUAL" },
          { name: "M9 Stop B", lat: 41.012, lng: 28.982, order: 2, type: "MANUAL" },
          { name: "M9 Stop C", lat: 41.016, lng: 28.986, order: 3, type: "MANUAL" },
        ],
      },
    });
    if (!createShift.ok) throw new Error(`shift create -> ${createShift.status}\n${createShift.text}`);
    const shiftId = createShift.json?.id;
    if (!shiftId) throw new Error("shiftId missing from shift create");

    const approve = await reqJson("PUT", `/api/shifts/${shiftId}/approve`, {
      token: roomToken,
      body: { vehicleId: demoVehicle.id, driverId: demoDriver.id },
    });
    if (!approve.ok) throw new Error(`approve/assign -> ${approve.status}\n${approve.text}`);
    ok(`created+assigned shift for M9 (shift=${shiftId})`);

    const active1 = await reqJson("GET", "/api/driver/route/active", { token: driverToken });
    if (!active1.ok) throw new Error(`route/active (after create) -> ${active1.status}\n${active1.text}`);
    return active1;
  }

  // 1) Driver active route should work
  const active = await ensureDriverHasShift();
  if (active.json?.mode !== "OK") throw new Error(`route/active mode != OK: ${JSON.stringify(active.json)}`);

  const shiftId = active.json?.shift?.id;
  const vehicleId = active.json?.shift?.vehicleId;
  const nextStop = active.json?.nextStop;

  if (!shiftId || !vehicleId) throw new Error("shiftId/vehicleId missing in active route");
  ok(`driver route/active (shift=${shiftId}, vehicle=${vehicleId})`);

  if (!nextStop?.id) throw new Error("nextStop missing (expected at least 1 PENDING stop)");
  ok(`nextStop present (stopId=${nextStop.id})`);

  // 2) skip -> next-stop endpoint must exist
  const skip = await reqJson("POST", `/api/driver/shifts/${shiftId}/stops/${nextStop.id}/skip`, { token: driverToken, body: {} });
  if (!skip.ok) throw new Error(`skip -> ${skip.status}\n${skip.text}`);
  ok("skip endpoint ok");

  const ns1 = await reqJson("GET", `/api/driver/shifts/${shiftId}/next-stop`, { token: driverToken });
  if (!ns1.ok) throw new Error(`next-stop -> ${ns1.status}\n${ns1.text}`);
  ok("next-stop endpoint ok");

  // 3) reopen -> reached
  const reopen = await reqJson("POST", `/api/driver/shifts/${shiftId}/stops/${nextStop.id}/reopen`, { token: driverToken, body: {} });
  if (!reopen.ok) throw new Error(`reopen -> ${reopen.status}\n${reopen.text}`);
  ok("reopen endpoint ok");

  const reached = await reqJson("POST", `/api/driver/shifts/${shiftId}/stops/${nextStop.id}/reached`, { token: driverToken, body: {} });
  if (!reached.ok) throw new Error(`reached -> ${reached.status}\n${reached.text}`);
  ok("reached endpoint ok");

 
  // 4) ETA should return only PENDING stops
  const eta = await reqJson("GET", `/api/eta?vehicleId=${vehicleId}`, { token: driverToken });
  if (!eta.ok) throw new Error(`eta -> ${eta.status}\n${eta.text}`);
  if (!Array.isArray(eta.json?.stops)) throw new Error("eta.stops is not an array");
  ok(`eta ok (pendingStops=${eta.json.stops.length})`);

  // Drain remaining pending stops so we can complete shift deterministically.
  for (const s of eta.json.stops) {
    const stopId = s?.id ?? s?.stopId;
    if (!stopId) throw new Error("eta stop missing id");
    const rr = await reqJson("POST", `/api/driver/shifts/${shiftId}/stops/${stopId}/reached`, { token: driverToken, body: {} });
    if (!rr.ok) throw new Error(`reach (drain) -> ${rr.status}\n${rr.text}`);
  }

  // verify no pending stops left
  const eta2 = await reqJson("GET", `/api/eta?vehicleId=${vehicleId}`, { token: driverToken });
  if (!eta2.ok) throw new Error(`eta2 -> ${eta2.status}\n${eta2.text}`);
  if (!Array.isArray(eta2.json?.stops)) throw new Error("eta2.stops is not an array");
  if (eta2.json.stops.length !== 0) throw new Error(`Pending stops still exist after drain (count=${eta2.json.stops.length})`);
  ok("pending stops drained");

  // Clean up: complete shift so later stages stay isolated.
  const complete = await reqJson("POST", `/api/driver/shifts/${shiftId}/complete`, { token: driverToken, body: {} });
  if (!complete.ok) throw new Error(`shift complete -> ${complete.status}\n${complete.text}`);
  ok("shift complete (cleanup)");

// 5) GPS hardening: create a new vehicle, driver should NOT be able to post GPS for it
  const plate = `M9-${tag}`;
  const v = await reqJson("POST", "/api/vehicles", {
    token: roomToken,
    body: { plate, capacity: 10, speedLimitKmh: 80 },
  });
  if (!v.ok) throw new Error(`create vehicle -> ${v.status}\n${v.text}`);
  const otherVehicleId = v.json?.id;
  if (!otherVehicleId) throw new Error("created vehicle id missing");
  ok(`created vehicle (id=${otherVehicleId})`);

  const gpsDenied = await reqJson("POST", "/api/gps", {
    token: driverToken,
    body: { vehicleId: otherVehicleId, lat: 41.03, lng: 28.996, speed: 20 },
  });
  if (gpsDenied.status !== 403) {
    throw new Error(`gps hardening expected 403 got ${gpsDenied.status}\n${gpsDenied.text}`);
  }
  ok("gps hardening 403 ok (driver not assigned vehicle)");

  console.log("\nOK M9CHECK PASS");
}

main().catch((e) => {
  console.error(String(e?.stack ?? e));
  process.exit(1);
});

