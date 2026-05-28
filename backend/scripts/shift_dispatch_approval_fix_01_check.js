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

console.log("=== SHIFT-DISPATCH-APPROVAL-FIX-01 CHECK ===");

const pkg = read("package.json");
const runner = read("backend/scripts/run_product_extensions_check_chain.js");
const verifyChain = read("backend/scripts/verify_chain_01_product_extensions_check.js");
const guide = read("docs/SCRIPT_KILAVUZU_MILESTONE_HARITASI.md");
const doc = read("docs/SHIFT_DISPATCH_APPROVAL_FIX_01.md");
const displayStatus = read("web/src/utils/displayStatus.js");
const statusPalette = read("web/src/utils/statusPalette.js");
const roomCommercialManifest = read("backend/src/ops/commercialCoreManifest.js");
const companyOverview = read("backend/src/routes/companyOverview.js");
const companyDataHub = read("web/src/utils/companyDataHub.js");
const roomCommercialPanel = read("web/src/panels/room/CommercialFlowPanel.jsx");
const companyCommercialPanel = read("web/src/panels/company/CommercialFlowPanel.jsx");
const panel = read("web/src/panels/room/roomShiftsPanelSections.jsx");
const rows = read("web/src/panels/room/roomShiftsPanelRows.jsx");
const cards = read("web/src/panels/room/roomShiftsPanelCards.jsx");
const mainSections = read("web/src/panels/room/roomShiftsMainSections.jsx");
const shiftsPanel = read("web/src/panels/room/ShiftsPanel.jsx");
const helpers = read("web/src/panels/room/roomShiftsPanelHelpers.js");
const actions = read("web/src/panels/room/roomShiftsPanelActions.js");
const router = read("backend/src/routes/shifts/shiftsRoomDispatchRouter.js");
const leadRunner = read("backend/scripts/run_product_extensions_check_chain.js");

must(pkg, '"check:shiftdispatchapprovalfix01": "node backend/scripts/shift_dispatch_approval_fix_01_check.js"', "package.json exposes check:shiftdispatchapprovalfix01");
must(runner, "check:shiftdispatchapprovalfix01", "product extensions runner includes dispatch approval fix");
must(verifyChain, '"check:shiftdispatchapprovalfix01": "node backend/scripts/shift_dispatch_approval_fix_01_check.js"', "verify chain exposes dispatch approval fix");
ordered(
  runner,
  ["check:boardingops01a", "check:bugrouteimpactpreviewbutton01", "check:shiftdispatchapprovalfix01", "check:boardingchangerequestentry01"],
  "dispatch fix follows bug route preview and stays near boarding/approval checks"
);
ordered(
  verifyChain,
  ["check:boardingops01a", "check:bugrouteimpactpreviewbutton01", "check:shiftdispatchapprovalfix01", "check:boardingchangerequestentry01"],
  "verify chain keeps dispatch fix near boarding/approval checks"
);
must(leadRunner, "check:publiclanding01", "product chain keeps public landing check");
must(leadRunner, "check:leadcapture01", "product chain keeps lead capture check");
must(leadRunner, "check:onboardingreview01", "product chain keeps onboarding review check");

