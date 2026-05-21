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

function mustContainsAny(text, needles, label) {
  const haystack = normalize(text);
  const ok = needles.some((needle) => haystack.includes(normalize(needle)));
  must(ok, label);
}

function mustNotContains(text, needle, label) {
  must(!normalize(text).includes(normalize(needle)), label);
}

function countMatches(text, pattern) {
  const matches = String(text || "").match(pattern);
  return matches ? matches.length : 0;
}

function main() {
  console.log("=== UX-COMPANY-OPS-PANEL-TABS-01 CHECK ===");

  const pkg = read("package.json");
  mustContains(pkg, '"check:uxcompanyopspaneltabs01"', "package.json exposes check:uxcompanyopspaneltabs01");
  mustContains(pkg, '"check:uxcompanypanelssmoke01"', "package.json exposes check:uxcompanypanelssmoke01");

  const runner = read("backend/scripts/run_product_extensions_check_chain.js");
  mustContains(runner, "check:uxcompanyopspaneltabs01", "product extensions runner includes company ops tabs check");
  mustContains(runner, "check:uxcompanypanelssmoke01", "product extensions runner includes company ops smoke check");

  const verify = read("backend/scripts/verify_chain_01_product_extensions_check.js");
  mustContains(verify, "check:uxcompanyopspaneltabs01", "verify chain includes company ops tabs check");
  mustContains(verify, "check:uxcompanypanelssmoke01", "verify chain includes company ops smoke check");

  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  mustContains(guide, "UX-COMPANY-OPS-PANEL-TABS-01", "script guide mentions UX-COMPANY-OPS-PANEL-TABS-01");
  mustContains(guide, "check:uxcompanyopspaneltabs01", "script guide exposes check:uxcompanyopspaneltabs01");
  mustContains(guide, "check:uxcompanypanelssmoke01", "script guide exposes check:uxcompanypanelssmoke01");

  const structureAudit = read("docs/UX_PANEL_STRUCTURE_02_AUDIT.md");
  mustContains(structureAudit, "UX-COMPANY-OPS-PANEL-TABS-01", "structure audit includes company ops tabs note");
  must(!normalize(structureAudit).includes("runtime-data"), "structure audit avoids runtime-data");
  must(!normalize(structureAudit).includes("prisma"), "structure audit avoids prisma");
  must(!normalize(structureAudit).includes("migration"), "structure audit avoids migration");

  const copilotAudit = read("docs/COPILOT_PANEL_CONTEXT_AUDIT_V1.md");
  mustContains(copilotAudit, "UX-COMPANY-OPS-PANEL-TABS-01", "copilot audit mentions UX-COMPANY-OPS-PANEL-TABS-01");

  const app = read("web/src/App.jsx");
  const screenRegistry = read("web/src/copilot/screenRegistry.js");
  const panel = read("web/src/panels/company/OperationsPanel.jsx");
  const panelSegmentTabs = read("web/src/components/PanelSegmentTabs.jsx");
  const collapsibleSection = read("web/src/components/CollapsibleSection.jsx");

  mustContains(app, 'const CompanyOperationsPanel = lazy(() => import("./panels/company/OperationsPanel"));', "App loads company operations panel");
  mustContains(app, 'path === "/company/operations"', "App keeps company operations route");
  mustContains(app, 'path === "/organization/operations"', "App keeps organization operations route");
  mustContains(screenRegistry, '{ id: 2117, path: "/company/operations", label: "Operasyon Paneli" }', "copilot registry keeps company operations");

  mustContains(panelSegmentTabs, "onChange", "PanelSegmentTabs keeps onChange support");
  mustContains(panelSegmentTabs, "onSelect", "PanelSegmentTabs keeps onSelect support");
  mustContains(panelSegmentTabs, "onClick", "PanelSegmentTabs keeps onClick support");
  mustContains(panelSegmentTabs, 'role="tab"', "PanelSegmentTabs renders accessible tab buttons");
  mustContains(panelSegmentTabs, "aria-selected", "PanelSegmentTabs marks active tab");

  mustContains(collapsibleSection, "aria-expanded", "CollapsibleSection remains accessible");

  mustContains(panel, 'const [activeTab, setActiveTab] = useState("summary")', "Company OperationsPanel keeps active tab state");
  mustContains(panel, "PanelSegmentTabs", "Company OperationsPanel uses segmented tabs");
  mustContains(panel, "CollapsibleSection", "Company OperationsPanel keeps collapsible secondary content");
  mustContains(panel, 'tabs={[', "Company OperationsPanel defines a tab list");
  mustContains(panel, 'key: "summary"', "Company OperationsPanel includes summary tab");
  mustContains(panel, 'key: "cluster"', "Company OperationsPanel includes cluster tab");
  mustContains(panel, 'key: "personel"', "Company OperationsPanel includes personel tab");
  mustContains(panel, 'key: "serviceTimes"', "Company OperationsPanel includes service times tab");
  mustContains(panel, 'key: "exceptions"', "Company OperationsPanel includes exceptions tab");
  mustContains(panel, 'key: "notifications"', "Company OperationsPanel includes notifications tab");
  mustContains(panel, 'label: "Özet"', "Company OperationsPanel exposes Özet tab label");
  mustContains(panel, 'label: "Servis Kümesi"', "Company OperationsPanel exposes Servis Kümesi tab label");
  mustContains(panel, 'label: "Personel"', "Company OperationsPanel exposes Personel tab label");
  mustContains(panel, 'label: "Servis Zamanları"', "Company OperationsPanel exposes Servis Zamanları tab label");
  mustContains(panel, 'label: "İstisnalar / Değişiklikler"', "Company OperationsPanel exposes exceptions tab label");
  mustContains(panel, 'label: "Bildirimler"', "Company OperationsPanel exposes Bildirimler tab label");
  mustContains(panel, 'activeTab === "summary"', "Company OperationsPanel renders summary branch conditionally");
  mustContains(panel, 'activeTab === "cluster"', "Company OperationsPanel renders cluster branch conditionally");
  mustContains(panel, 'activeTab === "personel"', "Company OperationsPanel renders personel branch conditionally");
  mustContains(panel, 'activeTab === "serviceTimes"', "Company OperationsPanel renders service times branch conditionally");
  mustContains(panel, 'activeTab === "exceptions"', "Company OperationsPanel renders exceptions branch conditionally");
  mustContains(panel, 'activeTab === "notifications"', "Company OperationsPanel renders notifications branch conditionally");
  must(countMatches(panel, /activeTab === "/g) === 6, "Company OperationsPanel keeps exactly six tab branches");
  mustContains(panel, 'setActiveTab("notifications")', "Company OperationsPanel routes info band to notifications tab");
  mustContains(panel, 'setActiveTab(nextAction.tab)', "Company OperationsPanel keeps next action CTA");
  mustContains(panel, "hasAlertBand", "Company OperationsPanel keeps compact alert band state");
  mustContains(panel, "alertBandTitle", "Company OperationsPanel keeps alert band title");
  mustContains(panel, "Yeni bildirim var", "Company OperationsPanel shows new notification band text");
  mustContains(panel, "notificationFilteredRows", "Company OperationsPanel filters notifications in tab");
  mustContains(panel, 'role="tabpanel" aria-label="Özet"', "Company OperationsPanel renders summary as tabpanel");
  mustContains(panel, 'role="tabpanel" aria-label="Servis Kümesi"', "Company OperationsPanel renders cluster as tabpanel");
  mustContains(panel, 'role="tabpanel" aria-label="Personel"', "Company OperationsPanel renders personel as tabpanel");
  mustContains(panel, 'role="tabpanel" aria-label="Servis Zamanları"', "Company OperationsPanel renders service times as tabpanel");
  mustContains(panel, 'role="tabpanel" aria-label="İstisnalar / Değişiklikler"', "Company OperationsPanel renders exceptions as tabpanel");
  mustContains(panel, 'role="tabpanel" aria-label="Bildirimler"', "Company OperationsPanel renders notifications as tabpanel");
  mustContains(panel, 'title="Ana operasyon durumu"', "Company OperationsPanel keeps summary status block");
  mustContains(panel, 'title="Sıradaki önerilen kontrol"', "Company OperationsPanel keeps next-control block");
  mustContains(panel, 'title="Kısa operasyon notu"', "Company OperationsPanel keeps short summary note");
  mustContains(panel, 'title="Servis Kümesi"', "Company OperationsPanel keeps cluster section");
  mustContains(panel, 'title="Personel Özet"', "Company OperationsPanel keeps personel section");
  mustContains(panel, 'title="Personel servis zamanları"', "Company OperationsPanel keeps service times section");
  mustContains(panel, 'title="Eksik değişiklikleri"', "Company OperationsPanel keeps missing-change section");
  mustContainsAny(
    panel,
    [
      'title="Bugün servis kullanmayacak personeller"',
      'title="Bugün servisi kullanmayacak personeller"',
    ],
    "Company OperationsPanel keeps no-board section",
  );
  mustContains(panel, 'title="Farklı duraktan binecek personeller"', "Company OperationsPanel keeps different-stop section");
  mustContains(panel, 'title="Son bildirimler"', "Company OperationsPanel keeps notifications section");
  mustContains(panel, 'OperationProofMiniCard', "Company OperationsPanel keeps operation proof card");
  mustContains(panel, 'manualNoteScopeType="SERVICE"', "Company OperationsPanel keeps proof scope type");
  mustContains(panel, 'manualNoteScopeId={`company-operations-${companyKind.toLowerCase()}`}', "Company OperationsPanel keeps proof scope id");
  mustContains(panel, 'tabCounts.notifications || 0', "Company OperationsPanel badges notifications tab");
  mustContains(panel, 'tabCounts.exceptions || 0', "Company OperationsPanel badges exceptions tab");
  mustContains(panel, 'tabCounts.cluster || 0', "Company OperationsPanel badges cluster tab");
  mustContains(panel, 'tabCounts.personel || 0', "Company OperationsPanel badges personel tab");
  mustContains(panel, 'tabCounts.serviceTimes || 0', "Company OperationsPanel badges service times tab");
  mustContains(panel, 'tabCounts.summary || 0', "Company OperationsPanel badges summary tab");
  mustNotContains(panel, "Görünen ana özet", "Company OperationsPanel does not keep duplicate KPI summary block");
  mustNotContains(panel, "Seçili kayıt bağlamı", "Company OperationsPanel does not repeat room-style selected-record block");
  mustNotContains(panel, "Hızlı erişim", "Company OperationsPanel does not repeat room-style quick-access block");
  mustNotContains(panel, "Tüm Vardiyalar", "Company OperationsPanel does not expose room shifts legacy label");

  console.log("=== UX-COMPANY-OPS-PANEL-TABS-01 CHECK PASS ===");
}

main();
