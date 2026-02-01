// backend/scripts/fullcheck.js
import http from "http";
import https from "https";
import { io as ioc } from "socket.io-client";
import { prisma } from "../src/prisma.js";

const BASE_URL = process.env.API_URL ?? "http://127.0.0.1:3000";

const MIN_GAP_MS = Number(process.env.HTTP_THROTTLE_MS ?? 120);
let _lastHttpAt = 0;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function throttle() {
  const now = Date.now();
  const dt = now - _lastHttpAt;
  if (dt < MIN_GAP_MS) await sleep(MIN_GAP_MS - dt);
  _lastHttpAt = Date.now();
}

function requestJsonOnce(method, path, { token, body } = {}) {
  const url = new URL(path, BASE_URL);
  const lib = url.protocol === "https:" ? https : http;

  const headers = {
    "Content-Type": "application/json",
    "x-greenpack": "1", // ✅ dev/test rate-limit skip
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  return new Promise((resolve, reject) => {
    const req = lib.request(
      { method, hostname: url.hostname, port: url.port, path: url.pathname + url.search, headers },
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
            status: res.statusCode ?? 0,
            headers: res.headers ?? {},
            text,
            json,
          });
        });
      }
    );
    req.on("error", reject);
    if (body !== undefined) req.write(JSON.stringify(body));
    req.end();
  });
}

function parseRetryAfterMs(headers) {
  const ra = headers?.["retry-after"];
  if (!ra) return null;

  const s = Number(ra);
  if (Number.isFinite(s) && s > 0) return Math.min(10 * 60_000, Math.max(250, Math.round(s * 1000)));

  const t = Date.parse(String(ra));
  if (Number.isFinite(t)) {
    const ms = t - Date.now();
    if (ms > 0) return Math.min(10 * 60_000, ms);
  }
  return null;
}

function parseRateLimitResetMs(headers) {
  const raw = headers?.["ratelimit-reset"];
  if (!raw) return null;

  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return null;

  if (n > 1_000_000_000) {
    const ms = n * 1000 - Date.now();
    return ms > 0 ? Math.min(10 * 60_000, ms) : 0;
  }
  return Math.min(10 * 60_000, Math.round(n * 1000));
}

async function requestJson(method, path, { token, body, maxWaitMs = 4 * 60_000 } = {}) {
  const t0 = Date.now();
  let attempt = 0;

  while (true) {
    await throttle();
    const res = await requestJsonOnce(method, path, { token, body });

    if (res.status >= 200 && res.status < 300) return res.json ?? res.text;

    if (res.status === 429) {
      const raMs = parseRetryAfterMs(res.headers);
      const rlMs = parseRateLimitResetMs(res.headers);
      const backoff = Math.min(10_000, 400 + attempt * 400);
      const waitMs = Math.max(raMs ?? 0, rlMs ?? 0, backoff);

      if (Date.now() - t0 + waitMs > maxWaitMs) {
        throw new Error(
          `${method} ${path} -> 429 (rate limited; maxWait exceeded)\n${String(res.text || "").slice(0, 800)}`
        );
      }

      console.log(`ℹ️ 429 on ${method} ${path} -> wait ${waitMs}ms (attempt=${attempt + 1})`);
      await sleep(waitMs + 100);
      attempt++;
      continue;
    }

    throw new Error(`${method} ${path} -> ${res.status}\n${String(res.text || "").slice(0, 800)}`);
  }
}

async function login(email, password) {
  const r = await requestJson("POST", "/api/auth/login", { body: { email, password } });
  if (!r?.token) throw new Error("login token missing");
  return r.token;
}

function payloadOf(n) {
  const p = n?.payloadJson ?? n?.payload ?? null;
  if (!p) return null;
  return typeof p === "string" ? JSON.parse(p) : p;
}
function countKind(items, kind) {
  let c = 0;
  for (const n of items ?? []) {
    const p = payloadOf(n);
    if (p?.kind === kind) c++;
  }
  return c;
}

