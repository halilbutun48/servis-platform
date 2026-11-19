import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { getScreenDefinitionForUser } from "./screenCatalog.js";
import { inferCanonicalSemanticRequest } from "../chat/canonicalSemanticRequest.js";
import { buildChatHelpResponse } from "../chat/helpComposer.js";

const ledgerPath = path.resolve(process.cwd(), "docs/evidence/m18-dlevel-acceptance-ledger-v1.json");
const ledger = JSON.parse(fs.readFileSync(ledgerPath, "utf8"));
const roleBase = {
  SUPER_ADMIN: "superadmin",
  ROOM: "room",
  COMPANY: "company",
  SCHOOL: "school",
  ORGANIZATION: "organization",
  DRIVER: "driver",
  PERSONEL: "personel",
  PARENT: "parent",
};

function routePath(routeId) {
  const parts = String(routeId).split("/");
  if (parts[0] === "SHARED") return `/shared/${parts.slice(1).join("/")}`;
  const role = parts[1];
  const route = parts.slice(2).join("/");
  if (route === "home" || route === roleBase[role]) return `/${roleBase[role]}`;
  return `/${roleBase[role]}/${route}`;
}

function guideUser(routeId) {
  const parts = String(routeId).split("/");
  if (parts[0] === "SHARED") return { role: "ROOM" };
  return { role: parts[1] };
}

test("all 95 accepted route surfaces resolve to authorized product guidance", () => {
  const routes = Object.keys(ledger.routeSurfaceInventory || {});
  assert.equal(routes.length, 95);

  for (const routeId of routes) {
    const screen = getScreenDefinitionForUser(guideUser(routeId), { path: routePath(routeId) });
    assert.ok(screen, `${routeId} must resolve to a mounted guide screen`);
    for (const field of ["menuPurpose", "forWhom", "firstStep", "nextStep"]) {
      assert.equal(typeof screen[field], "string", `${routeId} missing ${field}`);
      assert.ok(screen[field].trim(), `${routeId} has empty ${field}`);
    }
  }
});

test("targeted action surfaces expose current safe action links and context questions", () => {
  const surfaces = [
    {
      routeId: "ROLE/SUPER_ADMIN/regions",
      path: "/superadmin/regions",
      user: { role: "SUPER_ADMIN" },
      labels: ["Ekle", "Yenile", "Düzenle", "Sil"],
    },
    {
      routeId: "ROLE/SUPER_ADMIN/pilot-launch-gate",
      path: "/superadmin/pilot-launch-gate",
      user: { role: "SUPER_ADMIN" },
      labels: ["Yenile", "Hazırlık Kontrolü sekmesine git", "Kararı kaydet", "Riski kaydet"],
    },
    {
      routeId: "ROLE/SUPER_ADMIN/ssot-alignment",
      path: "/superadmin/ssot-alignment",
      user: { role: "SUPER_ADMIN" },
      labels: [],
    },
    {
      routeId: "ROLE/SUPER_ADMIN/onboarding-review",
      path: "/superadmin/onboarding-review",
      user: { role: "SUPER_ADMIN" },
      labels: ["Yenile", "İlk kaydı aç", "İncelemeye al", "Ek bilgi gerekli", "Reddet", "Notları kaydet"],
    },
    {
      routeId: "ROLE/SUPER_ADMIN/public-leads",
      path: "/superadmin/public-leads",
      user: { role: "SUPER_ADMIN" },
      labels: ["Yenile", "İlk kaydı aç", "İncelemeye al", "Ek bilgi gerekli", "Invite için uygun", "Reddet", "Notları kaydet"],
    },
    {
      routeId: "ROLE/SUPER_ADMIN/logexport",
      path: "/superadmin/logexport",
      user: { role: "SUPER_ADMIN" },
      labels: ["Önizlemeyi göster", "Dışa aktar"],
    },
    {
      routeId: "ROLE/SUPER_ADMIN/natural-copilot",
      path: "/superadmin/natural-copilot",
      user: { role: "SUPER_ADMIN" },
      labels: ["Rehberi aç"],
    },
    {
      routeId: "ROLE/DRIVER/change-pin",
      path: "/driver/change-pin",
      user: { role: "DRIVER" },
      labels: ["PIN'i Kaydet"],
    },
  ];

  for (const surface of surfaces) {
    const screen = getScreenDefinitionForUser(surface.user, { path: surface.path });
    assert.ok(screen, `${surface.routeId} must resolve to a guide screen`);
    assert.ok(Array.isArray(screen.chatQuestions) && screen.chatQuestions.length > 0, `${surface.routeId} needs context questions`);
    assert.ok(Array.isArray(screen.screenMenus) && screen.screenMenus.length > 0, `${surface.routeId} needs safe navigation links`);
    if (surface.labels.length > 0) {
      const actualLabels = new Set((screen.buttonGuides || []).map((guide) => guide.label));
      for (const label of surface.labels) assert.ok(actualLabels.has(label), `${surface.routeId} missing current action guide: ${label}`);
    }
  }
});

