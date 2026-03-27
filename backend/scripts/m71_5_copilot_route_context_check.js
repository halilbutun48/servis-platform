import fs from "fs";
import path from "path";

const repoRoot = path.resolve(process.argv[2] || path.join(process.cwd(), ".."));
const copilotPath = path.join(repoRoot, "web", "src", "panels", "shared", "CopilotPanel.jsx");
const composerPath = path.join(repoRoot, "backend", "src", "ai", "chat", "helpComposer.js");

function ok(label) { console.log(`OK ${label}`); }
function fail(label) { console.error(`FAIL ${label}`); process.exitCode = 1; }
function has(text, needle) { return text.includes(needle); }

const copilot = fs.readFileSync(copilotPath, "utf8");
const composer = fs.readFileSync(composerPath, "utf8");

console.log("=== M71.5 COPILOT ROUTE CONTEXT CHECK ===");
if (has(copilot, 'useHashRoute')) ok('CopilotPanel imports useHashRoute'); else fail('CopilotPanel imports useHashRoute');
if (has(copilot, 'const { path: hashPath } = useHashRoute();')) ok('CopilotPanel reads hash path'); else fail('CopilotPanel reads hash path');
if (has(copilot, 'setChatScreenId(String(match.id));') && has(copilot, '}, [hashPath, me?.role, me?.companyKind]);')) ok('CopilotPanel syncs chat screen on route change'); else fail('CopilotPanel syncs chat screen on route change');
if (has(composer, "const hasScreenContext = entityType === 'screen' || Boolean(screenContext?.path || screenDefinition?.path);")) ok('helpComposer widens screen context gate'); else fail('helpComposer widens screen context gate');
if (has(composer, "if (roleMode === 'SIMPLE' && hasScreenContext")) ok('helpComposer uses widened gate in simple mode'); else fail('helpComposer uses widened gate in simple mode');
if (process.exitCode) {
  console.error('=== M71.5 COPILOT ROUTE CONTEXT CHECK FAIL ===');
  process.exit(process.exitCode);
}
console.log('=== M71.5 COPILOT ROUTE CONTEXT CHECK PASS ===');
