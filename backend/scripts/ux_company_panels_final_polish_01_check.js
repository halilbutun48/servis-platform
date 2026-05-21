#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
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

function mustOrder(text, firstNeedle, secondNeedle, label) {
  const firstIndex = String(text || "").indexOf(firstNeedle);
  const secondIndex = String(text || "").indexOf(secondNeedle);
  must(firstIndex >= 0 && secondIndex >= 0 && firstIndex < secondIndex, label);
}

function main() {
  console.log("=== UX-COMPANY-PANELS-FINAL-POLISH-01 CHECK ===");

  const pkg = read("package.json");
  mustContains(pkg, '"check:uxcompanypanelsfinalpolish01"', "package.json exposes company final polish check");

  const runner = read("backend/scripts/run_product_extensions_check_chain.js");
  mustContains(runner, "check:uxcompanypanelsfinalpolish01", "product extensions runner includes company final polish check");

  const verify = read("backend/scripts/verify_chain_01_product_extensions_check.js");
  mustContains(verify, "check:uxcompanypanelsfinalpolish01", "verify chain includes company final polish check");

  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  mustContains(guide, "UX-COMPANY-PANELS-FINAL-POLISH-01", "milestone guide mentions company final polish");
  mustContains(guide, "check:uxcompanypanelsfinalpolish01", "milestone guide exposes company final polish check");

  const structureAudit = read("docs/UX_PANEL_STRUCTURE_02_AUDIT.md");
  mustContains(structureAudit, "UX-COMPANY-PANELS-FINAL-POLISH-01", "structure audit includes company final polish note");
  mustNotContains(structureAudit, "runtime-data", "structure audit avoids runtime-data");
  mustNotContains(structureAudit, "prisma", "structure audit avoids prisma");
  mustNotContains(structureAudit, "migration", "structure audit avoids migration");

  const copilotAudit = read("docs/COPILOT_PANEL_CONTEXT_AUDIT_V1.md");
  mustContains(copilotAudit, "UX-COMPANY-PANELS-FINAL-POLISH-01", "copilot audit mentions company final polish");

  const shiftsPanel = read("web/src/panels/company/ShiftsPanel.jsx");
  const selectors = read("web/src/panels/company/companyShiftsPanelSelectors.js");
  const agreements = read("web/src/panels/company/AgreementsPanel.jsx");
  const commercial = read("web/src/panels/company/CommercialFlowPanel.jsx");

  mustContains(shiftsPanel, 'const [trackTab, _setTrackTab] = useState("other")', "Company shifts defaults to Diğer Vardiyalar");
  mustContains(shiftsPanel, 'market: true', "Company shifts accordion opens market by default");
  mustContains(shiftsPanel, 'pending: true', "Company shifts accordion opens pending by default");
  mustContains(shiftsPanel, 'contract: true', "Company shifts accordion opens contract by default");
  mustContains(shiftsPanel, 'other: true', "Company shifts accordion opens other by default");
  mustContains(selectors, 'return "other";', "Company shifts selectors default to other");
  mustContains(shiftsPanel, "CompanyShiftsPanelTrackView", "Company shifts keeps track view");
  mustContains(shiftsPanel, "CompanyShiftsPanelIntro", "Company shifts keeps intro summary");
  mustContains(shiftsPanel, "trackTab", "Company shifts keeps track tab state");
  mustNotContains(shiftsPanel, "Oluşturma", "Company shifts removes create wording");
  mustNotContains(shiftsPanel, "Planlama Merkezi", "Company shifts removes planning-center wording");

  mustContains(agreements, 'useState("list")', "Company agreements defaults to list");
  mustContains(agreements, 'label: "Liste"', "Company agreements keeps list tab");
  mustContains(agreements, 'viewMode === "bridge"', "Company agreements keeps bridge tab");
  mustContains(agreements, 'viewMode === "wizard"', "Company agreements keeps wizard tab");
  mustContains(agreements, 'viewMode === "list"', "Company agreements keeps list render");
  mustNotContains(agreements, 'label: "Özet"', "Company agreements removes empty summary tab");
  mustNotContains(agreements, 'viewMode === "summary"', "Company agreements removes summary render");
  mustContains(agreements, "CompanyAgreementsOverviewSection", "Company agreements keeps header overview");
  mustContains(agreements, "CompanyAgreementsSelectedSummarySection", "Company agreements keeps list selection banner");
  mustContains(agreements, "CompanyAgreementsRouteRefreshPendingSection", "Company agreements keeps route refresh section");

  mustNotContains(commercial, "PanelSegmentTabs", "Company commercial flow removes segmented tabs");
  mustNotContains(commercial, 'viewMode === "summary"', "Company commercial flow removes summary render");
  mustNotContains(commercial, 'viewMode === "list"', "Company commercial flow removes list render");
  mustNotContains(commercial, 'viewMode === "selected"', "Company commercial flow removes selected render");
  mustNotContains(commercial, "/company/planning", "Company commercial flow removes planning-center CTA");
  mustContains(commercial, "Ticari Akış Listesi", "Company commercial flow keeps list title");
  mustContains(commercial, "Seçili kayıt", "Company commercial flow keeps selected record panel");
  mustContains(commercial, "companyCommercialFlowLayout", "Company commercial flow uses dedicated layout wrapper");
  mustContains(commercial, "companyCommercialFlowSplit", "Company commercial flow uses split layout");
  mustContains(commercial, "filteredFlowItems", "Company commercial flow keeps filtered list");
  mustContains(commercial, "selectedItem", "Company commercial flow keeps selected item panel");
  mustContains(commercial, "openShifts", "Company commercial flow keeps navigation action");
  mustContains(commercial, "agreementId", "Company commercial flow carries agreement linkage");
  mustContains(commercial, "getCompanyShifts", "Company commercial flow derives contract linkage from company shifts");
  mustContains(commercial, "agreementByShiftId", "Company commercial flow keeps agreement lookup map");
  mustContains(commercial, "resolveCommercialFlowTarget", "Company commercial flow resolves target section");
  mustContains(commercial, "Sözleşmeden Üretilen'e git", "Company commercial flow routes contract-backed items to contract section");
  mustContains(commercial, "Diğer Vardiyalar'a git", "Company commercial flow routes non-contract final items to other section");
  mustNotContains(commercial, "Listeyi aç", "Company commercial flow removes misleading list wording");

  mustNotContains(commercial, "Görünen ana özet", "Company commercial flow avoids duplicate KPI summary");
  mustNotContains(commercial, "Seçili kayıt bağlamı", "Company commercial flow avoids room-style duplicate selected context");
  mustNotContains(commercial, "Hızlı erişim", "Company commercial flow avoids room-style quick access duplication");
  must(!normalize(shiftsPanel).includes("runtime-data"), "Company shifts panel avoids runtime-data");
  must(!normalize(agreements).includes("runtime-data"), "Company agreements panel avoids runtime-data");
  must(!normalize(commercial).includes("runtime-data"), "Company commercial flow avoids runtime-data");
  must(!normalize(shiftsPanel).includes("prisma"), "Company shifts panel avoids prisma");
  must(!normalize(agreements).includes("prisma"), "Company agreements panel avoids prisma");
  must(!normalize(commercial).includes("prisma"), "Company commercial flow avoids prisma");
  must(!normalize(shiftsPanel).includes("migration"), "Company shifts panel avoids migration");
  must(!normalize(agreements).includes("migration"), "Company agreements panel avoids migration");
  must(!normalize(commercial).includes("migration"), "Company commercial flow avoids migration");

  mustOrder(agreements, 'label: "Liste"', 'label: "Bağlantı"', "Company agreements keeps list before bridge");
  mustOrder(agreements, 'label: "Bağlantı"', 'label: "Yazım"', "Company agreements keeps bridge before wizard");

  console.log("=== UX-COMPANY-PANELS-FINAL-POLISH-01 CHECK PASS ===");
}

main();
