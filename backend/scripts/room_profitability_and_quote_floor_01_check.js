#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  buildCompanyBudgetAndServiceCostPreview,
  buildFinancialOperationsCompanyKindDeniedPreview,
  buildFinancialOperationsScopePreview,
  buildRoomProfitabilityAndQuoteFloorPreview,
  isFinancialOperationsCompanyKindDenied,
} from "../src/finance/roomProfitabilityAndQuoteFloor.js";
import { runRoomProfitabilityAndQuoteFloorExpansionChecks } from "./room_profitability_and_quote_floor_01_expansion.js";
import {
  assertProductExtensionsIncludes,
  productExtensionsChecks,
} from "./lib/productExtensionsRegistry.js";
import { CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF } from "./lib/currentHeadScopePolicy.js";
import {
  mustNoDiffExceptWithIdentity,
} from "./lib/guardGitScope.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const roomOwnedCommercialRoutePaths = new Set([
  "backend/src/routes/commercialCore.js",
  "backend/src/routes/commercialCoreRoutes.js",
  "backend/src/routes/commercialCoreRoomRoutes.js",
  "backend/src/routes/commercialCoreRouteData.js",
]);
const roomOwnedCommercialRouteEntries = Object.freeze(
  CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF.filter(({ path }) => roomOwnedCommercialRoutePaths.has(path))
);
const financeOwnedRoutePaths = new Set([
  "backend/src/routes/companyOverview.js",
  "backend/src/routes/operationProof.js",
]);
const financeOwnedRouteEntries = Object.freeze(
  CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF.filter(({ path }) => financeOwnedRoutePaths.has(path))
);
const financeOwnedServiceEntries = Object.freeze([
  { path: "backend/src/services/qualityPaymentBridgeService.js", sha256: "935EDD3E857D89CB76C39DB7C253F7D8D2B69E8ABD9B4167BC9B543B0AE77A83" },
  { path: "backend/src/services/dashboardBulk.js", sha256: "E3BF830BD2DF41A158FB60ED766C9A0C25A789C85F722443A37CEA61618A1A0E" },
]);

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), "utf8");
}

