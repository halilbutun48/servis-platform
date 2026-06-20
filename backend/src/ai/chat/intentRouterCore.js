import {
  detectCopilotEBlockRuntimeAnswerTopic,
  getCopilotEBlockRuntimeAnswerTopicMeta,
} from './copilotEBlockRuntimeAnswerIntegration.js';

export function normalizeText(value) {
  return String(value || '').trim().toLocaleLowerCase('tr-TR');
}

export function hasAny(text, patterns) {
  const value = normalizeText(text);
  return (Array.isArray(patterns) ? patterns : []).some((p) => value.includes(normalizeText(p)));
}

export function normalizeLooseText(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLocaleLowerCase('tr-TR')
    .replace(/\s+/g, ' ')
    .trim();
}

export function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function matchesStandalonePhrase(text, phrases) {
  const value = normalizeLooseText(text);
  if (!value) return false;
  return (Array.isArray(phrases) ? phrases : []).some((phrase) => {
    const normalized = normalizeLooseText(phrase);
    if (!normalized) return false;
    const pattern = new RegExp(`(?:^|[^\\p{L}\\p{N}])${escapeRegExp(normalized)}(?:$|[^\\p{L}\\p{N}])`, 'iu');
    return pattern.test(value);
  });
}

export function hasSeferScoreSignal(text) {
  return hasAny(text, [
    'seferpuan',
    'sefer puanı',
    'sefer puani',
    'sefer score',
    'kalitepuan',
    'readonly kalite puanı',
    'readonly kalite puani',
    'kalite puanı',
    'kalite puani',
    'tedarikcipuan',
    'tedarikçi puanı',
    'tedarikci puani',
    'sağlayıcıpuan',
    'sağlayıcı puanı',
    'saglayici puani',
    'bu servis kaliteli mi',
    'eksik sinyaller',
    'puan neden düşük',
    'puan neden dusuk',
    'puan nasıl yükselir',
    'puan nasil yukselir',
    'bu puan ödeme veya teklif sıralamasını etkiliyor mu',
    'bu puan odeme veya teklif siralamasini etkiliyor mu',
  ]);
}

export function hasBoardingChangeRequestEntrySignal(text) {
  return hasAny(text, [
    'talep oluştur',
    'talep olustur',
    'talep girişi',
    'talep girisi',
    'bugün binmeyeceğim talebi',
    'bugun binmeyecegim talebi',
    'bugün binmeyeceğim',
    'bugun binmeyecegim',
    'başka duraktan binmek istiyorum',
    'baska duraktan binmek istiyorum',
    'başka duraktan bineceğim',
    'baska duraktan binecegim',
    'çocuğum bugün binmeyecek',
    'cocugum bugun binmeyecek',
    'çocuğum başka duraktan binecek',
    'cocugum baska duraktan binecek',
    'çocuğum şu konumdan alınsın',
    'cocugum su konumdan alinsin',
    'farklı konumdan alınmak istiyorum',
    'farkli konumdan alinmak istiyorum',
    'konumumu al',
    'büyük haritada konum seç',
    'buyuk haritada konum sec',
    'adresten konum bul',
    'talebim kimde bekliyor',
    'kimde bekliyor',
    'konum paylaşılmadı',
    'konum paylasilmadi',
    'konum paylaşmadım',
    'konum paylasmadim',
  ]);
}

export function isGenericStatusHelpQuestion(text) {
  const value = normalizeLooseText(text);
  if (!value) return false;
  if (!/(?:\bne durumda\b|\bdurumu ne(?:\s+demek)?\b|\bdurum ne(?:\s+demek)?\b)/.test(value)) return false;
  if (/(hangi olaydan|nereden geldi|kaynak|sorumlu kim|kimde|hangi rol|hangi kayıttan|bu bildirim|bildirim kaynağı)/.test(value)) return false;
  return true;
}

export function isExplicitNextScreenQuestion(text) {
  const value = normalizeLooseText(text);
  if (!value) return false;
  return /(hangi\s+ekran|hangi\s+menü|hangi\s+menu|nereye\s+geçeyim|nereye\s+geceyim|nereye\s+gitmeliyim|sonraki\s+ekran|sonra\s+nereye|hangi\s+yere\s+geçeyim|hangi\s+yere\s+geceyim|hangi\s+ekranda\s+devam|en\s+doğru\s+ekran|en\s+dogru\s+ekran|mobilde\s+bu\s+iş\s+nereden\s+yapılır|mobilde\s+bu\s+is\s+nereden\s+yapilir)/.test(value);
}

export function isExplicitBadgeHelpQuestion(text) {
  const value = normalizeLooseText(text);
  if (!value) return false;
  return /(bu\s+rozet\s+ne\s+demek|bu\s+badge\s+ne\s+demek|durum\s+rozeti\s+ne\s+demek|bu\s+etiket\s+ne\s+demek)/.test(value);
}

export function isScreenFocusQuestion(text) {
  const value = normalizeLooseText(text);
  if (!value) return false;
  return matchesStandalonePhrase(value, [
    'bu ekranda neye bakmalıyım',
    'ekranda neye bakmalıyım',
    'neye bakmalıyım',
    'önce neye bakmalıyım',
    'once neye bakmalıyım',
    'bu ekranda neyi kontrol etmeliyim',
    'ekranda neyi kontrol etmeliyim',
    'önce neyi kontrol etmeliyim',
    'once neyi kontrol etmeliyim',
  ]);
}

export function isRiskListQuestion(text) {
  const value = normalizeLooseText(text);
  if (!value) return false;
  return matchesStandalonePhrase(value, [
    'riskleri sırala',
    'riskleri sirala',
    'risk listesi',
    'başlıca riskler',
    'baslica riskler',
    'en büyük riskler',
    'en buyuk riskler',
  ]);
}

export function isNextBestActionQuestion(text) {
  const value = normalizeLooseText(text);
  if (!value) return false;
  return /(sıradaki doğru işlem|siradaki dogru islem|bir sonraki doğru işlem|bir sonraki dogru islem|şu an en doğru adım|su an en dogru adim|şimdi en doğru işlem|simdi en dogru islem)/.test(value);
}

