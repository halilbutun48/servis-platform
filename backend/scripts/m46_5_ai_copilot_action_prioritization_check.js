import { banner, step, must, login, reqJson, itemsOf } from "./_harness.js";

function firstId(resp) {
  const items = itemsOf(resp);
  return Number(items?.[0]?.id || 0) || null;
}

async function main() {
  banner("M46.5 AI COPILOT ACTION PRIORITIZATION + EVIDENCE CALIBRATION CHECK");

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

  step("shift summary returns prioritized action plan");
  const summary = await reqJson("POST", "/api/ai/copilot", {
    token: roomToken,
    body: { intent: "SHIFT_SUMMARY", entityType: "shift", entityId: roomShiftId },
  });
  must("shift summary ok", summary.ok && summary.json?.intent === "SHIFT_SUMMARY");
  must("copilot version upgraded", summary.json?.copilotVersion === "M46.5");
  must("recommended first action visible", !!summary.json?.recommendedFirstAction?.title);
  must("action plan summary visible", typeof summary.json?.actionPlanSummary === "string" && summary.json.actionPlanSummary.length > 20);
  must("calibration notes visible", Array.isArray(summary.json?.calibrationNotes) && summary.json.calibrationNotes.length > 0);
  must("priority score visible", typeof summary.json?.recommendedActions?.[0]?.priorityScore === "number");
  must("whyNow visible", typeof summary.json?.recommendedActions?.[0]?.whyNow === "string" && summary.json.recommendedActions[0].whyNow.length > 0);
  must("evidence links visible", Array.isArray(summary.json?.recommendedActions?.[0]?.evidenceLinks));
  must("reference links visible", Array.isArray(summary.json?.recommendedActions?.[0]?.referenceLinks));
  must("dependsOn visible", Array.isArray(summary.json?.recommendedActions?.[0]?.dependsOn));
  must("blockedBy visible", Array.isArray(summary.json?.recommendedActions?.[0]?.blockedBy));

  step("offer decision help keeps prioritization");
  const offerHelp = await reqJson("POST", "/api/ai/copilot", {
    token: companyToken,
    body: { intent: "OFFER_DECISION_HELP", entityType: "shift", entityId: companyShiftId },
  });
  must("offer help ok", offerHelp.ok && offerHelp.json?.intent === "OFFER_DECISION_HELP");
  must("offer first action visible", !!offerHelp.json?.recommendedFirstAction?.title);
  must("offer calibration notes visible", Array.isArray(offerHelp.json?.calibrationNotes));
  must("offer priority score visible", typeof offerHelp.json?.recommendedActions?.[0]?.priorityScore === "number");

  step("vehicle diagnosis keeps calibration fields");
  const gpsDiag = await reqJson("POST", "/api/ai/copilot", {
    token: roomToken,
    body: { intent: "GPS_SIGNAL_DIAGNOSIS", entityType: "vehicle", entityId: vehicleId },
  });
  must("gps diagnosis ok", gpsDiag.ok && gpsDiag.json?.intent === "GPS_SIGNAL_DIAGNOSIS");
  must("gps first action visible", !!gpsDiag.json?.recommendedFirstAction?.title);
  must("gps calibration notes visible", Array.isArray(gpsDiag.json?.calibrationNotes));
  must("gps action evidence links visible", Array.isArray(gpsDiag.json?.recommendedActions?.[0]?.evidenceLinks));

  step("ops note still keeps note draft");
  const ops = await reqJson("POST", "/api/ai/copilot", {
    token: superToken,
    body: { intent: "OPS_NOTE_DRAFT", entityType: "shift", entityId: roomShiftId },
  });
  must("ops note ok", ops.ok && typeof ops.json?.noteDraft === "string" && ops.json.noteDraft.length > 0);
  must("ops first action visible", !!ops.json?.recommendedFirstAction?.title);

  banner("M46.5 AI COPILOT ACTION PRIORITIZATION + EVIDENCE CALIBRATION CHECK PASS");
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});
