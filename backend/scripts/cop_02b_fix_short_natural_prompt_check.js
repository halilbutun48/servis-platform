import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeCopilotRequestInput, normalizeCopilotShortPrompt, parseCopilotRequest } from '../src/ai/schemas.js';
import { buildChatHelpResponse, extractPrimaryConcern, normalizeEverydayQuestion } from '../src/ai/chat/helpComposer.js';
import { detectQuestionIntent } from '../src/ai/chat/intentRouter.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../..');

function file(rel) {
  return path.join(root, rel.replace(/\\/g, '/'));
}

function read(rel) {
  return fs.readFileSync(file(rel), 'utf8');
}

function has(rel) {
  if (fs.existsSync(file(rel))) ok(`${rel} exists`);
  else fail(`${rel} exists`);
}

function ok(msg) {
  console.log(`OK ${msg}`);
}

function fail(msg) {
  console.error(`FAIL ${msg}`);
  process.exitCode = 1;
}

function must(condition, label) {
  if (condition) ok(label);
  else fail(label);
}

function mustText(text, needle, label) {
  if (String(text || '').includes(needle)) ok(label);
  else fail(label);
}

function mustNotText(text, needle, label) {
  if (!String(text || '').includes(needle)) ok(label);
  else fail(label);
}

console.log('=== COP-02B SHORT NATURAL PROMPT FIX CHECK ===');

const pkg = read('package.json');
const routeText = read('backend/src/routes/ai.js');
const schemasText = read('backend/src/ai/schemas.js');
const helpComposerText = read('backend/src/ai/chat/helpComposer.js');
const intentRouterText = read('backend/src/ai/chat/intentRouter.js');
const panelText = read('web/src/panels/shared/CopilotPanel.jsx');

has('backend/scripts/cop_02b_fix_short_natural_prompt_check.js');
mustText(pkg, '"check:cop02bfix01": "node backend/scripts/cop_02b_fix_short_natural_prompt_check.js"', 'package.json exposes check:cop02bfix01');
mustText(pkg, '"check:cop02b"', 'package.json preserves check:cop02b');
mustText(pkg, '"check:cop02a"', 'package.json preserves check:cop02a');
mustText(pkg, '"check:product-extensions"', 'package.json preserves check:product-extensions');
mustText(pkg, '"verify:final"', 'package.json preserves verify:final');

mustText(schemasText, 'normalizeCopilotShortPrompt', 'schemas keeps short prompt normalizer');
mustText(schemasText, 'normalizeCopilotRequestInput', 'schemas keeps request normalizer');
mustText(schemasText, 'entityType === "screen"', 'schemas keeps screen chat normalization path');
mustText(schemasText, 'screen chat entityId cannot be negative', 'schemas keeps screen chat entityId guard');
mustText(schemasText, 'entityId must be positive', 'schemas keeps positive entityId guard');

mustText(helpComposerText, 'bura ne', 'helpComposer recognizes "bura ne"');
mustText(helpComposerText, 'burası ne', 'helpComposer recognizes "burası ne"');
mustText(helpComposerText, 'bu ne', 'helpComposer recognizes "bu ne"');
mustText(helpComposerText, 'ne bu', 'helpComposer recognizes "ne bu"');
mustText(helpComposerText, 'burda ne var', 'helpComposer recognizes "burda ne var"');
mustText(helpComposerText, 'burası ne işe yar', 'helpComposer recognizes "burası ne işe yarıyor"');
mustText(helpComposerText, 'bu ekran ne', 'helpComposer recognizes "bu ekran ne"');
mustText(helpComposerText, 'ne yapay', 'helpComposer recognizes "ne yapayım"');
mustText(helpComposerText, 'Şimdi ne yapayım?', 'helpComposer keeps next-step normalization');
mustText(helpComposerText, 'Bu ekran ne için?', 'helpComposer keeps screen-purpose normalization');
mustText(helpComposerText, 'SCREEN_PURPOSE: \'Ekran amacı\'', 'helpComposer exposes screen-purpose topic label');
mustText(helpComposerText, 'case \'SCREEN_PURPOSE\'', 'helpComposer keeps screen-purpose chip case');
mustText(helpComposerText, 'return \'Bu ekran ne için?\'', 'helpComposer normalizes screen-purpose slang');
mustText(helpComposerText, 'return \'Şimdi ne yapayım?\'', 'helpComposer normalizes next-step slang');

