import assert from "node:assert/strict";
import test from "node:test";

import { buildCanonicalSemanticContext } from "./canonicalSemanticContext.js";
import { inferCanonicalSemanticRequest } from "./canonicalSemanticRequest.js";

test("COMPANY açık talep sorusu canlı servis talebi seçimini korur", () => {
  const context = buildCanonicalSemanticContext({
    message: "Talebim kabul edildi mi, günlük atamaya uygulandı mı?",
    user: { role: "COMPANY", companyId: 1 },
    screenContext: {
      path: "/company/operations",
      selectedEntityType: "service_request",
      selectedEntityId: 3,
    },
  });

  assert.deepEqual(context.currentEntity, { type: "SERVICE_REQUEST", id: 3 });
  assert.deepEqual(context.referenceState.selectedEntity, { type: "SERVICE_REQUEST", id: 3 });
});

test("COMPANY açık talep sorusu seçili servis talebini UI bağlamına taşır", () => {
  const inferred = inferCanonicalSemanticRequest({
    message: "Seçili talebim kabul edildi mi, günlük atamaya uygulandı mı?",
    user: { role: "COMPANY", companyId: 1 },
    screenContext: {
      path: "/company/operations",
      label: "Operasyon Paneli",
      selectedEntityType: "service_request",
      selectedEntityId: 3,
    },
    conversationState: {},
  });

  assert.equal(inferred.uiContext.selectedType, "SERVICE_REQUEST");
  assert.equal(inferred.uiContext.selectedId, 3);
  assert.equal(inferred.uiContext.selectedEntityPresent, true);
  assert.equal(inferred.taskType, "FIELD_LOOKUP");
  assert.equal(inferred.domain, "SERVICE_REQUESTS");
  assert.equal(inferred.targetEntityType, "SERVICE_REQUEST");
  assert.equal(inferred.scopeTarget, "SELECTED_RECORD");
});

test("sunucu durumundaki camelCase servis talebi seçimi de korunur", () => {
  const inferred = inferCanonicalSemanticRequest({
    message: "Seçili talebim kabul edildi mi, günlük atamaya uygulandı mı?",
    user: { role: "COMPANY", companyId: 1 },
    screenContext: {
      path: "/company/operations",
      label: "Operasyon Paneli",
      selectedEntityType: "serviceRequest",
      selectedEntityId: 3,
    },
    conversationState: {},
  });

  assert.equal(inferred.uiContext.selectedType, "SERVICE_REQUEST");
  assert.equal(inferred.uiContext.selectedId, 3);
  assert.equal(inferred.uiContext.selectedEntityPresent, true);
  assert.equal(inferred.taskType, "FIELD_LOOKUP");
  assert.equal(inferred.domain, "SERVICE_REQUESTS");
  assert.equal(inferred.targetEntityType, "SERVICE_REQUEST");
  assert.equal(inferred.scopeTarget, "SELECTED_RECORD");
});

test("PARENT canlı ekranda seçili aktif servis için genel servis var mı sorusu kayda bağlanır", () => {
  const inferred = inferCanonicalSemanticRequest({
    message: "Çocuğumun bugün servisi var mı?",
    user: { role: "PARENT" },
    screenContext: {
      path: "/parent/live",
      label: "Canlı Takip",
      selectedEntityType: "vehicle",
      selectedEntityId: 3,
      selectedLabel: "Öğrencimin servisi • 34 ABC 125",
    },
    conversationState: {},
  });

  assert.equal(inferred.taskType, "STATUS");
  assert.equal(inferred.domain, "PERSONNEL");
  assert.equal(inferred.targetEntityType, "STUDENT");
  assert.equal(inferred.scopeTarget, "SELECTED_RECORD");
  assert.equal(inferred.explicitTaskIntent, true);
});

test("PARENT canlı ekranda ETA sorusu seçili araca ve ETA alanına bağlanır", () => {
  const inferred = inferCanonicalSemanticRequest({
    message: "ETA nedir?",
    user: { role: "PARENT" },
    screenContext: {
      path: "/parent/live",
      label: "Canlı Takip",
      selectedEntityType: "vehicle",
      selectedEntityId: 3,
      selectedLabel: "Öğrencimin servisi • 34 ABC 125",
    },
    conversationState: {},
  });

  assert.equal(inferred.taskType, "FIELD_LOOKUP");
  assert.equal(inferred.domain, "VEHICLES");
  assert.equal(inferred.targetEntityType, "VEHICLE");
  assert.deepEqual(inferred.requestedFields, [{ key: "ETA", domain: "OPERATIONS" }]);
  assert.equal(inferred.scopeTarget, "SELECTED_RECORD");
  assert.notEqual(inferred.roleHelpIntent, true);
});
