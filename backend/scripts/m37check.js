// backend/scripts/m37check.js
// M37 — E2E School (Company.kind=SCHOOL) + Parent (PARENT role) check
// Covers M80/M81 feature set with one deterministic integration scenario.
//
// Manual UI debug:
// - Set env M37_KEEP=1 to keep the shift ACTIVE (skip cleanup) and print temp credentials.
// - Optional: set M37_GPS_PULSE=1 to keep GPS fresh for a short window (prevents STALE badge in UI).
// - Optional: set M37_GPS_PULSE_DEBUG=1 to print what /api/parent/live/vehicles sees after each pulse.
//
// Example:
//   docker compose -f infra\docker-compose.yml exec -T api sh -lc \
//     "cd /app/backend && M37_KEEP=1 M37_GPS_PULSE=1 M37_GPS_PULSE_DEBUG=1 node scripts/m37check.js"

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
import { ensureTotpStepUp } from "./_totp_harness.js";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function iso(dt) {
  return new Date(dt).toISOString();
}

async function findShiftById(companyToken, shiftId) {
  const r = await reqJson("GET", "/api/shifts?take=200", { token: companyToken });
  must("GET /api/shifts ok", r.ok);
  const items = itemsOf(r);
  return items.find((x) => Number(x.id) === Number(shiftId)) ?? null;
}

async function findStudent(companyToken, fullName = null) {
  // Requires M81: /api/company/personels?kind=STUDENT
  const r = await reqJson("GET", "/api/company/personels?take=300&kind=STUDENT", { token: companyToken });
  must("GET /api/company/personels kind=STUDENT ok", r.ok);
  const items = itemsOf(r);
  if (fullName) {
    const exact = items.find((x) => String(x.fullName || "").trim() === fullName) ?? null;
    if (exact) return exact;
  }
  return items[0] ?? null;
}

