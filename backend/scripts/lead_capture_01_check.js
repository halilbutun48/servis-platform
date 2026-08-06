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

function isTracked(relPath) {
  try {
    execFileSync("git", ["ls-files", "--error-unmatch", relPath], {
      cwd: root,
      stdio: ["ignore", "ignore", "ignore"],
    });
    return true;
  } catch {
    return false;
  }
}

function gitStatus() {
  try {
    return execFileSync("git", ["status", "--short"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return "";
  }
}

console.log("=== LEAD-CAPTURE-01 CHECK ===");

const pkg = read("package.json");
const route = read("backend/src/routes/public.js");
const routeMounts = read("backend/src/bootstrap/routeMounts.js");
const server = read("backend/src/server.js");
const service = read("backend/src/services/publicLeadService.js");
const modal = read("web/src/components/public/PublicLeadCaptureModal.jsx");
const api = read("web/src/api.js");
const landing = read("web/src/panels/public/PublicLandingPage.jsx");
const app = read("web/src/App.jsx");
const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
const primer = read("docs/PRIMER_SSOT.md");
const spec = read("docs/PROJECT_SPEC_V1.md");
const publicLandingDoc = read("docs/PUBLIC_LANDING_01.md");
const leadDoc = read("docs/LEAD_CAPTURE_01.md");
const runner = read("backend/scripts/run_product_extensions_check_chain.js");
const verifyChain = read("backend/scripts/verify_chain_01_product_extensions_check.js");

must(pkg, '"check:leadcapture01": "node backend/scripts/lead_capture_01_check.js"', "package.json exposes check:leadcapture01");
must(runner, "check:leadcapture01", "product extensions runner includes lead capture check");
must(verifyChain, '"check:leadcapture01": "node backend/scripts/lead_capture_01_check.js"', "verify chain exposes lead capture check");
ordered(
  runner,
  ["check:roadmaplockaimarketplace01", "check:publiclanding01", "check:leadcapture01", "check:agreementsourceshiftlineage01"],
  "lead capture follows public landing in product chain"
);

must(route, '"/api/public/leads"', "public route mounts public lead endpoint");
must(route, "publicLeadsRouter", "public route exports public lead router");
must(route, "res.json(result)", "public lead endpoint returns JSON");
must(routeMounts, 'app.use("/api/public/leads"', "route mounts register public lead endpoint");
must(server, "publicLeadsRouter", "server wires public lead router");

must(service, 'createJsonFileStore("public-leads.json"', "lead service uses runtime JSON store");
must(service, "DEMO_REQUEST", "lead service lists demo type");
must(service, "LIVE_SUPPORT_REQUEST", "lead service lists support type");
must(service, "SERVICE_NEED", "lead service lists service need type");
must(service, "SUPPLIER_APPLICATION", "lead service lists supplier type");
must(service, "KVKK onayı gerekli.", "lead service requires KVKK");
must(service, "Telefon veya e-posta alanından en az biri gerekli.", "lead service requires phone or email");
must(service, "Başvurunuz doğrulanamadı.", "lead service has honeypot guard");
must(service, "Biraz sonra tekrar deneyin.", "lead service has rate limit guard");
must(service, 'source: "PUBLIC_LANDING"', "lead service records public landing source");
must(service, 'status: "RECEIVED"', "lead service records received status");
must(service, "ipMasked", "lead service records masked ip");
must(service, "userAgentSummary", "lead service records user agent summary");
must(service, "normalizeSubmission", "lead service normalizes submissions");
must(service, "cleanText", "lead service sanitizes text");
must(service, "cleanPhone", "lead service validates phone");
must(service, "cleanEmail", "lead service validates email");

must(modal, "PublicLeadCaptureModal", "modal component exists");
must(modal, "Başvuru formu", "modal shows application form");
must(modal, "KVKK aydınlatma metnini okudum ve onaylıyorum.", "modal requires KVKK checkbox");
must(modal, "İletişim izni veriyorum. Bu izin zorunlu değildir.", "modal keeps contact permission optional");
must(modal, "Başvurunuz alındı. Ekibimiz inceleme sonrası sizinle iletişime geçecek.", "modal shows success message");
must(modal, "Üyelik otomatik açılmaz. Ödeme / fatura / tahsilat bu form üzerinden başlatılmaz.", "modal shows safe boundary after submit");
must(modal, "Doğrulama sonrası davetli üyelik açılır.", "modal shows supplier boundary copy");
must(modal, "Personel/öğrenci listesi sonra paylaşılacak.", "modal shows service need hint");
must(modal, "submitPublicLead(buildPayload(form))", "modal submits through api helper");
must(modal, "website", "modal includes honeypot field");
must(modal, "busy || success", "modal blocks repeat submit after success");

must(api, 'export async function submitPublicLead(payload = {})', "api exposes lead helper");
must(api, '"/api/public/leads"', "api helper points at public lead endpoint");

must(landing, "PublicLeadCaptureModal", "landing wires lead capture modal");
must(landing, "Demo talep et", "landing exposes demo CTA");
must(landing, "Canlı destekle görüş", "landing exposes support CTA");
must(landing, "Servis ihtiyacımı anlat", "landing exposes need CTA");
must(landing, "Tedarikçi olarak başvur", "landing exposes supplier CTA");
must(landing, "Başvurular ekip tarafından incelenir", "landing says team reviews applications");
must(landing, "Üyelik otomatik açılmaz", "landing says no auto membership");
must(landing, "Ödeme / fatura / tahsilat yok", "landing keeps payment boundary");
must(landing, "Doğrulama sonrası davetli üyelik", "landing mentions invited membership boundary");
must(landing, "Başvuru formunu aç", "landing opens the form");
must(landing, "Başvurular kontrollü lead formuna düşer", "landing describes controlled lead intake");
mustNot(landing, "mailto:", "landing does not expose mailto");
mustNot(landing, "E-posta istemcisini aç", "landing does not expose email client CTA");
mustNot(landing, "activeMailto", "landing does not keep mailto helper");
mustNot(landing, "buildMailto", "landing does not keep mailto builder");
mustNot(landing, "Bu sayfa otomatik lead backend açmaz.", "landing no longer uses old boundary copy");

must(app, 'if (cleanPath === "/landing" || cleanPath === "/public/landing") return { layout: false, node: <PublicLandingPage /> };', "App keeps public landing route");
must(app, 'return { layout: false, node: <LoginCard /> };', "App keeps login fallback route");

must(guide, "LEAD-CAPTURE-01", "script guide mentions lead capture milestone");
must(guide, "check:leadcapture01", "script guide exposes lead capture check");
must(guide, "node backend\\scripts\\lead_capture_01_check.js", "script guide includes lead capture command");

must(primer, "LEAD-CAPTURE-01", "primer mentions lead capture milestone");
must(primer, "kontrollü lead", "primer records controlled lead copy");
must(spec, "kontrollü lead toplama", "project spec records controlled lead capture");

must(publicLandingDoc, "kontrollü lead", "public landing doc mentions controlled lead");
must(publicLandingDoc, "LEAD-CAPTURE-01", "public landing doc references lead capture milestone");

must(leadDoc, "Public CTA -> lead form akışı", "lead capture doc describes CTA flow");
must(leadDoc, "DEMO_REQUEST", "lead capture doc lists lead types");
must(leadDoc, "KVKK", "lead capture doc covers KVKK");
must(leadDoc, "public-leads.json", "lead capture doc covers storage");
must(leadDoc, "Out-of-scope", "lead capture doc states out of scope");
must(leadDoc, "self-service signup", "lead capture doc excludes self-service signup");

if (isTracked("backend/artifacts/runtime-data/public-leads.json")) {
  fail("runtime lead artifact is not tracked");
}

console.log("=== LEAD-CAPTURE-01 CHECK PASS ===");
