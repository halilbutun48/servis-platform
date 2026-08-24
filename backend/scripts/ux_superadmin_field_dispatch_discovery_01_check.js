import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { assertProductExtensionsIncludes, productExtensionsChecks } from "./lib/productExtensionsRegistry.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

function read(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), "utf8");
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

function mustCondition(condition, label) {
  if (condition) ok(label);
  else fail(label);
}

function mustNotInclude(text, needle, label) {
  if (normalize(text).includes(normalize(needle))) fail(label);
  else ok(label);
}

function count(text, needle) {
  const haystack = normalize(text);
  const target = normalize(needle);
  let idx = 0;
  let total = 0;
  while (true) {
    idx = haystack.indexOf(target, idx);
    if (idx === -1) break;
    total += 1;
    idx += target.length || 1;
  }
  return total;
}

function main() {
  console.log("=== UX-SUPERADMIN-FIELD-DISPATCH-DISCOVERY-01 CHECK ===");

  const pkg = read("package.json");
  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  const audit = read("docs/UX_PANEL_STRUCTURE_02_AUDIT.md");
  const context = read("docs/COPILOT_PANEL_CONTEXT_AUDIT_V1.md");
  const panel = read("web/src/panels/superadmin/PilotLaunchGatePanel.jsx");
  const route = read("backend/src/routes/pilotLaunchGate.js");
  const manifest = read("backend/src/ops/pilotLaunchGateManifest.js");
  const prep = read("backend/src/ops/fieldPrepPacket.js");
  const feedback = read("backend/src/ops/fieldFeedbackLoop.js");
  const acceptanceManifest = read("backend/src/ops/fieldAcceptanceManifest.js");
  const acceptanceState = read("backend/src/ops/fieldAcceptanceState.js");
  const registryScripts = productExtensionsChecks.map((step) => step.script);

  must(pkg, '"check:uxsuperadminfielddispatchdiscovery01": "node backend/scripts/ux_superadmin_field_dispatch_discovery_01_check.js"', "package.json exposes field dispatch discovery check");
  assertProductExtensionsIncludes("check:uxsuperadminfielddispatchdiscovery01", "product extensions registry includes field dispatch discovery check", registryScripts);
  assertProductExtensionsIncludes("check:uxsuperadminfielddispatchdiscovery01", "verify-chain registry includes field dispatch discovery check", registryScripts);
  must(guide, "UX-SUPERADMIN-FIELD-DISPATCH-DISCOVERY-01", "script guide mentions field dispatch discovery milestone");
  must(guide, "check:uxsuperadminfielddispatchdiscovery01", "script guide exposes field dispatch discovery check");
  must(audit, "UX-SUPERADMIN-FIELD-DISPATCH-DISCOVERY-01", "panel structure audit includes field dispatch discovery note");
  must(context, "UX-SUPERADMIN-FIELD-DISPATCH-DISCOVERY-01", "copilot context audit includes field dispatch discovery note");

  must(panel, "Sahaya Çıkış Kontrolü", "panel title preserved");
  must(panel, "FIELD DISPATCH DISCOVERY / INVENTORY", "inventory documented in panel source");
  must(panel, "Kritik engel / hazır değil / onay gerekli", "top critical band preserved");
  must(panel, "Son karar", "summary metric preserved");
  must(panel, "Risk sayısı", "summary metric preserved");
  must(panel, "Saha hazırlık", "summary metric preserved");
  must(panel, "M84 saha döngüsü", "summary metric preserved");
  must(panel, "PanelSegmentTabs", "functional tabs present");
  must(panel, 'ariaLabel="Sahaya Çıkış sekmeleri"', "tabs region label preserved");
  must(panel, 'const [activeTab, setActiveTab] = useState("overview")', "active tab state present");
  must(panel, 'activeTab === "overview"', "overview tab branch present");
  must(panel, 'activeTab === "prep"', "prep tab branch present");
  must(panel, 'activeTab === "decision"', "decision tab branch present");
  must(panel, 'activeTab === "risks"', "risk tab branch present");
  must(panel, 'activeTab === "feedback"', "feedback tab branch present");
  must(panel, 'activeTab === "history"', "history tab branch present");
  must(panel, 'label: "Özet"', "overview tab label present");
  must(panel, 'label: "Hazırlık Kontrolü"', "prep tab label present");
  must(panel, 'label: "Onay & Çıkış"', "decision tab label present");
  must(panel, 'label: "Eksikler & Riskler"', "risk tab label present");
  must(panel, 'label: "Geri Bildirimler"', "feedback tab label present");
  must(panel, 'label: "Geçmiş / Log"', "history tab label present");
  must(panel, '<TabPanel active={activeTab === "overview"} label="Özet">', "overview tabpanel accessible");
  must(panel, '<TabPanel active={activeTab === "prep"} label="Hazırlık Kontrolü">', "prep tabpanel accessible");
  must(panel, '<TabPanel active={activeTab === "decision"} label="Onay & Çıkış">', "decision tabpanel accessible");
  must(panel, '<TabPanel active={activeTab === "risks"} label="Eksikler & Riskler">', "risk tabpanel accessible");
  must(panel, '<TabPanel active={activeTab === "feedback"} label="Geri Bildirimler">', "feedback tabpanel accessible");
  must(panel, '<TabPanel active={activeTab === "history"} label="Geçmiş / Log">', "history tabpanel accessible");
  mustCondition(count(panel, '<TabPanel active={activeTab ===') === 6, "exactly six tab panels are declared");
  mustCondition(count(panel, 'activeTab ===') === 6, "exactly six activeTab branches are rendered");
  must(panel, 'Launch checklist', "prep checklist preserved");
  must(panel, 'Canlı ortam ve release kontrolleri', "prep env checks preserved");
  must(panel, 'Operatör uygulama sırası', "prep operator sequence preserved");
  must(panel, 'Gerçek saha senaryoları', "prep scenarios preserved");
  must(panel, 'Rol ve cihaz checklisti', "prep role/device checklist preserved");
  must(panel, 'Karar kaydı', "decision form preserved");
  must(panel, 'GO / LIMITED GO / NO-GO', "decision output preserved");
  must(panel, 'Risk kaydı', "risk form preserved");
  must(panel, 'Kayıtlı riskler', "risk list preserved");
  must(panel, 'Saha gözlem / geri bildirim döngüsü', "feedback loop preserved");
  must(panel, 'Yeni saha geri bildirimi ekle', "feedback form preserved");
  must(panel, 'Rol kapsaması', "role coverage preserved");
  must(panel, 'Yüzey kapsaması', "surface coverage preserved");
  must(panel, 'Son saha kayıtları', "feedback records preserved");
  must(panel, 'M84 bloklar', "history blockers preserved");
  must(panel, 'M84 uyarılar', "history warnings preserved");
  must(panel, 'M84 notları', "history notes preserved");
  must(panel, 'Hazır vardiya', "capacity card preserved");
  must(panel, 'Aktif araç', "capacity card preserved");
  must(panel, 'Driver kullanıcı', "capacity card preserved");
  must(panel, 'Aktif sözleşme', "capacity card preserved");

  must(route, "/manifest", "route manifest endpoint preserved");
  must(route, "/decision", "route decision endpoint preserved");
  must(route, "/risks", "route risks endpoint preserved");
  must(route, "/summary", "route summary endpoint preserved");

  must(manifest, "Launch checklist", "manifest checklist preserved");
  must(manifest, "Kritik risk listesi", "manifest risk section preserved");
  must(prep, "Sahaya Çıkış Kontrolü", "prep packet references dispatch panel");
  must(feedback, "Bu paket saha günü görülen sorunları dağınık not olmaktan çıkarıp tek döngüde izler.", "feedback loop references dispatch panel");
  must(acceptanceManifest, "FIELD_ACCEPTANCE_DECISIONS", "acceptance manifest decision preserved");
  must(acceptanceState, "checklist", "acceptance state keeps checklist");

  must(panel, "Veri kaybı yok", "panel inventory explicitly states no data loss");
  mustNotInclude(panel, "Boş/dekoratif tab", "panel source does not advertise decorative empty tabs");

  console.log("=== UX-SUPERADMIN-FIELD-DISPATCH-DISCOVERY-01 CHECK PASS ===");
}

main();
