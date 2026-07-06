import { firstNonEmpty, uniqueStrings } from './replyShapes.js';
import { resolveFollowUpContextQuestion, looksLikeShortFollowUp } from './conversationTaskStateFollowUps.js';
import { buildSmartDiagnosticState } from './conversationSmartDiagnostics.js';
import {
  companyPlanningCenterSurfaceText,
  companyPlanningCenterPurposeReply,
  companyPlanningCenterNextBestActionReply,
  companyPlanningCenterDetailReply,
  looksLikeCompanyPlanningSurfaceText,
  looksLikeDetailContinuationRequest,
  looksLikeNextBestActionQuestion,
  looksLikeOnboardingStartQuestion,
  normalizeLooseText,
  normalizeRoleKey,
  normalizeText,
  prettyScreenLabel,
} from './conversationTaskStateShared.js';

function hasAny(text, needles = []) {
  const value = normalizeLooseText(text);
  if (!value) return false;
  return (Array.isArray(needles) ? needles : []).some((needle) => {
    const target = normalizeLooseText(needle);
    return Boolean(target) && value.includes(target);
  });
}

function normalizeMatchText(value) {
  return normalizeLooseText(value).replace(/\u0307/g, '');
}

function makeClarifyingReply(question, alternative) {
  return uniqueStrings([
    `Netleştirelim: ${String(question || '').trim()}`,
    `Alternatif: ${String(alternative || '').trim()}`,
  ]).join(' ').trim();
}

function makeContinuationReply(text, alternative) {
  return uniqueStrings([
    `Devam edelim: ${String(text || '').trim()}`,
    `Alternatif: ${String(alternative || '').trim()}`,
  ]).join(' ').trim();
}

function looksLikeGenericReply(value) {
  const text = normalizeLooseText(value);
  if (!text) return true;
  return /^(şimdi|simdi|şu an|bu ekran|bu bilgi|bu kayıt|bu kayit|netleştirelim|netlestirelim|sade cevap|kısa cevap|kisa cevap|oda açısından|oda acisindan|şirket açısından|sirket acisindan|önce|once|ilk kontrol|ilk bakılacak yer|ilk bakilacak yer|kısaca|kisaca)/.test(text);
}

