#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "../..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
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

function ok(label) {
  console.log(`OK ${label}`);
}

function fail(label) {
  throw new Error(`FAIL ${label}`);
}

function mustTrue(cond, label) {
  if (cond) ok(label);
  else fail(label);
}

function must(text, needle, label) {
  if (normalize(text).includes(normalize(needle))) ok(label);
  else fail(label);
}

function ordered(text, needles, label) {
  const haystack = normalize(text);
  let cursor = 0;
  for (const needle of needles) {
    const target = normalize(needle);
    const idx = haystack.indexOf(target, cursor);
    if (idx < 0) fail(`${label}: missing ${needle}`);
    cursor = idx + target.length;
  }
  ok(label);
}

async function main() {
  console.log("=== UX-COMPANY-AGREEMENTS-MOBILE-PARITY-01 CHECK ===");

  const pkg = read("package.json");
  const runner = read("backend/scripts/run_product_extensions_check_chain.js");
  const verify = read("backend/scripts/verify_chain_01_product_extensions_check.js");
  const harnessCheck = read("backend/scripts/script_harness_consolidation_01_check.js");
  const harnessDoc = read("docs/SCRIPT_HARNESS_CONSOLIDATION_01.md");
  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  const doc = read("docs/UX_COMPANY_AGREEMENTS_MOBILE_PARITY_01.md");
  const panel = read("web/src/panels/company/AgreementsPanel.jsx");
  const cards = read("web/src/panels/company/companyAgreementsMobileCards.jsx");
  const css = read("web/src/index.css");

  mustTrue(exists("backend/scripts/ux_company_agreements_mobile_parity_01_check.js"), "company agreements mobile parity check exists");
  mustTrue(exists("docs/UX_COMPANY_AGREEMENTS_MOBILE_PARITY_01.md"), "company agreements mobile parity doc exists");

  must(pkg, '"check:uxcompanyagreementsmobileparity01": "node backend/scripts/ux_company_agreements_mobile_parity_01_check.js"', "package.json exposes company agreements mobile parity check");
  ordered(
    runner,
    ["check:uxcompanymobileactionclarity01", "check:uxpremiumcriticalfixagreementsdetail01", "check:uxcompanyagreementsmobileparity01", "check:uxcompanyopspaneltabs01"],
    "product extensions runner keeps company agreements mobile parity after agreements detail and before company ops tabs"
  );
  ordered(
    verify,
    ["check:uxcompanymobileactionclarity01", "check:uxpremiumcriticalfixagreementsdetail01", "check:uxcompanyagreementsmobileparity01", "check:uxcompanyopspaneltabs01"],
    "verify chain keeps company agreements mobile parity after agreements detail and before company ops tabs"
  );

  must(harnessCheck, "UX-COMPANY-AGREEMENTS-MOBILE-PARITY-01", "script harness check knows company agreements mobile parity milestone");
  must(harnessCheck, "check:uxcompanyagreementsmobileparity01", "script harness check knows company agreements mobile parity alias");
  must(harnessCheck, "docs/UX_COMPANY_AGREEMENTS_MOBILE_PARITY_01.md", "script harness check knows company agreements mobile parity doc");
  must(harnessDoc, "UX-COMPANY-AGREEMENTS-MOBILE-PARITY-01", "script harness doc lists company agreements mobile parity milestone");
  must(harnessDoc, "check:uxcompanyagreementsmobileparity01", "script harness doc lists company agreements mobile parity alias");
  must(harnessDoc, "docs/UX_COMPANY_AGREEMENTS_MOBILE_PARITY_01.md", "script harness doc lists company agreements mobile parity doc");

  must(guide, "UX-COMPANY-AGREEMENTS-MOBILE-PARITY-01", "milestone guide mentions company agreements mobile parity milestone");
  must(guide, "check:uxcompanyagreementsmobileparity01", "milestone guide exposes company agreements mobile parity check");
  must(guide, "node backend\\scripts\\ux_company_agreements_mobile_parity_01_check.js", "milestone guide includes company agreements mobile parity command");
  must(guide, "docs/UX_COMPANY_AGREEMENTS_MOBILE_PARITY_01.md", "milestone guide includes company agreements mobile parity doc");

  must(doc, "UX-COMPANY-AGREEMENTS-MOBILE-PARITY-01", "company agreements mobile parity doc title present");
  must(doc, "Company / Sözleşmeler", "company agreements mobile parity doc covers company agreements surface");
  must(doc, "Room / Sözleşmeler", "company agreements mobile parity doc covers room reference surface");
  must(doc, "desktopShiftTable", "company agreements mobile parity doc keeps desktop table wording");
  must(doc, "mobileShiftCards", "company agreements mobile parity doc keeps mobile card wording");
  must(doc, "Sefer Abi launcher", "company agreements mobile parity doc keeps launcher wording");
  must(doc, "Backend route/write-path değişmedi.", "company agreements mobile parity doc keeps backend route boundary");
  must(doc, "Schema/migration yok.", "company agreements mobile parity doc keeps schema boundary");
  must(doc, "runtime-data", "company agreements mobile parity doc keeps runtime-data boundary");
  must(doc, "browser-smoke", "company agreements mobile parity doc keeps browser-smoke boundary");
  must(doc, "UX-FIX 0", "company agreements mobile parity doc keeps UX-FIX target");
  must(doc, "BLOCKER 0", "company agreements mobile parity doc keeps blocker target");
  must(doc, "NOT-FOUND 0", "company agreements mobile parity doc keeps not-found target");
  must(doc, "PASS-", "company agreements mobile parity doc keeps PASS-minus wording");
  must(doc, "Bu milestone yeni business flow eklemez.", "company agreements mobile parity doc keeps no-business-flow wording");

  must(panel, "CompanyAgreementsMobileCards", "company agreements panel wires mobile cards");
  must(panel, "desktopShiftTable companyAgreementsDesktopList", "company agreements panel keeps desktop table wrapper");
  must(cards, "CompanyAgreementMobileCard", "company agreements mobile cards file exports card");
  must(cards, "Teklif özeti", "company agreements mobile cards file keeps offer summary section");
  must(cards, "Vardiya durumu", "company agreements mobile cards file keeps shift status section");
  must(cards, "Ödeme / hakediş", "company agreements mobile cards file keeps payment section");
  must(cards, "Operasyon / uzatma", "company agreements mobile cards file keeps operation section");
  must(css, ".companyAgreementsMobileCards", "global css defines company agreements mobile cards");
  must(css, ".companyAgreementsDesktopList", "global css defines company agreements desktop list");
  must(css, ".companyAgreementsMobileCard", "global css defines company agreements mobile card");

  console.log("=== UX-COMPANY-AGREEMENTS-MOBILE-PARITY-01 PASS ===");
}

main().catch((err) => {
  console.error(err?.stack || String(err));
  process.exit(1);
});
