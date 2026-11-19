import test from "node:test";
import assert from "node:assert/strict";
import { getPreferredRouteTemplateId, getReadableRouteTemplateLabel } from "./routeEvidenceTemplates.js";

const templates = [
  { id: 3, name: "SEFERPAKT_DEMO_2026_CANONICAL_V1:ROUTE_TEMPLATE_SEPTEMBER_FULL" },
  { id: 4, name: "SEFERPAKT_DEMO_2026_CANONICAL_V1:ROUTE_TEMPLATE_OCTOBER_FULL" },
];

test("Ekim vardiyası için yalnızca öneri olarak Ekim şablonunu seçer", () => {
  assert.equal(getPreferredRouteTemplateId(templates, "2026-10-30"), 4);
});

test("şablon etiketi teknik kimlikleri kullanıcıya taşımaz", () => {
  const label = getReadableRouteTemplateLabel(templates[1]);
  assert.equal(label, "Ekim dönem rota planı");
  assert.equal(label.includes("ROUTE_TEMPLATE"), false);
});

test("dönem eşleşmiyorsa otomatik uygulama adayı üretmez", () => {
  assert.equal(getPreferredRouteTemplateId(templates, "2026-11-30"), null);
});
