// backend/scripts/m4check.js
import {
  BASE_URL,
  login,
  getRoomCompanyIds,
  pickVehicleDriver,
  preCleanDriverShifts,
  ensureActiveShift,
  closeShiftHard,
  postGps,
  sleep,
  callAny,
  itemsOf,
} from "./_harness.js";
import { prisma } from "../src/prisma.js";
import { ENV } from "../src/env.js";

function ok(msg) {
  console.log(`OK ${msg}`);
}

function upper(s) {
  return String(s || "").toUpperCase();
}

async function listNotifs(token) {
  const res = await callAny("GET", ["/api/notifications/my", "/api/notifications", "/api/notifs"], { token });
  if (!res.ok) return { ok: false, items: [], raw: res.r, path: res.path };
  const items = itemsOf(res.r);
  return { ok: true, items, raw: res.r, path: res.path };
}

function payloadOf(n) {
  const p = n?.payloadJson ?? n?.payload ?? null;
  if (!p) return null;
  try {
    return typeof p === "string" ? JSON.parse(p) : p;
  } catch {
    return null;
  }
}

function matchVehicle(p, vehicleId) {
  if (!vehicleId) return true;

  const vid =
    p?.vehicleId ??
    p?.vehicle?.id ??
    p?.vehicle?.vehicleId ??
    p?.meta?.vehicleId ??
    p?.data?.vehicleId ??
    null;

  return Number(vid) === Number(vehicleId);
}

function countKind(items, kind, vehicleId) {
  const K = upper(kind);
  let c = 0;
  for (const n of items ?? []) {
    const p = payloadOf(n);
    if (!p) continue;
    if (upper(p?.kind) !== K) continue;
    if (!matchVehicle(p, vehicleId)) continue;
    c++;
  }
  return c;
}

function tsOf(n) {
  const c =
    n?.createdAt ??
    n?.created_at ??
    n?.created ??
    n?.ts ??
    n?.at ??
    null;

  if (!c) return 0;
  const t = Date.parse(String(c));
  return Number.isFinite(t) ? t : 0;
}

function markerFor(items, kind, vehicleId) {
  // Prefer numeric id (stable for “new row”), else fall back to createdAt-like timestamp.
  const K = upper(kind);
  let maxId = 0;
  let maxTs = 0;
  let hasId = false;

  for (const n of items ?? []) {
    const p = payloadOf(n);
    if (!p) continue;
    if (upper(p?.kind) !== K) continue;
    if (!matchVehicle(p, vehicleId)) continue;

    const idNum = Number(n?.id);
    if (Number.isFinite(idNum) && idNum > 0) {
      hasId = true;
      if (idNum > maxId) maxId = idNum;
    } else {
      const t = tsOf(n);
      if (t > maxTs) maxTs = t;
    }
  }

  return hasId ? maxId : maxTs; // 0 olabilir
}

async function snapScope(token, kind, vehicleId) {
  const s = await listNotifs(token);
  return {
    ok: s.ok,
    count: countKind(s.items, kind, vehicleId),
    marker: markerFor(s.items, kind, vehicleId),
  };
}

function increased(cur, base) {
  // marker varsa marker ile karşılaştır; marker yoksa count ile
  if (base.marker > 0 || cur.marker > 0) return cur.marker > base.marker;
  return cur.count > base.count;
}

function increasedBeyond(cur, base) {
  if (base.marker > 0 || cur.marker > 0) return cur.marker > base.marker;
  return cur.count > base.count;
}

async function waitForNewAllScopes({ kind, vehicleId, driverToken, roomToken, companyToken, timeoutMs, stepMs, label }) {
  const base = await Promise.all([
    snapScope(driverToken, kind, vehicleId),
    snapScope(roomToken, kind, vehicleId),
    snapScope(companyToken, kind, vehicleId),
  ]);

  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const cur = await Promise.all([
      snapScope(driverToken, kind, vehicleId),
      snapScope(roomToken, kind, vehicleId),
      snapScope(companyToken, kind, vehicleId),
    ]);

    const okAll = increased(cur[0], base[0]) && increased(cur[1], base[1]) && increased(cur[2], base[2]);
    if (okAll) return { base, cur };

    await sleep(stepMs);
  }

  console.log(`INFO waitForNewAllScopes TIMEOUT kind=${kind} label=${label} vehicleId=${vehicleId}`);
  return null;
}

