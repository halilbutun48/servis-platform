#!/usr/bin/env node

import assert from "node:assert/strict";
import { runCopilotFoundation } from "../src/ai/service.js";

const user = {
  role: "ROOM",
  roomId: 1,
  companyId: 2,
  companyKind: "ROOM",
  id: 880607,
  sessionVersion: 1,
};

const state = (screenContext) => ({
  recentMessages: [],
  activeGuidedTask: null,
  uiSurface: screenContext,
});

const commercialFlow = {
  path: "/room/commercial-flow",
  label: "Ticari Çalışma Alanı",
  role: "ROOM",
  companyKind: "ROOM",
  uiHints: { visibleButtons: [] },
};

const vehicleSurface = {
  path: "/room/vehicles",
  label: "Araçlar",
  role: "ROOM",
  companyKind: "ROOM",
  selectedEntityType: "vehicle",
  selectedEntityId: 1,
  selectedLabel: "34ABC123",
  uiHints: { visibleButtons: [] },
};

async function answer(message, screenContext, key) {
  return runCopilotFoundation({
    intent: "CHAT_HELP",
    entityType: "screen",
    entityId: 0,
    user,
    message,
    screenContext,
    conversationState: state(screenContext),
    authSessionId: `m18-room-part5-cross-surface-${key}`,
  });
}

function routeAction(result, path) {
  return (Array.isArray(result?.quickActions) ? result.quickActions : [])
    .find((action) => action?.actionKind === "OPEN_ROUTE" && action?.path === path) || null;
}

const contractResult = await answer("Sözleşme #184'ü göster.", commercialFlow, "agreement-184");
const contractAction = routeAction(contractResult, "/room/agreements");
assert.ok(contractAction, "explicit agreement request from commercial flow must open agreements");
assert.equal(Number(contractAction.routeParams?.focusAgreementId), 184, "agreement navigation must retain #184");

const vehicleResult = await answer("Bu aracı haritada göster.", vehicleSurface, "vehicle-map");
const vehicleAction = routeAction(vehicleResult, "/room/map");
assert.ok(vehicleAction, "explicit vehicle map request must open the map");
assert.equal(Number(vehicleAction.routeParams?.focusVehicleId), 1, "vehicle map navigation must retain the selected vehicle");
assert.notEqual(vehicleResult.guidedTarget?.targetKey, "room:vehicles:tab:assignments", "vehicle map navigation must not retain the source Atamalar target");
assert.doesNotMatch(String(vehicleResult.reply || ""), /Atamalar/iu, "vehicle map reply must not expose the source Atamalar target");

const foreignVehicleResult = await runCopilotFoundation({
  intent: "CHAT_HELP",
  entityType: "screen",
  entityId: 0,
  user: { ...user, roomId: 999999 },
  message: "Bu aracı haritada göster.",
  screenContext: vehicleSurface,
  conversationState: state(vehicleSurface),
  authSessionId: "m18-room-part5-cross-surface-foreign-vehicle",
});
assert.equal(routeAction(foreignVehicleResult, "/room/map"), null, "cross-tenant vehicle must not produce a map route");
assert.doesNotMatch(JSON.stringify(foreignVehicleResult), /focusVehicleId/iu, "cross-tenant vehicle must not leak a map target id");

console.log(JSON.stringify({
  status: "PASS",
  scenarios: {
    contract184: { reply: contractResult.reply, action: contractAction },
    vehicleMap: { reply: vehicleResult.reply, action: vehicleAction },
  },
}, null, 2));
