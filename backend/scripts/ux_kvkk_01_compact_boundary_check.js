import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");

function read(relPath) {
  return fs.readFileSync(path.join(repoRoot, relPath), "utf8");
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

function must(text, needle, label) {
  if (!normalize(text).includes(normalize(needle))) {
    throw new Error(`FAIL ${label}`);
  }
  console.log(`OK ${label}`);
}

function mustNot(text, needle, label) {
  if (normalize(text).includes(normalize(needle))) {
    throw new Error(`FAIL ${label}`);
  }
  console.log(`OK ${label}`);
}

function mustNoMigrationMarker(marker, label) {
  const dir = path.join(repoRoot, "backend/prisma/migrations");
  if (!fs.existsSync(dir)) {
    console.log(`OK ${label}`);
    return;
  }
  const folders = fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
  if (folders.some((name) => normalize(name).includes(normalize(marker)))) {
    throw new Error(`FAIL ${label}`);
  }
  console.log(`OK ${label}`);
}

console.log("=== UX-KVKK-01 COMPACT BOUNDARY CHECK ===");

const rootPkg = read("package.json");
const hint = read("web/src/panels/shared/PanelKvkkHint.jsx");
const kvkkPanel = read("web/src/panels/shared/KvkkPanel.jsx");
const superAdminPanel = read("web/src/panels/superadmin/SuperAdminPanel.jsx");
const operationsPanel = read("web/src/panels/superadmin/OperationsPanel.jsx");
const companiesPanel = read("web/src/panels/superadmin/CompaniesPanel.jsx");
const roomsPanel = read("web/src/panels/superadmin/RoomsPanel.jsx");
const usersPanel = read("web/src/panels/superadmin/UsersPanel.jsx");
const fieldAcceptanceCenter = read("web/src/panels/superadmin/FieldAcceptanceCenter.jsx");
const observabilityPanel = read("web/src/panels/superadmin/ObservabilityPanel.jsx");
const auditLogsPanel = read("web/src/panels/superadmin/AuditLogsPanel.jsx");
const operationVerificationPanel = read("web/src/panels/superadmin/OperationVerificationPanel.jsx");
const schema = read("backend/prisma/schema.prisma");

must(rootPkg, '"check:uxkvkk01": "node backend/scripts/ux_kvkk_01_compact_boundary_check.js"', "root package exposes check:uxkvkk01");
must(rootPkg, '"check:m99kvkk01": "node backend/scripts/m99_kvkk_01_mobile_web_plain_text_check.js"', "root package keeps check:m99kvkk01");
must(rootPkg, '"check:m99ux01": "node backend/scripts/m99_ux_01_visible_text_hygiene_check.js"', "root package keeps check:m99ux01");
must(rootPkg, '"check:web-mobile": "npm --prefix web run check:web-mobile"', "root package keeps check:web-mobile");
  must(rootPkg, '"verify:final": "npm run check:m95e23c && npm run check:web-mobile && npm run check:product-extensions && npm run verify:repo && node backend/scripts/clean_snapshot_artifacts.js && npm run verify:snapshot"', "root package keeps verify:final");

must(hint, "KVKK sınırı aktif", "kvkk hint keeps compact active label");
must(hint, "Detaylar KVKK panelinde", "kvkk hint keeps compact detail note");
must(hint, "Güncel matris", "kvkk hint keeps matrix badge text");
mustNot(hint, "Görürsün", "kvkk hint removes four-column visible section");
mustNot(hint, "Yazabilirsin", "kvkk hint removes four-column write section");
mustNot(hint, "Burada görünmez", "kvkk hint removes four-column hidden section");
mustNot(hint, "Kapsam ve neden", "kvkk hint removes four-column scope section");
mustNot(hint, "repeat(auto-fit, minmax(220px, 1fr))", "kvkk hint removes four-column grid");

must(kvkkPanel, "Rol görünürlük matrisi", "kvkk panel keeps detailed matrix section");
must(kvkkPanel, "Bu rolde zorunlu belgeler", "kvkk panel keeps required docs section");
must(kvkkPanel, "Kısa özet", "kvkk panel keeps summary section");

must(superAdminPanel, '{ title: "KVKK", desc: "Veri koruma ve uyum yüzeyi." }', "superadmin panel keeps kvkk nav reference");
must(operationsPanel, "KVKK / görünürlük notu", "operations panel keeps compact kvkk note section");
must(operationsPanel, "PanelKvkkHint", "operations panel keeps kvkk hint reference");
must(companiesPanel, "PanelKvkkHint", "companies panel keeps kvkk hint reference");
must(roomsPanel, "PanelKvkkHint", "rooms panel keeps kvkk hint reference");
must(usersPanel, "PanelKvkkHint", "users panel keeps kvkk hint reference");
must(fieldAcceptanceCenter, "PanelKvkkHint", "field acceptance panel keeps kvkk hint reference");
must(observabilityPanel, "PanelKvkkHint", "observability panel keeps kvkk hint reference");
must(auditLogsPanel, "PanelKvkkHint", "audit logs panel keeps kvkk hint reference");
must(operationVerificationPanel, "PanelKvkkHint", "operation verification panel keeps kvkk hint reference");

mustNot(hint, "raw/token/hash/payload/debug", "kvkk hint does not add technical raw text");
mustNot(hint, "raw token", "kvkk hint does not expose raw token wording");
mustNot(hint, "hash", "kvkk hint does not expose hash");
mustNot(hint, "payload", "kvkk hint does not expose payload");
mustNot(hint, "debug", "kvkk hint does not expose debug");

mustNoMigrationMarker("ux_kvkk_01", "no ux-kvkk-01 migration folder detected");
mustNot(schema, "model UXKvkk", "schema does not add UXKvkk model");

console.log("=== UX-KVKK-01 COMPACT BOUNDARY CHECK PASS ===");
