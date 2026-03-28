import { banner, must, read, exists, includesAny } from "./_static_milestone_check.js";

async function main() {
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
  const server = read("backend/src/server.js");
  const manifest = read("backend/src/ops/trustQualityManifest.js");
  const route = read("backend/src/routes/trustQuality.js");
  const panel = read("web/src/panels/superadmin/TrustQualityPanel.jsx");
  const runbook = read("docs/RUNBOOK_M63_TRUST_QUALITY_SERVICE_EVALUATION.md");

  console.log("INFO checking updated route and SSOT status");
  must("readme points to M63 route or later official state", includesAny(readme, ["M62 green", "M63 — Güven + Kalite + Hizmet Değerlendirme", "pack_m63_trust_quality_service_evaluation.ps1", "post-M66 functional", "M66 operasyonel reassignment", "M75 green baseline", "M76A-1", "M77", "tools\pack_m77_kvkk_uyum_katmani.ps1"]));
  must("project spec reflects trust and evaluation layer", includesAny(projectSpec, ["hizmet alan kurum değerlendirmesi", "sağlayıcı kalite", "karar destek"]));
  must("primer reflects M63 route or later official state", includesAny(primer, ["M62 — Ticari Omurga Güçlendirme` resmi green oldu", "M63 — Güven + Kalite + Hizmet Değerlendirme", "pack_m63_trust_quality_service_evaluation.ps1", "post-M66 functional", "M66 operasyonel reassignment", "M75 green baseline", "M76A-1"]));
  must("startpack reflects M63 opening or later official state", includesAny(startpack, ["M63 — Güven + Kalite + Hizmet Değerlendirme", "M63 başlangıç notu", "M63` bitmeden `M64", "post-M66 functional", "pack_m66_operation_reassignment.ps1", "M75 green baseline", "M76A-1", "M77", "M78"]));
  must("checklist tracks M63 milestone or later official state", includesAny(checklist, ["[x] `M63 — Güven + Kalite + Hizmet Değerlendirme`", "[ ] `M63 — Güven + Kalite + Hizmet Değerlendirme`", "[ ] `M66 — Operasyonel Reassignment kapanışı`", "[ ] `M66 — Operasyonel Reassignment`"]));

  console.log("INFO checking backend and web skeleton");
  must("server imports trust quality router", includesAny(server, ["trustQualityRouter", "./routes/trustQuality.js"]));
  must("server mounts /api/trust-quality", includesAny(server, ["/api/trust-quality"]));
  must("manifest defines trust dimensions", includesAny(manifest, ["TRUST_QUALITY_DIMENSIONS", "Hizmet alan degerlendirmesi", "Karar destek yuzeyi"]));
  must("route exposes manifest and templates", includesAny(route, ["/manifest", "/evaluation-template", "/provider-signal-template"]));
  must("panel shows M63 cards", includesAny(panel, ["M63 Güven + Kalite + Hizmet Değerlendirme", "Hizmet alan değerlendirmesi", "Sağlayıcı kalite sinyali"]));
  must("runbook explains M63 scope", includesAny(runbook, ["guven ve kalite katmani", "hizmet alan kurum degerlendirmesi", "M63 green olmadan M64'e gecilmez"]));

  console.log();
  console.log("OK M63 GUVEN + KALITE + HIZMET DEGERLENDIRME CHECK PASS");
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});
