#!/usr/bin/env node

import assert from "node:assert/strict";
import { composeSemanticEvidence } from "../src/ai/chat/semanticEvidenceComposer.js";
import { extractTurkishSemanticFeatures } from "../src/ai/chat/turkishSemanticFeatures.js";
import { resolveCanonicalConversationRequest } from "../src/ai/chat/canonicalSemanticRequest.js";
import { authorizeSemanticRequest } from "../src/ai/chat/authorizationGate.js";
import { resolveSemanticIntent } from "../src/ai/chat/semanticIntentPlanner.js";
import { runCopilotFoundation } from "../src/ai/service.js";
import { getScreenDefinitionForUser } from "../src/ai/jobGuide/screenCatalog.js";
import prisma from "../src/prisma.js";

const ROLE_SCREENS = Object.freeze({
  ROOM: { path: "/room/shifts", label: "Vardiyalar", role: "ROOM" },
  COMPANY: { path: "/company/operations", label: "Operasyon Paneli", role: "COMPANY" },
});

function userFor(role) {
  return role === "ROOM"
    ? { role, roomId: 1, companyId: 2, companyKind: "ROOM", sessionVersion: 1 }
    : { role, companyId: 1, companyKind: "COMPANY", sessionVersion: 1 };
}

function resolve(message, role, selectedEntity = null) {
  const user = userFor(role);
  const screenContext = ROLE_SCREENS[role];
  const conversationState = { recentMessages: [], activeGuidedTask: null, uiSurface: screenContext };
  const canonical = resolveCanonicalConversationRequest({
    message,
    user,
    selectedEntity,
    screenContext,
    conversationState,
    interpreterMode: "DETERMINISTIC",
  });
  const semanticPlan = resolveSemanticIntent({
    message,
    user,
    screenContext,
    conversationState,
    canonicalRequest: canonical,
  });
  return { user, screenContext, canonical, semanticPlan };
}

function roleHelpEvidence() {
  const text = "Taşıma tarafında günlük görevleri nasıl takip ederim?";
  return composeSemanticEvidence({
    features: extractTurkishSemanticFeatures({ text }),
    context: {
      role: "ROOM",
      currentDomain: "SHIFTS",
      currentSurface: ROLE_SCREENS.ROOM,
      evidence: { product: true, object: [], action: [], relation: false },
      referenceState: { selectedEntity: null, currentTarget: null, uniqueReferent: null },
      freshness: { currentSurface: true, activeTask: false, target: false },
    },
    conversationState: { recentMessages: [], activeGuidedTask: null },
    screenContext: ROLE_SCREENS.ROOM,
  });
}

function flattenedScreenText(screen) {
  return JSON.stringify({
    menuPurpose: screen?.menuPurpose,
    forWhom: screen?.forWhom,
    dataRules: screen?.dataRules,
    buttonGuides: screen?.buttonGuides,
  });
}

const PRISMA_MUTATION_METHODS = Object.freeze([
  "create", "createMany", "createManyAndReturn", "delete", "deleteMany",
  "update", "updateMany", "updateManyAndReturn", "upsert",
]);
const PRISMA_ROOT_MUTATION_METHODS = Object.freeze([
  "$executeRaw", "$executeRawUnsafe", "$runCommandRaw", "$transaction",
]);

function installRuntimeGuards(client) {
  const counters = {
    prismaMutationAttemptCount: 0,
    prismaMutationBlockedCount: 0,
    externalNetworkAttemptCount: 0,
    externalNetworkBlockedCount: 0,
  };
  const restorations = [];
  const blockedMutation = (label) => (..._args) => {
    counters.prismaMutationAttemptCount += 1;
    counters.prismaMutationBlockedCount += 1;
    throw new Error(`M18_RUNTIME_WRITE_GUARD_BLOCKED:${label}`);
  };
  const wrap = (target, key, label) => {
    if (!target || typeof target[key] !== "function") return;
    const hadOwn = Object.hasOwn(target, key);
    const descriptor = hadOwn ? Object.getOwnPropertyDescriptor(target, key) : null;
    target[key] = blockedMutation(label);
    restorations.push(() => {
      if (hadOwn) Object.defineProperty(target, key, descriptor);
      else delete target[key];
    });
  };

  for (const modelName of Object.keys(client)) {
    if (modelName.startsWith("_") || modelName.startsWith("$")) continue;
    const delegate = client[modelName];
    for (const method of PRISMA_MUTATION_METHODS) wrap(delegate, method, `${modelName}.${method}`);
  }
  for (const method of PRISMA_ROOT_MUTATION_METHODS) wrap(client, method, method);

  return {
    counters,
    restore() {
      for (const restoreOne of restorations.reverse()) restoreOne();
    },
  };
}

