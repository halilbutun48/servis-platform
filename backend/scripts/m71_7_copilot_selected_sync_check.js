import fs from 'node:fs';
import path from 'node:path';

const repoRoot = process.argv[2] || process.cwd();


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
ok(includesText(copilot, 'setChatSelection(next);'), 'CopilotPanel syncs chat selection');
ok(includesText(copilot, 'setChatEntityType(nextType);'), 'CopilotPanel applies selected entity type');
ok(includesText(copilot, 'setChatEntityId(String(nextId));'), 'CopilotPanel applies selected entity id');
ok(includesText(copilot, 'selectedEntityType: chatSelection?.entityType || ""'), 'CopilotPanel sends selectedEntityType');
ok(
  includesText(composer, `if (questionType === 'STATUS_HELP') {`) &&
    includesText(composer, 'selectedRowReadReply(screenContext, screenDefinition);'),
  'helpComposer prefers selected row status for screen context',
);
ok(includesText(composer, 'Hazır saymak için önce bu eksik veya blokajları kapat.'), 'helpComposer gives concrete readiness follow-up');
console.log('=== M71.7 COPILOT SELECTED ENTITY SYNC CHECK PASS ===');
