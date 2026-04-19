import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const repoRoot = path.resolve(__dirname, "../..");

function relPath(...parts) {
  return path.join(repoRoot, ...parts);
}

function read(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), "utf8");
}

function pass(label) {
  console.log(`OK ${label}`);
}

function fail(label) {
  throw new Error(`ASSERT_FAIL: ${label}`);
}

function assertIncludes(rel, needle, label) {
  if (!read(rel).includes(needle)) fail(label);
  pass(label);
}

function assertIncludesAny(rel, needles, label) {
  const text = read(rel);
  if (!needles.some((needle) => text.includes(needle))) fail(label);
  pass(label);
}

function assertTextIncludes(text, needle, label) {
  if (!text.includes(needle)) fail(label);
  pass(label);
}

function assertTextIncludesAny(text, needles, label) {
  if (!needles.some((needle) => text.includes(needle))) fail(label);
  pass(label);
}

function banner(title) {
  console.log(`=== ${title} ===`);
}

export function runM91AgreementNegotiationParityCheck() {
  banner("M91B agreement negotiation parity check");
  assertIncludes("backend/src/routes/agreements.js", '"/:id/company-counter"', "company counter route");
  assertIncludes("backend/src/routes/agreements.js", '"/:id/reject"', "room reject route");
  assertIncludes("backend/src/routes/agreements.js", "AGREEMENT_COMPANY_COUNTERED", "company counter notification");
  assertIncludes("backend/src/routes/agreements.js", "AGREEMENT_REJECTED", "room rejected notification");
  assertIncludes("web/src/panels/company/AgreementsPanel.jsx", "Yeni Teklif Gönder", "company counter button");
  assertIncludes("web/src/panels/company/AgreementsPanel.jsx", "/company-counter", "company counter api call");
  assertIncludes("web/src/panels/room/AgreementsPanel.jsx", "Reddet", "room reject button");
  assertIncludes("web/src/panels/room/AgreementsPanel.jsx", "/reject", "room reject api call");
  banner("M91B CHECK PASS");
}

export function runM91CompanyAgreementFromShiftOnlyCheck() {
  banner("M91 company agreement from shift only check");
  assertIncludes("web/src/panels/company/AgreementsPanel.jsx", "Sözleşme oluşturma kuralı", "company agreements info card");
  assertIncludes(
    "web/src/panels/company/AgreementsPanel.jsx",
    "Company tarafında sözleşme artık doğrudan bu ekrandan açılmaz.",
    "company agreements direct create removed"
  );
  assertIncludes("web/src/panels/company/AgreementWizard.jsx", "sourceShiftId", "wizard checks source shift id");
  assertIncludesAny(
    "web/src/panels/company/AgreementWizard.jsx",
    [
      "Sözleşme sadece vardiyadan oluşturulabilir.",
      "Doğrudan sözleşme açma kapalı. Önce vardiyada “Sözleşmeye Dönüştür” kullan.",
    ],
    "wizard blocks non-shift create"
  );
  banner("M91 COMPANY AGREEMENT FROM SHIFT ONLY CHECK PASS");
}

export function runM91GeneratedShiftPreviewFixCheck() {
  banner("M91 generated shift preview fix check");
  assertIncludes("backend/src/routes/shifts/people.js", "hasMeaningfulStops", "route preview detects hub-only generated shifts");
  assertIncludes("backend/src/routes/shifts/people.js", "sourcePayload?.shift", "route preview falls back to source shift payload");
  assertIncludes("backend/src/routes/agreements.js", "previewAvailable", "agreements ops bridge exposes previewAvailable");
  assertIncludes("web/src/panels/company/AgreementsPanel.jsx", "previewAvailable", "company ops bridge enables preview with fallback");
  assertIncludes("web/src/panels/room/AgreementsPanel.jsx", "Rota Önizleme", "room ops bridge exposes preview action");
  banner("M91 GENERATED SHIFT PREVIEW FIX CHECK PASS");
}

export function runM91GeneratedShiftPreviewOrgPlanFixCheck() {
  banner("M91 generated shift preview orgplan fix check");
  assertIncludes("backend/src/jobs/agreementShiftGenerator.js", "organizationPlan", "generator loads source organization plan");
  assertIncludes("backend/src/jobs/agreementShiftGenerator.js", "sourceShift.organizationPlan?.stops", "generator clones organization plan stops when concrete stops missing");
  assertIncludes("backend/src/routes/shifts/people.js", "sourcePlanStops", "route preview falls back to source organization plan stops");
  banner("M91 GENERATED SHIFT PREVIEW ORGPLAN FIX CHECK PASS");
}