must(guide, "SHIFT-DISPATCH-APPROVAL-FIX-01", "milestone guide mentions dispatch approval fix");
must(guide, "check:shiftdispatchapprovalfix01", "milestone guide exposes dispatch approval fix check");
must(doc, "Amaç", "dispatch fix doc includes purpose");
must(doc, "Önizlemeyi Uygula: Böl & Onayla", "dispatch fix doc explains button boundary");
must(doc, "Hazır", "dispatch fix doc shows ready label");
must(doc, "Araç/şoför seç", "dispatch fix doc shows missing-selection label");
must(doc, "splitIndex", "dispatch fix doc covers split index payload");
must(doc, "vehicleId", "dispatch fix doc covers vehicle payload");
must(doc, "driverId", "dispatch fix doc covers driver payload");
must(doc, "Out-of-scope", "dispatch fix doc states out of scope");
must(doc, "payment", "dispatch fix doc keeps payment boundary");
must(doc, "invite", "dispatch fix doc keeps invite boundary");
must(doc, "Acceptance / Status Propagation", "dispatch fix doc includes acceptance propagation section");
must(doc, "Room / Ticari Akış", "dispatch fix doc covers room commercial flow propagation");
must(doc, "Company görünüm", "dispatch fix doc covers company commercial flow propagation");
must(displayStatus, 'SPLIT: "Bölünerek Onaylandı"', "split dispatch gets a human Turkish label");
must(statusPalette, '"SPLIT"', "split dispatch is styled as a success state");
must(roomCommercialManifest, 'FINAL_SHIFT_STATUSES = new Set(["APPROVED", "ACTIVE", "DONE", "REJECTED", "SPLIT"])', "room commercial manifest treats split as final");
must(roomCommercialManifest, 'status: { in: ["APPROVED", "ACTIVE", "SPLIT"] }', "room commercial summary counts split as accepted/active");
must(roomCommercialManifest, 'shiftStatus === "SPLIT" ? "Bölünmüş vardiya kayıtlarını aç" : "Vardiya kaydini incele"', "room commercial copy distinguishes split approval");
must(companyOverview, 'FINAL_SHIFT_STATUSES = new Set(["APPROVED", "ACTIVE", "DONE", "REJECTED", "SPLIT"])', "company overview treats split as final");
mustNot(companyOverview, '.filter((shift) => !isSplitRootShift(shift))', "company overview no longer hides split root records");
must(companyOverview, 'status: { in: ["APPROVED", "ACTIVE", "SPLIT"] }', "company overview counts split as active/accepted");
must(companyOverview, 'nextStep: status === "SPLIT" ? "Bölünmüş vardiya kaydını aç" : "Vardiya / hizmet tarafını aç"', "company overview shows split-aware next step");
must(companyDataHub, 'withQuery("/api/company/overview/commercial-flow-summary", { force: force ? 1 : null })', "company commercial flow can bypass cache on refresh");
must(roomCommercialPanel, 'useAutoReload("shifts"', "room commercial flow auto refreshes after dispatch approval");
must(roomCommercialPanel, '["ACCEPTED", "APPROVED", "ACTIVE", "SPLIT"]', "room commercial badge treats split as success");
must(roomCommercialPanel, '["approved", "active", "done", "rejected", "split"]', "room commercial flow treats split as a final operation status");
must(companyCommercialPanel, 'useAutoReload("shifts"', "company commercial flow auto refreshes after dispatch approval");
must(companyCommercialPanel, 'force: true', "company commercial flow refresh bypasses cache");
must(companyCommercialPanel, 'Onaylı Kayıt', "company commercial flow gives split rows a clear accepted label");
must(companyCommercialPanel, 'displayStatusLabel(value)', "company commercial flow keeps humanized status labels");

must(mainSections, "dispatchEditSel={dispatchEditSel}", "room main sections pass dispatch edit state");
must(mainSections, "isDriverAvailableForShift={isDriverAvailableForShift}", "room main sections pass driver availability");
must(mainSections, "isVehicleAvailableForShift={isVehicleAvailableForShift}", "room main sections pass vehicle availability");
must(mainSections, "items={items}", "room main sections pass room items");

must(shiftsPanel, "isDriverAvailableForShift={isDriverAvailableForShift}", "room panel wires driver availability");
must(shiftsPanel, "dispatchEditSel={dispatchEditSel}", "room panel wires dispatch edit selections");
must(shiftsPanel, "items={items}", "room panel wires item list");

must(panel, "getDispatchSelectionStates({", "dispatch summary reads selection state helper");
must(panel, "items,", "dispatch summary passes room items into helper");
must(panel, "isDriverAvailableForShift,", "dispatch summary passes driver availability into helper");
must(panel, "isVehicleAvailableForShift,", "dispatch summary passes vehicle availability into helper");
must(panel, "buildCapacityMeta,", "dispatch summary passes capacity helper into helper");
must(panel, "const dispatchApplyIssue = dispatchSelectionRows.find(({ state }) => state?.status !== \"ok\") || null;", "dispatch summary derives apply issue from selection rows");
must(panel, "const dispatchCanApply = suggestions.length > 0 && !dispatchApplyIssue;", "dispatch summary enables button from actual selection state");
must(panel, "dispatchApplyMessage", "dispatch summary exposes readable apply message");
must(panel, "Tüm öneriler hazır. Önizlemeyi uygulayabilirsin.", "dispatch summary shows success copy");
must(panel, "Önizlemeyi Uygula: Böl & Onayla", "dispatch summary keeps apply button label");
must(panel, "Bölme önizlemesini yenile", "dispatch summary uses Turkish preview label");
must(panel, "Bölme önizlemesi oluştur", "dispatch summary uses Turkish create label");
must(panel, "Bölme önizleme hatası:", "dispatch summary uses Turkish error label");
must(panel, "Araç ve şoför seç.", "dispatch summary uses clear missing-selection label");
must(panel, "Boş şoför", "dispatch summary uses Turkish pool label");
must(panel, "araç/şoför çifti bulunamadı", "dispatch summary uses Turkish fallback copy");
must(panel, "Önizleme ile aynı bölme planı uygulanır; seçtiğin araç ve şoför eşleşmeleri kullanılır.", "dispatch summary explains apply boundary");
must(panel, "Çoklu araç/şoför havuzunu görmek için yükle.", "dispatch summary uses Turkish pool hint");

