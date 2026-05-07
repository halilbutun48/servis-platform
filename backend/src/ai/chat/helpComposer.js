import { buildJobGuideResponse } from '../jobGuide/index.js';
import { getScreenDefinitionForUser, listScreensForUser } from '../jobGuide/screenCatalog.js';
import { explainTermsFromText } from '../jobGuide/glossary.js';
import { detectQuestionIntent, resolveReplyMode, selectGuideJobType, buildSuggestedChips } from './intentRouter.js';
import { firstNonEmpty, makeAskAction, makeCopyAction, makeGuideAction, makeLinkedGuide, makeQuickAction, mergeQuickActions, toReply, uniqueStrings } from './replyShapes.js';
import { analyzeScreenState } from './screenStateAnalyzer.js';
import { createSelectedRuntimeHelpers } from './helpComposerSelectedRuntime.js';
import { createEntityRuntimeHelpers } from './helpComposerEntityRuntime.js';

function pickTerms(simpleTerms, limit = 3) {
  return (Array.isArray(simpleTerms) ? simpleTerms : []).slice(0, limit).map((row) => `${row.term}: ${row.meaning}`);
}

function pickButtons(buttonGuides, limit = 3) {
  return (Array.isArray(buttonGuides) ? buttonGuides : []).slice(0, limit).map((row) => `${row.label}: ${row.purpose}`);
}

function normalizeText(value) {
  return String(value || '').trim().toLocaleLowerCase('tr-TR');
}

function asText(item) {
  if (item == null) return '';
  if (typeof item === 'string') return item;
  if (typeof item === 'object') return firstNonEmpty(item.text, item.label, item.title, item.action, item.purpose, item.reason, '');
  return String(item || '');
}

function extractUserQuestion(message) {
  const raw = String(message || '').trim();
  if (!raw) return '';
  const match = raw.match(/Kullanıcının sorusu:\s*([\s\S]+)$/i);
  return String(match?.[1] || raw).trim();
}

function selectedDiagnosticSurfacePath(screenDefinition, screenContext, sourceScreenDefinition, sourceScreenContext) {
  const paths = [
    screenDefinition?.path,
    screenContext?.path,
    sourceScreenDefinition?.path,
    sourceScreenContext?.path,
  ].map((item) => normalizeText(item)).filter(Boolean);
  return paths.find((item) => item.startsWith('/superadmin')) || paths[0] || '';
}

function hasSelectedDiagnosticContext(screenContext) {
  if (!screenContext) return false;
  const facts = screenContext?.structuredFacts && typeof screenContext.structuredFacts === 'object' ? screenContext.structuredFacts : null;
  return Boolean(
    selectedCarrySummary(screenContext)
    || selectedFieldRows(screenContext).length
    || selectedBadgeRows(screenContext).length
    || (Array.isArray(facts?.evidence) && facts.evidence.length)
    || (Array.isArray(facts?.missing) && facts.missing.length)
    || (Array.isArray(facts?.blockers) && facts.blockers.length)
  );
}

