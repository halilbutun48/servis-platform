import { firstNonEmpty, uniqueStrings } from './replyShapes.js';
import {
  companyPlanningCenterSurfaceText,
  companyPlanningUiSurfaceText,
  ensureVisibleSentence,
  looksLikeClarifyingQuestionRequest,
  looksLikeCompanyPlanningSurfaceText,
  looksLikeDetailContinuationRequest,
  looksLikeNextBestActionQuestion,
  normalizeLooseText,
  normalizeText,
  normalizeVisibleReplyFragment,
  prettyScreenLabel,
} from './conversationTaskStateShared.js';

export const COPILOT_RISK_SCORING_ENGINE_VERSION = 'COPILOT-RISK-SCORING-ENGINE-01';

const DEFAULT_RISK_CHIPS = Object.freeze([
  'Konum riski',
  'Tarih / saat riski',
  'Personel açığı',
  'Rota önizleme riski',
]);

const RISK_INTENT_RE = /(?:riskleri\s+sırala|riskleri\s+sirala|risk\s+listesi|başlıca\s+riskler|baslica\s+riskler|en\s+büyük\s+riskler|en\s+buyuk\s+riskler|risk\s+var\s+mı|risk\s+var\s+mi|risk\s+seviyesi|riskli\s+mi|en\s+riskli|en\s+kritik|hangisi\s+daha\s+riskli|öncelik|oncelik|önce\s+hangi\s+riske|once\s+hangi\s+riske|hangi\s+konu\s+acil|hangi\s+riskler|operasyon\s+riski|saha\s+riski|maliyet\s+riski|gecikme\s+riski|gps\s+riski|kapasite\s+riski|atama\s+riski|sözleşme\s+riski|sozlesme\s+riski|teklif\s+riski)/i;

function normalizeSignalText(value) {
  return normalizeLooseText(firstNonEmpty(value, ''));
}

function hasAnySignal(text, needles = []) {
  const value = normalizeSignalText(text);
  return (Array.isArray(needles) ? needles : []).some((needle) => {
    const target = normalizeSignalText(needle);
    return Boolean(target) && value.includes(target);
  });
}

function formatCommonMistakes(commonMistakes = []) {
  const items = uniqueStrings((Array.isArray(commonMistakes) ? commonMistakes : []).map((item) => firstNonEmpty(item, '')).filter(Boolean)).slice(0, 4);
  return items.length ? `Sık hata: ${items.join(' • ')}` : '';
}

function formatRiskSentence(value) {
  const raw = String(firstNonEmpty(value, '')).trim();
  if (/^Sonra ilgili ekrana geç\.?$/i.test(raw)) {
    return 'Sonra ilgili ekrana geç.';
  }
  return ensureVisibleSentence(normalizeVisibleReplyFragment(raw));
}

function buildRiskReply(lines = [], extraRiskItems = []) {
  const values = [
    ...(Array.isArray(lines) ? lines : []),
    ...(Array.isArray(extraRiskItems) && extraRiskItems.length ? [`Ek sinyaller: ${extraRiskItems.join(' • ')}`] : []),
  ];
  return uniqueStrings(values.map(formatRiskSentence).filter(Boolean)).join(' ').trim();
}

function buildRiskItems({ guide, screenDefinition, screenContext, sourceScreenContext, selectedCarrySummary }) {
  const carrySummary = typeof selectedCarrySummary === 'function'
    ? selectedCarrySummary
    : () => String(selectedCarrySummary || '');
  return uniqueStrings([
    firstNonEmpty(guide?.whyBlocked, ''),
    formatCommonMistakes([
      ...(Array.isArray(guide?.commonMistakes) ? guide.commonMistakes : []),
      ...(Array.isArray(screenDefinition?.commonMistakes) ? screenDefinition.commonMistakes : []),
    ]),
    firstNonEmpty(guide?.doNotDo, screenDefinition?.doNotDo, ''),
    firstNonEmpty(carrySummary(screenContext), carrySummary(sourceScreenContext), ''),
  ]).filter(Boolean).slice(0, 4);
}

