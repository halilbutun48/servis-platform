import { login, reqJson, banner, step, assertOk, sleep } from "./_harness.js";
import { prisma } from "../src/prisma.js";

function rand(n = 6) {
  return Math.random().toString(16).slice(2, 2 + n).toUpperCase();
}

const TR_OFFSET_MS = 180 * 60_000;
function ymdTR(d) {
  const tr = new Date(new Date(d).getTime() + TR_OFFSET_MS);
  const y = tr.getUTCFullYear();
  const m = String(tr.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(tr.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
function minTR(d) {
  const tr = new Date(new Date(d).getTime() + TR_OFFSET_MS);
  return tr.getUTCHours() * 60 + tr.getUTCMinutes();
}
function futureTRAtMs(hourTR = 10, minuteTR = 0) {
  const now = Date.now();
  const tr = new Date(now + TR_OFFSET_MS);
  const y = tr.getUTCFullYear();
  const m = tr.getUTCMonth();
  const dd = tr.getUTCDate();
  const utcHour = (hourTR + 24 - 3) % 24;
  let base = Date.UTC(y, m, dd, utcHour, minuteTR, 0, 0);
  if (base <= now + 5 * 60_000) base += 24 * 60 * 60_000;
  return base;
}
function mustOk(r, label) {
  if (r?.ok) {
    console.log(`OK ${label}`);
    return;
  }
  const st = r?.status ?? 0;
  const txt = String(r?.text ?? "").slice(0, 800);
  console.error(`FAIL ${label} (status=${st})\n${txt}`);
  throw new Error(`ASSERT_FAIL: ${label}`);
}
async function createDriver(roomToken, email, pass) {
  const c = await reqJson("POST", "/api/drivers", {
    token: roomToken,
    body: {
      fullName: `M91A Driver ${rand(4)}`,
      phone: "5550000000",
      deviceInfo: "m91a-test",
      email,
      password: pass,
    },
  });
  mustOk(c, "driver create");
  return Number(c.json.id);
}
async function createVehicle(roomToken, plate) {
  const c = await reqJson("POST", "/api/vehicles", {
    token: roomToken,
    body: { plate, capacity: 16, type: "MINIBUS" },
  });
  mustOk(c, "vehicle create");
  return Number(c.json.id);
}
async function bind(roomToken, vehicleId, driverId) {
  const r = await reqJson("PUT", `/api/vehicles/${vehicleId}/bind-driver`, {
    token: roomToken,
    body: { driverId },
  });
  mustOk(r, "bind-driver");
}
async function createShift(companyToken, roomId, startAt, endAt) {
  const r = await reqJson("POST", "/api/shifts", {
    token: companyToken,
    body: { roomId, startAt, endAt },
  });
  mustOk(r, "shift create");
  return Number(r.json.id);
}
async function approveShift(roomToken, shiftId, vehicleId, driverId) {
  return reqJson("PUT", `/api/shifts/${shiftId}/approve`, {
    token: roomToken,
    body: { vehicleId, driverId },
  });
}
async function roomStartShift(roomToken, shiftId) {
  return reqJson("POST", `/api/shifts/${shiftId}/start`, { token: roomToken });
}
async function createAgreement(companyToken, body) {
  const r = await reqJson("POST", "/api/agreements", { token: companyToken, body });
  mustOk(r, "agreement create");
  return Number(r.json.id);
}
async function approveAgreement(roomToken, id, { vehicleId, driverId }) {
  return reqJson("PUT", `/api/agreements/${id}/approve`, {
    token: roomToken,
    body: { vehicleId, driverId },
  });
}
async function extendAgreement(companyToken, id, endDate) {
  return reqJson("PUT", `/api/agreements/${id}/extend-request`, {
    token: companyToken,
    body: { endDate },
  });
}

async function main() {
  banner("M91A reservation conflict check");
  const companyToken = await login("company@demo.com");
  const roomToken = await login("room@demo.com");

  const meRoom = await reqJson("GET", "/api/me", { token: roomToken });
  mustOk(meRoom, "/api/me room");
  const roomId = Number(meRoom.json?.roomId || 0);
  assertOk(!!roomId, "roomId present");

  const pass = "demo1234";
  const driverId = await createDriver(roomToken, `m91a_${rand(6)}@demo.com`, pass);
  const vehicleId = await createVehicle(roomToken, `M91-A-${rand(6)}`);
  await bind(roomToken, vehicleId, driverId);

  const baseMs = futureTRAtMs(10, 0);
  const shiftStart = new Date(baseMs).toISOString();
  const shiftEnd = new Date(baseMs + 60 * 60 * 1000).toISOString();
  const agStartDate = ymdTR(new Date(baseMs));
  const agStartMin = minTR(new Date(baseMs + 15 * 60 * 1000));
  const agEndMin = minTR(new Date(baseMs + 45 * 60 * 1000));

  step("shift approved -> overlapping agreement approve must block");
  const blockerShiftId = await createShift(companyToken, roomId, shiftStart, shiftEnd);
  mustOk(await approveShift(roomToken, blockerShiftId, vehicleId, driverId), "blocker shift approve");

  const agId = await createAgreement(companyToken, {
    roomId,
    startDate: agStartDate,
    endDate: agStartDate,
    weekMask: 127,
    startMin: agStartMin,
    endMin: agEndMin,
    direction: "OUTBOUND",
    pattern: "ONE_WAY",
    hubLat: 41,
    hubLng: 29,
  });
  const agApprove = await approveAgreement(roomToken, agId, { vehicleId, driverId });
  assertOk(agApprove.status === 409, "agreement approve blocked by shift");
  assertOk(/CONFLICT/.test(String(agApprove.json?.code || agApprove.text || "")), "agreement approve conflict code");

  step("agreement approved -> overlapping shift approve must block");
  const driver2 = await createDriver(roomToken, `m91a2_${rand(6)}@demo.com`, pass);
  const vehicle2 = await createVehicle(roomToken, `M91-B-${rand(6)}`);
  await bind(roomToken, vehicle2, driver2);

  const ag2Id = await createAgreement(companyToken, {
    roomId,
    startDate: agStartDate,
    endDate: agStartDate,
    weekMask: 127,
    startMin: agStartMin,
    endMin: agEndMin,
    direction: "OUTBOUND",
    pattern: "ONE_WAY",
    hubLat: 41,
    hubLng: 29,
  });
  mustOk(await approveAgreement(roomToken, ag2Id, { vehicleId: vehicle2, driverId: driver2 }), "agreement approve ok");
  await sleep(300);

  const shift2Id = await createShift(
    companyToken,
    roomId,
    new Date(baseMs + 20 * 60 * 1000).toISOString(),
    new Date(baseMs + 40 * 60 * 1000).toISOString()
  );
  const shiftApproveBlocked = await approveShift(roomToken, shift2Id, vehicle2, driver2);
  assertOk(shiftApproveBlocked.status === 409, "shift approve blocked by agreement");
  assertOk(/AGREEMENT_/.test(String(shiftApproveBlocked.json?.details?.code || shiftApproveBlocked.text || "")), "shift approve agreement conflict code");

  step("agreement approve must also block against later approved shift on same resource");
  const shift3Id = await createShift(
    companyToken,
    roomId,
    new Date(baseMs + 90 * 60 * 1000).toISOString(),
    new Date(baseMs + 120 * 60 * 1000).toISOString()
  );
  mustOk(await approveShift(roomToken, shift3Id, vehicle2, driver2), "clean shift approve ok");

  const ag3Id = await createAgreement(companyToken, {
    roomId,
    startDate: agStartDate,
    endDate: agStartDate,
    weekMask: 127,
    startMin: minTR(new Date(baseMs + 95 * 60 * 1000)),
    endMin: minTR(new Date(baseMs + 115 * 60 * 1000)),
    direction: "OUTBOUND",
    pattern: "ONE_WAY",
    hubLat: 41,
    hubLng: 29,
  });
  const ag3Approve = await approveAgreement(roomToken, ag3Id, { vehicleId: vehicle2, driverId: driver2 });
  assertOk(ag3Approve.status === 409, "second agreement approve blocked by approved shift");
  assertOk(/CONFLICT/.test(String(ag3Approve.json?.code || ag3Approve.text || "")), "second agreement approve conflict code");

  step("shift start must still block if conflicting agreement appears after shift approval");
  await prisma.agreement.update({
    where: { id: ag3Id },
    data: {
      vehicleId: vehicle2,
      driverId: driver2,
      status: "APPROVED",
    },
  });
  const shiftStartBlocked = await roomStartShift(roomToken, shift3Id);
  assertOk(shiftStartBlocked.status === 409, "shift start blocked by agreement");
  assertOk(/AGREEMENT_/.test(String(shiftStartBlocked.json?.details?.code || shiftStartBlocked.text || "")), "shift start agreement conflict code");

  step("agreement extend must block when new days overlap approved shift");
  const extendBase = futureTRAtMs(11, 0) + 24 * 60 * 60 * 1000;
  const extendStartDate = ymdTR(new Date(extendBase));
  const extendEndDate = ymdTR(new Date(extendBase));
  const extendAgreementId = await createAgreement(companyToken, {
    roomId,
    startDate: extendStartDate,
    endDate: extendEndDate,
    weekMask: 127,
    startMin: minTR(new Date(extendBase)),
    endMin: minTR(new Date(extendBase + 30 * 60 * 1000)),
    direction: "OUTBOUND",
    pattern: "ONE_WAY",
    hubLat: 41,
    hubLng: 29,
  });
  mustOk(await approveAgreement(roomToken, extendAgreementId, { vehicleId, driverId }), "extend agreement approve ok");

  const overlapShiftId = await createShift(
    companyToken,
    roomId,
    new Date(extendBase + 24 * 60 * 60 * 1000).toISOString(),
    new Date(extendBase + 24 * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString()
  );
  mustOk(await approveShift(roomToken, overlapShiftId, vehicleId, driverId), "future overlap shift approve ok");

  const extendResp = await extendAgreement(companyToken, extendAgreementId, ymdTR(new Date(extendBase + 24 * 60 * 60 * 1000)));
  assertOk(extendResp.status === 409, "agreement extend blocked by shift");

  banner("M91A CHECK PASS");
}

main().catch((e) => {
  console.error("M91A CHECK FAIL:", e?.message || e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect().catch(() => null);
});
