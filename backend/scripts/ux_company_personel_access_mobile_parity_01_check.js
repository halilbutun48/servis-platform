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

function must(text, needle, label) {
  if (normalize(text).includes(normalize(needle))) ok(label);
  else fail(label);
}

function mustTrue(cond, label) {
  if (cond) ok(label);
  else fail(label);
}

function mustNot(text, needle, label) {
  if (normalize(text).includes(normalize(needle))) fail(label);
  ok(label);
}

function gitLines(args) {
  const out = execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return String(out || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function mustEmptyGitDiff(args, label) {
  const lines = gitLines(args);
  if (lines.length) {
    throw new Error(`FAIL ${label}: ${lines.join(" | ")}`);
  }
  ok(label);
}

function stagedNames() {
  return gitLines(["diff", "--cached", "--name-only"]).map((line) => line.replace(/\\/g, "/"));
}

function mustNotList(files, needle, label) {
  if (files.some((file) => normalize(file).includes(normalize(needle)))) fail(label);
  ok(label);
}

function main() {
  console.log("=== UX-COMPANY-PERSONEL-ACCESS-MOBILE-PARITY-01 CHECK ===");

  const pkg = read("package.json");
  const app = read("web/src/App.jsx");
  const panel = read("web/src/panels/company/PersonelAccessPanel.jsx");
  const css = read("web/src/index.css");
  const doc = read("docs/UX_COMPANY_PERSONEL_ACCESS_MOBILE_PARITY_01.md");

  mustTrue(exists("backend/scripts/ux_company_personel_access_mobile_parity_01_check.js"), "script file exists");
  mustTrue(exists("docs/UX_COMPANY_PERSONEL_ACCESS_MOBILE_PARITY_01.md"), "doc file exists");

  must(pkg, '"check:uxcompanypersonelaccessmobileparity01": "node backend/scripts/ux_company_personel_access_mobile_parity_01_check.js"', "package.json exposes company personel access mobile check");
  must(app, 'if (path === "/company/personel-access") return { layout: true, node: <PersonelAccessPanel /> };', "app routes company personel access panel");
  must(app, 'if (path === "/organization/personel-access") return { layout: true, node: <PersonelAccessPanel /> };', "app routes organization personel access panel");

  must(panel, "Personel erişimi", "panel title exists");
  must(panel, "Personel erişimi oluştur", "panel create card exists");
  must(panel, "Erişim listesi", "panel access list exists");
  must(panel, "PersonelAccessMobileCards", "panel includes mobile card list");
  must(panel, "personelAccessLayout", "panel uses responsive layout class");
  must(panel, "personelAccessDesktopList", "panel keeps desktop list wrapper");
  must(panel, "personelAccessMobileCard", "panel keeps mobile card markup");
  must(panel, "Kullanıcı kodu", "panel keeps user code field");
  must(panel, "Geçerlilik", "panel keeps validity field");
  must(panel, "Oluşturuldu", "panel keeps created field");
  must(panel, "Ham PIN listede gösterilmez.", "panel keeps safe list boundary");
  must(panel, "İptal et", "panel keeps revoke action");
  must(panel, 'companyKind === "ORGANIZATION"', "panel keeps organization subtitle branch");
  mustNot(panel, 'gridTemplateColumns: "minmax(320px, 380px) minmax(0, 1fr)"', "panel removes inline two-column trap");
  mustNot(panel, 'gridTemplateColumns: "repeat(3, minmax(0, 1fr))"', "panel removes inline proof grid trap");

  must(css, ".personelAccessLayout", "css defines personel access layout");
  must(css, "grid-template-columns: minmax(320px, 380px) minmax(0, 1fr)", "css keeps desktop personel access split");
  must(css, ".personelAccessMobileCards", "css defines personel access mobile cards");
  must(css, ".personelAccessMobileCard", "css defines personel access mobile card");
  must(css, ".personelAccessDesktopList", "css defines desktop list wrapper");
  must(css, "scroll-margin-bottom: calc(220px + env(safe-area-inset-bottom))", "css keeps launcher clearance for mobile cards");
  must(css, "padding-bottom: calc(240px + env(safe-area-inset-bottom))", "css keeps mobile personel access bottom clearance");
  must(css, ".shellTopBrand .seferpaktLogoAsset", "css keeps authenticated shell brand clamp");
  must(css, "width: 124px !important", "css keeps compact authenticated shell logo width");
  must(css, ".shellTopBrand .seferpaktLogo", "css keeps compact authenticated shell logo gap");

  must(doc, "UX-COMPANY-PERSONEL-ACCESS-MOBILE-PARITY-01", "doc title exists");
  must(doc, "/company/personel-access", "doc mentions company route");
  must(doc, "/organization/personel-access", "doc mentions organization route");
  must(doc, "tek kolon", "doc explains mobile single column");
  must(doc, "Erişim listesi", "doc explains access list");
  must(doc, "Sefer Abi launcher", "doc keeps launcher clearance note");
  must(doc, "authenticated shell", "doc keeps authenticated shell note");
  must(doc, "desktop bozulmadı", "doc keeps desktop unchanged note");
  must(doc, "backend route/service/schema değişmiyor", "doc keeps backend boundary");
  must(doc, "Prisma/schema/migration yok", "doc keeps prisma boundary");
  must(doc, "runtime-data/browser-smoke", "doc keeps artifact boundary");
  must(doc, "brand/login", "doc keeps brand/login separation");
  must(doc, "Company Agreements", "doc acknowledges company agreements milestone separation");
  must(doc, "Görsel doğrulama", "doc keeps visual proof section");

  const staged = stagedNames();
  mustNotList(staged, "backend/artifacts/runtime-data/", "runtime-data stays out of staging");
  mustNotList(staged, "backend/artifacts/browser-smoke/", "browser-smoke stays out of staging");

  mustEmptyGitDiff(["diff", "--", "backend/src/routes"], "backend route diff stays empty");
  mustEmptyGitDiff(["diff", "--", "backend/src/services"], "backend service diff stays empty");
  mustEmptyGitDiff(["diff", "--", "prisma"], "prisma diff stays empty");
  mustEmptyGitDiff(["diff", "--", "backend/prisma"], "backend prisma diff stays empty");

  console.log("=== UX-COMPANY-PERSONEL-ACCESS-MOBILE-PARITY-01 CHECK PASS ===");
}

main();
