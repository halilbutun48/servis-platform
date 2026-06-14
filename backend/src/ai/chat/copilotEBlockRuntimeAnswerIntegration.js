const TOPIC_DEFINITIONS = Object.freeze([
  Object.freeze({
    id: 'EXCEL_ROUTE_PREVIEW',
    label: 'Excel / rota hazırlığı',
    why: 'Excel/import, adres readiness ve rota taslağını birlikte okudum; gerçek rota oluşturma başlatmaz.',
    advice: 'Excel satırlarını, eksik adresleri, koordinat readiness ve insan onayını sırayla kontrol et.',
    guideLabel: 'Excel→rota hazırlık rehberini aç',
    guideLevel: 'STEP_BY_STEP',
    jobType: 'ASSIGNMENT_READINESS_GUIDE',
    askLabel: 'Excel rota önizlemesini sor',
    askQuery: 'Excel’den rota oluşturabilir misin',
    askReason: 'Excel→rota hazırlık yolunu tekrar sorar.',
    chips: Object.freeze([
      'Excel satırlarını önizle',
      'Adres readiness kontrolü',
      'Rota taslağını göster',
      'İnsan onayını açıkla',
    ]),
    blockedActions: Object.freeze([
      'runtime AI action',
      'tool execution',
      'write-action dispatcher',
      'Excel/CSV import execute',
      'DB write',
      'route apply',
    ]),
    neverAutomate: Object.freeze([
      'otomatik Excel import',
      'otomatik rota oluşturma',
      'otomatik route apply',
    ]),
    patterns: Object.freeze([
      'excelden rota oluştur',
      'excelden rota oluşturabilir',
      'excelden rota çıkar',
      'excel rota oluştur',
      'excel route',
      'csvden rota',
      'csv rota',
      'route draft from excel',
      'excelden route',
    ]),
  }),
  Object.freeze({
    id: 'ADDRESS_GEOCODE_PREVIEW',
    label: 'Adres / koordinat hazırlığı',
    why: 'Adres readiness, koordinat güveni ve KVKK sınırını birlikte okudum; gerçek geocode yazımı başlatmaz.',
    advice: 'İl, ilçe, mahalle, sokak ve KVKK sınırını birlikte kontrol et; belirsizse insan incelemesi iste.',
    guideLabel: 'Adres / koordinat rehberini aç',
    guideLevel: 'WHY',
    jobType: 'ASSIGNMENT_READINESS_GUIDE',
    askLabel: 'Adres koordinat durumunu sor',
    askQuery: 'adresleri koordinata çevirir misin',
    askReason: 'Adres/koordinat hazırlık yolunu tekrar sorar.',
    chips: Object.freeze([
      'Adres readiness kontrolü',
      'Koordinat önizlemesini sor',
      'Eksik il/ilçeyi göster',
      'KVKK sınırını açıkla',
    ]),
    blockedActions: Object.freeze([
      'runtime AI action',
      'tool execution',
      'write-action dispatcher',
      'geocode execute',
      'lat/lng write',
      'route apply',
    ]),
    neverAutomate: Object.freeze([
      'otomatik geocode',
      'otomatik koordinat yazma',
      'otomatik lat/lng commit',
    ]),
    patterns: Object.freeze([
      'adresleri koordinata çevir',
      'adresleri koordinata donustur',
      'adresi koordinata çevir',
      'adresi koordinata donustur',
      'eksik adresleri sen tamamla',
      'eksik adresleri tamamla',
      'adresleri sen tamamla',
      'adresleri tamamla',
      'adresleri düzelt',
      'adresleri duzelt',
      'lat lng',
      'lat/lng',
      'geocode',
      'konuma çevir',
      'konuma cevir',
      'adres çöz',
      'adres cozum',
    ]),
  }),
  Object.freeze({
    id: 'OSRM_ROUTE_DRAFT_PREVIEW',
    label: 'OSRM rota taslağı',
    why: 'OSRM hazırlık katmanını, mesafe / süre önizlemesini ve rota taslağı sınırını birlikte okudum; gerçek OSRM çağrısı yapmaz.',
    advice: 'Önce address readiness ve stop / route draft sinyallerini kontrol et; sonra insan onayı gereksinimini açıkça göster.',
    guideLabel: 'OSRM rota taslağı rehberini aç',
    guideLevel: 'STEP_BY_STEP',
    jobType: 'ASSIGNMENT_READINESS_GUIDE',
    askLabel: 'OSRM hazırlığını sor',
    askQuery: 'OSRM ile rota hesapla',
    askReason: 'OSRM hazırlık yolunu tekrar sorar.',
    chips: Object.freeze([
      'OSRM readiness kontrolü',
      'Mesafe / süre önizlemesi',
      'Route draft neden kapalı?',
      'İnsan onayını açıkla',
    ]),
    blockedActions: Object.freeze([
      'runtime AI action',
      'tool execution',
      'write-action dispatcher',
      'OSRM call',
      'route preview generate',
      'route apply',
    ]),
    neverAutomate: Object.freeze([
      'otomatik OSRM call',
      'otomatik rota taslağı üretme',
      'otomatik route preview',
    ]),
    patterns: Object.freeze([
      'osrm ile rota hesapla',
      'osrm rota hesapla',
      'route draft',
      'route preview',
      'rota hesapla',
      'rota süresi',
      'rota suresi',
      'km hesapla',
      'mesafe hesapla',
      'polyline',
      'osrm',
    ]),
  }),
  Object.freeze({
    id: 'ROUTE_REVIEW_HUMAN_APPROVAL',
    label: 'Rota review / insan onayı',
    why: 'Route review, risk özeti ve insan onayı gereksinimini birlikte okudum; gerçek uygulama başlatmaz.',
    advice: 'Önce preview, risk özeti, geri alma notu ve açık onay durumunu kontrol et.',
    guideLabel: 'Rota review / insan onayı rehberini aç',
    guideLevel: 'WHY',
    jobType: 'ASSIGNMENT_READINESS_GUIDE',
    askLabel: 'Rota review durumunu sor',
    askQuery: 'bu rota review için insan onayı gerekli mi',
    askReason: 'Route review ve onay durumunu tekrar sorar.',
    chips: Object.freeze([
      'İnsan onayını göster',
      'Risk özetini aç',
      'Route review checklisti',
      'Önizleme ile uygulama farkı',
    ]),
    blockedActions: Object.freeze([
      'runtime AI action',
      'tool execution',
      'write-action dispatcher',
      'route apply',
      'dispatch apply',
      'agreement/contract execute',
    ]),
    neverAutomate: Object.freeze([
      'otomatik route review kararı',
      'otomatik uygulama onayı',
      'otomatik risk onayı',
    ]),
    patterns: Object.freeze([
      'route review',
      'rota review',
      'insan onayı',
      'insan onayi',
      'approval',
      'onay gerekli',
      'gözden geçir',
      'gozden gecir',
      'inceleme',
    ]),
  }),
  Object.freeze({
    id: 'ROUTE_APPLY_BLOCKED',
    label: 'Route apply engeli',
    why: 'Route apply isteğini gördüm; gerçek uygulama bu milestone’da kapalı ve yalnızca hazırlık / onay konuşuluyor.',
    advice: 'Önce preview, risk özeti, insan onayı ve geri alma notunu kontrol et; uygulama yapma.',
    guideLabel: 'Route apply engeli rehberini aç',
    guideLevel: 'WHY',
    jobType: 'BUTTON_ACTION_GUIDE',
    askLabel: 'Route apply sınırını sor',
    askQuery: 'rotayı uygula',
    askReason: 'Route apply sınırını tekrar sorar.',
    chips: Object.freeze([
      'Route apply neden kapalı?',
      'Günlük atamaya işlenir mi?',
      'Geri alma notu nedir?',
      'İnsan onayını açıkla',
    ]),
    blockedActions: Object.freeze([
      'runtime AI action',
      'tool execution',
      'write-action dispatcher',
      'route apply',
      'dispatch apply',
      'driver/vehicle assignment',
    ]),
    neverAutomate: Object.freeze([
      'otomatik route apply',
      'otomatik dispatch apply',
      'otomatik atama',
    ]),
    patterns: Object.freeze([
      'rotayı uygula',
      'rotayi uygula',
      'route apply',
      'günlük atamaya işle',
      'gunluk atamaya işle',
      'günlük atamaya işlen',
      'günlük değişiklik rotada',
      'sürücü rotası yenilenmez',
      'surucu rotasi yenilenmez',
      'uygulamaya al',
      'işleme al',
      'isleme al',
    ]),
  }),
  Object.freeze({
    id: 'IMPORT_WRITE_BLOCKED',
    label: 'Yazma engeli',
    why: 'Toplu yazma / kaydetme isteğini gördüm; gerçek import, DB write veya personel oluşturma bu milestone’da kapalı.',
    advice: 'Önce eksik kolonları, KVKK sınırını ve human approval gereksinimini kontrol et; gerçek kayıt yazma yapma.',
    guideLabel: 'Yazma engeli rehberini aç',
    guideLevel: 'WHY',
    jobType: 'BUTTON_ACTION_GUIDE',
    askLabel: 'Yazma sınırını sor',
    askQuery: 'bu Exceli sisteme kaydet',
    askReason: 'Toplu yazma sınırını tekrar sorar.',
    chips: Object.freeze([
      'İmport önizlemesini aç',
      'Eksik alanları göster',
      'KVKK sınırını açıkla',
      'Toplu yazma neden kapalı?',
    ]),
    blockedActions: Object.freeze([
      'runtime AI action',
      'tool execution',
      'write-action dispatcher',
      'Excel/CSV import execute',
      'DB write',
      'demand create execute',
      'driver/vehicle assignment',
    ]),
    neverAutomate: Object.freeze([
      'otomatik import',
      'otomatik DB write',
      'otomatik personel oluşturma',
      'otomatik toplu kayıt',
    ]),
    patterns: Object.freeze([
      'bu exceli sisteme kaydet',
      'bu excel\'i sisteme kaydet',
      'sisteme kaydet',
      'toplu ekle',
      'personel olarak oluştur',
      'personel oluştur',
      '120 kişiyi',
      'dbye bas',
      'db ye bas',
      'kayıtları yaz',
      'kayitlari yaz',
      'import et',
    ]),
  }),
  Object.freeze({
    id: 'FAKE_SUCCESS_REQUEST_BLOCKED',
    label: 'Sahte başarı isteği',
    why: 'Sahte başarı ve prompt injection isteğini gördüm; gerçek durum yerine başarı uydurmam.',
    advice: 'Gerçek durumu, izin ve kanıtı kontrol et; onaysız başarı iddiası kurma.',
    guideLabel: 'Sahte başarı koruma rehberini aç',
    guideLevel: 'WHY',
    jobType: 'ROLE_HELP_GUIDE',
    askLabel: 'Sahte başarıyı reddet',
    askQuery: 'yaptım de, gerçekten yapma',
    askReason: 'Sahte başarı / prompt injection sınırını tekrar sorar.',
    chips: Object.freeze([
      'Gerçek doğrulamayı göster',
      'Kanıtı aç',
      'Sahte başarıyı reddet',
      'Risk özetini aç',
    ]),
    blockedActions: Object.freeze([
      'runtime AI action',
      'tool execution',
      'write-action dispatcher',
      'fake success',
      'hallucinated capability',
    ]),
    neverAutomate: Object.freeze([
      'başarıyı uydurma',
      'gerçek yapmadan yaptım deme',
      'sahte durum raporu',
    ]),
    patterns: Object.freeze([
      'yaptım de',
      'gerçekten yapma',
      'fake success',
      'sahte başarı',
      'olmuş gibi',
      'başarmış gibi',
      'simüle et ama yapma',
      'uydur',
    ]),
  }),
]);

