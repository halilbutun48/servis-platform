#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { assertProductExtensionsIncludes, assertProductExtensionsOrder, productExtensionsChecks } from './lib/productExtensionsRegistry.js';

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

function must(text, needle, label) {
  if (normalize(text).includes(normalize(needle))) ok(label);
  else fail(label);
}

function mustNot(text, needle, label) {
  if (!normalize(text).includes(normalize(needle))) ok(label);
  else fail(label);
}

function ordered(text, needles, label) {
  let last = -1;
  const haystack = normalize(text);
  for (const needle of needles) {
    const target = normalize(needle);
    const pattern = new RegExp(`(?:^|[^\\p{L}\\p{N}])${target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?:$|[^\\p{L}\\p{N}])`, 'iu');
    const slice = haystack.slice(last + 1);
    const match = slice.match(pattern);
    if (!match) fail(`${label}: missing ${needle}`);
    const idx = last + 1 + (match.index || 0);
    if (idx <= last) fail(`${label}: wrong order for ${needle}`);
    last = idx;
  }
  ok(label);
}

console.log('=== COP-03C-FIX-01 LIVE WORKFLOW ANSWER QUALITY CHECK ===');

const pkg = read('package.json');
const guide = read('docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md');
const doc = read('docs/COPILOT_LIVE_DATA_ACTION_SIMULATION_V1.md');
const helpComposer = read('backend/src/ai/chat/helpComposer.js');
const intentRouter = read('backend/src/ai/chat/intentRouter.js');
const facts = read('web/src/utils/copilotFacts.js');
const registryScripts = productExtensionsChecks.map((step) => step.script);

must(pkg, '"check:cop03cfix01": "node backend/scripts/cop_03c_fix_01_live_workflow_answer_quality_check.js"', 'package.json exposes check:cop03cfix01');
must(pkg, '"check:cop03c"', 'package.json keeps check:cop03c');
must(pkg, '"check:cop03b"', 'package.json keeps check:cop03b');
must(pkg, '"check:cop03afix02"', 'package.json keeps check:cop03afix02');
must(pkg, '"check:cop03afix01"', 'package.json keeps check:cop03afix01');

assertProductExtensionsOrder([
  'check:cop03a',
  'check:cop03afix01',
  'check:cop03afix02',
  'check:cop03b',
  'check:cop03c',
  'check:cop03cfix01',
  'check:uxkvkk01',
  'check:docsstate01',
], 'product extensions registry order keeps cop03cfix01 after cop03c', registryScripts);

assertProductExtensionsIncludes('check:cop03cfix01', 'product extensions registry references check:cop03cfix01', registryScripts);
assertProductExtensionsIncludes('check:cop03cfix01', 'verify chain registry keeps check:cop03cfix01', registryScripts);
must(guide, 'check:cop03cfix01', 'script guide exposes check:cop03cfix01');
must(doc, 'COP-03C-FIX-01', 'workflow doc keeps fix heading visible');
must(doc, 'selected-record mismatch', 'workflow doc keeps mismatch wording visible');

