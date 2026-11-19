import assert from "node:assert/strict";
import test from "node:test";

import {
  buildFieldAcceptanceReadReply,
  isSuperAdminFieldAcceptanceReadPlan,
} from "../../services/authorizedProductAwareness.js";

const screenContext = {
  path: "/superadmin/acceptance",
  screenType: "FIELD_ACCEPTANCE",
};

test("SUPER_ADMIN Kabul Merkezi questions stay on the canonical acceptance session", () => {
  assert.equal(isSuperAdminFieldAcceptanceReadPlan({
    role: "SUPER_ADMIN",
    message: "Bu kabul merkezinin kontrol listesi ve kararı nedir?",
    screenContext,
  }), true);
  assert.equal(isSuperAdminFieldAcceptanceReadPlan({
    role: "COMPANY",
    message: "Bu kabul merkezinin durumu nedir?",
    screenContext,
  }), false);
  assert.equal(isSuperAdminFieldAcceptanceReadPlan({
    role: "SUPER_ADMIN",
    message: "Yeni oturum oluştur",
    screenContext,
  }), false);
});

test("field acceptance read reply exposes only the current checklist and decision", () => {
  const reply = buildFieldAcceptanceReadReply({
    session: {
      decision: "LIMITED_GO",
      checklist: [
        { label: "Giriş akışı tamamlandı", status: "PASS" },
        { label: "Çevrim dışı toparlama anlaşılır", status: "PENDING" },
      ],
    },
  });
  assert.match(reply, /1\/2 kontrol maddesi tamamlandı/);
  assert.match(reply, /Karar: Sınırlı uygun/);
  assert.match(reply, /Çevrim dışı toparlama anlaşılır/);
  assert.match(reply, /salt okunur/);
});
