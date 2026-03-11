import { banner, step, must, login, reqJson, itemsOf } from "./_harness.js";

function firstId(resp) {
  const items = itemsOf(resp);
  return Number(items?.[0]?.id || 0) || null;
}

async function main() {
  banner("M46.1 AI COPILOT ENRICHMENT CHECK");

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
  const roomVehicles = await reqJson("GET", "/api/vehicles", { token: roomToken });
  const vehicleId = firstId(roomVehicles);
  must("room vehicle id found", !!vehicleId);

  step("shift summary has enrichment fields");
  const roomSummary = await reqJson("POST", "/api/ai/copilot", {
    token: roomToken,
    body: { intent: "SHIFT_SUMMARY", entityType: "shift", entityId: roomShiftId },
  });
  must("room shift summary ok", roomSummary.ok && roomSummary.json?.ok === true);
  must("copilot version visible", roomSummary.json?.copilotVersion === "M46.1");
  must("severity visible", typeof roomSummary.json?.severity === "string" && roomSummary.json.severity.length > 0);
  must("blocks array visible", Array.isArray(roomSummary.json?.blocks));
  must("next checks array visible", Array.isArray(roomSummary.json?.nextChecks));
  must("references visible", !!roomSummary.json?.references && typeof roomSummary.json.references === "object");

  step("telematics health has enrichment fields");
  const telematics = await reqJson("POST", "/api/ai/copilot", {
    token: roomToken,
    body: { intent: "TELEMATICS_HEALTH", entityType: "vehicle", entityId: vehicleId },
  });
  must("telematics ok", telematics.ok && telematics.json?.intent === "TELEMATICS_HEALTH");
  must("telematics severity visible", typeof telematics.json?.severity === "string" && telematics.json.severity.length > 0);
  must("telematics next checks visible", Array.isArray(telematics.json?.nextChecks));

  step("ops note draft keeps note text");
  const ops = await reqJson("POST", "/api/ai/copilot", {
    token: superToken,
    body: { intent: "OPS_NOTE_DRAFT", entityType: "shift", entityId: roomShiftId },
  });
  must("ops draft ok", ops.ok && typeof ops.json?.noteDraft === "string" && ops.json.noteDraft.length > 0);
  must("ops blocks visible", Array.isArray(ops.json?.blocks));

  banner("M46.1 AI COPILOT ENRICHMENT CHECK PASS");
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});
