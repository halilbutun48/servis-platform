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

const CRITICAL_ACTION_RE = /(?:onayla|onay|kabul et|kaydet|uygula|sil|dağıt|dagit|dispatch|sözleşmeyi yürürlüğe al|sozlesmeyi yururluge al|gönder|gonder|teklif ver|teklifi gönder|teklifi gonder|ödemeyi başlat|odemeyi baslat|yetki ver|yetkiyi değiştir|yetkiyi degistir)/iu;
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

function uiSurfaceFor(screenContext = {}) {
  const hints = screenContext?.uiHints && typeof screenContext.uiHints === 'object' ? screenContext.uiHints : {};
  return {
    visibleButtons: Array.isArray(hints.visibleButtons) ? hints.visibleButtons.slice(0, 48) : [],
    disabledButtons: Array.isArray(hints.disabledButtons) ? hints.disabledButtons.slice(0, 16) : [],
    activeTabs: Array.isArray(hints.activeTabs) ? hints.activeTabs.slice(0, 16) : [],
    tableHeaders: Array.isArray(hints.tableHeaders) ? hints.tableHeaders.slice(0, 16) : [],
    modalTitles: Array.isArray(hints.modalTitles) ? hints.modalTitles.slice(0, 8) : [],
    pageTitles: Array.isArray(hints.pageTitles) ? hints.pageTitles.slice(0, 8) : [],
  };
}