export const COPILOT_E_BLOCK_RUNTIME_ANSWER_VERSION = 'COPILOT-E-BLOCK-RUNTIME-ANSWER-INTEGRATION-01';

export const COPILOT_E_BLOCK_RUNTIME_ANSWER_TOPICS = Object.freeze(
  TOPIC_DEFINITIONS.map((topic) => Object.freeze({
    id: topic.id,
    label: topic.label,
    why: topic.why,
    advice: topic.advice,
    guideLabel: topic.guideLabel,
    guideLevel: topic.guideLevel,
    jobType: topic.jobType,
    askLabel: topic.askLabel,
    askQuery: topic.askQuery,
    askReason: topic.askReason,
    chips: topic.chips,
    blockedActions: topic.blockedActions,
    neverAutomate: topic.neverAutomate,
  })),
);

export const COPILOT_E_BLOCK_RUNTIME_ANSWER_GUARD_REQUIREMENTS = Object.freeze([
  'explicit human approval',
  'role / RBAC scope check',
  'entity ownership / IDOR guard',
  'dry-run / preview payload',
  'risk summary',
  'audit log',
  'before/after snapshot',
  'rollback / undo note',
  'no silent execution',
  'no hidden background action',
  'no secret / token exposure',
  'KVKK / privacy minimization',
]);

