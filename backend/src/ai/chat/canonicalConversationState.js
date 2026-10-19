import { createHash } from 'node:crypto';

const stateByAuthScope = new Map();
const lastIdentityBySession = new Map();
const authScopeVersionBySession = new Map();
const STATE_TTL_MS = 30 * 60 * 1000;
const MAX_SCOPES = 128;
const ANALYTIC_STEP_FAMILIES = new Set(['RISK_RANKING', 'COMPARISON', 'PRIORITY', 'CAUSE_WHY']);

function text(value) {
  return String(value || "").trim();
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function factsFingerprint(values) {
  return createHash('sha256')
    .update(JSON.stringify(Array.isArray(values) ? values : []))
    .digest('hex');
}

function analyticBaseFamily(plan) {
  const family = String(plan?.family || '').trim();
  const continuationFamily = String(plan?.continuationBasePlan?.family || '').trim();
  return ANALYTIC_STEP_FAMILIES.has(family)
    ? family
    : ANALYTIC_STEP_FAMILIES.has(continuationFamily)
      ? continuationFamily
      : '';
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
  const rawWorkflowState = screenContext?.uiHints?.workflowState && typeof screenContext.uiHints.workflowState === "object"
    ? screenContext.uiHints.workflowState
    : null;
  const workflowState = rawWorkflowState
    ? {
      workflowId: text(rawWorkflowState.workflowId || rawWorkflowState.id),
      activeStepOrdinal: numberOrNull(rawWorkflowState.activeStepOrdinal),
      completedThroughOrdinal: numberOrNull(rawWorkflowState.completedThroughOrdinal),
      currentTargetKey: text(rawWorkflowState.currentTargetKey),
      currentTargetLabel: text(rawWorkflowState.currentTargetLabel),
      source: text(rawWorkflowState.source || "LIVE_UI"),
    }
    : null;
  // A browser can retain the currently highlighted canonical target while a
  // fresh auth session has no server conversation state yet. Carry only the
  // target identity envelope as a hint; the server-side guided resolver still
  // proves the exact target against the authorized live surface.
  const rawCurrentTarget = screenContext?.uiHints?.currentTarget && typeof screenContext.uiHints.currentTarget === "object"
    ? screenContext.uiHints.currentTarget
    : null;
  const currentTarget = rawCurrentTarget
    ? {
      status: text(rawCurrentTarget.status),
      targetKind: text(rawCurrentTarget.targetKind).toUpperCase() || "CONTROL",
      targetKey: text(rawCurrentTarget.targetKey),
      semanticId: text(rawCurrentTarget.semanticId),
      blockKey: text(rawCurrentTarget.blockKey),
      label: text(rawCurrentTarget.label),
      semanticType: text(rawCurrentTarget.semanticType),
      screenPath: text(rawCurrentTarget.screenPath),
      role: text(rawCurrentTarget.role).toUpperCase(),
    }
    : null;
  // Preserve only bounded, user-visible selection facts for contextual
  // explanation. These hints do not grant access or replace server-owned
  // authorization/evidence checks.
  const safeSelectedFields = Array.isArray(screenContext?.selectedFields)
    ? screenContext.selectedFields.slice(0, 24).map((row) => ({
      label: text(row?.label),
      value: text(row?.value),
    })).filter((row) => row.label)
    : [];
  const safeSelectedBadges = Array.isArray(screenContext?.selectedBadges)
    ? screenContext.selectedBadges.slice(0, 16).map((row) => ({
      label: text(row?.label),
      value: text(row?.value),
    })).filter((row) => row.label)
    : [];
  const rawFacts = screenContext?.structuredFacts && typeof screenContext.structuredFacts === "object"
    ? screenContext.structuredFacts
    : null;
  const safeStructuredFacts = rawFacts
    ? {
      screenType: text(rawFacts.screenType),
      activeTab: text(rawFacts.activeTab),
      reasoningLead: text(rawFacts.reasoningLead),
      nextBestAction: text(rawFacts.nextBestAction),
      selectedRecordStatus: text(rawFacts.selectedRecordStatus),
      selectedRecordType: text(rawFacts.selectedRecordType),
      selectedRecordLabel: text(rawFacts.selectedRecordLabel),
      kvkkAccess: rawFacts.kvkkAccess && typeof rawFacts.kvkkAccess === "object"
        ? {
          requiredCount: Math.max(0, Number(rawFacts.kvkkAccess.requiredCount || 0) || 0),
          acceptedCount: Math.max(0, Number(rawFacts.kvkkAccess.acceptedCount || 0) || 0),
          blocking: Boolean(rawFacts.kvkkAccess.blocking),
        }
        : null,
      missing: Array.isArray(rawFacts.missing)
        ? rawFacts.missing.slice(0, 12).map((value) => text(value)).filter(Boolean)
        : [],
      blockers: Array.isArray(rawFacts.blockers)
        ? rawFacts.blockers.slice(0, 12).map((value) => text(value)).filter(Boolean)
        : [],
      evidence: Array.isArray(rawFacts.evidence)
        ? rawFacts.evidence.slice(0, 12).map((value) => text(value)).filter(Boolean)
        : [],
    }
    : null;
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
    selectedFields: safeSelectedFields,
    selectedBadges: safeSelectedBadges,
    structuredFacts: safeStructuredFacts,
    // UI labels, controls and bounded display facts are hints. They never
    // cross the client/server boundary as authoritative screen evidence.
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
          identitySource: text(row?.identitySource) || "LEGACY_LABEL",
          disabled: Boolean(row?.disabled),
        })).filter((row) => row.label) : [],
        visibleMenus: Array.isArray(screenContext.uiHints.visibleMenus) ? screenContext.uiHints.visibleMenus.slice(0, 48).map((row) => ({
          label: text(row?.label),
          targetKey: text(row?.targetKey || row?.semanticKey || row?.copilotTarget),
          semanticType: text(row?.semanticType) || "button",
          identitySource: text(row?.identitySource) || "LEGACY_LABEL",
        })).filter((row) => row.label) : [],
        disabledButtons: Array.isArray(screenContext.uiHints.disabledButtons) ? screenContext.uiHints.disabledButtons.slice(0, 16).map((row) => ({
          label: text(row?.label),
          targetKey: text(row?.targetKey || row?.semanticKey || row?.copilotTarget),
          semanticType: text(row?.semanticType) || "button",
          identitySource: text(row?.identitySource) || "LEGACY_LABEL",
          disabled: true,
        })).filter((row) => row.label) : [],
        tableHeaders: Array.isArray(screenContext.uiHints.tableHeaders) ? screenContext.uiHints.tableHeaders.slice(0, 16).map((row) => typeof row === "string" ? text(row) : { label: text(row?.label), semanticType: "field" }).filter((row) => typeof row === "string" ? Boolean(row) : Boolean(row.label)) : [],
        modalTitles: Array.isArray(screenContext.uiHints.modalTitles) ? screenContext.uiHints.modalTitles.slice(0, 8).map((row) => typeof row === "string" ? text(row) : { label: text(row?.label), semanticType: "modal" }).filter((row) => typeof row === "string" ? Boolean(row) : Boolean(row.label)) : [],
        pageTitles: Array.isArray(screenContext.uiHints.pageTitles) ? screenContext.uiHints.pageTitles.slice(0, 8).map((row) => typeof row === "string" ? text(row) : { label: text(row?.label), semanticType: "section" }).filter((row) => typeof row === "string" ? Boolean(row) : Boolean(row.label)) : [],
        semanticElements: Array.isArray(screenContext.uiHints.semanticElements)
          ? screenContext.uiHints.semanticElements.slice(0, 160).map((row) => ({
            semanticType: text(row?.semanticType || row?.type) || "element",
            label: text(row?.label),
            targetKey: text(row?.targetKey || row?.semanticKey || row?.copilotTarget),
            semanticId: text(row?.semanticId),
            identitySource: text(row?.identitySource) || "LEGACY_LABEL",
            required: Boolean(row?.required),
            expanded: typeof row?.expanded === "boolean" ? row.expanded : null,
            invalid: Boolean(row?.invalid),
            source: text(row?.source || "LIVE_UI"),
          })).filter((row) => row.label)
          : [],
        semanticBlocks: Array.isArray(screenContext.uiHints.semanticBlocks)
          ? screenContext.uiHints.semanticBlocks.slice(0, 48).map((row) => ({
            semanticId: text(row?.semanticId),
            blockKey: text(row?.blockKey || row?.targetKey),
            label: text(row?.label),
            order: Number(row?.order || 0) || 0,
            controlSemanticIds: Array.isArray(row?.controlSemanticIds) ? row.controlSemanticIds.map((value) => text(value)).filter(Boolean).slice(0, 32) : [],
            source: text(row?.source || "LIVE_UI"),
          })).filter((row) => row.label && (row.blockKey || row.semanticId))
          : [],
        filterStates: Array.isArray(screenContext.uiHints.filterStates)
          ? screenContext.uiHints.filterStates.slice(0, 8).map((row) => ({
            scope: text(row?.scope),
            value: text(row?.value),
            visibleCount: Math.max(0, Number(row?.visibleCount || 0) || 0),
            totalCount: Math.max(0, Number(row?.totalCount || 0) || 0),
            clearTargetKey: text(row?.clearTargetKey),
            source: text(row?.source || "LIVE_UI"),
          })).filter((row) => row.scope && row.clearTargetKey)
          : [],
        workflowState,
        currentTarget,
        guidedDraftAvailability: screenContext.uiHints.guidedDraftAvailability && typeof screenContext.uiHints.guidedDraftAvailability === "object"
          ? {
            state: text(screenContext.uiHints.guidedDraftAvailability.state || "UNKNOWN").toUpperCase(),
            count: Math.max(0, Number(screenContext.uiHints.guidedDraftAvailability.count || 0) || 0),
            maxResumeStep: numberOrNull(screenContext.uiHints.guidedDraftAvailability.maxResumeStep),
            source: text(screenContext.uiHints.guidedDraftAvailability.source || "SERVER_GUIDED_DRAFTS"),
          }
          : null,
        foregroundSurface: screenContext.uiHints.foregroundSurface && typeof screenContext.uiHints.foregroundSurface === "object"
          ? {
            key: text(screenContext.uiHints.foregroundSurface.key),
            kind: text(screenContext.uiHints.foregroundSurface.kind).toUpperCase(),
            source: text(screenContext.uiHints.foregroundSurface.source || "LIVE_UI"),
          }
          : null,
      }
      : {},
  };
}

