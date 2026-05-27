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
const leadDoc = read("docs/LEAD_CAPTURE_01.md");
const harnessCheck = read("backend/scripts/script_harness_consolidation_01_check.js");
const harnessDoc = read("docs/SCRIPT_HARNESS_CONSOLIDATION_01.md");
const app = read("web/src/App.jsx");
const landing = read("web/src/panels/public/PublicLandingPage.jsx");

must(pkg, '"check:publiclanding01": "node backend/scripts/public_landing_01_check.js"', "package.json exposes check:publiclanding01");
must(pkg, '"check:leadcapture01": "node backend/scripts/lead_capture_01_check.js"', "package.json exposes check:leadcapture01");
must(runner, "check:publiclanding01", "product extensions runner includes public landing check");
must(runner, "check:leadcapture01", "product extensions runner includes lead capture check");
must(verifyChain, '"check:publiclanding01": "node backend/scripts/public_landing_01_check.js"', "verify chain exposes public landing check");
must(verifyChain, '"check:leadcapture01": "node backend/scripts/lead_capture_01_check.js"', "verify chain exposes lead capture check");
ordered(
  runner,
  ["check:roadmaplockaimarketplace01", "check:publiclanding01", "check:leadcapture01", "check:agreementsourceshiftlineage01"],
  "public landing chain order follows roadmap lock"
);

must(guide, "PUBLIC-LANDING-01", "script guide mentions public landing milestone");
must(guide, "LEAD-CAPTURE-01", "script guide mentions lead capture milestone");
must(guide, "check:publiclanding01", "script guide exposes public landing check");
must(guide, "check:leadcapture01", "script guide exposes lead capture check");
must(guide, "route `/#/landing` public vitrin", "script guide documents public route");
must(guide, "node backend\\scripts\\lead_capture_01_check.js", "script guide includes lead capture command");

must(primer, "PUBLIC-LANDING-01", "primer mentions public landing milestone");
must(primer, "LEAD-CAPTURE-01", "primer mentions lead capture milestone");
must(primer, "route `/#/landing`", "primer records public landing route");
must(primer, "kontrollü lead", "primer records controlled lead copy");

must(spec, "kontrollü lead toplama", "project spec records controlled lead capture");

must(landingDoc, "Başvuru CTA alanı", "public landing doc describes CTA area");
must(landingDoc, "kontrollü lead", "public landing doc describes controlled lead flow");
must(landingDoc, "LEAD-CAPTURE-01", "public landing doc references lead capture milestone");
must(landingDoc, "Başvurular ekip tarafından incelenir", "public landing doc keeps review boundary");
must(landingDoc, "Üyelik otomatik açılmaz", "public landing doc keeps no-auto-membership boundary");

must(leadDoc, "Amaç", "lead capture doc includes purpose");
must(leadDoc, "Public CTA -> lead form akışı", "lead capture doc describes CTA flow");
must(leadDoc, "DEMO_REQUEST", "lead capture doc lists lead types");
must(leadDoc, "KVKK", "lead capture doc covers KVKK");
must(leadDoc, "public-leads.json", "lead capture doc covers storage");
must(leadDoc, "Out-of-scope", "lead capture doc states out of scope");
must(leadDoc, "self-service signup", "lead capture doc excludes self-service signup");

must(harnessCheck, "docs/PUBLIC_LANDING_01.md", "harness check source includes public landing doc");
must(harnessCheck, "docs/LEAD_CAPTURE_01.md", "harness check source includes lead capture doc");
must(harnessCheck, "check:publiclanding01", "harness check source includes public landing check");
must(harnessCheck, "check:leadcapture01", "harness check source includes lead capture check");
must(harnessCheck, "PUBLIC-LANDING-01", "harness check source includes public landing milestone");
must(harnessCheck, "LEAD-CAPTURE-01", "harness check source includes lead capture milestone");

must(harnessDoc, "public_landing_01_check.js", "harness doc includes public landing check");
must(harnessDoc, "lead_capture_01_check.js", "harness doc includes lead capture check");

must(app, 'const PublicLandingPage = lazy(() => import("./panels/public/PublicLandingPage"));', "App lazy loads public landing page");
must(app, 'if (cleanPath === "/landing" || cleanPath === "/public/landing") return { layout: false, node: <PublicLandingPage /> };', "App routes anonymous users to public landing");
must(app, 'return { layout: false, node: <LoginCard /> };', "App keeps anonymous login fallback");
must(app, 'if (!token) {', "public landing stays in anonymous branch");

must(landing, "PublicLeadCaptureModal", "landing wires lead capture modal");
must(landing, "Demo talep et", "landing exposes demo CTA");
must(landing, "Canlı destekle görüş", "landing exposes support CTA");
must(landing, "Servis ihtiyacımı anlat", "landing exposes need CTA");
must(landing, "Tedarikçi olarak başvur", "landing exposes supplier CTA");
must(landing, "Başvurular ekip tarafından incelenir", "landing says applications are reviewed by team");
must(landing, "Üyelik otomatik açılmaz", "landing says no automatic membership");
must(landing, "Ödeme / fatura / tahsilat yok", "landing keeps payment boundary");
must(landing, "Doğrulama sonrası davetli üyelik", "landing mentions invited membership boundary");
must(landing, "Başvuru formunu aç", "landing opens lead form");
must(landing, "Public güven sınırları", "landing shows safety boundary card");
must(landing, "Güvenli başvuru", "landing shows safe application copy");
must(landing, "Başvurular kontrollü lead formuna düşer", "landing explains controlled lead intake");
mustNot(landing, "mailto:", "landing does not expose mailto");
mustNot(landing, "E-posta istemcisini aç", "landing does not expose email client CTA");
mustNot(landing, "activeMailto", "landing does not keep mailto helper");
mustNot(landing, "buildMailto", "landing does not keep mailto builder");
mustNot(landing, "Bu sayfa otomatik lead backend açmaz.", "landing no longer uses old boundary copy");
mustNot(landing, "fetch(\"/api", "landing does not call backend APIs directly");

console.log("=== PUBLIC-LANDING-01 CHECK PASS ===");