function exists(relPath) {
  return fs.existsSync(path.join(repoRoot, relPath));
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

function textHas(text, needle) {
  return normalize(text).includes(normalize(needle));
}

function textLacks(text, needle) {
  return !textHas(text, needle);
}

function countLines(text) {
  const source = String(text || "");
  if (!source) return 0;
  return source.split(/\r?\n/).length;
}

function fileLines(relPath) {
  return countLines(read(relPath));
}

let guardCases = 0;
let passCount = 0;
let failCount = 0;

function check(condition, label, detail = "") {
  guardCases += 1;
  if (!condition) {
    failCount += 1;
    const suffix = detail ? ` :: ${detail}` : "";
    throw new Error(`FAIL ${label}${suffix}`);
  }
  passCount += 1;
  console.log(`OK ${label}`);
}

function gitOutput(args) {
  const out = execFileSync("git", args, {
    cwd: repoRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return String(out || "");
}

function readHead(relPath) {
  return gitOutput(["show", `HEAD:${relPath}`]);
}

function assertCommandOutputEmpty(args, label) {
  const output = gitOutput(args).trim();
  check(output.length === 0, label, output);
}

function assertEmptyDiff(paths, label, cached = false) {
  const args = ["diff"];
  if (cached) args.push("--cached");
  args.push("--name-only", "--", ...paths);
  const names = gitOutput(args)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  check(names.length === 0, label, names.join(", "));
}

function assertDiffExactly(paths, expectedNames, label, cached = false) {
  const args = ["diff"];
  if (cached) args.push("--cached");
  args.push("--name-only", "--", ...paths);
  const names = gitOutput(args)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const expected = new Set(expectedNames);
  const actual = new Set(names);
  const unexpected = names.filter((name) => !expected.has(name));
  const missing = expectedNames.filter((name) => !actual.has(name));
  check(unexpected.length === 0 && missing.length === 0, label, [...unexpected, ...missing.map((name) => `missing:${name}`)].join(", "));
}

const docPath = "docs/ROOM_PROFITABILITY_AND_QUOTE_FLOOR_01.md";
const helperPath = "backend/src/finance/roomProfitabilityAndQuoteFloor.js";
const panelPath = "web/src/panels/shared/FinancialOperationsPanel.jsx";
const companyPanelPath = "web/src/panels/shared/FinancialOperationsCompanyPreview.jsx";
const routePath = "backend/src/routes/commercialCore.js";
const roomRoutePath = "backend/src/routes/commercialCoreRoomRoutes.js";
const companyRoutePath = "backend/src/routes/companyOverview.js";
const apiPath = "web/src/api.js";
const appPath = "web/src/App.jsx";
const navPath = "web/src/layout/NavDock.jsx";
const registryPath = "web/src/copilot/screenRegistry.js";
const expansionPath = "backend/scripts/room_profitability_and_quote_floor_01_expansion.js";
const packagePath = "package.json";
const guidePath = "docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md";
const primerPath = "docs/PRIMER_SSOT.md";
const roadmapPath = "docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md";
const repoAuditPath = "docs/REPO_CAPABILITY_AUDIT_AND_CANONICAL_ROADMAP_01.md";
const harnessCheckPath = "backend/scripts/script_harness_consolidation_01_check.js";
const harnessDocPath = "docs/SCRIPT_HARNESS_CONSOLIDATION_01.md";

const docText = read(docPath);
const helperText = read(helperPath);
const panelText = read(panelPath);
const companyPanelText = read(companyPanelPath);
const routeText = readHead(routePath);
const roomRouteText = readHead(roomRoutePath);
const companyRouteText = readHead(companyRoutePath);
const apiText = read(apiPath);
const appText = read(appPath);
const navText = read(navPath);
const registryText = read(registryPath);
const packageText = read(packagePath);
const guideText = read(guidePath);
const primerText = read(primerPath);
const roadmapText = read(roadmapPath);
const repoAuditText = read(repoAuditPath);
const harnessCheckText = read(harnessCheckPath);
const harnessDocText = read(harnessDocPath);

function buildRoomInput() {
  return {
    role: "ROOM",
    companyKind: "COMPANY",
    room: { id: 10, name: "Demo Room", kind: "ROOM" },
    company: { id: 20, name: "Demo Company", kind: "COMPANY" },
    shift: {
      id: 300,
      roomId: 10,
      companyId: 20,
      status: "APPROVED",
      routeSnapshotDistanceM: 12000,
      routeSnapshotDurationSec: 2400,
      requiredPaxOverride: 24,
      roomOfferAmount: 180000,
      companyOfferAmount: 150000,
      _count: { people: 22 },
      vehicle: { capacity: 30 },
    },
    agreement: {
      id: 400,
      roomId: 10,
      companyId: 20,
      roomOfferAmount: 175000,
      companyOfferAmount: 155000,
      status: "ACTIVE",
    },
    roomSummary: {
      cards: {
        approvedOrActiveShifts: 2,
        activeAgreements: 1,
        openOffers: 1,
        counteredOffers: 1,
        requestedAgreements: 1,
      },
    },
    costInputs: {
      manualBaselineOperationalCostMinor: 100000,
      targetContributionBps: 1200,
      riskReserveBps: 300,
    },
    quoteFloorInputs: {
      manualBaselineOperationalCostMinor: 100000,
      targetContributionBps: 1200,
      riskReserveBps: 300,
    },
  };
}

function buildCompanyInput() {
  return {
    role: "COMPANY",
    companyKind: "COMPANY",
    company: { id: 21, name: "Company Demo", kind: "COMPANY" },
    shift: {
      id: 301,
      roomId: 11,
      companyId: 21,
      status: "ACTIVE",
      routeSnapshotDistanceM: 9000,
      routeSnapshotDurationSec: 1800,
      requiredPaxOverride: 18,
      roomOfferAmount: 200000,
      companyOfferAmount: 220000,
      _count: { people: 17 },
      vehicle: { capacity: 20 },
    },
    agreement: {
      id: 401,
      roomId: 11,
      companyId: 21,
      roomOfferAmount: 205000,
      companyOfferAmount: 225000,
      status: "ACTIVE",
    },
    companySummary: {
      cards: {
        todayAgreements: 3,
        activeShiftCount: 2,
        activeAgreements: 1,
        openOffersCount: 1,
        counterShiftCount: 1,
        requestedAgreements: 1,
      },
    },
    costInputs: {
      manualBaselineOperationalCostMinor: 90000,
      targetContributionBps: 1000,
      riskReserveBps: 200,
    },
    quoteFloorInputs: {
      manualBaselineOperationalCostMinor: 90000,
      targetContributionBps: 1000,
      riskReserveBps: 200,
    },
  };
}

function main() {
  console.log("=== ROOM-PROFITABILITY-AND-QUOTE-FLOOR-01 CHECK ===");

  check(exists(docPath), "doc exists");
  check(exists(helperPath), "helper exists");
  check(exists(panelPath), "panel exists");
  check(exists(companyPanelPath), "company panel exists");
  check(exists(routePath), "commercial route exists");
  check(exists(companyRoutePath), "company route exists");
  check(exists(apiPath), "api bridge exists");
  check(exists(appPath), "app route exists");
  check(exists(navPath), "nav exists");
  check(exists(registryPath), "copilot registry exists");
  check(exists(expansionPath), "expansion exists");

  check(textHas(docText, "# ROOM-PROFITABILITY-AND-QUOTE-FLOOR-01"), "doc title present");
  check(textHas(docText, "room profitability and quote floor preview milestone"), "doc purpose present");
  check(textHas(docText, "check:roomprofitabilityandquotefloor01"), "doc canonical check present");
  check(textHas(docText, "backend/src/finance/roomProfitabilityAndQuoteFloor.js"), "doc helper path present");
  check(textHas(docText, "web/src/panels/shared/FinancialOperationsPanel.jsx"), "doc panel path present");
  check(textHas(docText, "backend/src/routes/commercialCore.js"), "doc room route present");
  check(textHas(docText, "backend/src/routes/companyOverview.js"), "doc company route present");
  check(textHas(docText, "web/src/api.js"), "doc api bridge present");
  check(textHas(docText, "web/src/App.jsx"), "doc app route present");
  check(textHas(docText, "web/src/layout/NavDock.jsx"), "doc nav present");
  check(textHas(docText, "web/src/copilot/screenRegistry.js"), "doc copilot registry present");
  check(textHas(docText, "No Write-Action Boundary"), "doc boundary heading present");
  check(textHas(docText, "Next Milestone"), "doc next milestone heading present");
  check(textHas(docText, "COMPANY-BUDGET-AND-SERVICE-COST-01"), "doc next milestone present");

  for (const needle of [
    "Dispatch apply yok.",
    "Route apply yok.",
    "Driver / vehicle assign yok.",
    "Agreement execute yok.",
    "Payment / hakediş execute yok.",
    "Invoice create / update / delete yok.",
    "Accounting posting yok.",
    "Provider credential read/write/use yok.",
    "Message / email / SMS / push yok.",
    "Backend write route yok.",
    "DB migration yok.",
  ]) {
    check(textLacks(docText, needle), `doc excludes phrase: ${needle}`);
  }

  check(textHas(helperText, "export function buildRoomProfitabilityAndQuoteFloorPreview"), "helper exports room preview");
  check(textHas(helperText, "export function buildCompanyBudgetAndServiceCostPreview"), "helper exports company preview");
  check(textHas(helperText, "export function buildFinancialOperationsScopePreview"), "helper exports scope preview");
  check(textHas(helperText, "export function buildFinancialOperationsCompanyKindDeniedPreview"), "helper exports company denial preview");
  check(textHas(helperText, "export function isFinancialOperationsCompanyKindDenied"), "helper exports denial guard");
  check(textHas(helperText, "buildQuoteFloorPreview"), "helper contains quote floor builder");
  check(textHas(helperText, "buildBasePreview"), "helper contains base preview builder");
  check(textHas(helperText, "buildRoomProfitabilitySection"), "helper contains room section builder");
  check(textHas(helperText, "buildCompanyBudgetSection"), "helper contains company section builder");
  check(textHas(helperText, "buildCostModelInput"), "helper contains cost model input builder");
  check(textHas(helperText, "manualBaselineOperationalCostMinor"), "helper contains manual baseline field");
  check(textHas(helperText, "targetContributionBps"), "helper contains target contribution field");
  check(textHas(helperText, "riskReserveBps"), "helper contains risk reserve field");
  check(textHas(helperText, "readOnly: true"), "helper keeps read-only boundary");
  check(textHas(helperText, "writeAction: false"), "helper keeps write-action boundary");
  check(textHas(helperText, "Teklif tabanı önizlemesi"), "helper contains quote floor wording");
  check(textHas(helperText, "Teklif ve kârlılık önizlemesi"), "helper contains room profitability wording");
  check(textHas(helperText, "Bütçe ve servis maliyeti önizlemesi"), "helper contains company budget wording");
  for (const needle of ["fetch(", "axios", "http://", "https://", "prisma", "MongoClient", "mongoose"]) {
    check(textLacks(helperText, needle), `helper lacks ${needle}`);
  }

  check(textHas(panelText, "FinancialOperationsPanel"), "panel file exists by text");
  check(textHas(panelText, 'preferredScopeTitle("ROOM")'), "panel uses room scope title helper");
  check(textHas(panelText, 'preferredScopeSubtitle("ROOM")'), "panel uses room scope subtitle helper");
  check(textHas(panelText, "Teklif tabanı yaşam döngüsü"), "panel shows quote floor lifecycle");
  check(textHas(panelText, "Karar özeti"), "panel shows decision summary");
  check(textHas(panelText, "Ayrıntılı maliyet verileri"), "panel shows cost details gate");
  check(textHas(panelText, "FinancialOperationsCompanyPreview"), "panel imports company preview component");
  check(textHas(panelText, "Yenile"), "panel refresh action present");
  check(textHas(panelText, "Maliyet girdileri"), "panel advanced inputs present");
  check(textHas(panelText, "Manuel maliyet tabanı (₺)"), "panel baseline input present");
  check(textHas(panelText, "Hedef katkı oranı (%)"), "panel target contribution input present");
  check(textHas(panelText, "Risk payı (%)"), "panel risk reserve input present");
  check(textHas(panelText, "Servis mesafesi (km)"), "panel service distance input present");
  check(textHas(panelText, "Rota süresi (dk)"), "panel route duration input present");
  check(textHas(panelText, "Araç kapasitesi"), "panel vehicle capacity input present");
  check(textHas(panelText, "Yakıt tüketimi (L/100km)"), "panel fuel consumption input present");
  check(textHas(panelText, "Sürücü temel maliyeti"), "panel driver cost input present");
  check(textHas(panelText, "Aylık araç kira maliyeti"), "panel lease input present");

  check(textHas(companyPanelText, "Bütçe ve Servis Maliyeti"), "company panel title present");
  check(textHas(companyPanelText, "Tedarikçi Karşılaştırması"), "company panel comparison present");
  check(textHas(companyPanelText, "CompanyComparisonBlock"), "company panel comparison component present");
  check(textHas(companyPanelText, "preview?.supplierComparisonSummaryText"), "company panel supplier summary present");
  check(textHas(companyPanelText, "Bütçe yaşam döngüsü"), "company panel lifecycle present");
  check(textHas(companyPanelText, "Bütçe ayrıntıları"), "company panel budget inputs present");
  check(textHas(companyPanelText, "Onaylı bütçe"), "company panel approved budget metric present");
  check(textHas(companyPanelText, "Gerçekleşen servis maliyeti"), "company panel service cost metric present");
  check(textHas(companyPanelText, "Kalan bütçe"), "company panel remaining budget metric present");
  check(textHas(companyPanelText, "Bütçe sapması"), "company panel variance metric present");
  check(textHas(companyPanelText, "Bütçe kullanım oranı"), "company panel usage metric present");
  check(textHas(companyPanelText, "Servis bütçesi"), "company panel service budget card present");
  check(textHas(companyPanelText, "Ayrıntılı sonuçlar"), "company panel detail gate present");
  check(textHas(companyPanelText, "Hakediş / fatura kontrolü"), "company panel invoice panel present");
  check(textHas(companyPanelText, "Tasarruf senaryoları"), "company panel savings panel present");
  check(textHas(companyPanelText, "Dışa aktarım"), "company panel export panel present");
  check(textHas(companyPanelText, "Genel not"), "company panel general note present");
  check(textHas(companyPanelText, "Taslak kaydet"), "company panel save action present");
  check(textHas(companyPanelText, "Gönder"), "company panel submit action present");
  check(textHas(companyPanelText, "Onayla"), "company panel approve action present");
  check(textHas(companyPanelText, "Aktive et"), "company panel activate action present");
  check(textHas(companyPanelText, "Arşivle"), "company panel archive action present");
  check(textHas(companyPanelText, "Personel Başı Maliyet"), "company panel per-person metric present");
  check(textHas(companyPanelText, "Vardiya Başı Maliyet"), "company panel per-shift metric present");
  check(textHas(companyPanelText, "Sefer Başı Maliyet"), "company panel per-trip metric present");
  check(textHas(companyPanelText, "Bütçe tutarı"), "company panel budget amount label present");

  check(textHas(roomRouteText, "/room/financial-operations/preview"), "room route path present");
  check(textHas(companyRouteText, "/financial-operations/preview"), "company route path present");
  check(textHas(apiText, "getRoomFinancialOperationsPreview"), "api room helper present");
  check(textHas(apiText, "getCompanyFinancialOperationsPreview"), "api company helper present");
  check(textHas(appText, "/room/financial-operations"), "app room route present");
  check(textHas(appText, "/company/financial-operations"), "app company route present");
  check(textHas(appText, "/school/financial-operations"), "app school route present");
  check(textHas(appText, "/organization/financial-operations"), "app organization route present");
  check(textHas(navText, "Finansal Operasyonlar"), "nav room label present");
  check(textHas(navText, "Bütçe ve Servis Maliyeti"), "nav company label present");
  check(textHas(navText, "/room/financial-operations"), "nav room path present");
  check(textHas(navText, "/financial-operations"), "nav company path present");
  check(textHas(registryText, "/room/financial-operations"), "registry room path present");
  check(textHas(registryText, "/company/financial-operations"), "registry company path present");
  check(textHas(registryText, "/school/financial-operations"), "registry school path present");
  check(textHas(registryText, "/organization/financial-operations"), "registry organization path present");

  check(textHas(packageText, '"check:roomprofitabilityandquotefloor01": "node backend/scripts/room_profitability_and_quote_floor_01_check.js"'), "package alias present");
  const registryScripts = productExtensionsChecks.map((step) => step.script);
  assertProductExtensionsIncludes("check:roomprofitabilityandquotefloor01", "product extensions registry includes room profitability", registryScripts);
  check(textHas(guideText, "check:roomprofitabilityandquotefloor01"), "script guide exposes room profitability check");
  check(textHas(guideText, "docs/ROOM_PROFITABILITY_AND_QUOTE_FLOOR_01.md"), "script guide links room profitability doc");
  check(textHas(guideText, "backend/src/finance/roomProfitabilityAndQuoteFloor.js"), "script guide links room profitability helper");
  check(textHas(primerText, "check:roomprofitabilityandquotefloor01"), "primer exposes room profitability check");
  check(textHas(primerText, "docs/ROOM_PROFITABILITY_AND_QUOTE_FLOOR_01.md"), "primer links room profitability doc");
  check(textHas(primerText, "backend/src/finance/roomProfitabilityAndQuoteFloor.js"), "primer links room profitability helper");
  check(textHas(roadmapText, "check:roomprofitabilityandquotefloor01"), "roadmap exposes room profitability check");
  check(textHas(roadmapText, "docs/ROOM_PROFITABILITY_AND_QUOTE_FLOOR_01.md"), "roadmap links room profitability doc");
  check(textHas(roadmapText, "backend/src/finance/roomProfitabilityAndQuoteFloor.js"), "roadmap links room profitability helper");
  check(textHas(repoAuditText, "check:roomprofitabilityandquotefloor01"), "repo audit exposes room profitability check");
  check(textHas(repoAuditText, "docs/ROOM_PROFITABILITY_AND_QUOTE_FLOOR_01.md"), "repo audit links room profitability doc");
  check(textHas(repoAuditText, "backend/src/finance/roomProfitabilityAndQuoteFloor.js"), "repo audit links room profitability helper");
  check(textHas(harnessCheckText, "check:roomprofitabilityandquotefloor01"), "harness check knows room profitability alias");
  check(textHas(harnessCheckText, "ROOM-PROFITABILITY-AND-QUOTE-FLOOR-01"), "harness check knows room profitability milestone");
  check(textHas(harnessDocText, "root:check:roomprofitabilityandquotefloor01"), "harness doc lists room profitability root check");
  check(textHas(harnessDocText, "check:roomprofitabilityandquotefloor01"), "harness doc lists room profitability check");
  check(textHas(harnessDocText, "docs/ROOM_PROFITABILITY_AND_QUOTE_FLOOR_01.md"), "harness doc links room profitability doc");

  check(textHas(companyRouteText, "Route ownership anchor for company overview."), "company overview route ownership anchor present");
  mustNoDiffExceptWithIdentity(
    ["backend/src/routes", "backend/src/services", "prisma"],
    [...financeOwnedRouteEntries, ...roomOwnedCommercialRouteEntries, ...CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF, ...financeOwnedServiceEntries],
    "backend route/service/schema and Prisma diff limited to approved concurrent runtime paths",
  );

  const roomPreview = buildRoomProfitabilityAndQuoteFloorPreview(buildRoomInput());
  check(roomPreview.allowed === true, "room preview allowed");
  check(roomPreview.readOnly === true, "room preview read-only");
  check(roomPreview.previewOnly === true, "room preview preview-only");
  check(roomPreview.writeAction === false, "room preview no write action");
  check(roomPreview.scope === "ROOM", "room preview scope");
  check(roomPreview.surfaceId === "room_profitability", "room preview surface id");
  check(roomPreview.roomProfitability?.profitMinor === 80000, "room profitability profit value");
  check(roomPreview.quoteFloor?.quoteFloorMinor === 115000, "room quote floor value");
  check(roomPreview.quoteFloor?.computed === true, "room quote floor computed");
  check(roomPreview.companyBudget === null, "room preview company budget hidden");
  check(roomPreview.summaryText.includes("salt okunur"), "room preview summary is salt okunur");
  check(roomPreview.nextAction.includes("Teklif tabanı"), "room preview next action mentions quote floor");

  const companyPreview = buildCompanyBudgetAndServiceCostPreview(buildCompanyInput());
  check(companyPreview.allowed === true, "company preview allowed");
  check(companyPreview.readOnly === true, "company preview read-only");
  check(companyPreview.previewOnly === true, "company preview preview-only");
  check(companyPreview.writeAction === false, "company preview no write action");
  check(companyPreview.scope === "COMPANY", "company preview scope");
  check(companyPreview.surfaceId === "company_budget", "company preview surface id");
  check(companyPreview.companyBudget?.budgetGapMinor === 119200, "company budget gap value");
  check(companyPreview.quoteFloor?.quoteFloorMinor === 100800, "company quote floor value");
  check(companyPreview.quoteFloor?.computed === true, "company quote floor computed");
  check(companyPreview.roomProfitability === null, "company preview room profitability hidden");
  check(companyPreview.summaryText.includes("salt okunur"), "company preview summary is salt okunur");
  check(companyPreview.nextAction.includes("Bütçe"), "company preview next action mentions budget");

  const deniedPreview = buildFinancialOperationsCompanyKindDeniedPreview({
    role: "COMPANY",
    companyKind: "SCHOOL",
    scope: "COMPANY",
  });
  check(deniedPreview.allowed === false, "company kind denied preview denies access");
  check(deniedPreview.deniedByCompanyKind === true, "company kind denied preview marks company kind denial");
  check(deniedPreview.readOnly === true, "company kind denied preview read-only");
  check(deniedPreview.previewOnly === true, "company kind denied preview preview-only");
  check(deniedPreview.writeAction === false, "company kind denied preview no write action");
  check(isFinancialOperationsCompanyKindDenied("SCHOOL") === true, "school company kind denied guard");
  check(isFinancialOperationsCompanyKindDenied("ORGANIZATION") === true, "organization company kind denied guard");
  check(isFinancialOperationsCompanyKindDenied("COMPANY") === false, "company company kind allowed guard");

  const scopeRoomPreview = buildFinancialOperationsScopePreview({
    scope: "ROOM",
    ...buildRoomInput(),
  });
  const scopeCompanyPreview = buildFinancialOperationsScopePreview({
    scope: "COMPANY",
    ...buildCompanyInput(),
  });
  check(scopeRoomPreview.scope === "ROOM", "scope preview routes to room");
  check(scopeCompanyPreview.scope === "COMPANY", "scope preview routes to company");
  check(scopeRoomPreview.surfaceId === "room_profitability", "scope preview room surface id");
  check(scopeCompanyPreview.surfaceId === "company_budget", "scope preview company surface id");

  check(fileLines(docPath) < 1000, "doc stays under 1000 lines", String(fileLines(docPath)));
  check(fileLines(helperPath) < 1000, "helper stays under 1000 lines", String(fileLines(helperPath)));
  check(fileLines(panelPath) < 1000, "panel stays under 1000 lines", String(fileLines(panelPath)));
  check(fileLines(companyPanelPath) < 1000, "company panel stays under 1000 lines", String(fileLines(companyPanelPath)));
  check(fileLines(routePath) < 1000, "commercial route stays under 1000 lines", String(fileLines(routePath)));
  check(fileLines(companyRoutePath) < 1000, "company route stays under 1000 lines", String(fileLines(companyRoutePath)));
  check(fileLines(apiPath) < 1000, "api bridge stays under 1000 lines", String(fileLines(apiPath)));
  check(fileLines(appPath) < 1000, "app stays under 1000 lines", String(fileLines(appPath)));
  check(fileLines(navPath) < 1000, "nav stays under 1000 lines", String(fileLines(navPath)));
  check(fileLines(registryPath) < 1000, "registry stays under 1000 lines", String(fileLines(registryPath)));
  check(fileLines(expansionPath) < 1000, "expansion stays under 1000 lines", String(fileLines(expansionPath)));

  mustNoDiffExceptWithIdentity(["backend/src/services"], [...financeOwnedServiceEntries, ...CURRENT_HEAD_APPROVED_CONCURRENT_BACKEND_DIFF], "backend/src/services diff limited to finance-owned runtime paths");
  assertEmptyDiff(["prisma"], "prisma diff empty");
  assertEmptyDiff(["prisma"], "prisma diff empty");
  runRoomProfitabilityAndQuoteFloorExpansionChecks(check);
  assertCommandOutputEmpty(["diff", "--cached", "--name-only"], "stage empty");
  check(!exists("debug.log"), "debug.log absent");

  console.log(`lineCountSummary=helper:${fileLines(helperPath)} panel:${fileLines(panelPath)} doc:${fileLines(docPath)} expansion:${fileLines(expansionPath)} check:${fileLines("backend/scripts/room_profitability_and_quote_floor_01_check.js")}`);
  console.log(`boundarySummary=${roomPreview.readOnly ? "read-only" : "mutable"} | quoteFloor=${roomPreview.quoteFloor?.computed ? "computed" : "pending"}`);
  console.log(`PASS ROOM-PROFITABILITY-AND-QUOTE-FLOOR-01 guardCases=${guardCases} passCount=${passCount} failCount=${failCount}`);
}

try {
  main();
} catch (error) {
  console.error(error?.stack || String(error));
  console.log(`FAIL ROOM-PROFITABILITY-AND-QUOTE-FLOOR-01 guardCases=${guardCases} passCount=${passCount} failCount=${failCount}`);
  process.exit(1);
}
