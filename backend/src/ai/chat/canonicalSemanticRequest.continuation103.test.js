import assert from "node:assert/strict";
import test from "node:test";

import { resolveCanonicalConversationRequest } from "./canonicalSemanticRequest.js";

const roomUser = { id: 17, role: "ROOM", roomId: 1 };
const operationHealthScreen = {
  path: "/room/operation-health",
  label: "Operasyon Sağlığı",
  role: "ROOM",
  surfaceRole: "ROOM",
  selectedEntityType: "SHIFT",
  selectedEntityId: 26,
};

test("ROOM Operation Health freshness follow-up stays on GPS metric owner", () => {
  const result = resolveCanonicalConversationRequest({
    message: "Peki bu vardiyanın konumu güncel mi?",
    user: roomUser,
    screenContext: operationHealthScreen,
    conversationState: {
      lastScreenPath: operationHealthScreen.path,
      selectedEntityType: "SHIFT",
      selectedEntityId: 26,
    },
  });

  assert.equal(result.canonicalShape.operationHealthMetricIntent, true);
  assert.equal(result.canonicalShape.operationHealthMetricMode, "GPS_ISSUE_SUBSET");
  assert.equal(result.canonicalShape.taskType, "ISSUE");
  assert.equal(result.request.domain, "OPERATIONS");
  assert.equal(result.request.operation, "DIAGNOSE_CURRENT_ISSUE");
  assert.deepEqual(result.request.requestedFields, ["OPERATION_HEALTH_METRIC"]);
});

test("ROOM copilot selected-shift GPS freshness follow-up stays on the operation metric owner", () => {
  const result = resolveCanonicalConversationRequest({
    message: "Peki bu vardiyanın konumu güncel mi?",
    user: roomUser,
    screenContext: {
      path: "/room/copilot",
      label: "Sefer Abi’ye Sor",
      role: "ROOM",
      surfaceRole: "ROOM",
      selectedEntityType: "shift",
      selectedEntityId: 26,
      selectedLabel: "#26 • APPROVED • DemoCompany",
    },
    conversationState: {
      lastScreenPath: "/room/copilot",
      selectedEntityType: "shift",
      selectedEntityId: 26,
      recentMessages: [
        { role: "user", content: "Bu sürücünün GPS durumu ne?" },
        { role: "assistant", content: "Vardiya #26 için durum: Onaylandı • sürücü: Driver One • konum: Konum bilgisi bilinmiyor • veri tazeliği: bilinmiyor." },
      ],
    },
  });

  assert.equal(result.canonicalShape.operationHealthMetricIntent, true);
  assert.equal(result.canonicalShape.operationHealthMetricMode, "GPS_ISSUE_SUBSET");
  assert.equal(result.canonicalShape.taskType, "ISSUE");
  assert.equal(result.request.domain, "OPERATIONS");
  assert.equal(result.request.operation, "DIAGNOSE_CURRENT_ISSUE");
  assert.deepEqual(result.request.requestedFields, ["OPERATION_HEALTH_METRIC"]);
});

test("COMPANY selected-shift screen follow-up stays on the existing shift surface", () => {
  const result = resolveCanonicalConversationRequest({
    message: "Peki bu vardiya için hangi ekranı açmalıyım?",
    user: { id: 24, role: "COMPANY", companyId: 1 },
    screenContext: {
      path: "/company/copilot",
      label: "Sefer Abi’ye Sor",
      role: "COMPANY",
      surfaceRole: "COMPANY",
      selectedEntityType: "SHIFT",
      selectedEntityId: 26,
      selectedLabel: "#26 • APPROVED • DemoCompany",
    },
    conversationState: {
      lastScreenPath: "/company/copilot",
      selectedEntityType: "SHIFT",
      selectedEntityId: 26,
      recentMessages: [
        { role: "user", content: "Seçili vardiya 26'nın durumu nedir?" },
        { role: "assistant", content: "Vardiya #26 için durum: Onaylandı." },
      ],
    },
  });

  assert.equal(result.request.operation, "NAVIGATE_AUTHORIZED_SURFACE");
  assert.equal(result.request.semanticAction.actionClass, "NAVIGATE");
  assert.equal(result.request.safety.writeBoundary, "NO_BUSINESS_WRITE");
  assert.equal(result.canonicalShape.workflowIntent, "OPEN_SHIFT_SURFACE");
});

test("DRIVER Bugün route command opens the authorized Rota surface", () => {
  const result = resolveCanonicalConversationRequest({
    message: "Rota ekranını aç",
    user: { id: 9, role: "DRIVER" },
    screenContext: {
      path: "/driver/today",
      label: "Bugün",
      role: "DRIVER",
      surfaceRole: "DRIVER",
      selectedEntityType: "SHIFT",
      selectedEntityId: 19,
    },
  });

  assert.equal(result.request.operation, "NAVIGATE_AUTHORIZED_SURFACE");
  assert.equal(result.request.capability, "OPEN_SHIFT_SURFACE");
  assert.equal(result.request.semanticAction.actionClass, "NAVIGATE");
  assert.equal(result.canonicalShape.workflowIntent, "OPEN_SHIFT_SURFACE");
});
