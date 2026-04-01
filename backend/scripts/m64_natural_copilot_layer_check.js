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
const server = read("backend/src/server.js");
const mountTxt = exists("backend/src/bootstrap/routeMounts.js") ? read("backend/src/bootstrap/routeMounts.js") : "";

async function main() {
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
  must("readme points to M64 route or later official state", includesAny(readme, ["M63 green", "M64 — Doğal Copilot Katmanı", "pack_m64_natural_copilot_layer.ps1", "post-M66 functional", "M75 green baseline", "M76A-1", "M77", "tools\\pack_m77_kvkk_uyum_katmani.ps1"]));
  must("project spec reflects natural copilot layer", includesAny(projectSpec, ["daha doğal Türkçe cevap katmanı", "kısa konuşma hafızası", "daha basit anlat", "daha dogal Turkce cevap katmani", "kisa konusma hafizasi"]));
  must("primer reflects M64 route or later official state", includesAny(primer, ["M63 — Güven + Kalite + Hizmet Değerlendirme` resmi green oldu", "M64 — Doğal Copilot Katmanı", "pack_m64_natural_copilot_layer.ps1", "post-M66 functional", "M75 green baseline", "M76A-1", "M77", "M78"]));
  must("startpack reflects M64 opening or later official state", includesAny(startpack, ["M64 — Doğal Copilot Katmanı", "M64 başlangıç notu", "M64` bitmeden `M65", "post-M66 functional", "M75 green baseline", "M76A-1", "M77", "M78"]));
  must("checklist tracks M64 milestone or later official state", includesAny(checklist, ["[ ] `M64 — Doğal Copilot Katmanı`", "[x] `M64 — Doğal Copilot Katmanı`", "M66 — Operasyonel Reassignment kapanışı"]));

  console.log("INFO checking backend and web skeleton");
  must("server imports natural copilot router", includesAny(server, ["naturalCopilotRouter", "./routes/naturalCopilot.js"]) || includesAny(mountTxt, ["naturalCopilotRouter"]));
  must("server mounts /api/natural-copilot", includesAny(server, ["/api/natural-copilot"]) || includesAny(mountTxt, ["/api/natural-copilot"]));
  must("manifest defines natural copilot capabilities", includesAny(manifest, ["NATURAL_COPILOT_CAPABILITIES", "Dogal Turkce cevap katmani", "Copilot geri bildirim zemini", "Doğal Türkçe cevap katmanı"]));
  must("route exposes manifest and templates", includesAny(route, ["/manifest", "/reply-template", "/feedback-template"]));
  must("panel shows M64 cards", includesAny(panel, ["M64 Doğal Copilot Katmanı", "Doğal cevap", "Geri bildirim", "M64 Dogal Copilot Katmani", "Dogal cevap", "Geri bildirim"]));
  must("runbook explains M64 scope", includesAny(runbook, ["doğal copilot katmanı", "kısa konuşma hafızası", "M64 green olmadan M65", "dogal copilot katmani", "kisa konusma hafizasi"]));

  console.log();
  console.log("OK M64 DOGAL COPILOT KATMANI CHECK PASS");
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});