mustText(intentRouterText, 'bura ne', 'intentRouter accepts "bura ne"');
mustText(intentRouterText, 'burası ne', 'intentRouter accepts "burası ne"');
mustText(intentRouterText, 'bu ne', 'intentRouter accepts "bu ne"');
mustText(intentRouterText, 'ne bu', 'intentRouter accepts "ne bu"');
mustText(intentRouterText, 'burda ne var', 'intentRouter accepts "burda ne var"');
mustText(intentRouterText, 'burası ne işe yar', 'intentRouter accepts "burası ne işe yarıyor"');
mustText(intentRouterText, 'ne yapay', 'intentRouter accepts "ne yapayım"');
mustText(intentRouterText, 'SCREEN_PURPOSE', 'intentRouter can route screen purpose');
mustText(intentRouterText, 'NEXT_STEP', 'intentRouter can route next step');

mustText(routeText, 'normalizeCopilotRequestInput', 'ai route normalizes copilot request input');
mustText(routeText, 'Bunu anlayamadım. Kısaca ne yapmak istediğini yazabilir misin?', 'ai route uses friendly fallback');
mustNotText(routeText, 'Validation failed', 'ai route avoids raw Validation failed');
mustNotText(panelText, 'Validation failed', 'CopilotPanel avoids raw Validation failed');

const normalizedPurpose = normalizeEverydayQuestion('bura ne');
must(normalizedPurpose === 'Bu ekran ne için?', 'bura ne normalizes to screen purpose');
const normalizedShort = normalizeCopilotShortPrompt('ne yapayım');
must(normalizedShort === 'Şimdi ne yapayım?', 'ne yapayım normalizes to next step');
const extractedPurpose = extractPrimaryConcern('bura ne');
must(extractedPurpose === 'Bu ekran ne için?', 'bura ne primary concern normalizes');
const normalizedRequest = normalizeCopilotRequestInput({
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: 0,
  message: 'bura ne',
  screenContext: { id: 3105, path: '/driver/copilot', label: 'Copilot' },
  conversationState: { lastScreenId: 3105, lastScreenPath: '/driver/copilot', recentMessages: [{ role: 'assistant', text: 'Şimdi Sürücüler ekranındasın.' }] },
});
must(Number(normalizedRequest.entityId) >= 0, 'screen chat request normalization keeps entityId non-negative');
must(String(normalizedRequest.message || '') === 'Bu ekran ne için?', 'screen chat request normalization rewrites message');
const parsed = parseCopilotRequest({
  intent: 'CHAT_HELP',
  entityType: 'screen',
  entityId: 0,
  message: 'bura ne',
  screenContext: { id: 3105, path: '/driver/copilot', label: 'Copilot' },
  conversationState: { lastScreenId: 3105, lastScreenPath: '/driver/copilot', recentMessages: [{ role: 'assistant', text: 'Şimdi Sürücüler ekranındasın.' }] },
});
must(Boolean(parsed.success), 'bura ne does not fail validation');
must(parsed.success && Number(parsed.data.entityId) >= 0, 'screen chat entityId stays non-negative');
const purposeIntent = detectQuestionIntent(normalizedPurpose, { entityType: 'screen', screenPath: '/driver/copilot' });
must(String(purposeIntent.questionType || '') === 'SCREEN_PURPOSE', 'bura ne routes to SCREEN_PURPOSE intent');
const nextIntent = detectQuestionIntent(normalizedShort, { entityType: 'screen', screenPath: '/driver/copilot' });
must(['NEXT_STEP', 'SAFE_NEXT_STEP'].includes(String(nextIntent.questionType || '')), 'ne yapayım routes to next-step intent');

