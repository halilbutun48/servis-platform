import { hasExplicitRoleBoundarySignal } from './answerQualityPolicy.js';
import { firstNonEmpty, uniqueStrings } from './replyShapes.js';
import { buildConversationTaskState } from './conversationTaskState.js';
import { buildSelectedRecordText, detectRepetition } from './conversationTaskState.js';
import {
  buildClarifyingQuestionReply,
  buildDynamicQuestionChips,
  resolveClarifyingQuestionText,
  buildRiskScoringState,
} from './conversationTaskStateResponses.js';
import { buildRootCauseAssistantChips, buildRootCauseAssistantReply, buildRootCauseState } from './conversationRootCauseEngine.js';
import { buildSmartDiagnosticState } from './conversationSmartDiagnostics.js';
import { normalizeVisibleReplyFragment } from './conversationTaskStateShared.js';
import { COPILOT_REASONING_ANSWER_COMPOSER_VERSION, composeCopilotReasoningAnswer } from './copilotReasoningAnswerComposer.js';

export const SEFER_ABI_REASONING_ASSISTANT_VERSION = 'SEFER-ABI-REASONING-ASSISTANT-01';
export const SEFER_ABI_ALL_ROLES_REASONING_ASSISTANT_VERSION = 'SEFER-ABI-ALL-ROLES-REASONING-ASSISTANT-01';

export const SEFER_ABI_REASONING_ASSISTANT_MODES = Object.freeze([
  'PASS_THROUGH',
  'CONTEXTUAL_REASONING',
  'CLARIFYING_QUESTION',
  'SAFE_REFUSAL_WITH_ALTERNATIVE',
  'REPETITION_CONTROL',
]);

export const SEFER_ABI_REASONING_ASSISTANT_INTENT_FAMILIES = Object.freeze([
  'DEFAULT',
  'CONTINUE_FLOW',
  'STEP_ENTERED',
  'RESULT_CHECK',
  'ALTERNATIVE_PATH',
  'DELEGATE_SAFE',
  'OVERVIEW_START',
  'ROLE_START',
  'SCREEN_START',
  'STEP_BY_STEP',
  'FIELD_BUTTON',
]);

export const SEFER_ABI_REASONING_ASSISTANT_GUARD_REQUIREMENTS = Object.freeze([
  'role + screen + selected record + conversation state',
  'clarifying question when selection is missing',
  'safe refusal with alternative',
  'repetition control and anti-robotic phrasing',
  'no silent execution',
  'no tool execution',
  'no write-action dispatcher',
  'no DB write',
  'no AI/model/tool/write-action runtime',
]);

export const SEFER_ABI_REASONING_ASSISTANT_PUBLIC_PROMISE = Object.freeze([
  'Sefer Abi sadece açıklar, bağlar ve güvenli yön gösterir.',
  'Gerçek execute, tool call, write-action ve DB write vaadi yoktur.',
  'Belirsizlik varsa kısa netleştirme sorusu sorar.',
  'Kritik işlerde insan onayı korunur.',
  'Underpromise / overdeliver çizgisi korunur.',
]);

