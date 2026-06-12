export const COPILOT_ROLE_TASK_MATRIX_VERSION = 'COPILOT-ROLE-TASK-MATRIX-01';

export const COPILOT_ACTION_MODEL = Object.freeze([
  'Anla',
  'Analiz et',
  'En iyi seçenekleri sun',
  'Riskleri açıkla',
  'İnsan onayı al',
  "Guard'lı uygula",
  'Audit log yaz',
]);

export const COPILOT_TASK_CATEGORIES = Object.freeze([
  'READ',
  'EXPLAIN',
  'RECOMMEND',
  'PREPARE',
  'REQUIRES_HUMAN_APPROVAL',
  'BLOCKED_RUNTIME_ACTION',
  'NEVER_AUTOMATE',
]);

const COMMON_READ_ONLY_RUNTIME_BLOCKS = Object.freeze([
  'tool execution',
  'runtime AI action',
  'provider credential management',
  'user/account/admin write-action',
  'payment/hakediş execute',
  'contract/agreement execute',
  'offer auto-accept',
  'supplier auto-selection',
  'route apply',
  'driver/vehicle assignment execute',
  'SMS/email/push',
  'GPS/device/provider runtime action',
]);

const COMMON_NEVER_AUTOMATE = Object.freeze([
  'security policy changes',
  'secret/token writes',
  'identity / account writes',
  'payment / contract / settlement writes',
  'message sending',
  'automatic decision making',
]);

// role: 'SUPER_ADMIN'
// role: 'ROOM'
// role: 'COMPANY'
// role: 'DRIVER'
// role: 'PERSONEL'
// role: 'PARENT'
// role: 'SCHOOL'
// role: 'ORGANIZATION'
function buildRoleMatrix(role, config) {
  return Object.freeze({
    role,
    screens: Object.freeze(Array.isArray(config.screens) ? [...config.screens] : []),
    READ: Object.freeze(Array.isArray(config.READ) ? [...config.READ] : []),
    EXPLAIN: Object.freeze(Array.isArray(config.EXPLAIN) ? [...config.EXPLAIN] : []),
    RECOMMEND: Object.freeze(Array.isArray(config.RECOMMEND) ? [...config.RECOMMEND] : []),
    PREPARE: Object.freeze(Array.isArray(config.PREPARE) ? [...config.PREPARE] : []),
    REQUIRES_HUMAN_APPROVAL: Object.freeze(Array.isArray(config.REQUIRES_HUMAN_APPROVAL) ? [...config.REQUIRES_HUMAN_APPROVAL] : []),
    BLOCKED_RUNTIME_ACTION: Object.freeze([
      ...COMMON_READ_ONLY_RUNTIME_BLOCKS,
      ...(Array.isArray(config.BLOCKED_RUNTIME_ACTION) ? config.BLOCKED_RUNTIME_ACTION : []),
    ]),
    NEVER_AUTOMATE: Object.freeze([
      ...COMMON_NEVER_AUTOMATE,
      ...(Array.isArray(config.NEVER_AUTOMATE) ? config.NEVER_AUTOMATE : []),
    ]),
  });
}

