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

function mustNoDiff(paths, label) {
  const files = gitDiffNames(paths);
  if (files.length > 0) {
    fail(`${label}: ${files.join(", ")}`);
  }
  ok(label);
}

console.log("=== PUBLIC-LANDING-01 FINAL PROMISE CHECK ===");

const pkg = read("package.json");
const runner = read("backend/scripts/run_product_extensions_check_chain.js");
const verifyChain = read("backend/scripts/verify_chain_01_product_extensions_check.js");
const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
const primer = read("docs/PRIMER_SSOT.md");
const roadmap = read("docs/ROADMAP_LOCK_AI_MARKETPLACE_01.md");
const spec = read("docs/PROJECT_SPEC_V1.md");
const publicLandingDoc = read("docs/PUBLIC_LANDING_01.md");
const platformFirstDoc = read("docs/PUBLIC_LANDING_PLATFORM_FIRST_01.md");
const finalPromiseDoc = read("docs/PUBLIC_LANDING_01_FINAL_PROMISE_CHECK.md");
const harnessCheck = read("backend/scripts/script_harness_consolidation_01_check.js");
const harnessDoc = read("docs/SCRIPT_HARNESS_CONSOLIDATION_01.md");
const landing = read("web/src/panels/public/PublicLandingPage.jsx");
const app = read("web/src/App.jsx");

must(pkg, '"check:publiclandingfinalpromise01": "node backend/scripts/public_landing_final_promise_01_check.js"', "package.json exposes check:publiclandingfinalpromise01");
must(runner, "check:publiclandingfinalpromise01", "product extensions runner includes public landing final promise check");
must(verifyChain, '"check:publiclandingfinalpromise01": "node backend/scripts/public_landing_final_promise_01_check.js"', "verify chain exposes public landing final promise check");
ordered(
  runner,
  [
    "check:roadmaplockaimarketplace01",
    "check:publiclanding01",
    "check:publiclandingplatformfirst01",
    "check:publiclandingfinalpromise01",
    "check:leadcapture01",
    "check:onboardingreview01",
    "check:productflowbuttonaudit01",
  ],
  "public landing final promise stays before lead capture and onboarding review"
);

must(guide, "PUBLIC-LANDING-01 FINAL PROMISE CHECK", "script guide mentions public landing final promise milestone");
must(guide, "check:publiclandingfinalpromise01", "script guide exposes public landing final promise check");
must(guide, "node backend\\scripts\\public_landing_final_promise_01_check.js", "script guide includes public landing final promise command");
must(guide, "PUBLIC-LANDING-01 -> PUBLIC-LANDING-PLATFORM-FIRST-01 -> PUBLIC-LANDING-01 FINAL PROMISE CHECK -> LEAD-CAPTURE-01 -> ONBOARDING-REVIEW-01", "script guide keeps public lead order");
must(guide, "docs/PUBLIC_LANDING_01_FINAL_PROMISE_CHECK.md", "script guide includes public landing final promise doc");

must(primer, "PUBLIC-LANDING-01 final promise check", "primer mentions public landing final promise milestone");
must(primer, "docs/PUBLIC_LANDING_01_FINAL_PROMISE_CHECK.md", "primer links public landing final promise doc");

must(roadmap, "AI Promise Strategy / Güven Stratejisi", "roadmap lock keeps trust strategy section");
must(roadmap, "Public marketing claim guard", "roadmap lock keeps public marketing claim guard");

must(spec, "public landing / tanıtım yüzeyi ve kontrollü lead toplama", "project spec records public landing lead boundary");
must(spec, "Sefer Abi rol bazlıdır, sesli destek verebilir ve kritik işlemleri kullanıcı onayı olmadan yapmaz.", "project spec records approval boundary");
must(spec, "public landing ve public vitrin anlatımı ise platform-first kalır ve Sefer Abi ikincil yardımcı katman olarak görünür.", "project spec records platform-first positioning");

must(publicLandingDoc, "Başvuru CTA alanı", "public landing doc describes CTA area");
must(publicLandingDoc, "kontrollü lead", "public landing doc describes controlled lead flow");
must(publicLandingDoc, "LEAD-CAPTURE-01", "public landing doc references lead capture milestone");
must(publicLandingDoc, "Başvurular ekip tarafından incelenir", "public landing doc keeps review boundary");
must(publicLandingDoc, "Üyelik otomatik açılmaz", "public landing doc keeps no-auto-membership boundary");