export const SEFER_ABI_REASONING_ASSISTANT_BLOCKED_ACTIONS = Object.freeze([
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

export const SEFER_ABI_REASONING_ASSISTANT_NEVER_AUTOMATE = Object.freeze([
  'otomatik karar ver',
  'otomatik uygula',
  'otomatik yaz',
  'otomatik oluştur',
  'otomatik geocode',
  'otomatik rota',
  'sahte başarı',
  'gerçek yapmadan yaptım deme',
]);

const SEFER_ABI_REASONING_ASSISTANT_DIRECT_REPLIES = new Set([
  'SHIFT_BLOCKED',
  'PRODUCT_OVERVIEW_HELP',
  'ROLE_EXPLANATION_HELP',
  'SCREEN_EXPLANATION_HELP',
  'HOW_TO_HELP',
  'FIELD_BUTTON_HELP',
]);

const SEFER_ABI_REASONING_ASSISTANT_NOW_LEAD_STRIP_QUESTION_TYPES = new Set([
  'SCREEN_FOCUS',
  'SCREEN_PURPOSE',
  'SCREEN_EXPLANATION_HELP',
  'PRODUCT_OVERVIEW_HELP',
  'ROLE_EXPLANATION_HELP',
]);

export const SEFER_ABI_REASONING_ASSISTANT_ROLE_PROFILES = Object.freeze({
  SUPER_ADMIN: Object.freeze({
    role: 'SUPER_ADMIN',
    label: 'Super admin',
    frame: 'Sistem açısından:',
    tone: 'stratejik',
    voice: 'audit / kalite / sistem',
    intro: 'sistem durumu, ticari akış, kalite ve audit / risk sırasını okumak için kullanılır.',
    focus: Object.freeze(['risk', 'audit', 'özet', 'kanıt']),
    starterSteps: Object.freeze(['Sistem durumu bandını aç', 'Ticari akışı kontrol et', 'Kalite / kanıt ve audit / risk kartlarını incele']),
    clarifyingQuestion: 'Hangi kayıt, risk ya da audit satırı için bakayım?',
    safeAlternative: 'Önce sistem durumu bandını ve ilgili risk kartını aç.',
    repeatLead: 'Audit açısından kısa not:',
    chips: Object.freeze(['Risk özeti', 'Kanıtı göster', 'Kritik kayıtları sırala', 'Sorumlu rol kim?']),
    maxLength: 440,
  }),
  COMPANY: Object.freeze({
    role: 'COMPANY',
    label: 'Company',
    frame: 'Şirket açısından:',
    tone: 'planlayıcı',
    voice: 'plan / teklif / sözleşme',
    intro: 'vardiya, teklif ve sözleşme akışını düzenlemek için kullanılır.',
    focus: Object.freeze(['plan', 'vardiya', 'sözleşme', 'hazırlık']),
    starterSteps: Object.freeze(['Planlama Merkezi\'ni aç', 'Teklifleri topla', 'Karşılaştırıp sözleşmeye hazırla']),
    clarifyingQuestion: 'Hangi vardiya, talep ya da sözleşme için bakayım?',
    safeAlternative: 'Önce vardiya ya da talep ekranını açıp teklifleri ve sözleşme hazırlığını kontrol et.',
    repeatLead: 'Planı netleştireyim:',
    chips: Object.freeze(['Bugünkü plan', 'Eksik veri', 'Sözleşme / vardiya', 'Hazırlık durumu']),
    maxLength: 800,
  }),
  ROOM: Object.freeze({
    role: 'ROOM',
    label: 'Room',
    frame: 'Oda açısından:',
    tone: 'operasyonel',
    voice: 'araç / sürücü / operasyon',
    intro: 'araç, sürücü ve operasyon akışını birlikte görmek için kullanılır.',
    focus: Object.freeze(['araç', 'sürücü', 'kapasite', 'kalite']),
    starterSteps: Object.freeze(['Teklifleri incele', 'Araç / sürücü uygunluğunu kontrol et', 'Kapasite ve kanıt durumuna bak']),
    clarifyingQuestion: 'Hangi kayıt için bakayım? Araç, sürücü ya da operasyon kaydı mı?',
    safeAlternative: 'Önce teklif, araç / sürücü ve kapasite satırlarını kontrol et.',
    repeatLead: 'Operasyon açısından kısa not:',
    chips: Object.freeze(['Araç / sürücü', 'Kapasite', 'Kalite / risk', 'Operasyon kontrolü']),
    maxLength: 420,
  }),
  DRIVER: Object.freeze({
    role: 'DRIVER',
    label: 'Driver',
    frame: 'Kısaca:',
    tone: 'saha',
    voice: 'saha / kısa / rota',
    intro: 'günün rotasını ve sıradaki durağı güvenli şekilde takip etmek için kullanılır.',
    focus: Object.freeze(['rota', 'check-in', 'güvenli', 'aktif durum']),
    starterSteps: Object.freeze(['Aktif rotanı aç', 'Sıradaki durağı kontrol et', 'Güvenli yerde işlem yap']),
    clarifyingQuestion: 'Hangi rota ya da durak için bakayım?',
    safeAlternative: 'Önce aktif rota ve sıradaki durak sinyalini kontrol et.',
    repeatLead: 'Kısa saha notu:',
    chips: Object.freeze(['Bugünkü rota', 'Check-in', 'Sonraki durak', 'Konum sinyali durumu']),
    maxLength: 280,
  }),
  PERSONEL: Object.freeze({
    role: 'PERSONEL',
    label: 'Personel',
    frame: 'Sade cevap:',
    tone: 'basit',
    voice: 'KVKK / güvenli takip',
    intro: 'servis durumunu ve biniş bilgisini görmek için kullanılır.',
    focus: Object.freeze(['servis', 'kişisel bilgi', 'takip', 'KVKK']),
    starterSteps: Object.freeze(['Servis durumunu / my ride ekranını aç', 'Biniş noktası ve saat bilgisini kontrol et', 'Gerekirse takip sorusuyla ilerle']),
    clarifyingQuestion: 'Hangi servis kaydı için bakayım?',
    safeAlternative: 'Önce yetkili servis durumunu ve KVKK kapsamında görünen bilgiyi birlikte kontrol et.',
    repeatLead: 'Kısa takip notu:',
    chips: Object.freeze(['Servis durumu', 'Kim görebilir?', 'Eksik bilgi', 'Sıradaki adım']),
    maxLength: 280,
  }),
  PARENT: Object.freeze({
    role: 'PARENT',
    label: 'Parent',
    frame: 'Kısa cevap:',
    tone: 'basit',
    voice: 'çocuk / güvenli takip',
    intro: 'öğrencinin servis durumunu güvenli takip etmek için kullanılır.',
    focus: Object.freeze(['çocuk', 'servis', 'takip', 'KVKK']),
    starterSteps: Object.freeze(['Yetkili öğrenci servis görünümünü aç', 'Canlı takip / servis durumu bilgisini kontrol et', 'Gerekirse bulamadım diye daralt']),
    clarifyingQuestion: 'Hangi öğrenci servisi için bakayım?',
    safeAlternative: 'Önce yetkili öğrenci servis görünümünü aç.',
    repeatLead: 'Kısa takip notu:',
    chips: Object.freeze(['Çocuğumun servisi', 'Talep durumu', 'KVKK sınırı', 'Sıradaki adım']),
    maxLength: 280,
  }),
  SCHOOL: Object.freeze({
    role: 'SCHOOL',
    label: 'School',
    frame: 'Plan ve kanıt açısından:',
    tone: 'planlayıcı',
    voice: 'yetki kapsamı / servis özeti',
    intro: 'servis kanıtı, gecikme ve yetkili okul kayıtlarını okumak için kullanılır.',
    focus: Object.freeze(['plan', 'kanıt', 'servis', 'onay']),
    starterSteps: Object.freeze(['Servis kanıtı, devam ve gecikme özetine bak', 'Yetkili okul kapsamındaki kayıtları incele', 'Gerekirse onay sorusuna geç']),
    clarifyingQuestion: 'Hangi servis kanıtı ya da okul kaydı için bakayım?',
    safeAlternative: 'Önce servis kanıtı ve gecikme özetini aç.',
    repeatLead: 'Kısa servis özeti:',
    chips: Object.freeze(['Plan', 'Kanıt', 'Onay', 'Servis düzeni']),
    maxLength: 360,
  }),
  ORGANIZATION: Object.freeze({
    role: 'ORGANIZATION',
    label: 'Organization',
    frame: 'Plan ve onay açısından:',
    tone: 'kurumsal',
    voice: 'yetki kapsamı / operasyon özeti',
    intro: 'organizasyon planı, lokasyon ve katılımcı durumunu kontrol etmek için kullanılır.',
    focus: Object.freeze(['plan', 'kanıt', 'servis', 'onay']),
    starterSteps: Object.freeze(['Organizasyon servis planını aç', 'Lokasyon / katılımcı durumunu kontrol et', 'Onay ve operasyon özetine bak']),
    clarifyingQuestion: 'Hangi plan ya da operasyon kaydı için bakayım?',
    safeAlternative: 'Önce organizasyon planı ve lokasyon durumunu kontrol et.',
    repeatLead: 'Kısa operasyon özeti:',
    chips: Object.freeze(['Plan', 'Kanıt', 'Onay', 'Servis düzeni']),
    maxLength: 360,
  }),
  DEFAULT: Object.freeze({
    role: 'DEFAULT',
    label: 'Default',
    frame: 'Kısaca:',
    tone: 'genel',
    voice: 'başlangıç yolu',
    intro: 'servis operasyonunu planlamak, takip etmek ve kanıtı okumak için kullanılır.',
    focus: Object.freeze(['durum', 'kanıt', 'sonraki adım']),
    starterSteps: Object.freeze(['Bugünkü plan / vardiya akışını aç', 'Canlı takip / servis durumuna bak', 'Kanıt / kalite / audit ekranını kontrol et']),
    clarifyingQuestion: 'Hangi kayıt için bakayım?',
    safeAlternative: 'Önce seçili kayıt ve eksik bilgiyi birlikte netleştir.',
    repeatLead: 'Kısaca farklı açıdan:',
    chips: Object.freeze(['Bu kayıt ne durumda?', 'Şimdi ne yapmalıyım?', 'Burada eksik ne olabilir?', 'Hangi ekrana geçmeliyim?']),
    maxLength: 360,
  }),
});

function normalizeText(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\\/g, '/')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function compactText(value) {
  return normalizeText(value).replace(/\s+/g, '');
}

function simpleHash(value) {
  let hash = 0;
  const text = String(value || '');
  for (let index = 0; index < text.length; index += 1) {
    hash = ((hash << 5) - hash) + text.charCodeAt(index);
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

function collapseSpaces(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function limitText(value, maxLength = 360) {
  const text = collapseSpaces(value);
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`;
}

function textIncludes(haystack, needle) {
  const left = compactText(haystack);
  const right = compactText(needle);
  if (!left || !right) return false;
  return left.includes(right);
}

function joinReply(parts, maxLength = 360) {
  return limitText(uniqueStrings((Array.isArray(parts) ? parts : []).filter(Boolean)).join(' '), maxLength);
}

function resolveRoleKey(userRole = '', user = null) {
  const role = normalizeText(firstNonEmpty(userRole, user?.role, '')).replace(/\s+/g, '').replace(/_/g, '').toUpperCase();
  const companyKind = normalizeText(firstNonEmpty(user?.companyKind, user?.companyType, '')).replace(/\s+/g, '').replace(/_/g, '').toUpperCase();
  if (role === 'COMPANY' && companyKind === 'SCHOOL') return 'SCHOOL';
  if (role === 'COMPANY' && companyKind === 'ORGANIZATION') return 'ORGANIZATION';
  if (role === 'SUPERADMIN') return 'SUPER_ADMIN';
  return role || 'DEFAULT';
}

function rowText(row) {
  if (row == null) return '';
  if (typeof row === 'string') return String(row || '').trim();
  if (typeof row !== 'object') return String(row || '').trim();
  return firstNonEmpty(row.label, row.key, row.title, row.text, row.value, row.summary, '');
}

function listRows(rows) {
  return uniqueStrings((Array.isArray(rows) ? rows : []).map((row) => rowText(row)).filter(Boolean)).slice(0, 5);
}

function profileForRole(roleKey) {
  return SEFER_ABI_REASONING_ASSISTANT_ROLE_PROFILES[roleKey] || SEFER_ABI_REASONING_ASSISTANT_ROLE_PROFILES.DEFAULT;
}

function roleExplanationSentence(roleKey) {
  const normalized = String(roleKey || '').trim().toLowerCase();
  const map = {
    company: 'teklif, sözleşme ve vardiya planını yönetirsin.',
    organization: 'teklif, sözleşme ve vardiya planını yönetirsin.',
    room: 'operasyon, sürücü ve araç akışını takip edersin.',
    driver: 'kendi rotanı, günlük görevini ve sıradaki durağı görürsün.',
    parent: 'öğrencinin servisini canlı izlersin.',
    personel: 'kendi servis akışını ve durumunu takip edersin.',
    school: 'okul tarafındaki servis ve operasyon işlerini yönetirsin.',
    super_admin: 'tüm yüzeyleri, kaliteyi ve kanıt akışını denetlersin.',
  };
  return firstNonEmpty(map[normalized], 'kendi alanına ait ekranları ve onay adımlarını görürsün.');
}

export function getSeferAbiReasoningRolePlaybook(role, user = null) {
  const roleProfile = getSeferAbiReasoningRoleProfile(role, user);
  return Object.freeze({
    ...roleProfile,
    roleSentence: roleExplanationSentence(roleProfile.role),
    starterSteps: Array.isArray(roleProfile.starterSteps) ? [...roleProfile.starterSteps] : [],
    safeAlternative: firstNonEmpty(roleProfile.safeAlternative, 'Önce seçili kayıt ve eksik bilgiyi birlikte kontrol et.'),
    clarifyingQuestion: firstNonEmpty(roleProfile.clarifyingQuestion, 'Hangi kayıt için bakayım?'),
    repeatLead: firstNonEmpty(roleProfile.repeatLead, 'Kısaca farklı açıdan:'),
    voice: firstNonEmpty(roleProfile.voice, 'başlangıç yolu'),
    intro: firstNonEmpty(roleProfile.intro, 'servis operasyonunu planlamak ve takip etmek için kullanılır.'),
  });
}

function detectSeferAbiReasoningIntentFamily({
  message = '',
  questionType = '',
  conversationState = null,
} = {}) {
  const text = normalizeText(message);
  const lastQuestionType = String(
    conversationState?.taskState?.currentQuestionType
    || conversationState?.taskState?.lastQuestionType
    || conversationState?.lastQuestionType
    || conversationState?.taskState?.currentGuidedTaskQuestionType
    || conversationState?.taskState?.lastGuidedTaskQuestionType
    || conversationState?.lastGuidedTaskQuestionType
    || conversationState?.taskState?.currentGuidedTaskIntent
    || conversationState?.taskState?.lastGuidedTaskIntent
    || conversationState?.lastGuidedTaskIntent
    || '',
  );
  if (!text) return 'DEFAULT';

  if (/(bunu\s+sen\s+yap|benim\s+yerime\s+(?:yap|uygula|işle|isle|kaydet|oluştur|olustur|ata|atama|onayla|kabul\s+et)|benim\s+ad(?:ı|i)ma\s+(?:yap|uygula|işle|isle|kaydet|oluştur|olustur|ata|atama|onayla|kabul\s+et)|sen\s+uygula|sen\s+kaydet|sen\s+oluştur|sen\s+olustur|aracı\s+ata|araci\s+ata|teklifi\s+kabul\s+et|sözleşmeyi\s+yürürlüğe\s+al|sozlesmeyi\s+yururluge\s+al)/.test(text)) return 'DELEGATE_SAFE';
  if (/(company|room|driver|parent|personel|school|organization|super\s*admin|superadmin|şirket|oda|veli|sürücü|surucu|okul|organizasyon|süper\s*admin)/.test(text) && /(ne\s+yapmam\s+lazım|ne\s+yapmam\s+gerekiyor|nereden\s+başlamalıyım|nereden\s+başlamam\s+gerekiyor|nereden\s+başlayacağım|başlangıç\s+yolu|ilk\s+adım|ilk\s+bakılacak|nasıl\s+başlayacağım|nasıl\s+başlamalıyım|buradan\s+sonra\s+ne\s+yapacağım)/.test(text)) return 'ROLE_START';
  if (/(plan\s+builder|planlama\s+merkezi|bu\s+ekran|bu\s+panel|bu\s+sayfa|bu\s+kart|ekranın\s+amacı|ekranin\s+amaci|burada\s+ne\s+yapacağım|burada\s+ne\s+yapıyorum|burada\s+ne\s+yapacağım|burada\s+ne\s+yapmalıyım|bu\s+ekran\s+ne\s+için|bu\s+ekran\s+ne\s+icin|bu\s+ekran\s+ne\s+işe\s+yarar|bu\s+ekran\s+ne\s+ise\s+yarar|bu\s+panel\s+neyi\s+gösteriyor|bu\s+panel\s+neyi\s+gosteriyor|bu\s+sayfa\s+ne\s+için|bu\s+sayfa\s+ne\s+icin)/.test(text)) return 'SCREEN_START';
  if (/(ne\s+yapmam\s+lazım|ne\s+yapmam\s+gerekiyor|nereden\s+başlamalıyım|nereden\s+başlamam\s+gerekiyor|nereden\s+başlayacağım|başlangıç\s+yolu|ilk\s+adım\s+ne|ilk\s+bakılacak|nasıl\s+başlayacağım|nasıl\s+başlamalıyım|buradan\s+sonra\s+ne\s+yapacağım)/.test(text)) return 'OVERVIEW_START';
  if (/(girdim|içine girdim|icine girdim|açtım|actim|geldim|ulaştım|ulastim|buldum\s+gibi|ekrana\s+girdim)/.test(text)) return 'STEP_ENTERED';
  if (/(yaptım|yaptim|tamamladım|tamamladim|denedim|kontrol ettim|sonucu kontrol ettim|işledim|isledim|oldu\s+mu|doğru\s+mu|dogru\s+mu)/.test(text)) return 'RESULT_CHECK';
  if (/(bulamadım|bulamadim|bulamıyorum|bulamiyorum|göremedim|goremedim|\bnerede\b|hangi\s+ekran|hangi\s+menü|hangi\s+menu|alternatif\s+yol|menü\s+yolu|menu\s+yolu)/.test(text)) return 'ALTERNATIVE_PATH';
  if (/(devam\s+et|aynı\s+kayıtta|ayni\s+kayitta|aynı\s+yerden\s+devam|ayni\s+yerden\s+devam|sürdür|surdur|buradan\s+devam|aynı\s+kayıt\s+için\s+devam|ayni\s+kayit\s+icin\s+devam)/.test(text)) return 'CONTINUE_FLOW';
  if (questionType === 'PRODUCT_OVERVIEW_HELP') return 'OVERVIEW_START';
  if (questionType === 'ROLE_EXPLANATION_HELP') return 'ROLE_START';
  if (questionType === 'SCREEN_EXPLANATION_HELP') return 'SCREEN_START';
  if (questionType === 'HOW_TO_HELP') return 'STEP_BY_STEP';
  if (questionType === 'FIELD_BUTTON_HELP') return 'FIELD_BUTTON';
  if (['NEXT_STEP', 'NEXT_SCREEN', 'GO_TO', 'FIRST_CONTROL', 'SAFE_NEXT_STEP'].includes(lastQuestionType)) return 'CONTINUE_FLOW';
  return 'DEFAULT';
}

function pickByRepeatCount(items, repeatCount = 0, role = 'DEFAULT') {
  const source = Array.isArray(items)
    ? items
    : (items && typeof items === 'object'
      ? (Array.isArray(items[role]) && items[role].length ? items[role] : (Array.isArray(items.DEFAULT) ? items.DEFAULT : []))
      : []);
  const rows = Array.isArray(source) ? source.filter(Boolean) : [];
  if (!rows.length) return '';
  const index = Math.max(0, Math.min(rows.length - 1, Number(repeatCount) || 0));
  return rows[index] || rows[0] || '';
}

function buildIntentLead(snapshot) {
  const family = String(snapshot?.interactionIntentFamily || 'DEFAULT');
  const roleProfile = snapshot?.roleProfile || profileForRole(snapshot?.effectiveRole);
  const repeatCount = Number(snapshot?.repeatCount || 0);
  const role = String(roleProfile?.role || snapshot?.effectiveRole || 'DEFAULT');
  switch (family) {
    case 'DELEGATE_SAFE':
      return pickByRepeatCount({
        SUPER_ADMIN: [
          'Bu işlemi ben uygulayamam; ama sistem durumu ve audit kontrolünü birlikte açarız.',
          'Bu adımı ben yürütmem; ama kontrol sırasını göstereyim.',
          'Bu kararı otomatik veremem; ama risk ve kanıtı birlikte sıralayalım.',
        ],
        COMPANY: [
          'Bunu senin yerine yapamam; ama teklif ve sözleşme hazırlığını adım adım gösteririm.',
          'Bu işlemi ben uygulayamam; ama plan ekranında neyi kontrol edeceğini söyleyeyim.',
          'Yürütmeyi ben üstlenemem; ama güvenli hazırlık yolunu çıkarayım.',
        ],
        ROOM: [
          'Bunu ben atayamam; ama araç, sürücü ve kapasite kontrolünü birlikte açarız.',
          'Bu adımı ben yürütmem; ama operasyon sırasını birlikte netleştiririz.',
          'İşlemi ben yapamam; ama uygun araç ve sürücü adımını göstereyim.',
        ],
        DRIVER: [
          'Bunu senin yerine işleyemem; ama güvenli saha adımını gösteririm.',
          'Bu işlemi ben yapmam; ama sıradaki durağı ve güvenli kontrolü söyleyeyim.',
          'Yürütmeyi ben alamam; ama rota üstündeki doğru kontrolü açayım.',
        ],
        PERSONEL: [
          'KVKK gereği başkasının verisini açıp işleyemem; ama yalnızca yetkili görünümü gösteririm.',
          'Bu işlemi ben yapamam; ama servis durumunu güvenli biçimde kontrol ederiz.',
          'İşlem bende kapanmaz; ama yetkili ekrandan hazırlık yolunu göstereyim.',
        ],
        PARENT: [
          'KVKK gereği başkasının öğrenci verisini açıklayamam; ama yetkili servis görünümünü kontrol ederim.',
          'Bu işlemi ben yapamam; ama çocuğunun servisi için güvenli ekran yolunu gösteririm.',
          'Yürütmeyi ben üstlenemem; ama yetkili takibi hazırlayalım.',
        ],
        SCHOOL: [
          'Bu kaydı yetki dışı uygulayamam; ama okul kapsamındaki kayıtları güvenli biçimde açarım.',
          'İşlemi ben yapmam; ama yetkili okul akışını birlikte açarız.',
          'Bu adımı ben tamamlamam; ama okul yetkisi içindeki kontrol yolunu göstereyim.',
        ],
        ORGANIZATION: [
          'Bu kaydı yetki dışı uygulayamam; ama organizasyon planı ve onay akışını gösteririm.',
          'Bu işlemi ben yapamam; ama organizasyon kapsamındaki hazırlığı açarım.',
          'Uygulamayı ben üstlenemem; ama yetki kapsamındaki plan yolunu çıkarayım.',
        ],
        DEFAULT: [
          'Bunu senin yerine yapamam; ama güvenli hazırlık yolunu göstereyim.',
          'Bu adımı benim yapmam doğru olmaz; ama nereden başlayacağını söyleyeyim.',
          'İşlemi ben üstlenemem; ama güvenli alternatif adımı çıkarayım.',
        ],
      }, repeatCount, role);
    case 'STEP_ENTERED':
      return 'Adımı aldın; şimdi sonucu ve sonraki güvenli adımı kontrol edelim.';
    case 'RESULT_CHECK':
      return 'Sonucu kontrol edelim; doğruysa bir sonraki adıma geçelim.';
    case 'ALTERNATIVE_PATH':
      return 'Bulamadığın yol için alternatif menü ve ekran yolunu bulalım.';
    case 'CONTINUE_FLOW':
      return 'Aynı bağlamı sürdürüyorum.';
    case 'OVERVIEW_START':
      return 'Önce programın ana işini netleştirelim.';
    case 'ROLE_START':
      return 'Önce rolüne göre en doğru başlangıç yolunu seçelim.';
    case 'SCREEN_START':
      return 'Önce bu ekranın amacını ve ilk kontrolünü netleştirelim.';
    case 'STEP_BY_STEP':
      return 'Adım adım ilerleyelim.';
    case 'FIELD_BUTTON':
      return 'Önce alan ya da butonu doğru okuyalım.';
    default:
      return '';
  }
}

function buildIntentClarifyingQuestion(snapshot) {
  const family = String(snapshot?.interactionIntentFamily || 'DEFAULT');
  const roleProfile = snapshot?.roleProfile || profileForRole(snapshot?.effectiveRole);
  switch (family) {
    case 'STEP_ENTERED':
      return 'Hangi ekrana girdin?';
    case 'RESULT_CHECK':
      return 'Sonucu hangi kayıt için kontrol edeyim?';
    case 'ALTERNATIVE_PATH':
      return 'Hangi menüde kaldın?';
    case 'CONTINUE_FLOW':
      return 'Aynı kayıtta mı devam edelim?';
    case 'DELEGATE_SAFE':
      return 'Hangi adımı güvenli alternatifle hazırlayayım?';
    case 'OVERVIEW_START':
      return 'Hangi roldesin?';
    case 'ROLE_START':
      return 'Rolünü netleştirir misin?';
    case 'SCREEN_START':
      return 'Hangi ekranı açtın?';
    case 'STEP_BY_STEP':
      return 'İlk hangi adımı yapmak istiyorsun?';
    case 'FIELD_BUTTON':
      return 'Hangi alan ya da buton için bakayım?';
    default:
      return firstNonEmpty(roleProfile.clarifyingQuestion, 'Hangi kayıt için bakayım?');
  }
}

function buildIntentNextAction(snapshot) {
  const family = String(snapshot?.interactionIntentFamily || 'DEFAULT');
  const roleProfile = snapshot?.roleProfile || profileForRole(snapshot?.effectiveRole);
  const starterStep = Array.isArray(roleProfile.starterSteps) ? roleProfile.starterSteps[0] : '';
  const secondStep = Array.isArray(roleProfile.starterSteps) ? roleProfile.starterSteps[1] : '';
  switch (family) {
    case 'STEP_ENTERED':
      return firstNonEmpty(snapshot?.analysis?.nextBestAction, snapshot?.nextBestAction, starterStep, 'İlk kontrolü aç.');
    case 'RESULT_CHECK':
      return firstNonEmpty(snapshot?.analysis?.nextBestAction, snapshot?.nextBestAction, 'Sonucu kontrol et.');
    case 'ALTERNATIVE_PATH':
      return firstNonEmpty(snapshot?.analysis?.nextBestAction, snapshot?.nextBestAction, 'Alternatif menü yolunu göster.');
    case 'CONTINUE_FLOW':
      return firstNonEmpty(snapshot?.analysis?.nextBestAction, snapshot?.nextBestAction, secondStep, starterStep, snapshot?.safeAlternative, 'Aynı bağlamı sürdür.');
    case 'DELEGATE_SAFE':
      return firstNonEmpty(snapshot?.roleProfile?.safeAlternative, snapshot?.safeAlternative, starterStep, 'Güvenli hazırlık adımını göster.');
    case 'OVERVIEW_START':
    case 'ROLE_START':
    case 'SCREEN_START':
    case 'STEP_BY_STEP':
    case 'FIELD_BUTTON':
      return firstNonEmpty(snapshot?.analysis?.nextBestAction, snapshot?.nextBestAction, starterStep, 'İlk kontrolü aç.');
    default:
      return firstNonEmpty(
        snapshot?.analysis?.nextBestAction,
        snapshot?.analysis?.safestNextStep,
        snapshot?.contextPriority?.bestNextAction,
        snapshot?.contextPriority?.followUpPrompt,
        snapshot?.guide?.whatToDoNow,
        snapshot?.guide?.whatToDoNext,
        '',
      );
  }
}

function buildBoundaryText(snapshot) {
  if (String(snapshot?.interactionIntentFamily || 'DEFAULT') === 'DELEGATE_SAFE') {
    return buildIntentLead(snapshot);
  }
  const boundaryBits = uniqueStrings([
    snapshot?.analysis?.compareHint || '',
    snapshot?.analysis?.reasoningLead || '',
    snapshot?.contextPriority?.roleBoundary || '',
    snapshot?.guide?.whyBlocked || '',
    snapshot?.guide?.doNotDo || '',
  ]);
  return boundaryBits[0] || '';
}

function buildReasoningLead(snapshot) {
  return firstNonEmpty(
    buildIntentLead(snapshot),
    snapshot?.analysis?.reasoningLead,
    snapshot?.contextPriority?.summaryLead,
    snapshot?.contextPriority?.selectedRecordMismatchLead,
    snapshot?.analysis?.nextBestAction,
    snapshot?.analysis?.safestNextStep,
    snapshot?.contextPriority?.bestNextAction,
    snapshot?.guide?.screenExplanation,
    snapshot?.guide?.summary,
    snapshot?.guide?.plainSummary,
    '',
  );
}

function buildNextAction(snapshot) {
  return firstNonEmpty(
    buildIntentNextAction(snapshot),
    snapshot?.analysis?.nextBestAction,
    snapshot?.analysis?.safestNextStep,
    snapshot?.contextPriority?.bestNextAction,
    snapshot?.contextPriority?.followUpPrompt,
    snapshot?.guide?.whatToDoNow,
    snapshot?.guide?.whatToDoNext,
    '',
  );
}

function buildClarifyingQuestion(snapshot) {
  const profile = snapshot?.roleProfile || profileForRole(snapshot?.effectiveRole);
  return firstNonEmpty(
    resolveClarifyingQuestionText({
      ...snapshot,
      roleClarifyingQuestion: profile.clarifyingQuestion,
    }),
    buildIntentClarifyingQuestion(snapshot),
    snapshot?.guidedTaskMeta?.clarificationQuestion,
    snapshot?.contextPriority?.guidedTaskMeta?.clarificationQuestion,
    profile.clarifyingQuestion,
    'Hangi kayıt için bakayım?',
  );
}

function detectDangerRequest(snapshot) {
  const text = normalizeText(firstNonEmpty(snapshot?.message, snapshot?.rawReply, ''));
  if (!text) return false;
  return Boolean(
    snapshot?.explicitBoundary
    || snapshot?.analysis?.blockers?.some((row) => /fake success|sahte|yapmış gibi|yapmis gibi|gerçekten yapma|gercekten yapma/i.test(String(row || '')))
    || snapshot?.analysis?.missingData?.some((row) => /fake success|sahte/i.test(String(row || '')))
    || /(fake success|sahte başarı|sahte basari|yapmış gibi|yapmis gibi|yaptım de|yaptim de|gerçekten yapma|gercekten yapma|otomatik .*?(oluştur|olustur|uygula|yap)|db write|write-action|tool execution|runtime ai action|osrm call|geocode execute|route apply|dispatch apply|bunu\s+sen\s+yap|benim\s+yerime\s+(?:yap|uygula|işle|isle|kaydet|oluştur|olustur|ata|atama|onayla|kabul\s+et)|benim\s+ad(?:ı|i)ma\s+(?:yap|uygula|işle|isle|kaydet|oluştur|olustur|ata|atama|onayla|kabul\s+et)|teklifi\s+kabul\s+et|aracı\s+ata|araci\s+ata|sözleşmeyi\s+yürürlüğe\s+al|sozlesmeyi\s+yururluge\s+al|sözleşmeyi\s+uygula|sozlesmeyi\s+uygula)/i.test(text)
    || /(^|[\s:])(?:otomatik|auto)(?:[\s:]+.*)?(?:oluştur|olustur|uygula|yap|ekle|kaydet)/i.test(text)
  );
}

function buildSuggestedChips(snapshot) {
  const profile = snapshot?.roleProfile || profileForRole(snapshot?.effectiveRole);
  const roleChips = Array.isArray(profile.chips) ? profile.chips : [];
  const contextualChips = [];
  const rootCauseChips = Array.isArray(snapshot?.rootCauseChips) ? snapshot.rootCauseChips : [];
  const dynamicChips = buildDynamicQuestionChips({
    message: firstNonEmpty(snapshot?.message, snapshot?.rawMessage, ''),
    currentReply: snapshot?.rawReply || '',
    questionType: snapshot?.questionType || '',
    screenPath: snapshot?.screenPath || '',
    screenDefinition: snapshot?.screenDefinition || null,
    screenContext: snapshot?.screenContext || null,
    sourceScreenDefinition: snapshot?.sourceScreenDefinition || null,
    sourceScreenContext: snapshot?.sourceScreenContext || null,
    conversationState: snapshot?.conversationState || null,
    contextPriority: snapshot?.contextPriority || null,
    roleMode: snapshot?.roleMode || '',
    userRole: snapshot?.effectiveRole || snapshot?.userRole || '',
    user: snapshot?.user || null,
    analysis: snapshot?.analysis || null,
  });
  const family = String(snapshot?.interactionIntentFamily || 'DEFAULT');
  if (family === 'CONTINUE_FLOW') contextualChips.push('Devam et');
  if (family === 'STEP_ENTERED') contextualChips.push('İlk kontrolü göster');
  if (family === 'RESULT_CHECK') contextualChips.push('Sonucu kontrol et');
  if (family === 'ALTERNATIVE_PATH') contextualChips.push('Alternatif yolu göster');
  if (family === 'DELEGATE_SAFE') contextualChips.push('Önce şunu kontrol et');
  if (['OVERVIEW_START', 'ROLE_START', 'SCREEN_START', 'STEP_BY_STEP', 'FIELD_BUTTON'].includes(family)) contextualChips.push('Başlangıç adımını aç');
  if (snapshot?.analysis?.nextBestAction) contextualChips.push('Sıradaki adımı göster');
  if (snapshot?.analysis?.blockers?.length) contextualChips.push('Neden takıldı?');
  if (rootCauseChips.length) contextualChips.push(...rootCauseChips);
  if (Array.isArray(snapshot?.riskScoringChips) && snapshot.riskScoringChips.length && ['RISK_LIST', 'SCREEN_RISKS'].includes(String(snapshot?.questionType || ''))) {
    contextualChips.push(...snapshot.riskScoringChips);
  }
  if (snapshot?.selectedRecordStatus) contextualChips.push('Seçili kayıt özetini göster');
  if (snapshot?.clarifyingQuestion) contextualChips.push(snapshot.clarifyingQuestion);
  if (snapshot?.mode === 'SAFE_REFUSAL_WITH_ALTERNATIVE') contextualChips.push('Önce şunu kontrol et');
  return uniqueStrings([...(dynamicChips || []), ...(contextualChips || []), ...(roleChips || [])]).slice(0, snapshot?.roleMode === 'SIMPLE' ? 3 : 5);
}

function buildSharedScreenPrefix(snapshot) {
  const screenPath = firstNonEmpty(
    snapshot?.sourceScreenDefinition?.path,
    snapshot?.sourceScreenContext?.path,
    snapshot?.screenContext?.path,
    snapshot?.screenPath,
    '',
  );
  if (!String(screenPath || '').includes('/shared/')) return '';
  if (String(screenPath || '').includes('/shared/feedback')) return 'Geri Bildirim ekranı:';
  if (String(screenPath || '').includes('/shared/kvkk')) return 'KVKK ekranı:';
  if (String(screenPath || '').includes('/shared/notifications')) return 'Bildirimler ekranı:';
  if (String(screenPath || '').includes('/shared/logs')) return 'Log Dışa Aktarımı ekranı:';
  const screenLabel = firstNonEmpty(snapshot?.screenLabel, '');
  return screenLabel ? `${screenLabel} ekranı:` : '';
}

function normalizeVisibleList(values) {
  return uniqueStrings((Array.isArray(values) ? values : [values]).map((value) => normalizeVisibleReplyFragment(value)).filter(Boolean));
}

function normalizeVisibleLocationTerminology(value) {
  return normalizeVisibleReplyFragment(value)
    .replace(/\bSon\s+GPS\b/gi, 'Son konum bilgisi')
    .replace(/\bLast\s+GPS\b/gi, 'Son konum bilgisi')
    .trim();
}

function normalizeVisibleLocationSurfaceValue(value) {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map((item) => normalizeVisibleLocationSurfaceValue(item));
  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, normalizeVisibleLocationSurfaceValue(item)]),
    );
  }
  if (typeof value !== 'string') return value;
  return normalizeVisibleLocationTerminology(value);
}

export function listSeferAbiReasoningRoles() {
  return Object.keys(SEFER_ABI_REASONING_ASSISTANT_ROLE_PROFILES).filter((role) => role !== 'DEFAULT');
}

export function getSeferAbiReasoningRoleProfile(role, user = null) {
  return profileForRole(resolveRoleKey(role, user));
}

export function buildSeferAbiReasoningAssistantContextSnapshot({
  rawReply = '',
  message = '',
  questionType = '',
  replyMode = '',
  guide = null,
  roleMode = 'OPERATIONS',
  userRole = '',
  user = null,
  screenPath = '',
  screenDefinition = null,
  screenContext = null,
  sourceScreenDefinition = null,
  sourceScreenContext = null,
  analysis = null,
  contextPriority = null,
  conversationState = null,
  guidedTaskMeta = null,
  entityType = 'screen',
  context = null,
  reasoningAssistantFlavor = 'standalone',
} = {}) {
  const effectiveRole = resolveRoleKey(userRole, user);
  const roleProfile = getSeferAbiReasoningRoleProfile(effectiveRole, user);
  const normalizedMessage = normalizeText(message);
  const selectedFieldLines = listRows(screenContext?.selectedFields);
  const selectedBadgeLines = listRows(screenContext?.selectedBadges);
  const selectedSignalLines = listRows(screenContext?.selectedSignals);
  const selectedRecordStatus = buildSelectedRecordText({
    screenContext,
    analysis,
    contextPriority,
  });
  const taskState = buildConversationTaskState({
    message,
    rawMessage: message,
    questionType,
    conversationState,
    screenContext,
    sourceScreenContext,
    screenDefinition,
    sourceScreenDefinition,
    guidedTaskMeta,
    contextPriority,
    analysis,
    roleMode,
    userRole,
    entityType,
    screenPath,
  });
  const smartDiagnosticState = buildSmartDiagnosticState({
    message,
    currentReply: rawReply,
    questionType,
    screenPath,
    screenDefinition,
    screenContext,
    sourceScreenDefinition,
    sourceScreenContext,
    conversationState,
    contextPriority,
    analysis,
    roleMode,
    userRole,
    user,
    guidedTaskMeta,
    context,
    entityType,
  });
  const riskScoringState = buildRiskScoringState({
    message,
    currentReply: rawReply,
    questionType,
    screenPath,
    screenDefinition,
    screenContext,
    sourceScreenDefinition,
    sourceScreenContext,
    conversationState,
    contextPriority,
    analysis,
    roleMode,
    userRole,
    user,
    guidedTaskMeta,
    context,
    entityType,
  });
  const rootCauseArgs = {
    message,
    currentReply: rawReply,
    questionType,
    screenPath,
    screenDefinition,
    screenContext,
    sourceScreenDefinition,
    sourceScreenContext,
    conversationState,
    contextPriority,
    analysis,
    roleMode,
    userRole,
    user,
    guidedTaskMeta,
    context,
    entityType,
  };
  const rootCauseState = buildRootCauseState(rootCauseArgs);
  const rootCauseReply = buildRootCauseAssistantReply(rootCauseArgs);
  const rootCauseChips = buildRootCauseAssistantChips(rootCauseArgs);
  const interactionIntentFamily = detectSeferAbiReasoningIntentFamily({ message, questionType, conversationState });
  const reasoningLead = buildReasoningLead({ analysis, contextPriority, guide, interactionIntentFamily, roleProfile, effectiveRole });
  const nextBestAction = buildNextAction({ analysis, contextPriority, guide, interactionIntentFamily, roleProfile, effectiveRole });
  const boundaryText = buildBoundaryText({ analysis, contextPriority, guide, interactionIntentFamily, roleProfile, effectiveRole });
  const clarifyingQuestion = buildClarifyingQuestion({ guidedTaskMeta, contextPriority, roleProfile, interactionIntentFamily });
  const previousTaskState = firstNonEmpty(
    taskState?.anchorLabel,
    taskState?.selectedSummary,
    taskState?.selectedLabel,
    taskState?.lastSelectedLabel,
    taskState?.lastPrimaryConcern,
    taskState?.currentPrimaryConcern,
    conversationState?.lastSelectedLabel,
    conversationState?.lastSelectedSummary,
    conversationState?.lastGuidedTaskQuestionType,
    conversationState?.lastQuestionType,
    '',
  );
  const lastAssistantAnswerType = firstNonEmpty(
    conversationState?.lastReasoningAssistantMode,
    conversationState?.lastReasoningMode,
    '',
  );
  const userProgressCommand = ['STEP_ENTERED', 'RESULT_CHECK', 'ALTERNATIVE_PATH', 'CONTINUE_FLOW', 'DELEGATE_SAFE'].includes(String(interactionIntentFamily || ''))
    ? String(interactionIntentFamily || '')
    : '';
  const explicitBoundary = hasExplicitRoleBoundarySignal({
    questionType,
    activeTopic: contextPriority?.activeTopic || questionType,
    message,
  }) || detectDangerRequest({
    message,
    rawReply,
    analysis,
  });
  const selectedContextPresent = Boolean(
    selectedRecordStatus
    || taskState?.selectedRecordStatus
    || taskState?.selectedSummary
    || taskState?.anchorLabel
    || selectedFieldLines.length
    || selectedBadgeLines.length
    || selectedSignalLines.length
    || screenContext?.selectedLabel
    || screenContext?.selectedSummary
    || analysis?.selectedRecordStatus
  );
  const fingerprintSource = [
    effectiveRole,
    roleMode,
    String(screenPath || ''),
    String(questionType || ''),
    String(replyMode || ''),
    selectedRecordStatus,
    selectedFieldLines.join(' | '),
    selectedBadgeLines.join(' | '),
    selectedSignalLines.join(' | '),
    String(taskState?.anchorLabel || ''),
    String(taskState?.selectedSummary || ''),
    String(taskState?.selectedRecordStatus || ''),
    String(taskState?.currentQuestionType || ''),
    String(taskState?.currentGuidedTaskQuestionType || ''),
    String(taskState?.currentGuidedTaskFlowId || ''),
    String(taskState?.currentGuidedTaskProgressCommand || ''),
    String(taskState?.currentPrimaryConcern || ''),
    String(taskState?.currentUserMessage || ''),
    String(taskState?.currentRawUserMessage || ''),
    normalizedMessage,
    String(conversationState?.lastReasoningFingerprint || ''),
    String(conversationState?.lastReasoningMode || ''),
    String(conversationState?.lastUserMessage || ''),
    String(conversationState?.lastRawUserMessage || ''),
    String(contextPriority?.summaryLead || ''),
    String(contextPriority?.selectedRecordMismatchLead || ''),
    String(contextPriority?.bestNextAction || ''),
    String(analysis?.reasoningLead || ''),
    String(analysis?.nextBestAction || ''),
    String(interactionIntentFamily || ''),
  ].join('|');
  const fingerprint = simpleHash(fingerprintSource);
  const repeatCount = detectRepetition({ conversationState, fingerprint, normalizedMessage, message });
  const hasReasoningSignal = Boolean(
    explicitBoundary
    || repeatCount > 0
    || selectedContextPresent
    || taskState?.isFollowUp
    || reasoningLead
    || nextBestAction
    || boundaryText
    || interactionIntentFamily !== 'DEFAULT'
    || guidedTaskMeta?.familyId
    || contextPriority?.guidedTaskMeta?.familyId
    || contextPriority?.needsSelection
    || contextPriority?.sameRecordLikely
    || contextPriority?.selectedRecordMismatchLead
    || contextPriority?.evidenceConfidence
    || analysis?.blockers?.length
    || analysis?.missingData?.length
    || analysis?.evidence?.length
    || Boolean(riskScoringState?.isRiskScoring)
    || Boolean(rootCauseReply)
    || rootCauseState?.hasRootCauseContext
    || smartDiagnosticState?.isDiagnostic
  );
  const mode = detectSeferAbiReasoningMode({
    explicitBoundary,
    repeatCount,
    hasReasoningSignal,
    selectedContextPresent,
    clarifyingQuestion,
    reasoningLead,
    nextBestAction,
    effectiveRole,
    roleMode,
    questionType,
    message,
    analysis,
    contextPriority,
    screenPath,
    screenDefinition,
    screenContext,
    sourceScreenDefinition,
    sourceScreenContext,
  });
  return Object.freeze({
    assistantVersion: SEFER_ABI_REASONING_ASSISTANT_VERSION,
    assistantMilestone: SEFER_ABI_ALL_ROLES_REASONING_ASSISTANT_VERSION,
    mode,
    effectiveRole,
    roleProfile,
    roleMode,
    interactionIntentFamily,
    questionType: String(questionType || ''),
    replyMode: String(replyMode || ''),
    entityType: String(entityType || 'screen'),
    screenPath: String(screenPath || ''),
    screenLabel: firstNonEmpty(screenDefinition?.label, screenContext?.label, sourceScreenDefinition?.label, sourceScreenContext?.label, ''),
    message: String(message || ''),
    normalizedMessage,
    rawReply: String(rawReply || ''),
    selectedRecordStatus: normalizeVisibleReplyFragment(selectedRecordStatus),
    selectedFieldLines: normalizeVisibleList(selectedFieldLines),
    selectedBadgeLines: normalizeVisibleList(selectedBadgeLines),
    selectedSignalLines: normalizeVisibleList(selectedSignalLines),
    selectedContextPresent,
    reasoningLead: normalizeVisibleReplyFragment(reasoningLead),
    nextBestAction: normalizeVisibleReplyFragment(nextBestAction),
    boundaryText: normalizeVisibleReplyFragment(boundaryText),
    clarifyingQuestion: normalizeVisibleReplyFragment(clarifyingQuestion),
    previousTaskState,
    lastAssistantAnswerType,
    userProgressCommand,
    safetyBoundary: normalizeVisibleReplyFragment(firstNonEmpty(boundaryText, roleProfile.safeAlternative, '')),
    reasoningAnswerComposerVersion: COPILOT_REASONING_ANSWER_COMPOSER_VERSION,
    safeAlternative: normalizeVisibleReplyFragment(firstNonEmpty(
      roleProfile.safeAlternative,
      contextPriority?.followUpPrompt,
      interactionIntentFamily === 'DELEGATE_SAFE' ? nextBestAction : '',
      nextBestAction,
      'Önce seçili kayıt ve eksik alanı birlikte kontrol edelim.',
    )),
    explicitBoundary,
    fingerprint,
    repeatCount,
    hasReasoningSignal,
    guide,
    analysis,
    contextPriority,
    conversationState,
    guidedTaskMeta,
    user,
    context,
    reasoningAssistantFlavor,
    sourceScreenDefinition,
    sourceScreenContext,
    taskState,
    rootCauseState,
    rootCauseTheme: rootCauseState?.theme || '',
    rootCauseReply: normalizeVisibleReplyFragment(rootCauseReply),
    assistantReply: normalizeVisibleReplyFragment(firstNonEmpty(rootCauseReply, String(rawReply || ''))),
    rootCauseChips: normalizeVisibleList(rootCauseChips),
    riskScoringState,
    riskScoringTheme: riskScoringState?.theme || '',
    riskScoringReply: normalizeVisibleReplyFragment(riskScoringState?.reply || ''),
    riskScoringChips: normalizeVisibleList(riskScoringState?.chips || []),
    smartDiagnosticState,
    smartDiagnosticTheme: smartDiagnosticState?.theme || '',
    smartDiagnosticReply: normalizeVisibleReplyFragment(firstNonEmpty(rootCauseReply, smartDiagnosticState?.reply, '')),
    smartDiagnosticChips: normalizeVisibleList(smartDiagnosticState?.chips || []),
    suggestedChips: normalizeVisibleList(buildSuggestedChips({
      roleMode,
      effectiveRole,
      questionType,
      selectedRecordStatus,
      clarifyingQuestion,
      analysis,
      mode,
      roleProfile,
      interactionIntentFamily,
      rootCauseChips,
    })),
    contextualSuggestedChips: normalizeVisibleList(String(screenPath || '').includes('/parent/live') && String(effectiveRole || '').toUpperCase() === 'PARENT'
      ? ['Son GPS ne zaman geldi?', 'ETA nedir?', 'Araç bağlantısı var mı?', 'Sürücünün telefon GPS’i devrede mi?']
      : buildSuggestedChips({
        roleMode,
        effectiveRole,
        questionType,
        selectedRecordStatus,
        clarifyingQuestion,
        analysis,
        mode,
        roleProfile,
        interactionIntentFamily,
        rootCauseChips,
      })),
  });
}

function looksLikeRoomShiftClarifyingQuestion(snapshot = {}) {
  const role = String(firstNonEmpty(snapshot?.effectiveRole, snapshot?.roleProfile?.role, '')).toLowerCase();
  if (role !== 'room') return false;
  const screenPath = String(firstNonEmpty(snapshot?.sourceScreenDefinition?.path, snapshot?.sourceScreenContext?.path, snapshot?.screenContext?.path, snapshot?.screenPath, '')).toLowerCase();
  if (!screenPath.includes('/room/shifts')) return false;
  const text = normalizeText(firstNonEmpty(snapshot?.message, snapshot?.rawMessage, ''));
  return /(?:ilgili\s+durumu\s+sor|netleştirmek\s+için\s+ne\s+sorars[ıi]n|netlestirmek\s+icin\s+ne\s+sorars[ıi]n|eksik\s+bilgi\s+ne)/.test(text);
}

export function detectSeferAbiReasoningMode(snapshot = {}) {
  if (snapshot.explicitBoundary) return 'SAFE_REFUSAL_WITH_ALTERNATIVE';
  if (snapshot.repeatCount > 0) return 'REPETITION_CONTROL';
  const hasGuidedTaskMeta = Boolean(snapshot.guidedTaskMeta?.familyId || snapshot.contextPriority?.guidedTaskMeta?.familyId);
  const roleProfile = snapshot?.roleProfile || profileForRole(snapshot?.effectiveRole);
  const clarifyingPrompt = resolveClarifyingQuestionText({
    ...snapshot,
    roleClarifyingQuestion: roleProfile.clarifyingQuestion,
  });
  if (!hasGuidedTaskMeta && (clarifyingPrompt || looksLikeRoomShiftClarifyingQuestion(snapshot))) return 'CLARIFYING_QUESTION';
  if (snapshot.hasReasoningSignal) return 'CONTEXTUAL_REASONING';
  return 'PASS_THROUGH';
}

function composeReasoningLead(snapshot) {
  const roleProfile = snapshot?.roleProfile || profileForRole(snapshot?.effectiveRole);
  const smartDiagnosticReply = firstNonEmpty(snapshot?.smartDiagnosticReply, snapshot?.smartDiagnosticState?.reply, '');
  if (smartDiagnosticReply) return smartDiagnosticReply;
  const selectedRecordStatus = snapshot?.selectedRecordStatus || '';
  const reasoningLead = snapshot?.reasoningLead || '';
  const nextBestAction = snapshot?.nextBestAction || '';
  const boundaryText = snapshot?.boundaryText || '';
  const rawReply = limitText(snapshot?.assistantReply || snapshot?.rawReply || '', roleProfile.maxLength);
  const screenPurposeText = firstNonEmpty(
    snapshot?.guide?.plainSummary,
    snapshot?.guide?.summary,
    snapshot?.screenContext?.menuPurpose,
    snapshot?.screenDefinition?.menuPurpose,
    snapshot?.sourceScreenContext?.menuPurpose,
    snapshot?.screenContext?.helpContextSummary,
    snapshot?.screenDefinition?.summary,
    '',
  );
  const firstControlText = firstNonEmpty(
    snapshot?.screenDefinition?.firstStep,
    snapshot?.screenContext?.firstStep,
    snapshot?.guide?.firstStep,
    '',
  );
  const needsPrefix = !textIncludes(rawReply, roleProfile.frame);
  const simpleRoleMode = String(snapshot?.roleMode || '').toUpperCase() === 'SIMPLE';
  const hasGuidedTask = Boolean(
    snapshot?.guidedTaskMeta?.familyId
    || snapshot?.contextPriority?.guidedTaskMeta?.familyId
    || ['CONTRACT_TO_SHIFT', 'CONTRACT_SHIFT_TODAY'].includes(String(snapshot?.questionType || '')),
  );
  const contractWorkflowQuestion = ['CONTRACT_TO_SHIFT', 'CONTRACT_SHIFT_TODAY'].includes(String(snapshot?.questionType || ''));
  const avoidNowLead = SEFER_ABI_REASONING_ASSISTANT_NOW_LEAD_STRIP_QUESTION_TYPES.has(String(snapshot?.questionType || ''));
  if (String(snapshot?.questionType || '') === 'SCREEN_PURPOSE') {
    const parts = [];
    const normalizedScreenPurposeText = String(firstNonEmpty(screenPurposeText, '')).trim();
    const screenPurposeSentence = normalizedScreenPurposeText
      ? firstNonEmpty(normalizedScreenPurposeText.split(/(?<=[.!?])\s+/)[0], normalizedScreenPurposeText)
      : '';
    const screenPurposeLead = screenPurposeSentence
      ? (/^Bu (ekran|program|bilgi|rolde|yardım|yardim)/i.test(screenPurposeSentence)
        ? screenPurposeSentence
        : `Bu ekran, ${screenPurposeSentence}`)
      : 'Bu ekran yardım için kullanılır.';
    if (screenPurposeLead) parts.push(screenPurposeLead);
    if (firstControlText) parts.push(`İlk bakılacak yer: ${String(firstControlText).trim()}`);
    if (selectedRecordStatus) parts.push(`Seçili kayıt: ${selectedRecordStatus}.`);
    if (reasoningLead && !textIncludes(screenPurposeLead, reasoningLead)) parts.push(reasoningLead);
    if (nextBestAction && !textIncludes(screenPurposeLead, nextBestAction)) parts.push(avoidNowLead ? nextBestAction : `Şimdi: ${nextBestAction}`);
    if (boundaryText && !textIncludes(screenPurposeLead, boundaryText)) parts.push(boundaryText);
  if (roleProfile.role === 'PERSONEL' && !textIncludes(screenPurposeLead, 'KVKK')) parts.push('Odak: KVKK.');
  if (roleProfile.role === 'PARENT' && !textIncludes(screenPurposeLead, 'çocuk')) parts.push('Odak: çocuk.');
  const lead = joinReply(parts, roleProfile.maxLength);
  const contractLead = contractWorkflowQuestion && lead && !textIncludes(lead, 'Şimdi:')
    ? `Şimdi: ${lead}`
    : lead;
  return contractLead ? `${contractLead} ${rawReply}`.trim() : rawReply;
}
  const prefix = needsPrefix
    ? (simpleRoleMode ? (avoidNowLead ? roleProfile.frame : 'Şimdi:') : (hasGuidedTask ? (avoidNowLead ? roleProfile.frame : 'Şimdi:') : roleProfile.frame))
    : '';
  const parts = [];
  if (prefix) parts.push(prefix);
  const prioritizeSelectedRecordStatus = ['PAYMENT_READINESS', 'PAYMENT_MISSING'].includes(String(snapshot?.questionType || '')) && selectedRecordStatus;
  if (prioritizeSelectedRecordStatus) parts.push(`Seçili kayıt: ${selectedRecordStatus}.`);
  const sharedScreenPrefix = buildSharedScreenPrefix(snapshot);
  if (sharedScreenPrefix) parts.push(sharedScreenPrefix);
  if (!prioritizeSelectedRecordStatus && selectedRecordStatus && !textIncludes(rawReply, selectedRecordStatus)) parts.push(`Seçili kayıt: ${selectedRecordStatus}.`);
  if (reasoningLead && !textIncludes(rawReply, reasoningLead)) parts.push(reasoningLead);
  if (nextBestAction && !textIncludes(rawReply, nextBestAction)) {
    parts.push(
      String(snapshot?.questionType || '') === 'NEXT_BEST_ACTION'
        ? `Sıradaki doğru işlem: ${nextBestAction}`
        : (avoidNowLead ? nextBestAction : `Şimdi: ${nextBestAction}`),
    );
  }
  if (boundaryText && !textIncludes(rawReply, boundaryText)) parts.push(boundaryText);
  if (roleProfile.role === 'PERSONEL' && !textIncludes(rawReply, 'KVKK')) parts.push('Odak: KVKK.');
  if (roleProfile.role === 'PARENT' && !textIncludes(rawReply, 'çocuk')) parts.push('Odak: çocuk.');
  const lead = joinReply(parts, roleProfile.maxLength);
  return lead ? `${lead} ${rawReply}`.trim() : rawReply;
}

export function composeSeferAbiReasoningReply(snapshot = {}) {
  const roleProfile = snapshot?.roleProfile || profileForRole(snapshot?.effectiveRole);
  const rawReply = limitText(snapshot?.assistantReply || snapshot?.rawReply || '', roleProfile.maxLength);
  if (!rawReply && !snapshot?.hasReasoningSignal && !snapshot?.explicitBoundary && !snapshot?.clarifyingQuestion) return '';

  if (String(snapshot?.questionType || '') === 'FAKE_SUCCESS_REQUEST_BLOCKED') {
    const screenLead = `Şu an ${firstNonEmpty(snapshot?.screenLabel, snapshot?.screenContext?.label, snapshot?.sourceScreenContext?.label, 'bu ekran')} ekranındasın.`;
    return joinReply([
      'Şimdi: Yapmış gibi söyleyemem.',
      screenLead,
      'Sahte başarı üretmem; yalnızca gerçekten doğrulanmış sinyali paylaşırım.',
      'Yapabileceğim güvenli şeyler: gerçekten yapılanı, eksik kalanları ve sonraki doğru adımı açıkça ayırmak.',
      `Önce şunu kontrol et: ${firstNonEmpty(snapshot?.safeAlternative, roleProfile.safeAlternative, 'Önce seçili kayıt ve eksik bilgiyi birlikte kontrol edelim.')}`,
    ], roleProfile.maxLength);
  }

  if (String(snapshot?.questionType || '') === 'ROUTE_APPLY_BLOCKED') {
    const screenLead = `Şu an ${firstNonEmpty(snapshot?.screenLabel, snapshot?.screenContext?.label, snapshot?.sourceScreenContext?.label, 'bu ekran')} ekranındasın.`;
    return joinReply([
      'Şimdi: Rotayı uygulayamam.',
      screenLead,
      'route apply, dispatch apply ve günlük atamaya işleme kapalı.',
      'Yapabileceğim güvenli şeyler: preview, risk özeti, insan onayı ve geri alma notunu kontrol etmek.',
      `Önce şunu kontrol et: ${firstNonEmpty(snapshot?.safeAlternative, roleProfile.safeAlternative, 'Önce preview, risk özeti ve onay durumunu kontrol et.')}`,
    ], roleProfile.maxLength);
  }

  if (String(snapshot?.questionType || '') === 'IMPORT_WRITE_BLOCKED') {
    const screenLead = `Şu an ${firstNonEmpty(snapshot?.screenLabel, snapshot?.screenContext?.label, snapshot?.sourceScreenContext?.label, 'bu ekran')} ekranındasın.`;
    return joinReply([
      'Şimdi: Bu Excel’i sisteme kaydedemem.',
      screenLead,
      'Toplu yazma, DB write ve personel oluşturma kapalı.',
      'Yapabileceğim güvenli şeyler: eksik kolonları bulmak, KVKK sınırını kontrol etmek ve insan onayı checklist’i hazırlamak.',
      `Önce şunu kontrol et: ${firstNonEmpty(snapshot?.safeAlternative, roleProfile.safeAlternative, 'Önce eksik kolonları ve insan onayını kontrol et.')}`,
    ], roleProfile.maxLength);
  }

  if (String(snapshot?.questionType || '') === 'ROUTE_REVIEW_HUMAN_APPROVAL') {
    const screenLead = `Şu an ${firstNonEmpty(snapshot?.screenLabel, snapshot?.screenContext?.label, snapshot?.sourceScreenContext?.label, 'bu ekran')} ekranındasın.`;
    return joinReply([
      'Şimdi: Bu rota için gerçek uygulama başlatamam.',
      screenLead,
      'Önce insan onayı gerekir; ben yalnızca preview ve risk özeti okuyabilirim.',
      'Yapabileceğim güvenli şeyler: preview, risk özeti, geri alma notu ve onay durumunu kontrol etmek.',
      `Önce şunu kontrol et: ${firstNonEmpty(snapshot?.safeAlternative, roleProfile.safeAlternative, 'Önce preview, risk özeti ve onay durumunu kontrol et.')}`,
    ], roleProfile.maxLength);
  }

  if (snapshot.mode === 'SAFE_REFUSAL_WITH_ALTERNATIVE') {
    return joinReply([
      firstNonEmpty(snapshot?.boundaryText, buildIntentLead(snapshot), 'Bu işlemi burada yapamam.'),
      `Önce şunu kontrol et: ${firstNonEmpty(snapshot?.safeAlternative, roleProfile.safeAlternative, 'Önce seçili kayıt ve eksik bilgiyi birlikte kontrol edelim.')}`,
    ], roleProfile.maxLength);
  }

  if (SEFER_ABI_REASONING_ASSISTANT_DIRECT_REPLIES.has(String(snapshot?.questionType || ''))) {
    return rawReply;
  }

  if (snapshot.mode === 'CLARIFYING_QUESTION') {
    return buildClarifyingQuestionReply({
      message: snapshot?.message,
      questionType: snapshot?.questionType,
      screenPath: snapshot?.screenPath,
      screenDefinition: snapshot?.screenDefinition,
      screenContext: snapshot?.screenContext,
      sourceScreenDefinition: snapshot?.sourceScreenDefinition,
      sourceScreenContext: snapshot?.sourceScreenContext,
      contextPriority: snapshot?.contextPriority,
      roleClarifyingQuestion: firstNonEmpty(snapshot?.clarifyingQuestion, roleProfile.clarifyingQuestion, 'Hangi kayıt için bakayım?'),
      preferRoleClarifyingQuestion: String(snapshot?.reasoningAssistantFlavor || 'standalone') !== 'helpComposer'
        && String(snapshot?.effectiveRole || '').toUpperCase() === 'ROOM'
        && !Boolean(snapshot?.selectedContextPresent),
      safeAlternative: firstNonEmpty(snapshot?.safeAlternative, roleProfile.safeAlternative, 'Önce seçili kayıt ve eksik alanı birlikte kontrol edelim.'),
      userRole: snapshot?.userRole,
      user: snapshot?.user,
      conversationState: snapshot?.conversationState,
    });
  }

  if (snapshot.mode === 'REPETITION_CONTROL') {
    return joinReply([
      'Kısaca farklı açıdan:',
      roleProfile.repeatLead,
      snapshot?.selectedRecordStatus ? `Seçili kayıt: ${snapshot.selectedRecordStatus}.` : '',
      firstNonEmpty(snapshot?.reasoningLead, snapshot?.nextBestAction, ''),
      rawReply,
    ], roleProfile.maxLength);
  }

  if (snapshot.mode === 'CONTEXTUAL_REASONING') {
    return composeReasoningLead(snapshot);
  }

  return rawReply;
}

export function buildSeferAbiReasoningAssistant(options = {}) {
  const snapshot = buildSeferAbiReasoningAssistantContextSnapshot(options);
  const rawReply = composeSeferAbiReasoningReply(snapshot);
  const roomMapLocationHelp = String(snapshot?.questionType || '') === 'LOCATION_HELP'
    && /\/room\/map\b/.test(normalizeText(firstNonEmpty(
      snapshot?.screenPath,
      snapshot?.screenContext?.path,
      snapshot?.sourceScreenContext?.path,
      '',
    )));
  const reply = roomMapLocationHelp
    ? rawReply
    : composeCopilotReasoningAnswer({ ...snapshot, rawReply });
  const sanitizeLiveVisibleSurface = ['LOCATION_HELP', 'VEHICLE_NOT_VISIBLE', 'DRIVER_PHONE_GPS', 'WHY_BLOCKED'].includes(String(snapshot?.questionType || ''))
    || String(snapshot?.screenPath || '').includes('/superadmin/telematics')
    || String(snapshot?.screenPath || '').includes('/company/shifts')
    || String(snapshot?.screenPath || '').includes('/room/vehicles')
    || String(snapshot?.screenPath || '').includes('/room/map')
    || String(snapshot?.screenPath || '').includes('/driver/route')
    || String(snapshot?.screenPath || '').includes('/driver/today')
    || String(snapshot?.screenPath || '').includes('/driver/map')
    || (
      ['SCREEN_EXPLANATION_HELP', 'MISSING_DATA_HELP', 'ROLE_EXPLANATION_HELP', 'HOW_TO_HELP', 'SCREEN_PURPOSE'].includes(String(snapshot?.questionType || ''))
      && (
        String(snapshot?.screenPath || '').includes('/personel/live')
        || String(snapshot?.screenPath || '').includes('/personel/my')
        || String(snapshot?.screenPath || '').includes('/parent/live')
      )
    );
  const genericRootCauseSurface = normalizeText(firstNonEmpty(
    snapshot?.screenDefinition?.label,
    snapshot?.sourceScreenDefinition?.label,
    snapshot?.screenContext?.label,
    snapshot?.sourceScreenContext?.label,
    '',
  )) === 'root cause'
    || /root cause diagnostic/.test(normalizeText(firstNonEmpty(
      snapshot?.screenDefinition?.menuPurpose,
      snapshot?.sourceScreenDefinition?.menuPurpose,
      snapshot?.screenContext?.menuPurpose,
      snapshot?.sourceScreenContext?.menuPurpose,
      '',
    )));
  const genericRiskScoringSurface = normalizeText(firstNonEmpty(
    snapshot?.screenDefinition?.label,
    snapshot?.sourceScreenDefinition?.label,
    snapshot?.screenContext?.label,
    snapshot?.sourceScreenContext?.label,
    '',
  )) === 'risk scoring'
    || /risk scoring status/.test(normalizeText(firstNonEmpty(
      snapshot?.screenDefinition?.menuPurpose,
      snapshot?.sourceScreenDefinition?.menuPurpose,
      snapshot?.screenContext?.menuPurpose,
      snapshot?.sourceScreenContext?.menuPurpose,
      '',
    )));
  const visibleSurfaceSanitizer = sanitizeLiveVisibleSurface || genericRootCauseSurface || genericRiskScoringSurface;
  const visibleSurfaceValue = visibleSurfaceSanitizer ? normalizeVisibleLocationSurfaceValue : (value) => value;
  const visibleReply = visibleSurfaceValue(normalizeVisibleReplyFragment(reply));
  const visibleSummary = visibleSurfaceValue(normalizeVisibleReplyFragment(firstNonEmpty(
    snapshot.selectedRecordStatus,
    snapshot.reasoningLead,
    snapshot.nextBestAction,
    snapshot.boundaryText,
    snapshot.clarifyingQuestion,
    snapshot.rawReply,
    '',
  )));
  return Object.freeze({
    ...snapshot,
    reply: visibleReply,
    rawReply,
    summary: visibleSummary,
    selectedRecordStatus: visibleSurfaceValue(normalizeVisibleReplyFragment(snapshot.selectedRecordStatus)),
    selectedFieldLines: visibleSurfaceValue(normalizeVisibleList(snapshot.selectedFieldLines)),
    selectedBadgeLines: visibleSurfaceValue(normalizeVisibleList(snapshot.selectedBadgeLines)),
    selectedSignalLines: visibleSurfaceValue(normalizeVisibleList(snapshot.selectedSignalLines)),
    reasoningLead: visibleSurfaceValue(normalizeVisibleReplyFragment(snapshot.reasoningLead)),
    nextBestAction: visibleSurfaceValue(normalizeVisibleReplyFragment(snapshot.nextBestAction)),
    boundaryText: visibleSurfaceValue(normalizeVisibleReplyFragment(snapshot.boundaryText)),
    clarifyingQuestion: visibleSurfaceValue(normalizeVisibleReplyFragment(snapshot.clarifyingQuestion)),
    safeAlternative: visibleSurfaceValue(normalizeVisibleReplyFragment(snapshot.safeAlternative)),
    rootCauseReply: visibleSurfaceValue(normalizeVisibleReplyFragment(snapshot.rootCauseReply)),
    assistantReply: visibleSurfaceValue(normalizeVisibleReplyFragment(snapshot.assistantReply)),
    riskScoringReply: visibleSurfaceValue(normalizeVisibleReplyFragment(snapshot.riskScoringReply)),
    smartDiagnosticReply: visibleSurfaceValue(normalizeVisibleReplyFragment(snapshot.smartDiagnosticReply)),
    suggestedChips: visibleSurfaceValue(normalizeVisibleList(snapshot.suggestedChips)),
    rootCauseChips: visibleSurfaceValue(normalizeVisibleList(snapshot.rootCauseChips)),
    riskScoringChips: visibleSurfaceValue(normalizeVisibleList(snapshot.riskScoringChips)),
    smartDiagnosticChips: visibleSurfaceValue(normalizeVisibleList(snapshot.smartDiagnosticChips)),
    contextualSuggestedChips: visibleSurfaceValue(normalizeVisibleList(snapshot.contextualSuggestedChips)),
  });
}
