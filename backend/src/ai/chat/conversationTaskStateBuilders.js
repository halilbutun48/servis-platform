import { getScreenDefinitionForUser } from '../jobGuide/screenCatalog.js';
import { firstNonEmpty, uniqueStrings } from './replyShapes.js';
import {
  companyPlanningCenterDetailReply,
  detectReferencedRole,
  ensureVisibleSentence,
  isPlanningCenterPath,
  looksLikeDetailContinuationRequest,
  looksLikeOnboardingStartQuestion,
  looksLikeScreenStartQuestion,
  normalizeLooseText,
  normalizeRoleKey,
  normalizeText,
  normalizeVisibleReplyFragment,
  prettyScreenLabel,
  roleExplanationSentence,
  stepFlowSentence,
  stripStepLead,
  turkishRoleName,
} from './conversationTaskStateShared.js';
import {
  detectCopilotEBlockRuntimeAnswerTopic,
  getCopilotEBlockRuntimeAnswerTopicMeta,
} from './copilotEBlockRuntimeAnswerIntegration.js';
import {
  getSeferAbiReasoningRolePlaybook,
} from './seferAbiReasoningAssistant.js';

export function buildProductOverviewHelpReply({ message, userRole, user, roleMode, screenDefinition, screenContext }) {
  const roleKey = detectReferencedRole(message, userRole);
  const playbook = getSeferAbiReasoningRolePlaybook(roleKey, user);
  const normalizedRole = normalizeRoleKey(playbook.role);
  const knownRole = normalizedRole !== 'default';
  const roleName = turkishRoleName(normalizedRole, playbook.role);
  const roleSentence = firstNonEmpty(playbook.roleSentence, roleExplanationSentence(playbook.role));
  const stepLimit = roleMode === 'SIMPLE' || ['driver', 'personel', 'parent'].includes(normalizedRole) ? 2 : 3;
  const starterSteps = Array.isArray(playbook.starterSteps) ? playbook.starterSteps.slice(0, stepLimit) : [];
  const starterFlow = stepFlowSentence(starterSteps, stepLimit);
  const screenLabel = firstNonEmpty(prettyScreenLabel(screenDefinition?.label), prettyScreenLabel(screenContext?.label), '');
  const genericStartQuestion = looksLikeOnboardingStartQuestion(message) && !looksLikeScreenStartQuestion(message);
  const screenLead = screenLabel
    ? `Şu an ${screenLabel} ekranındaysan önce ${stripStepLead(genericStartQuestion ? firstNonEmpty(starterSteps[0], screenDefinition?.firstStep, 'ilk kartı aç.') : firstNonEmpty(screenDefinition?.firstStep, starterSteps[0], 'ilk kartı aç.'))}`
    : '';
  const intro = 'SeferPakt, servis operasyonunu planlamak, takip etmek ve kanıtı okumak için kullanılan bir platformdur.';
  const roleLead = knownRole ? `${roleName} rolünde ${roleSentence}` : '';
  const pathLead = knownRole
    ? starterFlow
    : `${starterFlow || 'Önce bugünkü planı aç. Sonra canlı takibi kontrol et. Ardından kanıt / kalite / audit ekranına bak.'} Hangi roldesin?`;
  return uniqueStrings([
    intro,
    roleLead,
    pathLead,
    screenLead,
  ]).join(' ').trim();
}

export function buildRoleExplanationHelpReply({ message, userRole, user, roleMode, screenDefinition, screenContext }) {
  const roleKey = detectReferencedRole(message, userRole);
  const playbook = getSeferAbiReasoningRolePlaybook(roleKey, user);
  const normalizedRole = normalizeRoleKey(playbook.role);
  const knownRole = normalizedRole !== 'default';
  const roleName = turkishRoleName(normalizedRole, playbook.role);
  const roleSentence = firstNonEmpty(playbook.roleSentence, roleExplanationSentence(playbook.role));
  const stepLimit = roleMode === 'SIMPLE' || ['driver', 'personel', 'parent'].includes(normalizedRole) ? 2 : 3;
  const starterSteps = Array.isArray(playbook.starterSteps) ? playbook.starterSteps.slice(0, stepLimit) : [];
  const starterFlow = stepFlowSentence(starterSteps, stepLimit);
  const screenLabel = firstNonEmpty(prettyScreenLabel(screenDefinition?.label), prettyScreenLabel(screenContext?.label), '');
  const genericStartQuestion = looksLikeOnboardingStartQuestion(message) && !looksLikeScreenStartQuestion(message);
  const screenLead = screenLabel
    ? `Şu an ${screenLabel} ekranındaysan önce ${stripStepLead(genericStartQuestion ? firstNonEmpty(starterSteps[0], screenDefinition?.firstStep, 'ilk karta bak.') : firstNonEmpty(screenDefinition?.firstStep, starterSteps[0], 'ilk karta bak.'))}`
    : '';
  const roleLead = knownRole
    ? `${roleName} rolünde ${roleSentence}`
    : 'Rol net değilse önce plan / teklif / sözleşme hattına, canlı takip / servis durumuna ya da kanıt / kalite / audit hattına bak.';
  const pathLead = knownRole ? starterFlow : 'Hangi roldesin?';
  return uniqueStrings([
    roleLead,
    pathLead,
    screenLead,
  ]).join(' ').trim();
}