function liveAgreementDetailsTarget(screenContext, user, plan) {
  const path = text(screenContext?.path);
  const selectedType = entityType(screenContext?.selectedEntityType);
  const selectedId = numberOrNull(screenContext?.selectedEntityId || screenContext?.selectedRecordId);
  const family = text(plan?.family).toUpperCase();
  if (path !== '/room/agreements' || selectedType !== 'agreement' || !selectedId
    || !['RECORD_DETAILS', 'UI_GUIDANCE', 'EXPLAIN_CURRENT_TARGET'].includes(family)) return null;
  const hints = screenContext?.uiHints && typeof screenContext.uiHints === 'object' ? screenContext.uiHints : {};
  const rows = [
    ...(Array.isArray(hints.visibleButtons) ? hints.visibleButtons : []),
    ...(Array.isArray(hints.visibleMenus) ? hints.visibleMenus : []),
    ...(Array.isArray(hints.semanticElements) ? hints.semanticElements : []),
  ];
  const targetKey = `room:agreements:agreement:${selectedId}:operation-bridge`;
  const row = rows.find((candidate) => String(candidate?.targetKey || candidate?.semanticKey || candidate?.copilotTarget || '').trim() === targetKey)
    || rows.find((candidate) => /kanıtlar|ayrıntılar|ayrintilar/iu.test(text(candidate?.label)));
  if (!row) return null;
  const semanticId = text(row?.semanticId) || `product:room:agreement:${selectedId}:operation-bridge`;
  const label = text(row?.label) || 'Kanıtlar ve ayrıntılar';
  return {
    status: 'FOUND',
    targetKind: 'CONTROL',
    targetKey,
    semanticId,
    label,
    semanticType: text(row?.semanticType) || 'button',
    screenPath: path,
    role: text(user?.role).toUpperCase(),
    authorizedContext: { role: text(user?.role).toUpperCase(), screenPath: path, agreementId: selectedId },
    safeAction: 'HIGHLIGHT',
    anchor: { targetKind: 'CONTROL', targetKey, semanticId, recordType: 'AGREEMENT', recordId: selectedId },
    locator: { targetKind: 'CONTROL', targetKey, semanticId, label, semanticType: text(row?.semanticType) || 'button' },
    callout: { targetKind: 'CONTROL', targetKey, semanticId, label, identitySource: 'CANONICAL' },
    criticalActionExecution: false,
    reason: 'Seçili ve yetkili sözleşme ayrıntı hedefi canlı yüzeyde doğrulandı.',
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
    // Bounded same-auth record history supports explicit previous-record
    // discourse without changing the live selection or authorization scope.
    recentEntityHistory: [],
    lastProductTask: "",
    suspendedProductContext: null,
    lastSettledResult: null,
    productTeachingState: null,
    activeGuidedTask: null,
    guidedTarget: null,
    // Bounded, same-auth presentation/task history. This is deliberately
    // separate from record history: it stores only previously verified
    // product targets so BACK can restore a real prior UI step without
    // inventing a record or crossing an authorization scope.
    conversationStepHistory: [],
    conversationForwardStep: null,
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
  const previousScreen = stored.screenContext && typeof stored.screenContext === "object"
    ? stored.screenContext
    : null;
  return {
    authState,
    dialogueState: { ...(stored.dialogueState || {}), recentMessages },
    productContext: stored.productContext || { semanticPlan: null, screenPath: safeScreen.path, suspended: false },
    entityContext: { conversationEntities, selectedEntity, selectedRelatedEntity: safeScreen.selectedRelatedEntity || null, referentConfidence: Number(stored.entityContext?.referentConfidence || 0) },
    screenContext: safeScreen,
    // Keep the prior committed surface separate from the live surface. The
    // semantic context uses this only to suppress stale history after a
    // route transition; it is never an authorization or record grant.
    lastScreenPath: text(previousScreen?.path) || null,
    lastScreenLabel: text(previousScreen?.label) || null,
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
    recentEntityHistory: Array.isArray(stored.recentEntityHistory)
      ? stored.recentEntityHistory.map(normalizeEntity).filter(Boolean).slice(0, 8)
      : [],
    lastProductTask: text(stored.lastProductTask || stored.productContext?.semanticPlan?.family),
    suspendedProductContext: stored.suspendedProductContext || null,
    lastSettledResult: stored.lastSettledResult || null,
    productTeachingState: stored.productTeachingState || null,
    activeGuidedTask: stored.activeGuidedTask || null,
    guidedTarget: stored.guidedTarget || null,
    conversationStepHistory: Array.isArray(stored.conversationStepHistory)
      ? stored.conversationStepHistory.slice(0, 8)
      : [],
    conversationForwardStep: stored.conversationForwardStep || null,
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
  const roomCapabilityBoundaryGuidance = plan?.family === "UI_GUIDANCE"
    && String(plan?.workflowIntent || "").toUpperCase() === "OPEN_SHIFT_SURFACE"
    && String(plan?.roleCapabilityBoundary || "").toUpperCase() === "ROOM_CREATE_UNSUPPORTED"
    && String(current.authState?.role || "").toUpperCase() === "ROOM";
  const retainsHelpContext = ["GENERIC_PRODUCT_HELP", "ROLE_EXPLANATION_HELP"].includes(String(plan?.family || ""))
    || route === "GENERIC_PRODUCT_HELP";
  const productPlan = (plan?.dialogueTopic === "PRODUCT" || retainsHelpContext || roomCapabilityBoundaryGuidance)
    && !["AUTHORIZATION_NEGATIVE", "AUTHORIZATION_BOUNDARY"].includes(plan?.conversationRoute)
    && !["AUTHORIZATION_BOUNDARY", "FIELD_PRIVACY_BOUNDARY"].includes(plan?.family)
    && plan?.planStatus !== "UNAUTHORIZED"
    ? plan
    : null;
  const presentationOperation = ["STYLE", "CONTINUE_CURRENT_REASONING", "EXPLAIN_CURRENT_TARGET"].includes(productPlan?.family);
  const nonSettlingTargetExplanation = productPlan?.family === "EXPLAIN_CURRENT_TARGET";
  const retainedProductPlan = productPlan?.family === "STYLE"
    ? productPlan.styleTargetPlan || current.productContext?.semanticPlan || null
    : productPlan?.family === "CONTINUE_CURRENT_REASONING"
      ? productPlan.continuationBasePlan || current.productContext?.semanticPlan || null
      : productPlan;
  const productTeachingTurn = ["GENERIC_PRODUCT_HELP", "ROLE_EXPLANATION_HELP"].includes(String(productPlan?.family || ""))
    || (productPlan?.family === "CONTINUE_CURRENT_REASONING"
      && ["GENERIC_PRODUCT_HELP", "ROLE_EXPLANATION_HELP"].includes(String(productPlan?.continuationBasePlan?.family || "")));
  const productTeachingState = productTeachingTurn
    ? (payload?.teachingState || current.productTeachingState || null)
    : ["SCREEN_CONTEXT", "UI_GUIDANCE", "EXPLAIN_CURRENT_TARGET"].includes(String(productPlan?.family || ""))
      ? null
      : current.productTeachingState || null;
  const guidedTaskPlan = productPlan?.family === "UI_GUIDANCE"
    ? productPlan
    : productPlan?.family === "CONTINUE_CURRENT_REASONING" && productPlan?.continuationBasePlan?.family === "UI_GUIDANCE"
      ? productPlan.continuationBasePlan
      : null;
  const workflowProgressPlan = productPlan?.family === "CONTINUE_CURRENT_REASONING"
    && productPlan?.continuationBasePlan?.workflowIntent === "CREATE_SHIFT"
    ? {
      ...guidedTaskPlan,
      workflowIntent: productPlan.continuationBasePlan.workflowIntent,
      workflowModel: productPlan.workflowModel || productPlan.continuationBasePlan.workflowModel || guidedTaskPlan?.workflowModel || null,
      workflowStepReference: productPlan.workflowStepReference || guidedTaskPlan?.workflowStepReference || null,
      workflowStepOrdinal: productPlan.workflowStepOrdinal || guidedTaskPlan?.workflowStepOrdinal || null,
      workflowProgression: productPlan.workflowProgression || null,
    }
    : productPlan?.family === "EXPLAIN_CURRENT_TARGET"
      && productPlan?.workflowIntent === "CREATE_SHIFT"
      ? {
        ...(current.activeGuidedTask?.semanticPlan || guidedTaskPlan || productPlan),
        workflowIntent: "CREATE_SHIFT",
        workflowModel: productPlan.workflowModel || current.activeGuidedTask?.semanticPlan?.workflowModel || null,
        // An ordinal mentioned while asking for an explanation is a
        // presentation target. It is not evidence that the active guided
        // task completed or moved. Keep the last verified task step as the
        // coordination authority; only a continuation plan with live UI
        // completion evidence may advance it.
        workflowStepReference: current.activeGuidedTask?.semanticPlan?.workflowStepReference
          || guidedTaskPlan?.workflowStepReference
          || productPlan.workflowStepReference
          || null,
        workflowStepOrdinal: current.activeGuidedTask?.semanticPlan?.workflowStepOrdinal
          || guidedTaskPlan?.workflowStepOrdinal
          || productPlan.workflowStepOrdinal
          || null,
      }
      : guidedTaskPlan;
  const activeGuidedTask = workflowProgressPlan
    ? {
      semanticPlan: workflowProgressPlan,
      screenPath: text(screenContext?.path),
      continuationDepth: productPlan?.family === "CONTINUE_CURRENT_REASONING"
        ? Number(productPlan.continuationDepth || 1)
        : 0,
      taskState: payload?.taskState && typeof payload.taskState === "object"
        ? payload.taskState
        : current.activeGuidedTask?.taskState || null,
    }
    : current.activeGuidedTask || null;
  const planEntities = Array.isArray(plan?.entities) ? plan.entities.map(normalizeEntity).filter(Boolean) : [];
  const entity = planEntities.length ? planEntities : plan?.entity ? [normalizeEntity(plan.entity)].filter(Boolean) : [];
  const serverDiscourseEntities = Array.isArray(payload?.discourseEntities)
    ? payload.discourseEntities.map(normalizeEntity).filter(Boolean)
    : [];
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
  const historyEntity = explicitSingleRecord ? entity[0] : null;
  const priorEntityHistory = Array.isArray(current.recentEntityHistory) ? current.recentEntityHistory : [];
  const recentEntityHistory = historyEntity
    ? [historyEntity, ...priorEntityHistory]
      .filter((candidate) => candidate?.type && candidate?.id)
      .filter((candidate, index, candidates) => candidates.findIndex((row) => `${row.type}:${row.id}` === `${candidate.type}:${candidate.id}`) === index)
      .slice(0, 8)
    : priorEntityHistory.slice(0, 8);
  // This is a discourse subject, not a synthetic current UI selection.  It
  // survives same-auth route changes and is reset naturally with the auth
  // scope state.  A multi-entity comparison is intentionally never promoted
  // to a singular discourse referent.
  const nextUniqueDiscourseReferent = presentationOperation
    ? current.uniqueDiscourseReferent || null
    : serverDiscourseEntities.length === 1
      ? serverDiscourseEntities[0]
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
  const analyticFamily = analyticBaseFamily(productPlan);
  const continuationAction = String(productPlan?.continuationAction || '').toUpperCase();
  const incomingAnalyticState = productPlan?.analyticStepState && typeof productPlan.analyticStepState === 'object'
    ? productPlan.analyticStepState
    : null;
  const currentFacts = Array.isArray(payload?.queryPlanExecution?.facts)
    ? payload.queryPlanExecution.facts
    : Array.isArray(payload?.retrievedFacts) ? payload.retrievedFacts : [];
  let nextAnalyticStepState = null;
  if (analyticFamily && payload?.reply) {
    const isContinuation = productPlan?.family === 'CONTINUE_CURRENT_REASONING';
    const steps = incomingAnalyticState && Array.isArray(incomingAnalyticState.steps)
      ? incomingAnalyticState.steps.slice(0, 8)
      : [];
    if (isContinuation && !incomingAnalyticState) {
      // A continuation without a same-scope analytic state cannot restore or
      // advance a previous step. Preserve the fail-closed boundary instead
      // of carrying a stale risk answer across a route/auth transition.
      nextAnalyticStepState = null;
    } else if (isContinuation) {
      const targetOrdinal = Math.max(1, Number(incomingAnalyticState.targetOrdinal || incomingAnalyticState.cursor || 1) || 1);
      const existingIndex = steps.findIndex((step) => Number(step?.ordinal || 0) === targetOrdinal);
      const shouldRecordReply = !['BACK', 'RECOVER'].includes(continuationAction) && existingIndex < 0;
      if (shouldRecordReply) {
        steps.push({
          ordinal: targetOrdinal,
          reply: text(payload.reply),
          factsFingerprint: factsFingerprint(currentFacts),
        });
      }
      nextAnalyticStepState = {
        family: analyticFamily,
        screenPath: text(screenContext?.path),
        authScopeVersion: current.authScopeVersion,
        cursor: targetOrdinal,
        targetOrdinal,
        action: continuationAction || 'CONTINUE',
        canRestorePrevious: Boolean(incomingAnalyticState.canRestorePrevious),
        steps: steps.slice(0, 8),
      };
    } else {
      nextAnalyticStepState = {
        family: analyticFamily,
        screenPath: text(screenContext?.path),
        authScopeVersion: current.authScopeVersion,
        cursor: 1,
        targetOrdinal: 1,
        action: 'START',
        canRestorePrevious: false,
        steps: [{
          ordinal: 1,
          reply: text(payload.reply),
          factsFingerprint: factsFingerprint(currentFacts),
        }],
      };
    }
  }
  const recentMessages = [
    ...(current.recentMessages || []),
    ...(message ? [{ role: "user", text: text(message) }] : []),
    ...(payload?.reply ? [{ role: "assistant", text: text(payload.reply), semanticPlan: plan }] : []),
  ].slice(-12);
  const effectiveGuidedTarget = payload?.guidedTarget
    || liveAgreementDetailsTarget(safeScreen, user, plan)
    || null;
  const retainsCurrentGuidedTarget = ["CONTINUE_CURRENT_REASONING", "EXPLAIN_CURRENT_TARGET"].includes(String(productPlan?.family || ""))
    || Boolean(payload?.conversationStepRestore || payload?.conversationStepForwardRestore);
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
    lastSettledResult: nonSettlingTargetExplanation
      ? current.lastSettledResult || null
      : productPlan && payload?.reply
      ? {
        authScopeVersion: current.authScopeVersion,
        reply: text(payload.reply),
        summary: text(payload.summary || payload.reply),
        semanticPlan: productPlan,
        authorizedRecords: Array.isArray(payload.authorizedRecords) ? payload.authorizedRecords.slice(0, 16) : [],
        retrievedFacts: Array.isArray(payload.retrievedFacts) ? payload.retrievedFacts.slice(0, 24) : [],
        reasoning: text(payload.reasoning),
        nextAction: text(payload.nextAction || payload.safeNextStep),
        financialContinuationState: payload?.financialContinuationState
          || productPlan?.financialContinuationState
          || null,
        reasoningEntitySet: nextActiveReasoningEntitySet.slice(0, 16),
        domain: text(payload.authorizedDomain || payload.authorizedDomainMap?.[0]),
        // Presentation operations must remain reversible transformations of
        // the last grounded result. Retaining this source prevents a later
        // "biraz aç" from expanding an already-shortened sentence instead of
        // the underlying authorized answer.
        presentationSource: presentationOperation
          ? current.lastSettledResult?.presentationSource || current.lastSettledResult || null
          : null,
        analyticStepState: nextAnalyticStepState,
      }
      : current.lastSettledResult || null,
    productTeachingState,
    activeGuidedTask,
    guidedTarget: effectiveGuidedTarget
      ? effectiveGuidedTarget
      : (retainsCurrentGuidedTarget && current.guidedTarget && safeScreen.path === current.guidedTarget.screenPath
        ? current.guidedTarget
        : null),
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
    recentEntityHistory,
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
    conversationStepHistory: (() => {
      const priorHistory = Array.isArray(current.conversationStepHistory)
        ? current.conversationStepHistory.slice(0, 8)
        : [];
      const restoringPreviousStep = payload?.conversationStepRestore
        && typeof payload.conversationStepRestore === 'object';
      if (restoringPreviousStep) return priorHistory.slice(1);
      const currentTarget = current.guidedTarget;
      const nextTarget = effectiveGuidedTarget;
      const currentPlan = current.lastSettledResult?.semanticPlan || current.productContext?.semanticPlan || null;
      const targetChanged = currentTarget?.targetKey
        && nextTarget?.targetKey
        && currentTarget.targetKey !== nextTarget.targetKey;
      if (!currentPlan || !currentTarget || !targetChanged
        || currentTarget?.screenPath !== safeScreen.path
        || !payload?.reply) return priorHistory;
      const previousStep = {
        authScopeVersion: current.authState.authScopeVersion,
        screenPath: currentTarget.screenPath || safeScreen.path,
        selectedEntity: current.entityContext?.selectedEntity || safeScreen.selectedEntity || null,
        semanticPlan: currentPlan,
        guidedTarget: currentTarget,
        reply: current.lastSettledResult?.reply || '',
        summary: current.lastSettledResult?.summary || current.lastSettledResult?.reply || '',
        nextAction: current.lastSettledResult?.nextAction || '',
        safeNextStep: current.lastSettledResult?.safeNextStep || '',
      };
      return [previousStep, ...priorHistory].slice(0, 8);
    })(),
    conversationForwardStep: (() => {
      const restoringPreviousStep = payload?.conversationStepRestore
        && typeof payload.conversationStepRestore === 'object';
      const restoringForwardStep = payload?.conversationStepForwardRestore
        && typeof payload.conversationStepForwardRestore === 'object';
      if (restoringPreviousStep) {
        return payload?.conversationStepForward && typeof payload.conversationStepForward === 'object'
          ? payload.conversationStepForward
          : null;
      }
      if (restoringForwardStep) return null;
      return null;
    })(),
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

export const CANONICAL_CONVERSATION_TRANSITIONS = Object.freeze([
  "SUSPEND_TASK",
  "RESUME_TASK",
  "INVALIDATE_STALE_CONTEXT",
  "REVALIDATE_REFERENT",
]);

export function applyCanonicalConversationTransition({ state, transition, reason = "", requestId = null } = {}) {
  const type = text(transition).toUpperCase();
  if (!CANONICAL_CONVERSATION_TRANSITIONS.includes(type)) {
    throw new Error(`UNKNOWN_CANONICAL_CONVERSATION_TRANSITION:${type}`);
  }
  const next = cloneState(state) || emptyState({ identity: "unbound", authScopeVersion: 0 }, safeScreenContext({}, {}));
  const event = {
    type,
    reason: text(reason) || "UNSPECIFIED",
    requestId: text(requestId) || null,
    observedAt: new Date().toISOString(),
  };
  if (type === "SUSPEND_TASK") {
    next.suspendedProductContext = next.productContext || null;
    next.productContext = { ...(next.productContext || {}), suspended: true };
    next.dialogueState = { ...(next.dialogueState || {}), suspendedProduct: true, phase: "PRODUCT_SUSPENDED" };
  } else if (type === "RESUME_TASK") {
    if (next.suspendedProductContext) next.productContext = { ...next.suspendedProductContext, suspended: false };
    next.dialogueState = { ...(next.dialogueState || {}), suspendedProduct: false, phase: "PRODUCT_ACTIVE" };
    next.revalidationRequired = true;
  } else if (type === "INVALIDATE_STALE_CONTEXT") {
    next.guidedTarget = null;
    next.requestState = null;
    next.revalidationRequired = true;
  } else if (type === "REVALIDATE_REFERENT") {
    next.entityContext = { ...(next.entityContext || {}), referentValidation: "REQUIRED" };
    next.revalidationRequired = true;
  }
  next.transition = event;
  next.lastTransition = event;
  return next;
}

export function projectPersistableConversationState(state) {
  const source = state && typeof state === "object" ? state : {};
  return Object.freeze({
    stateVersion: "SEFER-ABI-CONVERSATION-STATE-V1",
    authScopeVersion: Number(source.authScopeVersion || 0) || 0,
    activeTask: source.activeGuidedTask
      ? { taskId: text(source.activeGuidedTask.taskId), workflowIntent: text(source.activeGuidedTask.semanticPlan?.workflowIntent) }
      : null,
    activeWorkflow: source.activeGuidedTask?.semanticPlan?.workflowIntent || null,
    explicitEntitySet: Array.isArray(source.lastExplicitEntitySet)
      ? source.lastExplicitEntitySet.map(normalizeEntity).filter(Boolean).slice(0, 16)
      : [],
    selectedRecord: normalizeEntity(source.entityContext?.selectedEntity),
    settledRequestId: text(source.lastSettledResult?.requestId) || null,
    currentRequestedOperation: text(source.requestState?.reasoningTask || source.lastProductTask) || null,
    route: text(source.screenContext?.path) || null,
    suspended: Boolean(source.dialogueState?.suspendedProduct || source.productContext?.suspended),
    revalidationRequired: Boolean(source.revalidationRequired),
    lastTransition: (source.transition || source.lastTransition)
      ? { type: text((source.transition || source.lastTransition).type), reason: text((source.transition || source.lastTransition).reason), observedAt: (source.transition || source.lastTransition).observedAt }
      : null,
  });
}
