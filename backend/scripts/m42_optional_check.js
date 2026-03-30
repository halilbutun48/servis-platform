// M42 Optional Release — Check-in module
import {
  banner,
  step,
  must,
  reqJson,
  loginFirst,
  getRoomCompanyIds,
  ensureActiveShift,
  kvkkAccept,
} from "./_harness.js";

async function createIsolatedVehicle(roomToken, uniq) {
  const r = await reqJson("POST", "/api/vehicles", {
    token: roomToken,
    body: { plate: `M42-${uniq}`, capacity: 16, speedLimitKmh: 90 },
  });
  must("isolated vehicle create ok", r.ok);
  const vehicleId = Number(r.json?.id || r.json?.vehicle?.id || 0);
  must("isolated vehicleId present", vehicleId > 0);
  return vehicleId;
}

async function createIsolatedDriver(roomToken, uniq) {
  const r = await reqJson("POST", "/api/drivers", {
    token: roomToken,
    body: { fullName: `M42 Driver ${uniq}`, phone: `90538${uniq}11`, deviceInfo: "m42-check-device" },
  });
  must("isolated driver create ok", r.ok);
  const driverId = Number(r.json?.id || r.json?.driver?.id || 0);
  const driverCode = String(r.json?.issuedCredentials?.driverCode || "");
  const temporaryPin = String(r.json?.issuedCredentials?.temporaryPin || "");
  must("isolated driverId present", driverId > 0);
  must("isolated driver code issued", driverCode.length >= 6);
  must("isolated temporary pin issued", temporaryPin.length >= 4);
  return { driverId, driverCode, temporaryPin };
}

async function loginIsolatedDriver(driverCode, temporaryPin) {
  const loginResp = await reqJson("POST", "/api/auth/login", {
    body: { identifier: driverCode, password: temporaryPin },
  });
  must("isolated driver login ok", loginResp.ok && !!loginResp.json?.token);
  return String(loginResp.json?.token || "");
}

async function upsertHarnessPersonel(companyToken, shiftId) {
  const uniq = Date.now().toString().slice(-8);

  const putPeople = await reqJson("PUT", `/api/shifts/${shiftId}/people?mode=REPLACE`, {
    token: companyToken,
    body: {
      items: [
        {
          fullName: `M42 Check Personel ${uniq}`,
          phone: `90555${uniq}`,
          address: "M42 test address",
          lat: 41.015,
          lng: 28.979,
          geoManualOverride: true,
        },
      ],
    },
  });
  must("shift people upsert ok", putPeople.ok);

  const getPeople = await reqJson("GET", `/api/shifts/${shiftId}/people`, { token: companyToken });
  must("shift people get ok", getPeople.ok);

  const items = getPeople.json?.items ?? [];
  const personelId = Number(items?.[0]?.id || 0);
  must("shift personelId present", personelId > 0);
  return personelId;
}

async function main() {
  banner("M42 OPTIONAL CHECK: Check-in module (always-on, optional use)");

  step("login seeded users");
  const companyToken = await loginFirst("company");
  const roomToken = await loginFirst("room");

  const { companyId, roomId } = await getRoomCompanyIds(roomToken, companyToken);
  const uniq = String(Date.now()).slice(-6);
  const vehicleId = await createIsolatedVehicle(roomToken, uniq);
  const isolatedDriver = await createIsolatedDriver(roomToken, uniq);
  const driverId = isolatedDriver.driverId;
  const driverToken = await loginIsolatedDriver(isolatedDriver.driverCode, isolatedDriver.temporaryPin);
  must("isolated driver token present", driverToken.length > 20);

  step("create ACTIVE harness shift bound to isolated driver user");
  const harness = await ensureActiveShift({
    companyToken,
    roomToken,
    driverToken,
    companyId,
    roomId,
    vehicleId,
    driverId,
    tag: "M42CHK",
  });
  must("harness shiftId exists", !!harness.shiftId);

  step("upsert one personel onto harness shift");
  const personelId = await upsertHarnessPersonel(companyToken, harness.shiftId);

  step("accept driver KVKK consent");
  const consent = await kvkkAccept(driverToken, "LOCATION_CONSENT", "1");
  must("driver consent accepted", consent.ok);

  step("issue credential");
  const issue = await reqJson("POST", `/api/checkin/company/personels/${personelId}/credentials/issue`, {
    token: companyToken,
    body: { type: "QR" },
  });
  must("credential issue ok", issue.ok && !!issue.json?.token);
  const token = issue.json.token;

  step("first scan should create BOARD event");
  const scan1 = await reqJson("POST", "/api/checkin/scan", {
    token: driverToken,
    body: { shiftId: harness.shiftId, token, eventType: "BOARD", source: "QR", deviceId: "m42-check-device" },
  });
  must("scan1 ok", scan1.ok);
  must("scan1 not deduped", scan1.json?.deduped === false);
  must("BOARD count >=1", Number(scan1.json?.counts?.BOARD || 0) >= 1);

  step("second scan inside dedupe window should dedupe");
  const scan2 = await reqJson("POST", "/api/checkin/scan", {
    token: driverToken,
    body: { shiftId: harness.shiftId, token, eventType: "BOARD", source: "QR", deviceId: "m42-check-device" },
  });
  must("scan2 ok", scan2.ok);
  must("scan2 deduped", scan2.json?.deduped === true);

  step("events list should be visible to room/company");
  const events = await reqJson("GET", `/api/checkin/shifts/${harness.shiftId}/events`, { token: roomToken });
  must("events list ok", events.ok);
  must("events has at least one item", Array.isArray(events.json?.items) && events.json.items.length >= 1);

  step("revoke credential and ensure token becomes invalid");
  const revoke = await reqJson("POST", `/api/checkin/company/personels/${personelId}/credentials/revoke`, {
    token: companyToken,
    body: { type: "QR" },
  });
  must("revoke ok", revoke.ok);

  const scan3 = await reqJson("POST", "/api/checkin/scan", {
    token: driverToken,
    body: { shiftId: harness.shiftId, token, eventType: "ALIGHT", source: "QR", deviceId: "m42-check-device" },
  });
  must("revoked token rejected", !scan3.ok && scan3.status === 404);

  console.log("\n=== M42 OPTIONAL CHECK PASS ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