function detectCompanyPlanningSurface({
  resolvedPath,
  screenDefinition,
  screenContext,
  sourceScreenDefinition,
  sourceScreenContext,
  conversationState,
}) {
  const planningSurfaceText = normalizeLooseText(companyPlanningCenterSurfaceText({
    screenPath: resolvedPath,
    screenDefinition,
    screenContext,
    sourceScreenDefinition,
    sourceScreenContext,
    conversationState,
  }));
  const visibleSurfaceText = normalizeLooseText(uniqueStrings([
    resolvedPath,
    screenDefinition?.label,
    screenContext?.label,
    sourceScreenDefinition?.label,
    sourceScreenContext?.label,
    screenDefinition?.menuPurpose,
    screenContext?.menuPurpose,
    sourceScreenDefinition?.menuPurpose,
    sourceScreenContext?.menuPurpose,
    screenDefinition?.screenExplanation,
    screenContext?.screenExplanation,
    sourceScreenDefinition?.screenExplanation,
    sourceScreenContext?.screenExplanation,
    companyPlanningUiSurfaceText(conversationState),
  ]).join(' • '));
  return Boolean(
    resolvedPath.includes('/company/planning-center')
    || (
      resolvedPath.includes('/company')
      && (
        looksLikeCompanyPlanningSurfaceText(planningSurfaceText)
        || looksLikeCompanyPlanningSurfaceText(visibleSurfaceText)
        || normalizeLooseText(prettyScreenLabel(screenDefinition?.label)) === 'planlama merkezi'
        || normalizeLooseText(prettyScreenLabel(screenContext?.label)) === 'planlama merkezi'
      )
    ),
  );
}

function resolveRiskSurfaceKey({
  resolvedPath,
  screenDefinition,
  screenContext,
  sourceScreenDefinition,
  sourceScreenContext,
  conversationState,
}) {
  if (resolvedPath.includes('/room/shifts')) return 'ROOM_SHIFTS';
  if (resolvedPath.includes('/company/shifts')) return 'COMPANY_SHIFTS';
  if (resolvedPath.includes('/company/operations') || resolvedPath.includes('/school/operations') || resolvedPath.includes('/organization/operations')) return 'COMPANY_OPERATIONS';
  if (
    resolvedPath.includes('/company/agreements')
    || resolvedPath.includes('/room/agreements')
    || resolvedPath.includes('/school/agreements')
    || resolvedPath.includes('/organization/agreements')
    || resolvedPath.includes('/commercial-flow')
    || resolvedPath.includes('/commercial-core')
  ) return 'OFFERS';
  if (resolvedPath.includes('/georeview')) return 'GEOREVIEW';
  if (resolvedPath.includes('/room/vehicles')) return 'ROOM_VEHICLES';
  if (resolvedPath.includes('/personel/live') || resolvedPath.includes('/personel/my')) return 'PERSONEL_LIVE';
  if (resolvedPath.includes('/parent/live')) return 'PARENT_LIVE';
  if (resolvedPath.includes('/driver/route') || resolvedPath.includes('/driver/today')) return 'DRIVER_ROUTE';
  if (resolvedPath.startsWith('/superadmin')) return 'SUPERADMIN';
  if (detectCompanyPlanningSurface({
    resolvedPath,
    screenDefinition,
    screenContext,
    sourceScreenDefinition,
    sourceScreenContext,
    conversationState,
  })) return 'COMPANY_PLANNING';
  return 'GENERIC';
}

function buildCompanyPlanningRiskReply({
  message,
  guide,
  screenDefinition,
  screenContext,
  sourceScreenContext,
  selectedCarrySummary,
}) {
  const riskItems = buildRiskItems({ guide, screenDefinition, screenContext, sourceScreenContext, selectedCarrySummary });
  if (hasAnySignal(message, ['kapasite'])) {
    return buildRiskReply([
      'Veriyle doğrulamak gerekir; Planlama Merkezi için yüksek risk kişi sayısının araç kapasitesine yaklaşmasıdır; çünkü rota önizlemesi buna bağlıdır.',
      'Orta risk rota / kapasite uyumsuzluğu olabilir.',
      'Önce kişi sayısı, araç kapasitesi ve rota önizlemesini kontrol edelim.',
    ], riskItems);
  }
  if (hasAnySignal(message, ['rota', 'konum'])) {
    return buildRiskReply([
      'Veriyle doğrulamak gerekir; Planlama Merkezi için yüksek risk planın rota üretecek kadar konum ve vardiya verisi taşımamasıdır.',
      'Çünkü eksik konum veya belirsiz saat rota önizlemesini bozar.',
      'Orta risk kapasite / rota uyumsuzluğu olabilir.',
      'Önce eksik konum uyarılarına ve vardiya saatine bakalım.',
    ], riskItems);
  }
  if (hasAnySignal(message, ['öncelik', 'en riskli', 'en kritik', 'hangisi daha riskli'])) {
    return buildRiskReply([
      'Veriyle doğrulamak gerekir; öncelik olarak eksik konum ve vardiya saati öne çıkar.',
      'Çünkü rota önizlemesi bunlara bağlıdır.',
      'Orta risk kapasite / rota uyumsuzluğu olabilir.',
      'Önce eksik konum uyarılarına ve vardiya saatine bakalım.',
    ], riskItems);
  }
  return buildRiskReply([
    'Veriyle doğrulamak gerekir; şu an Başlıca riskler yüksek görünüyor: hizmet alan firma konumunun eksik olması, tarih / saat ya da servis yönünün yanlış seçilmesi, kapsamın dar ya da geniş gelmesi, personel listesindeki eksikler, adres / konum hatası ve durak / rota önizlemesinde sapma.',
    'Orta risk kapasite / rota uyumsuzluğu olabilir.',
    'Düşük risk açıklama eksikleri olabilir.',
    'Bunlardan biri varsa önce onu düzelt.',
  ], riskItems);
}