export function runM91GeneratedShiftPreviewSourceRootFixCheck() {
  banner("M91 generated shift preview source-root fix check");
  assertIncludes("backend/src/services/agreementSourceShift.js", "resolveAgreementSourceShiftPayload", "agreement source shift helper exists");
  assertIncludes("backend/src/services/agreementSourceShift.js", "inferAgreementSourceShiftId", "agreement source shift inference exists");
  assertIncludes("backend/src/services/paymentBackbone.js", "payload.shiftRootId ?? existing?.shiftRootId ?? null", "commercial backbone preserves source shift root");
  assertIncludes("backend/src/services/paymentBackbone.js", "resolveAgreementSourceShiftId", "agreement backbone can recover source shift root");
  assertIncludes("backend/src/jobs/agreementShiftGenerator.js", "resolveAgreementSourceShiftPayload", "generator uses shared agreement source shift helper");
  assertIncludes("backend/src/routes/shifts/people.js", "resolveAgreementSourceShiftPayload", "route preview uses shared agreement source shift helper");
  banner("M91 GENERATED SHIFT PREVIEW SOURCE-ROOT FIX CHECK PASS");
}

export function runM91PrefillRoutePreviewPropagationCheck() {
  banner("M91 prefill + route preview propagation check");
  assertIncludes("web/src/panels/company/AgreementWizard.jsx", "sourceShiftId", "wizard reads source shift id");
  assertIncludes("web/src/panels/company/AgreementWizard.jsx", "setQ(\"\")", "wizard clears room search on source shift prefill");
  assertIncludes("backend/src/jobs/agreementShiftGenerator.js", "resolveAgreementSourceShiftPayload", "generator reads source shift via shared helper");
  assertIncludes("backend/src/jobs/agreementShiftGenerator.js", "routeSnapshot", "generator carries route snapshot");
  assertIncludes("backend/src/routes/shifts/people.js", "resolveAgreementSourceShiftPayload", "people preview route can fall back to source shift");
  assertIncludes("backend/src/routes/agreements.js", "sourceShiftId", "agreements ops bridge can read source shift");
  banner("M91 PREFILL + ROUTE PREVIEW PROPAGATION CHECK PASS");
}

export function runM91RoutePreviewRoomGuardFixCheck() {
  banner("M91 route preview + room guard fix check");
  assertIncludes("backend/src/services/paymentBackbone.js", "const sourceShiftId = Number(options.sourceShiftId || 0);", "agreement backbone accepts source shift id");
  assertIncludes("backend/src/routes/agreements.js", "const sourceShiftId = Number(req.body?.sourceShiftId || 0);", "agreement routes read source shift id");
  assertIncludes("backend/src/routes/agreements.js", "upsertAgreementCommercialBackbone(row.id, { sourceShiftId })", "bundle create persists source shift link");
  assertIncludes("backend/src/routes/agreements.js", "upsertAgreementCommercialBackbone(created.id, { sourceShiftId })", "single create persists source shift link");
  assertIncludes("web/src/panels/company/AgreementWizard.jsx", "body.sourceShiftId = Number(launchPrefill.sourceShiftId || 0);", "wizard sends source shift id");
  assertIncludes("backend/src/jobs/agreementShiftGenerator.js", "loadAgreementSourceShift", "generator loads agreement source shift");
  assertIncludes("backend/src/jobs/agreementShiftGenerator.js", "cloneAgreementShiftPayload", "generator clones source stops and people");
  assertIncludes("backend/src/jobs/agreementShiftGenerator.js", "routeSnapshotFromSource", "generator copies source route snapshot when available");
  assertIncludes("backend/src/jobs/agreementShiftGenerator.js", "rebuildShiftRouteStateBestEffort(created.id)", "generator rebuilds route state when snapshot missing");
  assertIncludes("backend/src/routes/shifts/company.js", "const agreementCoveredRoomIds = roomIds.filter", "company offer route keeps advisory agreement-covered rooms");
  assertIncludes("backend/src/routes/shifts/company.js", "const effectiveRoomIds = roomIds.slice();", "company offer route no longer drops rooms because of agreement coverage");
  assertIncludes("backend/src/routes/shifts/company.js", "agreementCoveredRoomIds", "company offer response exposes advisory agreement-covered rooms");
  banner("M91 ROUTE PREVIEW + ROOM GUARD FIX CHECK PASS");
}