function buildSurfaceSnapshot({
  message = '',
  currentReply = '',
  questionType = '',
  screenPath = '',
  screenDefinition = null,
  screenContext = null,
  sourceScreenDefinition = null,
  sourceScreenContext = null,
  conversationState = null,
  contextPriority = null,
  analysis = null,
  context = null,
  roleMode = '',
  userRole = '',
  user = null,
} = {}) {
  const resolvedScreenPath = normalizeText(firstNonEmpty(
    screenPath,
    screenDefinition?.path,
    screenContext?.path,
    sourceScreenDefinition?.path,
    sourceScreenContext?.path,
    '',
  ));
  const screenLabel = firstNonEmpty(
    prettyScreenLabel(screenDefinition?.label),
    prettyScreenLabel(screenContext?.label),
    prettyScreenLabel(sourceScreenDefinition?.label),
    prettyScreenLabel(sourceScreenContext?.label),
    '',
  );
  const role = normalizeRoleKey(firstNonEmpty(userRole, user?.role, ''));
  const selectedLabel = firstNonEmpty(
    screenContext?.selectedLabel,
    screenContext?.selectedSummary,
    screenContext?.selectedRecordStatus,
    sourceScreenContext?.selectedLabel,
    sourceScreenContext?.selectedSummary,
    sourceScreenContext?.selectedRecordStatus,
    contextPriority?.selectedLabel,
    contextPriority?.selectedSummary,
    contextPriority?.selectedRecordStatus,
    conversationState?.lastSelectedLabel,
    conversationState?.lastSelectedSummary,
    conversationState?.lastEntityLabel,
    '',
  );
  const selectedSummary = firstNonEmpty(
    screenContext?.selectedSummary,
    screenContext?.selectedRecordStatus,
    sourceScreenContext?.selectedSummary,
    sourceScreenContext?.selectedRecordStatus,
    contextPriority?.selectedSummary,
    contextPriority?.selectedRecordStatus,
    '',
  );
  const selectedEntityType = normalizeRoleKey(firstNonEmpty(
    screenContext?.selectedEntityType,
    sourceScreenContext?.selectedEntityType,
    contextPriority?.selectedEntityType,
    conversationState?.taskState?.selectedEntityType,
    conversationState?.lastSelectedEntityType,
    '',
  ));
  const selectedEntityId = Number(firstNonEmpty(
    screenContext?.selectedEntityId,
    sourceScreenContext?.selectedEntityId,
    contextPriority?.selectedEntityId,
    conversationState?.taskState?.selectedEntityId,
    conversationState?.lastSelectedEntityId,
    0,
  ) || 0);
  const selectedRecordText = uniqueStrings([
    selectedLabel,
    selectedSummary,
    screenContext?.helpContextSummary,
    sourceScreenContext?.helpContextSummary,
    screenContext?.contextSummary,
    sourceScreenContext?.contextSummary,
  ]).join(' • ');
  const planningSurfaceText = normalizeLooseText(companyPlanningCenterSurfaceText({
    screenPath: resolvedScreenPath,
    screenDefinition,
    screenContext,
    sourceScreenDefinition,
    sourceScreenContext,
    conversationState,
  }));
  const visibleSurfaceText = normalizeLooseText(uniqueStrings([
    resolvedScreenPath,
    screenLabel,
    screenDefinition?.menuPurpose,
    screenContext?.menuPurpose,
    sourceScreenDefinition?.menuPurpose,
    sourceScreenContext?.menuPurpose,
    screenDefinition?.summary,
    screenContext?.summary,
    sourceScreenDefinition?.summary,
    sourceScreenContext?.summary,
    screenDefinition?.screenExplanation,
    screenContext?.screenExplanation,
    sourceScreenDefinition?.screenExplanation,
    sourceScreenContext?.screenExplanation,
  ]).join(' • '));
  const isFeedbackSurface = resolvedScreenPath.includes('/shared/feedback')
    || hasAny(visibleSurfaceText, ['geri bildirim', 'feedback']);

  return {
    message: String(message || ''),
    currentReply: String(currentReply || ''),
    questionType: String(questionType || ''),
    screenPath: resolvedScreenPath,
    screenLabel,
    role,
    roleMode: String(roleMode || ''),
    screenContext,
    sourceScreenContext,
    screenDefinition,
    sourceScreenDefinition,
    conversationState,
    contextPriority,
    analysis,
    context,
    selectedLabel,
    selectedSummary,
    selectedRecordText,
    selectedEntityType,
    selectedEntityId,
    hasRuntimeContext: Boolean(context),
    hasSelection: Boolean(selectedLabel || selectedSummary),
    isCompanyPlanningSurface:
      resolvedScreenPath.includes('/planning-center')
      || looksLikeCompanyPlanningSurfaceText(planningSurfaceText)
      || looksLikeCompanyPlanningSurfaceText(visibleSurfaceText)
      || normalizeLooseText(screenLabel) === 'planlama merkezi',
    isCompanyOperationsSurface:
      !isFeedbackSurface
      && (
        resolvedScreenPath.includes('/company/operations')
        || hasAny(visibleSurfaceText, ['operasyon', 'operations'])
      ),
    isRoomShiftsSurface:
      !isFeedbackSurface
      && (
        resolvedScreenPath.includes('/room/shifts')
        || (hasAny(visibleSurfaceText, ['vardiya', 'shift', 'vardiyalar']) && normalizeRoleKey(selectedEntityType) === 'shift')
      ),
    isRoomVehiclesSurface:
      !isFeedbackSurface
      && (
        resolvedScreenPath.includes('/room/vehicles')
        || hasAny(visibleSurfaceText, ['araç', 'arac', 'vehicle'])
      ),
    isDriverRouteSurface:
      !isFeedbackSurface
      && (
        resolvedScreenPath.includes('/driver/route')
        || resolvedScreenPath.includes('/driver/today')
      ),
    isPersonelLiveSurface:
      !isFeedbackSurface
      && (
        resolvedScreenPath.includes('/personel/live')
        || resolvedScreenPath.includes('/personel/my')
        || hasAny(visibleSurfaceText, ['personel', 'my ride'])
      ),
    isParentLiveSurface:
      !isFeedbackSurface
      && (
        resolvedScreenPath.includes('/parent/live')
        || hasAny(visibleSurfaceText, ['veli', 'çocuk', 'cocuk'])
      ),
    isFeedbackSurface,
    isGenericReply: looksLikeGenericReply(currentReply),
    rawText: normalizeLooseText(message),
    originalText: String(message || '').trim(),
  };
}

