import { buildConversationTaskState } from './conversationTaskState.js';
import { buildSelectedRecordText } from './conversationTaskStateSelectedRecord.js';
import { firstNonEmpty, uniqueStrings } from './replyShapes.js';
import { companyPlanningCenterSurfaceText, companyPlanningUiSurfaceText, ensureVisibleSentence, looksLikeClarifyingQuestionRequest, looksLikeCompanyPlanningSurfaceText, looksLikeDetailContinuationRequest, looksLikeNextBestActionQuestion, looksLikeOnboardingStartQuestion, looksLikeScreenStartQuestion, normalizeLooseText, normalizeRoleKey, normalizeText, normalizeVisibleReplyFragment, prettyScreenLabel } from './conversationTaskStateShared.js';

const GENERIC_SYMPTOM_RE = /(neden|niye|niçin|olmuyor|olmuyor|olamiyor|olamıyor|çalışmıyor|calismiyor|çalışmadı|calismadi|çıkmadı|cikmadi|çıkmıyor|cikmiyor|başlamadı|baslamadi|başlamıyor|baslamiyor|başlatamıyorum|baslatamiyorum|başlatmıyorum|baslatmiyorum|gelmedi|gelmiyor|yok|görünmüyor|gorunmuyor|bağlanmadı|baglanmadi|hata veriyor|hata verdi|boş|bos|stale|offline)/;
const GENERIC_ONLY_RE = /^(neden|niye|niçin|olmuyor|çalışmıyor|calismiyor|çalışmadı|calismadi|çıkmadı|cikmadi|çıkmıyor|cikmiyor|başlamadı|baslamadi|başlamıyor|baslamiyor|gelmedi|gelmiyor|yok|görünmüyor|gorunmuyor|başlatmıyor|baslatmiyor|hata veriyor|boş|bos)$/;
const GENERIC_SELECTION_RE = /^(bu\s+seçili\s+kayıt|bu\s+secili\s+kayit|seçili\s+kayıt|secili\s+kayit|bu\s+ekran|bu\s+panel|bu\s+sayfa|bu\s+ne|ne\s+bu|görünmüyor|gorunmuyor|yok|çıkmadı|cikmadi|çıkmıyor|cikmiyor|başlamadı|baslamadi|başlamıyor|baslamiyor|gelmedi|gelmiyor)$/;

function normalizeSentence(value) {
  return normalizeVisibleReplyFragment(firstNonEmpty(value, ''));
}

function sentence(value) {
  return ensureVisibleSentence(normalizeSentence(value));
}

function containsAny(text, needles = []) {
  const value = normalizeLooseText(text);
  if (!value) return false;
  return (Array.isArray(needles) ? needles : []).some((needle) => {
    const target = normalizeLooseText(needle);
    return Boolean(target) && value.includes(target);
  });
}

function joinTurkishList(items = []) {
  const rows = uniqueStrings((Array.isArray(items) ? items : []).map((item) => normalizeSentence(item)).filter(Boolean));
  if (!rows.length) return '';
  if (rows.length === 1) return rows[0];
  if (rows.length === 2) return `${rows[0]} ve ${rows[1]}`;
  return `${rows.slice(0, -1).join(', ')} ve ${rows[rows.length - 1]}`;
}

function selectedAnchor(snapshot = {}) {
  return firstNonEmpty(
    snapshot.selectedLabel,
    snapshot.selectedSummary,
    snapshot.taskState?.anchorLabel,
    snapshot.taskState?.selectedLabel,
    snapshot.taskState?.selectedSummary,
    snapshot.taskState?.selectedRecordStatus,
    snapshot.selectedRecordText,
    '',
  ).trim();
}

function selectedAnchorIsGeneric(value) {
  const text = normalizeLooseText(value);
  return !text || /^(bu\s+seçili\s+kayıt|bu\s+secili\s+kayit|seçili\s+kayıt|secili\s+kayit|bu\s+kayıt|bu\s+kayit)$/i.test(text);
}

function selectedDetailText(snapshot = {}) {
  const screenContext = snapshot.screenContext || {};
  const badgeTexts = Array.isArray(screenContext.selectedBadges)
    ? screenContext.selectedBadges.flatMap((item) => [item?.label, item?.value])
    : [];
  return uniqueStrings([
    ...badgeTexts,
    firstNonEmpty(snapshot.taskState?.selectedSummary, snapshot.selectedSummary, ''),
    firstNonEmpty(snapshot.taskState?.selectedRecordStatus, snapshot.selectedRecordStatus, ''),
  ]).join(' • ').trim();
}

function hasConcreteSelectedRecord(snapshot = {}) {
  const selectedType = normalizeRoleKey(firstNonEmpty(
    snapshot.selectedRecordType,
    snapshot.taskState?.selectedRecordType,
    snapshot.selectedEntityType,
    snapshot.taskState?.selectedEntityType,
    '',
  ));
  const selectedLabel = firstNonEmpty(
    snapshot.screenContext?.selectedLabel,
    snapshot.taskState?.selectedLabel,
    snapshot.selectedLabel,
    '',
  );
  const selectedSummary = firstNonEmpty(
    snapshot.screenContext?.selectedSummary,
    snapshot.taskState?.selectedSummary,
    snapshot.selectedSummary,
    '',
  );
  const selectedStatus = firstNonEmpty(
    snapshot.screenContext?.selectedRecordStatus,
    snapshot.taskState?.selectedRecordStatus,
    snapshot.selectedRecordStatus,
    '',
  );
  return Boolean(selectedType && selectedType !== 'screen' && (selectedLabel || selectedSummary || selectedStatus));
}

