import { firstNonEmpty } from './replyShapes.js';
import { buildRiskScoringReply } from './conversationRiskScoringEngine.js';
import {
  ensureVisibleSentence,
  looksLikeClarifyingQuestionRequest,
  looksLikeDetailContinuationRequest,
  looksLikeNextBestActionQuestion,
  normalizeLooseText,
  normalizeRoleKey,
  normalizeVisibleReplyFragment,
} from './conversationTaskStateShared.js';

function humanizeStatusText(value) {
  const text = ensureVisibleSentence(normalizeVisibleReplyFragment(firstNonEmpty(value, '')));
  if (!text) return '';
  return text
    .replace(/\bAPPROVED\b/gi, 'onaylı')
    .replace(/\bREQUESTED\b/gi, 'talep edildi')
    .replace(/\bPENDING\b/gi, 'beklemede')
    .replace(/\bDRAFT\b/gi, 'taslak')
    .replace(/\bACTIVE\b/gi, 'aktif')
    .replace(/\bCOMPLETED\b/gi, 'tamamlandı')
    .replace(/\bCANCELLED\b/gi, 'iptal edildi')
    .replace(/\bCANCELED\b/gi, 'iptal edildi')
    .replace(/\bREJECTED\b/gi, 'reddedildi')
    .trim();
}

export function looksLikeRoomShiftFocusQuestion(message) {
  const text = normalizeLooseText(message);
  if (!text) return false;
  return /(?:bu\s+ekranda\s+neye\s+bakmal[ıi]y[ıi]m|bu\s+ekranda\s+neyi\s+kontrol\s+etmeliyim|ekranda\s+neye\s+bakmal[ıi]y[ıi]m|ilk\s+neyi\s+kontrol\s+etmeliyim|önce\s+neyi\s+kontrol\s+etmeliyim|ilk\s+neye\s+bakay[ıi]m|önce\s+neye\s+bakay[ıi]m)/.test(text);
}

export function looksLikeRoomShiftNextActionQuestion(message) {
  const text = normalizeLooseText(message);
  if (!text) return false;
  return looksLikeNextBestActionQuestion(text)
    || /(?:şimdi\s+ne\s+yapay[ıi]m|simdi\s+ne\s+yapay[ıi]m|ne\s+yapay[ıi]m|ne\s+yapmal[ıi]y[ıi]m|sıradaki\s+doğru\s+i[şs]lem\s+ne|siradaki\s+dogru\s+islem\s+ne|sıradaki\s+doğru\s+i[şs]lem|siradaki\s+dogru\s+islem)/.test(text);
}

export function looksLikeRoomShiftLiveStartInstruction(message) {
  const text = normalizeLooseText(message);
  if (!text) return false;
  const hasLiveStart = /canl[ıi].*başlatma/.test(text) || /baslatma\s+zaman/.test(text);
  const hasActiveState = /aktif\s+durum/.test(text);
  const hasGps = /\bgps\b/.test(text);
  const hasProof = /(operasyon\s+kanıt|operasyon\s+kanit|kanıt|kanit)/.test(text);
  const hasGpsProofFlow = /gps.*operasyon\s+kanıt[ıi]?.*akış[ıi]na\s+geç/.test(text) || /gps.*operasyon\s+kanit[ıi]?.*akış[ıi]na\s+geç/.test(text);
  return (hasLiveStart && hasActiveState && hasGps && hasProof) || hasGpsProofFlow;
}

export function looksLikeRoomShiftClarifyingRequest(message) {
  const text = normalizeLooseText(message);
  if (!text) return false;
  return looksLikeClarifyingQuestionRequest(text)
    || /(?:ilgili\s+durumu\s+sor|netleştirmek\s+için\s+ne\s+sorars[ıi]n|netlestirmek\s+icin\s+ne\s+sorars[ıi]n|eksik\s+bilgi\s+ne)/.test(text);
}

