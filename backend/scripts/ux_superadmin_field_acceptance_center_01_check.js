#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const cwd = process.cwd();
const root = fs.existsSync(path.join(cwd, "backend", "src")) ? cwd : path.resolve(cwd, "..");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
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

function includes(text, needle) {
  return normalize(text).includes(normalize(needle));
}

function must(cond, label) {
  if (!cond) throw new Error(`FAIL ${label}`);
  console.log(`OK ${label}`);
}

function mustNot(cond, label) {
  if (cond) throw new Error(`FAIL ${label}`);
  console.log(`OK ${label}`);
}

function count(text, needle) {
  const src = String(text || "");
  const target = String(needle || "");
  if (!target) return 0;
  return src.split(target).length - 1;
}

console.log("=== UX SUPERADMIN FIELD ACCEPTANCE CENTER CHECK ===");

const pkg = read("package.json");
const runner = read("backend/scripts/run_product_extensions_check_chain.js");
const verify = read("backend/scripts/verify_chain_01_product_extensions_check.js");
const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
const audit = read("docs/UX_PANEL_STRUCTURE_02_AUDIT.md");
const context = read("docs/COPILOT_PANEL_CONTEXT_AUDIT_V1.md");
const panel = read("web/src/panels/superadmin/FieldAcceptanceCenter.jsx");

must(includes(pkg, '"check:uxsuperadminfieldacceptancecenter01": "node backend/scripts/ux_superadmin_field_acceptance_center_01_check.js"'), "package.json exposes check:uxsuperadminfieldacceptancecenter01");
must(includes(runner, "check:uxsuperadminfieldacceptancecenter01"), "product extensions runner references acceptance center check");
must(includes(verify, "check:uxsuperadminfieldacceptancecenter01"), "verify chain exposes acceptance center check");
must(includes(guide, "UX-SUPERADMIN-FIELD-ACCEPTANCE-CENTER-01"), "script guide mentions UX-SUPERADMIN-FIELD-ACCEPTANCE-CENTER-01");
must(includes(guide, "check:uxsuperadminfieldacceptancecenter01"), "script guide exposes check:uxsuperadminfieldacceptancecenter01");
must(includes(audit, "UX-SUPERADMIN-FIELD-ACCEPTANCE-CENTER-01"), "panel structure audit mentions acceptance center mapping");
must(includes(context, "UX-SUPERADMIN-FIELD-ACCEPTANCE-CENTER-01 note"), "copilot context audit mentions acceptance center note");

must(includes(panel, "Saha Kabul Merkezi"), "panel title exists");
must(includes(panel, "Canlı oturum mini bandı"), "live session mini band exists");
must(includes(panel, "Checklist mini durum"), "checklist mini summary exists");
must(includes(panel, "PanelSegmentTabs"), "panel uses PanelSegmentTabs");
must(includes(panel, "const [activeTab, setActiveTab] = useState(\"overview\")"), "activeTab defaults to overview");
must(includes(panel, "ariaLabel=\"Saha Kabul Merkezi sekmeleri\""), "tabs have accessible aria label");
must(includes(panel, "TabPanel active={activeTab === \"overview\"} label=\"Özet\""), "overview tab exists");
must(includes(panel, "TabPanel active={activeTab === \"manifest\"} label=\"Manifest\""), "manifest tab exists");
must(includes(panel, "TabPanel active={activeTab === \"decision\"} label=\"Karar Kaydı\""), "decision tab exists");
must(includes(panel, "TabPanel active={activeTab === \"session\"} label=\"Oturum Bilgisi\""), "session info tab exists");
must(includes(panel, "TabPanel active={activeTab === \"checklist\"} label=\"Checklist Güncelleme\""), "checklist tab exists");
must(includes(panel, "TabPanel active={activeTab === \"history\"} label=\"Geçmiş / Log\""), "history tab exists");
must(count(panel, "TabPanel active={activeTab ===") === 6, "panel has six functional TabPanel branches");
must(includes(panel, "Yeni oturum oluştur"), "create action preserved");
must(includes(panel, "Oturumu kaydet"), "save session action preserved");
must(includes(panel, "Yenile"), "refresh action preserved");
must(includes(panel, "Kararı kaydet"), "decision save action preserved");
must(includes(panel, "Checklist güncelleme"), "checklist update section preserved");
must(includes(panel, "Güncelleme:"), "checklist update rows preserved");
must(includes(panel, "Karar / oturum geçmişi"), "history / log panel preserved");
must(includes(panel, "Varsayılanlar / manifest: karar seçenekleri"), "manifest decision section preserved");
must(includes(panel, "Varsayılanlar / manifest: checklist özeti"), "manifest checklist section preserved");
must(includes(panel, "CurrentSession provenance"), "manifest provenance section preserved");
must(includes(panel, "Manifest kanıt türleri"), "manifest evidence types section preserved");
must(includes(panel, "Veri kaybı yok"), "inventory comment includes no data loss");
mustNot(includes(panel, "session-template"), "panel drops session-template endpoint language");
mustNot(includes(panel, "runtime-data"), "panel does not mention runtime-data");
mustNot(includes(panel, "prisma"), "panel does not mention prisma");
mustNot(includes(panel, "migration"), "panel does not mention migration");

console.log("UX SUPERADMIN FIELD ACCEPTANCE CENTER CHECK PASS");