function buildSurfaceGroup(snapshot = {}) {
  if (snapshot.isFeedbackSurface) return 'FEEDBACK';
  if (snapshot.isSuperAdminSurface) return 'SUPERADMIN';
  if (snapshot.isParentLiveSurface) return 'PARENT_LIVE';
  if (snapshot.isPersonelLiveSurface) return 'PERSONEL_LIVE';
  if (snapshot.isDriverRouteSurface) return 'DRIVER_ROUTE';
  if (snapshot.isRoomVehiclesSurface) return 'ROOM_VEHICLES';
  if (snapshot.isRoomShiftsSurface) return 'ROOM_SHIFTS';
  if (snapshot.isCompanyOffersSurface) return 'COMPANY_OFFERS';
  if (snapshot.isCompanyShiftsSurface) return 'COMPANY_SHIFTS';
  if (snapshot.isCompanyOperationsSurface) return 'COMPANY_OPERATIONS';
  if (snapshot.isCompanyPlanningSurface) return 'COMPANY_PLANNING';
  return 'UNKNOWN';
}

function buildDiagnosticSnapshot(options = {}) {
  const message = firstNonEmpty(options.message, options.rawMessage, '');
  const normalizedMessage = normalizeLooseText(message);
  const screenPath = normalizeText(firstNonEmpty(
    options.screenPath,
    options.screenDefinition?.path,
    options.screenContext?.path,
    options.sourceScreenDefinition?.path,
    options.sourceScreenContext?.path,
    '',
  ));
  const screenLabel = firstNonEmpty(
    prettyScreenLabel(options.screenDefinition?.label),
    prettyScreenLabel(options.screenContext?.label),
    prettyScreenLabel(options.sourceScreenDefinition?.label),
    prettyScreenLabel(options.sourceScreenContext?.label),
    '',
  );
  const role = normalizeRoleKey(firstNonEmpty(options.userRole, options.user?.role, ''));
  const planningSurfaceText = normalizeLooseText(companyPlanningCenterSurfaceText({
    screenPath,
    screenDefinition: options.screenDefinition,
    screenContext: options.screenContext,
    sourceScreenDefinition: options.sourceScreenDefinition,
    sourceScreenContext: options.sourceScreenContext,
    conversationState: options.conversationState,
  }));
  const planningUiSurfaceText = normalizeLooseText(companyPlanningUiSurfaceText(options.conversationState));
  const visibleSurfaceText = normalizeLooseText(uniqueStrings([
    screenPath,
    screenLabel,
    options.screenDefinition?.menuPurpose,
    options.screenContext?.menuPurpose,
    options.sourceScreenDefinition?.menuPurpose,
    options.sourceScreenContext?.menuPurpose,
    options.screenDefinition?.summary,
    options.screenContext?.summary,
    options.sourceScreenDefinition?.summary,
    options.sourceScreenContext?.summary,
    options.screenDefinition?.screenExplanation,
    options.screenContext?.screenExplanation,
    options.sourceScreenDefinition?.screenExplanation,
    options.sourceScreenContext?.screenExplanation,
  ]).join(' • '));
  const taskState = buildConversationTaskState({
    message,
    rawMessage: firstNonEmpty(options.rawMessage, message, ''),
    questionType: options.questionType,
    conversationState: options.conversationState,
    screenContext: options.screenContext,
    sourceScreenContext: options.sourceScreenContext,
    screenDefinition: options.screenDefinition,
    sourceScreenDefinition: options.sourceScreenDefinition,
    guidedTaskMeta: options.guidedTaskMeta,
    contextPriority: options.contextPriority,
    analysis: options.analysis,
    roleMode: options.roleMode,
    userRole: options.userRole,
    entityType: options.entityType,
    screenPath,
  });
  const selectedRecordText = firstNonEmpty(
    buildSelectedRecordText({
      screenContext: options.screenContext,
      analysis: options.analysis,
      contextPriority: options.contextPriority,
    }),
    taskState?.selectedRecordStatus,
    taskState?.selectedSummary,
    taskState?.anchorLabel,
    '',
  );
  const selectedLabel = firstNonEmpty(
    options.screenContext?.selectedLabel,
    options.sourceScreenContext?.selectedLabel,
    taskState?.selectedLabel,
    taskState?.anchorLabel,
    '',
  );
  const selectedSummary = firstNonEmpty(
    options.screenContext?.selectedSummary,
    options.sourceScreenContext?.selectedSummary,
    taskState?.selectedSummary,
    taskState?.selectedRecordStatus,
    '',
  );
  const selectedEntityType = normalizeRoleKey(firstNonEmpty(
    options.screenContext?.selectedEntityType,
    options.sourceScreenContext?.selectedEntityType,
    taskState?.selectedEntityType,
    options.contextPriority?.selectedEntityType,
    '',
  ));
  const selectedEntityId = Number(firstNonEmpty(
    options.screenContext?.selectedEntityId,
    options.sourceScreenContext?.selectedEntityId,
    taskState?.selectedEntityId,
    options.contextPriority?.selectedEntityId,
    0,
  ) || 0);
  const selectedRecordType = normalizeRoleKey(firstNonEmpty(
    options.screenContext?.selectedRecordType,
    options.sourceScreenContext?.selectedRecordType,
    selectedEntityType,
    '',
  ));
  const hasSelection = Boolean(!selectedAnchorIsGeneric(selectedAnchor({
    selectedLabel,
    selectedSummary,
    selectedRecordText,
  })));
  const surfaceGroup = buildSurfaceGroup({
    isFeedbackSurface: Boolean(options.screenPath?.includes('/shared/feedback') || /\/shared\/feedback\b/.test(screenPath) || containsAny(visibleSurfaceText, ['geri bildirim', 'feedback'])),
    isSuperAdminSurface: screenPath.startsWith('/superadmin'),
    isParentLiveSurface: screenPath.includes('/parent/live') || containsAny(visibleSurfaceText, ['veli', 'çocuk', 'cocuk']),
    isPersonelLiveSurface: screenPath.includes('/personel/live') || screenPath.includes('/personel/my') || containsAny(visibleSurfaceText, ['personel', 'my ride']),
    isDriverRouteSurface: screenPath.includes('/driver/route') || screenPath.includes('/driver/today'),
    isRoomVehiclesSurface: screenPath.includes('/room/vehicles') || containsAny(visibleSurfaceText, ['araç', 'arac', 'vehicle']),
    isRoomShiftsSurface: screenPath.includes('/room/shifts') || containsAny(visibleSurfaceText, ['vardiya', 'shift', 'vardiyalar']),
    isCompanyOffersSurface: screenPath.includes('/company/agreements')
      || screenPath.includes('/company/commercial-flow')
      || screenPath.includes('/commercial-core')
      || containsAny(visibleSurfaceText, ['teklif', 'offer', 'sözleşme', 'sozlesme']),
    isCompanyShiftsSurface: screenPath.includes('/company/shifts'),
    isCompanyOperationsSurface: screenPath.includes('/company/operations') || containsAny(visibleSurfaceText, ['operasyon', 'operations']),
    isCompanyPlanningSurface: screenPath.includes('/company')
      && (
        screenPath.includes('/planning')
        || screenPath.includes('/planning-center')
        || looksLikeCompanyPlanningSurfaceText(planningSurfaceText)
        || looksLikeCompanyPlanningSurfaceText(visibleSurfaceText)
        || looksLikeCompanyPlanningSurfaceText(planningUiSurfaceText)
        || normalizeLooseText(screenLabel) === 'planlama merkezi'
      ),
  });
  const hasSymptomSignal = GENERIC_SYMPTOM_RE.test(normalizedMessage);
  const hasClarifyingSignal = Boolean(
    looksLikeClarifyingQuestionRequest(message)
    || looksLikeOnboardingStartQuestion(message)
    || looksLikeScreenStartQuestion(message)
    || looksLikeNextBestActionQuestion(message)
    || looksLikeDetailContinuationRequest(message)
  );
  const anchorText = firstNonEmpty(
    selectedRecordText,
    selectedLabel,
    selectedSummary,
    taskState?.anchorLabel,
    taskState?.selectedRecordStatus,
    '',
  );
  const anchoredExplicitly = Boolean(
    containsAny(normalizedMessage, [
      'servis',
      'araç',
      'arac',
      'rota',
      'durak',
      'vardiya',
      'teklif',
      'talep',
      'sözleşme',
      'sozlesme',
      'konum',
      'adres',
      'personel',
      'operasyon',
      'panel',
      'şirket',
      'sirket',
      'kayıt',
      'kayit',
      'check-in',
      'checkin',
      'gps',
      'geri bildirim',
      'feedback',
    ])
    || (surfaceGroup === 'ROOM_SHIFTS' && containsAny(normalizedMessage, ['başlatamıyorum', 'baslatamiyorum', 'başlamıyor', 'baslamiyor', 'başlamadı', 'baslamadi']))
    || (surfaceGroup === 'DRIVER_ROUTE' && containsAny(normalizedMessage, ['geldim', 'girdim', 'ulaştım', 'ulastim', 'check-in', 'checkin']))
    || (surfaceGroup === 'PARENT_LIVE' && containsAny(normalizedMessage, ['gelmedi', 'servis gelmedi']))
    || (surfaceGroup === 'SUPERADMIN' && containsAny(normalizedMessage, ['panel boş', 'panel bos', 'kayıt çıkmadı', 'kayit cikmadi', 'şirket görünmüyor', 'sirket gorunmuyor', 'yetki yok', 'yetki yok gibi']))
    || !selectedAnchorIsGeneric(anchorText)
  );
  const isAmbiguousOnly = Boolean(
    GENERIC_ONLY_RE.test(normalizedMessage)
    || GENERIC_SELECTION_RE.test(normalizedMessage)
    || (normalizedMessage.length > 0 && normalizedMessage.length <= 4)
    || (!anchoredExplicitly && hasSymptomSignal && !hasSelection && !hasClarifyingSignal)
  );
  return Object.freeze({
    ...options,
    message: String(message || ''),
    normalizedMessage,
    screenPath,
    screenLabel,
    role,
    visibleSurfaceText,
    planningSurfaceText,
    planningUiSurfaceText,
    surfaceGroup,
    selectedLabel,
    selectedSummary,
    selectedRecordText,
    selectedEntityType,
    selectedEntityId,
    selectedRecordType,
    hasSelection,
    hasSymptomSignal,
    hasClarifyingSignal,
    anchoredExplicitly,
    isAmbiguousOnly,
    taskState,
  });
}

