import fs from 'fs';
import path from 'path';

const repoRoot = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(process.cwd(), '..');


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
const copilotPanelPath = path.join(repoRoot, 'web', 'src', 'panels', 'shared', 'CopilotPanel.jsx');
const helpComposerPath = path.join(repoRoot, 'backend', 'src', 'ai', 'chat', 'helpComposer.js');

function must(text, needle, label) {
  if (!includesText(text, needle)) {
    console.error(`FAIL ${label}`);
    process.exit(1);
  }
  console.log(`OK ${label}`);
}

const panel = fs.readFileSync(copilotPanelPath, 'utf8');
const composer = fs.readFileSync(helpComposerPath, 'utf8');

console.log('=== M71.6 COPILOT SELECTED ENTITY FIRST CHECK ===');
must(panel, 'const selectedType = String(chatSelection?.entityType || "");', 'CopilotPanel reads selected entity type');
must(panel, 'setChatEntityType((prev) => (prev === selectedType ? prev : selectedType));', 'CopilotPanel syncs selected entity type');
must(panel, 'selectedEntityType: chatSelection?.entityType || ""', 'CopilotPanel sends selected entity type');
must(panel, 'selectedEntityId: Number(chatSelection?.entityId || 0) || null', 'CopilotPanel sends selected entity id');
must(composer, "const shouldPreferEntity = recordScopedQuestion && entityType !== 'screen' && !!context;", 'helpComposer prefers entity on record scoped questions');
must(composer, "if (questionType === 'READINESS_CHECK' && entityType === 'shift')", 'helpComposer has shift readiness reply');
must(composer, "if (questionType === 'MISSING_DATA_HELP' && entityType === 'shift')", 'helpComposer has shift missing reply');
must(composer, "if (questionType === 'SAFE_NEXT_STEP' && entityType === 'shift')", 'helpComposer has shift next step reply');
console.log('=== M71.6 COPILOT SELECTED ENTITY FIRST CHECK PASS ===');
