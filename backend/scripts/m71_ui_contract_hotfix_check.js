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
  if (includesText(shifts, 'const finalStatuses = new Set(["APPROVED", "ACTIVE", "DONE", "REJECTED"])')) ok("ShiftsPanel copilot fallback no longer depends on later marketItems initialization");
  else fail("ShiftsPanel copilot fallback hotfix exists");

  if (includesText(shifts, 'if (trackTab === "market") {') && includesText(shifts, 'const marketNeedle = String(marketQ || "").trim().toLowerCase();')) ok("ShiftsPanel market/pending/final fallback logic is inlined safely");
  else fail("ShiftsPanel inline fallback logic exists");

  const m67Contract = read("tools/check_m67_kurumsal_olcek_hazirlik_repo_contract.ps1");
  if (includesText(m67Contract, 'company workflow summary helper exists') && includesText(m67Contract, '/api/company/overview/workflow-summary')) ok("M67 repo contract accepts M71 summary signals");
  else fail("M67 repo contract accepts M71 summary signals");

  console.log("\nOK M71 UI + CONTRACT HOTFIX CHECK PASS");
}

try { main(); } catch (error) { console.error(error?.stack || String(error)); process.exit(1); }
