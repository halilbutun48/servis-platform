// backend/scripts/m18check.js
import { prisma } from "../src/prisma.js";
import { login, reqJson, banner, step, assertOk, sleep } from "./_harness.js";
import { createAgreementSourceShift } from "./_agreement_source_shift_harness.js";

// TR-local schedule semantics (UTC+03:00)
const TR_OFFSET_MS = 180 * 60_000;

function ymdTR(d = new Date()) {
  const tr = new Date(d.getTime() + TR_OFFSET_MS);
  const y = tr.getUTCFullYear();
  const m = String(tr.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(tr.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function dayBitTR(d = new Date()) {
  const tr = new Date(d.getTime() + TR_OFFSET_MS);
  const wd = tr.getUTCDay(); // 0=Sun
  if (wd === 0) return 64;
  return 1 << (wd - 1);
}

function atTR(ymd, min) {
  const base = new Date(`${ymd}T00:00:00.000+03:00`);
  return new Date(base.getTime() + Number(min || 0) * 60_000);
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

  step("create agreement for today via source shift");
  const today = new Date();
  // IMPORTANT: This check must be deterministic at *any* time of day.
  // If we use a fixed window like 00:01-00:02, approving later in the day
  // makes agreementMonitor immediately set it to DONE and generator will skip.
  // So we schedule a tiny window a couple minutes in the future (TR time).
  let startDate = ymdTR(today);
  let endDate = startDate;
  let weekMask = dayBitTR(today);

  const tr = new Date(today.getTime() + TR_OFFSET_MS);
  const minuteOfDay = tr.getUTCHours() * 60 + tr.getUTCMinutes();

  let startMin = minuteOfDay + 2;
  if (startMin >= 1440) {
    // near TR midnight; push to tomorrow 00:01
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60_000);
    startDate = ymdTR(tomorrow);
    endDate = startDate;
    weekMask = dayBitTR(tomorrow);
    startMin = 1;
  }

  const endMin = (startMin + 2) % 1440;
  const sourceShiftStartAt = atTR(startDate, startMin).toISOString();
  const sourceShiftEndAt = atTR(startDate, endMin).toISOString();

  const src = await createAgreementSourceShift({
    reqJson,
    token: companyToken,
    roomId,
    tag: "M18",
    startAt: sourceShiftStartAt,
    endAt: sourceShiftEndAt,
  });
  assertOk(src.shiftId > 0, "source shift created for agreement");

  const a = await reqJson("POST", "/api/agreements", {
    token: companyToken,
    body: { roomId, startDate, endDate, weekMask, startMin, endMin, sourceShiftId: src.shiftId },
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

  // Generator tick is async in server process. On slower machines/CI, 6.5s can be flaky.
  // We'll poll up to 25s to make this check deterministic while still validating the real job.
  step("wait generator tick (<= 25s)");

  const startAt = atTR(startDate, startMin);

  let found = null;
  const deadline = Date.now() + 25_000;
  while (Date.now() < deadline) {
     
    found = await prisma.shift.findFirst({
      where: { agreementId, startAt },
      select: { id: true, status: true, startAt: true },
    });
    if (found?.id) break;
     
    await sleep(1250);
  }

  if (!found?.id) {
    const ag = await prisma.agreement.findUnique({
      where: { id: agreementId },
      select: {
        id: true,
        status: true,
        startDate: true,
        endDate: true,
        weekMask: true,
        startMin: true,
        endMin: true,
        vehicleId: true,
        driverId: true,
      },
    });
    const recent = await prisma.shift.findMany({
      where: { agreementId },
      take: 5,
      orderBy: { id: "desc" },
      select: { id: true, status: true, startAt: true, endAt: true },
    });

    throw new Error(
      [
        "ASSERT_FAIL: generated shift exists",
        `now=${new Date().toISOString()}`,
        `expectedStartAt=${startAt.toISOString()}`,
        `sourceShiftId=${src.shiftId}`,
        `agreement=${JSON.stringify(ag)}`,
        `recentShifts=${JSON.stringify(recent)}`,
      ].join("\n")
    );
  }

  assertOk(["APPROVED", "ACTIVE"].includes(String(found.status)), "generated shift status APPROVED/ACTIVE");

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
