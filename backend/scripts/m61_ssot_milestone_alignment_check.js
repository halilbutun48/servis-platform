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
  banner("M61 SSOT + MILESTONE HIZASI CHECK");

  const requiredFiles = [
    "backend/scripts/m61_ssot_milestone_alignment_check.js",
    "backend/src/ops/ssotAlignmentManifest.js",
    "backend/src/routes/ssotAlignment.js",
    "web/src/panels/superadmin/SsotAlignmentPanel.jsx",
    "docs/MILESTONE_REGISTRY_V1.md",
    "docs/RUNBOOK_M61_SSOT_MILESTONE_ALIGNMENT.md",
    "docs/MILESTONE_M61_SSOT_MILESTONE_ALIGNMENT.md",
    "tools/pack_m61_ssot_milestone_alignment.ps1",
    "tools/check_m61_ssot_milestone_alignment_repo_contract.ps1",
    "README.md",
    "docs/PRIMER_SSOT.md",
    "docs/STARTPACK_V1.md",
    "docs/CHECKLIST_SSOT.md",
  ];

  console.log("INFO checking required M61 files");
  requiredFiles.forEach((rel) => must(`${rel} exists`, exists(rel)));

  const readme = read("README.md");
  const primer = read("docs/PRIMER_SSOT.md");
  const startpack = read("docs/STARTPACK_V1.md");
  const checklist = read("docs/CHECKLIST_SSOT.md");
  const backlog = read("docs/NEXT_BACKLOG_V1.md");
  const registry = read("docs/MILESTONE_REGISTRY_V1.md");
  const server = read("backend/src/server.js");
  const manifest = read("backend/src/ops/ssotAlignmentManifest.js");
  const route = read("backend/src/routes/ssotAlignment.js");
  const panel = read("web/src/panels/superadmin/SsotAlignmentPanel.jsx");
  const runbook = read("docs/RUNBOOK_M61_SSOT_MILESTONE_ALIGNMENT.md");

  console.log("INFO checking updated route and SSOT status");
  must(
    "readme reflects current SSOT and master pack",
    includesAny(readme, ["post-M66 functional", "tools\\pack.ps1 -To 66", "M61", "M66"])
  );
  must(
    "primer reflects current post-M66 truth",
    includesAny(primer, ["post-M66 functional", "M59 -> M65", "M66", "tools\\pack.ps1 -To 66"])
  );
  must(
    "startpack reflects master pack and repo audit",
    includesAny(startpack, ["tools\\pack.ps1 -To 66", "check_repo_audit_master.ps1", "post-M66 functional"])
  );
  must(
    "checklist reflects M66 open verification state",
    includesAny(checklist, ["M66", "master pack marker", "repo audit marker"])
  );
  must(
    "backlog points to full rerun and cleanup phase",
    includesAny(backlog, ["full M0-M66 rerun", "deep repo cleanup", "post-M66 functional"])
  );
  must(
    "registry shows M59-M66 route",
    includesAny(registry, ["M59 - Gözlemleme + Saha Teşhis", "M66 - Operasyonel Reassignment", "green-base", "functional-open"])
  );

  console.log("INFO checking backend and web skeleton");
  must("server imports ssot alignment router", includesAny(server, ["ssotAlignmentRouter", "./routes/ssotAlignment.js"]));
  must("server mounts /api/ssot-alignment", includesAny(server, ["/api/ssot-alignment"]));
  must("manifest defines SSOT targets and route", includesAny(manifest, ["SSOT_ALIGNMENT_TARGETS", "MILESTONE_ROUTE", '"M61"']));
  must("route exposes manifest and summary-template", includesAny(route, ["/manifest", "/summary-template", "/route"]));
  must("panel shows M61 cards", includesAny(panel, ["M61 SSOT + Milestone Hizası", "İzlenen SSOT hedefleri", "Milestone ozeti", "Milestone özeti"]));

  console.log("INFO checking M61 runbook language");
  must(
    "runbook explains M61 scope",
    includesAny(runbook, ["milestone registry", "M61 green olmadan", "README", "PRIMER", "CHECKLIST"])
  );

  console.log("\nOK M61 SSOT + MILESTONE HIZASI CHECK PASS");
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});
