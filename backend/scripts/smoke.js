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

  const headers = { "Content-Type": "application/json" };
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
          try { json = text ? JSON.parse(text) : null; } catch {}

          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            resolve(json ?? text);
          } else {
            reject(
              new Error(`${method} ${path} -> ${res.statusCode}\n${text.slice(0, 800)}`)
            );
          }
        });
      }
    );

    req.on("error", reject);
    if (body !== undefined) req.write(JSON.stringify(body));
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

/**
 * GPS hardening sonrası: driver /api/gps basabilsin diye ACTIVE shift şart.
 * - varsa ACTIVE shift'i reuse eder
 * - yoksa company->create, room->approve+start ile shift kurar
 */
async function ensureActiveShift({ companyToken, roomToken, driverToken }) {
  const my = await requestJson("GET", "/api/shifts/my", { token: driverToken });
  const items = my?.items ?? [];
  const active = items.find((s) => s?.status === "ACTIVE");
  if (active?.id && active?.vehicleId) {
    return { created: false, shiftId: active.id, vehicleId: active.vehicleId };
  }

  const approved = items.find((s) => s?.status === "APPROVED" && s?.id);
  if (approved?.id && approved?.vehicleId) {
    // APPROVED ise start etmeyi dene
    await requestJson("POST", `/api/shifts/${approved.id}/start`, { token: roomToken, body: {} });
    return { created: false, shiftId: approved.id, vehicleId: approved.vehicleId };
  }

  // ids
  const meRoom = await requestJson("GET", "/api/me", { token: roomToken });
  const meComp = await requestJson("GET", "/api/me", { token: companyToken });
  const meDrv = await requestJson("GET", "/api/me", { token: driverToken });

  const roomId = meRoom?.roomId ?? 1;
  const companyId = meComp?.companyId ?? 1;

  const vlist = await requestJson("GET", "/api/vehicles", { token: roomToken });
  const vehicleId = vlist?.items?.[0]?.id ?? vlist?.[0]?.id ?? 1;

  let driverId = meDrv?.driverId;
  if (!driverId) {
    const dlist = await requestJson("GET", "/api/drivers", { token: roomToken });
    driverId = dlist?.items?.[0]?.id ?? dlist?.[0]?.id ?? 1;
  }

  const startAt = new Date(Date.now() - 60_000).toISOString();
  const endAt = new Date(Date.now() + 2 * 60 * 60_000).toISOString();

  const shBody = {
    companyId,
    roomId,
    startAt,
    endAt,
    status: "REQUESTED",
    stops: [
      { name: `SMOKE Stop 1 ${Date.now()}`, lat: 41.0306, lng: 28.9964, order: 1, type: "COMMON" },
      { name: `SMOKE Stop 2 ${Date.now()}`, lat: 41.0310, lng: 28.9968, order: 2, type: "COMMON" },
      { name: `SMOKE Stop 3 ${Date.now()}`, lat: 41.0313, lng: 28.9971, order: 3, type: "COMMON" },
    ],
  };

  const sh = await requestJson("POST", "/api/shifts", { token: companyToken, body: shBody });
  const shiftId = sh?.id ?? sh?.shift?.id;
  if (!shiftId) throw new Error("ensureActiveShift: shiftId missing");

  await requestJson("PUT", `/api/shifts/${shiftId}/approve`, {
    token: roomToken,
    body: { vehicleId, driverId, status: "APPROVED" },
  });

  await requestJson("POST", `/api/shifts/${shiftId}/start`, { token: roomToken, body: {} });

  return { created: true, shiftId, vehicleId };
}

async function completeShiftBestEffort({ shiftId, driverToken }) {
  try {
    // bazı complete akışları progress ister: best-effort reached
    for (const order of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      try {
        await requestJson("POST", `/api/shifts/${shiftId}/reached`, {
          token: driverToken,
          body: { order },
        });
      } catch {}
    }
    await requestJson("POST", `/api/driver/shifts/${shiftId}/complete`, { token: driverToken, body: {} });
    console.log(`✅ shift complete (cleanup) shiftId=${shiftId}`);
  } catch (e) {
    console.log(`ℹ️ cleanup complete failed (ignored): ${String(e?.message ?? e).slice(0, 200)}`);
  }
}

async function main() {
  console.log(`API_URL = ${BASE_URL}`);

  const driverToken = await login("driver@demo.com", "demo123");
  const roomToken = await login("room@demo.com", "demo123");
  const companyToken = await login("company@demo.com", "demo123");
  console.log("✅ login(driver/room/company)");

  // ✅ ACTIVE shift harness (GPS/ETA 403 fix)
  const harness = await ensureActiveShift({ companyToken, roomToken, driverToken });
  const vehicleId = harness.vehicleId;

  // LIVE GPS
  await requestJson("POST", "/api/gps", {
    token: driverToken,
    body: { vehicleId, lat: 41.0302, lng: 28.996, speed: 20 },
  });
  console.log("✅ POST /api/gps (LIVE)");

  // overspeed
  await requestJson("POST", "/api/gps", {
    token: driverToken,
    body: { vehicleId, lat: 41.03025, lng: 28.99605, speed: 140 },
  });
  console.log("✅ POST /api/gps (OVERSPEED)");

  const driverNotifs1 = await requestJson("GET", "/api/notifications/my", { token: driverToken });
  if (!findKind(driverNotifs1, "OVERSPEED")) {
    throw new Error("❌ OVERSPEED notification not found for DRIVER");
  }
  console.log("✅ notif: OVERSPEED (DRIVER)");

  // ETA
  const eta = await requestJson("GET", `/api/eta?vehicleId=${vehicleId}`, { token: driverToken });
  if (!eta || !Array.isArray(eta.stops)) {
    throw new Error("❌ ETA response invalid");
  }
  console.log(`✅ GET /api/eta (stops=${eta.stops.length})`);

  // GPS_STALE transition (LIVE->STALE)
  console.log("⏳ waiting 40s for LIVE->STALE monitor tick...");
  await sleep(40_000);

  const roomNotifs = await requestJson("GET", "/api/notifications/my", { token: roomToken });
  if (!findKind(roomNotifs, "GPS_STALE")) {
    throw new Error("❌ GPS_STALE notification not found for ROOM (after 40s)");
  }
  console.log("✅ notif: GPS_STALE (ROOM)");

  const driverNotifs2 = await requestJson("GET", "/api/notifications/my", { token: driverToken });
  if (!findKind(driverNotifs2, "GPS_STALE")) {
    throw new Error("❌ GPS_STALE notification not found for DRIVER (after 40s)");
  }
  console.log("✅ notif: GPS_STALE (DRIVER)");

  // ✅ cleanup (pack’te birikmesin)
  await completeShiftBestEffort({ shiftId: harness.shiftId, driverToken });

  console.log("\n✅ SMOKE PASS");
}

main().catch((e) => {
  console.error(String(e?.stack ?? e));
  process.exit(1);
});