async function watchNoNew({ kind, vehicleId, driverToken, roomToken, companyToken, sinceSnap, watchMs, stepMs, label }) {
  const t0 = Date.now();
  while (Date.now() - t0 < watchMs) {
    const cur = await Promise.all([
      snapScope(driverToken, kind, vehicleId),
      snapScope(roomToken, kind, vehicleId),
      snapScope(companyToken, kind, vehicleId),
    ]);

    if (
      increasedBeyond(cur[0], sinceSnap[0]) ||
      increasedBeyond(cur[1], sinceSnap[1]) ||
      increasedBeyond(cur[2], sinceSnap[2])
    ) {
      const a = sinceSnap.map((x) => `${x.marker || 0}/${x.count}`).join(",");
      const b = cur.map((x) => `${x.marker || 0}/${x.count}`).join(",");
      throw new Error(`FAIL ${kind} dedupe FAIL (new record observed) ${a} -> ${b} (${label})`);
    }

    await sleep(stepMs);
  }
}

async function getVehicleInfo(roomToken, vehicleId) {
  const res = await callAny("GET", ["/api/vehicles"], { token: roomToken });
  if (!res.ok) return null;
  const items = itemsOf(res.r);
  return (items ?? []).find((v) => Number(v?.id) === Number(vehicleId)) ?? null;
}

function computeOverspeedKmh(vehicle) {
  const raw =
    vehicle?.speedLimitKmh ??
    vehicle?.speedLimit ??
    vehicle?.speedLimitKmhMax ??
    null;

  const limit = Number(raw);
  const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 90;

  const kmh = Math.min(Math.max(safeLimit + 40, 140), 240);
  return { limit: safeLimit, overspeedKmh: kmh };
}

