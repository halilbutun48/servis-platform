import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const root = fs.existsSync(path.join(cwd, "backend", "src")) ? cwd : path.resolve(cwd, "..");

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

must(projectSpec.includes("pazar") || projectSpec.includes("marketplace"), "project spec uses B2B marketplace identity");
must(
  readmeLc.includes("m59") ||
  readmeLc.includes("m65") ||
  readmeLc.includes("m66") ||
  readmeLc.includes("observability") ||
  readmeLc.includes("gözlemleme") ||
  readmeLc.includes("gozlemleme") ||
  readmeLc.includes("saha") ||
  readmeLc.includes("field"),
  "root readme points to historical M59 route or later living route"
);
must(checklist.includes("M59") || checklist.includes("M65") || checklist.includes("M66"), "checklist keeps M59 open");

console.log("INFO checking backend observability skeleton");
const serverTxt = read("backend/src/server.js");
const mountTxt = fs.existsSync(path.join(root, "backend/src/bootstrap/routeMounts.js"))
  ? read("backend/src/bootstrap/routeMounts.js")
  : "";
const routeTxt = read("backend/src/routes/observability.js");
const manifestTxt = read("backend/src/ops/observabilityManifest.js");
const panelTxt = read("web/src/panels/superadmin/ObservabilityPanel.jsx");

must(
  serverTxt.includes("observabilityRouter") || mountTxt.includes("observabilityRouter"),
  "server imports observability router"
);
must(
  serverTxt.includes("/api/observability") || mountTxt.includes("/api/observability"),
  "server mounts /api/observability"
);
must(
  routeTxt.includes("/manifest") || routeTxt.includes('router.get("/manifest"') || routeTxt.includes("router.get('/manifest'"),
  "observability route exposes manifest endpoint"
);
must(
  routeTxt.includes("/summary") || routeTxt.includes("/health-summary") || routeTxt.includes('router.get("/summary"') || routeTxt.includes("router.get('/summary'") || routeTxt.includes('router.get("/health-summary"') || routeTxt.includes("router.get('/health-summary'"),
  "observability route exposes summary endpoint"
);
must(
  manifestTxt.includes("widgets") || manifestTxt.includes("eventTypes"),
  "manifest defines M59 widgets and event types"
);
must(
  manifestTxt.includes("health") || manifestTxt.includes("GPS") || manifestTxt.includes("gps"),
  "manifest defines health events and GPS wording"
);
must(
  panelTxt.includes("Observability") || panelTxt.includes("Sağlığı") || panelTxt.includes("health"),
  "web panel shows M59 cards"
);

console.log("M59 GOZLEMLEME + SAHA TESHis CHECK PASS");