const response = buildChatHelpResponse({
  entityType: 'screen',
  entityId: 3105,
  user: { role: 'DRIVER' },
  message: 'bura ne',
  context: {
    type: 'screen',
    id: 3105,
    roleKey: 'DRIVER',
    roleLabel: 'DRIVER',
    label: 'Copilot',
    menuPurpose: 'Sürücünün ekranda ne yapacağını anlaması için sade yardım verir.',
    firstStep: 'Önce hangi ekranı anlamak istediğini seç.',
    nextStep: 'Gerekirse ilgili ekrana git.',
    chatQuestions: ['Bu ekran ne için var?', 'Şimdi ne yapayım?'],
  },
  entityLabel: 'Copilot • DRIVER',
  scope: { role: 'DRIVER', roleMode: 'SIMPLE', summary: 'DRIVER rolü için ekran rehberi okundu' },
  conversationState: { lastQuestionType: 'SCREEN_PURPOSE', recentMessages: [{ role: 'assistant', text: 'Şimdi Sürücüler ekranındasın.' }, { role: 'user', text: 'bura ne' }] },
  screenContext: { id: 3105, path: '/driver/copilot', label: 'Copilot', selectedLabel: 'Copilot', selectedSummary: 'Copilot ekranı' },
  screenDefinition: {
    id: 3105,
    path: '/driver/copilot',
    label: 'Copilot',
    menuPurpose: 'Sürücünün ekranda ne yapacağını anlaması için sade yardım verir.',
    firstStep: 'Önce hangi ekranı anlamak istediğini seç.',
    nextStep: 'Gerekirse ilgili ekrana git.',
    chatQuestions: ['Bu ekran ne için var?', 'Şimdi ne yapayım?'],
  },
  sourceEntityType: 'screen',
  sourceEntityId: 3105,
  resolvedEntityType: 'screen',
  resolvedEntityId: 3105,
});

must(Boolean(String(response?.summary || '').includes('sade yardım verir') || String(response?.reply || '').includes('Şimdi') || String(response?.reply || '').includes('Sürücünün')), 'bura ne returns a usable screen-purpose reply');
mustNotText(response?.reply || '', 'Validation failed', 'response avoids raw Validation failed');
must(Array.isArray(response?.contextualSuggestedChips), 'response exposes contextual chips');
must((response?.contextualSuggestedChips || []).some((item) => String(item || '').includes('Bu ekran ne için var')), 'response suggests screen-purpose follow-up');
must((response?.contextualSuggestedChips || []).length <= 4, 'response keeps contextual chips compact');
must(String(response?.questionType || '') === 'SCREEN_PURPOSE', 'bura ne routes to SCREEN_PURPOSE');

const nextResponse = buildChatHelpResponse({
  entityType: 'screen',
  entityId: 3105,
  user: { role: 'DRIVER' },
  message: 'ne yapayım',
  context: {
    type: 'screen',
    id: 3105,
    roleKey: 'DRIVER',
    roleLabel: 'DRIVER',
    label: 'Copilot',
    menuPurpose: 'Sürücünün ekranda ne yapacağını anlaması için sade yardım verir.',
    firstStep: 'Önce hangi ekranı anlamak istediğini seç.',
    nextStep: 'Gerekirse ilgili ekrana git.',
  },
  entityLabel: 'Copilot • DRIVER',
  scope: { role: 'DRIVER', roleMode: 'SIMPLE', summary: 'DRIVER rolü için ekran rehberi okundu' },
  conversationState: { lastQuestionType: 'NEXT_STEP', recentMessages: [{ role: 'assistant', text: 'Şimdi Sürücüler ekranındasın.' }, { role: 'user', text: 'ne yapayım' }] },
  screenContext: { id: 3105, path: '/driver/copilot', label: 'Copilot' },
  screenDefinition: {
    id: 3105,
    path: '/driver/copilot',
    label: 'Copilot',
    firstStep: 'Önce hangi ekranı anlamak istediğini seç.',
    nextStep: 'Gerekirse ilgili ekrana git.',
  },
  sourceEntityType: 'screen',
  sourceEntityId: 3105,
  resolvedEntityType: 'screen',
  resolvedEntityId: 3105,
});

must(String(nextResponse?.questionType || '') === 'NEXT_STEP' || String(nextResponse?.questionType || '') === 'SAFE_NEXT_STEP', 'ne yapayım routes to next-step');
mustNotText(nextResponse?.reply || '', 'Validation failed', 'next-step response avoids raw Validation failed');

console.log('PASS COP-02B short natural prompt fix check');
