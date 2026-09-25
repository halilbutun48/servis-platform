#!/usr/bin/env node

/*
 * Bounded PRE-#18 acceptance for the generic-product-help projection contract.
 *
 * It executes the real semantic planner, canonical conversation state, and
 * Copilot service orchestration in-process. It creates no browser context and
 * only uses the process-local canonical conversation-state map.
 */
import { resolveSemanticIntent } from "../src/ai/chat/semanticIntentPlanner.js";
import { detectQuestionIntent } from "../src/ai/chat/intentRouter.js";
import {
  clearCanonicalConversationState,
  commitCanonicalConversationState,
  getCanonicalConversationState,
} from "../src/ai/chat/canonicalConversationState.js";
import { runCopilotFoundation } from "../src/ai/service.js";

const cases = [];
const failures = [];

function report(id, expected, actual, pass, rootCauseMatch = true) {
  const item = { id, expected, actual, pass, rootCauseMatch };
  cases.push(item);
  if (!pass) failures.push(item);
}

function roomUser(id = 981001, overrides = {}) {
  return { id, role: "ROOM", roomId: 1, companyId: null, sessionVersion: 1, ...overrides };
}

function companyUser(id = 981101, overrides = {}) {
  return { id, role: "COMPANY", companyKind: "COMPANY", companyId: 1, roomId: null, sessionVersion: 1, ...overrides };
}

function screen(path, label, selectedEntityType = "", selectedEntityId = null) {
  return { path, label, selectedEntityType, selectedEntityId };
}

function priorPlan(domain = "OFFERS", entity = { type: "offer", id: 35 }) {
  return {
    dialogueTopic: "PRODUCT",
    family: "SCREEN_RECORD",
    conversationRoute: "PRODUCT_TASK",
    requestedDomains: [domain],
    entities: [{ ...entity, source: "SCREEN_RECORD" }],
  };
}

function seedProductContext({ user, authSessionId, screenContext, domain = "OFFERS", entity } = {}) {
  const plan = priorPlan(domain, entity);
  commitCanonicalConversationState({
    user,
    authSessionId,
    screenContext,
    message: "Önceki yetkili ürün sorusu",
    payload: {
      reply: "Önceki yetkili ürün yanıtı.",
      semanticPlan: plan,
      conversationRoute: "PRODUCT_TASK",
      dialogueTopic: "PRODUCT",
    },
  });
  return plan;
}

function genericPlanFor({ user, authSessionId, screenContext = null } = {}) {
  const state = getCanonicalConversationState({ user, authSessionId, screenContext });
  return resolveSemanticIntent({
    message: "Bu program ne işe yarıyor?",
    user,
    conversationState: state,
    screenContext: state.screenContext,
  });
}

const sessions = [];
function scopedSession(prefix, user) {
  const id = `${prefix}-${Date.now()}-${sessions.length}`;
  sessions.push({ id, user });
  return id;
}

