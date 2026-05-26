import { filterWorkflowGenericChips, workflowTopicChipSet } from './answerQualityPolicy.js';

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

function hasSeferScoreSignal(text) {
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

function hasBoardingChangeRequestEntrySignal(text) {
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

function pathHas(path, parts) {
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
  { type: 'ROLE_HELP', score: 12, patterns: ['bu rolde', 'ne yapabilirim', 'rolümde', 'rolumde', 'yetkim ne', 'rol yardımı', 'rol yardimi', 'bu kullanıcı ne yapabilir', 'hangi yetkiler', 'yetki sınırı', 'rol bazlı', 'kim neyi görebilir', 'kim neyi görür', 'kim yapabilir', 'kim onaylayacak', 'sorumlu kim', 'bu kayıt kimde', 'bu işi kim yapabilir', 'bunu kim yapabilir'], label: 'role-help' },
  { type: 'CHECKLIST_HELP', score: 10, patterns: ['kontrol listesi', 'checklist', 'tek tek kontrol', 'kontrol etmem gerekenler'], label: 'checklist' },
  { type: 'COMMON_MISTAKE_HELP', score: 9, patterns: ['sık hata', 'en sık hata', 'sik hata', 'yaygın hata', 'yaygin hata', 'en çok hata'], label: 'common-mistake' },
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
  { type: 'MARKETPLACE_FREE_TO_OPERATE_PREVIEW', score: 14, patterns: ['lisans ücreti', 'lisans ucreti', 'başarı payı', 'basari payi', 'mevcut sözleşmeden pay', 'mevcut sozlesmeden pay', 'free-to-operate', 'platform fee', 'seferpakt kaynaklı', 'seferpakt kaynakli', 'pay alacak mı', 'pay alacak mi', 'pay alınır mı', 'pay alinır mi', 'pay alınır mı', 'pay alinır mı', 'pay doğmaz', 'pay dogmaz', '0 tl lisans', 'mevcut sözleşmeden pay alınır mı', 'mevcut sozlesmeden pay alinir mi'], label: 'marketplace-free-to-operate-preview' },
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

const COP02A_GENERAL_RULES = [
  { type: 'ROLE_HELP', score: 6, patterns: ['bu kullanıcı ne yapabilir', 'hangi yetkiler', 'yetki sınırı', 'rol bazlı', 'kim neyi görebilir', 'kim neyi görür', 'bu kullanıcı bu bilgiyi göremez', 'bu rolde ne yapabilirim', 'bu rolde burada neyi yönetebilirim', 'kim yapabilir', 'kim onaylayacak', 'sorumlu kim', 'bu kayıt kimde'], label: 'cop02a-role-help' },
  { type: 'SCREEN_PURPOSE', score: 5, patterns: ['bu ekranda ne yapmalıyım', 'burada ne yapmalıyım', 'bu ekranın amacı ne', 'bu ekran ne işe yarar', 'bu ekran ne için kullanılır', 'bura ne', 'burası ne', 'bu ne', 'ne bu', 'burda ne var', 'burası ne işe yarıyor', 'saha kabul', 'checklist'], label: 'cop02a-screen-purpose' },
  { type: 'NEXT_STEP', score: 6, patterns: ['sıradaki doğru işlem ne', 'sıradaki doğru adım ne', 'ilk bakılacak yer', 'ilk kontrolü ne', 'önce ne yapayım', 'ne yapayım', 'şimdi ne', 'hangi ekrana gitmeliyim', 'mobilde bu iş nereden yapılır', 'şimdi hangi ekrana gitmeliyim', 'sonra ne yapayım'], label: 'cop02a-next-step' },
  { type: 'WHY_BLOCKED', score: 6, patterns: ['bu kayıt neden ilerlemiyor', 'neden ilerlemiyor', 'göremiyor olabilir miyim', 'kvkk yüzünden', 'bu kayıt neden kapalı', 'bu kullanıcı bu bilgiyi göremiyor', 'hazır değil', 'hazir degil', 'eksik bilgi', 'başlayamıyor', 'baslayamiyor', 'başlamıyor', 'baslamiyor'], label: 'cop02a-why-blocked' },
  { type: 'SCREEN_PURPOSE', score: 13, patterns: ['sözleşme ile vardiya ilişkisi ne', 'sozlesme ile vardiya iliskisi ne'], label: 'cop02a-contract-shift-purpose' },
  { type: 'TERM_HELP', score: 5, patterns: ['sözleşme ile vardiya ilişkisi ne', 'kalite puanı kesin karar mı', 'hakediş tarafında ne kontrol etmeliyim', 'bu ekran neyi anlatıyor', 'sağlayıcı neden daha iyi', 'bildirim hangi olaydan', 'bu kayıt kimde'], label: 'cop02a-term-help' },
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

function normalizeIntentArgs(entityTypeOrOptions = 'screen', screenPath = '') {
  if (entityTypeOrOptions && typeof entityTypeOrOptions === 'object' && !Array.isArray(entityTypeOrOptions)) {
    return {
      entityType: String(entityTypeOrOptions.entityType || 'screen'),
      screenPath: String(entityTypeOrOptions.screenPath || ''),
      roleMode: String(entityTypeOrOptions.roleMode || 'OPERATIONS'),
      conversationState: entityTypeOrOptions.conversationState || null,
      originalMessage: String(entityTypeOrOptions.originalMessage || ''),
    };
  }
  return { entityType: String(entityTypeOrOptions || 'screen'), screenPath: String(screenPath || ''), roleMode: 'OPERATIONS', conversationState: null, originalMessage: '' };
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
  if (String(questionType || '') === 'BOARDING_CHANGE_APPLICATION' || hasAny(text, ['kabul edilen değişikliği uygula', 'kabul edilen degisikligi uygula', 'günlük atamaya işle', 'gunluk atamaya işle', 'günlük atamaya işlenebilir', 'sürücü rotası yenilenmez', 'surucu rotasi yenilenmez', 'kalıcı atama değişmez', 'kalici atama degismez', 'sürücü rota ekranında görünür', 'surucu rota ekraninda gorunur', 'rota güncellemesi bekliyor', 'rota guncellemesi bekliyor', 'günlük değişiklik rotada görünüyor', 'gunluk degisiklik rotada gorunuyor', 'sürücüye gönderildi mi', 'surucuye gonderildi mi', 'driver route refresh', 'mobile route update', 'rotasına yansıdı mı', 'rotasina yansidi mi', 'stopassignment'])) return 'ASSIGNMENT_READINESS_GUIDE';
  if (String(questionType || '') === 'BOARDING_CHANGE_REQUEST_ENTRY' || hasBoardingChangeRequestEntrySignal(text)) {
    return String(entityType || '').toLowerCase() === 'shift' ? 'ASSIGNMENT_READINESS_GUIDE' : 'SCREEN_MENU_GUIDE';
  }
  if (String(questionType || '') === 'BOARDING_ROUTE_IMPACT_PREVIEW' || hasAny(text, ['rota etkisi', 'rota etkisini', 'önizle', 'onizle', 'önizleme', 'onizleme', 'bugün binmezse', 'bugun binmezse', 'farklı duraktan', 'farkli duraktan', 'geçici durak', 'gecici durak', 'biniş değişikliği', 'binis degisikligi', 'km farkı', 'km farki', 'süre artar mı', 'sure artar mi', 'kapasite etkisi'])) return 'ASSIGNMENT_READINESS_GUIDE';
  if (String(questionType || '') === 'DYNAMIC_SAVINGS_PREVIEW' || hasAny(text, ['tasarruf', 'tasarruf önizlemesi', 'tasarruf onizlemesi', 'km tasarrufu', 'süre tasarrufu', 'sure tasarrufu', 'yaklaşık maliyet', 'yaklasik maliyet', 'maliyet etkisi', 'readonly tasarruf', 'dinamik tasarruf'])) return 'ASSIGNMENT_READINESS_GUIDE';
  if (pathHas(screenPath, ['/agreements', '/company/agreements', '/room/agreements', '/school/agreements', '/organization/agreements', '/commercial-flow', '/commercial-core']) && (String(questionType || '') === 'MARKETPLACE_FREE_TO_OPERATE_PREVIEW' || hasAny(text, ['lisans ücreti', 'lisans ucreti', 'başarı payı', 'basari payi', 'mevcut sözleşmeden pay', 'mevcut sozlesmeden pay', 'free-to-operate', 'platform fee', 'seferpakt kaynaklı', 'seferpakt kaynakli', 'pay alacak mı', 'pay alacak mi', 'pay alınır mı', 'pay alinır mi', 'pay doğmaz', 'pay dogmaz']))) return 'SCREEN_MENU_GUIDE';
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

function simpleScreenChipsByPath(screenPath = '', questionType = 'OPEN') {
  const workflowQuestionTypes = new Set(['WHY_BLOCKED', 'READINESS_CHECK', 'SHIFT_BLOCKED', 'PAYMENT_READINESS', 'PAYMENT_MISSING', 'CONTRACT_TO_SHIFT', 'CONTRACT_SHIFT_TODAY', 'QUALITY_SIGNAL', 'SEFER_SCORE_PREVIEW', 'MARKETPLACE_FREE_TO_OPERATE_PREVIEW', 'FEEDBACK_STATUS', 'NOTIFICATION_SOURCE', 'KVKK_VISIBILITY', 'DRIVER_PHONE_GPS', 'BOARDING_CHANGE_REQUEST_ENTRY', 'BOARDING_CHANGE_APPLICATION', 'BOARDING_ROUTE_IMPACT_PREVIEW', 'DYNAMIC_SAVINGS_PREVIEW', 'WHO_CAN_DO', 'NEXT_STEP', 'NEXT_SCREEN', 'SAFE_NEXT_STEP', 'MISSING_DATA', 'STATUS_HELP', 'FIRST_CONTROL', 'LOCATION_HELP']);
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
    return ['Riskli cihazı göster', 'Stale/offline satırını aç', 'Açık sorunları sırala', 'Aktif sürücüleri kontrol et'];
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
      return ['Lisans ücreti var mı?', 'Bu sözleşmeden SeferPakt pay alacak mı?', 'Başarı payı neden 0 görünüyor?', 'Bu sözleşme SeferPakt kaynaklı mı?'];
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
  const workflowQuestionTypes = new Set(['WHY_BLOCKED', 'READINESS_CHECK', 'SHIFT_BLOCKED', 'PAYMENT_READINESS', 'PAYMENT_MISSING', 'CONTRACT_TO_SHIFT', 'CONTRACT_SHIFT_TODAY', 'QUALITY_SIGNAL', 'SEFER_SCORE_PREVIEW', 'MARKETPLACE_FREE_TO_OPERATE_PREVIEW', 'FEEDBACK_STATUS', 'NOTIFICATION_SOURCE', 'KVKK_VISIBILITY', 'DRIVER_PHONE_GPS', 'BOARDING_CHANGE_REQUEST_ENTRY', 'BOARDING_CHANGE_APPLICATION', 'BOARDING_ROUTE_IMPACT_PREVIEW', 'DYNAMIC_SAVINGS_PREVIEW', 'WHO_CAN_DO', 'NEXT_STEP', 'NEXT_SCREEN', 'SAFE_NEXT_STEP', 'MISSING_DATA', 'STATUS_HELP', 'FIRST_CONTROL', 'LOCATION_HELP']);
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
    chips.push('Riskli cihazı göster', 'Stale/offline satırını aç', 'Açık sorunları sırala', 'Aktif sürücüleri kontrol et');
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
      chips.push('Lisans ücreti var mı?', 'Bu sözleşmeden SeferPakt pay alacak mı?', 'Başarı payı neden 0 görünüyor?', 'Bu sözleşme SeferPakt kaynaklı mı?');
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

export function buildSuggestedChips({ entityType = 'screen', questionType = 'OPEN', roleMode = 'OPERATIONS', screenPath = '', context = null }) {
  const base = [];
  const workflowQuestionTypes = new Set(['WHY_BLOCKED', 'READINESS_CHECK', 'SHIFT_BLOCKED', 'PAYMENT_READINESS', 'PAYMENT_MISSING', 'CONTRACT_TO_SHIFT', 'CONTRACT_SHIFT_TODAY', 'QUALITY_SIGNAL', 'SEFER_SCORE_PREVIEW', 'MARKETPLACE_FREE_TO_OPERATE_PREVIEW', 'FEEDBACK_STATUS', 'NOTIFICATION_SOURCE', 'KVKK_VISIBILITY', 'DRIVER_PHONE_GPS', 'BOARDING_CHANGE_REQUEST_ENTRY', 'BOARDING_CHANGE_APPLICATION', 'BOARDING_ROUTE_IMPACT_PREVIEW', 'DYNAMIC_SAVINGS_PREVIEW', 'WHO_CAN_DO', 'NEXT_STEP', 'NEXT_SCREEN', 'SAFE_NEXT_STEP', 'MISSING_DATA', 'STATUS_HELP', 'FIRST_CONTROL', 'LOCATION_HELP']);
  const workflowQuestion = workflowQuestionTypes.has(String(questionType || ''));
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