const templateLead = (text) => (snapshot) => sentence(typeof text === 'function' ? text(snapshot) : text);
const templateChipList = (items) => (snapshot) => uniqueStrings((typeof items === 'function' ? items(snapshot) : items) || []).map((item) => normalizeSentence(item)).filter(Boolean);

const DIAGNOSTIC_TEMPLATES = {
  COMPANY_PLANNING_ROUTE_MISSING: { lead: templateLead('Rota genelde personel konumu eksikse, vardiya saati net değilse veya önizleme için yeterli durak yoksa oluşmaz.'), next: templateLead('Önce konumu eksik personelleri, sonra vardiya saatini kontrol edelim.'), chips: templateChipList(['Konumu eksik personeller', 'Vardiya saati', 'Durak sayısı', 'Plan personel listesi']) },
  COMPANY_PLANNING_PERSONNEL_MISSING: { lead: templateLead('Bu genelde personelin plana eklenmemesi, filtrede kalması veya konum/veri eksikliği yüzünden olur.'), next: templateLead('Önce plan personel listesini ve eksik konum uyarısını kontrol edelim.'), chips: templateChipList(['Plan personel listesi', 'Eksik konum uyarısı', 'Filtre', 'Plan kaydı']) },
  COMPANY_PLANNING_LOCATION_MISSING: { lead: templateLead('Konum eksikse rota ve vardiya önizlemesi eksik kalır.'), next: templateLead('Önce eksik konum uyarısını ve plan personel listesini kontrol edelim.'), chips: templateChipList(['Eksik konum uyarısı', 'Plan personel listesi', 'Vardiya önizlemesi', 'Duraklar']) },
  COMPANY_PLANNING_EMPTY: { lead: templateLead('Plan boşsa henüz personel, tarih/saat veya rota önizleme bilgisi girilmemiş olabilir.'), next: templateLead('Önce plan başlığını ve eksik alanları kontrol edelim.'), chips: templateChipList(['Plan başlığı', 'Tarih/saat', 'Rota önizlemesi', 'Eksik alanlar']) },
  COMPANY_OPERATIONS_LIVE_MISSING: { lead: templateLead('Canlı durum için aktif servis/vardiya, araç ataması ve GPS verisi gerekir.'), next: templateLead('Önce aktif operasyon var mı, sonra araç GPS durumu geliyor mu kontrol edelim.'), chips: templateChipList(['Aktif operasyon', 'Araç GPS', 'Tarih filtresi', 'Şirket bağlamı']) },
  COMPANY_OPERATIONS_VISIBILITY: { lead: templateLead('Operasyon görünmüyorsa aktif vardiya, tarih filtresi veya yetki/şirket bağlamı kontrol edilmeli.'), next: templateLead('Önce tarih ve aktif vardiya durumuna bakalım.'), chips: templateChipList(['Tarih filtresi', 'Aktif vardiya', 'Yetki bağlamı', 'Şirket kapsamı']) },
  COMPANY_OPERATIONS_GPS_MISSING: { lead: templateLead('Araç haritada yoksa ya GPS sinyali gelmiyordur ya da araç kayıt / bağlantı eksiktir.'), next: templateLead('Önce araç atamasını ve son konum zamanını kontrol edelim.'), chips: templateChipList(['Araç ataması', 'Son konum zamanı', 'GPS durumu', 'Harita']) },
  COMPANY_SHIFTS_NOT_STARTING: { lead: templateLead('Vardiya başlamıyorsa saat, araç-sürücü ataması veya operasyon hazırlığı eksik olabilir.'), next: templateLead('Önce vardiya zamanı, sonra araç-sürücü eşleşmesini kontrol edelim.'), chips: templateChipList(['Vardiya zamanı', 'Araç-sürücü eşleşmesi', 'Hazırlık durumu', 'Atama']) },
  COMPANY_SHIFTS_ASSIGNMENT_MISSING: { lead: templateLead('Atama yoksa vardiyaya personel, araç ya da sürücü bağlanmamış olabilir.'), next: templateLead('Önce seçili vardiyanın atama alanlarını kontrol edelim.'), chips: templateChipList(['Personel ataması', 'Araç ataması', 'Sürücü ataması', 'Seçili vardiya']) },
  COMPANY_OFFERS_MISSING: { lead: templateLead('Teklif görünmüyorsa talep henüz gönderilmemiş, tedarikçiden dönüş gelmemiş veya filtre / status farklı olabilir.'), next: templateLead('Önce talep durumu ve teklif filtresini kontrol edelim.'), chips: templateChipList(['Talep durumu', 'Teklif filtresi', 'Tedarikçi dönüşü', 'Seçili teklif']) },
  COMPANY_OFFERS_COMPARISON: { lead: templateLead('Teklifi karşılaştırırken önce fiyat sapması, kapasite uyumu ve güzergâh uygunluğunu kontrol etmek gerekir.'), next: templateLead('Hangisini önce açacağını seçmek için bu üç başlığa bakalım.'), question: templateLead('Hangisini önce açayım?'), chips: templateChipList(['Fiyat sapması', 'Kapasite uyumu', 'Güzergâh uygunluğu', 'Seçili teklif']) },
  ROOM_SHIFTS_START_BLOCKED: { lead: templateLead('Başlatma engeli genelde vardiya zamanı, araç-sürücü ataması veya GPS hazırlığı eksikliğinden olur.'), next: templateLead('Önce seçili vardiyanın atama ve canlı başlangıç durumunu kontrol edelim.'), chips: templateChipList(['Vardiya zamanı', 'Araç-sürücü ataması', 'Canlı başlangıç', 'Eksik atama']) },
  ROOM_SHIFTS_GPS_MISSING: { lead: templateLead('GPS yoksa araç bağlı olmayabilir, sürücü cihazı konum göndermiyor olabilir veya veri stale / offline durumdadır.'), next: templateLead('Önce araç-sürücü eşleşmesini ve son GPS zamanını kontrol edelim.'), chips: templateChipList(['Araç-sürücü eşleşmesi', 'Son GPS zamanı', 'Konum sinyali', 'Durum']) },
  ROOM_SHIFTS_NOT_VISIBLE: { lead: templateLead('Vardiya görünmüyorsa filtre, tarih ya da seçili vardiya bağlamı kontrol edilmeli.'), next: templateLead('Önce seçili vardiya ve tarih filtresini açalım.'), chips: templateChipList(['Tarih filtresi', 'Seçili vardiya', 'Filtre', 'Durum satırı']) },
  ROOM_VEHICLES_NOT_VISIBLE: { lead: templateLead('Araç görünmüyorsa filtre, oda / şirket bağlamı veya araç kaydı / aktiflik durumu kontrol edilmeli.'), next: templateLead('Seçili araç varsa onun durumundan başlayalım; yoksa araç listesini kontrol edelim.'), chips: templateChipList(['Filtre', 'Son GPS zamanı', 'Araç-sürücü', 'Bağlantı durumu']) },
  ROOM_VEHICLES_CONNECTION: { lead: templateLead('Bağlantı sorunu araç-sürücü eşleşmesi, aktif vardiya veya GPS sağlayıcı durumundan kaynaklanabilir.'), next: templateLead('Önce hangi aracı bağlamaya çalıştığını netleştirelim.'), chips: templateChipList(['Araç-sürücü eşleşmesi', 'Aktif vardiya', 'GPS sağlayıcı', 'Bağlantı durumu']) },
  DRIVER_ROUTE_MISSING: { lead: templateLead('Rota görünmüyorsa sürücüye aktif vardiya atanmamış, rota henüz başlatılmamış veya durak listesi hazır değildir.'), next: templateLead('Önce aktif vardiya ve atanmış araç bilgisini kontrol edelim.'), chips: templateChipList(['Aktif vardiya', 'Atanmış araç', 'Durak listesi', 'Sürücü rotası']) },
  DRIVER_CHECKIN_BLOCKED: { lead: templateLead('Check-in için doğru durak, doğru zaman ve konum / GPS uygunluğu gerekir.'), next: templateLead('Otomatik işlem yapmadan önce hangi durakta olduğunu ve konumun geldiğini kontrol edelim.'), chips: templateChipList(['Doğru durak', 'Doğru zaman', 'Konum / GPS', 'Otomatik işlem yok']) },
  PERSONEL_LIVE_SERVICE_MISSING: { lead: templateLead((snapshot) => `Servis görünmüyorsa genelde atanmış aktif vardiya yoktur, son GPS gelmemiştir ya da araç bağlantısı eksiktir.${selectedDetailText(snapshot) ? ` Seçili durum: ${selectedDetailText(snapshot)}.` : ''}`), next: templateLead('Önce servis saati, son GPS ve araç bağlantısını kontrol edelim.'), chips: templateChipList(['Araç nerede?', 'Son GPS ne zaman geldi?', 'Servis durumu ne?', "Sürücünün telefon GPS’i devrede mi?", 'Servis', 'Araç', 'Durak', 'Saat', 'Son GPS']) },
  PERSONEL_LIVE_VEHICLE_MISSING: { lead: templateLead((snapshot) => `Araç görünmüyorsa servis henüz başlamamış, son GPS gelmiyor veya araç bağlantısı eksik olabilir.${selectedDetailText(snapshot) ? ` Seçili durum: ${selectedDetailText(snapshot)}.` : ''}`), next: templateLead('Önce servis saati ve araç bağlantısını kontrol edelim.'), chips: templateChipList(['Araç nerede?', 'Son GPS ne zaman geldi?', 'Servis durumu ne?', "Sürücünün telefon GPS’i devrede mi?", 'Servis', 'Araç', 'Durak', 'Saat', 'Son GPS']) },
  PARENT_LIVE_ARRIVAL_MISSING: { lead: templateLead((snapshot) => `Servis gelmediyse önce planlanan servis saati, araç konumu ve bağlı vardiya kontrol edilir.${selectedDetailText(snapshot) ? ` Seçili durum: ${selectedDetailText(snapshot)}.` : ''}`), next: templateLead('Önce araç konumu, servis saati ve bağlı vardiyayı kontrol edelim.'), question: templateLead('Hangisini kontrol edelim?'), chips: templateChipList(['Servis saati', 'Araç konumu', 'Bağlı vardiya', 'Çocuğun servisi']) },
  PARENT_LIVE_LOCATION_MISSING: { lead: templateLead((snapshot) => `Konum görünmüyorsa araç GPS göndermiyor, servis henüz başlamamış veya atanmış vardiya bilgisi eksik olabilir.${selectedDetailText(snapshot) ? ` Seçili durum: ${selectedDetailText(snapshot)}.` : ''}`), next: templateLead('Önce araç konumu ve servis saatinden başlayalım.'), chips: templateChipList(['Araç konumu', 'Servis saati', 'Atanmış vardiya', 'GPS durumu']) },
  SUPERADMIN_COMPANY_MISSING: { lead: templateLead('Şirket görünmüyorsa filtre, kayıt durumu veya yetki bağlamı kontrol edilmeli.'), next: templateLead('Önce arama / filtreden mi, yoksa şirket kaydından mı kaynaklandığını ayıralım.'), chips: templateChipList(['Arama filtresi', 'Kayıt durumu', 'Rol kapsamı', 'Görünürlük']) },
  SUPERADMIN_PANEL_EMPTY: { lead: templateLead('Panel boşsa veri filtresi, yetki kapsamı veya ilgili kayıtların henüz oluşturulmamış olması kontrol edilmeli.'), next: templateLead('Önce tarih / filtre ve rol kapsamını kontrol edelim.'), chips: templateChipList(['Tarih filtresi', 'Rol kapsamı', 'Veri filtresi', 'Panel durumu']) },
  SUPERADMIN_RECORD_MISSING: { lead: templateLead('Kayıt çıkmadıysa filtre, kayıt durumu veya yetki bağlamı kontrol edilmeli.'), next: templateLead('Önce arama filtresi ve rol kapsamını ayıralım.'), chips: templateChipList(['Arama filtresi', 'Kayıt durumu', 'Rol kapsamı', 'Yetki bağlamı']) },
  SUPERADMIN_PERMISSION_CONTEXT: { lead: templateLead('Bu genelde rol kapsamı, kayıt durumu ya da görünürlük filtresi yüzünden olur.'), next: templateLead('Önce rol kapsamı ve kayıt filtresini kontrol edelim.'), chips: templateChipList(['Rol kapsamı', 'Kayıt filtresi', 'Görünürlük', 'Yetki bağlamı']) },
  FEEDBACK_SELECTED_STATUS: { lead: templateLead((snapshot) => `Seçili geri bildirim için açık durum, sorumlu rol ve son işlem bilgisi kontrol edilmeli.${selectedAnchor(snapshot) ? ` Seçili kayıt: ${selectedAnchor(snapshot)}.` : ''}`), next: templateLead('Önce seçili kaydı açıp durum satırına bakalım.'), chips: templateChipList(['Açık durum', 'Sorumlu rol', 'Son işlem', 'Seçili kayıt']) },
};

