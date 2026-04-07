import fs from 'fs';
import path from 'path';
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
const file = path.join(repoRoot, 'backend', 'src', 'ai', 'chat', 'helpComposer.js');
const text = fs.readFileSync(file, 'utf8');
console.log('=== M71.8 HOTFIX CHECK ===');
if (!includesText(text, 'lastGuideJobType: guide?.jobType || null,')) {
  console.error('FAIL fixed line missing');
  process.exit(1);
}
if (includesText(text, 'lastGuideJobType: jobType,')) {
  console.error('FAIL stale undefined jobType reference still present');
  process.exit(1);
}
console.log('OK helpComposer lastGuideJobType hotfix applied');
console.log('=== M71.8 HOTFIX CHECK PASS ===');
