import fs from 'fs';
import path from 'path';
import { buildChatHelpResponse } from '../src/ai/chat/helpComposer.js';

function ok(msg){ console.log(`OK ${msg}`); }
function fail(msg){ console.error(`FAIL ${msg}`); process.exitCode = 1; }
function assert(cond,msg){ if(cond) ok(msg); else fail(msg); }

const repoRoot = process.cwd();


function normalizeText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[İI]/g, "i")
    .replace(/[ı]/g, "i")
    .replace(/[Şş]/g, "s")
    .replace(/[Ğğ]/g, "g")
    .replace(/[Üü]/g, "u")
    .replace(/[Öö]/g, "o")
    .replace(/[Çç]/g, "c")
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\\/g, "/")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
function includesText(text, needle) {
  return normalizeText(text).includes(normalizeText(needle));
}
function includesAnyText(text, needles) {
  return (needles || []).some((needle) => includesText(text, needle));
}
const helpPath = path.join(repoRoot, 'backend/src/ai/chat/helpComposer.js');
const panelPath = path.join(repoRoot, 'web/src/panels/shared/CopilotPanel.jsx');
const bubblePath = path.join(repoRoot, 'web/src/components/copilot/ChatMessageBubble.jsx');
const qaPath = path.join(repoRoot, 'web/src/components/copilot/ChatQuickActions.jsx');

console.log('=== M79 B4 COPILOT ROUTE CHAIN CHECK ===');
const help = fs.readFileSync(helpPath, 'utf8');
const panel = fs.readFileSync(panelPath, 'utf8');
const bubble = fs.readFileSync(bubblePath, 'utf8');
const qa = fs.readFileSync(qaPath, 'utf8');
assert(includesText(help, 'function buildRoutePlan('), 'help composer builds route plan');
assert(includesText(help, "kind: 'ROUTE_CHAIN'"), 'help composer adds route chain response section');
assert(includesText(help, 'routePlan,'), 'help composer returns route plan');
assert(includesText(panel, 'routePlan: payload?.routePlan || null'), 'copilot panel stores route plan');
assert(includesText(bubble, 'Hedef ekran:'), 'chat bubble renders route plan badge');
assert(!includesAnyText(qa, ['Hedef yol:', 'Yol: {action.routeKey}']), 'quick actions keep route-key labels hidden');

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
