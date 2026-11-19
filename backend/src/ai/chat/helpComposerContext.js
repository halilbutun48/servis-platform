export function createHelpComposerContextHelpers(dependencies = {}) {
  const {
    extractUserQuestion,
    firstNonEmpty,
    normalizeText,
    buildRootCauseChipsImpl,
    isWorkflowTopic,
    isWorkflowDiagnosticQuestionType,
    hasDynamicSavingsSignal,
    structuredFacts,
    parentLiveNoVehicleDetected,
    workflowTopicChipSet,
    buildOperationHealthChips,
    filterWorkflowGenericChips,
    buildSuggestedChips,
    uniqueStrings,
    detectContextTopic,
    getCopilotEBlockRuntimeAnswerTopicMeta,
    looksLikeOnboardingStartQuestion,
    looksLikeScreenStartQuestion,
    looksLikeShortFollowUp,
    buildOperationHealthState,
    selectedCarrySummary,
    normalizeVisibleReplyFragment,
    normalizeStatusDisplayText,
    selectedSignalRows,
    buildRoleBoundaryExplanation,
    buildEvidenceConfidenceWording,
    selectedMissingReply,
    selectedFieldReply,
    selectedBadgeReply,
    selectedSignalReply,
    sanitizeDiagnosticSupportText,
    ensureVisibleSentence,
    normalizeVisibleSuggestionFragment,
    buildContractProductionSignalState,
    pickWorkflowVisibleReply,
  } = dependencies;

  function topicLabelForContext(topic) {
    const labels = {
      ROOT_CAUSE: 'Kök neden',
      SCREEN_PURPOSE: 'Ekran amacı',
      SHIFT_BLOCKED: 'Vardiya engeli',
      VEHICLE_NOT_VISIBLE: 'Konum sinyali görünürlüğü',
      DRIVER_PHONE_GPS: 'Sürücünün telefonundan konum sinyali',
      BOARDING_CHANGE_APPLICATION: 'Kabul edilen değişiklik / günlük atama',
      BOARDING_CHANGE_REQUEST_ENTRY: 'Biniş talebi girişi',
      BOARDING_ROUTE_IMPACT_PREVIEW: 'Biniş değişikliği önizlemesi',
      DYNAMIC_SAVINGS_PREVIEW: 'Dinamik tasarruf önizlemesi',
      AGREEMENT_ROUTE_REFRESH: 'Sözleşmeli rota değişikliği',
      PROVIDER_BETTER: 'Kalite / kanıt sinyali',
      QUALITY_SIGNAL: 'Kalite / kanıt sinyali',
      SEFER_SCORE_PREVIEW: 'SeferPuanı önizlemesi',
      CONTRACT_SHIFT_TODAY: 'Sözleşme / vardiya üretimi',
      PAYMENT_MISSING: 'Hakediş / kanıt önizlemesi',
      PAYMENT_PREVIEW: 'Hakediş / kanıt önizlemesi',
      PAYMENT_READINESS: 'Hakediş / kanıt önizlemesi',
      TRUST_QUALITY: 'Kalite / kanıt akışı',
      FEEDBACK_STATUS: 'Geri bildirim durumu',
      NOTIFICATION_SOURCE: 'Bildirim kaynağı',
      KVKK_VISIBILITY: 'KVKK görünürlüğü',
      WHO_CAN_DO: 'Yetki sınırı',
      ROLE_BOUNDARY: 'Yetki sınırı',
      NEXT_ACTION: 'Sıradaki doğru işlem',
      NEXT_SCREEN: 'Sonraki ekran',
      NEXT_STEP: 'Sıradaki doğru işlem',
      FIRST_CONTROL: 'İlk kontrol',
      WHY_BLOCKED: 'Engel nedeni',
      MISSING_DATA: 'Eksik veri',
      CONTRACT_TO_SHIFT: 'Sözleşme → vardiya',
    };
    const helperTopicMeta = getCopilotEBlockRuntimeAnswerTopicMeta(topic);
    return firstNonEmpty(labels[String(topic || '')], helperTopicMeta?.label || '', '');
  }

  function buildContextualSuggestedChips({
    entityType,
    questionType,
    roleMode,
    screenPath,
    context,
    guidedTaskMeta = null,
    sourceScreenContext = null,
    _screenDefinition,
    screenQuestions = [],
    activeTopic = '',
    isFollowUp = false,
    sameRecordLikely = false,
    needsSelection = false,
    selectedLabel = '',
    selectedSummary = '',
    roleBoundary = '',
  }) {
    let chips = [];
    const path = normalizeText(screenPath);
    const hasSelectedRecord = Boolean(selectedLabel || selectedSummary || sameRecordLikely);
    const boardingApplicationTopic = Boolean(
      ['BOARDING_CHANGE_APPLICATION'].includes(String(activeTopic || questionType || ''))
      || ['BOARDING_CHANGE_APPLICATION'].includes(String(context?.structuredFacts?.screenType || context?.liveFacts?.screenType || sourceScreenContext?.structuredFacts?.screenType || ''))
    );
    const boardingPreviewTopic = Boolean(
      ['BOARDING_ROUTE_IMPACT_PREVIEW'].includes(String(activeTopic || questionType || ''))
      || ['BOARDING_ROUTE_IMPACT_PREVIEW'].includes(String(context?.structuredFacts?.screenType || context?.liveFacts?.screenType || sourceScreenContext?.structuredFacts?.screenType || ''))
    );
    const routeRefreshSignalText = normalizeText([
      firstNonEmpty(context?.facts?.routeRefreshState, ''),
      firstNonEmpty(context?.liveFacts?.routeRefreshState, ''),
      firstNonEmpty(context?.structuredFacts?.routeRefreshState, ''),
      firstNonEmpty(sourceScreenContext?.facts?.routeRefreshState, ''),
      firstNonEmpty(sourceScreenContext?.liveFacts?.routeRefreshState, ''),
      firstNonEmpty(sourceScreenContext?.structuredFacts?.routeRefreshState, ''),
      firstNonEmpty(context?.facts?.routeRefreshLabel, ''),
      firstNonEmpty(context?.liveFacts?.routeRefreshLabel, ''),
      firstNonEmpty(context?.structuredFacts?.routeRefreshLabel, ''),
      firstNonEmpty(sourceScreenContext?.facts?.routeRefreshLabel, ''),
      firstNonEmpty(sourceScreenContext?.liveFacts?.routeRefreshLabel, ''),
      firstNonEmpty(sourceScreenContext?.structuredFacts?.routeRefreshLabel, ''),
      selectedLabel,
      selectedSummary,
    ].filter(Boolean).join(' '));
    const topicKey = String(activeTopic || questionType || '');
    const rootCauseTopic = topicKey === 'ROOT_CAUSE';
    const rootCauseChips = rootCauseTopic
      ? buildRootCauseChipsImpl({
        message: '',
        questionType,
        screenPath,
        screenDefinition: _screenDefinition || null,
        screenContext: context || null,
        sourceScreenContext,
        context,
        roleMode,
      })
      : [];
    const routeRefreshTopic = Boolean(
      ['AGREEMENT_ROUTE_REFRESH'].includes(topicKey)
      || (!['CONTRACT_TO_SHIFT', 'CONTRACT_SHIFT_TODAY'].includes(topicKey) && /(rota değişikliği|rota degisikligi|rota güncelleme|rota guncelleme|eski rota|yeni rota|teklif mi|kabul mü|kabul mu|karşı teklif|karsi teklif|uygulanan rota|rota geçmişi|rota gecmisi|room.?a rota güncelleme talebi|room.?a rota guncelleme talebi)/.test(routeRefreshSignalText))
    );
    const dynamicSavingsTopic = Boolean(
      topicKey === 'DYNAMIC_SAVINGS_PREVIEW'
      || ((path.includes('/agreements') || path.includes('/commercial-flow') || path.includes('/commercial-core')) && hasDynamicSavingsSignal([selectedLabel, selectedSummary, routeRefreshSignalText].filter(Boolean).join(' ')))
    );
    const workflowTopic = isWorkflowTopic(activeTopic) || isWorkflowDiagnosticQuestionType(questionType);
    const workflowTopicWithRootCause = workflowTopic || rootCauseTopic;
    const workflowChipContext = workflowTopicWithRootCause || boardingPreviewTopic || boardingApplicationTopic || routeRefreshTopic || dynamicSavingsTopic || rootCauseTopic;
    const workflowChipTopic = rootCauseTopic ? 'ROOT_CAUSE' : boardingApplicationTopic ? 'BOARDING_CHANGE_APPLICATION' : boardingPreviewTopic ? 'BOARDING_ROUTE_IMPACT_PREVIEW' : dynamicSavingsTopic ? 'DYNAMIC_SAVINGS_PREVIEW' : routeRefreshTopic ? 'AGREEMENT_ROUTE_REFRESH' : activeTopic;
    const parentLiveNoVehicleFacts = structuredFacts(sourceScreenContext) || structuredFacts(context) || null;
    const parentLiveNoVehicleSignal = path.includes('/parent/live') && (
      parentLiveNoVehicleDetected(sourceScreenContext || context, context, path)
      || parentLiveNoVehicleFacts?.noLiveVehicle === true
      || parentLiveNoVehicleFacts?.liveVehicleVisible === false
      || (parentLiveNoVehicleFacts && Number(parentLiveNoVehicleFacts.vehicleCount) === 0)
    );
    if (rootCauseChips.length) chips.push(...rootCauseChips);
    if (workflowChipContext) chips.push(...workflowTopicChipSet({ activeTopic: workflowChipTopic, questionType, screenPath, guidedTaskMeta }));
    if (hasSelectedRecord && !workflowTopic && !path.includes('/parent/live')) {
      if (!workflowChipContext) {
        chips.push('Seçili kaydı aç', 'Başlatma zamanını kontrol et', 'Eksik veriyi göster', 'Yetki sınırını açıkla');
      }
    }
    const pathSpecificChips = (() => {
      if (path.includes('/driver/today')) return workflowChipContext
        ? ['Başlatma zamanı uygun mu?', 'Araç/sürücü bağlantısını kontrol et', 'Sonraki durak nerede?', 'Konum sinyali/operasyon kanıtını kontrol et', 'Rota/durak hazır mı?']
        : ['Bu ekranı detaylı anlat', 'Başlatma zamanı uygun mu?', 'Araç/sürücü bağlantısını kontrol et', 'Sonraki durak nerede?', 'Konum sinyali/operasyon kanıtını kontrol et', 'Rota/durak hazır mı?'];
      if (path.includes('/driver/route')) return workflowChipContext
        ? ['Başlatma zamanı uygun mu?', 'Araç/sürücü bağlantısını kontrol et', 'Sonraki durak neden görünmüyor?', 'Konum sinyali/operasyon kanıtını kontrol et', 'Rota/durak hazır mı?']
        : ['Bu ekranı detaylı anlat', 'Başlatma zamanı uygun mu?', 'Araç/sürücü bağlantısını kontrol et', 'Sonraki durak neden görünmüyor?', 'Konum sinyali/operasyon kanıtını kontrol et', 'Rota/durak hazır mı?'];
      if (path.includes('/personel/live') || path.includes('/personel/my')) return ['Bu ekranı detaylı anlat', 'Araç nerede?', 'Son konum bilgisi ne zaman geldi?', 'Servis durumu ne?', 'Sürücünün telefonundan konum sinyali devrede mi?'];
      if (path.includes('/parent/live')) {
        if (parentLiveNoVehicleSignal) return ['Servis saati uygun mu?', 'Araç ataması var mı?', 'Canlı konum neden yok?', 'Bildirimleri kontrol et'];
        return ['Son konum bilgisi ne zaman geldi?', 'Tahmini varış süresi nedir?', 'Araç bağlantısı var mı?', 'Sürücünün telefonundan konum sinyali devrede mi?'];
      }
      if (path.includes('/room/map') || path.includes('/room/live')) return ['Son konum bilgisi ne zaman geldi?', 'Sürücünün telefonundan konum sinyali devrede mi?', 'Araç bağlantısı var mı?', 'Canlı takip ekranını aç'];
      if (path.includes('/room/operation-health')) {
        return buildOperationHealthChips({ questionType, screenPath: path });
      }
      if (path.includes('/room/shifts')) {
        if (boardingApplicationTopic) return ['Bu değişiklik uygulamaya hazır mı?', 'Günlük atamaya işlenir mi?', 'Sürücü rotası yenilenir mi?', 'Bu sadece günlük atama mı?'];
        if (boardingPreviewTopic) return ['Rota etkisini önizle', 'Bugün binmeyecek kişiyi göster', 'Farklı durak değişikliğini açıkla', 'Kapasite etkisini göster'];
        if (['PAYMENT_READINESS', 'PAYMENT_MISSING'].includes(String(questionType || ''))) return ['Eksik bilgi ne?', 'Ödeme hesabı var mı?', 'Ödeme hazırlığı hangi aşamada?', 'Hakediş önizlemesini aç'];
        if (['CONTRACT_TO_SHIFT', 'CONTRACT_SHIFT_TODAY'].includes(String(questionType || ''))) return ['İlgili sözleşmeyi aç', 'Bugünkü vardiyaları göster', 'Üretim durumunu açıkla'];
        if (['LOCATION_HELP', 'VEHICLE_NOT_VISIBLE', 'DRIVER_PHONE_GPS'].includes(String(questionType || ''))) return ['Son konum bilgisi ne zaman geldi?', 'Sürücünün telefonundan konum sinyali devrede mi?', 'Araç bağlantısı var mı?', 'Canlı takip ekranını aç'];
        if (['WHY_BLOCKED', 'READINESS_CHECK', 'NEXT_STEP', 'FIRST_CONTROL', 'STATUS_HELP', 'SAFE_NEXT_STEP'].includes(String(questionType || ''))) return ['Araç/sürücü bağlantısını kontrol et', 'Rota/durak hazır mı?', 'Konum sinyali/operasyon kanıtını kontrol et', 'Başlatma zamanı uygun mu?'];
        return ['Başlatma zamanı uygun mu?', 'Araç/sürücü bağlantısını kontrol et', 'Rota/durak hazır mı?', 'Konum sinyali/operasyon kanıtını kontrol et'];
      }
      if (path.includes('/superadmin/operations')) {
        if (boardingApplicationTopic) return ['Bu değişiklik uygulamaya hazır mı?', 'Günlük atamaya işlenir mi?', 'Sürücü rotası yenilenir mi?', 'Bu sadece günlük atama mı?'];
        if (boardingPreviewTopic) return ['Rota etkisini önizle', 'Bugün binmeyecek kişiyi göster', 'Farklı durak değişikliğini açıkla', 'Kapasite etkisini göster'];
        return ['Riskli cihazı göster', 'Konum sinyali güncel değil / çevrim dışı satırını aç', 'Açık sorunları sırala', 'Aktif sürücüleri kontrol et'];
      }
      if (path.includes('/superadmin/commercial-core')) return ['Hakediş önizlemesini aç', 'Eksik bilgi ne?', 'Ödeme hesabı var mı?', 'Ödeme hazırlığı hangi aşamada?'];
      if (path.includes('/room/commercial-flow')) return ['İlgili sözleşmeyi aç', 'Bugünkü vardiyaları göster', 'Üretim geçmişini göster', 'Üretim durumunu açıkla'];
      if (path.includes('/commercial-flow')) return ['İlgili sözleşmeyi aç', 'Hakediş önizlemesini aç', 'Bugünkü vardiyaları göster', 'Üretim durumunu açıkla'];
      if (path.includes('/shared/feedback')) return ['Bu ekranı detaylı anlat', 'Açık geri bildirimi göster', 'Kritik geri bildirimleri sırala', 'Sorumlu rolü göster', 'Geri bildirim açık'];
      if (path.includes('/shared/kvkk')) return ['Bu ekranı detaylı anlat', 'KVKK sınırını açıkla', 'Bu rolde ne görünür?', 'Erişim neden kapalı?', 'Yetkili ekrana yönlendir'];
      if (path.includes('/shared/notifications')) return ['Bildirim kaynağını göster', 'İlgili kaydı aç', 'Okunmamış bildirimleri göster', 'Açık bildirimi göster'];
      if (path.includes('/shared/logs')) return ['Bu ekranı detaylı anlat', 'İşlem kaydını aç', 'Bildirim kaydıyla farkı göster', 'Filtreleri nasıl kullanırım?'];
      if (path.includes('/room/drivers')) return ['Aktif sürücüler kim?', 'Görev bağlantısı var mı?', 'Sürücü durumunu açıkla'];
      if (path.includes('/room/reports')) return ['Bu bilgi neden görünmüyor?', 'Bu kayıt kimde?', 'Filtreleri nasıl kullanırım?'];
      if (path.includes('/company/operations') || path.includes('/school/operations') || path.includes('/organization/operations')) {
        if (boardingApplicationTopic) return ['Bu değişiklik uygulamaya hazır mı?', 'Günlük atamaya işlenir mi?', 'Sürücü rotası yenilenir mi?', 'Bu sadece günlük atama mı?'];
        if (boardingPreviewTopic) return ['Rota etkisini önizle', 'Bugün binmeyecek kişiyi göster', 'Farklı durak değişikliğini açıkla', 'Kapasite etkisini göster'];
        return ['Açık talep var mı?', 'Kim onaylayacak?', 'Eksik veri ne?', 'Bu rolde ne görünür?'];
      }
      if (path.includes('/driver/change-pin')) return ['Bu ekranı detaylı anlat', 'PIN veya şifre nasıl değişir?', 'İlk girişte ne olur?'];
      if (path.includes('/superadmin/trust-quality')) return ['Açık kalite sinyallerini göster', 'Bu sağlayıcı neden daha iyi?', 'Bu bilgi kesin kalite puanı mı?'];
      if (path.includes('/superadmin/operation-verification')) return ['İlgili kontrol kartını aç', 'Durum ve kanıtı oku', 'Kontrol adımını göster', 'İlgili yere götür'];
      return [];
    })();
    if (pathSpecificChips.length) {
      chips.push(...pathSpecificChips);
    } else if (needsSelection) {
      chips.push('Bu ekranı detaylı anlat', 'İlk neye bakayım?', 'Sıradaki doğru işlem ne?');
    } else {
      switch (String(activeTopic || '')) {
        case 'SCREEN_PURPOSE':
          chips.push('Bu ekranı detaylı anlat', 'Sıradaki adımı açıkla', 'İlgili ekrana git');
          break;
        case 'SHIFT_BLOCKED':
          chips.push('Araç/sürücü bağlantısını kontrol et', 'Rota eksik mi?', 'GPS sinyalini kontrol et', 'Sözleşme/vardiya bağını göster');
          break;
        case 'VEHICLE_NOT_VISIBLE':
        case 'DRIVER_PHONE_GPS':
          chips.push('Konum kaynağını kontrol et', 'Sürücünün telefonundan konum sinyali neden devrede değil?', 'Araç neden haritada yok?');
          break;
        case 'PROVIDER_BETTER':
        case 'QUALITY_SIGNAL':
        case 'TRUST_QUALITY':
          chips.push('Açık kalite sinyallerini göster', 'Bu sağlayıcı neden daha iyi?', 'Bu uyarı önemli mi?');
          break;
        case 'CONTRACT_SHIFT_TODAY':
          chips.push('İlgili sözleşmeyi aç', 'Bugünkü vardiyaları göster', 'Üretim durumunu açıkla');
          break;
        case 'CONTRACT_TO_SHIFT':
          chips.push('İlgili sözleşmeyi aç', 'Bugünkü vardiyaları göster', 'Üretim durumunu açıkla');
          break;
        case 'PAYMENT_MISSING':
        case 'PAYMENT_PREVIEW':
        case 'PAYMENT_READINESS':
          chips.push('Hakediş önizlemesini aç', 'Eksik bilgi ne?', 'Ödeme hesabı var mı?', 'Ödeme hazırlığı hangi aşamada?');
          break;
        case 'FEEDBACK_STATUS':
          chips.push('Açık geri bildirimi göster', 'Sorumlu rolü göster', 'Geri bildirim açık');
          break;
        case 'NOTIFICATION_SOURCE':
          chips.push('Bildirim kaynağını göster', 'İlgili kaydı aç', 'Okunmamış bildirimleri göster');
          break;
        case 'KVKK_VISIBILITY':
          chips.push('Bu bilgi neden görünmüyor?', 'Hangi rol görebilir?', 'KVKK sınırı ne?');
          break;
        case 'WHO_CAN_DO':
        case 'ROLE_BOUNDARY':
          chips.push('Bu işlemi kim yapabilir?', 'Yetki sınırını açıkla', 'İlgili ekrana git');
          break;
        case 'MISSING_DATA':
          chips.push('Eksik alanları göster', 'Sıradaki adımı açıkla', 'Önce neyi kontrol edeyim');
          break;
        case 'NEXT_SCREEN':
          chips.push('Hangi ekrana gitmeliyim?', 'Şimdi hangi ekrana gitmeliyim?', 'İlgili ekrana git');
          break;
        case 'NEXT_ACTION':
        case 'NEXT_STEP':
        case 'FIRST_CONTROL':
          chips.push('Sıradaki adımı açıkla', 'Bu kaydı kontrol et', 'Önce neyi kontrol edeyim');
          break;
        case 'WHY_BLOCKED':
          chips.push('Araç/sürücü bağlantısını kontrol et', 'Rota/durak hazır mı?', 'Konum sinyali/operasyon kanıtını kontrol et', 'Başlatma zamanı uygun mu?');
          break;
        default:
          chips.push('Bu ekranı detaylı anlat', 'İlk neye bakayım?', 'Burada eksik ne olabilir?');
      }
    }

    if (workflowChipContext) {
      chips = filterWorkflowGenericChips(chips, { activeTopic, questionType });
    } else {
      if (sameRecordLikely || isFollowUp) {
        chips.push('Sıradaki adımı açıkla', 'Önce neyi kontrol edeyim');
      } else {
        chips.push('İlgili ekrana git', 'Hangi ekrana geçmeliyim?');
      }
    }

    if (roleBoundary && ['ROLE_HELP', 'WHO_CAN_DO', 'ROLE_BOUNDARY', 'KVKK_VISIBILITY'].includes(String(questionType || ''))) chips.unshift('Yetki sınırını açıkla');

    const fallback = uniqueStrings([
      ...(Array.isArray(screenQuestions) ? screenQuestions : []).slice(0, 2),
      ...buildSuggestedChips({ entityType, questionType, roleMode, screenPath, context, guidedTaskMeta }).slice(0, 2),
    ]).filter(Boolean);
    const filteredFallback = workflowChipContext
      ? filterWorkflowGenericChips(fallback, { activeTopic, questionType })
      : fallback;

    if (!chips.length && filteredFallback.length) chips.push(...filteredFallback);
    if (chips.length < 2 && filteredFallback.length) chips.push(...filteredFallback.slice(0, 2));

    const liveServiceSurface = path.includes('/personel/live') || path.includes('/parent/live');
    let visibleChips = uniqueStrings(chips).filter(Boolean).slice(0, roleMode === 'SIMPLE' ? 2 : 4);
    if (liveServiceSurface && roleMode === 'SIMPLE') {
      visibleChips = uniqueStrings(chips).filter(Boolean).slice(0, 4);
    }
    if (roleMode !== 'SIMPLE' && (path.includes('/driver/today') || path.includes('/driver/route'))) {
      const routeChip = 'Rota/durak hazır mı?';
      if (!visibleChips.some((chip) => normalizeText(chip) === normalizeText(routeChip))) {
        visibleChips.push(routeChip);
      }
    }
    return uniqueStrings(visibleChips).filter(Boolean);
  }

  function buildContextPriorityDecision({
    message,
    conversationState,
    screenContext,
    screenDefinition,
    sourceScreenContext,
    sourceScreenDefinition,
    questionType,
    roleMode,
    userRole,
    screenPath,
    analysis,
    entityType,
    context,
    guidedTaskMeta = null,
  }) {
    const taskState = conversationState?.taskState || null;
    const selectedLabel = firstNonEmpty(
      screenContext?.selectedLabel,
      taskState?.anchorLabel,
      taskState?.selectedLabel,
      taskState?.selectedSummary,
      screenContext?.selectedSummary,
      '',
    );
    const selectedSummary = firstNonEmpty(
      taskState?.selectedSummary,
      taskState?.selectedRecordStatus,
      screenContext?.helpContextSummary,
      screenContext?.contextSummary,
      screenContext?.selectedRecordSummary,
      screenContext?.selectedSummary,
      selectedCarrySummary(screenContext),
      '',
    );
    const roomMapVehicleLead = String(screenPath || '').includes('/room/map') ? (() => { const match = /\bAraç\s*([A-Z0-9]+)/i.exec(normalizeVisibleReplyFragment(firstNonEmpty(selectedSummary, selectedCarrySummary(screenContext), selectedCarrySummary(sourceScreenContext), ''))); return match?.[1] ? `Seçili araç ${match[1]} görünüyor.` : ''; })() : '';
    const lastConcern = firstNonEmpty(
      taskState?.lastPrimaryConcern,
      taskState?.currentPrimaryConcern,
      taskState?.lastUserMessage,
      taskState?.currentUserMessage,
      taskState?.lastRawUserMessage,
      conversationState?.lastPrimaryConcern,
      conversationState?.lastUserMessage,
      conversationState?.lastRawUserMessage,
      '',
    );
    const recentMessages = Array.isArray(conversationState?.recentMessages)
      ? conversationState.recentMessages.slice(-6)
      : (Array.isArray(taskState?.recentMessages) ? taskState.recentMessages.slice(-6) : []);
    const recentUserMessage = [...recentMessages].reverse().find((row) => normalizeText(row?.role) === 'user' || normalizeText(row?.role) === 'assistant');
    const activeTopic = detectContextTopic({ message, questionType, screenPath, screenContext, sourceScreenContext, analysis });
    const helperTopicMeta = getCopilotEBlockRuntimeAnswerTopicMeta(activeTopic);
    const guidedTopicLabel = firstNonEmpty(guidedTaskMeta?.label, '');
    const guidedTopicSummary = firstNonEmpty(guidedTaskMeta?.summary, guidedTaskMeta?.jobPurpose, '');
    const guidedTopicAdvice = firstNonEmpty(guidedTaskMeta?.advice, '');
    const guidedTopicWhy = firstNonEmpty(guidedTaskMeta?.safeBoundary, guidedTaskMeta?.why, '');
    const startGuidanceQuestion = looksLikeOnboardingStartQuestion(message) || looksLikeScreenStartQuestion(message);
    const workflowQuestion = Boolean(guidedTaskMeta?.familyId) || isWorkflowDiagnosticQuestionType(questionType) || isWorkflowTopic(activeTopic);
    const isFollowUp = !startGuidanceQuestion && Boolean(
      looksLikeShortFollowUp(message)
      || taskState?.isFollowUp
      || guidedTaskMeta?.progressCommand
      || (conversationState?.lastQuestionType && recentMessages.length)
      || /^(neden|niye|peki|tamam|devam|şimdi|simdi|burada|bunda|aynı kayıtta|ayni kayitta|aynı satırda|ayni satirda|bu kayıtta|bu kayitta)/.test(normalizeText(message))
    );
    const sameRecordLikely = Boolean(
      selectedLabel && conversationState?.lastSelectedLabel && normalizeText(selectedLabel) === normalizeText(conversationState.lastSelectedLabel),
    ) || Boolean(
      selectedLabel && taskState?.lastSelectedLabel && normalizeText(selectedLabel) === normalizeText(taskState.lastSelectedLabel),
    ) || Boolean(
      screenContext?.selectedEntityType
      && conversationState?.lastSelectedEntityType
      && normalizeText(screenContext.selectedEntityType) === normalizeText(conversationState.lastSelectedEntityType)
      && Number(screenContext?.selectedEntityId || 0) === Number(conversationState?.lastSelectedEntityId || 0),
    ) || Boolean(
      screenContext?.selectedEntityType
      && taskState?.lastSelectedEntityType
      && normalizeText(screenContext.selectedEntityType) === normalizeText(taskState.lastSelectedEntityType)
      && Number(screenContext?.selectedEntityId || 0) === Number(taskState?.lastSelectedEntityId || 0),
    ) || Boolean(
      selectedLabel && lastConcern && normalizeText(selectedLabel).includes(normalizeText(lastConcern)),
    );
    const structured = structuredFacts(screenContext) || structuredFacts(sourceScreenContext) || null;
    const selectedRecordStatus = firstNonEmpty(
      normalizeStatusDisplayText(structured?.selectedRecordStatus),
      normalizeStatusDisplayText(screenContext?.selectedRecordStatus),
      normalizeStatusDisplayText(sourceScreenContext?.selectedRecordStatus),
      normalizeStatusDisplayText(taskState?.selectedRecordStatus),
      normalizeStatusDisplayText(taskState?.selectedSummary),
      normalizeStatusDisplayText(roomMapVehicleLead ? `${roomMapVehicleLead} ${selectedSummary || selectedLabel || selectedCarrySummary(screenContext) || selectedCarrySummary(sourceScreenContext)}` : selectedSummary || selectedLabel || selectedCarrySummary(screenContext) || selectedCarrySummary(sourceScreenContext)),
      '',
    );
    const selectedLabelText = normalizeText(selectedLabel);
    const selectedSummaryText = normalizeText(selectedSummary);
    const selectedRecordStatusText = normalizeText(selectedRecordStatus);
    const screenPathText = normalizeText(firstNonEmpty(
      screenPath,
      screenContext?.path,
      sourceScreenContext?.path,
      taskState?.currentScreenPath,
      taskState?.lastScreenPath,
      screenDefinition?.path,
      sourceScreenDefinition?.path,
      '',
    ));
    const operationHealthState = !startGuidanceQuestion
      ? buildOperationHealthState({
        message,
        rawMessage: message,
        questionType,
        interactionIntentFamily: '',
        roleMode,
        userRole,
        user: null,
        screenPath,
        screenDefinition,
        screenContext,
        sourceScreenDefinition,
        sourceScreenContext,
        analysis,
        contextPriority: null,
        conversationState,
        guidedTaskMeta,
        entityType,
        context,
        taskState,
      })
      : null;
    const operationHealthLead = operationHealthState?.shouldRespond
      ? firstNonEmpty(operationHealthState.reasoningLead, '')
      : '';
    const operationHealthAdvice = operationHealthState?.shouldRespond
      ? firstNonEmpty(operationHealthState.nextBestAction, '')
      : '';
    const boardingApplicationTopic = activeTopic === 'BOARDING_CHANGE_APPLICATION';
    const isDriverRouteSurface = /\/driver\/(today|route|map)/.test(screenPathText);
    const boardingRouteVisibilityLead = boardingApplicationTopic && isDriverRouteSurface
      ? 'Bu değişiklik günlük atamaya işlendiğinde sürücü rota ekranında görünür. Rota güncellemesi bekliyor olabilir; SMS/push yok ve kalıcı rota değişmez.'
      : '';
    const liveFactConfidence = structured?.liveFactConfidence && typeof structured.liveFactConfidence === 'object'
      ? structured.liveFactConfidence
      : sourceScreenContext?.structuredFacts?.liveFactConfidence && typeof sourceScreenContext.structuredFacts.liveFactConfidence === 'object'
        ? sourceScreenContext.structuredFacts.liveFactConfidence
        : null;
    const liveFactConfidenceSummary = firstNonEmpty(liveFactConfidence?.summary, '');
    const diagnosticPriority = structured?.diagnosticPriority && typeof structured.diagnosticPriority === 'object'
      ? structured.diagnosticPriority
      : sourceScreenContext?.structuredFacts?.diagnosticPriority && typeof sourceScreenContext.structuredFacts.diagnosticPriority === 'object'
        ? sourceScreenContext.structuredFacts.diagnosticPriority
        : null;
    const diagnosticPrioritySummary = firstNonEmpty(diagnosticPriority?.summary, '');
    const actionSimulation = firstNonEmpty(
      structured?.actionSimulation?.value,
      structured?.actionSimulation?.summary,
      typeof structured?.actionSimulation === 'string' ? structured.actionSimulation : '',
      screenContext?.actionSimulation?.value,
      screenContext?.actionSimulation?.summary,
      typeof screenContext?.actionSimulation === 'string' ? screenContext.actionSimulation : '',
      sourceScreenContext?.actionSimulation?.value,
      sourceScreenContext?.actionSimulation?.summary,
      typeof sourceScreenContext?.actionSimulation === 'string' ? sourceScreenContext.actionSimulation : '',
      '',
    );
    const visibleActionSimulation = normalizeVisibleSuggestionFragment(actionSimulation);
    const liveSelectionHasEntity = Boolean(
      screenContext?.selectedEntityType
      || screenContext?.selectedEntityId
      || sourceScreenContext?.selectedEntityType
      || sourceScreenContext?.selectedEntityId
    );
    const liveSelectionHasText = Boolean(
      selectedLabel
      || selectedSummary
      || selectedRecordStatus
      || taskState?.anchorLabel
      || selectedCarrySummary(screenContext)
      || selectedCarrySummary(sourceScreenContext)
    );
    const needsSelection = (!selectedLabel && !selectedSummary && !taskState?.anchorLabel && !selectedCarrySummary(screenContext) && !selectedCarrySummary(sourceScreenContext))
      || ((String(screenPath || '').includes('/personel/live') || String(screenPath || '').includes('/personel/my') || String(screenPath || '').includes('/parent/live')) && !liveSelectionHasEntity && !liveSelectionHasText);
    const roleBoundary = buildRoleBoundaryExplanation({ userRole, questionType, message, activeTopic });
    const evidenceConfidence = buildEvidenceConfidenceWording({ analysis, screenContext, sourceScreenContext, roleBoundary, needsSelection, screenPath, userRole });
    const signalRows = uniqueStrings([
      ...selectedSignalRows(screenContext).slice(0, 2).map((row) => `${row.label}: ${row.value}`),
      ...selectedSignalRows(sourceScreenContext).slice(0, 2).map((row) => `${row.label}: ${row.value}`),
    ]).filter(Boolean);
    const signalSummary = signalRows.length ? signalRows.join(' • ') : '';
    const selectedEntityText = normalizeText(uniqueStrings([
      selectedLabel,
      selectedSummary,
      selectedRecordStatus,
      taskState?.anchorLabel,
      signalSummary,
      firstNonEmpty(analysis?.reasoningLead, ''),
      firstNonEmpty(analysis?.nextBestAction, ''),
      firstNonEmpty(analysis?.safestNextStep, ''),
    ]).join(' '));
    const selectedHasContract = /(sözleşme|sozlesme|contract)/.test(selectedEntityText);
    const selectedHasShift = /(vardiya|shift)/.test(selectedEntityText);
    const selectedHasPayment = /(hakediş|hakedis|ödeme|odeme|komisyon|önizleme|onizleme|csv|payment)/.test(selectedEntityText);
    const selectedHasVehicle = /(araç|arac|vehicle|plaka)/.test(selectedEntityText);
    const selectedHasGps = /(gps|konum|telefon gps|son gps|offline|stale)/.test(selectedEntityText);
    let selectedRecordMismatchLead = '';
    const selectedLooksLikeShift = /(vardiya|shift)/.test(selectedLabelText) || /(vardiya|shift)/.test(selectedSummaryText) || /(vardiya|shift)/.test(selectedRecordStatusText);
    const selectedLooksLikeContract = /(sözleşme|sozlesme|contract)/.test(selectedLabelText) || /(sözleşme|sozlesme|contract)/.test(selectedSummaryText) || /(sözleşme|sozlesme|contract)/.test(selectedRecordStatusText);
    const selectedLooksLikePayment = /(hakediş|hakedis|ödeme|odeme|komisyon|önizleme|onizleme|csv|payment)/.test(selectedLabelText) || /(hakediş|hakedis|ödeme|odeme|komisyon|önizleme|onizleme|csv|payment)/.test(selectedSummaryText) || /(hakediş|hakedis|ödeme|odeme|komisyon|önizleme|onizleme|csv|payment)/.test(selectedRecordStatusText);
    const selectedLooksLikeVehicle = /(araç|arac|vehicle|plaka)/.test(selectedLabelText) || /(araç|arac|vehicle|plaka)/.test(selectedSummaryText) || /(araç|arac|vehicle|plaka)/.test(selectedRecordStatusText);
    const selectedLooksLikeGps = /(gps|konum|telefon gps|son gps|offline|stale)/.test(selectedLabelText) || /(gps|konum|telefon gps|son gps|offline|stale)/.test(selectedSummaryText) || /(gps|konum|telefon gps|son gps|offline|stale)/.test(selectedRecordStatusText);
    const selectedCommercialSignals = selectedHasContract || selectedHasPayment;
    const selectedLiveSignals = selectedHasVehicle || selectedHasGps;
    if (!startGuidanceQuestion && (activeTopic === 'CONTRACT_TO_SHIFT' || activeTopic === 'CONTRACT_SHIFT_TODAY') && selectedLooksLikeShift && !selectedLooksLikeContract) {
      selectedRecordMismatchLead = 'Seçili kayıt bir vardiya; sözleşmeden üretim bilgisini kesin söylemek için ilgili sözleşme kaydı veya sözleşme üretim sinyali gerekir.';
    } else if (!startGuidanceQuestion && (activeTopic === 'PAYMENT_READINESS' || activeTopic === 'PAYMENT_MISSING') && !selectedLooksLikePayment && !selectedCommercialSignals) {
      selectedRecordMismatchLead = 'Bu ekranda hakediş sinyali görünmüyor; Ticari Akış/Hakediş önizlemesi ekranında eksik bilgi, ödeme hesabı ve hazırlık durumunu kontrol et.';
    } else if (!startGuidanceQuestion && (activeTopic === 'VEHICLE_NOT_VISIBLE' || activeTopic === 'DRIVER_PHONE_GPS' || activeTopic === 'LOCATION_HELP') && selectedLooksLikeShift && !selectedLiveSignals && !selectedLooksLikeVehicle && !selectedLooksLikeGps) {
      selectedRecordMismatchLead = 'Seçili kayıt bir vardiya; araç görünürlüğü için araç ve sürücünün telefonundan konum sinyalini ayrı kayıtta kontrol et.';
    }
    const topicWhy = {
      QUALITY_SIGNAL: 'Bu sinyal kesin kalite puanı değil; sağlayıcıyı okumaya yardım eder.',
      SEFER_SCORE_PREVIEW: 'Bu sadece SeferPuanı önizlemesidir. SeferPuanı önizlemesi — ödeme, ceza, teklif sıralaması veya otomatik işlem başlatmaz.',
      MARKETPLACE_FREE_TO_OPERATE_PREVIEW: 'Bu sadece sözleşme kaynak ve ödeme hazırlığı önizlemesidir. Ek pay uygulanmaz; ödeme başlatılmaz. Kaynak vardiyası / teklif seçimi zinciri doğrulanır ve organizasyon planı tek başına kaynak kanıtı sayılmaz.',
      BOARDING_CHANGE_REQUEST_ENTRY: 'Bu sadece talep oluşturma akışıdır. Konum gerekiyorsa Konumumu al, Büyük haritada konum seç ya da Adresten konum bul seçeneklerinden birini kullan; rota otomatik uygulanmaz; aynı rota ise sürücü, rota dışı ise hizmet alan taraf karar verir; oda yalnızca görür.',
      PAYMENT_READINESS: 'Bu sadece önizlemedir; ödeme başlatılmaz ve önce eksik kanıt/kalite kontrolü tamamlanır.',
      PAYMENT_MISSING: 'Bu sadece önizlemedir; eksik kanıtlar kapatılmadan hakediş hazır sayılmaz.',
      PAYMENT_PREVIEW: 'Bu sadece önizlemedir; tahsilat/fatura oluşturulmaz ve kanıt satırları okunur.',
      SHIFT_BLOCKED: 'Araç/sürücü bağı görünmüyorsa kontrol et; atanmış görünüyorsa sonraki kontrol konum sinyali/operasyon kanıtını kontrol et.',
      FEEDBACK_STATUS: 'Kayıt açık ya da kritik olduğu için tamamlanmış görünmüyor.',
      NOTIFICATION_SOURCE: 'Bildirim bir olay kaydına bağlı olduğu için kaynağı ayrıca okunmalı.',
      KVKK_VISIBILITY: 'Bilgi rol bazlı görünürlük nedeniyle gizli olabilir.',
      WHO_CAN_DO: 'Bu işlem rol sınırı yüzünden bu kullanıcıda görünmeyebilir.',
      MISSING_DATA: 'Boş alanlar yüzünden kayıt ilerlemiyor olabilir.',
      CONTRACT_TO_SHIFT: 'Şimdi: Bu sözleşme için bugün vardiya üretim sinyali görünüyor mu, önce onu kontrol et.',
      CONTRACT_SHIFT_TODAY: 'Şimdi: Bu sözleşme için bugün vardiya üretim sinyali görünüyor mu, önce onu kontrol et.',
      AGREEMENT_ROUTE_REFRESH: 'Bu sözleşmedeki rota değişikliği talebi eski rota, yeni rota ve teklif/kabul durumuyla birlikte okunur.',
      DRIVER_PHONE_GPS: 'Telefon konum sinyali cihaz konum sinyalinin yerine geçiyor olabilir.',
      VEHICLE_NOT_VISIBLE: 'Araç, görev bağlantısı, son GPS veya sürücünün telefonundan konum sinyali gelmediği için görünmüyor olabilir.',
      WHY_BLOCKED: operationHealthLead || 'Önce blokaj nedeni ve eksik alanı kontrol et.',
    };
    const whyCandidate = firstNonEmpty(
      selectedRecordMismatchLead,
      guidedTopicWhy,
      operationHealthLead,
      diagnosticPrioritySummary ? `En olası neden: ${diagnosticPrioritySummary}` : '',
      liveFactConfidenceSummary ? `Ekrandaki sinyale göre: ${liveFactConfidenceSummary}` : '',
      visibleActionSimulation ? `Öneri: ${ensureVisibleSentence(normalizeVisibleSuggestionFragment(visibleActionSimulation))}` : '',
      helperTopicMeta?.why || '',
      topicWhy[activeTopic],
      roleBoundary,
      sanitizeDiagnosticSupportText(firstNonEmpty(selectedMissingReply(screenContext, screenDefinition), selectedMissingReply(sourceScreenContext, sourceScreenDefinition), '')),
      sanitizeDiagnosticSupportText(firstNonEmpty(selectedFieldReply(message, screenContext, screenDefinition), selectedFieldReply(message, sourceScreenContext, sourceScreenDefinition), '')),
      sanitizeDiagnosticSupportText(firstNonEmpty(selectedBadgeReply(message, screenContext, screenDefinition), selectedBadgeReply(message, sourceScreenContext, sourceScreenDefinition), '')),
      sanitizeDiagnosticSupportText(firstNonEmpty(selectedSignalReply(screenContext, screenDefinition), selectedSignalReply(sourceScreenContext, sourceScreenDefinition), '')),
      firstNonEmpty(analysis?.reasoningLead, analysis?.compareHint, ''),
      needsSelection ? 'Önce ilgili satırı seç.' : '',
      'Bu ekrandaki veride kesin kanıt yok.',
    );
    const missingInfo = firstNonEmpty(
      selectedRecordMismatchLead,
      guidedTopicLabel ? `${guidedTopicLabel} için eksik bilgiyi kontrol et.` : '',
      diagnosticPrioritySummary ? `Öncelik: ${diagnosticPrioritySummary}` : '',
      liveFactConfidenceSummary ? `Sinyal özeti: ${liveFactConfidenceSummary}` : '',
      sanitizeDiagnosticSupportText(firstNonEmpty(selectedMissingReply(screenContext, screenDefinition), selectedMissingReply(sourceScreenContext, sourceScreenDefinition), '')),
      sanitizeDiagnosticSupportText(firstNonEmpty(selectedFieldReply(message, screenContext, screenDefinition), selectedFieldReply(message, sourceScreenContext, sourceScreenDefinition), '')),
      sanitizeDiagnosticSupportText(firstNonEmpty(selectedBadgeReply(message, screenContext, screenDefinition), selectedBadgeReply(message, sourceScreenContext, sourceScreenDefinition), '')),
      signalSummary,
      needsSelection ? 'Önce ilgili satırı seç.' : '',
      '',
    );
    const topicAdvice = {
      QUALITY_SIGNAL: 'Önce kalite sinyalini sağlayıcı puanı, inceleme kararı ve denetim iziyle birlikte oku.',
      SEFER_SCORE_PREVIEW: 'Önce zamanında hizmet, GPS kanıtı, görev tamamlama, şikâyet/itiraz, belge ve kalite sinyallerini oku; eksik veri varsa kesin hüküm verme.',
      MARKETPLACE_FREE_TO_OPERATE_PREVIEW: 'Önce kaynak vardiya / teklif seçimi sinyallerini ve SeferPuanı’nı oku; ek pay uygulanmaz ve ödeme başlatılmaz. Organizasyon planı tek başına kaynak kanıtı değildir.',
      BOARDING_CHANGE_REQUEST_ENTRY: 'Önce talep tipini, tarihi, servis/vardiya bağlamını ve konum seçimini gir. Konum gerekiyorsa Konumumu al, Büyük haritada konum seç ya da Adresten konum bul; konum çözümleme bağlı değilse açıklama ekle. Talep alındıktan sonra kimde beklediğini durum satırından oku.',
      PAYMENT_READINESS: 'Hakediş önizleme, ödeme hesabı ve hizmet/onay sinyalini kontrol et. Ödeme başlatılmaz.',
      PAYMENT_MISSING: 'Önce eksik kanıtları ve kalite kontrolünü tamamla; bu sadece önizlemedir.',
      PAYMENT_PREVIEW: 'Önce hakediş / kanıt önizleme kayıtlarını ve risk nedenlerini kontrol et; ödeme başlatılmaz.',
      DYNAMIC_SAVINGS_PREVIEW: 'Bu sadece önizlemedir. Km, süre, kapasite ve yaklaşık maliyet etkisini birlikte oku; uygulama, ödeme ve mutabakat başlatılmaz.',
      AGREEMENT_ROUTE_REFRESH: 'Önce şirket teklifini, oda karşı teklifini, eski rota ile yeni rota farkını ve kabul durumunu kontrol et; bu yalnızca teklif/önizleme akışıdır.',
      NEXT_SCREEN: 'Önce ilgili ekrana geç.',
      NEXT_STEP: 'Önce ilgili kayıt veya alanı kontrol et.',
      WHY_BLOCKED: operationHealthAdvice || 'Önce blokaj nedeni ve eksik alanı kontrol et.',
      SHIFT_BLOCKED: 'Başlatma zamanı ve aktif durum uygunsa konum sinyali/operasyon kanıtını kontrol et; araç/sürücü bağı görünmüyorsa kontrol et, atanmış görünüyorsa sonraki kontrol konum sinyali/operasyon kanıtını kontrol et.',
      FIRST_CONTROL: 'Önce ilgili satırı veya ilk kontrol alanını aç.',
      SAFE_NEXT_STEP: 'Önce en risksiz kayıt veya alanı kontrol et.',
      BOARDING_CHANGE_APPLICATION: firstNonEmpty(boardingRouteVisibilityLead, 'Bu değişiklik kabul edilmişse günlük atamaya işlenebilir; sürücü rotası yenilenmez. Önce kabul durumu ve günlük atama etkisini kontrol et.'),
      BOARDING_ROUTE_IMPACT_PREVIEW: 'Bu sadece önizlemedir. Rota/atama uygulanmadı. Kişi, durak, km, süre ve kapasite farkını birlikte oku.',
      STATUS_HELP: 'Önce durum satırını ve ilgili kaydı kontrol et.',
      FEEDBACK_STATUS: 'Önce açık veya kritik geri bildirimi ve sorumlu rolü kontrol et.',
      NOTIFICATION_SOURCE: 'Önce bildirimin kaynağı olan olay kaydını aç.',
      KVKK_VISIBILITY: 'Önce rol ve görünürlük sınırını kontrol et.',
      CONTRACT_TO_SHIFT: 'İlgili sözleşmeyi aç ve bugünkü vardiya üretim geçmişini kontrol et.',
      CONTRACT_SHIFT_TODAY: 'İlgili sözleşmeyi aç ve bugünkü vardiya üretim geçmişini kontrol et.',
      MISSING_DATA: 'Önce boş alanları ve eksik bilgi blokajını kontrol et.',
      WHO_CAN_DO: 'Önce yetki sınırını ve ilgili rolü kontrol et.',
      DRIVER_PHONE_GPS: 'Önce sürücünün telefonundan konum sinyali ile cihaz konum sinyali kaynağını ayır.',
      VEHICLE_NOT_VISIBLE: 'Önce araç GPS sinyali, görev bağlantısı, son GPS ve sürücünün telefonundan GPS sinyalini kontrol et.',
    };
    const bestNextAction = firstNonEmpty(
      selectedRecordMismatchLead,
      guidedTopicAdvice,
      operationHealthAdvice,
      visibleActionSimulation,
      helperTopicMeta?.advice || '',
      topicAdvice[activeTopic],
      analysis?.nextBestAction,
      analysis?.safestNextStep,
      screenDefinition?.firstStep,
      sourceScreenDefinition?.firstStep,
      selectedLabel ? `Önce ${selectedLabel} kaydını aç.` : '',
      'Önce ilgili satırı seç.',
    );
    const advice = firstNonEmpty(
      selectedRecordMismatchLead,
      guidedTopicAdvice,
      operationHealthAdvice,
      visibleActionSimulation,
      diagnosticPrioritySummary ? `Öncelik: ${diagnosticPrioritySummary}` : '',
      helperTopicMeta?.advice || '',
      topicAdvice[activeTopic],
      analysis?.nextBestAction,
      analysis?.safestNextStep,
      screenDefinition?.firstStep,
      sourceScreenDefinition?.firstStep,
      selectedLabel ? `Önce ${selectedLabel} kaydını aç.` : '',
      'Önce ilgili satırı seç.',
    );
    const topicLabel = firstNonEmpty(guidedTopicLabel, topicLabelForContext(activeTopic), '');
    const contextualSuggestedChips = buildContextualSuggestedChips({
      entityType,
      questionType,
      roleMode,
      screenPath,
      context,
      guidedTaskMeta,
      sourceScreenContext,
      _screenDefinition: screenDefinition,
      screenQuestions: Array.isArray(screenDefinition?.chatQuestions) ? screenDefinition.chatQuestions : [],
      activeTopic,
      isFollowUp,
      sameRecordLikely,
      needsSelection,
      selectedLabel: screenContext?.selectedLabel || '',
      selectedSummary: screenContext?.selectedSummary || '',
      roleBoundary,
    });
    const followUpPrompt = firstNonEmpty(
      ['HOW_TO_HELP', 'DETAIL_FLOW'].includes(String(questionType || '')) ? 'devamını anlat' : '',
      guidedTaskMeta?.clarificationQuestion || '',
      guidedTaskMeta?.chips?.[0] || '',
      needsSelection ? 'Önce ilgili satırı seç' : '',
      isFollowUp && !workflowQuestion ? 'İlgili kayıtla devam et' : '',
      visibleActionSimulation,
      bestNextAction,
      roleBoundary ? 'Yetki sınırını açıkla' : '',
      'Sıradaki doğru işlem ne?',
    );
    const contractWorkflowQuestion = ['CONTRACT_TO_SHIFT', 'CONTRACT_SHIFT_TODAY'].includes(String(activeTopic || questionType || ''));
    const contractProductionSignal = buildContractProductionSignalState(screenContext, sourceScreenContext);
    const contractSignalText = firstNonEmpty(
      contractProductionSignal.hasSignal ? contractProductionSignal.summaryText : '',
      diagnosticPrioritySummary,
      liveFactConfidenceSummary,
      '',
    );
    const contractSignalIsPositive = contractProductionSignal.hasSignal
      || (Boolean(contractSignalText) && !/(görünmüyor|gorunmuyor|yok|eksik|kesinleştiren sinyal görünmüyor|kesinlestiren sinyal gorunmuyor)/.test(normalizeText(contractSignalText)));
    const contractNowLead = contractSignalIsPositive
      ? firstNonEmpty(
        contractProductionSignal.summaryText,
        'Bu sözleşme için bugün vardiya üretim sinyali görünüyor.',
      )
      : 'Bu ekranda bu sözleşmeden bugün vardiya üretildiğini kesinleştiren sinyal görünmüyor.';
    const contractWhyLead = contractSignalIsPositive
      ? firstNonEmpty(
        contractProductionSignal.details ? `Bunu şuradan anlıyorum: ${contractProductionSignal.details}.` : '',
        `Bunu şuradan anlıyorum: ${contractSignalText}.`,
        topicAdvice[activeTopic],
        'Bu sözleşme için bugünkü üretim kaydı okunuyor.',
      )
      : 'Bu ekranda bu sözleşmeden bugün vardiya üretildiğini kesinleştiren sinyal görünmüyor.';
    const summaryLead = guidedTaskMeta?.familyId
      ? firstNonEmpty(
        selectedRecordMismatchLead,
        guidedTopicSummary ? `Bu iş: ${guidedTopicSummary}` : '',
        guidedTopicLabel,
        guidedTopicWhy,
        roleBoundary,
        evidenceConfidence,
        topicLabel,
        '',
      )
      : workflowQuestion
        ? (contractWorkflowQuestion
          ? pickWorkflowVisibleReply(
            selectedRecordMismatchLead,
            contractNowLead,
            contractWhyLead,
            roleBoundary,
            'Ekrandaki sinyale göre konuşuyorum.',
          )
          : pickWorkflowVisibleReply(
            selectedRecordMismatchLead,
            diagnosticPrioritySummary ? `Ekrandaki sinyale göre: ${diagnosticPrioritySummary}` : '',
            liveFactConfidenceSummary ? `Ekrandaki sinyale göre: ${liveFactConfidenceSummary}` : '',
            evidenceConfidence,
            roleBoundary,
            'Ekrandaki sinyale göre konuşuyorum.',
          ))
        : firstNonEmpty(
          selectedRecordMismatchLead,
          diagnosticPrioritySummary,
          liveFactConfidenceSummary ? `Ekrandaki sinyale göre: ${liveFactConfidenceSummary}` : '',
          evidenceConfidence,
          roleBoundary,
          topicLabel,
          '',
        );
    return {
      activeTopic,
      activeTopicLabel: topicLabel,
      operationHealthLead,
      operationHealthAdvice,
      isFollowUp,
      sameRecordLikely,
      needsSelection,
      selectedHasContract,
      selectedHasShift,
      selectedHasPayment,
      selectedHasVehicle,
      selectedHasGps,
      roleBoundary,
      evidenceConfidence,
      selectedRecordStatus,
      liveFactConfidence,
      diagnosticPriority,
      actionSimulation,
      bestNextAction,
      whyCandidate,
      missingInfo,
      advice,
      followUpPrompt,
      summaryLead,
      selectedRecordMismatchLead,
      contextualSuggestedChips,
      guidedTaskMeta,
      guidedTaskFamilyId: guidedTaskMeta?.familyId || '',
      guidedTaskLabel: guidedTopicLabel || '',
      guidedTaskSummary: guidedTopicSummary || '',
      guidedTaskAdvice: guidedTopicAdvice || '',
      guidedTaskWhy: guidedTopicWhy || '',
      guidedTaskProgressCommand: guidedTaskMeta?.progressCommand || '',
      guidedTaskProgressRaw: guidedTaskMeta?.progressRaw || '',
      guidedTaskQuestionType: guidedTaskMeta?.questionType || '',
      selectedLabel,
      selectedSummary,
      lastConcern,
      recentUserMessage: firstNonEmpty(recentUserMessage?.text, ''),
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

  // A modal or selected-record label is stronger evidence than token overlap
  // with an unrelated menu item.  For example, while the SUPER_ADMIN profile
  // modal contains "DemoRoom", "DemoRoom kaydını güvenli biçimde nereden
  // incelerim?" must stay on the current authorized rooms surface instead of
  // drifting to the similarly-scored "Güven ve Kalite" menu item.

  function hasCurrentRecordInspectionContext(message, screenContext = {}) {
    const text = normalizeText(message);
    if (!text) return false;
    const modalTitles = Array.isArray(screenContext?.uiHints?.modalTitles)
      ? screenContext.uiHints.modalTitles
      : [];
    const currentSurfaceText = [
      screenContext?.selectedLabel,
      screenContext?.selectedRecordLabel,
      screenContext?.selectedSummary,
      screenContext?.contextSummary,
      ...modalTitles.map((row) => (typeof row === 'string' ? row : row?.label)),
    ].filter(Boolean).join(' ');
    if (!currentSurfaceText) return false;
    const stopWords = new Set(['taşımacılık', 'firması', 'firmasi', 'profil', 'kayıt', 'kayit', 'seçili', 'secili', 'modal']);
    const currentTerms = normalizeText(currentSurfaceText)
      .split(/[^\p{L}\p{N}]+/u)
      .filter((term) => term.length >= 4 && !stopWords.has(term));
    const messageTerms = new Set(normalizeText(text).split(/[^\p{L}\p{N}]+/u).filter((term) => term.length >= 4));
    const sharesVisibleRecordTerm = currentTerms.some((term) => Array.from(messageTerms).some((messageTerm) =>
      term === messageTerm || term.startsWith(messageTerm) || messageTerm.startsWith(term),
    ));
    const inspectionRequest = /\b(?:incele\p{L}*|bak\p{L}*|g[oö]r[uü]nt[uü]le\p{L}*|g[oö]ster\p{L}*|detay\p{L}*|profil\p{L}*|nereden|neresi|hangi\s+(?:ekran|sayfa|panel))\b/iu.test(text);
    const recordReference = /\b(?:kay(?:ı|i)?t\p{L}*|profil\p{L}*|detay\p{L}*|ekran|sayfa|panel)\b/iu.test(text);
    return sharesVisibleRecordTerm && inspectionRequest && recordReference;
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

  function isCommercialFlowContractToShiftQuestion(message) {
    const text = normalizeText(extractUserQuestion(message));
    if (!text) return false;
    return (
      /(sözleşmeden|sozlesmeden).*(bugün|bugun).*(vardiya).*(üretildi|uretildi|oluştu|olustu)/.test(text) ||
      /(bugün|bugun).*(vardiya).*(üretildi|uretildi|oluştu|olustu).*(sözleşme|sozlesme)/.test(text) ||
      /(sözleşme|sozleşme|sozlesme).*(vardiya|shift)/.test(text)
    );
  }

  function looksLikeGuidedTaskActionMessage(message) {
    const text = normalizeText(extractUserQuestion(message));
    return Boolean(text) && /(?:vardiya|teklif|sözleşme|sozlesme|servis|rota|güzergâh|güzergah|guzergah|adres|konum|koordinat|kişi|kisiler|kişiler|personel|araç|arac|sürücü|surucu|plan).*(?:istiyorum|yapmak istiyorum|oluşturmak istiyorum|olusturmak istiyorum|açmak istiyorum|acmak istiyorum|planlamak istiyorum|kurmak istiyorum|hazırla|hazirla|gönder|gonder|göster|goster|ata|çevir|cevir|çıkar|cikar|yap|kur|oluştur|olustur|(?:aç|ac)(?:$|[^\\p{L}\\p{N}]))/u.test(text);
  }

  function hasExplicitForeignScreenReference(text) {
    return /\b(?:surucu|sofor|arac|teklif|sozlesme|harita|canli|ticari|hizmet|copilot)\p{L}*(?:\s+\p{L}+){0,2}\s+(?:ekran|sayfa|panel)\p{L}*\b/iu.test(text);
  }

  function normalizeRoleKey(value) {
    return normalizeText(value).replace(/\s+/g, '').replace(/_/g, '');
  }

  function normalizeRoleLeadSurface(text) {
    return String(text || '')
      .replace(/\bCOMPANY rolünde\b/gi, 'Şirket rolünde')
      .replace(/\bORGANIZATION rolünde\b/gi, 'Organizasyon rolünde')
      .replace(/\bDRIVER rolünde\b/gi, 'Sürücü rolünde')
      .replace(/\bROOM rolünde\b/gi, 'Oda rolünde')
      .replace(/\bPERSONEL rolünde\b/gi, 'Personel rolünde')
      .replace(/\bPARENT rolünde\b/gi, 'Veli rolünde')
      .replace(/\bSCHOOL rolünde\b/gi, 'Okul rolünde')
      .replace(/\bSUPER[_ ]?ADMIN rolünde\b/gi, 'Süper Yönetici rolünde');
  }

  function prettyScreenLabel(label) {
    const text = String(label || '').trim();
    if (!text) return '';
    return text
      .replace(/\bPlan\s*Builder\b/gi, 'Planlama Merkezi')
      .replace(/\bCompany\b/gi, 'Şirket')
      .replace(/\bRoom\b/gi, 'Oda')
      .replace(/\bDriver\b/gi, 'Sürücü')
      .replace(/\bParent\b/gi, 'Veli')
      .replace(/\bPersonel\b/gi, 'Personel')
      .replace(/\bSchool\b/gi, 'Okul')
      .replace(/\bOrganization\b/gi, 'Organizasyon')
      .replace(/\s+/g, ' ')
      .trim();
  }

  return {
    buildContextualSuggestedChips,
    buildContextPriorityDecision,
    pickScreenByKind,
    isRecordScopedQuestion,
    hasCurrentRecordInspectionContext,
    isGenericFlowQuestion,
    isDirectRouteRequest,
    isCommercialFlowContractToShiftQuestion,
    looksLikeGuidedTaskActionMessage,
    hasExplicitForeignScreenReference,
    normalizeRoleKey,
    normalizeRoleLeadSurface,
    prettyScreenLabel,
};
}
