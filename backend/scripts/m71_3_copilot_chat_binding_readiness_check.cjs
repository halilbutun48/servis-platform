const fs = require('fs');
const path = require('path');

function ok(msg) { console.log(`OK ${msg}`); }
function fail(msg) { console.error(`FAIL ${msg}`); process.exit(1); }

console.log('=== M71.3 COPILOT CHAT BINDING + READINESS CHECK ===');

const backendRoot = path.join(__dirname, '..');
const repoRoot = path.join(backendRoot, '..');
const copilotPanel = fs.readFileSync(path.join(repoRoot, 'web', 'src', 'panels', 'shared', 'CopilotPanel.jsx'), 'utf8');
const helpComposer = fs.readFileSync(path.join(backendRoot, 'src', 'ai', 'chat', 'helpComposer.js'), 'utf8');

if (!copilotPanel.includes('window.addEventListener("hashchange", syncChatScreenToRoute)')) fail('CopilotPanel route sync missing');
ok('CopilotPanel route sync present');
if (!copilotPanel.includes('setChatScreenId(String(match.id))')) fail('CopilotPanel hard screen sync missing');
ok('CopilotPanel hard screen sync present');
if (!helpComposer.includes("screenContext?.path ? analyzeScreenState")) fail('helpComposer screenContext-based analysis missing');
ok('helpComposer screenContext-based analysis present');
if (!helpComposer.includes("questionType === 'READINESS_CHECK'")) fail('readiness branch missing');
ok('readiness branch present');
console.log('=== M71.3 COPILOT CHAT BINDING + READINESS CHECK PASS ===');
