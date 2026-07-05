import { firstNonEmpty } from './replyShapes.js';
import { detectCopilotGuidedTaskEngineProgressCommand } from './copilotGuidedTaskEngine.js';
import {
  looksLikeDetailContinuationRequest,
  matchesStandalonePhrase,
  normalizeText,
} from './conversationTaskStateShared.js';

export function looksLikeShortFollowUp(message) {
  const text = normalizeText(message);
  if (!text) return false;
  if (detectCopilotGuidedTaskEngineProgressCommand(text)) return true;
  if (looksLikeDetailContinuationRequest(text)) return true;
  if (text.length > 72) return false;
  return /(peki|tamam|o zaman|devam|devam et|ee sonra|e sonra|sonra\??|simdi\??|şimdi\??|neden\??|niye\??|bunda\??|burada\??|aynı kayıtta|ayni kayitta|aynı satırda|ayni satirda|bu kayıtta|bu kayitta|neye basayim|neye basayım|hangi ekrana|hangi ekrana gideyim|bu işlem bende görünmüyor|bu islem bende gorunmuyor|bende çıkmıyor|bende cikmiyor|burda takıldı|burada takildi|sorun kimde|kim onaylayacak|bunu kim yapabilir|tamam bunu nasıl düzeltirim|tamam bunu nasil duzeltirim|aynı kayıt için devam et|ayni kayit icin devam et|önce neyi kontrol edeyim|once neyi kontrol edeyim|bu yüzden mi başlamıyor|bu yuzden mi baslamiyor|girdim|içine girdim|icine girdim|açtım|actim|yaptım|yaptim|ekledim|ekledik|bulamadım|bulamadim|benim yerime|bunu sen yap|teklifi kabul et|aracı ata|araci ata|sözleşmeyi yürürlüğe al|sozlesmeyi yururluge al)/.test(text)
    || matchesStandalonePhrase(text, ['bura ne', 'burası ne', 'burasi ne', 'bu ne', 'ne bu', 'burda ne var', 'burada ne var', 'burası ne işe yarıyor', 'burasi ne ise yariyor', 'bu ekran ne', 'ne yapayım', 'ne yapayim', 'şimdi ne', 'simdi ne', 'girdim', 'yaptım', 'yaptim', 'ekledim', 'ekledik', 'bulamadım', 'bulamadim', 'devam et', 'devamını anlat', 'devamini anlat', 'bunu sen yap', 'benim yerime', 'teklifi kabul et', 'aracı ata', 'araci ata', 'sözleşmeyi yürürlüğe al', 'sozlesmeyi yururluge al']);
}

