import { buildJobGuideResponse } from '../jobGuide/index.js';
import { detectQuestionType, resolveReplyMode, selectGuideJobType, buildSuggestedChips } from './intentRouter.js';
import { firstNonEmpty, makeLinkedGuide, makeQuickAction, mergeQuickActions, toReply, uniqueStrings } from './replyShapes.js';

function pickTerms(simpleTerms, limit = 3) {
  return (Array.isArray(simpleTerms) ? simpleTerms : []).slice(0, limit).map((row) => `${row.term}: ${row.meaning}`);
}

function pickButtons(buttonGuides, limit = 3) {
  return (Array.isArray(buttonGuides) ? buttonGuides : []).slice(0, limit).map((row) => `${row.label}: ${row.purpose}`);
}

function normalizeText(value) {
  return String(value || '').trim().toLocaleLowerCase('tr-TR');
}

function ageMinutes(input) {
  const d = input ? new Date(input) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  return Math.round((Date.now() - d.getTime()) / 60000);
}

function findBestAction(list, message) {
  const text = normalizeText(message);
  const rows = Array.isArray(list) ? list : [];
  if (!text) return rows[0] || null;
  const hit = rows.find((row) => {
    const hay = normalizeText(`${row?.label || ''} ${row?.reason || ''} ${row?.routeKey || ''}`);
    return text.split(/\s+/).some((word) => word && hay.includes(word));
  });
  return hit || rows[0] || null;
}

function roleLead(roleMode) {
  return roleMode === 'SIMPLE' ? 'Kısa anlatıyorum.' : 'Durumu kısa özetliyorum.';
}

