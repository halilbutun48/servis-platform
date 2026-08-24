#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { assertProductExtensionsIncludes, assertProductExtensionsOrder, productExtensionsChecks } from "./lib/productExtensionsRegistry.js";
import { APP_JSX_ROLE_TENANT_SCOPE_PATHS, mustNoDiffExceptWithIdentity } from "./lib/guardGitScope.js";

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

function readMany(paths) {
  return paths.map((rel) => `\n/* FILE: ${rel} */\n${read(rel)}`).join("\n");
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

function gitDiffNames(paths) {
  const args = ["diff", "--name-only", "--", ...paths];
  const out = execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return String(out || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

console.log("=== ONBOARDING-REVIEW-01 FINAL AUDIT CHECK ===");

const pkg = read("package.json");
const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
const primer = read("docs/PRIMER_SSOT.md");
const roadmap = read("docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md");
const baseDoc = read("docs/ONBOARDING_REVIEW_01.md");
const finalDoc = read("docs/ONBOARDING_REVIEW_01_FINAL_AUDIT.md");
const publicPromiseDoc = read("docs/PUBLIC_LANDING_01_FINAL_PROMISE_CHECK.md");
const harnessCheck = read("backend/scripts/script_harness_consolidation_01_check.js");
const harnessDoc = read("docs/SCRIPT_HARNESS_CONSOLIDATION_01.md");
const reviewRoute = read("backend/src/routes/publicLeadReview.js");
const publicRoute = read("backend/src/routes/public.js");
const routeMounts = read("backend/src/bootstrap/routeMounts.js");
const server = read("backend/src/server.js");
const service = read("backend/src/services/publicLeadService.js");
const reviewPanel = read("web/src/panels/superadmin/PublicLeadReviewPanel.jsx");
const api = read("web/src/api.js");
const app = read(APP_JSX_ROLE_TENANT_SCOPE_PATHS[0]);
const copilotFacts = read("web/src/utils/copilotFacts.js");
const screenRegistry = read("web/src/copilot/screenRegistry.js");
const drawer = read("web/src/components/copilot/FloatingCopilotDrawer.jsx");
const statusPalette = read("web/src/utils/statusPalette.js");
const displayStatus = read("web/src/utils/displayStatus.js");
const registryScripts = productExtensionsChecks.map((step) => step.script);

const codeSurface = readMany([
  "backend/src/routes/publicLeadReview.js",
  "backend/src/routes/public.js",
  "backend/src/bootstrap/routeMounts.js",
  "backend/src/server.js",
  "backend/src/services/publicLeadService.js",
  "web/src/api.js",
  ...APP_JSX_ROLE_TENANT_SCOPE_PATHS,
  "web/src/panels/superadmin/PublicLeadReviewPanel.jsx",
  "web/src/utils/copilotFacts.js",
  "web/src/copilot/screenRegistry.js",
  "web/src/components/copilot/FloatingCopilotDrawer.jsx",
  "web/src/utils/statusPalette.js",
  "web/src/utils/displayStatus.js",
]);

must(pkg, '"check:onboardingreviewfinalaudit01": "node backend/scripts/onboarding_review_final_audit_01_check.js"', "package.json exposes onboarding review final audit check");
assertProductExtensionsIncludes("check:onboardingreviewfinalaudit01", "product extensions registry includes onboarding review final audit", registryScripts);
assertProductExtensionsOrder(
  [
    "check:publiclandingfinalpromise01",
    "check:leadcapture01",
    "check:onboardingreview01",
    "check:onboardingreviewfinalaudit01",
    "check:invitebasedmembership01",
    "check:verifiedsupplier01",
    "check:uxmarketplacepanels01",
    "check:productflowbuttonaudit01",
  ],
  "onboarding review final audit stays after review and before product flow audit",
  registryScripts,
);

must(guide, "ONBOARDING-REVIEW-01 FINAL AUDIT", "script guide mentions onboarding review final audit");
must(guide, "check:onboardingreviewfinalaudit01", "script guide exposes onboarding review final audit check");
must(guide, "node backend\\scripts\\onboarding_review_final_audit_01_check.js", "script guide includes onboarding review final audit command");
must(guide, "docs/ONBOARDING_REVIEW_01_FINAL_AUDIT.md", "script guide includes onboarding review final audit doc");
must(guide, "INVITE-BASED-MEMBERSHIP-01", "script guide mentions invite-based membership milestone");
must(guide, "check:invitebasedmembership01", "script guide exposes invite-based membership check");
must(guide, "node backend\\scripts\\invite_based_membership_01_check.js", "script guide includes invite-based membership command");
must(guide, "docs/INVITE_BASED_MEMBERSHIP_01.md", "script guide includes invite-based membership doc");
must(guide, "PUBLIC-LANDING-01 -> PUBLIC-LANDING-PLATFORM-FIRST-01 -> PUBLIC-LANDING-01 FINAL PROMISE CHECK -> LEAD-CAPTURE-01 -> ONBOARDING-REVIEW-01 -> ONBOARDING-REVIEW-01 FINAL AUDIT -> INVITE-BASED-MEMBERSHIP-01 -> VERIFIED-SUPPLIER-01 -> UX-MARKETPLACE-PANELS-01 -> PRODUCT-FLOW-BUTTON-AUDIT-01", "script guide keeps public lead order");

must(primer, "ONBOARDING-REVIEW-01 final audit", "primer mentions onboarding review final audit");
must(primer, "docs/ONBOARDING_REVIEW_01_FINAL_AUDIT.md", "primer links onboarding review final audit doc");
must(primer, "INVITE-BASED-MEMBERSHIP-01", "primer mentions invite-based membership milestone");
must(primer, "docs/INVITE_BASED_MEMBERSHIP_01.md", "primer links invite-based membership doc");

must(roadmap, "AI Promise Strategy / Güven Stratejisi", "roadmap keeps trust strategy section");
must(roadmap, "Public marketing claim guard", "roadmap keeps marketing claim guard");
must(roadmap, "ONBOARDING-REVIEW-01 final audit", "roadmap keeps onboarding review final audit order");
must(roadmap, "INVITE-BASED-MEMBERSHIP-01", "roadmap keeps invite-based membership order");

must(baseDoc, "ONBOARDING-REVIEW-01", "base onboarding doc still exists");
must(baseDoc, "APPROVED_FOR_INVITE", "base onboarding doc keeps invite-ready state");
must(baseDoc, "invite, kullanıcı, ödeme, fatura, sözleşme", "base onboarding doc keeps boundary wording");
must(baseDoc, "ONBOARDING-REVIEW-01 FINAL AUDIT", "base onboarding doc links final audit");

must(publicPromiseDoc, "PUBLIC-LANDING-01 FINAL PROMISE CHECK", "public promise doc still exists");
must(publicPromiseDoc, "Underpromise, overdeliver", "public promise doc keeps underpromise overdeliver principle");
must(publicPromiseDoc, "güven stratejisi", "public promise doc keeps trust strategy wording");
must(publicPromiseDoc, "human approval", "public promise doc keeps human approval wording");
must(publicPromiseDoc, "guard", "public promise doc keeps guard wording");
must(publicPromiseDoc, "audit log", "public promise doc keeps audit log wording");
must(publicPromiseDoc, "Sefer Abi içeride daha fazlasını yaparsa bu güveni artırır.", "public promise doc keeps overdeliver trust sentence");

must(finalDoc, "ONBOARDING-REVIEW-01 FINAL AUDIT", "final audit doc title present");
must(finalDoc, "## Güven çizgisi", "final audit doc contains trust section");
must(finalDoc, "## Kanonik akış", "final audit doc contains canonical flow section");
must(finalDoc, "## Review sınırı", "final audit doc contains review boundary section");
must(finalDoc, "## Kanonik bağlar", "final audit doc contains canonical links section");
must(finalDoc, "## Kısa not", "final audit doc contains short note section");
must(finalDoc, "Underpromise, overdeliver", "final audit doc keeps underpromise overdeliver principle");
must(finalDoc, "güven stratejisi", "final audit doc keeps trust strategy wording");
must(finalDoc, "kanıtlanmış kabiliyet", "final audit doc keeps proven capability wording");
must(finalDoc, "public vaat", "final audit doc keeps public promise wording");
must(finalDoc, "maksimum güçlü operasyon AI", "final audit doc keeps maximum strong operations AI wording");
must(finalDoc, "human approval", "final audit doc keeps human approval wording");
must(finalDoc, "guard", "final audit doc keeps guard wording");
must(finalDoc, "audit log", "final audit doc keeps audit log wording");
must(finalDoc, "Sefer Abi içeride daha fazlasını yaparsa bu güveni artırır.", "final audit doc keeps overdeliver trust sentence");
must(finalDoc, "APPROVED_FOR_INVITE", "final audit doc keeps invite-ready status boundary");
must(finalDoc, "INVITE-BASED-MEMBERSHIP-01", "final audit doc points to invite-based membership next milestone");
must(finalDoc, "public lead otomatik kullanıcı / account olmaz", "final audit doc keeps public lead account boundary");
must(finalDoc, "invite draft", "final audit doc mentions invite draft boundary");
must(finalDoc, "pending invite", "final audit doc mentions pending invite boundary");
must(finalDoc, "AI runtime capability ekleme", "final audit doc excludes runtime capability work");
must(finalDoc, "UI feature ekleme", "final audit doc excludes UI feature work");
must(finalDoc, "backend route/service/schema değiştirme", "final audit doc excludes backend changes");
must(finalDoc, "Prisma/migration değiştirme", "final audit doc excludes prisma changes");
must(finalDoc, "marketing sayfasını değiştirme", "final audit doc excludes marketing page change");
must(finalDoc, "runtime feature açmaz", "final audit doc excludes runtime feature work");
must(finalDoc, "docs/PUBLIC_LANDING_01_FINAL_PROMISE_CHECK.md", "final audit doc links public promise doc");
must(finalDoc, "docs/ONBOARDING_REVIEW_01.md", "final audit doc links base onboarding doc");
must(finalDoc, "docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md", "final audit doc links roadmap doc");
must(finalDoc, "docs/PRIMER_SSOT.md", "final audit doc links primer");
must(finalDoc, "docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md", "final audit doc links milestone guide");
must(finalDoc, "backend/scripts/onboarding_review_01_check.js", "final audit doc links base onboarding review check");
must(finalDoc, "backend/src/routes/publicLeadReview.js", "final audit doc links review route");
must(finalDoc, "backend/src/services/publicLeadService.js", "final audit doc links review service");

must(reviewRoute, "publicLeadReviewRouter", "review route exports router");
must(reviewRoute, "asyncHandler", "review route keeps async handler");
must(reviewRoute, "message: \"İnceleme kaydı güncellendi.\"", "review route returns JSON update message");

must(service, "LEAD_REVIEW_STATUSES", "service exposes review statuses");
must(service, "APPROVED_FOR_INVITE", "service keeps invite-ready status");
must(service, "listPublicLeadReviewQueue", "service exposes queue reader");
must(service, "updatePublicLeadReviewDecision", "service exposes queue updater");
must(service, "reviewNote", "service stores review notes");
must(service, "operationNote", "service stores operation notes");

must(publicRoute, '"/api/public/leads"', "public lead submit route still exists");
must(publicRoute, "publicLeadsRouter", "public lead submit router still wired");
must(routeMounts, 'app.use("/api/admin/public-leads"', "admin route mounts public lead review queue");
must(server, "publicLeadReviewRouter", "server wires public lead review router");

must(reviewPanel, "Başvuru İnceleme Kuyruğu", "review panel title exists");
must(reviewPanel, "Sadece inceleme", "review panel keeps read-only boundary");
must(reviewPanel, "Bu ekran sadece başvuruları listeler ve durum/not günceller. Otomatik hesap, davet, ödeme veya sözleşme açmaz.", "review panel keeps no-auto-action boundary");
must(reviewPanel, "APPROVED_FOR_INVITE", "review panel shows invite-ready state");

must(api, 'export async function listPublicLeadReviewQueue(params = {}, { token } = {})', "api helper lists review queue");
must(api, 'export async function updatePublicLeadReviewStatus(leadId, payload = {}, { token } = {})', "api helper updates review status");
must(app, 'if (path === "/superadmin/onboarding-review") return { layout: true, node: <SuperPublicLeadReviewPanel /> };', "App routes onboarding review panel");
must(app, 'if (path === "/superadmin/public-leads") return { layout: true, node: <SuperPublicLeadReviewPanel /> };', "App keeps public lead alias");

must(copilotFacts, "isOnboardingReview", "copilot facts recognize onboarding review surface");
must(copilotFacts, "Invite için uygun olanları aç", "copilot facts include review chip copy");
must(screenRegistry, 'path: "/superadmin/onboarding-review"', "screen registry includes onboarding review path");
must(screenRegistry, 'path: "/superadmin/public-leads"', "screen registry includes public leads alias");
must(drawer, "SUPERADMIN_ONBOARDING_REVIEW", "copilot drawer route key includes onboarding review");
must(statusPalette, "APPROVED_FOR_INVITE", "status palette supports invite-ready state");
must(displayStatus, "APPROVED_FOR_INVITE", "display status supports invite-ready state");

must(harnessCheck, "check:onboardingreviewfinalaudit01", "script harness check knows onboarding review final audit alias");
must(harnessCheck, "docs/ONBOARDING_REVIEW_01_FINAL_AUDIT.md", "script harness check knows onboarding review final audit doc");
must(harnessCheck, "ONBOARDING-REVIEW-01 FINAL AUDIT", "script harness check knows onboarding review final audit milestone");
must(harnessDoc, "onboarding_review_final_audit_01_check.js", "script harness doc lists onboarding review final audit check");
must(harnessDoc, "docs/ONBOARDING_REVIEW_01_FINAL_AUDIT.md", "script harness doc lists onboarding review final audit doc");

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

  mustNoDiffExceptWithIdentity(
    [
      "backend/src/routes",
      "backend/src/services",
    "backend/src/bootstrap",
    "backend/src/server.js",
    "web/src/panels/public",
    "web/src/panels/superadmin",
    "web/src/components/copilot",
    "web/src/api.js",
    ...APP_JSX_ROLE_TENANT_SCOPE_PATHS,
    "web/src/utils",
    "web/src/copilot",
    "web/src/components/public",
    "prisma",
  ],
  [
    "web/src/panels/superadmin/SuperAdminPanel.jsx",
    "web/src/panels/superadmin/PublicLeadReviewPanel.jsx",
    "web/src/panels/superadmin/TrustQualityPanel.jsx",
    "backend/src/bootstrap/routeMounts.js",
    "backend/src/server.js",
    { path: "backend/src/routes/dashboardBulk.js", sha256: "C1FA734271C1B3FF73CA3393B781EAF966710A66AD57BC31290B829CFFF5754F" },
    { path: "backend/src/routes/companyOverview.js", sha256: "A06E604912CF323307E4257A4AC8FD116ADF04C1476201EB8C55F44C4C9356BB" },
    { path: "backend/src/services/dashboardBulk.js", sha256: "E3BF830BD2DF41A158FB60ED766C9A0C25A789C85F722443A37CEA61618A1A0E" },
    { path: "backend/src/bootstrap/rateLimits.js", sha256: "D493701282D68ABA6F1DAFCAD4F01F9A65A432ECCA91F6A168A1058F119D3A2C" },
    { path: "backend/src/routes/admin.js", sha256: "61A3D7CF98653E6E413E787BCBFD9D8DD9AECE77A7663DCA78E9CE446D2C5DA4" },
    { path: "backend/src/routes/agreements.js", sha256: "90CED5678F26B47AE69CE985D6D436B70DF8886B523ECA8988E51BE53ECD2B9A" },
    { path: "backend/src/routes/auth.js", sha256: "A137B997660215DBD2C5E8AA24593BD96F319CF784322C65D3628B8C9F4AACF3" },
    { path: "backend/src/routes/commercialCore.js", sha256: "14D111ADCF9C3005DACF0D7CE246EEA22109B1D2C4EDC4DA9380F2DA0461265F" },
    { path: "backend/src/routes/offers.js", sha256: "40C553F43D0709D3146D6DA48893B2FDAF9DA3B3814961ECA9C0FD8FA15FF649" },
    { path: "backend/src/routes/public.js", sha256: "5196203AC501B365D52D79D29FA355DF23421180C9337D58EEE3B19707AFFF23" },
    { path: "backend/src/routes/operationProof.js", sha256: "E5F3539A3660E70AF31DAA93203C1F4018ED4FDDF469BB74CDC3D8B73DBCA6E0" },
    { path: "backend/src/routes/trustQuality.js", sha256: "FD532B5FA09F1EBC7359B9777039172D1089EB03C7D99FEB6C15A78D85D4E4CD" },
    { path: "backend/src/services/qualityPaymentBridgeService.js", sha256: "935EDD3E857D89CB76C39DB7C253F7D8D2B69E8ABD9B4167BC9B543B0AE77A83" },
    { path: "backend/src/routes/shifts/company.js", sha256: "19A7C7C96A86438CDE36345274D8EC8E363C889CABF4C440FE8529DBAA1534A0" },
    { path: "backend/src/services/companyShiftMutationTail.js", sha256: "FE0F1F30AD2F5BC893FF631F26D19EDDDE2060246ED129087104BFDD69D88C78" },
      "web/src/utils/copilotFacts.js",
      "web/src/panels/room/ShiftsPanel.jsx",
      "web/src/panels/room/roomVehiclesPanelSections.jsx",
      "web/src/panels/room/roomShiftsPanelWorkflow.js",
      "web/src/panels/room/roomVehiclesPanelActions.js",
      ...APP_JSX_ROLE_TENANT_SCOPE_PATHS,
      "web/src/copilot/screenRegistry.js",
      "web/src/utils/uiDataCache.js",
      "web/src/utils/dashboardBulk.js",
      "web/src/utils/etaSanity.js",
      "web/src/utils/offerQualityRanking.js",
      "web/src/components/copilot/FloatingCopilotDrawer.jsx",
      "web/src/components/copilot/uiSurface.js",
    ],
    "runtime surface diff is empty"
);

console.log("=== ONBOARDING-REVIEW-01 FINAL AUDIT CHECK PASS ===");
