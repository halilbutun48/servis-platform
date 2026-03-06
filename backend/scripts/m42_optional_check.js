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

async function pickSeededVehicleId(roomToken) {
  const vlist = await reqJson("GET", "/api/vehicles", { token: roomToken });
  must("vehicle list ok", vlist.ok);
  const items = vlist.json?.items ?? vlist.json ?? [];
  const vehicleId = Number(items?.[0]?.id || 0);
  must("vehicleId present", vehicleId > 0);
  return vehicleId;
}

async function getDriverIdFromMe(driverToken) {
  const me = await reqJson("GET", "/api/me", { token: driverToken });
  must("driver /api/me ok", me.ok);
  const driverId = Number(me.json?.driverId || 0);
  must("driverId present on /api/me", driverId > 0);
  return driverId;
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
  banner("M42 OPTIONAL CHECK: Check-in module (feature ON)");

  step("feature flag should be enabled");
  must("FEATURE_CHECKIN=1", String(process.env.FEATURE_CHECKIN || "0") === "1");

  step("login seeded users");
  const companyToken = await loginFirst("company");
  const roomToken = await loginFirst("room");
  const driverToken = await loginFirst("driver");

  const { companyId, roomId } = await getRoomCompanyIds(roomToken, companyToken);
  const vehicleId = await pickSeededVehicleId(roomToken);
  const driverId = await getDriverIdFromMe(driverToken);

  step("create ACTIVE harness shift bound to seeded driver user");
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
