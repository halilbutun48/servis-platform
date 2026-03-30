import fs from 'fs';
import path from 'path';
import { buildChatHelpResponse } from '../src/ai/chat/helpComposer.js';

function ok(msg){ console.log(`OK ${msg}`); }
function fail(msg){ console.error(`FAIL ${msg}`); process.exitCode = 1; }
function assert(cond,msg){ if(cond) ok(msg); else fail(msg); }

const repoRoot = process.cwd();
const helpPath = path.join(repoRoot, 'backend/src/ai/chat/helpComposer.js');
const panelPath = path.join(repoRoot, 'web/src/panels/shared/CopilotPanel.jsx');
const bubblePath = path.join(repoRoot, 'web/src/components/copilot/ChatMessageBubble.jsx');
const qaPath = path.join(repoRoot, 'web/src/components/copilot/ChatQuickActions.jsx');

console.log('=== M79 B4 COPILOT ROUTE CHAIN CHECK ===');
const help = fs.readFileSync(helpPath, 'utf8');
const panel = fs.readFileSync(panelPath, 'utf8');
const bubble = fs.readFileSync(bubblePath, 'utf8');
const qa = fs.readFileSync(qaPath, 'utf8');
assert(help.includes('function buildRoutePlan('), 'help composer builds route plan');
assert(help.includes("kind: 'ROUTE_CHAIN'"), 'help composer adds route chain response section');
assert(help.includes('routePlan,'), 'help composer returns route plan');
assert(panel.includes('routePlan: payload?.routePlan || null'), 'copilot panel stores route plan');
assert(bubble.includes('Hedef ekran:'), 'chat bubble renders route plan badge');
assert(qa.includes('Hedef yol:'), 'quick actions render primary route hint');
assert(qa.includes('Yol: {action.routeKey}'), 'quick actions render secondary route hint');

const resp = buildChatHelpResponse({
  entityType: 'screen',
  entityId: 0,
  user: { role: 'ROOM' },
  message: 'Konum inceleden sonra nereye geçeyim?',
  context: { type: 'screen', id: 0 },
  entityLabel: 'Oda Operasyon',
  scope: { roleMode: 'OPERATIONS' },
  conversationState: {},
  screenContext: { id: 12, path: '/room/georeview', label: 'Konum İncele', selectedLabel: 'Vardiya A', selectedEntityType: 'shift', selectedEntityId: 77 },
  screenDefinition: {
    id: 12,
    path: '/room/georeview',
    label: 'Konum İncele',
    firstStep: 'Önce seçili kaydı doğrula.',
    firstControls: ['Seçili kayıt özeti'],
    screenMenus: [
      { label: 'Vardiyalar', path: '/room/shifts', purpose: 'Vardiya durumunu okursun.' },
      { label: 'Ticari Akış', path: '/room/commercial-flow', purpose: 'Ticari durumu açarsın.' },
    ],
    chatQuestions: ['Bu kayıt ne durumda?'],
  },
  sourceEntityType: 'screen',
  sourceEntityId: 12,
  resolvedEntityType: 'shift',
  resolvedEntityId: 77,
});
assert(resp.routePlan && resp.routePlan.primaryRouteLabel, 'route plan primary route exists');
assert(Array.isArray(resp.routePlan?.steps) && resp.routePlan.steps.length >= 2, 'route plan has steps');
assert(Array.isArray(resp.responseSections) && resp.responseSections.some((x) => x.kind === 'ROUTE_CHAIN'), 'response includes route chain section');

if (process.exitCode) process.exit(process.exitCode);
console.log('PASS M79 B4 copilot route chain check');
