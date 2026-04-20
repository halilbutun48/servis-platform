// backend/scripts/m4check.js
import {
  BASE_URL,
  login,
  getRoomCompanyIds,
  preCleanDriverShifts,
  ensureActiveShift,
  closeShiftHard,
  postGps,
  sleep,
  callAny,
  itemsOf,
  reqJson,
} from "./_harness.js";
import { prisma } from "../src/prisma.js";
import { ENV } from "../src/env.js";

function ok(msg) {
  console.log(`OK ${msg}`);
}

function must(cond, msg) {
  if (!cond) throw new Error(`FAIL ${msg}`);
}

function uniq(prefix = "M4") {
  return `${prefix}-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(16).slice(2, 6).toUpperCase()}`;
}

async function createIsolatedVehicleDriver(roomToken) {
  const suffix = uniq();
  const vehicle = await reqJson("POST", "/api/vehicles", {
    token: roomToken,
    body: { plate: suffix, capacity: 16, speedLimitKmh: 90 },
  });
  must(vehicle.ok, `vehicle create (${suffix})`);
  const vehicleId = Number(vehicle.json?.id || vehicle.json?.vehicle?.id || 0);
  must(vehicleId > 0, "vehicleId present");

  const driver = await reqJson("POST", "/api/drivers", {
    token: roomToken,
    body: { fullName: `M4 Driver ${suffix}`, phone: `90537${String(Date.now()).slice(-6)}`, deviceInfo: "m4-check" },
  });
  must(driver.ok, `driver create (${suffix})`);
  const driverId = Number(driver.json?.id || driver.json?.driver?.id || 0);
  const driverCode = String(driver.json?.issuedCredentials?.driverCode || "");
  const temporaryPin = String(driver.json?.issuedCredentials?.temporaryPin || "");
  must(driverId > 0, "driverId present");
  must(driverCode.length >= 6, "driver code issued");
  must(temporaryPin.length >= 4, "temporary pin issued");

  const loginResp = await reqJson("POST", "/api/auth/login", {
    body: { identifier: driverCode, password: temporaryPin },
  });
  must(loginResp.ok, "isolated driver login ok");
  const driverToken = String(loginResp.json?.token || "");
  must(driverToken.length > 20, "isolated driver token present");

  return { vehicleId, driverId, driverToken };
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

async function waitForNewAllScopes({
  kind,
  vehicleId,
  driverToken,
  roomToken,
  companyToken,
  timeoutMs,
  stepMs,
  label,
  refresh = null,
}) {
  const base = await Promise.all([
    snapScope(driverToken, kind, vehicleId),
    snapScope(roomToken, kind, vehicleId),
    snapScope(companyToken, kind, vehicleId),
  ]);

  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    if (refresh) await refresh();

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

  const roomToken = await login("room@demo.com", "demo123");
  const companyToken = await login("company@demo.com", "demo123");
  ok("login(room/company)");

  const { roomId, companyId } = await getRoomCompanyIds(roomToken, companyToken);
  const { vehicleId, driverId, driverToken } = await createIsolatedVehicleDriver(roomToken);
  ok(`isolated vehicle+driver (vehicleId=${vehicleId}, driverId=${driverId})`);

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
    const keepStaleAge = () =>
      prisma.gpsLast.update({
        where: { vehicleId: h.vehicleId },
        data: { at: new Date(Date.now() - staleAgeMs) },
      });

    await keepStaleAge();

    const staleWait = waitForNewAllScopes({
      kind: "GPS_STALE",
      vehicleId: h.vehicleId,
      driverToken,
      roomToken,
      companyToken,
      timeoutMs: 90_000,
      stepMs: 2500,
      label: "LIVE->STALE",
      refresh: keepStaleAge,
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

