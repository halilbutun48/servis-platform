
import fs from 'fs';
import path from 'path';

const cwd = process.argv[2] || process.cwd();
const repoRoot = fs.existsSync(path.join(cwd, "backend", "src")) ? cwd : path.resolve(cwd, "..");


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
const read = (rel) => fs.readFileSync(path.join(repoRoot, rel), 'utf8');
const ok = (msg) => console.log(`OK ${msg}`);
const fail = (msg) => { console.error(`FAIL ${msg}`); process.exit(1); };

console.log('=== M71.8 COPILOT SELECTED ENTITY RESOLVE CHECK ===');
const service = read('backend/src/ai/service.js');
const resolver = read('backend/src/ai/chat/contextResolver.js');
const composer = read('backend/src/ai/chat/helpComposer.js');

if (!includesText(service, 'resolveChatContext({ entityType, entityId, user, screenContext, conversationState })')) fail('service passes conversationState into resolveChatContext');
ok('service passes conversationState into resolveChatContext');
if (!includesText(resolver, 'pickSelectedEntity') || !includesText(resolver, "selected?.entityType || entityType")) fail('contextResolver promotes selected entity for screen chat');
ok('contextResolver promotes selected entity for screen chat');
if (!includesText(composer, 'prefersSelectedEntity') || !includesText(composer, "requestEntityType === 'screen' ? resolveReferencedScreenDefinition")) fail('helpComposer computes selected-entity preference');
ok('helpComposer computes selected-entity preference');
if (!includesText(composer, "questionType === 'READINESS_CHECK' && entityType === 'shift'") || !includesText(composer, 'shiftReadinessReply')) fail('helpComposer has shift readiness reply');
ok('helpComposer has shift readiness reply');
if (!includesText(composer, "questionType === 'MISSING_DATA_HELP' && entityType === 'shift'") || !includesText(composer, 'shiftMissingDataReply')) fail('helpComposer has shift missing-data reply');
ok('helpComposer has shift missing-data reply');
if (!includesText(composer, 'answerEntityType') || !includesText(composer, 'preferEntityContext')) fail('helpComposer routes record-scoped questions through selected entity');
ok('helpComposer routes record-scoped questions through selected entity');
console.log('=== M71.8 COPILOT SELECTED ENTITY RESOLVE CHECK PASS ===');
