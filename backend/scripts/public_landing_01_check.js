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

function mustNot(text, needle, label) {
  if (!normalize(text).includes(normalize(needle))) ok(label);
  else fail(label);
}

function ordered(text, needles, label) {
  const haystack = normalize(text);
  let cursor = 0;
  for (const needle of needles) {
    const target = normalize(needle);
    const idx = haystack.indexOf(target, cursor);
    if (idx === -1) fail(`${label}: missing ${needle}`);
    if (idx < cursor) fail(`${label}: wrong order for ${needle}`);
    cursor = idx + target.length;
  }
  ok(label);
}

console.log("=== PUBLIC-LANDING-01 CHECK ===");

const pkg = read("package.json");
const runner = read("backend/scripts/run_product_extensions_check_chain.js");
const verifyChain = read("backend/scripts/verify_chain_01_product_extensions_check.js");
const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
const primer = read("docs/PRIMER_SSOT.md");
const spec = read("docs/PROJECT_SPEC_V1.md");
const landingDoc = read("docs/PUBLIC_LANDING_01.md");
const harnessCheck = read("backend/scripts/script_harness_consolidation_01_check.js");
const harnessDoc = read("docs/SCRIPT_HARNESS_CONSOLIDATION_01.md");
const app = read("web/src/App.jsx");
const landing = read("web/src/panels/public/PublicLandingPage.jsx");

must(pkg, '"check:publiclanding01": "node backend/scripts/public_landing_01_check.js"', "package.json exposes check:publiclanding01");
must(runner, "check:publiclanding01", "product extensions runner includes public landing check");
must(verifyChain, '"check:publiclanding01": "node backend/scripts/public_landing_01_check.js"', "verify chain exposes public landing check");
ordered(runner, ["check:roadmaplockaimarketplace01", "check:publiclanding01", "check:agreementsourceshiftlineage01"], "public landing chain order follows roadmap lock");

must(guide, "PUBLIC-LANDING-01", "script guide mentions public landing milestone");
must(guide, "check:publiclanding01", "script guide exposes public landing check");
must(guide, "route `/#/landing` public vitrin", "script guide documents public route");

must(primer, "PUBLIC-LANDING-01", "primer mentions public landing milestone");
must(primer, "route `/#/landing`", "primer records public landing route");
must(spec, "public landing / tanıtım yüzeyi", "project spec records public landing scope");

must(landingDoc, "Sayfa bölümleri", "public landing doc describes page sections");
must(landingDoc, "Public CTA sınırı", "public landing doc describes CTA boundary");
must(landingDoc, "Lisans ücreti yok.", "public landing doc keeps license-free copy");
must(landingDoc, "Sefer Abi AI copy", "public landing doc keeps Sefer Abi copy");
must(landingDoc, "Out-of-scope", "public landing doc states out of scope");

must(harnessCheck, "docs/PUBLIC_LANDING_01.md", "harness check source includes public landing doc");
must(harnessCheck, "check:publiclanding01", "harness check source includes public landing check");
must(harnessCheck, "PUBLIC-LANDING-01", "harness check source includes public landing milestone");

must(harnessDoc, "public_landing_01_check.js", "harness doc includes public landing check");

must(app, 'const PublicLandingPage = lazy(() => import("./panels/public/PublicLandingPage"));', "App lazy loads public landing page");
must(app, 'if (cleanPath === "/landing" || cleanPath === "/public/landing") return { layout: false, node: <PublicLandingPage /> };', "App routes anonymous users to public landing");
must(app, 'return { layout: false, node: <LoginCard /> };', "App keeps anonymous login fallback");
must(app, 'if (!token) {', "public landing stays in anonymous branch");

must(landing, "SeferPakt: Servis operasyonunu pazaryeri, kanıt ve Sefer Abi ile yöneten akıllı platform", "landing hero headline");
must(landing, "Lisans ücreti 0 TL", "landing states zero license fee");
must(landing, "Mevcut sözleşmeden pay yok", "landing states no share from existing contracts");
must(landing, "Readonly başarı payı", "landing mentions readonly success share");
must(landing, "Kritik işlemde kullanıcı onayı", "landing mentions approval gate");
must(landing, "Sefer Abi AI ne yapar?", "landing explains Sefer Abi AI");
must(landing, "Demo talep et", "landing exposes demo CTA");
must(landing, "Canlı destekle görüş", "landing exposes support CTA");
must(landing, "Servis ihtiyacımı anlat", "landing exposes need CTA");
must(landing, "Tedarikçi olarak başvur", "landing exposes supplier CTA");
must(landing, "E-posta istemcisini aç", "landing exposes email CTA");
must(landing, "Giriş yap", "landing exposes login CTA");
must(landing, "Bu sayfa otomatik lead backend açmaz.", "landing explains CTA boundary");
must(landing, "Otomatik üyelik, ödeme, fatura, tahsilat ve signup akışı bu milestone’da kapalıdır.", "landing explains out-of-scope execution");
must(landing, "Lisanssız modelde backend lead / üyelik / ödeme yok", "landing safety panel explains no backend lead");
mustNot(landing, "fetch(\"/api", "landing does not call backend APIs");
mustNot(landing, "onSubmit", "landing does not use submit handler");
mustNot(landing, "api/leads", "landing does not expose lead backend");
mustNot(landing, "payment/", "landing does not expose payment execution");
mustNot(landing, "invoice/", "landing does not expose invoice execution");
mustNot(landing, "settlement execute", "landing does not expose settlement execution");

console.log("=== PUBLIC-LANDING-01 CHECK PASS ===");
