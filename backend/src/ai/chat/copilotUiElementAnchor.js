import { buildRoleHelpSummary, resolveAuthorizedScreenContext } from '../jobGuide/screenCatalog.js';

export const COPILOT_UI_ELEMENT_ANCHOR_VERSION = '18.0.0-semantic-target-v1';

export const GUIDED_TARGET_STATUSES = Object.freeze({
  FOUND: 'FOUND',
  NOT_FOUND: 'NOT_FOUND',
  UNAUTHORIZED: 'UNAUTHORIZED',
  STALE: 'STALE',
  WRONG_SCREEN: 'WRONG_SCREEN',
  STATE_CHANGED: 'STATE_CHANGED',
});

const CRITICAL_ACTION_RE = /(?:onayla|onay|kabul et|kaydet|\buygula(?:\s|$)|uygulamaya\s+(?:al|gecir|geçir)|sil|dağıt|dagit|dispatch|sözleşmeyi yürürlüğe al|sozlesmeyi yururluge al|gönder|gonder|teklif ver|teklifi gönder|teklifi gonder|ödemeyi başlat|odemeyi baslat|yetki ver|yetkiyi değiştir|yetkiyi degistir)/iu;
const GUIDANCE_RE = /(?:nerede|neresi|burası ne|burasi ne|hangi (?:buton|sekme|alan|kart|bölüm|bolum)|ilk ne|önce ne|once ne|şimdi ne|simdi ne|devam(?: et)?|girdim|yaptım|yaptim|bulamadım|bulamadim|geri|yanlış ekrandayım|yanlis ekrandayim|burada göremiyorum|burada goremiyorum)/iu;

