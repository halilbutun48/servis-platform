// backend/scripts/m38check.js
// M38 — KVKK Consent gate + prod guards
// Fix: GPS endpoint also requires driver to be assigned to vehicle in an APPROVED/ACTIVE shift.
// This check creates an ACTIVE shift first, then validates:
// - without consent: parent live + driver gps -> 403 KVKK_CONSENT_REQUIRED
// - after consent: parent live -> not 403, driver gps -> 200

import {
  banner,
  step,
  must,
  sleep,
  reqJson,
  loginFirst,
  pickVehicleDriver,
  getRoomCompanyIds,
  preCleanDriverShifts,
  ensureActiveShift,
  closeShiftHard,
} from "./_harness.js";
import { ensureTotpStepUp } from "./_totp_harness.js";

const DOC_KEY = "LOCATION_CONSENT";
const DOC_VERSION = "1";

async function kvkkAccept(token) {
  // accept endpoint (V1)
  const r = await reqJson("POST", "/api/kvkk/consents/accept", {
    token,
    body: { docKey: DOC_KEY, docVersion: DOC_VERSION },
  });
  must("consent accept ok", r.ok);
  return r;
}

async function kvkkRevoke(token) {
  const r = await reqJson("POST", "/api/kvkk/consents/revoke", {
    token,
    body: { docKey: DOC_KEY },
  });
  must("consent revoke ok (or already revoked)", r.ok);
  return r;
}

function assertKvkk403(r, label) {
  must(`${label} 403`, r.status === 403);
  // Prefer KVKK error, not generic Forbidden
  const err = r.json?.error;
  must(`${label} is KVKK_CONSENT_REQUIRED`, err === "KVKK_CONSENT_REQUIRED");
}

async function main() {
  banner("M38CHECK: KVKK Consent gate + prod guards");

  const superToken = await ensureTotpStepUp(await loginFirst("super"), "super");
  const roomToken = await ensureTotpStepUp(await loginFirst("room"), "room");
  const companyToken = await ensureTotpStepUp(await loginFirst("company"), "company");
  const driverToken = await loginFirst("driver");
  const parentToken = await loginFirst("parent");

  step("kvkk required endpoint exists");
  const reqd = await reqJson("GET", "/api/kvkk/required", { token: parentToken });
  must("kvkk required ok", reqd.ok);

  step("prepare ACTIVE shift for gps assignment requirement");
  const { roomId, companyId } = await getRoomCompanyIds(roomToken, companyToken);
  const { vehicleId, driverId } = await pickVehicleDriver(roomToken);

  await preCleanDriverShifts({ roomToken, driverToken, driverId });

  const active = await ensureActiveShift({
    companyToken,
    roomToken,
    driverToken,
    companyId,
    roomId,
    vehicleId,
    driverId,
    tag: "M38",
  });
  must("active shiftId present", !!active.shiftId);

  step("ensure no consent (revoke)");
  await kvkkRevoke(parentToken);
  await kvkkRevoke(driverToken);

  step("parent live must be blocked (403) without consent");
  const pLive0 = await reqJson("GET", "/api/parent/live/vehicles?take=1", { token: parentToken });
  assertKvkk403(pLive0, "parent live");

  step("driver gps must be blocked (403) without consent");
  const g0 = await reqJson("POST", "/api/gps", {
    token: driverToken,
    body: { vehicleId, lat: 41.031, lng: 28.9968, speed: 0 },
  });
  assertKvkk403(g0, "gps");

  step("accept consent for parent+driver");
  await kvkkAccept(parentToken);
  await kvkkAccept(driverToken);

  // throttle middleware is 1200ms; also avoids accidental 429
  await sleep(1300);

  step("parent live allowed after consent (not 403)");
  const pLive1 = await reqJson("GET", "/api/parent/live/vehicles?take=1", { token: parentToken });
  must("parent live not 403", pLive1.status !== 403);

  await sleep(1300);

  step("driver gps allowed after consent (200)");
  const g1 = await reqJson("POST", "/api/gps", {
    token: driverToken,
    body: { vehicleId, lat: 41.0313, lng: 28.9971, speed: 12 },
  });
  if (!g1.ok) {
    console.error("GPS after consent failed:", g1.status, g1.text);
  }
  must("gps ok", g1.ok);

  // cleanup
  await closeShiftHard({ shiftId: active.shiftId, driverToken, roomToken });

  // Prod guard (CORS)
  const nodeEnv = process.env.NODE_ENV || "";
  const cors = process.env.CORS_ORIGIN || "";
  if (String(nodeEnv).toLowerCase() === "production") {
    must(`CORS_ORIGIN must not be '*' in production (CORS_ORIGIN=${cors})`, cors.trim() !== "*");
  }

  console.log("\n=== M38CHECK PASS ===");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
