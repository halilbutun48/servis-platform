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
  banner("M62 TICARI OMURGA GUCLENDIRME CHECK");

  const requiredFiles = [
    "backend/scripts/m62_commercial_core_strengthening_check.js",
    "backend/src/ops/commercialCoreManifest.js",
    "backend/src/routes/commercialCore.js",
    "web/src/panels/superadmin/CommercialCorePanel.jsx",
    "docs/RUNBOOK_M62_COMMERCIAL_CORE_STRENGTHENING.md",
    "docs/MILESTONE_M62_COMMERCIAL_CORE_STRENGTHENING.md",
    "tools/pack_m62_commercial_core_strengthening.ps1",
    "tools/check_m62_commercial_core_strengthening_repo_contract.ps1",
    "README.md",
    "docs/PROJECT_SPEC_V1.md",
    "docs/PRIMER_SSOT.md",
    "docs/STARTPACK_V1.md",
    "docs/CHECKLIST_SSOT.md",
  ];

  console.log("INFO checking required M62 files");
  requiredFiles.forEach((rel) => must(`${rel} exists`, exists(rel)));

  const readme = read("README.md");
  const projectSpec = read("docs/PROJECT_SPEC_V1.md");
  const primer = read("docs/PRIMER_SSOT.md");
  const startpack = read("docs/STARTPACK_V1.md");
  const checklist = read("docs/CHECKLIST_SSOT.md");
  const server = read("backend/src/server.js");
  const manifest = read("backend/src/ops/commercialCoreManifest.js");
  const route = read("backend/src/routes/commercialCore.js");
  const panel = read("web/src/panels/superadmin/CommercialCorePanel.jsx");
  const runbook = read("docs/RUNBOOK_M62_COMMERCIAL_CORE_STRENGTHENING.md");

  console.log("INFO checking updated route and SSOT status");
  must(
    "readme points to M62 route",
    includesAny(readme, ["M61 green", "M62 — Ticari Omurga Güçlendirme", "pack_m62_commercial_core_strengthening.ps1", "M75 green baseline"]),
  );
  must(
    "project spec reflects commercial layer",
    includesAny(projectSpec, ["talep kartı", "teklif yaşam döngüsü", "pazarlık geçmişi"]),
  );
  must(
    "primer reflects M61 green and M62 active",
    includesAny(primer, ["M61 — SSOT + Milestone Hizası", "M62 — Ticari Omurga Güçlendirme", "pack_m62_commercial_core_strengthening.ps1", "M75 green baseline", "M76A-1"]),
  );
  must(
    "startpack reflects M62 opening",
    includesAny(startpack, ["M62 — Ticari Omurga Güçlendirme", "M62 başlangıç notu", "M62", "M75 green baseline", "M76A-1"]),
  );
  must(
    "checklist marks M61 green and keeps M62 open",
    includesAny(checklist, ["[x] `M61 — SSOT + Milestone Hizası`", "[ ] `M62 — Ticari Omurga Güçlendirme`", "[x] `M62 — Ticari Omurga Güçlendirme`"]),
  );

  console.log("INFO checking backend and web skeleton");
  must("server imports commercial core router", includesAny(server, ["commercialCoreRouter", "./routes/commercialCore.js"]));
  must("server mounts /api/commercial-core", includesAny(server, ["/api/commercial-core"]));
  must("manifest defines commercial steps", includesAny(manifest, ["COMMERCIAL_CORE_STEPS", "Talep karti", "Sozlesmeye gecis kapisi"]));
  must("route exposes manifest and lifecycle template", includesAny(route, ["/manifest", "/lifecycle-template", "/rules"]));
  must("panel shows M62 cards", includesAny(panel, ["M62 Ticari Omurga Güçlendirme", "İzlenen ticari adımlar", "Sözleşmeye geçiş"]));
  must("runbook explains M62 scope", includesAny(runbook, ["ticari akis omurgasi", "talep / ihtiyac karti", "M62 green olmadan M63'e gecilmez"]));

  console.log("\nOK M62 TICARI OMURGA GUCLENDIRME CHECK PASS");
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});