export function isExplicitSafeNextStepQuestion(text) {
  const value = normalizeLooseText(text);
  if (!value) return false;
  return /(en\s+risksiz\s+sonraki\s+adım|en\s+risksiz\s+sonraki\s+adim|en\s+güvenli\s+sonraki\s+adım|en\s+guvenli\s+sonraki\s+adim|en\s+güvenli\s+ne\s+yapayım|en\s+guvenli\s+ne\s+yapayim)/.test(value);
}

export function isExplicitNextStepQuestion(text) {
  const value = normalizeLooseText(text);
  if (!value) return false;
  return matchesStandalonePhrase(value, [
    'sıradaki doğru işlem ne',
    'siradaki dogru islem ne',
    'sıradaki işlem ne',
    'siradaki islem ne',
    'sonraki adım ne',
    'sonraki adim ne',
    'şimdi ne yapayım',
    'simdi ne yapayim',
    'ne yapayım',
    'ne yapayim',
  ]);
}

export function hasRoleKeyword(text) {
  return /\b(?:company|room|driver|parent|personel|school|organization|super\s*admin|superadmin|şirket|oda|veli|sürücü|surucu|okul|organizasyon|süper\s*admin)\b/.test(normalizeLooseText(text));
}

export function looksLikeOnboardingStartQuestion(text) {
  const value = normalizeLooseText(text);
  if (!value) return false;
  return matchesStandalonePhrase(value, [
    'ne yapmam lazım',
    'ne yapmam gerekiyor',
    'nereden başlamalıyım',
    'nereden başlamam gerekiyor',
    'nereden başlayacağım',
    'başlangıç yolu',
    'ilk adım ne',
    'ilk adımı ne',
    'ilk bakılacak',
    'nasıl başlayacağım',
    'nasıl başlamalıyım',
    'buradan sonra ne yapacağım',
    'buradan sonra ne yapmam gerekiyor',
  ]);
}

export function looksLikeScreenStartQuestion(text) {
  const value = normalizeLooseText(text);
  if (!value) return false;
  if (/(bu\s+ekran\s+ne\s+işe\s+yarar|bu\s+ekran\s+ne\s+ise\s+yarar|bu\s+ekran\s+ne\s+işe\s+yarıyor|bu\s+ekran\s+ne\s+ise\s+yarıyor|bu\s+ekran\s+ne\s+için|bu\s+ekran\s+ne\s+icin|bu\s+panel\s+neyi\s+gösteriyor|bu\s+panel\s+neyi\s+gosteriyor|bu\s+panel\s+ne\s+işe\s+yarıyor|bu\s+panel\s+ne\s+ise\s+yarıyor|bu\s+sayfa\s+ne\s+işe\s+yarar|bu\s+sayfa\s+ne\s+ise\s+yarar|bu\s+sayfa\s+ne\s+işe\s+yarıyor|bu\s+sayfa\s+ne\s+ise\s+yarıyor|ekranın\s+amacı\s+ne|ekranin\s+amaci\s+ne|burada\s+ne\s+yapıyorum|burada\s+ne\s+yapiyorum)/.test(value)) return true;
  return /(plan\s+builder|planlama\s+merkezi|vardiya|teklif|sözleşme|sozlesme|servis\s+durumu|canlı\s+takip|canli\s+takip|harita|rota|kanıt|kanit|audit|konum\s+incele|my\s+ride|plan\s+oluştur|plan\s+olustur)/.test(value)
    && /(ne\s+işe\s+yarar|ne\s+ise\s+yarar|ne\s+işe\s+yarıyor|ne\s+ise\s+yarıyor|ne\s+yapacağım|ne\s+yapacagım|ne\s+yapmalıyım|ne\s+yapmaliyim|burada\s+ne\s+yapıyorum|burada\s+ne\s+yapiyorum)/.test(value);
}

export function looksLikeDetailContinuationQuestion(text) {
  const value = normalizeLooseText(text);
  if (!value) return false;
  return /(devamını anlat|devamini anlat|detayını anlat|detayini anlat|biraz daha aç|biraz daha ac|biraz aç|biraz ac|daha detay|daha ayrıntı|daha ayrinti|biraz daha detay|biraz daha ayrıntı|biraz daha ayrinti)/.test(value);
}

export function isShiftReadinessQuestion(text, screenPath = '', entityType = '') {
  const value = normalizeLooseText(text);
  if (!value) return false;
  if (!/(hazır\s*m[ıi]|hazir\s*m[ıi]|hazırlık|hazirlik|atamaya\s+hazır\s*m[ıi]|atamaya\s+hazir\s*m[ıi]|ilerlemeye\s+hazır\s*m[ıi]|ilerlemeye\s+hazir\s*m[ıi]|bu\s+kayıt\s+hazır\s*m[ıi]|bu\s+kayit\s+hazir\s*m[ıi])/.test(value)) return false;
  if (pathHas(screenPath, ['/room/shifts'])) return true;
  if (pathHas(screenPath, ['/company/shifts', '/organization/shifts']) && String(entityType || '').toLowerCase() === 'shift') return true;
  return false;
}

export function pathHas(path, parts) {
  const value = normalizeText(path);
  return (Array.isArray(parts) ? parts : []).some((p) => {
    const needle = normalizeText(p);
    if (!needle) return false;
    if (needle.startsWith('/')) {
      return value === needle || value.endsWith(needle) || value.includes(`${needle}/`);
    }
    return value.includes(needle);
  });
}

export function isPlanningSurfacePath(path) {
  return pathHas(path, ['/company', '/school', '/organization']);
}

export function countMatches(text, patterns) {
  const value = normalizeText(text);
  return (Array.isArray(patterns) ? patterns : []).reduce((count, pattern) => count + (value.includes(normalizeText(pattern)) ? 1 : 0), 0);
}

export function hasImperativeNavigation(text) {
  const value = normalizeText(text);
  return /(götür|gotur|aç|ac|git|geç|gec)\b/.test(value);
}

export function mentionsScreenWord(text) {
  return hasAny(text, ['ekran', 'menu', 'menü', 'sekme', 'panel', 'sayfa', 'kısım', 'kisim', 'yer', 'harita', 'planlama', 'vardiya', 'ticari', 'hizmet', 'konum', 'copilot', 'sözleşme', 'sozlesme', 'rapor', 'doğrulama', 'dogrulama']);
}