async function main() {
  console.log(`API_URL = ${BASE_URL}`);

  const driverToken = await login("driver@demo.com", "demo123");
  const roomToken = await login("room@demo.com", "demo123");
  const companyToken = await login("company@demo.com", "demo123");
  ok("login(driver/room/company)");

  const { roomId, companyId } = await getRoomCompanyIds(roomToken, companyToken);
  const { vehicleId, driverId } = await pickVehicleDriver(roomToken);

  const pre = await preCleanDriverShifts({ roomToken, driverToken, driverId });
  if (pre.found) console.log(`CLEAN pre-clean: found=${pre.found} cleaned=${pre.cleaned}`);

  const h = await ensureActiveShift({
    companyToken,
    roomToken,
    driverToken,
    companyId,
    roomId,
    vehicleId,
    driverId,
    tag: "M4",
  });
  ok(`shift ACTIVE (id=${h.shiftId})`);

  try {
    // baseline LIVE
    await postGps(driverToken, { vehicleId: h.vehicleId, lat: 41.0309, lng: 28.9966, speed: 10, speedKmh: 10 });
    await sleep(1300);

    // OVERSPEED (marker-based: “yeni notif geldi mi?”)
    const vInfo = await getVehicleInfo(roomToken, h.vehicleId);
    const { limit, overspeedKmh } = computeOverspeedKmh(vInfo);
    console.log(`INFO overspeed plan: vehicleId=${h.vehicleId} limit=${limit} -> speedKmh=${overspeedKmh}`);

    const ovWait = waitForNewAllScopes({
      kind: "OVERSPEED",
      vehicleId: h.vehicleId,
      driverToken,
      roomToken,
      companyToken,
      timeoutMs: 45_000,
      stepMs: 1500,
      label: "OVERSPEED",
    });

    await postGps(driverToken, {
      vehicleId: h.vehicleId,
      lat: 41.031,
      lng: 28.9967,
      speed: overspeedKmh,
      speedKmh: overspeedKmh,
    });

    const ov = await ovWait;
    if (!ov) throw new Error("FAIL OVERSPEED missing for one of (driver/room/company)");
    ok("OVERSPEED notif (driver/room/company)");

    // LIVE->STALE (deterministic: at -35s) + “yeni stale” bekle
    const staleSec = Math.max(ENV.GPS_STALE_SEC ?? 40, 5);
    const offlineSec = Math.max(ENV.GPS_OFFLINE_SEC ?? 120, staleSec + 10);
    const staleAgeMs = (staleSec + 5) * 1000;
    const offlineAgeMs = (offlineSec + 10) * 1000;

    console.log(`WAIT forcing LIVE->STALE (gpsLast.at -${Math.floor(staleAgeMs/1000)}s) and waiting for monitor tick...`);
    const staleWait = waitForNewAllScopes({
      kind: "GPS_STALE",
      vehicleId: h.vehicleId,
      driverToken,
      roomToken,
      companyToken,
      timeoutMs: 90_000,
      stepMs: 2500,
      label: "LIVE->STALE",
    });

    await prisma.gpsLast.update({
      where: { vehicleId: h.vehicleId },
      data: { at: new Date(Date.now() - staleAgeMs) },
    });

    const st = await staleWait;
    if (!st) throw new Error("FAIL GPS_STALE missing for one of (driver/room/company)");
    ok("LIVE->STALE notif created (driver/room/company)");

    // STALE dedupe: 1 tick boyunca “yeni stale daha gelmemeli”
    console.log("WAIT watching for STALE dedupe (no new GPS_STALE should be created)...");
    await watchNoNew({
      kind: "GPS_STALE",
      vehicleId: h.vehicleId,
      driverToken,
      roomToken,
      companyToken,
      sinceSnap: st.cur,      // ilk yeni stale yakalandıktan sonraki marker
      watchMs: Math.max(20_000, Math.min(60_000, (offlineSec - staleSec - 10) * 1000)),        // offline eşiğini aşmadan en az 1 tick
      stepMs: 2500,
      label: "STALE_DEDUPE",
    });
    ok("GPS_STALE dedupe OK");

    // STALE->OFFLINE + “yeni offline” bekle
    console.log(`WAIT forcing STALE->OFFLINE (gpsLast.at -${Math.floor(offlineAgeMs/1000)}s) and waiting for monitor tick...`);

    const offWait = waitForNewAllScopes({
      kind: "GPS_OFFLINE",
      vehicleId: h.vehicleId,
      driverToken,
      roomToken,
      companyToken,
      timeoutMs: 90_000,
      stepMs: 2500,
      label: "STALE->OFFLINE",
    });

    await prisma.gpsLast.update({
      where: { vehicleId: h.vehicleId },
      data: { at: new Date(Date.now() - offlineAgeMs) },
    });

    const off = await offWait;
    if (!off) throw new Error("FAIL GPS_OFFLINE missing for one of (driver/room/company)");
    ok("STALE->OFFLINE notif created (driver/room/company)");

    // recovery + “yeni recovery” bekle
    const recWait = waitForNewAllScopes({
      kind: "GPS_RECOVERY",
      vehicleId: h.vehicleId,
      driverToken,
      roomToken,
      companyToken,
      timeoutMs: 60_000,
      stepMs: 1500,
      label: "OFFLINE->LIVE",
    });

    await postGps(driverToken, { vehicleId: h.vehicleId, lat: 41.0312, lng: 28.9969, speed: 20, speedKmh: 20 });

    const rec = await recWait;
    if (!rec) throw new Error("FAIL GPS_RECOVERY missing for one of (driver/room/company)");
    ok("OFFLINE->LIVE recovery notif created (driver/room/company)");

    console.log("\nOK M4CHECK PASS");
  } finally {
    const closed = await closeShiftHard({ shiftId: h.shiftId, driverToken, roomToken });
    if (closed) ok(`shift complete (cleanup) shiftId=${h.shiftId}`);
    else console.log(`WARN cleanup failed shiftId=${h.shiftId}`);
  }
}

main().catch((e) => {
  console.error(String(e?.stack ?? e));
  process.exit(1);
});