function buildCompanyShiftsRiskReply({
  message,
  guide,
  screenDefinition,
  screenContext,
  sourceScreenContext,
  selectedCarrySummary,
}) {
  const riskItems = buildRiskItems({ guide, screenDefinition, screenContext, sourceScreenContext, selectedCarrySummary });
  if (hasAnySignal(message, ['personel'])) {
    return buildRiskReply([
      'Veriyle doğrulamak gerekir; Vardiyalar açısından personel riski yüksekse ilgili vardiyada eksik atama veya uygunluk boşluğu vardır.',
      'Orta risk adres / konum veya teklif / sözleşme bağlantısının net olmamasıdır.',
      'Önce vardiya kaydını, personel listesini ve atama durumunu kontrol edelim.',
    ], riskItems);
  }
  if (hasAnySignal(message, ['tarih', 'saat'])) {
    return buildRiskReply([
      'Veriyle doğrulamak gerekir; Vardiyalar açısından tarih / saat riski yüksekse canlı başlangıç ve takip akışı bozulabilir.',
      'Orta risk durak / rota önizlemesi veya konum bilgisinin eksik olmasıdır.',
      'Önce vardiya zamanını, durumunu ve rota önizlemesini kontrol edelim.',
    ], riskItems);
  }
  if (hasAnySignal(message, ['teklif', 'sözleşme', 'sozlesme'])) {
    return buildRiskReply([
      'Veriyle doğrulamak gerekir; Vardiyalar açısından teklif / sözleşme riski yüksekse iş akışı henüz netleşmemiş olabilir.',
      'Orta risk personel ve adres / konum verisinin eksik olmasıdır.',
      'Önce vardiya kaydını ve teklif bağlantısını kontrol edelim.',
    ], riskItems);
  }
  return buildRiskReply([
    'Veriyle doğrulamak gerekir; Vardiyalar açısından başlıca riskler yüksek görünüyor: tarih / saat uyumsuzluğu, personel listesindeki eksikler, adres / konum hatası, durak / rota önizlemesinde sapma ve teklif / sözleşme bağlantısının net olmamasıdır.',
    'Yüksek risk seçili vardiyanın canlıya hazır görünmemesidir.',
    'Orta risk personel, adres / konum ya da teklif akışının eksik olmasıdır.',
    'Önce vardiya kaydını, durumunu ve ilgili planlama verisini kontrol edelim.',
  ], riskItems);
}