export function buildScreenExplanationHelpReply({ guide, screenDefinition, screenContext, sourceScreenDefinition, sourceScreenContext, composeScreenPurposeWithCarry }) {
  const purpose = composeScreenPurposeWithCarry({ guide, screenDefinition, screenContext, sourceScreenDefinition, sourceScreenContext, allowCarryHint: false });
  const screenLabel = firstNonEmpty(prettyScreenLabel(screenDefinition?.label), prettyScreenLabel(screenContext?.label), prettyScreenLabel(sourceScreenDefinition?.label), prettyScreenLabel(sourceScreenContext?.label), 'bu ekran');
  const firstStep = firstNonEmpty(
    screenDefinition?.firstStep,
    guide?.whatToDoNow,
    guide?.screenExplanation,
    'ilk karta bak.',
  );
  const selected = normalizeVisibleReplyFragment(firstNonEmpty(
    screenContext?.selectedSummary,
    screenContext?.selectedRecordStatus,
    sourceScreenContext?.selectedSummary,
    sourceScreenContext?.selectedRecordStatus,
    '',
  ));
  return uniqueStrings([
    purpose,
    selected ? `Seçili kayıt: ${selected}.` : '',
    `Şu an ${screenLabel} ekranındaysan önce ${stripStepLead(firstStep)}`,
  ]).join(' ').trim();
}

