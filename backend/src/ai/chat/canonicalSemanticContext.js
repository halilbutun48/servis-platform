// Bounded, read-only semantic context view.  This composes existing
// conversation, task, and live-surface owners; it does not create a second
// state store or grant authorization.

function text(value) {
  return String(value ?? "").trim();
}

function folded(value) {
  return text(value)
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function finiteId(value) {
  const number = Number(value);
  return Number.isInteger(number) && number > 0 ? number : null;
}

function safeEntity(value) {
  if (!value || typeof value !== "object") return null;
  const type = text(value.type || value.entityType).toUpperCase();
  const id = finiteId(value.id || value.entityId);
  return type && id ? { type, id } : null;
}

const SUPPORTED_SELECTION_TYPES = new Set([
  "SHIFT",
  "AGREEMENT",
  "OFFER",
  "ROUTE",
  "PERSONNEL",
  "VEHICLE",
  "DRIVER",
  "SERVICE_REQUEST",
  "ORGANIZATION_PLAN",
  "STUDENT",
  "PARENT",
]);

function selectionRoute(screenContext, conversationState) {
  return text(
    screenContext?.path
      || conversationState?.lastScreenPath
      || conversationState?.screenContext?.path,
  );
}

// The live surface may describe a screen or aggregate panel without selecting
// a record. Such a marker is authoritative for the current surface and must
// suppress a historical record; it is never an authorization grant.
export function resolveCurrentSelection({ screenContext, conversationState } = {}) {
  const liveEntity = safeEntity(screenContext?.selectedEntity)
    || safeEntity({ type: screenContext?.selectedEntityType, id: screenContext?.selectedEntityId });
  const liveType = text(screenContext?.selectedEntity?.type || screenContext?.selectedEntity?.entityType || screenContext?.selectedEntityType).toUpperCase();
  const liveId = finiteId(screenContext?.selectedEntity?.id || screenContext?.selectedEntity?.entityId || screenContext?.selectedEntityId);
  const historicalEntity = safeEntity(conversationState?.entityContext?.selectedEntity)
    || safeEntity({ type: conversationState?.selectedEntityType, id: conversationState?.selectedEntityId });
  const currentPath = selectionRoute(screenContext, conversationState);
  const previousPath = text(conversationState?.lastScreenPath || conversationState?.screenContext?.path);
  const routeChanged = Boolean(currentPath && previousPath && currentPath !== previousPath);
  const unsupportedLiveMarker = Boolean(
    (liveType && !SUPPORTED_SELECTION_TYPES.has(liveType))
      || (liveId && !liveEntity),
  );
  if (liveEntity && SUPPORTED_SELECTION_TYPES.has(liveEntity.type)) {
    return Object.freeze({
      entity: liveEntity,
      source: "SURFACE_CONTEXT",
      historicalSuppressed: false,
      routeChanged,
    });
  }
  if (unsupportedLiveMarker || routeChanged) {
    return Object.freeze({
      entity: null,
      source: null,
      historicalSuppressed: true,
      routeChanged,
    });
  }
  if (historicalEntity && SUPPORTED_SELECTION_TYPES.has(historicalEntity.type)) {
    return Object.freeze({
      entity: historicalEntity,
      source: "REFERENCE_HISTORY",
      historicalSuppressed: false,
      routeChanged: false,
    });
  }
  return Object.freeze({
    entity: null,
    source: null,
    historicalSuppressed: Boolean(historicalEntity),
    routeChanged,
  });
}

function entityDomain(type) {
  const key = text(type).toUpperCase();
  return {
    SHIFT: "SHIFTS",
    AGREEMENT: "AGREEMENTS",
    OFFER: "OFFERS",
    ROUTE: "ROUTES",
    PERSONNEL: "PERSONNEL",
  }[key] || "";
}

function upper(value) {
  return text(value).toUpperCase();
}

function hasStaleMarker(value) {
  if (!value || typeof value !== "object") return false;
  if (value.stale === true || value.validated === false) return true;
  return [value.status, value.freshness, value.state, value.validity, value.validation]
    .some((item) => ["STALE", "INVALID", "EXPIRED", "SUPERSEDED", "REJECTED"].includes(upper(item)));
}

function taskIsStale(task, conversationState, currentPath) {
  const transition = upper(conversationState?.transition?.type || conversationState?.lastTransition?.type);
  return hasStaleMarker(task)
    || hasStaleMarker(task?.taskState)
    || conversationState?.revalidationRequired === true
    || transition === "INVALIDATE_STALE_CONTEXT";
}

function explicitInputEvidence(normalizedText, evidence) {
  // A failure report about the active guided target is a continuation/recovery
  // turn, even when it repeats the workflow noun (for example, “vardiya
  // oluşturma yerini bulamadım”). Treating that noun as a fresh explicit
  // request would invalidate the active continuation before the canonical
  // recovery owner can resolve the target.
  const recoveryInput = /\b(?:bulam|yapam|acilam|a[cç][ıi]lam|calismiyor|çalışmıyor|baslatam|ba[sş]latam|tak[iı]lam|g[oö]rem)\p{L}*\b/iu.test(normalizedText)
    || /\b(?:dedi[gğ]in|s[oö]yledi[gğ]in)\s+yer\s+yok\b/iu.test(normalizedText);
  if (recoveryInput) return false;
  const explicitDomain = /\b(?:vardiya|sefer|servis|operasyon|sozlesme|agreement|contract|teklif|offer|rota|guzergah|durak|personel|calisan)\p{L}*\b/iu.test(normalizedText);
  const explicitAction = /\b(?:bak|gor|incele|listele|goster|olustur|baslat|planla|ac|git|anlat|acikla)\p{L}*\b/iu.test(normalizedText);
  const explicitObject = evidence.object.some((item) => item !== "PRODUCT_OPERATIONAL_RECORD");
  return Boolean((explicitDomain && explicitAction) || explicitObject);
}

function selectedRecordReferenceInput(normalizedText, selectedEntity) {
  if (!selectedEntity) return false;
  return /\b(?:bu|su|secil(?:i|en)?|aktif|baktigim)\s+(?:vardiya|sefer|teklif|arac|plaka|surucu|sofor|sozlesme|kayit)\p{L}*/iu.test(normalizedText)
    || /^(?:bunun|sunun|onun)\b/iu.test(normalizedText)
    || /^(?:bu|su)\s+(?:tutar|deger|değer|detay|bilgi|kayit|kayıt)\p{L}*/iu.test(normalizedText);
}

function selectedRelationReferenceInput(normalizedText, selectedEntity) {
  if (!selectedEntity || !["OFFER", "AGREEMENT", "SHIFT", "SERVICE_REQUEST"].includes(String(selectedEntity.type || "").toUpperCase())) return false;
  // A short relational follow-up such as “Hangi vardiyaya ait?” relies on the
  // one uniquely selected record. Preserve that referent without treating a
  // new unrelated noun as an authorization grant; retrieval still passes the
  // canonical record-scope gate.
  return /\b(?:hangi|ne)\b(?:\s+\p{L}+){0,5}\s+\b(?:ait|bağlı|bagli|ilgili|ilişkili|iliskili)\b/iu.test(normalizedText);
}

function continuationRelation(normalizedText) {
  if (/(?:bulamad|yapam|acilmiyor|calismiyor|takild|hata|sorun)/iu.test(normalizedText)) return "RECOVER";
  if (/\b(?:sonraki|sonra|ileri|next)\b/iu.test(normalizedText)) return "NEXT";
  if (/\b(?:onceki|geri|previous)\b/iu.test(normalizedText)) return "PREVIOUS";
  if (/\b(?:devam|surdur|kaldigimiz|kaldigim)\p{L}*\b/iu.test(normalizedText)) return "CONTINUE";
  return null;
}

function referenceCandidate(value, source) {
  const entity = safeEntity(value);
  if (!entity) return null;
  const valueSource = upper(value?.source);
  const candidateSource = valueSource === "LIVE_UI" || valueSource === "SURFACE_CONTEXT"
    ? "SURFACE_CONTEXT"
    : valueSource === "REFERENCE_HISTORY" || valueSource === "CONVERSATION_STATE"
      ? "REFERENCE_HISTORY"
      : source;
  return { ...entity, source: candidateSource, stale: hasStaleMarker(value) };
}

function freshTarget(value, currentPath) {
  if (!value || typeof value !== "object") return null;
  const targetKey = text(value.targetKey);
  const semanticId = text(value.semanticId);
  const screenPath = text(value.screenPath);
  const status = upper(value.status);
  if (!targetKey || !semanticId || !currentPath || screenPath !== currentPath || !["FOUND", "FRESH"].includes(status) || hasStaleMarker(value)) return null;
  return {
    targetKey,
    semanticId,
    screenPath,
    status,
  };
}

function clarificationPlan(value) {
  const family = upper(value?.semanticPlan?.family || value?.family);
  const resolution = upper(value?.semanticPlan?.canonicalRequest?.semanticAction?.resolutionStatus || value?.resolutionStatus);
  return family === "UNCLEAR_OR_AMBIGUOUS" || resolution === "AMBIGUOUS" || resolution === "UNRESOLVED";
}

function buildContinuityProjection({ normalizedText, evidence, explicitInput: explicitInputOverride, conversationState, currentPath, currentDomain, selectedEntity, selectedEntitySource, preferLiveSelection, currentTarget, activeTask, semanticPlan, lastSettled, hasRole, hasSurface } = {}) {
  const explicitInput = typeof explicitInputOverride === "boolean"
    ? explicitInputOverride
    : explicitInputEvidence(normalizedText, evidence);
  const taskStale = Boolean(activeTask && taskIsStale(activeTask, conversationState, currentPath));
  const taskStatus = !activeTask
    ? "ABSENT"
    : taskStale
      ? "REJECTED_STALE"
      : explicitInput
        ? "OVERRIDDEN_BY_EXPLICIT"
        : "ACTIVE";
  const candidates = [];
  const addCandidate = (value, source) => {
    const candidate = referenceCandidate(value, source);
    if (!candidate) return;
    if (!candidates.some((item) => `${item.type}:${item.id}` === `${candidate.type}:${candidate.id}`)) candidates.push(candidate);
  };
  if (preferLiveSelection && selectedEntity && selectedEntitySource === "SURFACE_CONTEXT") {
    // A direct reference to the record visibly selected on the current
    // authorized surface must not become ambiguous because older conversation
    // entities remain in server-owned history. Authorization still resolves
    // the selected record downstream; this only prevents stale candidates from
    // shadowing the live UI selection during semantic classification.
    addCandidate(selectedEntity, "SURFACE_CONTEXT");
  } else {
    addCandidate(conversationState?.uniqueDiscourseReferent, "REFERENCE_HISTORY");
    addCandidate(selectedEntity, "SURFACE_CONTEXT");
    for (const value of [
      ...(Array.isArray(conversationState?.selectedEntitySet) ? conversationState.selectedEntitySet : []),
      ...(Array.isArray(conversationState?.activeEntitySet) ? conversationState.activeEntitySet : []),
      ...(Array.isArray(conversationState?.entityContext?.conversationEntities) ? conversationState.entityContext.conversationEntities : []),
    ]) addCandidate(value, "REFERENCE_HISTORY");
  }
  const usableCandidates = candidates.filter((candidate) => {
    if (taskStale || candidate.stale) return false;
    const domain = entityDomain(candidate.type);
    return !currentDomain || !domain || domain === currentDomain;
  });
  const staleReference = candidates.some((candidate) => candidate.stale || (currentDomain && entityDomain(candidate.type) && entityDomain(candidate.type) !== currentDomain));
  const hasExplicitReference = evidence.reference.includes("DEICTIC_REFERENCE");
  const referenceStatus = explicitInput
    ? "OVERRIDDEN_BY_EXPLICIT"
    : hasExplicitReference && usableCandidates.length === 1
      ? "UNIQUE"
      : hasExplicitReference && usableCandidates.length > 1
        ? "AMBIGUOUS"
        : hasExplicitReference && staleReference
          ? "REJECTED_STALE"
          : hasExplicitReference
            ? "UNRESOLVED"
            : "ABSENT";
  const resolvedReferent = referenceStatus === "UNIQUE"
    ? { type: usableCandidates[0].type, id: usableCandidates[0].id }
    : null;
  const relation = continuationRelation(normalizedText);
  const continuationAvailable = Boolean(!taskStale && (activeTask || semanticPlan || lastSettled));
  const guidedTarget = freshTarget(conversationState?.guidedTarget, currentPath);
  const continuationStatus = relation && !explicitInput && continuationAvailable ? "VALID" : relation ? "REJECTED_STALE" : "NONE";
  const priorClarification = clarificationPlan(lastSettled) || clarificationPlan(semanticPlan);
  const clarificationStale = Boolean(
    conversationState?.revalidationRequired === true
      || upper(conversationState?.transition?.type || conversationState?.lastTransition?.type) === "INVALIDATE_STALE_CONTEXT"
      || taskStale,
  );
  const clarificationStatus = explicitInput && priorClarification
    ? "SUPERSEDED"
    : referenceStatus === "AMBIGUOUS" || (hasExplicitReference && referenceStatus === "UNRESOLVED")
      ? "REQUIRED"
      : clarificationStale && priorClarification
        ? "REJECTED_STALE"
      : priorClarification
        ? "AVAILABLE"
        : "NONE";
  const targetEvidence = currentTarget
    ? { targetKey: currentTarget.targetKey || null, source: "LIVE_UI" }
    : guidedTarget
      ? { targetKey: guidedTarget.targetKey, source: "CONVERSATION_STATE" }
      : null;
  const provenance = [];
  if (hasRole) provenance.push("AUTH_CONTEXT");
  if (hasSurface) provenance.push("SURFACE_CONTEXT");
  if (taskStatus === "ACTIVE") provenance.push("ACTIVE_TASK");
  for (const candidate of candidates) if (candidate.source) provenance.push(candidate.source);
  const referenceProvenance = [...new Set(candidates.map((candidate) => candidate.source).filter(Boolean))];
  return Object.freeze({
    precedence: explicitInput ? "EXPLICIT_INPUT" : "CONTEXT_ONLY",
    explicitIntent: explicitInput,
    authorizationEffect: "NONE",
    capabilityEffect: "NONE",
    task: Object.freeze({ status: taskStatus, taskId: taskStatus === "ABSENT" ? null : text(activeTask?.taskId || activeTask?.id) || null }),
    reference: Object.freeze({
      status: referenceStatus,
      referent: resolvedReferent,
      freshness: referenceStatus === "UNIQUE" || referenceStatus === "AMBIGUOUS" ? "FRESH" : referenceStatus === "REJECTED_STALE" ? "STALE" : "UNKNOWN",
      provenance: referenceProvenance,
    }),
    clarification: Object.freeze({ status: clarificationStatus }),
    continuation: Object.freeze({ status: continuationStatus, relation }),
    recovery: Object.freeze({
      status: relation === "RECOVER" && continuationStatus === "VALID" && targetEvidence ? "AVAILABLE" : "NONE",
      evidence: relation === "RECOVER" && continuationStatus === "VALID" && targetEvidence ? targetEvidence : null,
    }),
    provenance: Object.freeze([...new Set(provenance)]),
  });
}

function roleOf(user) {
  return text(user?.companyKind || user?.role).toUpperCase() || null;
}

function currentDomainFromSurface({ screenContext, conversationState, normalizedText, allowStoredState = true } = {}) {
  const surfaceText = folded([
    screenContext?.path,
    screenContext?.label,
    screenContext?.uiHints?.foregroundSurface?.key,
    screenContext?.uiHints?.pageTitles?.map?.((item) => typeof item === "string" ? item : item?.label).join(" "),
  ].filter(Boolean).join(" "));
  if (/(vardiya|sefer|shift|servis)/u.test(surfaceText)) return "SHIFTS";
  if (/(operasyon)/u.test(surfaceText)) return "OPERATIONS";
  if (/(sozlesme|sözleşme|agreement|contract)/u.test(surfaceText)) return "AGREEMENTS";
  if (/(teklif|offer|rfq)/u.test(surfaceText)) return "OFFERS";
  if (/(rota|durak|guzergah|güzergah)/u.test(surfaceText)) return "ROUTES";
  if (/(personel|calisan|çalışan|ogrenci|öğrenci)/u.test(surfaceText)) return "PERSONNEL";
  const storedDomain = text(conversationState?.activeDomain || conversationState?.productContext?.semanticPlan?.requestedDomains?.[0]).toUpperCase();
  if (allowStoredState && storedDomain) return storedDomain;
  const utterance = folded(normalizedText);
  if (/(vardiya|sefer|shift|servis)/u.test(utterance)) return "SHIFTS";
  if (/(operasyon)/u.test(utterance)) return "OPERATIONS";
  if (/(sozlesme|sözleşme|agreement|contract)/u.test(utterance)) return "AGREEMENTS";
  if (/(teklif|offer|rfq)/u.test(utterance)) return "OFFERS";
  if (/(rota|durak|guzergah|güzergah)/u.test(utterance)) return "ROUTES";
  if (/(personel|calisan|çalışan|ogrenci|öğrenci)/u.test(utterance)) return "PERSONNEL";
  return "";
}

function buildRecentSemanticTurns(conversationState) {
  const messages = Array.isArray(conversationState?.recentMessages)
    ? conversationState.recentMessages
    : Array.isArray(conversationState?.dialogueState?.recentMessages)
      ? conversationState.dialogueState.recentMessages
      : [];
  return messages.slice(-6).map((item) => {
    const plan = item?.semanticPlan || null;
    const request = plan?.canonicalRequest || plan?.request || null;
    return {
      role: text(item?.role).toLowerCase() || "unknown",
      domain: text(request?.domain || plan?.requestedDomains?.[0]).toUpperCase() || null,
      taskRef: text(request?.activeTaskRef || plan?.activeTaskRef) || null,
      observed: true,
    };
  }).filter((turn) => turn.domain || turn.taskRef || turn.observed);
}

function inspectableEvidence(normalizedText) {
  const has = (pattern) => pattern.test(normalizedText);
  const object = [];
  const action = [];
  const temporal = [];
  const discourse = [];
  const reference = [];
  // Do not treat the necessity form `bakmam gerek` as the negative
  // imperative `bakma`. The latter must end as a standalone word before
  // whitespace/punctuation; otherwise current-surface help is poisoned by a
  // false negation marker before typed evidence composition.
  const negation = has(/\b(?:istemiyor(?:um|uz)?|istemiyorum|istemem|degil|değil|yapma)\p{L}*\b/iu)
    || has(/\b(?:bak|g[oö]r)ma(?:\s|[,.!?]|$)/iu)
    || has(/\b(?:g[oö]r|bak|incele)\p{L}*\s+(?:istemiyor|istemem|istemiyorum)\b/iu);

  if (has(/\b(?:bugun|bugunku|bugunun|aktif|mevcut|su anki|şu anki|simdi|şimdi|guncel|güncel)\b/iu)) temporal.push("CURRENT_TIME_WINDOW");
  if (has(/\b(?:sefer|vardiya|shift|servis)\p{L}*\b/iu)) object.push("PRODUCT_SHIFT_RECORD");
  if (has(/\b(?:sözleşme|sozlesme|agreement|contract)\p{L}*\b/iu)) object.push("PRODUCT_AGREEMENT_RECORD");
  if (has(/\b(?:teklif|offer|rfq)\p{L}*\b/iu)) object.push("PRODUCT_OFFER_RECORD");
  if (has(/\b(?:rota|durak|güzergah|guzergah)\p{L}*\b/iu)) object.push("PRODUCT_ROUTE_RECORD");
  if (has(/\b(?:personel|çalışan|calisan)\p{L}*\b/iu)) object.push("PRODUCT_PERSONNEL_RECORD");
  if (has(/\b(?:kayit|kayıt|liste|vardiya|sefer|servis|operasyon)\p{L}*\b/iu)) object.push("PRODUCT_OPERATIONAL_RECORD");
  if (has(/\b(?:bak|g[oö]r|incele|listele|g[oö]ster|izle|kontrol)\p{L}*\b/iu) || has(/\b(?:g[oö]z\s+at)\p{L}*\b/iu)) action.push("NON_MUTATING_INSPECTION");
  if (has(/\b(?:devam|surdur|sürdür|kaldig|kaldığımız|kaldigimiz|geri\s+don|geri\s+dön)\p{L}*\b/iu)) discourse.push("CONTINUATION_RELATION");
  if (has(/\b(?:b[uü]|buna|s[uü]|o|aynisi|aynısı|buraya|burada|suna|şuna|onu|bunu)\b/iu)) reference.push("DEICTIC_REFERENCE");
  if (has(/\b(?:bastan|baştan|yeniden|sifirdan|sıfırdan)\b/iu)) discourse.push("RESTART_RELATION");
  if (has(/\b(?:devam|surdur|sürdür|kaldig|kaldığımız|kaldigimiz)\b/iu)) discourse.push("CONTINUE_RELATION");
  return { object: [...new Set(object)], action: [...new Set(action)], temporal, discourse: [...new Set(discourse)], reference: [...new Set(reference)], negation };
}

export function buildCanonicalSemanticContext({ message, user, screenContext, conversationState } = {}) {
  const normalizedText = folded(message);
  const evidence = inspectableEvidence(normalizedText);
  const explicitInput = explicitInputEvidence(normalizedText, evidence);
  const observedCurrentDomain = currentDomainFromSurface({ screenContext, conversationState, normalizedText });
  const currentDomain = explicitInput ? null : observedCurrentDomain || null;
  const currentSurface = {
    path: text(screenContext?.path) || null,
    label: text(screenContext?.label) || null,
    foreground: screenContext?.uiHints?.foregroundSurface && typeof screenContext.uiHints.foregroundSurface === "object"
      ? { key: text(screenContext.uiHints.foregroundSurface.key), kind: text(screenContext.uiHints.foregroundSurface.kind).toUpperCase() || null }
      : null,
  };
  const hasSurface = Boolean(currentSurface.path || currentSurface.label || currentSurface.foreground);
  // The browser sends the live selection as a route-bound type/id hint. Keep
  // that hint in semantic context as a candidate referent; it is not an
  // authorization grant and remains subject to the canonical authorization
  // and record-scope gates later in the request pipeline.
  const currentSelection = resolveCurrentSelection({ screenContext, conversationState });
  const selectedEntity = currentSelection.entity;
  const selectedEntitySource = currentSelection.source;
  const selectedRecordReference = selectedRecordReferenceInput(normalizedText, selectedEntity)
    || selectedRelationReferenceInput(normalizedText, selectedEntity);
  const currentTarget = freshTarget(screenContext?.uiHints?.currentTarget, currentSurface.path);
  const activeTask = conversationState?.activeGuidedTask || conversationState?.activeTask || null;
  const activeTaskStale = Boolean(activeTask && taskIsStale(activeTask, conversationState, currentSurface.path));
  const effectiveActiveTask = !explicitInput && !activeTaskStale ? activeTask : null;
  // An explicit deictic question about the live selected record is still an
  // explicit user request, but its record referent must survive into the
  // canonical evidence layer.  Other explicit requests intentionally clear
  // the selection so a stale card cannot become an implicit target.
  const effectiveSelectedEntity = selectedRecordReference || !explicitInput ? selectedEntity : null;
  const effectiveCurrentTarget = explicitInput ? null : currentTarget;
  const workflowState = explicitInput || activeTaskStale
    ? null
    : screenContext?.uiHints?.workflowState || activeTask?.taskState || null;
  const productEvidence = Boolean(observedCurrentDomain || evidence.object.length || evidence.action.length || screenContext?.path);
  const semanticPlan = conversationState?.productContext?.semanticPlan || conversationState?.lastSemanticPlan || null;
  const lastSettled = conversationState?.lastSettledResult || null;
  const lastRequest = lastSettled?.semanticPlan?.canonicalRequest || semanticPlan?.canonicalRequest || null;
  const lastResolvedIntent = lastRequest?.semanticAction?.actionClass || semanticPlan?.intentFamily || null;
  const lastSemanticAction = lastRequest?.semanticAction || semanticPlan?.semanticAction || null;
  const uniqueReferent = safeEntity(conversationState?.uniqueDiscourseReferent);
  const freshUniqueReferent = uniqueReferent
    && !explicitInput
    && !conversationState?.revalidationRequired
    && !hasStaleMarker(conversationState?.uniqueDiscourseReferent)
    && !currentSelection.historicalSuppressed
    && (!observedCurrentDomain || !entityDomain(uniqueReferent.type) || entityDomain(uniqueReferent.type) === observedCurrentDomain)
    ? uniqueReferent
    : null;
  const effectiveUniqueReferent = freshUniqueReferent || (selectedRecordReference ? effectiveSelectedEntity : null);
  const role = roleOf(user);
  const contextUsedEntries = [];
  if (role) contextUsedEntries.push(Object.freeze({
      dimension: "role",
      source: "AUTH_CONTEXT",
      used: true,
      contextRef: `auth:role:${role}`,
    }));
  if (role && (finiteId(user?.companyId) || finiteId(user?.roomId))) contextUsedEntries.push(Object.freeze({
      dimension: "tenantScope",
      source: "AUTH_CONTEXT",
      used: true,
      contextRef: finiteId(user?.companyId)
        ? `auth:company:${finiteId(user.companyId)}`
        : finiteId(user?.roomId)
          ? `auth:room:${finiteId(user.roomId)}`
          : null,
    }));
  if (hasSurface) contextUsedEntries.push(Object.freeze({
      dimension: "currentSurface",
      source: "SURFACE_CONTEXT",
      used: true,
      contextRef: currentSurface.path ? `surface:${currentSurface.path}` : null,
    }));
  if (effectiveActiveTask) contextUsedEntries.push(Object.freeze({
      dimension: "activeTask",
      source: "ACTIVE_TASK",
      used: true,
      contextRef: "task:active",
    }));
  if (effectiveSelectedEntity || effectiveCurrentTarget || effectiveUniqueReferent) contextUsedEntries.push(Object.freeze({
      dimension: "reference",
      source: selectedEntitySource || (effectiveCurrentTarget ? "SURFACE_CONTEXT" : "REFERENCE_HISTORY"),
      used: true,
      contextRef: effectiveUniqueReferent
        ? `reference:unique:${effectiveUniqueReferent.type}:${effectiveUniqueReferent.id}`
        : effectiveSelectedEntity
          ? `${selectedEntitySource === "SURFACE_CONTEXT" ? "surface" : "reference"}:selected:${effectiveSelectedEntity.type}:${effectiveSelectedEntity.id}`
          : effectiveCurrentTarget?.targetKey
            ? `surface:target:${effectiveCurrentTarget.targetKey}`
            : null,
    }));
  const contextUsed = Object.freeze(contextUsedEntries);
  const continuity = buildContinuityProjection({
    normalizedText,
    evidence,
    explicitInput: selectedRecordReference ? false : explicitInput,
    conversationState,
    currentPath: currentSurface.path,
    currentDomain: observedCurrentDomain,
    selectedEntity: effectiveSelectedEntity,
    selectedEntitySource,
    preferLiveSelection: Boolean(selectedRecordReference && selectedEntitySource === "SURFACE_CONTEXT"),
    currentTarget: effectiveCurrentTarget,
    activeTask,
    semanticPlan,
    lastSettled,
    hasRole: Boolean(role),
    hasSurface,
  });
  const projectedContext = {
    version: "SEFER-ABI-CANONICAL-SEMANTIC-CONTEXT-V1",
    role,
    tenantScope: { companyId: finiteId(user?.companyId), roomId: finiteId(user?.roomId) },
    currentSurface,
    activeTask: effectiveActiveTask ? { taskId: text(effectiveActiveTask.taskId || effectiveActiveTask.id) || null, workflowIntent: text(effectiveActiveTask.semanticPlan?.workflowIntent || effectiveActiveTask.workflowIntent).toUpperCase() || null } : null,
    workflowState: workflowState && typeof workflowState === "object" ? { workflowId: text(workflowState.workflowId || workflowState.id) || null, currentStep: finiteId(workflowState.activeStepOrdinal), nextState: text(workflowState.nextState).toUpperCase() || null } : null,
    currentDomain,
    currentEntity: effectiveSelectedEntity,
    continuationState: { active: Boolean(!explicitInput && !activeTaskStale && (activeTask || lastSettled || semanticPlan)), relation: evidence.discourse.includes("CONTINUE_RELATION") ? "CONTINUE" : evidence.discourse.includes("RESTART_RELATION") ? "RESTART" : null },
    recoveryState: { active: Boolean(!explicitInput && !activeTaskStale && (effectiveCurrentTarget || freshTarget(conversationState?.guidedTarget, currentSurface.path))), targetKey: !explicitInput && !activeTaskStale ? text(effectiveCurrentTarget?.targetKey || freshTarget(conversationState?.guidedTarget, currentSurface.path)?.targetKey) || null : null },
    recentSemanticTurns: buildRecentSemanticTurns(conversationState),
    foregroundInteraction: currentSurface.foreground,
    referenceState: { selectedEntity: effectiveSelectedEntity, currentTarget: effectiveCurrentTarget, uniqueReferent: effectiveUniqueReferent },
    contextUsed,
    continuity,
    temporalContext: evidence.temporal.includes("CURRENT_TIME_WINDOW") ? "CURRENT" : "UNKNOWN",
    evidence: { ...evidence, product: productEvidence, relation: evidence.action.length > 0 && evidence.object.length > 0 },
    freshness: {
      currentSurface: Boolean(currentSurface.path || currentSurface.foreground),
      activeTask: Boolean(effectiveActiveTask),
      target: Boolean(!explicitInput && (effectiveCurrentTarget || effectiveSelectedEntity)),
      currentDomain: explicitInput ? "EXPLICIT_INPUT" : Boolean(currentDomain),
      authScopeVersion: Number(conversationState?.authScopeVersion || 0) || null,
    },
  };
  if (explicitInput) projectedContext.lastSemanticTarget = null;
  return Object.freeze(projectedContext);
}

export function hasFreshCanonicalSemanticContext(context) {
  return Boolean(context?.version === "SEFER-ABI-CANONICAL-SEMANTIC-CONTEXT-V1" && context?.role && context?.tenantScope && context?.evidence);
}