function buildCompanyOperationsRiskReply({
  message,
  guide,
  screenDefinition,
  screenContext,
  sourceScreenContext,
  selectedCarrySummary,
}) {
  const riskItems = buildRiskItems({ guide, screenDefinition, screenContext, sourceScreenContext, selectedCarrySummary });
  if (hasAnySignal(message, ['gecikme'])) {
    return buildRiskReply([
      'Veriyle doğrulamak gerekir; gecikme riski GPS verisinin güncel olmaması, servis saatinin yaklaşması veya araç atamasının eksik olmasıyla yükselir.',
      'Önce canlı araç durumu ve vardiya saatine bakalım.',
    ], riskItems);
  }
  if (hasAnySignal(message, ['canlı durum', 'aktif servis'])) {
    return buildRiskReply([
      'Veriyle doğrulamak gerekir; yüksek risk aktif servis görünmemesi veya GPS verisinin gelmemesidir; çünkü canlı müdahale gecikir.',
      'Orta risk tarih / filtre veya şirket bağlamı nedeniyle operasyonun yanlış okunmasıdır.',
      'Önce aktif vardiya ve son GPS sinyalini kontrol edelim.',
    ], riskItems);
  }
  if (hasAnySignal(message, ['gps'])) {
    return buildRiskReply([
      'Veriyle doğrulamak gerekir; yüksek risk son GPS sinyalinin güncel olmamasıdır.',
      'Orta risk araç ataması eksikse canlı müdahale gecikir.',
      'Önce aktif vardiya ve son GPS sinyalini kontrol edelim.',
    ], riskItems);
  }
  return buildRiskReply([
    'Veriyle doğrulamak gerekir; operasyon riskini değerlendirirken aktif servis, GPS ve kayıt kapsamı birlikte okunur.',
    'Yüksek risk aktif servis görünmemesi veya GPS verisinin gelmemesidir; çünkü canlı müdahale gecikir.',
    'Orta risk tarih / filtre veya şirket bağlamı nedeniyle operasyonun yanlış okunmasıdır.',
    'Önce aktif vardiya ve son GPS sinyalini kontrol edelim.',
  ], riskItems);
}

function buildOffersRiskReply({
  message,
  guide,
  screenDefinition,
  screenContext,
  sourceScreenContext,
  selectedCarrySummary,
}) {
  const riskItems = buildRiskItems({ guide, screenDefinition, screenContext, sourceScreenContext, selectedCarrySummary });
  if (hasAnySignal(message, ['hangisi daha riskli', 'karşılaştır', 'karsilastir'])) {
    return buildRiskReply([
      'Veriyle doğrulamak gerekir; teklifleri risk açısından fiyat sapması, kapasite uyumu ve güzergâh uygunluğuyla karşılaştırmak gerekir.',
      'Yüksek risk fiyat sapması veya kapasite uyumsuzluğu olabilir; çünkü sözleşme ve operasyon maliyetini etkiler.',
      'Orta risk güzergâh uygunluğu veya tedarikçi dönüş durumudur.',
      'Önce fiyat, kapasite ve güzergâh uygunluğunu karşılaştıralım.',
    ], riskItems);
  }
  if (hasAnySignal(message, ['fiyat'])) {
    return buildRiskReply([
      'Veriyle doğrulamak gerekir; yüksek risk fiyat sapmasıdır.',
      'Orta risk kapasite uyumsuzluğu veya güzergâh uygunluğudur.',
      'Önce fiyat, kapasite ve güzergâh uygunluğunu karşılaştıralım.',
    ], riskItems);
  }
  if (hasAnySignal(message, ['kapasite'])) {
    return buildRiskReply([
      'Veriyle doğrulamak gerekir; yüksek risk kapasite ve güzergâh uyumsuzluğudur.',
      'Orta risk tedarikçi dönüşünün gecikmesidir.',
      'Önce fiyat, kapasite ve güzergâh uygunluğunu karşılaştıralım.',
    ], riskItems);
  }
  return buildRiskReply([
    'Veriyle doğrulamak gerekir; teklif riskini değerlendirirken fiyat sapması, kapasite ve güzergâh uygunluğu birlikte okunur.',
    'Yüksek risk fiyat sapması veya kapasite uyumsuzluğu olabilir; çünkü sözleşme ve operasyon maliyetini etkiler.',
    'Orta risk güzergâh uygunluğu veya tedarikçi dönüş durumudur.',
    'Önce fiyat, kapasite ve güzergâh uygunluğunu karşılaştıralım.',
  ], riskItems);
}

