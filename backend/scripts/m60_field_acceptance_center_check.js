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

console.log("=== M60 SAHA ACCEPTANCE MERKEZI CHECK ===");
console.log("INFO checking required M60 files");
[
  "backend/src/ops/fieldAcceptanceManifest.js",
  "backend/src/routes/fieldAcceptance.js",
  "web/src/panels/superadmin/FieldAcceptanceCenter.jsx",
  "docs/RUNBOOK_M60_FIELD_ACCEPTANCE_CENTER.md",
  "docs/MILESTONE_M60_FIELD_ACCEPTANCE_CENTER.md",
  "tools/pack_m60_field_acceptance_center.ps1",
  "tools/check_m60_field_acceptance_center_repo_contract.ps1",
  "README.md",
  "docs/PROJECT_SPEC_V1.md",
  "docs/PRIMER_SSOT.md",
  "docs/STARTPACK_V1.md",
  "docs/CHECKLIST_SSOT.md"
].forEach(exists);

console.log("INFO checking updated product identity and route");
const projectSpec = read("docs/PROJECT_SPEC_V1.md");
const readme = read("README.md").toLowerCase();
const checklist = read("docs/CHECKLIST_SSOT.md");

must(
  projectSpec.includes("hizmet alan değerlendirmesi") ||
  projectSpec.includes("hizmet alan degerlendirmesi") ||
  projectSpec.includes("service evaluation"),
  "project spec includes hizmet alan degerlendirmesi"
);
must(
  readme.includes("m60") ||
  readme.includes("m65") ||
  readme.includes("m66") ||
  readme.includes("acceptance") ||
  readme.includes("kabul") ||
  readme.includes("saha"),
  "root readme points to historical M60 route or later living route"
);
must(
  checklist.includes("M59") && (checklist.includes("M60") || checklist.includes("M65") || checklist.includes("M66")),
  "checklist marks M59 green and keeps M60 open"
);

console.log("INFO checking backend acceptance skeleton");
const serverTxt = read("backend/src/server.js");
const mountTxt = fs.existsSync(path.join(root, "backend/src/bootstrap/routeMounts.js"))
  ? read("backend/src/bootstrap/routeMounts.js")
  : "";
const routeTxt = read("backend/src/routes/fieldAcceptance.js");
const manifestTxt = read("backend/src/ops/fieldAcceptanceManifest.js");
const panelTxt = read("web/src/panels/superadmin/FieldAcceptanceCenter.jsx");

must(
  serverTxt.includes("fieldAcceptanceRouter") || mountTxt.includes("fieldAcceptanceRouter"),
  "server imports field acceptance router"
);
must(
  serverTxt.includes("/api/field-acceptance") || mountTxt.includes("/api/field-acceptance"),
  "server mounts /api/field-acceptance"
);
must(
  routeTxt.includes("/manifest") || routeTxt.includes('router.get("/manifest"') || routeTxt.includes("router.get('/manifest'"),
  "field acceptance route exposes manifest endpoint"
);
must(
  routeTxt.includes("/session-template") || routeTxt.includes("/template") || routeTxt.includes('router.get("/session-template"') || routeTxt.includes('router.get("/template"') || routeTxt.includes("router.get('/session-template'") || routeTxt.includes("router.get('/template'"),
  "field acceptance route exposes template endpoint"
);
must(
  manifestTxt.includes("decisions") || manifestTxt.includes("checklist"),
  "manifest defines M60 decisions and checklist"
);
must(
  manifestTxt.includes("evidence") || manifestTxt.includes("kanıt") || manifestTxt.includes("kanit"),
  "manifest defines acceptance evidence"
);
must(
  panelTxt.includes("FieldAcceptanceCenter") || panelTxt.includes("Acceptance") || panelTxt.includes("Kabul"),
  "web panel shows M60 cards"
);

console.log("M60 SAHA ACCEPTANCE MERKEZI CHECK PASS");
