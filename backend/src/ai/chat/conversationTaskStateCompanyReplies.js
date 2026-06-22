import { firstNonEmpty, uniqueStrings } from './replyShapes.js';
import {
  companyPlanningCenterDetailReply,
  companyPlanningCenterNextBestActionReply,
  companyPlanningCenterPurposeReply,
  companyPlanningCenterSurfaceText,
  companyPlanningUiSurfaceText,
  isPlanningCenterPath,
  looksLikeClarifyingQuestionRequest,
  looksLikeCompanyPlanningSurfaceText,
  looksLikeDetailContinuationRequest,
  looksLikeNextBestActionQuestion,
  normalizeLooseText,
  normalizeRoleKey,
  prettyScreenLabel,
} from './conversationTaskStateShared.js';

export function buildCompanySemanticOverrideReply({
  message,
  questionType,
  userRole,
  user,
  screenDefinition,
  screenContext,
  sourceScreenDefinition,
  sourceScreenContext,
  conversationState = null,
}) {
  const normalizedUserRole = normalizeRoleKey(firstNonEmpty(user?.role, userRole, ''));
  if (normalizedUserRole !== 'company') return '';
  const companyKind = normalizeRoleKey(firstNonEmpty(user?.companyKind, ''));
  if (companyKind && companyKind !== 'company') return '';

  const text = normalizeLooseText(message);
  const screenLabel = firstNonEmpty(
    prettyScreenLabel(screenDefinition?.label),
    prettyScreenLabel(screenContext?.label),
    prettyScreenLabel(sourceScreenDefinition?.label),
    prettyScreenLabel(sourceScreenContext?.label),
    '',
  );
  const _screenPath = firstNonEmpty(
    screenDefinition?.path,
    screenContext?.path,
    sourceScreenDefinition?.path,
    sourceScreenContext?.path,
    '',
  );
  const screenPathCandidates = uniqueStrings([
    screenDefinition?.path,
    screenContext?.path,
    sourceScreenDefinition?.path,
    sourceScreenContext?.path,
  ]);
  const screenLabelCandidates = uniqueStrings([
    screenLabel,
    prettyScreenLabel(sourceScreenDefinition?.label),
    prettyScreenLabel(sourceScreenContext?.label),
  ]);
  const normalizedScreenLabel = normalizeLooseText(screenLabelCandidates.join(' • '));
  const planningSurfaceText = normalizeLooseText(uniqueStrings([
    screenLabel,
    screenDefinition?.label,
    screenContext?.label,
    sourceScreenDefinition?.label,
    sourceScreenContext?.label,
    companyPlanningUiSurfaceText(conversationState),
    screenDefinition?.menuPurpose,
    screenContext?.menuPurpose,
    sourceScreenDefinition?.menuPurpose,
    sourceScreenContext?.menuPurpose,
    screenDefinition?.screenExplanation,
    screenContext?.screenExplanation,
    sourceScreenDefinition?.screenExplanation,
    sourceScreenContext?.screenExplanation,
    screenDefinition?.summary,
    screenContext?.summary,
    sourceScreenDefinition?.summary,
    sourceScreenContext?.summary,
    screenDefinition?.selectedSummary,
    screenContext?.selectedSummary,
    sourceScreenDefinition?.selectedSummary,
    sourceScreenContext?.selectedSummary,
    screenDefinition?.selectedRecordStatus,
    screenContext?.selectedRecordStatus,
    sourceScreenDefinition?.selectedRecordStatus,
    sourceScreenContext?.selectedRecordStatus,
    screenDefinition?.firstStep,
    screenContext?.firstStep,
    sourceScreenDefinition?.firstStep,
    sourceScreenContext?.firstStep,
    screenDefinition?.nextStep,
    screenContext?.nextStep,
    sourceScreenDefinition?.nextStep,
    sourceScreenContext?.nextStep,
  ]).join(' • '));
  if (looksLikeClarifyingQuestionRequest(message)) return '';
  const isCompanyShiftSurface = screenPathCandidates.some((value) => normalizeLooseText(value).includes('/company/shifts'))
    || screenLabelCandidates.some((value) => /vardiyalar|vardiya/.test(normalizeLooseText(value)));
  const isCompanyPlanningPath = screenPathCandidates.some((value) => isPlanningCenterPath(value));
  const isCompanyPlanningSurface = isCompanyShiftSurface
    || isCompanyPlanningPath
    || looksLikeCompanyPlanningSurfaceText(planningSurfaceText);

  if (/^(bunu sen yap|bunu senin yerine yap|bunu benim yerime yap)$/i.test(text)) {
    return 'Bunu senin yerine uygulayamam; ama güvenli bir hazırlık yapmana yardımcı olayım. Önce Vardiyalar ya da Planlama Merkezi ekranında ilgili kaydı aç. Sonra teklif, araç / sürücü uygunluğu ve sözleşme hazırlığı kontrollerini sırayla yap.';
  }
  if (/^teklifi kabul et$/i.test(text)) {
    return 'Teklifi senin yerine kabul edemem. Kabul öncesi fiyat, kapasite, kalite, araç / sürücü uygunluğu ve sözleşme hazırlığı kontrollerini adım adım gösterebilirim. Son onay yetkili kullanıcı tarafından verilmelidir.';
  }
  if (/^sözleşmeyi yürürlüğe al$/i.test(text) || /^sozlesmeyi yururluge al$/i.test(text)) {
    return 'Sözleşmeyi senin yerine yürürlüğe alamam. Sözleşme hazırlığı, taraf bilgileri, vardiya kapsamı, fiyat ve onay kontrollerini adım adım gösterebilirim. Son karar yetkili kullanıcı tarafından verilmelidir.';
  }
  if (/^aracı ata$/i.test(text) || /^araci ata$/i.test(text)) {
    return 'Aracı senin yerine atayamam. Şirket tarafında araç / sürücü uygunluğunu kontrol etmen için yönlendirebilirim. Son atama yetkili Oda veya operasyon kullanıcısı tarafından yapılmalıdır.';
  }
  const companyPlanningNextActionQuestion = looksLikeNextBestActionQuestion(text)
    || [
      'şimdi ne yapayım',
      'simdi ne yapayim',
      'ne yapayım',
      'ne yapayim',
      'nereden devam edeyim',
      'hangi adıma geçeceğim',
      'hangi adima gececegim',
    ].some((needle) => text.includes(needle));
  const companyPlanningCenterSurfaceTextValue = companyPlanningCenterSurfaceText({
    screenPath: _screenPath,
    screenDefinition,
    screenContext,
    sourceScreenDefinition,
    sourceScreenContext,
    conversationState,
  });
  if (['SCREEN_PURPOSE', 'SCREEN_EXPLANATION_HELP'].includes(String(questionType || '')) && String(_screenPath || '') === '/company' && !companyPlanningNextActionQuestion) {
    return 'Bu ekran, yeni işi kurma ve planlama için Planlama Merkezi ekranını kullanırsın. Yeni Plan Oluştur veya Rehberi Başlat ile akışı açarsın. Paket, tarih, saat, servis yönü, kapsam, personel, adres / konum, durak ve rota önizlemesini kontrol eder, oluşan vardiyayı Vardiyalar ekranında takip edersin.';
  }
  const companyStartQuestion = /^(bu programda company olarak ne yapmam gerekiyor|bu program ne işe yarıyor|bu program ne yapıyor|ben ne yapmam lazım|ben nereden başlamalıyım|ben ne yapmam gerekiyor)\??$/i.test(text);
  if (companyStartQuestion && ['PRODUCT_OVERVIEW_HELP', 'ROLE_EXPLANATION_HELP'].includes(String(questionType || ''))) {
    return 'Şirket rolünde servis ihtiyacını planlarsın. Önce Planlama Merkezi\'ne gir, Yeni Plan Oluştur veya Rehberi Başlat ile akışı aç. Paket, tarih, saat, servis yönü ve kapsamı seç. Personel, adres/konum, durak ve rota önizlemesini kontrol et. Eksik konum varsa önce konum incelemesini tamamla. Plan uygunsa teklif karşılaştırma ve sözleşme hazırlığına geçersin. Oluşan vardiyayı Vardiyalar ekranında takip eder, son onayı yetkili kullanıcı tarafından verirsin.';
  }
  if (/^girdim$/i.test(text) || /vardiyalar ekranına girdim/i.test(text)) {
    return isCompanyShiftSurface
      ? 'Vardiyalar ekranına girdin. Şimdi hangi yoldan ilerleyeceğimizi seçelim: yeni vardiya oluşturma, mevcut vardiyayı takip etme veya teklif / sözleşme hazırlığı. Seçili kayıt Vardiya #6 ise onun üzerinden de devam edebiliriz.'
      : '';
  }
  if (/^yaptım$/i.test(text)) {
    return isCompanyShiftSurface
      ? 'Tamam, aynı vardiya akışından devam edelim. Şimdi tarih / saat, personel-adres / konum ve teklif / sözleşme hazırlığı tarafında eksik var mı kontrol et. Yeni vardiya oluşturuyorsan sonraki adım Planlama Merkezi veya konum kontrolüdür; mevcut vardiyayı takip ediyorsan seçili kaydın durumunu oku.'
      : '';
  }
  if (/^bulamadım$/i.test(text)) {
    return isCompanyShiftSurface
      ? 'Bulamadığın şey yeni vardiya oluşturma alanıysa Vardiyalar ekranında yeni vardiya veya yeni plan oluştur alanını kontrol et. Bulamadığın şey seçili kayıt ise Liste, Teklif Pazarı veya Bekleyen sekmesinden ilgili vardiya / talep satırını seç. Hangisini bulamadığını yazarsan oradan devam edelim.'
      : '';
  }
  if (/^devam et$/i.test(text)) {
    return isCompanyShiftSurface
      ? 'Vardiyalar akışından devam edelim. Seçili Vardiya #6 üzerinden gidiyorsan önce tarih / saat, personel-adres / konum ve teklif / sözleşme hazırlığı durumunu kontrol et. Yeni vardiya oluşturuyorsan yeni plan adımına geç; mevcut vardiyayı takip ediyorsan seçili kaydın durumunu oku.'
      : '';
  }
  if (companyPlanningNextActionQuestion && /(planlama merkezi|rehberli mod|yeni plan oluştur|rehberi başlat|yeni plan)/.test(companyPlanningCenterSurfaceTextValue)) {
    return companyPlanningCenterNextBestActionReply();
  }
  if (looksLikeDetailContinuationRequest(text) && isCompanyPlanningSurface) {
    return `Aynı plan akışından devam edelim. ${companyPlanningCenterDetailReply()}`;
  }
  if (['SCREEN_FOCUS', 'WHAT_TO_CHECK'].includes(String(questionType || '')) && isCompanyPlanningSurface) {
    return 'Bu ekranda önce şirket konumu, tarih / saat, servis yönü ve kapsamı kontrol et. Sonra personel listesi, adres / konum, duraklar ve rota önizlemesine bak. Eksik konum varsa önce konum incelemesini tamamla. Plan uygunsa oluşan vardiyayı Vardiyalar ekranında takip et, ardından teklif ve sözleşme hazırlığına geç.';
  }
  if (['RISK_LIST', 'SCREEN_RISKS'].includes(String(questionType || '')) && isCompanyPlanningSurface) {
    return 'Başlıca riskler: şirket konumunun eksik olması, tarih / saat ya da servis yönünün yanlış seçilmesi, kapsamın dar ya da geniş gelmesi, personel listesindeki eksikler, adres / konum hatası ve durak / rota önizlemesinde sapma. Bunlardan biri varsa önce onu düzelt.';
  }
  if (/konumda sorun varsa ne yapacağım/i.test(text) || /konumda sorun varsa ne yapacagim/i.test(text)) {
    return 'Konumda sorun varsa önce adres bilgisini kontrol et: il, ilçe, mahalle, sokak ve bina bilgisi eksik mi bak. Eksik veya şüpheli adresleri konum incelemesine ayır. Konum netleşmeden rota, teklif ve sözleşme hazırlığını ilerletme. Ben adresin yeterli olup olmadığını yorumlayabilirim; konumu senin yerine otomatik değiştirmem.';
  }
  if (questionType === 'PRODUCT_OVERVIEW_HELP' && /bu programda company olarak ne yapmam gerekiyor/i.test(text)) {
    return 'Şirket rolünde servis ihtiyacını planlarsın. Önce Planlama Merkezi\'ne gir, Yeni Plan Oluştur veya Rehberi Başlat ile akışı aç. Paket, tarih, saat, servis yönü ve kapsamı seç. Personel, adres/konum, durak ve rota önizlemesini kontrol et. Eksik konum varsa önce konum incelemesini tamamla. Plan uygunsa teklif karşılaştırma ve sözleşme hazırlığına geçersin. Oluşan vardiyayı Vardiyalar ekranında takip eder, son onayı yetkili kullanıcı tarafından verirsin.';
  }
  if (['SCREEN_PURPOSE', 'SCREEN_EXPLANATION_HELP'].includes(String(questionType || '')) && /planlama merkezi/.test(normalizedScreenLabel)) {
    return companyPlanningCenterPurposeReply();
  }
  if (questionType === 'HOW_TO_HELP' && /vardiya.*nasıl.*oluştur|vardiya.*oluşturulur|nasıl.*vardiya.*oluştur/i.test(text)) {
    return "Vardiya oluşturmak için Şirket panelinde Planlama Merkezi'ne gir. Yeni Plan Oluştur veya Rehberi Başlat alanını aç. Paket, tarih, saat, servis yönü ve kapsamı seç. Personel, adres/konum, durak ve rota önizlemesini kontrol et. Eksik konum varsa önce konum incelemesini tamamla. Plan uygunsa oluşan vardiyayı Vardiyalar ekranında takip eder, teklif ve sözleşme hazırlığına geçersin.";
  }
  return '';
}