export function buildHowToHelpReply({
  message,
  guide,
  screenDefinition,
  screenContext,
  sourceScreenDefinition,
  sourceScreenContext,
  roleMode,
  user,
  conversationState = null,
  getScreenDefinitionForUser: getScreenDefinitionForUserImpl = getScreenDefinitionForUser,
  workflowStages,
  simpleNowText,
  normalizeVisibleReplyFragment: normalizeVisibleReplyFragmentImpl = normalizeVisibleReplyFragment,
  ensureVisibleSentence: ensureVisibleSentenceImpl = ensureVisibleSentence,
}) {
  const preferredDefinition = screenDefinition || sourceScreenDefinition;
  const preferredContext = screenContext || sourceScreenContext;
  const roleKey = detectReferencedRole(message, user?.role || guide?.scope?.role || guide?.role || '');
  const playbook = getSeferAbiReasoningRolePlaybook(roleKey, user);
  const normalizedRole = normalizeRoleKey(playbook.role);
  const knownRole = normalizedRole !== 'default';
  const roleName = turkishRoleName(normalizedRole, playbook.role);
  const roleSentence = firstNonEmpty(playbook.roleSentence, roleExplanationSentence(playbook.role));
  const stepLimit = roleMode === 'SIMPLE' || ['driver', 'personel', 'parent'].includes(normalizedRole) ? 2 : 3;
  const roleStarterSteps = Array.isArray(playbook.starterSteps) ? playbook.starterSteps.slice(0, stepLimit) : [];
  const roleStarterFlow = stepFlowSentence(roleStarterSteps, stepLimit);
  const genericStartQuestion = looksLikeOnboardingStartQuestion(message) && !looksLikeScreenStartQuestion(message);
  const hasHowToReasoningLead = Boolean(firstNonEmpty(screenContext?.structuredFacts?.reasoningLead, sourceScreenContext?.structuredFacts?.reasoningLead, ''));
  const detailContinuation = looksLikeDetailContinuationRequest(message)
    && Boolean(conversationState?.lastQuestionType || (Array.isArray(conversationState?.recentMessages) && conversationState.recentMessages.length));
  const visibleHowToLabels = normalizeLooseText([
    screenDefinition?.label,
    screenContext?.label,
    sourceScreenDefinition?.label,
    sourceScreenContext?.label,
  ].filter(Boolean).join(' • '));
  const companyPlanningSurface = /planlama merkezi/.test(visibleHowToLabels)
    || /vardiya/.test(visibleHowToLabels)
    || isPlanningCenterPath(preferredDefinition?.path || preferredContext?.path || sourceScreenDefinition?.path || sourceScreenContext?.path || '');
  if (!detailContinuation && /vardiya.*nasıl.*oluştur|vardiya.*oluşturulur|nasıl.*vardiya.*oluştur/i.test(normalizeText(message)) && /vardiyalar/.test(visibleHowToLabels) && !hasHowToReasoningLead) {
    return companyPlanningCenterDetailReply();
  }
  if (detailContinuation && normalizedRole === 'company' && companyPlanningSurface) {
    return companyPlanningCenterDetailReply();
  }
  const resolvedCatalogDefinition = getScreenDefinitionForUserImpl(
    user || { role: guide?.scope?.role || guide?.role || '' },
    preferredContext || preferredDefinition || {},
    Number(preferredDefinition?.id || preferredContext?.id || 0),
  );
  const displayDefinition = resolvedCatalogDefinition?.path ? resolvedCatalogDefinition : preferredDefinition;
  const stepRows = workflowStages(displayDefinition, guide, roleMode === 'SIMPLE' ? 2 : 3);
  const workflow = normalizeVisibleReplyFragmentImpl(stepFlowSentence(
    stepRows.length
      ? stepRows.map((row) => firstNonEmpty(row?.action, row?.detail, row?.title, '')).filter(Boolean)
      : (Array.isArray(guide?.stepByStep) ? guide.stepByStep.slice(0, roleMode === 'SIMPLE' ? 2 : 3) : []),
    roleMode === 'SIMPLE' ? 2 : 3,
  ));
  const now = normalizeVisibleReplyFragmentImpl(simpleNowText(guide, preferredDefinition, 'İlk adımı seç.'));
  const directSteps = uniqueStrings([
    firstNonEmpty(preferredDefinition?.firstStep, ''),
    firstNonEmpty(preferredDefinition?.nextStep, ''),
  ]).join(' ');
  const body = firstNonEmpty(workflow, roleStarterFlow, directSteps, ensureVisibleSentenceImpl(firstNonEmpty(now, 'İlk adımı seç.')), 'İlk adımı seç.');
  const screenPath = firstNonEmpty(displayDefinition?.path, preferredDefinition?.path, preferredContext?.path, '');
  const screenLabels = uniqueStrings([
    firstNonEmpty(preferredDefinition?.label, preferredContext?.label, ''),
    firstNonEmpty(displayDefinition?.label, ''),
  ]).filter(Boolean);
  const labelSurfaceText = normalizeLooseText(screenLabels.join(' • '));
  const isVardiyalarLabel = /vardiyalar/.test(labelSurfaceText);
  if (isVardiyalarLabel && !hasHowToReasoningLead && !detailContinuation) {
    const planningLabel = firstNonEmpty(displayDefinition?.label, preferredDefinition?.label, preferredContext?.label, 'Planlama Merkezi');
    const starterLine = firstNonEmpty(roleStarterFlow, body, 'Önce ilgili akışı aç.');
    return `${planningLabel ? `Şu an ${planningLabel} ekranındaysan ` : ''}${starterLine}`.trim();
  }
  const screenLead = screenLabels.length > 1
    ? `Şu an ${screenLabels[0]} ekranındaysan. Şu an ${screenLabels[1]} ekranındaysan `
    : (screenLabels[0] ? `Şu an ${screenLabels[0]} ekranındaysan ` : '');
  const combinedBody = String(screenPath || '').includes('/company/shifts') && directSteps
    ? `${body} ${directSteps}`.trim()
    : body;
  if (detailContinuation) {
    const companyShiftDetail = normalizedRole === 'company'
      && /\/company\/shifts/.test(String(screenPath || ''))
      && /vardiya|planlama merkezi|yeni plan oluştur|rehberi başlat/.test(normalizeLooseText(firstNonEmpty(
        guide?.plainSummary,
        guide?.summary,
        guide?.screenExplanation,
        screenDefinition?.menuPurpose,
        screenDefinition?.screenExplanation,
        sourceScreenDefinition?.menuPurpose,
        sourceScreenDefinition?.screenExplanation,
        '',
      )));
    if (companyShiftDetail) {
      return [
        'Devamı:',
        '1. Planlama Merkezi > Yeni Plan Oluştur / Rehberi Başlat.',
        '2. Şirket konumunu ve servis başlangıç noktasını; paket/tarih/saat/servis yönü/kapsam.',
        '3. Personel: Excel ile toplu ekle ya da tek tek.',
        '4. Personel Konum Seçici; haritada mevcut konumu düzelt; adres / konum doğruluğunu kontrol et.',
        '5. Durakları hazırla; rota önizlemesi; yakın adresleri uygun duraklarda topla.',
        '6. Taslak vardiyayı oluştur; Vardiyalar ekranında takip et.',
        '7. Oda veya sağlayıcıdan teklif alma hazırlığı; sözleşme hazırlığı.',
      ].join(' ');
    }
    const detailRows = (Array.isArray(stepRows) ? stepRows : []).map((row, idx) => {
      const title = firstNonEmpty(row?.title, `Adım ${idx + 1}`);
      const action = firstNonEmpty(row?.action, row?.detail, row?.summary, '');
      const doneWhen = row?.doneWhen ? ` Tamam say: ${row.doneWhen}` : '';
      return `${idx + 1}. ${title}${action ? `: ${action}` : ''}${doneWhen}`;
    }).filter(Boolean);
    const detailBody = detailRows.length ? detailRows.join(' ') : firstNonEmpty(roleStarterFlow, combinedBody, body, 'İlk adımı aç.');
    return `Devamı şöyle: ${detailBody}`.trim();
  }
  if (genericStartQuestion) {
    const startIntro = knownRole
      ? `${roleName} rolünde ${roleSentence}`
      : 'Önce rolünü netleştirelim.';
    const starterLine = roleStarterFlow || combinedBody || 'Önce bugünkü plan / vardiya akışını aç. Sonra canlı takip / servis durumuna bak. Ardından kanıt / kalite / audit ekranını kontrol et.';
    const screenLeadText = screenLabels[0]
      ? `Şu an ${screenLabels[0]} ekranındaysan önce ${stripStepLead(firstNonEmpty(preferredDefinition?.firstStep, roleStarterSteps[0], 'ilk adımı kontrol et.'))}`
      : '';
    return uniqueStrings([
      startIntro,
      starterLine,
      screenLeadText,
      !knownRole ? 'Hangi roldesin?' : '',
    ]).join(' ').trim();
  }
  return `${screenLead}${combinedBody}`.trim();
}

