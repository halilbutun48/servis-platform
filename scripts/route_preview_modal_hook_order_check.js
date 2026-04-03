const fs = require('fs');
const path = require('path');
const p = path.join(process.cwd(), 'web', 'src', 'components', 'RoutePreviewModal.jsx');
const t = fs.readFileSync(p, 'utf8');
const posUseSession = t.indexOf('const { token } = useSession();');
const posUseState = t.indexOf('const [remote, setRemote] = useState({');
const posEarlyReturn = t.indexOf('if (!open) return null;');
const posCenter = t.indexOf('const center = useMemo(() => {');
function ok(msg){ console.log('OK', msg); }
function fail(msg){ console.error('FAIL', msg); process.exitCode = 1; }
console.log('=== ROUTE PREVIEW MODAL HOOK ORDER CHECK ===');
if (posUseSession >= 0) ok('useSession present'); else fail('useSession missing');
if (posUseState > posUseSession) ok('useState follows useSession'); else fail('useState ordering invalid');
if (posCenter >= 0) ok('center memo present'); else fail('center memo missing');
if (posEarlyReturn > posCenter) ok('open guard moved after hooks'); else fail('open guard still before hooks');
if ((t.match(/if \(!open\) return null;/g) || []).length === 1) ok('single open guard present'); else fail('unexpected number of open guards');
if (process.exitCode) process.exit(process.exitCode);
console.log('=== ROUTE PREVIEW MODAL HOOK ORDER CHECK PASS ===');
