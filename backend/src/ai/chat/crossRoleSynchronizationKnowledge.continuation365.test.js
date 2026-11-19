import assert from "node:assert/strict";
import test from "node:test";

import { resolveCanonicalConversationRequest } from "./canonicalSemanticRequest.js";
import { resolveSemanticIntent } from "./semanticIntentPlanner.js";
import { buildCrossRoleSynchronizationResponse } from "../service.js";

function planFor(message, user, screenContext) {
  const canonicalRequest = resolveCanonicalConversationRequest({ message, user, screenContext });
  const semanticPlan = resolveSemanticIntent({ message, user, screenContext, canonicalRequest });
  return { canonicalRequest, semanticPlan };
}

test("cross-role impact question is not reduced to generic role help", () => {
  const user = { role: "COMPANY", companyKind: "COMPANY", companyId: 1 };
  const screenContext = { path: "/company/shifts", role: "COMPANY" };
  const { canonicalRequest, semanticPlan } = planFor(
    "Teklifi kabul ettim, şimdi ROOM ne görecek?",
    user,
    screenContext,
  );

  assert.equal(canonicalRequest.canonicalShape.taskType, "RELATION_LOOKUP");
  assert.equal(canonicalRequest.canonicalShape.crossRoleImpactIntent, true);
  assert.equal(semanticPlan.family, "RELATION_LOOKUP");
  assert.equal(semanticPlan.crossRoleImpactIntent, true);
  assert.notEqual(semanticPlan.family, "ROLE_EXPLANATION_HELP");
});

