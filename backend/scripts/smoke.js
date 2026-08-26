// backend/scripts/smoke.js
// Usage:
//   node scripts/smoke.js
// Requires:
//   - API running (default: http://127.0.0.1:3000)
//   - DB seeded (driver@demo.com / room@demo.com / company@demo.com / demo123)

import http from "http";
import https from "https";
import { login as compatLogin, postGps, reqJson } from "./_harness.js";
import { ensureTotpStepUp } from "./_totp_harness.js";

const BASE_URL = process.env.API_URL ?? "http://127.0.0.1:3000";

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function requestJson(method, path, { token, body } = {}) {
  const url = new URL(path, BASE_URL);
  const lib = url.protocol === "https:" ? https : http;

  const headers = { "Content-Type": "application/json", "x-greenpack": process.env.GREENPACK_HEADER ?? "1" };
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
  return compatLogin(email, password);
}

async function loginWithOptionalStepUp(email, password, label) {
  const resp = await reqJson("POST", "/api/auth/login", {
    body: { email, password },
  });

  if (!resp.ok || !resp.json?.token) {
    throw new Error(`login failed ${email} -> ${resp.status}\n${String(resp.text || "").slice(0, 400)}`);
  }

  if (!resp.json.stepUpRequired) {
    return resp.json.token;
  }

  try {
    return await ensureTotpStepUp(resp.json.token, label);
  } catch (err) {
    if (String(err?.message || "").includes("STEP_UP_NOT_APPLICABLE")) {
      return resp.json.token;
    }
    throw err;
  }
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
    // Fresh seed may contain overlapping approved demo shifts for the seeded driver.
    // Discover the visible driver shifts through the API and clear same-room overlaps deterministically.
    const driverToday = await requestJson("GET", "/api/driver/shifts/today", { token: driverToken });
    const visible = [
      ...(driverToday?.today ?? []),
      ...(driverToday?.tomorrow ?? []),
      ...(driverToday?.upcoming ?? []),
    ].filter((s) => s && Number.isFinite(Number(s.id)));
    const conflicts = visible.filter(
      (s) =>
        Number(s.id) !== Number(approved.id) &&
        Number(s.roomId ?? 0) === Number(approved.roomId ?? 0) &&
        ["APPROVED", "ACTIVE", "REQUESTED"].includes(String(s.status || "").toUpperCase())
    );

    for (const other of conflicts) {
      await requestJson("PUT", `/api/shifts/${other.id}/reject`, {
        token: roomToken,
        body: { reason: "smoke-conflict" },
      });
    }

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
    console.log(`OK shift complete (cleanup) shiftId=${shiftId}`);
  } catch (e) {
    console.log(`INFO cleanup complete failed (ignored): ${String(e?.message ?? e).slice(0, 200)}`);
  }
}

async function main() {
  console.log(`API_URL = ${BASE_URL}`);

  const driverToken = await login("driver@demo.com", "demo123");
  const roomToken = await loginWithOptionalStepUp("room@demo.com", "demo123", "room");
  const companyToken = await loginWithOptionalStepUp("company@demo.com", "demo123", "company");
  console.log("OK login(driver/room/company)");

  // OK ACTIVE shift harness (GPS/ETA 403 fix)
  const harness = await ensureActiveShift({ companyToken, roomToken, driverToken });
  const vehicleId = harness.vehicleId;

  // LIVE GPS
  await postGps(driverToken, { vehicleId, lat: 41.0302, lng: 28.996, speed: 20 });
  console.log("OK POST /api/gps (LIVE)");

  // overspeed
  await postGps(driverToken, { vehicleId, lat: 41.03025, lng: 28.99605, speed: 140 });
  await sleep(1500);
  await postGps(driverToken, { vehicleId, lat: 41.03025, lng: 28.99605, speed: 140 });
  await sleep(2500);
  console.log("OK POST /api/gps (OVERSPEED)");

  const driverNotifs1 = await requestJson("GET", "/api/notifications/my", { token: driverToken });
  if (!findKind(driverNotifs1, "OVERSPEED")) {
    throw new Error("FAIL OVERSPEED notification not found for DRIVER");
  }
  console.log("OK notif: OVERSPEED (DRIVER)");

  // ETA
  const eta = await requestJson("GET", `/api/eta?vehicleId=${vehicleId}`, { token: driverToken });
  if (!eta || !Array.isArray(eta.stops)) {
    throw new Error("FAIL ETA response invalid");
  }
  console.log(`OK GET /api/eta (stops=${eta.stops.length})`);

  // GPS_STALE transition (LIVE->STALE)
  console.log("WAIT waiting 60s for LIVE->STALE monitor tick...");
  await sleep(60_000);

  const roomNotifs = await requestJson("GET", "/api/notifications/my", { token: roomToken });
  if (!findKind(roomNotifs, "GPS_STALE")) {
    throw new Error("FAIL GPS_STALE notification not found for ROOM (after 60s)");
  }
  console.log("OK notif: GPS_STALE (ROOM)");

  const driverNotifs2 = await requestJson("GET", "/api/notifications/my", { token: driverToken });
  if (!findKind(driverNotifs2, "GPS_STALE")) {
    throw new Error("FAIL GPS_STALE notification not found for DRIVER (after 60s)");
  }
  console.log("OK notif: GPS_STALE (DRIVER)");

  // OK cleanup (pack’te birikmesin)
  await completeShiftBestEffort({ shiftId: harness.shiftId, driverToken });

  console.log("\nOK SMOKE PASS");
}

main().catch((e) => {
  console.error(String(e?.stack ?? e));
  process.exit(1);
});
