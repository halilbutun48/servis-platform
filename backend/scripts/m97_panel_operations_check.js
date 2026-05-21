import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function normalize(text) {
  return String(text || "")
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .replace(/ğ/g, "g")
    .replace(/Ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/Ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/Ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/Ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/Ç/g, "c")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function has(text, needle) {
  return normalize(text).includes(normalize(needle));
}

function ok(msg) {
  console.log(`OK ${msg}`);
}

function must(cond, msg) {
  if (!cond) throw new Error(`FAIL ${msg}`);
  ok(msg);
}

console.log("=== M97-B/C/D PANEL OPERATIONS CHECK ===");

const app = read("../web/src/App.jsx");
const navDock = read("../web/src/layout/NavDock.jsx");
const quickBar = read("../web/src/components/TabletOpsQuickBar.jsx");
const superAdminPanel = read("../web/src/panels/superadmin/SuperAdminPanel.jsx");
const companyPanel = read("../web/src/panels/company/OperationsPanel.jsx");
const schoolPanel = read("../web/src/panels/school/OperationsPanel.jsx");
const superOpsPanel = read("../web/src/panels/superadmin/OperationsPanel.jsx");
const screenRegistry = read("../web/src/copilot/screenRegistry.js");
const packageJson = read("../backend/package.json");
const primer = read("../docs/PRIMER_SSOT.md");
const registry = read("../docs/MILESTONE_REGISTRY_V1.md");
const scriptMap = read("../docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
const state = read("../tools/repo_contract_state.json");

must(has(app, 'const CompanyOperationsPanel = lazy(() => import("./panels/company/OperationsPanel"));'), "app loads company operations panel");
must(has(app, 'const SchoolOperationsPanel = lazy(() => import("./panels/school/OperationsPanel"));'), "app loads school operations panel");
must(has(app, 'const SuperOperationsPanel = lazy(() => import("./panels/superadmin/OperationsPanel"));'), "app loads super admin operations panel");
must(has(app, 'path === "/company/operations"'), "app keeps company operations route");
must(has(app, 'path === "/organization/operations"'), "app keeps organization operations route");
must(has(app, 'path === "/school/operations"'), "app keeps school operations route");
must(has(app, 'path === "/superadmin/operations"'), "app keeps super admin operations route");

must(has(navDock, 'Operasyon Paneli'), "nav dock exposes operations panel entry");
must(has(navDock, 'Denetim Paneli'), "nav dock exposes denetim panel entry");
must(has(navDock, 'path: base + "/operations"'), "nav dock links company operations route");
must(has(navDock, 'path: "/superadmin/operations"'), "nav dock links super admin operations route");

must(has(quickBar, 'path: base + "/operations"'), "tablet quick bar keeps operations shortcut");

must(has(superAdminPanel, 'navigate("/superadmin/operations")'), "super admin quick access opens operations panel");
must(has(superAdminPanel, 'Denetim Paneli'), "super admin quick access keeps denetim label");

must(has(companyPanel, 'Şirket Operasyon Paneli'), "company operations panel title is visible");
must(has(companyPanel, 'Personel servis atamaları'), "company operations panel keeps assignment section");
must(has(companyPanel, 'Bugün servisi kullanmayacak personeller'), "company operations panel keeps no-board section");
must(has(companyPanel, 'Farklı duraktan binecek personeller'), "company operations panel keeps different-stop section");
must(has(companyPanel, 'Biniş değişiklikleri'), "company operations panel keeps boarding changes section");

must(has(schoolPanel, 'Okul Operasyon Paneli'), "school operations panel title is visible");
must(has(schoolPanel, 'Öğrenci servis atamaları'), "school operations panel keeps student assignment section");
must(has(schoolPanel, 'Veli bağlantıları'), "school operations panel keeps parent links section");
must(has(schoolPanel, 'Bugün binmeyecek öğrenciler'), "school operations panel keeps no-board section");
must(has(schoolPanel, 'Servise bindi / okula ulaştı'), "school operations panel keeps boarding status section");
must(has(schoolPanel, 'Riskli / onay bekleyen istekler'), "school operations panel keeps risky requests section");

must(has(superOpsPanel, 'Denetim Paneli'), "super admin operations panel title is visible");
must(has(superOpsPanel, 'Rol / yetki denetimi'), "super admin operations panel keeps role control");
must(has(superOpsPanel, 'Şüpheli / tekrar eden işlemler'), "super admin operations panel keeps repeated action section");
must(has(superOpsPanel, 'Biniş değişikliği kayıtları'), "super admin operations panel keeps boarding change records");

must(has(screenRegistry, '{ id: 2117, path: "/company/operations", label: "Operasyon Paneli" }'), "copilot registry keeps company operations");
must(has(screenRegistry, '{ id: 2218, path: "/school/operations", label: "Okul Operasyon Paneli" }'), "copilot registry keeps school operations");
must(has(screenRegistry, '{ id: 2315, path: "/organization/operations", label: "Kurum Operasyon Paneli" }'), "copilot registry keeps organization operations");
must(has(screenRegistry, '{ id: 6117, path: "/superadmin/operations", label: "Denetim Paneli" }'), "copilot registry keeps super admin operations");

must(has(packageJson, '"m97opscheck": "node scripts/m97_panel_operations_check.js"'), "backend package exposes m97opscheck");

must(has(primer, "M97-B company operations panel"), "primer mentions M97-B company operations panel");
must(has(primer, "M97-C school operations panel"), "primer mentions M97-C school operations panel");
must(has(primer, "M97-D super admin operations panel"), "primer mentions M97-D super admin operations panel");

must(has(registry, "M97-B - company operations panel - active"), "milestone registry mentions M97-B");
must(has(registry, "M97-C - school operations panel - active"), "milestone registry mentions M97-C");
must(has(registry, "M97-D - super admin operations panel - active"), "milestone registry mentions M97-D");

must(has(scriptMap, "node backend\\scripts\\m97_panel_operations_check.js") || has(scriptMap, "node backend/scripts/m97_panel_operations_check.js"), "script map points to M97 operations check");
must(has(state, '"M97-B"'), "repo contract state marks M97-B active");
must(has(state, '"M97-C"'), "repo contract state marks M97-C active");
must(has(state, '"M97-D"'), "repo contract state marks M97-D active");

console.log("M97-B/C/D panel operations check passed");
