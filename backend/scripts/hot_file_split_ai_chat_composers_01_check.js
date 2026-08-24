#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { assertProductExtensionsOrder, productExtensionsChecks } from './lib/productExtensionsRegistry.js';

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

function lineCount(text) {
  return String(text || '').split(/\r?\n/).length;
}

function ok(label) {
  console.log(`OK ${label}`);
}

function fail(label) {
  throw new Error(`FAIL ${label}`);
}

function must(text, needle, label) {
  if (normalize(text).includes(normalize(needle))) ok(label);
  else fail(label);
}

function mustNot(text, needle, label) {
  if (!normalize(text).includes(normalize(needle))) ok(label);
  else fail(label);
}

function ordered(text, needles, label) {
  const haystack = normalize(text);
  let cursor = 0;
  for (const needle of needles) {
    const target = normalize(needle);
    const idx = haystack.indexOf(target, cursor);
    if (idx < 0) fail(`${label}: missing ${needle}`);
    cursor = idx + target.length;
  }
  ok(label);
}

async function main() {
  console.log('=== HOT-FILE-SPLIT-AI-CHAT-COMPOSERS-01 CHECK ===');

  const pkg = read('package.json');
  const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
  const primer = read('docs/PRIMER_SSOT.md');
  const doc = read('docs/HOT_FILE_SPLIT_AI_CHAT_COMPOSERS_01.md');
  const helpComposer = read('backend/src/ai/chat/helpComposer.js');
  const safeReplies = read('backend/src/ai/chat/helpComposerSafeReplies.js');
  const harnessCheck = read('backend/scripts/script_harness_consolidation_01_check.js');
  const harnessDoc = read('docs/SCRIPT_HARNESS_CONSOLIDATION_01.md');
  const registryScripts = productExtensionsChecks.map((step) => step.script);

  must(pkg, '"check:hotfilesplitaichatcomposers01": "node backend/scripts/hot_file_split_ai_chat_composers_01_check.js"', 'package.json exposes hot file split check');
  assertProductExtensionsOrder(['check:copilotworkflowreasoningengine01', 'check:hotfilesplitaichatcomposers01', 'check:copilotreasoninganswercomposer01'], 'product extensions registry places hot-file split between workflow reasoning and reasoning answer composer', registryScripts);
  assertProductExtensionsOrder(['check:copilotworkflowreasoningengine01', 'check:hotfilesplitaichatcomposers01', 'check:copilotreasoninganswercomposer01'], 'verify chain registry places hot-file split between workflow reasoning and reasoning answer composer', registryScripts);

  must(guide, 'HOT-FILE-SPLIT-AI-CHAT-COMPOSERS-01', 'milestone guide mentions hot file split milestone');
  must(guide, 'check:hotfilesplitaichatcomposers01', 'milestone guide exposes hot file split check');
  must(guide, 'node backend\\scripts\\hot_file_split_ai_chat_composers_01_check.js', 'milestone guide includes hot file split command');
  must(guide, 'docs/HOT_FILE_SPLIT_AI_CHAT_COMPOSERS_01.md', 'milestone guide includes hot file split doc');
  must(guide, 'backend/src/ai/chat/helpComposerSafeReplies.js', 'milestone guide includes helpComposer safe replies helper');
  ordered(guide, ['COPILOT-WORKFLOW-REASONING-ENGINE-01', 'HOT-FILE-SPLIT-AI-CHAT-COMPOSERS-01', 'COPILOT-REASONING-ANSWER-COMPOSER-01'], 'milestone guide keeps hot file split between workflow reasoning and reasoning answer composer');

  must(primer, 'HOT-FILE-SPLIT-AI-CHAT-COMPOSERS-01', 'primer mentions hot file split milestone');
  must(primer, 'check:hotfilesplitaichatcomposers01', 'primer exposes hot file split check');
  must(primer, 'docs/HOT_FILE_SPLIT_AI_CHAT_COMPOSERS_01.md', 'primer links hot file split doc');
  must(primer, 'backend/src/ai/chat/helpComposerSafeReplies.js', 'primer links helpComposer safe replies helper');
  ordered(primer, ['COPILOT-WORKFLOW-REASONING-ENGINE-01', 'HOT-FILE-SPLIT-AI-CHAT-COMPOSERS-01', 'COPILOT-REASONING-ANSWER-COMPOSER-01', 'SEFER-ABI-REASONING-ASSISTANT-01'], 'primer keeps hot file split between workflow reasoning and reasoning answer composer');

  must(doc, '# HOT FILE SPLIT AI CHAT COMPOSERS 01', 'hot file split doc title present');
  must(doc, 'docs/check milestone', 'hot file split doc keeps docs/check wording');
  must(doc, 'Canonical check: `check:hotfilesplitaichatcomposers01`', 'hot file split doc keeps canonical check wording');
  must(doc, 'backend/src/ai/chat/helpComposer.js', 'hot file split doc mentions helpComposer');
  must(doc, 'backend/src/ai/chat/helpComposerSafeReplies.js', 'hot file split doc mentions safe replies helper');
  must(doc, 'Smoke policy', 'hot file split doc says smoke policy stays untouched');
  must(doc, 'route/service/prisma', 'hot file split doc keeps route/service/prisma out of scope');
  must(doc, 'runtime AI action', 'hot file split doc keeps runtime action out of scope');
  must(doc, 'tool execution', 'hot file split doc keeps tool execution out of scope');
  must(doc, 'write-action dispatcher', 'hot file split doc keeps write-action dispatcher out of scope');

  must(helpComposer, "from './helpComposerSafeReplies.js'", 'helpComposer imports the safe replies helper file');
  must(helpComposer, 'normalizeVisibleReplyFragment', 'helpComposer keeps shared visible reply fragment import');
  mustNot(helpComposer, 'function normalizeReplySurface(', 'helpComposer no longer defines normalizeReplySurface locally');
  mustNot(helpComposer, 'function normalizeVisibleReplyFragment(', 'helpComposer no longer defines normalizeVisibleReplyFragment locally');
  mustNot(helpComposer, 'function normalizeVisibleSuggestionFragment(', 'helpComposer no longer defines normalizeVisibleSuggestionFragment locally');
  mustNot(helpComposer, 'function buildContractProductionSignalState(', 'helpComposer no longer defines buildContractProductionSignalState locally');
  mustNot(helpComposer, 'function termComparisonReplyV2(', 'helpComposer no longer defines termComparisonReplyV2 locally');
  mustNot(helpComposer, 'function applyPlainLanguage(', 'helpComposer no longer defines applyPlainLanguage locally');
  mustNot(helpComposer, 'function polishReply(', 'helpComposer no longer defines polishReply locally');
  mustNot(helpComposer, 'function buildResponseSections(', 'helpComposer no longer defines buildResponseSections locally');
  if (lineCount(helpComposer) >= 7000) fail(`helpComposer line count is too high (${lineCount(helpComposer)})`);
  ok(`helpComposer line count is under 7000 (${lineCount(helpComposer)})`);
  if (lineCount(safeReplies) <= 150) fail(`helpComposerSafeReplies line count is too small (${lineCount(safeReplies)})`);
  ok(`helpComposerSafeReplies line count is above 150 (${lineCount(safeReplies)})`);
  must(safeReplies, 'export function normalizeReplySurface', 'safe replies exports normalizeReplySurface');
  must(safeReplies, 'export function trimReplyLength', 'safe replies exports trimReplyLength');
  must(safeReplies, 'export function normalizeVisibleSuggestionFragment', 'safe replies exports normalizeVisibleSuggestionFragment');
  must(safeReplies, 'export function buildContractProductionSignalState', 'safe replies exports buildContractProductionSignalState');
  must(safeReplies, 'export function termComparisonReplyV2', 'safe replies exports termComparisonReplyV2');

  must(harnessCheck, 'backend/src/ai/chat/helpComposerSafeReplies.js', 'script harness check knows helpComposer safe replies helper');
  must(harnessCheck, 'docs/HOT_FILE_SPLIT_AI_CHAT_COMPOSERS_01.md', 'script harness check knows hot file split doc');
  must(harnessCheck, 'HOT-FILE-SPLIT-AI-CHAT-COMPOSERS-01', 'script harness check knows hot file split milestone');
  must(harnessDoc, 'backend/src/ai/chat/helpComposerSafeReplies.js', 'script harness doc lists helpComposer safe replies helper');
  must(harnessDoc, 'docs/HOT_FILE_SPLIT_AI_CHAT_COMPOSERS_01.md', 'script harness doc lists hot file split doc');
  must(harnessDoc, 'HOT-FILE-SPLIT-AI-CHAT-COMPOSERS-01', 'script harness doc lists hot file split milestone');

  console.log('=== HOT-FILE-SPLIT-AI-CHAT-COMPOSERS-01 CHECK PASS ===');
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