function buildCompanyPlanningReply(snapshot) {
  if (!snapshot.isCompanyPlanningSurface) return null;
  if (String(snapshot.screenPath || '').includes('/shifts')) return null;
  const text = normalizeMatchText(snapshot.rawText);
  if (!text) return null;
  const isActualPlanningCenterPath = String(snapshot.screenPath || '').includes('/planning-center');
  if (isActualPlanningCenterPath && /(?:bunu\s+nasıl\s+yap(?:acağım|acagim|ayım|ayim|arım|arim|abilirim)|nasıl\s+yap(?:acağım|acagim|ayım|ayim|arım|arim|abilirim)|bunu\s+nasıl\s+yaparsın|nasıl\s+başlarım)/.test(text)) {
    return makeClarifyingReply(
      'Planlama Merkezi’nde hangi kısmı yapmak istiyorsun: yeni plan oluşturma mı, mevcut planı inceleme mi, yoksa teklif / sözleşme hazırlığı mı?',
      'Önce ilgili plan satırını açıp durumu birlikte kontrol edelim.',
    );
  }
  if (isActualPlanningCenterPath && /(?:bu\s+ekranda\s+neye\s+bakmal[ıi]y[ıi]m|bu\s+ekranda\s+neyi\s+kontrol\s+etmeliyim|bu\s+ekranda\s+neye\s+bakay[ıi]m|ekranda\s+neye\s+bakmal[ıi]y[ıi]m|ekranda\s+neye\s+bakay[ıi]m|ilk\s+neyi\s+kontrol\s+etmeliyim|önce\s+neyi\s+kontrol\s+etmeliyim)/.test(text)) {
    return companyPlanningCenterPurposeReply();
  }
  if (!isActualPlanningCenterPath && /(?:bu\s+ekranda\s+neye\s+bakmal[ıi]y[ıi]m|bu\s+ekranda\s+neyi\s+kontrol\s+etmeliyim|bu\s+ekranda\s+neye\s+bakay[ıi]m|ekranda\s+neye\s+bakmal[ıi]y[ıi]m|ekranda\s+neye\s+bakay[ıi]m|ilk\s+neyi\s+kontrol\s+etmeliyim|önce\s+neyi\s+kontrol\s+etmeliyim)/.test(text)) {
    return 'Bu ekranda önce şirket konumu, tarih / saat, servis yönü ve kapsamı kontrol et. Sonra personel listesi, adres / konum, duraklar ve rota önizlemesine bak. Eksik konum varsa önce konum incelemesini tamamla. Plan uygunsa oluşan vardiyayı Vardiyalar ekranında takip et, ardından teklif ve sözleşme hazırlığına geç.';
  }
  if (/(?:bu\s+ekran\s+ne\s+için|bu\s+ekran\s+ne\s+icin|bu\s+ekran\s+ne\s+işe\s+yarar|bu\s+ekran\s+ne\s+ise\s+yarar|bu\s+ekran\s+ne\s+işe\s+yarıyor|bu\s+ekran\s+ne\s+ise\s+yariyor|bu\s+ekran\s+ne\s+demek|bu\s+ekran\s+ne\s+anlama\s+gelir)/.test(text)) {
    return companyPlanningCenterPurposeReply();
  }
  if (looksLikeNextBestActionQuestion(text) || /(?:sıradaki\s+doğru\s+i[şs]lem\s+ne|siradaki\s+dogru\s+islem\s+ne|şimdi\s+ne\s+yapay[ıi]m|simdi\s+ne\s+yapay[ıi]m|şimdi\s+ne\s+yapmal[ıi]y[ıi]m|simdi\s+ne\s+yapmaliyim|şimdi\s+ne\s+yapacağım|simdi\s+ne\s+yapacagim|bundan\s+sonra\s+ne\s+yapay[ıi]m|bundan\s+sonra\s+ne\s+yapmaliyim|nereden\s+devam\s+edeyim|hangi\s+adıma\s+geçeceğim|hangi\s+adima\s+gececegim|devamında\s+ne\s+var|devaminda\s+ne\s+var|sırada\s+hangi\s+i[şs]lem\s+var|sirada\s+hangi\s+islem\s+var)/.test(text)) {
    return companyPlanningCenterNextBestActionReply();
  }
  if (/(personelleri\s+ekledim|personelleri\s+ekledik|personel(ler)?i\s+ekledim|personel(ler)?i\s+ekledik|ekledim|ekledik)/.test(text)) {
    return 'Aynı plan akışından devam edelim. Şimdi adres / konum, durak ve rota önizlemesini kontrol et. Personeller tamamsa vardiyayı oluşturup Vardiyalar ekranında takip et.';
  }
  if (looksLikeDetailContinuationRequest(text) || /^(devam\s+et|devam|yaptım|yaptim|tamam|bulamadım|bulamadim)$/i.test(text)) {
    return `Aynı plan akışından devam edelim. ${companyPlanningCenterDetailReply()}`;
  }
  return null;
}

