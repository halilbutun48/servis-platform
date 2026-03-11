import { banner, step, must, login, reqJson, itemsOf } from "./_harness.js";

function firstId(resp) {
  const items = itemsOf(resp);
  return Number(items?.[0]?.id || 0) || null;
}

async function main() {
  banner("M46.2 AI COPILOT INTENT EXPANSION CHECK");

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

  step("assignment readiness returns expanded metadata");
  const readiness = await reqJson("POST", "/api/ai/copilot", {
    token: roomToken,
    body: { intent: "ASSIGNMENT_READINESS", entityType: "shift", entityId: roomShiftId },
  });
  must("assignment readiness ok", readiness.ok && readiness.json?.intent === "ASSIGNMENT_READINESS");
  must("copilot version upgraded", ["M46.2","M46.3","M46.4"].includes(readiness.json?.copilotVersion));
  must("intent label visible", typeof readiness.json?.intentLabel === "string" && readiness.json.intentLabel.length > 0);
  must("entity label visible", typeof readiness.json?.entityLabel === "string" && readiness.json.entityLabel.length > 0);
  must("scope summary visible", typeof readiness.json?.scope?.summary === "string" && readiness.json.scope.summary.length > 0);
  must("highlights visible", Array.isArray(readiness.json?.highlights));
  must("references has open offer count", typeof readiness.json?.references?.openOfferCount === "number");

  step("offer decision help works for company scope");
  const offerHelp = await reqJson("POST", "/api/ai/copilot", {
    token: companyToken,
    body: { intent: "OFFER_DECISION_HELP", entityType: "shift", entityId: companyShiftId },
  });
  must("offer decision ok", offerHelp.ok && offerHelp.json?.intent === "OFFER_DECISION_HELP");
  must("offer next checks visible", Array.isArray(offerHelp.json?.nextChecks) && offerHelp.json.nextChecks.length > 0);

  step("gps signal diagnosis works for vehicle entity");
  const gpsDiag = await reqJson("POST", "/api/ai/copilot", {
    token: roomToken,
    body: { intent: "GPS_SIGNAL_DIAGNOSIS", entityType: "vehicle", entityId: vehicleId },
  });
  must("gps diagnosis ok", gpsDiag.ok && gpsDiag.json?.intent === "GPS_SIGNAL_DIAGNOSIS");
  must("gps diagnosis references include device ids", Array.isArray(gpsDiag.json?.references?.deviceIds));
  must("gps diagnosis highlights visible", Array.isArray(gpsDiag.json?.highlights));

  step("legacy ops note still works");
  const ops = await reqJson("POST", "/api/ai/copilot", {
    token: superToken,
    body: { intent: "OPS_NOTE_DRAFT", entityType: "shift", entityId: roomShiftId },
  });
  must("ops draft ok", ops.ok && typeof ops.json?.noteDraft === "string" && ops.json.noteDraft.length > 0);
  must("ops response still enriched", Array.isArray(ops.json?.blocks) && Array.isArray(ops.json?.nextChecks));

  banner("M46.2 AI COPILOT INTENT EXPANSION CHECK PASS");
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});