must(helpComposer, 'const workflowStyle = shouldUseWorkflowGuide({ questionType, activeTopic: firstNonEmpty(contextPriority?.activeTopic, selectedDiagnosticTheme(message), \'\') });', 'workflow style guard is active-topic aware');
must(helpComposer, "const screenLead = workflowStyle", 'workflow replies reuse workflow-aware lead');
must(helpComposer, "screenLeadIntro = workflowStyle ? '' : ensureVisibleSentence(screenLead);", 'workflow replies suppress purpose intro');
must(helpComposer, 'const workflowStyle = shouldUseWorkflowGuide({ questionType, activeTopic: firstNonEmpty(contextPriority?.activeTopic, selectedDiagnosticTheme(effectiveMessage), \'\') });', 'chat response workflow style is active-topic aware');
must(helpComposer, 'const workflowContextSummary = workflowVisibleFragments([', 'workflow context summary stays short on workflow replies');
must(helpComposer, 'selectedRecordMismatchLead', 'selected record mismatch guard exists');
must(helpComposer, 'selectedRecordMismatchLead,', 'workflow priority prefers mismatch lead');
must(helpComposer, 'summary: workflowStyle ?', 'workflow-aware summary branch exists');
must(helpComposer, 'contextPriority?.selectedRecordMismatchLead,', 'workflow summary keeps mismatch lead in the short branch');
must(helpComposer, 'contextPriority?.diagnosticPriority?.summary,', 'workflow summary keeps diagnostic summary in the short branch');
must(helpComposer, 'contextPriority?.evidenceConfidence,', 'workflow summary keeps evidence confidence in the short branch');
must(helpComposer, 'contextPriority?.activeTopicLabel,', 'workflow summary keeps active topic label in the short branch');
mustNot(helpComposer, 'contextPriority?.summaryLead, reply', 'workflow summary skips stale guide summary field');
must(helpComposer, 'Şimdi: ${ensureVisibleSentence(workflowNow)} Bu programda bunun anlamı: ${programMeaning}', 'workflow replies use signal-based now lead');
mustNot(helpComposer, 'Şimdi: ${screenLead} Bu programda bunun anlamı: ${programMeaning}', 'workflow replies do not repeat screen purpose after now lead');
must(helpComposer, 'pathLooksLikeWorkflowSurface(sourcePath) && (selectedDiagnosticTheme(text) || isCommercialFlowContractToShiftQuestion(text))', 'workflow remap guard keeps current screen');
must(helpComposer, 'if (/(sorun ne|sorunu ne|ne sorun|problem ne)/.test(text)) return \'WHY_BLOCKED\';', 'operation health question routes to WHY_BLOCKED');
must(helpComposer, "if (hasSignals && roleBoundary) return 'Ekrandaki sinyale göre konuşuyorum; bu bilgi ayrıca yetki sınırına takılıyor olabilir.';", 'workflow signal keeps role boundary secondary');
must(helpComposer, 'const workflowTopic = isWorkflowTopic(activeTopic) || isWorkflowDiagnosticQuestionType(questionType);', 'workflow chips know workflow topics');
must(helpComposer, 'if (hasSelectedRecord && !workflowTopic && !path.includes(\'/parent/live\'))', 'workflow chips suppress generic selected-record chips');
must(helpComposer, 'const contextSummary = workflowStyle', 'workflow context summary branch is active');
must(helpComposer, 'const workflowNow = pickWorkflowVisibleReply(', 'workflow reply opens with diagnostic summary');
must(helpComposer, ".replace(/blokajı|blokaj/giu, (match) => String(match).toLocaleLowerCase('tr-TR').includes('ı') ? 'engeli' : 'engel')", 'plain language keeps blokaj as engeli');
must(helpComposer, 'Sözleşme → vardiya', 'workflow vocabulary keeps contract wording');
must(helpComposer, 'Sürücünün telefon GPS’i', 'workflow vocabulary keeps driver GPS wording');
mustNot(helpComposer, 'Bu ekran, teklifin temel bilgilerini kontrol et, sonra eksik var mı bak.', 'stale offer-purpose intro is not hardcoded');

must(intentRouter, 'sözleşmeden bugün vardiya üretildi mi', 'intent router keeps contract-to-shift wording');
must(intentRouter, 'sorun ne', 'intent router captures generic problem question');
must(intentRouter, 'CONTRACT_TO_SHIFT', 'intent router keeps contract-to-shift intent');
must(intentRouter, 'WHY_BLOCKED', 'intent router keeps why-blocked intent');

must(facts, 'normalizeStatusDisplayText', 'fact helper normalizes status text');
must(facts, 'const selectedRecordStatusText = normalizeStatusDisplayText(', 'status text normalization is used in readonly facts');
must(facts, "screenType: 'SHIFTS'", 'shift facts reuse readonly fact helper');
must(facts, "screenType: 'MAP'", 'map facts reuse readonly fact helper');
must(facts, "screenType: 'COMMERCIAL_FLOW'", 'commercial flow facts reuse readonly fact helper');

console.log('=== COP-03C-FIX-01 LIVE WORKFLOW ANSWER QUALITY CHECK PASS ===');