function buildCompanyOperationsReply(snapshot) {
  if (!snapshot.isCompanyOperationsSurface) return null;
  const text = normalizeMatchText(snapshot.rawText);
  if (!text) return null;
  if (/^(tamam|yaptım|yaptim|bulamadım|bulamadim|devam|devam et)$/i.test(text) || looksLikeDetailContinuationRequest(text)) {
    return 'Aynı operasyon akışından devam edelim. Önce açık iş, sorumlu rol ve risk sinyallerini kontrol et. Sonraki güvenli adım: ilgili kartı açıp durumu oku.';
  }
  if (!hasAny(text, ['bunu ne yapacağım', 'bunu ne yapacagim'])) return null;
  return makeClarifyingReply(
    'Bu operasyon kaydında açık işi mi, sorumlu rolü mü, yoksa sonraki adımı mı netleştireyim?',
    'Önce açık kartı açıp durum ve sorumlu alanını birlikte kontrol edelim.',
  );
}

function buildRoomShiftsReply(snapshot) {
  if (!snapshot.isRoomShiftsSurface) return null;
  const text = normalizeMatchText(snapshot.rawText);
  if (!text) return null;
  if (/(servis\s+neden\s+görünmüyor|servis\s+neden\s+gorunmuyor|konum\s+neden\s+görünmüyor|konum\s+neden\s+gorunmuyor|gps\s+neden\s+görünmüyor|gps\s+neden\s+gorunmuyor)/.test(text)) return null;
  const isStartQuestion = /(başlatayım\s+mı|baslatayim\s+mi|bunu\s+başlatayım\s+mı|bunu\s+baslatayim\s+mi)/.test(text);
  const isClarifyQuestion = /(ilgili\s+durumu\s+sor|ilgili\s+durumu\s+sormak|ilgili\s+durumu\s+netleştir|ilgili\s+durumu\s+netlestir|eksik\s+bilgi\s+ne)/.test(text);
  if (!isStartQuestion && !isClarifyQuestion) return null;
  const selected = snapshot.selectedLabel || snapshot.selectedSummary || 'bu vardiya';
  const reply = `Bu vardiya için canlı başlatma mı, araç-sürücü kontrolü mü, yoksa eksik bilgi mi netleştireyim? Önce doğru vardiya kaydını seçip durum ve atamayı birlikte kontrol edelim. ${selected ? `Seçili kayıt: ${selected}.` : ''}`.trim();
  return isClarifyQuestion
    ? makeClarifyingReply(
      'Bu vardiya için canlı başlatma mı, araç-sürücü kontrolü mü, yoksa eksik bilgi mi netleştireyim?',
      `Önce doğru vardiya kaydını seçip durum ve atamayı birlikte kontrol edelim. ${selected ? `Seçili kayıt: ${selected}.` : ''}`.trim(),
    )
    : reply;
}