export function runM91AgreementOperationsBridgeCheck() {
  banner("M91D agreement operations bridge check");
  assertIncludes("backend/src/routes/agreements.js", 'r.post("/ops-bridge"', "ops bridge route");
  assertIncludes("backend/src/routes/agreements.js", "generatedCount", "ops bridge generated count");
  assertIncludes("backend/src/routes/agreements.js", "routeSnapshotValidatedAt", "ops bridge preview fields");
  assertIncludes("web/src/panels/company/AgreementsPanel.jsx", "AgreementOpsBridgeCard", "company ops bridge card");
  assertIncludes("web/src/panels/company/AgreementsPanel.jsx", "/api/agreements/ops-bridge", "company ops bridge api call");
  assertIncludes("web/src/panels/company/AgreementsPanel.jsx", "company:previewShiftId", "company preview focus stash");
  assertIncludes("web/src/panels/room/AgreementsPanel.jsx", "AgreementOpsBridgeCard", "room ops bridge card");
  assertIncludes("web/src/panels/room/AgreementsPanel.jsx", "/api/agreements/ops-bridge", "room ops bridge api call");
  assertIncludes("web/src/panels/room/AgreementsPanel.jsx", "room:focusShiftId", "room shift focus stash");
  assertIncludes("web/src/panels/company/ShiftsPanel.jsx", "company:previewShiftId", "company shifts preview focus consume");
  assertIncludes("web/src/panels/company/ShiftsPanel.jsx", "company:focusShiftId", "company shifts focus consume");
  banner("M91D CHECK PASS");
}

export function runM91LinkedShiftDisableConvertCheck() {
  banner("M91C linked shift disable convert check");
  const text = read("web/src/panels/company/companyShiftsPanelRows.jsx");
  assertTextIncludes(text, "Sözleşmeye Bağlı", "linked shift badge text");
  assertTextIncludes(text, "Bu vardiya zaten bir sözleşmeye bağlandı.", "linked shift title");
  assertTextIncludes(text, "hasAgreement || hasLinkedAgreementRequest", "agreement branch render");
  assertTextIncludes(text, "Sözleşmeye Taşındı", "linked request badge text");
  assertTextIncludes(text, "Sözleşmeye Dönüştür", "convert action still present for unlinked shifts");
  assertTextIncludes(text, "Yeniden Dönüştür", "closed request reconvert action");
  banner("M91C LINKED SHIFT DISABLE CONVERT CHECK PASS");
}

export function runM91ShiftToAgreementPrefillCheck() {
  banner("M91C shift to agreement prefill check");
  assertIncludes("web/src/utils/agreementPrefill.js", "buildAgreementPrefillFromShift", "agreement prefill util");
  assertIncludes("web/src/utils/agreementPrefill.js", "stashAgreementPrefill", "agreement prefill stash");
  assertIncludes("web/src/utils/agreementPrefill.js", "const startHHMM = formatTimeTR(shift?.startAt", "prefill carries shift start time");
  assertIncludes("web/src/utils/agreementPrefill.js", "const endHHMM = formatTimeTR(shift?.endAt", "prefill carries shift end time");
  assertIncludes("web/src/utils/agreementPrefill.js", "const sourceDate = ymdTR(shift?.startAt", "prefill keeps source shift date");
  assertIncludes("web/src/utils/agreementPrefill.js", "const startDate = addDaysISO(sourceDate, 1)", "prefill starts rolling agreement after source date");
  assertIncludes("web/src/utils/agreementPrefill.js", "weekMask: weekdayBitFromYmdTR(sourceDate)", "prefill preserves source weekday");
  assertIncludes("web/src/panels/company/AgreementWizard.jsx", "launchPrefill", "wizard launchPrefill prop");
  assertIncludes("web/src/panels/company/AgreementWizard.jsx", "autoOpenNonce", "wizard autoOpenNonce prop");
  assertIncludes("web/src/panels/company/AgreementWizard.jsx", "guessPackKey", "wizard prefill pack resolver");
  assertIncludes("web/src/panels/company/AgreementWizard.jsx", "buildPackPreviewItems", "wizard summary uses effective custom hours");
  assertIncludes("web/src/panels/company/AgreementWizard.jsx", "preserveLaunchPrefillCustom", "wizard pack defaults preserve shift prefill hours");
  assertIncludes("web/src/panels/company/ShiftsPanel.jsx", "convertShiftToAgreement", "shifts convert handler");
  assertIncludes("web/src/panels/company/ShiftsPanel.jsx", "stashAgreementPrefill", "shifts stash prefill usage");
  assertIncludes("web/src/panels/company/companyShiftsPanelRows.jsx", "Sözleşmeye Dönüştür", "row convert button");
  assertIncludes("web/src/panels/company/companyShiftsPanelSections.jsx", "onConvertShiftToAgreement", "sections pass convert handler");
  assertIncludes("web/src/panels/company/CompanyShiftsPanelTrackView.jsx", "onConvertShiftToAgreement", "track view pass convert handler");
  banner("M91C CHECK PASS");
}