test("catalog questions stay bound to the authorized current surface", () => {
  const cases = [
    {
      path: "/superadmin/regions",
      message: "Bölgeyi nereden düzenlerim?",
    },
    {
      path: "/superadmin/logexport",
      message: "Bu işlem veri değiştirir mi?",
    },
  ];

  for (const item of cases) {
    const request = inferCanonicalSemanticRequest({
      message: item.message,
      user: { role: "SUPER_ADMIN" },
      screenContext: { path: item.path },
    });
    assert.equal(request.taskType, "SCREEN_CONTEXT", `${item.path} should remain screen-scoped`);
    assert.equal(request.scopeTarget, "CURRENT_SCREEN", `${item.path} should not widen scope`);
    assert.equal(request.screenKnowledgeKind, "HOW_TO_USE", `${item.path} should use screen guidance`);
    assert.equal(request.explicitUiGuidance, true, `${item.path} should expose UI guidance`);
  }
});

test("catalog-bound questions preserve the concrete action in the user-facing reply", () => {
  const cases = [{
    path: "/superadmin/regions",
    message: "Bölgeyi nereden düzenlerim?",
    expected: /Düzenle:.*günceller/i,
  }];

  for (const item of cases) {
    const user = { role: "SUPER_ADMIN" };
    const screenContext = { path: item.path };
    const semanticPlan = inferCanonicalSemanticRequest({
      message: item.message,
      user,
      screenContext,
    });
    const response = buildChatHelpResponse({
      entityType: "screen",
      entityId: 0,
      user,
      message: item.message,
      context: {},
      entityLabel: "",
      scope: { role: "SUPER_ADMIN", roleMode: "OPERATIONS" },
      conversationState: {},
      semanticPlan,
      screenContext,
      screenDefinition: getScreenDefinitionForUser(user, screenContext),
    });
    assert.match(response.reply, item.expected, `${item.path} must keep the concrete action guidance`);
  }
});

test("effective 636-function acceptance remains the canonical source basis", () => {
  const effective = ledger.sourceFunctionReconciliation?.effectiveStatusCounts;
  assert.deepEqual(effective, {
    total: 636,
    pass: 636,
    passWithScope: 0,
    notProven: 0,
    open: 0,
    basis: effective.basis,
  });
});

test("all historical function units retain an authorized route capability owner", () => {
  const rows = (ledger.routeFunctionInventory || []).flatMap((route) => route.functionUnits || []);
  const excluded = new Set((ledger.sourceFunctionReconciliation?.excludedOwnershipRecords || []).map((item) => item.id));
  assert.equal(rows.length, 644);

  for (const unit of rows) {
    const screen = getScreenDefinitionForUser(guideUser(unit.id), { path: routePath(unit.id.replace(/\/FUNCTION\/.*$/u, "")) });
    assert.ok(screen, `${unit.id} must retain an authorized route capability owner`);
    assert.ok(unit.evidence || unit.source || unit.acceptanceEvidence, `${unit.id} must retain source/evidence provenance`);
    if (unit.status !== "PASS") assert.ok(excluded.has(unit.id), `${unit.id} is not an approved effective-scope exclusion`);
  }
});
