import {
  banner,
  step,
  must,
  reqJson,
  loginFirst,
  getRoomCompanyIds,
} from "./_harness.js";

function iso(msFromNow) {
  return new Date(Date.now() + msFromNow).toISOString();
}

function itemsOf(resp) {
  const j = resp?.json;
  if (Array.isArray(j)) return j;
  if (Array.isArray(j?.items)) return j.items;
  return [];
}

async function createVehicle(roomToken, suffix, capacity = 16) {
  const plate = `S06-${suffix}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  const r = await reqJson("POST", "/api/vehicles", {
    token: roomToken,
    body: { plate, capacity, speedLimitKmh: 90 },
  });
  must(`vehicle create ok (${plate})`, r.ok);
  const id = Number(r.json?.id || r.json?.vehicle?.id || 0);
  must(`vehicleId present (${plate})`, id > 0);
  return { id, plate, capacity };
}

async function createDriver(roomToken, suffix) {
  const fullName = `Step06 Driver ${suffix} ${Math.random().toString(36).slice(2, 5)}`;
  const r = await reqJson("POST", "/api/drivers", {
    token: roomToken,
    body: { fullName, phone: `90555${Date.now().toString().slice(-7)}`, deviceInfo: `step06-${suffix}` },
  });
  must(`driver create ok (${suffix})`, r.ok);
  const id = Number(r.json?.id || r.json?.driver?.id || 0);
  must(`driverId present (${suffix})`, id > 0);
  return { id, fullName };
}

async function bindVehicle(roomToken, vehicleId, driverId) {
  const r = await reqJson("PUT", `/api/vehicles/${vehicleId}/bind-driver`, {
    token: roomToken,
    body: { driverId },
  });
  must(`bind ok vehicle=${vehicleId} driver=${driverId}`, r.ok);
}

async function createShift(companyToken, roomId, tag, extra = {}) {
  const r = await reqJson("POST", "/api/shifts", {
    token: companyToken,
    body: {
      roomId,
      startAt: iso(-15 * 60 * 1000),
      endAt: iso(2 * 60 * 60 * 1000),
      direction: "OUTBOUND",
      pattern: "ONE_WAY",
      hubLat: 41.0301,
      hubLng: 28.9951,
      ...extra,
      stops: [
        { name: `${tag} Stop A`, lat: 41.0321, lng: 28.9971, order: 1, type: "COMMON" },
        { name: `${tag} Stop B`, lat: 41.0341, lng: 28.9991, order: 2, type: "COMMON" },
      ],
    },
  });
  must(`shift create ok (${tag})`, r.ok);
  const shiftId = Number(r.json?.id || r.json?.shift?.id || 0);
  must(`shiftId present (${tag})`, shiftId > 0);
  return shiftId;
}

async function putPeople(companyToken, shiftId, count, tag) {
  const items = [];
  for (let i = 0; i < count; i++) {
    items.push({
      fullName: `${tag} Person ${i + 1}`,
      phone: `90555${String(1000000 + i).slice(-7)}`,
      address: `${tag} Address ${i + 1}`,
      lat: 41.04 + i * 0.0002,
      lng: 29.00 + i * 0.0002,
      geoManualOverride: true,
    });
  }
  const r = await reqJson("PUT", `/api/shifts/${shiftId}/people?mode=REPLACE`, {
    token: companyToken,
    body: { items },
  });
  must(`shift people upsert ok (${tag})`, r.ok && r.json?.ok === true);
}

async function generateStops(companyToken, shiftId, tag) {
  const r = await reqJson("POST", `/api/shifts/${shiftId}/stops/generate?mode=REPLACE`, {
    token: companyToken,
    body: {},
  });
  must(`stops generate ok (${tag})`, r.ok && r.json?.ok === true);
}

async function getShift(companyToken, shiftId) {
  const r = await reqJson("GET", "/api/shifts?take=400", { token: companyToken });
  must("GET /api/shifts ok", r.ok);
  const items = itemsOf(r);
  return items.find((x) => Number(x?.id || 0) === Number(shiftId)) || null;
}

async function createSchoolTenant(superToken) {
  const ts = Date.now();
  const schoolName = `Step06 School ${ts}`;
  const schoolEmail = `step06_school_${ts}@demo.com`;

  const c = await reqJson("POST", "/api/companies", {
    token: superToken,
    body: { name: schoolName, kind: "SCHOOL" },
  });
  must("create SCHOOL company ok", c.ok);
  const schoolCompanyId = Number(c.json?.id || c.json?.company?.id || 0);
  must("schoolCompanyId present", schoolCompanyId > 0);

  const u = await reqJson("POST", "/api/admin/users", {
    token: superToken,
    body: {
      email: schoolEmail,
      role: "COMPANY",
      companyId: schoolCompanyId,
      fullName: "Step06 School User",
    },
  });
  must("create SCHOOL company user ok", u.ok);
  const tempPassword = String(u.json?.tempPassword || "");
  must("school tempPassword present", tempPassword.length > 0);

  const schoolToken = await loginFirst(schoolEmail, tempPassword);
  must("school login ok", !!schoolToken);

  return { schoolToken, schoolCompanyId, schoolEmail };
}

async function findStudent(companyToken, fullName) {
  const r = await reqJson("GET", "/api/company/personels?take=200&kind=STUDENT", { token: companyToken });
  must("GET /api/company/personels kind=STUDENT ok", r.ok);
  const items = itemsOf(r);
  return items.find((x) => String(x?.fullName || "").trim() === String(fullName).trim()) || null;
}

async function main() {
  banner("STEP06 STABIL CHECK: pool/split + school parent invite");

  const superToken = await loginFirst("super");
  const roomToken = await loginFirst("room");
  const companyToken = await loginFirst("company");
  must("login super", !!superToken);
  must("login room", !!roomToken);
  must("login company", !!companyToken);

  const { roomId } = await getRoomCompanyIds(roomToken, companyToken);
  must("roomId present", Number(roomId || 0) > 0);

  step("create 2 dedicated vehicles + 2 dedicated drivers and bind them");
  const v1 = await createVehicle(roomToken, "A", 16);
  const v2 = await createVehicle(roomToken, "B", 16);
  const d1 = await createDriver(roomToken, "A");
  const d2 = await createDriver(roomToken, "B");
  await bindVehicle(roomToken, v1.id, d1.id);
  await bindVehicle(roomToken, v2.id, d2.id);

  step("create demand-heavy shift for pool summary and auto-split");
  const shiftId = await createShift(companyToken, roomId, "STEP06-POOL");
  await putPeople(companyToken, shiftId, 20, "STEP06POOL");
  await generateStops(companyToken, shiftId, "STEP06POOL");

  step("load room pool summary");
  const pool = await reqJson("GET", `/api/availability/pool?shiftId=${shiftId}`, { token: roomToken });
  must("pool summary ok", pool.ok);
  must("pool summary shiftId matches", Number(pool.json?.shiftId || 0) === shiftId);
  must("pool enough capacity", pool.json?.enoughPoolCapacity === true);
  must("pool suggested combo >=2", Number(pool.json?.suggestedCombo?.vehicleCount || 0) >= 2);
  must("pairable vehicle count >=2", Number(pool.json?.pairableVehicleCount || 0) >= 2);

  step("run auto-split approve");
  const split = await reqJson("POST", `/api/shifts/${shiftId}/auto-split-approve`, {
    token: roomToken,
    body: {},
  });
  must("auto-split approve ok", split.ok);
  must("rootStatus=SPLIT", String(split.json?.rootStatus || "") === "SPLIT");
  must("childCount >= 2", Number(split.json?.childCount || 0) >= 2);
  must("childShiftIds length >= 2", Array.isArray(split.json?.childShiftIds) && split.json.childShiftIds.length >= 2);

  const rootShift = await getShift(companyToken, shiftId);
  must("root shift still queryable", !!rootShift);
  must("root shift marked SPLIT", String(rootShift?.status || "") === "SPLIT");

  step("create fresh SCHOOL tenant for parent invite flow");
  const { schoolToken } = await createSchoolTenant(superToken);
  const schoolShiftId = await createShift(schoolToken, roomId, "STEP06-SCHOOL", { direction: "INBOUND", pattern: "ONE_WAY" });
  const studentName = `Step06 Student ${Date.now()}`;
  const people = await reqJson("PUT", `/api/shifts/${schoolShiftId}/people?mode=REPLACE`, {
    token: schoolToken,
    body: {
      items: [
        { fullName: "Step06 Dummy 1", phone: "+90 555 010 10 11", lat: 41.0501, lng: 29.0101, geoManualOverride: true },
        { fullName: studentName, phone: "+90 555 010 10 12", lat: 41.0511, lng: 29.0111, geoManualOverride: true },
      ],
    },
  });
  must("school shift people upsert ok", people.ok && people.json?.ok === true);

  const student = await findStudent(schoolToken, studentName);
  must("student personel exists", !!student);
  must("student kind=STUDENT", String(student?.kind || "") === "STUDENT");
  const studentId = Number(student?.id || 0);
  must("studentId present", studentId > 0);

  step("create parent invite");
  const inviteEmail = `step06_parent_${Date.now()}@demo.com`;
  const inv = await reqJson("POST", "/api/school/parent-invites", {
    token: schoolToken,
    body: {
      childPersonelId: studentId,
      parentFullName: "Step06 Parent",
      email: inviteEmail,
      phone: "+90 555 010 10 13",
      expiresInDays: 7,
    },
  });
  must("create parent invite ok", inv.ok && inv.json?.ok === true);
  must("invite token present", !!inv.json?.token);
  const inviteToken = String(inv.json.token);
  const inviteId = Number(inv.json?.item?.id || 0);
  must("inviteId present", inviteId > 0);

  step("invite info endpoint should resolve token");
  const info = await reqJson("GET", `/api/auth/parent-invite/info?token=${encodeURIComponent(inviteToken)}`);
  must("invite info ok", info.ok && info.json?.ok === true);
  must("invite child matches", Number(info.json?.invite?.child?.id || 0) === studentId);

  step("accept invite self-serve");
  const accept = await reqJson("POST", "/api/auth/parent-invite/accept", {
    body: {
      token: inviteToken,
      email: inviteEmail,
      password: "demo123",
      fullName: "Step06 Parent Accepted",
      phone: "+90 555 010 10 14",
    },
  });
  must("invite accept ok", accept.ok && accept.json?.ok === true);

  const schoolInvites = await reqJson("GET", "/api/school/parent-invites?take=50", { token: schoolToken });
  must("school invite list ok", schoolInvites.ok && schoolInvites.json?.ok === true);
  const acceptedItem = itemsOf(schoolInvites).find((x) => Number(x?.id || 0) === inviteId);
  must("accepted invite visible in list", !!acceptedItem);
  must("accepted invite status=ACCEPTED", String(acceptedItem?.status || "") === "ACCEPTED");

  const parentToken = await loginFirst(inviteEmail, "demo123");
  must("accepted parent can login", !!parentToken);
  const me = await reqJson("GET", "/api/me", { token: parentToken });
  must("parent /api/me ok", me.ok);
  must("parent role=PARENT", String(me.json?.role || "") === "PARENT");

  console.log("\n=== STEP06 STABIL CHECK PASS ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});