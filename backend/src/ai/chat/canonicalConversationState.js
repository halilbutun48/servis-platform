const stateByAuthScope = new Map();
const lastIdentityBySession = new Map();
const authScopeVersionBySession = new Map();
const STATE_TTL_MS = 30 * 60 * 1000;
const MAX_SCOPES = 128;

function text(value) {
  return String(value || "").trim();
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function entityType(value) {
  const type = text(value).toLowerCase();
  if (["shift", "vardiya", "sefer"].includes(type)) return "shift";
  if (["vehicle", "arac", "araç"].includes(type)) return "vehicle";
  if (["driver", "surucu", "sürücü"].includes(type)) return "driver";
  if (["offer", "teklif", "rfq"].includes(type)) return "offer";
  if (["agreement", "sozlesme", "sözleşme", "contract"].includes(type)) return "agreement";
  // Keep semantic person types distinct in conversation state.  They share a
  // storage read model, but a follow-up must not turn a requested parent or
  // student into a generic personnel record before authorization/resolution.
  if (["parent", "veli", "ebeveyn"].includes(type)) return "parent";
  if (["student", "studentservice", "student_service", "ogrenci", "öğrenci"].includes(type)) return "student";
  if (["personnel", "personel", "calisan", "çalışan"].includes(type)) return "personnel";
  if (["organizationplan", "organization_plan", "plan"].includes(type)) return "organizationPlan";
  if (["servicerequest", "service_request", "pickuprequest", "pickup_request", "request"].includes(type)) return "serviceRequest";
  return "";
}

function normalizeEntity(value) {
  if (!value || typeof value !== "object") return null;
  const type = entityType(value.type || value.entityType);
  const id = numberOrNull(value.id || value.entityId);
  const plate = text(value.plate || value.vehiclePlate).toUpperCase();
  if (!type || (!id && !(type === "vehicle" && plate))) return null;
  return { type, ...(id ? { id } : { plate }), source: text(value.source) || "CONVERSATION_CONTEXT" };
}

function entityKey(entity) {
  if (!entity) return "";
  return `${entity.type}:${entity.id || entity.plate || ""}`;
}

function authStateForUser(user, authSessionId = "") {
  const role = text(user?.role).toUpperCase();
  const companyKind = text(user?.companyKind).toUpperCase();
  const sessionVersion = Number(user?.sessionVersion || 1);
  const identity = [
    numberOrNull(user?.id) || "anonymous",
    role,
    companyKind,
    numberOrNull(user?.companyId) || "none",
    numberOrNull(user?.roomId) || "none",
    Number.isFinite(sessionVersion) ? sessionVersion : 1,
    text(authSessionId) || "server-session",
  ].join("|");
  const sessionKey = text(authSessionId) || "server-session";
  const previousIdentity = lastIdentityBySession.get(sessionKey);
  if (previousIdentity && previousIdentity !== identity) stateByAuthScope.delete(previousIdentity);
  lastIdentityBySession.set(sessionKey, identity);
  const authScopeVersion = (authScopeVersionBySession.get(sessionKey) || 0) + (previousIdentity && previousIdentity !== identity ? 1 : 0);
  authScopeVersionBySession.set(sessionKey, authScopeVersion);
  return {
    identity,
    userId: numberOrNull(user?.id),
    role,
    companyKind,
    tenant: { companyId: numberOrNull(user?.companyId), roomId: numberOrNull(user?.roomId) },
    sessionVersion: Number.isFinite(sessionVersion) ? sessionVersion : 1,
    authScopeVersion,
  };
}

function scopeKey(authState) {
  return authState.identity;
}

function safeScreenContext(screenContext, user) {
  const selected = normalizeEntity({
    type: screenContext?.selectedEntityType,
    id: screenContext?.selectedEntityId,
  });
  const selectedRelated = normalizeEntity({
    type: screenContext?.selectedRelatedEntityType,
    id: screenContext?.selectedRelatedEntityId,
  });
  const selectedEntitySet = Array.isArray(screenContext?.selectedEntitySet)
    ? screenContext.selectedEntitySet.map(normalizeEntity).filter(Boolean)
    : selected ? [selected] : [];
  const uniqueSelectedEntitySet = selectedEntitySet.filter((entity, index, list) => list.findIndex((item) => entityKey(item) === entityKey(entity)) === index).slice(0, 20);
  return {
    id: numberOrNull(screenContext?.id),
    path: text(screenContext?.path),
    label: text(screenContext?.label),
    // Keep only a user-visible current-screen summary. This is not a record
    // projection and does not alter authorization; it lets a role-scoped
    // zero-state answer remain anchored to the screen the user can see.
    contextSummary: text(screenContext?.contextSummary || screenContext?.structuredFacts?.contextSummary || screenContext?.liveFacts?.contextSummary),
    role: text(user?.role).toUpperCase(),
    companyKind: text(user?.companyKind).toUpperCase(),
    selectedEntity: selected,
    selectedEntityType: selected?.type || "",
    selectedEntityId: selected?.id || null,
    selectedRelatedEntity: selectedRelated,
    selectedRelatedEntityType: selectedRelated?.type || "",
    selectedRelatedEntityId: selectedRelated?.id || null,
    selectedLabel: text(screenContext?.selectedLabel || screenContext?.selectedRecordLabel),
    selectedEntitySet: uniqueSelectedEntitySet,
    // UI labels and controls are hints. Protected facts never cross the
    // client/server boundary as authoritative screen evidence.
    uiHints: screenContext?.uiHints && typeof screenContext.uiHints === "object"
      ? {
        drawerMode: text(screenContext.uiHints.drawerMode),
        activeTabs: Array.isArray(screenContext.uiHints.activeTabs)
          ? screenContext.uiHints.activeTabs.slice(0, 16).map((row) => typeof row === "string" ? text(row) : {
            label: text(row?.label),
            targetKey: text(row?.targetKey || row?.semanticKey || row?.copilotTarget),
            semanticType: text(row?.semanticType) || "tab",
          }).filter((row) => typeof row === "string" ? Boolean(row) : Boolean(row.label))
          : [],
        visibleButtons: Array.isArray(screenContext.uiHints.visibleButtons) ? screenContext.uiHints.visibleButtons.slice(0, 48).map((row) => ({
          label: text(row?.label),
          targetKey: text(row?.targetKey || row?.semanticKey || row?.copilotTarget),
          semanticType: text(row?.semanticType) || "button",
          disabled: Boolean(row?.disabled),
        })).filter((row) => row.label) : [],
        disabledButtons: Array.isArray(screenContext.uiHints.disabledButtons) ? screenContext.uiHints.disabledButtons.slice(0, 16).map((row) => ({
          label: text(row?.label),
          targetKey: text(row?.targetKey || row?.semanticKey || row?.copilotTarget),
          semanticType: text(row?.semanticType) || "button",
          disabled: true,
        })).filter((row) => row.label) : [],
        tableHeaders: Array.isArray(screenContext.uiHints.tableHeaders) ? screenContext.uiHints.tableHeaders.slice(0, 16).map((row) => typeof row === "string" ? text(row) : { label: text(row?.label), semanticType: "field" }).filter((row) => typeof row === "string" ? Boolean(row) : Boolean(row.label)) : [],
        modalTitles: Array.isArray(screenContext.uiHints.modalTitles) ? screenContext.uiHints.modalTitles.slice(0, 8).map((row) => typeof row === "string" ? text(row) : { label: text(row?.label), semanticType: "modal" }).filter((row) => typeof row === "string" ? Boolean(row) : Boolean(row.label)) : [],
        pageTitles: Array.isArray(screenContext.uiHints.pageTitles) ? screenContext.uiHints.pageTitles.slice(0, 8).map((row) => typeof row === "string" ? text(row) : { label: text(row?.label), semanticType: "section" }).filter((row) => typeof row === "string" ? Boolean(row) : Boolean(row.label)) : [],
      }
      : {},
  };
}

function emptyState(authState, screenContext) {
  return {
    authState,
    dialogueState: { route: "", topic: "", phase: "PRODUCT_ACTIVE", suspendedProduct: false, recentMessages: [] },
    productContext: { semanticPlan: null, screenPath: null, suspended: false },
    activeDomain: "",
    activeEntitySet: [],
    activeComparisonSet: [],
    activeReasoningEntitySet: [],
    lastExplicitEntitySet: [],
    // This register is intentionally independent of current UI selection.
    // A route change clears the latter, while a later named discourse request
    // may still resolve one unique same-auth record.
    uniqueDiscourseReferent: null,
    lastProductTask: "",
    suspendedProductContext: null,
    lastSettledResult: null,
    activeGuidedTask: null,
    guidedTarget: null,
    authScopeVersion: authState.authScopeVersion,
    entityContext: { conversationEntities: [], selectedEntity: screenContext.selectedEntity, selectedRelatedEntity: screenContext.selectedRelatedEntity, referentConfidence: 0 },
    screenContext,
    requestState: null,
  };
}

function cloneState(state) {
  return state ? JSON.parse(JSON.stringify(state)) : null;
}

function prune() {
  const cutoff = Date.now() - STATE_TTL_MS;
  for (const [key, value] of stateByAuthScope.entries()) {
    if (Number(value?.updatedAt || 0) < cutoff) stateByAuthScope.delete(key);
  }
  while (stateByAuthScope.size > MAX_SCOPES) stateByAuthScope.delete(stateByAuthScope.keys().next().value);
}

export function getCanonicalAuthState(user, authSessionId = "") {
  return authStateForUser(user, authSessionId);
}

export function getCanonicalConversationState({ user, screenContext, authSessionId = "" } = {}) {
  prune();
  const authState = authStateForUser(user, authSessionId);
  const safeScreen = safeScreenContext(screenContext, user);
  const stored = cloneState(stateByAuthScope.get(scopeKey(authState))) || emptyState(authState, safeScreen);
  // A screen payload is authoritative for the current turn. A missing
  // selection means there is no selected record; never carry the previous
  // record through an unselected route.
  const selectedEntity = safeScreen.selectedEntity || null;
  const conversationEntities = Array.isArray(stored.entityContext?.conversationEntities)
    ? stored.entityContext.conversationEntities.map(normalizeEntity).filter(Boolean)
    : [];
  const activeComparisonSet = Array.isArray(stored.activeComparisonSet)
    ? stored.activeComparisonSet.map(normalizeEntity).filter(Boolean)
    : [];
  const recentMessages = Array.isArray(stored.dialogueState?.recentMessages) ? stored.dialogueState.recentMessages.slice(-12) : [];
  return {
    authState,
    dialogueState: { ...(stored.dialogueState || {}), recentMessages },
    productContext: stored.productContext || { semanticPlan: null, screenPath: safeScreen.path, suspended: false },
    entityContext: { conversationEntities, selectedEntity, selectedRelatedEntity: safeScreen.selectedRelatedEntity || null, referentConfidence: Number(stored.entityContext?.referentConfidence || 0) },
    screenContext: safeScreen,
    requestState: null,
    activeDomain: text(stored.activeDomain || stored.productContext?.semanticPlan?.requestedDomains?.[0]),
    activeEntitySet: activeComparisonSet.length ? activeComparisonSet : conversationEntities,
    activeComparisonSet,
    activeReasoningEntitySet: Array.isArray(stored.activeReasoningEntitySet)
      ? stored.activeReasoningEntitySet.map(normalizeEntity).filter(Boolean)
      : [],
    selectedEntitySet: safeScreen.selectedEntitySet || [],
    lastExplicitEntitySet: Array.isArray(stored.lastExplicitEntitySet) ? stored.lastExplicitEntitySet.map(normalizeEntity).filter(Boolean) : [],
    uniqueDiscourseReferent: normalizeEntity(stored.uniqueDiscourseReferent),
    lastProductTask: text(stored.lastProductTask || stored.productContext?.semanticPlan?.family),
    suspendedProductContext: stored.suspendedProductContext || null,
    lastSettledResult: stored.lastSettledResult || null,
    activeGuidedTask: stored.activeGuidedTask || null,
    guidedTarget: stored.guidedTarget || null,
    authScopeVersion: authState.authScopeVersion,
    // Compatibility projection for the existing planner. These values are
    // server-owned and never copied from the request body.
    recentMessages,
    lastSemanticPlan: stored.productContext?.semanticPlan || null,
    lastProductSemanticPlan: stored.productContext?.semanticPlan || null,
    authorizedProductContext: stored.productContext?.semanticPlan ? { semanticPlan: stored.productContext.semanticPlan, screenPath: stored.productContext.screenPath || null } : null,
    selectedEntityId: selectedEntity?.id || null,
    selectedEntityType: selectedEntity?.type || "",
    selectedRelatedEntity: safeScreen.selectedRelatedEntity || null,
    selectedRelatedEntityId: safeScreen.selectedRelatedEntity?.id || null,
    selectedRelatedEntityType: safeScreen.selectedRelatedEntity?.type || "",
  };
}

export function commitCanonicalConversationState({ user, screenContext, message, payload, authSessionId = "" } = {}) {
  const current = getCanonicalConversationState({ user, screenContext, authSessionId });
  const plan = payload?.semanticPlan && typeof payload.semanticPlan === "object" ? payload.semanticPlan : null;
  const route = text(payload?.conversationRoute || plan?.conversationRoute);
  const temporaryLeave = Boolean(plan?.suspendProductContext)
    || ["OFF_TOPIC_SAFE", "GENERAL_KNOWLEDGE", "LIVE_EXTERNAL_DATA"].includes(route);
  const returnToProduct = plan?.typedRequest?.taskType === "RETURN_TO_PRODUCT" || plan?.family === "RETURN_TO_PRODUCT";
  const productPlan = plan?.dialogueTopic === "PRODUCT"
    && !["AUTHORIZATION_NEGATIVE", "AUTHORIZATION_BOUNDARY"].includes(plan?.conversationRoute)
    && !["AUTHORIZATION_BOUNDARY", "FIELD_PRIVACY_BOUNDARY"].includes(plan?.family)
    && plan?.planStatus !== "UNAUTHORIZED"
    ? plan
    : null;
  const presentationOperation = ["STYLE", "CONTINUE_CURRENT_REASONING"].includes(productPlan?.family);
  const retainedProductPlan = productPlan?.family === "STYLE"
    ? productPlan.styleTargetPlan || current.productContext?.semanticPlan || null
    : productPlan?.family === "CONTINUE_CURRENT_REASONING"
      ? productPlan.continuationBasePlan || current.productContext?.semanticPlan || null
      : productPlan;
  const guidedTaskPlan = productPlan?.family === "UI_GUIDANCE"
    ? productPlan
    : productPlan?.family === "CONTINUE_CURRENT_REASONING" && productPlan?.continuationBasePlan?.family === "UI_GUIDANCE"
      ? productPlan.continuationBasePlan
      : null;
  const activeGuidedTask = guidedTaskPlan
    ? {
      semanticPlan: guidedTaskPlan,
      screenPath: text(screenContext?.path),
      continuationDepth: productPlan?.family === "CONTINUE_CURRENT_REASONING"
        ? Number(productPlan.continuationDepth || 1)
        : 0,
    }
    : current.activeGuidedTask || null;
  const planEntities = Array.isArray(plan?.entities) ? plan.entities.map(normalizeEntity).filter(Boolean) : [];
  const entity = planEntities.length ? planEntities : plan?.entity ? [normalizeEntity(plan.entity)].filter(Boolean) : [];
  // A relationship lookup may resolve both its source and related target.
  // The source remains the last explicit discourse subject; otherwise a later
  // "konuştuğumuz kayıt" field lookup would become needlessly ambiguous.
  const relationSubject = productPlan?.family === "RELATION_LOOKUP"
    ? normalizeEntity(productPlan.entity)
    : null;
  const safeScreen = safeScreenContext(screenContext, user);
  const explicitSingleRecord = !presentationOperation
    && entity.length === 1
    && ["EXPLICIT_QUERY", "SCREEN_RECORD", "SELECTED_RECORD"].includes(String(entity[0]?.source || "").toUpperCase());
  // This is a discourse subject, not a synthetic current UI selection.  It
  // survives same-auth route changes and is reset naturally with the auth
  // scope state.  A multi-entity comparison is intentionally never promoted
  // to a singular discourse referent.
  const nextUniqueDiscourseReferent = presentationOperation
    ? current.uniqueDiscourseReferent || null
    : explicitSingleRecord
      ? entity[0]
      : relationSubject || current.uniqueDiscourseReferent || null;
  const nextActiveComparisonSet = productPlan?.comparisonSpec?.kind === "ENTITY_COMPARISON" && entity.length > 1
    ? entity
    : productPlan?.family === "RELATION_LOOKUP"
      ? []
      : explicitSingleRecord
        ? []
      : (current.activeComparisonSet || []);
  const priorReasoningEntitySet = Array.isArray(current.activeReasoningEntitySet) && current.activeReasoningEntitySet.length
    ? current.activeReasoningEntitySet
    : Array.isArray(current.activeComparisonSet) ? current.activeComparisonSet : [];
  const reasoningFamilies = new Set(["COMPARISON", "RISK_RANKING", "PRIORITY", "CAUSE_WHY"]);
  const nextActiveReasoningEntitySet = productPlan?.family === "STYLE"
    ? priorReasoningEntitySet
    : explicitSingleRecord
      ? []
    : reasoningFamilies.has(productPlan?.family) && entity.length > 1
      ? entity
      : reasoningFamilies.has(productPlan?.family) && current.activeComparisonSet?.length > 1
        ? current.activeComparisonSet
        : priorReasoningEntitySet;
  const recentMessages = [
    ...(current.recentMessages || []),
    ...(message ? [{ role: "user", text: text(message) }] : []),
    ...(payload?.reply ? [{ role: "assistant", text: text(payload.reply), semanticPlan: plan }] : []),
  ].slice(-12);
  const next = {
    authState: current.authState,
    dialogueState: {
      route,
      topic: text(payload?.dialogueTopic || plan?.dialogueTopic),
      phase: returnToProduct ? "PRODUCT_ACTIVE" : temporaryLeave ? "PRODUCT_SUSPENDED" : "PRODUCT_ACTIVE",
      suspendedProduct: temporaryLeave,
      recentMessages,
    },
    productContext: retainedProductPlan
      ? { semanticPlan: retainedProductPlan, screenPath: text(screenContext?.path), suspended: false }
      : { ...(current.productContext || {}), suspended: temporaryLeave },
    lastSettledResult: productPlan && payload?.reply
      ? {
        authScopeVersion: current.authScopeVersion,
        reply: text(payload.reply),
        summary: text(payload.summary || payload.reply),
        semanticPlan: productPlan,
        authorizedRecords: Array.isArray(payload.authorizedRecords) ? payload.authorizedRecords.slice(0, 16) : [],
        retrievedFacts: Array.isArray(payload.retrievedFacts) ? payload.retrievedFacts.slice(0, 24) : [],
        reasoning: text(payload.reasoning),
        nextAction: text(payload.nextAction || payload.safeNextStep),
        reasoningEntitySet: nextActiveReasoningEntitySet.slice(0, 16),
        domain: text(payload.authorizedDomain || payload.authorizedDomainMap?.[0]),
        // Presentation operations must remain reversible transformations of
        // the last grounded result. Retaining this source prevents a later
        // "biraz aç" from expanding an already-shortened sentence instead of
        // the underlying authorized answer.
        presentationSource: presentationOperation
          ? current.lastSettledResult?.presentationSource || current.lastSettledResult || null
          : null,
      }
      : current.lastSettledResult || null,
    activeGuidedTask,
    guidedTarget: payload?.guidedTarget
      ? payload.guidedTarget
      : (current.guidedTarget && safeScreen.path === current.guidedTarget.screenPath ? current.guidedTarget : null),
    entityContext: {
      conversationEntities: presentationOperation && !entity.length ? current.entityContext?.conversationEntities || [] : entity,
      selectedEntity: safeScreen.selectedEntity || null,
      selectedRelatedEntity: safeScreen.selectedRelatedEntity || null,
      referentConfidence: entity.length === 1 ? 0.9 : entity.length > 1 ? 0.4 : 0,
    },
    activeDomain: text(productPlan?.requestedDomains?.[0] || current.activeDomain),
    activeEntitySet: presentationOperation && !entity.length ? current.activeEntitySet || [] : entity,
    activeComparisonSet: nextActiveComparisonSet,
    activeReasoningEntitySet: nextActiveReasoningEntitySet,
    lastExplicitEntitySet: presentationOperation
      ? current.lastExplicitEntitySet || []
      : relationSubject ? [relationSubject] : entity.length ? entity : current.lastExplicitEntitySet || [],
    uniqueDiscourseReferent: nextUniqueDiscourseReferent,
    lastProductTask: text(productPlan?.styleTargetFamily || productPlan?.family || current.lastProductTask),
    suspendedProductContext: temporaryLeave
      ? current.productContext || null
      : returnToProduct ? null : current.suspendedProductContext || null,
    authScopeVersion: current.authState.authScopeVersion,
    screenContext: safeScreen,
    requestState: plan ? {
      requestedEntitySet: entity,
      requestedFields: plan.requestedFields || [],
      requestedDomains: plan.requestedDomains || [],
      reasoningTask: plan.family || "",
      comparisonSpec: plan.comparisonSpec || null,
      outputStyle: plan.answerMode || "SUMMARY",
    } : null,
    updatedAt: Date.now(),
  };
  stateByAuthScope.set(scopeKey(current.authState), next);
  prune();
  return payload;
}

export function clearCanonicalConversationState(user, authSessionId = "") {
  stateByAuthScope.delete(scopeKey(authStateForUser(user, authSessionId)));
}

export function canonicalStateKey(user, authSessionId = "") {
  return scopeKey(authStateForUser(user, authSessionId));
}
