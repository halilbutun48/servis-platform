import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");


function normalizeText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[İI]/g, "i")
    .replace(/[ı]/g, "i")
    .replace(/[Şş]/g, "s")
    .replace(/[Ğğ]/g, "g")
    .replace(/[Üü]/g, "u")
    .replace(/[Öö]/g, "o")
    .replace(/[Çç]/g, "c")
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\\/g, "/")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
function includesText(text, needle) {
  return normalizeText(text).includes(normalizeText(needle));
}
function includesAnyText(text, needles) {
  return (needles || []).some((needle) => includesText(text, needle));
}

function banner(title) { console.log(`
=== ${title} ===`); }
function must(label, ok) { if (!ok) throw new Error(`FAIL ${label}`); console.log(`OK ${label}`); }
function read(rel) { return fs.readFileSync(path.join(repoRoot, rel), "utf8"); }
function exists(rel) { return fs.existsSync(path.join(repoRoot, rel)); }
function includesAny(text, needles) { return includesAnyText(text, needles); }

async function main() {
  banner("M66 OPERATION REASSIGNMENT CHECK");

  const requiredFiles = [
    "backend/scripts/m66check.js",
    "backend/src/routes/shifts/room.js",
    "backend/src/routes/shifts/shared.js",
    "web/src/components/ShiftReassignModal.jsx",
    "web/src/components/ShiftOperationEventsModal.jsx",
    "web/src/panels/room/ShiftsPanel.jsx",
    "web/src/panels/company/ShiftsPanel.jsx",
    "tools/pack_m66_operation_reassignment.ps1",
    "tools/check_m66_operation_reassignment_repo_contract.ps1",
    "docs/RUNBOOK_M66_OPERATION_REASSIGNMENT.md",
    "backend/package.json"
  ];

  console.log("INFO checking required M66 files");
  requiredFiles.forEach((rel) => must(`${rel} exists`, exists(rel)));

  const roomRoute = read("backend/src/routes/shifts/room.js");
  const roomReassignNotifications = read("backend/src/routes/shifts/roomReassignNotifications.js");
  const sharedRoute = read("backend/src/routes/shifts/shared.js");
  const roomPanel = read("web/src/panels/room/ShiftsPanel.jsx");
  const companyPanel = read("web/src/panels/company/ShiftsPanel.jsx");
  const reassignModal = read("web/src/components/ShiftReassignModal.jsx");
  const eventsModal = read("web/src/components/ShiftOperationEventsModal.jsx");
  const pkg = read("backend/package.json");
  const pack = read("tools/pack_m66_operation_reassignment.ps1");
  const runbook = read("docs/RUNBOOK_M66_OPERATION_REASSIGNMENT.md");

  console.log("INFO checking backend M66 route skeleton");
  must("room route exposes reassign endpoint", includesAny(roomRoute, ['"/:id/reassign"', "Only APPROVED/ACTIVE shifts can be reassigned"]));
  must("room route writes SHIFT_REASSIGN audit", includesAny(roomRoute + roomReassignNotifications, ["SHIFT_REASSIGN", 'action: "reassign"']));
  must("room route emits new and old driver handoff events", includesAny(roomRoute + roomReassignNotifications, ["reassign-removed", 'emit?.("route:plan"', 'emit?.("shift:update"']));
  must("shared route exposes operation-events endpoint", includesAny(sharedRoute, ['"/:id/operation-events"', 'SHIFT_REASSIGN']));

  console.log("INFO checking web M66 wiring");
  must("room panel renders reassign action", includesAny(roomPanel, ["Atamayı Değiştir", "ShiftReassignModal"]));
  must("room panel renders operation log action", includesAny(roomPanel, ["İşlem Kaydı", "ShiftOperationEventsModal"]));
  must("company panel renders operation log action", includesAny(companyPanel, ["Operasyon Kaydı", "ShiftOperationEventsModal"]));
  must("reassign modal explains package refresh", includesAny(reassignModal, ["Değişikliği Kaydet ve Paketi Yenile", "rota / görev paketi yenilenir"]));
  must("operation events modal maps reasons in Turkish", includesAny(eventsModal, ["Araç arızası", "Operasyon Akışı"]));

  console.log("INFO checking docs and pack wiring");
  must("backend package exposes m66check script", includesAny(pkg, ['"m66check": "node scripts/m66check.js"']));
  must("pack wires repo contract and m66check", includesAny(pack, ["check_m66_operation_reassignment_repo_contract.ps1", "backend/scripts/m66check.js", "PACK PASS OK"]));
  must("runbook documents operation reassignment flow", includesAny(runbook, ["operasyonel atama değişikliği", "Atamayı Değiştir", "Operasyon Kaydı", "yeni sürücü"]));

  console.log();
  console.log("OK M66 OPERATION REASSIGNMENT CHECK PASS");
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});
