import fs from "fs";
import path from "path";

const root = process.cwd();


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
const checks = [
  {
    file: "web/src/panels/superadmin/RegionsPanel.jsx",
    mustNot: ['useSession', 'token } = useSession', '{ token }'],
    must: ['api("/api/admin/regions"', 'method: "POST"', 'method: "PUT"', 'method: "DELETE"']
  },
  {
    file: "web/src/panels/superadmin/ObservabilityPanel.jsx",
    mustNot: ['useSession', 'token } = useSession', '{ token }', '[token]'],
    must: ['api("/api/observability/manifest"', 'api("/api/observability/health-summary"', '}, []);']
  },
  {
    file: "web/src/panels/superadmin/FieldAcceptanceCenter.jsx",
    mustNot: ['useSession', 'token } = useSession', '{ token }', '[token]'],
    must: ['api("/api/field-acceptance/manifest")', 'api("/api/field-acceptance/session-template")', '}, []);']
  },
  {
    file: "web/src/panels/superadmin/PilotLaunchGatePanel.jsx",
    mustNot: ['useSession', 'token } = useSession', '{ token }', '[token]'],
    must: ["api('/api/pilot-launch-gate/manifest')", '}, []);']
  },
  {
    file: "web/src/panels/superadmin/AuditLogsPanel.jsx",
    mustNot: ['useSession', 'token } = useSession'],
    must: ['api(`/api/admin/audit-logs?${qs.toString()}`)']
  }
];

let failed = false;
for (const c of checks) {
  const fp = path.join(root, c.file);
  if (!fs.existsSync(fp)) {
    console.error(`FAIL missing ${c.file}`);
    failed = true;
    continue;
  }
  const text = fs.readFileSync(fp, 'utf8');
  console.log(`OK ${c.file} exists`);
  for (const needle of c.must || []) {
    if (!includesText(text, needle)) {
      console.error(`FAIL ${c.file} missing expected marker: ${needle}`);
      failed = true;
    } else {
      console.log(`OK ${c.file} contains expected cleanup marker`);
    }
  }
  for (const needle of c.mustNot || []) {
    if (includesText(text, needle)) {
      console.error(`FAIL ${c.file} still contains forbidden marker: ${needle}`);
      failed = true;
    }
  }
}

if (failed) process.exit(1);
console.log('PASS session-safe panels cleanup hotfix check');
