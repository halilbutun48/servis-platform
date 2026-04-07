import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

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
const read = (rel) => fs.readFileSync(path.join(repoRoot, rel), "utf8");
const ok = (msg) => console.log(`OK ${msg}`);
const fail = (msg) => { throw new Error(`FAIL ${msg}`); };
const banner = (msg) => console.log(`=== ${msg} ===`);

function includes(rel, needle, label) {
  if (!read(rel).includes(needle)) fail(label);
  ok(label);
}

function includesAny(rel, needles, label) {
  const txt = read(rel);
  if (!needles.some((n) => includesText(txt, n))) fail(label);
  ok(label);
}

banner("M71 SUMMARY + HOT PATH CHECK");
includes("backend/src/routes/companyOverview.js", "workflow-summary", "company overview workflow summary route exists");
includes("backend/src/routes/companyOverview.js", "commercial-flow-summary", "company overview commercial flow summary route exists");
const mountFiles = ["backend/src/server.js", "backend/src/bootstrap/routeMounts.js"];
if (!mountFiles.some((rel) => read(rel).includes('app.use("/api/company/overview", companyOverviewRouter());'))) fail("server mounts company overview router"); else ok("server mounts company overview router");
includes("web/src/utils/companyDataHub.js", "/api/company/overview/workflow-summary", "companyDataHub workflow summary helper exists");
includes("web/src/utils/companyDataHub.js", "/api/company/overview/commercial-flow-summary", "companyDataHub commercial flow summary helper exists");
includes("web/src/panels/company/WorkflowPanel.jsx", "getCompanyWorkflowSummary", "WorkflowPanel uses workflow summary");
includes("web/src/panels/company/WorkflowPanel.jsx", "visibleOfferRoomIds", "WorkflowPanel provider score fetch is scoped to visible offers");
includes("web/src/panels/company/CommercialFlowPanel.jsx", "getCompanyCommercialFlowSummary", "CommercialFlowPanel uses commercial summary");
includes("web/src/components/RoutePreviewModal.jsx", "loadedAt", "RoutePreviewModal freshness state exists");
includesAny("web/src/components/RoutePreviewModal.jsx", ["ttlMs: 15000", "ttlMs: 30000"], "RoutePreviewModal cache TTL increased");
includes("backend/src/routes/agreements.js", "req.query.q", "agreements q query support exists");
includes("backend/src/routes/offers.js", "req.query.q", "offers q query support exists");
includes("backend/scripts/company_fetch_storm_check.js", "/api/company/overview/workflow-summary", "storm check uses workflow summary endpoint");
includes("backend/scripts/company_fetch_storm_check.js", "virtualUsers", "storm check uses multi-user pressure profile");
console.log("=== M71 SUMMARY + HOT PATH CHECK PASS ===");
