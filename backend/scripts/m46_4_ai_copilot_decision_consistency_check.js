import { banner, step, must, login, reqJson, itemsOf } from "./_harness.js";

function firstId(resp) {
  const items = itemsOf(resp);
  return Number(items?.[0]?.id || 0) || null;
}

async function main() {
  banner("M46.4 AI COPILOT DECISION CONSISTENCY + ACTION PLAN CHECK");

  step("login demo users");
  const roomToken = await login("room@demo.com", "demo123");
  const companyToken = await login("company@demo.com", "demo123");
  const superToken = await login("superadmin@demo.com", "demo123");
  must("room login ok", !!roomToken);
  must("company login ok", !!companyToken);
  must("super admin login ok", !!superToken);

  step("discover scoped ids");
  const roomShifts = await reqJson("GET", "/api/shifts?includeOffered=1&take=5", { token: roomToken });
  const roomShiftId = firstId(roomShifts);
  must("room shift id found", !!roomShiftId);
  const companyShifts = await reqJson("GET", "/api/shifts?take=5", { token: companyToken });
  const companyShiftId = firstId(companyShifts);
  must("company shift id found", !!companyShiftId);
  const roomVehicles = await reqJson("GET", "/api/vehicles", { token: roomToken });
  const vehicleId = firstId(roomVehicles);
  must("room vehicle id found", !!vehicleId);

  step("shift summary returns decision consistency fields");
  const summary = await reqJson("POST", "/api/ai/copilot", {
    token: roomToken,
    body: { intent: "SHIFT_SUMMARY", entityType: "shift", entityId: roomShiftId },
  });
  must("shift summary ok", summary.ok && summary.json?.intent === "SHIFT_SUMMARY");
  must("copilot version upgraded", typeof summary.json?.copilotVersion === "string" && summary.json.copilotVersion.length > 0);
  must("overall status visible", typeof summary.json?.overallStatus === "string" && summary.json.overallStatus.length > 0);
  must("actionability visible", typeof summary.json?.actionability === "string" && summary.json.actionability.length > 0);
  must("data freshness visible", typeof summary.json?.dataFreshness === "string" && summary.json.dataFreshness.length > 0);
  must("coverage visible", typeof summary.json?.coverage === "string" && summary.json.coverage.length > 0);
  must("recommended actions visible", Array.isArray(summary.json?.recommendedActions) && summary.json.recommendedActions.length > 0);
  must("consistency checks visible", Array.isArray(summary.json?.consistencyChecks) && summary.json.consistencyChecks.length > 0);
  must("missing data visible", Array.isArray(summary.json?.missingData));
  must("blockers visible", Array.isArray(summary.json?.blockers));

  step("offer decision help exposes action plan");
  const offerHelp = await reqJson("POST", "/api/ai/copilot", {
    token: companyToken,
    body: { intent: "OFFER_DECISION_HELP", entityType: "shift", entityId: companyShiftId },
  });
  must("offer help ok", offerHelp.ok && offerHelp.json?.intent === "OFFER_DECISION_HELP");
  must("offer actions visible", Array.isArray(offerHelp.json?.recommendedActions) && offerHelp.json.recommendedActions.length > 0);
  must("offer consistency checks visible", Array.isArray(offerHelp.json?.consistencyChecks));

  step("vehicle diagnosis exposes freshness and actionability");
  const gpsDiag = await reqJson("POST", "/api/ai/copilot", {
    token: roomToken,
    body: { intent: "GPS_SIGNAL_DIAGNOSIS", entityType: "vehicle", entityId: vehicleId },
  });
  must("gps diagnosis ok", gpsDiag.ok && gpsDiag.json?.intent === "GPS_SIGNAL_DIAGNOSIS");
  must("gps freshness visible", typeof gpsDiag.json?.dataFreshness === "string" && gpsDiag.json.dataFreshness.length > 0);
  must("gps blockers visible", Array.isArray(gpsDiag.json?.blockers));
  must("gps actions visible", Array.isArray(gpsDiag.json?.recommendedActions) && gpsDiag.json.recommendedActions.length > 0);

  step("ops note still keeps note draft");
  const ops = await reqJson("POST", "/api/ai/copilot", {
    token: superToken,
    body: { intent: "OPS_NOTE_DRAFT", entityType: "shift", entityId: roomShiftId },
  });
  must("ops note ok", ops.ok && typeof ops.json?.noteDraft === "string" && ops.json.noteDraft.length > 0);
  must("ops overall status visible", typeof ops.json?.overallStatus === "string");

  banner("M46.4 AI COPILOT DECISION CONSISTENCY + ACTION PLAN CHECK PASS");
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});
