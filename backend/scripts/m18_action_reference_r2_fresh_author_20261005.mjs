import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(process.cwd());
const outputPath = resolve(root, '.superpowers', 'sdd', '2026-10-01-m18-typed-semantic-evidence-implementation-plan', 'm18-action-reference-r2-fresh-unseen-56-governed-v4r2r2.json');

const authorContextId = 'm18-action-reference-r2-author-20261005-7d7c8a5e';
const auditorContextId = 'm18-action-reference-r2-auditor-20261005-2b4e91f6';
const roles = ['COMPANY', 'ROOM', 'SCHOOL', 'ORGANIZATION', 'DRIVER', 'PERSONEL', 'PARENT', 'SUPER_ADMIN'];
const challengeClasses = [
  'EXPLAIN/CURRENT_SURFACE',
  'VIEW_OR_NAVIGATE',
  'REFERENCE_CONTEXT',
  'CONTINUATION_RECOVERY',
  'ROLE_AUTHORIZATION_BOUNDARY',
  'AMBIGUITY_UNKNOWN_FAIL_CLOSED',
  'DOMAIN_TASK_OR_GENUINE_OOS',
];

const catalog = {
  COMPANY: { tenant: { type: 'COMPANY', companyKind: 'COMPANY' }, screen: { id: 2101, path: '/company', label: 'Planlama Merkezi', role: 'COMPANY' } },
  ROOM: { tenant: { type: 'ROOM', companyKind: null }, screen: { id: 1100, path: '/room', label: 'Taşımacılık Firması Merkezi', role: 'ROOM' } },
  SCHOOL: { tenant: { type: 'COMPANY', companyKind: 'SCHOOL' }, screen: { id: 2101, path: '/school', label: 'Okul Planlama', role: 'COMPANY' } },
  ORGANIZATION: { tenant: { type: 'COMPANY', companyKind: 'ORGANIZATION' }, screen: { id: 2101, path: '/organization', label: 'Gezi / Planlama Merkezi', role: 'COMPANY' } },
  DRIVER: { tenant: { type: 'COMPANY', companyKind: 'COMPANY' }, screen: { id: 3101, path: '/driver/today', label: 'Bugün', role: 'DRIVER' } },
  PERSONEL: { tenant: { type: 'COMPANY', companyKind: 'COMPANY' }, screen: { id: 4101, path: '/personel/live', label: 'Canlı', role: 'PERSONEL' } },
  PARENT: { tenant: { type: 'PARENT', companyKind: null }, screen: { id: 5101, path: '/parent/live', label: 'Canlı', role: 'PARENT' } },
  SUPER_ADMIN: { tenant: { type: 'SUPER_ADMIN', companyKind: null }, screen: { id: 6101, path: '/superadmin', label: 'Genel Bakış', role: 'SUPER_ADMIN' } },
};

const label = (role) => catalog[role].screen.label;
const tenantType = (role) => catalog[role].tenant.type;
const screenContext = (role) => ({
  source: 'AUTHORIZED_PRODUCT_CATALOG',
  role,
  tenantContext: catalog[role].tenant,
  screen: catalog[role].screen,
  selectedEntity: null,
});
const noScreenContext = (role) => ({
  source: 'AUTHORIZED_PRODUCT_CATALOG',
  role,
  tenantContext: catalog[role].tenant,
  screen: null,
  selectedEntity: null,
});

const userBehavior = 'Gerçek iş yazmadan, kanonik semantik eksenler ve rol sınırlarıyla güvenli yönlendirme sağlanır.';
const prohibited = 'Uydurma kayıt, yetkisiz iş yazımı, çözülmemiş referansın gerçek kayda dönüştürülmesi ve ekran metninden rota üretimi yasaktır.';

