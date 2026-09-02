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

function must(text, needle, label) {
  if (normalize(text).includes(normalize(needle))) ok(label);
  else fail(label);
}

function mustNot(text, needle, label) {
  if (normalize(text).includes(normalize(needle))) fail(label);
  else ok(label);
}

function ordered(text, needles, label) {
  const haystack = normalize(text);
  let last = -1;
  for (const needle of needles) {
    const target = normalize(needle);
    const idx = haystack.indexOf(target, last + 1);
    if (idx === -1) fail(`${label}: missing ${needle}`);
    if (idx < last) fail(`${label}: wrong order for ${needle}`);
    last = idx;
  }
  ok(label);
}

function main() {
  console.log("=== UX-SUPERADMIN-AUDIT-PANEL-01 CHECK ===");

  const pkg = read("package.json");
  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  const audit = read("docs/UX_PANEL_STRUCTURE_02_AUDIT.md");
  const context = read("docs/COPILOT_PANEL_CONTEXT_AUDIT_V1.md");
  const app = read("web/src/App.jsx");
  const screenRegistry = read("web/src/copilot/screenRegistry.js");
  const panel = read("web/src/panels/superadmin/OperationsPanel.jsx");
  const registryScripts = productExtensionsChecks.map((step) => step.script);

  must(pkg, '"check:uxsuperadminauditpanel01"', "package.json exposes audit panel check");
  assertProductExtensionsIncludes("check:uxsuperadminauditpanel01", "product extensions registry includes audit panel check", registryScripts);
  assertProductExtensionsIncludes("check:uxsuperadminauditpanel01", "verify-chain registry includes audit panel check", registryScripts);
  must(guide, "UX-SUPERADMIN-AUDIT-PANEL-01", "script guide mentions audit panel milestone");
  must(guide, "check:uxsuperadminauditpanel01", "script guide exposes audit panel check");
  must(audit, "UX-SUPERADMIN-AUDIT-PANEL-01", "panel structure audit includes audit panel note");
  must(context, "UX-SUPERADMIN-AUDIT-PANEL-01", "copilot context audit includes audit panel note");
  must(app, 'path === "/superadmin/operations"', "App keeps superadmin operations route");
  must(screenRegistry, '{ id: 6117, path: "/superadmin/operations", label: "Denetim Paneli" }', "copilot registry keeps Denetim Paneli label");

  must(panel, 'title="Denetim Paneli"', "panel title preserved");
  must(panel, "Ek doğrulama gerekli", "step-up band visible");
  must(panel, "KVKK sınırı aktif", "kvkk band visible");
  must(panel, "PanelSegmentTabs", "panel uses functional tabs");
  must(panel, 'const [activeTab, setActiveTab] = useState("summary")', "default summary tab");
  must(panel, 'activeTab === "summary"', "summary tab branch present");
  must(panel, 'activeTab === "access"', "access tab branch present");
  must(panel, 'activeTab === "proof"', "proof tab branch present");
  must(panel, 'activeTab === "kvkk"', "kvkk tab branch present");
  must(panel, 'activeTab === "audit"', "audit tab branch present");
  must(panel, 'activeTab === "risk"', "risk tab branch present");
  must(panel, 'label: "Özet"', "summary tab label present");
  must(panel, 'label: "Yetki & Erişim"', "access tab label present");
  must(panel, 'label: "Servis Kanıtı"', "proof tab label present");
  must(panel, 'label: "KVKK & Uyumluluk"', "kvkk tab label present");
  must(panel, 'label: "Denetim / İşlem Kayıtları"', "audit tab label present");
  must(panel, 'label: "Riskler & Kararlar"', "risk tab label present");
  must(panel, 'role="tabpanel" aria-label="Özet"', "summary tabpanel accessible");
  must(panel, 'role="tabpanel" aria-label="Yetki & Erişim"', "access tabpanel accessible");
  must(panel, 'role="tabpanel" aria-label="Servis Kanıtı"', "proof tabpanel accessible");
  must(panel, 'role="tabpanel" aria-label="KVKK & Uyumluluk"', "kvkk tabpanel accessible");
  must(panel, 'role="tabpanel" aria-label="Denetim / İşlem Kayıtları"', "audit tabpanel accessible");
  must(panel, 'role="tabpanel" aria-label="Riskler & Kararlar"', "risk tabpanel accessible");
  must(panel, "Yenile", "refresh action preserved");
  must(panel, "İşlem Kayıtları", "audit action preserved");
  must(panel, "İşlem kayıtlarını dışa aktar", "log export action preserved");
  must(panel, "Operasyon Doğrulama", "operation verification action preserved");
  must(panel, "Rol / yetki denetimi", "top metric role checks preserved");
  must(panel, "Denetim kayıtları", "top metric audit records preserved");
  must(panel, "Teknik işlem riski", "top metric technical risk preserved");
  must(panel, "Bildirim geçmişi", "top metric notification history preserved");
  must(panel, "Giriş denetimi / giriş kayıtları", "top metric login audit preserved");
  must(panel, "Şüpheli / tekrar eden işlem", "top metric suspicious repeats preserved");
  must(panel, "KVKK eşleşmeleri", "top metric kvkk matches preserved");
  must(panel, "OperationProofMiniCard", "proof card kept in proof tab");
  must(panel, "PanelKvkkHint panelKey=\"auditLogs\"", "kvkk hint kept in kvkk tab");
  must(panel, "Denetim / işlem kayıtları", "audit log table kept in audit tab");
  must(panel, "Servis Kanıtı", "proof tab content kept");
  must(panel, "Kritik uyarı özeti", "summary critical warning card kept");
  must(panel, "Biniş değişikliği kayıtları", "summary boarding signal card kept");
  must(panel, "Rol destekleri", "access tab role support card kept");
  must(panel, "Giriş denetimi", "risk tab login review kept");
  must(panel, "Varsayılan karar", "risk tab default decision kept");
  mustNot(panel, "Hızlı denetim yolları", "legacy quick-audit block removed from main surface");
  must(panel, "KVKK / görünürlük notu", "compact visibility note kept in kvkk tab");
  mustNot(panel, "Canlı İzleme", "superadmin operations panel should not expose live monitoring action");
  mustNot(panel, "markSettlementExecuted", "audit panel does not expose settlement execute");
  mustNot(panel, "EXECUTED yap", "audit panel does not expose settlement execute language");
  mustNot(panel, "runtime-data", "panel avoids runtime-data wording");
  mustNot(panel, "prisma", "panel avoids prisma wording");
  mustNot(panel, "migration", "panel avoids migration wording");
  ordered(panel, [
    "PanelChrome",
    "PanelSegmentTabs",
    'activeTab === "summary"',
    'activeTab === "access"',
    'activeTab === "proof"',
    'activeTab === "kvkk"',
    'activeTab === "audit"',
    'activeTab === "risk"',
  ], "top band before tabs and tab branches");

  console.log("=== UX-SUPERADMIN-AUDIT-PANEL-01 CHECK PASS ===");
}

main();
