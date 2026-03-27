import fs from 'fs';

function must(label, cond) {
  if (!cond) {
    console.error('FAIL', label);
    process.exit(1);
  }
  console.log('OK', label);
}

const panel = fs.readFileSync(new URL('../src/panels/shared/CopilotPanel.jsx', import.meta.url), 'utf8');
const composer = fs.readFileSync(new URL('../src/ai/chat/helpComposer.js', import.meta.url), 'utf8');

console.log('=== M71.4 COPILOT ROUTE CONTEXT + SCREEN ANALYSIS CHECK ===');
must('chat screen route sync added', panel.includes('syncChatScreenToRoute') && panel.includes('hashchange') && panel.includes('popstate'));
must('chat screen route sync uses current route', panel.includes('setChatScreenId(String(match.id))'));
must('screen analysis widened beyond entityType screen', composer.includes("const analysis = screenContext && screenDefinition ? analyzeScreenState({ screenContext, screenDefinition, conversationState }) : null;"));
console.log('=== M71.4 COPILOT ROUTE CONTEXT + SCREEN ANALYSIS CHECK PASS ===');
