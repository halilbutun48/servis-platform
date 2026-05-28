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

console.log("=== PUBLIC-LANDING-PLATFORM-FIRST-01 CHECK ===");

const pkg = read("package.json");
const runner = read("backend/scripts/run_product_extensions_check_chain.js");
const verifyChain = read("backend/scripts/verify_chain_01_product_extensions_check.js");
const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
const primer = read("docs/PRIMER_SSOT.md");
const spec = read("docs/PROJECT_SPEC_V1.md");
const landingDocLegacy = read("docs/PUBLIC_LANDING_01.md");
const landingDoc = read("docs/PUBLIC_LANDING_PLATFORM_FIRST_01.md");
const harnessCheck = read("backend/scripts/script_harness_consolidation_01_check.js");
const harnessDoc = read("docs/SCRIPT_HARNESS_CONSOLIDATION_01.md");
const app = read("web/src/App.jsx");
const landing = read("web/src/panels/public/PublicLandingPage.jsx");

must(pkg, '"check:publiclandingplatformfirst01": "node backend/scripts/public_landing_platform_first_01_check.js"', "package.json exposes check:publiclandingplatformfirst01");
must(runner, "check:publiclandingplatformfirst01", "product extensions runner includes public landing platform-first check");
must(verifyChain, '"check:publiclandingplatformfirst01": "node backend/scripts/public_landing_platform_first_01_check.js"', "verify chain exposes public landing platform-first check");
ordered(
  runner,
  ["check:roadmaplockaimarketplace01", "check:publiclanding01", "check:publiclandingplatformfirst01", "check:leadcapture01", "check:onboardingreview01"],
  "public landing platform-first chain order follows public landing"
);

must(guide, "PUBLIC-LANDING-PLATFORM-FIRST-01", "script guide mentions public landing platform-first milestone");
must(guide, "check:publiclandingplatformfirst01", "script guide exposes public landing platform-first check");
must(guide, "node backend\\scripts\\public_landing_platform_first_01_check.js", "script guide includes public landing platform-first command");
must(guide, "PUBLIC-LANDING-01 -> PUBLIC-LANDING-PLATFORM-FIRST-01 -> LEAD-CAPTURE-01 -> ONBOARDING-REVIEW-01", "script guide keeps public lead order");

must(primer, "public vitrin copy'sinde ise SeferPakt platform-first anlatılır", "primer records platform-first landing guidance");
must(primer, "Sefer Abi ikincil operasyon copilot'u olarak konumlanır", "primer records secondary copilot position");
must(spec, "operasyon sinyallerini özetleyen opsiyonel yardımcı katmanıdır", "project spec records copilot helper position");

must(harnessCheck, "docs/PUBLIC_LANDING_PLATFORM_FIRST_01.md", "harness check source includes platform-first doc");
must(harnessCheck, "check:publiclandingplatformfirst01", "harness check source includes platform-first check");
must(harnessCheck, "PUBLIC-LANDING-PLATFORM-FIRST-01", "harness check source includes platform-first milestone");
must(harnessDoc, "public_landing_platform_first_01_check.js", "harness doc includes platform-first check");
must(harnessDoc, "docs/PUBLIC_LANDING_PLATFORM_FIRST_01.md", "harness doc registers platform-first doc");

must(landingDocLegacy, "PUBLIC-LANDING-PLATFORM-FIRST-01", "public landing doc references platform-first milestone");
must(landingDocLegacy, "Platform-first copy", "public landing doc keeps platform-first section");
must(landingDocLegacy, "Sefer Abi ikincil, opsiyonel operasyon copilot'u olarak anılır", "public landing doc keeps copilot note");
must(landingDocLegacy, "Public landing bir AI platformu değildir", "public landing doc states non-AI positioning");
must(landingDocLegacy, "PUBLIC-LANDING-01 -> PUBLIC-LANDING-PLATFORM-FIRST-01 -> LEAD-CAPTURE-01", "public landing doc keeps public lead order");