async function ensureActiveShift({ companyToken, roomToken, driverToken }) {
  const my = await requestJson("GET", "/api/shifts/my", { token: driverToken });
  const items = my?.items ?? [];

  const active = items.find((s) => s?.status === "ACTIVE");
  if (active?.id && active?.vehicleId) return { created: false, shiftId: active.id, vehicleId: active.vehicleId };

  const approved = items.find((s) => s?.status === "APPROVED" && s?.id);
  if (approved?.id && approved?.vehicleId) {
    await requestJson("POST", `/api/shifts/${approved.id}/start`, { token: roomToken, body: {} });
    return { created: false, shiftId: approved.id, vehicleId: approved.vehicleId };
  }

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
      { name: `FULLCHECK Stop 1 ${Date.now()}`, lat: 41.0306, lng: 28.9964, order: 1, type: "COMMON" },
      { name: `FULLCHECK Stop 2 ${Date.now()}`, lat: 41.031, lng: 28.9968, order: 2, type: "COMMON" },
      { name: `FULLCHECK Stop 3 ${Date.now()}`, lat: 41.0313, lng: 28.9971, order: 3, type: "COMMON" },
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
    for (const order of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) {
      try {
        await requestJson("POST", `/api/shifts/${shiftId}/reached`, { token: driverToken, body: { order } });
      } catch {}
    }
    await requestJson("POST", `/api/driver/shifts/${shiftId}/complete`, { token: driverToken, body: {} });
    console.log(`✅ shift complete (cleanup) shiftId=${shiftId}`);
  } catch (e) {
    console.log(`ℹ️ cleanup complete failed (ignored): ${String(e?.message ?? e).slice(0, 200)}`);
  }
}

async function connectWs(token, label) {
  const sock = ioc(BASE_URL, {
    auth: { token },
    transports: ["websocket"],
  });

  const bag = { ready: null, gps: [], vstat: [], notif: [], eta: [] };

  sock.on("ws:ready", (d) => (bag.ready = d));
  sock.on("gps:update", (d) => bag.gps.push(d));
  sock.on("vehicle:status", (d) => bag.vstat.push(d));
  sock.on("notif:new", (d) => bag.notif.push(d));
  sock.on("eta:update", (d) => bag.eta.push(d));

  const t0 = Date.now();
  while (!bag.ready && Date.now() - t0 < 5000) await sleep(100);
  if (!bag.ready) throw new Error(`WS ready timeout: ${label}`);
  return { sock, bag };
}

async function waitFor(condFn, timeoutMs, stepMs = 100) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (condFn()) return true;
    await sleep(stepMs);
  }
  return false;
}

