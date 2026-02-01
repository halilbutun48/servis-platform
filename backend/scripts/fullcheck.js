// backend/scripts/fullcheck.js
import http from "http";
import https from "https";
import { io as ioc } from "socket.io-client";
import { prisma } from "../src/prisma.js";

const BASE_URL = process.env.API_URL ?? "http://127.0.0.1:3000";

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function requestJson(method, path, { token, body } = {}) {
  const url = new URL(path, BASE_URL);
  const lib = url.protocol === "https:" ? https : http;
  const headers = { "Content-Type": "application/json" };
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
          try { json = text ? JSON.parse(text) : null; } catch {}
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(json ?? text);
          else reject(new Error(`${method} ${path} -> ${res.statusCode}\n${text.slice(0, 800)}`));
        });
      }
    );
    req.on("error", reject);
    if (body !== undefined) req.write(JSON.stringify(body));
    req.end();
  });
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

// ---------- Deterministic notif helpers (WS jitter + upsert/dedupe safe) ----------
async function listMyNotifs(token) {
  const r = await requestJson("GET", "/api/notifications/my", { token });
  // /my returns array in this codebase (based on existing usage)
  return Array.isArray(r) ? r : (Array.isArray(r?.items) ? r.items : []);
}

function hasKind(items, kind) {
  const K = String(kind || "").toUpperCase();
  for (const n of items ?? []) {
    const p = payloadOf(n);
    const k = String(p?.kind || "").toUpperCase();
    if (k === K) return true;
  }
  return false;
}

/**
 * Wait until all given tokens have at least one notification with payload.kind == kind.
 * This is resilient against:
 * - monitor tick jitter
 * - dedupe/upsert behavior (count may not increase)
 */
async function waitKindAllScopes({ kind, tokens, timeoutMs = 90_000, intervalMs = 2_500, label = "" }) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const lists = await Promise.all(tokens.map((t) => listMyNotifs(t)));
    const okAll = lists.every((lst) => hasKind(lst, kind));
    if (okAll) return true;
    await sleep(intervalMs);
  }
  console.log(`ℹ️ waitKindAllScopes TIMEOUT kind=${kind} label=${label}`);
  try {
    const lists = await Promise.all(tokens.map((t) => listMyNotifs(t)));
    console.log("debug notif counts:", lists.map((x) => (x || []).length));
  } catch {}
  return false;
}

/**
 * Wait until all given tokens have count(kind) >= minCount.
 * Useful for OVERSPEED where we expect a new row.
 */
async function waitCountAllScopes({ kind, tokens, minCount, timeoutMs = 15_000, intervalMs = 800, label = "" }) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const lists = await Promise.all(tokens.map((t) => listMyNotifs(t)));
    const okAll = lists.every((lst) => countKind(lst, kind) >= minCount);
    if (okAll) return true;
    await sleep(intervalMs);
  }
  console.log(`ℹ️ waitCountAllScopes TIMEOUT kind=${kind} minCount=${minCount} label=${label}`);
  return false;
}

/**
 * Wait until counts for all scopes stop changing for a window.
 * Used for dedupe checks (no additional rows).
 */
async function waitCountsStable({ kind, tokens, stableWindowMs = 8_000, intervalMs = 1_000, label = "" }) {
  const start = Date.now();
  let last = null;
  let lastChangeAt = Date.now();

  while (Date.now() - start < 40_000) {
    const lists = await Promise.all(tokens.map((t) => listMyNotifs(t)));
    const counts = lists.map((lst) => countKind(lst, kind));
    const key = counts.join(",");

    if (last === null) {
      last = key;
      lastChangeAt = Date.now();
    } else if (key !== last) {
      last = key;
      lastChangeAt = Date.now();
    }

    if (Date.now() - lastChangeAt >= stableWindowMs) return counts; // stable
    await sleep(intervalMs);
  }

  console.log(`ℹ️ waitCountsStable TIMEOUT kind=${kind} label=${label}`);
  const lists = await Promise.all(tokens.map((t) => listMyNotifs(t)));
  return lists.map((lst) => countKind(lst, kind));
}

