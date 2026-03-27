import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");

function read(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), "utf8");
}
function ok(msg) { console.log(`OK ${msg}`); }
function fail(msg) { throw new Error(`FAIL ${msg}`); }

function main() {
  console.log("\n=== M71 UI + CONTRACT HOTFIX CHECK ===");

  const shifts = read("web/src/panels/company/ShiftsPanel.jsx");
  if (shifts.includes('const finalStatuses = new Set(["APPROVED", "ACTIVE", "DONE", "REJECTED"])')) ok("ShiftsPanel copilot fallback no longer depends on later marketItems initialization");
  else fail("ShiftsPanel copilot fallback hotfix exists");

  if (shifts.includes('if (trackTab === "market") {') && shifts.includes('const marketNeedle = String(marketQ || "").trim().toLowerCase();')) ok("ShiftsPanel market/pending/final fallback logic is inlined safely");
  else fail("ShiftsPanel inline fallback logic exists");

  const m67Contract = read("tools/check_m67_kurumsal_olcek_hazirlik_repo_contract.ps1");
  if (m67Contract.includes('company workflow summary helper exists') && m67Contract.includes('/api/company/overview/workflow-summary')) ok("M67 repo contract accepts M71 summary signals");
  else fail("M67 repo contract accepts M71 summary signals");

  console.log("\nOK M71 UI + CONTRACT HOTFIX CHECK PASS");
}

try { main(); } catch (error) { console.error(error?.stack || String(error)); process.exit(1); }