const DIAGNOSTIC_RULES = [
  { theme: 'COMPANY_PLANNING_ROUTE_MISSING', test: (snapshot) => snapshot.surfaceGroup === 'COMPANY_PLANNING' && snapshot.hasSymptomSignal && containsAny(snapshot.normalizedMessage, ['rota', 'durak']) && containsAny(snapshot.normalizedMessage, ['oluşmadı', 'olmadı', 'çıkmadı', 'yok', 'neden', 'görünmüyor']) },
  { theme: 'COMPANY_PLANNING_PERSONNEL_MISSING', test: (snapshot) => snapshot.surfaceGroup === 'COMPANY_PLANNING' && snapshot.hasSymptomSignal && containsAny(snapshot.normalizedMessage, ['personel']) },
  { theme: 'COMPANY_PLANNING_LOCATION_MISSING', test: (snapshot) => snapshot.surfaceGroup === 'COMPANY_PLANNING' && containsAny(snapshot.normalizedMessage, ['konum eksik', 'adres eksik', 'eksik konum']) },
  { theme: 'COMPANY_PLANNING_EMPTY', test: (snapshot) => snapshot.surfaceGroup === 'COMPANY_PLANNING' && containsAny(snapshot.normalizedMessage, ['plan boş', 'plan bos', 'boş plan', 'bos plan']) },
  { theme: 'COMPANY_OPERATIONS_LIVE_MISSING', test: (snapshot) => snapshot.surfaceGroup === 'COMPANY_OPERATIONS' && snapshot.hasSymptomSignal && containsAny(snapshot.normalizedMessage, ['canlı durum', 'canli durum', 'operasyon görünmüyor', 'operasyon gorunmuyor', 'operasyon yok']) },
  { theme: 'COMPANY_OPERATIONS_GPS_MISSING', test: (snapshot) => snapshot.surfaceGroup === 'COMPANY_OPERATIONS' && snapshot.hasSymptomSignal && containsAny(snapshot.normalizedMessage, ['araç haritada yok', 'arac haritada yok', 'gps gelmiyor', 'gps yok', 'araç görünmüyor', 'arac görünmüyor', 'arac gorunmuyor']) },
  { theme: 'COMPANY_SHIFTS_NOT_STARTING', test: (snapshot) => snapshot.surfaceGroup === 'COMPANY_SHIFTS' && snapshot.hasSymptomSignal && containsAny(snapshot.normalizedMessage, ['vardiya başlamıyor', 'vardiya baslamiyor', 'vardiya başlamadı', 'vardiya baslamadi', 'başlatamıyorum', 'baslatamiyorum']) },
  { theme: 'COMPANY_SHIFTS_ASSIGNMENT_MISSING', test: (snapshot) => snapshot.surfaceGroup === 'COMPANY_SHIFTS' && snapshot.hasSymptomSignal && containsAny(snapshot.normalizedMessage, ['atama yok', 'personel çıkmadı', 'personel cikmadi', 'araç-sürücü yok', 'arac-surucu yok', 'araç sürücü yok', 'arac surucu yok']) },
  { theme: 'COMPANY_OFFERS_MISSING', test: (snapshot) => snapshot.surfaceGroup === 'COMPANY_OFFERS' && snapshot.hasSymptomSignal && containsAny(snapshot.normalizedMessage, ['teklif görünmüyor', 'teklif gorunmuyor', 'teklif gelmedi', 'teklif yok']) },
  { theme: 'COMPANY_OFFERS_COMPARISON', test: (snapshot) => snapshot.surfaceGroup === 'COMPANY_OFFERS' && containsAny(snapshot.normalizedMessage, ['hangisi sorunlu']) },
  { theme: 'ROOM_SHIFTS_START_BLOCKED', test: (snapshot) => snapshot.surfaceGroup === 'ROOM_SHIFTS' && snapshot.hasSymptomSignal && containsAny(snapshot.normalizedMessage, ['başlatamıyorum', 'baslatamiyorum', 'başlamıyor', 'baslamiyor', 'başlamadı', 'baslamadi']) },
  { theme: 'ROOM_SHIFTS_GPS_MISSING', test: (snapshot) => snapshot.surfaceGroup === 'ROOM_SHIFTS' && snapshot.hasSymptomSignal && containsAny(snapshot.normalizedMessage, ['gps yok', 'gps gelmiyor', 'son gps', 'gps stale', 'gps offline']) },
  { theme: 'ROOM_SHIFTS_NOT_VISIBLE', test: (snapshot) => snapshot.surfaceGroup === 'ROOM_SHIFTS' && snapshot.hasSymptomSignal && containsAny(snapshot.normalizedMessage, ['vardiya görünmüyor', 'vardiya gorunmuyor', 'vardiya yok']) },
  { theme: 'ROOM_VEHICLES_NOT_VISIBLE', test: (snapshot) => snapshot.surfaceGroup === 'ROOM_VEHICLES' && snapshot.hasSymptomSignal && containsAny(snapshot.normalizedMessage, ['araç görünmüyor', 'arac görünmüyor', 'arac gorunmuyor', 'araç yok', 'arac yok']) },
  { theme: 'ROOM_VEHICLES_CONNECTION', test: (snapshot) => snapshot.surfaceGroup === 'ROOM_VEHICLES' && snapshot.hasSymptomSignal && containsAny(snapshot.normalizedMessage, ['bağlanmadı', 'baglanmadi', 'gps göndermiyor', 'gps gondermiyor']) },
  { theme: 'DRIVER_ROUTE_MISSING', test: (snapshot) => snapshot.surfaceGroup === 'DRIVER_ROUTE' && snapshot.hasSymptomSignal && containsAny(snapshot.normalizedMessage, ['rota çıkmadı', 'rota cikmadi', 'rota görünmüyor', 'rota gorunmuyor', 'rota yok', 'durak görünmüyor', 'durak gorunmuyor']) },
  { theme: 'DRIVER_CHECKIN_BLOCKED', test: (snapshot) => snapshot.surfaceGroup === 'DRIVER_ROUTE' && snapshot.hasSymptomSignal && containsAny(snapshot.normalizedMessage, ['check-in olmuyor', 'checkin olmuyor', 'check-in yapamıyorum', 'checkin yapamiyorum']) },
  { theme: 'PERSONEL_LIVE_SERVICE_MISSING', test: (snapshot) => snapshot.surfaceGroup === 'PERSONEL_LIVE' && hasConcreteSelectedRecord(snapshot) && snapshot.hasSymptomSignal && containsAny(snapshot.normalizedMessage, ['servis neden görünmüyor', 'servis neden gorunmuyor', 'servis görünmüyor', 'servis gorunmuyor', 'servis yok']) },
  { theme: 'PERSONEL_LIVE_VEHICLE_MISSING', test: (snapshot) => snapshot.surfaceGroup === 'PERSONEL_LIVE' && hasConcreteSelectedRecord(snapshot) && snapshot.hasSymptomSignal && containsAny(snapshot.normalizedMessage, ['araç yok', 'arac yok', 'araç görünmüyor', 'arac görünmüyor', 'arac gorunmuyor', 'konum görünmüyor', 'konum gorunmuyor']) },
  { theme: 'PARENT_LIVE_ARRIVAL_MISSING', test: (snapshot) => snapshot.surfaceGroup === 'PARENT_LIVE' && hasConcreteSelectedRecord(snapshot) && containsAny(snapshot.normalizedMessage, ['gelmedi', 'servis gelmedi']) && !/\bgelmedi\s+mi\b/.test(snapshot.normalizedMessage) },
  { theme: 'PARENT_LIVE_LOCATION_MISSING', test: (snapshot) => snapshot.surfaceGroup === 'PARENT_LIVE' && hasConcreteSelectedRecord(snapshot) && snapshot.hasSymptomSignal && containsAny(snapshot.normalizedMessage, ['konum görünmüyor', 'konum gorunmuyor', 'servis yok']) },
  { theme: 'SUPERADMIN_COMPANY_MISSING', test: (snapshot) => snapshot.surfaceGroup === 'SUPERADMIN' && containsAny(snapshot.normalizedMessage, ['şirket görünmüyor', 'sirket gorunmuyor', 'kayıt çıkmadı', 'kayit cikmadi']) },
  { theme: 'SUPERADMIN_PANEL_EMPTY', test: (snapshot) => snapshot.surfaceGroup === 'SUPERADMIN' && containsAny(snapshot.normalizedMessage, ['panel boş', 'panel bos']) },
  { theme: 'SUPERADMIN_RECORD_MISSING', test: (snapshot) => snapshot.surfaceGroup === 'SUPERADMIN' && snapshot.hasSymptomSignal && containsAny(snapshot.normalizedMessage, ['kayıt çıkmadı', 'kayit cikmadi', 'kayıt görünmüyor', 'kayit gorunmuyor']) },
  { theme: 'SUPERADMIN_PERMISSION_CONTEXT', test: (snapshot) => snapshot.surfaceGroup === 'SUPERADMIN' && containsAny(snapshot.normalizedMessage, ['yetki yok', 'yetki yok gibi', 'yetkim yok']) },
  { theme: 'FEEDBACK_SELECTED_STATUS', test: (snapshot) => snapshot.surfaceGroup === 'FEEDBACK' && snapshot.hasSelection && (snapshot.hasSymptomSignal || containsAny(snapshot.normalizedMessage, ['açık', 'acik', 'kritik', 'çözüldü', 'cozuldu', 'kapandı', 'kapandi'])) },
];