function screenMenuActions(screenDefinition) {
  return (Array.isArray(screenDefinition?.screenMenus) ? screenDefinition.screenMenus : []).map((item) => makeQuickAction(item.label, item.path, item.purpose));
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

function shiftStatusText(context) {
  return `Bu vardiya ${context?.status || '-'} durumda. Araç: ${context?.vehicle?.plate || 'yok'}. Sürücü: ${context?.driver?.fullName || 'yok'}. Durak: ${Number(context?.stopCount || 0)}. Açık teklif: ${Number(context?.openOfferCount || 0)}.`;
}

function shiftBlockers(context) {
  const items = [];
  if (!context?.vehicleId) items.push('Araç ataması görünmüyor.');
  if (!context?.driverId) items.push('Sürücü ataması görünmüyor.');
  if (!Number(context?.stopCount || 0)) items.push('Durak verisi görünmüyor.');
  if (String(context?.status || '') === 'APPROVED' && !context?.roomId) items.push('Onaylı işte oda ataması görünmüyor.');
  if (Number(context?.openOfferCount || 0) > 0 && !context?.roomOfferDecision) items.push('Teklif kararı net görünmüyor.');
  return uniqueStrings(items);
}

function shiftNextStep(context) {
  const blockers = shiftBlockers(context);
  if (blockers[0]) return blockers[0].replace('.', '') + ' Önce bunu tamamla.';
  if (Number(context?.openOfferCount || 0) > 0) return 'Önce teklif kararını netleştir. Sonra araç ve sürücüyü tekrar kontrol et.';
  if (String(context?.status || '') === 'REQUESTED') return 'Önce uygun teklif veya atama hattını aç. Sonra işin bağlı olacağı odayı netleştir.';
  return 'Önce araç, sürücü ve durak bilgisini birlikte kontrol et. Sonra ilgili ekrandan ilerle.';
}

function vehicleSourceText(context) {
  const hasDevice = Number(context?.activeDeviceCount || 0) > 0;
  const hasDriver = Number(context?.driver?.id || 0) > 0;
  const lastUi = String(context?.gpsState?.lastUiStatus || 'UNKNOWN');
  const age = ageMinutes(context?.gpsLast?.at);
  const lastPart = age == null ? 'Son konum zamanı görünmüyor.' : `Son konum yaklaşık ${age} dakika önce geldi.`;
  if (hasDevice && hasDriver) return `Bu araçta hem cihaz GPS'i kaydı hem de sürücü bağı görünüyor. Ana kaynak kullanımına göre ikisi de devreye girebilir. ${lastPart} UI durumu: ${lastUi}.`;
  if (hasDevice) return `Bu araçta aktif cihaz GPS'i görünüyor. Sürücü bağı ${hasDriver ? 'de var' : 'görünmüyor'}. ${lastPart} UI durumu: ${lastUi}.`;
  if (hasDriver) return `Bu araçta sürücünün telefon GPS'i tarafı için sürücü bağı görünüyor. Aktif cihaz GPS'i görünmüyor. ${lastPart} UI durumu: ${lastUi}.`;
  return `Bu araçta şu an ne aktif cihaz GPS'i ne de sürücü bağı net görünüyor. ${lastPart}`;
}

function vehicleBlockers(context) {
  const items = [];
  if (!Number(context?.activeDeviceCount || 0) && !context?.driver?.id) items.push('Konum verecek kaynak net görünmüyor.');
  if (!Number(context?.activeDeviceCount || 0)) items.push("Aktif cihaz GPS'i görünmüyor.");
  if (!context?.gpsLast?.at) items.push('Son GPS zamanı görünmüyor.');
  if (!context?.driver?.id) items.push('Sürücü bağı görünmüyor.');
  if (String(context?.gpsState?.lastUiStatus || '') === 'STALE') items.push('Konum verisi eski görünüyor.');
  return uniqueStrings(items);
}

function vehicleNextStep(context) {
  const blockers = vehicleBlockers(context);
  if (blockers[0]) return blockers[0].replace('.', '') + ' Önce bunu düzelt.';
  if (Number(context?.activeDeviceCount || 0) > 0) return 'Önce cihaz GPS\'i son sinyalini kontrol et. Sonra canlı ekrandan tekrar bak.';
  return "Önce sürücü bağını ve konum kaynağını kontrol et. Sonra canlı konum ekranına dön.";
}

function openingReply({ entityType, context, guide, screenDefinition, roleMode }) {
  if (entityType === 'shift') {
    return `${roleLead(roleMode)} ${shiftStatusText(context)} ${shiftNextStep(context)}`;
  }
  if (entityType === 'vehicle') {
    return `${roleLead(roleMode)} ${vehicleSourceText(context)} ${vehicleNextStep(context)}`;
  }
  return `${firstNonEmpty(screenDefinition?.menuPurpose, guide.plainSummary, guide.summary)} ${firstNonEmpty(screenDefinition?.firstStep, guide.whatToDoNow, 'İstersen şimdi ne yapacağını da anlatayım.')}`;
}

function composeScreenLocationReply({ guide, screenDefinition }) {
  const terms = pickTerms(guide.simpleTerms || screenDefinition?.simpleTerms, 3);
  const lines = [];
  lines.push("Konum tarafında genelde iki kaynak vardır: sürücünün telefon GPS'i ve cihaz GPS'i.");
  if (terms.length) lines.push(`Kısa anlamlar: ${terms.join(' • ')}`);
  lines.push(firstNonEmpty(guide.whatToDoNow, screenDefinition?.firstStep, 'Önce araç veya canlı takip bilgisini kontrol et.'));
  return lines.join(' ');
}

function roleHelpReply({ guide, screenDefinition, roleMode }) {
  const menus = Array.isArray(screenDefinition?.screenMenus) ? screenDefinition.screenMenus : guide.screenMenus || [];
  if (roleMode === 'SIMPLE') {
    return `${firstNonEmpty(guide.plainSummary, screenDefinition?.menuPurpose, guide.summary)} ${menus.length ? `En çok işine yarayacak yerler: ${menus.slice(0, 2).map((x) => x.label).join(', ')}.` : ''}`;
  }
  return `${firstNonEmpty(guide.plainSummary, guide.summary)} ${menus.length ? `Bu rolde en sık kullanacağın yerler: ${menus.slice(0, 3).map((x) => x.label).join(', ')}.` : ''}`;
}

function composeReply({ questionType, replyMode, guide, message, context, entityType, screenDefinition, roleMode }) {
  if (questionType === 'OPEN') {
    return toReply(openingReply({ entityType, context, guide, screenDefinition, roleMode }));
  }
  if (questionType === 'ROLE_HELP') {
    return toReply(roleHelpReply({ guide, screenDefinition, roleMode }));
  }
  if (questionType === 'STATUS_HELP' && entityType === 'shift') {
    return toReply(`${shiftStatusText(context)} ${shiftBlockers(context)[0] ? `Eksik taraf: ${shiftBlockers(context)[0]}` : 'Kritik eksik görünmüyor.'}`);
  }
  if (questionType === 'STATUS_HELP' && entityType === 'vehicle') {
    return toReply(`${vehicleSourceText(context)} ${vehicleBlockers(context)[0] ? `Dikkat isteyen konu: ${vehicleBlockers(context)[0]}` : ''}`);
  }
  if (questionType === 'BUTTON_HELP') {
    const buttons = pickButtons(guide.buttonGuides || screenDefinition?.buttonGuides, 3);
    return toReply(`${firstNonEmpty(guide.plainSummary, screenDefinition?.menuPurpose, guide.summary)} ${buttons.length ? `Öne çıkanlar: ${buttons.join(' • ')}` : ''}`);
  }
  if (questionType === 'WHY_BLOCKED' && entityType === 'shift') {
    const reasons = shiftBlockers(context).slice(0, 3);
    return toReply(`${reasons.length ? `Bu kayıt şu yüzden ilerlemiyor olabilir: ${reasons.join(' • ')}` : firstNonEmpty(guide.whyBlocked, guide.screenExplanation, guide.plainSummary)} ${shiftNextStep(context)}`);
  }
  if (questionType === 'WHY_BLOCKED' && entityType === 'vehicle') {
    const reasons = vehicleBlockers(context).slice(0, 3);
    return toReply(`${reasons.length ? `Konum tarafı şu yüzden takılmış olabilir: ${reasons.join(' • ')}` : firstNonEmpty(guide.whyBlocked, guide.screenExplanation, guide.plainSummary)} ${vehicleNextStep(context)}`);
  }
  if (questionType === 'WHY_BLOCKED') {
    const reasons = uniqueStrings([guide.whyBlocked, ...(guide.lockedActionReasons || [])]).slice(0, 3);
    return toReply(`${reasons.length ? `Bu işlem şu yüzden kapalı olabilir: ${reasons.join(' • ')}` : firstNonEmpty(guide.screenExplanation, guide.plainSummary, guide.summary)} ${guide.whatToDoNow ? `Şimdi bunu yap: ${guide.whatToDoNow}` : ''}`);
  }
  if (questionType === 'TERM_HELP') {
    const terms = pickTerms(guide.simpleTerms || screenDefinition?.simpleTerms, 3);
    return toReply(`${terms.length ? terms.join(' • ') : firstNonEmpty(guide.screenExplanation, screenDefinition?.menuPurpose, guide.plainSummary, guide.summary)} ${guide.whatToDoNow ? `İstersen şimdi ${guide.whatToDoNow.toLowerCase()}` : ''}`);
  }
  if (questionType === 'GO_TO') {
    return toReply(`${firstNonEmpty(guide.whatToDoNow, screenDefinition?.nextStep, guide.plainSummary, guide.summary)} Hangi yere gideceğini aşağıdaki düğmelerden açabilirsin.`);
  }
  if (questionType === 'LOCATION_HELP' && entityType === 'vehicle') {
    return toReply(`${vehicleSourceText(context)} ${vehicleNextStep(context)}`);
  }
  if (questionType === 'LOCATION_HELP') {
    return toReply(composeScreenLocationReply({ guide, screenDefinition }));
  }
  if (questionType === 'NEXT_STEP' && entityType === 'shift') {
    return toReply(shiftNextStep(context));
  }
  if (questionType === 'NEXT_STEP' && entityType === 'vehicle') {
    return toReply(vehicleNextStep(context));
  }
  if (replyMode === 'STEP_BY_STEP') {
    const steps = (guide.stepByStep || screenDefinition?.stepByStep || []).slice(0, 4);
    return toReply(`${firstNonEmpty(guide.plainSummary, screenDefinition?.menuPurpose, guide.summary)} ${steps.length ? `Adımlar: ${steps.map((x, i) => `${i + 1}) ${x}`).join(' ')}` : ''}`);
  }
  if (replyMode === 'WHY') {
    return toReply(`${firstNonEmpty(guide.screenExplanation, screenDefinition?.menuPurpose, guide.jobPurpose, guide.summary)} ${guide.whatToDoNow ? `Şimdi bunu yap: ${guide.whatToDoNow}` : ''}`);
  }
  return toReply(`${firstNonEmpty(guide.plainSummary, screenDefinition?.menuPurpose, guide.summary)} ${guide.whatToDoNow ? `Şimdi bunu yap: ${guide.whatToDoNow}` : ''} ${guide.whatToDoNext ? `Sonra: ${guide.whatToDoNext}` : ''}`);
}

export function buildChatHelpResponse({ entityType, entityId, user, message, context, entityLabel, scope, conversationState, screenContext, screenDefinition }) {
  const roleMode = String(scope?.roleMode || 'OPERATIONS');
  const screenPath = screenDefinition?.path || screenContext?.path || '';
  const questionType = detectQuestionType(message, entityType);
  const replyMode = resolveReplyMode(message, questionType, roleMode);
  const jobType = selectGuideJobType({ entityType, questionType, message, screenPath });
  const guide = buildJobGuideResponse({
    jobType,
    guideLevel: replyMode,
    context,
    entityType,
    entityId,
    user,
    screenContext,
  });

  const reply = composeReply({ questionType, replyMode, guide, message, context, entityType, screenDefinition, roleMode });
  const screenActions = screenMenuActions(screenDefinition);
  const guideActions = Array.isArray(guide.quickActions) ? guide.quickActions : [];
  const mergedActions = mergeQuickActions(screenActions, guideActions);
  const bestAction = findBestAction(mergedActions, message);
  const linkedGuides = guideLinksForEntity(entityType);
  const suggestedChips = buildSuggestedChips({ entityType, questionType, roleMode, screenPath, context });
  const actionList = bestAction ? [bestAction, ...mergedActions.filter((x) => x !== bestAction)] : mergedActions;
  const contextSummaryBits = [
    screenDefinition?.label ? `Ekran: ${screenDefinition.label}` : null,
    entityLabel ? `Bağlam: ${entityLabel}` : null,
    scope?.summary || null,
  ].filter(Boolean);

  return {
    ok: true,
    provider: 'local-chat-help',
    mode: 'CHAT_HELP',
    copilotVersion: 'M46.6-D2',
    generatedAt: new Date().toISOString(),
    intent: 'CHAT_HELP',
    intentLabel: 'Sohbet Yardımı',
    entityType,
    entityId: Number(entityId),
    entityLabel,
    activeEntityLabel: entityLabel,
    scope,
    roleMode,
    screenLabel: screenDefinition?.label || screenContext?.label || '',
    screenPath,
    summary: firstNonEmpty(guide.plainSummary, guide.summary, reply),
    contextSummary: contextSummaryBits.join(' • '),
    reply,
    replyMode,
    suggestedChips,
    quickActions: actionList.slice(0, 4),
    linkedGuides,
    followUpPrompt: roleMode === 'SIMPLE' ? 'İstersen bunu daha da kısa söyleyeyim.' : 'İstersen bunu adım adım da anlatayım.',
    conversationState: {
      ...(conversationState && typeof conversationState === 'object' ? conversationState : {}),
      lastQuestionType: questionType,
      lastGuideJobType: jobType,
      lastEntityType: entityType,
      lastEntityId: Number(entityId),
      lastEntityLabel: entityLabel,
      lastScreenPath: screenPath || null,
      lastScreenLabel: screenDefinition?.label || null,
      roleMode,
    },
  };
}
