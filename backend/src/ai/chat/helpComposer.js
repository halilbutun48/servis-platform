import { buildJobGuideResponse } from '../jobGuide/index.js';
import { detectQuestionType, resolveReplyMode, selectGuideJobType, buildSuggestedChips } from './intentRouter.js';
import { firstNonEmpty, makeLinkedGuide, toReply, uniqueStrings } from './replyShapes.js';

function pickTerms(simpleTerms, limit = 2) {
  return (Array.isArray(simpleTerms) ? simpleTerms : []).slice(0, limit).map((row) => `${row.term}: ${row.meaning}`);
}

function pickButtons(buttonGuides, limit = 2) {
  return (Array.isArray(buttonGuides) ? buttonGuides : []).slice(0, limit).map((row) => `${row.label}: ${row.purpose}`);
}

function findBestAction(list, message) {
  const text = String(message || '').trim().toLocaleLowerCase('tr-TR');
  const rows = Array.isArray(list) ? list : [];
  if (!text) return rows[0] || null;
  const hit = rows.find((row) => {
    const hay = `${row?.label || ''} ${row?.reason || ''} ${row?.routeKey || ''}`.toLocaleLowerCase('tr-TR');
    return text.split(/\s+/).some((word) => word && hay.includes(word));
  });
  return hit || rows[0] || null;
}

function guideLinksForEntity(entityType) {
  if (String(entityType) === 'vehicle') {
    return [
      makeLinkedGuide('LOCATION_SOURCE_GUIDE', 'Konum kaynağı rehberini aç', 'SHORT', 'Telefon GPS\'i ve cihaz GPS\'i farkını açar.'),
      makeLinkedGuide('GPS_SIGNAL_DIAGNOSIS_GUIDE', 'GPS sinyal teşhisini aç', 'WHY', 'Konum neden görünmüyor sorusuna odaklanır.'),
      makeLinkedGuide('VEHICLE_DRIVER_BIND', 'Araç-sürücü bağlama rehberini aç', 'STEP_BY_STEP', 'Bağlama adımlarını sade dille gösterir.'),
    ];
  }
  if (String(entityType) === 'shift') {
    return [
      makeLinkedGuide('OFFER_REVIEW', 'Teklifi inceleme rehberini aç', 'SHORT', 'Kayıt özetini rehber modunda açar.'),
      makeLinkedGuide('OFFER_APPROVAL', 'Teklifi onaylama rehberini aç', 'WHY', 'Onay öncesi dikkat noktalarını açar.'),
      makeLinkedGuide('ASSIGNMENT_READINESS_GUIDE', 'Atamaya hazır mı rehberini aç', 'STEP_BY_STEP', 'Hazırlık eksiklerini sıralar.'),
    ];
  }
  return [
    makeLinkedGuide('SCREEN_MENU_GUIDE', 'Ekran rehberini aç', 'SHORT', 'Bu ekranın amacını açar.'),
    makeLinkedGuide('BUTTON_ACTION_GUIDE', 'Buton rehberini aç', 'WHY', 'Bu ekrandaki butonları açıklar.'),
    makeLinkedGuide('ROLE_HELP_GUIDE', 'Rol yardımını aç', 'SHORT', 'Bu rolde nereye gideceğini gösterir.'),
  ];
}

function composeScreenLocationReply({ guide, context }) {
  const terms = pickTerms(guide.simpleTerms, 3);
  const lines = [];
  lines.push("Konum tarafında genelde iki kaynak vardır: sürücünün telefon GPS'i ve cihaz GPS'i.");
  if (terms.length) lines.push(`Kısa anlamlar: ${terms.join(' • ')}`);
  lines.push(firstNonEmpty(guide.whatToDoNow, context?.firstStep, 'Önce araç veya canlı takip bilgisini kontrol et.'));
  return lines.join(' ');
}

