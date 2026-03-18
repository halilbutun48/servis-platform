import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

function banner(title) {
  console.log(`\n=== ${title} ===`);
}

function must(label, ok) {
  if (!ok) throw new Error(`FAIL ${label}`);
  console.log(`OK ${label}`);
}

function read(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(repoRoot, rel));
}

function includesAny(text, needles) {
  return needles.some((needle) => text.includes(needle));
}

async function main() {
  banner("M60 SAHA ACCEPTANCE MERKEZI CHECK");

  const requiredFiles = [
    "backend/src/ops/fieldAcceptanceManifest.js",
    "backend/src/routes/fieldAcceptance.js",
    "mobile/src/lib/fieldAcceptance.js",
    "web/src/panels/superadmin/FieldAcceptanceCenter.jsx",
    "docs/RUNBOOK_M60_FIELD_ACCEPTANCE_CENTER.md",
    "docs/MILESTONE_M60_FIELD_ACCEPTANCE_CENTER.md",
    "tools/pack_m60_field_acceptance_center.ps1",
    "tools/check_m60_field_acceptance_center_repo_contract.ps1",
    "README.md",
    "docs/PROJECT_SPEC_V1.md",
    "docs/PRIMER_SSOT.md",
    "docs/STARTPACK_V1.md",
    "docs/CHECKLIST_SSOT.md",
  ];

  console.log("INFO checking required M60 files");
  requiredFiles.forEach((rel) => must(`${rel} exists`, exists(rel)));

  const project = read("docs/PROJECT_SPEC_V1.md");
  const readme = read("README.md");
  const server = read("backend/src/server.js");
  const manifest = read("backend/src/ops/fieldAcceptanceManifest.js");
  const route = read("backend/src/routes/fieldAcceptance.js");
  const mobile = read("mobile/src/lib/fieldAcceptance.js");
  const panel = read("web/src/panels/superadmin/FieldAcceptanceCenter.jsx");
  const runbook = read("docs/RUNBOOK_M60_FIELD_ACCEPTANCE_CENTER.md");
  const checklist = read("docs/CHECKLIST_SSOT.md");

  console.log("INFO checking updated product identity and route");
  must("project spec includes hizmet alan degerlendirmesi", includesAny(project, ["hizmet alan kurum değerlendirmesi", "hizmet alan kurum kalite değerlendirmesi verir"]));
  must("root readme points to M60 route", includesAny(readme, ["M59 green", "M60 — Saha Acceptance Merkezi", "pack_m60_field_acceptance_center.ps1"]));
  must("checklist marks M59 green and keeps M60 open", includesAny(checklist, ["[x] `M59 — Gözlemleme + Saha Teşhis`", "[ ] `M60 — Saha Acceptance Merkezi`"]));

  console.log("INFO checking backend acceptance skeleton");
  must("server imports field acceptance router", includesAny(server, ["fieldAcceptanceRouter", "./routes/fieldAcceptance.js"]));
  must("server mounts /api/field-acceptance", includesAny(server, ["/api/field-acceptance"]));
  must("manifest defines decisions and checklist", includesAny(manifest, ["FIELD_ACCEPTANCE_DECISIONS", "FIELD_ACCEPTANCE_CHECKLIST", "LIMITED_GO"]));
  must("route exposes manifest and session-template", includesAny(route, ["/manifest", "/session-template", "/decision-options"]));

  console.log("INFO checking mobile and web skeleton");
  must("mobile helper defines evidence types", includesAny(mobile, ["FIELD_ACCEPTANCE_EVIDENCE_TYPES", "SURUCUNUN_TELEFON_GPSI", "buildMobileAcceptanceSnapshot"]));
  must("panel shows M60 acceptance cards", includesAny(panel, ["M60 Saha Acceptance Merkezi", "Karar seçenekleri", "Checklist özeti"]));

  console.log("INFO checking M60 runbook language");
  must("runbook explains M60 scope", includesAny(runbook, ["pilot test oturumu kaydi", "GO / LIMITED GO / NO-GO", "M60 green olmadan M61'e gecilmez"]));

  console.log("\nOK M60 SAHA ACCEPTANCE MERKEZI CHECK PASS");
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});
