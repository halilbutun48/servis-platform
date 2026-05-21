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

function read(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), "utf8");
}
function ok(msg) { console.log(`OK ${msg}`); }
function fail(msg) { throw new Error(`FAIL ${msg}`); }

function main() {
console.log("\n=== M71 UI + CONTRACT HOTFIX CHECK ===");

const shifts = read("web/src/panels/company/ShiftsPanel.jsx");
if (includesText(shifts, 'const companyShiftsSectionsCompat = Boolean(CompanyFinalListSection);')) ok("ShiftsPanel keeps company final-list compatibility marker");
else fail("ShiftsPanel keeps company final-list compatibility marker");

if (includesText(shifts, 'if (trackTab === "market") return marketItems[0] || null;') &&
    includesText(shifts, 'if (trackTab === "pending") return pendingItems[0] || null;') &&
    includesText(shifts, 'return otherItems[0] || null;')) ok("ShiftsPanel picks tab-aware fallback rows safely");
else fail("ShiftsPanel picks tab-aware fallback rows safely");

const m67Contract = read("tools/check_m67_kurumsal_olcek_hazirlik_repo_contract.ps1");
if (includesText(m67Contract, 'company workflow summary helper exists') && includesText(m67Contract, '/api/company/overview/workflow-summary')) ok("M67 repo contract accepts M71 summary signals");
else fail("M67 repo contract accepts M71 summary signals");

  console.log("\nOK M71 UI + CONTRACT HOTFIX CHECK PASS");
}

try { main(); } catch (error) { console.error(error?.stack || String(error)); process.exit(1); }
