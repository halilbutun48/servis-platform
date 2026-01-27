// backend/scripts/m9check.js
// Usage:
//   node scripts/m9check.js
// Requires:
//   - API running (default: http://127.0.0.1:3000)
//   - DB seeded (driver@demo.com / room@demo.com / demo123)

import http from "http";
import https from "https";

const BASE_URL = process.env.API_URL ?? "http://127.0.0.1:3000";
const tag = new Date().toISOString().replace(/[:.TZ-]/g, "").slice(0, 14);

function reqJson(method, path, { token, body } = {}) {
  const url = new URL(path, BASE_URL);
  const lib = url.protocol === "https:" ? https : http;

  const headers = { "Content-Type": "application/json" };
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
  const r = await reqJson("POST", "/api/auth/login", { body: { email, password } });
  if (!r.ok) throw new Error(`login failed ${email} -> ${r.status}\n${r.text}`);
  const token = r.json?.token;
  if (!token) throw new Error(`login token missing: ${email}`);
  return token;
}

function ok(msg) {
  console.log(`[OK] ${msg}`);
}

async function main() {
  console.log(`API_URL = ${BASE_URL}`);

  const driverToken = await login("driver@demo.com", "demo123");
  const roomToken = await login("room@demo.com", "demo123");
  ok("login(driver/room)");

  // 1) Driver active route should work
  const active = await reqJson("GET", "/api/driver/route/active", { token: driverToken });
  if (!active.ok) throw new Error(`route/active -> ${active.status}\n${active.text}`);
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

  console.log("\nM9CHECK PASS");
}

main().catch((e) => {
  console.error(String(e?.stack ?? e));
  process.exit(1);
});
