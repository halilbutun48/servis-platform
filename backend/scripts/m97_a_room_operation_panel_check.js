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

console.log("=== M97-A ROOM OPERATION PANEL CHECK ===");

const panel = read("../web/src/panels/room/OperationHealthPanel.jsx");
const board = read("../web/src/panels/room/roomOperationsBoard.jsx");
const packageJson = read("../backend/package.json");
const primer = read("../docs/PRIMER_SSOT.md");
const registry = read("../docs/MILESTONE_REGISTRY_V1.md");
const scriptMap = read("../docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
const state = read("../tools/repo_contract_state.json");

must(has(panel, "Oda Operasyon Paneli"), "room panel title is visible");
must(has(panel, "Room için görev, servis, sürücü, araç ve biniş değişikliği görünürlüğü"), "room panel subtitle is visible");
must(has(panel, "/api/reports/shifts/summary?from="), "room panel fetches shift summary");
must(has(panel, "/api/reports/vehicles/summary?from="), "room panel fetches vehicle summary");
must(has(panel, "/api/reports/drivers/summary?from="), "room panel fetches driver summary");
must(has(panel, "/api/drivers?take=200"), "room panel fetches room driver signals");
must(has(panel, "/api/requests?onlyOpen=1&onlyActive=1"), "room panel fetches open pickup requests");
must(has(panel, "RoomOperationsBoard"), "room panel mounts the room operations board");

must(has(board, "Oda Operasyon Özeti"), "room operations board headline exists");
must(has(board, "Bugünkü görevler"), "room operations board keeps today tasks");
must(has(board, "Aktif servisler"), "room operations board keeps active services");
must(has(board, "Sürücü durumu"), "room operations board keeps driver status");
must(has(board, "Araç durumu"), "room operations board keeps vehicle status");
must(has(board, "Müsait sürücüler"), "room operations board keeps available drivers");
must(has(board, "Moladaki sürücüler"), "room operations board keeps resting drivers");
must(has(board, "Yeni iş alabilir sürücüler"), "room operations board keeps ready-for-job drivers");
must(has(board, "Biniş değişiklikleri"), "room operations board keeps boarding changes");
must(has(board, "Riskli / Onay Bekleyen İstekler"), "room operations board keeps risky requests");
must(has(board, "Biniş Değişikliği Özeti"), "room operations board keeps boarding change summary");
must(has(board, "Mola ve uygunluk sayıları canlı sürücü, bağlantı ve görev sinyallerinden türetilir"), "room operations board explains derived availability");

must(has(packageJson, '"m97acheck": "node scripts/m97_a_room_operation_panel_check.js"'), "backend package exposes m97acheck");

must(has(primer, "M97-A room operation board"), "primer mentions M97-A room operation board");
must(has(registry, "M97-A - room operation board"), "milestone registry mentions M97-A room operation board");
must(has(scriptMap, "### M97-A"), "script map mentions M97-A");
must(has(scriptMap, "node backend\\scripts\\m97_a_room_operation_panel_check.js") || has(scriptMap, "node backend/scripts/m97_a_room_operation_panel_check.js"), "script map points to M97-A check");
must(has(state, '"M97-A"'), "repo contract state marks M97-A active");

console.log("M97-A room operation panel check passed");
