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
  banner("M64 DOGAL COPILOT KATMANI CHECK");

  const requiredFiles = [
    "backend/scripts/m64_natural_copilot_layer_check.js",
    "backend/src/ops/naturalCopilotManifest.js",
    "backend/src/routes/naturalCopilot.js",
    "web/src/panels/superadmin/NaturalCopilotPanel.jsx",
    "docs/RUNBOOK_M64_NATURAL_COPILOT_LAYER.md",
    "docs/MILESTONE_M64_NATURAL_COPILOT_LAYER.md",
    "tools/pack_m64_natural_copilot_layer.ps1",
    "tools/check_m64_natural_copilot_layer_repo_contract.ps1",
    "README.md",
    "docs/PROJECT_SPEC_V1.md",
    "docs/PRIMER_SSOT.md",
    "docs/STARTPACK_V1.md",
    "docs/CHECKLIST_SSOT.md"
  ];

  console.log("INFO checking required M64 files");
  requiredFiles.forEach((rel) => must(`${rel} exists`, exists(rel)));

  const readme = read("README.md");
  const projectSpec = read("docs/PROJECT_SPEC_V1.md");
  const primer = read("docs/PRIMER_SSOT.md");
  const startpack = read("docs/STARTPACK_V1.md");
  const checklist = read("docs/CHECKLIST_SSOT.md");
  const manifest = read("backend/src/ops/naturalCopilotManifest.js");
  const route = read("backend/src/routes/naturalCopilot.js");
  const panel = read("web/src/panels/superadmin/NaturalCopilotPanel.jsx");
  const runbook = read("docs/RUNBOOK_M64_NATURAL_COPILOT_LAYER.md");

  console.log("INFO checking updated route and SSOT status");
    must("project spec reflects natural copilot layer", includesAny(projectSpec, ["daha doğal Türkçe cevap katmanı", "kısa konuşma hafızası", "daha basit anlat", "daha dogal Turkce cevap katmani", "kisa konusma hafizasi"]));
      must("checklist tracks M64 milestone or later official state", includesAny(checklist, ["[ ] `M64 — Doğal Copilot Katmanı`", "[x] `M64 — Doğal Copilot Katmanı`", "M66 — Operasyonel Reassignment kapanışı", "M82", "M82.8", "M83", "M84", "M85", "M86", "M87", "M88", "M89"]));

  console.log("INFO checking backend and web skeleton");
  must("server imports natural copilot router", includesAny(server, ["naturalCopilotRouter", "./routes/naturalCopilot.js"]) || includesAny(mountTxt, ["naturalCopilotRouter"]));
  must("server mounts /api/natural-copilot", includesAny(server, ["/api/natural-copilot"]) || includesAny(mountTxt, ["/api/natural-copilot"]));
  must("manifest defines natural copilot capabilities", includesAny(manifest, ["NATURAL_COPILOT_CAPABILITIES", "Dogal Turkce cevap katmani", "Copilot geri bildirim zemini", "Doğal Türkçe cevap katmanı"]));
  must("route exposes manifest and templates", includesAny(route, ["/manifest", "/reply-template", "/feedback-template"]));
  must("panel labels roadmap/planned surface", includesAny(panel, ["Doğal Copilot Yol Haritası", "Roadmap", "Planned surface", "read-only", "suggestion-first", "canlı operasyon yüzeyi değildir"]));
  must("panel distinguishes active and planned capabilities", includesAny(panel, ["Aktif capability", "Planlanan capability", "ACTIVE", "PLANNED"]));
  must("runbook explains roadmap/planned scope", includesAny(runbook, ["doğal copilot yol haritası", "roadmap / planned yüzeyi", "read-only", "suggestion-first", "canlı yönetim paneli değil", "dogal copilot yol haritasi", "roadmap / planned yuzeyi"]));

  console.log();
  console.log("OK M64 DOGAL COPILOT KATMANI CHECK PASS");
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});