function buildRoomVehiclesReply(snapshot) {
  if (!snapshot.isRoomVehiclesSurface) return null;
  const text = normalizeMatchText(snapshot.rawText);
  if (!text) return null;
  if (!/(başlatayım\s+mı|baslatayim\s+mi|bunu\s+başlatayım\s+mı|bunu\s+baslatayim\s+mi|niye\s+yok|neden\s+yok|görünmüyor|gorunmuyor|nerede|yok)/.test(text)) return null;
  const selectedText = normalizeMatchText(firstNonEmpty(snapshot.selectedLabel, snapshot.selectedSummary, ''));
  const screenText = normalizeMatchText(snapshot.screenLabel);
  const menuPurposeText = normalizeMatchText(firstNonEmpty(
    snapshot.screenDefinition?.menuPurpose,
    snapshot.screenContext?.menuPurpose,
    snapshot.sourceScreenDefinition?.menuPurpose,
    snapshot.sourceScreenContext?.menuPurpose,
    '',
  ));
  const selectedFields = Array.isArray(snapshot.screenContext?.selectedFields) ? snapshot.screenContext.selectedFields : [];
  const hasSpecificSelection = Boolean(
    selectedText
    && selectedText !== screenText
    && selectedText !== menuPurposeText
    && !/^(araçlar?|vehicle|vehicles|bu araç|bu araci?)$/.test(selectedText),
  );
  const hasDetailedFields = selectedFields.some((row) => /(?:araç|arac|sürücü|surucu|gps|konum|plaka)/.test(normalizeMatchText(firstNonEmpty(row?.label, row?.key, ''))));
  if (!hasSpecificSelection && !hasDetailedFields) {
    return makeClarifyingReply(
      'Hangi araç için bakayım? Seçili araç görünmüyor.',
      'Önce araç satırını seçip GPS ve sürücü bağını birlikte kontrol edelim.',
    );
  }
  const selectedVehiclePlate = firstNonEmpty(
    String(firstNonEmpty(snapshot.selectedRecordText, '')).match(/\b\d{2}[A-Z]{1,3}\d{2,}\b/i)?.[0] || '',
    String(firstNonEmpty(snapshot.selectedSummary, snapshot.selectedLabel, '')).match(/\b\d{2}[A-Z]{1,3}\d{2,}\b/i)?.[0] || '',
    '',
  );
  const selected = firstNonEmpty(selectedVehiclePlate, snapshot.selectedLabel, snapshot.selectedSummary, 'bu araç');
  return makeClarifyingReply(
    `Seçili araç ${selected} görünüyor.`,
    'Önce seçili araç kaydındaki GPS, sürücü, son konum veya durak bilgisini birlikte kontrol edelim.',
  );
}