const expectations = {
  explain: {
    scope: 'PRODUCT_EXPLICIT', mode: 'EXPLAIN', semantic: 'EXPLAIN', action: 'EXPLAIN', object: 'SURFACE', reference: 'ABSENT', resolution: 'RESOLVED', task: 'NONE', operation: 'EXPLAIN_CURRENT_SURFACE', authorization: 'ALLOW_GUIDANCE', source: 'PRODUCT_SURFACE_CONTRACT',
  },
  navigate: {
    scope: 'PRODUCT_EXPLICIT', mode: 'NAVIGATE', semantic: 'NAVIGATE', action: 'NAVIGATE', object: 'SURFACE', reference: 'ABSENT', resolution: 'RESOLVED', task: 'NONE', operation: 'NAVIGATE_AUTHORIZED_SURFACE', authorization: 'AUTHORIZED_CONTEXT_READ', source: 'PRODUCT_SURFACE_CONTRACT',
  },
  view: {
    scope: 'PRODUCT_EXPLICIT', mode: 'VIEW', semantic: 'VIEW', action: 'VIEW', object: null, reference: 'ABSENT', resolution: 'RESOLVED', task: 'NONE', operation: 'VIEW_AUTHORIZED_SURFACE', authorization: 'AUTHORIZED_CONTEXT_READ', source: 'PRODUCT_SURFACE_CONTRACT',
  },
  knownActionUnresolved: {
    scope: 'PRODUCT_AMBIGUOUS', mode: 'UPDATE', semantic: 'NONE', action: 'NONE', object: null, reference: 'UNRESOLVED', resolution: 'UNRESOLVED', task: 'NONE', operation: 'CLARIFY_SEMANTIC_REQUEST', authorization: 'NOT_APPLICABLE', source: 'REFERENCE_CONTRACT',
  },
  continuation: {
    scope: 'PRODUCT_CONTEXTUAL', mode: 'CONTINUE', semantic: 'CONTINUE', action: 'CONTINUE', object: 'RECORD', reference: 'ABSENT', resolution: 'RESOLVED', task: 'NONE', operation: 'CONTINUE_EXPLANATION', authorization: 'AUTHORIZED_OPERATION', source: 'CONTINUATION_CONTRACT',
  },
  create: {
    scope: 'PRODUCT_EXPLICIT', mode: 'CREATE', semantic: 'CREATE', action: 'CREATE', object: 'SHIFT', reference: 'ABSENT', resolution: 'RESOLVED', task: 'NONE', operation: 'CREATE_SHIFT', source: 'ROLE_BOUNDARY',
  },
  ambiguous: {
    scope: 'PRODUCT_AMBIGUOUS', mode: 'UNRESOLVED', semantic: 'NONE', action: 'NONE', object: null, reference: 'UNRESOLVED', resolution: 'UNRESOLVED', task: 'NONE', operation: 'CLARIFY_SEMANTIC_REQUEST', authorization: 'NOT_APPLICABLE', source: 'REFERENCE_CONTRACT',
  },
  oos: {
    scope: 'OFF_TOPIC_GENUINE', mode: 'GENUINE_OOS', semantic: 'NONE', action: 'NONE', object: null, reference: 'ABSENT', resolution: 'NOT_APPLICABLE', task: 'OFF_TOPIC', operation: 'GENERAL_INFORMATION', authorization: 'NOT_APPLICABLE', source: 'OOS_CONTRACT',
  },
};

const deniedCreateRoles = new Set(['ROOM', 'SCHOOL', 'ORGANIZATION', 'DRIVER', 'PERSONEL', 'PARENT']);
const createExpectation = (role) => ({
  ...expectations.create,
  authorization: role === 'COMPANY' ? 'AUTHORIZED_PLANNING_INTENT'
    : role === 'SUPER_ADMIN' ? 'AUTHORIZED_OPERATION'
      : deniedCreateRoles.has(role) ? (role === 'ROOM' ? 'UNAUTHORIZED_CREATE' : 'AUTHORIZATION_DENIAL') : 'AUTHORIZATION_DENIAL',
});

