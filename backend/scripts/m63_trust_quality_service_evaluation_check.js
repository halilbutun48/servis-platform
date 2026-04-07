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
  banner("M63 GUVEN + KALITE + HIZMET DEGERLENDIRME CHECK");

  const requiredFiles = [
    "backend/scripts/m63_trust_quality_service_evaluation_check.js",
    "backend/src/ops/trustQualityManifest.js",
    "backend/src/routes/trustQuality.js",
    "web/src/panels/superadmin/TrustQualityPanel.jsx",
    "docs/RUNBOOK_M63_TRUST_QUALITY_SERVICE_EVALUATION.md",
    "docs/MILESTONE_M63_TRUST_QUALITY_SERVICE_EVALUATION.md",
    "tools/pack_m63_trust_quality_service_evaluation.ps1",
    "tools/check_m63_trust_quality_service_evaluation_repo_contract.ps1",
    "README.md",
    "docs/PROJECT_SPEC_V1.md",
    "docs/PRIMER_SSOT.md",
    "docs/STARTPACK_V1.md",
    "docs/CHECKLIST_SSOT.md"
  ];

  console.log("INFO checking required M63 files");
  requiredFiles.forEach((rel) => must(`${rel} exists`, exists(rel)));

  const readme = read("README.md");
  const projectSpec = read("docs/PROJECT_SPEC_V1.md");
  const primer = read("docs/PRIMER_SSOT.md");
  const startpack = read("docs/STARTPACK_V1.md");
  const checklist = read("docs/CHECKLIST_SSOT.md");
  const manifest = read("backend/src/ops/trustQualityManifest.js");
  const route = read("backend/src/routes/trustQuality.js");
  const panel = read("web/src/panels/superadmin/TrustQualityPanel.jsx");
  const runbook = read("docs/RUNBOOK_M63_TRUST_QUALITY_SERVICE_EVALUATION.md");

  console.log("INFO checking updated route and SSOT status");
    must("project spec reflects trust and evaluation layer", includesAny(projectSpec, ["hizmet alan kurum değerlendirmesi", "sağlayıcı kalite", "karar destek", "hizmet alan kurum degerlendirmesi", "saglayici kalite", "karar destek"]));
      must("checklist tracks M63 milestone or later official state", includesAny(checklist, ["[x] `M63 — Güven + Kalite + Hizmet Değerlendirme`", "[ ] `M63 — Güven + Kalite + Hizmet Değerlendirme`", "[ ] `M66 — Operasyonel Reassignment kapanışı`", "[ ] `M66 — Operasyonel Reassignment`"]));

  console.log("INFO checking backend and web skeleton");
  must("server imports trust quality router", includesAny(server, ["trustQualityRouter", "./routes/trustQuality.js"]) || includesAny(mountTxt, ["trustQualityRouter"]));
  must("server mounts /api/trust-quality", includesAny(server, ["/api/trust-quality"]) || includesAny(mountTxt, ["/api/trust-quality"]));
  must("manifest defines trust dimensions", includesAny(manifest, ["TRUST_QUALITY_DIMENSIONS", "Hizmet alan degerlendirmesi", "Karar destek yuzeyi", "Hizmet alan değerlendirmesi", "Karar destek yüzeyi"]));
  must("route exposes manifest and templates", includesAny(route, ["/manifest", "/evaluation-template", "/provider-signal-template"]));
  must("panel shows M63 cards", includesAny(panel, ["M63 Güven + Kalite + Hizmet Değerlendirme", "Hizmet alan değerlendirmesi", "Sağlayıcı kalite sinyali", "M63 Guven + Kalite + Hizmet Degerlendirme", "Hizmet alan degerlendirmesi", "Saglayici kalite sinyali"]));
  must("runbook explains M63 scope", includesAny(runbook, ["guven ve kalite katmani", "hizmet alan kurum degerlendirmesi", "M63 green olmadan M64'e gecilmez", "güven ve kalite katmanı", "hizmet alan kurum değerlendirmesi", "M63 green olmadan M64"]));

  console.log();
  console.log("OK M63 GUVEN + KALITE + HIZMET DEGERLENDIRME CHECK PASS");
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});