function buildPersonelLiveReply(snapshot) {
  if (!snapshot.isPersonelLiveSurface) return null;
  const text = normalizeMatchText(snapshot.rawText);
  if (!text) return null;
  if (/(servis\s+neden\s+görünmüyor|servis\s+neden\s+gorunmuyor|servis\s+görünmüyor|servis\s+gorunmuyor|son\s+gps|araç\s+bağlantısı|arac\s+baglantisi)/.test(text)) return null;
  if (!/(niye\s+yok|neden\s+yok|niye\s+görünmüyor|niye\s+gorunmuyor|neden\s+görünmüyor|neden\s+gorunmuyor|görünmüyor|gorunmuyor|yok|nerede|bekliyor)/.test(text)) return null;
  return 'Personel Canlı ekranında hangi servis kaydı için bakayım: servis mi, araç mı, durak mı, yoksa saat mi? Önce bugünkü servis satırını açıp son GPS, araç bağlantısı ve durak bilgisini birlikte kontrol edelim.'.trim();
}

function buildParentLiveReply(snapshot) {
  if (!snapshot.isParentLiveSurface) return null;
  if (!snapshot.hasRuntimeContext) return null;
  const text = normalizeMatchText(snapshot.rawText);
  if (!text) return null;
  if (!/(gelmedi\s+m[iı]|gelmedi\s+mi|gelmedi|niye\s+yok|neden\s+yok|görünmüyor|gorunmuyor)/.test(text)) return null;
  const selected = snapshot.selectedLabel || snapshot.selectedSummary || 'bu öğrenci servisi';
  return makeClarifyingReply(
    `${selected} için araç konumu, servis saati veya bağlı vardiyadan hangisini netleştireyim?`,
    `Servis görünmüyorsa önce yetkili servis görünümünde ilgili öğrencinin servis satırını açıp son GPS ve ETA bilgisini kontrol edelim.`,
  );
}

function buildDriverRouteReply(snapshot) {
  if (!snapshot.isDriverRouteSurface) return null;
  const text = normalizeMatchText(snapshot.rawText);
  if (!text) return null;
  if (!/(geldim|girdim|ulaştım|ulastim|açtım|actim|tamam|devam|bulamadım|bulamadim|görünmüyor|gorunmuyor|yok|nerede|neden|niye)/.test(text)) return null;
  const selected = snapshot.selectedLabel || snapshot.selectedSummary || 'bu rota';
  if (/(geldim|girdim|ulaştım|ulastim|açtım|actim)/.test(text)) {
    return makeClarifyingReply(
      `${selected} için durak, şirket/varış veya tamamlanma bilgisinden hangisini netleştireyim?`,
      'Önce durak sırası ve ETA’yı birlikte kontrol edelim; yazma işlemi yapmadan sonraki güvenli adımı gösteririm.',
    );
  }
  return 'Devam edelim: önce durak sırası, şirket/varış ve tamamlanma durumunu kontrol et. Yazma işlemi yapmadan sonraki güvenli adımı birlikte seçelim.';
}

function buildFeedbackReply(snapshot) {
  if (!snapshot.isFeedbackSurface || !snapshot.hasSelection) return null;
  const text = normalizeMatchText(snapshot.rawText);
  if (!text) return null;
  const isFeedbackGeneric = /(?:bu\s+ne|bu\s+ekranda\s+neye\s+bakmal[ıi]y[ıi]m|bu\s+ekranda\s+neyi\s+kontrol\s+etmeliyim|bu\s+ekranda\s+neye\s+bakay[ıi]m|hangi\s+kayıt|hangi\s+kayit|hangisini\s+seçeyim|hangisini\s+sec(e|)yim|hangisini\s+seçmeliyim|hangisini\s+secmeliyim|ne\s+demek)/.test(text);
  const isFeedbackFollowUp = looksLikeShortFollowUp(text) || looksLikeDetailContinuationRequest(text) || /^(yaptım|yaptim|tamam|bulamadım|bulamadim)/.test(text);
  if (!isFeedbackGeneric && !isFeedbackFollowUp) {
    return null;
  }
  const selected = snapshot.selectedLabel || snapshot.selectedSummary || 'seçili geri bildirim';
  if (isFeedbackFollowUp) {
    return `Devam edelim: Seçili geri bildirim ${selected} için açık durum, sorumlu rol ve son işlem bilgisini birlikte kontrol edelim.`.trim();
  }
  return makeClarifyingReply(
    `Seçili geri bildirim ${selected} için açık durum, sorumlu rol ve son işlem bilgisini mi netleştireyim?`,
    'Önce seçili geri bildirim kaydını açıp durum ve sorumlu alanını birlikte kontrol edelim.',
  );
}

