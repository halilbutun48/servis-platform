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
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/Ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/Ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/Ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/Ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/Ç/g, 'c')
    .normalize('NFD')
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

console.log("=== M97 CHECK-IN PANEL INTEGRATION CHECK ===");

const app = read("../web/src/App.jsx");
const navDock = read("../web/src/layout/NavDock.jsx");
const quickBar = read("../web/src/components/TabletOpsQuickBar.jsx");
const superAdmin = read("../web/src/panels/superadmin/SuperAdminPanel.jsx");
const screenRegistry = read("../web/src/copilot/screenRegistry.js");
const overlay = read("../docs/overlays/STEP06/OVERLAY_NOTES_M97_CHECKIN_NAV_RESTORE_2026-03-09.md");

must(has(app, 'path === "/room/checkin"'), "app keeps room check-in route");
must(has(app, 'path === "/company/checkin"'), "app keeps company check-in route");
must(has(app, 'path === "/school/checkin"'), "app keeps school check-in route");
must(has(app, 'path === "/organization/checkin"'), "app keeps organization check-in route");
must(has(app, 'path === "/driver/checkin"'), "app keeps driver check-in route");

must(has(navDock, 'advanced.push({ label: "Check-in", path: "/room/checkin" });'), "nav dock keeps room check-in under advanced");
must(has(navDock, 'advanced.push({ label: "Check-in", path: base + "/checkin" });'), "nav dock keeps company/school/organization check-in under advanced");

must(has(quickBar, '{ label: "Check-in", path: "/room/checkin" }'), "tablet quick bar keeps room check-in shortcut");

must(has(superAdmin, 'navigate("/room/checkin")'), "super admin quick access opens room check-in monitor");
must(has(superAdmin, 'Check-in'), "super admin quick access keeps check-in label");

must(has(screenRegistry, '{ id: 1109, path: "/room/checkin", label: "Check-in" }'), "copilot registry keeps room check-in");
must(has(screenRegistry, '{ id: 2107, path: "/company/checkin", label: "Check-in" }'), "copilot registry keeps company check-in");
must(has(screenRegistry, '{ id: 2207, path: "/school/checkin", label: "Check-in" }'), "copilot registry keeps school check-in");
must(has(screenRegistry, '{ id: 2308, path: "/organization/checkin", label: "Check-in" }'), "copilot registry keeps organization check-in");
must(has(screenRegistry, '{ id: 3104, path: "/driver/checkin", label: "Check-in" }'), "copilot registry keeps driver check-in");

must(has(overlay, "M97 Check-in nav restore"), "m97 overlay note exists");

console.log("M97 check-in panel integration check passed");
