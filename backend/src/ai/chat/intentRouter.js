function normalizeText(value) {
  return String(value || '').trim().toLocaleLowerCase('tr-TR');
}

function hasAny(text, patterns) {
  const value = normalizeText(text);
  return (Array.isArray(patterns) ? patterns : []).some((p) => value.includes(normalizeText(p)));
}

function normalizeLooseText(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLocaleLowerCase('tr-TR')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegExp(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matchesStandalonePhrase(text, phrases) {
  const value = normalizeLooseText(text);
  if (!value) return false;
  return (Array.isArray(phrases) ? phrases : []).some((phrase) => {
    const normalized = normalizeLooseText(phrase);
    if (!normalized) return false;
    const pattern = new RegExp(`(?:^|[^\\p{L}\\p{N}])${escapeRegExp(normalized)}(?:$|[^\\p{L}\\p{N}])`, 'iu');
    return pattern.test(value);
  });
}

function pathHas(path, parts) {
  const value = normalizeText(path);
  return (Array.isArray(parts) ? parts : []).some((p) => value.includes(normalizeText(p)));
}

function countMatches(text, patterns) {
  const value = normalizeText(text);
  return (Array.isArray(patterns) ? patterns : []).reduce((count, pattern) => count + (value.includes(normalizeText(pattern)) ? 1 : 0), 0);
}

function hasImperativeNavigation(text) {
  const value = normalizeText(text);
  return /(götür|gotur|aç|ac|git|geç|gec)\b/.test(value);
}

function mentionsScreenWord(text) {
  return hasAny(text, ['ekran', 'menu', 'menü', 'sekme', 'panel', 'sayfa', 'kısım', 'kisim', 'yer', 'harita', 'planlama', 'vardiya', 'ticari', 'hizmet', 'konum', 'copilot', 'sözleşme', 'sozlesme', 'rapor', 'doğrulama', 'dogrulama']);
}

function isDirectScreenSteer(text) {
  const value = normalizeText(text);
  if (!value) return false;
  const steerWords = ['doğrudan', 'dogrudan', 'direkt', 'direk', 'sapma olmadan', 'hedef ekran', 'yanlış hedef', 'yanlis hedef'];
  const screenWords = ['vardiya', 'konum', 'lokasyon', 'ticari', 'hizmet', 'planlama', 'merkez', 'harita', 'copilot', 'hub', 'sözleşme', 'sozlesme', 'rapor', 'doğrulama', 'dogrulama'];
  return hasAny(value, steerWords) && hasAny(value, screenWords);
}


function isShortFollowUp(text) {
  const value = normalizeText(text);
  if (!value) return false;
  if (value.length > 72) return false;
  return /(peki|tamam|o zaman|devam|devam et|ee sonra|e sonra|sonra\??|simdi\??|şimdi\??|neden\??|niye\??|bunda\??|burada\??|aynı kayıtta|ayni kayitta|aynı satırda|ayni satirda|bu kayıtta|bu kayitta)/.test(value)
    || matchesStandalonePhrase(value, ['bura ne', 'burası ne', 'burasi ne', 'bu ne', 'ne bu', 'burda ne var', 'burada ne var', 'burası ne işe yarıyor', 'burasi ne ise yariyor', 'bu ekran ne', 'ne yapayım', 'ne yapayim', 'şimdi ne', 'simdi ne']);
}

function lastQuestionType(state) {
  return String(state?.lastQuestionType || '');
}

function computeConfidence(score = 0) {
  if (score >= 11) return 0.96;
  if (score >= 9) return 0.9;
  if (score >= 7) return 0.82;
  if (score >= 5) return 0.72;
  if (score >= 3) return 0.6;
  return 0.48;
}

function addScore(scoreMap, signalMap, type, score, signal) {
  if (!type || !score) return;
  scoreMap[type] = (scoreMap[type] || 0) + score;
  if (signal) {
    if (!Array.isArray(signalMap[type])) signalMap[type] = [];
    signalMap[type].push(signal);
  }
}

function applyRules(text, scoreMap, signalMap, rules = []) {
  (Array.isArray(rules) ? rules : []).forEach((rule) => {
    const hits = countMatches(text, rule.patterns);
    if (!hits) return;
    addScore(scoreMap, signalMap, rule.type, (rule.perHit ? hits : 1) * Number(rule.score || 0), `${rule.label || rule.type}:${hits}`);
  });
}

const BASE_RULES = [
  { type: 'ROLE_HELP', score: 12, patterns: ['bu rolde', 'ne yapabilirim', 'rolümde', 'rolumde', 'yetkim ne', 'rol yardımı', 'rol yardimi', 'bu kullanıcı ne yapabilir', 'hangi yetkiler', 'yetki sınırı', 'rol bazlı', 'kim neyi görebilir', 'kim neyi görür'], label: 'role-help' },
  { type: 'CHECKLIST_HELP', score: 10, patterns: ['kontrol listesi', 'checklist', 'tek tek kontrol', 'kontrol etmem gerekenler'], label: 'checklist' },
  { type: 'COMMON_MISTAKE_HELP', score: 9, patterns: ['sık hata', 'en sık hata', 'sik hata', 'yaygın hata', 'yaygin hata', 'en çok hata'], label: 'common-mistake' },
  { type: 'NEXT_SCREEN', score: 11, patterns: ['hangi ekrana', 'hangi ekrana geçeyim', 'sonra hangi ekrana', 'sonra nereye', 'sonraki ekran', 'hangi menüye', 'en doğru ekran', 'hangi ekranda devam', 'hangi yere geçeyim', 'nereye gitmeliyim', 'nereye geçeyim', 'hangi ekran hangisi', 'mobilde bu iş nereden yapılır'], label: 'next-screen' },
  { type: 'FIRST_CONTROL', score: 9, patterns: ['önce neyi kontrol', 'once neyi kontrol', 'ilk neyi kontrol', 'ilk kontrol', 'ilk bakılacak', 'ilk bakilacak', 'önce neye bakayım', 'once neye bakayim', 'önce neye bakmaliyim', 'once neye bakmaliyim', 'önce neye bakılır', 'once neye bakilir', 'ilk neye bakayım', 'ilk neye bakayim', 'önce nereden bakayım', 'once nereden bakayim'], label: 'first-control' },
  { type: 'DETAIL_FLOW', score: 9, patterns: ['detaylı anlat', 'detayli anlat', 'adım adım detay', 'adim adim detay', 'madde madde', 'tek tek anlat', 'sırayla', 'sirayla', 'guided mode', 'guided modede', 'vardiya nasıl oluştur', 'vardiya nasil olustur', 'nasıl vardiya oluştur', 'nasil vardiya olustur', 'yeni iş nasıl kurulur', 'yeni is nasil kurulur', 'plan nasıl kurulur', 'plan nasil kurulur'], label: 'detail-flow' },
  { type: 'ROW_HELP', score: 10, patterns: ['bu satırı nasıl okurum', 'bu satiri nasil okurum', 'bu satır nasıl okunur', 'bu satir nasil okunur', 'bu kaydı nasıl okurum', 'bu kaydi nasil okurum', 'satırı nasıl okurum', 'satiri nasil okurum'], label: 'row-help' },
  { type: 'MISSING_DATA_HELP', score: 8, patterns: ['bu seçili kayıtta eksik ne var', 'bu secili kayitta eksik ne var', 'bu kayıtta ne eksik', 'bu kayitta ne eksik', 'eksik ne var', 'eksik alan', 'hangi alan boş', 'hangi alan bos'], label: 'missing-data' },
  { type: 'READINESS_CHECK', score: 10, patterns: ['hazır mı', 'hazir mi', 'atamaya hazır mı', 'atamaya hazir mi', 'ilerlemeye hazır mı', 'iş hazır mı', 'bu kayıt hazır mı', 'bu kayit hazir mi', 'hakediş tarafında ne kontrol etmeliyim', 'hakedis tarafında ne kontrol etmeliyim'], label: 'readiness' },
  { type: 'SAFE_NEXT_STEP', score: 9, patterns: ['en risksiz sonraki adım', 'en risksiz sonraki adim', 'en güvenli sonraki adım', 'en guvenli sonraki adim', 'en güvenli ne yapayım', 'en guvenli ne yapayim'], label: 'safe-next' },
  { type: 'WHAT_CHANGED', score: 9, patterns: ['az önce ne değişti', 'az once ne degisti', 'ne değişti', 'ne degisti', 'şimdi neden farklı', 'simdi neden farkli'], label: 'what-changed' },
  { type: 'FIELD_HELP', score: 9, patterns: ['bu sütun ne demek', 'bu sutun ne demek', 'bu kolon ne demek', 'bu alan ne demek', 'hangi sütun', 'hangi sutun'], label: 'field-help' },
  { type: 'BADGE_HELP', score: 9, patterns: ['bu rozet ne demek', 'bu badge ne demek', 'durum rozeti ne demek', 'bu etiket ne demek'], label: 'badge-help' },
  { type: 'STATUS_HELP', score: 8, patterns: ['ne durumda', 'durumu ne', 'kayıt ne durumda', 'kayit ne durumda'], label: 'status-strong' },
  { type: 'STATUS_HELP', score: 2, patterns: ['durum'], label: 'status-light' },
  { type: 'COMPARE_ITEMS', score: 8, patterns: ['kaydet ile ok yap farkı', 'kaydet ile ok yap farki', 'kaydet ile ok yap aynı mı', 'kaydet + sonraki ile seç farkı', 'kaydet + sonraki ile sec farki', 'listeyi aç ile marketi aç farkı', 'listeyi ac ile marketi ac farki'], label: 'compare' },
  { type: 'TERM_HELP', score: 7, patterns: ['ne demek', 'anlamı', 'anlami', 'bu ne demek', 'aynı şey mi', 'ayni sey mi', 'farkı ne', 'farki ne', 'sözleşme ile vardiya ilişkisi ne', 'kalite puanı kesin karar mı', 'kalite puani kesin karar mi'], label: 'term-help' },
  { type: 'WHY_BLOCKED', score: 9, patterns: ['neden kapalı', 'neden kapali', 'kapalı', 'kapali', 'devam edemiyorum', 'neden olmuyor', 'neden görünmüyor', 'neden gorunmuyor', 'neden pasif', 'neden sorunlu', 'niye sorunlu', 'sorunlu görünüyor', 'sorunlu gorunuyor', 'neden riskli', 'niye riskli', 'neden kırmızı', 'neden kirmizi', 'bu kayıt neden ilerlemiyor', 'göremiyor olabilir miyim', 'gorunmuyor olabilir miyim', 'kvkk yüzünden', 'kvkk yuzunden'], label: 'why-blocked' },
  { type: 'BUTTON_HELP', score: 8, patterns: ['buton', 'düğme', 'dugme', 'menü', 'menu', 'kaydet', 'kaydet + sonraki', 'rehberi başlat', 'onay ver', 'önizle', 'analiz et', 'bu buton ne yapar', 'listeyi aç', 'bekleyeni aç', 'marketi aç', 'ok yap', 'büyük haritada işaretle', 'buyuk haritada isaretle', 'tüm adresleri temizle', 'tum adresleri temizle', 'tüm telefonları temizle', 'tum telefonlari temizle'], label: 'button-help' },
  { type: 'LOCATION_HELP', score: 8, patterns: ['konum', 'gps', 'telefon gps', "telefon gps'i", 'cihaz gps', 'konum kaynağı', 'konum kaynagi', 'sürücünün telefon gps’i neden devrede', 'sürücünün telefon gps i neden devrede', 'sürücünün telefon gpsi neden devrede'], label: 'location-help' },
  { type: 'NEXT_STEP', score: 6, patterns: ['peki sonra', 'sonra ne', 'şimdi ne yapayım', 'simdi ne yapayim', 'şimdi ne yapacağım', 'simdi ne yapacagim', 'şimdi ne yapmalıyım', 'simdi ne yapmaliyim', 'bundan sonra ne yapayım', 'bundan sonra ne yapayim', 'bundan sonra ne yapmalıyım', 'bundan sonra ne yapmaliyim', 'sıradaki adım ne', 'siradaki adim ne', 'sıradaki doğru işlem ne', 'siradaki dogru islem ne', 'sıradaki doğru adım ne', 'siradaki dogru adim ne', 'nasıl yaparım', 'nasil yaparim', 'adım adım', 'adim adim', 'nasıl', 'nasil'], label: 'next-step' },
  { type: 'SCREEN_PURPOSE', score: 6, patterns: ['bura ne', 'burası ne', 'burasi ne', 'bu ne', 'ne bu', 'burda ne var', 'burada ne var', 'bu ekran', 'ne için', 'ne ise yar', 'ne işe yar', 'ekran', 'ne yapılır', 'ne yapilir', 'burada ne yapılır', 'burada ne yapilir', 'bu ekranda ne yapmalıyım', 'burada ne yapmalıyım', 'bu ekranın amacı ne', 'bu ekran ne işe yarar', 'bu ekran ne için kullanılır', 'burası ne işe yarıyor', 'burasi ne ise yariyor', 'saha kabul', 'checklist'], label: 'screen-purpose' },
];

const COP02A_GENERAL_RULES = [
  { type: 'ROLE_HELP', score: 6, patterns: ['bu kullanıcı ne yapabilir', 'hangi yetkiler', 'yetki sınırı', 'rol bazlı', 'kim neyi görebilir', 'kim neyi görür', 'bu kullanıcı bu bilgiyi göremez', 'bu rolde ne yapabilirim', 'bu rolde burada neyi yönetebilirim'], label: 'cop02a-role-help' },
  { type: 'SCREEN_PURPOSE', score: 5, patterns: ['bu ekranda ne yapmalıyım', 'burada ne yapmalıyım', 'bu ekranın amacı ne', 'bu ekran ne işe yarar', 'bu ekran ne için kullanılır', 'bura ne', 'burası ne', 'bu ne', 'ne bu', 'burda ne var', 'burası ne işe yarıyor', 'saha kabul', 'checklist'], label: 'cop02a-screen-purpose' },
  { type: 'NEXT_STEP', score: 6, patterns: ['sıradaki doğru işlem ne', 'sıradaki doğru adım ne', 'ilk bakılacak yer', 'ilk kontrolü ne', 'önce ne yapayım', 'ne yapayım', 'şimdi ne', 'hangi ekrana gitmeliyim', 'mobilde bu iş nereden yapılır', 'şimdi hangi ekrana gitmeliyim'], label: 'cop02a-next-step' },
  { type: 'WHY_BLOCKED', score: 6, patterns: ['bu kayıt neden ilerlemiyor', 'neden ilerlemiyor', 'göremiyor olabilir miyim', 'kvkk yüzünden', 'bu kayıt neden kapalı', 'bu kullanıcı bu bilgiyi göremiyor'], label: 'cop02a-why-blocked' },
  { type: 'SCREEN_PURPOSE', score: 13, patterns: ['sözleşme ile vardiya ilişkisi ne', 'sozlesme ile vardiya iliskisi ne'], label: 'cop02a-contract-shift-purpose' },
  { type: 'TERM_HELP', score: 5, patterns: ['sözleşme ile vardiya ilişkisi ne', 'kalite puanı kesin karar mı', 'hakediş tarafında ne kontrol etmeliyim', 'bu ekran neyi anlatıyor'], label: 'cop02a-term-help' },
  { type: 'LOCATION_HELP', score: 5, patterns: ['sürücünün telefon gps’i neden devrede', 'sürücünün telefon gps i neden devrede', 'konum neden görünmüyor', 'haritada görünmüyor'], label: 'cop02a-location-help' },
];

const INTENT_PRIORITY = [
  'ROLE_HELP',
  'CHECKLIST_HELP',
  'COMMON_MISTAKE_HELP',
  'NEXT_SCREEN',
  'FIRST_CONTROL',
  'DETAIL_FLOW',
  'ROW_HELP',
  'MISSING_DATA_HELP',
  'READINESS_CHECK',
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

function normalizeIntentArgs(entityTypeOrOptions = 'screen', screenPath = '') {
  if (entityTypeOrOptions && typeof entityTypeOrOptions === 'object' && !Array.isArray(entityTypeOrOptions)) {
    return {
      entityType: String(entityTypeOrOptions.entityType || 'screen'),
      screenPath: String(entityTypeOrOptions.screenPath || ''),
      roleMode: String(entityTypeOrOptions.roleMode || 'OPERATIONS'),
      conversationState: entityTypeOrOptions.conversationState || null,
    };
  }
  return { entityType: String(entityTypeOrOptions || 'screen'), screenPath: String(screenPath || ''), roleMode: 'OPERATIONS', conversationState: null };
}

export function detectQuestionIntent(message, entityTypeOrOptions = 'screen', screenPath = '') {
  const text = normalizeText(message);
  const options = normalizeIntentArgs(entityTypeOrOptions, screenPath);
  if (!text) return { questionType: 'OPEN', confidence: 0.42, matchedSignals: [], preferRoute: false, routeRequest: false };

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
  if (/(hazır|hazir).*(mi|mı)/.test(text) && options.entityType === 'shift') addScore(scores, signals, 'READINESS_CHECK', 2, 'shift-readiness-bias');
  if (/(durum|ne\s+durumda|durumu\s+ne)/.test(text) && options.entityType === 'shift') addScore(scores, signals, 'STATUS_HELP', 1, 'shift-status-bias');
  if (/(gps|konum|telefon\s+gps)/.test(text) && options.entityType === 'vehicle') addScore(scores, signals, 'LOCATION_HELP', 2, 'vehicle-location-bias');
  if (/(konum|gps|telefon\s+gps).*(neden).*(görünmüyor|gorunmuyor|gecik|gecikiyor|yok)/.test(text) && options.entityType === 'vehicle') {
    addScore(scores, signals, 'LOCATION_HELP', 6, 'vehicle-location-diagnosis');
    addScore(scores, signals, 'WHY_BLOCKED', -2, 'vehicle-location-not-generic-blocked');
  }
  if (pathHas(options.screenPath, ['/operation-health', '/observability', '/trust-quality']) && /(neden|niye).*(sorunlu|riskli|uyarı|uyari|kırmızı|kirmizi|zayıf|zayif|gecik|gecikme|yok)/.test(text)) addScore(scores, signals, 'WHY_BLOCKED', 6, 'health-risk-why');
  if (pathHas(options.screenPath, ['/personel/my', '/personel/live', '/parent/live', '/driver/route', '/driver/today']) && /(şimdi|simdi|bundan sonra|sonra).*(ne yap|nereye|neye bak)/.test(text)) {
    addScore(scores, signals, 'NEXT_STEP', 5, 'simple-flow-next-step');
    addScore(scores, signals, 'SCREEN_PURPOSE', -2, 'simple-flow-not-purpose');
  }
  if (/(neden|farkı|farki|ne\s+demek)/.test(text) && pathHas(options.screenPath, ['/agreements', '/hub', '/school/parents', '/access-links', '/checkin', '/notifications', '/logs', '/operation-verification', '/acceptance', '/trust-quality', '/observability'])) addScore(scores, signals, 'SCREEN_PURPOSE', 1, 'special-screen-purpose');
  if (pathHas(options.screenPath, ['/trust-quality']) && /(sağlayıcı|saglayici).*(daha iyi|daha güçlü|daha guclu|neden|karşılaştır|karsilastir)/.test(text)) addScore(scores, signals, 'SCREEN_PURPOSE', 4, 'trust-quality-provider-comparison');

  const shortFollowUp = isShortFollowUp(text);
  const prevType = lastQuestionType(options.conversationState);
  if (shortFollowUp && prevType) {
    if (/(peki|tamam|o zaman|devam|sonra|simdi|şimdi|ee sonra)/.test(text)) {
      if (['WHY_BLOCKED', 'STATUS_HELP', 'READINESS_CHECK', 'FIRST_CONTROL', 'SCREEN_PURPOSE', 'ROLE_HELP'].includes(prevType)) addScore(scores, signals, 'NEXT_STEP', 6, `follow-up-next:${prevType}`);
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

export function resolveReplyMode(message, questionType, roleMode = 'OPERATIONS') {
  const text = normalizeText(message);
  if (questionType === 'DETAIL_FLOW' || hasAny(text, ['adım adım', 'adim adim', 'madde madde', 'tek tek'])) return 'STEP_BY_STEP';
  if (questionType === 'WHY_BLOCKED' || hasAny(text, ['neden'])) return 'WHY';
  if (roleMode === 'SIMPLE' && questionType !== 'TERM_HELP') return 'SHORT';
  return 'SHORT';
}

export function selectGuideJobType({ entityType = 'screen', questionType = 'OPEN', message = '', screenPath = '' }) {
  const text = normalizeText(message);
  if (String(entityType) === 'vehicle') {
    if (hasAny(text, ['bağla', 'bagla', 'sürücü', 'surucu'])) return 'VEHICLE_DRIVER_BIND';
    if (hasAny(text, ['görünmüyor', 'gorunmuyor', 'sinyal', 'gecik'])) return 'GPS_SIGNAL_DIAGNOSIS_GUIDE';
    if (hasAny(text, ['cihaz', 'telematics'])) return 'TELEMATICS_DEVICE_CREATE';
    return 'LOCATION_SOURCE_GUIDE';
  }
  if (String(entityType) === 'shift') {
    if (hasAny(text, ['onay', 'teklif'])) return 'OFFER_APPROVAL';
    if (hasAny(text, ['hazır', 'hazir', 'atama'])) return 'ASSIGNMENT_READINESS_GUIDE';
    return 'OFFER_REVIEW';
  }
  if (questionType === 'ROLE_HELP') return 'ROLE_HELP_GUIDE';
  if ((screenPath === '/company' || screenPath === '/organization' || screenPath === '/school') && ['DETAIL_FLOW', 'NEXT_STEP', 'SCREEN_PURPOSE'].includes(questionType)) return 'SCREEN_MENU_GUIDE';
  if (['BUTTON_HELP', 'WHY_BLOCKED', 'CHECKLIST_HELP', 'COMMON_MISTAKE_HELP', 'FIRST_CONTROL', 'NEXT_SCREEN', 'DETAIL_FLOW', 'READINESS_CHECK', 'SAFE_NEXT_STEP', 'WHAT_CHANGED', 'COMPARE_ITEMS'].includes(questionType)) return 'BUTTON_ACTION_GUIDE';
  if (pathHas(screenPath, ['/map', '/live'])) return 'BUTTON_ACTION_GUIDE';
  return 'SCREEN_MENU_GUIDE';
}

function simpleScreenChipsByPath(screenPath = '') {
    if (pathHas(screenPath, ['/room/drivers'])) {
      return ['Bu ekranı detaylı anlat', 'Aktif sürücüler kim?', 'Görev bağlantısı var mı?', 'Sürücü durumunu açıkla'];
    }
    if (pathHas(screenPath, ['/shared/feedback'])) {
      return ['Bu ekranı detaylı anlat', 'Açık kayıt var mı?', 'Kritik geri bildirim var mı?', 'Sorumlu rol kim?'];
    }
    if (pathHas(screenPath, ['/shared/kvkk'])) {
      return ['Bu bilgi neden görünmüyor?', 'Hangi rol görebilir?', 'KVKK sınırı ne?', 'Bu ekranı detaylı anlat'];
    }
    if (pathHas(screenPath, ['/shared/notifications'])) {
      return ['Okunmamış bildirim var mı?', 'Bu bildirim hangi olaydan geldi?', 'İlgili kayda gitmeli miyim?', 'Bu ekranı detaylı anlat'];
    }
    if (pathHas(screenPath, ['/room/commercial-flow'])) {
      return ['Bu ekranı detaylı anlat', 'İlk neye bakayım?', 'Hakediş neden hazır değil?', 'Sonra ne yapayım?'];
    }
    if (pathHas(screenPath, ['/georeview'])) {
      return ['Konum İncele ne demek?', 'OSRM nedir?', 'Matrix nedir?', 'Sonra nereye geçeyim?'];
    }
  if (pathHas(screenPath, ['/commercial-flow', '/service-evaluation', '/shifts'])) {
    return ['Bu ekranı detaylı anlat', 'Bu satırı nasıl inceleyeyim?', 'Bu sütun ne demek?', 'Bu rozet ne demek?'];
  }
  if (pathHas(screenPath, ['/agreements'])) {
    return ['Sözleşme burada ne işe yarıyor?', 'Neden kapalı?', 'Şimdi ne yapayım?', 'Sonra nereye geçeyim?'];
  }
  if (pathHas(screenPath, ['/operation-verification', '/acceptance', '/trust-quality', '/observability'])) {
    return ['Bu ekranı detaylı anlat', 'Önce neyi kontrol edeyim?', 'Bu ne demek?', 'Şimdi ne yapayım?'];
  }
  if (pathHas(screenPath, ['/hub'])) {
    return ['Hub ne demek?', 'Inbound ne demek?', 'Outbound ne demek?', 'Şimdi ne yapayım?'];
  }
  if (pathHas(screenPath, ['/notifications'])) {
    return ['Okunmamış bildirim var mı?', 'Bu bildirim hangi olaydan geldi?', 'Bu ekranı detaylı anlat', 'İlgili kayda gitmeli miyim?'];
  }
  if (pathHas(screenPath, ['/logs'])) {
    return ['Bu ekranı detaylı anlat', 'İşlem kaydı ne demek?', 'Bildirimle farkı ne?', 'Şimdi ne yapayım?'];
  }
  if (pathHas(screenPath, ['/checkin'])) {
    return ['Check-in ne demek?', 'Bu ekran ne için var?', 'Şimdi ne yapayım?', 'Bu rolde ne yapabilirim?'];
  }
  if (pathHas(screenPath, ['/today', '/live', '/my', '/route', '/map'])) {
    return ['Bu ekranı detaylı anlat', 'Şimdi ne yapayım?', 'Bu ne demek?', 'Bu rolde ne yapabilirim?'];
  }
  return ['Bu ekranı detaylı anlat', 'İlk neye bakayım?', 'Burada eksik ne olabilir?', 'Hangi ekrana geçmeliyim?'];
}

function screenChipsByPath(screenPath = '', roleMode = 'OPERATIONS') {
    const chips = [];
    if (pathHas(screenPath, ['/room/drivers'])) {
      chips.push('Bu ekranı detaylı anlat', 'Aktif sürücüler kim?', 'Görev bağlantısı var mı?', 'Sürücü durumunu açıkla', 'İlgili yere götür');
    } else if (pathHas(screenPath, ['/shared/feedback'])) {
      chips.push('Bu ekranı detaylı anlat', 'Açık kayıt var mı?', 'Kritik geri bildirim var mı?', 'Sorumlu rol kim?', 'İlgili yere götür');
    } else if (pathHas(screenPath, ['/shared/kvkk'])) {
      chips.push('Bu bilgi neden görünmüyor?', 'Hangi rol görebilir?', 'KVKK sınırı ne?', 'Bu ekranı detaylı anlat', 'İlgili yere götür');
    } else if (pathHas(screenPath, ['/shared/notifications'])) {
      chips.push('Okunmamış bildirim var mı?', 'Bu bildirim hangi olaydan geldi?', 'İlgili kayda gitmeli miyim?', 'Bu ekranı detaylı anlat', 'İlgili yere götür');
    } else if (pathHas(screenPath, ['/room/commercial-flow'])) {
      chips.push('Bu ekranı detaylı anlat', 'İlk neye bakayım?', 'Hakediş neden hazır değil?', 'Sonra ne yapayım?', 'İlgili yere götür');
    } else 
    if (pathHas(screenPath, ['/georeview'])) {
      chips.push('Konum İncele ekranı ne için var?', 'Geo Review gerekli ne demek?', 'OSRM nedir?', 'Matrix nedir?', 'Sonra nereye geçeyim?');
  } else if (pathHas(screenPath, ['/commercial-flow', '/service-evaluation', '/shifts'])) {
    chips.push('Bu ekranı detaylı anlat', 'Bu satırı nasıl inceleyeyim?', 'Bu sütun ne demek?', 'Bu rozet ne demek?', 'Bu neden kapalı?', 'Atamaya hazır mı?', 'En risksiz sonraki adım ne?');
  } else if (pathHas(screenPath, ['/offers'])) {
    chips.push('Bu ekranı detaylı anlat', 'Teklifi nasıl incelerim?', 'Neden kapalı?', 'İlgili yere götür');
  } else if (pathHas(screenPath, ['/agreements'])) {
    chips.push('Sözleşme burada ne işe yarıyor?', 'Şimdi ne yapacağım?', 'Neden kapalı?', 'Sonra nereye geçeyim?', 'İlgili yere götür');
  } else if (pathHas(screenPath, ['/operation-verification'])) {
    chips.push('Bu ekranı detaylı anlat', 'Önce neyi kontrol edeyim?', 'Bu neden kapalı?', 'İlgili yere götür');
  } else if (pathHas(screenPath, ['/acceptance', '/trust-quality', '/observability'])) {
    chips.push('Bu ekranı detaylı anlat', 'Önce neyi kontrol edeyim?', 'Bu ne demek?', 'Şimdi ne yapayım?', 'İlgili yere götür');
  } else if (pathHas(screenPath, ['/hub'])) {
    chips.push('Bu ekranı detaylı anlat', 'Hub ne demek?', 'Inbound ne demek?', 'Outbound ne demek?', 'İlgili yere götür');
  } else if (pathHas(screenPath, ['/school/parents'])) {
    chips.push('Bu ekranı detaylı anlat', 'Kod ve PIN ne işe yarar?', 'İlgili yere götür');
  } else if (pathHas(screenPath, ['/notifications'])) {
    chips.push('Okunmamış bildirim var mı?', 'Bu bildirim hangi olaydan geldi?', 'İlgili kayda gitmeli miyim?', 'İlgili yere götür');
  } else if (pathHas(screenPath, ['/logs'])) {
    chips.push('Bu ekranı detaylı anlat', 'İşlem kaydı ne demek?', 'Bildirimle farkı ne?', 'İlgili yere götür');
  } else if (pathHas(screenPath, ['/checkin'])) {
    chips.push('Bu ekranı detaylı anlat', 'Check-in ne demek?', 'Şimdi ne yapacağım?', 'İlgili yere götür');
  } else if (pathHas(screenPath, ['/vehicles', '/map'])) {
    chips.push('Konum neden görünmüyor?', "Bu araçta sürücünün telefon GPS'i mi cihaz GPS'i mi var?", 'Şimdi ne yapacağım?', 'İlgili yere götür');
  } else if (pathHas(screenPath, ['/today', '/live'])) {
    chips.push('Bu ekranı detaylı anlat', 'Şimdi ne yapayım?', 'Bu ne demek?', 'En risksiz sonraki adım ne?', 'İlgili yere götür');
  } else {
    chips.push('Bu ekranı detaylı anlat', 'İlk neye bakayım?', 'Burada eksik ne olabilir?', 'Hangi ekrana geçmeliyim?', 'Bu rolde ne yapabilirim?');
  }

  if (roleMode === 'SIMPLE') {
    return Array.from(new Set(simpleScreenChipsByPath(screenPath))).slice(0, 4);
  }

  return Array.from(new Set(chips.concat(['Bu rolde ne yapabilirim?']))).slice(0, 6);
}

export function buildSuggestedChips({ entityType = 'screen', questionType = 'OPEN', roleMode = 'OPERATIONS', screenPath = '', context = null }) {
  const base = [];
  if (String(entityType) === 'vehicle') {
    base.push('Bu araçta ne eksik?', 'Konum neden görünmüyor?', "Bu araçta sürücünün telefon GPS'i mi cihaz GPS'i mi var?", 'Önce neyi kontrol edeyim?', 'Kontrol listesi ver');
  } else if (String(entityType) === 'shift') {
    const hasSelection = Boolean(context?.selectedLabel || context?.selectedSummary || context?.selectedEntityId || context?.selectedEntityType || context?.id);
    base.push(
      hasSelection ? 'Bu kayıt ne durumda?' : 'Bu ekranı detaylı anlat',
      'Atamaya hazır mı?',
      'Önce neyi kontrol edeyim?',
      'Kontrol listesi ver',
      hasSelection ? 'Neden ilerlemiyor?' : 'Burada eksik ne olabilir?',
      'En risksiz sonraki adım ne?',
      'Hangi ekrana geçeyim?',
      'Bu kayıt için en doğru ekran hangisi?',
    );
    if (Number(context?.openOfferCount || 0) > 0) base.unshift('Teklif tarafında ne eksik?');
  } else {
    return screenChipsByPath(screenPath, roleMode);
  }

  if (roleMode === 'SIMPLE') {
    return Array.from(new Set(base.concat(['Bu rolde ne yapabilirim?']))).slice(0, 4);
  }

  if (questionType !== 'ROLE_HELP') base.push('Bu rolde ne yapabilirim?');
  return Array.from(new Set(base)).slice(0, 6);
}