export function buildRoomShiftSemanticOverrideReply({
  message,
  questionType,
  userRole,
  user,
  screenContext,
  sourceScreenDefinition,
  sourceScreenContext,
  selectedCarrySummary = () => '',
  extractVisibleValueFromText = () => '',
  normalizeVisibleReplyFragment: _normalizeVisibleReplyFragmentImpl = normalizeVisibleReplyFragment,
  ensureVisibleSentence: _ensureVisibleSentenceImpl = ensureVisibleSentence,
  looksLikeDetailContinuationRequest: looksLikeDetailContinuationRequestImpl = looksLikeDetailContinuationRequest,
}) {
  const normalizedUserRole = normalizeRoleKey(firstNonEmpty(user?.role, userRole, ''));
  if (normalizedUserRole !== 'room') return '';
  const sourceScreenPath = firstNonEmpty(
    sourceScreenDefinition?.path,
    sourceScreenContext?.path,
    '',
  );
  if (!String(sourceScreenPath || '').includes('/room/shifts')) return '';
  const text = normalizeLooseText(message);
  const selectionSummary = firstNonEmpty(
    selectedCarrySummary(screenContext),
    selectedCarrySummary(sourceScreenContext),
    screenContext?.selectedSummary,
    sourceScreenContext?.selectedSummary,
    screenContext?.selectedRecordStatus,
    sourceScreenContext?.selectedRecordStatus,
    '',
  );
  const selectionLabel = firstNonEmpty(
    screenContext?.selectedLabel,
    sourceScreenContext?.selectedLabel,
    screenContext?.selectedRecordLabel,
    sourceScreenContext?.selectedRecordLabel,
    '',
  );
  const status = firstNonEmpty(
    extractVisibleValueFromText(selectionSummary, ['Durum', 'Status']),
    extractVisibleValueFromText(selectionSummary, ['Onaylı', 'Approved', 'Kabul Edildi']),
    '',
  );
  const vehicle = firstNonEmpty(extractVisibleValueFromText(selectionSummary, ['Araç', 'Arac']), '');
  const driver = firstNonEmpty(extractVisibleValueFromText(selectionSummary, ['Sürücü', 'Surucu']), '');
  const hasSelection = Boolean(selectionSummary || selectionLabel);
  const hasVehicleDriver = Boolean(vehicle && driver);
  const selectionLead = hasSelection
    ? hasVehicleDriver && /onay|approved|kabul/i.test(normalizeLooseText(status))
      ? 'Seçili kayıt onaylı ve araç/sürücü atanmış görünüyor.'
      : status
        ? `Seçili kayıt ${humanizeStatusText(status).replace(/^Durum:\s*/i, '')}`.trim()
        : 'Seçili kayıt görünüyor.'
    : '';

  if (looksLikeRoomShiftClarifyingRequest(text) || (String(questionType || '') === 'STATUS_HELP' && looksLikeRoomShiftClarifyingRequest(text))) {
    if (hasSelection && hasVehicleDriver) {
      return 'Seçili kayıt onaylı ve araç/sürücü atanmış görünüyor. Bu kayıt için özellikle canlı başlatma zamanı, aktif durum, konum sinyali/kanıt veya rota/durak bilgisinden hangisini kontrol edeyim?';
    }
    if (hasSelection) {
      return 'Seçili kayıt görünüyor. Bu kayıt için özellikle canlı başlatma zamanı, aktif durum, konum sinyali/kanıt veya rota/durak bilgisinden hangisini kontrol edeyim?';
    }
    return 'Hangi vardiya için bakayım? Bu kayıtla ilgili canlı başlatma mı, araç/sürücü ataması mı, konum sinyali/kanıt durumu mu, yoksa teklif/sözleşme bağlantısı mı netleşsin?';
  }

  if (looksLikeRoomShiftFocusQuestion(text) || String(questionType || '') === 'SCREEN_FOCUS' || String(questionType || '') === 'SCREEN_PURPOSE') {
    return 'Vardiyalar ekranında seçili vardiya, durum, araç/sürücü ataması, durak/rota hazırlığı, canlı başlatma zamanı, konum sinyali ve operasyon kanıtı okunur; gerekirse teklif veya sözleşme bağlantısı da kontrol edilir.';
  }

  if (String(questionType || '') === 'RISK_LIST') {
    return buildRiskScoringReply({
      message,
      questionType,
      screenContext,
      sourceScreenDefinition,
      sourceScreenContext,
      screenPath: sourceScreenPath,
      userRole,
      user,
    });
  }

  if (
    (looksLikeRoomShiftNextActionQuestion(text) || String(questionType || '') === 'NEXT_STEP' || String(questionType || '') === 'SAFE_NEXT_STEP' || String(questionType || '') === 'DETAIL_FLOW')
    && !looksLikeDetailContinuationRequestImpl(text)
    && !/^(devam\s+et|devam)$/i.test(text)
  ) {
    if (looksLikeRoomShiftLiveStartInstruction(text)) {
      if (hasSelection && hasVehicleDriver) {
        return 'Bu vardiya için önce canlı başlatma zamanı ve aktif durumu kontrol et. Aktif değilse başlatma koşullarını netleştir. Aktifse konum sinyali canlı mı, son konum ne kadar eski, operasyon kanıtı var mı ve rota/durak akışı tamam mı sırayla kontrol et.';
      }
      if (hasSelection) {
        return 'Seçili vardiyada önce canlı başlatma zamanı ve aktif durumu kontrol et. Sonra konum sinyali canlı mı, son konum ne kadar eski, operasyon kanıtı var mı ve rota/durak akışı tamam mı sırayla kontrol et.';
      }
      return 'Önce doğru vardiya kaydını seç. Sonra durum, araç/sürücü, durak/rota ve canlı başlatma sinyalini kontrol et.';
    }
    if (hasSelection && hasVehicleDriver) {
      return 'Bu kayıt onaylı ve araç/sürücü atanmış görünüyor. Şimdi canlı başlatma zamanı, aktif durum, durak/rota ve konum sinyali/operasyon kanıtını kontrol et. Eksik varsa ilgili aksiyona geç.';
    }
    if (hasSelection) {
      return `${selectionLead || 'Seçili kayıt görünüyor.'} Şimdi canlı başlatma zamanı, aktif durum, durak/rota ve konum sinyali/operasyon kanıtını kontrol et. Eksik varsa ilgili aksiyona geç.`;
    }
    return 'Önce doğru vardiya kaydını seç. Sonra durum, araç/sürücü, durak/rota ve canlı başlatma sinyalini kontrol et.';
  }

  if (looksLikeDetailContinuationRequestImpl(text) || /^(devam\s+et|devam)$/i.test(text)) {
    if (hasSelection) {
      return 'Aynı vardiya akışından devam edelim. Önce durum ve araç/sürücü atamasını, sonra durak/rota ile konum sinyali ve operasyon kanıtını kontrol et.';
    }
    return 'Aynı vardiya akışından devam edelim. Önce doğru vardiya kaydını seç, sonra durum ve araç/sürücü atamasını kontrol et.';
  }

  return '';
}

