import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), "utf8");
}

function normalize(text) {
  return String(text || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\\/g, "/")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function must(text, needle, label) {
  if (!normalize(text).includes(normalize(needle))) {
    throw new Error(`FAIL ${label}`);
  }
  console.log(`OK ${label}`);
}

function mustNot(text, needle, label) {
  if (normalize(text).includes(normalize(needle))) {
    throw new Error(`FAIL ${label}`);
  }
  console.log(`OK ${label}`);
}

function mustNoMigrationMarker(marker, label) {
  const dir = path.join(repoRoot, "backend/prisma/migrations");
  if (!fs.existsSync(dir)) {
    console.log(`OK ${label}`);
    return;
  }
  const folders = fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  if (folders.some((name) => normalize(name).includes(normalize(marker)))) {
    throw new Error(`FAIL ${label}`);
  }
  console.log(`OK ${label}`);
}

console.log("=== QLT-04A QUALITY LAYOUT POLISH CHECK ===");

const rootPkg = read("package.json");
const trustPanel = read("web/src/panels/superadmin/TrustQualityPanel.jsx");
const servicePanel = read("web/src/panels/company/ServiceEvaluationPanel.jsx");
const css = read("web/src/index.css");
const route = read("backend/src/routes/trustQuality.js");
const schema = read("backend/prisma/schema.prisma");

must(rootPkg, '"check:qlt04a": "node backend/scripts/qlt_04a_quality_layout_polish_check.js"', "root package exposes check:qlt04a");
must(rootPkg, '"check:qlt04": "node backend/scripts/qlt_04_quality_review_history_check.js"', "root package keeps check:qlt04");
must(rootPkg, '"check:web-mobile":', "root package keeps check:web-mobile");
must(rootPkg, '"lint:web":', "root package keeps lint:web");
must(rootPkg, '"verify:final":', "root package keeps verify:final");

must(trustPanel, "quality-summary-grid", "trust panel uses summary grid");
must(trustPanel, "quality-detail-layout", "trust panel uses detail layout");
must(trustPanel, "OperationProofReadonlyBadge", "trust panel keeps operation proof surface");
must(trustPanel, "QualityDraftScoreCard", "trust panel keeps draft score surface");
must(trustPanel, "QualityReviewDecisionCard", "trust panel keeps review decision surface");
must(trustPanel, "QualityReviewHistoryCard", "trust panel keeps review history surface");
must(trustPanel, "QualityProofReadonlyCard", "trust panel keeps proof readiness surface");
mustNot(trustPanel, "maxWidth: 760", "trust panel removes stacked max width wrappers");

must(servicePanel, "quality-summary-grid", "service panel uses summary grid");
must(servicePanel, "quality-detail-layout", "service panel uses detail layout");
must(servicePanel, "QualityProofReadonlyCard", "service panel keeps proof readiness surface");
must(servicePanel, "QualityDraftScoreCard", "service panel keeps draft score surface");
must(servicePanel, "QualityReviewDecisionCard", "service panel keeps review decision surface");
must(servicePanel, "QualityReviewHistoryCard", "service panel keeps review history surface");
must(servicePanel, "quality-metric-grid", "service panel uses metric grid");
mustNot(servicePanel, "maxWidth: 760", "service panel removes stacked max width wrappers");

must(css, ".quality-summary-grid {", "css defines summary grid");
must(css, ".quality-detail-layout {", "css defines detail layout");
must(css, ".quality-card-shell {", "css defines shared quality card shell");
must(css, ".quality-metric-grid {", "css defines metric grid");
must(css, "@media (min-width: 901px) and (max-width: 1180px)", "css keeps tablet breakpoint");
must(css, ".quality-summary-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }", "css keeps tablet two-column summary");
must(css, ".quality-summary-grid { grid-template-columns: 1fr; }", "css keeps mobile one-column summary");
must(css, ".quality-detail-layout { grid-template-columns: 1fr; }", "css keeps mobile one-column detail");
must(css, ".quality-metric-grid { grid-template-columns: 1fr; }", "css keeps mobile metric stack");
must(css, "textarea { min-height: 88px; }", "css keeps compact quality textarea");

must(route, '"/review-decision/summary"', "backend trust quality summary endpoint remains");
must(route, '"/review-decision/history"', "backend trust quality history endpoint remains");
must(route, '"/review-decision"', "backend trust quality review endpoint remains");
mustNot(route, "/quality-layout", "no new backend layout route");

must(schema, "model Invite", "schema keeps Invite model");
must(schema, "model ParentInvite", "schema keeps ParentInvite model");
must(schema, "model PassengerLiveLink", "schema keeps PassengerLiveLink model");
mustNot(schema, "model QualityLayout", "schema does not add a layout model");
mustNoMigrationMarker("qlt_04a", "no new qlt-04a migration folder detected");

console.log("=== QLT-04A QUALITY LAYOUT POLISH CHECK PASS ===");
