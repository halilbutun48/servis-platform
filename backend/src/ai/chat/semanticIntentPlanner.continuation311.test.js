import assert from "node:assert/strict";
import test from "node:test";

import { resolveCanonicalConversationRequest } from "./canonicalSemanticRequest.js";
import { resolveFieldPrivacyPolicy } from "./fieldPrivacyPolicy.js";
import { resolveSemanticIntent } from "./semanticIntentPlanner.js";
import { buildOrganizationLegacyPlanMapExplanation } from "../service.js";

const user = {
  id: 3,
  role: "ORGANIZATION",
  companyKind: "ORGANIZATION",
  companyId: 3,
};

const screenContext = {
  path: "/organization/plans",
  role: "ORGANIZATION",
  label: "Yer Planları",
  visibleButtons: ["Haritayı büyüt", "Planlama Merkezi'ne git"],
};

function planFor(message) {
  const canonicalRequest = resolveCanonicalConversationRequest({
    message,
    user,
    screenContext,
    env: { ...process.env, SEFER_ABI_SEMANTIC_AUTHORITY_MODE: "NEW" },
  });
  return {
    canonicalRequest,
    semanticPlan: resolveSemanticIntent({
      message,
      user,
      screenContext,
      canonicalRequest,
    }),
  };
}

test("organization plans status and next-step question stays on the plans surface", () => {
  const { canonicalRequest, semanticPlan } = planFor(
    "Organizasyon Planları ekranında kayıtlı plan var mı ve yeni planı nereden açarım?",
  );

  assert.equal(canonicalRequest.request.domain, "ORGANIZATION_PLANS");
  assert.equal(canonicalRequest.request.operation, "EXPLAIN_CURRENT_SURFACE");
  assert.equal(canonicalRequest.request.ambiguity.status, "NONE");
  assert.notEqual(semanticPlan.family, "UNCLEAR_OR_AMBIGUOUS");
  assert.ok(semanticPlan.requestedDomains.includes("ORGANIZATION_PLANS"));
});

test("organization plans map follow-up is not classified as a vehicle question", () => {
  const { canonicalRequest, semanticPlan } = planFor(
    "Peki bu eski taslakta koordinat yoksa harita neyi gösteriyor?",
  );

  assert.equal(canonicalRequest.request.domain, "ORGANIZATION_PLANS");
  assert.equal(canonicalRequest.request.operation, "EXPLAIN_CURRENT_SURFACE");
  assert.equal(canonicalRequest.request.semanticAction.objectClass, "SURFACE");
  assert.ok(canonicalRequest.request.semanticAction.evidence.includes("ORGANIZATION_LEGACY_PLANS_SURFACE"));
  assert.notEqual(canonicalRequest.request.semanticAction.evidence.includes("EXPLICIT_VEHICLE_OPERATIONAL_QUESTION"), true);
  assert.ok(semanticPlan.requestedDomains.includes("ORGANIZATION_PLANS"));
});

test("organization company-kind runtime identity keeps the plans surface owner", () => {
  const canonicalRequest = resolveCanonicalConversationRequest({
    message: "Peki bu eski taslakta koordinat yoksa harita neyi gösteriyor?",
    user: { ...user, role: "COMPANY", companyKind: "ORGANIZATION" },
    screenContext: { ...screenContext, role: "COMPANY", companyKind: "ORGANIZATION" },
    env: { ...process.env, SEFER_ABI_SEMANTIC_AUTHORITY_MODE: "NEW" },
  });

  assert.equal(canonicalRequest.request.domain, "ORGANIZATION_PLANS");
  assert.equal(canonicalRequest.request.semanticAction.objectClass, "SURFACE");
  assert.equal(canonicalRequest.request.operation, "EXPLAIN_CURRENT_SURFACE");
});

test("organization legacy plan preview may explain missing coordinates without exposing raw coordinates", () => {
  const plan = {
    family: "SCREEN_CONTEXT",
    screenContextIntent: true,
    requestedDomains: ["ORGANIZATION_PLANS"],
  };

  assert.equal(
    resolveFieldPrivacyPolicy({
      user: { role: "COMPANY", companyKind: "ORGANIZATION" },
      message: "Koordinat yoksa harita neyi gösteriyor?",
      plan,
    }).status,
    "ALLOW",
  );
  assert.equal(
    resolveFieldPrivacyPolicy({
      user: { role: "COMPANY", companyKind: "ORGANIZATION" },
      message: "Koordinatları göster ve kaydet.",
      plan,
    }).status,
    "DENY",
  );
});

test("organization legacy plan map follow-up explains approximate preview and planning-center next step", () => {
  const reply = buildOrganizationLegacyPlanMapExplanation({
    user: { role: "COMPANY", companyKind: "ORGANIZATION" },
    screenContext: { path: "/organization/plans", role: "COMPANY", companyKind: "ORGANIZATION" },
    message: "Peki bu eski taslakta koordinat yoksa harita neyi gösteriyor?",
  });

  assert.ok(reply);
  assert.match(reply.reply, /yaklaşık|kuş uçuşu/i);
  assert.match(reply.reply, /kesin rota|durak/i);
  assert.match(reply.reply, /Planlama Merkezi/i);
  assert.equal(reply.readOnly, true);
  assert.equal(reply.source, "organization-legacy-plan-map-explanation-v1");
});