export function shiftStatusText(context) {
  const statusText = humanizeStatusText(context?.status || '-');
  return `Bu vardiyanın durumu: ${statusText || '-'}. Araç: ${context?.vehicle?.plate || 'yok'}. Sürücü: ${context?.driver?.fullName || 'yok'}. Durak: ${Number(context?.stopCount || 0)}. Açık teklif: ${Number(context?.openOfferCount || 0)}.`;
}

export function shiftBlockers(context) {
  const items = [];
  if (!context?.vehicleId) items.push('Araç ataması görünmüyor.');
  if (!context?.driverId) items.push('Sürücü ataması görünmüyor.');
  if (!Number(context?.stopCount || 0)) items.push('Durak verisi görünmüyor.');
  if (String(context?.status || '') === 'APPROVED' && !context?.roomId) items.push('Onaylı işte oda ataması görünmüyor.');
  if (Number(context?.openOfferCount || 0) > 0 && !context?.roomOfferDecision) items.push('Teklif kararı net görünmüyor.');
  return Array.from(new Set(items));
}

export function shiftNextStep(context) {
  const blockers = shiftBlockers(context);
  if (blockers[0]) return blockers[0].replace('.', '') + ' Önce bunu tamamla.';
  if (Number(context?.openOfferCount || 0) > 0) return 'Önce teklif kararını netleştir. Sonra araç ve sürücüyü tekrar kontrol et.';
  if (String(context?.status || '') === 'REQUESTED') return 'Önce uygun teklif veya atama hattını aç. Sonra işin bağlı olacağı odayı netleştir.';
  return 'Önce araç, sürücü ve durak bilgisini birlikte kontrol et. Sonra ilgili ekrandan ilerle.';
}

export function shiftReadinessReply(context) {
  const blockers = shiftBlockers(context);
  const ready = blockers.length === 0 && Number(context?.openOfferCount || 0) === 0 && Boolean(context?.vehicleId) && Boolean(context?.driverId);
  const score = ready ? 92 : blockers.length ? 46 : 72;
  const label = ready ? 'hazır' : blockers.length ? 'hazır değil' : 'kontrollü ilerlemeli';
  return `${shiftStatusText(context)} Bu kayıt şu an ${label} (${score}/100). ${blockers[0] ? `Ana blokaj: ${blockers[0]}` : 'Kritik eksik görünmüyor.'} Şimdi yap: ${shiftNextStep(context)}`.trim();
}

export function shiftMissingDataReply(context) {
  const blockers = shiftBlockers(context);
  if (!blockers.length) return `${shiftStatusText(context)} Belirgin eksik görünmüyor. Şimdi yap: ${shiftNextStep(context)}`.trim();
  const more = blockers.slice(1, 3);
  return `Ana blokaj: ${blockers[0]} ${more.length ? `Diğer dikkatler: ${more.join(' • ')}` : ''} Şimdi yap: ${shiftNextStep(context)}`.trim();
}
