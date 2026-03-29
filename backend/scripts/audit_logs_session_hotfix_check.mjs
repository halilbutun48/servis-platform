import fs from 'fs';
const p = 'web/src/panels/superadmin/AuditLogsPanel.jsx';
const t = fs.readFileSync(p, 'utf8');
function ok(msg){ console.log('OK ' + msg); }
function fail(msg){ console.error('FAIL ' + msg); process.exit(1); }
if (!t.includes('import { api } from "../../api";')) fail('api import exists'); else ok('api import exists');
if (t.includes('useSession')) fail('useSession removed from audit panel'); else ok('useSession removed from audit panel');
if (!t.includes('api(`/api/admin/audit-logs?${qs.toString()}`)')) fail('audit panel uses api default token'); else ok('audit panel uses api default token');
console.log('PASS audit logs session hotfix check');