try {
  // 1. Prior ROOM context, no current screen: generic text cannot inherit it.
  {
    const user = roomUser();
    const authSessionId = scopedSession("generic-room-empty", user);
    seedProductContext({ user, authSessionId, screenContext: screen("/room/offers", "Teklifler", "offer", 35) });
    const plan = genericPlanFor({ user, authSessionId, screenContext: null });
    const pass = plan.family === "GENERIC_PRODUCT_HELP"
      && plan.conversationRoute === "GENERIC_PRODUCT_HELP"
      && plan.requestedDomains.length === 0
      && plan.entities.length === 0
      && plan.scopeTarget === "NONE";
    report("CASE_01_PRIOR_ROOM_NO_SCREEN_GENERIC", "Context-free generic lane with no domain/entity/screen inheritance", JSON.stringify({ family: plan.family, route: plan.conversationRoute, domains: plan.requestedDomains, entities: plan.entities, scope: plan.scopeTarget }), pass);
  }

  // 2. A valid current screen does not turn a generic query into a follow-up.
  {
    const user = roomUser(981002);
    const authSessionId = scopedSession("generic-room-screen", user);
    seedProductContext({ user, authSessionId, screenContext: screen("/room/offers", "Teklifler", "offer", 35) });
    const plan = genericPlanFor({ user, authSessionId, screenContext: screen("/room/shifts", "Vardiyalar") });
    const pass = plan.family === "GENERIC_PRODUCT_HELP" && plan.requestedDomains.length === 0 && plan.entities.length === 0;
    report("CASE_02_CURRENT_SCREEN_STAYS_GENERIC", "Current screen does not force PRODUCT_FOLLOW_UP", JSON.stringify({ family: plan.family, route: plan.conversationRoute, domains: plan.requestedDomains, entities: plan.entities }), pass);
  }

  // 3. The same rule applies to prior COMPANY state.
  {
    const user = companyUser();
    const authSessionId = scopedSession("generic-company", user);
    seedProductContext({ user, authSessionId, screenContext: screen("/company/offers", "Teklifler", "offer", 35) });
    const plan = genericPlanFor({ user, authSessionId, screenContext: null });
    const pass = plan.family === "GENERIC_PRODUCT_HELP" && plan.requestedDomains.length === 0 && plan.entities.length === 0;
    report("CASE_03_PRIOR_COMPANY_CONTEXT_ISOLATED", "Company route/entity/domain does not project into generic plan", JSON.stringify({ family: plan.family, domains: plan.requestedDomains, entities: plan.entities }), pass);
  }

  // 4–5. Exercise the real service response projection after poisoned state.
  {
    const user = roomUser(981003);
    const authSessionId = scopedSession("generic-service", user);
    seedProductContext({ user, authSessionId, screenContext: {
      ...screen("/room/offers", "Teklifler", "offer", 35),
      selectedLabel: "Teklif #35",
      actionableEvent: { id: "poisoned-action" },
    } });
    const response = await runCopilotFoundation({
      intent: "CHAT_HELP",
      entityType: "screen",
      entityId: 0,
      user,
      screenContext: null,
      message: "Bu program ne işe yarıyor?",
      authSessionId,
    });
    const storedAfterGeneric = getCanonicalConversationState({ user, authSessionId, screenContext: null });
    const actionCount = (response.quickActions || []).length
      + Number(Boolean(response.nextAction))
      + Number(Boolean(response.safeNextStep));
    const noActions = actionCount === 0;
    report("CASE_04_GENERIC_ZERO_ACTIONS", "No route/guide/write/payment action projection", JSON.stringify({ quickActions: response.quickActions, nextAction: response.nextAction || null, safeNextStep: response.safeNextStep || null }), noActions);
    const noPriorProjection = response.authorizedProductContext == null
      && response.semanticPlan?.family === "GENERIC_PRODUCT_HELP"
      && (response.semanticPlan?.requestedDomains || []).length === 0
      && (response.semanticPlan?.entities || []).length === 0
      && !response.actionableEvents
      && !response.actionableEventSource
      && storedAfterGeneric.productContext?.semanticPlan?.family === "SCREEN_RECORD"
      && storedAfterGeneric.productContext?.suspended === true;
    report("CASE_05_POISONED_CONTEXT_NOT_CONSUMED_OR_PROJECTED", "No saved product, selection, entity, actionable-event, or route-bound response projection; persisted same-auth context is retained only as suspended state", JSON.stringify({ family: response.semanticPlan?.family, domains: response.semanticPlan?.requestedDomains, entities: response.semanticPlan?.entities, authorizedProductContext: response.authorizedProductContext, actionableEventSource: response.actionableEventSource || null, persistedFamily: storedAfterGeneric.productContext?.semanticPlan?.family || null, persistedSuspended: storedAfterGeneric.productContext?.suspended || false }), noPriorProjection);
  }

  // 6. This is purity only: the HTTP route remains authRequired elsewhere.
  {
    const intent = detectQuestionIntent("Platform neler yapıyor?", { originalMessage: "Platform neler yapıyor?", userRole: "", screenPath: "", conversationState: null });
    const pass = intent.questionType === "PRODUCT_OVERVIEW_HELP" && intent.semanticIntent?.family === "GENERIC_PRODUCT_HELP";
    report("CASE_06_PURE_GENERIC_CLASSIFIER", "No-user generic classifier returns the static generic intent", JSON.stringify(intent), pass);
  }

  // 7. Off-topic still suspends, rather than erases, same-auth product state.
  {
    const user = roomUser(981004);
    const authSessionId = scopedSession("off-topic-preserve", user);
    const currentScreen = screen("/room/offers", "Teklifler", "offer", 35);
    const product = seedProductContext({ user, authSessionId, screenContext: currentScreen });
    commitCanonicalConversationState({ user, authSessionId, screenContext: currentScreen, message: "Kısa bir fıkra anlat", payload: { reply: "Kısa fıkra.", semanticPlan: { dialogueTopic: "OFF_TOPIC", family: "OFF_TOPIC_SAFE", conversationRoute: "OFF_TOPIC_SAFE", requestedDomains: [], entities: [], suspendProductContext: true }, conversationRoute: "OFF_TOPIC_SAFE", dialogueTopic: "OFF_TOPIC" } });
    const after = getCanonicalConversationState({ user, authSessionId, screenContext: currentScreen });
    const pass = after.productContext?.semanticPlan?.family === product.family && after.productContext?.suspended === true;
    report("CASE_07_OFF_TOPIC_PRESERVES_SUSPENDED_CONTEXT", "Persisted same-auth product state is retained and suspended", JSON.stringify({ product: after.productContext, suspended: after.suspendedProductContext }), pass);
  }

  // 8 and 15. Explicit current-screen language must not adopt an old record.
  for (const [id, message] of [["CASE_08_CURRENT_CONTEXTUAL_HELP", "Bu ekranda neye bakmalıyım?"], ["CASE_15_AMBIGUOUS_CURRENT_SCREEN_IGNORES_OLD_RECORD", "Bu ekranda neye bakmalıyım?"]]) {
    const user = roomUser(id === "CASE_08_CURRENT_CONTEXTUAL_HELP" ? 981005 : 981006);
    const authSessionId = scopedSession(`current-screen-${id}`, user);
    seedProductContext({ user, authSessionId, screenContext: screen("/room/offers", "Teklifler", "offer", 35) });
    const currentScreen = screen("/room/shifts", "Vardiyalar");
    const state = getCanonicalConversationState({ user, authSessionId, screenContext: currentScreen });
    const plan = resolveSemanticIntent({ message, user, conversationState: state, screenContext: state.screenContext });
    const pass = plan.scopeTarget === "CURRENT_SCREEN" && (plan.entities || []).length === 0 && !(plan.requestedDomains || []).includes("OFFERS");
    report(id, "Current authorized screen, without old SCREEN_RECORD/entity/domain", JSON.stringify({ family: plan.family, route: plan.conversationRoute, scope: plan.scopeTarget, domains: plan.requestedDomains, entities: plan.entities }), pass, false);
  }

  // 9–10. Server screen authorization remains a pre-state-read boundary.
  {
    const user = roomUser(981007);
    const authSessionId = scopedSession("screen-deny", user);
    let denied = null;
    try { await runCopilotFoundation({ intent: "CHAT_HELP", entityType: "screen", entityId: 0, user, screenContext: screen("/company", "Şirket"), message: "Bu program ne işe yarıyor?", authSessionId }); } catch (error) { denied = error.code; }
    report("CASE_09_DENY_REMAINS_DENY", "Foreign role screen remains denied before context read", String(denied), denied === "SCREEN_CONTEXT_NOT_AUTHORIZED");
    let unknown = null;
    try { await runCopilotFoundation({ intent: "CHAT_HELP", entityType: "screen", entityId: 0, user, screenContext: screen("/room/not-a-route", "Bilinmeyen"), message: "Bu program ne işe yarıyor?", authSessionId }); } catch (error) { unknown = error.code; }
    report("CASE_10_UNKNOWN_REMAINS_UNKNOWN", "Unknown screen remains denied before context read", String(unknown), unknown === "SCREEN_CONTEXT_NOT_AUTHORIZED");
  }

  // 11–13. Auth-scope keys keep saved state isolated across identity changes.
  {
    const original = roomUser(981008);
    const authSessionId = scopedSession("auth-scope", original);
    seedProductContext({ user: original, authSessionId, screenContext: screen("/room/offers", "Teklifler", "offer", 35) });
    const roleChanged = getCanonicalConversationState({ user: { ...original, role: "COMPANY", companyId: 1, roomId: null }, authSessionId, screenContext: null });
    report("CASE_11_ROLE_CHANGE_ISOLATES_CONTEXT", "Role change cannot read prior product context", JSON.stringify(roleChanged.authorizedProductContext), roleChanged.authorizedProductContext == null);
    const tenantChanged = getCanonicalConversationState({ user: { ...original, roomId: 2 }, authSessionId, screenContext: null });
    report("CASE_12_TENANT_CHANGE_ISOLATES_CONTEXT", "Tenant/room change cannot read prior product context", JSON.stringify(tenantChanged.authorizedProductContext), tenantChanged.authorizedProductContext == null);
    const sessionChanged = getCanonicalConversationState({ user: { ...original, sessionVersion: 2 }, authSessionId, screenContext: null });
    report("CASE_13_SESSION_CHANGE_ISOLATES_CONTEXT", "Session-version change cannot read prior product context", JSON.stringify(sessionChanged.authorizedProductContext), sessionChanged.authorizedProductContext == null);
  }

  // 14. An explicit return remains an authorization-gated semantic request.
  {
    const user = roomUser(981009);
    const authSessionId = scopedSession("explicit-return", user);
    seedProductContext({ user, authSessionId, screenContext: screen("/room/offers", "Teklifler", "offer", 35) });
    const state = getCanonicalConversationState({ user, authSessionId, screenContext: screen("/room/shifts", "Vardiyalar") });
    const plan = resolveSemanticIntent({ message: "Teklife geri dönelim", user, conversationState: state, screenContext: state.screenContext });
    const pass = plan.typedRequest?.taskType === "RETURN_TO_PRODUCT" && plan.entities?.some((entity) => entity.type === "offer" && entity.id === 35);
    report("CASE_14_EXPLICIT_RETURN_RETAINS_AUTHORIZED_REVALIDATION_PATH", "Explicit return creates a normal product request, not a generic bypass", JSON.stringify({ taskType: plan.typedRequest?.taskType, domains: plan.requestedDomains, entities: plan.entities, route: plan.conversationRoute }), pass);
  }
} finally {
  for (const { id: authSessionId, user } of sessions) {
    // The state owner is process-local. Cleanup prevents this check from
    // leaving a fixture scope within this Node process.
    clearCanonicalConversationState({ user, authSessionId });
  }
}

for (const item of cases) {
  process.stdout.write(`${item.pass ? "PASS" : "FAIL"} ${item.id}\n`);
  process.stdout.write(`  expected: ${item.expected}\n  actual: ${item.actual}\n`);
}
process.stdout.write(`GENERIC_PRODUCT_HELP_ACCEPTANCE_CASES=${cases.length}\n`);
process.stdout.write(`GENERIC_PRODUCT_HELP_ACCEPTANCE_PASS=${cases.length - failures.length}\n`);
process.stdout.write(`GENERIC_PRODUCT_HELP_ACCEPTANCE_FAIL=${failures.length}\n`);

if (failures.length) {
  process.exitCode = 1;
}