function detectSmartDiagnosticTheme(snapshot = {}) {
  if (!snapshot || snapshot.isAmbiguousOnly || snapshot.hasClarifyingSignal) return '';
  for (const rule of DIAGNOSTIC_RULES) {
    if (rule?.test?.(snapshot)) return String(rule.theme || '');
  }
  return '';
}

function buildDiagnosticReplyFromTemplate(template, snapshot) {
  if (!template) return '';
  const parts = [
    template.lead ? template.lead(snapshot) : '',
    template.next ? template.next(snapshot) : '',
    template.question ? template.question(snapshot) : '',
  ].map((part) => sentence(part)).filter(Boolean);
  return uniqueStrings(parts).join(' ').trim();
}

function buildDiagnosticChipsFromTemplate(template, snapshot) {
  if (!template) return [];
  const chips = template.chips ? template.chips(snapshot) : [];
  return uniqueStrings((Array.isArray(chips) ? chips : []).map((chip) => normalizeSentence(chip)).filter(Boolean));
}

export function buildSmartDiagnosticState(options = {}) {
  const snapshot = buildDiagnosticSnapshot(options);
  const theme = detectSmartDiagnosticTheme(snapshot);
  if (!theme) {
    return Object.freeze({
      ...snapshot,
      theme: '',
      reply: '',
      chips: [],
      isDiagnostic: false,
    });
  }
  const template = DIAGNOSTIC_TEMPLATES[theme] || null;
  const reply = buildDiagnosticReplyFromTemplate(template, snapshot);
  const chips = buildDiagnosticChipsFromTemplate(template, snapshot);
  return Object.freeze({
    ...snapshot,
    theme,
    reply,
    chips,
    isDiagnostic: Boolean(reply),
  });
}

export function buildSmartDiagnosticReply(options = {}) {
  return buildSmartDiagnosticState(options).reply;
}

export function buildSmartDiagnosticChips(options = {}) {
  return buildSmartDiagnosticState(options).chips;
}

export function detectSmartDiagnosticThemeOnly(options = {}) {
  return detectSmartDiagnosticTheme(buildDiagnosticSnapshot(options));
}
