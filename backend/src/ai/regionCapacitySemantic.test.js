import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRegionCapacityReply,
  resolveSuperAdminRegionCapacityRequest,
} from "./regionCapacitySemantic.js";

test("super admin region company count resolves the named authorized region", () => {
  const request = resolveSuperAdminRegionCapacityRequest({
    userRole: "SUPER_ADMIN",
    screenPath: "/superadmin/regions",
    message: "İstanbul bölgesinde kaç firma var?",
  });
  assert.deepEqual(request, {
    kind: "COUNT",
    metric: "COMPANY",
    regionName: "istanbul",
    normalizedRegionName: "istanbul",
  });
  const result = buildRegionCapacityReply({
    request,
    snapshot: { items: [{ id: 1, name: "İstanbul", companyCount: 4, roomCount: 1 }] },
  });
  assert.match(result.reply, /İstanbul bölgesinde hizmet alan firma sayısı 4/u);
  assert.equal(result.regionContext.regionId, 1);
});

test("a follow-up can keep the previously verified region without inventing a new one", () => {
  const request = resolveSuperAdminRegionCapacityRequest({
    userRole: "SUPER_ADMIN",
    screenPath: "/superadmin/regions",
    message: "Peki taşımacılık firması kaç?",
    conversationState: { lastSettledResult: { semanticPlan: { regionContext: { regionName: "İstanbul" } } } },
  });
  assert.equal(request.metric, "ROOM");
  assert.equal(request.normalizedRegionName, "istanbul");
});

test("other roles and unrelated surfaces do not receive region capacity scope", () => {
  assert.equal(resolveSuperAdminRegionCapacityRequest({
    userRole: "COMPANY",
    screenPath: "/superadmin/regions",
    message: "İstanbul bölgesinde kaç firma var?",
  }), null);
  assert.equal(resolveSuperAdminRegionCapacityRequest({
    userRole: "SUPER_ADMIN",
    screenPath: "/superadmin/companies",
    message: "İstanbul bölgesinde kaç firma var?",
  }), null);
});
