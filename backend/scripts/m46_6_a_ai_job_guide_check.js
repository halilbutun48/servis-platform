import { banner, step, must, login, reqJson, itemsOf } from "./_harness.js";

function firstId(resp) {
  const items = itemsOf(resp);
  return Number(items?.[0]?.id || 0) || null;
}

async function main() {
  banner("M46.6-A AI JOB GUIDE CHECK");

  step("login demo users");
  const roomToken = await login("room@demo.com", "demo123");
  const companyToken = await login("company@demo.com", "demo123");
  must("room login ok", !!roomToken);
  must("company login ok", !!companyToken);

  step("discover scoped ids");
  const roomShifts = await reqJson("GET", "/api/shifts?includeOffered=1&take=5", { token: roomToken });
  const roomShiftId = firstId(roomShifts);
  must("room shift id found", !!roomShiftId);
  const roomVehicles = await reqJson("GET", "/api/vehicles", { token: roomToken });
  const vehicleId = firstId(roomVehicles);
  must("room vehicle id found", !!vehicleId);

  step("offer review guide");
  const offerReview = await reqJson("POST", "/api/ai/copilot", {
    token: roomToken,
    body: { intent: "JOB_GUIDE", jobType: "OFFER_REVIEW", guideLevel: "SHORT", entityType: "shift", entityId: roomShiftId },
  });
  must("offer review ok", offerReview.ok && offerReview.json?.jobType === "OFFER_REVIEW");
  must("copilot version upgraded", typeof offerReview.json?.copilotVersion === "string" && offerReview.json.copilotVersion.length > 0);
  must("whatToDoNow visible", typeof offerReview.json?.whatToDoNow === "string" && offerReview.json.whatToDoNow.length > 0);
  must("stepByStep visible", Array.isArray(offerReview.json?.stepByStep) && offerReview.json.stepByStep.length > 0);
  must("simpleTerms visible", Array.isArray(offerReview.json?.simpleTerms));

  step("offer approval guide");
  const offerApproval = await reqJson("POST", "/api/ai/copilot", {
    token: companyToken,
    body: { intent: "JOB_GUIDE", jobType: "OFFER_APPROVAL", guideLevel: "STEP_BY_STEP", entityType: "shift", entityId: roomShiftId },
  });
  must("offer approval ok", offerApproval.ok && offerApproval.json?.jobType === "OFFER_APPROVAL");
  must("guide level echoed", offerApproval.json?.guideLevel === "STEP_BY_STEP");
  must("common mistakes visible", Array.isArray(offerApproval.json?.commonMistakes) && offerApproval.json.commonMistakes.length > 0);

  step("vehicle bind guide");
  const vehicleBind = await reqJson("POST", "/api/ai/copilot", {
    token: roomToken,
    body: { intent: "JOB_GUIDE", jobType: "VEHICLE_DRIVER_BIND", guideLevel: "WHY", entityType: "vehicle", entityId: vehicleId },
  });
  must("vehicle bind ok", vehicleBind.ok && vehicleBind.json?.jobType === "VEHICLE_DRIVER_BIND");
  must("screen explanation visible", typeof vehicleBind.json?.screenExplanation === "string" && vehicleBind.json.screenExplanation.length > 0);
  must("job title visible", typeof vehicleBind.json?.jobTitle === "string" && vehicleBind.json.jobTitle.length > 0);

  banner("M46.6-A AI JOB GUIDE CHECK PASS");
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});
