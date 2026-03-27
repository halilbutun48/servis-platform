import fs from 'fs';
import path from 'path';
const repoRoot = process.argv[2] || process.cwd();
const file = path.join(repoRoot, 'backend', 'src', 'ai', 'chat', 'helpComposer.js');
const text = fs.readFileSync(file, 'utf8');
console.log('=== M71.8 HOTFIX CHECK ===');
if (!text.includes('lastGuideJobType: guide?.jobType || null,')) {
  console.error('FAIL fixed line missing');
  process.exit(1);
}
if (text.includes('lastGuideJobType: jobType,')) {
  console.error('FAIL stale undefined jobType reference still present');
  process.exit(1);
}
console.log('OK helpComposer lastGuideJobType hotfix applied');
console.log('=== M71.8 HOTFIX CHECK PASS ===');