must(landingDoc, "PUBLIC-LANDING-PLATFORM-FIRST-01", "platform-first doc title present");
must(landingDoc, "Servis tedarikinden saha denetimine, sözleşmeden hakedişe tek kurumsal platform.", "platform-first doc hero title present");
must(landingDoc, "SeferPakt; servis taleplerini, tedarikçileri, sözleşmeleri, vardiyaları, canlı GPS takibini, kanıtları ve hakediş önizlemelerini tek yerde yönetir.", "platform-first doc alt copy present");
must(landingDoc, "Sefer Abi ise operasyonu anlamanıza ve riskleri erken görmenize yardımcı olan opsiyonel operasyon copilot'udur.", "platform-first doc copilot copy present");
must(landingDoc, "Sefer Abi genel amaçlı ChatGPT benzeri bir AI olarak sunulmaz.", "platform-first doc helper boundary present");
must(landingDoc, "Demo Talep Et", "platform-first doc keeps main CTA");
must(landingDoc, "Servis İhtiyacı Bildir", "platform-first doc keeps main CTA");
must(landingDoc, "Tedarikçi Başvurusu Yap", "platform-first doc keeps main CTA");
must(landingDoc, "Canlı Destek Talep Et", "platform-first doc keeps main CTA");
must(landingDoc, "SeferPakt bir AI platformu değildir", "platform-first doc states non-AI position");
must(landingDoc, "PUBLIC-LANDING-01", "platform-first doc references base landing milestone");
must(landingDoc, "LEAD-CAPTURE-01", "platform-first doc references lead capture milestone");
must(landingDoc, "Out-of-scope", "platform-first doc states out of scope");

must(app, 'if (cleanPath === "/landing" || cleanPath === "/public/landing") return { layout: false, node: <PublicLandingPage /> };', "public route preserved");
must(app, 'return { layout: false, node: <LoginCard /> };', "root login fallback preserved");

must(landing, "Servis tedarikinden saha denetimine, sözleşmeden hakedişe tek kurumsal platform", "landing hero is platform-first");
must(landing, "SeferPakt; servis taleplerini, tedarikçileri, sözleşmeleri, vardiyaları, canlı GPS takibini, kanıtları ve hakediş önizlemelerini tek yerde yönetir.", "landing explains core platform value");
must(landing, "Sefer Abi ise operasyonu anlamanıza ve riskleri erken görmenize yardımcı olan opsiyonel operasyon copilot'udur.", "landing positions Sefer Abi as optional copilot");
must(landing, "Kurumsal servis operasyon platformu", "landing shows platform-first pill");
must(landing, "Sefer Abi / Operasyon Copilot'u", "landing shows copilot helper card");
mustNot(landing, "Sefer Abi nasıl yardımcı olur?", "landing removes helper section heading");
must(landing, "Karar ve onay sizdedir.", "landing keeps human approval boundary");
must(landing, "Public CTA'lar demo, canlı destek, servis ihtiyacı ve tedarikçi başvurusu toplar. Başvurular kontrollü lead formuna düşer; otomatik hesap, otomatik davet ve ödeme akışı açılmaz.", "landing keeps CTA and lead boundary");
must(landing, "Başvurular ekip tarafından incelenir", "landing keeps review boundary");
must(landing, "Üyelik otomatik açılmaz", "landing keeps no-auto-membership boundary");
must(landing, "Ödeme / fatura / tahsilat yok", "landing keeps payment boundary");
must(landing, "Doğrulama sonrası davetli üyelik", "landing keeps invited-membership boundary");

mustNot(landing, "Sefer Abi AI", "landing no longer presents Sefer Abi as AI hero");
mustNot(landing, "ChatGPT", "landing avoids ChatGPT analogy");
mustNot(landing, "autopilot", "landing avoids autopilot wording");
mustNot(landing, "her şeyi Sefer Abi'ye bırak", "landing avoids handoff-to-Sefer-Abi wording");
mustNot(landing, "AI otomatik karar verir", "landing avoids automatic AI decision wording");
mustNot(landing, "AI operasyonu yönetir", "landing avoids AI runs operations wording");
mustNot(landing, "otomatik onay", "landing avoids auto-approval wording");
mustNot(landing, "otomatik sözleşme", "landing avoids auto-contract wording");
mustNot(landing, "otomatik tedarikçi doğrulama", "landing avoids auto-supplier-verification wording");
mustNot(landing, "otomatik ödeme", "landing avoids auto-payment wording");
mustNot(landing, "otomatik fatura", "landing avoids auto-invoice wording");
mustNot(landing, "Sefer Abi AI ne yapar?", "landing removes AI heading");

console.log("=== PUBLIC-LANDING-PLATFORM-FIRST-01 CHECK PASS ===");
