import fs from 'node:fs';
import path from 'node:path';
import { APP_JSX_ROLE_TENANT_SCOPE_PATHS } from "./lib/guardGitScope.js";

const root = process.argv[2] || process.cwd();


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
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const ok = (m) => console.log(`OK ${m}`);
const fail = (m) => {
  console.error(`FAIL ${m}`);
  process.exit(1);
};

const app = read(APP_JSX_ROLE_TENANT_SCOPE_PATHS[0]);
const eb = read('web/src/components/ErrorBoundary.jsx');

if (!includesText(app, 'const routeResetKey = cleanPath || path || "default";')) fail('route reset key missing'); else ok('route reset key exists');
if (!includesText(app, '<ErrorBoundary resetKey={routeResetKey}>')) fail('error boundary resetKey missing'); else ok('error boundary resetKey wired');
if (!includesText(app, '<Suspense key={routeResetKey}')) fail('suspense route key missing'); else ok('suspense route key wired');
if (!includesText(eb, 'getDerivedStateFromProps')) fail('error boundary prop reset missing'); else ok('error boundary prop reset exists');
if (!includesText(eb, 'Tekrar Dene')) fail('retry action missing'); else ok('retry action exists');

console.log('PASS ui route resilience hotfix check');
