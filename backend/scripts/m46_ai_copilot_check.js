import { banner, step, must, login, reqJson, itemsOf } from "./_harness.js";

function firstId(resp) {
  const items = itemsOf(resp);
  return Number(items?.[0]?.id || 0) || null;
}

async function main() {
  banner("M46 AI COPILOT FOUNDATION CHECK");

  step("login demo users");
  const roomToken = await login("room@demo.com", "demo123");
  const companyToken = await login("company@demo.com", "demo123");
  const superToken = await login("superadmin@demo.com", "demo123");
  const driverToken = await login("driver@demo.com", "demo123");
  must("room login ok", !!roomToken);
  must("company login ok", !!companyToken);
  must("super admin login ok", !!superToken);
  must("driver login ok", !!driverToken);

  step("discover scoped shift + vehicle ids");
  const roomShifts = await reqJson("GET", "/api/shifts?includeOffered=1&take=5", { token: roomToken });
  must("room shifts list ok", roomShifts.ok);
  const roomShiftId = firstId(roomShifts);
  must("room shift id found", !!roomShiftId);

  const companyShifts = await reqJson("GET", "/api/shifts?take=5", { token: companyToken });
  must("company shifts list ok", companyShifts.ok);
  const companyShiftId = firstId(companyShifts) || roomShiftId;
  must("company shift id found", !!companyShiftId);

  const roomVehicles = await reqJson("GET", "/api/vehicles", { token: roomToken });
  must("room vehicles list ok", roomVehicles.ok);
  const vehicleId = firstId(roomVehicles);
  must("room vehicle id found", !!vehicleId);

  step("unauthorized denied");
  const noAuth = await reqJson("POST", "/api/ai/copilot", {
    body: { intent: "SHIFT_SUMMARY", entityType: "shift", entityId: roomShiftId },
    includeGreenpack: true,
  });
  must("no token -> 401", noAuth.status === 401);

  step("driver forbidden");
  const driverDenied = await reqJson("POST", "/api/ai/copilot", {
    token: driverToken,
    body: { intent: "SHIFT_SUMMARY", entityType: "shift", entityId: roomShiftId },
  });
  must("driver forbidden -> 403", driverDenied.status === 403);

  step("room SHIFT_SUMMARY");
  const roomSummary = await reqJson("POST", "/api/ai/copilot", {
    token: roomToken,
    body: { intent: "SHIFT_SUMMARY", entityType: "shift", entityId: roomShiftId },
  });
  must("room shift summary ok", roomSummary.ok && roomSummary.json?.ok === true);
  must("room shift summary provider visible", typeof roomSummary.json?.provider === "string" && roomSummary.json.provider.length > 0);
  must("room shift summary has facts", Array.isArray(roomSummary.json?.facts) && roomSummary.json.facts.length > 0);

  step("company CONFLICT_EXPLAIN");
  const companyConflict = await reqJson("POST", "/api/ai/copilot", {
    token: companyToken,
    body: { intent: "CONFLICT_EXPLAIN", entityType: "shift", entityId: companyShiftId },
  });
  must("company conflict explain ok", companyConflict.ok && companyConflict.json?.intent === "CONFLICT_EXPLAIN");
  must("company conflict explain has summary", typeof companyConflict.json?.summary === "string" && companyConflict.json.summary.length > 0);

  step("room TELEMATICS_HEALTH");
  const telematics = await reqJson("POST", "/api/ai/copilot", {
    token: roomToken,
    body: { intent: "TELEMATICS_HEALTH", entityType: "vehicle", entityId: vehicleId },
  });
  must("telematics health ok", telematics.ok && telematics.json?.intent === "TELEMATICS_HEALTH");
  must("telematics health has facts", Array.isArray(telematics.json?.facts) && telematics.json.facts.length > 0);

  step("superadmin OPS_NOTE_DRAFT");
  const ops = await reqJson("POST", "/api/ai/copilot", {
    token: superToken,
    body: { intent: "OPS_NOTE_DRAFT", entityType: "shift", entityId: companyShiftId },
  });
  must("ops note draft ok", ops.ok && ops.json?.intent === "OPS_NOTE_DRAFT");
  must("ops note draft has text", typeof ops.json?.noteDraft === "string" && ops.json.noteDraft.length > 0);

  step("audit visible");
  const auditLogs = await reqJson("GET", "/api/admin/audit-logs?action=AI_COPILOT_QUERY&take=10", { token: superToken });
  must("audit logs endpoint ok", auditLogs.ok);
  const items = itemsOf(auditLogs);
  must("AI_COPILOT_QUERY audit exists", items.some((x) => String(x?.action || "") === "AI_COPILOT_QUERY"));

  banner("M46 AI COPILOT FOUNDATION CHECK PASS");
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});