function composeReply({ questionType, replyMode, guide, message, context, entityType }) {
  if (questionType === 'OPEN') {
    return toReply(`${firstNonEmpty(guide.plainSummary, guide.summary)} ${guide.whatToDoNow ? `İstersen önce şunu yap: ${guide.whatToDoNow}` : ''}`);
  }
  if (questionType === 'ROLE_HELP') {
    return toReply(`${firstNonEmpty(guide.plainSummary, guide.summary)} ${guide.screenMenus?.length ? `En çok kullanacağın yerler: ${guide.screenMenus.slice(0, 3).map((x) => x.label).join(', ')}.` : ''}`);
  }
  if (questionType === 'BUTTON_HELP') {
    const buttons = pickButtons(guide.buttonGuides, 3);
    return toReply(`${firstNonEmpty(guide.plainSummary, guide.summary)} ${buttons.length ? `Öne çıkanlar: ${buttons.join(' • ')}` : ''}`);
  }
  if (questionType === 'WHY_BLOCKED') {
    const reasons = uniqueStrings([guide.whyBlocked, ...(guide.lockedActionReasons || [])]).slice(0, 3);
    return toReply(`${reasons.length ? `Bu işlem şu yüzden kapalı olabilir: ${reasons.join(' • ')}` : firstNonEmpty(guide.screenExplanation, guide.plainSummary, guide.summary)} ${guide.whatToDoNow ? `Şimdi bunu yap: ${guide.whatToDoNow}` : ''}`);
  }
  if (questionType === 'TERM_HELP') {
    const terms = pickTerms(guide.simpleTerms, 3);
    return toReply(`${terms.length ? terms.join(' • ') : firstNonEmpty(guide.screenExplanation, guide.plainSummary, guide.summary)} ${guide.whatToDoNow ? `İstersen şimdi ${guide.whatToDoNow.toLowerCase()}` : ''}`);
  }
  if (questionType === 'GO_TO') {
    const firstAction = findBestAction(guide.quickActions, message);
    return toReply(`${firstAction ? `${firstAction.label} seçeneğini kullan.` : firstNonEmpty(guide.whatToDoNow, guide.plainSummary, guide.summary)} ${firstAction?.reason ? `Nedeni: ${firstAction.reason}` : ''}`);
  }
  if (questionType === 'LOCATION_HELP' && String(entityType) === 'screen') {
    return toReply(composeScreenLocationReply({ guide, context }));
  }
  if (replyMode === 'STEP_BY_STEP') {
    const steps = (guide.stepByStep || []).slice(0, 4);
    return toReply(`${firstNonEmpty(guide.plainSummary, guide.summary)} ${steps.length ? `Adımlar: ${steps.map((x, i) => `${i + 1}) ${x}`).join(' ')}` : ''}`);
  }
  if (replyMode === 'WHY') {
    return toReply(`${firstNonEmpty(guide.screenExplanation, guide.jobPurpose, guide.summary)} ${guide.whatToDoNow ? `Şimdi bunu yap: ${guide.whatToDoNow}` : ''}`);
  }
  return toReply(`${firstNonEmpty(guide.plainSummary, guide.summary)} ${guide.whatToDoNow ? `Şimdi bunu yap: ${guide.whatToDoNow}` : ''} ${guide.whatToDoNext ? `Sonra: ${guide.whatToDoNext}` : ''}`);
}

export function buildChatHelpResponse({ entityType, entityId, user, message, context, entityLabel, scope, conversationState, screenContext }) {
  const questionType = detectQuestionType(message, entityType);
  const replyMode = resolveReplyMode(message, questionType);
  const jobType = selectGuideJobType({ entityType, questionType, message });
  const guide = buildJobGuideResponse({
    jobType,
    guideLevel: replyMode,
    context,
    entityType,
    entityId,
    user,
    screenContext,
  });

  const reply = composeReply({ questionType, replyMode, guide, message, context, entityType });
  const bestAction = findBestAction(guide.quickActions, message);
  const linkedGuides = guideLinksForEntity(entityType);
  const suggestedChips = buildSuggestedChips({ entityType, questionType });

  return {
    ok: true,
    provider: 'local-chat-help',
    mode: 'CHAT_HELP',
    copilotVersion: 'M46.6-D1',
    generatedAt: new Date().toISOString(),
    intent: 'CHAT_HELP',
    intentLabel: 'Sohbet Yardımı',
    entityType,
    entityId: Number(entityId),
    entityLabel,
    scope,
    summary: firstNonEmpty(guide.plainSummary, guide.summary, reply),
    contextSummary: `${entityLabel} • ${scope?.summary || ''}`.trim(),
    reply,
    replyMode,
    suggestedChips,
    quickActions: bestAction ? [bestAction, ...(guide.quickActions || []).filter((x) => x !== bestAction)].slice(0, 3) : (guide.quickActions || []).slice(0, 3),
    linkedGuides,
    followUpPrompt: 'İstersen bunu adım adım da anlatayım.',
    conversationState: {
      ...(conversationState && typeof conversationState === 'object' ? conversationState : {}),
      lastQuestionType: questionType,
      lastGuideJobType: jobType,
      lastEntityType: entityType,
      lastEntityId: Number(entityId),
      lastScreenPath: screenContext?.path || null,
    },
  };
}
