import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");


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

function read(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), "utf8");
}

function ok(msg) {
  console.log(`OK ${msg}`);
}

function fail(msg) {
  console.error(`FAIL ${msg}`);
  process.exitCode = 1;
}

function mustInclude(text, needle, label) {
  if (includesText(text, needle)) ok(label); else fail(label);
}

const service = read("backend/src/services/paymentBackbone.js");
const route = read("backend/src/routes/commercialCore.js");
const panel = read("web/src/panels/superadmin/CommercialCorePanel.jsx");
const toolsReadme = read("tools/README.md");
const toolsPrimer = read("tools/PRIMER_SNAPSHOT.md");
const backlog = read("docs/NEXT_BACKLOG_V1.md");
const primer = read("docs/PRIMER_SSOT.md");
const registry = read("docs/MILESTONE_REGISTRY_V1.md");

mustInclude(service, "buildPaymentBackboneSettings", "payment backbone service exposes settings builder");
mustInclude(service, "upsertGlobalCommissionRule", "payment backbone service supports global rule upsert");
mustInclude(service, "upsertRoomCommissionRule", "payment backbone service supports room rule upsert");
mustInclude(service, "disableRoomCommissionRule", "payment backbone service supports room override disable");
mustInclude(route, "/payment-backbone/settings", "commercial core route exposes settings endpoint");
mustInclude(route, "/payment-backbone/settings/global", "commercial core route exposes global save endpoint");
mustInclude(route, "/payment-backbone/settings/room", "commercial core route exposes room save endpoint");
mustInclude(panel, "Super Admin ticari ayarlar", "superadmin panel renders commercial settings section");
mustInclude(panel, "Global ayar", "superadmin panel renders global settings card");
mustInclude(panel, "Oda bazlı override", "superadmin panel renders room override card");
mustInclude(panel, "Override kapat", "superadmin panel renders room override disable action");
mustInclude(toolsReadme, "pack_m82_10_super_admin_commercial_settings.ps1", "tools readme lists M82.10 pack");
mustInclude(toolsPrimer, "M82.10", "tools primer lists M82.10");
if (!includesText(backlog, 'M82.10') && !includesText(backlog, 'M82.11') && !includesText(backlog, 'M83') && !includesText(backlog, 'M84') && !includesText(backlog, 'M85') && !includesText(backlog, 'M86') && !includesText(backlog, 'M87') && !includesText(backlog, 'M88') && !includesText(backlog, 'M89') && !includesText(backlog, 'M90') && !includesText(backlog, 'living route')) fail('next backlog lists M82.10');
ok('next backlog lists M82.10');
mustInclude(primer, "M82.10", "primer lists M82.10");
mustInclude(registry, "M82.10", "registry lists M82.10");

if (process.exitCode) process.exit(process.exitCode);
console.log("OK M82.10 super admin commercial settings check passed");

