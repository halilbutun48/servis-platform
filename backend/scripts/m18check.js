// backend/scripts/m18check.js
import { prisma } from "../src/prisma.js";
import { login, reqJson, banner, step, assertOk, sleep } from "./_harness.js";

function ymdUTC(d = new Date()) {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function dayBitUTC(d = new Date()) {
  const wd = d.getUTCDay(); // 0=Sun
  if (wd === 0) return 64;
  return 1 << (wd - 1);
}
function atUtc(ymd, min) {
  const d = new Date(`${ymd}T00:00:00.000Z`);
  const m = Number(min || 0);
  d.setUTCHours(Math.floor(m / 60), m % 60, 0, 0);
  return d;
}
function rand(n = 6) {
  return Math.random().toString(16).slice(2, 2 + n).toUpperCase();
}
function mustOk(r, label) {
  if (r?.ok) return;
  const st = r?.status ?? 0;
  const txt = String(r?.text ?? "").slice(0, 600);
  throw new Error(`ASSERT_FAIL: ${label} (status=${st})\n${txt}`);
}

async function main() {
  banner("M18CHECK: Agreement -> daily Shift generator");

  const roomToken = await login("room@demo.com");
  const companyToken = await login("company@demo.com");

  const meRoom = await reqJson("GET", "/api/me", { token: roomToken });
  mustOk(meRoom, "/api/me (ROOM)");
  const roomId = Number(meRoom.json?.roomId || 0);
  assertOk(!!roomId, "roomId present");

  step("create vehicle + driver");
  const v = await reqJson("POST", "/api/vehicles", {
    token: roomToken,
    body: { plate: `M18-${rand(6)}`, capacity: 16, speedLimitKmh: 90 },
  });
  mustOk(v, "vehicle create");
  const vehicleId = Number(v.json?.id || 0);
  assertOk(!!vehicleId, "vehicleId present");

  const d = await reqJson("POST", "/api/drivers", {
    token: roomToken,
    body: { fullName: `M18 Driver ${rand(4)}`, phone: "0000000000", deviceInfo: "m18-check" },
  });
  mustOk(d, "driver create");
  const driverId = Number(d.json?.id || 0);
  assertOk(!!driverId, "driverId present");

  step("create agreement for today");
  const today = new Date();
  const startDate = ymdUTC(today);
  const endDate = startDate;
  const weekMask = dayBitUTC(today);

  const startMin = 1; // 00:01
  const endMin = 2;   // 00:02

  const a = await reqJson("POST", "/api/agreements", {
    token: companyToken,
    body: { roomId, startDate, endDate, weekMask, startMin, endMin },
  });
  mustOk(a, "agreement create");
  const agreementId = Number(a.json?.id || 0);
  assertOk(!!agreementId, "agreementId present");

  step("approve agreement assign vehicle+driver");
  const ap = await reqJson("PUT", `/api/agreements/${agreementId}/approve`, {
    token: roomToken,
    body: { vehicleId, driverId },
  });
  mustOk(ap, "approve ok");

  step("wait generator tick (<= 6.5s)");
  await sleep(6500);

  const startAt = atUtc(startDate, startMin);

  const found = await prisma.shift.findFirst({
    where: { agreementId, startAt },
    select: { id: true, status: true, startAt: true },
  });

  assertOk(!!found?.id, "generated shift exists");
  assertOk(found.status === "APPROVED", "generated shift status APPROVED");

  step("dedupe guard: no second shift");
  await sleep(6500);

  const count = await prisma.shift.count({ where: { agreementId, startAt } });
  assertOk(count === 1, "duplicate guard OK");

  banner("M18CHECK PASS");
}

main().catch((e) => {
  console.error("M18CHECK FAIL:", e?.message || e);
  process.exit(1);
});