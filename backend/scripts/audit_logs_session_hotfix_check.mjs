
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
import fs from 'fs';
const p = 'web/src/panels/superadmin/AuditLogsPanel.jsx';
const t = fs.readFileSync(p, 'utf8');
function ok(msg){ console.log('OK ' + msg); }
function fail(msg){ console.error('FAIL ' + msg); process.exit(1); }
if (!includesText(t, 'import { api } from "../../api";')) fail('api import exists'); else ok('api import exists');
if (includesText(t, 'useSession')) fail('useSession removed from audit panel'); else ok('useSession removed from audit panel');
if (!includesText(t, 'api(`/api/admin/audit-logs?${qs.toString()}`)')) fail('audit panel uses api default token'); else ok('audit panel uses api default token');
console.log('PASS audit logs session hotfix check');
