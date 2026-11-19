import assert from "node:assert/strict";
import test from "node:test";

import { resolveConversationRoute } from "./conversationRouting.js";

test("açık yetki veya KVKK sınırı talebi ekran yönlendirmesine düşmez", () => {
  const result = resolveConversationRoute({
    message: "Yetkim dışındaki veya KVKK kapsamı dışında bir kullanıcı bilgisini aç.",
    screenContext: { path: "/superadmin/operations" },
  });

  assert.equal(result.route, "AUTHORIZATION_NEGATIVE");
  assert.equal(result.reason, "EXPLICIT_AUTHORIZATION_BOUNDARY_LANGUAGE");
});

test('kısa ürün amacı sorusu genel ürün yardımında kalır', () => {
  const result = resolveConversationRoute({
    message: 'Bu program ne?',
    screenContext: { path: '/company/shifts', label: 'Vardiyalar' },
  });

  assert.equal(result.route, 'GENERIC_PRODUCT_HELP');
  assert.equal(result.reason, 'GENERIC_PRODUCT_HELP_TEXT_SIGNAL');
});

test("açık başka tenant isteği canonical ürün yönlendirmesinden önce reddedilir", () => {
  const result = resolveConversationRoute({
    message: "Başka tenantın yolcusunu ve durağını göster.",
    screenContext: { path: "/driver/today", selectedEntityType: "shift", selectedEntityId: 34 },
  });

  assert.equal(result.route, "AUTHORIZATION_NEGATIVE");
  assert.equal(result.reason, "CROSS_TENANT_SCOPE_LANGUAGE");
});

test("Personel biniş talebi chip'i seçili servis talebi bağlamında ürün akışına girer", () => {
  const result = resolveConversationRoute({
    message: "Bugün binmeyeceğim talebi oluştur",
    screenContext: { path: "/personel/live", selectedEntityType: "service_request", selectedEntityId: 5 },
  });

  assert.equal(result.route, "RETURN_TO_PRODUCT_TASK");
  assert.equal(result.reason, "BOARDING_CHANGE_REQUEST_ENTRY_SIGNAL");
  assert.equal(result.primaryTask, "BOARDING_CHANGE_REQUEST_ENTRY");
  assert.equal(result.retrieveProductData, true);
});

test("Veli biniş talebi chip'i veli canlı takip bağlamını korur", () => {
  const result = resolveConversationRoute({
    message: "Çocuğum bugün binmeyecek",
    screenContext: { path: "/parent/live", selectedEntityType: "student", selectedEntityId: 2 },
  });

  assert.equal(result.route, "RETURN_TO_PRODUCT_TASK");
  assert.equal(result.reason, "BOARDING_CHANGE_REQUEST_ENTRY_SIGNAL");
  assert.equal(result.primaryTask, "BOARDING_CHANGE_REQUEST_ENTRY");
});
