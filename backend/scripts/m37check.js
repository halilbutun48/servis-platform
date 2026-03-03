// backend/scripts/m37check.js
// M37 — E2E School (Company.kind=SCHOOL) + Parent (PARENT role) check
// Covers M80/M81 feature set with one deterministic integration scenario.

import {
  banner,
  step,
  must,
  itemsOf,
  reqJson,
  loginFirst,
  pickVehicleDriver,
  preCleanDriverShifts,
  postGps,
  closeShiftHard,
} from "./_harness.js";

async function loginWithTemp(email, password) {
  const r = await reqJson("POST", "/api/auth/login", { body: { email, password } });
  must(`temp login token (${email})`, !!r.json?.token);
  return r.json.token;
}

function iso(dt) {
  return new Date(dt).toISOString();
}

function pickFirstRegionId(regionsResp) {
  const items = itemsOf(regionsResp);
  const id = items?.[0]?.id;
  return id ? Number(id) : null;
}

async function findShiftById(companyToken, shiftId) {
  const r = await reqJson("GET", "/api/shifts?take=200", { token: companyToken });
  must("GET /api/shifts ok", r.ok);
  const items = itemsOf(r);
  return items.find((x) => Number(x.id) === Number(shiftId)) ?? null;
}

async function findStudent(companyToken, fullName) {
  // Requires M81: /api/company/personels?kind=STUDENT
  const r = await reqJson("GET", "/api/company/personels?take=300&kind=STUDENT", { token: companyToken });
  must("GET /api/company/personels kind=STUDENT ok", r.ok);
  const items = itemsOf(r);
  return items.find((x) => String(x.fullName || "").trim() === fullName) ?? null;
}