export function buildCopilotEBlockRuntimeAnswerReply({ questionType, message, screenDefinition, sourceScreenDefinition, contextPriority = null }) {
  const screenPath = firstNonEmpty(screenDefinition?.path, sourceScreenDefinition?.path, '');
  const topicId = firstNonEmpty(
    questionType,
    contextPriority?.activeTopic,
    detectCopilotEBlockRuntimeAnswerTopic({ message, questionType, screenPath }),
  );
  const topicMeta = getCopilotEBlockRuntimeAnswerTopicMeta(topicId);
  if (!topicMeta) return '';
  const screenLabel = firstNonEmpty(prettyScreenLabel(screenDefinition?.label), prettyScreenLabel(sourceScreenDefinition?.label), 'bu ekran');
  const why = firstNonEmpty(topicMeta.why, 'Bu isteği güvenli sınırda okudum.');
  const advice = firstNonEmpty(topicMeta.advice, 'Kullanıcı onayını ve eksik veriyi kontrol et.');
  const screenLead = `Şu an ${screenLabel} ekranındasın.`;

  switch (topicId) {
    case 'EXCEL_ROUTE_PREVIEW':
      return `Şimdi: Doğrudan rota oluşturamam. ${screenLead} Excel’den satırları yorumlayabilirim ama otomatik import, veri yazma, rota oluşturma ve dış rota çağrısı başlatmam. Yapabileceğim güvenli şeyler: kolonları yorumlamak, eksik adresleri bulmak, adres güvenini açıklamak, hazırlık durumunu anlatmak ve kullanıcı onayı kontrol listesi hazırlamak. Neden? ${why} Öneri: ${advice} Sıradaki doğru işlem: Excel satırlarını, eksik adresleri ve kullanıcı onayını kontrol et.`;
    case 'ADDRESS_GEOCODE_PREVIEW':
      return `Şimdi: Doğrudan adres düzeltmesi yapamam. ${screenLead} Adresleri yorumlayabilirim ama otomatik adres yazma ve sistem güncellemesi başlatmam. Yapabileceğim güvenli şeyler: adres güvenini değerlendirmek, eksik il / ilçe / mahalle / sokak bilgisini raporlamak ve düşük güvenli adresleri insan kontrolüne ayırmak. Neden? ${why} Öneri: ${advice} Sıradaki doğru işlem: Eksik adres alanlarını ve insan kontrolünü sırala.`;
    case 'OSRM_ROUTE_DRAFT_PREVIEW':
      return `Şimdi: Mesafe ve süre önizlemesini çıkaramam. ${screenLead} Rota taslağını yorumlayabilirim ama otomatik rota hesaplama ve uygulama başlatmam. Yapabileceğim güvenli şeyler: adres ve durak hazırlığını kontrol etmek, kullanıcı onayı gereksinimini sıralamak. Neden? ${why} Öneri: ${advice} Sıradaki doğru işlem: Önce adres ve durak listesini kontrol et.`;
    case 'ROUTE_REVIEW_HUMAN_APPROVAL':
      return `Şimdi: Bu rota için gerçek uygulama başlatamam. ${screenLead} Onayınız gerekli; ben yalnızca önizleme ve risk özetini okuyabilirim. Yapabileceğim güvenli şeyler: önizleme, risk özeti, geri alma notu ve onay durumunu kontrol etmek. Neden? ${why} Öneri: ${advice} Sıradaki doğru işlem: Önizleme, risk özeti ve onay durumunu kontrol et.`;
    case 'ROUTE_APPLY_BLOCKED':
      return `Şimdi: Rotayı uygulayamam. ${screenLead} Uygulama, dağıtım ve günlük atamaya işleme kapalı. Yapabileceğim güvenli şeyler: önizleme, risk özeti, kullanıcı onayı ve geri alma notunu kontrol etmek. Neden? ${why} Öneri: ${advice} Sıradaki doğru işlem: Uygulama yerine önizleme ve onay durumunu kontrol et.`;
    case 'IMPORT_WRITE_BLOCKED':
      return `Şimdi: Bu Excel’i sisteme kaydedemem. ${screenLead} Toplu yazma, DB write ve personel oluşturma kapalı. Yapabileceğim güvenli şeyler: eksik kolonları bulmak, KVKK sınırını kontrol etmek ve kullanıcı onayı kontrol listesi hazırlamak. Neden? ${why} Öneri: ${advice} Sıradaki doğru işlem: Eksik kolonları ve kullanıcı onayını kontrol et.`;
    case 'FAKE_SUCCESS_REQUEST_BLOCKED':
      return `Şimdi: Yapmış gibi söyleyemem. ${screenLead} Sahte başarı üretmem; gerçek yapmadan yalnızca gerçekten doğrulanmış sinyali paylaşırım. Yapabileceğim güvenli şeyler: gerçekten yapılanı, eksik kalanları ve sonraki doğru adımı açıkça ayırmak. Neden? ${why} Öneri: ${advice} Sıradaki doğru işlem: Gerçek sinyali ve eksik kalan adımı açıkça ayır.`;
    default:
      return `Şimdi: ${screenLead} ${why} Öneri: ${advice} Sıradaki doğru işlem: Kullanıcı onayını ve eksik veriyi kontrol et.`;
  }
}

