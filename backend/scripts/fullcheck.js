// backend/scripts/fullcheck.js
import { io as ioc } from "socket.io-client";
import { prisma } from "../src/prisma.js";
import { ENV } from "../src/env.js";
import { totpToken } from "../src/auth/totp.js";

import {
  BASE_URL,
  login,
  getRoomCompanyIds,
  pickVehicleDriver,
  preCleanDriverShifts,
  ensureActiveShift,
  closeShiftHard,
  postGps,
  reqJson,
  callAny,
  itemsOf,
  sleep,
} from "./_harness.js";

function payloadOf(n) {
  const p = n?.payloadJson ?? n?.payload ?? null;
  if (!p) return null;
  try {
    return typeof p === "string" ? JSON.parse(p) : p;
  } catch {
    return null;
  }
}

function notifKey(n) {
  // en stabil: numeric id varsa onu kullan, yoksa createdAt parse
  const id = Number(n?.id);
  if (Number.isFinite(id) && id > 0) return id;

  const ca =
    n?.createdAt ??
    n?.created_at ??
    n?.createdAtIso ??
    n?.ts ??
    n?.time ??
    null;

  const t = ca ? Date.parse(String(ca)) : NaN;
  return Number.isFinite(t) ? t : 0;
}

function markerOf(items, kind, vehicleId) {
  let m = 0;
  for (const n of items ?? []) {
    const p = payloadOf(n);
    if (!p) continue;
    if (p.kind !== kind) continue;
    if (vehicleId != null && Number(p.vehicleId) !== Number(vehicleId)) continue;
    const k = notifKey(n);
    if (k > m) m = k;
  }
  return m;
}

async function listNotifs(token) {
  const res = await callAny("GET", ["/api/notifications/my", "/api/notifications", "/api/notifs"], { token });
  if (!res.ok) return { ok: false, items: [], raw: res.r, path: res.path };
  return { ok: true, items: itemsOf(res.r), raw: res.r, path: res.path };
}

async function waitFor(condFn, timeoutMs, stepMs = 100) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (condFn()) return true;
    await sleep(stepMs);
  }
  return false;
}

async function ensureTotpStepUp(token, label) {
  const setup = await reqJson("POST", "/api/auth/totp/setup", {
    token,
    includeGreenpack: false,
    body: {},
  });
  if (!setup.ok || !setup.json?.secretBase32) {
    throw new Error(`FAIL TOTP setup (${label}) -> ${setup.status}\n${String(setup.text || "").slice(0, 400)}`);
  }

  const code = totpToken(setup.json.secretBase32);
  const enable = await reqJson("POST", "/api/auth/totp/enable", {
    token,
    includeGreenpack: false,
    body: { code },
  });
  if (!enable.ok || enable.json?.enabled !== true) {
    throw new Error(`FAIL TOTP enable (${label}) -> ${enable.status}\n${String(enable.text || "").slice(0, 400)}`);
  }

  const verify = await reqJson("POST", "/api/auth/totp/verify", {
    token,
    includeGreenpack: false,
    body: { code },
  });
  if (!verify.ok || !verify.json?.token) {
    throw new Error(`FAIL TOTP verify (${label}) -> ${verify.status}\n${String(verify.text || "").slice(0, 400)}`);
  }

  return verify.json.token;
}

async function waitForNewNotifAllScopes({ kind, vehicleId, tokens, baseMarkers, timeoutMs = 90_000, stepMs = 1200 }) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const [d, r, c] = await Promise.all([
      listNotifs(tokens.driver),
      listNotifs(tokens.room),
      listNotifs(tokens.company),
    ]);

    const mD = markerOf(d.items, kind, vehicleId);
    const mR = markerOf(r.items, kind, vehicleId);
    const mC = markerOf(c.items, kind, vehicleId);

    if (mD > baseMarkers.d && mR > baseMarkers.r && mC > baseMarkers.c) {
      return { ok: true, markers: { d: mD, r: mR, c: mC } };
    }

    await sleep(stepMs);
  }
  return { ok: false, markers: null };
}

async function watchNoNewNotifAllScopes({ kind, vehicleId, tokens, markers, durationMs = 60_000, stepMs = 6000 }) {
  const t0 = Date.now();
  while (Date.now() - t0 < durationMs) {
    const [d, r, c] = await Promise.all([
      listNotifs(tokens.driver),
      listNotifs(tokens.room),
      listNotifs(tokens.company),
    ]);

    const mD = markerOf(d.items, kind, vehicleId);
    const mR = markerOf(r.items, kind, vehicleId);
    const mC = markerOf(c.items, kind, vehicleId);

    if (mD > markers.d || mR > markers.r || mC > markers.c) {
      return { ok: false, now: { d: mD, r: mR, c: mC } };
    }

    await sleep(stepMs);
  }
  return { ok: true, now: markers };
}