async function main() {
  console.log(`API_URL = ${BASE_URL}`);

  // health
  const health = await requestJson("GET", "/health");
  if (!health?.ok) throw new Error("❌ /health invalid");
  console.log("✅ /health");

  // logins
  const driverToken = await login("driver@demo.com", "demo123");
  const roomToken = await login("room@demo.com", "demo123");
  const companyToken = await login("company@demo.com", "demo123");
  const personelToken = await login("personel@demo.com", "demo123");
  console.log("✅ login(driver/room/company/personel)");

  // ACTIVE shift harness
  const harness = await ensureActiveShift({ companyToken, roomToken, driverToken });
  const vehicleId = harness.vehicleId;

  // WS
  const driverWS = await connectWs(driverToken, "driver");
  const roomWS = await connectWs(roomToken, "room");
  const compWS = await connectWs(companyToken, "company");
  console.log("✅ WS connect + ws:ready");

  const myD = await requestJson("GET", "/api/shifts/my", { token: driverToken });
  if (!myD || !Array.isArray(myD.items)) throw new Error("❌ /api/shifts/my invalid (driver)");

  const myP = await requestJson("GET", "/api/shifts/my", { token: personelToken });
  if (!myP || !Array.isArray(myP.items)) throw new Error("❌ /api/shifts/my invalid (personel)");
  console.log("✅ /api/shifts/my returns {items[]} (driver/personel)");

  const clearBags = () => {
    driverWS.bag.gps = [];
    driverWS.bag.vstat = [];
    driverWS.bag.notif = [];
    driverWS.bag.eta = [];
    roomWS.bag.gps = [];
    roomWS.bag.vstat = [];
    roomWS.bag.notif = [];
    roomWS.bag.eta = [];
    compWS.bag.gps = [];
    compWS.bag.vstat = [];
    compWS.bag.notif = [];
    compWS.bag.eta = [];
  };

  // LIVE gps -> WS + DB mapping
  clearBags();
  await requestJson("POST", "/api/gps", { token: driverToken, body: { vehicleId, lat: 41.0302, lng: 28.996, speed: 20 } });

  const gotDriverGps = await waitFor(() => driverWS.bag.gps.some((x) => x.vehicleId === vehicleId), 4000);
  const gotDriverVs = await waitFor(() => driverWS.bag.vstat.some((x) => x.vehicleId === vehicleId), 4000);
  if (!gotDriverGps || !gotDriverVs) throw new Error("❌ WS gps:update / vehicle:status missing (driver)");

  const gotRoomAny = await waitFor(
    () => roomWS.bag.gps.some((x) => x.vehicleId === vehicleId) || roomWS.bag.vstat.some((x) => x.vehicleId === vehicleId),
    4000
  );
  const gotCompAny = await waitFor(
    () => compWS.bag.gps.some((x) => x.vehicleId === vehicleId) || compWS.bag.vstat.some((x) => x.vehicleId === vehicleId),
    4000
  );
  if (!gotRoomAny) throw new Error("❌ WS update missing (room)");
  if (!gotCompAny) throw new Error("❌ WS update missing (company)");
  console.log("✅ WS gps:update + vehicle:status (driver/room/company)");

  const v = await prisma.vehicle.findUnique({ where: { id: vehicleId }, select: { status: true } });
  const gl = await prisma.gpsLast.findUnique({ where: { vehicleId }, select: { status: true } });
  if (v?.status !== "ACTIVE" || gl?.status !== "OK") {
    throw new Error(`❌ DB mapping wrong: Vehicle=${v?.status} GpsLast=${gl?.status}`);
  }
  console.log("✅ DB mapping LIVE -> Vehicle.ACTIVE + GpsLast.OK");

  // overspeed -> notif (DB + WS)
  const d0 = await requestJson("GET", "/api/notifications/my", { token: driverToken });
  const r0 = await requestJson("GET", "/api/notifications/my", { token: roomToken });
  const c0 = await requestJson("GET", "/api/notifications/my", { token: companyToken });
  const d0n = countKind(d0, "OVERSPEED"),
    r0n = countKind(r0, "OVERSPEED"),
    c0n = countKind(c0, "OVERSPEED");

  clearBags();
  await requestJson("POST", "/api/gps", {
    token: driverToken,
    body: { vehicleId, lat: 41.03025, lng: 28.99605, speed: 140 },
  });

  await sleep(900);
  const d1 = await requestJson("GET", "/api/notifications/my", { token: driverToken });
  const r1 = await requestJson("GET", "/api/notifications/my", { token: roomToken });
  const c1 = await requestJson("GET", "/api/notifications/my", { token: companyToken });
  if (countKind(d1, "OVERSPEED") <= d0n) throw new Error("❌ OVERSPEED not created for DRIVER");
  if (countKind(r1, "OVERSPEED") <= r0n) throw new Error("❌ OVERSPEED not created for ROOM");
  if (countKind(c1, "OVERSPEED") <= c0n) throw new Error("❌ OVERSPEED not created for COMPANY");

  const wsD = await waitFor(() => driverWS.bag.notif.length > 0, 4000);
  const wsR = await waitFor(() => roomWS.bag.notif.length > 0, 4000);
  const wsC = await waitFor(() => compWS.bag.notif.length > 0, 4000);
  if (!wsD || !wsR || !wsC) throw new Error("❌ WS notif:new missing for one of (driver/room/company)");
  console.log("✅ OVERSPEED notif (DB + WS) driver/room/company");

  // ETA http + eta:update ws
  clearBags();
  const eta = await requestJson("GET", `/api/eta?vehicleId=${vehicleId}`, { token: driverToken });
  if (!eta || !Array.isArray(eta.stops)) throw new Error("❌ /api/eta invalid (stops[])");
  console.log(`✅ /api/eta (stops=${eta.stops.length})`);

  await requestJson("POST", "/api/gps", {
    token: driverToken,
    body: { vehicleId, lat: 41.0303, lng: 28.9961, speed: 25 },
  });
  const gotEtaWs = await waitFor(() => driverWS.bag.eta.length > 0, 4000);
  if (!gotEtaWs) throw new Error("❌ WS eta:update missing (driver)");
  console.log("✅ WS eta:update (driver)");

  // LIVE->STALE + dedupe
  const baseD = countKind(await requestJson("GET", "/api/notifications/my", { token: driverToken }), "GPS_STALE");
  const baseR = countKind(await requestJson("GET", "/api/notifications/my", { token: roomToken }), "GPS_STALE");
  const baseC = countKind(await requestJson("GET", "/api/notifications/my", { token: companyToken }), "GPS_STALE");

  await prisma.gpsLast.update({ where: { vehicleId }, data: { at: new Date(Date.now() - 25_000) } });
  clearBags();
  await sleep(20_000);

  const dS = countKind(await requestJson("GET", "/api/notifications/my", { token: driverToken }), "GPS_STALE");
  const rS = countKind(await requestJson("GET", "/api/notifications/my", { token: roomToken }), "GPS_STALE");
  const cS = countKind(await requestJson("GET", "/api/notifications/my", { token: companyToken }), "GPS_STALE");
  if (dS <= baseD || rS <= baseR || cS <= baseC) throw new Error("❌ GPS_STALE not created for all scopes");
  console.log("✅ LIVE->STALE notif created (driver/room/company)");

  await sleep(20_000);
  const dS2 = countKind(await requestJson("GET", "/api/notifications/my", { token: driverToken }), "GPS_STALE");
  const rS2 = countKind(await requestJson("GET", "/api/notifications/my", { token: roomToken }), "GPS_STALE");
  const cS2 = countKind(await requestJson("GET", "/api/notifications/my", { token: companyToken }), "GPS_STALE");
  if (dS2 !== dS || rS2 !== rS || cS2 !== cS) throw new Error("❌ GPS_STALE dedupe failed");
  console.log("✅ GPS_STALE dedupe OK");

  // STALE->OFFLINE + dedupe
  const baseDO = countKind(await requestJson("GET", "/api/notifications/my", { token: driverToken }), "GPS_OFFLINE");
  const baseRO = countKind(await requestJson("GET", "/api/notifications/my", { token: roomToken }), "GPS_OFFLINE");
  const baseCO = countKind(await requestJson("GET", "/api/notifications/my", { token: companyToken }), "GPS_OFFLINE");

  await prisma.gpsLast.update({ where: { vehicleId }, data: { at: new Date(Date.now() - 350_000) } });
  await sleep(20_000);

  const dO = countKind(await requestJson("GET", "/api/notifications/my", { token: driverToken }), "GPS_OFFLINE");
  const rO = countKind(await requestJson("GET", "/api/notifications/my", { token: roomToken }), "GPS_OFFLINE");
  const cO = countKind(await requestJson("GET", "/api/notifications/my", { token: companyToken }), "GPS_OFFLINE");
  if (dO <= baseDO || rO <= baseRO || cO <= baseCO) throw new Error("❌ GPS_OFFLINE not created for all scopes");
  console.log("✅ STALE->OFFLINE notif created (driver/room/company)");

  await sleep(20_000);
  const dO2 = countKind(await requestJson("GET", "/api/notifications/my", { token: driverToken }), "GPS_OFFLINE");
  const rO2 = countKind(await requestJson("GET", "/api/notifications/my", { token: roomToken }), "GPS_OFFLINE");
  const cO2 = countKind(await requestJson("GET", "/api/notifications/my", { token: companyToken }), "GPS_OFFLINE");
  if (dO2 !== dO || rO2 !== rO || cO2 !== cO) throw new Error("❌ GPS_OFFLINE dedupe failed");
  console.log("✅ GPS_OFFLINE dedupe OK");

  // OFFLINE->LIVE recovery
  const baseDR = countKind(await requestJson("GET", "/api/notifications/my", { token: driverToken }), "GPS_RECOVERY");
  const baseRR = countKind(await requestJson("GET", "/api/notifications/my", { token: roomToken }), "GPS_RECOVERY");
  const baseCR = countKind(await requestJson("GET", "/api/notifications/my", { token: companyToken }), "GPS_RECOVERY");

  await requestJson("POST", "/api/gps", { token: driverToken, body: { vehicleId, lat: 41.0304, lng: 28.9962, speed: 10 } });
  await sleep(900);

  const dR = countKind(await requestJson("GET", "/api/notifications/my", { token: driverToken }), "GPS_RECOVERY");
  const rR = countKind(await requestJson("GET", "/api/notifications/my", { token: roomToken }), "GPS_RECOVERY");
  const cR = countKind(await requestJson("GET", "/api/notifications/my", { token: companyToken }), "GPS_RECOVERY");
  if (dR <= baseDR || rR <= baseRR || cR <= baseCR) throw new Error("❌ GPS_RECOVERY not created for all scopes");
  console.log("✅ OFFLINE->LIVE recovery notif created (driver/room/company)");

  // cleanup
  await completeShiftBestEffort({ shiftId: harness.shiftId, driverToken });

  driverWS.sock.close();
  roomWS.sock.close();
  compWS.sock.close();

  console.log("\n✅ FULLCHECK PASS");
}

main().catch((e) => {
  console.error(String(e?.stack ?? e));
  process.exit(1);
});