test("selected shift cross-role answer stays on the authorized record and states the next owner", () => {
  const user = { role: "COMPANY", companyKind: "COMPANY", companyId: 1 };
  const screenContext = {
    path: "/company/shifts",
    role: "COMPANY",
    selectedEntityType: "shift",
    selectedEntityId: 57,
    label: "Vardiyalar",
  };
  const { semanticPlan } = planFor(
    "Sözleşmeyi onayladım, vardiyaya yansıdı mı?",
    user,
    screenContext,
  );
  const response = buildCrossRoleSynchronizationResponse({
    user,
    message: "Sözleşmeyi onayladım, vardiyaya yansıdı mı?",
    context: {
      id: 57,
      type: "shift",
      status: "DONE",
      company: { id: 1, name: "DemoCompany" },
      room: { id: 1, name: "DemoRoom" },
      agreementId: 14,
      agreement: { id: 14, status: "ACTIVE" },
      vehicle: { id: 2, plate: "34ABC126" },
      driver: { id: 8, fullName: "Demo Sürücü" },
    },
    semanticPlan,
    screenContext,
    entityType: "shift",
    entityId: 57,
  });

  assert.ok(response);
  assert.match(response.reply, /Vardiya #57/u);
  assert.match(response.reply, /Sözleşme #14/u);
  assert.match(response.reply, /ROOM|taşımacı/u);
  assert.match(response.reply, /sonraki adım|kontrol/u);
  assert.doesNotMatch(response.reply, /Vardiya #65/u);
});

test("without a selected record cross-role answer stays fail-closed", () => {
  const user = { role: "COMPANY", companyKind: "COMPANY", companyId: 1 };
  const screenContext = { path: "/company/shifts", role: "COMPANY" };
  const { semanticPlan } = planFor(
    "Teklifi kabul ettim, şimdi ROOM ne görecek?",
    user,
    screenContext,
  );
  const response = buildCrossRoleSynchronizationResponse({
    user,
    message: "Teklifi kabul ettim, şimdi ROOM ne görecek?",
    context: null,
    semanticPlan,
    screenContext,
    entityType: "screen",
    entityId: 0,
  });

  assert.ok(response);
  assert.match(response.reply, /ROOM/u);
  assert.match(response.reply, /seçili|secli|doğrula|dogrula/u);
  assert.doesNotMatch(response.reply, /#\d+/u);
});

test("screen context cannot leak an internal screen identifier as a business record", () => {
  const user = { role: "ROOM", roomId: 1 };
  const screenContext = { path: "/room/shifts", role: "ROOM", label: "Vardiyalar" };
  const { semanticPlan } = planFor(
    "Teklifi kabul ettim, şimdi ROOM ne görecek?",
    user,
    screenContext,
  );
  const response = buildCrossRoleSynchronizationResponse({
    user,
    message: "Teklifi kabul ettim, şimdi ROOM ne görecek?",
    context: { id: 1103, type: "screen", status: "READY" },
    semanticPlan,
    screenContext,
    entityType: "screen",
    entityId: 1103,
  });

  assert.ok(response);
  assert.doesNotMatch(response.reply, /screen\s*#\d+/iu);
  assert.doesNotMatch(response.reply, /#1103/u);
  assert.match(response.reply, /Teklif kabulü|seçili teklif|kayıt seç/u);
});

test("collection impact explains invoice-bound synchronization without inventing a bank confirmation", () => {
  const user = { role: "ROOM", companyKind: "ROOM", roomId: 1 };
  const screenContext = {
    path: "/room/financial-operations",
    role: "ROOM",
    selectedEntityType: "invoice",
    selectedEntityId: 6,
    label: "Genel Durum",
  };
  const { semanticPlan } = planFor(
    "Firma ödeme yaptı, ROOM bakiyesi neden değişmedi?",
    user,
    screenContext,
  );
  const response = buildCrossRoleSynchronizationResponse({
    user,
    message: "Firma ödeme yaptı, ROOM bakiyesi neden değişmedi?",
    context: {
      id: 6,
      type: "invoice",
      status: "ISSUED",
      agreementId: 14,
      company: { id: 1, name: "DemoCompany" },
      room: { id: 1, name: "DemoRoom" },
    },
    semanticPlan,
    screenContext,
    entityType: "invoice",
    entityId: 6,
  });

  assert.ok(response);
  assert.match(response.reply, /doğru faturaya bağlı tahsilat/u);
  assert.match(response.reply, /banka|doğrulanmış|banka tarafından/u);
  assert.match(response.reply, /kalan alacak|fatura/u);
  assert.equal(response.readOnly, true);
});

test("settlement impact keeps service completion separate from automatic entitlement", () => {
  const user = { role: "DRIVER", driverId: 8 };
  const screenContext = { path: "/driver/route", role: "DRIVER", label: "Rota" };
  const { semanticPlan } = planFor(
    "Sürücü servisi tamamladı, hakediş neden oluşmadı?",
    user,
    screenContext,
  );
  const response = buildCrossRoleSynchronizationResponse({
    user,
    message: "Sürücü servisi tamamladı, hakediş neden oluşmadı?",
    context: {
      id: 57,
      type: "shift",
      status: "DONE",
      agreementId: 14,
      company: { id: 1, name: "DemoCompany" },
      room: { id: 1, name: "DemoRoom" },
    },
    semanticPlan,
    screenContext,
    entityType: "shift",
    entityId: 57,
  });

  assert.ok(response);
  assert.match(response.reply, /tek başına hakedişin oluştuğu anlamına gelmez/u);
  assert.match(response.reply, /sözleşme.*dönem.*hizmet kanıtı/u);
  assert.match(response.reply, /Sıradaki adım/u);
  assert.equal(response.readOnly, true);
});

test("parent cross-role visibility remains limited to the authorized child", () => {
  const user = { role: "PARENT", parentId: 12 };
  const screenContext = { path: "/parent/live", role: "PARENT", label: "Canlı Takip" };
  const { semanticPlan } = planFor(
    "Veli çocuğunun servisi görünmüyorsa kim kontrol eder?",
    user,
    screenContext,
  );
  const response = buildCrossRoleSynchronizationResponse({
    user,
    message: "Veli çocuğunun servisi görünmüyorsa kim kontrol eder?",
    context: null,
    semanticPlan,
    screenContext,
    entityType: "screen",
    entityId: 0,
  });

  assert.ok(response);
  assert.match(response.reply, /yetkili çocuk|okul ya da taşımacı/u);
  assert.match(response.reply, /Başka çocukların servisini.*açmıyorum/u);
  assert.doesNotMatch(response.reply, /başka çocuğun.*konum|başka çocuğun.*servis/u);
});