// ---------------------------------------------------------------------------

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
      { name: `FULLCHECK Stop 2 ${Date.now()}`, lat: 41.0310, lng: 28.9968, order: 2, type: "COMMON" },
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
  const sock = ioc(BASE_URL, { auth: { token }, transports: ["websocket"] });
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

  // 1) health
  const health = await requestJson("GET", "/health");
  if (!health?.ok) throw new Error("❌ /health invalid");
  console.log("✅ /health");

  // 2) logins
  const driverToken = await login("driver@demo.com", "demo123");
  const roomToken = await login("room@demo.com", "demo123");
  const companyToken = await login("company@demo.com", "demo123");
  const personelToken = await login("personel@demo.com", "demo123");
  console.log("✅ login(driver/room/company/personel)");

  // ✅ ACTIVE shift harness (GPS/ETA 403 fix) — WS connect’ten ÖNCE
  const harness = await ensureActiveShift({ companyToken, roomToken, driverToken });
  const vehicleId = harness.vehicleId;

  // 3) WS connect
  const driverWS = await connectWs(driverToken, "driver");
  const roomWS = await connectWs(roomToken, "room");
  const compWS = await connectWs(companyToken, "company");
  console.log("✅ WS connect + ws:ready");

  // 3.1) /api/shifts/my regression guard (DRIVER + PERSONEL)
  const myD = await requestJson("GET", "/api/shifts/my", { token: driverToken });
  if (!myD || !Array.isArray(myD.items)) throw new Error("❌ /api/shifts/my invalid (driver)");

  const myP = await requestJson("GET", "/api/shifts/my", { token: personelToken });
  if (!myP || !Array.isArray(myP.items)) throw new Error("❌ /api/shifts/my invalid (personel)");
  console.log("✅ /api/shifts/my returns {items[]} (driver/personel)");

  const clearBags = () => {
    driverWS.bag.gps = []; driverWS.bag.vstat = []; driverWS.bag.notif = []; driverWS.bag.eta = [];
    roomWS.bag.gps = []; roomWS.bag.vstat = []; roomWS.bag.notif = []; roomWS.bag.eta = [];
    compWS.bag.gps = []; compWS.bag.vstat = []; compWS.bag.notif = []; compWS.bag.eta = [];
  };

  const scopeTokens = [driverToken, roomToken, companyToken];

  // 4) LIVE gps -> WS + DB mapping
  clearBags();
  await requestJson("POST", "/api/gps", { token: driverToken, body: { vehicleId, lat: 41.0302, lng: 28.9960, speed: 20 } });

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

  // 5) overspeed -> notif (DB + WS) for DRIVER/ROOM/COMPANY (count should increase)
  const d0 = await listMyNotifs(driverToken);
  const r0 = await listMyNotifs(roomToken);
  const c0 = await listMyNotifs(companyToken);
  const d0n = countKind(d0, "OVERSPEED"), r0n = countKind(r0, "OVERSPEED"), c0n = countKind(c0, "OVERSPEED");

  clearBags();
  await requestJson("POST", "/api/gps", { token: driverToken, body: { vehicleId, lat: 41.03025, lng: 28.99605, speed: 140 } });

  // wait DB increase deterministically
  const overspeedOk = await waitCountAllScopes({
    kind: "OVERSPEED",
    tokens: scopeTokens,
    minCount: Math.max(d0n + 1, r0n + 1, c0n + 1), // conservative
    timeoutMs: 15_000,
    intervalMs: 900,
    label: "OVERSPEED after gps",
  });
  if (!overspeedOk) throw new Error("❌ OVERSPEED not created for all scopes (DB)");

  const wsD = await waitFor(() => driverWS.bag.notif.length > 0, 4000);
  const wsR = await waitFor(() => roomWS.bag.notif.length > 0, 4000);
  const wsC = await waitFor(() => compWS.bag.notif.length > 0, 4000);
  if (!wsD || !wsR || !wsC) throw new Error("❌ WS notif:new missing for one of (driver/room/company)");
  console.log("✅ OVERSPEED notif (DB + WS) driver/room/company");

  // 6) ETA http + eta:update ws
  clearBags();
  const eta = await requestJson("GET", `/api/eta?vehicleId=${vehicleId}`, { token: driverToken });
  if (!eta || !Array.isArray(eta.stops)) throw new Error("❌ /api/eta invalid (stops[])");
  console.log(`✅ /api/eta (stops=${eta.stops.length})`);

  await requestJson("POST", "/api/gps", { token: driverToken, body: { vehicleId, lat: 41.0303, lng: 28.9961, speed: 25 } });
  const gotEtaWs = await waitFor(() => driverWS.bag.eta.length > 0, 4000);
  if (!gotEtaWs) throw new Error("❌ WS eta:update missing (driver)");
  console.log("✅ WS eta:update (driver)");

  // 7) LIVE->STALE + dedupe (deterministic: existence + stable counts)
  // Make vehicle stale by moving gpsLast.at back; then wait until all scopes HAVE GPS_STALE.
  await prisma.gpsLast.update({ where: { vehicleId }, data: { at: new Date(Date.now() - 25_000) } });
  clearBags();

  const staleExists = await waitKindAllScopes({
    kind: "GPS_STALE",
    tokens: scopeTokens,
    timeoutMs: 90_000,
    intervalMs: 2_500,
    label: "LIVE->STALE",
  });
  if (!staleExists) throw new Error("❌ GPS_STALE not found for all scopes (WS+API)");
  console.log("✅ LIVE->STALE notif exists (driver/room/company)");

  // Dedupe check: counts should stabilize and remain stable
  const staleCounts1 = await waitCountsStable({
    kind: "GPS_STALE",
    tokens: scopeTokens,
    stableWindowMs: 8_000,
    intervalMs: 1_000,
    label: "GPS_STALE stable window 1",
  });

  await sleep(15_000);

  const staleCounts2 = await waitCountsStable({
    kind: "GPS_STALE",
    tokens: scopeTokens,
    stableWindowMs: 8_000,
    intervalMs: 1_000,
    label: "GPS_STALE stable window 2",
  });

  if (staleCounts2.join(",") !== staleCounts1.join(",")) {
    throw new Error(`❌ GPS_STALE dedupe failed (counts changed: ${staleCounts1.join(",")} -> ${staleCounts2.join(",")})`);
  }
  console.log("✅ GPS_STALE dedupe OK");

  // 8) STALE->OFFLINE + dedupe (same strategy: existence + stable counts)
  await prisma.gpsLast.update({ where: { vehicleId }, data: { at: new Date(Date.now() - 350_000) } });

  const offlineExists = await waitKindAllScopes({
    kind: "GPS_OFFLINE",
    tokens: scopeTokens,
    timeoutMs: 90_000,
    intervalMs: 2_500,
    label: "STALE->OFFLINE",
  });
  if (!offlineExists) throw new Error("❌ GPS_OFFLINE not found for all scopes (WS+API)");
  console.log("✅ STALE->OFFLINE notif exists (driver/room/company)");

  const offCounts1 = await waitCountsStable({
    kind: "GPS_OFFLINE",
    tokens: scopeTokens,
    stableWindowMs: 8_000,
    intervalMs: 1_000,
    label: "GPS_OFFLINE stable window 1",
  });

  await sleep(15_000);

  const offCounts2 = await waitCountsStable({
    kind: "GPS_OFFLINE",
    tokens: scopeTokens,
    stableWindowMs: 8_000,
    intervalMs: 1_000,
    label: "GPS_OFFLINE stable window 2",
  });

  if (offCounts2.join(",") !== offCounts1.join(",")) {
    throw new Error(`❌ GPS_OFFLINE dedupe failed (counts changed: ${offCounts1.join(",")} -> ${offCounts2.join(",")})`);
  }
  console.log("✅ GPS_OFFLINE dedupe OK");

  // 9) OFFLINE->LIVE recovery (existence)
  await requestJson("POST", "/api/gps", { token: driverToken, body: { vehicleId, lat: 41.0304, lng: 28.9962, speed: 10 } });

  const recExists = await waitKindAllScopes({
    kind: "GPS_RECOVERY",
    tokens: scopeTokens,
    timeoutMs: 45_000,
    intervalMs: 2_000,
    label: "OFFLINE->LIVE recovery",
  });
  if (!recExists) throw new Error("❌ GPS_RECOVERY not found for all scopes (WS+API)");
  console.log("✅ OFFLINE->LIVE recovery notif exists (driver/room/company)");

  // cleanup
  await completeShiftBestEffort({ shiftId: harness.shiftId, driverToken });

  // close sockets
  driverWS.sock.close(); roomWS.sock.close(); compWS.sock.close();

  console.log("\n✅ FULLCHECK PASS");
}

main().catch((e) => { console.error(String(e?.stack ?? e)); process.exit(1); });
