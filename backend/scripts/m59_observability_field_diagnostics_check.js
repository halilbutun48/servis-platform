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
  banner("M59 GOZLEMLEME + SAHA TESHis CHECK");

  const requiredFiles = [
    "backend/src/ops/observabilityManifest.js",
    "backend/src/routes/observability.js",
    "web/src/panels/superadmin/ObservabilityPanel.jsx",
    "docs/RUNBOOK_M59_OBSERVABILITY_FIELD_DIAGNOSTICS.md",
    "docs/MILESTONE_M59_OBSERVABILITY_FIELD_DIAGNOSTICS.md",
    "tools/pack_m59_observability_field_diagnostics.ps1",
    "tools/check_m59_observability_field_diagnostics_repo_contract.ps1",
    "README.md",
    "docs/PROJECT_SPEC_V1.md",
    "docs/PRIMER_SSOT.md",
    "docs/STARTPACK_V1.md",
    "docs/CHECKLIST_SSOT.md"
  ];

  console.log("INFO checking required M59 files");
  requiredFiles.forEach((rel) => must(`${rel} exists`, exists(rel)));

  const project = read("docs/PROJECT_SPEC_V1.md");
  const readme = read("README.md");
  const server = read("backend/src/server.js");
  const manifest = read("backend/src/ops/observabilityManifest.js");
  const route = read("backend/src/routes/observability.js");
  const panel = read("web/src/panels/superadmin/ObservabilityPanel.jsx");
  const runbook = read("docs/RUNBOOK_M59_OBSERVABILITY_FIELD_DIAGNOSTICS.md");
  const checklist = read("docs/CHECKLIST_SSOT.md");

  console.log("INFO checking updated product identity and route");
  must("project spec uses B2B marketplace identity", includesAny(project, ["B2B servis pazaryeri + operasyon yönetim platformudur", "teklif, pazarlık, uzlaşma ve sözleşme süreçlerini yöneten"]));
  must("root readme points to historical M59 route or later living route", includesAny(readme, ["M59 — Gözlemleme + Saha Teşhis", "M65 green olmadan sahaya çıkılmayacak", "M65 green olmadan sahaya çıkılmaz", "pack_m59_observability_field_diagnostics.ps1", "M75 green baseline"]));
  must("checklist keeps M59 open", includesAny(checklist, ["[ ] `M59 — Gözlemleme + Saha Teşhis`", "M59 — Gözlemleme + Saha Teşhis"]));

  console.log("INFO checking backend observability skeleton");
  must("server imports observability router", includesAny(server, ["observabilityRouter", "./routes/observability.js"]));
  must("server mounts /api/observability", includesAny(server, ["/api/observability"]));
  must("manifest defines widgets and event types", includesAny(manifest, ["M59_OBSERVABILITY_WIDGETS", "mobileHealthEventTypes", "gpsReliability"]));
  must("route exposes manifest and summary", includesAny(route, ["/manifest", "/health-summary", "/event-types"]));

  console.log("INFO checking canonical manifest and web skeleton");
  must("manifest defines health event types and GPS wording", includesAny(manifest, ["MOBILE_HEALTH_EVENT_TYPES", "GPS_PUBLISH_SUCCESS", "SURUCUNUN_TELEFON_GPSI"]));
  must("panel shows M59 observability cards", includesAny(panel, ["M59 Gözlemleme Merkezi", "GPS güven skoru", "Mobil sağlık olayları"]));

  console.log("INFO checking M59 runbook language");
  must("runbook explains M59 scope", includesAny(runbook, ["mobil saglik olaylari iskeleti", "GPS guven skoru", "M59 green olmadan M60'a gecilmez"]));

  console.log("\nOK M59 GOZLEMLEME + SAHA TESHis CHECK PASS");
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});
