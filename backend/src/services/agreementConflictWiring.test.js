import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const conflictSource = fs.readFileSync(path.join(here, "agreementConflict.js"), "utf8");
const reservationSource = fs.readFileSync(path.join(here, "reservationConflict.js"), "utf8");
const driverSource = fs.readFileSync(path.join(here, "../routes/driver.js"), "utf8");

test("agreement-generated driver shifts exclude their source agreement from start conflicts", () => {
  assert.match(conflictSource, /export async function findAgreementConflictForRange\(\{ vehicleId, driverId, startAt, endAt, excludeAgreementId \}\)/);
  assert.match(conflictSource, /id:\s*\{ not: Number\(excludeAgreementId\) \}/);
  assert.match(reservationSource, /excludeAgreementId/);
  assert.match(reservationSource, /findAgreementConflictForRange\(\{ driverId, startAt, endAt, excludeAgreementId \}\)/);
  assert.match(reservationSource, /findAgreementConflictForRange\(\{ vehicleId, startAt, endAt, excludeAgreementId \}\)/);
  assert.match(driverSource, /agreementId:\s*true/);
  assert.match(driverSource, /excludeAgreementId:\s*shift\.agreementId/);
});
