import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { scoreGoldenQuestionPack } from '../src/ai/chat/qualityScorer.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../..');
const file = (rel) => path.join(root, rel.replace(/\\/g, '/'));
const read = (rel) => fs.readFileSync(file(rel), 'utf8');

function ok(msg) { console.log(`OK ${msg}`); }
function fail(msg) { console.error(`FAIL ${msg}`); process.exitCode = 1; }
function has(rel) {
  if (fs.existsSync(file(rel))) ok(`${rel} exists`); else fail(`${rel} exists`);
}
function textHas(rel, pattern, msg) {
  const text = read(rel);
  if (pattern.test(text)) ok(msg); else fail(msg);
}

console.log('=== M79 D1 COPILOT ACCEPTANCE PACK ===');

const primerText = read('docs/PRIMER_SSOT.md');
const checklistText = read('docs/CHECKLIST_SSOT.md');
const registryText = read('docs/MILESTONE_REGISTRY_V1.md');

for (const rel of [
  'backend/src/ai/chat/helpComposer.js',
  'backend/src/ai/chat/goldenQuestionPack.js',
  'backend/src/ai/chat/qualityScorer.js',
  'web/src/copilot/screenRegistry.js',
  'web/src/panels/shared/CopilotPanel.jsx',
  'web/src/components/copilot/ChatMessageBubble.jsx',
  'web/src/components/copilot/ChatQuickActions.jsx',
  'web/src/components/copilot/ChatQualitySummary.jsx',
  'docs/PRIMER_SSOT.md',
  'docs/CHECKLIST_SSOT.md',
  'docs/MILESTONE_REGISTRY_V1.md',
  'docs/RUNBOOK_M79_COPILOT_ACCEPTANCE.md',
  'tools/pack_m79_copilot_acceptance.ps1',
]) has(rel);

textHas('backend/src/ai/chat/helpComposer.js', /normalizeEverydayQuestion/, 'help composer keeps everyday question normalizer');
textHas('backend/src/ai/chat/helpComposer.js', /extractPrimaryConcern/, 'help composer keeps primary concern extractor');
textHas('backend/src/ai/chat/helpComposer.js', /responseSections/, 'help composer returns response sections');
textHas('backend/src/ai/chat/helpComposer.js', /qualityHints/, 'help composer returns quality hints');
textHas('backend/src/ai/chat/helpComposer.js', /continuityMeta/, 'help composer returns follow-up continuity');
textHas('backend/src/ai/chat/helpComposer.js', /uncertaintyMeta/, 'help composer returns uncertainty meta');
textHas('backend/src/ai/chat/helpComposer.js', /routePlan/, 'help composer returns route plan');
textHas('web/src/panels/shared/CopilotPanel.jsx', /ChatQualitySummary/, 'copilot panel renders quality summary');
textHas('web/src/panels/shared/CopilotPanel.jsx', /screenRegistry/, 'copilot panel uses shared screen registry');
textHas('web/src/components/copilot/ChatMessageBubble.jsx', /screenLabel|linkedGuides|ChatQuickActions/, 'chat bubble keeps screen context hooks');
textHas('web/src/components/copilot/ChatQuickActions.jsx', /Bu ekrana git|Buraya git|Rehberi aç/, 'quick actions keep plain Turkish action labels');
if (/M79|M79 acceptance|Copilot acceptance/i.test(primerText) || /M79|Copilot Acceptance/i.test(checklistText) || /M79|Copilot Acceptance/i.test(registryText)) ok('primer keeps M79 visibility'); else fail('primer keeps M79 visibility');
if (/M79.*kapalı kabul|M79 acceptance|Copilot acceptance/i.test(primerText) || /M79/.test(checklistText) || /M79/.test(registryText)) ok('primer includes M79 closure visibility'); else fail('primer includes M79 closure visibility');
textHas('docs/RUNBOOK_M79_COPILOT_ACCEPTANCE.md', /M79 COPILOT ACCEPTANCE PACK/, 'runbook names M79 acceptance pack');

const report = scoreGoldenQuestionPack();
if (report.totalCases >= 27) ok(`golden pack case count ${report.totalCases}`); else fail(`golden pack case count ${report.totalCases}`);
if ((report.overall?.score || 0) >= 0.95) ok(`overall score ${report.overall.score}`); else fail(`overall score ${report.overall?.score || 0}`);
for (const role of ['ROOM','COMPANY','SCHOOL','ORGANIZATION','SUPER_ADMIN','DRIVER','PERSONEL','PARENT']) {
  const score = report.byRole?.[role]?.score || 0;
  if (score >= 0.90) ok(`${role} score ${score}`); else fail(`${role} score ${score}`);
}
for (const type of ['NEXT_SCREEN','STATUS_HELP','WHY_BLOCKED','ROLE_HELP']) {
  const score = report.byType?.[type]?.score || 0;
  if (score >= 0.90) ok(`${type} score ${score}`); else fail(`${type} score ${score}`);
}
const weakest = Array.isArray(report.weakestCases) ? report.weakestCases : [];
const weakestScore = weakest.length ? Math.min(...weakest.map((x) => Number(x?.score || 0))) : 0;
if (weakest.length >= 3) ok('weakest cases reported'); else fail('weakest cases reported');
if (weakestScore >= 0.875) ok(`weakest case floor ${weakestScore}`); else fail(`weakest case floor ${weakestScore}`);

if (!process.exitCode) console.log('PASS M79 D1 copilot acceptance pack');
