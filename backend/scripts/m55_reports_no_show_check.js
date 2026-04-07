import { banner, assertOk, must, reqJson, loginFirst } from "./_harness.js";

async function cleanupM55TestPenalties(roomToken, driverId) {
  const penalties = await reqJson("GET", `/api/penalties/drivers/${driverId}`, { token: roomToken });
  if (!penalties.ok) return;
  const items = penalties.json?.items || [];
  for (const row of items) {
    const active = String(row?.status || "").toUpperCase() === "ACTIVE";
    const reason = String(row?.reason || "").trim();
    if (!active || reason !== "M55 test") continue;
    await reqJson("POST", `/api/penalties/${row.id}/cancel`, { token: roomToken, body: {} });
  }
}

async function main() {
  banner("M55 REPORTS + NO_SHOW CHECK");
  const roomToken = await loginFirst("room");
  const companyToken = await loginFirst("company");
  must("room login ok", !!roomToken);
  must("company login ok", !!companyToken);

  const drivers = await reqJson("GET", "/api/drivers", { token: roomToken });
  assertOk(drivers.ok, "drivers list ok");
  const shifts = await reqJson("GET", "/api/shifts?status=APPROVED", { token: roomToken });
  assertOk(shifts.ok, "shifts list ok");

  const driverId = Number(drivers.json?.[0]?.id || 0);
  const shiftId = Number((shifts.json?.items || shifts.json || [])[0]?.id || 0);
  must("driver present", driverId > 0);

  const penalties = await reqJson("GET", `/api/penalties/drivers/${driverId}`, { token: roomToken });
  assertOk(penalties.ok, "driver penalties list ok");

  const roomReports = await reqJson("GET", "/api/reports/drivers/summary", { token: roomToken });
  assertOk(roomReports.ok, "room driver report ok");

  const companyReports = await reqJson("GET", "/api/reports/shifts/summary", { token: companyToken });
  assertOk(companyReports.ok, "company shift report ok");

  const csv = await reqJson("GET", "/api/reports/drivers/export.csv", { token: roomToken });
  assertOk(csv.ok, "drivers export ok");

  if (shiftId) {
    const createPenalty = await reqJson("POST", "/api/penalties/no-show", { token: roomToken, body: { driverId, shiftId, durationDays: 1, reason: 'M55 test' } });
    assertOk(createPenalty.ok || createPenalty.status === 409, "no-show create or duplicate ok");
    await cleanupM55TestPenalties(roomToken, driverId);
  }

  console.log("\nOK M55 REPORTS + NO_SHOW CHECK PASS");
}

main().catch((e) => { console.error(e); process.exit(1); });
