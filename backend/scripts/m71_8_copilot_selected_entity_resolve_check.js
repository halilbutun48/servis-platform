
import fs from 'fs';
import path from 'path';

const repoRoot = process.argv[2] || process.cwd();
const read = (rel) => fs.readFileSync(path.join(repoRoot, rel), 'utf8');
const ok = (msg) => console.log(`OK ${msg}`);
const fail = (msg) => { console.error(`FAIL ${msg}`); process.exit(1); };

console.log('=== M71.8 COPILOT SELECTED ENTITY RESOLVE CHECK ===');
const service = read('backend/src/ai/service.js');
const resolver = read('backend/src/ai/chat/contextResolver.js');
const composer = read('backend/src/ai/chat/helpComposer.js');

if (!service.includes('resolveChatContext({ entityType, entityId, user, screenContext, conversationState })')) fail('service passes conversationState into resolveChatContext');
ok('service passes conversationState into resolveChatContext');
if (!resolver.includes('pickSelectedEntity') || !resolver.includes("selected?.entityType || entityType")) fail('contextResolver promotes selected entity for screen chat');
ok('contextResolver promotes selected entity for screen chat');
if (!composer.includes('prefersSelectedEntity') || !composer.includes("requestEntityType === 'screen' ? resolveReferencedScreenDefinition")) fail('helpComposer computes selected-entity preference');
ok('helpComposer computes selected-entity preference');
if (!composer.includes("questionType === 'READINESS_CHECK' && entityType === 'shift'") || !composer.includes('shiftReadinessReply')) fail('helpComposer has shift readiness reply');
ok('helpComposer has shift readiness reply');
if (!composer.includes("questionType === 'MISSING_DATA_HELP' && entityType === 'shift'") || !composer.includes('shiftMissingDataReply')) fail('helpComposer has shift missing-data reply');
ok('helpComposer has shift missing-data reply');
if (!composer.includes('answerEntityType') || !composer.includes('preferEntityContext')) fail('helpComposer routes record-scoped questions through selected entity');
ok('helpComposer routes record-scoped questions through selected entity');
console.log('=== M71.8 COPILOT SELECTED ENTITY RESOLVE CHECK PASS ===');