function buildRoomShiftsRiskReply({
  message,
  guide,
  screenDefinition,
  screenContext,
  sourceScreenContext,
  selectedCarrySummary,
}) {
  const riskItems = buildRiskItems({ guide, screenDefinition, screenContext, sourceScreenContext, selectedCarrySummary });
  if (hasAnySignal(message, ['gps'])) {
    return buildRiskReply([
      'Veriyle doğrulamak gerekir; Taşımacılık Firması açısından GPS riski yüksekse canlı takip ve gecikme müdahalesi aksar.',
      'En önemli sinyaller son GPS zamanı, GPS verisinin güncel olmaması ve araç-sürücü eşleşmesidir.',
      'Riskli alanı belirle.',
      'Sonra ilgili ekrana geç.',
    ], riskItems);
  }
  if (hasAnySignal(message, ['başlatma', 'başlat'])) {
    return buildRiskReply([
      'Veriyle doğrulamak gerekir; Taşımacılık Firması açısından başlatma riski araç-sürücü ataması veya GPS hazırlığı eksikse yükselir.',
      'Orta risk vardiya zamanı veya durak / personel hazırlığıdır.',
      'Riskli alanı belirle.',
      'Sonra ilgili ekrana geç.',
    ], riskItems);
  }
  return buildRiskReply([
    'Veriyle doğrulamak gerekir; Taşımacılık Firması açısından başlıca riskler yüksek görünüyor: vardiya onaylı ama canlı başlatılmamış olabilir; araç / sürücü ataması eksik olabilir; GPS yok ya da eski olabilir; durak / rota eksik olabilir; operasyon kanıtı eksik olabilir; teklif / sözleşme bağlantısı net olmayabilir; başlatma zamanı geçmiş olabilir.',
    'Yüksek risk araç-sürücü ataması veya GPS hazırlığı eksikse oluşur.',
    'Orta risk vardiya zamanı veya durak / personel hazırlığıdır.',
    'Riskli alanı belirle.',
    'Sonra ilgili ekrana geç.',
  ], riskItems);
}

function buildRoomVehiclesRiskReply({
  message,
  guide,
  screenDefinition,
  screenContext,
  sourceScreenContext,
  selectedCarrySummary,
}) {
  const riskItems = buildRiskItems({ guide, screenDefinition, screenContext, sourceScreenContext, selectedCarrySummary });
  if (hasAnySignal(message, ['hangisi kritik', 'kritik'])) {
    return buildRiskReply([
      'Veriyle doğrulamak gerekir; kritik olan önce araç-sürücü eşleşmesi ve GPS durumudur; çünkü canlı operasyonu doğrudan etkiler.',
      'Sonra aktif vardiya bağlantısına bakalım.',
    ], riskItems);
  }
  if (hasAnySignal(message, ['sürücü eşleşmesi', 'surucu eşleşmesi', 'surucu eslesmesi'])) {
    return buildRiskReply([
      'Veriyle doğrulamak gerekir; araç riski, sürücü eşleşmesi yoksa veya GPS göndermiyorsa yükselir.',
      'Önce aktiflik ve son GPS durumunu kontrol edelim.',
    ], riskItems);
  }
  return buildRiskReply([
    'Veriyle doğrulamak gerekir; araç riski, araç pasif ya da görünmezse, sürücü eşleşmesi yoksa veya GPS göndermiyorsa yükselir.',
    'Kritik olan önce araç-sürücü eşleşmesi ve GPS durumudur; çünkü canlı operasyonu doğrudan etkiler.',
    'Önce aktiflik ve son GPS durumunu kontrol edelim.',
  ], riskItems);
}

function buildDriverRouteRiskReply({
  message,
  guide,
  screenDefinition,
  screenContext,
  sourceScreenContext,
  selectedCarrySummary,
}) {
  const riskItems = buildRiskItems({ guide, screenDefinition, screenContext, sourceScreenContext, selectedCarrySummary });
  if (hasAnySignal(message, ['check-in'])) {
    return buildRiskReply([
      'Veriyle doğrulamak gerekir; check-in riski yanlış durak, uygunsuz zaman veya GPS doğrulaması eksikse yükselir.',
      'Önce doğru durak ve konum sinyalini kontrol etmek gerekir.',
    ], riskItems);
  }
  if (hasAnySignal(message, ['gecikme'])) {
    return buildRiskReply([
      'Veriyle doğrulamak gerekir; yüksek risk aktif vardiya / rota görünmüyorsa veya durak listesi hazır değilse oluşur.',
      'Orta risk GPS / konum doğrulamasının eksik olmasıdır.',
      'Otomatik işlem yapmadan önce aktif vardiya ve durak listesini kontrol edelim.',
    ], riskItems);
  }
  return buildRiskReply([
      'Veriyle doğrulamak gerekir; yüksek risk aktif vardiya / rota görünmüyorsa veya durak listesi hazır değilse oluşur.',
    'Orta risk GPS / konum doğrulamasının eksik olmasıdır.',
    'Otomatik işlem yapmadan önce aktif vardiya ve durak listesini kontrol edelim.',
  ], riskItems);
}

