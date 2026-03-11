import { banner, step, must, login, reqJson, itemsOf } from "./_harness.js";

function firstId(resp) {
  const items = itemsOf(resp);
  return Number(items?.[0]?.id || 0) || null;
}

async function main() {
  banner("M46.3 AI COPILOT QUALITY + EVIDENCE CHECK");

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

  step("shift summary returns quality fields");
  const shiftSummary = await reqJson("POST", "/api/ai/copilot", {
    token: roomToken,
    body: { intent: "SHIFT_SUMMARY", entityType: "shift", entityId: roomShiftId },
  });
  must("shift summary ok", shiftSummary.ok && shiftSummary.json?.intent === "SHIFT_SUMMARY");
  must("copilot version upgraded", shiftSummary.json?.copilotVersion === "M46.3");
  must("confidence visible", typeof shiftSummary.json?.confidence === "number" && shiftSummary.json.confidence >= 0.5);
  must("explanation visible", typeof shiftSummary.json?.explanation === "string" && shiftSummary.json.explanation.length > 20);
  must("evidence visible", Array.isArray(shiftSummary.json?.evidence) && shiftSummary.json.evidence.length > 0);
  must("decision signals visible", Array.isArray(shiftSummary.json?.decisionSignals) && shiftSummary.json.decisionSignals.length > 0);

  step("offer decision help keeps structured reasoning");
  const offerHelp = await reqJson("POST", "/api/ai/copilot", {
    token: companyToken,
    body: { intent: "OFFER_DECISION_HELP", entityType: "shift", entityId: companyShiftId },
  });
  must("offer help ok", offerHelp.ok && offerHelp.json?.intent === "OFFER_DECISION_HELP");
  must("offer help explanation visible", typeof offerHelp.json?.explanation === "string" && offerHelp.json.explanation.length > 20);
  must("offer help decision signals visible", Array.isArray(offerHelp.json?.decisionSignals));

  step("vehicle diagnosis returns evidence");
  const gpsDiag = await reqJson("POST", "/api/ai/copilot", {
    token: roomToken,
    body: { intent: "GPS_SIGNAL_DIAGNOSIS", entityType: "vehicle", entityId: vehicleId },
  });
  must("gps diagnosis ok", gpsDiag.ok && gpsDiag.json?.intent === "GPS_SIGNAL_DIAGNOSIS");
  must("gps diagnosis confidence visible", typeof gpsDiag.json?.confidence === "number");
  must("gps diagnosis evidence visible", Array.isArray(gpsDiag.json?.evidence) && gpsDiag.json.evidence.length > 0);

  step("ops note still keeps note draft");
  const ops = await reqJson("POST", "/api/ai/copilot", {
    token: superToken,
    body: { intent: "OPS_NOTE_DRAFT", entityType: "shift", entityId: roomShiftId },
  });
  must("ops draft ok", ops.ok && typeof ops.json?.noteDraft === "string" && ops.json.noteDraft.length > 0);
  must("ops explanation visible", typeof ops.json?.explanation === "string" && ops.json.explanation.length > 20);

  banner("M46.3 AI COPILOT QUALITY + EVIDENCE CHECK PASS");
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});
