import fs from "fs";
import path from "path";

const cwd = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
const repoRoot = fs.existsSync(path.join(cwd, "backend", "src")) ? cwd : path.resolve(cwd, "..");


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
const routePath = path.join(repoRoot, "backend", "src", "routes", "commercialCore.js");
const opsPath = path.join(repoRoot, "backend", "src", "ops", "settlementReconciliationDesk.js");

function fail(msg) {
  console.error(`FAIL ${msg}`);
  process.exit(1);
}
function ok(msg) {
  console.log(`OK ${msg}`);
}

const route = fs.readFileSync(routePath, "utf8");
const ops = fs.readFileSync(opsPath, "utf8");

if (!includesText(route, '/payment-backbone/reconciliation/status')) fail('reconciliation status route missing');
if (!includesText(route, '/payment-backbone/reconciliation/queue')) fail('reconciliation queue route missing');
if (!includesText(route, '/payment-backbone/reconciliation/records/upsert')) fail('reconciliation upsert route missing');
ok('commercial core reconciliation routes wired');

if (!includesText(ops, 'buildSettlementReconciliationStatus')) fail('status builder missing');
if (!includesText(ops, 'listSettlementReconciliationQueue')) fail('queue builder missing');
if (!includesText(ops, 'upsertSettlementReconciliationRecord')) fail('upsert function missing');
if (!includesText(ops, 'settlement-reconciliation-records.json')) fail('json store missing');
ok('settlement reconciliation desk ops wired');
