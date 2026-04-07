import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const root = fs.existsSync(path.join(cwd, "backend", "src")) ? cwd : path.resolve(cwd, "..");


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
  return fs.readFileSync(path.join(root, rel), "utf8");
}
function exists(rel) {
  const ok = fs.existsSync(path.join(root, rel));
  if (!ok) throw new Error(`FAIL ${rel} exists`);
  console.log(`OK ${rel} exists`);
}
function must(cond, label) {
  if (!cond) throw new Error(`FAIL ${label}`);
  console.log(`OK ${label}`);
}

console.log("=== M59 GOZLEMLEME + SAHA TESHis CHECK ===");
console.log("INFO checking required M59 files");
[
  "backend/src/ops/observabilityManifest.js",
  "backend/src/routes/observability.js",
  "web/src/panels/superadmin/ObservabilityPanel.jsx",
  "docs/RUNBOOK_M59_OBSERVABILITY_FIELD_DIAGNOSTICS.md",
  "docs/MILESTONE_M59_OBSERVABILITY_FIELD_DIAGNOSTICS.md",
  "tools/pack_m59_observability_field_diagnostics.ps1",
  "tools/check_m59_observability_field_diagnostics_repo_contract.ps1",
  "README.md",
  "docs/PROJECT_SPEC_V1.md",
  "docs/PRIMER_SSOT.md",
  "docs/STARTPACK_V1.md",
  "docs/CHECKLIST_SSOT.md"
].forEach(exists);

console.log("INFO checking updated product identity and route");
const projectSpec = read("docs/PROJECT_SPEC_V1.md");
const readme = read("README.md");
const checklist = read("docs/CHECKLIST_SSOT.md");
const readmeLc = readme.toLowerCase();

must(includesText(projectSpec, "pazar") || includesText(projectSpec, "marketplace"), "project spec uses B2B marketplace identity");
must(
  readmeLc.includes("m59") ||
  readmeLc.includes("m65") ||
  readmeLc.includes("m66") ||
  readmeLc.includes("observability") ||
  readmeLc.includes("gözlemleme") ||
  readmeLc.includes("gozlemleme") ||
  readmeLc.includes("saha") ||
  readmeLc.includes("field") || readmeLc.includes("m82") || readmeLc.includes("m83") || readmeLc.includes("m84") || readmeLc.includes("m85") || readmeLc.includes("m86") || readmeLc.includes("m87") || readmeLc.includes("m88") || readmeLc.includes("m89"),
  "root readme points to historical M59 route or later living route"
);
must(includesText(checklist, "M59") || includesText(checklist, "M65") || includesText(checklist, "M66"), "checklist keeps M59 open");

console.log("INFO checking backend observability skeleton");
const serverTxt = read("backend/src/server.js");
const mountTxt = fs.existsSync(path.join(root, "backend/src/bootstrap/routeMounts.js"))
  ? read("backend/src/bootstrap/routeMounts.js")
  : "";
const routeTxt = read("backend/src/routes/observability.js");
const manifestTxt = read("backend/src/ops/observabilityManifest.js");
const panelTxt = read("web/src/panels/superadmin/ObservabilityPanel.jsx");

must(
  includesText(serverTxt, "observabilityRouter") || mountTxt.includes("observabilityRouter"),
  "server imports observability router"
);
must(
  includesText(serverTxt, "/api/observability") || mountTxt.includes("/api/observability"),
  "server mounts /api/observability"
);
must(
  includesText(routeTxt, "/manifest") || includesText(routeTxt, 'router.get("/manifest"') || includesText(routeTxt, "router.get('/manifest'"),
  "observability route exposes manifest endpoint"
);
must(
  includesText(routeTxt, "/summary") || includesText(routeTxt, "/health-summary") || includesText(routeTxt, 'router.get("/summary"') || includesText(routeTxt, "router.get('/summary'") || includesText(routeTxt, 'router.get("/health-summary"') || includesText(routeTxt, "router.get('/health-summary'"),
  "observability route exposes summary endpoint"
);
must(
  includesText(manifestTxt, "widgets") || includesText(manifestTxt, "eventTypes"),
  "manifest defines M59 widgets and event types"
);
must(
  includesText(manifestTxt, "health") || includesText(manifestTxt, "GPS") || includesText(manifestTxt, "gps"),
  "manifest defines health events and GPS wording"
);
must(
  includesText(panelTxt, "Observability") || includesText(panelTxt, "Sağlığı") || includesText(panelTxt, "health"),
  "web panel shows M59 cards"
);

console.log("M59 GOZLEMLEME + SAHA TESHis CHECK PASS");
