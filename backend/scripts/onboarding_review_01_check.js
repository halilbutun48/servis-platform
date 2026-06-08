#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "../..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
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

function ok(label) {
  console.log(`OK ${label}`);
}

function fail(label) {
  throw new Error(`FAIL ${label}`);
}

function must(text, needle, label) {
  if (normalize(text).includes(normalize(needle))) ok(label);
  else fail(label);
}

function mustNot(text, needle, label) {
  if (!normalize(text).includes(normalize(needle))) ok(label);
  else fail(label);
}

function ordered(text, needles, label) {
  const haystack = normalize(text);
  let cursor = 0;
  for (const needle of needles) {
    const target = normalize(needle);
    const idx = haystack.indexOf(target, cursor);
    if (idx === -1) fail(`${label}: missing ${needle}`);
    if (idx < cursor) fail(`${label}: wrong order for ${needle}`);
    cursor = idx + target.length;
  }
  ok(label);
}

function gitCachedNames() {
  try {
    const out = execFileSync("git", ["diff", "--cached", "--name-only"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    return String(out || "");
  } catch {
    return "";
  }
}

function readMany(paths) {
  return paths.map((rel) => `\n/* FILE: ${rel} */\n${read(rel)}`).join("\n");
}

console.log("=== ONBOARDING-REVIEW-01 CHECK ===");

const pkg = read("package.json");
const routeMounts = read("backend/src/bootstrap/routeMounts.js");
const server = read("backend/src/server.js");
const service = read("backend/src/services/publicLeadService.js");
const reviewRoute = read("backend/src/routes/publicLeadReview.js");
const publicRoute = read("backend/src/routes/public.js");
const landing = read("web/src/panels/public/PublicLandingPage.jsx");
const modal = read("web/src/components/public/PublicLeadCaptureModal.jsx");
const reviewPanel = read("web/src/panels/superadmin/PublicLeadReviewPanel.jsx");
const superAdminPanel = read("web/src/panels/superadmin/SuperAdminPanel.jsx");
const app = read("web/src/App.jsx");
const api = read("web/src/api.js");
const copilotFacts = read("web/src/utils/copilotFacts.js");
const screenRegistry = read("web/src/copilot/screenRegistry.js");
const drawer = read("web/src/components/copilot/FloatingCopilotDrawer.jsx");
const statusPalette = read("web/src/utils/statusPalette.js");
const displayStatus = read("web/src/utils/displayStatus.js");
const runner = read("backend/scripts/run_product_extensions_check_chain.js");
const verifyChain = read("backend/scripts/verify_chain_01_product_extensions_check.js");
const harnessCheck = read("backend/scripts/script_harness_consolidation_01_check.js");
const harnessDoc = read("docs/SCRIPT_HARNESS_CONSOLIDATION_01.md");
const milestoneDoc = read("docs/ONBOARDING_REVIEW_01.md");
const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
const primer = read("docs/PRIMER_SSOT.md");
const spec = read("docs/PROJECT_SPEC_V1.md");

const codeSurface = readMany([
  "backend/src/routes/publicLeadReview.js",
  "backend/src/routes/public.js",
  "backend/src/bootstrap/routeMounts.js",
  "backend/src/server.js",
  "backend/src/services/publicLeadService.js",
  "web/src/api.js",
  "web/src/App.jsx",
  "web/src/panels/public/PublicLandingPage.jsx",
  "web/src/components/public/PublicLeadCaptureModal.jsx",
  "web/src/panels/superadmin/PublicLeadReviewPanel.jsx",
  "web/src/panels/superadmin/SuperAdminPanel.jsx",
  "web/src/utils/copilotFacts.js",
  "web/src/copilot/screenRegistry.js",
  "web/src/components/copilot/FloatingCopilotDrawer.jsx",
  "web/src/utils/statusPalette.js",
  "web/src/utils/displayStatus.js",
]);

must(pkg, '"check:onboardingreview01": "node backend/scripts/onboarding_review_01_check.js"', "package.json exposes onboarding review check");
must(pkg, '"check:leadcapture01": "node backend/scripts/lead_capture_01_check.js"', "package.json keeps lead capture check");
must(pkg, '"check:publiclanding01": "node backend/scripts/public_landing_01_check.js"', "package.json keeps public landing check");
must(runner, "check:onboardingreview01", "product extensions runner includes onboarding review check");
must(verifyChain, '"check:onboardingreview01": "node backend/scripts/onboarding_review_01_check.js"', "verify chain exposes onboarding review check");
must(guide, "ONBOARDING-REVIEW-01", "milestone guide mentions onboarding review");
must(guide, "check:onboardingreview01", "milestone guide exposes onboarding review check");
must(guide, "node backend\\scripts\\onboarding_review_01_check.js", "milestone guide includes onboarding review command");
must(harnessCheck, "docs/ONBOARDING_REVIEW_01.md", "harness check covers onboarding review doc");
must(harnessCheck, "check:onboardingreview01", "harness check covers onboarding review package script");
must(harnessCheck, "ONBOARDING-REVIEW-01", "harness check covers onboarding review milestone");
must(harnessDoc, "docs/ONBOARDING_REVIEW_01.md", "harness doc references onboarding review doc");
must(harnessDoc, "check:onboardingreview01", "harness doc references onboarding review check");
must(harnessDoc, "ONBOARDING-REVIEW-01", "harness doc references onboarding review milestone");
must(spec, "kontrollü lead inceleme kuyruğu", "project spec records controlled lead review queue");
must(milestoneDoc, "insan inceleme kuyruğu", "onboarding review doc states human review queue");
must(milestoneDoc, "APPROVED_FOR_INVITE", "onboarding review doc lists invite-ready status");
must(milestoneDoc, "invite, kullanıcı, ödeme, fatura, sözleşme", "onboarding review doc keeps boundaries");
must(milestoneDoc, "ONBOARDING-REVIEW-01 FINAL AUDIT", "onboarding review doc references final audit");

must(routeMounts, 'app.use("/api/admin/public-leads"', "admin route mounts public lead review queue");
must(server, "publicLeadReviewRouter", "server wires public lead review router");
must(reviewRoute, "publicLeadReviewRouter", "review route exports router");
must(reviewRoute, "asyncHandler", "review route returns JSON via async handler");
must(reviewRoute, "message: \"İnceleme kaydı güncellendi.\"", "review route returns JSON status update");

must(service, "LEAD_REVIEW_STATUSES", "service exposes review statuses");
must(service, "LEAD_REVIEW_STATUS_LABELS", "service exposes review status labels");
must(service, "APPROVED_FOR_INVITE", "service includes invite-ready status");
must(service, "listPublicLeadReviewQueue", "service exposes review queue reader");
must(service, "updatePublicLeadReviewDecision", "service exposes review updater");
must(service, "reviewNote", "service stores review notes");
must(service, "operationNote", "service stores operation notes");

must(publicRoute, '"/api/public/leads"', "public lead submit route still exists");
must(publicRoute, "publicLeadsRouter", "public lead submit router still wired");
must(landing, "PublicLeadCaptureModal", "landing keeps lead capture modal");
must(landing, "Demo talep et", "landing keeps demo CTA");
must(modal, "KVKK aydınlatma metnini okudum ve onaylıyorum.", "lead modal keeps KVKK gate");
must(modal, "Başvurunuz alındı. Ekibimiz inceleme sonrası sizinle iletişime geçecek.", "lead modal keeps success copy");

must(reviewPanel, "Başvuru İnceleme Kuyruğu", "review panel title exists");
must(reviewPanel, "İncelemeye al", "review panel has review action");
must(reviewPanel, "Ek bilgi gerekli", "review panel has info-needed action");
must(reviewPanel, "Invite için uygun", "review panel has invite-ready action");
must(reviewPanel, "Reddet", "review panel has reject action");
must(reviewPanel, "APPROVED_FOR_INVITE", "review panel shows invite-ready state");
must(reviewPanel, "Sadece inceleme", "review panel keeps read-only boundary");
must(reviewPanel, "Bu ekran sadece başvuruları listeler ve durum/not günceller. Otomatik hesap, davet, ödeme veya sözleşme açmaz.", "review panel keeps no-auto-action boundary");

must(superAdminPanel, "Başvuru İncelemesi", "superadmin quick access includes review panel");
must(app, 'if (path === "/superadmin/onboarding-review") return { layout: true, node: <SuperPublicLeadReviewPanel /> };', "App routes onboarding review panel");
must(app, 'if (path === "/superadmin/public-leads") return { layout: true, node: <SuperPublicLeadReviewPanel /> };', "App keeps public lead alias");
must(api, 'export async function listPublicLeadReviewQueue(params = {}, { token } = {})', "api helper lists review queue");
must(api, 'export async function updatePublicLeadReviewStatus(leadId, payload = {}, { token } = {})', "api helper updates review status");

must(copilotFacts, "isOnboardingReview", "copilot facts recognize onboarding review surface");
must(copilotFacts, "Invite için uygun olanları aç", "copilot facts include review chip copy");
must(screenRegistry, 'path: "/superadmin/onboarding-review"', "screen registry includes onboarding review path");
must(screenRegistry, 'path: "/superadmin/public-leads"', "screen registry includes public leads alias");
must(drawer, 'SUPERADMIN_ONBOARDING_REVIEW', "copilot drawer route key includes onboarding review");
must(statusPalette, "APPROVED_FOR_INVITE", "status palette supports invite-ready state");
must(displayStatus, "APPROVED_FOR_INVITE", "display status supports invite-ready state");

mustNot(codeSurface, "create user", "code surface does not expose create user copy");
mustNot(codeSurface, "send invite", "code surface does not expose send invite copy");
mustNot(codeSurface, "payment execute", "code surface does not expose payment execute copy");
mustNot(codeSurface, "billing execute", "code surface does not expose billing execute copy");
mustNot(codeSurface, "contract execute", "code surface does not expose contract execute copy");
mustNot(codeSurface, "supplier verification auto", "code surface does not expose supplier verification auto copy");
mustNot(codeSurface, "settlement execute", "code surface does not expose settlement execute copy");
mustNot(codeSurface, "raw token", "code surface does not expose raw token copy");
mustNot(codeSurface, "debug payload", "code surface does not expose debug payload copy");
mustNot(codeSurface, "raw payload", "code surface does not expose raw payload copy");

const cachedNames = gitCachedNames();
mustNot(cachedNames, "backend/artifacts/runtime-data/", "runtime-data is not staged");
mustNot(cachedNames, "public-leads.json", "public lead runtime artifact is not staged");

ordered(runner, [
  "check:roadmaplockaimarketplace01",
  "check:publiclanding01",
  "check:leadcapture01",
  "check:onboardingreview01",
  "check:agreementsourceshiftlineage01",
], "public onboarding chain order stays locked");

console.log("=== ONBOARDING-REVIEW-01 CHECK PASS ===");