export function isDirectScreenSteer(text) {
  const value = normalizeText(text);
  return /(hangi\s+ekran|hangi\s+menü|nereye\s+geçeyim|nereye\s+gitmeliyim|sonraki\s+ekran|hangi\s+yere\s+geçeyim|hangi\s+yere\s+geceyim|hangi\s+ekranda\s+devam|nereye\s+götür|ilgili\s+ekrana\s+git|ilgili\s+yere\s+götür|ilgili\s+yere\s+gotur|doğrudan|dogrudan|direkt|direk|sapma\s+olmadan|yanlış\s+hedef|yanlis\s+hedef)/.test(value);
}

export function isShortFollowUp(text) {
  const value = normalizeLooseText(text);
  if (!value) return false;
  return /^(peki|tamam|o zaman|devam|sonra|simdi|şimdi|ee sonra|girdim|yaptım|bulamadım|bulamadim|göremedim|goremedim|nerede|neden|niye|bilmiyorum)\b/.test(value) || value.length <= 18;
}

export function lastQuestionType(state) {
  return String(state?.lastQuestionType || state?.lastGuidedTaskQuestionType || state?.lastGuidedTaskIntent || '').trim();
}

export function computeConfidence(score = 0) {
  const value = Number(score || 0);
  if (value >= 18) return 0.98;
  if (value >= 15) return 0.96;
  if (value >= 12) return 0.94;
  if (value >= 9) return 0.9;
  if (value >= 6) return 0.82;
  if (value >= 3) return 0.72;
  return 0.55;
}

export function addScore(scoreMap, signalMap, type, score, signal) {
  scoreMap[type] = Number(scoreMap[type] || 0) + Number(score || 0);
  if (signal) {
    if (!Array.isArray(signalMap[type])) signalMap[type] = [];
    signalMap[type].push(signal);
  }
}

export function applyRules(text, scoreMap, signalMap, rules = []) {
  (Array.isArray(rules) ? rules : []).forEach((rule) => {
    const hits = countMatches(text, rule.patterns);
    if (!hits) return;
    addScore(scoreMap, signalMap, rule.type, (rule.perHit ? hits : 1) * Number(rule.score || 0), `${rule.label || rule.type}:${hits}`);
  });
}

export function normalizeIntentArgs(entityTypeOrOptions = 'screen', screenPath = '') {
  if (entityTypeOrOptions && typeof entityTypeOrOptions === 'object' && !Array.isArray(entityTypeOrOptions)) {
    return {
      entityType: String(entityTypeOrOptions.entityType || 'screen'),
      screenPath: String(entityTypeOrOptions.screenPath || ''),
      sourceScreenPath: String(entityTypeOrOptions.sourceScreenPath || ''),
      roleMode: String(entityTypeOrOptions.roleMode || 'OPERATIONS'),
      userRole: String(entityTypeOrOptions.userRole || entityTypeOrOptions.role || ''),
      conversationState: entityTypeOrOptions.conversationState || null,
      originalMessage: String(entityTypeOrOptions.originalMessage || ''),
    };
  }
  return { entityType: String(entityTypeOrOptions || 'screen'), screenPath: String(screenPath || ''), sourceScreenPath: '', roleMode: 'OPERATIONS', userRole: '', conversationState: null, originalMessage: '' };
}

