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

function main() {
  console.log("=== UX-SCHOOL-ORGANIZATION-PANELS-01 CHECK ===");

  const pkg = read("package.json");
  const registryScripts = productExtensionsChecks.map((step) => step.script);
  mustContains(pkg, '"check:uxschoolorganizationpanels01"', "package.json exposes check:uxschoolorganizationpanels01");
  assertProductExtensionsIncludes("check:uxschoolorganizationpanels01", "product extensions registry includes school/organization check", registryScripts);

  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  mustContains(guide, "UX-SCHOOL-ORGANIZATION-PANELS-01", "milestone guide mentions UX-SCHOOL-ORGANIZATION-PANELS-01");
  mustContains(guide, "check:uxschoolorganizationpanels01", "milestone guide exposes check:uxschoolorganizationpanels01");

  const structureAudit = read("docs/UX_PANEL_STRUCTURE_02_AUDIT.md");
  mustContains(structureAudit, "UX-SCHOOL-ORGANIZATION-PANELS-01", "structure audit includes school/organization note");
  mustNotContains(structureAudit, "runtime-data", "structure audit avoids runtime-data");
  mustNotContains(structureAudit, "prisma", "structure audit avoids prisma");
  mustNotContains(structureAudit, "migration", "structure audit avoids migration");

  const copilotAudit = read("docs/COPILOT_PANEL_CONTEXT_AUDIT_V1.md");
  mustContains(copilotAudit, "UX-SCHOOL-ORGANIZATION-PANELS-01", "copilot audit mentions school/organization note");

  const schoolOps = read("web/src/panels/school/OperationsPanel.jsx");
  const schoolIntro = read("web/src/panels/company/CompanyShiftsPanelIntro.jsx");
  const schoolShifts = read("web/src/panels/company/ShiftsPanel.jsx");
  const orgCenter = read("web/src/panels/organization/CenterPanel.jsx");
  const orgPlans = read("web/src/panels/organization/PlansPanel.jsx");
  const orgShared = read("web/src/panels/organization/organizationPlansShared.jsx");
  const workflow = read("web/src/panels/company/WorkflowPanel.jsx");
  const appShell = read("web/src/layout/AppShell.jsx");
  const navDock = read("web/src/layout/NavDock.jsx");

  mustContains(schoolOps, 'PanelSegmentTabs', "School operations keeps segmented tabs");
  mustContains(schoolOps, 'label: "Özet"', "School operations keeps summary tab");
  mustContains(schoolOps, 'label: "Öğrenci Servisleri"', "School operations keeps student services tab");
  mustContains(schoolOps, 'label: "Veli & Bildirimler"', "School operations keeps parent/notification tab");
  mustContains(schoolOps, 'label: "İstisnalar / Günlük Değişiklikler"', "School operations keeps exceptions tab");
  mustContains(schoolOps, 'label: "Kanıt / Check-in"', "School operations keeps proof tab");
  mustContains(schoolOps, 'label: "Geçmiş"', "School operations keeps history tab");
  mustContains(schoolOps, 'setActiveTab("proof")', "School operations check-in action jumps to proof tab");
  mustContains(schoolOps, 'setActiveTab("parent")', "School operations notifications action jumps to parent tab");
  mustContains(schoolOps, 'OperationProofMiniCard', "School operations keeps proof card component");
  mustContains(schoolOps, 'activeTab === "summary"', "School operations renders summary tab conditionally");
  mustContains(schoolOps, 'activeTab === "students"', "School operations renders student tab conditionally");
  mustContains(schoolOps, 'activeTab === "parent"', "School operations renders parent tab conditionally");
  mustContains(schoolOps, 'activeTab === "exceptions"', "School operations renders exceptions tab conditionally");
  mustContains(schoolOps, 'activeTab === "proof"', "School operations renders proof tab conditionally");
  mustContains(schoolOps, 'activeTab === "history"', "School operations renders history tab conditionally");
  must(countMatches(schoolOps, /activeTab === "/g) === 6, "School operations keeps exactly six tab branches");
  must(countMatches(schoolOps, /OperationProofMiniCard/g) >= 2, "School operations uses proof card only once plus import");
  mustNotContains(schoolOps, "Servis Kanıtı ana gövdede", "School operations removes long proof block from main surface");
  mustNotContains(schoolOps, "Öğrenci servis atamaları ana gövdede", "School operations removes student table from main surface");
  mustNotContains(schoolOps, "Veli bağlantıları ve bildirim geçmişi", "School operations removes combined long open block wording");
  mustNotContains(schoolOps, "runtime-data", "School operations avoids runtime-data");
  mustNotContains(schoolOps, "prisma", "School operations avoids prisma");
  mustNotContains(schoolOps, "migration", "School operations avoids migration");

  mustContains(schoolIntro, 'Okul Vardiyaları', "School shifts intro uses school label");
  mustContains(schoolIntro, 'Kurum Vardiyaları', "School shifts intro uses organization label");
  mustContains(schoolIntro, 'scopeTitle(companyKind)', "Shifts intro derives title from company kind");
  mustContains(schoolIntro, 'companyKind', "Shifts intro receives company kind");
  mustContains(schoolShifts, 'companyKind={me?.companyKind}', "Shifts panel passes company kind to intro");

  mustContains(orgCenter, 'Kurum Merkezi', "Organization center uses kurum title");
  mustContains(orgCenter, 'Toplam konum', "Organization center uses konum count label");
  mustContains(orgCenter, '<th>Konum</th>', "Organization center uses konum table header");

  mustContains(orgPlans, 'Toplu Konum İçe Aktar (Legacy)', "Organization plans uses konum import label");
  mustContains(orgPlans, 'Konumlar', "Organization plans uses konum plural heading");
  mustContains(orgPlans, 'Yeni konum kurgusu', "Organization plans uses konum copy");
  mustContains(orgPlans, 'konum sırasını', "Organization plans uses konum ordering copy");
  mustContains(orgPlans, 'Henüz konum yok.', "Organization plans uses konum empty state");
  mustContains(orgPlans, 'kurum planlarını', "Organization plans uses kurum wording");

  mustContains(orgShared, 'Konum:', "Organization shared summary uses konum pill");
  mustContains(orgShared, 'Koordinatlı konum ekleyin.', "Organization shared preview uses konum copy");
  mustContains(orgShared, 'Konum sırası çizgisel önizleme.', "Organization shared preview uses konum ordering copy");
  mustContains(orgShared, 'konum', "Organization shared item count uses konum wording");
  mustContains(orgShared, 'Konum ${index + 1}', "Organization shared stop card uses konum label");

  mustContains(workflow, 'Kurum — Gezi / Planlama Merkezi', "Workflow panel uses kurum title");
  mustContains(workflow, 'Toplanma Konumu', "Workflow panel uses toplanma konumu");
  mustNotContains(workflow, 'Organization —', "Workflow panel removes raw Organization title");

  mustContains(appShell, 'Kurum operasyonu', "AppShell uses kurum operation label");
  mustContains(appShell, 'KURUM', "AppShell exposes kurum scope label");
  mustNotContains(appShell, 'Organizasyon operasyonu', "AppShell removes raw organization wording");

  mustContains(navDock, 'Kurum', "NavDock uses kurum role title");
  mustNotContains(navDock, 'Organizasyon', "NavDock removes raw organization wording");

  const visibleCopies = [
    schoolOps,
    schoolIntro,
    orgCenter,
    orgPlans,
    orgShared,
    workflow,
    appShell,
    navDock,
  ].join("\n\n");

  mustNotContains(visibleCopies, 'Lokasyon', "Visible copy replaces lokasyon with konum");
  mustNotContains(visibleCopies, 'Organization — Gezi / Planlama Merkezi', "Visible copy removes raw Organization header");
  mustNotContains(visibleCopies, 'Organizasyon operasyonu', "Visible copy removes raw organization operation wording");

  console.log("=== UX-SCHOOL-ORGANIZATION-PANELS-01 CHECK PASS ===");
}

main();