function buildPersonelLiveRiskReply({
  message,
  guide,
  screenDefinition,
  screenContext,
  sourceScreenContext,
  selectedCarrySummary,
}) {
  const riskItems = buildRiskItems({ guide, screenDefinition, screenContext, sourceScreenContext, selectedCarrySummary });
  if (hasAnySignal(message, ['gecikme'])) {
    return buildRiskReply([
      'Veriyle doğrulamak gerekir; Personel Canlı için gecikme riski araç konumu gelmiyorsa, servis saati yaklaştıysa veya sıradaki durak bilgisi eksikse artar. Araç GPS verisi gelmiyorsa gecikme riski daha da yükselir.',
      'Önce araç konumu ve servis saatini kontrol edelim.',
      'Servis durumunu aç.',
    ], riskItems);
  }
  if (hasAnySignal(message, ['servis'])) {
    return buildRiskReply([
      'Veriyle doğrulamak gerekir; Personel Canlı için yüksek risk servis görünmüyorsa veya araç GPS göndermiyorsa oluşur; çünkü canlı takip aksar.',
      'Orta risk servis saatinin henüz başlamaması veya atanmış vardiya eksikliğidir.',
      'Servis durumunu aç.',
      'Önce atanmış vardiya ve araç konumunu kontrol edelim.',
    ], riskItems);
  }
  return buildRiskReply([
    'Veriyle doğrulamak gerekir; Personel Canlı için yüksek risk servis görünmüyorsa veya araç GPS göndermiyorsa oluşur; çünkü canlı takip aksar.',
    'Orta risk servis saatinin henüz başlamaması veya atanmış vardiya eksikliğidir.',
    'Servis durumunu aç.',
    'Önce atanmış vardiya ve araç konumunu kontrol edelim.',
  ], riskItems);
}

function buildParentLiveRiskReply({
  message,
  guide,
  screenDefinition,
  screenContext,
  sourceScreenContext,
  selectedCarrySummary,
}) {
  const riskItems = buildRiskItems({ guide, screenDefinition, screenContext, sourceScreenContext, selectedCarrySummary });
  if (hasAnySignal(message, ['gelmedi'])) {
    return buildRiskReply([
      'Veriyle doğrulamak gerekir; çocuk için risk seviyesi servis saatine, araç konumuna ve atanmış vardiyaya bağlıdır.',
      'Araç konumu yoksa veya saat geçmişse risk daha yüksek görünür.',
      'Önce servis saati, araç konumu ve atanmış vardiyayı kontrol edelim.',
    ], riskItems);
  }
  if (hasAnySignal(message, ['konum'])) {
    return buildRiskReply([
      'Veriyle doğrulamak gerekir; çocuk için yüksek risk araç konumu görünmüyorsa veya servis saati geçmişse oluşur.',
      'Orta risk atanmış vardiyanın eksik ya da filtrelenmiş olmasıdır.',
      'Önce servis saati, araç konumu ve atanmış vardiyayı kontrol edelim.',
    ], riskItems);
  }
  return buildRiskReply([
    'Veriyle doğrulamak gerekir; çocuk için risk seviyesi servis saatine, araç konumuna ve atanmış vardiyaya bağlıdır.',
    'Yüksek risk araç konumu görünmüyorsa veya servis saati geçmişse oluşur.',
    'Önce servis saati, araç konumu ve atanmış vardiyayı kontrol edelim.',
  ], riskItems);
}

function buildSuperAdminRiskReply({
  message,
  guide,
  screenDefinition,
  screenContext,
  sourceScreenContext,
  selectedCarrySummary,
}) {
  const riskItems = buildRiskItems({ guide, screenDefinition, screenContext, sourceScreenContext, selectedCarrySummary });
  if (hasAnySignal(message, ['yetki'])) {
    return buildRiskReply([
      'Veriyle doğrulamak gerekir; yetki riski varsa rol kapsamı ve görünür kayıtları doğrulamadan kesin hüküm vermeyelim.',
      'Orta risk yanlış filtre / rol kapsamı yüzünden operasyonun eksik okunmasıdır.',
      'Önce rol, filtre ve kayıt kapsamını kontrol edelim.',
    ], riskItems);
  }
  if (hasAnySignal(message, ['en kritik'])) {
    return buildRiskReply([
      'Veriyle doğrulamak gerekir; en kritik risk boş veya eksik veri nedeniyle yanlış operasyon kararı verilmesidir.',
      'Orta risk filtre / rol kapsamı ile ilgili kayıtların çakışmasıdır.',
      'Önce filtre / rol kapsamı ve ilgili kayıtların gerçekten var olup olmadığını kontrol edelim.',
    ], riskItems);
  }
  return buildRiskReply([
    'Veriyle doğrulamak gerekir; hizmet alan firma riskini değerlendirirken kayıt durumu, yetki kapsamı ve operasyon / ödeme / kalite sinyallerine bakmak gerekir.',
    'En kritik risk boş veya eksik veri nedeniyle yanlış operasyon kararı verilmesidir.',
    'Önce kayıt ve kapsam bilgisini kontrol edelim.',
  ], riskItems);
}

