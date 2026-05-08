import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..", "..");

function read(relPath) {
  return fs.readFileSync(path.join(root, relPath), "utf8");
}

function must(condition, message) {
  if (!condition) throw new Error(message);
}

function include(text, needle, message) {
  must(text.includes(needle), message);
}

function notInclude(text, needle, message) {
  must(!text.includes(needle), message);
}

function main() {
  const pkg = read("package.json");
  const systemBand = read("web/src/components/SystemModeSummaryBand.jsx");
  const superAdmin = read("web/src/panels/superadmin/SuperAdminPanel.jsx");
  const css = read("web/src/index.css");
  const app = read("web/src/App.jsx");
  const nav = read("web/src/layout/NavDock.jsx");

  include(pkg, "\"check:web01b\": \"node backend/scripts/web_01b_superadmin_system_mode_summary_check.js\"", "package check:web01b missing");
  include(pkg, "\"check:web01a\":", "package check:web01a missing");
  include(pkg, "\"check:pay01e\":", "package check:pay01e missing");
  include(pkg, "\"check:qlt04a\":", "package check:qlt04a missing");
  include(pkg, "\"check:web-mobile\":", "package check:web-mobile missing");
  include(pkg, "\"lint:web\":", "package lint:web missing");
  include(pkg, "\"verify:final\":", "package verify:final missing");

  include(systemBand, "function SystemModeSummaryBand", "SystemModeSummaryBand component missing");
  include(systemBand, "system-mode-summary-band", "SystemModeSummaryBand marker missing");
  include(systemBand, "Sistem durumu", "SystemModeSummaryBand title missing");
  include(systemBand, "Kanıt ve kalite hazırlıkları aktif; ödeme ve hakediş işlemleri kapalıdır.", "SystemModeSummaryBand description missing");
  include(systemBand, "Servis kanıtı aktif", "SystemModeSummaryBand service proof chip missing");
  include(systemBand, "Kalite taslak modda", "SystemModeSummaryBand quality chip missing");
  include(systemBand, "Ödeme kapalı", "SystemModeSummaryBand payment chip missing");
  include(systemBand, "Hakediş kapalı", "SystemModeSummaryBand hakediş chip missing");
  include(systemBand, "Komisyon kapalı", "SystemModeSummaryBand commission chip missing");
  include(systemBand, "Saha testi bekliyor", "SystemModeSummaryBand field test chip missing");
  include(systemBand, "Ödeme başlatılmaz", "SystemModeSummaryBand non-final note missing");
  notInclude(systemBand, "raw", "SystemModeSummaryBand must not expose raw wording");
  notInclude(systemBand, "payload", "SystemModeSummaryBand must not expose payload wording");
  notInclude(systemBand, "token", "SystemModeSummaryBand must not expose token wording");
  notInclude(systemBand, "hash", "SystemModeSummaryBand must not expose hash wording");
  notInclude(systemBand, "debug", "SystemModeSummaryBand must not expose debug wording");

  include(superAdmin, "SystemModeSummaryBand", "SuperAdminPanel missing SystemModeSummaryBand import or usage");
  include(superAdmin, "Süper Yönetici", "SuperAdminPanel title missing");
  include(superAdmin, "Özeti Yenile", "SuperAdminPanel action missing");

  include(css, ".system-mode-summary-band", "CSS system-mode-summary-band missing");
  include(css, ".system-mode-summary-head", "CSS system-mode-summary-head missing");
  include(css, ".system-mode-summary-grid", "CSS system-mode-summary-grid missing");
  include(css, ".system-mode-summary-chip", "CSS system-mode-summary-chip missing");
  include(css, ".system-mode-summary-note", "CSS system-mode-summary-note missing");

  include(app, "SuperAdminPanel", "App must still route to superadmin panel");
  include(nav, "/superadmin/commercial-core", "NavDock commercial core route should remain");
  include(nav, "/superadmin/trust-quality", "NavDock trust-quality route should remain");

  notInclude(superAdmin, "new route", "SuperAdminPanel must not add new route wording");
  notInclude(systemBand, "execute", "SystemModeSummaryBand must not expose execute wording");
  notInclude(systemBand, "settlement execute", "SystemModeSummaryBand must not expose settlement execute wording");
  notInclude(systemBand, "settlement", "SystemModeSummaryBand must not expose settlement wording");
  notInclude(systemBand, "ödemeyi başlat", "SystemModeSummaryBand must not expose start payment wording");
  notInclude(systemBand, "çalıştır", "SystemModeSummaryBand must not expose run wording");

  console.log("=== WEB-01B SUPERADMIN SYSTEM MODE SUMMARY CHECK ===");
  console.log("OK system mode summary band and superadmin placement are present");
  console.log("=== WEB-01B SUPERADMIN SYSTEM MODE SUMMARY CHECK PASS ===");
}

main();