const textByRole = {
  COMPANY: {
    explain: 'Planlama Merkezi ekranının işleyişini genel hatlarıyla açıklar mısın?',
    navigate: 'Planlama Merkezi ekranına geçip başlangıç noktasını söyler misin?',
    known: 'Şu vardiya kaydını günceller misin?',
    continuation1: 'İlk kontrol adımını birlikte özetleyelim.',
    create: 'Bir vardiya kaydı oluşturabilmem için hangi bilgiler gerekli?',
  },
  ROOM: {
    explain: 'Taşımacılık Firması Merkezi ekranının işleyişini açıklar mısın?',
    view: 'Taşımacılık Firması Merkezi içindeki mevcut durumu görmek istiyorum.',
    known: 'Bu vardiya kaydını günceller misin?',
    continuation1: 'İlk firma kontrolünü birlikte toparlayalım.',
    create: 'Yeni bir vardiya kaydı açmak için hangi alanlar gerekir?',
  },
  SCHOOL: {
    explain: 'Okul Planlama ekranının temel işleyişini açıklar mısın?',
    navigate: 'Okul Planlama sayfasına geçip ilk bakılacak yeri belirtir misin?',
    known: 'Şu plan kaydını günceller misin?',
    continuation1: 'İlk plan kontrolünü birlikte gözden geçirelim.',
    create: 'Bir vardiya kaydı hazırlamak için hangi bilgiler lazım?',
  },
  ORGANIZATION: {
    explain: 'Gezi / Planlama Merkezi ekranının işleyişi nedir?',
    view: 'Gezi / Planlama Merkezi içindeki güncel görünümü incelemek istiyorum.',
    known: 'Bu kayıt üzerinde güncelleme yapar mısın?',
    continuation1: 'Başlangıç kontrolünü kısaca birlikte toparlayalım.',
    create: 'Yeni bir vardiya kaydı hazırlamak için gerekli bilgileri listeler misin?',
  },
  DRIVER: {
    explain: 'Bugün ekranının temel işleyişini açıklar mısın?',
    navigate: 'Bugün sayfasına geçip ilk kontrolü nereden yapacağımı söyler misin?',
    known: 'Şu görev kaydını günceller misin?',
    continuation1: 'İlk akış noktasını birlikte değerlendirelim.',
    create: 'Yeni bir vardiya kaydı oluşturmak için hangi bilgiler gerekir?',
  },
  PERSONEL: {
    explain: 'Canlı ekranının temel işleyişini genel hatlarıyla anlatır mısın?',
    view: 'Canlı bölümündeki mevcut bilgileri görmek istiyorum.',
    known: 'Bu görev kaydını günceller misin?',
    continuation1: 'İlk kontrolü birlikte ele alalım.',
    create: 'Bir vardiya kaydı oluşturmak için hangi alanlar gerekli?',
  },
  PARENT: {
    explain: 'Canlı ekranının temel işleyişini açıklar mısın?',
    navigate: 'Canlı sayfasına geçip nereden başlayacağımı söyler misin?',
    known: 'Şu kayıt için güncelleme yapar mısın?',
    continuation1: 'İlk görünüm adımını birlikte hatırlayalım.',
    create: 'Yeni bir vardiya kaydı oluşturmak için ne gerekir?',
  },
  SUPER_ADMIN: {
    explain: 'Genel Bakış sayfasının işleyişini açıklar mısın?',
    view: 'Genel Bakış içindeki güncel bilgileri incelemek istiyorum.',
    known: 'Bu kaydı güncelleme adımını başlatır mısın?',
    continuation1: 'İlk yönetim kontrolünü birlikte sürdürelim.',
    create: 'Bir vardiya kaydı oluşturmak için hangi bilgiler gereklidir?',
  },
};