function buildFollowUpReply(snapshot) {
  if (!snapshot.conversationState) return null;
  const text = normalizeMatchText(snapshot.rawText);
  if (!looksLikeShortFollowUp(text)) return null;
  if (/\bne\s+yapay[ıi]m\b|\bne\s+yapmaliyim\b|\bne\s+yapacağım\b|\bne\s+yapacagim\b/.test(text)) return null;
  if (!snapshot.isGenericReply) return null;
  const resolved = resolveFollowUpContextQuestion({
    message: snapshot.message,
    conversationState: snapshot.conversationState,
    screenContext: snapshot.screenContext,
    screenDefinition: snapshot.screenDefinition,
    sourceScreenContext: snapshot.sourceScreenContext,
    sourceScreenDefinition: snapshot.sourceScreenDefinition,
    questionType: snapshot.questionType,
    roleMode: snapshot.roleMode,
    screenPath: snapshot.screenPath,
    analysis: snapshot.analysis,
  });
  if (!resolved) return null;
  if (normalizeMatchText(resolved) === text) return null;
  return String(resolved || '').trim();
}

function buildChipsForState(snapshot) {
  const text = normalizeMatchText(snapshot.rawText);
  if (snapshot.isCompanyPlanningSurface && /(bunu\s+nasıl\s+yap(?:acağım|acagim|ayım|ayim|arım|arim|abilirim)|nasıl\s+yap(?:acağım|acagim|ayım|ayim|arım|arim|abilirim)|bunu\s+nasıl\s+yaparsın)/.test(text)) {
    return ['Yeni plan oluştur', 'Mevcut planı incele', 'Teklif / sözleşme hazırlığı'];
  }
  if (snapshot.isCompanyPlanningSurface && /(personelleri\s+ekledim|personelleri\s+ekledik|personel(ler)?i\s+ekledim|personel(ler)?i\s+ekledik|ekledim|ekledik)/.test(text)) {
    return ['Devam et', 'Yaptım', 'Bulamadım', 'Detayını anlat'];
  }
  if (snapshot.isRoomShiftsSurface && /(başlatayım\s+mı|baslatayim\s+mi|bunu\s+başlatayım\s+mı|bunu\s+baslatayim\s+mi|ilgili\s+durumu\s+sor|ilgili\s+durumu\s+sormak|ilgili\s+durumu\s+netleştir|ilgili\s+durumu\s+netlestir|eksik\s+bilgi\s+ne)/.test(text)) {
    return ['Canlı başlatma zamanı', 'Araç / sürücü', 'Eksik bilgi', 'Durak / rota'];
  }
  if (snapshot.isRoomVehiclesSurface && /(başlatayım\s+mı|baslatayim\s+mi|bunu\s+başlatayım\s+mı|bunu\s+baslatayim\s+mi|niye\s+yok|neden\s+yok|görünmüyor|gorunmuyor|nerede|yok)/.test(text)) {
    return ['GPS', 'Sürücü', 'Son konum', 'Durak'];
  }
  if (snapshot.isPersonelLiveSurface && /(niye|neden|görünmüyor|gorunmuyor|yok|nerede)/.test(text)) {
    return ['Araç nerede?', 'Son GPS ne zaman geldi? / Saat', 'Servis durumu ne? / Durak', "Sürücünün telefon GPS’i devrede mi?"];
  }
  if (snapshot.isParentLiveSurface && /(gelmedi\s+m[iı]|gelmedi\s+mi|gelmedi|niye\s+yok|neden\s+yok|görünmüyor|gorunmuyor)/.test(text)) {
    return ['Araç konumu', 'Servis saati', 'Bağlı vardiya'];
  }
  if (snapshot.isDriverRouteSurface && /(geldim|girdim|ulaştım|ulastim|tamam|devam|yok|görünmüyor|gorunmuyor|neden|niye)/.test(text)) {
    return ['Durak sırası', 'Şirket/varış', 'Tamamlanma durumu', 'Yazma yapmadan devam et'];
  }
  if (snapshot.isCompanyOperationsSurface && /^(tamam|yaptım|yaptim|bulamadım|bulamadim|devam|devam et)$/i.test(text)) {
    return ['Devam et', 'İlgili kartı aç', 'Sorumlu rol', 'Risk'];
  }
  if (snapshot.isCompanyOperationsSurface && /(bunu\s+ne\s+yap(?:acağım|acagim))/i.test(text)) {
    return ['Açık iş', 'Sorumlu rol', 'Sonraki adım', 'Risk'];
  }
  if (snapshot.isFeedbackSurface && snapshot.hasSelection) {
    const isFeedbackGeneric = /(?:bu\s+ne|bu\s+ekranda\s+neye\s+bakmal[ıi]y[ıi]m|bu\s+ekranda\s+neyi\s+kontrol\s+etmeliyim|bu\s+ekranda\s+neye\s+bakay[ıi]m|hangi\s+kayıt|hangi\s+kayit|hangisini\s+seçeyim|hangisini\s+sec(e|)yim|hangisini\s+seçmeliyim|hangisini\s+secmeliyim|ne\s+demek)/.test(text);
    const isFeedbackFollowUp = looksLikeShortFollowUp(text) || looksLikeDetailContinuationRequest(text) || /^(yaptım|yaptim|tamam|bulamadım|bulamadim)/.test(text);
    if (isFeedbackGeneric || isFeedbackFollowUp) {
      return [
        'Seçili kaydı aç / Açık durum',
        'Başlatma zamanını kontrol et / Sorumlu rol',
        'Eksik veriyi göster / Son işlem',
        'Yetki sınırını açıkla / Notlar',
      ];
    }
  }
  if (buildFollowUpReply(snapshot)) {
    return ['Devam et', 'Yaptım', 'Bulamadım', 'Detayını anlat'];
  }
  return [];
}

