import assert from "node:assert/strict";
import test from "node:test";

import { getRoleDomainCapabilities } from "./semanticIntentPlanner.js";
import { serviceRequestEntityAccessRoles, serviceRequestScopeForUser } from "./authorizationGate.js";

test("COMPANY Sefer Abi servis talebi okuma alanı şirket tenant'ı ile sınırlıdır", () => {
  assert.equal(getRoleDomainCapabilities({ role: "COMPANY", companyId: 1 }).capabilities.SERVICE_REQUESTS, "ALLOW_READ");
  assert.deepEqual(serviceRequestScopeForUser({ role: "COMPANY", companyId: 1 }), {
    shift: { is: { companyId: 1 } },
  });
});

test("ROOM servis talebi okuma alanı oda tenant'ı ile sınırlıdır", () => {
  assert.deepEqual(serviceRequestScopeForUser({ role: "ROOM", roomId: 1 }), {
    shift: { is: { roomId: 1 } },
  });
});

test("DRIVER servis talebi scope'u yalnız kendi vardiya bağlarıyla sınırlıdır", () => {
  assert.deepEqual(serviceRequestScopeForUser({ role: "DRIVER", id: 4 }), {
    shift: { is: { driver: { is: { userId: 4 } } } },
  });
});

test("DRIVER seçili servis talebini kendi vardiya bağında okuyabilir", () => {
  assert.ok(serviceRequestEntityAccessRoles().includes("DRIVER"));
});

test("servis talebi scope'u bilinmeyen veya kimliksiz tenant için kapalıdır", () => {
  assert.deepEqual(serviceRequestScopeForUser({ role: "COMPANY" }), { id: -1 });
  assert.deepEqual(serviceRequestScopeForUser({ role: "DRIVER" }), { id: -1 });
});