const makeCase = (role, index) => {
  const data = catalog[role];
  const texts = textByRole[role];
  const challenge = challengeClasses[index];
  let expected;
  let turns;
  let context;
  let surfacePrecondition;
  let statePrecondition;
  let referencePrecondition;
  if (index === 0) {
    expected = expectations.explain;
    turns = [texts.explain];
    context = screenContext(role);
    surfacePrecondition = `${data.screen.label} bu rol için yetkili katalog yüzeyidir.`;
    statePrecondition = 'Taze, salt-okunur ve yetkili ekran bağlamı hazırlanmıştır.';
    referencePrecondition = 'Bağımsız kayıt seçilmemiştir; istek ekranın genel kullanımına yöneliktir.';
  } else if (index === 1) {
    expected = texts.view ? expectations.view : expectations.navigate;
    turns = [texts.view || texts.navigate];
    context = screenContext(role);
    surfacePrecondition = `${data.screen.label} için makine-okunur katalog ekranı bağlanmıştır.`;
    statePrecondition = 'Taze, salt-okunur ve yazmasız ekran bağlamı hazırlanmıştır.';
    referencePrecondition = 'Bağımsız kayıt seçilmemiştir; yüzey erişimi istenmektedir.';
  } else if (index === 2) {
    expected = expectations.knownActionUnresolved;
    turns = [texts.known];
    context = noScreenContext(role);
    surfacePrecondition = 'Ekran bağlamı bilerek bağlanmamıştır; tekil hedef çözülmemiştir.';
    statePrecondition = 'İstek eylemi bilinir, ancak deiktik kayıt hedefi çözülmemiştir.';
    referencePrecondition = 'Şu/bu kayıt ifadesi vardır; geçerli tekil kayıt bağlanmaz.';
  } else if (index === 3) {
    expected = expectations.continuation;
    turns = [texts.continuation1, 'Şimdi kaldığımız adımdan devam edelim.'];
    context = screenContext(role);
    surfacePrecondition = `${data.screen.label} bağlamında aynı konuşma içinde devam edilebilir bir akış vardır.`;
    statePrecondition = 'İlk tur tamamlanmış, ikinci tur için taze devam durumu korunmuştur.';
    referencePrecondition = 'İkinci tur yalnızca önceki konuşma durumuna bağlanır; dış kayıt seçilmez.';
  } else if (index === 4) {
    expected = createExpectation(role);
    turns = [texts.create];
    context = screenContext(role);
    surfacePrecondition = `${data.screen.label} bu rol için yetkili katalog yüzeyidir.`;
    statePrecondition = 'Taze, yazmasız planlama bağlamı; holdout gerçek iş yazımı yapmaz.';
    referencePrecondition = 'Bağımsız kayıt seçilmemiştir; açık bir vardiya hazırlama niyeti vardır.';
  } else if (index === 5) {
    expected = expectations.ambiguous;
    turns = ['Hangisini seçerek ilerleyelim?'];
    context = noScreenContext(role);
    surfacePrecondition = 'Hedef yüzey ve kayıt bağlamı bilerek yoktur.';
    statePrecondition = 'Kullanıcının hangi hedefi kastettiği çözümlenmemiştir.';
    referencePrecondition = 'Hangisini ifadesi tekil hedefe bağlanamaz.';
  } else {
    expected = expectations.oos;
    turns = ['Ürünle ilgisi olmayan bir soru: yarın Ankara’da hava nasıl olacak?'];
    context = noScreenContext(role);
    surfacePrecondition = 'Genuine off-topic istek için ekran bağlamı yoktur.';
    statePrecondition = 'Ürün içi işleme geçilmemelidir.';
    referencePrecondition = 'Ürün nesnesi veya ürüne ait kayıt referansı yoktur.';
  }
  return {
    CASE_ID: `M18-R2R2R2-${role}-${String(index + 1).padStart(2, '0')}`,
    ROLE: role,
    TENANT_CONTEXT_TYPE: tenantType(role),
    TURN_COUNT: turns.length,
    TURN_1: turns[0] || null,
    TURN_2: turns[1] || null,
    TURN_3: turns[2] || null,
    SURFACE_PRECONDITION: surfacePrecondition,
    STATE_PRECONDITION: statePrecondition,
    REFERENCE_PRECONDITION: referencePrecondition,
    CHALLENGE_CLASS: challenge,
    EXPECTED_SEMANTIC_SCOPE: expected.scope,
    EXPECTED_REQUEST_MODE: expected.mode,
    EXPECTED_SEMANTIC_ACTION: expected.semantic,
    EXPECTED_ACTION: expected.action,
    EXPECTED_OBJECT: expected.object,
    EXPECTED_REFERENCE_CLASS: expected.reference,
    EXPECTED_RESOLUTION_STATUS: expected.resolution,
    EXPECTED_TASK_OR_TASK_FAMILY: expected.task,
    EXPECTED_OPERATION_OR_OPERATION_FAMILY: expected.operation,
    EXPECTED_AUTHORIZATION_CLASS: expected.authorization,
    EXPECTED_USER_BEHAVIOR: userBehavior,
    PROHIBITED_OUTCOMES: prohibited,
    CONTRACT_RATIONALE: 'Yeni R2R2R2 vakası; bilinen eylem, çözülmemiş referans, kapsam, görev ve yetki eksenleri ayrı tutulmuştur.',
    CONTRACT_SOURCE_CLASS: expected.source,
    EXECUTION_CONTEXT: context,
  };
};

const candidate = {
  schemaVersion: 'M18-FRESH-UNFROZEN-CANDIDATE-V2',
  manifestId: 'M18-ACTION-REFERENCE-R2-FRESH-UNSEEN-56-GOVERNED-V4R2R2-20261005',
  status: 'UNFROZEN_CANDIDATE',
  caseCount: 56,
  cases: roles.flatMap((role) => challengeClasses.map((_, index) => makeCase(role, index))),
};

writeFileSync(outputPath, JSON.stringify(candidate, null, 2) + '\n', 'utf8');
console.log(JSON.stringify({
  candidatePath: outputPath,
  authorContextId,
  auditorContextId,
  roleCount: roles.length,
  caseCount: candidate.cases.length,
  caseIds: candidate.cases.map((item) => item.CASE_ID),
}, null, 2));