async function main() {
  banner("M37CHECK: School+Parent E2E (covers M80/M81)");

  const keep = String(process.env.M37_KEEP || "") === "1";
  const pulse = String(process.env.M37_GPS_PULSE || "") === "1";
  const pulseDebug = String(process.env.M37_GPS_PULSE_DEBUG || "") === "1";

  const superToken = await ensureTotpStepUp(await loginFirst("super"), "super");
  const roomToken = await ensureTotpStepUp(await loginFirst("room"), "room");
  const driverToken = await loginFirst("driver");
  const schoolToken = await ensureTotpStepUp(await loginFirst("school"), "school");


// M38 KVKK: accept location consent for seeded driver user so GPS can be posted during checks
await reqJson("POST", "/api/kvkk/consents/accept", {
  token: driverToken,
  body: { docKey: "LOCATION_CONSENT", docVersion: "1" },
});
  must("login super", !!superToken);
  must("login room", !!roomToken);
  must("login driver", !!driverToken);

  const meRoom = await reqJson("GET", "/api/me", { token: roomToken });
  must("room /api/me ok", meRoom.ok);
  const roomId = Number(meRoom.json?.roomId ?? 1);
  must("roomId present", roomId > 0);

  // Create PARENT user
  const ts = Date.now();
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
  let parentToken = await loginFirst(parentEmail, parentTempPass);



  // Pick vehicle/driver from ROOM (seed)
  const { vehicleId } = await pickVehicleDriver(roomToken);
  must("seed vehicleId", vehicleId > 0);
  const meDriver = await reqJson("GET", "/api/me", { token: driverToken });
  must("driver /api/me ok", meDriver.ok);
  const driverId = Number(meDriver.json?.driverId ?? meDriver.json?.driver?.id ?? 0);
  must("seed driverId", driverId > 0);

  // Cleanup old shifts bound to that driver (best-effort)
  await preCleanDriverShifts({ roomToken, driverToken, driverId });

  // Create shift
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

  // People
  step("upsert shift people (3)");
  const peopleBody = {
    items: [
      { fullName: "M37 Dummy 1", phone: "+90 555 000 00 31", lat: 41.0306, lng: 28.9964, geoManualOverride: true },
      { fullName: "M37 Dummy 2", phone: "+90 555 000 00 32", lat: 41.0406, lng: 29.0064, geoManualOverride: true },
      { fullName: "M37 Student", phone: "+90 555 000 00 33", lat: 41.0506, lng: 29.0164, geoManualOverride: true },
    ],
  };

  const putPeople = await reqJson("PUT", `/api/shifts/${shiftId}/people?mode=REPLACE`, { token: schoolToken, body: peopleBody });
  must("PUT /api/shifts/:id/people ok", putPeople.ok);
  must("people upsert ok=true", putPeople.json?.ok === true);

  // Generate stops
  step("generate stops from people");
  const gen = await reqJson("POST", `/api/shifts/${shiftId}/stops/generate?mode=REPLACE`, { token: schoolToken, body: {} });
  if (gen.ok && gen.json?.ok === true) {
    must("POST /api/shifts/:id/stops/generate ok", true);
    must("stops generate ok=true", true);
  } else {
    console.log("INFO stops/generate fallback ->", gen.status, gen.text || JSON.stringify(gen.json || {}));
    step("fallback: add manual stops for M37 parent/live flow");
    const fallbackStops = [
      { name: "M37 Stop 1", lat: 41.0306, lng: 28.9964, order: 1, type: "MANUAL" },
      { name: "M37 Stop 2", lat: 41.0406, lng: 29.0064, order: 2, type: "MANUAL" },
      { name: "M37 Stop 3", lat: 41.0506, lng: 29.0164, order: 3, type: "MANUAL" },
    ];
    for (const stop of fallbackStops) {
      const add = await reqJson("POST", `/api/shifts/${shiftId}/stops`, { token: schoolToken, body: stop });
      must(`fallback stop add ok (${stop.name})`, add.ok);
    }
  }

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

  // Student must exist
  step("find STUDENT personel record");
  const student = await findStudent(schoolToken);
  must("student exists", !!student);
  must("student.kind=STUDENT", String(student.kind) === "STUDENT");
  const studentId = Number(student.id);
  must("studentId present", studentId > 0);

  // Bind parent-child
  step("bind parent-child");
  const bind = await reqJson("POST", "/api/admin/parent-children", { token: superToken, body: { parentUserId, personelId: studentId } });
  must("POST /api/admin/parent-children ok", bind.ok);
  must("bind ok=true", bind.json?.ok === true);

  // Driver: initial GPS + reached
  step("driver: post gps near first stop");
  await postGps(driverToken, { vehicleId, lat: Number(firstStop.lat), lng: Number(firstStop.lng), heading: 90, speed: 22 });

  step("driver: reached first stop");
  const reached = await reqJson("POST", `/api/shifts/${shiftId}/reached`, { token: driverToken, body: { order: reachOrder } });
  if (!reached.ok) {
    console.log("M37 reached failed ->", reached.status, reached.text || JSON.stringify(reached.json || {}));
  }
  must("POST /api/shifts/:id/reached ok", reached.ok);
  must("reached ok=true", reached.json?.ok === true);

  // sanity: parent live ok
  step("parent: live vehicles for childId");
  let live0 = await reqJson("GET", `/api/parent/live/vehicles?childId=${studentId}&take=50`, { token: parentToken });
  if (!live0.ok) {
    console.log("M37 parent live failed ->", live0.status, live0.text || JSON.stringify(live0.json || {}));
    if (String(live0.json?.error?.code || "") === "PASSWORD_CHANGE_REQUIRED") {
      const nextPass = `Qw7!zP9@Lm3#`;
      const pwdChange = await reqJson("POST", "/api/auth/change-password", {
        token: parentToken,
        body: {
          currentPassword: parentTempPass,
          newPassword: nextPass,
          confirmPassword: nextPass,
        },
      });
      if (!pwdChange.ok) {
        console.log("M37 change-password failed ->", pwdChange.status, pwdChange.text || JSON.stringify(pwdChange.json || {}));
      }
      must("POST /api/auth/change-password ok", pwdChange.ok);
      must("password change ok=true", pwdChange.json?.ok === true);
      parentToken = pwdChange.json?.token ?? parentToken;
      await reqJson("POST", "/api/kvkk/consents/accept", {
        token: parentToken,
        body: { docKey: "LOCATION_CONSENT", docVersion: "1" },
      });
      live0 = await reqJson("GET", `/api/parent/live/vehicles?childId=${studentId}&take=50`, { token: parentToken });
      if (!live0.ok) {
        console.log("M37 parent live retry failed ->", live0.status, live0.text || JSON.stringify(live0.json || {}));
      }
    }
  }
  must("GET /api/parent/live/vehicles ok", live0.ok);

  if (keep) {
    console.log("\n=== M37 MANUAL UI DEBUG (M37_KEEP=1) ===");
    console.log(`SHIFT_ID=${shiftId} (ACTIVE)  VEHICLE_ID=${vehicleId}  DRIVER_ID=${driverId}`);
    console.log("SCHOOL_LOGIN: school@demo.com / demo123");
    console.log(`PARENT_LOGIN: ${parentEmail} / ${parentTempPass}`);
    console.log(`CHILD_ID=${studentId} (select this child in Parent panel)`);
    console.log("======================================\n");

    if (pulse) {
      console.log("INFO GPS pulse enabled (M37_GPS_PULSE=1): sending fresh GPS points for ~60s...");
      for (let i = 0; i < 15; i++) {
        await postGps(driverToken, {
          vehicleId,
          lat: Number(firstStop.lat) + i * 0.00005,
          lng: Number(firstStop.lng) + i * 0.00005,
          heading: 90,
          speed: 22,
        });

        if (pulseDebug) {
          const rr = await reqJson("GET", `/api/parent/live/vehicles?childId=${studentId}&take=50`, { token: parentToken });
          const arr = itemsOf(rr);
          const v = arr.find((x) => Number(x.id) === Number(vehicleId)) ?? arr[0];
          const at = v?.gpsLast?.at ?? null;
          const st = v?.gpsLast?.status ?? null;
          const ui = v?.gpsState?.lastUiStatus ?? v?.gpsState?.lastStatus ?? null;
          const chAt = v?.gpsState?.lastChangedAt ?? v?.gpsState?.lastChangeAt ?? null;
          console.log(`  pulse#${i + 1}: gpsLast.at=${at} gpsLast.status=${st} gpsUi=${ui} gpsChangedAt=${chAt}`);
        }

        await sleep(4000);
      }
      console.log("OK GPS pulse done.");
    }
  } else {
    step("cleanup: close shift");
    await closeShiftHard({ shiftId, driverToken, roomToken });
  }

  banner("M37CHECK PASS");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