export function buildCopilotEBlockRuntimeAnswerGuide({ topicMeta, guideLevel, screenDefinition, sourceScreenDefinition }) {
  const screenLabel = firstNonEmpty(prettyScreenLabel(screenDefinition?.label), prettyScreenLabel(sourceScreenDefinition?.label), 'bu ekran');
  const why = firstNonEmpty(topicMeta?.why, '');
  const advice = firstNonEmpty(topicMeta?.advice, '');
  const blocked = Array.isArray(topicMeta?.blockedActions) ? topicMeta.blockedActions : [];
  const neverAutomate = Array.isArray(topicMeta?.neverAutomate) ? topicMeta.neverAutomate : [];
  const chips = Array.isArray(topicMeta?.chips) ? [...topicMeta.chips] : [];
  return {
    jobTitle: firstNonEmpty(topicMeta?.label, `${screenLabel} rehberi`),
    jobPurpose: why || advice,
    plainSummary: why || advice || `${screenLabel} için güvenli hazırlık rehberi.`,
    summary: why || advice || `${screenLabel} için güvenli hazırlık rehberi.`,
    whatToDoNow: advice || 'Kullanıcı onayını ve eksik veriyi kontrol et.',
    whatToDoNext: advice || 'Kullanıcı onayını ve eksik veriyi kontrol et.',
    doNotDo: blocked.length ? blocked.join(' • ') : neverAutomate.join(' • '),
    stepByStep: [why, advice].filter(Boolean),
    commonMistakes: neverAutomate.length ? [...neverAutomate] : [],
    doneChecklist: advice ? [advice] : [],
    simpleTerms: chips,
    screenExplanation: why || advice || `${screenLabel} için güvenli hazırlık rehberi.`,
    menuPurpose: screenDefinition?.menuPurpose || sourceScreenDefinition?.menuPurpose || null,
    buttonGuides: [],
    screenMenus: [],
    quickActions: [],
    ifStuck: [],
    copyOutputs: [],
    whyBlocked: why,
    lockedActionReasons: blocked,
    guideLevel,
  };
}
