import {
  detectCopilotEBlockRuntimeAnswerTopic,
  getCopilotEBlockRuntimeAnswerActionSpec,
  getCopilotEBlockRuntimeAnswerChips,
  getCopilotEBlockRuntimeAnswerTopicMeta,
  listCopilotEBlockRuntimeAnswerTopics,
} from './copilotEBlockRuntimeAnswerIntegration.js';
import { buildDynamicQuestionChips } from './conversationTaskStateResponses.js';
import {
  firstNonEmpty,
  makeAskAction,
  makeCopyAction,
  makeGuideAction,
  mergeQuickActions,
  uniqueStrings,
} from './replyShapes.js';

export const COPILOT_GUIDED_TASK_ENGINE_VERSION = 'COPILOT-GUIDED-TASK-ENGINE-01';

export const COPILOT_GUIDED_TASK_ENGINE_PROGRESS_COMMANDS = Object.freeze([
  'CONTINUE',
  'RESTART',
  'BACK',
  'CLARIFY',
  'STOP',
]);

export const COPILOT_GUIDED_TASK_ENGINE_GUARD_REQUIREMENTS = Object.freeze([
  'explicit human approval',
  'role / screen / family match',
  'task-family specific clarification',
  'no silent execution',
  'no hidden background action',
  'no tool execution',
  'no write-action dispatcher',
  'no DB write',
  'no OSRM/geocode call',
  'no route apply',
  'no fake success',
]);

export const COPILOT_GUIDED_TASK_ENGINE_PUBLIC_PROMISE = Object.freeze([
  'Sefer Abi hazırlar, açıklar ve güvenli yön gösterir.',
  'Gerçek execute, tool call ve write-action vaadi yoktur.',
  'Belirsizlik varsa kısa netleştirme sorusu sorar.',
  'Kritik işlerde insan onayı korunur.',
  'Underpromise / overdeliver çizgisi korunur.',
]);

export const COPILOT_GUIDED_TASK_ENGINE_BLOCKED_ACTIONS = Object.freeze([
  'runtime AI action',
  'tool execution',
  'write-action dispatcher',
  'DB write',
  'OSRM call',
  'geocode execute',
  'route apply',
  'dispatch apply',
  'fake success',
]);

export const COPILOT_GUIDED_TASK_ENGINE_NEVER_AUTOMATE = Object.freeze([
  'otomatik rota oluşturma',
  'otomatik geocode',
  'otomatik import',
  'otomatik write',
  'sahte başarı',
  'gerçek yapmadan yaptım deme',
]);