function selectedDiagnosticTheme(message) {
  const text = normalizeText(message);
  if (!text) return '';
  if (/(vardiya).*(başlayamıyor|baslayamiyor|başlamıyor|baslamiyor|başlatamıyor|baslatamiyor)/.test(text)) return 'SHIFT_BLOCKED';
  if (/(araç|arac).*(harita|haritada).*(görünmüyor|gorunmuyor|yok)/.test(text) || /(haritada).*(görünmüyor|gorunmuyor).*(araç|arac)/.test(text)) return 'VEHICLE_NOT_VISIBLE';
  if (/(sürücünün|surucunun).*(telefon gps|telefon gps['’]i|telefon gps’i).*(neden).*(devrede|aktif|açık|acik)/.test(text) || /(telefon gps|cihaz gps).*(neden).*(devrede|aktif|açık|acik)/.test(text)) return 'DRIVER_PHONE_GPS';
  if (/(sağlayıcı|saglayici).*(neden).*(daha iyi|daha güçlü|daha guclu)/.test(text) || /(daha iyi|daha güçlü|daha guclu).*(sağlayıcı|saglayici)/.test(text)) return 'PROVIDER_BETTER';
  if (/(sözleşmeden|sozlesmeden).*(bugün|bugun).*(vardiya).*(üretildi|uretildi|oluştu|olustu)/.test(text) || /(bugün|bugun).*(vardiya).*(üretildi|uretildi|oluştu|olustu).*(sözleşme|sozlesme)/.test(text)) return 'CONTRACT_SHIFT_TODAY';
  if (/(hakediş|hakedis).*(neden).*(eksik|kontrol gerekli)/.test(text) || /(önizleme|onizleme).*(neden).*(eksik|kontrol gerekli)/.test(text)) return 'PAYMENT_MISSING';
  if (/(sıradaki doğru işlem|siradaki dogru islem|sıradaki işlem|siradaki islem|sonraki doğru işlem|sonraki dogru islem|ilk neye bakayım|ilk neye bakayim|şimdi ne yapayım|simdi ne yapayim|şimdi ne yapmalıyım|simdi ne yapmaliyim|hangi ekrana gitmeliyim|nereye geçmeliyim|nereye gitmeliyim)/.test(text)) return 'NEXT_ACTION';
  return '';
}

function sanitizeDiagnosticSupportText(text) {
  return normalizeReplySurface(String(text || '')).replace(/Sonuç:/g, 'Özet:');
}

function selectedDiagnosticResult(theme, contextText = '') {
  const text = normalizeText(contextText);
  const hasNegative = /(yok|eksik|kapalı|kapali|görünmüyor|gorunmuyor)/.test(text);
  switch (theme) {
    case 'SHIFT_BLOCKED':
      return 'Bu ekrandaki veriye göre bu vardiya başlayamıyor.';
    case 'VEHICLE_NOT_VISIBLE':
      return 'Bu ekrandaki veriye göre bu araç haritada görünmüyor.';
    case 'DRIVER_PHONE_GPS':
      return 'Bu ekrandaki veriye göre sürücünün telefon GPS’i devrede görünüyor.';
    case 'PROVIDER_BETTER':
      return 'Bu ekrandaki veriye göre bu sağlayıcı daha güçlü görünüyor.';
    case 'CONTRACT_SHIFT_TODAY':
      return hasNegative
        ? 'Bu ekrandaki veriye göre bugün sözleşmeden vardiya üretildiğine dair net işaret yok.'
        : 'Bu ekrandaki veriye göre bugün sözleşmeden vardiya üretilmiş görünüyor.';
    case 'PAYMENT_MISSING':
      return 'Bu ekrandaki veriye göre bu hakediş eksik görünüyor.';
    case 'NEXT_ACTION':
      return 'Bu ekrandaki veriye göre sıradaki doğru işlem önce seçili kaydı netleştirmek.';
    default:
      return 'Bu ekrandaki veriye göre seçili kayıt kontrol altında tutulmalı.';
  }
}

function selectedDiagnosticSurfaceHint(theme) {
  switch (theme) {
    case 'SHIFT_BLOCKED':
      return 'Araç, sürücü ve sözleşme bağı';
    case 'VEHICLE_NOT_VISIBLE':
      return 'Son GPS zamanı ve konum kaynağı';
    case 'DRIVER_PHONE_GPS':
      return 'Görev durumu ve sürücünün telefon GPS’i sinyali';
    case 'PROVIDER_BETTER':
      return 'Kanıt, taslak skor, inceleme kararı ve denetim izi';
    case 'CONTRACT_SHIFT_TODAY':
      return 'Sözleşme bağı ve bugün oluşan vardiya izi';
    case 'PAYMENT_MISSING':
      return 'Hakediş hazırlığı, önizleme ve CSV taslağı';
    case 'NEXT_ACTION':
      return 'Seçili kayıt özeti ve durum satırı';
    default:
      return 'Seçili kayıt özeti';
  }
}

// COP-01B: Super Admin OP/QLT/PAY yüzeylerinde seçili kayıt bağlamına göre kısa teşhis.
function composeSelectedRecordDiagnosticReply({ message, screenDefinition, screenContext, sourceScreenDefinition, sourceScreenContext, conversationState }) {
  const screenPath = selectedDiagnosticSurfacePath(screenDefinition, screenContext, sourceScreenDefinition, sourceScreenContext);
  if (!screenPath.startsWith('/superadmin')) return null;
  const supportedSurface = screenPath === '/superadmin' || screenPath.startsWith('/superadmin/operations') || screenPath.startsWith('/superadmin/commercial-core') || screenPath.startsWith('/superadmin/trust-quality') || screenPath.startsWith('/superadmin/operation-verification');
  if (!supportedSurface) return null;
  const theme = selectedDiagnosticTheme(message);
  if (!theme) return null;

  const currentContext = hasSelectedDiagnosticContext(screenContext) ? screenContext : hasSelectedDiagnosticContext(sourceScreenContext) ? sourceScreenContext : null;
  if (!currentContext) return null;
  const currentScreenDefinition = currentContext === screenContext ? screenDefinition : sourceScreenDefinition;
  const fallbackContext = currentContext === screenContext ? sourceScreenContext : screenContext;
  const fallbackScreenDefinition = fallbackContext === sourceScreenContext ? sourceScreenDefinition : screenDefinition;
  const summary = firstNonEmpty(selectedCarrySummary(currentContext), selectedCarrySummary(fallbackContext), '');
  const rowReply = sanitizeDiagnosticSupportText(firstNonEmpty(selectedRowReadReply(currentContext, currentScreenDefinition), selectedRowReadReply(fallbackContext, fallbackScreenDefinition), ''));
  const missingReply = sanitizeDiagnosticSupportText(firstNonEmpty(selectedMissingReply(currentContext, currentScreenDefinition), selectedMissingReply(fallbackContext, fallbackScreenDefinition), ''));
  const fieldReply = sanitizeDiagnosticSupportText(firstNonEmpty(selectedFieldReply(message, currentContext, currentScreenDefinition), selectedFieldReply(message, fallbackContext, fallbackScreenDefinition), ''));
  const badgeReply = sanitizeDiagnosticSupportText(firstNonEmpty(selectedBadgeReply(message, currentContext, currentScreenDefinition), selectedBadgeReply(message, fallbackContext, fallbackScreenDefinition), ''));
  const analysis = analyzeScreenState({ screenContext: currentContext, screenDefinition, conversationState });
  const analysisReply = analysis ? sanitizeDiagnosticSupportText(analyzerReply(analysis, 'DIAGNOSIS')) : '';
  const contextText = uniqueStrings([summary, rowReply, missingReply, fieldReply, badgeReply, analysisReply]).join(' • ');
  const why = uniqueStrings([
    summary ? `Seçili kayıt: ${summary}` : '',
    rowReply,
    missingReply,
    fieldReply,
    badgeReply,
    analysisReply,
  ]).slice(0, 2).join(' • ') || 'Bu ekrandaki veriye göre net blokaj görünmüyor.';
  const result = selectedDiagnosticResult(theme, contextText);
  const firstControl = selectedDiagnosticSurfaceHint(theme);
  return `Şimdi: ${result} Neden? ${why} İlk kontrol: ${firstControl}.`.trim();
}

// COP-01A: OP/QLT/PAY ekran rehberi için kısa, güvenli cevaplar.
function composeOpsQualityPaymentGuideReply({ questionType, message, screenDefinition, screenContext, sourceScreenDefinition, sourceScreenContext }) {
  const screenPath = normalizeText(firstNonEmpty(screenDefinition?.path, screenContext?.path, sourceScreenDefinition?.path, sourceScreenContext?.path, ''));
  if (!screenPath) return null;

  const isSuperAdminOverview = screenPath === '/superadmin';
  const isCommercial = screenPath === '/superadmin/commercial-core';
  const isQuality = screenPath === '/superadmin/trust-quality';
  const isVerification = screenPath === '/superadmin/operation-verification';
  const isTargetSurface = isSuperAdminOverview || isCommercial || isQuality || isVerification;
  if (!isTargetSurface) return null;

  const text = normalizeText(message);
  const relevantQuestionType = ['SCREEN_PURPOSE', 'STATUS_HELP', 'WHY_BLOCKED', 'NEXT_STEP', 'SAFE_NEXT_STEP', 'READINESS_CHECK', 'TERM_HELP'].includes(String(questionType || ''));

  const asksSystem = /(sistem durumu|sistem durumu ne demek|ne açık ne kapalı|ne acik ne kapali|ödeme neden kapalı|ödeme neden kapali|ödemeler neden kapalı|ödemeler neden kapali|neden kapalı|neden kapali)/.test(text);
  const asksCommercial = /(hakediş|hakedis|ödeme başlat|odeme baslat|ödemeyi başlat|önizleme|onizleme|csv|csv taslağı|csv taslagi|hazırlık|hazirlik|hazır mı|hazir mi|kontrol gerekli|eksik bilgi)/.test(text);
  const asksQuality = /(kalite puanı|kalite puani|taslak skor|inceleme kararı|inceleme karari|denetim izi|sağlayıcı sıralaması|saglayici siralamasi|kesin puan|kesin mi|tekrar kontrol gerekli|şimdilik dikkate alınmadı|simdilik dikkate alinmadi)/.test(text);
  const asksProof = /(servis kanıtı|servis kaniti|hizmet kanıtı|hizmet kaniti|operatör notu|operatör not|operatör notu|sürücünün telefon gps['’]i|sürücünün telefon gps'i|telefon gps|araç gps|arac gps|biniş kaydı|binis kaydı|binis kaydi|kanıt ne işe yarar|kanıt ne ise yarar)/.test(text);

  if ((asksProof || (isVerification && relevantQuestionType)) && isTargetSurface) {
    return 'İlk bakılacak yer: Servis Kanıtı kartı. Servis Kanıtı operasyon görünürlüğü sağlar. Ham GPS/teknik veri göstermez. Sürücünün telefon GPS’i güvenli sinyal olarak görünür. Hakediş için nihai karar değildir.';
  }
  if ((asksQuality || (isQuality && relevantQuestionType)) && (isQuality || isCommercial || isSuperAdminOverview || isVerification)) {
    return 'İlk bakılacak yer: Kalite akış özeti. Bu bilgi kesin kalite puanı değildir. Sağlayıcı sıralaması değildir. Hakediş veya komisyon hesabını etkilemez.';
  }
  if ((asksCommercial || (isCommercial && relevantQuestionType)) && (isCommercial || isSuperAdminOverview)) {
    return 'İlk bakılacak yer: Ticari akış özeti. Bu ekran ödeme başlatmaz. Hakediş hazırlığı, önizleme ve CSV taslağı gösterir. Ödeme, settlement ve komisyon kapalıdır.';
  }
  if ((asksSystem || (isSuperAdminOverview && relevantQuestionType)) && isSuperAdminOverview) {
    return 'İlk bakılacak yer: Sistem durumu bandı. Kanıt ve kalite hazırlıkları aktif; ödeme, settlement ve komisyon kapalıdır; saha testi bekliyor.';
  }
  return null;
}

export function normalizeEverydayQuestion(message) {
  const raw = String(message || '').trim();
  const text = normalizeText(raw);
  if (!text) return raw;
  if (/(buras[iı] ne|bu taraf ne|bu kisim ne|bu k[ıi]s[ıi]m ne|bu ekran ne( icin| için)?|burda ne yap[ıi]l[ıi]yor|burada ne yap[ıi]l[ıi]yor|ne ise yariyor|ne işe yarıyor)/.test(text)) return 'Bu ekran ne için?';
  if (/(nereye bakcam|nereye bakicam|nereye bakca[mn]|nereye bak[iı]y[ıi]m|nereye bakay[ıi]m|ilk nereyi kontrol edeyim|once nereye bakayim|önce nereye bakayım|ilk nereyi inceleyeyim)/.test(text)) return 'İlk neye bakayım?';
  if (/(nereye g[eé]c(e|ey)im|nereye geç(e|ey)im|nereye git(sem|meliyim|ceyim|ceğim)|hangi ekrana gideyim|hangi tarafa geceyim|hangi tarafa geçeyim|sonra nereye geceyim|sonra nereye geçeyim|sonra nereye gideyim)/.test(text)) return 'Şimdi hangi ekrana gitmeliyim?';
  if (/(niye pasif|neden pasif|basam[iı]yorum|t[ıi]klan[mıi]yor|olmadi|olmad[ıi]|olmuyor|takildi|tak[ıi]ld[ıi]|patladi|patlad[ıi]|kitlendi|ilerlemiyor|tak[ıi]l[ıi]yor)/.test(text)) return 'Bu neden olmuyor?';
  if (/(ne eksik|eksi[gğ]i ne|eksik ne var|hazir mi|haz[ıi]r m[ıi]|atamaya hazir mi|atamaya haz[ıi]r m[ıi]|burda ne eksik|burada ne eksik)/.test(text)) return 'Hazır mı?';
  if (/(konum niye|konum neden|konum yok|konum gozukmuyor|konum gözükmüyor|konum görünmüyor|gps yok|gps gelmiyor|telefon gps['’]i yok|haritada niye yok)/.test(text)) return 'Konum neden görünmüyor?';
  if (/(bu rolde ne yapabilirim|ben bu rolde ne yapabilirim|burada neyi yonetebilirim|burada neyi yönetebilirim|yetkim ne|bu rolde ne yap[ıi]yoruz)/.test(text)) return 'Bu rolde ne yapabilirim?';
  if (/(bu sat[ıi]r ne diyor|bu sat[ıi]r ne demek|bu rozet ne diyor|bu rozet ne demek|bu sat[ıi]r ne anlatiyor|bu sat[ıi]r[ıi] nasil okuyayim|bu sat[ıi]r[ıi] nasıl okuyayım)/.test(text)) return 'Bu satırı nasıl okurum?';
  return raw;
}


function primaryConcernScore(normalized) {
  const text = String(normalized || '').trim();
  const scoreMap = {
    'Bu neden olmuyor?': 98,
    'Konum neden görünmüyor?': 96,
    'Hazır mı?': 92,
    'Şimdi hangi ekrana gitmeliyim?': 90,
    'İlk neye bakayım?': 88,
    'Bu rolde ne yapabilirim?': 82,
    'Bu ekran ne için?': 78,
    'Bu satırı nasıl okurum?': 76,
  };
  return Number(scoreMap[text] || 0);
}

function splitCompoundQuestion(message) {
  const raw = String(message || '').trim();
  if (!raw) return [];
  return raw
    .split(/(?:\s+(?:ama|fakat|yalnız|yalniz|ve sonra|ve bir de|bir de|ayrıca|ayrica|sonra|ve)\s+)|[\n\r]+|[;]+/i)
    .map((row) => String(row || '').trim())
    .filter(Boolean);
}

export function extractPrimaryConcern(message) {
  const raw = String(message || '').trim();
  if (!raw) return raw;
  const parts = splitCompoundQuestion(raw);
  if (parts.length <= 1 && raw.length < 96) return normalizeEverydayQuestion(raw);
  const candidates = (parts.length ? parts : [raw]).map((part, idx) => {
    const normalized = normalizeEverydayQuestion(part);
    const changed = normalizeText(normalized) !== normalizeText(part);
    let score = primaryConcernScore(normalized);
    if (changed) score += 12;
    if (/[?]/.test(part)) score += 3;
    if (/(önce|once|şimdi|simdi|sonra|nereye|neden|niye|hazır|hazir|konum|rol)/i.test(part)) score += 2;
    if (normalized === 'Şimdi hangi ekrana gitmeliyim?' && /(nereye|hangi ekrana|geçeyim|gideyim)/i.test(part)) score += 8;
    if (normalized === 'Bu neden olmuyor?' && /(neden|niye|pasif|olmuyor|tak[ıi]l)/i.test(part)) score += 8;
    if (normalized === 'Konum neden görünmüyor?' && /(konum|gps|harita)/i.test(part)) score += 8;
    if (normalized === 'Hazır mı?' && /(haz[ıi]r|eksik|atamaya)/i.test(part)) score += 8;
    score -= idx * 0.5;
    return { part, normalized, score };
  });
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0] || null;
  return String(best?.normalized || normalizeEverydayQuestion(raw)).trim();
}


function looksLikeShortFollowUp(message) {
  const text = normalizeText(message);
  if (!text) return false;
  if (text.length > 72) return false;
  return /(peki|tamam|o zaman|devam|devam et|ee sonra|e sonra|sonra\??|simdi\??|şimdi\??|neden\??|niye\??|bunda\??|burada\??|aynı kayıtta|ayni kayitta|aynı satırda|ayni satirda|bu kayıtta|bu kayitta)/.test(text);
}

function expandFollowUpMessage(message, conversationState, screenContext) {
  const raw = String(message || '').trim();
  const hasConversationAnchor = Boolean(conversationState?.lastQuestionType) || (Array.isArray(conversationState?.recentMessages) && conversationState.recentMessages.length > 0);
  if (!hasConversationAnchor || !looksLikeShortFollowUp(raw)) return raw;
  const text = normalizeText(raw);
  const lastType = String(conversationState?.lastQuestionType || '');
  const selectedLabel = firstNonEmpty(screenContext?.selectedLabel, conversationState?.lastSelectedLabel, conversationState?.lastEntityLabel, 'bu seçili kayıt');
  if (/^(neden|niye)\??$/.test(text) || /(neden böyle|neden boyle|niye böyle|niye boyle)/.test(text)) {
    return `${selectedLabel} için neden böyle görünüyor?`;
  }
  if (/(peki|tamam|o zaman|devam|devam et|ee sonra|e sonra|sonra|şimdi|simdi)/.test(text)) {
    if (['NEXT_SCREEN', 'GO_TO'].includes(lastType)) return `${selectedLabel} için hedef ekranda önce neyi kontrol etmeliyim?`;
    return `${selectedLabel} için şimdi ne yapmalıyım?`;
  }
  if (/(bunda|burada|aynı kayıtta|ayni kayitta|aynı satırda|ayni satirda|bu kayıtta|bu kayitta)/.test(text)) {
    if (['WHY_BLOCKED'].includes(lastType)) return `${selectedLabel} için neden blokaj görünüyor?`;
    if (['READINESS_CHECK'].includes(lastType)) return `${selectedLabel} için eksik ne var?`;
    return `${selectedLabel} ne durumda?`;
  }
  return raw;
}

function buildContinuityMeta({ message, conversationState, screenContext, requestEntityType, requestEntityId, screenPath }) {
  const currentType = String(screenContext?.selectedEntityType || requestEntityType || '');
  const currentId = Number(screenContext?.selectedEntityId || requestEntityId || 0);
  const lastType = String(conversationState?.lastSelectedEntityType || conversationState?.lastEntityType || '');
  const lastId = Number(conversationState?.lastSelectedEntityId || conversationState?.lastEntityId || 0);
  const anchorLabel = firstNonEmpty(screenContext?.selectedLabel, conversationState?.lastSelectedLabel, conversationState?.lastEntityLabel, '');
  const isFollowUp = looksLikeShortFollowUp(message) || Boolean(conversationState?.lastQuestionType && Array.isArray(conversationState?.recentMessages) && conversationState.recentMessages.length);
  const sameEntity = Boolean(currentType && currentId > 0 && currentType === lastType && currentId === lastId);
  const sameScreen = Boolean(screenPath && String(conversationState?.lastScreenPath || '') === String(screenPath || ''));
  return {
    isFollowUp,
    sameEntity,
    sameScreen,
    anchorLabel,
    currentEntityType: currentType,
    currentEntityId: currentId,
  };
}

function pickScreenByKind(screens, kind) {
  const rows = Array.isArray(screens) ? screens : [];
  if (!kind) return null;
  const map = {
    PLANNING: (row) => ['/', '/company', '/organization', '/school'].includes(String(row?.path || '')),
    SHIFTS: (row) => String(row?.path || '').includes('/shifts'),
    COMMERCIAL: (row) => String(row?.path || '').includes('/commercial-flow'),
    SERVICE: (row) => String(row?.path || '').includes('/service-evaluation'),
    GEOREVIEW: (row) => String(row?.path || '').includes('/georeview'),
    MAP: (row) => String(row?.path || '').includes('/map'),
    COPILOT: (row) => String(row?.path || '').includes('/copilot'),
  };
  const predicate = map[String(kind || '')] || null;
  return predicate ? rows.find(predicate) || null : null;
}

function isRecordScopedQuestion(message) {
  const text = normalizeText(message);
  if (!text) return false;
  return /(bu|şu|su)\s+(seçili|secili)?\s*kayıt|haritadaki\s+bu\s+kayıt|secili\s+kayit|seçili\s+kayıt|ilgili\s+kayıt|bu\s+vardiya|bu\s+araç|bu\s+arac/.test(text);
}

function isGenericFlowQuestion(message) {
  const text = normalizeText(message);
  if (!text) return false;
  if (isRecordScopedQuestion(text)) return false;
  return /(dan|den)\s+sonra\s+nereye|sonra\s+hangi\s+ekran|sonraki\s+ekran|nereye\s+geçeyim|nereye\s+gitmeliyim/.test(text);
}

function isDirectRouteRequest(message) {
  const text = normalizeText(message);
  if (!text) return false;
  return /(doğrudan|dogrudan|direkt|direk|sapma olmadan|hedef ekran|yanlış hedef|yanlis hedef)/.test(text);
}

function resolveReferencedScreenDefinition(user, screenContext, screenDefinition, message) {
  const text = normalizeText(extractUserQuestion(message));
  if (!text || !user) return screenDefinition;
  const screens = listScreensForUser(user, screenContext)
    .map((item) => getScreenDefinitionForUser(user, { ...(screenContext || {}), path: item.path }, item.id))
    .filter(Boolean);
  if (!screens.length) return screenDefinition;

  const choose = (predicate) => screens.find(predicate) || null;
  const explicitKind = extractMentionedScreenKind(text);
  if (explicitKind) {
    const explicitHit = pickScreenByKind(screens, explicitKind);
    if (explicitHit) return explicitHit;
  }
  if (/vardiya\s+oluştur|vardiya\s+olustur|nasıl\s+vardiya\s+oluştur|nasil\s+vardiya\s+olustur|yeni\s+iş\s+kur|yeni\s+is\s+kur|plan\s+kur/.test(text)) {
    const planning = choose((row) => ['/', '/company', '/organization', '/school'].includes(String(row?.path || '')) || /planlama merkezi|organizasyon merkezi|okul merkezi|gezi \/ planlama merkezi/i.test(String(row?.label || '')));
    if (planning) return planning;
  }
  const genericCurrentScreenQuestion = !explicitKind && (/(hangi\s+ekran\w*|hangi\s+men[üu]\w*|nereye\s+geç\w*|nereye\s+git\w*|buradan\s+sonra|sonraki\s+ekran|önce\s+neye\s+bakay\w*)/.test(text) || /(bu\s+ekran\s+ne\s+için|bu\s+ekran\s+ne\s+icin|bu\s+sayfa\s+ne\s+için|bu\s+sayfa\s+ne\s+icin|burada\s+ne\s+yapılır|burada\s+ne\s+yapilir|ne\s+işe\s+yarar|ne\s+ise\s+yarar)/.test(text) || /(bu\s+rolde|rolümde|rolumde|burada\s+neyi\s+yönetebilirim|burada\s+neyi\s+yonetebilirim|yetkim\s+ne|rol\s+yardımı|rol\s+yardimi)/.test(text));
  if (genericCurrentScreenQuestion) return screenDefinition;

  const aliases = [
    { test: ['planlama merkezi', 'organizasyon merkezi', 'okul merkezi', 'gezi / planlama merkezi'], pick: (row) => ['/', '/company', '/organization', '/school'].includes(String(row?.path || '')) || /planlama merkezi|organizasyon merkezi|okul merkezi|gezi \/ planlama merkezi/i.test(String(row?.label || '')) },
    { test: ['vardiyalar', 'vardiya ekranı', 'vardiya ekrani'], pick: (row) => String(row?.path || '').includes('/shifts') },
    { test: ['ticari akış', 'ticari akis'], pick: (row) => String(row?.path || '').includes('/commercial-flow') },
    { test: ['hizmet değerlendirme', 'hizmet degerlendirme'], pick: (row) => String(row?.path || '').includes('/service-evaluation') },
    { test: ['konum incele', 'personel konum seçici', 'personel konum secici', 'öğrenci konum seçici', 'ogrenci konum secici', 'konum seçici', 'konum secici'], pick: (row) => String(row?.path || '').includes('/georeview') },
    { test: ['canlı harita', 'canli harita', 'harita'], pick: (row) => String(row?.path || '').includes('/map') },
    { test: ['copilot'], pick: (row) => String(row?.path || '').includes('/copilot') },
  ];
  for (const row of aliases) {
    if (row.test.some((x) => text.includes(normalizeText(x)))) {
      const hit = choose(row.pick);
      if (hit) return hit;
    }
  }

  const scored = screens
    .map((row) => ({
      row,
      score: tokenOverlapScore(text, `${row?.label || ''} ${row?.path || ''} ${row?.menuPurpose || ''} ${(Array.isArray(row?.screenMenus) ? row.screenMenus.map((x) => x?.label || '').join(' ') : '')}`),
    }))
    .sort((a, b) => b.score - a.score);
  return scored[0] && scored[0].score > 0 ? scored[0].row : screenDefinition;
}

function remapScreenContext(screenContext, targetScreenDefinition, sourceScreenDefinition) {
  if (!targetScreenDefinition || !screenContext) return screenContext;
  if (String(targetScreenDefinition?.path || '') === String(sourceScreenDefinition?.path || '')) return screenContext;
  return {
    ...screenContext,
    id: Number(targetScreenDefinition?.id || screenContext?.id || 0),
    path: targetScreenDefinition?.path || screenContext?.path || '',
    label: targetScreenDefinition?.label || screenContext?.label || '',
    selectedLabel: '',
    selectedSummary: '',
    selectedFields: [],
    selectedBadges: [],
    structuredFacts: null,
    uiHints: {},
  };
}


function selectedCarrySummary(screenContext) {
  const label = firstNonEmpty(screenContext?.selectedLabel, screenContext?.selectedSummary, '');
  const fields = (Array.isArray(screenContext?.selectedFields) ? screenContext.selectedFields : [])
    .map((row) => ({ label: firstNonEmpty(row?.label, row?.key, ''), value: firstNonEmpty(row?.value, row?.text, '') }))
    .filter((row) => row.label && row.value);
  const top = fields.slice(0, 2).map((row) => `${row.label}: ${row.value}`);
  if (label && top.length) return `${label} (${top.join(' • ')})`;
  if (label) return label;
  if (top.length) return top.join(' • ');
  return '';
}

function composeTargetScreenLead({ sourceScreenDefinition, targetScreenDefinition, sourceScreenContext }) {
  const sourcePath = String(sourceScreenDefinition?.path || '');
  const targetPath = String(targetScreenDefinition?.path || '');
  const targetLabel = firstNonEmpty(targetScreenDefinition?.label, 'ilgili ekran');
  const sourceLabel = firstNonEmpty(sourceScreenDefinition?.label, 'bu ekran');
  const parts = [];
  if (sourcePath && targetPath && sourcePath !== targetPath) parts.push(`Şu an ${sourceLabel} ekranındasın; sorduğun yer ${targetLabel}.`);
  const carry = selectedCarrySummary(sourceScreenContext);
  if (carry) parts.push(`Mevcut seçili kayıt: ${carry}.`);
  return parts.join(' ');
}

function composeScreenPurposeWithCarry({ guide, screenDefinition, sourceScreenDefinition, sourceScreenContext }) {
  const purpose = firstNonEmpty(screenDefinition?.menuPurpose, guide?.plainSummary, guide?.summary, 'Bu ekran bu işi yönetmek için kullanılır.');
  const first = firstNonEmpty(screenDefinition?.firstStep, guide?.whatToDoNow, 'Önce doğru kayıt veya ana alanı kontrol et.');
  const next = firstNonEmpty(screenDefinition?.nextStep, guide?.whatToDoNext, 'Sonra ilgili alt ekrana geç.');
  const lead = composeTargetScreenLead({ sourceScreenDefinition, targetScreenDefinition: screenDefinition, sourceScreenContext });
  const carryHint = selectedCarrySummary(sourceScreenContext)
    ? firstNonEmpty((Array.isArray(screenDefinition?.firstControls) ? screenDefinition.firstControls : [])[0], first)
    : '';
  return `${lead ? `${lead} ` : ''}${purpose} Şimdi yap: ${first}${next ? ` Sonra: ${next}` : ''}${carryHint ? ` Bu seçili kayıt için önce şuna bak: ${carryHint}` : ''}`.trim();
}

function ageMinutes(input) {
  const d = input ? new Date(input) : null;
  if (!d || Number.isNaN(d.getTime())) return null;
  return Math.round((Date.now() - d.getTime()) / 60000);
}

const MATCH_STOPWORDS = new Set(['bu', 'ne', 'demek', 'nasil', 'nasıl', 'hangi', 'alan', 'sutun', 'sütun', 'rozet', 'etiket', 'kayit', 'kayıt', 'satir', 'satır', 'secili', 'seçili']);

function tokenOverlapScore(text, hay) {
  const parts = normalizeText(text).split(/\s+/).filter((x) => x && x.length > 1 && !MATCH_STOPWORDS.has(x));
  if (!parts.length) return 0;
  const target = normalizeText(hay);
  return parts.reduce((sum, part) => sum + (target.includes(part) ? 1 : 0), 0);
}

const { selectedFieldRows, selectedBadgeRows, selectedRowReadReply, selectedFieldReply, selectedBadgeReply, selectedMissingReply, selectedTermReply } = createSelectedRuntimeHelpers({
  firstNonEmpty,
  normalizeText,
  tokenOverlapScore,
  structuredFacts,
  structuredActionRows,
  dataRules,
});

const { vehicleReadinessReply, vehicleMissingDataReply, prefersSelectedEntity, isShiftTrackingScreen, shiftScreenNoSelectionReply, openingReply, termComparisonReply, analyzerEvidenceText, analyzerReply, composeScreenLocationReply, roleHelpReply } = createEntityRuntimeHelpers({
  firstNonEmpty,
  normalizeText,
  pickTerms,
  composeSimpleScreenReply,
  roleLead,
  shiftStatusText,
  shiftNextStep,
  vehicleSourceText,
  vehicleNextStep,
  vehicleBlockers,
});

function structuredFacts(screenContext) {
  const facts = screenContext?.structuredFacts;
  return facts && typeof facts === 'object' ? facts : null;
}

function structuredActionRows(screenContext, key) {
  const facts = structuredFacts(screenContext);
  const rows = Array.isArray(facts?.[key]) ? facts[key] : [];
  return rows.map((row) => ({
    actionKey: firstNonEmpty(row?.key, row?.actionKey, ''),
    label: firstNonEmpty(row?.label, row?.title, typeof row === 'string' ? row : ''),
    reason: firstNonEmpty(row?.reason, row?.help, row?.disabledReason, ''),
    purpose: firstNonEmpty(row?.purpose, row?.meaning, ''),
    whenToUse: firstNonEmpty(row?.whenToUse, row?.howToUse, ''),
    whatHappens: firstNonEmpty(row?.whatHappens, row?.result, ''),
    riskNote: firstNonEmpty(row?.riskNote, row?.risk, ''),
    required: Array.isArray(row?.required) ? row.required.filter(Boolean) : [],
    blockedBy: Array.isArray(row?.blockedBy) ? row.blockedBy.filter(Boolean) : [],
    enabled: row?.enabled !== false && key !== 'blockedActions',
  })).filter((row) => row.label);
}

function uiHintRows(screenContext, key) {
  return (Array.isArray(screenContext?.uiHints?.[key]) ? screenContext.uiHints[key] : []).map((row) => ({
    label: firstNonEmpty(row?.label, row?.title, row?.text, typeof row === 'string' ? row : ''),
    value: firstNonEmpty(row?.value, row?.text, row?.label, typeof row === 'string' ? row : ''),
    reason: firstNonEmpty(row?.reason, row?.help, ''),
    disabled: Boolean(row?.disabled),
  })).filter((row) => row.label);
}

function findUiRowByMessage(message, rows) {
  const items = Array.isArray(rows) ? rows : [];
  if (!items.length) return null;
  const text = normalizeText(message);
  if (!text) return items[0] || null;
  const best = items
    .map((row) => ({ row, score: tokenOverlapScore(text, `${row?.label || ''} ${row?.value || ''} ${row?.reason || ''}`) }))
    .sort((a, b) => b.score - a.score)[0] || null;
  return best && best.score > 0 ? best.row : items[0] || null;
}


function findStructuredActionByMessage(message, screenContext) {
  const rows = [...structuredActionRows(screenContext, 'allowedActions'), ...structuredActionRows(screenContext, 'blockedActions')];
  if (!rows.length) return null;
  const text = normalizeText(message);
  if (!text) return rows[0] || null;
  const best = rows
    .map((row) => ({ row, score: tokenOverlapScore(text, `${row?.label || ''} ${row?.purpose || ''} ${row?.whenToUse || ''} ${row?.whatHappens || ''} ${row?.reason || ''} ${(row?.required || []).join(' ')} ${(row?.blockedBy || []).join(' ')}`) }))
    .sort((a, b) => b.score - a.score)[0] || null;
  return best && best.score > 0 ? best.row : rows[0] || null;
}

function structuredButtonReply(message, screenContext, analysis, options = {}) {
  const action = findStructuredActionByMessage(message, screenContext);
  if (!action) return '';
  const { blockedOnly = false } = options || {};
  if (blockedOnly && action.enabled) return '';
  const parts = [];
  parts.push(`${action.label}: ${firstNonEmpty(action.purpose, action.enabled ? 'Bu aksiyon şu an kullanılabilir görünüyor.' : 'Bu aksiyon şu an pasif görünüyor.')}`);
  parts.push(action.enabled ? 'Şu an kullanılabilir görünüyor.' : 'Şu an pasif görünüyor.');
  if (action.reason) parts.push(`Sebep: ${action.reason}`);
  if (action.whenToUse) parts.push(`Ne zaman: ${action.whenToUse}`);
  if (action.required?.length) parts.push(`Ön koşul: ${action.required.join(' • ')}`);
  if (action.blockedBy?.length && !action.enabled) parts.push(`Eksik/engel: ${action.blockedBy.join(' • ')}`);
  if (action.whatHappens) parts.push(`Sonuç: ${action.whatHappens}`);
  if (action.riskNote) parts.push(`Dikkat: ${action.riskNote}`);
  if (analysis?.nextBestAction) parts.push(`Şimdi yap: ${analysis.nextBestAction}`);
  return parts.join(' ').trim();
}

function disabledButtonReply(message, screenContext, analysis) {
  const structured = structuredButtonReply(message, screenContext, analysis, { blockedOnly: true });
  if (structured) return structured;
  const hit = findUiRowByMessage(message, [...structuredActionRows(screenContext, 'blockedActions'), ...uiHintRows(screenContext, 'disabledButtons')]);
  if (!hit) return '';
  return `${hit.label} şu an pasif görünüyor.${hit.reason ? ` Sebep: ${hit.reason}` : ''} ${analysis?.nextBestAction ? `Şimdi yap: ${analysis.nextBestAction}` : ''}`.trim();
}

function visibleButtonReply(message, screenContext, analysis = null) {
  const structured = structuredButtonReply(message, screenContext, analysis, { blockedOnly: false });
  if (structured) return structured;
  const hit = findUiRowByMessage(message, [...structuredActionRows(screenContext, 'allowedActions'), ...uiHintRows(screenContext, 'visibleButtons')]);
  if (!hit) return '';
  return `${hit.label} şu an ekranda görünen bir aksiyon. Doğru kayıt seçiliyken bu buton üzerinden ilerlenir.`;
}

function uiSurfaceEvidence(screenContext) {
  const facts = structuredFacts(screenContext);
  const headers = uiHintRows(screenContext, 'tableHeaders').map((row) => row.label).slice(0, 4);
  const modals = uiHintRows(screenContext, 'modalTitles').map((row) => row.label).slice(0, 2);
  const tabs = uiHintRows(screenContext, 'activeTabs').map((row) => row.label).slice(0, 2);
  const parts = [];
  if (facts?.counters && typeof facts.counters === 'object') {
    const counterText = Object.entries(facts.counters).filter(([, value]) => value != null && value !== '' && value !== false).slice(0, 5).map(([key, value]) => `${key}: ${value}`).join(' • ');
    if (counterText) parts.push(`Panel verisi: ${counterText}`);
  }
  if (headers.length) parts.push(`Tablo başlıkları: ${headers.join(', ')}`);
  if (modals.length) parts.push(`Açık modal: ${modals.join(', ')}`);
  if (tabs.length) parts.push(`Aktif sekme: ${tabs.join(', ')}`);
  return parts.length ? `UI ipucu: ${parts.join(' • ')}.` : '';
}

function findButtonGuideByMessage(message, guide, screenDefinition) {
  const text = normalizeText(message);
  const rows = [...(Array.isArray(guide?.buttonGuides) ? guide.buttonGuides : []), ...(Array.isArray(screenDefinition?.buttonGuides) ? screenDefinition.buttonGuides : [])];
  if (!text) return rows[0] || null;
  return rows
    .map((row) => ({ row, score: tokenOverlapScore(text, `${row?.label || ''} ${row?.purpose || ''} ${row?.whenToUse || ''} ${row?.whatHappens || ''}`) }))
    .sort((a, b) => b.score - a.score)[0]?.row || rows[0] || null;
}

function findWorkflowStageByMessage(message, guide, screenDefinition) {
  const text = normalizeText(message);
  const rows = workflowStages(screenDefinition, guide, 8);
  if (!text) return rows[0] || null;
  return rows
    .map((row) => ({ row, score: tokenOverlapScore(text, `${row?.title || ''} ${row?.action || ''} ${row?.doneWhen || ''} ${row?.ifBlocked || ''}`) }))
    .sort((a, b) => b.score - a.score)[0]?.row || rows[0] || null;
}

function findNextScreenByMessage(message, screenDefinition) {
  const text = normalizeText(message);
  const rows = nextScreens(screenDefinition, 6);
  if (!text) return rows[0] || null;
  return rows
    .map((row) => ({ row, score: tokenOverlapScore(text, `${row?.label || ''} ${row?.reason || ''}`) }))
    .sort((a, b) => b.score - a.score)[0]?.row || rows[0] || null;
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
  return roleMode === 'SIMPLE' ? 'Kısaca:' : 'Durumu kısa özetliyorum.';
}

function simpleNowText(guide, screenDefinition, fallback = 'Önce bu ekrandaki ana bilgiyi kontrol et.') {
  return firstNonEmpty(guide?.whatToDoNow, screenDefinition?.firstStep, fallback);
}

function simpleNextText(guide, screenDefinition) {
  return firstNonEmpty(guide?.whatToDoNext, screenDefinition?.nextStep, '');
}

function simpleMenuList(screenDefinition, limit = 2) {
  return (Array.isArray(screenDefinition?.screenMenus) ? screenDefinition.screenMenus : []).slice(0, limit).map((x) => x?.label).filter(Boolean);
}

function firstControls(screenDefinition, guide) {
  const raw = [
    ...(Array.isArray(screenDefinition?.firstControls) ? screenDefinition.firstControls : []),
    ...(Array.isArray(guide?.beforeYouStart) ? guide.beforeYouStart : []),
  ];
  return uniqueStrings(raw.map((x) => asText(x)).filter(Boolean)).slice(0, 5);
}

function stuckChecks(screenDefinition, guide, limit = 4) {
  const raw = [
    ...(Array.isArray(screenDefinition?.stuckChecks) ? screenDefinition.stuckChecks : []),
    ...(Array.isArray(guide?.lockedActionReasons) ? guide.lockedActionReasons : []),
  ];
  return uniqueStrings(raw.map((x) => asText(x)).filter(Boolean)).slice(0, limit);
}

function workflowStages(screenDefinition, guide, limit = 5) {
  const screenStages = Array.isArray(screenDefinition?.workflowStages) ? screenDefinition.workflowStages : [];
  if (screenStages.length) return screenStages.slice(0, limit);
  return (Array.isArray(guide?.stepByStep) ? guide.stepByStep : []).slice(0, limit).map((item, idx) => ({
    key: `STEP_${idx + 1}`,
    title: `Adım ${idx + 1}`,
    action: item,
    doneWhen: '',
    ifBlocked: '',
  }));
}

function nextScreens(screenDefinition, limit = 4) {
  const rows = Array.isArray(screenDefinition?.nextScreens) ? screenDefinition.nextScreens : [];
  if (rows.length) return rows.slice(0, limit);
  return (Array.isArray(screenDefinition?.screenMenus) ? screenDefinition.screenMenus : []).slice(0, limit).map((item) => ({
    label: item?.label || '',
    path: item?.path || '',
    reason: item?.purpose || '',
  })).filter((x) => x.label);
}

function dataRules(screenDefinition, guide, limit = 5) {
  const raw = [
    ...(Array.isArray(screenDefinition?.dataRules) ? screenDefinition.dataRules : []),
    ...(Array.isArray(guide?.dataRules) ? guide.dataRules : []),
  ];
  return uniqueStrings(raw.map((x) => asText(x)).filter(Boolean)).slice(0, limit);
}

function formatDataRulesReply(screenDefinition, guide, prefix = 'Veri kuralı: ') {
  return bulletJoin(dataRules(screenDefinition, guide, 5), prefix);
}

function bulletJoin(items, prefix = '') {
  const rows = (Array.isArray(items) ? items : []).filter(Boolean);
  if (!rows.length) return '';
  return `${prefix}${rows.map((x, i) => `${i + 1}) ${x}`).join(' ')}`.trim();
}

function formatWorkflowReply(screenDefinition, guide) {
  const stages = workflowStages(screenDefinition, guide, 5);
  if (!stages.length) return '';
  return stages.map((row, idx) => {
    const parts = [`${idx + 1}) ${firstNonEmpty(row?.title, `Adım ${idx + 1}`)}: ${firstNonEmpty(row?.action, row?.detail, '')}`.trim()];
    if (row?.doneWhen) parts.push(`Tamam say: ${row.doneWhen}`);
    if (row?.ifBlocked) parts.push(`Takılırsa: ${row.ifBlocked}`);
    return parts.join(' ');
  }).join(' ');
}

function formatNextScreensReply(screenDefinition) {
  const rows = nextScreens(screenDefinition, 4);
  if (!rows.length) return '';
  return rows.map((row, idx) => `${idx + 1}) ${row.label}${row.reason ? `: ${row.reason}` : ''}`).join(' ');
}

function nextScreenLead({ sourceScreenDefinition, targetScreenDefinition }) {
  const sourcePath = String(sourceScreenDefinition?.path || '');
  const targetPath = String(targetScreenDefinition?.path || '');
  const sourceLabel = firstNonEmpty(sourceScreenDefinition?.label, 'bu ekran');
  const targetLabel = firstNonEmpty(targetScreenDefinition?.label, 'ilgili ekran');
  if (sourcePath && targetPath && sourcePath !== targetPath) return `Şu an ${sourceLabel} ekranındasın; sorduğun yer ${targetLabel}.`;
  return '';
}

function screenKind(definition) {
  const path = normalizeText(definition?.path || '');
  if (path.endsWith('/map') || path.includes('/live')) return 'MAP';
  if (path.includes('/georeview')) return 'GEOREVIEW';
  if (path.includes('/shifts')) return 'SHIFTS';
  if (path.includes('/commercial-flow')) return 'COMMERCIAL';
  if (path.includes('/service-evaluation')) return 'SERVICE';
  if (path.includes('/copilot')) return 'COPILOT';
  if (['/company', '/organization', '/school', '/'].includes(path)) return 'PLANNING';
  return 'OTHER';
}

function selectedSignalText(screenContext) {
  const fields = selectedFieldRows(screenContext).slice(0, 6).map((row) => `${row.label}: ${row.value}`).join(' • ');
  const badges = selectedBadgeRows(screenContext).slice(0, 4).map((row) => `${row.label}: ${row.value}`).join(' • ');
  const evidence = Array.isArray(screenContext?.structuredFacts?.evidence) ? screenContext.structuredFacts.evidence.join(' • ') : '';
  return normalizeText([fields, badges, evidence].filter(Boolean).join(' • '));
}

function inferSelectedSignals(screenContext) {
  const facts = screenContext?.structuredFacts && typeof screenContext.structuredFacts === 'object' ? screenContext.structuredFacts : {};
  const text = selectedSignalText(screenContext);
  const stage = normalizeText(facts?.stage || '');
  const missing = Array.isArray(facts?.missing) ? facts.missing.map((x) => normalizeText(x)).join(' • ') : '';
  const blockers = Array.isArray(facts?.blockers) ? facts.blockers.map((x) => normalizeText(x)).join(' • ') : '';
  const all = `${text} • ${missing} • ${blockers} • ${stage}`;
  return {
    hasCoordProblem: /koordinat yok|adres yok|needs_review|failed|review|failed/.test(all),
    gpsWeak: /son gps eski|gps eski|offline|eta yok|sıradaki durak yok|siradaki durak yok|bağlı aktif vardiya görünmüyor|bagli aktif vardiya görünmüyor|bagli aktif vardiya gorunmuyor/.test(all),
    shiftWeak: /araç yok|arac yok|sürücü yok|surucu yok|durak yok|onaylı görünse de araç veya sürücü boş|onayli görünse de arac veya surucu bos/.test(all),
    marketStage: /market|open|countered/.test(all),
    pendingStage: /pending|bekleyen|accepted/.test(all),
    serviceStage: /active|done|tamam/.test(all),
  };
}

function extractMentionedScreenKind(message) {
  const text = normalizeText(message);
  if (!text) return '';
  if (/konum incele|konum sec|konum seç|georeview/.test(text)) return 'GEOREVIEW';
  if (/ticari akış|ticari akis|commercial/.test(text)) return 'COMMERCIAL';
  if (/hizmet değerlend|hizmet degerlend|service/.test(text)) return 'SERVICE';
  if (/vardiya/.test(text)) return 'SHIFTS';
  if (/harita|canlı harita|canli harita|map/.test(text)) return 'MAP';
  if (/planlama merkezi|rehberi başlat|rehberi baslat|plan akışı|plan akis|planlama/.test(text)) return 'PLANNING';
  if (/copilot/.test(text)) return 'COPILOT';
  return '';
}

function hasWeakCurrentCarry(sourceScreenContext, sourceScreenDefinition) {
  const facts = sourceScreenContext?.structuredFacts && typeof sourceScreenContext.structuredFacts === 'object' ? sourceScreenContext.structuredFacts : {};
  const sourceKind = screenKind(sourceScreenDefinition);
  if (sourceKind !== 'MAP') return false;
  const selectedLabel = firstNonEmpty(sourceScreenContext?.selectedLabel, '');
  const missing = Array.isArray(facts?.missing) ? facts.missing.map((x) => normalizeText(x)) : [];
  const blockers = Array.isArray(facts?.blockers) ? facts.blockers.map((x) => normalizeText(x)) : [];
  const totalStops = Number(facts?.totalStops ?? facts?.counters?.totalStops ?? 0);
  const hasSelectedVehicle = facts?.hasSelectedVehicle === true || Boolean(selectedLabel);
  const hasShift = facts?.hasShift === true;
  const noNext = facts?.nextReady === false || missing.includes('sıradaki durak yok') || missing.includes('siradaki durak yok');
  const noEta = facts?.etaReady === false || missing.includes('eta yok');
  const noVehicle = facts?.hasSelectedVehicle === false || missing.includes('seçili araç yok') || missing.includes('secili arac yok');
  const noShift = facts?.hasShift === false || blockers.some((x) => x.includes('bağlı aktif vardiya görünmüyor') || x.includes('bagli aktif vardiya gorunmuyor'));
  return noVehicle || (!hasSelectedVehicle && !hasShift) || (!hasShift && totalStops <= 0 && noNext && noEta) || noShift;
}

function weakCarryReply(sourceScreenDefinition, sourceScreenContext) {
  const facts = sourceScreenContext?.structuredFacts && typeof sourceScreenContext.structuredFacts === 'object' ? sourceScreenContext.structuredFacts : {};
  const sourceLabel = firstNonEmpty(sourceScreenDefinition?.label, 'bu ekran');
  const evidence = uniqueStrings([
    facts?.hasSelectedVehicle === false ? 'Seçili araç yok' : '',
    facts?.hasShift === false ? 'Shift yok' : '',
    facts?.nextReady === false ? 'Sıradaki durak yok' : '',
    facts?.etaReady === false ? 'ETA yok' : '',
    firstNonEmpty((Array.isArray(facts?.evidence) ? facts.evidence[1] : ''), ''),
  ]).filter(Boolean).slice(0, 4).join(' • ');
  return `${sourceLabel} ekranında önce geçerli kayıt oluşmalı. Şimdi ekran önermek erken. Önce marker'a tıklayıp aracı seç; üst kartta Shift, Son GPS ve Sıradaki durak dolu mu bak. ${evidence ? `Bunu şuradan anlıyorum: ${evidence}.` : ''}`.trim();
}

function scoreNextScreenCandidate({ candidate, targetScreenDefinition, sourceScreenDefinition, sourceScreenContext, genericFlow = false }) {
  const candidatePath = normalizeText(candidate?.path || '');
  const targetKind = screenKind(targetScreenDefinition);
  const sourceKind = screenKind(sourceScreenDefinition);
  const signals = genericFlow ? {
    hasCoordProblem: false,
    gpsWeak: false,
    shiftWeak: false,
    marketStage: false,
    pendingStage: false,
    serviceStage: false,
  } : inferSelectedSignals(sourceScreenContext);
  let score = 55;
  const reasons = [];

  if (candidatePath.includes('/shifts')) {
    score += 18;
    reasons.push('işin teklif, atama ve operasyon bağını en net burada okursun');
  }
  if (candidatePath.includes('/georeview')) {
    score += 8;
    reasons.push('konum veya koordinat sorunu varsa düzeltme ekranı burasıdır');
  }
  if (candidatePath.includes('/service-evaluation')) {
    score += 6;
    reasons.push('aktif veya biten hizmetin kalite tarafı burada okunur');
  }
  if (candidatePath === '/company' || candidatePath === '/organization' || candidatePath === '/school' || candidatePath === '/') {
    score += 7;
    reasons.push('yeni iş veya plan akışını kurma ekranıdır');
  }
  if (candidatePath.includes('/copilot')) {
    score -= 8;
    reasons.push('yardım ekranıdır; ana operasyon takibi için ilk tercih değildir');
  }

  if (signals.hasCoordProblem) {
    if (candidatePath.includes('/georeview')) score += 32;
    if (candidatePath.includes('/shifts')) score -= 8;
    if (candidatePath.includes('/service-evaluation')) score -= 14;
  }
  if (signals.gpsWeak) {
    if (candidatePath.includes('/shifts')) score += 24;
    if (candidatePath.includes('/georeview')) score -= 6;
  }
  if (signals.shiftWeak) {
    if (candidatePath.includes('/shifts')) score += 22;
    if (candidatePath.includes('/service-evaluation')) score -= 10;
  }
  if (signals.marketStage) {
    if (candidatePath.includes('/commercial-flow')) score += 18;
    if (candidatePath.includes('/shifts')) score += 6;
  }
  if (signals.pendingStage) {
    if (candidatePath.includes('/shifts')) score += 14;
  }
  if (signals.serviceStage) {
    if (candidatePath.includes('/service-evaluation')) score += 20;
    if (candidatePath.includes('/shifts')) score += 4;
  }

  if (targetKind === 'MAP') {
    if (candidatePath.includes('/shifts')) score += 18;
    if (candidatePath.includes('/copilot')) score -= 4;
  }
  if (targetKind === 'GEOREVIEW') {
    if (!genericFlow && sourceKind === 'PLANNING' && (candidatePath === '/company' || candidatePath === '/organization' || candidatePath === '/school' || candidatePath === '/')) score += 16;
    if (!genericFlow && (sourceKind === 'MAP' || sourceKind === 'SHIFTS')) {
      if (candidatePath.includes('/shifts')) score += 12;
      if (candidatePath === '/company' || candidatePath === '/organization' || candidatePath === '/school' || candidatePath === '/') score -= 4;
    }
  }
  if (targetKind === 'COMMERCIAL') {
    if (candidatePath.includes('/shifts')) score += 20;
    if (candidatePath === '/company' || candidatePath === '/organization' || candidatePath === '/school' || candidatePath === '/') score -= 10;
    if (candidatePath.includes('/commercial-flow')) score -= 16;
  }
  if (targetKind === 'PLANNING') {
    if (signals.hasCoordProblem && candidatePath.includes('/georeview')) score += 18;
    else if (signals.marketStage && candidatePath.includes('/commercial-flow')) score += 14;
    else if (signals.pendingStage && candidatePath.includes('/shifts')) score += 14;
    else if (candidatePath.includes('/shifts')) score += 10;
  }
  if (targetKind === 'SERVICE') {
    if (candidatePath.includes('/shifts')) score += 8;
    if (candidatePath.includes('/service-evaluation')) score += 8;
  }

  if (genericFlow) {
    if (targetKind === 'GEOREVIEW') {
      if (candidatePath === '/company' || candidatePath === '/organization' || candidatePath === '/school' || candidatePath === '/') score += 42;
      if (candidatePath.includes('/shifts')) score -= 6;
      if (candidatePath.includes('/hub')) score += 4;
    }
    if (targetKind === 'COMMERCIAL') {
      if (candidatePath.includes('/shifts')) score += 22;
      if (candidatePath.includes('/service-evaluation')) score += 10;
      if (candidatePath === '/company' || candidatePath === '/organization' || candidatePath === '/school' || candidatePath === '/') score += 2;
    }
    if (targetKind === 'PLANNING') {
      if (candidatePath.includes('/georeview')) score += 18;
      if (candidatePath.includes('/shifts')) score += 16;
    }
    if (targetKind === 'MAP') {
      if (candidatePath.includes('/shifts')) score += 18;
      if (candidatePath.includes('/copilot')) score -= 2;
    }
  }

  if (candidatePath === normalizeText(targetScreenDefinition?.path || '')) {
    score -= 28;
    reasons.push('soru sonraki ekranı soruyor; aynı ekranda kalmak ilk tercih değil');
  }

  const finalReasons = genericFlow
    ? uniqueStrings([firstNonEmpty(candidate?.reason, ''), ...reasons])
    : uniqueStrings(reasons);

  return {
    candidate,
    score: Math.max(18, Math.min(99, score)),
    reasons: finalReasons,
  };
}

function summarizeRejectedScreens(scoredRows, bestRow) {
  const rows = (Array.isArray(scoredRows) ? scoredRows : []).filter((row) => row && row !== bestRow).slice(0, 2);
  if (!rows.length) return '';
  return rows.map((row) => `${row.candidate.label} şimdi ilk tercih değil; ${firstNonEmpty(row.candidate.reason, row.reasons?.[0], 'öncelik daha düşük.')}`).join(' • ');
}

function buildTransferredFirstControls(targetScreenDefinition, sourceScreenDefinition, sourceScreenContext) {
  const carry = selectedCarrySummary(sourceScreenContext);
  if (!carry) return [];
  const targetKind = screenKind(targetScreenDefinition);
  const sourceKind = screenKind(sourceScreenDefinition);
  const signals = inferSelectedSignals(sourceScreenContext);
  if (targetKind === 'SHIFTS') {
    const rows = [
      'Önce aynı kaydın doğru vardiya satırını aç.',
      sourceKind === 'MAP' ? 'Haritadaki araç ile vardiyadaki araç aynı mı kontrol et.' : 'Seçili kaydın gerçekten aynı vardiya olduğuna bak.',
      'Durum rozetini araç ve sürücü alanıyla birlikte oku.',
      'Sonraki adım veya teklif katmanı açık mı kontrol et.',
    ];
    if (signals.gpsWeak) rows.splice(2, 0, 'Son GPS zayıfsa yalnız duruma güvenme; atama ve teklif katmanını da birlikte değerlendir.');
    if (signals.shiftWeak) rows[2] = 'Araç veya sürücü boş mu diye özellikle bak.';
    return rows;
  }
  if (targetKind === 'GEOREVIEW') {
    return [
      'Önce aynı kişi veya durağın seçildiğini doğrula.',
      'Durum rozeti ile koordinat alanını birlikte oku.',
      'Koordinat yoksa büyük harita veya adresten bul akışına geç.',
      'Kaydet ile OK Yap farkını karıştırma.',
    ];
  }
  if (targetKind === 'SERVICE') {
    return [
      'Önce aynı hizmet satırını aç.',
      'Durum ve değerlendirme rozetini birlikte oku.',
      'Sonraki adım alanı vardiyaya mı sözleşmeye mi dönmen gerektiğini söylüyor mu bak.',
    ];
  }
  if (targetKind === 'MAP') {
    return [
      'Önce doğru aracı veya vardiyayı seç.',
      'Son GPS, sıradaki durak ve ETA birlikte tutarlı mı bak.',
      'Canlılık zayıfsa aynı kaydı Vardiyalar ekranında da kontrol et.',
    ];
  }
  return [];
}

function composeBridgedFirstControlReply({ targetScreenDefinition, sourceScreenDefinition, sourceScreenContext, guide }) {
  const rows = buildTransferredFirstControls(targetScreenDefinition, sourceScreenDefinition, sourceScreenContext);
  if (!rows.length) return '';
  const lead = composeTargetScreenLead({ sourceScreenDefinition, targetScreenDefinition, sourceScreenContext });
  const stuck = firstNonEmpty(stuckChecks(targetScreenDefinition, guide, 2)[0], '');
  return `${lead ? `${lead} ` : ''}${bulletJoin(rows.slice(0, 4), 'İlk kontrol sırası: ')} ${stuck ? `Takılırsan bak: ${stuck}.` : ''}`.trim();
}

function composeDirectRouteReply({ screenDefinition, sourceScreenDefinition, sourceScreenContext, guide }) {
  const lead = composeTargetScreenLead({ sourceScreenDefinition, targetScreenDefinition: screenDefinition, sourceScreenContext });
  const rawFirst = buildTransferredFirstControls(screenDefinition, sourceScreenDefinition, sourceScreenContext)[0]
    || firstControls(screenDefinition, guide)[0]
    || screenDefinition?.firstStep
    || 'Önce doğru kaydı aç.';
  const first = String(rawFirst || '').replace(/^önce\s+/i, '');
  return [
    lead,
    `Doğrudan hedef ekran: ${screenDefinition?.label || 'İlgili ekran'}.`,
    `Şimdi yap: ${screenDefinition?.label || 'İlgili ekran'} ekranını aç. İçeri girince ilk bak: ${first.charAt(0).toLowerCase()}${first.slice(1)}`,
  ].filter(Boolean).join(' ');
}

function pickBestNextScreenCandidate({ message, screenDefinition, sourceScreenDefinition, sourceScreenContext }) {
  const explicitTargetKind = extractMentionedScreenKind(message);
  const recordScoped = isRecordScopedQuestion(message);
  const genericFlow = Boolean(explicitTargetKind) && isGenericFlowQuestion(message) && !recordScoped;
  const weakCarry = hasWeakCurrentCarry(sourceScreenContext, sourceScreenDefinition);
  const effectiveSourceContext = genericFlow ? null : (weakCarry && explicitTargetKind ? null : sourceScreenContext);
  const rows = nextScreens(screenDefinition, 5);
  const scored = rows
    .map((candidate) => scoreNextScreenCandidate({ candidate, targetScreenDefinition: screenDefinition, sourceScreenDefinition, sourceScreenContext: effectiveSourceContext, genericFlow, recordScoped }))
    .sort((a, b) => b.score - a.score);
  return { explicitTargetKind, recordScoped, genericFlow, weakCarry, effectiveSourceContext, scored, best: scored[0] || null };
}

function buildBestNextScreenReply({ message, screenDefinition, sourceScreenDefinition, sourceScreenContext, guide = null }) {
  const { explicitTargetKind, recordScoped, genericFlow, weakCarry, effectiveSourceContext, scored, best } = pickBestNextScreenCandidate({ message, screenDefinition, sourceScreenDefinition, sourceScreenContext });
  if (weakCarry && !explicitTargetKind) return weakCarryReply(sourceScreenDefinition, sourceScreenContext);
  if (explicitTargetKind && isDirectRouteRequest(message) && !genericFlow) {
    return composeDirectRouteReply({ screenDefinition, sourceScreenDefinition, sourceScreenContext, guide });
  }
  const lead = nextScreenLead({ sourceScreenDefinition, targetScreenDefinition: screenDefinition });
  if (!scored.length) return `${lead ? `${lead} ` : ''}${firstNonEmpty(screenDefinition?.nextStep, screenDefinition?.menuPurpose, 'Önce ilgili alt ekrana geç.')}`.trim();
  if (!best) return `${lead ? `${lead} ` : ''}${formatNextScreensReply(screenDefinition)}`.trim();
  const selectedHint = recordScoped ? selectedCarrySummary(effectiveSourceContext) : '';
  const why = uniqueStrings([firstNonEmpty(best.candidate.reason, ''), ...(Array.isArray(best.reasons) ? best.reasons : [])]).slice(0, 2).join(' • ');
  const rejected = summarizeRejectedScreens(scored, best);
  let now = firstNonEmpty(best.candidate.reason, screenDefinition?.nextStep, 'Önce bu ekrana geç.');
  if (normalizeText(best.candidate.label).includes('vardiya')) now = 'Önce ilgili vardiyayı aç. Sonra durum, atama ve sonraki adım alanlarını birlikte oku.';
  if (normalizeText(best.candidate.label).includes('konum')) now = 'Önce koordinat veya adres sorunu olan kaydı aç. Sonra büyük harita veya kaydet akışıyla düzelt.';
  if (normalizeText(best.candidate.label).includes('planlama') || normalizeText(best.candidate.label).includes('merkez')) now = 'Önce plan akışını veya rehberi başlat. Sonra kapsam, tarih ve çözüm adımlarını tamamla.';
  if (normalizeText(best.candidate.label).includes('hizmet')) now = 'Önce hizmet satırını aç. Sonra durum ve değerlendirme alanını birlikte oku.';
  const title = genericFlow ? 'Genel akışta tek en doğru sonraki ekran' : 'Bu kayıt için tek en doğru sonraki ekran';
  return [
    lead,
    selectedHint ? `Mevcut seçili kayıt özeti: ${selectedHint}.` : '',
    `${title}: ${best.candidate.label}. Puan: ${best.score}/100.`,
    why ? `Sebep: ${why}.` : '',
    `Şimdi yap: ${now}`,
    rejected ? `Diğerleri neden değil: ${rejected}.` : '',
  ].filter(Boolean).join(' ');
}

function formatChecklistReply(screenDefinition, guide) {
  const checks = uniqueStrings([...(firstControls(screenDefinition, guide) || []), ...(dataRules(screenDefinition, guide, 3) || []), ...((Array.isArray(screenDefinition?.doneChecklist) ? screenDefinition.doneChecklist : []).slice(0, 4))]).slice(0, 7);
  return bulletJoin(checks, 'Kontrol listesi: ');
}

function formatMistakesReply(screenDefinition, guide) {
  const mistakes = uniqueStrings([...(Array.isArray(screenDefinition?.commonMistakes) ? screenDefinition.commonMistakes : []), ...(Array.isArray(guide?.commonMistakes) ? guide.commonMistakes : [])]).slice(0, 4);
  return bulletJoin(mistakes, 'Sık hata: ');
}

function composeSimpleScreenReply({ questionType, guide, message, screenDefinition, screenContext }) {
  const purpose = firstNonEmpty(guide?.plainSummary, screenDefinition?.menuPurpose, guide?.summary, 'Bu ekran yardım için kullanılır.');
  const now = simpleNowText(guide, screenDefinition);
  const next = simpleNextText(guide, screenDefinition);
  const menus = simpleMenuList(screenDefinition, 2);
  const buttons = pickButtons(guide?.buttonGuides || screenDefinition?.buttonGuides, 2);
  const controls = firstControls(screenDefinition, guide).slice(0, 3);
  const mistakes = (Array.isArray(screenDefinition?.commonMistakes) ? screenDefinition.commonMistakes : []).slice(0, 2);
  const nextPlaces = nextScreens(screenDefinition, 2).map((x) => x?.label).filter(Boolean);

  if (questionType === 'CHECKLIST_HELP') {
    return `${controls.length ? `Önce şunları kontrol et: ${controls.join(' • ')}.` : `Önce: ${now}`} ${screenDefinition?.doneChecklist?.[0] ? `Bitti saymak için: ${screenDefinition.doneChecklist[0]}` : ''}`.trim();
  }

  if (questionType === 'COMMON_MISTAKE_HELP') {
    return `${mistakes.length ? `Sık hata: ${mistakes.join(' • ')}.` : purpose} Şimdi: ${now}`.trim();
  }

  if (questionType === 'NEXT_SCREEN') {
    return `${nextPlaces.length ? `Sonraki yerler: ${nextPlaces.join(', ')}.` : purpose} Şimdi: ${now}${next ? ` Sonra: ${next}` : ''}`.trim();
  }

  if (questionType === 'FIRST_CONTROL') {
    return `${controls.length ? `İlk kontrol: ${controls.join(' • ')}.` : `İlk kontrol: ${now}`} ${next ? `Sonra: ${next}` : ''}`.trim();
  }

  if (questionType === 'DETAIL_FLOW') {
    return `${purpose} ${formatWorkflowReply(screenDefinition, guide) || `Şimdi: ${now}`}`.trim();
  }

  if (questionType === 'ROLE_HELP') {
    return `${purpose} ${menus.length ? `En çok işine yarayacak yerler: ${menus.join(', ')}.` : ''} Şimdi: ${now}`.trim();
  }

  if (questionType === 'ROW_HELP') {
    const rowReply = selectedRowReadReply(screenContext, screenDefinition);
    return `${rowReply || purpose} Şimdi: ${now}`.trim();
  }

  if (questionType === 'MISSING_DATA_HELP') {
    const missingReply = selectedMissingReply(screenContext, screenDefinition);
    return `${missingReply || purpose} Şimdi: ${now}`.trim();
  }

  if (questionType === 'FIELD_HELP' || questionType === 'BADGE_HELP' || questionType === 'TERM_HELP') {
    const comparison = termComparisonReplyV2(message) || termComparisonReply(message);
    if (comparison) return comparison;
    const selectedTerm = questionType === 'BADGE_HELP' ? selectedBadgeReply(message, screenContext, screenDefinition) : questionType === 'FIELD_HELP' ? selectedFieldReply(message, screenContext, screenDefinition) : selectedTermReply(message, screenContext, screenDefinition);
    if (selectedTerm) return `${selectedTerm} Şimdi: ${now}`.trim();
    const knownTerms = explainTermsFromText(message, 2);
    const screenTerms = pickTerms(guide?.simpleTerms || screenDefinition?.simpleTerms, 2);
    const terms = uniqueStrings([...(knownTerms || []), ...(screenTerms || [])]).slice(0, 2);
    return `${terms.length ? `${terms.join(' • ')}.` : purpose} Şimdi: ${now}`.trim();
  }

  if (questionType === 'BUTTON_HELP') {
    return `${buttons.length ? `Öne çıkanlar: ${buttons.join(' • ')}.` : purpose} Şimdi: ${now}`.trim();
  }

  if (questionType === 'WHY_BLOCKED') {
    return `Bir şey ilerlemiyorsa önce doğru kayıt veya gerekli bilgi seçilir. Şimdi: ${now}`;
  }

  if (questionType === 'GO_TO') {
    return `Şimdi: ${now} Aşağıdaki düğmelerden uygun olana bas.`;
  }

  if (questionType === 'NEXT_STEP') {
    return `Şimdi: ${now}${next ? ` Sonra: ${next}` : ''}`.trim();
  }

  if (questionType === 'SCREEN_PURPOSE' || questionType === 'OPEN') {
    return `${purpose} Şimdi: ${now}${menus[0] ? ` Gerekirse ${menus[0]} kısmına geç.` : ''}`.trim();
  }

  return `${purpose} Şimdi: ${now}`.trim();
}

function limitItemsForRoleMode(items, roleMode, limitSimple = 3, limitDefault = 5) {
  const list = Array.isArray(items) ? items : [];
  return roleMode === 'SIMPLE' ? list.slice(0, limitSimple) : list.slice(0, limitDefault);
}

function actionPlanLabelForRoleMode(roleMode, entityType) {
  if (roleMode === 'SIMPLE') return 'Buradan devam et';
  return entityType === 'screen' ? 'İlgili yere git' : 'Önerilen açılabilir adımlar';
}

function contextSummaryForRoleMode(roleMode, screenDefinition, entityLabel, scope, entityType) {
  if (roleMode === 'SIMPLE') {
    return entityType === 'screen' ? `Ekran: ${screenDefinition?.label || '-'}` : firstNonEmpty(entityLabel, screenDefinition?.label, scope?.summary, '');
  }
  return [
    screenDefinition?.label ? `Ekran: ${screenDefinition.label}` : null,
    entityLabel ? `Bağlam: ${entityLabel}` : null,
    scope?.summary || null,
  ].filter(Boolean).join(' • ');
}

function screenMenuActions(screenDefinition) {
  return (Array.isArray(screenDefinition?.screenMenus) ? screenDefinition.screenMenus : []).map((item) => makeQuickAction(item.label, item.path, item.purpose));
}


function findMenu(screenDefinition, labels = [], paths = []) {
  const rows = Array.isArray(screenDefinition?.screenMenus) ? screenDefinition.screenMenus : [];
  return rows.find((item) => {
    const label = normalizeText(item?.label || '');
    const path = normalizeText(item?.path || '');
    return labels.some((x) => label.includes(normalizeText(x))) || paths.some((x) => path.includes(normalizeText(x)));
  }) || null;
}

function currentScreenAction(screenDefinition, context, reason = '') {
  if (!screenDefinition?.path) return null;
  const routeParams = {};
  if (context?.type === 'shift' && context?.id) routeParams.focusShiftId = Number(context.id);
  if (context?.type === 'vehicle' && context?.id) routeParams.focusVehicleId = Number(context.id);
  return makeQuickAction(`${screenDefinition?.label || 'Bu ekran'} ekranını aç`, screenDefinition.path, reason || 'Aynı bağlamı açık ekranda sürdürür.', { routeParams, accent: 'primary' });
}

function menuAction(menu, context, reason = '', extras = {}) {
  if (!menu?.path) return null;
  const routeParams = { ...(extras?.routeParams && typeof extras.routeParams === 'object' ? extras.routeParams : {}) };
  if (context?.type === 'shift' && context?.id && !routeParams.focusShiftId) routeParams.focusShiftId = Number(context.id);
  if (context?.type === 'vehicle' && context?.id && !routeParams.focusVehicleId) routeParams.focusVehicleId = Number(context.id);
  return makeQuickAction(menu.label || 'Buradan aç', menu.path, reason || menu.purpose || '', { routeParams, accent: extras?.accent || 'neutral' });
}

function entityActionPlan({ entityType, context, screenDefinition, roleMode, questionType, reply }) {
  const rows = [];
  if (entityType === 'shift') {
    const offersMenu = findMenu(screenDefinition, ['teklif', 'offer'], ['/offers']);
    const vehiclesMenu = findMenu(screenDefinition, ['araç', 'vehicle'], ['/vehicles']);
    const driversMenu = findMenu(screenDefinition, ['sürücü', 'driver'], ['/drivers']);
    const agreementsMenu = findMenu(screenDefinition, ['sözleşme', 'agreement'], ['/agreements']);
    rows.push(currentScreenAction(screenDefinition, context, 'Aynı konuşmayı seçili vardiya ile ekranda sürdürür.'));
    if (Number(context?.openOfferCount || 0) > 0 || ['GO_TO', 'WHY_BLOCKED'].includes(questionType)) rows.push(menuAction(offersMenu, context, 'Teklif kararını kapatmak için ilgili listeyi açar.', { accent: 'primary' }));
    if (!context?.vehicleId || questionType === 'NEXT_STEP') rows.push(menuAction(vehiclesMenu, context, 'Araç atamasını veya araç durumunu kontrol etmek için açılır.', { routeParams: context?.vehicleId ? { focusVehicleId: Number(context.vehicleId) } : {}, accent: 'primary' }));
    if (!context?.driverId || questionType === 'NEXT_STEP') rows.push(menuAction(driversMenu, context, 'Sürücü bağını netleştirmek için açılır.', { accent: 'warning' }));
    if (String(context?.agreementId || '') || questionType === 'GO_TO') rows.push(menuAction(agreementsMenu, context, 'Sözleşmeye bağlı akışı kontrol etmek için açılır.'));
    rows.push(makeGuideAction('Atamaya hazır mı rehberini aç', { jobType: 'ASSIGNMENT_READINESS_GUIDE', guideLevel: 'STEP_BY_STEP' }, 'Bu kayıt için eksikleri adım adım sıralar.'));
    rows.push(makeAskAction('Bunu sor: Bu kayıt ne durumda?', 'bu kayıt ne durumda', 'Aynı kayıt için hızlı takip sorusunu tekrar gönderir.'));
    rows.push(makeCopyAction('Kısa özet kopyala', reply, 'Son konuşma cevabını kopyalar.'));
  } else if (entityType === 'vehicle') {
    const vehiclesMenu = findMenu(screenDefinition, ['araç', 'vehicle'], ['/vehicles']);
    const mapMenu = findMenu(screenDefinition, ['canlı', 'harita', 'map'], ['/map', '/live']);
    const driversMenu = findMenu(screenDefinition, ['sürücü', 'driver'], ['/drivers']);
    rows.push(currentScreenAction(screenDefinition, context, 'Aynı aracı açık ekranda incelemek için açılır.'));
    rows.push(menuAction(vehiclesMenu, context, 'Araç detayına dönmek için açılır.', { accent: 'primary' }));
    if (!Number(context?.activeDeviceCount || 0) || ['GO_TO', 'WHY_BLOCKED', 'LOCATION_HELP'].includes(questionType)) rows.push(menuAction(mapMenu, context, 'Canlı konum tarafını tekrar görmek için açılır.', { accent: 'primary' }));
    if (!context?.driver?.id) rows.push(menuAction(driversMenu, context, 'Sürücü bağını netleştirmek için açılır.', { accent: 'warning' }));
    rows.push(makeGuideAction('Konum kaynağı rehberini aç', { jobType: 'LOCATION_SOURCE_GUIDE', guideLevel: 'SHORT' }, 'Telefon GPS\'i ve cihaz GPS\'i farkını açar.'));
    rows.push(makeGuideAction('GPS teşhis rehberini aç', { jobType: 'GPS_SIGNAL_DIAGNOSIS_GUIDE', guideLevel: 'WHY' }, 'Konum neden görünmüyor sorusuna odaklanır.'));
    rows.push(makeAskAction('Bunu sor: Konum neden görünmüyor?', 'konum neden görünmüyor', 'Aynı kayıt için hızlı teşhis sorusu gönderir.'));
    rows.push(makeCopyAction('Kısa özet kopyala', reply, 'Son konuşma cevabını kopyalar.'));
  } else {
    const menus = Array.isArray(screenDefinition?.screenMenus) ? screenDefinition.screenMenus : [];
    rows.push(currentScreenAction(screenDefinition, context, roleMode === 'SIMPLE' ? 'Bu ekrana dönersin.' : 'Bu ekranı tekrar açar.'));
    for (const menu of menus.slice(0, roleMode === 'SIMPLE' ? 1 : 3)) rows.push(menuAction(menu, context, menu.purpose || 'İlgili menüye götürür.', { accent: roleMode === 'SIMPLE' && rows.length <= 1 ? 'primary' : 'neutral' }));
    if (roleMode === 'SIMPLE') {
      rows.push(makeAskAction('Bunu sor: Şimdi ne yapayım?', 'şimdi ne yapayım', 'Daha kısa yönlendirme alırsın.'));
    } else {
      rows.push(makeGuideAction('Ekran rehberini aç', { jobType: 'SCREEN_MENU_GUIDE', guideLevel: 'SHORT' }, 'Ekranın amacını kısa anlatır.'));
      rows.push(makeGuideAction('Buton rehberini aç', { jobType: 'BUTTON_ACTION_GUIDE', guideLevel: 'WHY' }, 'Butonların ne yaptığını sade dille açıklar.'));
      rows.push(makeCopyAction('Kısa özet kopyala', reply, 'Son konuşma cevabını kopyalar.'));
    }
  }
  return rows.filter(Boolean);
}

function nextPromptByEntity(entityType, roleMode) {
  if (entityType === 'shift') return roleMode === 'SIMPLE' ? 'İstersen bir sonraki adımı yine kısa söyleyeyim.' : 'İstersen şimdi hangi ekrana gitmen gerektiğini tek tek açayım.';
  if (entityType === 'vehicle') return roleMode === 'SIMPLE' ? 'İstersen konum tarafını daha kısa söyleyeyim.' : 'İstersen seni araç, canlı ekran veya rehbere yönlendireyim.';
  return roleMode === 'SIMPLE' ? 'Takıldığın sözü veya düğmeyi yaz.' : 'İstersen ilgili menüyü veya rehberi aşağıdan aç.';
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


function shiftReadinessReply(context) {
  const blockers = shiftBlockers(context);
  const ready = blockers.length === 0 && Number(context?.openOfferCount || 0) === 0 && Boolean(context?.vehicleId) && Boolean(context?.driverId);
  const score = ready ? 92 : blockers.length ? 46 : 72;
  const label = ready ? 'hazır' : blockers.length ? 'hazır değil' : 'kontrollü ilerlemeli';
  return `${shiftStatusText(context)} Bu kayıt şu an ${label} (${score}/100). ${blockers[0] ? `Ana blokaj: ${blockers[0]}` : 'Kritik eksik görünmüyor.'} Şimdi yap: ${shiftNextStep(context)}`.trim();
}

function shiftMissingDataReply(context) {
  const blockers = shiftBlockers(context);
  if (!blockers.length) return `${shiftStatusText(context)} Belirgin eksik görünmüyor. Şimdi yap: ${shiftNextStep(context)}`.trim();
  const more = blockers.slice(1, 3);
  return `Ana blokaj: ${blockers[0]} ${more.length ? `Diğer dikkatler: ${more.join(' • ')}` : ''} Şimdi yap: ${shiftNextStep(context)}`.trim();
}

function composeReply({ questionType, replyMode, guide, message, context, entityType, screenDefinition, roleMode, screenContext, conversationState, sourceScreenDefinition, sourceScreenContext, preferEntityContext = false }) {
  const hasScreenContext = !preferEntityContext && (entityType === 'screen' || Boolean(screenContext?.path || screenDefinition?.path));
  const analysis = hasScreenContext ? analyzeScreenState({ screenContext, screenDefinition, conversationState }) : null;
  const selectedRecordDiagnosticReply = composeSelectedRecordDiagnosticReply({ questionType, message, screenDefinition, screenContext, sourceScreenDefinition, sourceScreenContext, conversationState });
  if (selectedRecordDiagnosticReply) return toReply(selectedRecordDiagnosticReply);
  {
    const selectedDiagnosticPath = selectedDiagnosticSurfacePath(screenDefinition, screenContext, sourceScreenDefinition, sourceScreenContext);
    const selectedDiagnosticText = normalizeText(message);
    const selectedNextActionMatch = /(sıradaki doğru işlem|siradaki dogru islem|sıradaki işlem|siradaki islem|sonraki doğru işlem|sonraki dogru islem|ilk neye bakayım|ilk neye bakayim|şimdi ne yapayım|simdi ne yapayim|şimdi ne yapmalıyım|simdi ne yapmaliyim|hangi ekrana gitmeliyim|nereye geçmeliyim|nereye gitmeliyim)/.test(selectedDiagnosticText);
    const selectedSurfaceOk = selectedDiagnosticPath === '/superadmin' || selectedDiagnosticPath.startsWith('/superadmin/operations') || selectedDiagnosticPath.startsWith('/superadmin/commercial-core') || selectedDiagnosticPath.startsWith('/superadmin/trust-quality') || selectedDiagnosticPath.startsWith('/superadmin/operation-verification');
    const selectedHasContext = hasSelectedDiagnosticContext(screenContext) || hasSelectedDiagnosticContext(sourceScreenContext);
    if (selectedSurfaceOk && selectedHasContext && selectedNextActionMatch) {
      const currentContext = hasSelectedDiagnosticContext(screenContext) ? screenContext : sourceScreenContext;
      const fallbackContext = currentContext === screenContext ? sourceScreenContext : screenContext;
      const currentScreenDefinition = currentContext === screenContext ? screenDefinition : sourceScreenDefinition;
      const fallbackScreenDefinition = fallbackContext === sourceScreenContext ? sourceScreenDefinition : screenDefinition;
      const summary = firstNonEmpty(selectedCarrySummary(currentContext), selectedCarrySummary(fallbackContext), '');
      const rowReply = sanitizeDiagnosticSupportText(firstNonEmpty(selectedRowReadReply(currentContext, currentScreenDefinition), selectedRowReadReply(fallbackContext, fallbackScreenDefinition), ''));
      const why = uniqueStrings([
        summary ? `Seçili kayıt: ${summary}` : '',
        rowReply,
      ]).slice(0, 2).join(' • ') || 'Bu ekrandaki veriye göre net blokaj görünmüyor.';
      return toReply(`Bu ekrandaki veriye göre sıradaki doğru işlem önce seçili kaydı netleştirmek. Neden? ${why} İlk kontrol: Seçili kayıt özeti ve durum satırı.`);
    }
  }
  const opsQualityPaymentReply = composeOpsQualityPaymentGuideReply({ questionType, message, screenDefinition, screenContext, sourceScreenDefinition, sourceScreenContext });
  if (opsQualityPaymentReply) return toReply(opsQualityPaymentReply);
  if (roleMode === 'SIMPLE' && hasScreenContext && !['LOCATION_HELP', 'NEXT_SCREEN', 'FIRST_CONTROL', 'SCREEN_PURPOSE', 'ROW_HELP', 'MISSING_DATA_HELP', 'READINESS_CHECK', 'SAFE_NEXT_STEP', 'WHY_BLOCKED'].includes(questionType)) {
    return toReply(composeSimpleScreenReply({ questionType, guide, message, screenDefinition, screenContext }));
  }
  if (questionType === 'OPEN') {
    return toReply(openingReply({ entityType, context, guide, screenDefinition, roleMode }));
  }
  if (questionType === 'SCREEN_PURPOSE') {
    return toReply(composeScreenPurposeWithCarry({ guide, screenDefinition, sourceScreenDefinition, sourceScreenContext }));
  }
  if (questionType === 'ROLE_HELP') {
    return toReply(roleHelpReply({ guide, screenDefinition, roleMode }));
  }
  if (questionType === 'CHECKLIST_HELP') {
    return toReply(`${formatChecklistReply(screenDefinition, guide) || `Önce: ${simpleNowText(guide, screenDefinition)}`} ${guide.whatToDoNext ? `Sonra: ${guide.whatToDoNext}` : ''}`.trim());
  }
  if (questionType === 'COMMON_MISTAKE_HELP') {
    return toReply(`${formatMistakesReply(screenDefinition, guide) || firstNonEmpty(guide.screenExplanation, screenDefinition?.menuPurpose, guide.plainSummary)} ${guide.doNotDo ? `Kaçın: ${guide.doNotDo}` : screenDefinition?.doNotDo ? `Kaçın: ${screenDefinition.doNotDo}` : ''}`.trim());
  }
  if (questionType === 'FIRST_CONTROL') {
    const bridged = composeBridgedFirstControlReply({ targetScreenDefinition: screenDefinition, sourceScreenDefinition, sourceScreenContext, guide });
    if (bridged) return toReply(bridged);
    const checks = firstControls(screenDefinition, guide);
    const lead = composeTargetScreenLead({ sourceScreenDefinition, targetScreenDefinition: screenDefinition, sourceScreenContext });
    return toReply(`${lead ? `${lead} ` : ''}${checks.length ? bulletJoin(checks.slice(0, 4), 'İlk kontrol sırası: ') : `Önce: ${simpleNowText(guide, screenDefinition)}`} ${stuckChecks(screenDefinition, guide, 2)[0] ? `Takılırsan bak: ${stuckChecks(screenDefinition, guide, 2)[0]}` : ''}`.trim());
  }
  if (questionType === 'NEXT_SCREEN') {
    const hitNext = findNextScreenByMessage(message, screenDefinition);
    if (hitNext && normalizeText(message).includes(normalizeText(hitNext.label || ''))) {
      const weakCarry = hasWeakCurrentCarry(sourceScreenContext, sourceScreenDefinition);
      if (weakCarry && !extractMentionedScreenKind(message)) return toReply(weakCarryReply(sourceScreenDefinition, sourceScreenContext));
      const lead = nextScreenLead({ sourceScreenDefinition, targetScreenDefinition: screenDefinition });
      return toReply(`${lead ? `${lead} ` : ''}${hitNext.label} ekranına geç. Sebep: ${hitNext.reason || 'Bir sonraki doğru adım bu ekranda.'}`.trim());
    }
    return toReply(buildBestNextScreenReply({ message, screenDefinition, sourceScreenDefinition, sourceScreenContext }));
  }
  if (questionType === 'DETAIL_FLOW') {
    return toReply(`${firstNonEmpty(guide.plainSummary, screenDefinition?.menuPurpose, guide.summary)} ${formatWorkflowReply(screenDefinition, guide)}`.trim());
  }
  if (questionType === 'ROW_HELP') {
    const rowReply = selectedRowReadReply(screenContext, screenDefinition);
    if (rowReply) return toReply(rowReply);
    return toReply(`${firstNonEmpty(guide.plainSummary, screenDefinition?.menuPurpose, guide.summary)} Önce listeden veya tablodan bir kayıt seç.`);
  }
  if (entityType === 'screen' && isShiftTrackingScreen(screenDefinition) && !['shift', 'vehicle'].includes(String(screenContext?.selectedEntityType || '').trim())) {
    if (questionType === 'READINESS_CHECK' || questionType === 'MISSING_DATA_HELP' || questionType === 'STATUS_HELP' || questionType === 'SAFE_NEXT_STEP' || questionType === 'WHY_BLOCKED') {
      return toReply(shiftScreenNoSelectionReply(questionType, screenDefinition));
    }
  }
  if (questionType === 'MISSING_DATA_HELP') {
    const missingReply = selectedMissingReply(screenContext, screenDefinition);
    if (missingReply) return toReply(missingReply);
    if (analysis) return toReply(analyzerReply(analysis, 'MISSING'));
    return toReply(`${firstNonEmpty(guide.plainSummary, screenDefinition?.menuPurpose, guide.summary)} Önce seçili kaydın boş alanlarını kontrol et.`);
  }
  if (questionType === 'SHORT_SUMMARY') {
    if (analysis) return toReply(analyzerReply(analysis, 'SHORT'));
    return toReply(`${firstNonEmpty(guide.plainSummary, screenDefinition?.menuPurpose, guide.summary)} ${guide.whatToDoNow ? `Şimdi yap: ${guide.whatToDoNow}` : ''}`.trim());
  }

if (questionType === 'EVIDENCE_HELP') {
  const uiEvidence = uiSurfaceEvidence(screenContext);
  if (analysis) return toReply(`${analyzerReply(analysis, 'EVIDENCE')} ${uiEvidence}`.trim());
  return toReply(uiEvidence || 'Bu yorum seçili alan, rozet ve ekrandaki görünen ipuçlarına dayanır.');
}
if (questionType === 'MISSING_DATA_HELP' && entityType === 'shift') {
  return toReply(shiftMissingDataReply(context));
}
if (questionType === 'MISSING_DATA_HELP' && entityType === 'vehicle') {
  return toReply(vehicleMissingDataReply(context));
}
if (questionType === 'READINESS_CHECK' && entityType === 'shift') {
  return toReply(shiftReadinessReply(context));
}
if (questionType === 'READINESS_CHECK' && entityType === 'vehicle') {
  return toReply(vehicleReadinessReply(context));
}
if (questionType === 'SAFE_NEXT_STEP' && entityType === 'shift') {
  return toReply(`En risksiz adım: ${shiftNextStep(context)}`.trim());
}
if (questionType === 'SAFE_NEXT_STEP' && entityType === 'vehicle') {
  return toReply(`En risksiz adım: ${vehicleNextStep(context)}`.trim());
}
if (questionType === 'WHY_BLOCKED' && entityType === 'shift') {
  const blockers = shiftBlockers(context);
  return toReply(blockers[0] ? `Ana blokaj: ${blockers[0]} Şimdi yap: ${shiftNextStep(context)}` : 'Belirgin blokaj görünmüyor.');
}
if (questionType === 'WHY_BLOCKED' && entityType === 'vehicle') {
  const blockers = vehicleBlockers(context);
  return toReply(blockers[0] ? `Ana blokaj: ${blockers[0]} Şimdi yap: ${vehicleNextStep(context)}` : 'Belirgin blokaj görünmüyor.');
}
if (questionType === 'READINESS_CHECK') {
    if (entityType === 'shift') return toReply(analyzerReply(analysis, 'READINESS'));
    const missingReply = selectedMissingReply(screenContext, screenDefinition);
    if (missingReply) return toReply(`${missingReply} Hazır saymak için önce bu eksik veya blokajları kapat.`.trim());
    if (analysis) return toReply(analyzerReply(analysis, 'READINESS'));
    return toReply('Hazır olup olmadığını anlamak için önce seçili kaydın eksik alanlarını ve durumunu birlikte kontrol et.');
  }
  if (questionType === 'SAFE_NEXT_STEP') {
    if (analysis) return toReply(analyzerReply(analysis, 'SAFE_NEXT'));
    return toReply('En risksiz sonraki adım, önce seçili kaydı ve boş alanları doğrulamaktır.');
  }
  if (questionType === 'WHAT_CHANGED') {
    if (analysis) return toReply(analyzerReply(analysis, 'CHANGED'));
    return toReply('Ne değiştiğini görmek için aynı kaydın durum, rozet ve sonraki adım alanlarını önceki haliyle karşılaştır.');
  }
  if (questionType === 'COMPARE_ITEMS') {
    if (analysis?.compareHint) return toReply(analyzerReply(analysis, 'COMPARE'));
    const comparison = termComparisonReplyV2(message) || termComparisonReply(message);
    if (comparison) return toReply(comparison);
    return toReply('İki buton veya alanın farkını anlamak için önce hangisinin kaydettiğini, hangisinin sadece yönlendirdiğini ayır.');
  }
  if (questionType === 'STATUS_HELP' && entityType === 'shift') {
    return toReply(`${shiftStatusText(context)} ${shiftBlockers(context)[0] ? `Eksik taraf: ${shiftBlockers(context)[0]}` : 'Kritik eksik görünmüyor.'}`);
  }
  if (questionType === 'STATUS_HELP' && entityType === 'vehicle') {
    return toReply(`${vehicleSourceText(context)} ${vehicleBlockers(context)[0] ? `Dikkat isteyen konu: ${vehicleBlockers(context)[0]}` : ''}`);
  }
  if (questionType === 'STATUS_HELP') {
    const rowReply = selectedRowReadReply(screenContext, screenDefinition);
    if (rowReply) return toReply(rowReply);
  }
  if (questionType === 'BUTTON_HELP') {
    const uiDisabled = disabledButtonReply(message, screenContext, analysis);
    if (uiDisabled) return toReply(uiDisabled);
    const uiVisible = visibleButtonReply(message, screenContext, analysis);
    const hitButton = findButtonGuideByMessage(message, guide, screenDefinition);
    const hitStage = findWorkflowStageByMessage(message, guide, screenDefinition);
    const rules = dataRules(screenDefinition, guide, 2);
    if (hitButton && normalizeText(message).includes(normalizeText(hitButton.label || ''))) {
      return toReply(`${hitButton.label}: ${firstNonEmpty(hitButton.purpose, '')} ${hitButton.whenToUse ? `Ne zaman: ${hitButton.whenToUse}` : ''} ${hitButton.whatHappens ? `Sonuç: ${hitButton.whatHappens}` : ''} ${hitButton.disabledReason ? `Kapalıysa olası sebep: ${hitButton.disabledReason}` : ''} ${hitButton.riskNote ? `Dikkat: ${hitButton.riskNote}` : ''} ${rules[0] ? `İlgili veri kuralı: ${rules[0]}` : ''}`.trim());
    }
    if (uiVisible) return toReply(`${uiVisible} ${uiSurfaceEvidence(screenContext)}`.trim());
    if (hitStage) {
      return toReply(`${firstNonEmpty(hitStage.title, 'Bu adım')} için yapman gereken: ${firstNonEmpty(hitStage.action, '')} ${hitStage.doneWhen ? `Tamam say: ${hitStage.doneWhen}` : ''} ${hitStage.ifBlocked ? `Takılırsa: ${hitStage.ifBlocked}` : ''} ${rules[0] ? `Unutma: ${rules[0]}` : ''}`.trim());
    }
    const buttons = pickButtons(guide.buttonGuides || screenDefinition?.buttonGuides, 5);
    return toReply(`${firstNonEmpty(guide.plainSummary, screenDefinition?.menuPurpose, guide.summary)} ${buttons.length ? `Öne çıkan butonlar: ${buttons.join(' • ')}` : ''} ${rules.length ? `Temel veri kuralları: ${rules.join(' • ')}` : ''} ${uiSurfaceEvidence(screenContext)}`.trim());
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
    const uiDisabled = disabledButtonReply(message, screenContext, analysis);
    if (uiDisabled) return toReply(uiDisabled);
    if (analysis?.blockers?.length || analysis?.disabledHints?.length) return toReply(analyzerReply(analysis, 'DIAGNOSIS'));
    const reasons = uniqueStrings([guide.whyBlocked, ...(guide.lockedActionReasons || []), ...stuckChecks(screenDefinition, guide), ...dataRules(screenDefinition, guide, 2)]).slice(0, 5);
    return toReply(`${reasons.length ? `Bu işlem şu yüzden kapalı olabilir: ${reasons.join(' • ')}` : firstNonEmpty(guide.screenExplanation, guide.plainSummary, guide.summary)} ${guide.whatToDoNow ? `Şimdi bunu yap: ${guide.whatToDoNow}` : ''} ${uiSurfaceEvidence(screenContext)}`.trim());
  }
  if (questionType === 'FIELD_HELP') {
    const selectedField = selectedFieldReply(message, screenContext, screenDefinition);
    if (selectedField) return toReply(selectedField);
    const rules = dataRules(screenDefinition, guide, 2);
    return toReply(`${firstNonEmpty(screenDefinition?.menuPurpose, guide.plainSummary, guide.summary)} ${rules[0] ? `Temel kural: ${rules[0]}` : ''}`.trim());
  }
  if (questionType === 'BADGE_HELP') {
    const selectedBadge = selectedBadgeReply(message, screenContext, screenDefinition);
    if (selectedBadge) return toReply(selectedBadge);
    const mistakes = formatMistakesReply(screenDefinition, guide);
    return toReply(`${firstNonEmpty(screenDefinition?.menuPurpose, guide.plainSummary, guide.summary)} ${mistakes || ''}`.trim());
  }
  if (questionType === 'TERM_HELP') {
    const comparison = termComparisonReplyV2(message) || termComparisonReply(message);
    if (comparison) return toReply(comparison);
    const selectedTerm = selectedTermReply(message, screenContext, screenDefinition);
    if (selectedTerm) return toReply(selectedTerm);
    const knownTerms = explainTermsFromText(message, 4);
    const screenTerms = pickTerms(guide.simpleTerms || screenDefinition?.simpleTerms, 4);
    const terms = uniqueStrings([...(knownTerms || []), ...(screenTerms || [])]);
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
  if (questionType === 'NEXT_STEP') {
    if (analysis?.nextBestAction) return toReply(`${analysis.reasoningLead} ${analysis.nextBestAction} ${analyzerEvidenceText(analysis)} ${uiSurfaceEvidence(screenContext)}`.trim());
    const stages = workflowStages(screenDefinition, guide, 3);
    if (stages.length) {
      const stageText = stages.map((row, idx) => `${idx + 1}) ${firstNonEmpty(row?.title, `Adım ${idx + 1}`)}: ${firstNonEmpty(row?.action, '')}${row?.doneWhen ? ` Tamam say: ${row.doneWhen}` : ''}`).join(' ');
      const ruleText = formatDataRulesReply(screenDefinition, guide, 'Temel kural: ');
      return toReply(`${stageText}${ruleText ? ` ${ruleText}` : ''}`.trim());
    }
  }
  if (replyMode === 'STEP_BY_STEP') {
    const flow = formatWorkflowReply(screenDefinition, guide);
    return toReply(`${firstNonEmpty(guide.plainSummary, screenDefinition?.menuPurpose, guide.summary)} ${flow || ''}`.trim());
  }
  if (replyMode === 'WHY') {
    return toReply(`${firstNonEmpty(guide.screenExplanation, screenDefinition?.menuPurpose, guide.jobPurpose, guide.summary)} ${guide.whatToDoNow ? `Şimdi bunu yap: ${guide.whatToDoNow}` : ''}`);
  }
  if (analysis) return toReply(`${analysis.reasoningLead} ${analyzerEvidenceText(analysis)} ${analysis.nextBestAction ? `Şimdi yap: ${analysis.nextBestAction}` : ''}`.trim());
  return toReply(`${firstNonEmpty(guide.plainSummary, screenDefinition?.menuPurpose, guide.summary)} ${guide.whatToDoNow ? `Şimdi bunu yap: ${guide.whatToDoNow}` : ''} ${guide.whatToDoNext ? `Sonra: ${guide.whatToDoNext}` : ''}`);
}


export function buildChatHelpResponse({ entityType, entityId, user, message, context, entityLabel, scope, conversationState, screenContext, screenDefinition, sourceEntityType, sourceEntityId, resolvedEntityType, resolvedEntityId }) {
  const roleMode = String(scope?.roleMode || 'OPERATIONS');
  const requestEntityType = String(sourceEntityType || entityType || 'screen');
  const requestEntityId = Number(sourceEntityId || entityId || 0);
  const rawMessage = extractUserQuestion(message);
  const expandedMessage = expandFollowUpMessage(rawMessage, conversationState, screenContext);
  const effectiveMessage = extractPrimaryConcern(expandedMessage);
  const effectiveScreenDefinition = requestEntityType === 'screen' ? resolveReferencedScreenDefinition(user, screenContext, screenDefinition, effectiveMessage) : screenDefinition;
  const effectiveScreenContext = requestEntityType === 'screen' ? remapScreenContext(screenContext, effectiveScreenDefinition, screenDefinition) : screenContext;
  const screenPath = effectiveScreenDefinition?.path || effectiveScreenContext?.path || '';
  const continuity = buildContinuityMeta({ message: rawMessage, conversationState, screenContext: effectiveScreenContext, requestEntityType, requestEntityId, screenPath });
  const continuityMeta = continuity;
  const intentMeta = detectQuestionIntent(effectiveMessage, { entityType: requestEntityType, screenPath, roleMode, conversationState });
  const questionType = intentMeta.questionType;
  const replyMode = resolveReplyMode(effectiveMessage, questionType, roleMode);

  if (roleMode === 'SIMPLE' && String(screenPath || '') === '/driver/checkin' && questionType === 'TERM_HELP' && /check[- ]?in|doğrulama|dogrulama/i.test(String(effectiveMessage || ''))) {
    const reply = 'Check-in: Kişinin araca bindiğini, indiğini veya varlığını doğrulayan kayıt. Şimdi: Önce hangi doğrulama adımında olduğunu kontrol et.';
    const quickActions = [
      makeQuickAction('Bugün', '/driver/today', 'Görev özetine dönmek için açılır.', { accent: 'primary' }),
      makeAskAction('Bunu sor: Şimdi ne yapmalıyım?', 'şimdi ne yapmalıyım', 'Aynı ekran için kısa devam sorusunu gönderir.'),
      makeGuideAction('Rehber aç: Check-in ekranı', 'ROLE_HELP_GUIDE', 'Bu ekranın kısa rehberini açar.'),
    ];
    return {
      ok: true,
      provider: 'local-chat-help',
      mode: 'CHAT_HELP',
      copilotVersion: 'M90D-DRIVER-CHECKIN-TERM-HOTFIX',
      generatedAt: new Date().toISOString(),
      intent: 'CHAT_HELP',
      intentLabel: 'Sohbet Yardımı',
      entityType,
      entityId: Number(entityId),
      entityLabel,
      activeEntityLabel: entityLabel,
      scope,
      roleMode,
      screenLabel: effectiveScreenDefinition?.label || effectiveScreenContext?.label || '',
      screenPath,
      summary: 'Check-in anlamı kısa açıklama',
      contextSummary: 'DRIVER rolü için check-in ekranında kısa terim yardımı verildi.',
      reply,
      replyMode,
      questionType,
      questionLabel: questionTypeLabel(questionType),
      suggestedChips: ['Bu ekran ne için?', 'Şimdi ne yapmalıyım?', 'Bugün ekranına nasıl dönerim?'],
      quickActions,
      linkedGuides: [makeLinkedGuide('Check-in ekran rehberi', 'ROLE_HELP_GUIDE', 'Kısa ekran rehberini açar.')],
      intentConfidence: Number(intentMeta?.confidence || 0),
      intentSignals: Array.isArray(intentMeta?.matchedSignals) ? intentMeta.matchedSignals : [],
      qualityHints: [],
      uncertaintyMeta: { level: 'LOW', reason: 'Driver check-in terimi için doğrudan kısa açıklama verildi.', roleMode },
      responseSections: [],
      continuity: continuityMeta,
      continuityMeta,
      routePlan: null,
      followUpPrompt: nextPromptByEntity(entityType, roleMode),
      actionPlanLabel: actionPlanLabelForRoleMode(roleMode, entityType),
      conversationState: {
        ...(conversationState && typeof conversationState === 'object' ? conversationState : {}),
        lastQuestionType: questionType,
        lastGuideJobType: 'ROLE_HELP_GUIDE',
        lastEntityType: entityType,
        lastEntityId: Number(entityId),
        lastEntityLabel: entityLabel,
        lastScreenPath: screenPath || null,
        lastScreenLabel: effectiveScreenDefinition?.label || null,
        roleMode,
        lastQuickActions: quickActions.slice(0, 3).map((x) => ({ label: x?.label || '', actionKind: x?.actionKind || 'OPEN_ROUTE', routeKey: x?.routeKey || '', askText: x?.askText || '', guideJobType: x?.guide?.jobType || '' })),
        lastActionPlanLabel: actionPlanLabelForRoleMode(roleMode, entityType),
        lastUserMessage: String(effectiveMessage || '').trim(),
        lastPrimaryConcern: String(effectiveMessage || '').trim(),
        lastRawUserMessage: String(rawMessage || '').trim(),
        lastSelectedEntityType: continuity?.currentEntityType || '',
        lastSelectedEntityId: Number(continuity?.currentEntityId || 0) || null,
        lastSelectedLabel: continuity?.anchorLabel || '',
        lastContinuityMeta: continuityMeta,
        recentMessages: Array.isArray(conversationState?.recentMessages) ? conversationState.recentMessages.slice(-8) : [],
      },
    };
  }
  const preferEntityContext = prefersSelectedEntity(questionType, requestEntityType, context);
  const answerEntityType = preferEntityContext ? String(resolvedEntityType || context?.type || entityType || requestEntityType) : requestEntityType;
  const answerEntityId = preferEntityContext ? Number(resolvedEntityId || context?.id || entityId || requestEntityId || 0) : requestEntityId;
  const guide = buildJobGuideResponse({
    jobType: selectGuideJobType({ entityType: answerEntityType, questionType, message: effectiveMessage, screenPath }),
    guideLevel: replyMode,
    context: answerEntityType === 'screen' ? effectiveScreenDefinition : context,
    entityType: answerEntityType,
    entityId: answerEntityId,
    user,
    screenContext: effectiveScreenContext,
  });

  const rawReply = composeReply({
    questionType,
    replyMode,
    guide,
    message: effectiveMessage,
    context,
    entityType: answerEntityType,
    screenDefinition: effectiveScreenDefinition,
    roleMode,
    screenContext: effectiveScreenContext,
    conversationState,
    sourceScreenDefinition: screenDefinition,
    sourceScreenContext: screenContext,
    preferEntityContext,
  });
  const screenActions = roleMode === 'SIMPLE' ? [] : screenMenuActions(effectiveScreenDefinition);
  const guideActions = Array.isArray(guide.quickActions) ? guide.quickActions : [];
  const entityActions = entityActionPlan({ entityType: answerEntityType, context, screenDefinition: effectiveScreenDefinition, roleMode, questionType, reply: rawReply });
  const mergedActions = mergeQuickActions(entityActions, screenActions, guideActions);
  const preferredRouteTarget = (() => {
    if (questionType === 'NEXT_SCREEN') {
      if (isDirectRouteRequest(effectiveMessage)) {
        return { label: effectiveScreenDefinition?.label || '', path: effectiveScreenDefinition?.path || '', reason: 'Kullanıcı doğrudan hedef ekran istedi.' };
      }
      const best = pickBestNextScreenCandidate({ message: effectiveMessage, screenDefinition: effectiveScreenDefinition, sourceScreenDefinition: screenDefinition, sourceScreenContext: screenContext }).best?.candidate || null;
      return best ? { label: best.label || '', path: best.path || '', reason: best.reason || '' } : null;
    }
    if (questionType === 'FIRST_CONTROL' && String(effectiveScreenDefinition?.path || '') !== String(screenDefinition?.path || '')) {
      return { label: effectiveScreenDefinition?.label || '', path: effectiveScreenDefinition?.path || '', reason: 'İlk kontrol hedef ekranda yapılmalı.' };
    }
    return null;
  })();
  const preferredRouteAction = preferredRouteTarget?.label
    ? mergedActions.find((x) => String(x?.actionKind || '') === 'OPEN_ROUTE' && (normalizeText(x?.label || '').includes(normalizeText(preferredRouteTarget.label)) || String(x?.routeKey || '') === String(preferredRouteTarget.path || '')))
    : null;
  const injectedPreferredRouteAction = !preferredRouteAction && preferredRouteTarget?.path
    ? makeQuickAction(preferredRouteTarget.label || 'İlgili ekran', preferredRouteTarget.path, preferredRouteTarget.reason || 'Bir sonraki doğru ekrana götürür.', { accent: 'primary' })
    : null;
  const bestAction = preferredRouteAction || injectedPreferredRouteAction || findBestAction(mergedActions, effectiveMessage);
  const linkedGuides = limitItemsForRoleMode(guideLinksForEntity(answerEntityType), roleMode, 1, 3);
  const customChips = Array.isArray(effectiveScreenDefinition?.chatQuestions) ? effectiveScreenDefinition.chatQuestions : [];
  const selectedContextChips = selectedFieldRows(effectiveScreenContext).length || selectedBadgeRows(effectiveScreenContext).length ? ['Bu satırı nasıl okurum?', 'Bu sütun ne demek?', 'Bu rozet ne demek?', 'Bu seçili kayıtta eksik ne var?'] : [];
  const suggestedChips = uniqueStrings([...customChips, ...selectedContextChips, ...buildSuggestedChips({ entityType: answerEntityType, questionType, roleMode, screenPath, context })]).slice(0, roleMode === 'SIMPLE' ? 4 : 7);
  const actionList = bestAction ? [bestAction, ...mergedActions.filter((x) => x !== bestAction)] : mergedActions;
  const askFallback = makeAskAction('Bunu sor: Bu kayıt ne durumda?', answerEntityType === 'vehicle' ? 'konum neden görünmüyor' : 'bu kayıt ne durumda', 'Aynı kayıt için hızlı takip sorusunu tekrar gönderir.');
  const withAsk = actionList.some((x) => x?.actionKind === 'ASK') ? actionList : [askFallback, ...actionList];
  const preferRoute = questionType === 'NEXT_SCREEN' || questionType === 'GO_TO' || isDirectRouteRequest(effectiveMessage);
  const preferOpenRoute = preferRoute || questionType === 'ROLE_HELP' || (roleMode === 'SIMPLE' && ['NEXT_STEP', 'FIRST_CONTROL'].includes(String(questionType || '')));
  const actionPriority = roleMode === 'SIMPLE'
    ? { OPEN_ROUTE: 0, ASK: 1, OPEN_GUIDE: 2, COPY_TEXT: 3 }
    : preferOpenRoute
      ? { OPEN_ROUTE: 0, ASK: 1, OPEN_GUIDE: 2, COPY_TEXT: 3 }
      : { ASK: 0, OPEN_GUIDE: 1, OPEN_ROUTE: 2, COPY_TEXT: 3 };
  const prioritizedActions = [...withAsk].sort((a, b) => (actionPriority[String(a?.actionKind || 'OPEN_ROUTE')] ?? 9) - (actionPriority[String(b?.actionKind || 'OPEN_ROUTE')] ?? 9));
  const maxQuickActions = roleMode === 'SIMPLE' ? 3 : 5;
  const supportKinds = new Set(['ASK', 'OPEN_GUIDE', 'COPY_TEXT']);
  let finalQuickActions = prioritizedActions.slice(0, maxQuickActions);
  if (roleMode === 'SIMPLE' && finalQuickActions.length > 0 && !finalQuickActions.some((x) => supportKinds.has(String(x?.actionKind || '')))) {
    const supportAction = prioritizedActions.find((x) => supportKinds.has(String(x?.actionKind || '')));
    if (supportAction) finalQuickActions = [...finalQuickActions.slice(0, Math.max(0, maxQuickActions - 1)), supportAction];
  }
  const reply = polishReply({ reply: rawReply, questionType, screenDefinition: effectiveScreenDefinition, roleMode });
  const qualityHints = buildQualityHints({ reply, questionType, quickActions: finalQuickActions, intentConfidence: intentMeta?.confidence, roleMode });
  const uncertaintyMeta = buildUncertaintyMeta({ questionType, intentConfidence: intentMeta?.confidence, qualityHints, screenDefinition: effectiveScreenDefinition, quickActions: finalQuickActions, roleMode });
  const questionLabel = questionTypeLabel(questionType);
  const routePlan = buildRoutePlan({ questionType, quickActions: finalQuickActions, screenDefinition: effectiveScreenDefinition, continuity });
  const responseSections = buildResponseSections({
    questionType,
    questionLabel,
    quickActions: finalQuickActions,
    suggestedChips,
    qualityHints,
    uncertaintyMeta,
    screenDefinition: effectiveScreenDefinition,
    roleMode,
    continuity,
    continuityMeta,
    routePlan,
  });
  const baseContextSummary = contextSummaryForRoleMode(roleMode, effectiveScreenDefinition, entityLabel, scope, answerEntityType);
  const contextSummary = continuity?.sameEntity && continuity?.anchorLabel
    ? `Aynı kayıt üzerinde devam ediyoruz: ${continuity.anchorLabel}. ${baseContextSummary}`.trim()
    : continuity?.isFollowUp && continuity?.sameScreen
      ? `Aynı ekran bağlamında devam ediyoruz. ${baseContextSummary}`.trim()
      : baseContextSummary;
  const actionPlanLabel = actionPlanLabelForRoleMode(roleMode, answerEntityType);

  return {
    ok: true,
    provider: 'local-chat-help',
    mode: 'CHAT_HELP',
    copilotVersion: 'M71.8-SELECTED-ENTITY-RESOLVE',
    generatedAt: new Date().toISOString(),
    intent: 'CHAT_HELP',
    intentLabel: 'Sohbet Yardımı',
    entityType,
    entityId: Number(entityId),
    entityLabel,
    activeEntityLabel: entityLabel,
    scope,
    roleMode,
    screenLabel: effectiveScreenDefinition?.label || effectiveScreenContext?.label || '',
    screenPath,
    summary: firstNonEmpty(guide.plainSummary, guide.summary, reply),
    contextSummary,
    reply,
    replyMode,
    questionType,
    questionLabel,
    suggestedChips,
    quickActions: finalQuickActions,
    linkedGuides,
    intentConfidence: Number(intentMeta?.confidence || 0),
    intentSignals: Array.isArray(intentMeta?.matchedSignals) ? intentMeta.matchedSignals : [],
    qualityHints,
    uncertaintyMeta,
    responseSections,
    continuity,
    continuityMeta,
    routePlan,
    followUpPrompt: nextPromptByEntity(entityType, roleMode),
    actionPlanLabel,
    conversationState: {
      ...(conversationState && typeof conversationState === 'object' ? conversationState : {}),
      lastQuestionType: questionType,
      lastGuideJobType: guide?.jobType || null,
      lastEntityType: entityType,
      lastEntityId: Number(entityId),
      lastEntityLabel: entityLabel,
      lastScreenPath: screenPath || null,
      lastScreenLabel: effectiveScreenDefinition?.label || null,
      roleMode,
      lastQuickActions: finalQuickActions.slice(0, 3).map((x) => ({ label: x?.label || '', actionKind: x?.actionKind || 'OPEN_ROUTE', routeKey: x?.routeKey || '', askText: x?.askText || '', guideJobType: x?.guide?.jobType || '' })),
      lastActionPlanLabel: actionPlanLabel,
      lastUserMessage: String(effectiveMessage || '').trim(),
      lastPrimaryConcern: String(effectiveMessage || '').trim(),
      lastRawUserMessage: String(rawMessage || '').trim(),
      lastSelectedEntityType: continuity?.currentEntityType || '',
      lastSelectedEntityId: Number(continuity?.currentEntityId || 0) || null,
      lastSelectedLabel: continuity?.anchorLabel || '',
      lastContinuityMeta: continuityMeta,
      recentMessages: Array.isArray(conversationState?.recentMessages) ? conversationState.recentMessages.slice(-8) : [],
    },
  };
}

function normalizeReplySurface(text) {
  return String(text || '').replace(/\s+/g, ' ').replace(/\s+([.,!?;:])/g, '$1').trim();
}

function trimReplyLength(text, maxLength = 560) {
  const value = normalizeReplySurface(text);
  if (value.length <= maxLength) return value;
  const sliced = value.slice(0, maxLength - 1);
  const cut = Math.max(sliced.lastIndexOf('. '), sliced.lastIndexOf('! '), sliced.lastIndexOf('? '));
  return `${(cut > 90 ? sliced.slice(0, cut + 1) : sliced).trim()}…`;
}

function openingActionForQuestionType(questionType, screenDefinition) {
  const first = firstNonEmpty(screenDefinition?.firstStep, screenDefinition?.nextStep, 'ilgili kayıt veya alanı kontrol et');
  const map = {
    NEXT_STEP: `Önce ${first}.`,
    NEXT_SCREEN: `Önce ${first}.`,
    GO_TO: `Önce ${first}.`,
    READINESS_CHECK: `Önce ${first}.`,
    FIRST_CONTROL: `Önce ${first}.`,
    WHY_BLOCKED: `Önce ${first}.`,
    STATUS_HELP: `Önce ${first}.`,
    SAFE_NEXT_STEP: `Önce ${first}.`,
    ROLE_HELP: `Önce ${first}.`,
    SCREEN_PURPOSE: `Önce ${first}.`,
  };
  return firstNonEmpty(map[String(questionType || '')], '');
}

function ensureActionLead(reply, questionType, screenDefinition) {
  const value = normalizeReplySurface(reply);
  if (!value) return value;
  if (/^Bu ekrandaki veriye göre/i.test(value)) return value;
  if (['NEXT_STEP', 'NEXT_SCREEN', 'GO_TO', 'READINESS_CHECK', 'FIRST_CONTROL', 'WHY_BLOCKED', 'STATUS_HELP', 'SAFE_NEXT_STEP', 'ROLE_HELP', 'SCREEN_PURPOSE'].includes(String(questionType || ''))) {
    if (!/^(Şimdi:|Şimdi yap:|Önce:|Önce\s)/.test(value)) {
      const lead = openingActionForQuestionType(questionType, screenDefinition);
      return `${lead} ${value}`.trim();
    }
  }
  return value;
}

function buildQualityHints({ reply, questionType, quickActions, intentConfidence, roleMode }) {
  const text = normalizeReplySurface(reply);
  const actionReady = /(Şimdi:|Şimdi yap:|Önce:|Önce\s)/.test(text);
  const concise = text.length <= (roleMode === 'SIMPLE' ? 360 : 720);
  const hasSupportAction = (Array.isArray(quickActions) ? quickActions : []).some((row) => ['ASK', 'OPEN_ROUTE', 'OPEN_GUIDE'].includes(String(row?.actionKind || '')));
  return {
    concise,
    actionable: actionReady,
    hasSupportAction,
    intentConfidence: Number(intentConfidence || 0),
    questionType: String(questionType || ''),
  };
}

function verificationHintForQuestionType(questionType, screenDefinition, quickActions) {
  const firstControl = firstNonEmpty(...(Array.isArray(screenDefinition?.firstControls) ? screenDefinition.firstControls : []), screenDefinition?.firstStep, 'ilgili kayıt veya ilk kontrol alanı');
  const screenLabel = String(screenDefinition?.label || 'bu ekran');
  const routeAction = (Array.isArray(quickActions) ? quickActions : []).find((row) => String(row?.actionKind || '') === 'OPEN_ROUTE');
  if (['NEXT_SCREEN', 'GO_TO'].includes(String(questionType || ''))) return `${screenLabel} için önce ${firstControl} kontrolü yap; sonra yönlendirmeyi uygula.`;
  if (questionType === 'WHY_BLOCKED') return `Blokajı kesinleştirmek için önce ${firstControl} ve pasif/kırmızı alanları kontrol et.`;
  if (questionType === 'READINESS_CHECK') return `Hazır kararı vermeden önce ${firstControl} ve eksik görünen alanları kontrol et.`;
  if (questionType === 'STATUS_HELP') return `Durumu netleştirmek için önce ${firstControl} ve varsa seçili kaydın son sinyallerine bak.`;
  if (routeAction?.label) return `${routeAction.label} adımına geçmeden önce ${firstControl} kontrolünü yap.`;
  return `Önce ${firstControl} kontrolünü yap; sonra bu yönlendirmeyi uygula.`;
}

function buildUncertaintyMeta({ questionType, intentConfidence, qualityHints, screenDefinition, quickActions, roleMode }) {
  const confidence = Number(intentConfidence || 0);
  const actionable = Boolean(qualityHints?.actionable);
  const hasSupportAction = Boolean(qualityHints?.hasSupportAction);
  const concise = Boolean(qualityHints?.concise);
  const needsVerification = confidence < 0.72 || !actionable || !hasSupportAction;
  const cautionLevel = confidence >= 0.88 && actionable && hasSupportAction ? 'LOW' : (confidence >= 0.72 && actionable ? 'MEDIUM' : 'HIGH');
  const labelMap = { LOW: 'Kararlı öneri', MEDIUM: 'Kontrollü öneri', HIGH: 'Önce kontrol et' };
  const summaryMap = {
    LOW: 'Bu cevap güçlü sinyallere dayanıyor.',
    MEDIUM: 'Bu cevap iyi bir yön verir; yine de ilk kontrolü yapman güvenli olur.',
    HIGH: 'Bu cevap temkinli okunmalı; önce ekrandaki ana kontrolü doğrula.',
  };
  return {
    cautionLevel,
    label: labelMap[cautionLevel] || 'Kontrollü öneri',
    needsVerification,
    concise,
    verifyText: needsVerification ? verificationHintForQuestionType(questionType, screenDefinition, quickActions) : '',
    summary: summaryMap[cautionLevel] || 'Bu cevap temkinli okunmalı.',
    intentConfidence: confidence,
    roleMode: String(roleMode || ''),
  };
}

function questionTypeLabel(questionType) {
  const labels = {
    NEXT_SCREEN: 'Nereye gitmeliyim',
    GO_TO: 'Hızlı geçiş',
    FIRST_CONTROL: 'İlk neye bakayım',
    STATUS_HELP: 'Şu an ne durumda',
    READINESS_CHECK: 'Hazır mı',
    WHY_BLOCKED: 'Neden olmuyor',
    BUTTON_HELP: 'Bu buton ne yapar',
    SCREEN_PURPOSE: 'Bu ekran ne için',
    SAFE_NEXT_STEP: 'Şimdi en güvenli adım',
    LOCATION_HELP: 'Konum neden görünmüyor',
    ROLE_HELP: 'Bu rolde ne yapabilirim',
  };
  return labels[String(questionType || '')] || 'Copilot yardımı';
}

function buildRoutePlan({ questionType, quickActions, screenDefinition, continuity }) {
  const routeActions = (Array.isArray(quickActions) ? quickActions : []).filter((row) => String(row?.actionKind || '') === 'OPEN_ROUTE' && row?.routeKey);
  const askAction = (Array.isArray(quickActions) ? quickActions : []).find((row) => String(row?.actionKind || '') === 'ASK');
  const guideAction = (Array.isArray(quickActions) ? quickActions : []).find((row) => String(row?.actionKind || '') === 'OPEN_GUIDE');
  const primaryRoute = routeActions[0] || null;
  const secondaryRoute = routeActions[1] || null;
  const routeHeavy = ['NEXT_SCREEN', 'GO_TO', 'FIRST_CONTROL', 'ROLE_HELP', 'SAFE_NEXT_STEP'].includes(String(questionType || ''));
  if (!routeHeavy && !primaryRoute) return null;
  const steps = [];
  if (primaryRoute?.label) steps.push(`Önce ${primaryRoute.label}`);
  if (continuity?.sameEntity && continuity?.anchorLabel) steps.push(`Aynı kayıtla devam et: ${continuity.anchorLabel}`);
  const firstControl = firstNonEmpty(...(Array.isArray(screenDefinition?.firstControls) ? screenDefinition.firstControls : []), screenDefinition?.firstStep, 'ilk kontrol alanı');
  if (firstControl) steps.push(`İçeride ilk olarak şunu kontrol et: ${firstControl}`);
  if (secondaryRoute?.label) steps.push(`Gerekirse sonra ${secondaryRoute.label}`);
  if (askAction?.askText || askAction?.label) steps.push(`Takılırsan bunu sor: ${firstNonEmpty(askAction?.askText, askAction?.label, '')}`);
  else if (guideAction?.label) steps.push(`İstersen rehber aç: ${guideAction.label}`);
  return {
    primaryRouteLabel: firstNonEmpty(primaryRoute?.label, ''),
    primaryRouteKey: firstNonEmpty(primaryRoute?.routeKey, ''),
    secondaryRouteLabel: firstNonEmpty(secondaryRoute?.label, ''),
    summary: steps.slice(0, 2).join(' • '),
    steps: steps.slice(0, 5),
    routeHeavy,
  };
}

function responseWhyText(questionType, screenDefinition) {
  const screenLabel = String(screenDefinition?.label || 'bu ekran');
  if (questionType === 'NEXT_SCREEN' || questionType === 'GO_TO') return `${screenLabel} ekranında sonraki doğru adımı bulmaya odaklandım.`;
  if (questionType === 'FIRST_CONTROL') return `${screenLabel} ekranında önce bakılması gereken noktayı öne çıkardım.`;
  if (questionType === 'STATUS_HELP' || questionType === 'READINESS_CHECK') return `${screenLabel} ekranındaki durum ve eksik işaretlerine göre cevap verdim.`;
  if (questionType === 'WHY_BLOCKED') return `${screenLabel} ekranındaki blokaj ve eksik bilgi ihtimaline göre cevap verdim.`;
  if (questionType === 'LOCATION_HELP') return `${screenLabel} ekranındaki konum ve GPS işaretlerine göre yorum yaptım.`;
  return `${screenLabel} ekranını ve seçili kaydı birlikte dikkate aldım.`;
}

function buildResponseSections({ questionType, questionLabel, quickActions, suggestedChips, qualityHints, uncertaintyMeta, screenDefinition, roleMode, continuity, routePlan }) {
  const sections = [];
  const primaryAction = Array.isArray(quickActions) ? quickActions[0] : null;
  if (primaryAction?.label) {
    sections.push({
      kind: 'NEXT',
      title: 'Şimdi bunu yap',
      text: primaryAction.label,
      hint: primaryAction.reason || 'Bu adım seni doğru yere götürür ya da bir sonraki işi başlatır.',
    });
  }
  sections.push({
    kind: 'WHY',
    title: 'Bunu neden söyledim',
    text: responseWhyText(questionType, screenDefinition),
    hint: questionLabel || 'Copilot yardımı',
  });
  if (uncertaintyMeta?.needsVerification && uncertaintyMeta?.verifyText) {
    sections.push({
      kind: 'VERIFY',
      title: 'Emin değilsen önce şuna bak',
      text: uncertaintyMeta.verifyText,
      hint: uncertaintyMeta.label || 'Kontrollü öneri',
    });
  }
  if (routePlan?.steps?.length) {
    sections.push({
      kind: 'ROUTE_CHAIN',
      title: 'İzlenecek yol',
      text: routePlan.summary || routePlan.steps[0] || '',
      hint: routePlan.primaryRouteLabel ? `Hedef ekran: ${routePlan.primaryRouteLabel}` : 'İzlenecek yol',
      items: routePlan.steps,
    });
  }
  if (continuity?.sameEntity && continuity?.anchorLabel) {
    sections.push({
      kind: 'THREAD',
      title: 'Aynı kayıt',
      text: continuity.anchorLabel,
      hint: 'Bu cevap aynı seçili kayıt üstünden devam eder.',
    });
  } else if (continuity?.isFollowUp && continuity?.sameScreen) {
    sections.push({
      kind: 'THREAD',
      title: 'Aynı konuşmanın devamı',
      text: 'Önceki konuşmanın aynı ekran içindeki devamı.',
    });
  }
  const followUps = Array.isArray(suggestedChips) ? suggestedChips.slice(0, roleMode === 'SIMPLE' ? 2 : 3) : [];
  if (followUps.length) {
    sections.push({
      kind: 'FOLLOW_UP',
      title: 'Sonra şunu sor',
      items: followUps,
    });
  }
  if (qualityHints && roleMode !== 'SIMPLE') {
    const checks = [];
    if (!qualityHints.actionable) checks.push('Daha net bir sonraki adım iste.');
    if (!qualityHints.concise) checks.push('Daha kısa anlatmasını iste.');
    if (!qualityHints.hasSupportAction) checks.push('İlgili ekranı açtır ya da rehber iste.');
    if (checks.length) {
      sections.push({
        kind: 'CHECK',
        title: 'Gerekirse bunu da yap',
        items: checks,
      });
    }
  }
  return sections;
}

function applyPlainLanguage(text) {
  return String(text || '')
    .replace(/bağlam/gi, 'durum')
    .replace(/blokaj/gi, 'engel')
    .replace(/teşhis/gi, 'yorum')
    .replace(/sinyallerine göre/gi, 'işaretlerine göre')
    .replace(/ilgili kayıt veya alanı kontrol et/gi, 'ilgili kayıt ya da alanı kontrol et')
    .replace(/İlgili sonraki adımı hızlı açar veya tekrar sorar\./g, 'Bu adım seni doğru yere götürür ya da aynı soruyu ilerletir.')
    .replace(/Hangi yere gideceğini aşağıdaki düğmelerden açabilirsin\./g, 'Nereye gideceğini aşağıdaki düğmelerden açabilirsin.')
    .replace(/Temel veri kuralları:/g, 'Önemli kural:')
    .replace(/Temel kural:/g, 'Önemli kural:')
    .replace(/Kritik eksik görünmüyor\./g, 'Belirgin eksik görünmüyor.')
    .replace(/Belirgin blokaj görünmüyor\./g, 'Belirgin engel görünmüyor.')
    .replace(/Şimdi bunu yap:/g, 'Şimdi yap:')
    .replace(/Şimdi bunu yap /g, 'Şimdi yap ')
    .replace(/Kaçın:/g, 'Yapma:')
    .replace(/Takılırsan bak:/g, 'Takılırsan şuna bak:')
    .replace(/Sonuç:/g, 'Bunu yapınca:')
    .replace(/Dikkat isteyen konu:/g, 'Dikkat et:');
}

function polishReply({ reply, questionType, screenDefinition, roleMode }) {
  const withLead = ensureActionLead(reply, questionType, screenDefinition);
  return trimReplyLength(applyPlainLanguage(withLead), roleMode === 'SIMPLE' ? 260 : 560);
}

function termComparisonReplyV2(message) {
  const text = normalizeText(message);
  const asksDiff = /aynı şey mi|ayni sey mi|farkı ne|farki ne/.test(text);
  const hasLog = /log|audit|işlem kaydı|islem kaydi/.test(text);
  const hasNotification = /bildirim|notification/.test(text);
  const hasInvite = /giriş daveti|giris daveti|hesap daveti|invite/.test(text);
  const hasAccessLink = /erişim linki|erisim linki|access link|personel link|öğrenci linki|ogrenci linki|veli linki|student link/.test(text);
  const hasParentAccess = /veli erişimi|veli erisimi|parent access/.test(text);
  const hasInbound = /inbound|toplama yönü|toplama yonu/.test(text);
  const hasOutbound = /outbound|dağıtım yönü|dagitim yonu|bırakma yönü|birakma yonu/.test(text);
  const hasOsrm = /osrm|yol hesabı|rota hesabı/.test(text);
  const hasMatrix = /matrix|matris|süre tablosu|sure tablosu/.test(text);

  if (asksDiff && hasLog && hasNotification) {
    return 'Aynı şey değil. Bildirim kullanıcıya giden uyarıdır. İşlem kaydı ise sistemde ne olduğunun kayıt altına alınmış halidir.';
  }
  if (asksDiff && ((hasInvite && hasAccessLink) || (hasParentAccess && hasAccessLink))) {
    return 'Aynı şey değil. Eski giriş daveti akışı kaldırıldı. Yeni yapıda okul Veli Erişimi üretir; erişim linki, erişim kodu ve PIN aynı süre boyunca kullanılabilir.';
  }
  if (asksDiff && hasInbound && hasOutbound) {
    return "Aynı yön değil. Inbound toplama yönüdür; personeli merkeze veya hub'a getirir. Outbound ise hub'dan çıkıp personeli bırakma yönüdür.";
  }
  if ((hasOsrm && hasMatrix) || (asksDiff && (hasOsrm || hasMatrix))) {
    return 'OSRM yol ve süre hesabı yapan servistir. Matrix ise birden çok nokta için toplu süre ve mesafe tablosudur.';
  }
  return '';
}