must(platformFirstDoc, "SeferPakt, ana ürün olarak kurumsal servis operasyon ve tedarik platformu şeklinde anlatılır.", "platform-first doc keeps main product positioning");
must(platformFirstDoc, "Sefer Abi genel amaçlı ChatGPT benzeri bir AI olarak sunulmaz.", "platform-first doc keeps AI boundary");
must(platformFirstDoc, "SeferPakt bir AI platformu değildir", "platform-first doc keeps non-AI positioning");
must(platformFirstDoc, "Sefer Abi ise opsiyonel operasyon copilot’u olarak kalır; ana ürün akışının yerine geçmez.", "platform-first doc keeps secondary copilot positioning");

must(finalPromiseDoc, "PUBLIC-LANDING-01 FINAL PROMISE CHECK", "final promise doc title present");
must(finalPromiseDoc, "Underpromise, overdeliver", "final promise doc contains underpromise overdeliver principle");
must(finalPromiseDoc, "güven stratejisi", "final promise doc contains trust strategy wording");
must(finalPromiseDoc, "kanıtlanmış kabiliyet", "final promise doc contains proven capability wording");
must(finalPromiseDoc, "public vaat", "final promise doc contains public promise wording");
must(finalPromiseDoc, "maksimum güçlü operasyon AI", "final promise doc contains maximum strong operations AI wording");
must(finalPromiseDoc, "human approval", "final promise doc contains human approval wording");
must(finalPromiseDoc, "guard", "final promise doc contains guard wording");
must(finalPromiseDoc, "audit log", "final promise doc contains audit log wording");
must(finalPromiseDoc, "premium ve ikincil operasyon copilot'u", "final promise doc keeps premium secondary copilot positioning");
must(finalPromiseDoc, "Sefer Abi içeride daha fazlasını yaparsa bu güveni artırır.", "final promise doc contains overdeliver trust sentence");
must(finalPromiseDoc, "Sefer Abi operasyon risklerini erken görünür kılar.", "final promise doc contains allowed marketing line");
must(finalPromiseDoc, "Sefer Abi teklif, rota, vardiya ve saha sinyallerini analiz ederek en doğru seçenekleri hazırlar.", "final promise doc contains allowed analysis line");
must(finalPromiseDoc, "Kritik aksiyonlar insan onayıyla güvenli şekilde ilerler.", "final promise doc contains allowed critical action line");
must(finalPromiseDoc, "Sefer Abi kullanıcıya karar desteği sunar ve onaylanan adımları guard'lı şekilde hazırlar.", "final promise doc contains allowed decision support line");
must(finalPromiseDoc, "Kullanılabilir:", "final promise doc lists allowed copy");
must(finalPromiseDoc, "Kullanılmayacak:", "final promise doc lists blocked copy");
must(finalPromiseDoc, "Her şeyi yapay zekâ yapar.", "final promise doc blocks overclaim copy");
must(finalPromiseDoc, "AI otomatik tedarikçi seçer.", "final promise doc blocks auto supplier copy");
must(finalPromiseDoc, "AI otomatik ödeme/sözleşme kesinleştirir.", "final promise doc blocks auto payment/contract copy");
must(finalPromiseDoc, "Excel'i yükleyin, tüm operasyon kendiliğinden biter.", "final promise doc blocks autopilot copy");
must(finalPromiseDoc, "SeferPakt AI kabiliyetlerini pazarlarken abartılı ve kanıtlanmamış otomasyon iddiaları kurmaz.", "final promise doc keeps claim discipline");
must(finalPromiseDoc, "Kullanıcıya vaat edilen şey, ürünün kesin olarak yaptığı, testle kanıtlanmış ve milestone, check, smoke, acceptance ile kanıtlanmış kabiliyetlerden oluşur.", "final promise doc keeps evidence requirement");
must(finalPromiseDoc, "Ürün, vaat ettiğinden fazlasını güvenli şekilde yaparak kullanıcı güvenini artırmayı hedefler.", "final promise doc keeps overdeliver goal");
must(finalPromiseDoc, "Tüm kritik işlemler human approval, guard ve audit log ile ilerleyecek.", "final promise doc keeps critical operation guardrail");
must(finalPromiseDoc, "AI runtime capability ekleme", "final promise doc excludes runtime capability work");
must(finalPromiseDoc, "UI feature ekleme", "final promise doc excludes UI feature work");
must(finalPromiseDoc, "backend route/service/schema değiştirme", "final promise doc excludes backend changes");
must(finalPromiseDoc, "Prisma/migration değiştirme", "final promise doc excludes prisma changes");
must(finalPromiseDoc, "marketing sayfasını değiştirme", "final promise doc excludes marketing page change");