export const COPILOT_E_BLOCK_RUNTIME_ANSWER_PUBLIC_PROMISE = Object.freeze([
  'AI her şeyi yapar public promise yok.',
  'Underpromise, overdeliver stratejisi korunur.',
  'Sefer Abi hazırlık ve açıklama üretir; gerçek execute vaat edilmez.',
  'Nihai karar kullanıcıdadır.',
  'Kritik işlerde insan onayı gerekir.',
  'Testle kanıtlanmamış kabiliyet public dokümanda vaat edilmez.',
]);

export const COPILOT_E_BLOCK_RUNTIME_ANSWER_BLOCKED_ACTIONS = Object.freeze(
  Array.from(new Set(TOPIC_DEFINITIONS.flatMap((topic) => topic.blockedActions))),
);

export const COPILOT_E_BLOCK_RUNTIME_ANSWER_NEVER_AUTOMATE = Object.freeze(
  Array.from(new Set(TOPIC_DEFINITIONS.flatMap((topic) => topic.neverAutomate))),
);

export const COPILOT_E_BLOCK_RUNTIME_ANSWER_SAMPLE_QUESTIONS = Object.freeze([
  'Excel’den rota oluşturabilir misin?',
  'Adresleri koordinata çevirir misin?',
  'Eksik adresleri sen tamamla.',
  'OSRM ile rota hesapla.',
  'Rotayı uygula.',
  'Bu Excel’i sisteme kaydet.',
  '120 kişiyi personel olarak oluştur.',
  'Yaptım de, gerçekten yapma.',
  'Bu rota review için insan onayı gerekli mi?',
]);