function buildGenericRiskReply({
  guide,
  screenDefinition,
  screenContext,
  sourceScreenContext,
  selectedCarrySummary,
}) {
  const riskItems = buildRiskItems({ guide, screenDefinition, screenContext, sourceScreenContext, selectedCarrySummary });
  return buildRiskReply([
    'Veriyle doğrulamak gerekir; riskler bağlama göre değişir.',
    'Yüksek risk seçili kayıt, konum veya zaman verisi eksikse yanlış karar kolaylaşır.',
    'Orta risk kapasite, filtre veya eşleşme belirsizse öncelik sırası bozulabilir.',
    'Düşük risk açıklama eksikliği akışı durdurmaz ama kontrol edilmelidir.',
    'Önce eksik kayıt ve son sinyali kontrol edelim.',
  ], riskItems);
}

function buildGeoreviewRiskReply({
  guide,
  screenDefinition,
  screenContext,
  sourceScreenContext,
}) {
  const riskItems = buildRiskItems({
    guide,
    screenDefinition,
    screenContext,
    sourceScreenContext,
    selectedCarrySummary: '',
  });
  return buildRiskReply([
    'Veriyle doğrulamak gerekir; konum incelemede riskler eksik koordinat, hatalı eşleşme ve yol hesabı belirsizliğidir.',
    'Yüksek risk seçili konum kaydının net olmamasıdır.',
    'Orta risk koordinat ile yol hesabının ayrışmasıdır.',
    'Önce konum verisi, yol hesabı ve eşleşme sinyalini kontrol edelim.',
  ], riskItems);
}

function getRiskReplyForSurface({
  surfaceKey,
  message,
  guide,
  screenDefinition,
  screenContext,
  sourceScreenContext,
  selectedCarrySummary,
}) {
  if (surfaceKey === 'COMPANY_PLANNING') {
    return buildCompanyPlanningRiskReply({
      message,
      guide,
      screenDefinition,
      screenContext,
      sourceScreenContext,
      selectedCarrySummary,
    });
  }
  if (surfaceKey === 'COMPANY_SHIFTS') {
    return buildCompanyShiftsRiskReply({
      message,
      guide,
      screenDefinition,
      screenContext,
      sourceScreenContext,
      selectedCarrySummary,
    });
  }
  if (surfaceKey === 'COMPANY_OPERATIONS') {
    return buildCompanyOperationsRiskReply({
      message,
      guide,
      screenDefinition,
      screenContext,
      sourceScreenContext,
      selectedCarrySummary,
    });
  }
  if (surfaceKey === 'OFFERS') {
    return buildOffersRiskReply({
      message,
      guide,
      screenDefinition,
      screenContext,
      sourceScreenContext,
      selectedCarrySummary,
    });
  }
  if (surfaceKey === 'ROOM_SHIFTS') {
    return buildRoomShiftsRiskReply({
      message,
      guide,
      screenDefinition,
      screenContext,
      sourceScreenContext,
      selectedCarrySummary,
    });
  }
  if (surfaceKey === 'ROOM_VEHICLES') {
    return buildRoomVehiclesRiskReply({
      message,
      guide,
      screenDefinition,
      screenContext,
      sourceScreenContext,
      selectedCarrySummary,
    });
  }
  if (surfaceKey === 'PERSONEL_LIVE') {
    return buildPersonelLiveRiskReply({
      message,
      guide,
      screenDefinition,
      screenContext,
      sourceScreenContext,
      selectedCarrySummary,
    });
  }
  if (surfaceKey === 'PARENT_LIVE') {
    return buildParentLiveRiskReply({
      message,
      guide,
      screenDefinition,
      screenContext,
      sourceScreenContext,
      selectedCarrySummary,
    });
  }
  if (surfaceKey === 'DRIVER_ROUTE') {
    return buildDriverRouteRiskReply({
      message,
      guide,
      screenDefinition,
      screenContext,
      sourceScreenContext,
      selectedCarrySummary,
    });
  }
  if (surfaceKey === 'SUPERADMIN') {
    return buildSuperAdminRiskReply({
      message,
      guide,
      screenDefinition,
      screenContext,
      sourceScreenContext,
      selectedCarrySummary,
    });
  }
  if (surfaceKey === 'GEOREVIEW') {
    return buildGeoreviewRiskReply({
      guide,
      screenDefinition,
      screenContext,
      sourceScreenContext,
    });
  }
  return buildGenericRiskReply({
    guide,
    screenDefinition,
    screenContext,
    sourceScreenContext,
    selectedCarrySummary,
  });
}