must(landing, "Sefer Abi ise operasyonu anlamanıza ve riskleri erken görmenize yardımcı olan opsiyonel operasyon copilot'udur.", "landing keeps secondary copilot copy");
must(landing, "Karar ve onay sizdedir.", "landing keeps human approval boundary");
must(landing, "Public CTA'lar demo, canlı destek, servis ihtiyacı ve tedarikçi başvurusu toplar. Başvurular kontrollü lead formuna düşer; otomatik hesap, otomatik davet ve ödeme akışı açılmaz.", "landing keeps controlled lead boundary");
must(landing, "Sefer Abi otomatik işlem yapar mı?", "landing keeps FAQ boundary");
must(landing, "Sefer Abi opsiyonel operasyon copilot'udur; sinyalleri özetler, riskleri açıklar ve sonraki adımı önerir.", "landing keeps safe FAQ copy");
must(landing, "Kritik işlemler kullanıcı onayı olmadan yapılmaz.", "landing keeps critical action boundary");
must(landing, "Başvurular ekip tarafından incelenir", "landing keeps review boundary");
must(landing, "Ödeme / fatura / tahsilat yok", "landing keeps payment boundary");
mustNot(landing, "Her şeyi yapay zekâ yapar.", "landing avoids overclaim copy");
mustNot(landing, "İnsan gerekmeden tüm servis operasyonu tamamlanır.", "landing avoids humanless completion copy");
mustNot(landing, "AI otomatik tedarikçi seçer.", "landing avoids auto supplier copy");
mustNot(landing, "AI otomatik ödeme/sözleşme kesinleştirir.", "landing avoids auto payment/contract copy");
mustNot(landing, "Excel'i yükleyin, tüm operasyon kendiliğinden biter.", "landing avoids autopilot copy");
mustNot(landing, "Sefer Abi AI", "landing avoids presenting Sefer Abi as AI hero");
mustNot(landing, "AI operasyonu yönetir", "landing avoids AI manages operations wording");
mustNot(landing, "otomatik sözleşme", "landing avoids auto contract wording");
mustNot(landing, "otomatik ödeme", "landing avoids auto payment wording");
mustNot(landing, "otomatik fatura", "landing avoids auto invoice wording");

must(app, 'if (cleanPath === "/landing" || cleanPath === "/public/landing") return { layout: false, node: <PublicLandingPage /> };', "App routes anonymous users to public landing");
must(app, 'return { layout: false, node: <LoginCard /> };', "App keeps anonymous login fallback");

must(harnessCheck, "docs/PUBLIC_LANDING_01_FINAL_PROMISE_CHECK.md", "script harness check knows public landing final promise doc");
must(harnessCheck, "check:publiclandingfinalpromise01", "script harness check knows public landing final promise alias");
must(harnessCheck, "PUBLIC-LANDING-01 FINAL PROMISE CHECK", "script harness check knows public landing final promise milestone");
must(harnessDoc, "public_landing_final_promise_01_check.js", "script harness doc lists public landing final promise check");
must(harnessDoc, "docs/PUBLIC_LANDING_01_FINAL_PROMISE_CHECK.md", "script harness doc lists public landing final promise doc");

mustNoDiff(["backend/src/routes", "backend/src/services", "prisma", "backend/prisma"], "route/service/prisma diff is empty");
mustNoDiff(["web/src/App.jsx", "web/src/index.css", "web/src/panels/public/PublicLandingPage.jsx"], "public landing UI diff is empty");

console.log("=== PUBLIC-LANDING-01 FINAL PROMISE CHECK PASS ===");