export function buildDynamicQuestionState(options = {}) {
  const snapshot = buildSurfaceSnapshot(options);
  const smartDiagnosticState = buildSmartDiagnosticState({
    ...options,
    currentReply: snapshot.currentReply,
  });
  const reply =
    smartDiagnosticState.reply
    || buildCompanyPlanningReply(snapshot)
    || buildCompanyOperationsReply(snapshot)
    || buildRoomShiftsReply(snapshot)
    || buildRoomVehiclesReply(snapshot)
    || buildPersonelLiveReply(snapshot)
    || buildParentLiveReply(snapshot)
    || buildDriverRouteReply(snapshot)
    || buildFeedbackReply(snapshot)
    || buildFollowUpReply(snapshot)
    || '';

  const chips = buildChipsForState(snapshot);
  const diagnosticChips = Array.isArray(smartDiagnosticState.chips) ? smartDiagnosticState.chips : [];

  return {
    reply: String(reply || '').trim(),
    chips: chips.length ? chips : diagnosticChips,
    snapshot,
    smartDiagnosticState,
  };
}

export function buildDynamicQuestionReply(options = {}) {
  return buildDynamicQuestionState(options).reply;
}

export function buildDynamicQuestionChips(options = {}) {
  return buildDynamicQuestionState(options).chips;
}
