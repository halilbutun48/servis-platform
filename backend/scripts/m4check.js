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

function ok(msg) {
  console.log(`✅ ${msg}`);
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

async function waitForKindAllScopes({ kind, vehicleId, tokens, timeoutMs = 45_000, stepMs = 1500, label = "" }) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    const [d, r, c] = await Promise.all(tokens.map((t) => listNotifs(t)));
    const okAll =
      countKind(d.items, kind, vehicleId) > 0 &&
      countKind(r.items, kind, vehicleId) > 0 &&
      countKind(c.items, kind, vehicleId) > 0;

    if (okAll) return true;
    await sleep(stepMs);
  }
  console.log(`ℹ️ waitForKindAllScopes TIMEOUT kind=${kind} label=${label} vehicleId=${vehicleId}`);
  return false;
}

async function getVehicleInfo(roomToken, vehicleId) {
  const res = await callAny("GET", ["/api/vehicles"], { token: roomToken });
  if (!res.ok) return null;
  const items = itemsOf(res.r);
  return (items ?? []).find((v) => Number(v?.id) === Number(vehicleId)) ?? null;
}

function computeOverspeedKmh(vehicle) {
  // speedLimitKmh yoksa default 90 kabul edip güvenli bir overspeed üret.
  const raw =
    vehicle?.speedLimitKmh ??
    vehicle?.speedLimit ??
    vehicle?.speedLimitKmhMax ??
    null;

  const limit = Number(raw);
  const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 90;

  // limit ne olursa olsun “kesin overspeed” için limit + 40; min 140; max 240.
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

  // mevcut seçim: araç + sürücü
  // (burayı bozmayalım; deterministikliği overspeed hızını limitle hesaplayarak sağlıyoruz)
  const { vehicleId, driverId } = await pickVehicleDriver(roomToken);

  const pre = await preCleanDriverShifts({ roomToken, driverToken, driverId });
  if (pre.found) console.log(`🧹 pre-clean: found=${pre.found} cleaned=${pre.cleaned}`);

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

  const tokens = [driverToken, roomToken, companyToken];

  try {
    // baseline LIVE (fresh gpsLast)
    await postGps(driverToken, { vehicleId: h.vehicleId, lat: 41.0309, lng: 28.9966, speed: 10, speedKmh: 10 });
    await sleep(300);

    // OVERSPEED (deterministic: vehicle limit -> overspeedKmh)
    const vInfo = await getVehicleInfo(roomToken, h.vehicleId);
    const { limit, overspeedKmh } = computeOverspeedKmh(vInfo);
    console.log(`ℹ️ overspeed plan: vehicleId=${h.vehicleId} limit=${limit} -> speedKmh=${overspeedKmh}`);

    await postGps(driverToken, {
      vehicleId: h.vehicleId,
      lat: 41.031,
      lng: 28.9967,
      speed: overspeedKmh,
      speedKmh: overspeedKmh,
    });

    const overspeedOk = await waitForKindAllScopes({
      kind: "OVERSPEED",
      vehicleId: h.vehicleId,
      tokens,
      timeoutMs: 45_000,
      stepMs: 1500,
      label: "OVERSPEED",
    });
    if (!overspeedOk) throw new Error("❌ OVERSPEED missing for one of (driver/room/company)");
    ok("OVERSPEED notif (driver/room/company)");

    // LIVE->STALE (deterministic: gpsLast.at geri çek + monitor tick bekle)
    console.log("⏳ forcing LIVE->STALE (gpsLast.at -35s) and waiting for monitor tick...");
    await prisma.gpsLast.update({
      where: { vehicleId: h.vehicleId },
      data: { at: new Date(Date.now() - 35_000) },
    });

    const staleOk = await waitForKindAllScopes({
      kind: "GPS_STALE",
      vehicleId: h.vehicleId,
      tokens,
      timeoutMs: 90_000,
      stepMs: 2500,
      label: "LIVE->STALE",
    });
    if (!staleOk) throw new Error("❌ GPS_STALE missing for one of (driver/room/company)");
    ok("LIVE->STALE notif created (driver/room/company)");

    // dedupe STALE (count artmamalı)
    const s0 = await Promise.all(tokens.map((t) => listNotifs(t)));
    const staleCounts1 = s0.map((x) => countKind(x.items, "GPS_STALE", h.vehicleId));
    console.log(`ℹ️ stale counts baseline (d,r,c) = ${staleCounts1.join(",")}`);

    console.log("⏳ waiting for STALE dedupe window...");
    await sleep(20_000);

    const s1 = await Promise.all(tokens.map((t) => listNotifs(t)));
    const staleCounts2 = s1.map((x) => countKind(x.items, "GPS_STALE", h.vehicleId));
    console.log(`ℹ️ stale counts after wait (d,r,c) = ${staleCounts2.join(",")}`);

    if (staleCounts2.some((c, i) => c > staleCounts1[i])) {
      throw new Error(`❌ GPS_STALE dedupe FAIL (counts increased) ${staleCounts1.join(",")} -> ${staleCounts2.join(",")}`);
    }
    ok("GPS_STALE dedupe OK");

    // STALE->OFFLINE (deterministic: gpsLast.at -350s + poll)
    console.log("⏳ forcing STALE->OFFLINE (gpsLast.at -350s) and waiting for monitor tick...");
    await prisma.gpsLast.update({
      where: { vehicleId: h.vehicleId },
      data: { at: new Date(Date.now() - 350_000) },
    });

    const offlineOk = await waitForKindAllScopes({
      kind: "GPS_OFFLINE",
      vehicleId: h.vehicleId,
      tokens,
      timeoutMs: 90_000,
      stepMs: 2500,
      label: "STALE->OFFLINE",
    });
    if (!offlineOk) throw new Error("❌ GPS_OFFLINE missing for one of (driver/room/company)");
    ok("STALE->OFFLINE notif created (driver/room/company)");

    // recovery (OFFLINE->LIVE)
    await postGps(driverToken, { vehicleId: h.vehicleId, lat: 41.0312, lng: 28.9969, speed: 20, speedKmh: 20 });

    const recOk = await waitForKindAllScopes({
      kind: "GPS_RECOVERY",
      vehicleId: h.vehicleId,
      tokens,
      timeoutMs: 60_000,
      stepMs: 1500,
      label: "OFFLINE->LIVE",
    });
    if (!recOk) throw new Error("❌ GPS_RECOVERY missing for one of (driver/room/company)");
    ok("OFFLINE->LIVE recovery notif created (driver/room/company)");

    console.log("\n✅ M4CHECK PASS");
  } finally {
    const closed = await closeShiftHard({ shiftId: h.shiftId, driverToken, roomToken });
    if (closed) ok(`shift complete (cleanup) shiftId=${h.shiftId}`);
    else console.log(`⚠️ cleanup failed shiftId=${h.shiftId}`);
  }
}

main().catch((e) => {
  console.error(String(e?.stack ?? e));
  process.exit(1);
});
