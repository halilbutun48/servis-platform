import { banner, exists, must, read } from "./_static_milestone_check.js";

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

function mustInclude(text, needle, label) {
  must(label, includesText(text, needle));
}

banner("PROJECT_SPEC_V1 / SECTION 16 FUTURE STRENGTHENING COVERAGE CHECK");

const backendPackage = JSON.parse(read("backend/package.json"));
const projectSpec = read("docs/PROJECT_SPEC_V1.md");
const runbook = read("docs/RUNBOOK_PROJECT_SPEC_V1_FUTURE_STRENGTHENING_COVERAGE.md");
const feedbackRunbook = read("docs/RUNBOOK_PANEL_SUPERADMIN_FEEDBACK_FUNNEL.md");
const m84Milestone = read("docs/MILESTONE_M84_FIELD_FEEDBACK_LOOP.md");
const primer = read("docs/PRIMER_SSOT.md");
const toolsPrimer = read("tools/PRIMER_SNAPSHOT.md");
const backlog = read("docs/NEXT_BACKLOG_V1.md");
const naturalManifest = read("backend/src/ops/naturalCopilotManifest.js");
const fieldFeedbackService = read("backend/src/ops/fieldFeedbackLoop.js");
const fieldFeedbackRoute = read("backend/src/routes/pilotLaunchGate.js");
const observabilityManifest = read("backend/src/ops/observabilityManifest.js");
const trustManifest = read("backend/src/ops/trustQualityManifest.js");
const operationVerification = read("backend/src/ops/operationVerificationManifest.js");

const requiredFiles = [
  "docs/MILESTONE_M59_OBSERVABILITY_FIELD_DIAGNOSTICS.md",
  "docs/RUNBOOK_M59_OBSERVABILITY_FIELD_DIAGNOSTICS.md",
  "backend/scripts/m59_observability_field_diagnostics_check.js",
  "docs/MILESTONE_M60_FIELD_ACCEPTANCE_CENTER.md",
  "docs/RUNBOOK_M60_FIELD_ACCEPTANCE_CENTER.md",
  "backend/scripts/m60_field_acceptance_center_check.js",
  "docs/MILESTONE_M61_SSOT_MILESTONE_ALIGNMENT.md",
  "docs/RUNBOOK_M61_SSOT_MILESTONE_ALIGNMENT.md",
  "backend/scripts/m61_ssot_milestone_alignment_check.js",
  "docs/MILESTONE_M62_COMMERCIAL_CORE_STRENGTHENING.md",
  "docs/RUNBOOK_M62_COMMERCIAL_CORE_STRENGTHENING.md",
  "backend/scripts/m62_commercial_core_strengthening_check.js",
  "docs/MILESTONE_M63_TRUST_QUALITY_SERVICE_EVALUATION.md",
  "docs/RUNBOOK_M63_TRUST_QUALITY_SERVICE_EVALUATION.md",
  "backend/scripts/m63_trust_quality_service_evaluation_check.js",
  "docs/MILESTONE_M64_NATURAL_COPILOT_LAYER.md",
  "docs/RUNBOOK_M64_NATURAL_COPILOT_LAYER.md",
  "backend/scripts/m64_natural_copilot_layer_check.js",
  "docs/MILESTONE_M65_PILOT_LAUNCH_GATE.md",
  "docs/RUNBOOK_M65_PILOT_LAUNCH_GATE.md",
  "backend/scripts/m65_pilot_launch_gate_check.js",
  "docs/MILESTONE_M78_1_OPERASYON_DOGRULAMA_YUZEYI.md",
  "docs/MILESTONE_M78_2_OPERASYON_DOGRULAMA_KAYIT_KATMANI.md",
  "docs/MILESTONE_M78_3_OPERASYON_DOGRULAMA_OZET_FILTRE_KATMANI.md",
  "docs/RUNBOOK_M78_1_OPERASYON_DOGRULAMA_YUZEYI.md",
  "docs/RUNBOOK_M78_2_OPERASYON_DOGRULAMA_KAYIT_KATMANI.md",
  "docs/RUNBOOK_M78_3_OPERASYON_DOGRULAMA_OZET_FILTRE_KATMANI.md",
  "backend/scripts/m78_1_operasyon_dogrulama_yuzeyi_check.js",
  "backend/scripts/m78_2_operasyon_dogrulama_kayit_katmani_check.js",
  "backend/scripts/m78_3_operasyon_dogrulama_ozet_filtre_katmani_check.js",
  "docs/MILESTONE_M84_FIELD_FEEDBACK_LOOP.md",
  "docs/RUNBOOK_M84_FIELD_FEEDBACK_LOOP.md",
  "backend/scripts/m84_field_feedback_loop_check.js",
  "docs/RUNBOOK_PROJECT_SPEC_V1_FUTURE_STRENGTHENING_COVERAGE.md",
  "docs/RUNBOOK_PANEL_SUPERADMIN_FEEDBACK_FUNNEL.md",
];

