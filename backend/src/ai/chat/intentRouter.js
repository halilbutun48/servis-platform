import { filterWorkflowGenericChips, workflowTopicChipSet } from './answerQualityPolicy.js';
import { detectCopilotGuidedTaskEngineIntent } from './copilotGuidedTaskEngine.js';
import {
  detectCopilotEBlockRuntimeAnswerTopic,
  getCopilotEBlockRuntimeAnswerTopicMeta,
  listCopilotEBlockRuntimeAnswerTopics,
} from './copilotEBlockRuntimeAnswerIntegration.js';
import { uniqueStrings } from './replyShapes.js';
import {
  BASE_RULES,
  COP02A_GENERAL_RULES,
  INTENT_PRIORITY,
  addScore,
  applyRules,
  computeConfidence,
  hasAny,
  hasBoardingChangeRequestEntrySignal,
  hasImperativeNavigation,
  hasRoleKeyword,
  hasSeferScoreSignal,
  isDirectScreenSteer,
  isExplicitBadgeHelpQuestion,
  isExplicitNextScreenQuestion,
  isExplicitNextStepQuestion,
  isExplicitSafeNextStepQuestion,
  isGenericStatusHelpQuestion,
  isNextBestActionQuestion,
  isPlanningSurfacePath,
  isRiskListQuestion,
  isScreenFocusQuestion,
  isShiftReadinessQuestion,
  isShortFollowUp,
  lastQuestionType,
  looksLikeDetailContinuationQuestion,
  looksLikeOnboardingStartQuestion,
  looksLikeScreenStartQuestion,
  mentionsScreenWord,
  matchesStandalonePhrase,
  normalizeIntentArgs,
  normalizeText,
  normalizeLooseText,
  pathHas,
  selectGuideJobType,
} from './intentRouterCore.js';

// Source anchors retained for text-based checks: bura ne | burası ne | bu ne | ne bu | burda ne var | burası ne işe yar | ne yapay | SCREEN_PURPOSE | NEXT_STEP | bu kullanıcı ne yapabilir | sözleşme ile vardiya ilişkisi ne | hakediş tarafında ne kontrol etmeliyim | sürücünün telefon gps’i neden devrede | hangi ekrana gitmeliyim | saha kabul | checklist | bu hakediş neden hazır değil | bu bilgi neden görünmüyor | bu sağlayıcı neden daha iyi | bu sözleşmeden bugün vardiya üretildi mi | bunu kim yapabilir | sözleşme bugün vardiya üretildi mi | sözleşmeden vardiya üretildi mi | sözleşmeden bugün vardiya üretildi mi | ASSIGNMENT_READINESS_GUIDE | Sürücü rotası yenilenmez
// const BASE_RULES = [ | const COP02A_GENERAL_RULES = [ | const INTENT_PRIORITY = [
// return ['Bu ekranı detaylı anlat', 'İlk neye bakayım?', 'Burada eksik ne olabilir?', 'Hangi ekrana geçmeliyim?']; chips.push('Bu ekranı detaylı anlat', 'Aktif sürücüler kim?', 'Görev bağlantısı var mı?', 'Sürücü durumunu açıkla', 'İlgili yere götür'); chips.push('Bu ekranı detaylı anlat', 'Açık geri bildirimi göster', 'Kritik geri bildirimleri sırala', 'Sorumlu rolü göster', 'Geri bildirim açık'); chips.push('Bu bilgi neden görünmüyor?', 'Hangi rol görebilir?', 'KVKK sınırı ne?', 'Yetki sınırı'); chips.push('Bildirim kaynağını göster', 'İlgili kaydı aç', 'Okunmamış bildirimleri göster', 'Açık bildirimi göster'); chips.push('Üretim geçmişini göster', 'İlgili sözleşmeyi aç', 'Bugünkü vardiyaları göster', 'Üretim durumunu açıkla');
// pathHas(options.screenPath, ['/parent/live']); pathHas(options.screenPath, ['/room/map']); pathHas(options.screenPath, ['/room/drivers']); pathHas(options.screenPath, ['/shared/feedback']); pathHas(options.screenPath, ['/shared/kvkk']); pathHas(options.screenPath, ['/shared/notifications']); pathHas(options.screenPath, ['/room/commercial-flow']); Canlı takip ekranını aç
// check:seferscore01 | source lineage

const COPILOT_E_BLOCK_RUNTIME_ANSWER_TOPICS = new Set(listCopilotEBlockRuntimeAnswerTopics());

export { selectGuideJobType };

