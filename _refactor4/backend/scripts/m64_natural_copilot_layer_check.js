import { banner, must, read, exists, includesAny } from "./_static_milestone_check.js";

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
  const server = read("backend/src/server.js");
  const manifest = read("backend/src/ops/naturalCopilotManifest.js");
  const route = read("backend/src/routes/naturalCopilot.js");
  const panel = read("web/src/panels/superadmin/NaturalCopilotPanel.jsx");
  const runbook = read("docs/RUNBOOK_M64_NATURAL_COPILOT_LAYER.md");

  console.log("INFO checking updated route and SSOT status");
  must("readme points to M64 route or later official state", includesAny(readme, [
    "M63 green",
    "M64 — Doğal Copilot Katmanı",
    "pack_m64_natural_copilot_layer.ps1",
    "post-M66 functional"
  ]));
  must("project spec reflects natural copilot layer", includesAny(projectSpec, [
    "daha doğal Türkçe cevap katmanı",
    "kısa konuşma hafızası",
    "daha basit anlat"
  ]));
  must("primer reflects M64 route or later official state", includesAny(primer, [
    "M63 — Güven + Kalite + Hizmet Değerlendirme` resmi green oldu",
    "M64 — Doğal Copilot Katmanı",
    "pack_m64_natural_copilot_layer.ps1",
    "post-M66 functional"
  ]));
  must("startpack reflects M64 opening or later official state", includesAny(startpack, [
    "M64 — Doğal Copilot Katmanı",
    "M64 başlangıç notu",
    "M64` bitmeden `M65",
    "post-M66 functional"
  ]));
  must("checklist tracks M64 milestone or later official state", includesAny(checklist, [
    "[ ] `M64 — Doğal Copilot Katmanı`",
    "[x] `M64 — Doğal Copilot Katmanı`",
    "M66 — Operasyonel Reassignment kapanışı"
  ]));

  console.log("INFO checking backend and web skeleton");
  must("server imports natural copilot router", includesAny(server, ["naturalCopilotRouter", "./routes/naturalCopilot.js"]));
  must("server mounts /api/natural-copilot", includesAny(server, ["/api/natural-copilot"]));
  must("manifest defines natural copilot capabilities", includesAny(manifest, ["NATURAL_COPILOT_CAPABILITIES", "Dogal Turkce cevap katmani", "Copilot geri bildirim zemini"]));
  must("route exposes manifest and templates", includesAny(route, ["/manifest", "/reply-template", "/feedback-template"]));
  must("panel shows M64 cards", includesAny(panel, ["M64 Doğal Copilot Katmanı", "Doğal cevap", "Geri bildirim"]));
  must("runbook explains M64 scope", includesAny(runbook, ["doğal copilot katmanı", "kısa konuşma hafızası", "M64 green olmadan M65"]));

  console.log();
  console.log("OK M64 DOGAL COPILOT KATMANI CHECK PASS");
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});
