import fs from 'node:fs';
import path from 'node:path';

const root = process.argv[2] || process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const ok = (m) => console.log(`OK ${m}`);
const fail = (m) => {
  console.error(`FAIL ${m}`);
  process.exit(1);
};

const app = read('web/src/App.jsx');
const eb = read('web/src/components/ErrorBoundary.jsx');

if (!app.includes('const routeResetKey = cleanPath || path || "default";')) fail('route reset key missing'); else ok('route reset key exists');
if (!app.includes('<ErrorBoundary resetKey={routeResetKey}>')) fail('error boundary resetKey missing'); else ok('error boundary resetKey wired');
if (!app.includes('<Suspense key={routeResetKey}')) fail('suspense route key missing'); else ok('suspense route key wired');
if (!eb.includes('getDerivedStateFromProps')) fail('error boundary prop reset missing'); else ok('error boundary prop reset exists');
if (!eb.includes('Tekrar Dene')) fail('retry action missing'); else ok('retry action exists');

console.log('PASS ui route resilience hotfix check');