export function looksLikeRiskScoringQuestion(message) {
  const text = normalizeLooseText(message);
  if (!text) return false;
  return RISK_INTENT_RE.test(text)
    || (looksLikeClarifyingQuestionRequest(text) && /risk/i.test(text))
    || (looksLikeNextBestActionQuestion(text) && /risk/i.test(text))
    || (looksLikeDetailContinuationRequest(text) && /risk/i.test(text));
}

export function buildRiskScoringChips() {
  return [...DEFAULT_RISK_CHIPS];
}

export function buildRiskScoringReply(options = {}) {
  const questionType = String(options?.questionType || '');
  const message = firstNonEmpty(options?.message, options?.currentReply, '');
  const isRiskQuestion = ['RISK_LIST', 'SCREEN_RISKS'].includes(questionType) || looksLikeRiskScoringQuestion(message);
  if (!isRiskQuestion) return '';

  const resolvedPath = normalizeText(firstNonEmpty(
    options?.screenPath,
    options?.screenDefinition?.path,
    options?.screenContext?.path,
    options?.sourceScreenDefinition?.path,
    options?.sourceScreenContext?.path,
    '',
  ));
  const surfaceKey = resolveRiskSurfaceKey({
    resolvedPath,
    screenDefinition: options?.screenDefinition,
    screenContext: options?.screenContext,
    sourceScreenDefinition: options?.sourceScreenDefinition,
    sourceScreenContext: options?.sourceScreenContext,
    conversationState: options?.conversationState,
  });
  return getRiskReplyForSurface({
    surfaceKey,
    message,
    guide: options?.guide,
    screenDefinition: options?.screenDefinition,
    screenContext: options?.screenContext,
    sourceScreenDefinition: options?.sourceScreenDefinition,
    sourceScreenContext: options?.sourceScreenContext,
    selectedCarrySummary: options?.selectedCarrySummary,
  });
}

export function buildRiskScoringState(options = {}) {
  const reply = buildRiskScoringReply(options);
  const chips = buildRiskScoringChips(options);
  const resolvedPath = normalizeText(firstNonEmpty(
    options?.screenPath,
    options?.screenDefinition?.path,
    options?.screenContext?.path,
    options?.sourceScreenDefinition?.path,
    options?.sourceScreenContext?.path,
    '',
  ));
  const surfaceKey = resolveRiskSurfaceKey({
    resolvedPath,
    screenDefinition: options?.screenDefinition,
    screenContext: options?.screenContext,
    sourceScreenDefinition: options?.sourceScreenDefinition,
    sourceScreenContext: options?.sourceScreenContext,
    conversationState: options?.conversationState,
  });
  return Object.freeze({
    version: COPILOT_RISK_SCORING_ENGINE_VERSION,
    isRiskScoring: Boolean(reply || ['RISK_LIST', 'SCREEN_RISKS'].includes(String(options?.questionType || '')) || looksLikeRiskScoringQuestion(options?.message)),
    theme: surfaceKey,
    surfaceKey,
    questionType: String(options?.questionType || ''),
    screenPath: resolvedPath,
    screenLabel: firstNonEmpty(
      prettyScreenLabel(options?.screenDefinition?.label),
      prettyScreenLabel(options?.screenContext?.label),
      prettyScreenLabel(options?.sourceScreenDefinition?.label),
      prettyScreenLabel(options?.sourceScreenContext?.label),
      '',
    ),
    reply,
    chips,
  });
}
