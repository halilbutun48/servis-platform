
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
import fs from "fs"
import path from "path"
import { fileURLToPath } from "url"

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const repoRoot = path.resolve(__dirname, "../..")

function read(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), "utf8")
}

function ok(msg) {
  console.log(`OK ${msg}`)
}

function fail(msg) {
  console.error(`FAIL ${msg}`)
  process.exitCode = 1
}

function mustInclude(text, needle, label) {
  if (includesText(text, needle)) ok(label)
  else fail(label)
}

const service = read("backend/src/services/paymentBackbone.js")
const agreementsRoute = read("backend/src/routes/agreements.js")
const shiftsRoute = read("backend/src/routes/shifts/shared.js")
const companyAgreements = read("web/src/panels/company/AgreementsPanel.jsx")
const roomAgreements = read("web/src/panels/room/AgreementsPanel.jsx")
const companyShiftRows = read("web/src/panels/company/companyShiftsPanelRows.jsx")
const roomShiftRows = read("web/src/panels/room/roomShiftsPanelRows.jsx")
const summaryComponent = read("web/src/components/CommercialReadonlySummary.jsx")
const toolsReadme = read("tools/README.md")
const toolsPrimer = read("tools/PRIMER_SNAPSHOT.md")
const backlog = read("docs/NEXT_BACKLOG_V1.md")
const primer = read("docs/PRIMER_SSOT.md")
const registry = read("docs/MILESTONE_REGISTRY_V1.md")

mustInclude(service, "buildAgreementCommercialBackboneMap", "payment backbone service exposes agreement readonly map builder")
mustInclude(service, "buildShiftCommercialBackboneMap", "payment backbone service exposes shift readonly map builder")
mustInclude(agreementsRoute, "commercialBackbone", "agreements route attaches commercial backbone summary")
mustInclude(shiftsRoute, "commercialBackbone", "shifts route attaches commercial backbone summary")
mustInclude(summaryComponent, "Settlement hazırlığı", "readonly commercial summary renders settlement prep text")
mustInclude(summaryComponent, "Komisyon snapshot", "readonly commercial summary renders commission snapshot")
mustInclude(companyAgreements, "CommercialReadonlySummary", "company agreements surface renders readonly commercial summary")
mustInclude(roomAgreements, "CommercialReadonlySummary", "room agreements surface renders readonly commercial summary")
mustInclude(companyShiftRows, "CommercialReadonlySummary", "company shift rows render readonly commercial summary")
mustInclude(roomShiftRows, "CommercialReadonlySummary", "room shift rows render readonly commercial summary")
mustInclude(toolsReadme, "pack_m82_11_payment_readonly_surface.ps1", "tools readme lists M82.11 pack")
mustInclude(toolsPrimer, "M82.11", "tools primer lists M82.11")
mustInclude(backlog, "M82.11", "next backlog lists M82.11")
mustInclude(primer, "M82.11", "primer lists M82.11")
mustInclude(registry, "M82.11", "registry lists M82.11")

if (process.exitCode) process.exit(process.exitCode)
console.log("OK M82.11 payment readonly surface check passed")