function text(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function normalized(value) {
  return text(value)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('tr-TR');
}

function slug(value) {
  return normalized(value).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
}

function targetKeyFor(path, row) {
  const explicit = text(row?.targetKey || row?.semanticKey || row?.copilotTarget);
  return explicit || `${slug(path)}:${slug(row?.semanticType || 'target')}:${slug(row?.label)}`;
}

function hasExplicitTargetIdentity(row) {
  return Boolean(text(row?.targetKey || row?.semanticKey || row?.copilotTarget || row?.semanticId || row?.blockKey));
}

function uiSurfaceFor(screenContext = {}) {
  const hints = screenContext?.uiHints && typeof screenContext.uiHints === 'object' ? screenContext.uiHints : {};
  return {
    visibleButtons: Array.isArray(hints.visibleButtons) ? hints.visibleButtons.slice(0, 48) : [],
    visibleMenus: Array.isArray(hints.visibleMenus) ? hints.visibleMenus.slice(0, 48) : [],
    disabledButtons: Array.isArray(hints.disabledButtons) ? hints.disabledButtons.slice(0, 16) : [],
    activeTabs: Array.isArray(hints.activeTabs) ? hints.activeTabs.slice(0, 16) : [],
    tableHeaders: Array.isArray(hints.tableHeaders) ? hints.tableHeaders.slice(0, 16) : [],
    modalTitles: Array.isArray(hints.modalTitles) ? hints.modalTitles.slice(0, 8) : [],
    pageTitles: Array.isArray(hints.pageTitles) ? hints.pageTitles.slice(0, 8) : [],
    semanticElements: Array.isArray(hints.semanticElements) ? hints.semanticElements.slice(0, 96) : [],
    semanticBlocks: Array.isArray(hints.semanticBlocks) ? hints.semanticBlocks.slice(0, 48) : [],
  };
}

function rows(screenContext = {}) {
  const ui = uiSurfaceFor(screenContext);
  return [
    ...ui.visibleButtons.map((row) => ({ ...row, semanticType: text(row?.semanticType) || 'button' })),
    ...ui.visibleMenus.map((row) => ({ ...row, semanticType: text(row?.semanticType) || 'button' })),
    // Disabled controls remain part of the authorized current surface so a
    // live workflow target can be explained/highlighted truthfully. They are
    // never treated as executable actions; modalTargets still filters them
    // out when selecting a control for safe progression.
    ...ui.disabledButtons.map((row) => ({ ...row, semanticType: text(row?.semanticType) || 'button' })),
    ...ui.activeTabs.map((row) => ({ ...row, semanticType: text(row?.semanticType) || 'tab' })),
    ...ui.tableHeaders.map((row) => ({ label: typeof row === 'string' ? row : row?.label, ...row, semanticType: text(row?.semanticType) || 'field' })),
    ...ui.modalTitles.map((row) => ({ label: typeof row === 'string' ? row : row?.label, ...row, semanticType: text(row?.semanticType) || 'modal' })),
    ...ui.pageTitles.map((row) => ({ label: typeof row === 'string' ? row : row?.label, ...row, semanticType: text(row?.semanticType) || 'section' })),
    ...ui.semanticElements.map((row) => ({ ...row, semanticType: text(row?.semanticType) || 'section' })),
  ].map((row) => ({
    ...row,
    label: text(row?.label),
    targetKey: targetKeyFor(screenContext?.path, row),
    identitySource: row?.identitySource || (hasExplicitTargetIdentity(row) ? 'CANONICAL' : 'LEGACY_LABEL'),
  }))
    .filter((row) => row.label && row.label.length <= 120);
}

function blockRows(screenContext = {}) {
  const ui = uiSurfaceFor(screenContext);
  return ui.semanticBlocks
    .map((row) => ({
      ...row,
      label: text(row?.label),
      semanticType: 'block',
      targetKind: 'BLOCK',
      targetKey: text(row?.blockKey || row?.semanticId),
      blockKey: text(row?.blockKey),
      semanticId: text(row?.semanticId),
    }))
    .filter((row) => row.label && row.targetKey);
}

function screenAuthorized({ user, screenContext }) {
  const userRole = text(user?.role).toUpperCase();
  const contextRole = text(screenContext?.role).toUpperCase();
  if (!userRole || (contextRole && contextRole !== userRole)) return false;
  return resolveAuthorizedScreenContext(user, screenContext, screenContext?.id).status === 'FOUND';
}

function scoreRow(row, query) {
  const label = normalized(row?.label);
  const needle = normalized(query);
  if (!label || !needle) return 0;
  if (label === needle) return 100;
  if (label.includes(needle) || needle.includes(label)) return 80;
  const words = needle.split(/\s+/).filter((word) => word.length > 2);
  const labelWords = label.split(/\s+/).filter((word) => word.length > 2);
  // Turkish inflection is part of the semantic label match: "haritayı"
  // refers to the visible "Harita aç" control just as "rotayı" refers to
  // "Rota aç". Compare normalized word stems in both directions instead of
  // maintaining phrase-specific aliases.
  const matched = words.filter((word) => labelWords.some((labelWord) => labelWord.startsWith(word) || word.startsWith(labelWord))).length;
  return matched ? 40 + matched * 8 : 0;
}

function workflowIntentForPlan(semanticPlan, conversationState = null) {
  return text(
    semanticPlan?.workflowIntent
      || semanticPlan?.continuationBasePlan?.workflowIntent
      || semanticPlan?.returnTargetPlan?.workflowIntent
      || conversationState?.activeGuidedTask?.semanticPlan?.workflowIntent
      || conversationState?.lastSettledResult?.semanticPlan?.workflowIntent
      || conversationState?.authorizedProductContext?.semanticPlan?.workflowIntent,
  );
}

function canonicalGuidancePlan(semanticPlan) {
  const family = text(semanticPlan?.family);
  return ["UI_GUIDANCE", "CONTINUE_CURRENT_REASONING", "EXPLAIN_CURRENT_TARGET"].includes(family)
    || (family === "SCREEN_CONTEXT" && (semanticPlan?.screenContextIntent === true || semanticPlan?.typedRequest?.screenContextIntent === true));
}

function explicitTargetPhrase({ message, prior, currentPath = '', workflowRequest = false, continuation = false }) {
  const raw = text(message);
  if (workflowRequest) {
    // The sentence describes the workflow, not the literal UI label. Resolve
    // only against controls that are actually present on the current screen.
    // The company Planlama Merkezi is the canonical safe entry point for a
    // new shift; the resolver still returns NOT_FOUND when that control is
    // absent, so no target is invented.
    return /\/company\/?$/iu.test(text(currentPath))
      ? 'Rehberi Başlat'
      : raw;
  }
  if (continuation) {
    return text(prior?.label);
  }
  const cleaned = raw
    .replace(/(?:nerede|neresi|hangisi|hangi (?:buton|sekme|alan|kart|bölüm|bolum))/iu, '')
    .replace(/[?!.:]+/g, ' ')
    .trim();
  return cleaned;
}

function isWorkflowGuidanceMessage(message) {
  const raw = text(message);
  return /\b(?:vardiya|sefer|shift)\p{L}*\b/iu.test(raw)
    && /\b(?:olustur|oluştur|ac|aç|ekle|goster|göster|gotur|götür|bulamad|bulamıyor|bulamiyor|nereden)\p{L}*\b/iu.test(raw);
}

function isContinuationMessage(message) {
  return /^(?:devam(?: et)?|girdim|yaptım|yaptim|bulamadım|bulamadim|geri|burada göremiyorum|burada goremiyorum)$/iu.test(text(message));
}

function isQuoteFloorDetailRequest({ semanticPlan, message } = {}) {
  const quoteFloorEvidence = semanticPlan?.canonicalRequest?.typedEvidence?.specificity?.quoteFloorAnalysisEvidence === true;
  if (!quoteFloorEvidence) return false;
  const value = normalized(message);
  return /\b(?:ayrinti|detay|ac|goster|incele|gorme|goruntule)\p{L}*\b/iu.test(value);
}

function isOperationHealthProblemsShowRequest({ currentPath, semanticPlan } = {}) {
  if (!/(?:^|\/)operation-health$/.test(String(currentPath || '').trim())) return false;
  const operation = String(semanticPlan?.canonicalRequest?.operation || '').trim();
  const metricMode = String(
    semanticPlan?.operationHealthMetricMode
      || semanticPlan?.typedRequest?.operationHealthMetricMode
      || semanticPlan?.canonicalRequest?.operationHealthMetricMode
      || '',
  ).trim().toUpperCase();
  if (!['VIEW_AUTHORIZED_SURFACE', 'NAVIGATE_AUTHORIZED_SURFACE'].includes(operation)
    && !(operation === 'DIAGNOSE_CURRENT_ISSUE' && ['GPS_ISSUE_SUBSET', 'METRIC_DEFINITION'].includes(metricMode))) return false;
  const taskType = String(
    semanticPlan?.typedRequest?.taskType
      || semanticPlan?.canonicalRequest?.typedEvidence?.taskType
      || '',
  ).trim().toUpperCase();
  const normalizedMeaning = text(semanticPlan?.canonicalRequest?.currentRequest?.normalizedMeaning).toLocaleLowerCase('tr-TR');
  const explicitProblemSurfaceGuidance = semanticPlan?.family === 'UI_GUIDANCE'
    && semanticPlan?.explicitUiGuidance === true
    && String(semanticPlan?.canonicalRequest?.request?.domain || semanticPlan?.canonicalRequest?.domain || '').toUpperCase() === 'OPERATIONS'
    && /(?:sorun|problem|sıkıntı|sikinti|aksak|arıza|ariza)/iu.test(normalizedMeaning)
    && /(?:göster|goster|aç|ac|incele|götür|gotur)/iu.test(normalizedMeaning);
  const canonicalOperationHealthMetricIssue = operation === 'DIAGNOSE_CURRENT_ISSUE'
    && ['GPS_ISSUE_SUBSET', 'METRIC_DEFINITION'].includes(metricMode);
  return taskType === 'ISSUE'
    || String(semanticPlan?.family || '').trim().toUpperCase() === 'ISSUE_DIAGNOSTIC'
    || semanticPlan?.canonicalRequest?.typedEvidence?.specificity?.issueSurfaceViewEvidence === true
    || explicitProblemSurfaceGuidance
    || canonicalOperationHealthMetricIssue;
}

function selectedShiftMissingDataTarget({ currentPath, semanticPlan, screenContext } = {}) {
  if (currentPath !== '/room/shifts') return null;
  const screenRecordId = Number(screenContext?.selectedEntityId || screenContext?.selectedRecordId || 0) || 0;
  if (screenRecordId <= 0) return null;
  const screenEntityType = text(screenContext?.selectedEntityType).toLowerCase();
  if (screenEntityType && screenEntityType !== 'shift') return null;
  const questionType = text(
    semanticPlan?.publicQuestionType
      || semanticPlan?.typedRequest?.publicQuestionType
      || semanticPlan?.canonicalRequest?.typedEvidence?.publicQuestionType
      || semanticPlan?.canonicalRequest?.typedEvidence?.questionType,
  ).toUpperCase();
  const entityType = text(
    semanticPlan?.entity?.type
      || semanticPlan?.entities?.[0]?.type
      || semanticPlan?.typedRequest?.entityType
      || semanticPlan?.canonicalRequest?.typedEvidence?.entityType
      || screenContext?.selectedEntityType,
  ).toLowerCase();
  const recordId = Number(
    screenRecordId
      || semanticPlan?.entity?.id
      || semanticPlan?.entities?.[0]?.id
      || 0,
  ) || 0;
  if (questionType !== 'MISSING_DATA_HELP' || entityType !== 'shift' || recordId <= 0) return null;
  return { targetKey: `room-shifts:shift:${recordId}:details`, recordId };
}

function selectedShiftTaskTarget({ currentPath, semanticPlan, screenContext } = {}) {
  if (currentPath !== '/room/shifts') return null;
  const recordId = Number(screenContext?.selectedEntityId || screenContext?.selectedRecordId || 0) || 0;
  if (recordId <= 0) return null;
  const entityType = text(screenContext?.selectedEntityType || semanticPlan?.entity?.type).toLowerCase();
  if (entityType && entityType !== 'shift') return null;
  const taskType = text(semanticPlan?.typedRequest?.taskType).toUpperCase();
  const continuationOfGuidance = text(semanticPlan?.family).toUpperCase() === 'CONTINUE_CURRENT_REASONING'
    && text(semanticPlan?.continuationBasePlan?.family).toUpperCase() === 'UI_GUIDANCE';
  const roomCapabilityBoundaryContinuation = text(semanticPlan?.family).toUpperCase() === 'UI_GUIDANCE'
    && text(semanticPlan?.roleCapabilityBoundary).toUpperCase() === 'ROOM_CREATE_UNSUPPORTED'
    && semanticPlan?.typedRequest?.continuationIntent === true
    && text(semanticPlan?.typedRequest?.continuationAction).toUpperCase() === 'CONTINUE';
  if (taskType !== 'NEXT_ACTION' && !continuationOfGuidance && !roomCapabilityBoundaryContinuation) return null;
  return { targetKey: `room-shifts:shift:${recordId}:details`, recordId };
}

function explicitOfferRecordId(semanticPlan) {
  const ref = (Array.isArray(semanticPlan?.canonicalRequest?.candidateEntityRefs)
    ? semanticPlan.canonicalRequest.candidateEntityRefs
    : [])
    .find((candidate) => String(candidate?.type || '').toUpperCase() === 'OFFER' && Number(candidate?.id) > 0);
  return Number(ref?.id) > 0 ? Math.trunc(Number(ref.id)) : 0;
}

function isMapEnlargementRequest(message) {
  const value = normalized(message);
  return /\b(?:harita|zoom)\p{L}*\b/iu.test(value)
    && /\b(?:buyut|yaklastir|yakinlastir|genislet|zoom)\p{L}*\b/iu.test(value);
}

function mapEnlargementTarget(available) {
  return (Array.isArray(available) ? available : []).find((row) => !row.disabled
    && (/(?:buyuk|buyut|yaklastir|yakinlastir|yakınlastır|genislet|zoom)\p{L}*/iu.test(normalized(row.label))
      || /map[_-](?:modal[_-])?open|zoom[_-]in/iu.test(normalized(row.semanticType))
      || /(?:map|zoom)[_-].*(?:open|in)/iu.test(String(row.targetKey || "")))) || null;
}

function capabilityTargetForRows(available, capabilityIntent, message = '') {
  const rowsForCapability = Array.isArray(available) ? available.filter((row) => !row.disabled) : [];
  if (capabilityIntent === 'IMPORT_PERSONNEL') {
    return rowsForCapability.find((row) => /excel\s*\/\s*csv|ice\s*aktarma|içe\s*aktarma|import|toplu.*(?:personel|calisan)|dosya.*(?:sec|seç)/iu.test(row.label)) || null;
  }
  if (capabilityIntent === 'ADD_PERSONNEL') {
    return rowsForCapability.find((row) => /^ekle$/iu.test(row.label))
      || rowsForCapability.find((row) => /personel.*ekle|calisan.*ekle|ekle.*personel|ekle.*calisan/iu.test(row.label))
      || null;
  }
  if (capabilityIntent === 'ENTER_ADDRESS') {
    const query = normalized(message);
    if (/\btemizle\b.*(?:ilerle|ılerle)/iu.test(query)) {
      return rowsForCapability.find((row) => /\badres\b.*\btemizle\b.*(?:ilerle|ılerle)/iu.test(normalized(row.label)))
        || rowsForCapability.find((row) => /\btemizle\b.*(?:ilerle|ılerle)/iu.test(normalized(row.label)))
        || null;
    }
    return rowsForCapability.find((row) => /^adres$/iu.test(row.label))
      || rowsForCapability.find((row) => /adresten\s+bul|adres.*dogrula|adres.*doğrula/iu.test(row.label))
      || null;
  }
  if (capabilityIntent === 'PREPARE_STOPS') {
    return rowsForCapability.find((row) => /durakları\s+hazırla|duraklari\s+hazirla/iu.test(row.label))
      || rowsForCapability.find((row) => /durak\s+(?:üret|uret)|vardiyadan\s+durakları\s+çek|vardiyadan\s+duraklari\s+cek/iu.test(row.label))
      || null;
  }
  return null;
}

function screenContextGuidanceTarget({ currentPath, semanticPlan, available } = {}) {
  const family = text(semanticPlan?.family).toUpperCase();
  const typedTask = text(semanticPlan?.typedRequest?.taskType || semanticPlan?.taskType).toUpperCase();
  const screenContextGuidance = (family === 'SCREEN_CONTEXT' && typedTask === 'SCREEN_CONTEXT')
    || (family === 'CONTINUE_CURRENT_REASONING'
      && text(semanticPlan?.continuationBasePlan?.family).toUpperCase() === 'SCREEN_CONTEXT');
  if (!screenContextGuidance) return null;

  const targetKey = currentPath === '/room/offers'
    ? 'room:offers'
    : currentPath === '/room/map'
      ? 'room-map:vehicle-list'
      : '';
  if (!targetKey) return null;
  return (Array.isArray(available) ? available : [])
    .find((row) => row.identitySource === 'CANONICAL' && row.targetKey === targetKey) || null;
}

export function isCopilotGuidanceMessage(message) {
  return GUIDANCE_RE.test(text(message)) || isWorkflowGuidanceMessage(message);
}

export function isCriticalCopilotTarget(row) {
  return CRITICAL_ACTION_RE.test(text(row?.label));
}

export function resolveCopilotGuidedTarget({ user, screenContext = {}, conversationState = null, semanticPlan = null, message = '' } = {}) {
  const prior = conversationState?.guidedTarget && typeof conversationState.guidedTarget === 'object'
    ? conversationState.guidedTarget
    : null;
  const currentPath = text(screenContext?.path);
  const hasCanonicalDecision = Boolean(semanticPlan?.family);
  const canonicalWorkflow = ["CREATE_SHIFT", "OPEN_SHIFT_SURFACE", "OPEN_OFFER_SURFACE", "OPEN_CHECKIN_SURFACE", "OPEN_APPLIED_ROUTE_SURFACE"].includes(workflowIntentForPlan(
    semanticPlan,
    text(semanticPlan?.family) === 'CONTINUE_CURRENT_REASONING' ? conversationState : null,
  ));
  const compatibilityWorkflow = !hasCanonicalDecision
    && ["CREATE_SHIFT", "OPEN_SHIFT_SURFACE", "OPEN_OFFER_SURFACE", "OPEN_CHECKIN_SURFACE", "OPEN_APPLIED_ROUTE_SURFACE"].includes(workflowIntentForPlan(null, conversationState));
  const workflowRequest = canonicalWorkflow || compatibilityWorkflow || (!hasCanonicalDecision && isWorkflowGuidanceMessage(message));
  const continuation = text(semanticPlan?.family) === 'CONTINUE_CURRENT_REASONING'
    || text(semanticPlan?.family) === 'EXPLAIN_CURRENT_TARGET'
    || (!hasCanonicalDecision && isContinuationMessage(message));
  const quoteFloorDetailRequest = isQuoteFloorDetailRequest({ semanticPlan, message });
  const operationHealthProblemsShowRequest = isOperationHealthProblemsShowRequest({ currentPath, semanticPlan });
  const operationHealthGuidanceMeaning = text(semanticPlan?.canonicalRequest?.currentRequest?.normalizedMeaning).toLocaleLowerCase('tr-TR');
  const operationHealthGuidanceOnWrongScreen = semanticPlan?.family === 'UI_GUIDANCE'
    && semanticPlan?.explicitUiGuidance === true
    && String(semanticPlan?.canonicalRequest?.domain || '').toUpperCase() === 'OPERATIONS'
    && ['VIEW_AUTHORIZED_SURFACE', 'NAVIGATE_AUTHORIZED_SURFACE'].includes(String(semanticPlan?.canonicalRequest?.operation || '').toUpperCase())
    && /(?:sorun|problem|sıkıntı|sikinti|aksak|arıza|ariza)/iu.test(operationHealthGuidanceMeaning)
    && currentPath !== '/room/operation-health';
  if (operationHealthGuidanceOnWrongScreen) return null;
  const selectedShiftMissingData = selectedShiftMissingDataTarget({ currentPath, semanticPlan, screenContext });
  const selectedShiftTask = selectedShiftTaskTarget({ currentPath, semanticPlan, screenContext });
  const requestedOfferId = explicitOfferRecordId(semanticPlan);
  const guidanceRequest = canonicalGuidancePlan(semanticPlan)
    || (!hasCanonicalDecision && isCopilotGuidanceMessage(message));
  const agreementCollectionViewRequest = semanticPlan?.agreementCollectionViewIntent === true
    || semanticPlan?.typedRequest?.agreementCollectionViewIntent === true;
  const relationshipIntent = semanticPlan?.relationshipIntent
    || semanticPlan?.typedRequest?.relationshipIntent
    || null;
  // A target saved for a previous route must not linger.  A *new canonical*
  // guidance decision is different: it describes the current turn and must
  // be resolved against this current screen, even when an earlier workflow
  // target belonged to another route.  Raw compatibility cues alone remain
  // conservative and receive the stale result below.
  const freshCanonicalGuidance = hasCanonicalDecision && guidanceRequest;
  if (!screenAuthorized({ user, screenContext })) {
    return { status: GUIDED_TARGET_STATUSES.UNAUTHORIZED, targetKey: null, screenPath: currentPath || null, reason: 'Bu ekran mevcut rol için yetkili değil.' };
  }
  // Canonical semantic planning has already rejected fabricated or unresolved
  // workflow targets. Do not let raw phrase scoring attach that request to a
  // merely similar visible control; a rejected target must remain NOT_FOUND.
  const semanticWorkflowIntent = workflowIntentForPlan(semanticPlan, text(semanticPlan?.family) === 'CONTINUE_CURRENT_REASONING' ? conversationState : null);
  if (['UNRESOLVED_SHIFT_SURFACE', 'UNRESOLVED_UI_TARGET'].includes(semanticWorkflowIntent)) {
    return { status: GUIDED_TARGET_STATUSES.NOT_FOUND, targetKey: null, screenPath: currentPath || null, reason: 'Bu hedef mevcut yetkili arayüzde doğrulanamadı.' };
  }
  const workflowIntent = semanticWorkflowIntent;
  if (['CREATE_SHIFT', 'OPEN_SHIFT_SURFACE', 'OPEN_OFFER_SURFACE', 'OPEN_CHECKIN_SURFACE', 'OPEN_APPLIED_ROUTE_SURFACE'].includes(workflowIntent)) {
    const roleScreens = buildRoleHelpSummary(user).screens || [];
    const requiredLabels = workflowIntent === 'OPEN_OFFER_SURFACE'
      ? ['Teklifler', 'Ticari Akışım']
      : workflowIntent === 'OPEN_SHIFT_SURFACE'
        ? ['Vardiyalar']
        : workflowIntent === 'OPEN_CHECKIN_SURFACE'
          ? ['Biniş kayıtları']
          : workflowIntent === 'OPEN_APPLIED_ROUTE_SURFACE'
            ? ['Sözleşmeler']
            : ['Planlama Merkezi', 'Gezi / Planlama Merkezi', 'Taşımacılık Firması Merkezi', 'Okul Merkezi', 'Genel Bakış'];
    const roleOwnsRoomReadOnlySurface = ['OPEN_CHECKIN_SURFACE', 'OPEN_APPLIED_ROUTE_SURFACE'].includes(workflowIntent)
      && String(user?.role || '').toUpperCase() === 'ROOM';
    if (!roleOwnsRoomReadOnlySurface && !roleScreens.some((screen) => requiredLabels.includes(String(screen?.label || '').trim()))) {
      return { status: GUIDED_TARGET_STATUSES.UNAUTHORIZED, targetKey: null, screenPath: currentPath || null, reason: 'Bu görev için mevcut rolde yetkili bir hedef ekran bulunmuyor.' };
    }
  }
  if (prior?.targetKey && text(prior.screenPath) && text(prior.screenPath) !== currentPath && !workflowRequest && !freshCanonicalGuidance) {
    return { status: GUIDED_TARGET_STATUSES.STALE, targetKey: null, screenPath: currentPath || null, previousTargetKey: text(prior.targetKey), reason: 'Ekran değişti; önceki hedef artık geçerli değil.' };
  }
  const agreementOperationBridgeIntent = semanticPlan?.agreementOperationBridgeIntent === true
    || semanticPlan?.typedRequest?.agreementOperationBridgeIntent === true;
  const selectedAgreementId = Number(
    semanticPlan?.entity?.id
      || screenContext?.selectedEntityId
      || screenContext?.selectedEntity?.id
      || 0,
  ) || 0;
  const canonicalRelationOperation = text(
    semanticPlan?.canonicalRequest?.operation
      || semanticPlan?.typedRequest?.operation,
  ).toUpperCase();
  const selectedRelationSourceType = text(
    screenContext?.selectedEntityType
      || semanticPlan?.canonicalRequest?.typedEvidence?.entityType,
  ).toLowerCase();
  const hasCanonicalRelationGuidance = canonicalRelationOperation === 'LOOK_UP_RELATION'
    && ['vehicle', 'driver'].includes(selectedRelationSourceType);
  if (!guidanceRequest && !agreementOperationBridgeIntent && !prior?.targetKey && !quoteFloorDetailRequest && !requestedOfferId && !operationHealthProblemsShowRequest && !agreementCollectionViewRequest && !selectedShiftMissingData && !selectedShiftTask && !relationshipIntent && !hasCanonicalRelationGuidance) return null;
  const available = rows(screenContext);
  const availableBlocks = blockRows(screenContext);
  const modalOpen = uiSurfaceFor(screenContext).modalTitles.length > 0;
  const explicitMapEnlargement = isMapEnlargementRequest(message);
  const liveMapEnlargementTarget = explicitMapEnlargement ? mapEnlargementTarget(available) : null;
  if (explicitMapEnlargement && !liveMapEnlargementTarget) {
    return {
      status: GUIDED_TARGET_STATUSES.NOT_FOUND,
      targetKey: null,
      screenPath: currentPath || null,
      expectedTargetLabel: 'Yakınlaştır',
      reason: 'Harita büyütme isteği için canlı Yakınlaştır kontrolü doğrulanamadı; başka bir kontrol hedeflenmedi.',
    };
  }
  const canonicalTypedRelationKind = text(
    semanticPlan?.canonicalRequest?.typedRequest?.relationType
      || semanticPlan?.canonicalRequest?.relationType,
  ).toUpperCase();
  const relationOperation = text(
    semanticPlan?.canonicalRequest?.operation
      || semanticPlan?.typedRequest?.operation,
  ).toUpperCase();
  const selectedEntityType = text(
    screenContext?.selectedEntityType
      || semanticPlan?.canonicalRequest?.typedEvidence?.entityType,
  ).toLowerCase();
  const inferredRelationKind = !relationshipIntent
    && relationOperation === 'LOOK_UP_RELATION'
    && ['vehicle', 'driver'].includes(selectedEntityType)
    ? selectedEntityType === 'vehicle'
      ? 'VEHICLE_TO_SHIFT'
      : /(?:araç|arac|vehicle|plaka)/iu.test(text(message))
        ? 'DRIVER_TO_VEHICLE'
        : 'DRIVER_TO_SHIFT'
    : '';
  const relationKind = text(
    relationshipIntent?.kind
      || semanticPlan?.typedRequest?.relationType
      || canonicalTypedRelationKind
      || inferredRelationKind,
  ).toUpperCase();
  const selectedRelationId = Number(
    screenContext?.selectedRelatedEntityId
      || semanticPlan?.relationshipIntent?.toEntity?.id
      || 0,
  ) || 0;
  if (relationKind === 'VEHICLE_TO_SHIFT'
    && currentPath === '/room/map'
    && selectedRelationId <= 0
    && /vardiya\s+yok|surucu\s+yok|sürücü\s+yok|operasyon\s+bag\p{L}*\s+yok/iu.test(JSON.stringify(screenContext || {}))) {
    return {
      status: GUIDED_TARGET_STATUSES.NOT_FOUND,
      targetKey: null,
      screenPath: currentPath || null,
      reason: 'Seçili araç için yetkili ilişkili vardiya doğrulanamadı; başka bir operasyon hedeflenmedi.',
    };
  }
  const relationTargetSpec = relationKind === 'AGREEMENT_TO_SHIFT_COLLECTION'
    ? { path: '/room/shifts', targetKey: 'room:shifts:tab:contract', semanticId: 'product:room:shifts:tab:contract', label: 'Sözleşmeden Üretilen' }
    : ['VEHICLE_TO_SHIFT', 'VEHICLE_TO_DRIVER'].includes(relationKind)
      ? { path: '/room/vehicles', targetKey: 'room:vehicles:tab:assignments', semanticId: 'product:room:vehicles:tab:assignments', label: 'Atamalar' }
      : ['DRIVER_TO_SHIFT', 'DRIVER_TO_VEHICLE'].includes(relationKind)
        ? { path: '/room/drivers', targetKey: 'room:drivers:tab:shifts', semanticId: 'product:room:drivers:tab:shifts', label: 'Vardiyalar' }
        : null;
  if (relationTargetSpec) {
    if (currentPath !== relationTargetSpec.path) {
      return {
        status: GUIDED_TARGET_STATUSES.WRONG_SCREEN,
        targetKey: null,
        screenPath: currentPath || null,
        expectedScreenPath: relationTargetSpec.path,
        reason: `Bu ilişki hedefi yalnızca yetkili ${relationTargetSpec.label} yüzeyinde gösterilebilir.`,
      };
    }
    // Relation targets are canonical controls declared by the current product
    // surface. Some clients only send the active tab in uiHints, so an
    // inactive but authorized relation tab can be omitted from `available`
    // even though the control is present in the current DOM and is safely
    // navigable. Keep the live hint authoritative when present; otherwise use
    // the already-registered canonical target for this exact path/relation.
    const chosenRelationTarget = available.find((row) => row.identitySource === 'CANONICAL' && row.targetKey === relationTargetSpec.targetKey)
      || {
        targetKey: relationTargetSpec.targetKey,
        semanticId: relationTargetSpec.semanticId,
        label: relationTargetSpec.label,
        semanticType: 'tab',
        identitySource: 'CANONICAL',
      };
    const semanticId = text(chosenRelationTarget.semanticId) || relationTargetSpec.semanticId;
    return {
      status: GUIDED_TARGET_STATUSES.FOUND,
      targetKind: 'CONTROL',
      targetKey: relationTargetSpec.targetKey,
      identitySource: 'CANONICAL',
      legacyLabelFallbackUsed: false,
      semanticId,
      label: chosenRelationTarget.label || relationTargetSpec.label,
      semanticType: chosenRelationTarget.semanticType || 'tab',
      screenPath: currentPath || null,
      role: text(user?.role).toUpperCase(),
      authorizedContext: { role: text(user?.role).toUpperCase(), screenPath: currentPath || null, screenId: Number(screenContext?.id || 0) || null },
      safeAction: 'NAVIGATE',
      anchor: { targetKind: 'CONTROL', targetKey: relationTargetSpec.targetKey, semanticId },
      locator: { targetKind: 'CONTROL', targetKey: relationTargetSpec.targetKey, semanticId, label: chosenRelationTarget.label || relationTargetSpec.label, semanticType: chosenRelationTarget.semanticType || 'tab' },
      callout: { targetKind: 'CONTROL', targetKey: relationTargetSpec.targetKey, semanticId, label: chosenRelationTarget.label || relationTargetSpec.label, identitySource: 'CANONICAL' },
      criticalActionExecution: false,
      reason: `Yetkili ilişki görünümü için ${relationTargetSpec.label} sekmesi açılmalıdır; salt-okunur hedef doğrulandı.`,
    };
  }
  if (agreementCollectionViewRequest) {
    const onAgreementSurface = currentPath === '/room/agreements';
    const targetKey = onAgreementSurface ? 'room:agreements:list' : 'room:agreements';
    const chosenCollection = available.find((row) => row.identitySource === 'CANONICAL' && row.targetKey === targetKey);
    if (!chosenCollection) {
      return {
        status: GUIDED_TARGET_STATUSES.NOT_FOUND,
        targetKey: null,
        screenPath: currentPath || null,
        expectedTargetKey: targetKey,
        reason: onAgreementSurface
          ? 'Yetkili sözleşme listesi hedefi mevcut yüzeyde doğrulanamadı; menü hedefiyle ikame edilmedi.'
          : 'Yetkili Sözleşmeler yüzeyi mevcut rolde doğrulanamadı.',
      };
    }
    const semanticId = text(chosenCollection.semanticId) || 'product:room:agreements:list';
    return {
      status: GUIDED_TARGET_STATUSES.FOUND,
      targetKind: 'CONTROL',
      targetKey,
      identitySource: 'CANONICAL',
      legacyLabelFallbackUsed: false,
      semanticId,
      label: chosenCollection.label,
      semanticType: chosenCollection.semanticType || 'section',
      screenPath: currentPath || null,
      role: text(user?.role).toUpperCase(),
      authorizedContext: { role: text(user?.role).toUpperCase(), screenPath: currentPath || null, screenId: Number(screenContext?.id || 0) || null },
      safeAction: onAgreementSurface ? 'HIGHLIGHT' : 'NAVIGATE',
      anchor: { targetKind: 'CONTROL', targetKey, semanticId },
      locator: { targetKind: 'CONTROL', targetKey, semanticId, label: chosenCollection.label, semanticType: chosenCollection.semanticType || 'section' },
      callout: { targetKind: 'CONTROL', targetKey, semanticId, label: chosenCollection.label, identitySource: 'CANONICAL' },
      criticalActionExecution: false,
      reason: onAgreementSurface
        ? 'Yetkili sözleşme koleksiyonu salt-okunur görünürlük için gösterildi; seçili kayıt kapsamı kullanılmadı.'
        : 'Yetkili Sözleşmeler yüzeyine güvenli gezinme hedefi gösterildi; iş yazımı yapılmadı.',
    };
  }
  if (agreementOperationBridgeIntent) {
    if (currentPath !== '/room/agreements') {
      return {
        status: GUIDED_TARGET_STATUSES.WRONG_SCREEN,
        targetKey: null,
        screenPath: currentPath || null,
        expectedScreenPath: '/room/agreements',
        reason: 'Sözleşme operasyon köprüsü yalnızca yetkili Sözleşmeler yüzeyinde gösterilebilir.',
      };
    }
    if (!selectedAgreementId) {
      return {
        status: GUIDED_TARGET_STATUSES.NOT_FOUND,
        targetKey: null,
        screenPath: currentPath || null,
        reason: 'Operasyon köprüsünü göstermek için seçili ve yetkili bir sözleşme gerekli.',
      };
    }
    const targetKey = `room:agreements:agreement:${selectedAgreementId}:operation-bridge`;
    const chosenBridge = available.find((row) => row.identitySource === 'CANONICAL' && row.targetKey === targetKey);
    if (!chosenBridge) {
      return {
        status: GUIDED_TARGET_STATUSES.NOT_FOUND,
        targetKey: null,
        screenPath: currentPath || null,
        expectedTargetKey: targetKey,
        reason: 'Seçili sözleşmenin operasyon köprüsü mevcut yetkili yüzeyde doğrulanamadı.',
      };
    }
    const semanticId = text(chosenBridge.semanticId) || `product:room:agreement:${selectedAgreementId}:operation-bridge`;
    return {
      status: GUIDED_TARGET_STATUSES.FOUND,
      targetKind: 'CONTROL',
      targetKey,
      identitySource: 'CANONICAL',
      legacyLabelFallbackUsed: false,
      semanticId,
      label: chosenBridge.label,
      semanticType: chosenBridge.semanticType || 'button',
      screenPath: currentPath || null,
      role: text(user?.role).toUpperCase(),
      authorizedContext: {
        role: text(user?.role).toUpperCase(),
        screenPath: currentPath || null,
        screenId: Number(screenContext?.id || 0) || null,
        agreementId: selectedAgreementId,
      },
      safeAction: 'HIGHLIGHT',
      anchor: { targetKind: 'CONTROL', targetKey, semanticId, recordType: 'AGREEMENT', recordId: selectedAgreementId },
      locator: { targetKind: 'CONTROL', targetKey, semanticId, label: chosenBridge.label, semanticType: chosenBridge.semanticType || 'button' },
      callout: { targetKind: 'CONTROL', targetKey, semanticId, label: chosenBridge.label, identitySource: 'CANONICAL' },
      criticalActionExecution: false,
      reason: `Yalnızca seçili ve yetkili Sözleşme #${selectedAgreementId} operasyon köprüsü salt-okunur görünürlük için gösterildi.`,
    };
  }
  const liveWorkflowState = screenContext?.uiHints?.workflowState && typeof screenContext.uiHints.workflowState === 'object'
    ? screenContext.uiHints.workflowState
    : null;
  const capabilityIntent = text(semanticPlan?.capabilityIntent);
  if (selectedShiftMissingData || selectedShiftTask) {
    const selectedShiftTarget = selectedShiftMissingData || selectedShiftTask;
    const chosenDetails = available.find((row) => row.identitySource === 'CANONICAL' && row.targetKey === selectedShiftTarget.targetKey);
    if (!chosenDetails) {
      return {
        status: GUIDED_TARGET_STATUSES.NOT_FOUND,
        targetKey: null,
        screenPath: currentPath || null,
        expectedTargetKey: selectedShiftTarget.targetKey,
        reason: `Seçili Vardiya #${selectedShiftTarget.recordId} ayrıntı hedefi mevcut yetkili yüzeyde doğrulanamadı.`,
      };
    }
    const semanticId = text(chosenDetails.semanticId) || `product:room:shift:${selectedShiftTarget.recordId}:details`;
    return {
      status: GUIDED_TARGET_STATUSES.FOUND,
      targetKind: 'CONTROL',
      targetKey: selectedShiftTarget.targetKey,
      identitySource: 'CANONICAL',
      legacyLabelFallbackUsed: false,
      semanticId,
      label: chosenDetails.label,
      semanticType: chosenDetails.semanticType || 'disclosure',
      screenPath: currentPath || null,
      role: text(user?.role).toUpperCase(),
      authorizedContext: {
        role: text(user?.role).toUpperCase(),
        screenPath: currentPath || null,
        screenId: Number(screenContext?.id || 0) || null,
        shiftId: selectedShiftTarget.recordId,
      },
      safeAction: 'HIGHLIGHT',
      anchor: { targetKind: 'CONTROL', targetKey: selectedShiftTarget.targetKey, semanticId, recordType: 'SHIFT', recordId: selectedShiftTarget.recordId },
      locator: { targetKind: 'CONTROL', targetKey: selectedShiftTarget.targetKey, semanticId, label: chosenDetails.label, semanticType: chosenDetails.semanticType || 'disclosure' },
      callout: { targetKind: 'CONTROL', targetKey: selectedShiftTarget.targetKey, semanticId, label: chosenDetails.label, identitySource: 'CANONICAL' },
      criticalActionExecution: false,
      reason: `Yalnızca seçili ve yetkili Vardiya #${selectedShiftTarget.recordId} ayrıntıları salt-okunur görünürlük için gösterildi.`,
    };
  }
  const currentTurnTargetReference = semanticPlan?.currentTargetReference
    || semanticPlan?.canonicalRequestEnvelope?.canonicalShape?.currentTargetReference
    || semanticPlan?.canonicalRequest?.currentTargetReference
    || null;
  const liveCurrentTargetKey = text(currentTurnTargetReference?.targetKey);
  const liveCanonicalControlTarget = liveCurrentTargetKey
    ? available.find((row) => row.identitySource === 'CANONICAL' && row.targetKey === liveCurrentTargetKey)
    : null;
  const requestedTargetKind = text(semanticPlan?.targetKind).toUpperCase();
  const requestedBlockKey = text(semanticPlan?.blockKey || semanticPlan?.semanticId);
  if (requestedOfferId) {
    const targetKey = `room:offers:offer:${requestedOfferId}`;
    // The current browser surface is the authority for this turn. The
    // canonical conversation-state sanitizer may label a target as
    // LEGACY_LABEL while preserving its exact data-copilot-target identity;
    // requiring a second identitySource pin here would hide a live #36 card
    // and incorrectly fall back to a stale target explanation.
    const chosenOffer = available.find((row) => row.targetKey === targetKey);
    if (!chosenOffer) {
      return {
        status: GUIDED_TARGET_STATUSES.NOT_FOUND,
        targetKey: null,
        screenPath: currentPath || null,
        expectedTargetKey: targetKey,
        reason: `Teklif #${requestedOfferId} mevcut ve yetkili hedef olarak bu yüzeyde doğrulanamadı.`,
      };
    }
    const restoresPreviousOffer = String(semanticPlan?.canonicalRequest?.operation || '').trim() === 'NAVIGATE_AUTHORIZED_SURFACE'
      && (Array.isArray(semanticPlan?.canonicalRequest?.candidateEntityRefs)
        ? semanticPlan.canonicalRequest.candidateEntityRefs
        : [])
        .some((candidate) => String(candidate?.type || '').toUpperCase() === 'OFFER'
          && Number(candidate?.id) === requestedOfferId
          && String(candidate?.source || '').toUpperCase() === 'PREVIOUS_RECORD_CONTEXT');
    return {
      status: GUIDED_TARGET_STATUSES.FOUND,
      targetKind: 'CONTROL',
      targetKey,
      identitySource: 'CANONICAL',
      legacyLabelFallbackUsed: false,
      semanticId: text(chosenOffer.semanticId) || `product:room:offer:${requestedOfferId}`,
      label: chosenOffer.label,
      semanticType: chosenOffer.semanticType || 'disclosure',
      screenPath: currentPath || null,
      role: text(user?.role).toUpperCase(),
      authorizedContext: { role: text(user?.role).toUpperCase(), screenPath: currentPath || null, screenId: Number(screenContext?.id || 0) || null, offerId: requestedOfferId },
      safeAction: restoresPreviousOffer ? 'NAVIGATE' : 'HIGHLIGHT',
      anchor: { targetKind: 'CONTROL', targetKey, semanticId: text(chosenOffer.semanticId) || null, recordType: 'OFFER', recordId: requestedOfferId },
      locator: { targetKind: 'CONTROL', targetKey, semanticId: text(chosenOffer.semanticId) || null, label: chosenOffer.label, semanticType: chosenOffer.semanticType || 'disclosure' },
      callout: { targetKind: 'CONTROL', targetKey, semanticId: text(chosenOffer.semanticId) || null, label: chosenOffer.label, identitySource: 'CANONICAL' },
      criticalActionExecution: false,
      reason: `Yalnızca yetkili Teklif #${requestedOfferId} kaydının mevcut ayrıntı hedefi gösterildi; iş yazımı yapılmadı.`,
    };
  }
  if (quoteFloorDetailRequest) {
    const targetKey = 'room:financial-operations:quote-floor-details';
    const chosenDetail = available.find((row) => row.identitySource === 'CANONICAL' && row.targetKey === targetKey);
    if (!chosenDetail) {
      return {
        status: GUIDED_TARGET_STATUSES.NOT_FOUND,
        targetKey: null,
        screenPath: currentPath || null,
        expectedTargetKey: targetKey,
        reason: 'Teklif tabanı ayrıntı disclosure hedefi mevcut yetkili yüzeyde doğrulanamadı.',
      };
    }
    return {
      status: GUIDED_TARGET_STATUSES.FOUND,
      targetKind: 'CONTROL',
      targetKey,
      identitySource: 'CANONICAL',
      legacyLabelFallbackUsed: false,
      semanticId: text(chosenDetail.semanticId) || 'product:room:financial-operations:quote-floor-details',
      label: chosenDetail.label,
      semanticType: chosenDetail.semanticType || 'disclosure',
      screenPath: currentPath || null,
      role: text(user?.role).toUpperCase(),
      authorizedContext: { role: text(user?.role).toUpperCase(), screenPath: currentPath || null, screenId: Number(screenContext?.id || 0) || null },
      safeAction: 'HIGHLIGHT',
      anchor: { targetKind: 'CONTROL', targetKey, semanticId: text(chosenDetail.semanticId) || null },
      locator: { targetKind: 'CONTROL', targetKey, semanticId: text(chosenDetail.semanticId) || null, label: chosenDetail.label, semanticType: chosenDetail.semanticType || 'disclosure' },
      callout: { targetKind: 'CONTROL', targetKey, semanticId: text(chosenDetail.semanticId) || null, label: chosenDetail.label, identitySource: 'CANONICAL' },
      criticalActionExecution: false,
      reason: 'Mevcut finans ayrıntı disclosure hedefi yalnızca salt-okunur görünürlük için gösterildi.',
    };
  }
  // A live canonical control is authoritative for the current turn. A
  // role-labelled semantic/block id carried by recovery must not shadow the
  // verified DOM control for the same selected record.
  if ((requestedTargetKind === 'BLOCK' || requestedBlockKey) && !liveCanonicalControlTarget) {
    const chosenBlock = availableBlocks.find((row) =>
      (requestedBlockKey && (row.blockKey === requestedBlockKey || row.semanticId === requestedBlockKey))
      || (!requestedBlockKey && row.label === text(semanticPlan?.targetLabel)),
    );
    if (!chosenBlock) {
      return {
        status: GUIDED_TARGET_STATUSES.NOT_FOUND,
        targetKey: null,
        screenPath: currentPath || null,
        expectedBlockKey: requestedBlockKey || null,
        reason: 'Bu semantic blok mevcut ve yetkili arayüzde doğrulanamadı.',
      };
    }
    const blockTarget = {
      status: GUIDED_TARGET_STATUSES.FOUND,
      targetKind: 'BLOCK',
      identitySource: 'CANONICAL',
      legacyLabelFallbackUsed: false,
      targetKey: chosenBlock.targetKey,
      blockKey: chosenBlock.blockKey || chosenBlock.targetKey,
      semanticId: chosenBlock.semanticId || null,
      label: chosenBlock.label,
      semanticType: 'block',
      screenPath: currentPath || null,
      role: text(user?.role).toUpperCase(),
      authorizedContext: { role: text(user?.role).toUpperCase(), screenPath: currentPath || null, screenId: Number(screenContext?.id || 0) || null },
      safeAction: 'HIGHLIGHT',
      anchor: { targetKind: 'BLOCK', targetKey: chosenBlock.targetKey, blockKey: chosenBlock.blockKey || chosenBlock.targetKey, semanticId: chosenBlock.semanticId || null },
      locator: { targetKind: 'BLOCK', blockKey: chosenBlock.blockKey || chosenBlock.targetKey, semanticId: chosenBlock.semanticId || null },
      callout: { targetKind: 'BLOCK', targetKey: chosenBlock.targetKey, blockKey: chosenBlock.blockKey || chosenBlock.targetKey, label: chosenBlock.label, identitySource: 'CANONICAL' },
      criticalActionExecution: false,
      reason: 'Yalnızca mevcut ve yetkili semantic blok gösterilir; iş yazımı yapılmaz.',
    };
    return blockTarget;
  }
  const capabilityTarget = capabilityIntent
    ? capabilityTargetForRows(available, capabilityIntent, message)
    : null;
  if (capabilityIntent && !capabilityTarget) {
    return {
      status: GUIDED_TARGET_STATUSES.NOT_FOUND,
      targetKey: null,
      screenPath: currentPath || null,
      expectedCapability: capabilityIntent,
      reason: 'Bu yetenek için mevcut ve yetkili bir kontrol doğrulanamadı.',
    };
  }
  const query = explicitTargetPhrase({ message, prior, currentPath, workflowRequest, continuation });
  // A planner reference is prior conversational context, not a request for
  // that exact DOM node. Only an explicit current-turn target key is strict.
  // A target carried by the current UI envelope is authoritative for this
  // turn. A target reconstructed from the previous conversation/task state
  // remains context and must still be allowed to resolve through the normal
  // workflow path (including legacy compatibility fixtures).
  const strictCurrentTurnTargetKey = text(currentTurnTargetReference?.targetKey);
  if (strictCurrentTurnTargetKey) {
    const exactRequested = available.find((row) => row.identitySource === 'CANONICAL' && row.targetKey === strictCurrentTurnTargetKey);
    const liveMapReferenceMatches = Boolean(
      liveMapEnlargementTarget
        && liveMapEnlargementTarget.targetKey === strictCurrentTurnTargetKey,
    );
    if (!exactRequested && !liveMapReferenceMatches) {
      return {
        status: GUIDED_TARGET_STATUSES.NOT_FOUND,
        targetKey: null,
        screenPath: currentPath || null,
        expectedTargetKey: strictCurrentTurnTargetKey,
        reason: 'Kanonik hedef kimliği mevcut yüzeyde doğrulanamadı.',
      };
    }
  }
  const scored = available
    .map((row) => ({ row, score: scoreRow(row, query) }))
    .sort((a, b) => b.score - a.score);
  const modalTargets = modalOpen
    ? available.filter((row) => !row.disabled && /^(?:ileri|devam|konumumu al|konumu al|adresten bul|plan paketi|tarih ve saat|personel|durak)/iu.test(row.label))
    : [];
  const continuationDepth = Math.max(0, Number(semanticPlan?.continuationDepth || 0));
  const modalTarget = modalTargets.length
    ? modalTargets[Math.min(continuation ? continuationDepth : 0, modalTargets.length - 1)]
    : null;
  const liveWorkflowTarget = workflowRequest
    && workflowIntentForPlan(semanticPlan, text(semanticPlan?.family) === 'CONTINUE_CURRENT_REASONING' ? conversationState : null) === 'CREATE_SHIFT'
    && liveWorkflowState?.currentTargetLabel
    ? available.find((row) => normalized(row.label) === normalized(liveWorkflowState.currentTargetLabel))
      || available.find((row) => normalized(row.label).includes(normalized(liveWorkflowState.currentTargetLabel)))
    : null;
  const offerContinuationTarget = workflowRequest
    && continuation
    && workflowIntent === 'OPEN_OFFER_SURFACE'
    && currentPath === '/room/offers'
    ? available.find((row) => row.identitySource === 'CANONICAL' && /^room:offers:offer:\d+$/u.test(String(row.targetKey || '')))
    : null;
  if (workflowRequest
    && workflowIntentForPlan(semanticPlan, text(semanticPlan?.family) === 'CONTINUE_CURRENT_REASONING' ? conversationState : null) === 'CREATE_SHIFT'
    && liveWorkflowState?.currentTargetLabel
    && !liveWorkflowTarget) {
    return {
      status: GUIDED_TARGET_STATUSES.NOT_FOUND,
      targetKey: null,
      screenPath: currentPath || null,
      expectedTargetLabel: text(liveWorkflowState.currentTargetLabel),
      reason: 'Canlı workflow hedefi mevcut yüzeyde doğrulanamadı; başka bir kontrol hedeflenmedi.',
    };
  }
  const canonicalSurfaceNavigation = semanticPlan?.typedRequest?.targetEntityType === 'SURFACE'
    && semanticPlan?.typedRequest?.taskType === 'SCREEN_CONTEXT'
    && semanticPlan?.explicitUiGuidance === true
    // A typed surface envelope can describe either a generic current-surface
    // explanation or a concrete canonical workflow.  The workflow owner must
    // win for offer/shift navigation; otherwise the generic room:home fallback
    // steals the first visible canonical target.
    && !['CREATE_SHIFT', 'OPEN_SHIFT_SURFACE', 'OPEN_OFFER_SURFACE', 'OPEN_CHECKIN_SURFACE', 'OPEN_APPLIED_ROUTE_SURFACE'].includes(workflowIntent);
  const openSurfaceTarget = (workflowIntent === 'OPEN_SURFACE' || canonicalSurfaceNavigation)
    ? available.find((row) => row.identitySource === 'CANONICAL' && row.targetKey === 'room:home')
      || available.find((row) => normalized(row.label) === 'menü' || normalized(row.label) === 'menu')
    : null;
  const dedicatedSurfaceTarget = workflowIntent === 'OPEN_CHECKIN_SURFACE'
    ? available.find((row) => row.identitySource === 'CANONICAL' && row.targetKey === 'room:checkin')
      || available.find((row) => normalized(row.label) === 'biniş kayıtları')
    : workflowIntent === 'OPEN_APPLIED_ROUTE_SURFACE'
      ? available.find((row) => row.identitySource === 'CANONICAL' && row.targetKey === 'room:agreements:tab:applied')
        || available.find((row) => normalized(row.label) === 'uygulanan rota')
      : null;
  const workflowTarget = workflowRequest
    ? capabilityTarget
      || liveWorkflowTarget
      || dedicatedSurfaceTarget
      || openSurfaceTarget
      || (continuation
      ? modalTarget
        || offerContinuationTarget
        || available.find((row) => /rehberi başlat|rehberi baslat/i.test(row.label))
        || available.find((row) => /ayrıntılı çalışma alanını göster|ayrintili calisma alanini goster/i.test(row.label))
        || available.find((row) => /detayları göster|detaylari goster/i.test(row.label))
        || available.find((row) => /planlama merkezi/i.test(row.label))
      : modalTarget
        || (workflowIntent === 'OPEN_SHIFT_SURFACE'
          ? available.find((row) => /^(?:vardiyalar|vardiya listesi)$/iu.test(normalized(row.label)))
          : null)
        || (workflowIntent === 'OPEN_OFFER_SURFACE'
          ? available.find((row) => /teklifler|ticari akışım|ticari akis/iu.test(row.label))
          : null)
        || available.find((row) => /rehberi başlat|rehberi baslat/i.test(row.label))
        || available.find((row) => /ayrıntılı çalışma alanını göster|ayrintili calisma alanini goster/i.test(row.label))
        || available.find((row) => /planlama merkezi/i.test(row.label)))
    : null;
  const exactCanonicalTarget = strictCurrentTurnTargetKey
    ? available.find((row) => row.identitySource === 'CANONICAL' && row.targetKey === strictCurrentTurnTargetKey)
    : null;
  const screenContextTarget = screenContextGuidanceTarget({ currentPath, semanticPlan, available });
  const operationHealthProblemsTarget = operationHealthProblemsShowRequest
    ? available.find((row) => row.identitySource === 'CANONICAL' && row.targetKey === 'room-operation-health:tab:problems')
    : null;
  if (operationHealthProblemsShowRequest && !operationHealthProblemsTarget) {
    return {
      status: GUIDED_TARGET_STATUSES.NOT_FOUND,
      targetKey: null,
      screenPath: currentPath || null,
      expectedTargetKey: 'room-operation-health:tab:problems',
      reason: 'Operasyon sorunları bölümü mevcut yetkili yüzeyde doğrulanamadı; başka bir alan hedeflenmedi.',
    };
  }
  const chosen = operationHealthProblemsTarget
    || exactCanonicalTarget
    || liveMapEnlargementTarget
    || screenContextTarget
    || (workflowRequest
      ? workflowTarget
      : (scored[0]?.score > 0
        ? scored[0].row
        : (continuation && prior?.targetKey ? available.find((row) => row.targetKey === prior.targetKey) : null)));
  if (!chosen) {
    return { status: GUIDED_TARGET_STATUSES.NOT_FOUND, targetKey: null, screenPath: currentPath || null, reason: 'Bu ekranda doğrulanabilir bir hedef bulamadım.' };
  }
  if (isCriticalCopilotTarget(chosen)) {
    return { status: GUIDED_TARGET_STATUSES.NOT_FOUND, targetKey: null, screenPath: currentPath || null, blockedTargetLabel: chosen.label, reason: 'Bu alan iş yazımı veya onay gerektirebilir; Sefer Abi yalnızca güvenli rehberlik yapar.' };
  }
  const offerSurfaceNavigationRequest = workflowIntent === 'OPEN_OFFER_SURFACE'
    && currentPath !== '/room/offers'
    && String(chosen.targetKey || '').trim() === 'room:offers';
  return {
    status: GUIDED_TARGET_STATUSES.FOUND,
    targetKind: 'CONTROL',
    targetKey: chosen.targetKey,
    identitySource: chosen.identitySource || 'LEGACY_LABEL',
    legacyLabelFallbackUsed: chosen.identitySource !== 'CANONICAL',
    semanticId: text(chosen.semanticId) || null,
    label: chosen.label,
    semanticType: chosen.semanticType || 'button',
    screenPath: currentPath || null,
    role: text(user?.role).toUpperCase(),
    authorizedContext: { role: text(user?.role).toUpperCase(), screenPath: currentPath || null, screenId: Number(screenContext?.id || 0) || null },
    safeAction: operationHealthProblemsShowRequest
      && String(semanticPlan?.canonicalRequest?.operation || '').trim() === 'NAVIGATE_AUTHORIZED_SURFACE'
      ? 'NAVIGATE'
      : offerSurfaceNavigationRequest
        ? 'NAVIGATE'
      : 'HIGHLIGHT',
    anchor: { targetKind: 'CONTROL', targetKey: chosen.targetKey, semanticId: text(chosen.semanticId) || null },
    locator: { targetKind: 'CONTROL', targetKey: chosen.targetKey, semanticId: text(chosen.semanticId) || null, label: chosen.label, semanticType: chosen.semanticType || 'button' },
    callout: { targetKind: 'CONTROL', targetKey: chosen.targetKey, semanticId: text(chosen.semanticId) || null, label: chosen.label, identitySource: chosen.identitySource || 'LEGACY_LABEL' },
    criticalActionExecution: false,
    reason: 'Yalnızca mevcut ve yetkili arayüz hedefi gösterilir; iş yazımı yapılmaz.',
  };
}

export function guidedTargetForConversationState(target) {
  if (!target || typeof target !== 'object') return null;
  return {
    status: text(target.status),
    targetKind: text(target.targetKind).toUpperCase() || 'CONTROL',
    targetKey: text(target.targetKey) || null,
    semanticId: text(target.semanticId) || null,
    blockKey: text(target.blockKey) || null,
    label: text(target.label) || null,
    screenPath: text(target.screenPath) || null,
    semanticType: text(target.semanticType) || null,
    role: text(target.role).toUpperCase() || null,
    authorizedContext: target.authorizedContext && typeof target.authorizedContext === 'object' ? { ...target.authorizedContext } : null,
    anchor: target.anchor && typeof target.anchor === 'object' ? { ...target.anchor } : null,
    locator: target.locator && typeof target.locator === 'object' ? { ...target.locator } : null,
    callout: target.callout && typeof target.callout === 'object' ? { ...target.callout } : null,
  };
}
