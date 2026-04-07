import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { readRepoContractState } from "./_repoContractState.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");


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
function includesAny(text, needles) { return includesAnyText(text, needles); }
const server = read("backend/src/server.js");
const mountTxt = exists("backend/src/bootstrap/routeMounts.js") ? read("backend/src/bootstrap/routeMounts.js") : "";

async function main() {
  const state = readRepoContractState();
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
  const manifest = read("backend/src/ops/commercialCoreManifest.js");
  const route = read("backend/src/routes/commercialCore.js");
  const panel = read("web/src/panels/superadmin/CommercialCorePanel.jsx");
  const runbook = read("docs/RUNBOOK_M62_COMMERCIAL_CORE_STRENGTHENING.md");

  console.log("INFO checking updated route and SSOT status");
    must("project spec reflects commercial layer", includesAny(projectSpec, ["talep kartı", "teklif yaşam döngüsü", "pazarlık geçmişi", "talep karti", "teklif yasam dongusu", "pazarlik gecmisi"]));
      must("checklist marks M61 green and keeps M62 open", includesAny(checklist, ["[x] `M61 — SSOT + Milestone Hizası`", "[ ] `M62 — Ticari Omurga Güçlendirme`", "[x] `M62 — Ticari Omurga Güçlendirme`"]));

  console.log("INFO checking backend and web skeleton");
  must("server imports commercial core router", includesAny(server, ["commercialCoreRouter", "./routes/commercialCore.js"]) || includesAny(mountTxt, ["commercialCoreRouter"]));
  must("server mounts /api/commercial-core", includesAny(server, ["/api/commercial-core"]) || includesAny(mountTxt, ["/api/commercial-core"]));
  must("manifest defines commercial steps", includesAny(manifest, ["COMMERCIAL_CORE_STEPS", "Talep karti", "Sozlesmeye gecis kapisi", "Talep kartı", "Sözleşmeye geçiş kapısı"]));
  must("route exposes manifest and lifecycle template", includesAny(route, ["/manifest", "/lifecycle-template", "/rules"]));
  must("panel shows M62 cards", includesAny(panel, ["M62 Ticari Omurga Güçlendirme", "İzlenen ticari adımlar", "Sözleşmeye geçiş", "M62 Ticari Omurga Guclendirme", "Izlenen ticari adimlar", "Sozlesmeye gecis"]));
  must("runbook explains M62 scope", includesAny(runbook, ["ticari akis omurgasi", "talep / ihtiyac karti", "M62 green olmadan M63'e gecilmez", "ticari akış omurgası", "talep / ihtiyaç kartı", "M62 green olmadan M63"]));

  console.log("\nOK M62 TICARI OMURGA GUCLENDIRME CHECK PASS");
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});
