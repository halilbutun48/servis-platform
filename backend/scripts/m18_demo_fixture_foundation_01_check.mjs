import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildRoomProfitabilityAndQuoteFloorPreview } from "../src/finance/roomProfitabilityAndQuoteFloor.js";
import { localMaintenanceModeDecision, startMonitors } from "../src/jobs/index.js";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const seedSource = fs.readFileSync(path.join(repoRoot, "backend/prisma/seed.js"), "utf8");
const fixtureSource = fs.readFileSync(path.join(repoRoot, "backend/prisma/m18DemoFixtureFoundation.js"), "utf8");
const jobsSource = fs.readFileSync(path.join(repoRoot, "backend/src/jobs/index.js"), "utf8");
const serverSource = fs.readFileSync(path.join(repoRoot, "backend/src/server.js"), "utf8");

assert.match(fixtureSource, /M18_DEMO_ROOM_FINANCE_FOUNDATION_V1/);
assert.match(seedSource, /ensureM18RoomFinanceFoundation/);
assert.match(fixtureSource, /M18_DEMO_OFFER_OPEN/);
assert.match(fixtureSource, /M18_DEMO_OFFER_COUNTERED/);
assert.match(fixtureSource, /M18_DEMO_FINANCE_MATCHED/);
assert.match(fixtureSource, /M18_DEMO_FINANCE_MISSING/);
assert.match(fixtureSource, /DEMO_OFFER_NOTE_TEXT/);
assert.match(fixtureSource, /company:\s*"Demo hizmet teklifi; inceleme için hazırlandı\."/);
assert.match(fixtureSource, /room:\s*"Demo karşı teklif; inceleme için hazırlandı\."/);
assert.match(fixtureSource, /noteCompany:\s*DEMO_OFFER_NOTE_TEXT\.company/);
assert.match(fixtureSource, /noteRoom:\s*amountRoom\s*==\s*null\s*\?\s*null\s*:\s*DEMO_OFFER_NOTE_TEXT\.room/);
assert.doesNotMatch(fixtureSource, /noteCompany:\s*`\$\{FOUNDATION_MARKER\}/);
assert.doesNotMatch(fixtureSource, /noteRoom:\s*amountRoom\s*==\s*null\s*\?\s*null\s*:\s*`\$\{FOUNDATION_MARKER\}/);
assert.match(fixtureSource, /upsert|findFirst/);
assert.match(fixtureSource, /prisma\.\$transaction/);
assert.match(fixtureSource, /prisma\.agreement\.update/);
assert.match(fixtureSource, /prisma\.shift\.update/);
assert.match(fixtureSource, /M18_FIXTURE_PREREQUISITE_MISSING/);
assert.match(fixtureSource, /M18_FIXTURE_TENANT_RELATION_INVALID/);
assert.match(fixtureSource, /externalSideEffects: false/);

const canonicalQuoteFloor = buildRoomProfitabilityAndQuoteFloorPreview({
  role: "ROOM",
  companyKind: "COMPANY",
  room: { id: 1, name: "ROOM 1", kind: "ROOM" },
  company: { id: 1, name: "COMPANY 1", kind: "COMPANY" },
  shift: { id: 212, roomId: 1, companyId: 1, passengerCount: 16 },
  quoteFloorInputs: {
    manualBaselineOperationalCostMinor: 6500000,
    targetContributionBps: 2000,
    riskReserveBps: 500,
  },
  costInputs: { passengerCount: 16 },
}).quoteFloor;
assert.equal(canonicalQuoteFloor.reserveBps, 2500);
assert.equal(canonicalQuoteFloor.quoteFloorMinor, 8531250);
assert.equal(canonicalQuoteFloor.quoteFloorPerPassengerMinor, 533203);
assert.match(fixtureSource, /DEMO_MONEY_MINOR/);
assert.match(fixtureSource, /baselineOperationalCost:\s*6500000/);
assert.match(fixtureSource, /quoteFloor:\s*8531250/);
assert.match(fixtureSource, /quoteFloorPerPassenger:\s*533203/);
assert.match(fixtureSource, /companyOffer:\s*12000000/);
assert.match(fixtureSource, /roomOffer:\s*10000000/);
assert.match(fixtureSource, /roomCounterOffer:\s*11000000/);
assert.match(fixtureSource, /matchedHakedis:\s*10000000/);
assert.match(fixtureSource, /matchedInvoice:\s*10000000/);
assert.match(fixtureSource, /lossHakedis:\s*10000000/);
assert.match(fixtureSource, /lossInvoice:\s*12000000/);
assert.doesNotMatch(fixtureSource, /quoteFloorMinor:\s*66625/);

assert.match(jobsSource, /localMaintenanceModeDecision/);
assert.match(jobsSource, /env\.NODE_ENV/);
assert.match(jobsSource, /DEMO_FIXTURE_ONLY/);
assert.match(jobsSource, /startMonitors[\s\S]*localMaintenanceModeDecision/);
assert.match(serverSource, /io\.close/);
assert.doesNotMatch(serverSource, /server\.close\(\(\) => process\.exit\(0\)\)/);

assert.deepEqual(localMaintenanceModeDecision({ NODE_ENV: "development" }), {
  requested: false,
  enabled: false,
  valid: true,
  reason: "NOT_REQUESTED",
});
assert.deepEqual(localMaintenanceModeDecision({
  NODE_ENV: "development",
  LOCAL_MAINTENANCE_MODE: "1",
  LOCAL_MAINTENANCE_SCOPE: "DEMO_FIXTURE_ONLY",
}).enabled, true);
assert.equal(localMaintenanceModeDecision({
  NODE_ENV: "production",
  LOCAL_MAINTENANCE_MODE: "1",
  LOCAL_MAINTENANCE_SCOPE: "DEMO_FIXTURE_ONLY",
}).valid, false);
assert.throws(() => {
  const previous = process.env.LOCAL_MAINTENANCE_MODE;
  const previousScope = process.env.LOCAL_MAINTENANCE_SCOPE;
  const previousNodeEnv = process.env.NODE_ENV;
  process.env.LOCAL_MAINTENANCE_MODE = "1";
  process.env.LOCAL_MAINTENANCE_SCOPE = "UNSAFE_ALL";
  process.env.NODE_ENV = "development";
  try {
    startMonitors(null);
  } finally {
    if (previous === undefined) delete process.env.LOCAL_MAINTENANCE_MODE;
    else process.env.LOCAL_MAINTENANCE_MODE = previous;
    if (previousScope === undefined) delete process.env.LOCAL_MAINTENANCE_SCOPE;
    else process.env.LOCAL_MAINTENANCE_SCOPE = previousScope;
    if (previousNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousNodeEnv;
  }
}, /LOCAL_MAINTENANCE_MODE_REJECTED/);

console.log("M18_DEMO_FIXTURE_FOUNDATION_01 GREEN");
