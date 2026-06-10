#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "../..");

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

function ok(label) {
  console.log(`OK ${label}`);
}

function fail(label) {
  throw new Error(`FAIL ${label}`);
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
    const index = haystack.indexOf(target, cursor);
    if (index === -1) fail(`${label}: missing ${needle}`);
    cursor = index + target.length;
  }
  ok(label);
}

function gitDiffNames(paths) {
  const args = ["diff", "--name-only", "--", ...paths];
  const out = execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return String(out || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function gitCachedNames() {
  const out = execFileSync("git", ["diff", "--cached", "--name-only"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return String(out || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function mustNoDiff(paths, label) {
  const files = gitDiffNames(paths);
  if (files.length > 0) {
    fail(`${label}: ${files.join(", ")}`);
  }
  ok(label);
}

function mustNoStagedPrefix(names, prefixes, label) {
  const hits = names.filter((name) => prefixes.some((prefix) => normalize(name).startsWith(normalize(prefix))));
  if (hits.length > 0) {
    fail(`${label}: ${hits.join(", ")}`);
  }
  ok(label);
}

function main() {
  console.log("=== UX-MARKETPLACE-PANELS-01 CHECK ===");

  const pkg = read("package.json");
  const runner = read("backend/scripts/run_product_extensions_check_chain.js");
  const verify = read("backend/scripts/verify_chain_01_product_extensions_check.js");
  const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
  const primer = read("docs/PRIMER_SSOT.md");
  const roadmap = read("docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md");
  const verifiedDoc = read("docs/VERIFIED_SUPPLIER_01.md");
  const doc = read("docs/UX_MARKETPLACE_PANELS_01.md");
  const harnessCheck = read("backend/scripts/script_harness_consolidation_01_check.js");
  const harnessDoc = read("docs/SCRIPT_HARNESS_CONSOLIDATION_01.md");
  const cachedNames = gitCachedNames();

  must(pkg, '"check:uxmarketplacepanels01": "node backend/scripts/ux_marketplace_panels_01_check.js"', "package.json exposes marketplace panels check");
  must(runner, "check:uxmarketplacepanels01", "product extensions runner includes marketplace panels check");
  must(verify, '"check:uxmarketplacepanels01": "node backend/scripts/ux_marketplace_panels_01_check.js"', "verify chain exposes marketplace panels check");
  ordered(runner, [
    "check:invitebasedmembership01",
    "check:verifiedsupplier01",
    "check:uxmarketplacepanels01",
    "check:productflowbuttonaudit01",
  ], "marketplace panels sits right after verified supplier");

  must(guide, "UX-MARKETPLACE-PANELS-01", "script guide mentions marketplace panels milestone");
  must(guide, "check:uxmarketplacepanels01", "script guide exposes marketplace panels check");
  must(guide, "node backend\\scripts\\ux_marketplace_panels_01_check.js", "script guide includes marketplace panels command");
  must(guide, "docs/UX_MARKETPLACE_PANELS_01.md", "script guide includes marketplace panels doc");
  ordered(guide, [
    "INVITE-BASED-MEMBERSHIP-01",
    "VERIFIED-SUPPLIER-01",
    "UX-MARKETPLACE-PANELS-01",
    "PRODUCT-FLOW-BUTTON-AUDIT-01",
  ], "script guide places marketplace panels after verified supplier");

  must(primer, "UX-MARKETPLACE-PANELS-01", "primer mentions marketplace panels milestone");
  must(primer, "docs/UX_MARKETPLACE_PANELS_01.md", "primer links marketplace panels doc");
  must(primer, "marketplace readiness center", "primer keeps marketplace readiness wording");

  must(roadmap, "Marketplace panels guard", "roadmap keeps marketplace panels guard section");
  must(roadmap, "UX-MARKETPLACE-PANELS-01", "roadmap keeps marketplace panels milestone");
  must(roadmap, "marketplace readiness center", "roadmap keeps marketplace readiness wording");
  must(roadmap, "Başvuru alındı", "roadmap keeps marketplace status vocabulary");
  must(roadmap, "Hazırla, İncele, Önizle, Onaya sun", "roadmap keeps human approval wording");
  must(roadmap, "Marketplace auto-selection yok", "roadmap excludes marketplace auto-selection");
  must(roadmap, "offer ranking", "roadmap excludes offer ranking");
  must(roadmap, "payment/billing", "roadmap excludes payment/billing");
  must(roadmap, "contract/agreement execute", "roadmap excludes contract execute");
  must(roadmap, "email/SMS/push", "roadmap excludes email/SMS/push");
  must(roadmap, "AI runtime action", "roadmap excludes AI runtime action");
  must(roadmap, "backend route/service/schema", "roadmap excludes backend route/service/schema");
  must(roadmap, "Prisma/schema/migration", "roadmap excludes Prisma/schema/migration");
  must(roadmap, "runtime-data/browser-smoke commit dışı", "roadmap keeps runtime-data/browser-smoke out of scope");
  must(roadmap, "docs/UX_MARKETPLACE_PANELS_01.md", "roadmap links marketplace panels doc");

  must(verifiedDoc, "UX-MARKETPLACE-PANELS-01", "verified supplier doc mentions marketplace panels milestone");
  ordered(verifiedDoc, [
    "INVITE-BASED-MEMBERSHIP-01",
    "VERIFIED-SUPPLIER-01",
    "UX-MARKETPLACE-PANELS-01",
    "PRODUCT-FLOW-BUTTON-AUDIT-01",
  ], "verified supplier doc keeps marketplace panels after verified supplier");

  must(doc, "# UX-MARKETPLACE-PANELS-01", "marketplace panels doc title present");
  must(doc, "marketplace readiness center", "marketplace panels doc keeps readiness center wording");
  must(doc, "Platform-first", "marketplace panels doc keeps platform-first wording");
  must(doc, "Status-first", "marketplace panels doc keeps status-first wording");
  must(doc, "Human approval", "marketplace panels doc keeps human approval wording");
  must(doc, "Hazırla, İncele, Önizle, Onaya sun", "marketplace panels doc keeps action wording");
  must(doc, "Başvuru alındı", "marketplace panels doc keeps status vocabulary");
  must(doc, "Doğrulandı", "marketplace panels doc keeps status vocabulary");
  must(doc, "Reddedildi", "marketplace panels doc keeps status vocabulary");
  must(doc, "Super Admin Marketplace Readiness / Supplier Review", "marketplace panels doc covers super admin readiness panel");
  must(doc, "Company Marketplace Preview", "marketplace panels doc covers company preview panel");
  must(doc, "Room / Supplier Readiness", "marketplace panels doc covers room readiness panel");
  must(doc, "Shared Marketplace Status Card", "marketplace panels doc covers shared status card");
  must(doc, "Marketplace auto-selection yok", "marketplace panels doc excludes auto selection");
  must(doc, "Offer ranking yok", "marketplace panels doc excludes offer ranking");
  must(doc, "Payment/billing yok", "marketplace panels doc excludes payment/billing");
  must(doc, "Contract/agreement execute yok", "marketplace panels doc excludes contract execute");
  must(doc, "Email/SMS/push yok", "marketplace panels doc excludes email/SMS/push");
  must(doc, "AI runtime action yok", "marketplace panels doc excludes AI runtime action");
  must(doc, "backend route/service/schema yok", "marketplace panels doc excludes backend route/service/schema");
  must(doc, "Prisma/schema/migration yok", "marketplace panels doc excludes Prisma/schema/migration");
  must(doc, "Runtime-data/browser-smoke commit dışı", "marketplace panels doc keeps runtime-data/browser-smoke out of scope");
  must(doc, "Yatay taşma olmamalı", "marketplace panels doc keeps mobile overflow boundary");
  must(doc, "Primary action görünür olmalı", "marketplace panels doc keeps primary action boundary");
  must(doc, "Desktop'ta gereksiz dar kolon olmamalı", "marketplace panels doc keeps desktop width boundary");
  must(doc, "Bu belge docs/check kilididir", "marketplace panels doc keeps docs/check lock wording");

  must(harnessCheck, "check:uxmarketplacepanels01", "script harness check knows marketplace panels alias");
  must(harnessCheck, "ux_marketplace_panels_01_check.js", "script harness check knows marketplace panels file");
  must(harnessCheck, "UX-MARKETPLACE-PANELS-01", "script harness check knows marketplace panels milestone");
  must(harnessDoc, "root:check:uxmarketplacepanels01", "script harness doc lists marketplace panels root check");
  must(harnessDoc, "ux_marketplace_panels_01_check.js", "script harness doc lists marketplace panels check");
  must(harnessDoc, "docs/UX_MARKETPLACE_PANELS_01.md", "script harness doc lists marketplace panels doc");
  must(harnessDoc, "UX-MARKETPLACE-PANELS-01", "script harness doc lists marketplace panels milestone");

  mustNoDiff(["backend/src/routes", "backend/src/services", "backend/prisma", "prisma"], "backend route/service/schema and Prisma diff stays empty");
  mustNoStagedPrefix(cachedNames, ["backend/artifacts/runtime-data/", "backend/artifacts/browser-smoke/"], "runtime-data and browser-smoke stay commit-external");

  console.log("=== UX-MARKETPLACE-PANELS-01 CHECK PASS ===");
}

try {
  main();
} catch (err) {
  console.error(err?.stack || String(err));
  process.exit(1);
}