async function connectWs(token, label) {
  const sock = ioc(BASE_URL, { auth: { token }, transports: ["websocket"] });
  const bag = { ready: null, gps: [], vstat: [], notif: [], eta: [] };

  sock.on("ws:ready", (d) => (bag.ready = d));
  sock.on("gps:update", (d) => bag.gps.push(d));
  sock.on("vehicle:status", (d) => bag.vstat.push(d));
  sock.on("notif:new", (d) => bag.notif.push(d));
  sock.on("eta:update", (d) => bag.eta.push(d));

  const okReady = await waitFor(() => !!bag.ready, 6000, 100);
  if (!okReady) throw new Error(`WS ready timeout: ${label}`);
  return { sock, bag };
}

async function main() {
  console.log(`API_URL = ${BASE_URL}`);

  // health
  const health = await reqJson("GET", "/health");
  if (!health.ok || !health.json?.ok) throw new Error(`FAIL /health invalid -> ${health.status}`);
  console.log("OK /health");

  // logins
  const driverToken = await login("driver@demo.com", "demo123");
  const roomLoginToken = await login("room@demo.com", "demo123");
  const companyLoginToken = await login("company@demo.com", "demo123");
  const personelToken = await login("personel@demo.com", "demo123");
  console.log("OK login(driver/room/company/personel)");

  const roomToken = await ensureTotpStepUp(roomLoginToken, "room");
  const companyToken = await ensureTotpStepUp(companyLoginToken, "company");
  console.log("OK TOTP step-up(room/company)");

  // ids + cleanup + active shift harness
  const { roomId, companyId } = await getRoomCompanyIds(roomToken, companyToken);
  const { vehicleId, driverId } = await pickVehicleDriver(roomToken);

  await preCleanDriverShifts({ roomToken, driverToken, driverId });

  const h = await ensureActiveShift({
    companyToken,
    roomToken,
    driverToken,
    companyId,
    roomId,
    vehicleId,
    driverId,
    tag: "FULL",
  });

  // WS
  const driverWS = await connectWs(driverToken, "driver");
  const roomWS = await connectWs(roomToken, "room");
  const compWS = await connectWs(companyToken, "company");
  console.log("OK WS connect + ws:ready");

  // /api/shifts/my regression guard
  const myD = await reqJson("GET", "/api/shifts/my", { token: driverToken });
  const myP = await reqJson("GET", "/api/shifts/my", { token: personelToken });
  if (!myD.ok || !Array.isArray(myD.json?.items)) throw new Error("FAIL /api/shifts/my invalid (driver)");
  if (!myP.ok || !Array.isArray(myP.json?.items)) throw new Error("FAIL /api/shifts/my invalid (personel)");
  console.log("OK /api/shifts/my returns {items[]} (driver/personel)");

  const clearBags = () => {
    driverWS.bag.gps = []; driverWS.bag.vstat = []; driverWS.bag.notif = []; driverWS.bag.eta = [];
    roomWS.bag.gps = []; roomWS.bag.vstat = []; roomWS.bag.notif = []; roomWS.bag.eta = [];
    compWS.bag.gps = []; compWS.bag.vstat = []; compWS.bag.notif = []; compWS.bag.eta = [];
  };

  // LIVE gps -> WS + DB mapping
  clearBags();
  await postGps(driverToken, { vehicleId: h.vehicleId, lat: 41.0302, lng: 28.9960, speed: 20, speedKmh: 20 });

  const gotDriverGps = await waitFor(() => driverWS.bag.gps.some((x) => x.vehicleId === h.vehicleId), 5000);
  const gotDriverVs = await waitFor(() => driverWS.bag.vstat.some((x) => x.vehicleId === h.vehicleId), 5000);
  if (!gotDriverGps || !gotDriverVs) throw new Error("FAIL WS gps:update / vehicle:status missing (driver)");

  const gotRoomAny = await waitFor(
    () => roomWS.bag.gps.some((x) => x.vehicleId === h.vehicleId) || roomWS.bag.vstat.some((x) => x.vehicleId === h.vehicleId),
    5000
  );
  const gotCompAny = await waitFor(
    () => compWS.bag.gps.some((x) => x.vehicleId === h.vehicleId) || compWS.bag.vstat.some((x) => x.vehicleId === h.vehicleId),
    5000
  );
  if (!gotRoomAny) throw new Error("FAIL WS update missing (room)");
  if (!gotCompAny) throw new Error("FAIL WS update missing (company)");
  console.log("OK WS gps:update + vehicle:status (driver/room/company)");

  const v = await prisma.vehicle.findUnique({ where: { id: h.vehicleId }, select: { status: true } });
  const gl = await prisma.gpsLast.findUnique({ where: { vehicleId: h.vehicleId }, select: { status: true } });
  if (v?.status !== "ACTIVE" || gl?.status !== "OK") {
    throw new Error(`FAIL DB mapping wrong: Vehicle=${v?.status} GpsLast=${gl?.status}`);
  }
  console.log("OK DB mapping LIVE -> Vehicle.ACTIVE + GpsLast.OK");

  // OVERSPEED notif (DB + WS) driver/room/company
  const d0 = await listNotifs(driverToken);
  const r0 = await listNotifs(roomToken);
  const c0 = await listNotifs(companyToken);
  const baseOver = {
    d: markerOf(d0.items, "OVERSPEED", h.vehicleId),
    r: markerOf(r0.items, "OVERSPEED", h.vehicleId),
    c: markerOf(c0.items, "OVERSPEED", h.vehicleId),
  };
  console.log("OK OVERSPEED base markers", baseOver);

  clearBags();
  await postGps(driverToken, { vehicleId: h.vehicleId, lat: 41.03025, lng: 28.99605, speed: 140, speedKmh: 140 });
  await sleep(1500);
  await postGps(driverToken, { vehicleId: h.vehicleId, lat: 41.03025, lng: 28.99605, speed: 140, speedKmh: 140 });
  await sleep(2500);

  const [dO, rO, cO] = await Promise.all([
    listNotifs(driverToken),
    listNotifs(roomToken),
    listNotifs(companyToken),
  ]);
  const overMarkers = {
    d: markerOf(dO.items, "OVERSPEED", h.vehicleId),
    r: markerOf(rO.items, "OVERSPEED", h.vehicleId),
    c: markerOf(cO.items, "OVERSPEED", h.vehicleId),
  };
  if (!(overMarkers.d > baseOver.d && overMarkers.r > baseOver.r && overMarkers.c > baseOver.c)) {
    throw new Error(`FAIL OVERSPEED not created for all scopes -> ${JSON.stringify({ baseOver, markers: overMarkers })}`);
  }
  console.log("OK OVERSPEED notif markers", overMarkers);

  const wsD = await waitFor(() => driverWS.bag.notif.length > 0, 6000);
  const wsR = await waitFor(() => roomWS.bag.notif.length > 0, 6000);
  const wsC = await waitFor(() => compWS.bag.notif.length > 0, 6000);
  if (!wsD || !wsR || !wsC) throw new Error("FAIL WS notif:new missing for one of (driver/room/company)");
  console.log("OK OVERSPEED notif (DB + WS) driver/room/company");

  // ETA http + eta:update ws
  clearBags();
  const eta = await reqJson("GET", `/api/eta?vehicleId=${h.vehicleId}`, { token: driverToken });
  if (!eta.ok || !Array.isArray(eta.json?.stops)) throw new Error("FAIL /api/eta invalid (stops[])");
  console.log(`OK /api/eta (stops=${eta.json.stops.length})`);

  const etaShift = await prisma.shift.findUnique({
    where: { id: h.shiftId },
    select: {
      id: true,
      stops: {
        where: { state: "PENDING" },
        orderBy: { order: "asc" },
        take: 1,
        select: { id: true },
      },
    },
  });
  const etaStopId = etaShift?.stops?.[0]?.id ?? null;
  if (!etaStopId) throw new Error("FAIL eta stop missing");

  const etaReached = await reqJson("POST", `/api/driver/shifts/${h.shiftId}/stops/${etaStopId}/reached`, { token: driverToken });
  if (!etaReached.ok) throw new Error(`FAIL /api/driver/shifts/${h.shiftId}/stops/${etaStopId}/reached -> ${etaReached.status}`);

  const gotEtaWs = await waitFor(() => driverWS.bag.eta.length > 0, 6000);
  if (!gotEtaWs) throw new Error("FAIL WS eta:update missing (driver)");
  console.log("OK WS eta:update (driver)");

  const staleSec = Math.max(ENV.GPS_STALE_SEC ?? 40, 5);
  const offlineSec = Math.max(ENV.GPS_OFFLINE_SEC ?? 120, staleSec + 10);
  const staleAgeMs = (staleSec + 5) * 1000;
  const offlineAgeMs = (offlineSec + 10) * 1000;

  // --- STALE (deterministic) ---
  {
    const dS0 = await listNotifs(driverToken);
    const rS0 = await listNotifs(roomToken);
    const cS0 = await listNotifs(companyToken);

    const baseStale = {
      d: markerOf(dS0.items, "GPS_STALE", h.vehicleId),
      r: markerOf(rS0.items, "GPS_STALE", h.vehicleId),
      c: markerOf(cS0.items, "GPS_STALE", h.vehicleId),
    };

    // OK STALE threshold fix: -35s (25s bazen yetmiyor)
    console.log(`WAIT forcing LIVE->STALE (gpsLast.at -${Math.floor(staleAgeMs/1000)}s) and waiting for monitor tick...`);
    await prisma.gpsLast.update({
      where: { vehicleId: h.vehicleId },
      data: { at: new Date(Date.now() - staleAgeMs) },
    });

    const staleRes = await waitForNewNotifAllScopes({
      kind: "GPS_STALE",
      vehicleId: h.vehicleId,
      tokens: { driver: driverToken, room: roomToken, company: companyToken },
      baseMarkers: baseStale,
      timeoutMs: 90_000,
      stepMs: 1500,
    });

    if (!staleRes.ok) throw new Error("FAIL GPS_STALE not created for all scopes");
    console.log("OK LIVE->STALE notif created (driver/room/company)");

    console.log("WAIT watching for STALE dedupe (no new GPS_STALE should be created)...");
    const dedupe = await watchNoNewNotifAllScopes({
      kind: "GPS_STALE",
      vehicleId: h.vehicleId,
      tokens: { driver: driverToken, room: roomToken, company: companyToken },
      markers: staleRes.markers,
      durationMs: Math.max(20_000, Math.min(60_000, (offlineSec - staleSec - 10) * 1000)),
      stepMs: 6000,
    });
    if (!dedupe.ok) {
      throw new Error(`FAIL GPS_STALE dedupe FAIL (marker increased) -> ${JSON.stringify(dedupe.now)}`);
    }
    console.log("OK GPS_STALE dedupe OK");
  }

  // --- OFFLINE (deterministic) ---
  {
    const dO0 = await listNotifs(driverToken);
    const rO0 = await listNotifs(roomToken);
    const cO0 = await listNotifs(companyToken);

    const baseOff = {
      d: markerOf(dO0.items, "GPS_OFFLINE", h.vehicleId),
      r: markerOf(rO0.items, "GPS_OFFLINE", h.vehicleId),
      c: markerOf(cO0.items, "GPS_OFFLINE", h.vehicleId),
    };

    console.log(`WAIT forcing STALE->OFFLINE (gpsLast.at -${Math.floor(offlineAgeMs/1000)}s) and waiting for monitor tick...`);
    await prisma.gpsLast.update({
      where: { vehicleId: h.vehicleId },
      data: { at: new Date(Date.now() - offlineAgeMs) },
    });

    const offRes = await waitForNewNotifAllScopes({
      kind: "GPS_OFFLINE",
      vehicleId: h.vehicleId,
      tokens: { driver: driverToken, room: roomToken, company: companyToken },
      baseMarkers: baseOff,
      timeoutMs: 90_000,
      stepMs: 1500,
    });

    if (!offRes.ok) throw new Error("FAIL GPS_OFFLINE not created for all scopes");
    console.log("OK STALE->OFFLINE notif created (driver/room/company)");
  }

  // --- RECOVERY (deterministic) ---
  {
    const dR0 = await listNotifs(driverToken);
    const rR0 = await listNotifs(roomToken);
    const cR0 = await listNotifs(companyToken);

    const baseRec = {
      d: markerOf(dR0.items, "GPS_RECOVERY", h.vehicleId),
      r: markerOf(rR0.items, "GPS_RECOVERY", h.vehicleId),
      c: markerOf(cR0.items, "GPS_RECOVERY", h.vehicleId),
    };

    await postGps(driverToken, { vehicleId: h.vehicleId, lat: 41.0304, lng: 28.9962, speed: 10, speedKmh: 10 });

    const recRes = await waitForNewNotifAllScopes({
      kind: "GPS_RECOVERY",
      vehicleId: h.vehicleId,
      tokens: { driver: driverToken, room: roomToken, company: companyToken },
      baseMarkers: baseRec,
      timeoutMs: 30_000,
      stepMs: 1200,
    });

    if (!recRes.ok) throw new Error("FAIL GPS_RECOVERY not created for all scopes");
    console.log("OK OFFLINE->LIVE recovery notif created (driver/room/company)");
  }

  // cleanup
  try {
    const closed = await closeShiftHard({ shiftId: h.shiftId, driverToken, roomToken });
    if (closed) console.log(`OK shift complete (cleanup) shiftId=${h.shiftId}`);
    else console.log(`WARN cleanup failed shiftId=${h.shiftId}`);
  } finally {
    driverWS.sock.close();
    roomWS.sock.close();
    compWS.sock.close();
  }

  console.log("\nOK FULLCHECK PASS");
}

main().catch((e) => {
  console.error(String(e?.stack ?? e));
  process.exit(1);
});