const previousFetch = globalThis.fetch;
const runtimeGuards = installRuntimeGuards(prisma);
globalThis.fetch = (...args) => {
  runtimeGuards.counters.externalNetworkAttemptCount += 1;
  runtimeGuards.counters.externalNetworkBlockedCount += 1;
  throw new Error(`external network is forbidden in security boundary check: ${String(args[0] || "")}`);
};

try {
  if (process.argv.includes("--negative-control")) {
    try {
      await prisma.user.create({ data: { email: "m18-negative-control@example.invalid" } });
    } catch (error) {
      assert.match(String(error?.message || error), /M18_RUNTIME_WRITE_GUARD_BLOCKED/u, "negative control write is blocked by runtime guard");
    }
    try {
      await fetch("https://m18-negative-control.invalid");
    } catch (error) {
      assert.match(String(error?.message || error), /external network is forbidden/u, "negative control network is blocked by runtime guard");
    }
    // This deliberately fails: the known security-boundary violation above
    // must make the zero-counter assertion RED without touching the database
    // or a real external endpoint.
    assert.deepEqual(
      {
        prismaMutationAttemptCount: runtimeGuards.counters.prismaMutationAttemptCount,
        externalNetworkAttemptCount: runtimeGuards.counters.externalNetworkAttemptCount,
      },
      { prismaMutationAttemptCount: 0, externalNetworkAttemptCount: 0 },
      "negative control must reject observed runtime mutation/network attempts",
    );
  }

  // Meaning is resolved before the ROOM capability boundary constrains the
  // outcome.  The CREATE meaning must not be rewritten as ambiguity or as a
  // COMPANY-only workflow.
  const roomCreate = resolve("vardiya oluşturmak istiyorum", "ROOM");
  const roomRequest = roomCreate.canonical.request;
  assert.equal(roomCreate.canonical.validation.status, "VALID", "ROOM create envelope is valid");
  assert.equal(roomRequest.semanticScope.class, "PRODUCT_EXPLICIT", "ROOM create is product-explicit before policy");
  assert.equal(roomRequest.semanticAction.actionClass, "CREATE", "ROOM create meaning is preserved before policy");
  assert.equal(roomRequest.semanticAction.objectClass, "SHIFT", "ROOM create target is a shift before policy");
  assert.equal(roomRequest.semanticAction.resolutionStatus, "RESOLVED", "ROOM create is not ambiguity");
  assert.equal(roomRequest.ambiguity.status, "NONE", "ROOM create is not ambiguity");
  assert.equal(roomCreate.canonical.canonicalShape.roleCapabilityBoundary, "ROOM_CREATE_UNSUPPORTED", "ROOM boundary is explicit");
  assert.equal(roomCreate.canonical.canonicalShape.workflowIntent, "OPEN_SHIFT_SURFACE", "ROOM create maps to the existing operational surface");
  assert.notEqual(roomCreate.canonical.canonicalShape.workflowIntent, "CREATE_SHIFT", "ROOM never receives the COMPANY create workflow");
  assert.equal(roomRequest.operation, "OPEN_EXISTING_SHIFT_OPERATIONS", "ROOM policy outcome remains operational guidance");
  assert.equal(roomRequest.capability, "OPEN_SHIFT_SURFACE", "ROOM policy outcome exposes the existing surface capability");
  assert.equal(roomRequest.safety.actionPolicy, "SAFE_UI_ONLY", "ROOM create guidance is safe UI only");
  assert.equal(roomRequest.safety.writeBoundary, "NO_BUSINESS_WRITE", "ROOM create guidance cannot write business data");

  const roomAuthorization = await authorizeSemanticRequest({
    user: roomCreate.user,
    plan: roomCreate.semanticPlan,
    request: roomRequest,
  });
  assert.equal(roomAuthorization.status, "ALLOW", "ROOM may receive the authorized read-only operational surface");
  assert.equal(roomAuthorization.deniedDomains.length, 0, "ROOM shift surface is not a domain denial");
  assert.equal(roomAuthorization.unauthorizedEntities.length, 0, "ROOM create meaning does not fabricate an unauthorized entity");

  // Role-help evidence is grounding input only.  It may describe the role and
  // authorized product surface, but it cannot grant a capability or decide
  // authorization.
  const roleHelp = resolve("Taşımacılık tarafında üzerime düşen işlerin sınırı nedir?", "ROOM");
  const roleHelpRequest = roleHelp.canonical.request;
  const evidence = roleHelpEvidence();
  assert.equal(roleHelp.semanticPlan.family, "ROLE_EXPLANATION_HELP", "role help remains role-specific product help");
  assert.equal(roleHelpRequest.semanticAction.actionClass, "EXPLAIN", "role help is explanation");
  assert.equal(roleHelpRequest.semanticAction.objectClass, "SURFACE", "role help may use the current surface as grounding");
  assert.equal(roleHelpRequest.operation, "GENERAL_INFORMATION", "role help operation is informational");
  assert.equal(roleHelpRequest.capability, "GENERAL_INFORMATION", "role help capability is informational only");
  assert.equal(roleHelpRequest.safety.writeBoundary, "NO_BUSINESS_WRITE", "role help is no-business-write");
  assert.equal(evidence.quality.roleHelpCandidate, true, "role-help evidence is recognized");
  assert.equal(evidence.quality.authorizationEffect, "NONE", "role-help evidence has no authorization effect");
  assert.equal(evidence.provenance.every((item) => item.authorizationEffect === "NONE"), true, "all evidence provenance is non-authorizing");
  for (const forbidden of ["authorization", "capability", "semanticAction", "semanticScope", "route", "response"]) {
    assert.equal(Object.hasOwn(evidence, forbidden), false, `role-help evidence does not carry ${forbidden}`);
  }
  const roleHelpAuthorization = await authorizeSemanticRequest({
    user: roleHelp.user,
    plan: roleHelp.semanticPlan,
    request: roleHelpRequest,
  });
  assert.equal(roleHelpAuthorization.status, "ALLOW", "role help still passes the existing authorization boundary");
  assert.deepEqual(roleHelpAuthorization.authorizedEntityRefs, [], "role help does not authorize a record");

  // Tenant mismatch is an authorization failure on an already-understood
  // request, not semantic ambiguity and not a reason to broaden retrieval.
  const tenantCase = resolve("Vardiya #42 kayıtlarını görüntüle.", "COMPANY", { type: "SHIFT", id: 42 });
  const tenantRequest = {
    ...tenantCase.canonical.request,
    candidateEntityRefs: tenantCase.canonical.request.candidateEntityRefs.map((ref) => ({ ...ref, tenantId: 9999 })),
  };
  assert.equal(tenantCase.canonical.request.semanticScope.class, "PRODUCT_EXPLICIT", "tenant case is product-explicit");
  assert.equal(tenantCase.canonical.request.semanticAction.resolutionStatus, "RESOLVED", "tenant case is semantically resolved");
  assert.equal(tenantCase.canonical.request.ambiguity.status, "NONE", "tenant case is not ambiguity");
  const tenantAuthorization = await authorizeSemanticRequest({
    user: tenantCase.user,
    plan: tenantCase.semanticPlan,
    request: tenantRequest,
  });
  assert.equal(tenantAuthorization.status, "DENY", "tenant mismatch is denied by authorization");
  assert.equal(tenantAuthorization.authorizationStatus, "DENIED", "tenant mismatch has denied authorization status");
  assert.equal(tenantAuthorization.reason, "TENANT_SCOPE_DENIED_BEFORE_RETRIEVAL", "tenant mismatch denies before retrieval");
  assert.deepEqual(tenantAuthorization.unauthorizedEntities, [], "tenant mismatch does not require entity lookup");

  // An explicit foreign-tenant financial-record request must terminate at the
  // canonical authorization boundary. It must never reuse the live selected
  // agreement as a silent finance fallback or disclose its amounts.
  const financialSession = `m18-financial-cross-tenant-${Date.now()}`;
  const financialBoundary = await runCopilotFoundation({
    intent: "CHAT_HELP",
    entityType: "screen",
    entityId: 0,
    user: { role: "ROOM", roomId: 1, companyId: 2, companyKind: "ROOM", id: 880607 },
    message: "DemoOkul tenantına ait sözleşme #186'nın hakediş ve fatura kaydını göster.",
    screenContext: {
      path: "/room/commercial-flow",
      label: "Commercial Flow",
      role: "ROOM",
      selectedEntityType: "agreement",
      selectedEntityId: 186,
      selectedLabel: "Sözleşme #186",
    },
    authSessionId: financialSession,
  });
  assert.equal(financialBoundary?.semanticPlan?.authorizationDecision?.status, "DENY", "foreign financial tenant request is denied canonically");
  assert.equal(financialBoundary?.semanticPlan?.authorizationDecision?.reason, "TENANT_SCOPE_DENIED_BEFORE_RETRIEVAL", "foreign financial tenant request denies before retrieval");
  assert.match(String(financialBoundary?.reply || ""), /yetki|erişim|okumadım|doğrulanamadı/iu, "foreign financial tenant request explains the authorization boundary");
  assert.doesNotMatch(String(financialBoundary?.reply || ""), /#186|100\.000|120\.000|hakediş|fatura/iu, "foreign financial request does not disclose or reuse the selected agreement");

  // Grounding remains catalog-owned and preserves the commercial role split:
  // COMPANY starts/buys the work; ROOM operates/carriers it.  The ROOM
  // catalog must not advertise the COMPANY-only new-plan control.
  const companyPlanScreen = getScreenDefinitionForUser(userFor("COMPANY"), { path: "/company", role: "COMPANY" });
  const roomOfferScreen = getScreenDefinitionForUser(userFor("ROOM"), { path: "/room/offers", role: "ROOM" });
  const roomShiftScreen = getScreenDefinitionForUser(userFor("ROOM"), { path: "/room/shifts", role: "ROOM" });
  assert.match(flattenedScreenText(companyPlanScreen), /teklifi gönder/iu, "COMPANY catalog preserves buyer handoff");
  assert.match(flattenedScreenText(companyPlanScreen), /Planlama Merkezi yeni iş kurar/iu, "COMPANY catalog owns new-work planning");
  assert.match(flattenedScreenText(roomOfferScreen), /yeni iş planını Hizmet Alan Firma başlatır/iu, "ROOM catalog preserves COMPANY ownership");
  assert.equal(roomShiftScreen.buttonGuides.some((button) => /yeni oluştur/iu.test(String(button?.label || ""))), false, "ROOM catalog does not advertise new creation");

  const businessWriteExecution = runtimeGuards.counters.prismaMutationAttemptCount;
  const authorizationMutation = runtimeGuards.counters.prismaMutationAttemptCount;
  const downstreamBusinessWrite = runtimeGuards.counters.prismaMutationAttemptCount;
  const externalLlmNetworkCallCount = runtimeGuards.counters.externalNetworkAttemptCount;
  assert.equal(runtimeGuards.counters.prismaMutationBlockedCount, businessWriteExecution, "every observed Prisma mutation was blocked by the runtime guard");
  assert.equal(runtimeGuards.counters.externalNetworkBlockedCount, externalLlmNetworkCallCount, "every observed external network call was blocked by the runtime guard");
  assert.equal(businessWriteExecution, 0, "runtime observed canonical security path has no business writes");
  assert.equal(authorizationMutation, 0, "runtime observed authorization path has no mutation");
  assert.equal(downstreamBusinessWrite, 0, "runtime observed grounding path has no business write");
  assert.equal(externalLlmNetworkCallCount, 0, "runtime observed security path has no external LLM/network call");

  console.log(JSON.stringify({
    status: "PASS",
    cases: ["ROOM_CREATE_BOUNDARY", "ROLE_HELP_NO_CAPABILITY_GRANT", "TENANT_MISMATCH_NOT_AMBIGUITY", "COMMERCIAL_ROLE_SPLIT"],
    room: {
      semanticAction: roomRequest.semanticAction.actionClass,
      object: roomRequest.semanticAction.objectClass,
      workflowIntent: roomCreate.canonical.canonicalShape.workflowIntent,
      roleCapabilityBoundary: roomCreate.canonical.canonicalShape.roleCapabilityBoundary,
      authorization: roomAuthorization.status,
    },
    roleHelp: {
      evidenceAuthorizationEffect: evidence.quality.authorizationEffect,
      capability: roleHelpRequest.capability,
      authorization: roleHelpAuthorization.status,
    },
    tenant: {
      semanticResolution: tenantCase.canonical.request.semanticAction.resolutionStatus,
      ambiguity: tenantCase.canonical.request.ambiguity.status,
      authorization: tenantAuthorization.status,
      reason: tenantAuthorization.reason,
    },
    counters: {
      businessWriteExecution,
      authorizationMutation,
      downstreamBusinessWrite,
      externalLlmNetworkCallCount,
      source: "RUNTIME_GUARD",
      prismaMutationBlockedCount: runtimeGuards.counters.prismaMutationBlockedCount,
      externalNetworkBlockedCount: runtimeGuards.counters.externalNetworkBlockedCount,
    },
  }, null, 2));
} finally {
  globalThis.fetch = previousFetch;
  runtimeGuards.restore();
  await prisma.$disconnect().catch(() => {});
}
