#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertProductExtensionsIncludes, productExtensionsChecks } from "./lib/productExtensionsRegistry.js";

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

function must(cond, label) {
  if (cond) ok(label);
  else fail(label);
}

function mustContains(text, needle, label) {
  must(normalize(text).includes(normalize(needle)), label);
}

function mustNotContains(text, needle, label) {
  must(!normalize(text).includes(normalize(needle)), label);
}

function countMatches(text, pattern) {
  const matches = String(text || "").match(pattern);
  return matches ? matches.length : 0;
}

function mustOrder(text, firstNeedle, secondNeedle, label) {
  const firstIndex = String(text || "").indexOf(firstNeedle);
  const secondIndex = String(text || "").indexOf(secondNeedle);
  must(firstIndex >= 0 && secondIndex >= 0 && firstIndex < secondIndex, label);
}

function main() {
  console.log("=== UX-COMPANY-SHIFTS-TABS-01 CHECK ===");

  const pkg = read("package.json");
  const registryScripts = productExtensionsChecks.map((step) => step.script);
  mustContains(pkg, '"check:uxcompanyshiftstabs01"', "package.json exposes check:uxcompanyshiftstabs01");
  assertProductExtensionsIncludes("check:uxcompanyshiftstabs01", "product extensions registry includes company shifts tabs check", registryScripts);

  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  mustContains(guide, "UX-COMPANY-SHIFTS-TABS-01", "script guide mentions UX-COMPANY-SHIFTS-TABS-01");
  mustContains(guide, "check:uxcompanyshiftstabs01", "script guide exposes check:uxcompanyshiftstabs01");

  const audit = read("docs/UX_PANEL_STRUCTURE_02_AUDIT.md");
  mustContains(audit, "UX-COMPANY-SHIFTS-TABS-01", "structure audit includes company shifts tabs note");
  must(!normalize(audit).includes("runtime-data"), "structure audit avoids runtime-data");
  must(!normalize(audit).includes("prisma"), "structure audit avoids prisma");
  must(!normalize(audit).includes("migration"), "structure audit avoids migration");

  const copilotAudit = read("docs/COPILOT_PANEL_CONTEXT_AUDIT_V1.md");
  mustContains(copilotAudit, "UX-COMPANY-SHIFTS-TABS-01", "copilot audit mentions UX-COMPANY-SHIFTS-TABS-01");

  const panel = read("web/src/panels/company/ShiftsPanel.jsx");
  const intro = read("web/src/panels/company/CompanyShiftsPanelIntro.jsx");
  const trackView = read("web/src/panels/company/CompanyShiftsPanelTrackView.jsx");
  const sections = read("web/src/panels/company/companyShiftsPanelSections.jsx");
  const selectors = read("web/src/panels/company/companyShiftsPanelSelectors.js");

  mustContains(panel, 'const [trackTab, _setTrackTab] = useState("other")', "Company ShiftsPanel defaults to other tab");
  mustContains(panel, 'market: true', "Company ShiftsPanel opens market accordion by default");
  mustContains(panel, 'pending: true', "Company ShiftsPanel opens pending accordion by default");
  mustContains(panel, 'contract: true', "Company ShiftsPanel opens contract accordion by default");
  mustContains(panel, 'other: true', "Company ShiftsPanel opens other accordion by default");
  mustContains(panel, "getCompanyTrackCounts", "Company ShiftsPanel uses track counts");
  mustContains(panel, "getCompanyTrackDefaultTab", "Company ShiftsPanel uses track default tab");
  mustContains(panel, "CompanyShiftsPanelIntro", "Company ShiftsPanel renders intro summary");
  mustContains(panel, "CompanyShiftsPanelTrackView", "Company ShiftsPanel renders track view");
  mustContains(panel, "setTrackTab", "Company ShiftsPanel keeps active tab setter");
  mustNotContains(panel, "Planlama Merkezi'ne git", "Company ShiftsPanel removes planning center CTA");
  mustNotContains(panel, "Takip / Oluşturma", "Company ShiftsPanel removes track/create tab label");
  mustNotContains(panel, "Oluşturma", "Company ShiftsPanel removes create flow label");
  mustContains(panel, "getCompanyMarketItemsRaw", "Company ShiftsPanel keeps market items source");
  mustContains(panel, "getCompanyPendingItemsRaw", "Company ShiftsPanel keeps pending items source");
  mustContains(panel, "getCompanyContractItemsRaw", "Company ShiftsPanel keeps contract items source");
  mustContains(panel, "getCompanyOtherItemsRaw", "Company ShiftsPanel keeps other items source");
  mustContains(panel, "getCompanyTrackDefaultTab(items, COMPANY_FINAL_STATUSES)", "Company ShiftsPanel derives default tab from counts");
  mustNotContains(panel, "mainTab === \"create\"", "Company ShiftsPanel removes create tab branch");
  mustNotContains(panel, "goPlanningCenter", "Company ShiftsPanel removes planning-center navigation");
  mustOrder(panel, "const marketItems = useMemo", "const copilotShift = useMemo", "Company ShiftsPanel initializes marketItems before first use");
  mustOrder(panel, "const pendingItems = useMemo", "const copilotShift = useMemo", "Company ShiftsPanel initializes pendingItems before first use");
  mustOrder(panel, "const contractItems = useMemo", "const copilotShift = useMemo", "Company ShiftsPanel initializes contractItems before first use");
  mustOrder(panel, "const otherItems = useMemo", "const copilotShift = useMemo", "Company ShiftsPanel initializes otherItems before first use");
  mustNotContains(panel, "const listItems = useMemo", "Company ShiftsPanel removes legacy listItems usage");

  mustContains(intro, "Shifts (COMPANY)", "Company intro keeps Shifts title");
  mustContains(intro, "Market", "Company intro shows market count");
  mustContains(intro, "Bekleyen", "Company intro shows pending count");
  mustContains(intro, "Sözleşmeden Üretilen", "Company intro shows contract count");
  mustContains(intro, "Diğer Vardiyalar", "Company intro shows other count");
  mustNotContains(intro, "Planlama Merkezi", "Company intro removes planning center wording");
  mustNotContains(intro, "Oluşturma", "Company intro removes create wording");
  mustNotContains(intro, "Takip / Oluşturma", "Company intro removes track/create switch");
  mustNotContains(intro, "PanelSegmentTabs", "Company intro no longer renders decorative segment tabs");

  mustContains(trackView, "PanelSegmentTabs", "Company track view uses segmented tabs");
  mustContains(trackView, 'tabs={[', "Company track view defines tab list");
  mustContains(trackView, 'key: "market"', "Company track view includes market tab");
  mustContains(trackView, 'key: "pending"', "Company track view includes pending tab");
  mustContains(trackView, 'key: "contract"', "Company track view includes contract tab");
  mustContains(trackView, 'key: "other"', "Company track view includes other tab");
  mustContains(trackView, 'label: "Market"', "Company track view shows Market label");
  mustContains(trackView, 'label: "Bekleyen"', "Company track view shows Bekleyen label");
  mustContains(trackView, 'label: "Sözleşmeden Üretilen"', "Company track view shows contract label");
  mustContains(trackView, 'label: "Diğer Vardiyalar"', "Company track view shows other label");
  mustContains(trackView, 'trackTab === "market"', "Company track view renders market branch conditionally");
  mustContains(trackView, 'trackTab === "pending"', "Company track view renders pending branch conditionally");
  mustContains(trackView, 'trackTab === "contract"', "Company track view renders contract branch conditionally");
  mustContains(trackView, 'trackTab === "other"', "Company track view renders other branch conditionally");
  must(countMatches(trackView, /trackTab === "/g) === 4, "Company track view keeps exactly four tab branches");
  mustNotContains(trackView, "Liste", "Company track view removes list legacy label");
  mustNotContains(trackView, "Planlama Merkezi", "Company track view removes planning center wording");
  mustNotContains(trackView, "Oluşturma", "Company track view removes create wording");

  mustContains(sections, "CompanyMarketSection", "Company sections keep market section");
  mustContains(sections, "CompanyPendingSection", "Company sections keep pending section");
  mustContains(sections, "CompanyContractSection", "Company sections keep contract section");
  mustContains(sections, "CompanyOtherSection", "Company sections keep other section");
  mustContains(sections, 'role="tabpanel"', "Company sections keep tabpanel semantics");
  mustNotContains(sections, "CompanyFinalListFilters", "Company sections remove final list filters alias import");

  mustContains(selectors, "getCompanyTrackCounts", "Company selectors keep track counts helper");
  mustContains(selectors, "getCompanyTrackDefaultTab", "Company selectors keep default tab helper");
  mustContains(selectors, "getCompanyContractItemsRaw", "Company selectors keep contract raw helper");
  mustContains(selectors, "getCompanyOtherItemsRaw", "Company selectors keep other raw helper");
  mustContains(selectors, "buckets.contract.length", "Company selectors count contract tab");
  mustContains(selectors, "buckets.other.length", "Company selectors count other tab");
  mustContains(selectors, 'return "other";', "Company selectors default to other tab");
  mustNotContains(selectors, "onlyAgreement", "Company selectors remove agreement-only filter");

  must(!normalize(panel).includes("runtime-data"), "Company ShiftsPanel avoids runtime-data");
  must(!normalize(panel).includes("prisma"), "Company ShiftsPanel avoids prisma");
  must(!normalize(panel).includes("migration"), "Company ShiftsPanel avoids migration");

  console.log("=== UX-COMPANY-SHIFTS-TABS-01 CHECK PASS ===");
}

main();