export function runM91ShiftOriginLinkCheck() {
  banner("M91C shift origin link check");
  const util = fs.readFileSync(relPath("web/src/utils/agreementOriginLink.js"), "utf8");
  const wizard = fs.readFileSync(relPath("web/src/panels/company/AgreementWizard.jsx"), "utf8");
  const panel = fs.readFileSync(relPath("web/src/panels/company/AgreementsPanel.jsx"), "utf8");
  assertTextIncludes(util, "linkAgreementsToOrigin", "agreement origin link util");
  assertTextIncludes(util, "getAgreementOrigins", "agreement origin read util");
  assertTextIncludes(wizard, "linkAgreementsToOrigin(createdIds, launchPrefill)", "wizard links created agreements to shift origin");
  assertTextIncludes(wizard, "createdFromShift", "wizard returns created from shift detail");
  assertTextIncludes(panel, "handleWizardCreated", "agreements panel handles wizard created detail");
  assertTextIncludes(panel, "Kaynak vardiya bağlantısı", "agreements panel source shift card");
  assertTextIncludesAny(panel, ["Kaynak Vardiyaya Git", "Kaynak vardiyaya Git"], "agreements panel source shift action");
  assertTextIncludes(panel, "Kaynak vardiya #", "agreements panel source shift badge in list");
  banner("M91C SHIFT ORIGIN LINK CHECK PASS");
}

export function runM91DraftSlotHardeningCheck() {
  banner("M91E/F draft + slot hardening check");
  assertIncludes("backend/src/routes/shifts/helpers.js", 'statuses = statuses.filter((s) => s !== "DRAFT")', "draft only exposed via includeDrafts guard");
  assertIncludes("backend/src/routes/shifts/helpers.js", "where.id = -1", "draft direct status query collapses to no results");
  assertIncludes("backend/src/routes/agreements.js", 'status: { not: "DRAFT" }', "agreement shift stats excludes draft");
  assertIncludes("backend/src/routes/agreements.js", 'const shiftWhere = { agreementId: { in: allowedIds }, status: { not: "DRAFT" } };', "ops bridge excludes draft");
  assertIncludes("backend/src/routes/agreements.js", 'r.post("/bundle"', "bundle route exists");
  assertIncludes("backend/src/services/agreementSlots.js", "Sözleşme tarafı günlük en fazla 3 slot destekler", "slot validation service exists");
  assertIncludes("backend/src/services/agreementSlots.js", "Slot saatleri çakışamaz.", "slot overlap validation exists");
  assertIncludes("backend/src/services/agreementSlots.js", "Duplicate slot olamaz.", "slot duplicate validation exists");
  assertIncludes("web/src/panels/company/AgreementWizard.jsx", 'await api("/api/agreements/bundle"', "wizard uses bundle endpoint");
  assertIncludes("web/src/panels/company/AgreementWizard.jsx", "items.length > 3", "wizard enforces max 3 slots");
  banner("M91E/F CHECK PASS");
}

export const m91RoutePreviewCheckPack = [
  runM91AgreementNegotiationParityCheck,
  runM91CompanyAgreementFromShiftOnlyCheck,
  runM91GeneratedShiftPreviewFixCheck,
  runM91GeneratedShiftPreviewOrgPlanFixCheck,
  runM91GeneratedShiftPreviewSourceRootFixCheck,
  runM91PrefillRoutePreviewPropagationCheck,
  runM91RoutePreviewRoomGuardFixCheck,
  runM91AgreementOperationsBridgeCheck,
  runM91LinkedShiftDisableConvertCheck,
  runM91ShiftToAgreementPrefillCheck,
  runM91ShiftOriginLinkCheck,
  runM91DraftSlotHardeningCheck,
];

export function runM91RoutePreviewCheckPack() {
  banner("M91 ROUTE PREVIEW CHECK PACK");
  for (const run of m91RoutePreviewCheckPack) run();
  banner("M91 ROUTE PREVIEW CHECK PACK PASS");
}