export function selectGuideJobType({ entityType = 'screen', questionType = 'OPEN', message = '', screenPath = '', guidedTaskMeta = null }) {
  const text = normalizeText(message);
  if (guidedTaskMeta?.jobType) return guidedTaskMeta.jobType;
  const helperTopicMeta = getCopilotEBlockRuntimeAnswerTopicMeta(String(questionType || detectCopilotEBlockRuntimeAnswerTopic({ message, screenPath }) || ''));
  if (helperTopicMeta?.jobType) return helperTopicMeta.jobType;
  if (questionType === 'PRODUCT_OVERVIEW_HELP') return 'SCREEN_MENU_GUIDE';
  if (questionType === 'ROLE_EXPLANATION_HELP') return 'ROLE_HELP_GUIDE';
  if (questionType === 'SCREEN_EXPLANATION_HELP') return 'SCREEN_MENU_GUIDE';
  if (questionType === 'HOW_TO_HELP') return String(entityType || '').toLowerCase() === 'shift' ? 'ASSIGNMENT_READINESS_GUIDE' : 'SCREEN_MENU_GUIDE';
  if (questionType === 'FIELD_BUTTON_HELP') return 'BUTTON_ACTION_GUIDE';
  if (questionType === 'SCREEN_FOCUS' || questionType === 'RISK_LIST') return 'SCREEN_MENU_GUIDE';
  if (questionType === 'NEXT_BEST_ACTION') return String(entityType || '').toLowerCase() === 'shift' ? 'ASSIGNMENT_READINESS_GUIDE' : 'SCREEN_MENU_GUIDE';
  if (String(questionType || '') === 'BOARDING_CHANGE_APPLICATION' || hasAny(text, ['kabul edilen değişikliği uygula', 'kabul edilen degisikligi uygula', 'günlük atamaya işle', 'gunluk atamaya işle', 'günlük atamaya işlenebilir', 'sürücü rotası yenilenmez', 'surucu rotasi yenilenmez', 'kalıcı atama değişmez', 'kalici atama degismez', 'sürücü rota ekranında görünür', 'surucu rota ekraninda gorunur', 'rota güncellemesi bekliyor', 'rota guncellemesi bekliyor', 'günlük değişiklik rotada görünüyor', 'gunluk degisiklik rotada gorunuyor', 'sürücüye gönderildi mi', 'surucuye gonderildi mi', 'driver route refresh', 'mobile route update', 'rotasına yansıdı mı', 'rotasina yansidi mi', 'stopassignment'])) return 'ASSIGNMENT_READINESS_GUIDE';
  if (String(questionType || '') === 'BOARDING_CHANGE_REQUEST_ENTRY' || hasBoardingChangeRequestEntrySignal(text)) {
    return String(entityType || '').toLowerCase() === 'shift' ? 'ASSIGNMENT_READINESS_GUIDE' : 'SCREEN_MENU_GUIDE';
  }
  if (String(questionType || '') === 'BOARDING_ROUTE_IMPACT_PREVIEW' || hasAny(text, ['rota etkisi', 'rota etkisini', 'önizle', 'onizle', 'önizleme', 'onizleme', 'bugün binmezse', 'bugun binmezse', 'farklı duraktan', 'farkli duraktan', 'geçici durak', 'gecici durak', 'biniş değişikliği', 'binis degisikligi', 'km farkı', 'km farki', 'süre artar mı', 'sure artar mi', 'kapasite etkisi'])) return 'ASSIGNMENT_READINESS_GUIDE';
  if (String(questionType || '') === 'DYNAMIC_SAVINGS_PREVIEW' || hasAny(text, ['tasarruf', 'tasarruf önizlemesi', 'tasarruf onizlemesi', 'km tasarrufu', 'süre tasarrufu', 'sure tasarrufu', 'yaklaşık maliyet', 'yaklasik maliyet', 'maliyet etkisi', 'readonly tasarruf', 'dinamik tasarruf'])) return 'ASSIGNMENT_READINESS_GUIDE';
  if (pathHas(screenPath, ['/agreements', '/company/agreements', '/room/agreements', '/school/agreements', '/organization/agreements', '/commercial-flow', '/commercial-core']) && (String(questionType || '') === 'MARKETPLACE_FREE_TO_OPERATE_PREVIEW' || hasAny(text, ['lisans ücreti', 'lisans ucreti', 'başarı payı', 'basari payi', 'mevcut sözleşmeden pay', 'mevcut sozlesmeden pay', 'free-to-operate', 'platform fee', 'seferpakt kaynaklı', 'seferpakt kaynakli', 'source lineage', 'kaynak vardiya', 'market shift', 'kaynak zinciri', 'organization plan', 'seçili teklif', 'secili teklif', 'hangi vardiyadan geldi', 'mevcut sözleşme mi', 'mevcut sozlesme mi', 'pay alacak mı', 'pay alacak mi', 'pay alınır mı', 'pay alinır mi', 'pay doğmaz', 'pay dogmaz']))) return 'SCREEN_MENU_GUIDE';
  if (pathHas(screenPath, ['/agreements', '/company/agreements', '/room/agreements', '/school/agreements', '/organization/agreements', '/commercial-flow', '/commercial-core']) && (String(questionType || '') === 'SEFER_SCORE_PREVIEW' || hasSeferScoreSignal(text))) return 'SCREEN_MENU_GUIDE'; // check:seferscore01 remains in the product-extensions chain
  if (String(questionType || '') === 'AGREEMENT_ROUTE_REFRESH' || hasAny(text, ['rota değişikliği', 'rota degisikligi', 'rota güncelleme', 'rota guncelleme', 'eski rota', 'yeni rota', 'teklif mi', 'kabul mü', 'kabul mu', 'karşı teklif', 'karsi teklif', 'uygulanan rota', 'rota geçmişi', 'rota gecmisi', 'room a rota güncelleme talebi', 'room a rota guncelleme talebi'])) return 'ASSIGNMENT_READINESS_GUIDE';
  if (String(entityType) === 'vehicle') {
    if (hasAny(text, ['bağla', 'bagla', 'sürücü', 'surucu'])) return 'VEHICLE_DRIVER_BIND';
    if (hasAny(text, ['görünmüyor', 'gorunmuyor', 'sinyal', 'gecik'])) return 'GPS_SIGNAL_DIAGNOSIS_GUIDE';
    if (hasAny(text, ['cihaz', 'telematics'])) return 'TELEMATICS_DEVICE_CREATE';
    return 'LOCATION_SOURCE_GUIDE';
  }
  if (String(entityType) === 'shift') {
    const workflowQuestion = ['WHY_BLOCKED', 'READINESS_CHECK', 'PAYMENT_READINESS', 'PAYMENT_MISSING', 'FIRST_CONTROL', 'NEXT_SCREEN', 'NEXT_STEP', 'SAFE_NEXT_STEP', 'CONTRACT_TO_SHIFT', 'CONTRACT_SHIFT_TODAY'].includes(String(questionType || ''))
      || hasAny(text, ['hakediş', 'hakedis', 'ödeme', 'odeme', 'önizleme', 'onizleme', 'komisyon', 'ödeme hesabı', 'odeme hesabi', 'eksik bilgi', 'sözleşme', 'sozlesme', 'vardiya', 'görünmüyor', 'gorunmuyor', 'başlayamıyor', 'baslayamiyor', 'başlamıyor', 'baslamiyor']);
    if (workflowQuestion) {
      if (hasAny(text, ['görünmüyor', 'gorunmuyor', 'sinyal', 'gps', 'konum'])) return 'GPS_SIGNAL_DIAGNOSIS_GUIDE';
      return 'ASSIGNMENT_READINESS_GUIDE';
    }
    if (hasAny(text, ['onay', 'teklif'])) return 'OFFER_APPROVAL';
    if (hasAny(text, ['hazır', 'hazir', 'atama'])) return 'ASSIGNMENT_READINESS_GUIDE';
    return 'OFFER_REVIEW';
  }
  if (questionType === 'ROLE_HELP') return 'ROLE_HELP_GUIDE';
  if ((screenPath === '/company' || screenPath === '/organization' || screenPath === '/school') && ['DETAIL_FLOW', 'NEXT_STEP', 'SCREEN_PURPOSE'].includes(questionType)) return 'SCREEN_MENU_GUIDE';
  if (['BUTTON_HELP', 'WHY_BLOCKED', 'CHECKLIST_HELP', 'COMMON_MISTAKE_HELP', 'FIRST_CONTROL', 'NEXT_SCREEN', 'DETAIL_FLOW', 'CONTRACT_TO_SHIFT', 'PAYMENT_READINESS', 'PAYMENT_MISSING', 'READINESS_CHECK', 'SAFE_NEXT_STEP', 'WHAT_CHANGED', 'COMPARE_ITEMS'].includes(questionType)) return 'BUTTON_ACTION_GUIDE';
  if (pathHas(screenPath, ['/map', '/live'])) return 'BUTTON_ACTION_GUIDE';
  return 'SCREEN_MENU_GUIDE';
}