function normalizeText(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('tr-TR')
    .replace(/[ıİ]/g, 'i')
    .replace(/[çÇ]/g, 'c')
    .replace(/[ğĞ]/g, 'g')
    .replace(/[öÖ]/g, 'o')
    .replace(/[şŞ]/g, 's')
    .replace(/[üÜ]/g, 'u')
    .replace(/['’`´]/g, '')
    .replace(/[^a-z0-9\s/]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function compactText(value) {
  return normalizeText(value).replace(/\s+/g, '');
}

function tokenize(value) {
  return normalizeText(value)
    .split(' ')
    .map((token) => String(token || '').trim())
    .filter(Boolean);
}

function pathHas(path, parts) {
  const value = normalizeText(path);
  return (Array.isArray(parts) ? parts : []).some((part) => {
    const needle = normalizeText(part);
    if (!needle) return false;
    if (needle.startsWith('/')) {
      return value === needle || value.endsWith(needle) || value.includes(`${needle}/`);
    }
    return value.includes(needle);
  });
}

function levenshtein(a, b) {
  const left = String(a || '');
  const right = String(b || '');
  if (!left.length) return right.length;
  if (!right.length) return left.length;
  const prev = Array.from({ length: right.length + 1 }, (_, i) => i);
  let current = new Array(right.length + 1).fill(0);
  for (let i = 1; i <= left.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      current[j] = Math.min(
        prev[j] + 1,
        current[j - 1] + 1,
        prev[j - 1] + cost,
      );
    }
    for (let j = 0; j <= right.length; j += 1) {
      prev[j] = current[j];
    }
  }
  return Number(prev[right.length] || 0);
}

function tokenMatches(leftToken, rightToken) {
  const left = normalizeText(leftToken);
  const right = normalizeText(rightToken);
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.length <= 3 || right.length <= 3) return false;
  if (left.startsWith(right) || right.startsWith(left)) {
    return Math.abs(left.length - right.length) <= 2;
  }
  const maxDistance = Math.min(left.length, right.length) <= 5 ? 1 : 2;
  return levenshtein(left, right) <= maxDistance;
}

function textHasToken(textTokens, term) {
  const needle = normalizeText(term);
  if (!needle) return false;
  if (needle.includes(' ')) {
    const compact = compactText(needle);
    return compact && compactText(textTokens.join(' ')).includes(compact);
  }
  return textTokens.some((token) => tokenMatches(token, needle));
}

function matchesAnyTokenGroup(textTokens, groups = []) {
  return (Array.isArray(groups) ? groups : []).reduce((score, group) => {
    const tokens = Array.isArray(group?.tokens) ? group.tokens : [];
    const hit = tokens.some((token) => textHasToken(textTokens, token));
    return hit ? score + Number(group?.weight || 1) : score;
  }, 0);
}

function matchesAnyPhrase(text, phrases = []) {
  const value = normalizeText(text);
  const compact = compactText(text);
  return (Array.isArray(phrases) ? phrases : []).reduce((score, phrase) => {
    const needle = normalizeText(phrase);
    if (!needle) return score;
    if (value.includes(needle) || compact.includes(compactText(needle))) {
      return score + 2;
    }
    return score;
  }, 0);
}

function screenHintScore(screenPath, hints = []) {
  const value = normalizeText(screenPath);
  return (Array.isArray(hints) ? hints : []).reduce((score, hint) => {
    const needle = normalizeText(hint);
    if (!needle) return score;
    return value.includes(needle) ? score + 1 : score;
  }, 0);
}

function roleHintScore(userRole, roleHints = []) {
  const value = normalizeText(userRole);
  return (Array.isArray(roleHints) ? roleHints : []).reduce((score, hint) => {
    const needle = normalizeText(hint);
    if (!needle) return score;
    return value.includes(needle) ? score + 1 : score;
  }, 0);
}

function hasGuidedTaskActionSignal(text) {
  const value = normalizeText(text);
  if (!value) return false;
  return /(\bistiyorum\b|\byapmak istiyorum\b|\boluşturmak istiyorum\b|\bolusturmak istiyorum\b|\baçmak istiyorum\b|\bacmak istiyorum\b|\bbaşlatmak istiyorum\b|\bbaslatmak istiyorum\b|\bplanlamak istiyorum\b|\bkurmak istiyorum\b|\bçevir\b|\bcevir\b|\bata\b|\buygula\b|\bgöster\b|\bgoster\b|\bincele\b|\bkontrol et\b|\bhazırla\b|\bhazirla\b|\bdevam et\b|\bsıradaki doğru işlem\b|\bsiradaki dogru islem\b|\bnereden başlayacağım\b|\bnereden baslayacagim\b|\bne yapmalıyım\b|\bne yapmaliyim\b|\bne yapacağım\b|\bne yapacagim\b|\bnasıl yaparım\b|\bnasil yaparim\b|\btek tek anlat\b|\bmadde madde\b|\badım adım\b|\badim adim\b)/.test(value);
}

function hasGuidedTaskDiagnosticSignal(text) {
  const value = normalizeText(text);
  if (!value) return false;
  return /(ne\s+işe\s+yarar|ne\s+işe\s+yariyor|ne\s+demek|neden|niye|güvenli\s+mi|guvenli\s+mi|hazır\s+mi|hazir\s+mi|kimde|nerede|ne\s+durumda|sayılır\s+mi|sayilir\s+mi|tek\s+başına|tek\s+basina|kaliteli\s+mi|kalite|quality|puan|sıralama|siralam|etkiliyor|etkisi|başlatılabilir|baslatilabilir|başlatılabilir\s+mi|baslatilabilir\s+mi|eksik|eksikleri|üretildi\s+mi|uretildi\s+mi|oluştu\s+mu|olustu\s+mu|oluşturuldu\s+mu|olusturuldu\s+mu|vardiya\s+üretildi\s+mi|vardiya\s+uretildi\s+mi|riskli|sorun|başlayamıyor|baslayamiyor|başlamıyor|baslamiyor|görünmüyor|gorunmuyor|devrede)/.test(value);
}

function hasGuidedTaskReviewSignal(text) {
  const value = normalizeText(text);
  if (!value) return false;
  return /(route review|rota review|insan\s+onayı|insan\s+onayi|approval|onay\s+gerekli|gözden\s+geçir|gozden\s+gecir|inceleme)/.test(value);
}

function freezeFamily(definition) {
  return Object.freeze({
    familyId: String(definition.familyId || ''),
    label: String(definition.label || ''),
    questionType: String(definition.questionType || 'NEXT_STEP'),
    guideLevel: String(definition.guideLevel || 'STEP_BY_STEP'),
    jobType: String(definition.jobType || 'ROLE_HELP_GUIDE'),
    replyMode: String(definition.replyMode || 'GUIDED'),
    replyStyle: String(definition.replyStyle || 'GUIDED'),
    clarificationQuestion: String(definition.clarificationQuestion || ''),
    guideLabel: String(definition.guideLabel || definition.label || ''),
    why: String(definition.why || ''),
    advice: String(definition.advice || ''),
    summary: String(definition.summary || ''),
    jobPurpose: String(definition.jobPurpose || ''),
    blockedActions: Object.freeze(Array.isArray(definition.blockedActions) ? [...definition.blockedActions] : []),
    neverAutomate: Object.freeze(Array.isArray(definition.neverAutomate) ? [...definition.neverAutomate] : []),
    chips: Object.freeze(Array.isArray(definition.chips) ? [...definition.chips] : []),
    stepByStep: Object.freeze(Array.isArray(definition.stepByStep) ? [...definition.stepByStep] : []),
    quickActions: Object.freeze(Array.isArray(definition.quickActions) ? [...definition.quickActions] : []),
    copyOutputs: Object.freeze(Array.isArray(definition.copyOutputs) ? [...definition.copyOutputs] : []),
    screenHints: Object.freeze(Array.isArray(definition.screenHints) ? [...definition.screenHints] : []),
    roleHints: Object.freeze(Array.isArray(definition.roleHints) ? [...definition.roleHints] : []),
    tokenGroups: Object.freeze(Array.isArray(definition.tokenGroups) ? definition.tokenGroups.map((group) => Object.freeze({
      tokens: Object.freeze(Array.isArray(group?.tokens) ? [...group.tokens] : []),
      weight: Number(group?.weight || 1),
    })) : []),
    phrases: Object.freeze(Array.isArray(definition.phrases) ? [...definition.phrases] : []),
    progressChips: Object.freeze(Array.isArray(definition.progressChips) ? [...definition.progressChips] : []),
    progressSteps: Object.freeze(Array.isArray(definition.progressSteps) ? [...definition.progressSteps] : []),
    riskNote: String(definition.riskNote || ''),
    safeBoundary: String(definition.safeBoundary || ''),
  });
}

const ROUTE_E_BLOCK_TOPICS = new Set(listCopilotEBlockRuntimeAnswerTopics());
const TOPIC_META_BY_FAMILY = new Map();

const FAMILY_DEFINITIONS = [
  freezeFamily({
    familyId: 'ROUTE_PREP_EXCEL',
    label: 'Excel / rota hazırlığı',
    questionType: 'EXCEL_ROUTE_PREVIEW',
    guideLevel: 'STEP_BY_STEP',
    jobType: 'ASSIGNMENT_READINESS_GUIDE',
    replyMode: 'BLOCKED',
    guideLabel: 'Excel→rota hazırlık rehberini aç',
    why: 'Excel/import, adres readiness ve rota taslağını birlikte okudum; gerçek rota oluşturma başlatmam.',
    advice: 'Excel satırlarını, eksik adresleri, koordinat readiness ve insan onayını sırayla kontrol et.',
    summary: 'Excel dosyasıyla rota hazırlığı için güvenli okuma katmanı.',
    jobPurpose: 'Excel / rota hazırlığını güvenli ve açıklayıcı biçimde okumak için kullanılır.',
    clarificationQuestion: 'Rota hazırlığı mı yapmak istiyorsun, yoksa mevcut rotayı görüntülemek mi?',
    blockedActions: [
      'runtime AI action',
      'tool execution',
      'write-action dispatcher',
      'Excel/CSV import execute',
      'DB write',
      'route apply',
    ],
    neverAutomate: [
      'otomatik Excel import',
      'otomatik rota oluşturma',
      'otomatik route apply',
    ],
    chips: [
      'Excel satırlarını önizle',
      'Adres readiness kontrolü',
      'Rota taslağını göster',
      'İnsan onayını açıkla',
    ],
    stepByStep: [
      'Önce Excel satırlarını kontrol et.',
      'Eksik adresleri ve tip hatalarını ayır.',
      'Koordinat readiness ve insan onayı notlarını sırala.',
      'Gerçek rota yerine sadece hazırlığı oku.',
    ],
    quickActions: [
      { label: 'Excel satırlarını önizle', routeKey: '/company/agreements', reason: 'İlk güvenli kontrol Excel satırlarıdır.' },
      makeAskAction('Rota hazırlığı mı?', 'Rota hazırlığı mı yapmak istiyorsun, yoksa mevcut rotayı görüntülemek mi?', 'İstediğin akışı netleştirir.'),
      makeGuideAction('Hazırlık rehberi', { jobType: 'ASSIGNMENT_READINESS_GUIDE' }, 'Hazırlık akışını açar.'),
    ],
    copyOutputs: [
      'Excel satırları doğrulanmadan rota hazırlığı tamam sayılmaz.',
    ],
    screenHints: ['/company/agreements', '/company/map', '/room/agreements', '/superadmin/commercial-core'],
    roleHints: ['ROOM', 'COMPANY', 'SUPER_ADMIN'],
    tokenGroups: [
      { tokens: ['excel', 'exel', 'csv', 'tablo', 'liste', 'dosya'], weight: 3 },
      { tokens: ['guzergah', 'servis', 'durak', 'plan'], weight: 3 },
      { tokens: ['yap', 'kur', 'cikar', 'cevir', 'oner'], weight: 2 },
    ],
    phrases: [
      'excel attim rota cikar',
      'excelden servis plani yap',
      'exceldeki listeyle guzergah yap',
      'servis planini excelden kur',
      'bu tabloyu servise cevir',
      'adres listesinden durak oner',
      'bu kisiler icin sabah aksam rota hazirla',
      'personel adreslerinden rota yap',
      'personel adreslerinden guzergah yap',
      'servis planini excelden kur',
      'exel dosyasindan rota cikar',
    ],
    progressChips: ['Devam et', 'Bulamadım', 'Baştan al'],
    progressSteps: ['Excel satırlarını oku.', 'Adresleri ve eksikleri ayır.', 'İnsan onayı checklistini hazırla.'],
    riskNote: 'Otomatik rota oluşturma ve yazma kapalı kalır.',
    safeBoundary: 'Sadece hazırlık, açıklama ve insan onayı konuşulur.',
  }),
  freezeFamily({
    familyId: 'ROUTE_PREP_ADDRESS',
    label: 'Adres / koordinat hazırlığı',
    questionType: 'ADDRESS_GEOCODE_PREVIEW',
    guideLevel: 'WHY',
    jobType: 'ASSIGNMENT_READINESS_GUIDE',
    replyMode: 'BLOCKED',
    guideLabel: 'Adres / koordinat rehberini aç',
    why: 'Adres readiness, koordinat güveni ve KVKK sınırını birlikte okudum; gerçek geocode yazımı başlatmam.',
    advice: 'İl, ilçe, mahalle, sokak ve KVKK sınırını birlikte kontrol et; belirsizse insan incelemesi iste.',
    summary: 'Adresleri koordinata çevirmeden önce güvenli okuma katmanı.',
    jobPurpose: 'Adres / koordinat hazırlığını güvenli ve açıklayıcı biçimde okumak için kullanılır.',
    clarificationQuestion: 'Adresleri koordinata çevirmek mi istiyorsun, yoksa mevcut konumları görüntülemek mi?',
    blockedActions: [
      'runtime AI action',
      'tool execution',
      'write-action dispatcher',
      'geocode execute',
      'lat/lng write',
      'route apply',
    ],
    neverAutomate: [
      'otomatik geocode',
      'otomatik koordinat yazma',
      'otomatik lat/lng commit',
    ],
    chips: [
      'Adres readiness kontrolü',
      'Koordinat önizlemesini sor',
      'Eksik il/ilçeyi göster',
      'KVKK sınırını açıkla',
    ],
    stepByStep: [
      'Önce adres alanlarını ayır.',
      'İl, ilçe, mahalle ve sokak bilgisini kontrol et.',
      'Düşük güvenli kayıtları işaretle.',
      'Koordinat yazmak yerine insan incelemesi hazırla.',
    ],
    quickActions: [
      makeAskAction('Konum mu?', 'Adresleri koordinata çevirir misin?', 'Koordinat hazırlığını sorar.'),
      makeGuideAction('Adres readiness', { jobType: 'ASSIGNMENT_READINESS_GUIDE' }, 'Hazırlık akışını açar.'),
      makeCopyAction('KVKK sınırını kopyala', 'Adres / koordinat işlemlerinde KVKK sınırı korunur.', 'Güvenli sınır notunu kopyalar.'),
    ],
    copyOutputs: ['Koordinat yazımı değil, koordinat hazırlığı konuşulur.'],
    screenHints: ['/room/map', '/driver/map', '/company/map', '/georeview'],
    roleHints: ['ROOM', 'COMPANY', 'SUPER_ADMIN', 'DRIVER'],
    tokenGroups: [
      { tokens: ['adres', 'konum', 'lokasyon'], weight: 3 },
      { tokens: ['koordinat', 'kordinat', 'noktala', 'isaretle'], weight: 3 },
      { tokens: ['bul', 'cevir', 'iste', 'gir', 'isle', 'cikar'], weight: 2 },
    ],
    phrases: [
      'adresleri haritada noktal',
      'adresleri haritaya dok',
      'kordinata cevir',
      'koordinatlari sisteme isle',
    ],
    progressChips: ['Devam et', 'Bulamadım', 'Baştan al'],
    progressSteps: ['Adres alanlarını kontrol et.', 'Güven seviyesi düşük kayıtları ayır.', 'İnsan incelemesine bırak.'],
    riskNote: 'Gerçek geocode ve lat/lng yazımı kapalı kalır.',
    safeBoundary: 'Sadece hazırlık, açıklama ve insan incelemesi konuşulur.',
  }),
  freezeFamily({
    familyId: 'ROUTE_PREP_OSRM',
    label: 'OSRM / rota önizleme',
    questionType: 'OSRM_ROUTE_DRAFT_PREVIEW',
    guideLevel: 'STEP_BY_STEP',
    jobType: 'ASSIGNMENT_READINESS_GUIDE',
    replyMode: 'BLOCKED',
    guideLabel: 'OSRM rota taslağı rehberini aç',
    why: 'OSRM hazırlığını, mesafe / süre önizlemesini ve rota taslağı sınırını birlikte okudum; gerçek OSRM çağrısı yapmam.',
    advice: 'Önce address readiness ve stop / route draft sinyallerini kontrol et; sonra insan onayı gereksinimini açıkça göster.',
    summary: 'Mesafe, süre ve polyline önizlemesi için güvenli okuma katmanı.',
    jobPurpose: 'Rota önizlemesini güvenli ve açıklayıcı biçimde okumak için kullanılır.',
    clarificationQuestion: 'Km/süre hesabı mı yapmak istiyorsun, yoksa mevcut rotayı sadece görüntülemek mi?',
    blockedActions: [
      'runtime AI action',
      'tool execution',
      'write-action dispatcher',
      'OSRM call',
      'route preview generate',
      'route apply',
    ],
    neverAutomate: [
      'otomatik OSRM call',
      'otomatik rota taslağı üretme',
      'otomatik route preview',
    ],
    chips: [
      'OSRM readiness kontrolü',
      'Mesafe / süre önizlemesi',
      'Route draft neden kapalı?',
      'İnsan onayını açıkla',
    ],
    stepByStep: [
      'Önce adres readiness ve durak listesini kontrol et.',
      'Km ve süre önizlemesini güvenli olarak oku.',
      'Polyline ve route draft ayrımını yap.',
      'Gerçek OSRM çağrısı yerine insan onayı gereksinimini sırala.',
    ],
    quickActions: [
      makeAskAction('Km süre çıkar', 'Km süre çıkar.', 'Güvenli rota önizlemesini sorar.'),
      makeGuideAction('OSRM hazırlığı', { jobType: 'ASSIGNMENT_READINESS_GUIDE' }, 'Hazırlık akışını açar.'),
      makeCopyAction('Yol hesabı notu', 'OSRM önizlemesi gerçek rota uygulaması değildir.', 'Güvenli sınır notunu kopyalar.'),
    ],
    copyOutputs: ['OSRM önizlemesi gerçek uygulama değildir.'],
    screenHints: ['/room/map', '/driver/map', '/company/commercial-flow', '/superadmin/commercial-core'],
    roleHints: ['ROOM', 'COMPANY', 'SUPER_ADMIN', 'DRIVER'],
    tokenGroups: [
      { tokens: ['km', 'sure', 'süre', 'mesafe'], weight: 3 },
      { tokens: ['guzergah', 'polyline', 'osrm'], weight: 3 },
      { tokens: ['hesapla', 'cikar', 'soyle', 'bak', 'calis', 'ciz'], weight: 2 },
    ],
    phrases: [
      'km sure cikar',
      'guzergahi hesapla',
      'rota suresini soyle',
      'yol hesabi yap',
      'polyline ciz',
    ],
    progressChips: ['Devam et', 'Bulamadım', 'Baştan al'],
    progressSteps: ['Km ve süre sinyallerini oku.', 'Durak / rota ayrımını yap.', 'İnsan onayı gereksinimini kontrol et.'],
    riskNote: 'OSRM call ve route apply kapalı kalır.',
    safeBoundary: 'Sadece önizleme ve açıklama konuşulur.',
  }),
  freezeFamily({
    familyId: 'ROUTE_REVIEW_APPROVAL',
    label: 'Rota review / insan onayı',
    questionType: 'ROUTE_REVIEW_HUMAN_APPROVAL',
    guideLevel: 'WHY',
    jobType: 'ASSIGNMENT_READINESS_GUIDE',
    replyMode: 'BLOCKED',
    guideLabel: 'Rota review / insan onayı rehberini aç',
    why: 'Route review, risk özeti ve insan onayı gereksinimini birlikte okudum; gerçek uygulama başlatmam.',
    advice: 'Önce preview, risk özeti, geri alma notu ve açık onay durumunu kontrol et.',
    summary: 'İnsan onayı ve review aşaması için güvenli okuma katmanı.',
    jobPurpose: 'Route review aşamasını ve insan onayını güvenli biçimde okumak için kullanılır.',
    clarificationQuestion: 'Rota uygulamak mı istiyorsun, yoksa insan onayı durumunu mu görmek istiyorsun?',
    blockedActions: [
      'runtime AI action',
      'tool execution',
      'write-action dispatcher',
      'route apply',
      'dispatch apply',
      'agreement/contract execute',
    ],
    neverAutomate: [
      'otomatik route review kararı',
      'otomatik uygulama onayı',
      'otomatik risk onayı',
    ],
    chips: [
      'İnsan onayını göster',
      'Risk özetini aç',
      'Route review checklisti',
      'Önizleme ile uygulama farkı',
    ],
    stepByStep: [
      'Önizleme ile uygulama farkını ayır.',
      'Risk özeti ve geri alma notunu oku.',
      'Açık onay durumunu kontrol et.',
      'İnsan onayı yoksa uygulama başlatma.',
    ],
    quickActions: [
      makeAskAction('Rota onayı?', 'Bu rota review için insan onayı gerekli mi?', 'Onay durumunu sorar.'),
      makeGuideAction('Review rehberi', { jobType: 'ASSIGNMENT_READINESS_GUIDE' }, 'İnceleme akışını açar.'),
      makeCopyAction('Onay notu', 'İnsan onayı olmadan uygulama yapılmaz.', 'Güvenli sınır notunu kopyalar.'),
    ],
    copyOutputs: ['İnsan onayı olmadan uygulama yapılmaz.'],
    screenHints: ['/room/shifts', '/room/agreements', '/superadmin/operation-verification', '/superadmin/acceptance'],
    roleHints: ['ROOM', 'COMPANY', 'SUPER_ADMIN'],
    tokenGroups: [
      { tokens: ['review', 'onay', 'incele', 'approval'], weight: 3 },
      { tokens: ['uygula', 'devreye', 'aktif', 'risk'], weight: 3 },
    ],
    phrases: [
      'rota review',
      'insan onayi',
      'guncelleme bekliyor',
      'önizleme ile uygulama farki',
    ],
    progressChips: ['Devam et', 'Bulamadım', 'Baştan al'],
    progressSteps: ['Preview ve uygulama farkını oku.', 'Risk özetini kontrol et.', 'İnsan onayı durumunu doğrula.'],
    riskNote: 'Gerçek uygulama, dispatch apply ve approval açılmaz.',
    safeBoundary: 'Sadece inceleme ve onay konuşulur.',
  }),
  freezeFamily({
    familyId: 'ROUTE_APPLY_BLOCKED',
    label: 'Route apply engeli',
    questionType: 'ROUTE_APPLY_BLOCKED',
    guideLevel: 'WHY',
    jobType: 'BUTTON_ACTION_GUIDE',
    replyMode: 'BLOCKED',
    guideLabel: 'Route apply engeli rehberini aç',
    why: 'Route apply isteğini gördüm; gerçek uygulama bu milestone’da kapalı ve yalnızca hazırlık / onay konuşuluyor.',
    advice: 'Önce preview, risk özeti, insan onayı ve geri alma notunu kontrol et; uygulama yapma.',
    summary: 'Rota uygulama sınırı için güvenli okuma katmanı.',
    jobPurpose: 'Route apply sınırını güvenli biçimde okumak için kullanılır.',
    clarificationQuestion: 'Rota hazırlığı mı yapmak istiyorsun, yoksa mevcut rotayı görüntülemek mi?',
    blockedActions: [
      'runtime AI action',
      'tool execution',
      'write-action dispatcher',
      'route apply',
      'dispatch apply',
      'driver/vehicle assignment',
    ],
    neverAutomate: [
      'otomatik route apply',
      'otomatik dispatch apply',
      'otomatik atama',
    ],
    chips: [
      'Route apply neden kapalı?',
      'Günlük atamaya işlenir mi?',
      'Geri alma notu nedir?',
      'İnsan onayını açıkla',
    ],
    stepByStep: [
      'Önce preview ve risk özeti oku.',
      'İnsan onayı durumunu doğrula.',
      'Geri alma notunu kontrol et.',
      'Uygulama yerine hazırlık ve onay konuş.',
    ],
    quickActions: [
      makeAskAction('Uygulama sınırı', 'rotayı uygula', 'Uygulama sınırını sorar.'),
      makeGuideAction('Uygulama rehberi', { jobType: 'BUTTON_ACTION_GUIDE' }, 'Buton / uygulama akışını açar.'),
      makeCopyAction('Uygulama yok', 'Bu milestone’da route apply kapalıdır.', 'Güvenli sınır notunu kopyalar.'),
    ],
    copyOutputs: ['Bu milestone’da route apply kapalıdır.'],
    screenHints: ['/room/shifts', '/company/shifts', '/superadmin/operations'],
    roleHints: ['ROOM', 'COMPANY', 'SUPER_ADMIN'],
    tokenGroups: [
      { tokens: ['uygula', 'devreye', 'olustur', 'oluştur'], weight: 3 },
      { tokens: ['durak', 'sisteme', 'kaydet'], weight: 3 },
      { tokens: ['boşver', 'bosver', 'gercekten', 'yapma', 'yaptim', 'yaptım'], weight: 2 },
    ],
    phrases: [
      'rotayi uygula',
      'rotayi devreye al',
      'bunu sisteme uygula',
      'benim yerime yap',
      'yaptim de gercekten yapma',
    ],
    progressChips: ['Devam et', 'Bulamadım', 'Baştan al'],
    progressSteps: ['Preview ve onayı kontrol et.', 'Geri alma notunu oku.', 'Gerçek uygulama yerine hazırlığı sürdür.'],
    riskNote: 'Route apply ve dispatch apply kapalı kalır.',
    safeBoundary: 'Sadece hazırlık, açıklama ve insan onayı konuşulur.',
  }),
  freezeFamily({
    familyId: 'IMPORT_WRITE_BLOCKED',
    label: 'Yazma / import engeli',
    questionType: 'IMPORT_WRITE_BLOCKED',
    guideLevel: 'WHY',
    jobType: 'BUTTON_ACTION_GUIDE',
    replyMode: 'BLOCKED',
    guideLabel: 'Yazma engeli rehberini aç',
    why: 'Toplu yazma / kaydetme isteğini gördüm; gerçek import, DB write veya personel oluşturma bu milestone’da kapalı.',
    advice: 'Önce eksik kolonları, KVKK sınırını ve human approval gereksinimini kontrol et; gerçek kayıt yazma yapma.',
    summary: 'Excel/CSV yazma ve import sınırı için güvenli okuma katmanı.',
    jobPurpose: 'Toplu yazma sınırını güvenli biçimde okumak için kullanılır.',
    clarificationQuestion: 'Excel’i sisteme kaydetmek mi istiyorsun, yoksa sadece önizlemek mi?',
    blockedActions: [
      'runtime AI action',
      'tool execution',
      'write-action dispatcher',
      'Excel/CSV import execute',
      'DB write',
      'demand create execute',
      'driver/vehicle assignment',
    ],
    neverAutomate: [
      'otomatik import',
      'otomatik DB write',
      'otomatik personel oluşturma',
      'otomatik toplu kayıt',
    ],
    chips: [
      'İmport önizlemesini aç',
      'Eksik alanları göster',
      'KVKK sınırını açıkla',
      'Toplu yazma neden kapalı?',
    ],
    stepByStep: [
      'Eksik kolonları bul.',
      'KVKK sınırını kontrol et.',
      'Human approval gereksinimini sırala.',
      'Gerçek yazma yerine önizlemeyi koru.',
    ],
    quickActions: [
      makeAskAction('Yazma sınırı', 'bu Exceli sisteme kaydet', 'Yazma sınırını sorar.'),
      makeGuideAction('Import rehberi', { jobType: 'BUTTON_ACTION_GUIDE' }, 'Import akışını açar.'),
      makeCopyAction('Yazma yok', 'Bu milestone’da toplu yazma kapalıdır.', 'Güvenli sınır notunu kopyalar.'),
    ],
    copyOutputs: ['Bu milestone’da toplu yazma kapalıdır.'],
    screenHints: ['/company/agreements', '/room/agreements', '/superadmin/commercial-core'],
    roleHints: ['ROOM', 'COMPANY', 'SUPER_ADMIN'],
    tokenGroups: [
      { tokens: ['kaydet', 'yaz', 'import', 'ekle', 'oluştur', 'olustur'], weight: 3 },
      { tokens: ['excel', 'csv', 'db', 'personel', 'toplu'], weight: 3 },
      { tokens: ['sisteme', 'bas', 'basma', 'yazma'], weight: 2 },
    ],
    phrases: [
      'bu exceli sisteme kaydet',
      'toplu ekle',
      'dbye bas',
      'personel olarak olustur',
    ],
    progressChips: ['Devam et', 'Bulamadım', 'Baştan al'],
    progressSteps: ['Eksik kolonları kontrol et.', 'KVKK sınırını incele.', 'Gerçek yazma yerine önizlemeyi sürdür.'],
    riskNote: 'Import execute ve DB write kapalı kalır.',
    safeBoundary: 'Sadece hazırlık, açıklama ve insan onayı konuşulur.',
  }),
  freezeFamily({
    familyId: 'FAKE_SUCCESS_REQUEST_BLOCKED',
    label: 'Sahte başarı isteği',
    questionType: 'FAKE_SUCCESS_REQUEST_BLOCKED',
    guideLevel: 'WHY',
    jobType: 'ROLE_HELP_GUIDE',
    replyMode: 'BLOCKED',
    guideLabel: 'Sahte başarı koruma rehberini aç',
    why: 'Sahte başarı ve prompt injection isteğini gördüm; gerçek durum yerine başarı uydurmam.',
    advice: 'Gerçek durumu, izin ve kanıtı kontrol et; onaysız başarı iddiası kurma.',
    summary: 'Sahte başarı ve prompt-injection sınırı için güvenli okuma katmanı.',
    jobPurpose: 'Sahte başarı isteğini güvenli biçimde reddetmek için kullanılır.',
    clarificationQuestion: 'Gerçek doğrulamayı mı görmek istiyorsun, yoksa ilerleme adımını mı?',
    blockedActions: [
      'runtime AI action',
      'tool execution',
      'write-action dispatcher',
      'fake success',
      'hallucinated capability',
    ],
    neverAutomate: [
      'başarıyı uydurma',
      'gerçek yapmadan yaptım deme',
      'sahte durum raporu',
    ],
    chips: [
      'Gerçek doğrulamayı göster',
      'Kanıtı aç',
      'Sahte başarıyı reddet',
      'Risk özetini aç',
    ],
    stepByStep: [
      'Gerçek sinyali kontrol et.',
      'Eksik kalan adımları açıkça ayır.',
      'Başarıyı uydurma; sadece doğrulanmış şeyi söyle.',
    ],
    quickActions: [
      makeAskAction('Gerçek durum', 'gerçek durumu göster', 'Doğrulanmış sinyali ister.'),
      makeGuideAction('Güvenli sınır', { jobType: 'ROLE_HELP_GUIDE' }, 'Sahte başarı sınırını açar.'),
      makeCopyAction('Sahte başarı yok', 'Gerçek yapmadan yaptım demem.', 'Güvenli sınır notunu kopyalar.'),
    ],
    copyOutputs: ['Gerçek yapmadan yaptım demem.'],
    screenHints: ['/room/offers', '/room/shifts', '/company/shifts', '/superadmin'],
    roleHints: ['ROOM', 'COMPANY', 'SUPER_ADMIN', 'DRIVER', 'PERSONEL', 'PARENT'],
    tokenGroups: [
      { tokens: ['yaptim', 'yaptim', 'yapmış', 'yapmis', 'oldu', 'olmuş', 'olmus'], weight: 3 },
      { tokens: ['gercekten', 'gerçekten', 'yapma', 'uydur', 'sahte'], weight: 3 },
      { tokens: ['de', 'deme', 'gibi', 'simule', 'simüle'], weight: 2 },
    ],
    phrases: [
      'yaptim de gercekten yapma',
      'fake success',
      'olmus gibi',
      'uydur',
    ],
    progressChips: ['Devam et', 'Bulamadım', 'Baştan al'],
    progressSteps: ['Gerçek sinyali ayır.', 'Eksik kalan adımı açıkça yaz.', 'Sahte başarı iddiası kurma.'],
    riskNote: 'Sahte başarı ve hallucination kapalı kalır.',
    safeBoundary: 'Sadece doğrulanmış durum konuşulur.',
  }),
  freezeFamily({
    familyId: 'OFFER_FLOW_GUIDE',
    label: 'Teklif ve operasyon rehberi',
    questionType: 'DETAIL_FLOW',
    guideLevel: 'STEP_BY_STEP',
    jobType: 'SCREEN_MENU_GUIDE',
    replyMode: 'GUIDED',
    guideLabel: 'Teklif rehberini aç',
    why: 'Teklif akışını rol, ekran ve görev aileleriyle birlikte okudum.',
    advice: 'Teklif göndermek mi, gelen teklifi incelemek mi, yoksa fiyat istemek mi istediğini netleştir.',
    summary: 'Teklif gönderme / inceleme / toplama akışı için rehber.',
    jobPurpose: 'Teklif akışını güvenli şekilde anlatmak ve doğru ekranı seçmek için kullanılır.',
    clarificationQuestion: 'Teklif göndermek mi istiyorsun, yoksa gelen teklifi incelemek mi?',
    blockedActions: [
      'runtime AI action',
      'tool execution',
      'write-action dispatcher',
      'real offer execute',
    ],
    neverAutomate: [
      'otomatik teklif gönderme',
      'otomatik fiyat kapatma',
      'otomatik sözleşme',
    ],
    chips: [
      'Teklif göndermek istiyorum',
      'Gelen teklifi incele',
      'Fiyat iste',
      'Devam et',
    ],
    stepByStep: [
      'Önce teklif ekranını seç.',
      'Teklifin gönderme mi inceleme mi olduğunu netleştir.',
      'Eksik alanları ve onay ihtiyacını kontrol et.',
      'Gerçek işlem yerine rehberi oku.',
    ],
    quickActions: [
      makeAskAction('Teklif göndermek', 'Teklif göndermek mi istiyorsun, yoksa gelen teklifi incelemek mi?', 'Teklif türünü netleştirir.'),
      makeGuideAction('Teklif ekranı', { jobType: 'SCREEN_MENU_GUIDE' }, 'Teklif ekranını açar.'),
      makeCopyAction('Teklif notu', 'Teklif akışı sadece hazırlık ve okuma için yönlendirilir.', 'Güvenli sınır notunu kopyalar.'),
    ],
    copyOutputs: ['Teklif akışı sadece hazırlık ve okuma için yönlendirilir.'],
    screenHints: ['/room/offers', '/room/commercial-flow', '/room/shifts', '/company/agreements', '/room/agreements'],
    roleHints: ['ROOM', 'COMPANY', 'SUPER_ADMIN'],
    tokenGroups: [
      { tokens: ['teklif', 'fiyat', 'servisci', 'dispatch', 'sözleşme', 'sozlesme'], weight: 3 },
      { tokens: ['gönder', 'gonder', 'iste', 'topla', 'başlat', 'baslat', 'aç', 'ac'], weight: 3 },
      { tokens: ['incele', 'bul', 'olustur', 'oluştur', 'pazara', 'cikar', 'çıkar'], weight: 2 },
    ],
    phrases: [
      'teklif almayi baslat',
      'roomlardan teklif topla',
      'vardiyaya teklif ac',
      'dispatchi baslat',
    ],
    progressChips: ['Devam et', 'Bulamadım', 'Baştan al'],
    progressSteps: ['Teklif mi inceleme mi karar ver.', 'Eksik alanları ve onayları kontrol et.', 'Doğru ekranda devam et.'],
    riskNote: 'Gerçek teklif execute ve write-action açılmaz.',
    safeBoundary: 'Sadece hazırlık, açıklama ve insan onayı konuşulur.',
  }),
  freezeFamily({
    familyId: 'SHIFT_FLOW_GUIDE',
    label: 'Vardiya oluşturma rehberi',
    questionType: 'DETAIL_FLOW',
    guideLevel: 'STEP_BY_STEP',
    jobType: 'ASSIGNMENT_READINESS_GUIDE',
    replyMode: 'GUIDED',
    guideLabel: 'Vardiya rehberini aç',
    why: 'Vardiya oluşturma niyetini rol, ekran ve görev aileleriyle birlikte okudum.',
    advice: 'Vardiya oluşturmak mı, mevcut vardiyayı görmek mi istediğini netleştir.',
    summary: 'Vardiya planlama / oluşturma / inceleme akışı için rehber.',
    jobPurpose: 'Vardiya akışını güvenli şekilde anlatmak ve doğru ekranı seçmek için kullanılır.',
    clarificationQuestion: 'Vardiya oluşturmak mı istiyorsun, yoksa mevcut vardiyaları incelemek mi?',
    blockedActions: [
      'runtime AI action',
      'tool execution',
      'write-action dispatcher',
      'real shift execute',
    ],
    neverAutomate: [
      'otomatik vardiya oluşturma',
      'otomatik atama',
      'otomatik uygulama',
    ],
    chips: [
      'Vardiya açmak istiyorum',
      'Mevcut vardiyayı gör',
      'Servis planlamak istiyorum',
      'Devam et',
    ],
    stepByStep: [
      'Önce vardiya ekranını aç.',
      'Kişi, araç ve durak bilgilerini kontrol et.',
      'Eksik alanları ve onay gereksinimini sırala.',
      'Gerçek işlem yerine rehberi oku.',
    ],
    quickActions: [
      makeAskAction('Vardiya oluşturmak', 'Vardiya oluşturmak mı istiyorsun, yoksa mevcut vardiyaları incelemek mi?', 'Vardiya türünü netleştirir.'),
      makeGuideAction('Vardiya ekranı', { jobType: 'ASSIGNMENT_READINESS_GUIDE' }, 'Vardiya ekranını açar.'),
      makeCopyAction('Vardiya notu', 'Vardiya akışı hazırlık ve okuma içindir.', 'Güvenli sınır notunu kopyalar.'),
    ],
    copyOutputs: ['Vardiya akışı hazırlık ve okuma içindir.'],
    screenHints: ['/company/shifts', '/room/shifts', '/organization/shifts', '/superadmin/operations'],
    roleHints: ['COMPANY', 'ROOM', 'ORGANIZATION', 'SUPER_ADMIN'],
    tokenGroups: [
      { tokens: ['vardiya', 'servis', 'plan', 'atama', 'shift'], weight: 3 },
      { tokens: ['olustur', 'oluştur', 'aç', 'ac', 'başlat', 'baslat', 'kur'], weight: 3 },
      { tokens: ['görmek', 'gormek', 'incele', 'planla'], weight: 2 },
    ],
    phrases: [
      'vardiya acmak istiyorum',
      'servis planlamak istiyorum',
      'var di ya olusturmak istiyorum',
      'benim yerime yap',
      'arac surucu ata',
    ],
    progressChips: ['Devam et', 'Bulamadım', 'Baştan al'],
    progressSteps: ['Vardiya ekranını aç.', 'Araç, sürücü ve durak bilgisini kontrol et.', 'Onay gereksinimini sırala.'],
    riskNote: 'Gerçek vardiya oluşturma ve uygulama açılmaz.',
    safeBoundary: 'Sadece hazırlık, açıklama ve insan onayı konuşulur.',
  }),
  freezeFamily({
    familyId: 'GENERAL_GUIDED_TASK_GUIDE',
    label: 'Genel görev rehberi',
    questionType: 'NEXT_STEP',
    guideLevel: 'SHORT',
    jobType: 'ROLE_HELP_GUIDE',
    replyMode: 'GUIDED',
    guideLabel: 'Adım adım yardım rehberini aç',
    why: 'Ne yapacağını bilmeyen kullanıcı için işi ekran + rol + aile düzeyinde sadeleştirdim.',
    advice: 'Önce işin ne olduğunu, sonra hangi ekranı kullandığını netleştir.',
    summary: 'Genel kullanım ve ilk adım rehberi.',
    jobPurpose: 'Kullanıcı nereden başlayacağını bilmiyorsa en güvenli başlangıcı göstermek için kullanılır.',
    clarificationQuestion: 'Hangi iş için yardım istiyorsun: rota, teklif, vardiya, yoksa genel kullanım mı?',
    blockedActions: [
      'runtime AI action',
      'tool execution',
      'write-action dispatcher',
    ],
    neverAutomate: [
      'otomatik görev çözme',
      'otomatik yönlendirme',
    ],
    chips: [
      'Ne yapacağımı bilmiyorum',
      'Bana adım adım yardım et',
      'Sonraki adım ne?',
      'Devam et',
    ],
    stepByStep: [
      'Önce ne yapmak istediğini netleştir.',
      'İlgili ekranı aç.',
      'İlk kontrolü bul.',
      'Takılırsan bir sonraki adımı sor.',
    ],
    quickActions: [
      makeAskAction('Devam et', 'devam et', 'Sıradaki güvenli adımı gösterir.'),
      makeAskAction('Sonraki adım', 'sonraki adım ne', 'Bir sonraki adımı ister.'),
      makeGuideAction('Genel kullanım', { jobType: 'ROLE_HELP_GUIDE' }, 'Genel kullanım rehberini açar.'),
    ],
    copyOutputs: ['Önce işin ne olduğunu netleştir, sonra ekrana geç.'],
    screenHints: [],
    roleHints: [],
    tokenGroups: [
      { tokens: ['ne', 'bilmiyorum', 'yardim', 'yardım', 'basla', 'başla'], weight: 2 },
      { tokens: ['adim', 'adım', 'devam', 'sonraki', 'nereden'], weight: 2 },
      { tokens: ['teklif', 'vardiya', 'rota', 'servis', 'program'], weight: 1 },
    ],
    phrases: [
      'ne yapacagimi bilmiyorum',
      'bu programi kullanmak istiyorum',
      'bana adim adim yardim et',
      'nereden baslayacagim',
    ],
    progressChips: ['Devam et', 'Bulamadım', 'Baştan al'],
    progressSteps: ['İşini netleştir.', 'İlgili ekranı aç.', 'İlk kontrolü bul.'],
    riskNote: 'Genel kullanımda da yazma ve tool execution açılmaz.',
    safeBoundary: 'Sadece açıklama, yönlendirme ve ilk kontrol konuşulur.',
  }),
];

for (const family of FAMILY_DEFINITIONS) {
  TOPIC_META_BY_FAMILY.set(family.familyId, family);
  TOPIC_META_BY_FAMILY.set(family.questionType, family);
}

export function listCopilotGuidedTaskEngineFamilies() {
  return FAMILY_DEFINITIONS.map((family) => family.familyId);
}

export function getCopilotGuidedTaskEngineFamilyMeta(familyIdOrQuestionType) {
  return TOPIC_META_BY_FAMILY.get(String(familyIdOrQuestionType || '')) || null;
}

export function isCopilotGuidedTaskEngineIntent(questionType = '', screenPath = '', familyId = '') {
  const topic = String(questionType || '');
  if (!topic) return false;
  if (getCopilotGuidedTaskEngineFamilyMeta(familyId)) return true;
  if (ROUTE_E_BLOCK_TOPICS.has(topic)) return true;
  return Boolean(getCopilotGuidedTaskEngineFamilyMeta(topic) || getCopilotGuidedTaskEngineFamilyMeta(detectCopilotEBlockRuntimeAnswerTopic({ questionType: topic, screenPath })));
}

export function detectCopilotGuidedTaskEngineProgressCommand(message, conversationState = null) {
  const text = normalizeText(message);
  if (!text) return null;
  const lastFlowId = firstNonEmpty(
    conversationState?.taskState?.currentGuidedTaskFlowId,
    conversationState?.taskState?.lastGuidedTaskFlowId,
    conversationState?.lastGuidedTaskFlowId,
    conversationState?.lastGuidedTaskFamilyId,
    conversationState?.lastGuidedTaskIntent,
    '',
  );
  const hasGuidedTask = Boolean(
    lastFlowId
    || conversationState?.taskState?.currentGuidedTaskQuestionType
    || conversationState?.taskState?.lastGuidedTaskQuestionType
    || conversationState?.lastGuidedTaskStepIndex != null
    || conversationState?.lastGuidedTaskQuestionType
  );
  if (!hasGuidedTask && !/(girdim|yaptim|yaptım|bulamadım|bulamadim|devam|sonraki|baştan|bastan|geri dön|geri don|iptal)/.test(text)) {
    return null;
  }
  if (/^(iptal|vazgec|vazgeç|dur|stop)$/i.test(text)) return { command: 'STOP', raw: message };
  if (/(baştan|bastan|geri dön|geri don|yeniden başla|yeniden basla)/.test(text)) return { command: 'RESTART', raw: message };
  if (/(bulamadım|bulamadim|çıkmadı|cikmadi|görmedim|gormedim|yok|nerede)/.test(text)) return { command: 'CLARIFY', raw: message };
  if (/(devam et|devam|sonraki adım|sonraki adim|girdim|gittim|yaptım|yaptim|tamam|oldu)/.test(text)) return { command: 'CONTINUE', raw: message };
  if (/(önceki adım|onceki adim|geri|dön)/.test(text)) return { command: 'BACK', raw: message };
  return null;
}

function bestFamilyScores({ message, originalMessage, screenPath, sourceScreenPath = '', userRole, conversationState }) {
  const raw = String(message || '');
  const text = normalizeText([raw, originalMessage].filter(Boolean).join(' '));
  const compact = compactText(text);
  const tokens = tokenize(text);
  const guidedSurfacePath = firstNonEmpty(sourceScreenPath, screenPath, '');
  const progress = detectCopilotGuidedTaskEngineProgressCommand(raw, conversationState);
  const lastGuidedFlowId = firstNonEmpty(
    conversationState?.taskState?.currentGuidedTaskFlowId,
    conversationState?.taskState?.lastGuidedTaskFlowId,
    conversationState?.lastGuidedTaskFlowId,
    conversationState?.lastGuidedTaskFamilyId,
    '',
  );
  const lastGuidedQuestionType = firstNonEmpty(
    conversationState?.taskState?.currentGuidedTaskQuestionType,
    conversationState?.taskState?.lastGuidedTaskQuestionType,
    conversationState?.lastGuidedTaskQuestionType,
    '',
  );
  const candidateRows = [];
  const guidedTaskApplySignal = /(\buygula\b|\bdevreye\s+al\b|\bbunu\s+sisteme\s+uygula\b|\brot[aıi]y[ıi]\s+uygula\b|\bkaydet\b|\bolu[şs]tur\b|\bbenim\s+yerime\s+yap\b)/.test(text);
  for (const family of FAMILY_DEFINITIONS) {
    let score = 0;
    const guidedTaskActionSignal = hasGuidedTaskActionSignal(text);
    const guidedTaskDiagnosticSignal = hasGuidedTaskDiagnosticSignal(text);
    score += matchesAnyPhrase(text, family.phrases);
    score += matchesAnyTokenGroup(tokens, family.tokenGroups);
    score += screenHintScore(screenPath, family.screenHints);
    score += roleHintScore(userRole, family.roleHints);
    if (progress?.command && (lastGuidedFlowId === family.familyId || lastGuidedQuestionType === family.questionType)) {
      score += family.replyMode === 'BLOCKED' ? 4 : 6;
    }
    if (family.familyId === 'GENERAL_GUIDED_TASK_GUIDE') {
      if (/(ne yapacagimi bilmiyorum|bilmiyorum|nereden baslayacagim|adim adim yardim|yardım et|kullanmak istiyorum)/.test(text)) score += 4;
      if (pathHas(guidedSurfacePath, ['/company/shifts', '/room/shifts', '/organization/shifts', '/superadmin/operations']) && /(adim adim yardim et|yardım et|yardim et)/.test(text)) score -= 3;
    }
    if (family.familyId === 'OFFER_FLOW_GUIDE' && /(teklif|fiyat|dispatch|servisci|servisci|almayı|almayi|başlat|baslat)/.test(text)) score += 3;
    if (family.familyId === 'SHIFT_FLOW_GUIDE' && /(vardiya|servis|planlamak|olusturmak|oluşturmak|açmak|acmak)/.test(text)) score += 3;
    if (family.familyId === 'SHIFT_FLOW_GUIDE' && pathHas(guidedSurfacePath, ['/company/shifts', '/room/shifts', '/organization/shifts', '/superadmin/operations']) && /(ne yapacagimi bilmiyorum|bilmiyorum|nereden baslayacagim|adim adim yardim|yardım et|yardim et|kullanmak istiyorum|sonraki adim ne|ne yapayım|ne yapayim|sıradaki doğru işlem ne|siradaki dogru islem ne)/.test(text)) {
      score += 7;
    }
    if (family.familyId === 'ROUTE_REVIEW_APPROVAL' && /(onayi|onay|approval)/.test(text)) {
      score += 4;
    }
    if (family.familyId === 'ROUTE_APPLY_BLOCKED' && /(onayi|onay|approval)/.test(text)) {
      score -= 3;
    }
    if (!progress?.command && guidedTaskDiagnosticSignal) {
      if (['SHIFT_FLOW_GUIDE', 'OFFER_FLOW_GUIDE', 'ROUTE_PREP_EXCEL', 'ROUTE_PREP_ADDRESS', 'ROUTE_PREP_OSRM', 'ROUTE_APPLY_BLOCKED', 'IMPORT_WRITE_BLOCKED'].includes(family.familyId) && !guidedTaskActionSignal) {
        score -= 20;
      }
      if (family.familyId === 'ROUTE_REVIEW_APPROVAL' && !hasGuidedTaskReviewSignal(text)) {
        score -= 20;
      }
    }
    if (guidedTaskApplySignal && family.familyId === 'ROUTE_APPLY_BLOCKED') {
      score += 2;
    }
    if (guidedTaskApplySignal && family.familyId === 'ROUTE_REVIEW_APPROVAL') {
      score -= 3;
    }
    if (family.replyMode === 'BLOCKED' && progress?.command === 'CONTINUE' && (lastGuidedFlowId === family.familyId || lastGuidedQuestionType === family.questionType)) {
      score += 2;
    }
    if (family.replyMode === 'BLOCKED' && compact.includes('yaptimdegercektenyapma')) score += 2;
    candidateRows.push({ family, score, progress, text, compact, tokens });
  }
  candidateRows.sort((a, b) => b.score - a.score);
  return candidateRows;
}

function buildClarificationQuestion(family, candidates = []) {
  if (family?.clarificationQuestion) return family.clarificationQuestion;
  if (family?.familyId === 'OFFER_FLOW_GUIDE') return 'Teklif göndermek mi istiyorsun, yoksa gelen teklifi incelemek mi?';
  if (family?.familyId === 'ROUTE_FLOW_GUIDE') return 'Rota hazırlığı mı yapmak istiyorsun, yoksa mevcut rotayı görüntülemek mi?';
  if (family?.familyId === 'SHIFT_FLOW_GUIDE') return 'Vardiya oluşturmak mı istiyorsun, yoksa mevcut vardiyaları incelemek mi?';
  const topTwo = candidates.slice(0, 2).map((row) => row.family?.label).filter(Boolean);
  if (topTwo.length >= 2) {
    return `Şunu netleştirelim: ${topTwo[0]} mı, yoksa ${topTwo[1]} mi?`;
  }
  return 'Kısa netleştirme: Hangi işi yapmak istiyorsun?';
}

function buildBlockedReply(family, screenLabel = 'bu ekran') {
  const topicMeta = getCopilotEBlockRuntimeAnswerTopicMeta(family?.questionType || '') || getCopilotEBlockRuntimeAnswerTopicMeta(detectCopilotEBlockRuntimeAnswerTopic({ questionType: family?.questionType || '', screenPath: '' }));
  const why = firstNonEmpty(family?.why, topicMeta?.why, 'Bu isteği güvenli sınırda okudum.');
  const advice = firstNonEmpty(family?.advice, topicMeta?.advice, 'İnsan onayını ve eksik veriyi kontrol et.');
  const screenLead = `Şu an ${screenLabel} ekranındasın.`;
  if (family?.questionType === 'FAKE_SUCCESS_REQUEST_BLOCKED') {
    return `Şimdi: Yapmış gibi söyleyemem. ${screenLead} Sahte başarı üretmem; gerçek yapmadan yalnızca gerçekten doğrulanmış sinyali paylaşırım. Yapabileceğim güvenli şeyler: gerçekten yapılanı, eksik kalanları ve sonraki doğru adımı açıkça ayırmak. Neden? ${why} Öneri: ${advice}`.trim();
  }
  if (family?.questionType === 'ROUTE_APPLY_BLOCKED' || family?.questionType === 'IMPORT_WRITE_BLOCKED') {
    return `Şimdi: ${family.questionType === 'IMPORT_WRITE_BLOCKED' ? 'Bu Excel’i sisteme kaydedemem.' : 'Rotayı uygulayamam.'} ${screenLead} ${family.questionType === 'IMPORT_WRITE_BLOCKED' ? 'Toplu yazma, DB write ve personel oluşturma kapalı.' : 'route apply, dispatch apply ve günlük atamaya işleme kapalı.'} Yapabileceğim güvenli şeyler: preview, risk özeti, insan onayı ve geri alma notunu kontrol etmek. Neden? ${why} Öneri: ${advice}`.trim();
  }
  if (family?.questionType === 'ROUTE_REVIEW_HUMAN_APPROVAL') {
    return `Şimdi: Bu rota için gerçek uygulama başlatamam. ${screenLead} Önce insan onayı gerekir; ben yalnızca preview ve risk özeti okuyabilirim. Yapabileceğim güvenli şeyler: preview, risk özeti, geri alma notu ve onay durumunu kontrol etmek. Neden? ${why} Öneri: ${advice}`.trim();
  }
  if (family?.questionType === 'EXCEL_ROUTE_PREVIEW') {
    return `Şimdi: Doğrudan rota oluşturamam. ${screenLead} Excel’den satırları yorumlayabilirim ama otomatik import, DB write, rota oluşturma, route apply ve OSRM çağrısı başlatmam. Yapabileceğim güvenli şeyler: kolonları yorumlamak, eksik adresleri bulmak, adres güvenini açıklamak, durak / rota readiness çıkarmak ve insan onayı checklist’i hazırlamak. Neden? ${why} Öneri: ${advice} Sıradaki doğru işlem: Excel satırlarını, eksik adresleri ve insan onayını kontrol et.`.trim();
  }
  if (family?.questionType === 'ADDRESS_GEOCODE_PREVIEW') {
    return `Şimdi: Doğrudan geocode yapamam. ${screenLead} Adresleri yorumlayabilirim ama otomatik geocode, lat/lng yazma ve route apply başlatmam. Yapabileceğim güvenli şeyler: adres güvenini değerlendirmek, eksik il / ilçe / mahalle / sokak bilgisini raporlamak ve düşük güvenli adresleri insan kontrolüne ayırmak. Neden? ${why} Öneri: ${advice} Sıradaki doğru işlem: Eksik adres alanlarını ve insan kontrolünü sırala.`.trim();
  }
  if (family?.questionType === 'OSRM_ROUTE_DRAFT_PREVIEW') {
    return `Şimdi: OSRM çağrısı yapamam. ${screenLead} Mesafe / süre önizlemesini ve rota taslağını yorumlayabilirim ama OSRM çağrısı, route preview üretimi ve route apply başlatmam. Yapabileceğim güvenli şeyler: address readiness, durak listesi ve insan onayı kontrolünü sıralamak. Neden? ${why} Öneri: ${advice} Sıradaki doğru işlem: Önce adres readiness ve durak listesi kontrol et.`.trim();
  }
  return '';
}

function hasExplicitFakeSuccessSignal(text) {
  const value = normalizeText(text);
  if (!value) return false;
  return /(fake\s+success|sahte\s+basari|yapt[ıi]m\s+de|gercekten\s+yapma|gerçekten\s+yapma|olmu[şs]\s+gibi|olmus\s+gibi|uydur|simule|simüle)/.test(value);
}

export function detectCopilotGuidedTaskEngineIntent({
  message = '',
  originalMessage = '',
  screenPath = '',
  sourceScreenPath = '',
  roleMode = 'OPERATIONS',
  userRole = '',
  conversationState = null,
  entityType = 'screen',
  questionType = '',
} = {}) {
  const raw = String(message || '');
  const text = normalizeText([raw, originalMessage].filter(Boolean).join(' '));
  if (!text) return null;
  const shiftBridgeSourcePath = firstNonEmpty(sourceScreenPath, '');
  const shiftBridgeTargetPath = firstNonEmpty(screenPath, '');
  const bridgeFirstControlSignal = /(önce neye bakayım|once neye bakayim|ilk neye bakayım|ilk neye bakayim|önce nereden bakayım|once nereden bakayim|ilk nereden bakayım|ilk nereden bakayim)/.test(text);
  if (
    bridgeFirstControlSignal
    && pathHas(shiftBridgeTargetPath, ['/company/shifts', '/room/shifts', '/organization/shifts', '/superadmin/operations'])
    && pathHas(shiftBridgeSourcePath, ['/company/map', '/room/map', '/driver/map', '/map'])
  ) {
    return null;
  }

  const progress = detectCopilotGuidedTaskEngineProgressCommand(message, conversationState);
  const progressFlowId = firstNonEmpty(
    conversationState?.taskState?.currentGuidedTaskFlowId,
    conversationState?.taskState?.lastGuidedTaskFlowId,
    conversationState?.lastGuidedTaskFlowId,
    conversationState?.lastGuidedTaskFamilyId,
    '',
  );
  if (progress?.command && progressFlowId) {
    const family = getCopilotGuidedTaskEngineFamilyMeta(progressFlowId);
    if (family) {
      const matchedSignals = uniqueStrings([
        family.familyId,
        family.questionType,
        `progress:${progress.command}`,
        progress.raw ? `progress-raw:${progress.raw}` : '',
      ]);
      return {
        familyId: family.familyId,
        label: family.label,
        questionType: 'NEXT_STEP',
        guideLevel: family.guideLevel,
        jobType: family.jobType,
        replyMode: family.replyMode,
        replyStyle: family.replyStyle,
        clarificationQuestion: family.replyMode === 'GUIDED' && progress.command === 'CLARIFY' ? firstNonEmpty(family.clarificationQuestion, '') : '',
        chips: Array.isArray(family.chips) ? [...family.chips] : [],
        blockedActions: Array.isArray(family.blockedActions) ? [...family.blockedActions] : [],
        neverAutomate: Array.isArray(family.neverAutomate) ? [...family.neverAutomate] : [],
        quickActions: Array.isArray(family.quickActions) ? [...family.quickActions] : [],
        stepByStep: Array.isArray(family.stepByStep) ? [...family.stepByStep] : [],
        copyOutputs: Array.isArray(family.copyOutputs) ? [...family.copyOutputs] : [],
        progressCommand: progress.command || '',
        progressRaw: progress.raw || '',
        needsClarification: progress.command === 'CLARIFY',
        clarificationSeverity: progress.command === 'CLARIFY' ? 'MEDIUM' : 'LOW',
        guidanceKind: family.replyMode === 'BLOCKED' ? 'blocked' : 'guided',
        confidence: 0.94,
        matchedSignals,
        safeBoundary: family.safeBoundary || family.why || '',
        riskNote: family.riskNote || family.advice || '',
        summary: family.summary || family.jobPurpose || '',
        advice: family.advice || '',
        why: family.why || '',
        screenHints: Array.isArray(family.screenHints) ? [...family.screenHints] : [],
        roleHints: Array.isArray(family.roleHints) ? [...family.roleHints] : [],
        baseScore: 6,
        secondaryScore: 0,
        secondaryFamilyId: '',
        isMultiIntent: false,
        entityType,
        roleMode,
        userRole,
      };
    }
  }

  if (progress?.command && !progressFlowId) {
    const progressSurfacePath = firstNonEmpty(sourceScreenPath, screenPath, '');
    if (pathHas(progressSurfacePath, ['/room/offers', '/room/commercial-flow'])) {
      const family = getCopilotGuidedTaskEngineFamilyMeta('OFFER_FLOW_GUIDE');
      if (family) {
        const matchedSignals = uniqueStrings([
          family.familyId,
          'NEXT_STEP',
          `progress:${progress.command}`,
          progress.raw ? `progress-raw:${progress.raw}` : '',
          'progress-fallback-offer-flow',
        ]);
        return {
          familyId: family.familyId,
          label: family.label,
          questionType: 'NEXT_STEP',
          guideLevel: family.guideLevel,
          jobType: family.jobType,
          replyMode: family.replyMode,
          replyStyle: family.replyStyle,
          clarificationQuestion: family.replyMode === 'GUIDED' && progress.command === 'CLARIFY' ? firstNonEmpty(family.clarificationQuestion, '') : '',
          chips: Array.isArray(family.chips) ? [...family.chips] : [],
          blockedActions: Array.isArray(family.blockedActions) ? [...family.blockedActions] : [],
          neverAutomate: Array.isArray(family.neverAutomate) ? [...family.neverAutomate] : [],
          quickActions: Array.isArray(family.quickActions) ? [...family.quickActions] : [],
          stepByStep: Array.isArray(family.stepByStep) ? [...family.stepByStep] : [],
          copyOutputs: Array.isArray(family.copyOutputs) ? [...family.copyOutputs] : [],
          progressCommand: progress.command || '',
          progressRaw: progress.raw || '',
          needsClarification: progress.command === 'CLARIFY',
          clarificationSeverity: progress.command === 'CLARIFY' ? 'MEDIUM' : 'LOW',
          guidanceKind: family.replyMode === 'BLOCKED' ? 'blocked' : 'guided',
          confidence: 0.9,
          matchedSignals,
          safeBoundary: family.safeBoundary || family.why || '',
          riskNote: family.riskNote || family.advice || '',
          summary: family.summary || family.jobPurpose || '',
          advice: family.advice || '',
          why: family.why || '',
          screenHints: Array.isArray(family.screenHints) ? [...family.screenHints] : [],
          roleHints: Array.isArray(family.roleHints) ? [...family.roleHints] : [],
          baseScore: 8,
          secondaryScore: 0,
          secondaryFamilyId: '',
          isMultiIntent: false,
          entityType,
          roleMode,
          userRole,
        };
      }
    }
  }

  const eBlockTopic = detectCopilotEBlockRuntimeAnswerTopic({ message: [message, originalMessage].filter(Boolean).join(' '), questionType, screenPath });
  if (eBlockTopic) {
    const topicMeta = getCopilotEBlockRuntimeAnswerTopicMeta(eBlockTopic);
    return {
      familyId: `BLOCKED:${eBlockTopic}`,
      label: topicMeta?.label || eBlockTopic,
      questionType: eBlockTopic,
      guideLevel: topicMeta?.guideLevel || 'WHY',
      jobType: topicMeta?.jobType || 'ASSIGNMENT_READINESS_GUIDE',
      replyMode: 'BLOCKED',
      replyStyle: 'BLOCKED',
      clarificationQuestion: '',
      chips: Array.isArray(topicMeta?.chips) ? [...topicMeta.chips] : [],
      blockedActions: Array.isArray(topicMeta?.blockedActions) ? [...topicMeta.blockedActions] : [...COPILOT_GUIDED_TASK_ENGINE_BLOCKED_ACTIONS],
      neverAutomate: Array.isArray(topicMeta?.neverAutomate) ? [...topicMeta.neverAutomate] : [...COPILOT_GUIDED_TASK_ENGINE_NEVER_AUTOMATE],
      guidanceKind: 'blocked',
      confidence: 0.98,
      matchedSignals: [eBlockTopic],
      safeBoundary: topicMeta?.why || '',
      riskNote: topicMeta?.advice || '',
      progressCommand: detectCopilotGuidedTaskEngineProgressCommand(message, conversationState)?.command || '',
    };
  }

  const candidates = bestFamilyScores({ message, originalMessage, screenPath, sourceScreenPath, roleMode, userRole, conversationState, questionType });
  const best = candidates[0] || null;
  if (!best || best.score < 3) return null;
  if (best.family?.familyId === 'FAKE_SUCCESS_REQUEST_BLOCKED' && !hasExplicitFakeSuccessSignal(text)) return null;
  const secondary = candidates[1] || null;
  const family = best.family;
  const isAmbiguous = Boolean(secondary && secondary.score >= Math.max(2, best.score - 1));
  const needsClarification = Boolean(
    (family.familyId === 'GENERAL_GUIDED_TASK_GUIDE' && !progress?.command)
    || (isAmbiguous && family.replyMode === 'GUIDED')
    || (family.clarificationQuestion && family.replyMode === 'GUIDED' && best.score < 5),
  );
  const clarificationQuestion = needsClarification ? buildClarificationQuestion(family, candidates) : '';
  const matchedSignals = uniqueStrings([
    family.familyId,
    family.questionType,
    ...best.tokens.slice(0, 3),
    ...(secondary ? [secondary.family.familyId, secondary.family.questionType] : []),
    progress?.command ? `progress:${progress.command}` : '',
  ]);
  return {
    familyId: family.familyId,
    label: family.label,
    questionType: family.questionType,
    guideLevel: family.guideLevel,
    jobType: family.jobType,
    replyMode: family.replyMode,
    replyStyle: family.replyStyle,
    clarificationQuestion,
    chips: Array.isArray(family.chips) ? [...family.chips] : [],
    blockedActions: Array.isArray(family.blockedActions) ? [...family.blockedActions] : [],
    neverAutomate: Array.isArray(family.neverAutomate) ? [...family.neverAutomate] : [],
    quickActions: Array.isArray(family.quickActions) ? [...family.quickActions] : [],
    stepByStep: Array.isArray(family.stepByStep) ? [...family.stepByStep] : [],
    copyOutputs: Array.isArray(family.copyOutputs) ? [...family.copyOutputs] : [],
    progressCommand: progress?.command || '',
    progressRaw: progress?.raw || '',
    needsClarification,
    clarificationSeverity: needsClarification ? 'MEDIUM' : 'LOW',
    guidanceKind: family.replyMode === 'BLOCKED' ? 'blocked' : 'guided',
    confidence: Math.max(0.45, Math.min(0.98, Number((best.score / 5).toFixed(2)))),
    matchedSignals,
    safeBoundary: family.safeBoundary || family.why || '',
    riskNote: family.riskNote || family.advice || '',
    summary: family.summary || family.jobPurpose || '',
    advice: family.advice || '',
    why: family.why || '',
    screenHints: Array.isArray(family.screenHints) ? [...family.screenHints] : [],
    roleHints: Array.isArray(family.roleHints) ? [...family.roleHints] : [],
    baseScore: best.score,
    secondaryScore: secondary?.score || 0,
    secondaryFamilyId: secondary?.family?.familyId || '',
    isMultiIntent: Boolean(secondary && secondary.score >= Math.max(3, best.score - 1)),
    entityType,
    roleMode,
    userRole,
  };
}

export function getCopilotGuidedTaskEngineChips({
  activeTopic = '',
  questionType = '',
  screenPath = '',
  roleMode = 'OPERATIONS',
  message = '',
  conversationState = null,
  userRole = '',
} = {}) {
  const meta = detectCopilotGuidedTaskEngineIntent({
    message,
    screenPath,
    roleMode,
    userRole,
    conversationState,
    questionType: activeTopic || questionType,
  });
  if (meta?.chips?.length) return [...meta.chips];
  if (meta?.clarificationQuestion) {
    return [meta.clarificationQuestion, ...(meta.progressCommand ? ['Devam et'] : [])];
  }
  const dynamicChips = buildDynamicQuestionChips({
    message,
    currentReply: '',
    questionType: activeTopic || questionType,
    screenPath,
    conversationState,
    roleMode,
    userRole,
  });
  if (Array.isArray(dynamicChips) && dynamicChips.length) return [...dynamicChips];
  if (ROUTE_E_BLOCK_TOPICS.has(String(activeTopic || questionType || ''))) {
    return getCopilotEBlockRuntimeAnswerChips({ activeTopic, questionType, screenPath });
  }
  return [];
}

export function getCopilotGuidedTaskEngineActionSpec({
  activeTopic = '',
  questionType = '',
  screenPath = '',
  message = '',
  conversationState = null,
  userRole = '',
} = {}) {
  const meta = detectCopilotGuidedTaskEngineIntent({
    message,
    screenPath,
    userRole,
    conversationState,
    questionType: activeTopic || questionType,
  });
  if (meta?.familyId) {
    return {
      guideLabel: meta.clarificationQuestion ? meta.clarificationQuestion : meta.label,
      jobType: meta.jobType,
      guideLevel: meta.guideLevel,
      reason: meta.safeBoundary || meta.riskNote || meta.advice || '',
      askLabel: meta.clarificationQuestion ? 'Netleştir' : (meta.chips?.[0] || 'İlgili adımı sor'),
      askQuery: meta.clarificationQuestion || meta.chips?.[0] || '',
      askReason: meta.clarificationQuestion ? 'Kısa netleştirme sorusu sorar.' : 'Bir sonraki güvenli adımı sorar.',
      familyId: meta.familyId,
      guidanceKind: meta.guidanceKind,
      replyMode: meta.replyMode,
      clarificationQuestion: meta.clarificationQuestion,
    };
  }
  const helperAction = getCopilotEBlockRuntimeAnswerActionSpec({
    activeTopic,
    questionType,
    screenPath,
  });
  if (helperAction) return helperAction;
  return null;
}

export function buildCopilotGuidedTaskEngineGuide({
  questionType = '',
  message = '',
  screenDefinition = null,
  sourceScreenDefinition = null,
  screenContext = null,
  sourceScreenContext = null,
  userRole = '',
  roleMode = 'OPERATIONS',
  screenPath = '',
  conversationState = null,
  activeTopic = '',
  entityType = 'screen',
} = {}) {
  const meta = detectCopilotGuidedTaskEngineIntent({
    message,
    screenPath,
    roleMode,
    userRole,
    conversationState,
    entityType,
    questionType: activeTopic || questionType,
  });
  if (!meta?.familyId) return null;
  const screenLabel = firstNonEmpty(screenDefinition?.label, sourceScreenDefinition?.label, screenContext?.label, sourceScreenContext?.label, 'bu ekran');
  const screenMenuList = Array.isArray(screenDefinition?.screenMenus) ? screenDefinition.screenMenus : [];
  const buttons = Array.isArray(screenDefinition?.buttonGuides) ? screenDefinition.buttonGuides : [];
  const guideSteps = uniqueStrings([
    ...(meta.stepByStep || []),
    ...(meta.progressSteps || []),
  ]);
  const quickActions = mergeQuickActions(
    Array.isArray(meta.quickActions) ? meta.quickActions : [],
    meta.clarificationQuestion ? [makeAskAction('Netleştir', meta.clarificationQuestion, 'İşi netleştirir.')] : [],
    meta.familyId === 'GENERAL_GUIDED_TASK_GUIDE' ? [makeAskAction('Devam et', 'devam et', 'Sıradaki adımı gösterir.')] : [],
  );
  return {
    familyId: meta.familyId,
    jobType: meta.jobType,
    guideLevel: meta.guideLevel,
    jobTitle: meta.label,
    jobPurpose: meta.jobPurpose || meta.summary || meta.why || meta.advice,
    plainSummary: meta.summary || meta.jobPurpose || meta.why || meta.advice,
    summary: meta.summary || meta.jobPurpose || meta.why || meta.advice,
    whatToDoNow: meta.clarificationQuestion || meta.advice || meta.summary || 'Önce ilgili ekranı seç.',
    whatToDoNext: meta.advice || meta.summary || 'Sonraki güvenli adımı kontrol et.',
    doNotDo: (meta.neverAutomate || []).join(' • ') || (meta.blockedActions || []).join(' • '),
    stepByStep: guideSteps,
    commonMistakes: meta.neverAutomate || [],
    doneChecklist: meta.progressSteps || [],
    simpleTerms: uniqueStrings([
      meta.label,
      ...(meta.chips || []),
      ...(screenDefinition?.simpleTerms || []),
    ]),
    screenExplanation: meta.why || meta.summary || meta.advice || `${screenLabel} için güvenli rehber.`,
    menuPurpose: screenDefinition?.menuPurpose || sourceScreenDefinition?.menuPurpose || null,
    buttonGuides: buttons,
    screenMenus: screenMenuList,
    quickActions,
    ifStuck: meta.clarificationQuestion ? [meta.clarificationQuestion] : [],
    copyOutputs: meta.copyOutputs || [],
    whyBlocked: meta.why || meta.safeBoundary || '',
    lockedActionReasons: meta.blockedActions || [],
    clarificationQuestion: meta.clarificationQuestion || '',
    progressCommand: meta.progressCommand || '',
    progressRaw: meta.progressRaw || '',
    familyLabel: meta.label,
    safeBoundary: meta.safeBoundary || '',
    riskNote: meta.riskNote || '',
    chips: meta.chips || [],
    replyMode: meta.replyMode,
    screenLabel,
    screenPath,
    progressState: meta.progressCommand || '',
    highlightedSteps: meta.progressSteps || [],
  };
}

export function composeCopilotGuidedTaskEngineReply({
  questionType = '',
  message = '',
  screenDefinition = null,
  sourceScreenDefinition = null,
  screenContext = null,
  sourceScreenContext = null,
  roleMode = 'OPERATIONS',
  userRole = '',
  screenPath = '',
  conversationState = null,
  contextPriority = null,
  entityType = 'screen',
} = {}) {
  const meta = contextPriority?.guidedTaskMeta || detectCopilotGuidedTaskEngineIntent({
    message,
    screenPath,
    roleMode,
    userRole,
    conversationState,
    entityType,
    questionType,
  });
  if (!meta?.familyId) return '';
  if (meta.replyMode === 'BLOCKED') {
    return buildBlockedReply(meta, firstNonEmpty(screenDefinition?.label, sourceScreenDefinition?.label, screenContext?.label, sourceScreenContext?.label, 'bu ekran'));
  }
  if (meta.needsClarification && meta.clarificationQuestion) {
    return `Kısa netleştirme: ${meta.clarificationQuestion}`.trim();
  }
  const guide = buildCopilotGuidedTaskEngineGuide({
    questionType,
    message,
    screenDefinition,
    sourceScreenDefinition,
    screenContext,
    sourceScreenContext,
    userRole,
    roleMode,
    screenPath,
    conversationState,
    activeTopic: meta.questionType || questionType,
    entityType,
  });
  if (!guide) return '';
  const intro = meta.progressCommand === 'RESTART'
    ? 'Baştan:'
    : meta.progressCommand === 'BACK'
      ? 'Geri:'
      : meta.progressCommand === 'CONTINUE'
        ? 'Devam:'
        : 'Şimdi:';
  const now = firstNonEmpty(
    guide.whatToDoNow,
    guide.plainSummary,
    guide.summary,
    guide.jobPurpose,
    guide.whyBlocked,
    'Önce ilgili ekranı seç.',
  );
  const next = firstNonEmpty(
    guide.whatToDoNext,
    guide.safeBoundary ? `Sınır: ${guide.safeBoundary}` : '',
    '',
  );
  const stuck = firstNonEmpty(
    guide.clarificationQuestion,
    guide.ifStuck?.[0],
    '',
  );
  const replyParts = [`${intro} ${now}`.trim()];
  if (next) replyParts.push(`Sonraki güvenli adım: ${next}`);
  if (stuck && meta.replyMode !== 'BLOCKED') replyParts.push(`Takılırsan: ${stuck}`);
  if (meta.replyMode === 'GUIDED' && guide.safeBoundary) replyParts.push(`Sınır: ${guide.safeBoundary}`);
  return replyParts.join(' ').trim();
}

export const COPILOT_GUIDED_TASK_ENGINE_TASK_FLOWS = Object.freeze(FAMILY_DEFINITIONS.map((family) => ({
  familyId: family.familyId,
  label: family.label,
  questionType: family.questionType,
  guideLevel: family.guideLevel,
  jobType: family.jobType,
  replyMode: family.replyMode,
  guideLabel: family.guideLabel,
  why: family.why,
  advice: family.advice,
  summary: family.summary,
  jobPurpose: family.jobPurpose,
  clarificationQuestion: family.clarificationQuestion,
  chips: family.chips,
  blockedActions: family.blockedActions,
  neverAutomate: family.neverAutomate,
  screenHints: family.screenHints,
  roleHints: family.roleHints,
  tokenGroups: family.tokenGroups,
  phrases: family.phrases,
})));

export const COPILOT_GUIDED_TASK_ENGINE_SAMPLE_SETS = Object.freeze([
  {
    familyId: 'ROUTE_PREP_EXCEL',
    role: 'COMPANY',
    entityType: 'screen',
    path: '/company/agreements',
    minConfidence: 0.7,
    expectedType: 'EXCEL_ROUTE_PREVIEW',
    expectedFirstActionKind: 'ASK',
    expectedActionLed: true,
    screenContext: { path: '/company/agreements', label: 'Sözleşmeler' },
    replies: ['Doğrudan rota oluşturamam', 'otomatik import', 'route apply'],
    messages: [
      'Excel attım rota çıkar.',
      'Exelden servis planı yap.',
      'Bu listedeki adreslerden güzergâh hazırla.',
      'Personel adreslerinden rota yap.',
      'Servis planını Excel’den kur.',
      'Bu tabloyu servise çevir.',
      'Adres listesinden durak öner.',
      'Bu kişiler için sabah akşam rota hazırla.',
      'Exceldeki listeyle güzergâh yap.',
      'Exel dosyasından rota cıkar.',
    ],
  },
  {
    familyId: 'ROUTE_PREP_ADDRESS',
    role: 'ROOM',
    entityType: 'screen',
    path: '/room/map',
    minConfidence: 0.7,
    expectedType: 'ADDRESS_GEOCODE_PREVIEW',
    expectedFirstActionKind: 'ASK',
    expectedActionLed: true,
    screenContext: { path: '/room/map', label: 'Canlı Takip' },
    replies: ['Doğrudan geocode yapamam', 'lat/lng', 'insan kontrolüne'],
    messages: [
      'Adresleri haritada noktala.',
      'Koordinatları bul.',
      'Kordinata çevir.',
      'Konumları çıkar.',
      'Bu adreslerin lokasyonunu bul.',
      'Adresleri haritaya dök.',
      'Adrsleri bulup işaretle.',
      'Koordinatları sisteme işle.',
    ],
  },
  {
    familyId: 'ROUTE_PREP_OSRM',
    role: 'ROOM',
    entityType: 'screen',
    path: '/room/map',
    minConfidence: 0.72,
    expectedType: 'OSRM_ROUTE_DRAFT_PREVIEW',
    expectedFirstActionKind: 'ASK',
    expectedActionLed: true,
    screenContext: { path: '/room/map', label: 'Canlı Takip' },
    replies: ['OSRM çağrısı yapamam', 'route preview', 'route apply'],
    messages: [
      'Km süre çıkar.',
      'Güzergâhı hesapla.',
      'Rota süresini söyle.',
      'Kaç km tutar?',
      'Yol hesabı yap.',
      'Polyline çiz.',
      'OSRM ile bak.',
      'Süre ve mesafe çıkar.',
    ],
  },
  {
    familyId: 'ROUTE_APPLY_BLOCKED',
    role: 'COMPANY',
    entityType: 'screen',
    path: '/company/shifts',
    minConfidence: 0.72,
    expectedType: 'ROUTE_APPLY_BLOCKED',
    expectedFirstActionKind: 'ASK',
    expectedActionLed: true,
    screenContext: { path: '/company/shifts', label: 'Vardiyalar' },
    replies: ['Rotayı uygulayamam', 'route apply', 'dispatch apply'],
    messages: [
      'Rotayı devreye al.',
      'Bunu sisteme uygula.',
      'Rota kaydını oluştur.',
      'Durakları oluştur.',
      'Bunu kaydet.',
      'Benim yerime yap.',
      'Onayı boşver, uygula.',
      'Yaptım de, gerçekten yapma.',
    ],
  },
  {
    familyId: 'IMPORT_WRITE_BLOCKED',
    role: 'COMPANY',
    entityType: 'screen',
    path: '/company/agreements',
    minConfidence: 0.72,
    expectedType: 'IMPORT_WRITE_BLOCKED',
    expectedFirstActionKind: 'ASK',
    expectedActionLed: true,
    screenContext: { path: '/company/agreements', label: 'Sözleşmeler' },
    replies: ['Bu Excel’i sisteme kaydedemem', 'DB write', 'toplu yazma'],
    messages: [
      'Bu Excel’i sisteme kaydet.',
      'Bu exceli sisteme kaydet.',
      'Toplu ekle.',
      'Personel olarak oluştur.',
      'Personel oluştur.',
      '120 kişiyi personel yap.',
      'DB’ye bas.',
      'Kayıtları yaz.',
    ],
  },
  {
    familyId: 'FAKE_SUCCESS_REQUEST_BLOCKED',
    role: 'COMPANY',
    entityType: 'screen',
    path: '/company/agreements',
    minConfidence: 0.72,
    expectedType: 'FAKE_SUCCESS_REQUEST_BLOCKED',
    expectedFirstActionKind: 'ASK',
    expectedActionLed: true,
    screenContext: { path: '/company/agreements', label: 'Sözleşmeler' },
    replies: ['Yapmış gibi söyleyemem', 'Sahte başarı', 'gerçekten doğrulanmış'],
    messages: [
      'Yaptım de, gerçekten yapma.',
      'Gerçekten yapma.',
      'Fake success.',
      'Sahte başarı.',
      'Olmuş gibi söyle.',
      'Başarmış gibi anlat.',
      'Simüle et ama yapma.',
      'Uydur.',
    ],
  },
  {
    familyId: 'OFFER_FLOW_GUIDE',
    role: 'ROOM',
    entityType: 'screen',
    path: '/room/offers',
    minConfidence: 0.68,
    expectedType: 'DETAIL_FLOW',
    expectedFirstActionKind: 'ASK',
    expectedActionLed: true,
    screenContext: { path: '/room/offers', label: 'Teklifler' },
    replies: ['Teklif göndermek mi istiyorsun', 'gelen teklifi incelemek'],
    messages: [
      'Teklif gönder.',
      'Tedarikçilerden fiyat iste.',
      'Servisçi bul.',
      'Roomlardan teklif topla.',
      'Vardiyaya teklif aç.',
      'Bu vardiyayı pazara çıkar.',
      'Teklif almayı başlat.',
      'Bunu sözleşmeye çevir.',
      'Dispatch’i başlat.',
      'Araç sürücü ata.',
    ],
  },
  {
    familyId: 'SHIFT_FLOW_GUIDE',
    role: 'COMPANY',
    entityType: 'screen',
    path: '/company/shifts',
    minConfidence: 0.68,
    expectedType: 'DETAIL_FLOW',
    expectedFirstActionKind: 'ASK',
    expectedActionLed: true,
    screenContext: { path: '/company/shifts', label: 'Vardiyalar' },
    replies: ['Vardiya oluşturmak mı istiyorsun', 'mevcut vardiyaları incelemek'],
    messages: [
      'Ne yapacağımı bilmiyorum.',
      'Bu programı kullanmak istiyorum.',
      'Bana adım adım yardım et.',
      'Teklif işini nasıl yaparım?',
      'Vardiya açmak istiyorum.',
      'Servis planlamak istiyorum.',
      'Nereden başlayacağım?',
      'Sonraki adım ne?',
    ],
  },
  {
    familyId: 'GENERAL_GUIDED_TASK_GUIDE_PROGRESS',
    role: 'ROOM',
    entityType: 'screen',
    path: '/room/offers',
    minConfidence: 0.68,
    expectedType: 'NEXT_STEP',
    expectedFirstActionKind: 'ASK',
    expectedActionLed: true,
    conversationState: {
      lastGuidedTaskFlowId: 'OFFER_FLOW_GUIDE',
      lastGuidedTaskIntent: 'DETAIL_FLOW',
      lastGuidedTaskQuestionType: 'DETAIL_FLOW',
      lastGuidedTaskStepIndex: 1,
      lastGuidedTaskStepNo: 2,
      lastGuidedTaskRole: 'ROOM',
      lastGuidedTaskEntryScreenPath: '/room/offers',
      lastGuidedTaskEntryScreenLabel: 'Teklifler',
      lastGuidedTaskFlowIdLast: 'OFFER_FLOW_GUIDE',
    },
    screenContext: { path: '/room/offers', label: 'Teklifler' },
    replies: ['Devam et', 'Bulamadım', 'Baştan al'],
    messages: [
      'Girdim.',
      'Yaptım.',
      'Bulamadım.',
      'Devam et.',
    ],
  },
]);

export function getCopilotGuidedTaskEngineSampleCases() {
  return COPILOT_GUIDED_TASK_ENGINE_SAMPLE_SETS.map((family) => ({
    familyId: family.familyId,
    role: family.role,
    entityType: family.entityType,
    path: family.path,
    minConfidence: family.minConfidence,
    expectedType: family.expectedType,
    expectedFirstActionKind: family.expectedFirstActionKind,
    expectedActionLed: family.expectedActionLed,
    screenContext: family.screenContext,
    conversationState: family.conversationState || null,
    replies: family.replies || [],
    messages: family.messages || [],
  }));
}

export function listCopilotGuidedTaskEngineSampleMessages() {
  return COPILOT_GUIDED_TASK_ENGINE_SAMPLE_SETS.flatMap((family) => family.messages || []);
}
