#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildChatHelpResponse } from '../src/ai/chat/helpComposer.js';
import { buildSuggestedChips } from '../src/ai/chat/intentRouter.js';
import { getScreenDefinitionForUser } from '../src/ai/jobGuide/screenCatalog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../..');

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function normalize(text) {
  return String(text || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\\/g, '/')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function ok(label) {
  console.log(`OK ${label}`);
}

function fail(label) {
  throw new Error(`FAIL ${label}`);
}

function assertCondition(condition, label) {
  if (condition) ok(label);
  else fail(label);
}

function must(text, needle, label) {
  if (normalize(text).includes(normalize(needle))) ok(label);
  else fail(label);
}

function includesAny(text, needles) {
  return (Array.isArray(needles) ? needles : []).some((needle) => normalize(text).includes(normalize(needle)));
}

function runMatrixCase({ id, role, path: screenPath, message, expectedTypes, forbidden = [], mustContain = [], isUnknown = false }) {
  const user = { role };
  const screenContext = { path: screenPath, label: screenPath };
  const screenDefinition = getScreenDefinitionForUser(user, screenContext);
  const response = buildChatHelpResponse({
    intent: 'CHAT_HELP',
    entityType: 'screen',
    entityId: 0,
    user,
    message,
    context: null,
    entityLabel: screenDefinition?.label || '',
    scope: { roleMode: ['DRIVER', 'PERSONEL', 'PARENT'].includes(role) ? 'SIMPLE' : 'OPERATIONS' },
    conversationState: { recentMessages: [] },
    screenContext,
    screenDefinition,
  });

  assertCondition(Array.isArray(expectedTypes) ? expectedTypes.includes(response.questionType) : response.questionType === expectedTypes, `${id} question type`);
  assertCondition(typeof response.reply === 'string' && response.reply.trim().length > 0, `${id} reply exists`);
  assertCondition(!includesAny(response.reply, ['Validation failed', 'Bunu anlayamadım']), `${id} reply avoids validation failure`);
  assertCondition(!includesAny(response.reply, ['Önce Önce', 'Sonra: Sonra', 'bak..', 'oku..', 'kontrol et..']), `${id} reply avoids double prefix`);
  assertCondition(!includesAny(response.reply, ['raw', 'payload', 'token', 'hash', 'debug', 'driver GPS', 'agreement']), `${id} reply avoids technical language`);
  for (const needle of forbidden) {
    assertCondition(!includesAny(response.reply, [needle]), `${id} forbids ${needle}`);
  }
  for (const needle of mustContain) {
    assertCondition(includesAny(response.reply, [needle]), `${id} includes ${needle}`);
  }
  if (isUnknown) {
    assertCondition(includesAny(response.reply, ['Bu ekran için detaylı rehber henüz katalogda yok', 'Görünen başlık ve panel bilgisine göre yardımcı olabilirim']), `${id} safe unknown fallback`);
    assertCondition(!includesAny(response.reply, ['rolün ilk ekranı', 'ilk ekranına']), `${id} unknown does not fall back to first role screen`);
  } else {
    assertCondition(!includesAny(response.reply, ['Önce Önce', 'Sonra: Sonra']), `${id} reply is natural`);
  }
}

function ordered(text, needles, label) {
  let last = -1;
  for (const needle of needles) {
    const idx = normalize(text).indexOf(normalize(needle));
    if (idx < 0) fail(`${label}: missing ${needle}`);
    if (idx <= last) fail(`${label}: wrong order for ${needle}`);
    last = idx;
  }
  ok(label);
}

function main() {
  console.log('=== COP-03A FIX GLOBAL SCREEN PURPOSE CHECK ===');

  const pkg = read('package.json');
  const runner = read('backend/scripts/run_product_extensions_check_chain.js');
  const verifyChain = read('backend/scripts/verify_chain_01_product_extensions_check.js');
  const schemas = read('backend/src/ai/schemas.js');
  const help = read('backend/src/ai/chat/helpComposer.js');
  const intent = read('backend/src/ai/chat/intentRouter.js');
  const catalog = read('backend/src/ai/jobGuide/screenCatalog.js');
  const roomCompany = read('backend/src/ai/jobGuide/screenCatalog.roomCompany.js');
  const pack = read('backend/src/ai/chat/goldenQuestionPack.js');

  must(pkg, '"check:cop03afix01": "node backend/scripts/cop_03a_fix_global_screen_purpose_check.js"', 'package.json exposes check:cop03afix01');
  must(pkg, '"check:cop03a"', 'package.json keeps check:cop03a');
  must(pkg, '"check:cop02bfix01"', 'package.json keeps check:cop02bfix01');
  must(pkg, '"check:product-extensions": "node backend/scripts/run_product_extensions_check_chain.js"', 'package.json keeps check:product-extensions');
  must(pkg, '"verify:final": "npm run check:m95e23c && npm run check:web-mobile && npm run check:product-extensions && npm run verify:repo && node backend/scripts/clean_snapshot_artifacts.js && npm run verify:snapshot"', 'package.json keeps verify:final product extension step');

  ordered(runner, [
    'check:op04',
    'check:qlt04b',
    'check:pay01e',
    'check:paysafe01',
    'check:web01a',
    'check:web01b',
    'check:cop01e',
    'check:cop02a',
    'check:cop02b',
    'check:cop03a',
    'check:cop03afix01',
    'check:uxkvkk01',
    'check:docsstate01',
  ], 'product extensions runner order');

  must(verifyChain, 'check:cop03afix01', 'verify chain expects cop03afix01');

  must(schemas, 'function isShortNaturalScreenPrompt(message)', 'schemas keeps short natural prompt helper');
  must(schemas, 'bura ne', 'schemas keeps bura ne phrase');
  must(schemas, 'burası ne', 'schemas keeps burası ne phrase');
  must(schemas, 'bu ekran ne', 'schemas keeps bu ekran ne phrase');
  must(schemas, 'ne yapayım', 'schemas keeps ne yapayım phrase');
  must(schemas, 'ilk neye bakayım', 'schemas keeps ilk neye bakayım phrase');
  must(schemas, 'normalized.intent = "CHAT_HELP";', 'schemas promotes short prompts to CHAT_HELP');
  must(schemas, 'normalized.entityType = "screen";', 'schemas promotes short prompts to screen entity type');

  must(help, 'normalizeVisibleReplyFragment', 'helpComposer keeps visible reply normalizer');
  must(help, 'replace(/^(?:Sonra|Sonraki)\\s+/i, \'\')', 'helpComposer strips bare next-step prefix');
  must(help, 'sameVisibleReplyFragment', 'helpComposer keeps duplicate fragment helper');
  must(help, 'Bu ekran,', 'helpComposer keeps natural screen purpose lead');
  must(help, 'İlk bakılacak yer:', 'helpComposer keeps first-bakılacak wording');
  must(help, 'NEXT_STEP: `Şimdi: ${ensureVisibleSentence(first)}`', 'helpComposer keeps now opening action wording');
  must(help, 'Şimdi: ${ensureVisibleSentence(first)}', 'helpComposer keeps action now lead');
  must(help, 'Sonra:', 'helpComposer keeps next-step wording');
  must(help, 'Bu programda bunun anlamı:', 'helpComposer keeps program meaning wording');
  must(help, 'Bu ekrandaki veriye göre', 'helpComposer keeps action lead bypass marker');
  must(help, 'return `Bu ekran, ${ensureVisibleSentence(lowercaseVisibleInitialUnlessAcronym(text))}`;', 'helpComposer keeps natural screen-purpose lead');
  must(help, 'Bu ekran için kısa rehber.', 'helpComposer keeps screen fallback lead');
  must(help, 'Bu bilgi bu rolde', 'helpComposer keeps role boundary bypass marker');
  must(help, 'FIRST_CONTROL: `İlk kontrol: ${ensureVisibleSentence(first)}`', 'helpComposer keeps first-control wording');
  must(help, "const workflowFirstControlSentence = String(questionType || '') === 'FIRST_CONTROL'", 'helpComposer keeps workflow first-control sentence');
  must(help, "String(questionType || '') === 'FIRST_CONTROL' ? buildVisibleScreenPurposeLead(firstNonEmpty(", 'helpComposer keeps workflow first-control screen-first lead');
  must(help, 'SCREEN_PURPOSE: \'\',', 'helpComposer keeps screen-purpose lead blank');
  must(help, 'sameVisibleReplyFragment(first, next)', 'helpComposer avoids duplicate next step in screen-purpose replies');
  must(help, 'sameVisibleReplyFragment(now, next)', 'helpComposer avoids duplicate next step in screen replies');
  must(help, '([.,!?;:]){2,}', 'helpComposer strips duplicate punctuation');
  must(catalog, 'Bu ekran için detaylı rehber henüz katalogda yok; görünen başlık ve panel bilgisine göre yardımcı olabilirim.', 'screen catalog keeps safe unknown fallback lead');

  const matrixCases = [
    { id: 'matrix-superadmin-purpose', role: 'SUPER_ADMIN', path: '/superadmin', message: 'burası ne', expectedTypes: ['SCREEN_PURPOSE'], mustContain: ['Sistem durumu bandı'] },
    { id: 'matrix-superadmin-commercial', role: 'SUPER_ADMIN', path: '/superadmin/commercial-core', message: 'bu ekran ne', expectedTypes: ['SCREEN_PURPOSE'], mustContain: ['Ticari akış'] },
    { id: 'matrix-superadmin-ops', role: 'SUPER_ADMIN', path: '/superadmin/operations', message: 'ne yapayım', expectedTypes: ['NEXT_STEP'], mustContain: ['Şimdi:', 'açık veya riskli'] },
    { id: 'matrix-superadmin-logexport', role: 'SUPER_ADMIN', path: '/superadmin/logexport', message: 'burası ne', expectedTypes: ['SCREEN_PURPOSE'], mustContain: ['İşlem kayıtlarını'] },
    { id: 'matrix-superadmin-natural-copilot', role: 'SUPER_ADMIN', path: '/superadmin/natural-copilot', message: 'bu ekran ne', expectedTypes: ['SCREEN_PURPOSE'], mustContain: ['doğal soru-cevap'] },
    { id: 'matrix-superadmin-launch-gate', role: 'SUPER_ADMIN', path: '/superadmin/pilot-launch-gate', message: 'ne yapayım', expectedTypes: ['NEXT_STEP'], mustContain: ['Şimdi:', 'sahaya çıkış'] },
    { id: 'matrix-superadmin-regions', role: 'SUPER_ADMIN', path: '/superadmin/regions', message: 'burası ne', expectedTypes: ['SCREEN_PURPOSE'], mustContain: ['atama sınırlarını'] },
    { id: 'matrix-superadmin-ssot', role: 'SUPER_ADMIN', path: '/superadmin/ssot-alignment', message: 'bu ekran ne', expectedTypes: ['SCREEN_PURPOSE'], mustContain: ['tek doğru kaynak'] },
    { id: 'matrix-room-map', role: 'ROOM', path: '/room/map', message: 'burası ne', expectedTypes: ['SCREEN_PURPOSE'], mustContain: ['canlı durum'] },
    { id: 'matrix-room-commercial', role: 'ROOM', path: '/room/commercial-flow', message: 'bu ne', expectedTypes: ['SCREEN_PURPOSE'], mustContain: ['ticari kayıtları'] },
    { id: 'matrix-room-reports', role: 'ROOM', path: '/room/reports', message: 'ilk neye bakayım', expectedTypes: ['FIRST_CONTROL'], mustContain: ['İlk kontrol'] },
    { id: 'matrix-room-drivers', role: 'ROOM', path: '/room/drivers', message: 'bu ne', expectedTypes: ['SCREEN_PURPOSE'], mustContain: ['Sürücü kayıtlarını'] },
    { id: 'matrix-company-purpose', role: 'COMPANY', path: '/company', message: 'burası ne', expectedTypes: ['SCREEN_PURPOSE'], mustContain: ['Yeni işi kurma ve planlama'] },
    { id: 'matrix-company-ops', role: 'COMPANY', path: '/company/operations', message: 'ne yapayım', expectedTypes: ['NEXT_STEP'], mustContain: ['Şimdi:', 'bekleyen işleri'] },
    { id: 'matrix-school-purpose', role: 'SCHOOL', path: '/school', message: 'bu ekran ne', expectedTypes: ['SCREEN_PURPOSE'], mustContain: ['Yeni işi kurma ve planlama'] },
    { id: 'matrix-school-ops', role: 'SCHOOL', path: '/school/operations', message: 'burada ne yapacağım', expectedTypes: ['SCREEN_PURPOSE', 'NEXT_STEP'], mustContain: ['Vardiyalar'] },
    { id: 'matrix-organization-purpose', role: 'ORGANIZATION', path: '/organization', message: 'burası ne', expectedTypes: ['SCREEN_PURPOSE'], mustContain: ['gezi veya organizasyon'] },
    { id: 'matrix-organization-ops', role: 'ORGANIZATION', path: '/organization/operations', message: 'ne yapayım', expectedTypes: ['NEXT_STEP'], mustContain: ['Şimdi:', 'bekleyen işleri'] },
    { id: 'matrix-driver-today', role: 'DRIVER', path: '/driver/today', message: 'bu ne', expectedTypes: ['SCREEN_PURPOSE'], mustContain: ['bugün'] },
    { id: 'matrix-driver-change-pin', role: 'DRIVER', path: '/driver/change-pin', message: 'burası ne', expectedTypes: ['SCREEN_PURPOSE'], mustContain: ['PIN'] },
    { id: 'matrix-personel-live', role: 'PERSONEL', path: '/personel/live', message: 'bu ekran ne', expectedTypes: ['SCREEN_PURPOSE'], mustContain: ['canlı'] },
    { id: 'matrix-parent-live', role: 'PARENT', path: '/parent/live', message: 'burası ne', expectedTypes: ['SCREEN_PURPOSE'], mustContain: ['canlı durum'] },
  ];

  const roles = ['SUPER_ADMIN', 'ROOM', 'COMPANY', 'SCHOOL', 'ORGANIZATION', 'DRIVER', 'PERSONEL', 'PARENT'];
  const sharedPaths = [
    ['/shared/feedback', 'burası ne işe yarar', ['SCREEN_PURPOSE'], ['Geri Bildirim'], ['haritada doğru aracı seç', 'canlı takip', 'vardiya/araç ekranına geç']],
    ['/shared/kvkk', 'burası ne', ['SCREEN_PURPOSE'], ['KVKK'], ['raw', 'payload', 'token', 'hash', 'debug']],
    ['/shared/notifications', 'bu ekran ne', ['SCREEN_PURPOSE'], ['bildirim'], ['oku..', 'tek şey']],
    ['/shared/logs', 'bu ne', ['SCREEN_PURPOSE'], ['kayıt'], ['raw', 'payload', 'token', 'hash', 'debug']],
  ];
  for (const role of roles) {
    for (const [screenPath, message, expectedTypes, mustContain, forbidden] of sharedPaths) {
      runMatrixCase({
        id: `matrix-${role.toLowerCase()}-${screenPath.replace(/\//g, '-')}-${normalize(message).replace(/\s+/g, '-')}`,
        role,
        path: screenPath,
        message,
        expectedTypes,
        mustContain,
        forbidden,
      });
    }
  }

  const mismatchDefinition = getScreenDefinitionForUser({ role: 'ROOM' }, { path: '/shared/feedback', label: 'Geri Bildirim', entityId: 9004 }, 9004);
  assertCondition(mismatchDefinition?.path === '/shared/feedback', 'path priority keeps feedback path');
  assertCondition(includesAny(mismatchDefinition?.label || '', ['Geri Bildirim']), 'path priority keeps feedback label');
  assertCondition(mismatchDefinition?.id !== 9004, 'path priority does not keep mismatched id');

  for (const role of roles) {
    runMatrixCase({
      id: `matrix-${role.toLowerCase()}-unknown`,
      role,
      path: '/mystery/unknown',
      message: 'bu ne',
      expectedTypes: ['SCREEN_PURPOSE'],
      forbidden: ['harita', 'araç seç', 'canlı takip', 'Bunu anlayamadım'],
      isUnknown: true,
    });
  }
  for (const matrixCase of matrixCases) {
    runMatrixCase(matrixCase);
  }

  const feedbackChips = buildSuggestedChips({ entityType: 'screen', questionType: 'SCREEN_PURPOSE', roleMode: 'OPERATIONS', screenPath: '/shared/feedback' });
    assertCondition(includesAny(feedbackChips.join(' '), ['Açık geri bildirimi göster', 'Kritik geri bildirimleri sırala', 'Sorumlu rolü göster', 'Geri bildirim açık']), 'feedback chips are role aware');
  const driversChips = buildSuggestedChips({ entityType: 'screen', questionType: 'SCREEN_PURPOSE', roleMode: 'OPERATIONS', screenPath: '/room/drivers' });
  assertCondition(includesAny(driversChips.join(' '), ['Bu ekranı detaylı anlat', 'Aktif sürücüler kim?', 'Görev bağlantısı var mı?', 'Sürücü durumunu açıkla']), 'drivers chips are role aware');
  const unknownChips = buildSuggestedChips({ entityType: 'screen', questionType: 'SCREEN_PURPOSE', roleMode: 'OPERATIONS', screenPath: '/mystery/unknown' });
  assertCondition(includesAny(unknownChips.join(' '), ['Bu ekran ne için var?', 'İlk neye bakayım?', 'Hangi ekrana geçeyim?']), 'unknown chips stay generic');
  assertCondition(JSON.stringify(feedbackChips) !== JSON.stringify(driversChips), 'chips differ by path');

  must(intent, "return ['Bu ekranı detaylı anlat', 'İlk neye bakayım?', 'Burada eksik ne olabilir?', 'Hangi ekrana geçmeliyim?'];", 'intent router keeps global simple screen chips');
  must(intent, "chips.push('Bu ekranı detaylı anlat', 'Aktif sürücüler kim?', 'Görev bağlantısı var mı?', 'Sürücü durumunu açıkla', 'İlgili yere götür');", 'intent router keeps global screen chips');
  must(intent, '/room/drivers', 'intent router keeps room drivers chips');
  must(intent, '/shared/feedback', 'intent router keeps feedback chips');
  must(intent, '/shared/kvkk', 'intent router keeps kvkk chips');
  must(intent, '/shared/notifications', 'intent router keeps notifications chips');
  must(intent, '/room/commercial-flow', 'intent router keeps commercial flow chips');

  must(catalog, '/shared/feedback', 'screen catalog keeps feedback screen');
  must(catalog, 'Açık veya kritik kayıt var mı.', 'screen catalog keeps feedback first step');
  must(catalog, 'Sonra tekrarlayan kayıtları ve sorumlu rolü kontrol et.', 'screen catalog keeps feedback next step');
  must(catalog, '/shared/kvkk', 'screen catalog keeps kvkk screen');
  must(catalog, 'Bu bilgi bu rolde görünmeyebilir.', 'screen catalog keeps kvkk first step');
  must(catalog, '/shared/notifications', 'screen catalog keeps notifications screen');
  must(catalog, 'Bildirimin türünü ve zamanını incele.', 'screen catalog keeps notifications first step');
  must(catalog, '/shared/logs', 'screen catalog keeps logs screen');
  must(catalog, 'Karşılaştırılacak kaydı seç.', 'screen catalog keeps logs first step');

  must(roomCompany, '/room/drivers', 'room company catalog keeps drivers screen');
  must(roomCompany, 'Sürücü kayıtlarını, görev uygunluğunu ve servis operasyonundaki sürücü durumunu görmek için kullanılır.', 'room company catalog keeps drivers natural menu purpose');
  must(roomCompany, 'Aktif/pasif sürücü durumunu ve görev bağlantısını incele.', 'room company catalog keeps drivers first step');
  must(roomCompany, 'İlgili sürücünün vardiya, araç veya bildirim durumunu kontrol et.', 'room company catalog keeps drivers next step');
  must(roomCompany, 'Bu ekranı harita ya da canlı takip ekranı sanma.', 'room company catalog keeps drivers boundary');
  must(roomCompany, 'chatQuestions: ["Bu ekran ne için var?", "Bu ne?", "Burası ne?", "İlk neye bakayım?"]', 'room company catalog keeps drivers short questions');
  must(roomCompany, 'Kaydın hangi aşamada olduğunu incele.', 'room company catalog keeps commercial flow first step');
  must(roomCompany, 'İncelenecek rapor türünü seç.', 'room company catalog keeps reports first step');

  must(pack, 'cop03a-feedback-purpose', 'golden pack keeps feedback polish case');
  must(pack, 'bak..', 'golden pack keeps feedback forbidden bak marker');
  must(pack, 'Sonra: Sonra', 'golden pack keeps feedback forbidden duplicate marker');
  must(pack, 'haritada doğru aracı', 'golden pack keeps feedback forbidden map marker');
  must(pack, 'cop03a-drivers-purpose-short', 'golden pack keeps drivers short question case');
  must(pack, 'cop03a-drivers-purpose-plain', 'golden pack keeps drivers plain question case');
  must(pack, 'Sürücüler ekranı anlatımı', 'golden pack keeps drivers expected focus');
  must(pack, 'Bunu anlayamadım', 'golden pack keeps drivers forbidden fallback marker');
  must(pack, 'cop03a-kvkk-purpose', 'golden pack keeps kvkk polish case');
  must(pack, 'kontrol et..', 'golden pack keeps kvkk forbidden control marker');
  must(pack, 'cop03a-notifications-purpose', 'golden pack keeps notifications polish case');
  must(pack, 'oku..', 'golden pack keeps notifications forbidden oku marker');
  must(pack, 'cop03a-room-commercial-flow-purpose', 'golden pack keeps commercial flow polish case');
  must(pack, 'Sonra: Sonra', 'golden pack keeps commercial flow forbidden duplicate marker');
  must(pack, 'cop03a-unknown-screen-purpose', 'golden pack keeps unknown screen case');
  must(pack, 'Güvenli bilinmeyen ekran fallbacki', 'golden pack keeps unknown screen expected focus');

  console.log('=== COP-03A FIX GLOBAL SCREEN PURPOSE CHECK PASS ===');
}

main();
