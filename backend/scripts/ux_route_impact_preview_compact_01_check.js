#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { assertProductExtensionsOrder, productExtensionsChecks } from "./lib/productExtensionsRegistry.js";

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

function stagedNames() {
  try {
    return execFileSync("git", ["diff", "--cached", "--name-only"], {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    return "";
  }
}

console.log("=== UX-ROUTE-IMPACT-PREVIEW-COMPACT-01 CHECK ===");

const pkg = read("package.json");
const verifyChain = read("backend/scripts/verify_chain_01_product_extensions_check.js");
const registryScripts = productExtensionsChecks.map((step) => step.script);
const harnessCheck = read("backend/scripts/script_harness_consolidation_01_check.js");
const harnessDoc = read("docs/SCRIPT_HARNESS_CONSOLIDATION_01.md");
const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
const doc = read("docs/UX_ROUTE_IMPACT_PREVIEW_COMPACT_01.md");
const card = read("web/src/panels/shared/BoardingRouteImpactPreviewCard.jsx");
const boardingUi = read("web/src/panels/shared/boardingChangeUi.js");
const roomHealth = read("web/src/panels/room/OperationHealthPanel.jsx");
const roomOps = read("web/src/panels/room/roomOperationsBoard.jsx");
const companyOps = read("web/src/panels/company/OperationsPanel.jsx");
const staged = stagedNames();

must(pkg, '"check:uxrouteimpactpreviewcompact01": "node backend/scripts/ux_route_impact_preview_compact_01_check.js"', "package.json exposes check:uxrouteimpactpreviewcompact01");
assertProductExtensionsOrder(
  ["check:boardingops01a", "check:bugrouteimpactpreviewbutton01", "check:uxrouteimpactpreviewcompact01", "check:shiftdispatchapprovalfix01"],
  "compact preview registry sits between route preview and dispatch approval",
  registryScripts,
);
assertProductExtensionsOrder(
  ["check:boardingops01a", "check:bugrouteimpactpreviewbutton01", "check:uxrouteimpactpreviewcompact01", "check:shiftdispatchapprovalfix01"],
  "verify chain registry keeps compact preview near boarding approval checks",
  registryScripts,
);

must(harnessCheck, "check:uxrouteimpactpreviewcompact01", "script harness check knows compact preview alias");
must(harnessCheck, "UX-ROUTE-IMPACT-PREVIEW-COMPACT-01", "script harness check knows compact preview milestone");
must(harnessCheck, "docs/UX_ROUTE_IMPACT_PREVIEW_COMPACT_01.md", "script harness check knows compact preview doc");

must(harnessDoc, "root:check:uxrouteimpactpreviewcompact01", "script harness doc exposes compact preview root alias");
must(harnessDoc, "UX-ROUTE-IMPACT-PREVIEW-COMPACT-01-CHECK", "script harness doc names compact preview check");
must(harnessDoc, "ux_route_impact_preview_compact_01_check.js", "script harness doc registers compact preview check file");
must(harnessDoc, "check:uxrouteimpactpreviewcompact01", "script harness doc links compact preview check in boarding ops row");

must(guide, "UX-ROUTE-IMPACT-PREVIEW-COMPACT-01", "milestone guide mentions compact preview milestone");
must(guide, "check:uxrouteimpactpreviewcompact01", "milestone guide exposes compact preview check");
must(guide, "Room / Operasyon Sağlığı", "milestone guide covers room operation health");
must(guide, "Company yüzeylerindeki rota etkisi önizlemesini kısa karar kartına dönüştürür", "milestone guide states compact preview intent");

must(doc, "Problem", "compact preview doc includes problem section");
must(doc, "Hedef", "compact preview doc includes target section");
must(doc, "Varsayılan Görünüm", "compact preview doc includes default view section");
must(doc, "Detay Görünümü", "compact preview doc includes detail view section");
must(doc, "Readonly Sınırı", "compact preview doc includes readonly boundary");
must(doc, "Kısa karar", "compact preview doc uses short decision copy");
must(doc, "Detayı aç", "compact preview doc exposes details toggle");
must(doc, "Haritada göster", "compact preview doc exposes map toggle");
must(doc, "Mini harita önizlemesi", "compact preview doc keeps mini map label");
must(doc, "Uyarılar", "compact preview doc keeps warnings section");
must(doc, "Sıradaki önerilen işlem", "compact preview doc keeps next action section");
must(doc, "Sadece önizleme", "compact preview doc keeps preview state copy");
must(doc, "Kabul bekliyor", "compact preview doc keeps ready state copy");
must(doc, "Operasyona ulaştı", "compact preview doc keeps applied state copy");
must(doc, "Uygulanmadı", "compact preview doc keeps rejected state copy");
must(doc, "Kapasite", "compact preview doc keeps capacity label");
must(doc, "Güvenilirlik", "compact preview doc keeps reliability label");
must(doc, "Risk", "compact preview doc keeps risk label");
must(doc, "Room / Operasyon Sağlığı", "compact preview doc covers room surface");
must(doc, "Company", "compact preview doc covers company surface");
mustNot(doc, "payment execute", "compact preview doc does not advertise payment execution");
mustNot(doc, "billing execute", "compact preview doc does not advertise billing execution");
mustNot(doc, "collection execute", "compact preview doc does not advertise collection execution");
mustNot(doc, "contract execute", "compact preview doc does not advertise contract execution");
mustNot(doc, "invite send", "compact preview doc does not advertise invite sending");
mustNot(doc, "user create", "compact preview doc does not advertise user creation");
mustNot(doc, "supplier verification auto", "compact preview doc does not advertise automatic supplier verification");
mustNot(doc, "settlement execute", "compact preview doc does not advertise settlement execution");
mustNot(doc, "route apply", "compact preview doc does not advertise route apply");

must(card, "detailsOpen", "shared preview card keeps collapsed details state");
must(card, "Kısa karar", "shared preview card keeps compact decision copy");
must(card, "Detayı aç", "shared preview card exposes details toggle");
must(card, "Haritada göster", "shared preview card exposes map toggle");
must(card, "Mini harita önizlemesi", "shared preview card keeps mini map label");
must(card, "Readonly önizleme — rota uygulanmaz", "shared preview card keeps readonly boundary copy");
must(card, "Uyarılar", "shared preview card keeps warnings section");
must(card, "Sıradaki önerilen işlem", "shared preview card keeps next action section");
must(card, "Kapasite", "shared preview card keeps capacity chip");
must(card, "Güvenilirlik", "shared preview card keeps reliability chip");
must(card, "Risk", "shared preview card keeps risk chip");
must(card, "Km etkisi", "shared preview card keeps distance label");
must(card, "Süre etkisi", "shared preview card keeps duration label");
must(card, "Seçimi temizle", "shared preview card keeps clear selection action");
must(card, "Önizleme açılıyor…", "shared preview card keeps loading state copy");
must(card, "height: 160", "shared preview card keeps compact mini map height");
must(card, "const [detailsOpen, setDetailsOpen] = useState(false);", "shared preview card defaults to collapsed details");
mustNot(card, "payment execute", "shared preview card does not advertise payment execution");
mustNot(card, "billing execute", "shared preview card does not advertise billing execution");
mustNot(card, "collection execute", "shared preview card does not advertise collection execution");
mustNot(card, "contract execute", "shared preview card does not advertise contract execution");
mustNot(card, "invite send", "shared preview card does not advertise invite sending");
mustNot(card, "user create", "shared preview card does not advertise user creation");
mustNot(card, "supplier verification auto", "shared preview card does not advertise automatic supplier verification");
mustNot(card, "settlement execute", "shared preview card does not advertise settlement execution");

must(boardingUi, "boardingChangePreviewStateLabel", "boarding helper exposes preview state label");
must(boardingUi, "boardingChangePreviewStateTone", "boarding helper exposes preview state tone");
must(boardingUi, "boardingChangePreviewStateNote", "boarding helper exposes preview state note");
must(boardingUi, "Sadece önizleme", "boarding helper keeps preview-only label");
must(boardingUi, "Kabul bekliyor", "boarding helper keeps ready label");
must(boardingUi, "Operasyona ulaştı", "boarding helper keeps applied label");
must(boardingUi, "Uygulanmadı", "boarding helper keeps rejected label");
must(boardingUi, "Readonly önizleme.", "boarding helper keeps readonly note");

must(roomHealth, "RoomOperationsBoard", "room operation health surface mounts room operations board");
must(roomOps, "BoardingRouteImpactPreviewCard", "room operations board uses shared compact preview card");
must(roomOps, "Rota etkisini önizle", "room operations board keeps preview action");
must(companyOps, "BoardingRouteImpactPreviewCard", "company operations panel uses shared compact preview card");
must(companyOps, "Rota etkisini önizle", "company operations panel keeps preview action");

mustNot(staged, "backend/artifacts/runtime-data", "runtime-data is not staged");
mustNot(staged, "public-leads.json", "public leads runtime data is not staged");

console.log("=== UX-ROUTE-IMPACT-PREVIEW-COMPACT-01 CHECK PASS ===");