export const BASE_RULES = [
  { type: 'ROLE_HELP', score: 12, patterns: ['bu rolde', 'ne yapabilirim', 'rolümde', 'rolumde', 'yetkim ne', 'rol yardımı', 'rol yardimi', 'bu kullanıcı ne yapabilir', 'hangi yetkiler', 'yetki sınırı', 'rol bazlı', 'kim neyi görebilir', 'kim neyi görür', 'kim yapabilir', 'kim onaylayacak', 'sorumlu kim', 'bu kayıt kimde', 'bu işi kim yapabilir', 'bunu kim yapabilir'], label: 'role-help' },
  { type: 'CHECKLIST_HELP', score: 10, patterns: ['kontrol listesi', 'checklist', 'tek tek kontrol', 'kontrol etmem gerekenler'], label: 'checklist' },
  { type: 'COMMON_MISTAKE_HELP', score: 9, patterns: ['sık hata', 'en sık hata', 'sik hata', 'yaygın hata', 'yaygin hata', 'en çok hata'], label: 'common-mistake' },
  { type: 'SCREEN_FOCUS', score: 10, patterns: ['bu ekranda neye bakmalıyım', 'ekranda neye bakmalıyım', 'neye bakmalıyım', 'önce neye bakmalıyım', 'bu ekranda neyi kontrol etmeliyim', 'ekranda neyi kontrol etmeliyim', 'önce neyi kontrol etmeliyim'], label: 'screen-focus' },
  { type: 'RISK_LIST', score: 10, patterns: ['riskleri sırala', 'riskleri sirala', 'risk listesi', 'başlıca riskler', 'baslica riskler', 'en büyük riskler', 'en buyuk riskler'], label: 'risk-list' },
  { type: 'NEXT_BEST_ACTION', score: 10, patterns: ['sıradaki doğru işlem ne', 'siradaki dogru islem ne', 'bir sonraki doğru işlem ne', 'bir sonraki dogru islem ne', 'şu an en doğru adım ne', 'su an en dogru adim ne', 'şimdi en doğru işlem ne', 'simdi en dogru islem ne'], label: 'next-best-action' },
  { type: 'NEXT_SCREEN', score: 11, patterns: ['hangi ekrana', 'hangi ekrana geçeyim', 'sonra hangi ekrana', 'sonra nereye', 'sonraki ekran', 'hangi menüye', 'en doğru ekran', 'hangi ekranda devam', 'hangi yere geçeyim', 'nereye gitmeliyim', 'nereye geçeyim', 'hangi ekran hangisi', 'mobilde bu iş nereden yapılır'], label: 'next-screen' },
  { type: 'FIRST_CONTROL', score: 9, patterns: ['önce neyi kontrol', 'once neyi kontrol', 'ilk neyi kontrol', 'ilk kontrol', 'ilk bakılacak', 'ilk bakilacak', 'önce neye bakayım', 'once neye bakayim', 'önce neye bakmaliyim', 'once neye bakmaliyim', 'önce neye bakılır', 'once neye bakilir', 'ilk neye bakayım', 'ilk neye bakayim', 'önce nereden bakayım', 'once nereden bakayim'], label: 'first-control' },
  { type: 'DETAIL_FLOW', score: 9, patterns: ['detaylı anlat', 'detayli anlat', 'adım adım detay', 'adim adim detay', 'madde madde', 'tek tek anlat', 'sırayla', 'sirayla', 'guided mode', 'guided modede', 'vardiya nasıl oluştur', 'vardiya nasil olustur', 'nasıl vardiya oluştur', 'nasil vardiya olustur', 'yeni iş nasıl kurulur', 'yeni is nasil kurulur', 'plan nasıl kurulur', 'plan nasil kurulur'], label: 'detail-flow' },
  { type: 'ROW_HELP', score: 10, patterns: ['bu satırı nasıl okurum', 'bu satiri nasil okurum', 'bu satır nasıl okunur', 'bu satir nasil okunur', 'bu kaydı nasıl okurum', 'bu kaydi nasil okurum', 'satırı nasıl okurum', 'satiri nasil okurum'], label: 'row-help' },
  { type: 'MISSING_DATA_HELP', score: 8, patterns: ['bu seçili kayıtta eksik ne var', 'bu secili kayitta eksik ne var', 'bu kayıtta ne eksik', 'bu kayitta ne eksik', 'eksik ne var', 'eksik alan', 'hangi alan boş', 'hangi alan bos', 'eksik veri', 'hangi veri eksik', 'ne eksik'], label: 'missing-data' },
  { type: 'PAYMENT_READINESS', score: 12, patterns: ['bu hakediş neden hazır değil', 'bu hakedis neden hazir degil', 'hakediş neden hazır değil', 'hakedis neden hazir degil', 'hakediş hazır değil', 'hakedis hazir degil', 'ödeme hazır değil', 'odeme hazir degil', 'hakediş önizlemesi', 'hakedis onizlemesi', 'ödeme önizlemesi', 'odeme onizlemesi', 'ödeme hesabı', 'odeme hesabi', 'komisyon', 'kanıt', 'kanit', 'kanıt', 'proof', 'başlatılabilir', 'baslatilabilir', 'güvenli mi', 'guvenli mi', 'etkiliyor', 'etkisi', 'eksik bilgi', 'kontrol gerekli', 'neden eksik'], label: 'payment-readiness' },
  { type: 'PAYMENT_READINESS', score: 4, patterns: ['bu hakediş neden hazır değil', 'bu hakedis neden hazir degil', 'hakediş neden hazır değil', 'hakedis neden hazir degil', 'hakediş hazır değil', 'hakedis hazir degil', 'ödeme hazır değil', 'odeme hazir degil'], label: 'payment-readiness-ready-missing' },
  { type: 'PAYMENT_MISSING', score: 13, patterns: ['kanıt eksikleri', 'kanit eksikleri', 'kanıtlar eksik', 'kanitlar eksik', 'hakediş eksik', 'hakedis eksik', 'ödeme eksik', 'odeme eksik', 'kontrol gerekli', 'hazır değil', 'hazir degil'], label: 'payment-missing' },
  { type: 'READINESS_CHECK', score: 10, patterns: ['hazır mı', 'hazir mi', 'atamaya hazır mı', 'atamaya hazir mi', 'ilerlemeye hazır mı', 'iş hazır mı', 'bu kayıt hazır mı', 'bu kayit hazir mi', 'hakediş tarafında ne kontrol etmeliyim', 'hakedis tarafında ne kontrol etmeliyim', 'bu hakediş neden hazır değil', 'bu hakedis neden hazir degil', 'hazır değil', 'hazir degil', 'hazırlık', 'hazirlik', 'vardiya üretildi mi', 'vardiya uretildi mi', 'bugün vardiya üretildi mi', 'bugun vardiya uretildi mi', 'sözleşmeden vardiya', 'sozlesmeden vardiya', 'sözleşmeden bugün vardiya üretildi mi', 'sozlesmeden bugun vardiya uretildi mi'], label: 'readiness' },
  { type: 'DYNAMIC_SAVINGS_PREVIEW', score: 14, patterns: ['tasarruf', 'tasarruf önizlemesi', 'tasarruf onizlemesi', 'km tasarrufu', 'süre tasarrufu', 'sure tasarrufu', 'yaklaşık maliyet', 'yaklasik maliyet', 'maliyet etkisi', 'readonly tasarruf', 'readonly önizleme', 'dinamik tasarruf'], label: 'dynamic-savings-preview' },
  { type: 'BOARDING_CHANGE_REQUEST_ENTRY', score: 16, patterns: ['talep oluştur', 'talep olustur', 'talep girişi', 'talep girisi', 'bugün binmeyeceğim talebi', 'bugun binmeyecegim talebi', 'başka duraktan binmek istiyorum', 'baska duraktan binmek istiyorum', 'başka duraktan bineceğim', 'baska duraktan binecegim', 'çocuğum bugün binmeyecek', 'cocugum bugun binmeyecek', 'çocuğum başka duraktan binecek', 'cocugum baska duraktan binecek', 'çocuğum şu konumdan alınsın', 'cocugum su konumdan alinsin', 'farklı konumdan alınmak istiyorum', 'farkli konumdan alinmak istiyorum', 'talebim kimde bekliyor', 'kimde bekliyor', 'konum paylaşılmadı', 'konum paylasilmadi'], label: 'boarding-change-request-entry' },
  { type: 'SEFER_SCORE_PREVIEW', score: 15, patterns: ['sefer puanı', 'sefer puani', 'sefer score', 'readonly kalite puanı', 'readonly kalite puani', 'kalite puanı', 'kalite puani', 'tedarikçi puanı', 'tedarikci puani', 'sağlayıcı puanı', 'saglayici puani', 'bu servis kaliteli mi', 'eksik sinyaller', 'puan neden düşük', 'puan neden dusuk', 'puan nasıl yükselir', 'puan nasil yukselir', 'bu puan ödeme veya teklif sıralamasını etkiliyor mu', 'bu puan odeme veya teklif siralamasini etkiliyor mu'], label: 'sefer-score-preview' },
  { type: 'MARKETPLACE_FREE_TO_OPERATE_PREVIEW', score: 14, patterns: ['lisans ücreti', 'lisans ucreti', 'başarı payı', 'basari payi', 'mevcut sözleşmeden pay', 'mevcut sozlesmeden pay', 'free-to-operate', 'platform fee', 'seferpakt kaynaklı', 'seferpakt kaynakli', 'source lineage', 'kaynak vardiya', 'market shift', 'kaynak zinciri', 'organization plan', 'seçili teklif', 'secili teklif', 'hangi vardiyadan geldi', 'mevcut sözleşme mi', 'mevcut sozlesme mi', 'pay alacak mı', 'pay alacak mi', 'pay alınır mı', 'pay alinır mi', 'pay alınır mı', 'pay alinır mı', 'pay doğmaz', 'pay dogmaz', '0 tl lisans', 'mevcut sözleşmeden pay alınır mı', 'mevcut sozlesmeden pay alinir mi'], label: 'marketplace-free-to-operate-preview' },
  { type: 'BOARDING_ROUTE_IMPACT_PREVIEW', score: 13, patterns: ['rota etkisi', 'rota etkisini', 'önizle', 'onizle', 'önizleme', 'onizleme', 'etkiyi hesapla', 'bugün binmezse', 'bugun binmezse', 'farklı duraktan', 'farkli duraktan', 'geçici durak', 'gecici durak', 'biniş değişikliği', 'binis degisikligi', 'km farkı', 'km farki', 'süre artar mı', 'sure artar mi', 'kapasite etkisi', 'rotasını', 'rotasini', 'rotayı', 'rotayi', 'rota.*değiştir', 'rota.*degistir'], label: 'boarding-route-impact-preview' },
  { type: 'AGREEMENT_ROUTE_REFRESH', score: 16, patterns: ['rota değişikliği', 'rota degisikligi', 'rota güncelleme', 'rota guncelleme', 'eski rota', 'yeni rota', 'teklif mi', 'kabul mü', 'kabul mu', 'karşı teklif', 'karsi teklif', 'uygulanan rota', 'rota geçmişi', 'rota gecmisi', 'room a rota güncelleme talebi', 'room a rota guncelleme talebi', 'rooma rota güncelleme talebi'], label: 'agreement-route-refresh' },
  { type: 'BOARDING_CHANGE_APPLICATION', score: 14, patterns: ['kabul edilen değişikliği uygula', 'kabul edilen degisikligi uygula', 'kabul edilen değişikliği işleme al', 'kabul edilen degisikligi isleme al', 'günlük atamaya işle', 'gunluk atamaya işle', 'günlük atamaya işlen', 'gunluk atamaya işlen', 'günlük atamaya işlenebilir', 'gunluk atamaya işlenebilir', 'günlük atama etkisi', 'sürücü rotası yenilenmez', 'surucu rotasi yenilenmez', 'kalıcı atama değişmez', 'kalici atama degismez', 'sürücü rota ekranında görünür', 'surucu rota ekraninda gorunur', 'rota güncellemesi bekliyor', 'rota guncellemesi bekliyor', 'günlük değişiklik rotada görünüyor', 'gunluk degisiklik rotada gorunuyor', 'sürücüye gönderildi mi', 'surucuye gonderildi mi', 'driver route refresh', 'mobile route update', 'rotasına yansıdı mı', 'rotasina yansidi mi', 'stopassignment', 'boarding change application', 'boarding change uygulama'], label: 'boarding-change-application' },
  { type: 'SAFE_NEXT_STEP', score: 9, patterns: ['en risksiz sonraki adım', 'en risksiz sonraki adim', 'en güvenli sonraki adım', 'en guvenli sonraki adim', 'en güvenli ne yapayım', 'en guvenli ne yapayim'], label: 'safe-next' },
  { type: 'WHAT_CHANGED', score: 9, patterns: ['az önce ne değişti', 'az once ne degisti', 'ne değişti', 'ne degisti', 'şimdi neden farklı', 'simdi neden farkli'], label: 'what-changed' },
  { type: 'FIELD_HELP', score: 9, patterns: ['bu sütun ne demek', 'bu sutun ne demek', 'bu kolon ne demek', 'bu alan ne demek', 'hangi sütun', 'hangi sutun'], label: 'field-help' },
  { type: 'BADGE_HELP', score: 9, patterns: ['bu rozet ne demek', 'bu badge ne demek', 'durum rozeti ne demek', 'bu etiket ne demek'], label: 'badge-help' },
  { type: 'STATUS_HELP', score: 8, patterns: ['ne durumda', 'durumu ne', 'kayıt ne durumda', 'kayit ne durumda', 'servisim nerede', 'öğrencimin servisi nerede', 'ogrencimin servisi nerede', 'çocuğumun servisi nerede', 'cocugumun servisi nerede', 'canlı servis nerede'], label: 'status-strong' },
  { type: 'STATUS_HELP', score: 2, patterns: ['durum'], label: 'status-light' },
  { type: 'COMPARE_ITEMS', score: 8, patterns: ['kaydet ile ok yap farkı', 'kaydet ile ok yap farki', 'kaydet ile ok yap aynı mı', 'kaydet + sonraki ile seç farkı', 'kaydet + sonraki ile sec farki', 'listeyi aç ile marketi aç farkı', 'listeyi ac ile marketi ac farki'], label: 'compare' },
  { type: 'TERM_HELP', score: 7, patterns: ['ne demek', 'anlamı', 'anlami', 'bu ne demek', 'aynı şey mi', 'ayni sey mi', 'farkı ne', 'farki ne', 'sözleşme ile vardiya ilişkisi ne', 'kalite puanı kesin karar mı', 'kalite puani kesin karar mi'], label: 'term-help' },
  { type: 'WHY_BLOCKED', score: 9, patterns: ['neden kapalı', 'neden kapali', 'kapalı', 'kapali', 'devam edemiyorum', 'neden olmuyor', 'neden görünmüyor', 'neden gorunmuyor', 'neden pasif', 'neden sorunlu', 'niye sorunlu', 'sorunlu görünüyor', 'sorunlu gorunuyor', 'neden riskli', 'niye riskli', 'neden kırmızı', 'neden kirmizi', 'bu kayıt neden ilerlemiyor', 'göremiyor olabilir miyim', 'gorunmuyor olabilir miyim', 'kvkk yüzünden', 'kvkk yuzunden', 'hazır değil', 'hazir degil', 'eksik bilgi', 'hangi olaydan geldi', 'nereden geldi', 'kaynak ne', 'bu bilgi neden görünmüyor', 'bu araç neden haritada görünmüyor', 'bu sağlayıcı neden daha iyi görünüyor', 'başlayamıyor', 'baslayamiyor', 'başlamıyor', 'baslamiyor'], label: 'why-blocked' },
  { type: 'CONTRACT_TO_SHIFT', score: 14, patterns: ['bu sözleşmeden bugün vardiya üretildi mi', 'bu sozlesmeden bugun vardiya uretildi mi', 'bu sözleşmeden vardiya üretildi mi', 'bu sozlesmeden vardiya uretildi mi', 'sözleşmeden bugün vardiya üretildi mi', 'sozlesmeden bugun vardiya uretildi mi', 'sözleşmeden vardiya üretildi mi', 'sozlesmeden vardiya uretildi mi', 'sözleşme bugün vardiya üretildi mi', 'sozlesme bugun vardiya uretildi mi', 'bugünkü vardiya bu sözleşmeden mi üretildi', 'bugunku vardiya bu sozlesmeden mi uretildi', 'sözleşme vardiya üretimi', 'sozlesme vardiya uretimi', 'sözleşme vardiya üretildi mi', 'sozlesme vardiya uretildi mi', 'sözleşme vardiya oluştu mu', 'sozlesme vardiya olustu mu', 'sözleşme vardiya oluşturuldu mu', 'sozlesme vardiya olusturuldu mu', 'sözleşme → vardiya', 'sözleşme -> vardiya', 'contract to shift'], label: 'contract-to-shift' },
  { type: 'STATUS_HELP', score: 4, patterns: ['sorumlu kim', 'kimde', 'hangi rol', 'hangi olaydan', 'bildirim kaynağı', 'bildirim kaynagi', 'bu bildirim hangi olaydan geldi'], label: 'status-ownership' },
  { type: 'BUTTON_HELP', score: 8, patterns: ['buton', 'düğme', 'dugme', 'menü', 'menu', 'kaydet', 'kaydet + sonraki', 'rehberi başlat', 'onay ver', 'önizle', 'analiz et', 'bu buton ne yapar', 'listeyi aç', 'bekleyeni aç', 'marketi aç', 'ok yap', 'büyük haritada işaretle', 'buyuk haritada isaretle', 'tüm adresleri temizle', 'tum adresleri temizle', 'tüm telefonları temizle', 'tum telefonlari temizle'], label: 'button-help' },
  { type: 'LOCATION_HELP', score: 8, patterns: ['konum', 'gps', 'telefon gps', "telefon gps'i", 'cihaz gps', 'konum kaynağı', 'konum kaynagi', 'sürücünün telefon gps’i neden devrede', 'sürücünün telefon gps i neden devrede', 'sürücünün telefon gpsi neden devrede'], label: 'location-help' },
  { type: 'NEXT_STEP', score: 6, patterns: ['peki sonra', 'sonra ne', 'şimdi ne yapayım', 'simdi ne yapayim', 'şimdi ne yapacağım', 'simdi ne yapacagim', 'şimdi ne yapmalıyım', 'simdi ne yapmaliyim', 'bundan sonra ne yapayım', 'bundan sonra ne yapayim', 'bundan sonra ne yapmalıyım', 'bundan sonra ne yapmaliyim', 'sıradaki adım ne', 'siradaki adim ne', 'sıradaki doğru işlem ne', 'siradaki dogru islem ne', 'sıradaki doğru adım ne', 'siradaki dogru adim ne', 'nasıl yaparım', 'nasil yaparim', 'adım adım', 'adim adim', 'nasıl', 'nasil'], label: 'next-step' },
  { type: 'SCREEN_PURPOSE', score: 6, patterns: ['bura ne', 'burası ne', 'burasi ne', 'bu ne', 'ne bu', 'burda ne var', 'burada ne var', 'bu ekran', 'ne için', 'ne ise yar', 'ne işe yar', 'ekran', 'ne yapılır', 'ne yapilir', 'burada ne yapılır', 'burada ne yapilir', 'bu ekranda ne yapmalıyım', 'burada ne yapmalıyım', 'bu ekranın amacı ne', 'bu ekran ne işe yarar', 'bu ekran ne için kullanılır', 'burası ne işe yarıyor', 'burasi ne ise yariyor', 'saha kabul', 'checklist'], label: 'screen-purpose' },
];