export function detectQuestionIntent(message, entityTypeOrOptions = 'screen', screenPath = '') {
  const text = normalizeText(message);
  const options = normalizeIntentArgs(entityTypeOrOptions, screenPath);
  const originalText = normalizeText(options.originalMessage || '');
  const combinedText = originalText && originalText !== text ? `${text} ${originalText}` : text;
  if (!text) return { questionType: 'OPEN', confidence: 0.42, matchedSignals: [], preferRoute: false, routeRequest: false };

  if (/(?:bu program ne|bu program nedir|bu program ne işe yarıyor|bu program ne ise yarıyor|program ne işe yarar|program ne ise yarar|program ne işe yarıyor|program ne ise yarıyor|seferpakt ne işe yarar|seferpakt ne ise yarar|seferpakt ne işe yarıyor|seferpakt ne ise yarıyor|bu sistem ne için kullanılır|bu sistem ne icin kullanilir|bu sistem ne işe yarıyor|bu sistem ne ise yarıyor|sistem ne işe yarar|sistem ne ise yarar|sistem ne işe yarıyor|sistem ne ise yarıyor|ben bu programla ne yapabilirim)/.test(combinedText)) {
    return {
      questionType: 'PRODUCT_OVERVIEW_HELP',
      confidence: 0.96,
      matchedSignals: ['PRODUCT_OVERVIEW_HELP', 'product-overview-help'],
      preferRoute: false,
      routeRequest: false,
    };
  }

  if (/(?:\b(?:company|room|driver|parent|personel|school|organization|super\s*admin|superadmin|şirket|oda|veli|sürücü|surucu|okul|organizasyon|süper\s*admin)\b.*(?:rol(?:ü|u)|olarak)?\s*(?:ne yapar|ne yapacağım|ne yapacag[ıi]m|ne yapabilirim|ne işe yarar|ne ise yarar|ne işe yarıyor|ne ise yarıyor|neyi görebilir|neyi gorebilir|ne demek)|\b(?:company|room|driver|parent|personel|school|organization|super\s*admin|superadmin|şirket|oda|veli|sürücü|surucu|okul|organizasyon|süper\s*admin)\b.*(?:ne yapar|ne yapacağım|ne yapacag[ıi]m|ne yapabilirim|ne işe yarar|ne ise yarar|ne işe yarıyor|ne ise yarıyor|neyi görebilir|neyi gorebilir|ne demek))/.test(combinedText)) {
    return {
      questionType: 'ROLE_EXPLANATION_HELP',
      confidence: 0.94,
      matchedSignals: ['ROLE_EXPLANATION_HELP', 'role-explanation-help'],
      preferRoute: false,
      routeRequest: false,
    };
  }

  if (/(?:buton.*(?:ne işe yarıyor|ne ise yariyor|ne yapıyor|ne yapiyor)|bu buton ne işe yarıyor|bu buton ne ise yariyor|bu buton ne yapıyor|bu buton ne yapiyor|bu alanı nasıl dolduracağım|bu alani nasil dolduracagim|hakediş ne demek|hakedis ne demek|route readiness ne demek|servis kanıtı ne işe yarar|servis kaniti ne ise yarar|bu alan ne demek|bu sütun ne demek|bu sutun ne demek|bu kolon ne demek|bu terim ne demek)/.test(combinedText)) {
    return {
      questionType: 'FIELD_BUTTON_HELP',
      confidence: 0.9,
      matchedSignals: ['FIELD_BUTTON_HELP', 'field-button-help'],
      preferRoute: false,
      routeRequest: false,
    };
  }

  if (/(?:bu ekran ne işe yarar|bu ekran ne ise yarar|bu ekran ne işe yarıyor|bu ekran ne ise yarıyor|bu ekran ne demek|burada ne yapıyorum|burada ne yapiyorum|bu panel neyi gösteriyor|bu panel neyi gosteriyor|bu panel ne işe yarıyor|bu panel ne ise yarıyor|bu kart ne demek|bu sayfa ne işe yarar|bu sayfa ne ise yarar|bu sayfa ne işe yarıyor|bu sayfa ne ise yarıyor|ekranın amacı ne|ekranin amaci ne)/.test(originalText) && !/(buton|alan|rozet|badge|sütun|sutun|kolon|terim)/.test(originalText)) {
    return {
      questionType: 'SCREEN_EXPLANATION_HELP',
      confidence: 0.92,
      matchedSignals: ['SCREEN_EXPLANATION_HELP', 'screen-explanation-help'],
      preferRoute: false,
      routeRequest: false,
    };
  }

  if (looksLikeDetailContinuationQuestion(originalText) || looksLikeDetailContinuationQuestion(combinedText)) {
    const lastQuestionType = normalizeText(options.conversationState?.lastQuestionType || options.conversationState?.lastGuidedTaskQuestionType || '');
    const lastConcern = normalizeText(String(
      options.conversationState?.lastPrimaryConcern
      || options.conversationState?.lastUserMessage
      || options.conversationState?.lastRawUserMessage
      || '',
    ));
    if (/(vardiya.*nasıl.*oluştur|teklif.*nasıl.*alınır|sözleşmeye.*nasıl.*geçilir|servisimi.*nasıl.*takip|check-?in.*nasıl.*yap)/.test(lastConcern) || ['HOW_TO_HELP', 'DETAIL_FLOW'].includes(lastQuestionType)) {
      return {
        questionType: 'HOW_TO_HELP',
        confidence: 0.94,
        matchedSignals: ['HOW_TO_HELP', 'detail-continuation-follow-up'],
        preferRoute: false,
        routeRequest: false,
      };
    }
    if (lastQuestionType) {
      return {
        questionType: 'DETAIL_FLOW',
        confidence: 0.88,
        matchedSignals: ['DETAIL_FLOW', 'detail-continuation-follow-up'],
        preferRoute: false,
        routeRequest: false,
      };
    }
    return {
      questionType: 'HOW_TO_HELP',
      confidence: 0.86,
      matchedSignals: ['HOW_TO_HELP', 'detail-continuation-follow-up'],
      preferRoute: false,
      routeRequest: false,
    };
  }

  if (/(?:buradan\s+sonra\s+ne\s+yapacağım|buradan\s+sonra\s+ne\s+yapacag[ıi]m|buradan\s+sonra\s+ne\s+yapmalıyım|buradan\s+sonra\s+ne\s+yapmaliyim)/.test(combinedText)) {
    return {
      questionType: 'NEXT_STEP',
      confidence: 0.92,
      matchedSignals: ['NEXT_STEP', 'screen-next-step-guidance'],
      preferRoute: false,
      routeRequest: false,
    };
  }

  if (/(?:niye\s+pasif|neden\s+pasif|bu\s+neden\s+kapalı|bu\s+neden\s+olmuyor|niye\s+kapalı|niye\s+olmuyor|pasif\s+bu|bu\s+pasif)/.test(combinedText)) {
    return {
      questionType: 'WHY_BLOCKED',
      confidence: 0.92,
      matchedSignals: ['WHY_BLOCKED', 'blocked-slang'],
      preferRoute: false,
      routeRequest: false,
    };
  }

  if (
    /(?:^|[\s"“”‘’'()[\]{}.,!?;:-])(?:bura ne|burası ne|burasi ne|burda ne var|burada ne var|burası ne işe yarıyor|burasi ne ise yariyor|bu ekran ne için var|bu ekran ne için|bu ekran ne icin var|bu ekran ne icin)(?:$|[\s"“”‘’'()[\]{}.,!?;:-])/i.test(combinedText)
    && !/(buton|alan|rozet|badge|sütun|sutun|kolon|terim)/.test(combinedText)
  ) {
    return {
      questionType: 'SCREEN_PURPOSE',
      confidence: 0.94,
      matchedSignals: ['SCREEN_PURPOSE', 'screen-purpose-slang'],
      preferRoute: false,
      routeRequest: false,
    };
  }

  if (looksLikeScreenStartQuestion(combinedText) || looksLikeScreenStartQuestion(originalText)) {
    return {
      questionType: 'SCREEN_EXPLANATION_HELP',
      confidence: 0.93,
      matchedSignals: ['SCREEN_EXPLANATION_HELP', 'screen-start-guidance'],
      preferRoute: false,
      routeRequest: false,
    };
  }

  if (looksLikeOnboardingStartQuestion(combinedText) || looksLikeOnboardingStartQuestion(originalText)) {
    const roleQuestion = hasRoleKeyword(combinedText) || hasRoleKeyword(originalText);
    const normalizedRole = normalizeText(options.userRole || options.role || '');
    if (normalizedRole && normalizedRole !== 'default') {
      const guidedTaskMeta = detectCopilotGuidedTaskEngineIntent({
        message,
        originalMessage: options.originalMessage,
        screenPath: options.screenPath,
        sourceScreenPath: options.sourceScreenPath,
        roleMode: options.roleMode,
        userRole: options.userRole,
        conversationState: options.conversationState,
        entityType: options.entityType,
        questionType: '',
      });
      if (guidedTaskMeta?.familyId) {
        return {
          questionType: guidedTaskMeta.questionType || 'OPEN',
          confidence: Number(guidedTaskMeta.confidence || 0.96),
          matchedSignals: Array.isArray(guidedTaskMeta.matchedSignals) ? [...guidedTaskMeta.matchedSignals] : [guidedTaskMeta.familyId || guidedTaskMeta.questionType || 'guided-task'],
          preferRoute: Boolean(guidedTaskMeta.preferRoute),
          routeRequest: Boolean(guidedTaskMeta.routeRequest),
          guidedTaskMeta,
        };
      }
    }
    return {
      questionType: roleQuestion ? 'ROLE_EXPLANATION_HELP' : 'PRODUCT_OVERVIEW_HELP',
      confidence: 0.93,
      matchedSignals: [roleQuestion ? 'ROLE_EXPLANATION_HELP' : 'PRODUCT_OVERVIEW_HELP', 'onboarding-start-guidance'],
      preferRoute: false,
      routeRequest: false,
    };
  }

  if (/(?:vardiya nasıl oluşturulur|vardiya nasil olusturulur|teklif nasıl alınır|teklif nasil alınır|sözleşmeye nasıl geçilir|sozlesmeye nasil gecilir|servisimi nasıl takip ederim|servisimi nasil takip ederim|check-?in nasıl yapılır|check-?in nasil yapilir|nasıl yapılır|nasil yapilir)/.test(combinedText)) {
    return {
      questionType: 'HOW_TO_HELP',
      confidence: 0.95,
      matchedSignals: ['HOW_TO_HELP', 'how-to-help'],
      preferRoute: false,
      routeRequest: false,
    };
  }

  if (
    pathHas(options.screenPath, ['/agreements', '/company/agreements', '/room/agreements', '/school/agreements', '/organization/agreements'])
    && /(rota değişikliği|rota degisikligi|rota güncelleme|rota guncelleme|eski rota|yeni rota|teklif mi|kabul mü|kabul mu|karşı teklif|karsi teklif|uygulanan rota|rota geçmişi|rota gecmisi|room.?a rota güncelleme talebi|room.?a rota guncelleme talebi)/.test(text)
  ) {
    return {
      questionType: 'AGREEMENT_ROUTE_REFRESH',
      confidence: 0.92,
      matchedSignals: ['AGREEMENT_ROUTE_REFRESH', 'agreement-route-refresh-path'],
      preferRoute: false,
      routeRequest: false,
    };
  }

  if (
    pathHas(options.screenPath, ['/agreements', '/company/agreements', '/room/agreements', '/school/agreements', '/organization/agreements'])
    && /(hangi\s+vardiyadan\s+geldi|source\s+lineage|kaynak\s+zinciri|seferpakt\s+kaynaklı|seferpakt\s+kaynakli|mevcut\s+sözleşmeden\s+pay|mevcut\s+sozlesmeden\s+pay|pay\s+alacak\s+mi|pay\s+alacak\s+mı|pay\s+alinır\s+mi|pay\s+alınır\s+mi|pay\s+doğmaz|pay\s+dogmaz)/.test(text)
  ) {
    return {
      questionType: 'MARKETPLACE_FREE_TO_OPERATE_PREVIEW',
      confidence: 0.88,
      matchedSignals: ['MARKETPLACE_FREE_TO_OPERATE_PREVIEW', 'marketplace-source-lineage'],
      preferRoute: false,
      routeRequest: false,
    };
  }

  if (
    pathHas(options.screenPath, ['/agreements', '/company/agreements', '/room/agreements', '/school/agreements', '/organization/agreements'])
    && /(puan|sefer\s*puan[ıi]|kalite\s*puan[ıi]|tedarikç[iı]\s*puan[ıi]|sağlayıc[ıi]\s*puan[ıi]).*(ödeme|odeme|teklif).*(sıralama|siralam|etkili|etkiliyor|etkisi)/.test(text)
  ) {
    return {
      questionType: 'SEFER_SCORE_PREVIEW',
      confidence: 0.88,
      matchedSignals: ['SEFER_SCORE_PREVIEW', 'sefer-score-boundary'],
      preferRoute: false,
      routeRequest: false,
    };
  }

  if (
    pathHas(options.screenPath, ['/agreements', '/company/agreements', '/room/agreements', '/school/agreements', '/organization/agreements'])
    && (
      /(sözleşmeden|sozlesmeden).*(bugün|bugun).*(vardiya|shift).*(üretildi|uretildi|oluştu|olustu)/.test(text)
      || /(bugün|bugun).*(vardiya|shift).*(üretildi|uretildi|oluştu|olustu).*(sözleşme|sozlesme|contract)/.test(text)
      || (pathHas(options.screenPath, ['/room/agreements']) && /(sözleşmeden|sozlesmeden).*(bugün|bugun).*(vardiya|shift).*(üretildi|uretildi|oluştu|olustu)/.test(text))
      || (/(sözleşme|sozlesme|contract)/.test(text) && /(vardiya|shift)/.test(text))
    )
  ) {
    return {
      questionType: pathHas(options.screenPath, ['/room/agreements']) && /(sözleşmeden|sozlesmeden).*(bugün|bugun).*(vardiya|shift).*(üretildi|uretildi|oluştu|olustu)/.test(text)
        ? 'READINESS_CHECK'
        : 'CONTRACT_TO_SHIFT',
      confidence: 0.94,
      matchedSignals: [pathHas(options.screenPath, ['/room/agreements']) && /(sözleşmeden|sozlesmeden).*(bugün|bugun).*(vardiya|shift).*(üretildi|uretildi|oluştu|olustu)/.test(text) ? 'READINESS_CHECK' : 'CONTRACT_TO_SHIFT', 'contract-shift-agreements-path'],
      preferRoute: false,
      routeRequest: false,
    };
  }

  if (
    pathHas(options.screenPath, ['/superadmin/operations', '/superadmin/pilot-launch-gate', '/company/operations', '/school/operations', '/organization/operations'])
    && matchesStandalonePhrase(text, ['ne yapayım', 'ne yapayim', 'şimdi ne yapayım', 'simdi ne yapayim'])
    && !/(yapt[ıi]m\s+de|gerc(?:e)?kten\s+yapma|fake\s+success|sahte\s+basari|olmu[şs]\s+gibi|başarm[ıi]ş\s+gibi|basarm[ıi]s\s+gibi|uydur|rot[aı]y[ıi]\s+uygula|bunu\s+sisteme\s+uygula|bu\s+excel)/.test(text)
  ) {
    return {
      questionType: 'NEXT_STEP',
      confidence: 0.9,
      matchedSignals: ['NEXT_STEP', 'operations-next-step-path'],
      preferRoute: false,
      routeRequest: false,
    };
  }

  if (
    pathHas(options.screenPath, ['/personel/live', '/personel/my', '/parent/live'])
    && /(servis|servisim|öğrencimin servisi|ogrencimin servisi|çocuğumun servisi|cocugumun servisi|konum|gps|harita).*(görünmüyor|gorunmuyor|nerede|yok|ne zaman|geliyor)/.test(text)
  ) {
    return {
      questionType: 'LOCATION_HELP',
      confidence: 0.96,
      matchedSignals: ['LOCATION_HELP', 'live-service-visibility-path'],
      preferRoute: false,
      routeRequest: false,
    };
  }

  if (
    pathHas(options.screenPath, ['/room/shifts'])
    && /(vardiya|shift|görev|gorev|rota|durak).*(başlayamıyor|baslayamiyor|başlamıyor|baslamiyor|başlatamıyor|baslatamiyor|görünmüyor|gorunmuyor|bekliyor|takıldı|takildi|eksik|kapalı|kapali|neden|niye)/.test(text)
  ) {
    return {
      questionType: 'WHY_BLOCKED',
      confidence: 0.9,
      matchedSignals: ['WHY_BLOCKED', 'room-shifts-blocked-surface'],
      preferRoute: false,
      routeRequest: false,
    };
  }

  if (
    pathHas(options.screenPath, ['/company/shifts', '/organization/shifts', '/driver/today', '/driver/route', '/driver/map'])
    && /(vardiya|shift|görev|gorev|rota|durak).*(başlayamıyor|baslayamiyor|başlamıyor|baslamiyor|başlatamıyor|baslatamiyor|görünmüyor|gorunmuyor|bekliyor|takıldı|takildi|eksik|kapalı|kapali|neden|niye)/.test(text)
  ) {
    return {
      questionType: 'SHIFT_BLOCKED',
      confidence: 0.95,
      matchedSignals: ['SHIFT_BLOCKED', 'shift-blocked-surface'],
      preferRoute: false,
      routeRequest: false,
    };
  }

  if (isExplicitNextScreenQuestion(text)) {
    return {
      questionType: 'NEXT_SCREEN',
      confidence: 0.96,
      matchedSignals: ['NEXT_SCREEN', 'explicit-next-screen'],
      preferRoute: true,
      routeRequest: false,
    };
  }

  if (
    hasImperativeNavigation(text)
    && mentionsScreenWord(text)
    && !/(istiyorum|isterim|istiyor|iste[ıi]yorum|yapmak istiyorum|yapmak istiorum|planlamak istiyorum|oluşturmak istiyorum|olusturmak istiyorum|açmak istiyorum|acmak istiyorum|başlatmak istiyorum|baslatmak istiyorum|kurmak istiyorum|hazırlamak istiyorum|hazirlamak istiyorum|adım adım|adim adim|nasıl yaparım|nasil yaparim)/.test(text)
  ) {
    return {
      questionType: 'GO_TO',
      confidence: 0.94,
      matchedSignals: ['GO_TO', 'imperative-go-to'],
      preferRoute: true,
      routeRequest: true,
    };
  }

  if (isShiftReadinessQuestion(text, options.screenPath, options.entityType)) {
    return {
      questionType: pathHas(options.screenPath, ['/room/shifts']) ? 'CONTRACT_TO_SHIFT' : 'READINESS_CHECK',
      confidence: pathHas(options.screenPath, ['/room/shifts']) ? 0.88 : 0.84,
      matchedSignals: [pathHas(options.screenPath, ['/room/shifts']) ? 'CONTRACT_TO_SHIFT' : 'READINESS_CHECK', 'explicit-shift-readiness'],
      preferRoute: false,
      routeRequest: false,
    };
  }

  if (isScreenFocusQuestion(text) || isScreenFocusQuestion(originalText)) {
    return {
      questionType: 'SCREEN_FOCUS',
      confidence: 0.93,
      matchedSignals: ['SCREEN_FOCUS', 'screen-focus-phrase'],
      preferRoute: false,
      routeRequest: false,
    };
  }

  if (isRiskListQuestion(text) || isRiskListQuestion(originalText)) {
    return {
      questionType: 'RISK_LIST',
      confidence: 0.93,
      matchedSignals: ['RISK_LIST', 'risk-list-phrase'],
      preferRoute: false,
      routeRequest: false,
    };
  }

  if (isNextBestActionQuestion(text) || isNextBestActionQuestion(originalText)) {
    const planningSurfacePath = String(options.sourceScreenPath || options.screenPath || '');
    if (isPlanningSurfacePath(planningSurfacePath)) {
      return {
        questionType: 'NEXT_BEST_ACTION',
        confidence: 0.93,
        matchedSignals: ['NEXT_BEST_ACTION', 'next-best-action-phrase'],
        preferRoute: false,
        routeRequest: false,
      };
    }
    return {
      questionType: 'NEXT_STEP',
      confidence: 0.93,
      matchedSignals: ['NEXT_STEP', 'next-best-action-phrase'],
      preferRoute: false,
      routeRequest: false,
    };
  }

  if (isExplicitSafeNextStepQuestion(text)) {
    return {
      questionType: 'SAFE_NEXT_STEP',
      confidence: 0.92,
      matchedSignals: ['SAFE_NEXT_STEP', 'explicit-safe-next-step'],
      preferRoute: false,
      routeRequest: false,
    };
  }
  const shiftSurfacePath = String(options.sourceScreenPath || options.screenPath || '');
  if (isExplicitNextStepQuestion(text) && !pathHas(shiftSurfacePath, ['/company/shifts', '/room/shifts', '/organization/shifts', '/superadmin/operations'])) {
    return {
      questionType: 'NEXT_STEP',
      confidence: 0.92,
      matchedSignals: ['NEXT_STEP', 'explicit-next-step'],
      preferRoute: false,
      routeRequest: false,
    };
  }

  if (isExplicitBadgeHelpQuestion(combinedText)) {
    return {
      questionType: 'BADGE_HELP',
      confidence: 0.9,
      matchedSignals: ['BADGE_HELP', 'explicit-badge-help'],
      preferRoute: false,
      routeRequest: false,
    };
  }

  if (String(options.roleMode || '').toUpperCase() === 'SIMPLE' && /^(şimdi\s+ne\s+yapayım|simdi\s+ne\s+yapayim|ne\s+yapayım|ne\s+yapayim)\??$/i.test(text)) {
    return {
      questionType: 'NEXT_STEP',
      confidence: 0.96,
      matchedSignals: ['NEXT_STEP', 'simple-next-step'],
      preferRoute: false,
      routeRequest: false,
    };
  }

  if (isGenericStatusHelpQuestion(text)) {
    return {
      questionType: 'STATUS_HELP',
      confidence: 0.88,
      matchedSignals: ['STATUS_HELP', 'generic-status-help'],
      preferRoute: false,
      routeRequest: false,
    };
  }

  if (pathHas(options.screenPath, ['/superadmin/commercial-core', '/commercial-core']) && /(csv|taslak|önizleme|onizleme).*(ne\s+işe\s+yarıyor|ne\s+işe\s+yariyor|ne\s+işe\s+yariyor|ne\s+işe\s+yarar|ne\s+için|ne\s+icin|ne\s+demek)/.test(text)) {
    return {
      questionType: 'SCREEN_PURPOSE',
      confidence: 0.82,
      matchedSignals: ['SCREEN_PURPOSE', 'commercial-core-preview-purpose'],
      preferRoute: false,
      routeRequest: false,
    };
  }

  if (
    pathHas(options.screenPath, ['/trust-quality'])
    && /(servis|hizmet)\s+kanıt(?:ı|i).*?(ne\s+işe\s+yarar|ne\s+işe\s+yariyor|ne\s+işe\s+yarıyor|ne\s+demek|ne\s+icin|ne\s+için)|kanıt(?:ı|i)\s+ne\s+işe\s+yarar|kanit(?:i|i)\s+ne\s+ise\s+yarar|kanıt(?:ı|i)\s+ne\s+demek/.test(text)
  ) {
    return {
      questionType: 'SCREEN_PURPOSE',
      confidence: 0.86,
      matchedSignals: ['SCREEN_PURPOSE', 'trust-quality-purpose'],
      preferRoute: false,
      routeRequest: false,
    };
  }

  if (
    pathHas(options.screenPath, ['/organization/shifts'])
    && /(organizasyon\s+plan|organization\s+plan).*(kaynak\s+kanıt|kaynak\s+kanit|sayılır\s+mi|sayilir\s+mi|tek\s+başına|tek\s+basina)|kaynak\s+kanıtı\s+sayılır\s+mi|kaynak\s+kaniti\s+sayilir\s+mi/.test(text)
  ) {
    return {
      questionType: 'PAYMENT_READINESS',
      confidence: 0.84,
      matchedSignals: ['PAYMENT_READINESS', 'organization-plan-source-lineage'],
      preferRoute: false,
      routeRequest: false,
    };
  }

  if (
    pathHas(options.screenPath, ['/organization/shifts'])
    && /(sözleşme|sozlesme).*(vardiya|shift).*(ilişki|iliski|bağlantı|baglanti)/.test(text)
  ) {
    return {
      questionType: 'SCREEN_PURPOSE',
      confidence: 0.86,
      matchedSignals: ['SCREEN_PURPOSE', 'organization-shift-contract-purpose'],
      preferRoute: false,
      routeRequest: false,
    };
  }

  const guidedTaskMeta = detectCopilotGuidedTaskEngineIntent({
    message,
    originalMessage: options.originalMessage,
    screenPath: options.screenPath,
    sourceScreenPath: options.sourceScreenPath,
    roleMode: options.roleMode,
    userRole: options.userRole,
    conversationState: options.conversationState,
    entityType: options.entityType,
    questionType: '',
  });
  if (guidedTaskMeta) {
    return {
      questionType: guidedTaskMeta.questionType || 'OPEN',
      confidence: Number(guidedTaskMeta.confidence || 0.96),
      matchedSignals: Array.isArray(guidedTaskMeta.matchedSignals) ? [...guidedTaskMeta.matchedSignals] : [guidedTaskMeta.familyId || guidedTaskMeta.questionType || 'guided-task'],
      preferRoute: Boolean(guidedTaskMeta.preferRoute),
      routeRequest: Boolean(guidedTaskMeta.routeRequest),
      guidedTaskMeta,
    };
  }
  const helperTopic = detectCopilotEBlockRuntimeAnswerTopic({
    message: [message, options.originalMessage].filter(Boolean).join(' '),
    screenPath: options.screenPath,
  });
  if (helperTopic) {
    return {
      questionType: helperTopic,
      confidence: 0.98,
      matchedSignals: [helperTopic],
      preferRoute: false,
      routeRequest: false,
    };
  }

  const scores = {};
  const signals = {};
  applyRules(text, scores, signals, BASE_RULES);
  applyRules(text, scores, signals, COP02A_GENERAL_RULES);

  if (isDirectScreenSteer(text)) addScore(scores, signals, 'NEXT_SCREEN', 4, 'direct-screen-steer');
  if (/(hangi\s+ekran|hangi\s+menü|nereye\s+geçeyim|nereye\s+gitmeliyim|sonraki\s+ekran)/.test(text)) addScore(scores, signals, 'NEXT_SCREEN', 3, 'route-question');
  if (/(önce|once).*(bak|kontrol)/.test(text) && pathHas(options.screenPath, ['/georeview', '/map', '/live', '/shifts', '/commercial-flow', '/service-evaluation'])) addScore(scores, signals, 'FIRST_CONTROL', 2, 'screen-biased-first-control');
  if (/(sonra|sirada|şimdi).*(ekran|menu|menü|yer|adım|adim)/.test(text) && pathHas(options.screenPath, ['/georeview', '/map', '/live'])) addScore(scores, signals, 'NEXT_SCREEN', 2, 'map-flow-next-screen');
  if (hasImperativeNavigation(text) && mentionsScreenWord(text)) addScore(scores, signals, 'GO_TO', 7, 'imperative-go-to');
  if (/(ilgili\s+yere\s+götür|ilgili\s+yere\s+gotur|ilgili\s+ekrana\s+git|ilgili\s+ekranı\s+aç|ilgili\s+ekrani\s+ac)/.test(text)) addScore(scores, signals, 'GO_TO', 4, 'explicit-go-to');
  if (/(neden).*(pasif|kapalı|kapali|görünmüyor|gorunmuyor|olmuyor)/.test(text)) addScore(scores, signals, 'WHY_BLOCKED', 7, 'blocked-why');
  if (/(hangi\s+alan|hangi\s+eksik|eksik\s+alan)/.test(text)) addScore(scores, signals, 'MISSING_DATA_HELP', 2, 'missing-field-detail');
  if (/(burda\s+ne\s+eksik|burada\s+ne\s+eksik|bu\s+kay[ıi]tta\s+ne\s+eksik|eksik\s+ne\s+var|hangi\s+alan\s+boş|hangi\s+alan\s+bos|eksik\s+veri|hangi\s+veri\s+eksik)/.test(normalizeText(options.originalMessage || ''))) addScore(scores, signals, 'MISSING_DATA_HELP', 15, 'original-missing-data');
  if (pathHas(options.screenPath, ['/room/shifts']) && /(atamaya\s+hazır\s*m[ıi]|atamaya\s+hazir\s*mi)/.test(text)) {
    addScore(scores, signals, 'CONTRACT_TO_SHIFT', 9, 'shift-assignment-ready-contract');
    addScore(scores, signals, 'READINESS_CHECK', -4, 'shift-assignment-ready-readiness-downgrade');
  } else if (/(hazır|hazir).*(mi|mı)/.test(text) && options.entityType === 'shift') {
    addScore(scores, signals, 'READINESS_CHECK', 2, 'shift-readiness-bias');
  }
  if (/(durum|ne\s+durumda|durumu\s+ne)/.test(text) && options.entityType === 'shift') addScore(scores, signals, 'STATUS_HELP', 1, 'shift-status-bias');
  if (/(gps|konum|telefon\s+gps)/.test(text) && options.entityType === 'vehicle') addScore(scores, signals, 'LOCATION_HELP', 2, 'vehicle-location-bias');
  if (pathHas(options.screenPath, ['/commercial-flow', '/commercial-core', '/payment', '/shifts', '/agreements', '/company/agreements', '/room/agreements', '/school/agreements', '/organization/agreements']) && /(hakediş|hakedis|ödeme|odeme|settlement|tahsilat|fatura|önizleme|onizleme|csv|komisyon|ödeme hesabı|odeme hesabi|kanıt|kanit|kanıt|proof|kalite|quality|eksik bilgi|kontrol gerekli|hazır değil|hazir degil|başlatılabilir|baslatilabilir|güvenli|guvenli|etkiliyor|etkisi)/.test(text)) addScore(scores, signals, 'PAYMENT_READINESS', 12, 'payment-readiness-path');
  if (pathHas(options.screenPath, ['/commercial-flow', '/commercial-core', '/payment', '/shifts', '/agreements', '/company/agreements', '/room/agreements', '/school/agreements', '/organization/agreements']) && /(kanıt eksik|kanit eksik|kanıtlar eksik|kanitlar eksik|hakediş eksik|hakedis eksik|ödeme eksik|odeme eksik|neden eksik|hazır değil|hazir degil|kontrol gerekli)/.test(text)) addScore(scores, signals, 'PAYMENT_MISSING', 13, 'payment-missing-path');
  if (pathHas(options.screenPath, ['/agreements', '/company/agreements', '/room/agreements', '/school/agreements', '/organization/agreements', '/commercial-flow', '/commercial-core']) && /(tasarruf|tasarruf önizlemesi|tasarruf onizlemesi|km tasarrufu|süre tasarrufu|sure tasarrufu|yaklaşık maliyet|yaklasik maliyet|maliyet etkisi|readonly tasarruf|readonly önizleme|dinamik tasarruf)/.test(text)) addScore(scores, signals, 'DYNAMIC_SAVINGS_PREVIEW', 15, 'dynamic-savings-path');
  if (pathHas(options.screenPath, ['/agreements', '/company/agreements', '/room/agreements', '/school/agreements', '/organization/agreements', '/commercial-flow', '/commercial-core']) && hasSeferScoreSignal(text)) addScore(scores, signals, 'SEFER_SCORE_PREVIEW', 18, 'sefer-score-path');
  if (pathHas(options.screenPath, ['/personel/live', '/personel/my', '/parent/live']) && hasBoardingChangeRequestEntrySignal(text)) addScore(scores, signals, 'BOARDING_CHANGE_REQUEST_ENTRY', 18, 'boarding-change-request-entry-path');
  if (pathHas(options.screenPath, ['/company/operations', '/school/operations', '/organization/operations', '/room/operation-health', '/room/shifts']) && /(rota etkisi|rota etkisini|önizle|onizle|önizleme|onizleme|etkiyi hesapla|bugün binmezse|bugun binmezse|farklı duraktan|farkli duraktan|geçici durak|gecici durak|biniş değişikliği|binis degisikligi|km farkı|km farki|süre artar mı|sure artar mi|kapasite etkisi|rotasını|rotasini|rotayı|rotayi|rota.*değiştir|rota.*degistir)/.test(text)) addScore(scores, signals, 'BOARDING_ROUTE_IMPACT_PREVIEW', 13, 'boarding-route-impact-preview-path');
  if (pathHas(options.screenPath, ['/agreements', '/company/agreements', '/room/agreements', '/school/agreements', '/organization/agreements']) && /(rota değişikliği|rota degisikligi|rota güncelleme|rota guncelleme|eski rota|yeni rota|teklif mi|kabul mü|kabul mu|karşı teklif|karsi teklif|uygulanan rota|rota geçmişi|rota gecmisi|room.?a rota güncelleme talebi|room.?a rota guncelleme talebi)/.test(text)) addScore(scores, signals, 'AGREEMENT_ROUTE_REFRESH', 20, 'agreement-route-refresh-path');
  if (pathHas(options.screenPath, ['/company/operations', '/school/operations', '/organization/operations', '/room/operation-health', '/room/shifts', '/driver/today', '/driver/route', '/driver/map']) && /(kabul edilen değişikliği uygula|kabul edilen degisikligi uygula|kabul edilen değişikliği işleme al|kabul edilen degisikligi isleme al|günlük atamaya işle|gunluk atamaya işle|günlük atamaya işlen|gunluk atamaya işlen|günlük atamaya işlenebilir|gunluk atamaya işlenebilir|günlük atama etkisi|sürücü rotası yenilenmez|surucu rotasi yenilenmez|kalıcı atama değişmez|kalici atama degismez|sürücü rota ekranında görünür|surucu rota ekraninda gorunur|rota güncellemesi bekliyor|rota guncellemesi bekliyor|günlük değişiklik rotada görünüyor|gunluk degisiklik rotada gorunuyor|sürücüye gönderildi mi|surucuye gonderildi mi|driver route refresh|mobile route update|rotasına yansıdı mı|rotasina yansidi mi|stopassignment|boarding change application|boarding change uygulama)/.test(text)) addScore(scores, signals, 'BOARDING_CHANGE_APPLICATION', 15, 'boarding-change-application-path');
  if (pathHas(options.screenPath, ['/commercial-flow', '/commercial-core', '/payment', '/agreements', '/company/agreements', '/room/agreements', '/school/agreements', '/organization/agreements']) && /(hakediş|hakedis|ödeme|odeme|settlement|tahsilat|fatura|kanıt|kanit|kanıt|proof|csv|önizleme|onizleme|hazır değil|hazir degil|hazırlık|hazirlik|eksik)/.test(text)) addScore(scores, signals, 'READINESS_CHECK', 6, 'commercial-readiness');
    if (pathHas(options.screenPath, ['/superadmin/commercial-core']) && /(sözleşmeden|sozlesmeden).*(bugün|bugun).*(vardiya).*(üretildi|uretildi|oluştu|olustu)/.test(text)) {
      addScore(scores, signals, 'READINESS_CHECK', 12, 'superadmin-commercial-core-contract-shift-readiness');
      addScore(scores, signals, 'CONTRACT_TO_SHIFT', -8, 'superadmin-commercial-core-contract-shift-downgrade');
    }
    if (pathHas(options.screenPath, ['/company/agreements', '/organization/agreements', '/school/agreements']) && /(sözleşme|sozlesme|contract).*(vardiya|shift).*(üretildi|uretildi|oluştu|olustu|oluşturuldu|olusturuldu|üretti|uretti)/.test(text)) {
      addScore(scores, signals, 'CONTRACT_TO_SHIFT', 18, 'agreements-contract-shift-generation');
      addScore(scores, signals, 'READINESS_CHECK', -10, 'agreements-contract-shift-generation-downgrade');
    }
    if (pathHas(options.screenPath, ['/company/agreements', '/organization/agreements', '/school/agreements']) && /(sözleşmeden|sozlesmeden).*(bugün|bugun).*(vardiya).*(üretildi|uretildi|oluştu|olustu|oluşturuldu|olusturuldu)/.test(text)) {
      addScore(scores, signals, 'CONTRACT_TO_SHIFT', 18, 'agreements-contract-shift-today');
      addScore(scores, signals, 'READINESS_CHECK', -10, 'agreements-contract-shift-today-downgrade');
    }
    if (pathHas(options.screenPath, ['/room/agreements']) && /(sözleşmeden|sozlesmeden).*(bugün|bugun).*(vardiya).*(üretildi|uretildi|oluştu|olustu|oluşturuldu|olusturuldu)/.test(text)) {
      addScore(scores, signals, 'READINESS_CHECK', 14, 'room-agreements-contract-readiness');
    }
    if (pathHas(options.screenPath, ['/contracts', '/room/contracts', '/room/commercial-flow', '/commercial-flow']) && /(sözleşme|sozlesme).*(vardiya|shift)/.test(text)) addScore(scores, signals, 'CONTRACT_TO_SHIFT', 18, 'room-commercial-flow-contract-shift');
    if (pathHas(options.screenPath, ['/contracts', '/room/contracts', '/room/commercial-flow', '/commercial-flow']) && /(sözleşmeden|sozlesmeden).*(bugün|bugun).*(vardiya).*(üretildi|uretildi|oluştu|olustu)/.test(text)) addScore(scores, signals, 'CONTRACT_TO_SHIFT', 4, 'room-commercial-flow-contract-shift-today');
    if (pathHas(options.screenPath, ['/contracts', '/room/contracts', '/room/commercial-flow', '/commercial-flow']) && /(bugün|bugun).*(vardiya).*(üretildi|uretildi|oluştu|olustu).*(sözleşme|sozlesme)/.test(text)) addScore(scores, signals, 'CONTRACT_TO_SHIFT', 4, 'room-commercial-flow-contract-shift-today-reverse');
    if (pathHas(options.screenPath, ['/shifts']) && /(sözleşmeden|sozlesmeden|vardiya üretildi|vardiya uretildi|üretildi mi|uretildi mi|bugün vardiya|bugun vardiya)/.test(text)) addScore(scores, signals, 'READINESS_CHECK', 6, 'contract-shift-readiness');
    if (pathHas(options.screenPath, ['/superadmin/operations']) && /(başlayamıyor|baslayamiyor|başlamıyor|baslamiyor|sorun ne|sorunu ne|neyde sorun var|neyde sorun|operasyon sağlığı sorun ne|operasyon sagligi sorun ne)/.test(text)) addScore(scores, signals, 'WHY_BLOCKED', 9, 'operations-start-blocked');
    if (pathHas(options.screenPath, ['/operation-health', '/room/operation-health']) && /(sorun ne|sorunu ne|neyde sorun var|neyde sorun|operasyon sağlığı sorun ne|operasyon sagligi sorun ne)/.test(text)) addScore(scores, signals, 'WHY_BLOCKED', 12, 'operation-health-why');
  if (pathHas(options.screenPath, ['/trust-quality']) && /(kalite puanı|kalite puani|quality score|kalite akışı|kalite akisi|servis kanıtı|servis kaniti|hizmet kanıtı|hizmet kaniti|denetim izi|taslak skor|inceleme kararı|inceleme karari|kesin mi|net mi|tam mı|tam mi)/.test(text)) addScore(scores, signals, 'SCREEN_PURPOSE', 15, 'trust-quality-purpose');
  if (pathHas(options.screenPath, ['/trust-quality']) && /(sağlayıcı|saglayici|provider).*(daha iyi|daha güçlü|daha guclu|neden|karşılaştır|karsilastir)/.test(text)) addScore(scores, signals, 'WHY_BLOCKED', 5, 'trust-quality-quality-signal');
    if (pathHas(options.screenPath, ['/room/map', '/room/live', '/company/live', '/organization/live', '/school/live', '/driver/map', '/driver/live', '/vehicles']) && /(haritada|konum|gps)/.test(text)) {
      addScore(scores, signals, 'LOCATION_HELP', 12, 'map-vehicle-location');
      addScore(scores, signals, 'WHY_BLOCKED', -8, 'map-vehicle-not-generic-blocked');
    }
    if (pathHas(options.screenPath, ['/personel/live', '/parent/live']) && /(servisim nerede|servisi nerede|öğrencimin servisi nerede|ogrencimin servisi nerede|çocuğumun servisi nerede|cocugumun servisi nerede|canlı servis nerede|canli servis nerede)/.test(text)) {
      addScore(scores, signals, 'LOCATION_HELP', 18, 'live-service-location');
      addScore(scores, signals, 'WHY_BLOCKED', -8, 'live-service-location-not-why-blocked');
      addScore(scores, signals, 'STATUS_HELP', -3, 'live-service-location-not-status');
    }
    if (pathHas(options.screenPath, ['/personel/my', '/personel/live']) && /(servis|servisim|araç|arac|gps|konum|durak|eta).*(görünmüyor|gorunmuyor|nerede|yok|ne zaman|geliyor|bekliyor)/.test(text)) {
      addScore(scores, signals, 'LOCATION_HELP', 18, 'personel-service-visibility');
      addScore(scores, signals, 'WHY_BLOCKED', -10, 'personel-service-visibility-not-why-blocked');
      addScore(scores, signals, 'STATUS_HELP', -2, 'personel-service-visibility-not-status');
    }
    if (pathHas(options.screenPath, ['/parent/live']) && /(servis|öğrencimin servisi|ogrencimin servisi|çocuğumun servisi|cocugumun servisi|araç|arac|gps|konum|durak|eta).*(görünmüyor|gorunmuyor|nerede|yok|ne zaman|geliyor|bekliyor)/.test(text)) {
      addScore(scores, signals, 'LOCATION_HELP', 18, 'parent-service-visibility');
      addScore(scores, signals, 'WHY_BLOCKED', -10, 'parent-service-visibility-not-why-blocked');
      addScore(scores, signals, 'STATUS_HELP', -2, 'parent-service-visibility-not-status');
    }
    if (pathHas(options.screenPath, ['/driver/today', '/driver/route']) && /(görev|gorev|rota|durak|başlatma|baslatma|kanıt|kanit|operasyon|gps|konum).*(başlamıyor|baslamiyor|başlayamıyor|baslayamiyor|görünmüyor|gorunmuyor|yok|bekliyor|eksik|ne eksik|neden)/.test(text)) {
      addScore(scores, signals, 'SHIFT_BLOCKED', 18, 'driver-task-blocked');
      addScore(scores, signals, 'WHY_BLOCKED', -10, 'driver-task-blocked-not-why-blocked');
      addScore(scores, signals, 'SCREEN_PURPOSE', -4, 'driver-task-blocked-not-purpose');
    }
    if (pathHas(options.screenPath, ['/driver/map']) && /(haritada|konum|gps|araç|arac|rota|durak).*(görünmüyor|gorunmuyor|nerede|yok|bekliyor|gecik|gecikiyor|eski|stale)/.test(text)) {
      addScore(scores, signals, 'LOCATION_HELP', 18, 'driver-map-location');
      addScore(scores, signals, 'WHY_BLOCKED', -8, 'driver-map-location-not-why-blocked');
      addScore(scores, signals, 'WHY_BLOCKED', -4, 'driver-map-location-not-blocked');
    }
    if (pathHas(options.screenPath, ['/shared/feedback']) && /(geri bildirim|feedback).*(açık|acik|kritik|çözüldü|cozuldu|kapandı|kapandi|sorumlu|yıldız|yildiz)/.test(text)) addScore(scores, signals, 'STATUS_HELP', 5, 'feedback-status');
    if (pathHas(options.screenPath, ['/shared/notifications']) && /(hangi olaydan|nereden geldi|kaynak|neden geldi|bu bildirim)/.test(text)) addScore(scores, signals, 'STATUS_HELP', 5, 'notification-source');
    if (pathHas(options.screenPath, ['/shared/kvkk']) && /(görünmüyor|gorunmuyor|görünürlük|gorunurluk|kim görebilir|kim gorebilir|hangi rol)/.test(text)) addScore(scores, signals, 'WHY_BLOCKED', 6, 'kvkk-visibility');
    if (pathHas(options.screenPath, ['/shared/feedback']) && /(hangi kayıt|hangi kayit|bu kayıt kimde|sorumlu kim|kim yapabilir)/.test(text)) addScore(scores, signals, 'ROLE_HELP', 4, 'feedback-ownership');
    if (/(konum|gps|telefon\s+gps).*(neden).*(görünmüyor|gorunmuyor|gecik|gecikiyor|yok)/.test(text) && options.entityType === 'vehicle') {
    addScore(scores, signals, 'LOCATION_HELP', 6, 'vehicle-location-diagnosis');
    addScore(scores, signals, 'WHY_BLOCKED', -2, 'vehicle-location-not-generic-blocked');
  }
  if (pathHas(options.screenPath, ['/operation-health', '/observability', '/trust-quality']) && /(sorun ne|sorunu ne|ne sorun|problem ne|neden|niye).*(sorunlu|riskli|uyarı|uyari|kırmızı|kirmizi|zayıf|zayif|gecik|gecikme|yok)/.test(text)) addScore(scores, signals, 'WHY_BLOCKED', 6, 'health-risk-why');
  if (pathHas(options.screenPath, ['/trust-quality'])) {
    // Trust-quality keeps the legacy quality-signal flow; Sefer preview is restricted to agreements/commercial surfaces.
    addScore(scores, signals, 'SEFER_SCORE_PREVIEW', -100, 'trust-quality-sefer-suppression');
  }
  if (pathHas(options.screenPath, ['/personel/my', '/personel/live', '/parent/live', '/driver/route', '/driver/today', '/driver/map']) && /(şimdi|simdi|bundan sonra|sonra).*(ne yap|nereye|neye bak)/.test(text)) {
    addScore(scores, signals, 'NEXT_STEP', 5, 'simple-flow-next-step');
    addScore(scores, signals, 'SCREEN_PURPOSE', -2, 'simple-flow-not-purpose');
  }
  if (/(neden|farkı|farki|ne\s+demek)/.test(text) && pathHas(options.screenPath, ['/agreements', '/hub', '/school/parents', '/access-links', '/checkin', '/notifications', '/logs', '/operation-verification', '/acceptance', '/trust-quality', '/observability'])) addScore(scores, signals, 'SCREEN_PURPOSE', 1, 'special-screen-purpose');
  if (pathHas(options.screenPath, ['/trust-quality']) && /(sağlayıcı|saglayici).*(daha iyi|daha güçlü|daha guclu|neden|karşılaştır|karsilastir)/.test(text)) addScore(scores, signals, 'WHY_BLOCKED', 4, 'trust-quality-provider-comparison');

  const shortFollowUp = isShortFollowUp(text) || isShortFollowUp(options.originalMessage || '');
  const prevType = lastQuestionType(options.conversationState);
  if (shortFollowUp && prevType) {
    const followUpText = normalizeLooseText(options.originalMessage || text);
    if (/(girdim|içine girdim|icine girdim|açtım|actim|geldim|ulaştım|ulastim|ekrana girdim)/.test(followUpText)) {
      return {
        questionType: ['NEXT_SCREEN', 'GO_TO'].includes(prevType) ? 'FIRST_CONTROL' : 'NEXT_STEP',
        confidence: 0.95,
        matchedSignals: ['NEXT_STEP', 'follow-up-entered'],
        preferRoute: false,
        routeRequest: false,
      };
    }
    if (/(yaptım|yaptim|tamamladım|tamamladim|denedim|kontrol ettim|işledim|isledim)/.test(followUpText)) {
      return {
        questionType: ['RESULT_CHECK', 'READINESS_CHECK'].includes(prevType) ? 'READINESS_CHECK' : 'NEXT_STEP',
        confidence: 0.94,
        matchedSignals: ['READINESS_CHECK', 'follow-up-result'],
        preferRoute: false,
        routeRequest: false,
      };
    }
    if (/(bulamadım|bulamadim|bulamıyorum|bulamiyorum|göremedim|goremedim|nerede|hangi\s+menü|hangi\s+menu|alternatif\s+yol|menü\s+yolu|menu\s+yolu)/.test(followUpText)) {
      return {
        questionType: 'NEXT_SCREEN',
        confidence: 0.93,
        matchedSignals: ['NEXT_SCREEN', 'follow-up-missing'],
        preferRoute: true,
        routeRequest: false,
      };
    }
    if (/(devam\s+et|aynı\s+kayıtta|ayni\s+kayitta|aynı\s+yerden\s+devam|ayni\s+yerden\s+devam|sürdür|surdur|buradan\s+devam|aynı\s+kayıt\s+için\s+devam|ayni\s+kayit\s+icin\s+devam)/.test(followUpText)) {
      return {
        questionType: ['NEXT_SCREEN', 'GO_TO'].includes(prevType) ? 'FIRST_CONTROL' : 'NEXT_STEP',
        confidence: 0.94,
        matchedSignals: ['NEXT_STEP', 'follow-up-continue'],
        preferRoute: false,
        routeRequest: false,
      };
    }
    if (/(girdim|içine girdim|icine girdim|açtım|actim|geldim|ulaştım|ulastim|ekrana girdim)/.test(text)) {
      if (['NEXT_STEP', 'FIRST_CONTROL', 'SCREEN_PURPOSE', 'STATUS_HELP', 'READINESS_CHECK', 'WHY_BLOCKED'].includes(prevType)) addScore(scores, signals, 'NEXT_STEP', 7, `follow-up-entered:${prevType}`);
      if (['NEXT_SCREEN', 'GO_TO'].includes(prevType)) addScore(scores, signals, 'FIRST_CONTROL', 5, `follow-up-entered-route:${prevType}`);
    }
    if (/(yaptım|yaptim|tamamladım|tamamladim|denedim|kontrol ettim|işledim|isledim)/.test(text)) {
      if (['RESULT_CHECK', 'READINESS_CHECK', 'NEXT_STEP', 'WHY_BLOCKED'].includes(prevType)) addScore(scores, signals, 'READINESS_CHECK', 7, `follow-up-result:${prevType}`);
      if (['RESULT_CHECK', 'NEXT_STEP', 'READINESS_CHECK'].includes(prevType)) addScore(scores, signals, 'NEXT_STEP', 4, `follow-up-result-next:${prevType}`);
    }
    if (/(bulamadım|bulamadim|bulamıyorum|bulamiyorum|göremedim|goremedim|nerede|hangi\s+menü|hangi\s+menu|alternatif\s+yol|menü\s+yolu|menu\s+yolu)/.test(text)) {
      if (['NEXT_STEP', 'FIRST_CONTROL', 'SCREEN_PURPOSE', 'NEXT_SCREEN', 'GO_TO', 'STATUS_HELP'].includes(prevType)) addScore(scores, signals, 'NEXT_SCREEN', 7, `follow-up-missing:${prevType}`);
      if (['NEXT_SCREEN', 'GO_TO', 'FIRST_CONTROL'].includes(prevType)) addScore(scores, signals, 'FIRST_CONTROL', 4, `follow-up-missing-control:${prevType}`);
    }
    if (/(peki|tamam|o zaman|devam|sonra|simdi|şimdi|ee sonra)/.test(text)) {
      if (['WHY_BLOCKED', 'STATUS_HELP', 'READINESS_CHECK', 'FIRST_CONTROL', 'SCREEN_PURPOSE', 'ROLE_HELP', 'NEXT_STEP'].includes(prevType)) addScore(scores, signals, 'NEXT_STEP', 6, `follow-up-next:${prevType}`);
      if (['NEXT_SCREEN', 'GO_TO'].includes(prevType)) addScore(scores, signals, 'FIRST_CONTROL', 5, `follow-up-first-control:${prevType}`);
    }
    if (/^(neden|niye)\??$/.test(text) || /(neden böyle|neden boyle|niye böyle|niye boyle)/.test(text)) {
      addScore(scores, signals, 'WHY_BLOCKED', 7, `follow-up-why:${prevType}`);
      addScore(scores, signals, 'STATUS_HELP', -2, 'follow-up-why-not-status');
    }
    if (/(bunda|burada|aynı kayıtta|ayni kayitta|bu kayıtta|bu kayitta)/.test(text)) {
      if (['STATUS_HELP', 'READINESS_CHECK', 'WHY_BLOCKED'].includes(prevType)) addScore(scores, signals, prevType, 4, `same-record-follow-up:${prevType}`);
      else addScore(scores, signals, 'STATUS_HELP', 3, `same-record-fallback:${prevType}`);
    }
  }

  if (hasImperativeNavigation(text) && !mentionsScreenWord(text)) {
    addScore(scores, signals, 'GO_TO', -4, 'go-to-without-screen-word');
  }
  if (/(bu\s+buton\s+ne\s+yapar|hangi\s+buton|hangi\s+düğme|hangi\s+dugme)/.test(text)) addScore(scores, signals, 'BUTTON_HELP', 3, 'button-direct');
  if (/(ne\s+değişti|ne\s+degisti)/.test(text)) addScore(scores, signals, 'STATUS_HELP', -2, 'changed-not-status');
  if (/(hangi\s+ekran|sonraki\s+ekran|nereye\s+geçeyim)/.test(text)) addScore(scores, signals, 'GO_TO', -2, 'route-question-not-go-to');
  if (/(ne\s+demek|anlamı|anlami|farkı\s+ne|farki\s+ne)/.test(text)) addScore(scores, signals, 'NEXT_STEP', -2, 'term-not-next-step');
  if (/(buton|düğme|dugme)/.test(text) && /(neden).*?(kapalı|kapali|pasif|görünmüyor|gorunmuyor|olmuyor)/.test(text)) addScore(scores, signals, 'BUTTON_HELP', -5, 'blocked-over-button');

  if (!Object.keys(scores).length) {
    if (options.entityType === 'vehicle') addScore(scores, signals, 'LOCATION_HELP', 3, 'vehicle-default');
    else if (options.entityType === 'shift') addScore(scores, signals, 'STATUS_HELP', 3, 'shift-default');
    else addScore(scores, signals, 'SCREEN_PURPOSE', 3, 'screen-default');
  }

  let bestType = 'OPEN';
  let bestScore = -Infinity;
  for (const type of INTENT_PRIORITY) {
    const score = Number(scores[type] || 0);
    if (score > bestScore) {
      bestType = type;
      bestScore = score;
    }
  }

  if (isDirectScreenSteer(text) && mentionsScreenWord(text) && !['NEXT_SCREEN', 'GO_TO'].includes(bestType)) {
    bestType = 'NEXT_SCREEN';
    bestScore = Math.max(bestScore, 11);
    signals.NEXT_SCREEN = uniqueStrings([...(signals.NEXT_SCREEN || []), 'direct-screen-route-override']);
  }

  if (bestScore <= 0) {
    if (options.entityType === 'vehicle') bestType = 'LOCATION_HELP';
    else if (options.entityType === 'shift') bestType = 'STATUS_HELP';
    else bestType = 'SCREEN_PURPOSE';
    bestScore = 3;
  }

  return {
    questionType: bestType,
    confidence: computeConfidence(bestScore),
    matchedSignals: Array.from(new Set(signals[bestType] || [])).slice(0, 4),
    preferRoute: bestType === 'NEXT_SCREEN' || bestType === 'GO_TO' || isDirectScreenSteer(text),
    routeRequest: hasImperativeNavigation(text) && mentionsScreenWord(text),
  };
}
export function detectQuestionType(message, entityTypeOrOptions = 'screen', screenPath = '') {
  return detectQuestionIntent(message, entityTypeOrOptions, screenPath).questionType;
}

export function resolveReplyMode(message, questionType, roleMode = 'OPERATIONS', guidedTaskMeta = null) {
  const text = normalizeText(message);
  if (guidedTaskMeta?.guideLevel) return guidedTaskMeta.guideLevel;
  const helperTopicMeta = getCopilotEBlockRuntimeAnswerTopicMeta(String(questionType || detectCopilotEBlockRuntimeAnswerTopic({ message }) || ''));
  if (helperTopicMeta?.guideLevel) return helperTopicMeta.guideLevel;
  if (questionType === 'HOW_TO_HELP') return 'STEP_BY_STEP';
  if (questionType === 'DETAIL_FLOW' || hasAny(text, ['adım adım', 'adim adim', 'madde madde', 'tek tek'])) return 'STEP_BY_STEP';
  if (questionType === 'WHY_BLOCKED' || hasAny(text, ['neden'])) return 'WHY';
  if (roleMode === 'SIMPLE' && questionType !== 'TERM_HELP') return 'SHORT';
  return 'SHORT';
}

function simpleScreenChipsByPath(screenPath = '', questionType = 'OPEN') {
  const workflowQuestionTypes = new Set(['WHY_BLOCKED', 'READINESS_CHECK', 'SHIFT_BLOCKED', 'PAYMENT_READINESS', 'PAYMENT_MISSING', 'CONTRACT_TO_SHIFT', 'CONTRACT_SHIFT_TODAY', 'QUALITY_SIGNAL', 'SEFER_SCORE_PREVIEW', 'MARKETPLACE_FREE_TO_OPERATE_PREVIEW', 'FEEDBACK_STATUS', 'NOTIFICATION_SOURCE', 'KVKK_VISIBILITY', 'DRIVER_PHONE_GPS', 'BOARDING_CHANGE_REQUEST_ENTRY', 'BOARDING_CHANGE_APPLICATION', 'BOARDING_ROUTE_IMPACT_PREVIEW', 'DYNAMIC_SAVINGS_PREVIEW', 'WHO_CAN_DO', 'NEXT_STEP', 'NEXT_SCREEN', 'SAFE_NEXT_STEP', 'MISSING_DATA', 'STATUS_HELP', 'FIRST_CONTROL', 'LOCATION_HELP', 'SCREEN_FOCUS', 'RISK_LIST', 'NEXT_BEST_ACTION', ...COPILOT_E_BLOCK_RUNTIME_ANSWER_TOPICS]);
  const workflowQuestion = workflowQuestionTypes.has(String(questionType || ''));
  if (workflowQuestion) {
    const chips = filterWorkflowGenericChips(workflowTopicChipSet({ activeTopic: questionType, questionType, screenPath }), { activeTopic: questionType, questionType });
    if (chips.length) return chips.slice(0, 4);
  }
  if (pathHas(screenPath, ['/driver/today'])) {
    return workflowQuestion ? ['Bugünkü görevleri göster', 'Rota ne durumda?', 'Bildirimleri göster', 'PIN/GPS sınırı nedir?'] : ['Bu ekranı detaylı anlat', 'Ne yapayım?', 'GPS bekleniyor', 'Eksik veri'];
  }
  if (pathHas(screenPath, ['/personel/live'])) {
    if (String(questionType || '') === 'BOARDING_CHANGE_REQUEST_ENTRY') {
      return ['Bugün binmeyeceğim talebi oluştur', 'Konumumu al', 'Büyük haritada konum seç', 'Adresten konum bul'];
    }
    return workflowQuestion ? ['Servis durumunu göster', 'Servis durumu ne?', 'Bildirim kaynağı', 'Biniş değişikliği var mı?'] : ['Bu ekranı detaylı anlat', 'Servis durumunu göster', 'Bildirim kaynağı', 'Eksik veri'];
  }
  if (pathHas(screenPath, ['/parent/live'])) {
    if (String(questionType || '') === 'BOARDING_CHANGE_REQUEST_ENTRY') {
      return ['Çocuğum bugün binmeyecek', 'Çocuğum başka duraktan binecek', 'Çocuğum şu konumdan alınsın', 'Konumumu al'];
    }
    return workflowQuestion ? ['Servis durumunu göster', 'Servis durumu ne?', 'Bildirim kaynağı', 'Biniş değişikliği var mı?'] : ['Bu ekranı detaylı anlat', 'Servis durumunu göster', 'Bildirim kaynağı', 'Eksik veri'];
  }
  if (pathHas(screenPath, ['/room/map'])) {
    return ['Son GPS ne zaman geldi?', "Sürücünün telefon GPS’i devrede mi?", 'Araç bağlantısı var mı?', 'Canlı takip ekranını aç'];
  }
  if (pathHas(screenPath, ['/room/operation-health'])) {
    return ['Riskli cihazı göster', 'GPS güncel değil / çevrim dışı satırını aç', 'Açık sorunları sırala', 'Aktif sürücüleri kontrol et'];
  }
  if (pathHas(screenPath, ['/room/shifts'])) {
    return ['Başlatma zamanı uygun mu?', 'Araç/sürücü bağlantısını kontrol et', 'Rota/durak hazır mı?', 'GPS/operasyon kanıtını kontrol et'];
  }
  if (pathHas(screenPath, ['/room/drivers'])) {
    return ['Aktif sürücüler kim?', 'Görev bağlantısı var mı?', 'Sürücü durumunu açıkla', 'Bu kayıtta kim görevli?'];
  }
  if (pathHas(screenPath, ['/shared/feedback'])) {
    return ['Bu kayıt kimde?', 'Açık kayıt var mı?', 'Kritik geri bildirim var mı?', 'Sorumlu rol kim?'];
  }
  if (pathHas(screenPath, ['/shared/kvkk'])) {
    return ['Bu bilgi neden görünmüyor?', 'Hangi rol görebilir?', 'KVKK sınırı ne?', 'Yetki sınırı'];
  }
  if (pathHas(screenPath, ['/shared/notifications'])) {
    return ['Bildirim kaynağını göster', 'İlgili kaydı aç', 'Okunmamış bildirimleri göster', 'Açık bildirimi göster'];
  }
  if (pathHas(screenPath, ['/room/commercial-flow'])) {
    return ['Üretim geçmişini göster', 'İlgili sözleşmeyi aç', 'Bugünkü vardiyaları göster', 'Üretim durumunu açıkla'];
  }
  if (pathHas(screenPath, ['/superadmin/operations'])) {
    return ['Başlatma zamanı uygun mu?', 'Araç/sürücü bağlantısını kontrol et', 'Rota/durak hazır mı?', 'GPS/operasyon kanıtını kontrol et'];
  }
  if (pathHas(screenPath, ['/superadmin/commercial-core'])) {
    return ['Hakediş eksiklerini göster', 'Ödeme hesabı var mı?', 'Komisyon durumu ne?', 'Hakediş önizlemesini aç'];
  }
  if (pathHas(screenPath, ['/georeview'])) {
    return ['Konum İncele akışını aç', 'OSRM nedir?', 'Matrix nedir?', 'İlgili harita görünümünü aç'];
  }
  if (pathHas(screenPath, ['/commercial-flow', '/service-evaluation', '/shifts'])) {
    return ['Başlatma zamanı uygun mu?', 'Araç/sürücü bağlantısını kontrol et', 'GPS/operasyon kanıtını kontrol et', 'Rota/durak hazır mı?'];
  }
  if (pathHas(screenPath, ['/agreements'])) {
    if (String(questionType || '') === 'MARKETPLACE_FREE_TO_OPERATE_PREVIEW') {
      return ['Lisans ücreti var mı?', 'Bu sözleşmeden SeferPakt pay alacak mı?', 'Başarı payı neden 0 görünüyor?', 'Bu sözleşme SeferPakt kaynaklı mı?', 'Kaynak vardiyası var mı?', 'Organizasyon planı tek başına kaynak kanıtı sayılır mı?'];
    }
    if (String(questionType || '') === 'AGREEMENT_ROUTE_REFRESH') {
      return ['Bu sözleşmede rota değişikliği var mı?', 'Room’a rota güncelleme talebi gitti mi?', 'Eski rota ile yeni rota farkı ne?', 'Teklif mi, kabul mü?'];
    }
    return ['İlgili sözleşmeyi aç', 'Üretim geçmişini göster', 'Bugünkü vardiyaları göster', 'Üretim durumunu açıkla'];
  }
  if (pathHas(screenPath, ['/operation-verification', '/acceptance', '/trust-quality', '/observability'])) {
    return ['İlgili kontrol kartını aç', 'Bu ne demek?', 'Sıradaki adımı göster', 'İlgili yere götür'];
  }
  if (pathHas(screenPath, ['/hub'])) {
    return ['Hub akışını aç', 'Inbound akışını göster', 'Outbound akışını göster', 'Sonraki adımı göster'];
  }
  if (pathHas(screenPath, ['/notifications'])) {
    return ['Bildirim kaynağını göster', 'İlgili kaydı aç', 'Okunmamış bildirimleri göster', 'Açık bildirimi göster'];
  }
  if (pathHas(screenPath, ['/logs'])) {
    return ['İşlem kaydını aç', 'Bildirim kaydıyla farkı göster', 'İlgili yere git', 'Sıradaki adımı göster'];
  }
  if (pathHas(screenPath, ['/checkin'])) {
    return ['Check-in akışını aç', 'Bu ekranın amacını göster', 'Sıradaki adımı göster', 'Bu rolde ne yapabilirim?'];
  }
  if (pathHas(screenPath, ['/today', '/live', '/my', '/route', '/map'])) {
    return workflowQuestion ? ['Sonraki adımı göster', 'Bu ne demek?', 'Bu rolde ne yapabilirim?', 'İlgili kaydı aç'] : ['Bu ekranı detaylı anlat', 'Sonraki adımı göster', 'Bu ne demek?', 'Bu rolde ne yapabilirim?'];
  }
  return ['Bu ekranı detaylı anlat', 'İlk neye bakayım?', 'Burada eksik ne olabilir?', 'Hangi ekrana geçmeliyim?'];
}

function screenChipsByPath(screenPath = '', roleMode = 'OPERATIONS', questionType = 'OPEN') {
  const workflowQuestionTypes = new Set(['WHY_BLOCKED', 'READINESS_CHECK', 'SHIFT_BLOCKED', 'PAYMENT_READINESS', 'PAYMENT_MISSING', 'CONTRACT_TO_SHIFT', 'CONTRACT_SHIFT_TODAY', 'QUALITY_SIGNAL', 'SEFER_SCORE_PREVIEW', 'MARKETPLACE_FREE_TO_OPERATE_PREVIEW', 'FEEDBACK_STATUS', 'NOTIFICATION_SOURCE', 'KVKK_VISIBILITY', 'DRIVER_PHONE_GPS', 'BOARDING_CHANGE_REQUEST_ENTRY', 'BOARDING_CHANGE_APPLICATION', 'BOARDING_ROUTE_IMPACT_PREVIEW', 'DYNAMIC_SAVINGS_PREVIEW', 'WHO_CAN_DO', 'NEXT_STEP', 'NEXT_SCREEN', 'SAFE_NEXT_STEP', 'MISSING_DATA', 'STATUS_HELP', 'FIRST_CONTROL', 'LOCATION_HELP', 'SCREEN_FOCUS', 'RISK_LIST', 'NEXT_BEST_ACTION', ...COPILOT_E_BLOCK_RUNTIME_ANSWER_TOPICS]);
  const workflowQuestion = workflowQuestionTypes.has(String(questionType || ''));
  if (workflowQuestion) {
    const chips = filterWorkflowGenericChips(workflowTopicChipSet({ activeTopic: questionType, questionType, screenPath }), { activeTopic: questionType, questionType });
    if (chips.length) return Array.from(new Set(chips)).slice(0, roleMode === 'SIMPLE' ? 4 : 6);
  }
  const chips = [];
  if (pathHas(screenPath, ['/driver/today'])) {
    chips.push(...(workflowQuestion ? ['Bugünkü görevleri göster', 'Rota ne durumda?', 'Bildirimleri göster', 'PIN/GPS sınırı nedir?'] : ['Bu ekranı detaylı anlat', 'Ne yapayım?', 'GPS bekleniyor', 'Eksik veri', 'Yetki sınırı']));
  } else if (pathHas(screenPath, ['/personel/live'])) {
    chips.push(...(String(questionType || '') === 'BOARDING_CHANGE_REQUEST_ENTRY'
      ? ['Bugün binmeyeceğim talebi oluştur', 'Konumumu al', 'Büyük haritada konum seç', 'Adresten konum bul']
      : workflowQuestion ? ['Servis durumunu göster', 'Servis durumu ne?', 'Bildirim kaynağı', 'Biniş değişikliği var mı?'] : ['Bu ekranı detaylı anlat', 'Servis durumunu göster', 'Bildirim kaynağı', 'Eksik veri']));
  } else if (pathHas(screenPath, ['/parent/live'])) {
    chips.push(...(String(questionType || '') === 'BOARDING_CHANGE_REQUEST_ENTRY'
      ? ['Çocuğum bugün binmeyecek', 'Çocuğum başka duraktan binecek', 'Çocuğum şu konumdan alınsın', 'Konumumu al']
      : workflowQuestion ? ['Servis durumunu göster', 'Servis durumu ne?', 'Bildirim kaynağı', 'Biniş değişikliği var mı?'] : ['Bu ekranı detaylı anlat', 'Servis durumunu göster', 'Bildirim kaynağı', 'Eksik veri']));
  } else if (pathHas(screenPath, ['/room/map'])) {
    chips.push(...(workflowQuestion ? ['Son GPS ne zaman geldi?', "Sürücünün telefon GPS’i devrede mi?", 'Araç bağlantısı var mı?', 'Canlı takip ekranını aç'] : ['Bu ekranı detaylı anlat', 'Son GPS ne zaman geldi?', "Sürücünün telefon GPS’i devrede mi?", 'Araç bağlantısı var mı?', 'Canlı takip ekranını aç']));
  } else if (pathHas(screenPath, ['/room/operation-health'])) {
    chips.push('Riskli cihazı göster', 'GPS güncel değil / çevrim dışı satırını aç', 'Açık sorunları sırala', 'Aktif sürücüleri kontrol et');
  } else if (pathHas(screenPath, ['/room/shifts'])) {
    chips.push('Başlatma zamanı uygun mu?', 'Araç/sürücü bağlantısını kontrol et', 'Rota/durak hazır mı?', 'GPS/operasyon kanıtını kontrol et');
  } else if (pathHas(screenPath, ['/superadmin/operations'])) {
    chips.push('Başlatma zamanı uygun mu?', 'Araç/sürücü bağlantısını kontrol et', 'Rota/durak hazır mı?', 'GPS/operasyon kanıtını kontrol et');
  } else if (pathHas(screenPath, ['/superadmin/commercial-core'])) {
    chips.push('Hakediş eksiklerini göster', 'Ödeme hesabı var mı?', 'Komisyon durumu ne?', 'Hakediş önizlemesini aç');
  } else if (pathHas(screenPath, ['/room/commercial-flow'])) {
    chips.push('Üretim geçmişini göster', 'İlgili sözleşmeyi aç', 'Bugünkü vardiyaları göster', 'Üretim durumunu açıkla');
  } else if (pathHas(screenPath, ['/shared/feedback'])) {
    chips.push('Bu ekranı detaylı anlat', 'Açık geri bildirimi göster', 'Kritik geri bildirimleri sırala', 'Sorumlu rolü göster', 'Geri bildirim açık');
  } else if (pathHas(screenPath, ['/shared/kvkk'])) {
    chips.push('Bu bilgi neden görünmüyor?', 'Hangi rol görebilir?', 'KVKK sınırı ne?', 'Yetki sınırı');
  } else if (pathHas(screenPath, ['/shared/notifications'])) {
    chips.push('Bildirim kaynağını göster', 'İlgili kaydı aç', 'Okunmamış bildirimleri göster', 'Açık bildirimi göster');
  } else if (pathHas(screenPath, ['/shared/logs'])) {
    chips.push('Bu ekranı detaylı anlat', 'İşlem kaydını aç', 'Bildirim kaydıyla farkı göster', 'Sıradaki adımı göster');
  } else if (pathHas(screenPath, ['/room/drivers'])) {
    chips.push('Bu ekranı detaylı anlat', 'Aktif sürücüler kim?', 'Görev bağlantısı var mı?', 'Sürücü durumunu açıkla', 'İlgili yere götür');
  } else if (pathHas(screenPath, ['/room/reports'])) {
    chips.push('Bu ekranı detaylı anlat', 'Hangi rapora bakmalıyım?', 'Filtreleri nasıl kullanırım?');
  } else if (pathHas(screenPath, ['/company/operations', '/school/operations', '/organization/operations'])) {
    chips.push('Bu ekranı detaylı anlat', 'Açık talep var mı?', 'Kim onaylayacak?', 'Eksik veri', 'Yetki sınırı');
  } else if (pathHas(screenPath, ['/driver/change-pin'])) {
    chips.push('Bu ekranı detaylı anlat', 'PIN veya şifre nasıl değişir?', 'İlk girişte ne olur?');
  } else if (pathHas(screenPath, ['/superadmin/trust-quality'])) {
    chips.push('Bu sağlayıcı neden daha iyi?', 'Bu bilgi kesin kalite puanı mı?');
  } else if (pathHas(screenPath, ['/superadmin/operation-verification', '/acceptance', '/trust-quality', '/observability'])) {
    chips.push('İlgili kontrol kartını aç', 'Bu ne demek?', 'Sıradaki adımı göster', 'İlgili yere götür');
  } else if (pathHas(screenPath, ['/commercial-flow', '/service-evaluation', '/shifts'])) {
    chips.push(...(workflowQuestion ? ['Başlatma zamanı uygun mu?', 'Araç/sürücü bağlantısını kontrol et', 'GPS/operasyon kanıtını kontrol et', 'Rota/durak hazır mı?'] : ['Bu ekranı detaylı anlat', 'Başlatma zamanı uygun mu?', 'Araç/sürücü bağlantısını kontrol et', 'GPS/operasyon kanıtını kontrol et', 'Rota/durak hazır mı?']));
  } else if (pathHas(screenPath, ['/agreements'])) {
    if (String(questionType || '') === 'MARKETPLACE_FREE_TO_OPERATE_PREVIEW') {
      chips.push('Lisans ücreti var mı?', 'Bu sözleşmeden SeferPakt pay alacak mı?', 'Başarı payı neden 0 görünüyor?', 'Bu sözleşme SeferPakt kaynaklı mı?', 'Kaynak vardiyası var mı?', 'Organizasyon planı tek başına kaynak kanıtı sayılır mı?');
    } else
    chips.push(...(String(questionType || '') === 'AGREEMENT_ROUTE_REFRESH'
      ? ['Bu sözleşmede rota değişikliği var mı?', 'Room’a rota güncelleme talebi gitti mi?', 'Eski rota ile yeni rota farkı ne?', 'Teklif mi, kabul mü?']
      : ['İlgili sözleşmeyi aç', 'Üretim geçmişini göster', 'Bugünkü vardiyaları göster', 'Üretim durumunu açıkla']));
  } else if (pathHas(screenPath, ['/georeview'])) {
    chips.push('Konum İncele akışını aç', 'Geo Review ne işe yarar?', 'OSRM nedir?', 'Matrix nedir?');
  } else if (pathHas(screenPath, ['/hub'])) {
    chips.push('Hub akışını aç', 'Inbound akışını göster', 'Outbound akışını göster', 'Sonraki adımı göster');
  } else if (pathHas(screenPath, ['/notifications'])) {
    chips.push('Bildirim kaynağını göster', 'İlgili kaydı aç', 'Okunmamış bildirimleri göster', 'Açık bildirimi göster');
  } else if (pathHas(screenPath, ['/logs'])) {
    chips.push('İşlem kaydını aç', 'Bildirim kaydıyla farkı göster', 'İlgili yere git', 'Sıradaki adımı göster');
  } else if (pathHas(screenPath, ['/checkin'])) {
    chips.push('Check-in akışını aç', 'Bu ekranın amacını göster', 'Sıradaki adımı göster', 'Bu rolde ne yapabilirim?');
  } else if (pathHas(screenPath, ['/today', '/live', '/my', '/route', '/map'])) {
    chips.push(...(workflowQuestion ? ['Sonraki adımı göster', 'Bu ne demek?', 'Bu rolde ne yapabilirim?', 'İlgili kaydı aç'] : ['Bu ekranı detaylı anlat', 'Sonraki adımı göster', 'Bu ne demek?', 'Bu rolde ne yapabilirim?']));
  } else {
    chips.push('Bu ekranı detaylı anlat', 'İlk neye bakayım?', 'Burada eksik ne olabilir?', 'Hangi ekrana geçmeliyim?', 'Bu rolde ne yapabilirim?');
  }

  if (roleMode === 'SIMPLE') {
    return Array.from(new Set(simpleScreenChipsByPath(screenPath, questionType))).slice(0, 4);
  }

  return Array.from(new Set(chips.concat(['Bu rolde ne yapabilirim?']))).slice(0, 6);
}

export function buildSuggestedChips({ entityType = 'screen', questionType = 'OPEN', roleMode = 'OPERATIONS', screenPath = '', context = null, guidedTaskMeta = null }) {
  const base = [];
  if (guidedTaskMeta?.chips?.length) {
    return [...guidedTaskMeta.chips];
  }
  if (guidedTaskMeta?.clarificationQuestion) {
    return uniqueStrings([
      guidedTaskMeta.clarificationQuestion,
      ...(guidedTaskMeta.progressCommand ? ['Devam et'] : []),
    ]);
  }
  const workflowQuestionTypes = new Set(['WHY_BLOCKED', 'READINESS_CHECK', 'SHIFT_BLOCKED', 'PAYMENT_READINESS', 'PAYMENT_MISSING', 'CONTRACT_TO_SHIFT', 'CONTRACT_SHIFT_TODAY', 'QUALITY_SIGNAL', 'SEFER_SCORE_PREVIEW', 'MARKETPLACE_FREE_TO_OPERATE_PREVIEW', 'FEEDBACK_STATUS', 'NOTIFICATION_SOURCE', 'KVKK_VISIBILITY', 'DRIVER_PHONE_GPS', 'BOARDING_CHANGE_REQUEST_ENTRY', 'BOARDING_CHANGE_APPLICATION', 'BOARDING_ROUTE_IMPACT_PREVIEW', 'DYNAMIC_SAVINGS_PREVIEW', 'WHO_CAN_DO', 'NEXT_STEP', 'NEXT_SCREEN', 'SAFE_NEXT_STEP', 'MISSING_DATA', 'STATUS_HELP', 'FIRST_CONTROL', 'LOCATION_HELP', 'SCREEN_FOCUS', 'RISK_LIST', 'NEXT_BEST_ACTION', ...COPILOT_E_BLOCK_RUNTIME_ANSWER_TOPICS]);
  const workflowQuestion = workflowQuestionTypes.has(String(questionType || ''));
  const teachingQuestionChips = (() => {
    if (String(questionType || '') === 'PRODUCT_OVERVIEW_HELP') {
      return ['Bu program ne?', 'SeferPakt ne işe yarar?', 'Rolüme göre anlat', 'Hangi ekranı açmalıyım?', 'Adım adım göster'];
    }
    if (String(questionType || '') === 'ROLE_EXPLANATION_HELP') {
      return ['Bu rol ne yapar?', 'Neyi görebilir?', 'Bu rolde ne yapabilirim?', 'Hangi ekranı açmalıyım?', 'Rolü adım adım anlat'];
    }
    if (String(questionType || '') === 'SCREEN_EXPLANATION_HELP') {
      return ['Bu ekran ne işe yarar?', 'Bu kart ne demek?', 'İlk neye bakayım?', 'Sonraki adım ne?', 'Hangi ekranı açmalıyım?'];
    }
    if (String(questionType || '') === 'HOW_TO_HELP') {
      return ['Adım adım göster', 'İlk kontrolü ver', 'Nasıl yapılır?', 'Hangi ekranı açmalıyım?', 'Daha kısa anlat'];
    }
    if (String(questionType || '') === 'FIELD_BUTTON_HELP') {
      return ['Bu alanı açıkla', 'Bu buton ne yapar?', 'Bu terim ne demek?', 'İlgili ekranı aç', 'Bu kart ne demek?'];
    }
    return [];
  })();
  if (teachingQuestionChips.length) {
    return roleMode === 'SIMPLE' ? teachingQuestionChips.slice(0, 4) : teachingQuestionChips.slice(0, 6);
  }
  if (String(questionType || '') === 'SCREEN_FOCUS') {
    const chips = ['Konum kontrolü', 'Tarih / saat kontrolü', 'Personel ve duraklar', 'Rota önizlemesi'];
    return roleMode === 'SIMPLE' ? chips.slice(0, 4) : chips.slice(0, 6);
  }
  if (String(questionType || '') === 'RISK_LIST') {
    const chips = ['Konum riski', 'Tarih / saat riski', 'Personel açığı', 'Rota önizleme riski'];
    return roleMode === 'SIMPLE' ? chips.slice(0, 4) : chips.slice(0, 6);
  }
  if (String(questionType || '') === 'NEXT_BEST_ACTION') {
    const chips = ['Eksik konumu düzelt', 'Planı sürdür', 'Vardiyayı takip et', 'Teklif hazırlığı'];
    return roleMode === 'SIMPLE' ? chips.slice(0, 4) : chips.slice(0, 6);
  }
  const boardingApplicationContext = Boolean(
    context?.structuredFacts?.screenType === 'BOARDING_CHANGE_APPLICATION'
    || context?.liveFacts?.screenType === 'BOARDING_CHANGE_APPLICATION'
    || context?.screenType === 'BOARDING_CHANGE_APPLICATION'
  );
  const boardingPreviewContext = Boolean(
    context?.structuredFacts?.screenType === 'BOARDING_ROUTE_IMPACT_PREVIEW'
    || context?.liveFacts?.screenType === 'BOARDING_ROUTE_IMPACT_PREVIEW'
    || context?.screenType === 'BOARDING_ROUTE_IMPACT_PREVIEW'
  );
  if (boardingApplicationContext) {
    const applicationChips = ['Bu değişiklik uygulamaya hazır mı?', 'Günlük atamaya işlenir mi?', 'Sürücü rotası yenilenir mi?', 'Bu sadece günlük atama mı?'];
    return roleMode === 'SIMPLE' ? applicationChips.slice(0, 4) : applicationChips.slice(0, 6);
  }
  if (boardingPreviewContext) {
    const previewChips = ['Rota etkisini önizle', 'Kişi/durak farkını göster', 'Km/süre farkını açıkla', 'Bu sadece önizleme mi?'];
    return roleMode === 'SIMPLE' ? previewChips.slice(0, 4) : previewChips.slice(0, 6);
  }
  if (String(entityType) === 'vehicle') {
    if (workflowQuestion) {
      const chips = filterWorkflowGenericChips(workflowTopicChipSet({ activeTopic: questionType, questionType, screenPath }), { activeTopic: questionType, questionType });
      if (chips.length) return roleMode === 'SIMPLE' ? chips.slice(0, 4) : chips.slice(0, 6);
    }
    base.push('Son GPS ne zaman geldi?', "Sürücünün telefon GPS’i devrede mi?", 'Araç bağlantısı var mı?', 'Canlı takip ekranını aç', 'İlgili aracı aç');
  } else if (String(entityType) === 'shift') {
    const hasSelection = Boolean(context?.selectedLabel || context?.selectedSummary || context?.selectedEntityId || context?.selectedEntityType || context?.id);
    const isRoomShifts = String(screenPath || '').includes('/room/shifts');
    if (workflowQuestion || isRoomShifts) {
      const chips = filterWorkflowGenericChips(workflowTopicChipSet({ activeTopic: questionType, questionType, screenPath }), { activeTopic: questionType, questionType });
      if (chips.length) base.push(...chips);
      if (Number(context?.openOfferCount || 0) > 0) base.unshift('Teklif kararını göster');
    } else {
      base.push(
        hasSelection ? 'Kayıt özeti' : 'Bu ekranı detaylı anlat',
        'Başlatma zamanı uygun mu?',
        'Kontrol listesi ver',
        hasSelection ? 'Neden ilerlemiyor?' : 'Burada eksik ne olabilir?',
        'En risksiz sonraki adım ne?',
        'Hangi ekrana geçeyim?',
        'Bu kayıt için en doğru ekran hangisi?',
      );
    }
    if (Number(context?.openOfferCount || 0) > 0) base.unshift('Teklif kararını göster');
  } else {
    return screenChipsByPath(screenPath, roleMode, questionType);
  }

  if (roleMode === 'SIMPLE') {
    return Array.from(new Set(base.concat(['Bu rolde ne yapabilirim?']))).slice(0, 4);
  }

  if (!workflowQuestion && questionType !== 'ROLE_HELP') base.push('Bu rolde ne yapabilirim?');
  return Array.from(new Set(base)).slice(0, 6);
}