must(rows, "Bölme modu aktif", "room rows show dispatch mode as ready state");
must(rows, "Araç ve şoför seçimini aşağıdaki öneri kartlarından yap.", "room rows explain selection guidance");
must(rows, "Şoför", "room rows use Turkish driver label");
must(rows, "Şoför → Pakete Kopyala", "room rows use Turkish copy action");
must(rows, "Onay bu modda aşağıdaki bölme önizleme kartından verilir.", "room rows show approval boundary text");
mustNot(rows, "Dispatch modu aktif", "room rows no longer show English dispatch label");
mustNot(rows, "Driver → Pakete Kopyala", "room rows no longer show English driver copy action");
mustNot(rows, "Vehicle + Driver", "room rows no longer show English table label");

must(cards, "Hazır", "room cards show ready label");
must(cards, "Araç/şoför seç", "room cards show missing-selection label");
must(cards, "Kontrol", "room cards show checking label");
must(cards, "Araç ve şoför seç.", "room cards show missing helper copy");
must(cards, "selectionState?.message", "room cards surface selection message");

must(helpers, "DUPLICATE_VEHICLE", "helper detects duplicate vehicles");
must(helpers, "DUPLICATE_DRIVER", "helper detects duplicate drivers");
must(helpers, "SELECT_REQUIRED", "helper detects missing selection");
must(helpers, "Araç ve şoför seç.", "helper uses Turkish missing copy");
must(helpers, "Şoför aynı zaman aralığında başka bir vardiyada.", "helper uses Turkish driver conflict copy");
must(helpers, "Aynı araç başka öneride de seçili.", "helper uses duplicate vehicle warning");
must(helpers, "Aynı şoför başka öneride de seçili.", "helper uses duplicate driver warning");
must(helpers, "capacity.blockCode", "helper keeps capacity guard");
must(helpers, "capacity.blockMessage", "helper keeps capacity guard message");
must(helpers, "buildDispatchVirtualShift", "helper keeps virtual shift capacity calculation");

must(actions, "overrides = suggestions.map((part) => ({", "dispatch action builds overrides from preview suggestions");
must(actions, "splitIndex: Number(part?.splitIndex || 0)", "dispatch action sends split index");
must(actions, "vehicleId: selectedDispatchVehicleId(sid, part)", "dispatch action sends selected vehicle");
must(actions, "driverId: selectedDispatchDriverId(sid, part)", "dispatch action sends selected driver");
must(actions, ".filter((x) => x.splitIndex && x.vehicleId && x.driverId)", "dispatch action filters incomplete overrides");
must(actions, "/api/shifts/${sid}/auto-split-approve", "dispatch action calls auto split approve endpoint");

must(router, "applyDispatchOverrides", "dispatch router applies overrides");
must(router, "req.body?.overrides", "dispatch router accepts overrides from client");
must(router, "createChildShiftFromSlice", "dispatch router keeps split creation flow");
must(router, "splitIndex", "dispatch router keeps split index in response");
must(router, "vehicleId", "dispatch router keeps vehicle id in response");
must(router, "driverId", "dispatch router keeps driver id in response");
must(router, "allocatedPax", "dispatch router keeps allocated passenger count");

const staged = stagedNames();
mustNot(staged, "backend/artifacts/runtime-data/public-leads.json", "runtime public lead artifact is not staged");
if (isTracked("backend/artifacts/runtime-data/public-leads.json")) {
  fail("runtime lead artifact is tracked");
}

const status = gitStatus();
mustNot(status, "backend/prisma/schema.prisma", "dispatch fix does not touch Prisma schema");
mustNot(status, "backend/prisma/migrations/", "dispatch fix adds no Prisma migration");

console.log("=== SHIFT-DISPATCH-APPROVAL-FIX-01 CHECK PASS ===");