export const COP02A_GENERAL_RULES = [
  { type: 'ROLE_HELP', score: 6, patterns: ['bu kullanıcı ne yapabilir', 'hangi yetkiler', 'yetki sınırı', 'rol bazlı', 'kim neyi görebilir', 'kim neyi görür', 'bu kullanıcı bu bilgiyi göremez', 'bu rolde ne yapabilirim', 'bu rolde burada neyi yönetebilirim', 'kim yapabilir', 'kim onaylayacak', 'sorumlu kim', 'bu kayıt kimde'], label: 'cop02a-role-help' },
  { type: 'SCREEN_PURPOSE', score: 5, patterns: ['bu ekranda ne yapmalıyım', 'burada ne yapmalıyım', 'bu ekranın amacı ne', 'bu ekran ne işe yarar', 'bu ekran ne için kullanılır', 'bura ne', 'burası ne', 'bu ne', 'ne bu', 'burda ne var', 'burası ne işe yarıyor', 'saha kabul', 'checklist'], label: 'cop02a-screen-purpose' },
  { type: 'NEXT_STEP', score: 6, patterns: ['sıradaki doğru işlem ne', 'sıradaki doğru adım ne', 'ilk bakılacak yer', 'ilk kontrolü ne', 'önce ne yapayım', 'ne yapayım', 'şimdi ne', 'hangi ekrana gitmeliyim', 'mobilde bu iş nereden yapılır', 'şimdi hangi ekrana gitmeliyim', 'sonra ne yapayım'], label: 'cop02a-next-step' },
  { type: 'WHY_BLOCKED', score: 6, patterns: ['bu kayıt neden ilerlemiyor', 'neden ilerlemiyor', 'göremiyor olabilir miyim', 'kvkk yüzünden', 'bu kayıt neden kapalı', 'bu kullanıcı bu bilgiyi göremiyor', 'hazır değil', 'hazir degil', 'eksik bilgi', 'başlayamıyor', 'baslayamiyor', 'başlamıyor', 'baslamiyor'], label: 'cop02a-why-blocked' },
  { type: 'SCREEN_PURPOSE', score: 13, patterns: ['sözleşme ile vardiya ilişkisi ne', 'sozlesme ile vardiya iliskisi ne'], label: 'cop02a-contract-shift-purpose' },
  { type: 'TERM_HELP', score: 5, patterns: ['sözleşme ile vardiya ilişkisi ne', 'kalite puanı kesin karar mı', 'hakediş tarafında ne kontrol etmeliyim', 'bu ekran neyi anlatıyor', 'sağlayıcı neden daha iyi', 'bildirim hangi olaydan', 'bu kayıt kimde'], label: 'cop02a-term-help' },
  { type: 'LOCATION_HELP', score: 5, patterns: ['sürücünün telefon gps’i neden devrede', 'sürücünün telefon gps i neden devrede', 'konum neden görünmüyor', 'haritada görünmüyor'], label: 'cop02a-location-help' },
];