for (const rel of requiredFiles) {
  must(`${rel} exists`, exists(rel));
}

must("backend package exposes spec16check script", (backendPackage.scripts || {}).spec16check === "node scripts/project_spec_v1_future_strengthening_coverage_check.js");

mustInclude(projectSpec, "## 16. Gelecek Güçlendirme Yönü", "project spec includes section 16 heading");
mustInclude(projectSpec, "gözlemleme ve saha teşhis katmanı", "project spec lists observability strengthening");
mustInclude(projectSpec, "saha acceptance merkezi", "project spec lists field acceptance strengthening");
mustInclude(projectSpec, "milestone / SSOT hizası", "project spec lists ssot alignment strengthening");
mustInclude(projectSpec, "daha doğal ve bağlamlı copilot", "project spec lists natural copilot strengthening");
mustInclude(projectSpec, "copilot geri bildirim ve doğal dil katmanı", "project spec lists copilot feedback strengthening");
mustInclude(projectSpec, "cihaz sağlık görünürlüğü", "project spec lists device health visibility");
mustInclude(projectSpec, "GPS güven skoru", "project spec lists gps reliability");
mustInclude(projectSpec, "vardiya olay zaman çizgisi", "project spec lists shift timeline");
mustInclude(projectSpec, "operasyon kalite paneli", "project spec lists operation quality panel");
mustInclude(projectSpec, "hizmet alan kurum değerlendirme sistemi", "project spec lists service receiver evaluation");
mustInclude(projectSpec, "sağlayıcı kalite / güven puanı", "project spec lists provider trust score");
mustInclude(projectSpec, "ticari omurga görünürlüğü", "project spec lists commercial backbone visibility");

mustInclude(runbook, "milestone / feature-family", "coverage runbook explains milestone coverage model");
mustInclude(runbook, "M59", "coverage runbook maps M59");
mustInclude(runbook, "M60", "coverage runbook maps M60");
mustInclude(runbook, "M61", "coverage runbook maps M61");
mustInclude(runbook, "M62", "coverage runbook maps M62");
mustInclude(runbook, "M63", "coverage runbook maps M63");
mustInclude(runbook, "M64", "coverage runbook maps M64");
mustInclude(runbook, "M78", "coverage runbook maps operation verification coverage");
mustInclude(runbook, "M84", "coverage runbook maps field feedback loop");
mustInclude(runbook, "geri bildirim hunisi", "coverage runbook records panel feedback gap");

mustInclude(feedbackRunbook, "Gorus bildir", "panel feedback runbook defines feedback action");
mustInclude(feedbackRunbook, "Oneri gonder", "panel feedback runbook defines suggestion action");
mustInclude(feedbackRunbook, "Sikayet / sorun bildir", "panel feedback runbook defines complaint action");
mustInclude(feedbackRunbook, "PilotLaunchGatePanel", "panel feedback runbook reuses current superadmin inbox");

mustInclude(m84Milestone, "Saha gozlem / geri bildirim dongusu", "M84 milestone names feedback loop");
mustInclude(m84Milestone, "fieldFeedbackLoop.js", "M84 milestone lists service");
mustInclude(m84Milestone, "PilotLaunchGatePanel.jsx", "M84 milestone lists panel");

must("primer lists M84", includesText(primer, "M84") && includesText(primer, "saha geri bildirim dongusu"));
must("tools primer lists M84", includesText(toolsPrimer, "M84") && (includesText(toolsPrimer, "field feedback loop") || includesText(toolsPrimer, "saha geri bildirim dongusu")));
must("backlog keeps M84 visibility", includesText(backlog, "M84"));

mustInclude(observabilityManifest, "GPS güven skoru", "observability manifest exposes gps reliability");
mustInclude(observabilityManifest, "Cihaz sağlık özeti", "observability manifest exposes device health");
mustInclude(observabilityManifest, "Vardiya olay akışı", "observability manifest exposes shift timeline");
mustInclude(trustManifest, "Hizmet alan değerlendirmesi", "trust manifest exposes service receiver evaluation");
mustInclude(trustManifest, "Sağlayıcı kalite özeti", "trust manifest exposes provider quality summary");
mustInclude(naturalManifest, 'id: "feedback"', "natural copilot manifest exposes feedback capability");
mustInclude(naturalManifest, 'status: "PLANNED"', "natural copilot manifest keeps planned strengthening markers");
mustInclude(operationVerification, "Operasyon Doğrulama Yüzeyi", "operation verification manifest exposes quality panel");
mustInclude(fieldFeedbackService, "FIELD_FEEDBACK_ROLES", "field feedback service exposes role list");
mustInclude(fieldFeedbackRoute, "/field-feedback-loop/records", "field feedback route exposes record endpoints");
mustInclude(fieldFeedbackRoute, "SUPER_ADMIN', 'ROOM', 'COMPANY', 'DRIVER", "field feedback route already supports core panel roles");

console.log("PROJECT_SPEC_V1 / SECTION 16 FUTURE STRENGTHENING COVERAGE CHECK PASS");