export const COPILOT_ROLE_TASK_MATRIX = Object.freeze({
  SUPER_ADMIN: buildRoleMatrix('SUPER_ADMIN', {
    screens: [
      '/superadmin',
      '/superadmin/operations',
      '/superadmin/onboarding-review',
      '/superadmin/public-leads',
      '/superadmin/telematics',
      '/superadmin/trust-quality',
      '/superadmin/acceptance',
      '/superadmin/operation-verification',
      '/superadmin/observability',
      '/superadmin/commercial-core',
      '/superadmin/audit',
      '/shared/logs',
      '/shared/notifications',
      '/shared/feedback',
      '/shared/kvkk',
    ],
    READ: [
      'system status',
      'onboarding / başvuru incelemesi',
      'provider catalog / telematics readiness',
      'marketplace readiness',
      'verified supplier readiness',
      'quality / trust / offer quality ranking',
      'audit / observability signals',
      'panel health / smoke quality signals',
    ],
    EXPLAIN: [
      'hangi başvurunun neden beklediğini açıklar',
      'hangi provider veya supplier riskinin önemli olduğunu açıklar',
      'hangi panelin aksiyon beklediğini açıklar',
      'hangi doc / check eksik olduğunu açıklar',
    ],
    RECOMMEND: [
      'önce hangi başvurunun inceleneceğini önerir',
      'hangi provider / supplier riskinin kontrol edileceğini önerir',
      'hangi panelin önce açılacağını önerir',
      'hangi check veya dokümanın eksik olduğunu önerir',
    ],
    PREPARE: [
      'inceleme notu',
      'risk özeti',
      'kontrol checklisti',
      'karar öncesi onay metni',
    ],
    REQUIRES_HUMAN_APPROVAL: [
      'inceleme kararı',
      'onay / ret kararı',
      'kritik güvenlik veya kalite değişikliği',
    ],
    BLOCKED_RUNTIME_ACTION: [
      'user/account oluşturma',
      'supplier doğrulama execute',
      'provider ACTIVE yapma',
      'contract/agreement execute',
      'payment/hakediş execute',
      'SMS/email/push gönderme',
      'runtime admin action',
      'security policy değiştirme',
    ],
    NEVER_AUTOMATE: [
      'kullanıcı hesabı üretmek',
      'yetki / rol yazmak',
      'kritik güvenlik kararını otomatik vermek',
    ],
  }),
  ROOM: buildRoleMatrix('ROOM', {
    screens: [
      '/room/map',
      '/room/offers',
      '/room/shifts',
      '/room/vehicles',
      '/room/drivers',
      '/room/agreements',
      '/room/operation-health',
      '/room/commercial-flow',
      '/shared/logs',
      '/shared/notifications',
      '/shared/feedback',
      '/shared/kvkk',
    ],
    READ: [
      'araçlar',
      'sürücüler',
      'vardiyalar',
      'dispatch hazırlığı',
      'teklif yanıtı',
      'GPS / telematics eşleşme',
      'safe-drive risk özeti',
      'kanıt / check-in eksikleri',
      'route progress / LIVE / STALE / OFFLINE',
    ],
    EXPLAIN: [
      'hangi araç uygun görünüyor',
      'hangi sürücü / araç riski var',
      'hangi eşleşme eksik',
      'hangi teklif kalite / risk açısından incelenmeli',
      'hangi vardiyada dispatch hazırlığı eksik',
    ],
    RECOMMEND: [
      'hangi araç uygun olabilir',
      'hangi sürücü / araç riski kontrol edilmeli',
      'hangi eşleşme eksik diye bakılmalı',
      'hangi teklif kalite / risk açısından önce açılmalı',
    ],
    PREPARE: [
      'teklif açıklaması',
      'dispatch kontrol notu',
      'GPS eşleştirme kontrol checklisti',
      'sürücü güvenli sürüş uyarı taslağı',
    ],
    REQUIRES_HUMAN_APPROVAL: [
      'dispatch / eşleşme kararını onaylama',
      'rota değişikliği öncesi insan onayı',
    ],
    BLOCKED_RUNTIME_ACTION: [
      'driver/vehicle assignment execute',
      'dispatch apply',
      'route apply',
      'stop reached / skipped / complete execute',
      'GPS provider credential yönetimi',
      'SMS/email/push gönderme',
      'ceza / yaptırım oluşturma',
      'offer auto-submit / auto-accept',
      'payment / contract execute',
    ],
    NEVER_AUTOMATE: [
      'otomatik atama',
      'otomatik kabul',
      'otomatik cezalandırma',
    ],
  }),
  COMPANY: buildRoleMatrix('COMPANY', {
    screens: [
      '/company',
      '/company/shifts',
      '/company/agreements',
      '/company/commercial-flow',
      '/company/map',
      '/company/operations',
      '/company/service-evaluation',
      '/shared/logs',
      '/shared/notifications',
      '/shared/feedback',
      '/shared/kvkk',
    ],
    READ: [
      'vardiya talepleri',
      'teklif karşılaştırmaları',
      'offer quality ranking',
      'agreement preview',
      'canlı takip',
      'route progress',
      'safe-drive / kalite / evidence sinyalleri',
      'tasarruf / risk önizlemeleri',
    ],
    EXPLAIN: [
      'hangi teklif önce incelenmeli',
      'hangi eksik veri karar öncesi kontrol edilmeli',
      'hangi rota / kanıt / kalite riski var',
      'sözleşmeye dönüştürmeden önce hangi kontrol yapılmalı',
    ],
    RECOMMEND: [
      'önce hangi teklif açılmalı',
      'hangi eksik veri kontrol edilmeli',
      'hangi riskli rota / kanıt satırı incelenmeli',
      'hangi karar öncesi kontrol yapılmalı',
    ],
    PREPARE: [
      'talep özeti',
      'teklif karşılaştırma özeti',
      'karar öncesi checklist',
      'sözleşme hazırlık notu',
    ],
    REQUIRES_HUMAN_APPROVAL: [
      'teklif kabulü',
      'sözleşme onayı',
      'karar öncesi nihai kabul',
    ],
    BLOCKED_RUNTIME_ACTION: [
      'offer accept / approve execute',
      'agreement / contract execute',
      'payment / hakediş execute',
      'supplier auto-selection',
      'route apply',
      'user / role changes',
      'SMS/email/push gönderme',
    ],
    NEVER_AUTOMATE: [
      'insan onayı olmadan karar',
      'otomatik kabul',
      'otomatik sözleşme',
    ],
  }),
  DRIVER: buildRoleMatrix('DRIVER', {
    screens: [
      '/driver/today',
      '/driver/route',
      '/driver/map',
      '/driver/checkin',
      '/shared/logs',
      '/shared/notifications',
    ],
    READ: [
      'aktif rota',
      'sıradaki durak',
      'check-in / kanıt durumu',
      'GPS sinyali',
      'safe-drive uyarıları',
      'görev açıklaması',
    ],
    EXPLAIN: [
      'güvenli sürüş kontrolü',
      'GPS sinyali zayıfsa ne kontrol edilmeli',
      'sıradaki doğru adım',
      'kanıt eksikse hatırlatma',
    ],
    RECOMMEND: [
      'güvenli sürüş kontrolü öner',
      'GPS zayıfsa hangi kontrol yapılmalı',
      'sıradaki doğru adım ne',
      'kanıt eksikse ne hatırlatılmalı',
    ],
    PREPARE: [
      'kısa görev özeti',
      'sürücüye gösterilecek açıklama',
      'güvenli sürüş uyarı metni',
    ],
    REQUIRES_HUMAN_APPROVAL: [
      'rota değişikliği öncesi onay',
      'görev devri öncesi onay',
    ],
    BLOCKED_RUNTIME_ACTION: [
      'kendi adına reached / skipped / complete execute',
      'rota değiştirme',
      'yeni durak ekleme',
      'araç / sürücü ataması değiştirme',
      'provider credential görme / yönetme',
      'payment / contract / offer aksiyonu',
      'SMS/email/push gönderme',
    ],
    NEVER_AUTOMATE: [
      'kendi adına durum kapatma',
      'kendi adına rota değiştirme',
      'kendi adına atama yazma',
    ],
  }),
  PERSONEL: buildRoleMatrix('PERSONEL', {
    screens: [
      '/personel/live',
      '/personel/my',
      '/shared/notifications',
      '/shared/feedback',
      '/shared/kvkk',
    ],
    READ: [
      'my ride / live tracking',
      'servis durumu',
      'buluşma / toplanma konumu',
      'safe-drive readonly sinyali',
      'gecikme / rota ilerleme açıklaması',
      'fallback / error açıklaması',
    ],
    EXPLAIN: [
      'ne zaman beklemeli',
      'hangi durumlarda destek ile iletişime geçmeli',
      'konum / servis bilgisi eksikse kontrol adımı',
    ],
    RECOMMEND: [
      'ne zaman beklemeli',
      'hangi durumda destek çağrılmalı',
      'eksik konum veya servis bilgisi için ilk kontrol',
    ],
    PREPARE: [
      'destek mesajı taslağı',
      'servis durum özeti',
    ],
    REQUIRES_HUMAN_APPROVAL: [
      'başkası adına aksiyon isteme',
      'gizli görünürlük talebi',
    ],
    BLOCKED_RUNTIME_ACTION: [
      'route / vehicle / driver assignment',
      'ödeme / sözleşme / offer işlemi',
      'başka kişinin canlı takibini görme',
      'provider credential',
      'SMS/email/push gönderme',
      'admin action',
    ],
    NEVER_AUTOMATE: [
      'başka kişi adına erişim',
      'başka kişi adına yazma',
    ],
  }),
  PARENT: buildRoleMatrix('PARENT', {
    screens: [
      '/parent/live',
      '/shared/notifications',
      '/shared/feedback',
      '/shared/kvkk',
    ],
    READ: [
      'my ride / live tracking',
      'servis durumu',
      'buluşma / toplanma konumu',
      'safe-drive readonly sinyali',
      'gecikme / rota ilerleme açıklaması',
      'fallback / error açıklaması',
    ],
    EXPLAIN: [
      'ne zaman beklemeli',
      'hangi durumlarda destek ile iletişime geçmeli',
      'konum / servis bilgisi eksikse kontrol adımı',
    ],
    RECOMMEND: [
      'ne zaman beklemeli',
      'hangi durumda destek çağrılmalı',
      'eksik konum veya servis bilgisi için ilk kontrol',
    ],
    PREPARE: [
      'destek mesajı taslağı',
      'servis durum özeti',
    ],
    REQUIRES_HUMAN_APPROVAL: [
      'başkası adına aksiyon isteme',
      'gizli görünürlük talebi',
    ],
    BLOCKED_RUNTIME_ACTION: [
      'route / vehicle / driver assignment',
      'ödeme / sözleşme / offer işlemi',
      'başka kişinin canlı takibini görme',
      'provider credential',
      'SMS/email/push gönderme',
      'admin action',
    ],
    NEVER_AUTOMATE: [
      'başka kişi adına erişim',
      'başka kişi adına yazma',
    ],
  }),
  SCHOOL: buildRoleMatrix('SCHOOL', {
    screens: [
      '/school',
      '/school/shifts',
      '/school/agreements',
      '/school/operations',
      '/school/map',
      '/school/service-evaluation',
      '/shared/logs',
      '/shared/notifications',
      '/shared/feedback',
      '/shared/kvkk',
    ],
    READ: [
      'organization / school servis planları',
      'route plan readiness',
      'personel / öğrenci taşıma kalite sinyalleri',
      'live tracking özetleri',
      'eksik veri / güvenlik kontrol sinyali',
    ],
    EXPLAIN: [
      'plan kontrol adımı',
      'eksik veri tamamlama',
      'risk / kalite inceleme sırası',
    ],
    RECOMMEND: [
      'önce hangi plan kontrol edilmeli',
      'hangi eksik veri tamamlanmalı',
      'hangi risk / kalite satırı incelenmeli',
    ],
    PREPARE: [
      'plan kontrol notu',
      'eksik veri listesi',
      'risk özet checklisti',
    ],
    REQUIRES_HUMAN_APPROVAL: [
      'başka kurum verisi görme',
      'public / shared dışı karar',
    ],
    BLOCKED_RUNTIME_ACTION: [
      'provider credential yönetme',
      'route apply / assignment execute',
      'payment / contract execute',
      'SMS/email/push gönderme',
      'AI runtime action',
    ],
    NEVER_AUTOMATE: [
      'başka kurum verisi açma',
      'gizli öğrenci / personel verisini otomatik görünür kılma',
    ],
  }),
  ORGANIZATION: buildRoleMatrix('ORGANIZATION', {
    screens: [
      '/organization',
      '/organization/shifts',
      '/organization/agreements',
      '/organization/operations',
      '/organization/map',
      '/organization/service-evaluation',
      '/shared/logs',
      '/shared/notifications',
      '/shared/feedback',
      '/shared/kvkk',
    ],
    READ: [
      'organization / school servis planları',
      'route plan readiness',
      'personel / öğrenci taşıma kalite sinyalleri',
      'live tracking özetleri',
      'eksik veri / güvenlik kontrol sinyali',
    ],
    EXPLAIN: [
      'plan kontrol adımı',
      'eksik veri tamamlama',
      'risk / kalite inceleme sırası',
    ],
    RECOMMEND: [
      'önce hangi plan kontrol edilmeli',
      'hangi eksik veri tamamlanmalı',
      'hangi risk / kalite satırı incelenmeli',
    ],
    PREPARE: [
      'plan kontrol notu',
      'eksik veri listesi',
      'risk özet checklisti',
    ],
    REQUIRES_HUMAN_APPROVAL: [
      'başka kurum verisi görme',
      'public / shared dışı karar',
    ],
    BLOCKED_RUNTIME_ACTION: [
      'provider credential yönetme',
      'route apply / assignment execute',
      'payment / contract execute',
      'SMS/email/push gönderme',
      'AI runtime action',
    ],
    NEVER_AUTOMATE: [
      'başka kurum verisi açma',
      'gizli öğrenci / personel verisini otomatik görünür kılma',
    ],
  }),
});

export function listCopilotRoles() {
  return Object.keys(COPILOT_ROLE_TASK_MATRIX);
}

export function getCopilotRoleTaskMatrix(role) {
  return COPILOT_ROLE_TASK_MATRIX[String(role || '').trim().toUpperCase()] || null;
}