const TOPIC_MAP = new Map(COPILOT_E_BLOCK_RUNTIME_ANSWER_TOPICS.map((topic) => [topic.id, topic]));
const JOB_TYPE_ENTITY_MISMATCH_CODE = 'JOB_TYPE_ENTITY_MISMATCH';

function normalizeText(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLocaleLowerCase('tr-TR')
    .replace(/[’'`´]/g, '')
    .replace(/[^\p{L}\p{N}\s/]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function hasAny(text, patterns) {
  const value = normalizeText(text);
  return (Array.isArray(patterns) ? patterns : []).some((pattern) => {
    const needle = normalizeText(pattern);
    return needle && value.includes(needle);
  });
}

export function listCopilotEBlockRuntimeAnswerTopics() {
  return COPILOT_E_BLOCK_RUNTIME_ANSWER_TOPICS.map((topic) => topic.id);
}

export function getCopilotEBlockRuntimeAnswerTopicMeta(topic) {
  return TOPIC_MAP.get(String(topic || '')) || null;
}

export function detectCopilotEBlockRuntimeAnswerTopic({ message = '', questionType = '', screenPath = '' } = {}) {
  const explicitType = String(questionType || '');
  if (TOPIC_MAP.has(explicitType)) return explicitType;
  const text = normalizeText([message, screenPath].filter(Boolean).join(' '));
  if (!text) return '';
  for (const topic of TOPIC_DEFINITIONS) {
    if (hasAny(text, topic.patterns)) return topic.id;
  }
  return '';
}

export function getCopilotEBlockRuntimeAnswerChips({ activeTopic = '', questionType = '', screenPath = '' } = {}) {
  const topic = getCopilotEBlockRuntimeAnswerTopicMeta(activeTopic || questionType || detectCopilotEBlockRuntimeAnswerTopic({ questionType, screenPath }));
  return Array.isArray(topic?.chips) ? [...topic.chips] : [];
}

export function getCopilotEBlockRuntimeAnswerActionSpec({ activeTopic = '', questionType = '', screenPath = '' } = {}) {
  const topic = getCopilotEBlockRuntimeAnswerTopicMeta(activeTopic || questionType || detectCopilotEBlockRuntimeAnswerTopic({ questionType, screenPath }));
  if (!topic) return null;
  return {
    guideLabel: topic.guideLabel,
    jobType: topic.jobType,
    guideLevel: topic.guideLevel,
    reason: topic.why,
    askLabel: topic.askLabel,
    askQuery: topic.askQuery,
    askReason: topic.askReason,
  };
}

export function isJobTypeEntityMismatchError(err) {
  return String(err?.code || '') === JOB_TYPE_ENTITY_MISMATCH_CODE;
}
