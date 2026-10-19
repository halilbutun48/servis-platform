#!/usr/bin/env node

import assert from "node:assert/strict";
import { runCopilotFoundation } from "../src/ai/service.js";

const roomUser = {
  role: "ROOM",
  roomId: 1,
  companyId: 2,
  companyKind: "ROOM",
  id: 880607,
  sessionVersion: 1,
};

function state(screenContext) {
  return { recentMessages: [], activeGuidedTask: null, uiSurface: screenContext };
}

function surface({ path, label, scope, fieldLabel, filterValue, totalCount, clearTargetKey }) {
  return {
    path,
    label,
    role: "ROOM",
    companyKind: "ROOM",
    uiHints: {
      visibleButtons: [{
        label: "Filtreyi Temizle",
        targetKey: clearTargetKey,
        identitySource: "CANONICAL",
      }],
      semanticElements: [{
        semanticType: "field",
        label: fieldLabel,
        value: filterValue,
        targetKey: `room:${scope}:filter`,
        identitySource: "CANONICAL",
      }],
      filterStates: [{
        scope,
        value: filterValue,
        visibleCount: 0,
        totalCount,
        clearTargetKey,
      }],
    },
  };
}

async function answer(message, screenContext, key, user = roomUser) {
  return runCopilotFoundation({
    intent: "CHAT_HELP",
    entityType: "screen",
    entityId: 0,
    user,
    message,
    screenContext,
    conversationState: state(screenContext),
    authSessionId: `m18-room-part5-empty-recovery-${key}`,
  });
}

function clearAction(result, targetKey) {
  return (Array.isArray(result?.quickActions) ? result.quickActions : [])
    .find((action) => action?.actionKind === "CLEAR_FILTER" && action?.targetKey === targetKey);
}

const agreementSurface = surface({
  path: "/room/agreements",
  label: "Sözleşmeler",
  scope: "agreements",
  fieldLabel: "Kayıt no / durum / teklif / tarih / not",
  filterValue: "999999",
  totalCount: 7,
  clearTargetKey: "room:agreements:filter-clear",
});
const agreementResult = await answer("Sözleşmemi göremiyorum, ne yapmalıyım?", agreementSurface, "agreements");
assert.ok(clearAction(agreementResult, "room:agreements:filter-clear"), "empty agreements must expose the live clear-filter action");
assert.match(String(agreementResult.reply || ""), /0|filtre/i, "empty agreements reply must explain the active zero-result filter");

const vehicleSurface = surface({
  path: "/room/vehicles",
  label: "Araçlar",
  scope: "vehicles",
  fieldLabel: "34 ABC...",
  filterValue: "999999",
  totalCount: 3,
  clearTargetKey: "room:vehicles:filter-clear",
});
const vehicleResult = await answer("Aracımı bulamıyorum, ne yapmalıyım?", vehicleSurface, "vehicles");
assert.ok(clearAction(vehicleResult, "room:vehicles:filter-clear"), "empty vehicles must expose the live clear-filter action");
assert.match(String(vehicleResult.reply || ""), /0|filtre/i, "empty vehicles reply must explain the active zero-result filter");

const noFilterSurface = { ...agreementSurface, uiHints: { ...agreementSurface.uiHints, filterStates: [] } };
const noFilterResult = await answer("Sözleşmemi göremiyorum, ne yapmalıyım?", noFilterSurface, "no-filter");
assert.equal(
  (Array.isArray(noFilterResult.quickActions) ? noFilterResult.quickActions : []).some((action) => action?.actionKind === "CLEAR_FILTER"),
  false,
  "clear-filter action must not be offered without a live active filter state",
);

let foreignRoleRejected = false;
try {
  await answer(
    "Sözleşmemi göremiyorum, ne yapmalıyım?",
    agreementSurface,
    "foreign-role",
    { ...roomUser, role: "COMPANY", roomId: null, companyId: 99, companyKind: "COMPANY" },
  );
} catch (error) {
  foreignRoleRejected = error?.code === "SCREEN_CONTEXT_NOT_AUTHORIZED";
}
assert.equal(foreignRoleRejected, true, "non-ROOM roles must fail closed before receiving the ROOM filter action");

console.log(JSON.stringify({
  status: "PASS",
  scenarios: {
    agreements: { reply: agreementResult.reply, action: clearAction(agreementResult, "room:agreements:filter-clear") || null },
    vehicles: { reply: vehicleResult.reply, action: clearAction(vehicleResult, "room:vehicles:filter-clear") || null },
    noFilter: { reply: noFilterResult.reply },
    foreignRole: { rejected: foreignRoleRejected },
  },
}, null, 2));