export function buildContinuityMeta({ message, conversationState, screenContext, requestEntityType, requestEntityId, screenPath }) {
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

export function resolveFollowUpContextQuestion({
  message,
  conversationState,
  screenContext,
  _screenDefinition,
  sourceScreenContext,
  _sourceScreenDefinition,
  questionType,
  _roleMode = 'OPERATIONS',
  _screenPath = '',
  _analysis = null,
}) {
  const raw = String(message || '').trim();
  const hasConversationAnchor = Boolean(conversationState?.lastQuestionType) || (Array.isArray(conversationState?.recentMessages) && conversationState.recentMessages.length > 0);
  if (!hasConversationAnchor || !looksLikeShortFollowUp(raw)) return raw;
  const guidedProgress = detectCopilotGuidedTaskEngineProgressCommand(raw, conversationState);
  if (guidedProgress?.command) return raw;
  const text = normalizeText(raw);
  const followUpPath = firstNonEmpty(
    screenContext?.path,
    conversationState?.lastScreenPath,
    conversationState?.taskState?.screenPath,
    '',
  );
  if (String(followUpPath || '').includes('/company/shifts') && looksLikeDetailContinuationRequest(text)) {
    return 'Vardiyalar akışından devam edelim. Seçili Vardiya #6 üzerinden gidiyorsan önce tarih / saat, personel-adres / konum ve teklif / sözleşme hazırlığı durumunu kontrol et. Yeni vardiya oluşturuyorsan yeni plan adımına geç; mevcut vardiyayı takip ediyorsan seçili kaydın durumunu oku.';
  }
  const priorConcern = firstNonEmpty(
    conversationState?.lastPrimaryConcern,
    conversationState?.lastUserMessage,
    conversationState?.lastRawUserMessage,
    '',
  );
  const selectedLabel = firstNonEmpty(
    screenContext?.selectedLabel,
    conversationState?.lastSelectedLabel,
    conversationState?.lastEntityLabel,
    sourceScreenContext?.selectedLabel,
    sourceScreenContext?.selectedSummary,
    'bu seçili kayıt',
  );
  const selectedSummary = firstNonEmpty(screenContext?.selectedSummary, sourceScreenContext?.selectedSummary, '');
  const anchor = firstNonEmpty(selectedLabel, selectedSummary, '');
  const selectionMissing = !anchor || /^bu seçili kayıt$/i.test(anchor);
  if (looksLikeDetailContinuationRequest(text)) {
    const detailAnchor = firstNonEmpty(priorConcern, anchor, selectedSummary, '');
    if (detailAnchor) {
      return `${String(detailAnchor).replace(/[?.!]+$/g, '')} için adım adım detay ver.`;
    }
    return raw;
  }
  if (/(girdim|içine girdim|icine girdim|açtım|actim)/.test(text)) {
    return `${anchor || 'bu kayıt'} için ekrana girdin, şimdi ilk neyi kontrol etmeliyim?`;
  }
  if (/(yaptım|yaptim|tamamladım|tamamladim|denedim|kontrol ettim|işledim|isledim)/.test(text)) {
    return `${anchor || 'bu kayıt'} için sonucu kontrol edelim, devam edelim mi?`;
  }
  if (/(ekledim|ekledik)/.test(text)) {
    return `${anchor || 'bu kayıt'} için şimdi ne yapmalıyım?`;
  }
  if (/(bulamadım|bulamadim|bulamıyorum|bulamiyorum|göremedim|goremedim|nerede|hangi\s+menü|hangi\s+menu|alternatif\s+yol|menü\s+yolu|menu\s+yolu)/.test(text)) {
    return `${anchor || 'bu kayıt'} için alternatif menü yolu ne?`;
  }
  if (/(devam\s+et|aynı\s+kayıtta|ayni\s+kayitta|aynı\s+yerden\s+devam|ayni\s+yerden\s+devam|sürdür|surdur|buradan\s+devam|aynı\s+kayıt\s+için\s+devam|ayni\s+kayit\s+icin\s+devam)/.test(text)) {
    return `${anchor || 'bu kayıt'} için devam edelim; sonraki güvenli adım ne?`;
  }
  if (/(bunu\s+sen\s+yap|benim\s+yerime|teklifi\s+kabul\s+et|aracı\s+ata|araci\s+ata|sözleşmeyi\s+yürürlüğe\s+al|sozlesmeyi\s+yururluge\s+al)/.test(text)) {
    return raw;
  }
  if (selectionMissing && /(neye basayım|hangi ekrana|kim onaylayacak|bunu kim yapabilir|kim yapabilir|sorumlu kim|bu kayıt kimde|bende çıkmıyor|bu işlem bende görünmüyor|burda takıldı|sorun kimde|önce neyi kontrol edeyim|bu yüzden mi|neden|niye|şimdi|peki|tamam|devam)/.test(text)) {
    return 'Önce ilgili satırı seç.';
  }
  if (/^(neden|niye)\??$/.test(text) || /(neden böyle|neden boyle|niye böyle|niye boyle|bu yüzden mi|bu yuzden mi)/.test(text)) {
    return `${anchor || 'bu kayıt'} için neden böyle görünüyor?`;
  }
  if (/(kim onaylayacak|bunu kim yapabilir|kim yapabilir|sorumlu kim|bu kayıt kimde|bu işlem bende görünmüyor|bu islem bende gorunmuyor|bende çıkmıyor|bende cikmiyor|sorun kimde)/.test(text)) {
    return `${anchor || 'bu kayıt'} için bunu kim yapabilir?`;
  }
  if (/(hangi ekrana|nereye gitmeliyim|nereye geçmeliyim|nereye gecmeliyim|neye basayım|neye basayim|neye basmalıyım|neye basmaliyim)/.test(text)) {
    if (questionType === 'NEXT_SCREEN' || questionType === 'GO_TO') return `${anchor || 'bu kayıt'} için hangi ekrana gitmeliyim?`;
    return `${anchor || 'bu kayıt'} için neye basayım?`;
  }
  if (/(bu kayıt niye ilerlemiyor|burda takıldı|burada takildi|tamam bunu nasıl düzeltirim|tamam bunu nasil duzeltirim|önce neyi kontrol edeyim|once neyi kontrol edeyim|aynı kayıt için devam et|ayni kayit icin devam et|devam et|burda ne eksik|burada ne eksik)/.test(text)) {
    if (questionType === 'WHY_BLOCKED' || questionType === 'READINESS_CHECK') return `${anchor || 'bu kayıt'} için eksik ne var?`;
    return `${anchor || 'bu kayıt'} için şimdi ne yapmalıyım?`;
  }
  if (/(peki|tamam|o zaman|devam|devam et|ee sonra|e sonra|sonra|şimdi|simdi)/.test(text)) {
    if (questionType === 'NEXT_SCREEN' || questionType === 'GO_TO') return `${anchor || 'bu kayıt'} için hedef ekranda önce neyi kontrol etmeliyim?`;
    if (questionType === 'WHY_BLOCKED') return `${anchor || 'bu kayıt'} için neden böyle görünüyor?`;
    if (questionType === 'READINESS_CHECK') return `${anchor || 'bu kayıt'} için eksik ne var?`;
    return `${anchor || 'bu kayıt'} için şimdi ne yapmalıyım?`;
  }
  if (matchesStandalonePhrase(text, ['bura ne', 'burası ne', 'burasi ne', 'bu ne', 'ne bu', 'burda ne var', 'burada ne var', 'burası ne işe yarıyor', 'burasi ne ise yariyor', 'bu ekran ne', 'bu ekran ne için', 'bu ekran ne icin'])) {
    return 'Bu ekran ne için?';
  }
  if (questionType === 'NEXT_STEP' && /aynı kayıt/.test(text) && anchor) {
    return `${anchor} için şimdi ne yapmalıyım?`;
  }
  return raw;
}