function rows(screenContext = {}) {
  const ui = uiSurfaceFor(screenContext);
  return [
    ...ui.visibleButtons.map((row) => ({ ...row, semanticType: text(row?.semanticType) || 'button' })),
    ...ui.activeTabs.map((row) => ({ ...row, semanticType: text(row?.semanticType) || 'tab' })),
    ...ui.tableHeaders.map((row) => ({ label: typeof row === 'string' ? row : row?.label, ...row, semanticType: text(row?.semanticType) || 'field' })),
    ...ui.modalTitles.map((row) => ({ label: typeof row === 'string' ? row : row?.label, ...row, semanticType: text(row?.semanticType) || 'modal' })),
    ...ui.pageTitles.map((row) => ({ label: typeof row === 'string' ? row : row?.label, ...row, semanticType: text(row?.semanticType) || 'section' })),
  ].map((row) => ({ ...row, label: text(row?.label), targetKey: targetKeyFor(screenContext?.path, row) }))
    .filter((row) => row.label && row.label.length <= 120);
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
  const matched = words.filter((word) => label.includes(word)).length;
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
  return ["UI_GUIDANCE", "CONTINUE_CURRENT_REASONING"].includes(family)
    || (family === "SCREEN_CONTEXT" && semanticPlan?.typedRequest?.screenContextIntent === true);
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
  const canonicalWorkflow = ["CREATE_SHIFT", "OPEN_SHIFT_SURFACE", "OPEN_OFFER_SURFACE"].includes(workflowIntentForPlan(
    semanticPlan,
    text(semanticPlan?.family) === 'CONTINUE_CURRENT_REASONING' ? conversationState : null,
  ));
  const compatibilityWorkflow = !hasCanonicalDecision
    && ["CREATE_SHIFT", "OPEN_SHIFT_SURFACE", "OPEN_OFFER_SURFACE"].includes(workflowIntentForPlan(null, conversationState));
  const workflowRequest = canonicalWorkflow || compatibilityWorkflow || (!hasCanonicalDecision && isWorkflowGuidanceMessage(message));
  const continuation = text(semanticPlan?.family) === 'CONTINUE_CURRENT_REASONING'
    || (!hasCanonicalDecision && isContinuationMessage(message));
  const guidanceRequest = canonicalGuidancePlan(semanticPlan)
    || (!hasCanonicalDecision && isCopilotGuidanceMessage(message));
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
  if (['CREATE_SHIFT', 'OPEN_SHIFT_SURFACE', 'OPEN_OFFER_SURFACE'].includes(workflowIntent)) {
    const roleScreens = buildRoleHelpSummary(user).screens || [];
    const requiredLabels = workflowIntent === 'OPEN_OFFER_SURFACE'
      ? ['Teklifler', 'Ticari Akışım']
      : workflowIntent === 'OPEN_SHIFT_SURFACE'
        ? ['Vardiyalar']
        : ['Planlama Merkezi', 'Gezi / Planlama Merkezi', 'Taşımacılık Firması Merkezi', 'Okul Merkezi', 'Genel Bakış'];
    if (!roleScreens.some((screen) => requiredLabels.includes(String(screen?.label || '').trim()))) {
      return { status: GUIDED_TARGET_STATUSES.UNAUTHORIZED, targetKey: null, screenPath: currentPath || null, reason: 'Bu görev için mevcut rolde yetkili bir hedef ekran bulunmuyor.' };
    }
  }
  if (prior?.targetKey && text(prior.screenPath) && text(prior.screenPath) !== currentPath && !workflowRequest && !freshCanonicalGuidance) {
    return { status: GUIDED_TARGET_STATUSES.STALE, targetKey: null, screenPath: currentPath || null, previousTargetKey: text(prior.targetKey), reason: 'Ekran değişti; önceki hedef artık geçerli değil.' };
  }
  if (!guidanceRequest && !prior?.targetKey) return null;
  const available = rows(screenContext);
  const query = explicitTargetPhrase({ message, prior, currentPath, workflowRequest, continuation });
  const scored = available
    .map((row) => ({ row, score: scoreRow(row, query) }))
    .sort((a, b) => b.score - a.score);
  const workflowTarget = workflowRequest
    ? (continuation
      ? available.find((row) => /rehberi başlat|rehberi baslat/i.test(row.label))
        || available.find((row) => /ayrıntılı çalışma alanını göster|ayrintili calisma alanini goster/i.test(row.label))
        || available.find((row) => /detayları göster|detaylari goster/i.test(row.label))
        || available.find((row) => /planlama merkezi/i.test(row.label))
      : available.find((row) => /teklifler|ticari akışım|ticari akis/i.test(row.label))
        || available.find((row) => /ayrıntılı çalışma alanını göster|ayrintili calisma alanini goster/i.test(row.label))
        || available.find((row) => /rehberi başlat|rehberi baslat/i.test(row.label))
        || available.find((row) => /planlama merkezi/i.test(row.label)))
    : null;
  const chosen = workflowRequest
    ? workflowTarget
    : (scored[0]?.score > 0
    ? scored[0].row
    : (continuation && prior?.targetKey ? available.find((row) => row.targetKey === prior.targetKey) : null));
  if (!chosen) {
    return { status: GUIDED_TARGET_STATUSES.NOT_FOUND, targetKey: null, screenPath: currentPath || null, reason: 'Bu ekranda doğrulanabilir bir hedef bulamadım.' };
  }
  if (isCriticalCopilotTarget(chosen)) {
    return { status: GUIDED_TARGET_STATUSES.NOT_FOUND, targetKey: null, screenPath: currentPath || null, blockedTargetLabel: chosen.label, reason: 'Bu alan iş yazımı veya onay gerektirebilir; Sefer Abi yalnızca güvenli rehberlik yapar.' };
  }
  return {
    status: GUIDED_TARGET_STATUSES.FOUND,
    targetKey: chosen.targetKey,
    label: chosen.label,
    semanticType: chosen.semanticType || 'button',
    screenPath: currentPath || null,
    role: text(user?.role).toUpperCase(),
    safeAction: 'HIGHLIGHT',
    locator: { targetKey: chosen.targetKey, label: chosen.label, semanticType: chosen.semanticType || 'button' },
    criticalActionExecution: false,
    reason: 'Yalnızca mevcut ve yetkili arayüz hedefi gösterilir; iş yazımı yapılmaz.',
  };
}

export function guidedTargetForConversationState(target) {
  if (!target || typeof target !== 'object') return null;
  return {
    status: text(target.status),
    targetKey: text(target.targetKey) || null,
    label: text(target.label) || null,
    screenPath: text(target.screenPath) || null,
    semanticType: text(target.semanticType) || null,
    role: text(target.role).toUpperCase() || null,
  };
}
