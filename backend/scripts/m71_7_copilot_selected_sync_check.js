import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.argv[2] || process.cwd();
const copilotPath = path.join(repoRoot, 'web', 'src', 'panels', 'shared', 'CopilotPanel.jsx');
const composerPath = path.join(repoRoot, 'backend', 'src', 'ai', 'chat', 'helpComposer.js');

const copilot = fs.readFileSync(copilotPath, 'utf8');
const composer = fs.readFileSync(composerPath, 'utf8');

function ok(cond, msg) {
  if (!cond) {
    console.error('FAIL', msg);
    process.exit(1);
  }
  console.log('OK', msg);
}

console.log('=== M71.7 COPILOT SELECTED ENTITY SYNC CHECK ===');
ok(copilot.includes('setChatSelection(next);'), 'CopilotPanel syncs chat selection');
ok(copilot.includes('setChatEntityType(nextType);'), 'CopilotPanel applies selected entity type');
ok(copilot.includes('setChatEntityId(String(nextId));'), 'CopilotPanel applies selected entity id');
ok(copilot.includes('selectedEntityType: chatSelection?.entityType || ""'), 'CopilotPanel sends selectedEntityType');
ok(
  composer.includes(`if (questionType === 'STATUS_HELP') {`) &&
    composer.includes('selectedRowReadReply(screenContext, screenDefinition);'),
  'helpComposer prefers selected row status for screen context',
);
ok(composer.includes('Hazır saymak için önce bu eksik veya blokajları kapat.'), 'helpComposer gives concrete readiness follow-up');
console.log('=== M71.7 COPILOT SELECTED ENTITY SYNC CHECK PASS ===');