export const INTENT_PRIORITY = [
  'PRODUCT_OVERVIEW_HELP',
  'ROLE_EXPLANATION_HELP',
  'SCREEN_EXPLANATION_HELP',
  'HOW_TO_HELP',
  'FIELD_BUTTON_HELP',
  'ROLE_HELP',
  'CHECKLIST_HELP',
  'COMMON_MISTAKE_HELP',
  'SCREEN_FOCUS',
  'RISK_LIST',
  'NEXT_BEST_ACTION',
  'NEXT_SCREEN',
  'FIRST_CONTROL',
  'DETAIL_FLOW',
  'ROW_HELP',
  'MISSING_DATA_HELP',
  'CONTRACT_TO_SHIFT',
  'SEFER_SCORE_PREVIEW',
  'MARKETPLACE_FREE_TO_OPERATE_PREVIEW',
  'PAYMENT_READINESS',
  'PAYMENT_MISSING',
  'READINESS_CHECK',
  'DYNAMIC_SAVINGS_PREVIEW',
  'BOARDING_CHANGE_REQUEST_ENTRY',
  'BOARDING_CHANGE_APPLICATION',
  'BOARDING_ROUTE_IMPACT_PREVIEW',
  'AGREEMENT_ROUTE_REFRESH',
  'SHIFT_BLOCKED',
  'SAFE_NEXT_STEP',
  'WHAT_CHANGED',
  'FIELD_HELP',
  'BADGE_HELP',
  'STATUS_HELP',
  'COMPARE_ITEMS',
  'TERM_HELP',
  'WHY_BLOCKED',
  'BUTTON_HELP',
  'GO_TO',
  'LOCATION_HELP',
  'NEXT_STEP',
  'SCREEN_PURPOSE',
  'OPEN',
];