async function main() {
  banner("M37CHECK: School+Parent E2E (covers M80/M81)");

  const superToken = await loginFirst("super");
  const roomToken = await loginFirst("room");
  const driverToken = await loginFirst("driver");
  must("login super", !!superToken);
  must("login room", !!roomToken);
  must("login driver", !!driverToken);

  const meRoom = await reqJson("GET", "/api/me", { token: roomToken });
  must("room /api/me ok", meRoom.ok);
  const roomId = Number(meRoom.json?.roomId ?? 1);
  must("roomId present", roomId > 0);

  // Region (optional)
  const regions = await reqJson("GET", "/api/admin/regions", { token: superToken });
  const regionId = regions.ok ? pickFirstRegionId(regions) : null;

  // Create a SCHOOL company
  const ts = Date.now();
  const schoolName = `M37 Demo School ${ts}`;
  step("create SCHOOL company");
  const createSchool = await reqJson("POST", "/api/companies", {
    token: superToken,
    body: { name: schoolName, kind: "SCHOOL", ...(regionId ? { regionId } : {}) },
  });
  must("POST /api/companies ok", createSchool.ok);
  const schoolCompanyId = Number(createSchool.json?.id ?? createSchool.json?.company?.id);
  must("schoolCompanyId present", schoolCompanyId > 0);

  // Create SCHOOL user (role COMPANY)
  step("create SCHOOL company user");
  const schoolEmail = `m37_school_${ts}@demo.com`;
  const mkSchoolUser = await reqJson("POST", "/api/admin/users", {
    token: superToken,
    body: { email: schoolEmail, role: "COMPANY", companyId: schoolCompanyId, fullName: "M37 School User" },
  });
  must("POST /api/admin/users (school) ok", mkSchoolUser.ok);
  const schoolTempPass = mkSchoolUser.json?.tempPassword;
  must("school tempPassword present", !!schoolTempPass);
  const schoolToken = await loginWithTemp(schoolEmail, schoolTempPass);

  // Create PARENT user (no scopes)
  step("create PARENT user");
  const parentEmail = `m37_parent_${ts}@demo.com`;
  const mkParentUser = await reqJson("POST", "/api/admin/users", {
    token: superToken,
    body: { email: parentEmail, role: "PARENT", fullName: "M37 Parent", phone: "+90 555 000 00 37" },
  });
  must("POST /api/admin/users (parent) ok", mkParentUser.ok);
  const parentUserId = Number(mkParentUser.json?.user?.id);
  const parentTempPass = mkParentUser.json?.tempPassword;
  must("parent user payload present", parentUserId > 0 && !!parentTempPass);
  const parentToken = await loginWithTemp(parentEmail, parentTempPass);

  // Pick vehicle/driver from ROOM (seed)
  const { vehicleId, driverId } = await pickVehicleDriver(roomToken);
  must("seed vehicleId", vehicleId > 0);
  must("seed driverId", driverId > 0);

  // Cleanup old shifts bound to that driver (best-effort)
  await preCleanDriverShifts({ roomToken, driverToken, driverId });

  // Create shift (REQUESTED), then add people, generate stops, approve+start
  const startAt = iso(Date.now() - 2 * 60_000);
  const endAt = iso(Date.now() + 70 * 60_000);

  step("create shift");
  const createShift = await reqJson("POST", "/api/shifts", {
    token: schoolToken,
    body: { roomId, startAt, endAt, direction: "INBOUND", pattern: "ONE_WAY" },
  });
  must("POST /api/shifts ok", createShift.ok);

  const shiftId = Number(createShift.json?.id ?? createShift.json?.shift?.id ?? createShift.json?.shiftId);
  must("shiftId present", Number.isFinite(shiftId) && shiftId > 0);

  // Insert 3 people far apart -> 3 clusters
  const studentName = "M37 Student";
  step("upsert shift people (3)");
  const peopleBody = {
    items: [
      { fullName: "M37 Dummy 1", phone: "+90 555 000 00 31", lat: 41.0306, lng: 28.9964, geoManualOverride: true },
      { fullName: "M37 Dummy 2", phone: "+90 555 000 00 32", lat: 41.0406, lng: 29.0064, geoManualOverride: true },
      { fullName: studentName, phone: "+90 555 000 00 33", lat: 41.0506, lng: 29.0164, geoManualOverride: true },
    ],
  };

  const putPeople = await reqJson("PUT", `/api/shifts/${shiftId}/people?mode=REPLACE`, {
    token: schoolToken,
    body: peopleBody,
  });
  must("PUT /api/shifts/:id/people ok", putPeople.ok);
  must("people upsert ok=true", putPeople.json?.ok === true);

  // Generate stops + assignments (default maxWalkM=250)
  step("generate stops from people");
  const gen = await reqJson("POST", `/api/shifts/${shiftId}/stops/generate?mode=REPLACE`, {
    token: schoolToken,
    body: {},
  });
  must("POST /api/shifts/:id/stops/generate ok", gen.ok);
  must("stops generate ok=true", gen.json?.ok === true);

  const shiftAfterGen = await findShiftById(schoolToken, shiftId);
  must("shift present after generate", !!shiftAfterGen);

  const stops = shiftAfterGen.stops ?? [];
  must("stopCount >= 3", stops.length >= 3);

  const minOrder = Math.min(...stops.map((s) => Number(s.order)));
  must("stop.order starts at 1 (no 0-based)", minOrder >= 1);

  const firstStop = stops.slice().sort((a, b) => Number(a.order) - Number(b.order))[0];
  const reachOrder = Number(firstStop.order);
  must("firstStop.order >= 1", reachOrder >= 1);

  // Approve + start
  step("approve shift (bind vehicle+driver)");
  const approve = await reqJson("PUT", `/api/shifts/${shiftId}/approve`, { token: roomToken, body: { vehicleId, driverId } });
  must("PUT /api/shifts/:id/approve ok", approve.ok);
  must("shift status APPROVED", String(approve.json?.status) === "APPROVED");

  step("start shift (ACTIVE)");
  const start = await reqJson("POST", `/api/shifts/${shiftId}/start`, { token: roomToken, body: {} });
  must("POST /api/shifts/:id/start ok", start.ok);
  must("shift status ACTIVE", String(start.json?.status) === "ACTIVE");

  // Student must exist as kind=STUDENT (School mode)
  step("find STUDENT personel record");
  const student = await findStudent(schoolToken, studentName);
  must("student exists", !!student);
  must("student.kind=STUDENT", String(student.kind) === "STUDENT");

  const studentId = Number(student.id);
  must("studentId present", studentId > 0);

  // Bind Parent ↔ Student
  step("bind parent-child");
  const bind = await reqJson("POST", "/api/admin/parent-children", { token: superToken, body: { parentUserId, personelId: studentId } });
  must("POST /api/admin/parent-children ok", bind.ok);
  must("bind ok=true", bind.json?.ok === true);

  // Parent: children list
  step("parent: list children");
  const pc = await reqJson("GET", "/api/parent/children", { token: parentToken });
  must("GET /api/parent/children ok", pc.ok);
  const kids = itemsOf(pc);
  must("children list contains student", kids.some((k) => Number(k.id) === studentId));
  const kid = kids.find((k) => Number(k.id) === studentId) || null;
  must("kid.company.kind=SCHOOL", String(kid?.company?.kind) === "SCHOOL");

  // Driver: GPS near first stop
  step("driver: post gps near first stop");
  await postGps(driverToken, { vehicleId, lat: Number(firstStop.lat), lng: Number(firstStop.lng), heading: 90 });

  // Driver: reached first stop
  step("driver: reached first stop");
  const reached = await reqJson("POST", `/api/shifts/${shiftId}/reached`, { token: driverToken, body: { order: reachOrder } });
  must("POST /api/shifts/:id/reached ok", reached.ok);
  must("reached ok=true", reached.json?.ok === true);

  // Parent: live vehicles for childId
  step("parent: live vehicles for childId");
  const live = await reqJson("GET", `/api/parent/live/vehicles?childId=${studentId}&take=50`, { token: parentToken });
  must("GET /api/parent/live/vehicles ok", live.ok);
  const liveItems = itemsOf(live);
  must("live vehicles not empty", liveItems.length >= 1);

  const v = liveItems.find((x) => Number(x.id) === vehicleId) ?? liveItems[0];
  must("live includes vehicleId", Number(v?.id) === vehicleId);
  must("live.childId matches", Number(v?.childId) === studentId);

  must("etaToChildMin is number", typeof v?.etaToChildMin === "number");
  must("remainingStopsTotal is number", typeof v?.remainingStopsTotal === "number");
  must("nextStop.order is number", typeof v?.nextStop?.order === "number");

  // Parent: notifications include stop-progress type
  step("parent: notifications include stop progress type");
  const notifs = await reqJson("GET", "/api/notifications/my?take=50", { token: parentToken });
  must("GET /api/notifications/my ok", notifs.ok);
  const notifItems = itemsOf(notifs);
  const okTypes = new Set(["ETA_2_STOPS", "ETA_1_STOP", "STOP_REACHED_PARENT"]);
  const has = notifItems.some((n) => okTypes.has(String(n?.type)));
  must(`has one of: ${[...okTypes].join(", ")}`, has);

  // Cleanup
  step("cleanup: close shift");
  await closeShiftHard({ shiftId, driverToken, roomToken });

  banner("M37CHECK PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
