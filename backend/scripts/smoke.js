// backend/scripts/smoke.js
// Usage:
//   node scripts/smoke.js
// Requires:
//   - API running (default: http://127.0.0.1:3000)
//   - DB seeded (driver@demo.com / room@demo.com / company@demo.com / demo123)

import http from "http";
import https from "https";

const BASE_URL = process.env.API_URL ?? "http://127.0.0.1:3000";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function requestJson(method, path, { token, body } = {}) {
  const url = new URL(path, BASE_URL);
  const lib = url.protocol === "https:" ? https : http;

  const headers = {
    "Content-Type": "application/json",
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  return new Promise((resolve, reject) => {
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
          } catch {
            // ignore
          }

          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json ?? text);
          } else {
            reject(
              new Error(
                `${method} ${path} -> ${res.statusCode}\n${text.slice(0, 500)}`
              )
            );
          }
        });
      }
    );

    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function login(email, password) {
  const r = await requestJson("POST", "/api/auth/login", {
    body: { email, password },
  });
  const token = r?.token;
  if (!token) throw new Error("login: token missing");
  return token;
}

function findKind(items, kind) {
  for (const n of items ?? []) {
    const p = n?.payloadJson ?? n?.payload ?? null;
    if (!p) continue;
    const payload = typeof p === "string" ? JSON.parse(p) : p;
    if (payload?.kind === kind) return n;
  }
  return null;
}

async function main() {
  console.log(`API_URL = ${BASE_URL}`);

  const driverToken = await login("driver@demo.com", "demo123");
  console.log("✅ login(driver)");

  // LIVE GPS
  await requestJson("POST", "/api/gps", {
    token: driverToken,
    body: { vehicleId: 1, lat: 41.0302, lng: 28.996, speed: 20 },
  });
  console.log("✅ POST /api/gps (LIVE)");

  // overspeed
  await requestJson("POST", "/api/gps", {
    token: driverToken,
    body: { vehicleId: 1, lat: 41.03025, lng: 28.99605, speed: 140 },
  });
  console.log("✅ POST /api/gps (OVERSPEED)");

  const driverNotifs1 = await requestJson("GET", "/api/notifications/my", {
    token: driverToken,
  });
  if (!findKind(driverNotifs1, "OVERSPEED")) {
    throw new Error("❌ OVERSPEED notification not found for DRIVER");
  }
  console.log("✅ notif: OVERSPEED (DRIVER)");

  // ETA
  const eta = await requestJson("GET", "/api/eta?vehicleId=1", { token: driverToken });
  if (!eta || !Array.isArray(eta.stops)) {
    throw new Error("❌ ETA response invalid");
  }
  console.log(`✅ GET /api/eta (stops=${eta.stops.length})`);

  // GPS_STALE transition (LIVE->STALE): threshold 20s, monitor interval default 15s.
  // Güvenli: 40s bekle (15s tick + 20s threshold + jitter)
  console.log("⏳ waiting 40s for LIVE->STALE monitor tick...");
  await sleep(40_000);

  const roomToken = await login("room@demo.com", "demo123");
  const roomNotifs = await requestJson("GET", "/api/notifications/my", { token: roomToken });
  if (!findKind(roomNotifs, "GPS_STALE")) {
    throw new Error("❌ GPS_STALE notification not found for ROOM (after 40s)");
  }
  console.log("✅ notif: GPS_STALE (ROOM)");

  const driverNotifs2 = await requestJson("GET", "/api/notifications/my", {
    token: driverToken,
  });
  if (!findKind(driverNotifs2, "GPS_STALE")) {
    throw new Error("❌ GPS_STALE notification not found for DRIVER (after 40s)");
  }
  console.log("✅ notif: GPS_STALE (DRIVER)");

  console.log("\n✅ SMOKE PASS");
}

main().catch((e) => {
  console.error(String(e?.stack ?? e));
  process.exit(1);
});
