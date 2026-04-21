import fs from "fs";
import path from "path";

const root = process.cwd();


function normalizeText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[İI]/g, "i")
    .replace(/[ı]/g, "i")
    .replace(/[Şş]/g, "s")
    .replace(/[Ğğ]/g, "g")
    .replace(/[Üü]/g, "u")
    .replace(/[Öö]/g, "o")
    .replace(/[Çç]/g, "c")
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\\/g, "/")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}
function includesText(text, needle) {
  return normalizeText(text).includes(normalizeText(needle));
}
function includesAnyText(text, needles) {
  return (needles || []).some((needle) => includesText(text, needle));
}
function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}
function ok(msg) { console.log(`OK ${msg}`); }
function fail(msg) { console.error(`FAIL ${msg}`); process.exitCode = 1; }

const apiJs = read("web/src/api.js");
const apiContract = read("web/src/utils/apiContract.js");
const uiCache = read("web/src/utils/uiDataCache.js");
const companyShifts = read("web/src/panels/company/ShiftsPanel.jsx");
const offerUtils = read("web/src/panels/company/shiftsPanelOfferUtils.js");
const companyShiftsSections = read("web/src/panels/company/companyShiftsPanelSections.jsx");
const companyShiftsRows = read("web/src/panels/company/companyShiftsPanelRows.jsx");
const companyShiftsCards = read("web/src/panels/company/companyShiftsPanelCards.jsx");
const companyShiftsFilters = read("web/src/panels/company/companyShiftsPanelFilters.jsx");
const companyShiftsUtils = read("web/src/panels/company/companyShiftsPanelUtils.js");
const companyShiftsSelectors = read("web/src/panels/company/companyShiftsPanelSelectors.js");
const companyShiftsActions = read("web/src/panels/company/companyShiftsPanelActions.js");
const companyShiftsSummaryCells = read("web/src/panels/company/companyShiftsPanelSummaryCells.jsx");
const roomShifts = read("web/src/panels/room/ShiftsPanel.jsx");
const roomShiftsUtils = read("web/src/panels/room/roomShiftsPanelUtils.js");
const roomShiftsSections = read("web/src/panels/room/roomShiftsPanelSections.jsx");
const roomShiftsRows = read("web/src/panels/room/roomShiftsPanelRows.jsx");
const roomShiftsCards = read("web/src/panels/room/roomShiftsPanelCards.jsx");
const roomShiftsOverview = read("web/src/panels/room/roomShiftsOverviewSection.jsx");
const roomShiftsMainSections = read("web/src/panels/room/roomShiftsMainSections.jsx");
const roomVehicles = read("web/src/panels/room/VehiclesPanel.jsx");
const roomVehiclesUtils = read("web/src/panels/room/roomVehiclesPanelUtils.js");
const roomVehiclesSections = read("web/src/panels/room/roomVehiclesPanelSections.jsx");
const roomVehiclesRows = read("web/src/panels/room/roomVehiclesPanelRows.jsx");
const roomVehiclesCards = read("web/src/panels/room/roomVehiclesPanelCards.jsx");
const guidedPlanModal = read("web/src/panels/company/GuidedPlanModal.jsx");
const guidedPlanUtils = read("web/src/panels/company/guidedPlanModalUtils.js");
const guidedPlanSections = read("web/src/panels/company/guidedPlanModalSections.jsx");
const guidedPlanCards = read("web/src/panels/company/guidedPlanModalCards.jsx");
const guidedPlanDestinationCards = read("web/src/panels/company/guidedPlanModalDestinationCards.jsx");
const guidedPlanPlanCards = read("web/src/panels/company/guidedPlanModalPlanCards.jsx");
const guidedPlanActions = read("web/src/panels/company/guidedPlanModalActions.js");
const shiftPeopleTab = read("web/src/panels/company/ShiftPeopleTab.jsx");
const shiftPeopleTabUtils = read("web/src/panels/company/shiftPeopleTabUtils.js");
const shiftPeopleTabSections = read("web/src/panels/company/shiftPeopleTabSections.jsx");
const planBuilderPanel = read("web/src/panels/company/PlanBuilderPanel.jsx");
const planBuilderUtils = read("web/src/panels/company/planBuilderPanelUtils.js");
const planBuilderWorkflow = read("web/src/panels/company/planBuilderPanelWorkflow.js");
const planBuilderActions = read("web/src/panels/company/planBuilderPanelActions.js");
const planBuilderSections = read("web/src/panels/company/planBuilderPanelSections.jsx");

if (/import\s+\{\s*makeHttpError\s*\}\s+from\s+["']\.\/utils\/apiContract["']/.test(apiJs)) ok("api.js uses shared apiContract helper");
else fail("api.js must import makeHttpError from shared apiContract helper");

if (/export function getApiErrorInfo/.test(apiContract) && /export function getApiErrorMessage/.test(apiContract)) ok("apiContract exports normalized error helpers");
else fail("apiContract must export normalized error helpers");

if (/writeFailure\(/.test(uiCache) && !/writeCache\(key, null, FAILURE_TTL_MS\)/.test(uiCache)) ok("uiDataCache keeps failure throttling without poisoning success cache");
else fail("uiDataCache must not cache null success payload on failure");

if (/function matchesCacheTarget/.test(uiCache) && /url\.startsWith\(target\)/.test(uiCache) && !/key\.includes\(p\)/.test(uiCache)) ok("uiDataCache clear uses url-aware prefix match instead of raw includes");
else fail("uiDataCache clear must use url-aware prefix match");

if (/from\s+["']\.\/shiftsPanelOfferUtils["']/.test(companyShifts)
  && /from\s+["']\.\/companyShiftsPanelSections["']/.test(companyShifts)
  && /from\s+["']\.\/companyShiftsPanelUtils["']/.test(companyShifts)
  && /from\s+["']\.\/companyShiftsPanelActions["']/.test(companyShifts)
  && /from\s+["']\.\/companyShiftsPanelSummaryCells["']/.test(companyShifts)
  && /from\s+["']\.\.\/\.\.\/utils\/apiContract["']/.test(companyShifts)
  && /getApiErrorMessage/.test(companyShifts)
  && /export function minutesOf/.test(companyShiftsUtils)
  && /export function normalizeTemplate/.test(companyShiftsUtils)
  && /export function buildLocalRangeFromItem/.test(companyShiftsUtils)
  && /export function loadCustomTemplatesFromStorage/.test(companyShiftsUtils)
  && /export function getCompanyMarketItemsRaw/.test(companyShiftsSelectors)
  && /export function getCompanyPendingItemsRaw/.test(companyShiftsSelectors)
  && /export function filterCompanyPendingItems/.test(companyShiftsSelectors)
  && /export function filterCompanyMarketItems/.test(companyShiftsSelectors)
  && /export function filterCompanyFinalItems/.test(companyShiftsSelectors)
  && /export function getCompanyRoomScoreIds/.test(companyShiftsSelectors)
  && /export function getCompanyCanonicalCounts/.test(companyShiftsSelectors)
  && /export async function submitCompanyExtendRequest/.test(companyShiftsActions)
  && /export function openCompanyOfferModalForShift/.test(companyShiftsActions)
  && /export async function submitCompanyOfferModal/.test(companyShiftsActions)
  && /export async function openCompanyOffersModalForShift/.test(companyShiftsActions)
  && /export async function companyCounterOfferAction/.test(companyShiftsActions)
  && /export async function sendCompanyCounterOfferAction/.test(companyShiftsActions)
  && /export async function decideCompanyRoomOfferAction/.test(companyShiftsActions)
  && /export function renderCompanyOfferSummary/.test(companyShiftsSummaryCells)
  && /export function renderRoomOfferSummary/.test(companyShiftsSummaryCells)
  && /export function rankOffersWithRecommendation/.test(offerUtils)
  && (/export function AgreementBadge/.test(companyShiftsSections) || /export \{ AgreementBadge \}/.test(companyShiftsSections))
  && /from\s+["']\.\/companyShiftsPanelRows["']/.test(companyShiftsSections)
  && /from\s+["']\.\/companyShiftsPanelCards["']/.test(companyShiftsSections)
  && /from\s+["']\.\/companyShiftsPanelFilters["']/.test(companyShiftsSections)
  && /export function CompanyAccordionHeader/.test(companyShiftsFilters)
  && /export function CompanyMarketFilters/.test(companyShiftsFilters)
  && /export function CompanyPendingFilters/.test(companyShiftsFilters)
  && /export function CompanyFinalListFilters/.test(companyShiftsFilters)
  && /export function CompanyOffersDecisionModal/.test(companyShiftsSections)
  && /export function CompanyOfferSendModal/.test(companyShiftsSections)
  && /export function CompanyExtendModal/.test(companyShiftsSections)
  && /export function CompanyDetailModal/.test(companyShiftsSections)
  && /export function CompanyMarketSection/.test(companyShiftsSections)
  && /export function CompanyPendingSection/.test(companyShiftsSections)
  && /export function CompanyFinalListSection/.test(companyShiftsSections)
  && /export function CompanyMarketRow/.test(companyShiftsRows)
  && /export function CompanyPendingRow/.test(companyShiftsRows)
  && /export function CompanyFinalListRow/.test(companyShiftsRows)
  && /export function OfferSignalPill/.test(companyShiftsCards)
  && /export function CompanyOfferDecisionCard/.test(companyShiftsCards)
  && /export function CompanyVehicleDetailGrid/.test(companyShiftsCards)
  && /export function CompanyDriverDetailGrid/.test(companyShiftsCards)
  && /export function CompanyOfferRoomCard/.test(companyShiftsCards)
  && !/function minutesOf\(/.test(companyShifts)
  && !/function normalizeTemplate\(/.test(companyShifts)
  && !/function buildLocalRangeFromItem\(/.test(companyShifts)
  && !/function loadCustomTemplates\(/.test(companyShifts)
  && !/const FINAL_STATUSES = useMemo/.test(companyShifts)
  && !/function renderCompanyOfferSummary\(/.test(companyShifts)
  && !/const marketItemsRaw = useMemo\(\s*\(\) => items\.filter/.test(companyShifts)
  && /const marketItemsRaw = useMemo\(\(\) => getCompanyMarketItemsRaw/.test(companyShifts)
  && /const pendingItems = useMemo\(\(\) => filterCompanyPendingItems/.test(companyShifts)
  && /const finalItems = useMemo\(\(\) => filterCompanyFinalItems/.test(companyShifts)
  && !/function renderRoomOfferSummary\(/.test(companyShifts)
  && !/async function submitOfferModal\([\s\S]*?\/api\/shifts\/\$\{sid\}\/offers/.test(companyShifts)
  && !/async function companyCounterOffer\([\s\S]*?company-counter/.test(companyShifts)
  && !/async function acceptOfferPackage\([\s\S]*?\/api\/offers\/shift\//.test(companyShifts)
  && !/async function sendCounterOffer\([\s\S]*?\/api\/shifts\/\$\{sid\}\/company-offer/.test(companyShifts)
  && !/function RecommendationBadge\(/.test(companyShifts)
  && !/function RecommendationBadge\(/.test(companyShiftsSections)
  && !/function OfferDecisionCard\(/.test(companyShiftsSections)
  && !/Teklif Gönder — Shift #\{offerModal\.shiftId\}/.test(companyShifts)
  && !/Süre Uzat — Shift #\{extendModal\.shift\?\.id\}/.test(companyShifts)
  && !/detailModal\.kind === "vehicle" \? "Araç Bilgileri"/.test(companyShifts)
  && !/\/\* MARKET \(Accordion\) \*\//.test(companyShifts)
  && !/<h3 style=\{\{ margin: 0 \}\}>Bekleyen Talepler<\/h3>/.test(companyShifts)
  && !/Henüz “Liste”ye düşen kayıt yok\./.test(companyShifts)
  && !/clickableInfoStyle\(/.test(companyShifts)
  && !/marketItems\.map\(\(s\)/.test(companyShiftsSections)
  && !/pendingItems\.map\(\(s\)/.test(companyShiftsSections)
  && !/finalItems\.map\(\(s\)/.test(companyShiftsSections)
  && !/<h3 style=\{\{ margin: 0 \}\}>Market Shifts<\/h3>/.test(companyShiftsSections)
  && !/placeholder="Ara \(id\/status\)"/.test(companyShiftsSections)
  && !/placeholder="Ara \(id\/status\/note\/room\)"/.test(companyShiftsSections)
  && !/placeholder="Ara \(id\/status\/plate\/driver\/note\)"/.test(companyShiftsSections)
  && !/ProviderScoreBadge/.test(companyShiftsSections)) ok("company ShiftsPanel extracted track sections, rows, cards, filters, utils, summary cells, and action helpers using normalized API error helper");
else fail("company ShiftsPanel must use extracted utility/action/summary/section/row/card/filter modules with normalized API error parsing and second-stage filter extraction");

if (/from\s+["']\.\/shiftPeopleTabUtils["']/.test(shiftPeopleTab)
  && /from\s+["']\.\/shiftPeopleTabSections["']/.test(shiftPeopleTab)
  && /from\s+["']\.\.\/\.\.\/utils\/apiContract["']/.test(shiftPeopleTab)
  && /getApiErrorMessage/.test(shiftPeopleTab)
  && /export function writeGuidedResume/.test(shiftPeopleTabUtils)
  && /export function parseCsv/.test(shiftPeopleTabUtils)
  && /export function parseSheetRowsToPeople/.test(shiftPeopleTabUtils)
  && /export function sanitizeAddress/.test(shiftPeopleTabUtils)
  && /export function safeNum/.test(shiftPeopleTabUtils)
  && /export function computeGeoMeta/.test(shiftPeopleTabUtils)
  && /export function computeGeoStatus/.test(shiftPeopleTabUtils)
  && /export function clusterPeople/.test(shiftPeopleTabUtils)
  && /export function ShiftPeopleSummarySection/.test(shiftPeopleTabSections)
  && /export function ShiftPeopleHubSection/.test(shiftPeopleTabSections)
  && /export function ShiftPeopleImportSection/.test(shiftPeopleTabSections)
  && !/function writeGuidedResume\(/.test(shiftPeopleTab)
  && !/function parseCsv\(/.test(shiftPeopleTab)
  && !/function parseSheetRowsToPeople\(/.test(shiftPeopleTab)
  && !/function sanitizeAddress\(/.test(shiftPeopleTab)
  && !/function computeGeoMeta\(/.test(shiftPeopleTab)
  && !/function clusterPeople\(/.test(shiftPeopleTab)
  && !/<b>Room:<\/b> \{roomText\}/.test(shiftPeopleTab)
  && !/Vardiya Toplanma \/ Dağıtım Yeri/.test(shiftPeopleTab)
  && !/<b>Excel\/CSV Import<\/b>/.test(shiftPeopleTab)) ok("company ShiftPeopleTab extracted geo/import helpers and large sections into shared modules with normalized API error parsing");
else fail("company ShiftPeopleTab must use extracted geo/import helper and section modules with normalized API error parsing");

if (/from\s+["']\.\/guidedPlanModalUtils["']/.test(guidedPlanModal)
  && /from\s+["']\.\/guidedPlanModalSections["']/.test(guidedPlanModal)
  && /from\s+["']\.\/guidedPlanModalActions["']/.test(guidedPlanModal)
  && /from\s+["']\.\.\/\.\.\/utils\/apiContract["']/.test(guidedPlanModal)
  && /export const PACKS/.test(guidedPlanUtils)
  && /export function parseTryInput/.test(guidedPlanUtils)
  && /from\s+["']\.\/guidedPlanModalCards["']/.test(guidedPlanSections)
  && /export function GuidedHubStep/.test(guidedPlanSections)
  && /export function GuidedPlanSetupStep/.test(guidedPlanSections)
  && /export function GuidedSolveOffersStep/.test(guidedPlanSections)
  && /export async function cleanupGuidedDraftShifts/.test(guidedPlanActions)
  && /export async function createGuidedDraftShiftsAction/.test(guidedPlanActions)
  && /export async function loadGuidedCompanyHub/.test(guidedPlanActions)
  && /export async function osrmReorderGuidedCore/.test(guidedPlanActions)
  && /export async function sendGuidedBulkOffersAction/.test(guidedPlanActions)
  && /export function GuidedDraftShiftsCard/.test(guidedPlanCards)
  && /export function GuidedBulkOffersCard/.test(guidedPlanCards)
  && /export function GuidedDraftShiftRow/.test(guidedPlanCards)
  && /export function GuidedRoomSelectionCard/.test(guidedPlanCards)
  && /guidedPlanModalDestinationCards/.test(guidedPlanCards)
  && /guidedPlanModalPlanCards/.test(guidedPlanCards)
  && /export function GuidedPlanPackCard/.test(guidedPlanPlanCards)
  && /export function GuidedPlanDatesCard/.test(guidedPlanPlanCards)
  && /export function GuidedCustomSlotCard/.test(guidedPlanPlanCards)
  && /export function GuidedOrganizationPlanCard/.test(guidedPlanDestinationCards)
  && /export function GuidedDestinationRowCard/.test(guidedPlanDestinationCards)
  && /export function GuidedOrganizationReadinessCard/.test(guidedPlanCards)
  && /export function GuidedCompanyGeoGateCard/.test(guidedPlanCards)
  && /export function GuidedOsrmGateCard/.test(guidedPlanCards)
  && !/function stepTitle\(/.test(guidedPlanModal)
  && !/function readGuidedTempShiftIds\(/.test(guidedPlanModal)
  && !/async function createDraftShifts\([\s\S]*?await api\("\/api\/shifts"/.test(guidedPlanModal)
  && !/async function osrmReorderCore\([\s\S]*?solve-vrp/.test(guidedPlanModal)
  && !/async function sendBulkOffers\([\s\S]*?\/offers/.test(guidedPlanModal)
  && !/function DraftShiftsCard\(/.test(guidedPlanSections)
  && !/function BulkOffersCard\(/.test(guidedPlanSections)
  && !/<div style=\{\{ fontWeight: 800 \}\}>Plan paketi<\/div>/.test(guidedPlanModal)
  && !/<div style=\{\{ fontWeight: 800 \}\}>Tarih \+ günler<\/div>/.test(guidedPlanModal)
  && !/<div style=\{\{ fontWeight: 800 \}\}>Organizasyon detayları<\/div>/.test(guidedPlanModal)
  && !/function GuidedOrganizationPlanCard\(/.test(guidedPlanCards)
  && !/function GuidedDestinationRowCard\(/.test(guidedPlanCards)
  && !/function GuidedPlanPackCard\(/.test(guidedPlanCards)
  && !/function GuidedPlanDatesCard\(/.test(guidedPlanCards)
  && !/Toplu teklif gönder/.test(guidedPlanSections)
  && !/Taslak shift’ler/.test(guidedPlanSections)) ok("company GuidedPlanModal extracted shared helpers, sections, cards, and async action modules without local helper shadowing");
else fail("company GuidedPlanModal must use extracted helper/section/card/action modules without local helper shadowing or inline draft/bulk async bodies");


if (/from\s+["']\.\/planBuilderPanelUtils["']/.test(planBuilderPanel)
  && /from\s+["']\.\/planBuilderPanelWorkflow["']/.test(planBuilderActions)
  && /from\s+["']\.\/planBuilderPanelActions["']/.test(planBuilderPanel)
  && /from\s+["']\.\/planBuilderPanelSections["']/.test(planBuilderPanel)
  && /from\s+["']\.\.\/\.\.\/utils\/apiContract["']/.test(planBuilderPanel)
  && /getApiErrorMessage/.test(planBuilderPanel)
  && /export function encodeGeohash/.test(planBuilderUtils)
  && /export function buildLocalRangeFromItem/.test(planBuilderUtils)
  && /export function istanbulLocalToUtcIso/.test(planBuilderUtils)
  && /export function avgLatLng/.test(planBuilderUtils)
  && /export function normalizeMaxWalkM/.test(planBuilderWorkflow)
  && /export function clusterPreviewStops/.test(planBuilderWorkflow)
  && /export function buildPreviewPathPoints/.test(planBuilderWorkflow)
  && /export function summarizeMatrix/.test(planBuilderWorkflow)
  && /export async function ensurePlanBuilderRoomsLoaded/.test(planBuilderActions)
  && /export async function sendPlanBuilderBulkOffers/.test(planBuilderActions)
  && /export async function openPlanBuilderVehiclePreview/.test(planBuilderActions)
  && /export async function computePlanBuilderMatrix/.test(planBuilderActions)
  && /export async function solvePlanBuilderRoute/.test(planBuilderActions)
  && /export async function applyPlanBuilderToShifts/.test(planBuilderActions)
  && /export function PlanBuilderHeaderBar/.test(planBuilderSections)
  && /export function PlanBuilderWorkflowSection/.test(planBuilderSections)
  && /export function PlanBuilderSummaryParamsSection/.test(planBuilderSections)
  && /export function PlanBuilderDraftTimingSection/.test(planBuilderSections)
  && /export function PlanBuilderDraftGroupsSection/.test(planBuilderSections)
  && /export function PlanBuilderBulkOfferModal/.test(planBuilderSections)
  && !/const GEOHASH_BASE32/.test(planBuilderPanel)
  && !/function encodeGeohash\(/.test(planBuilderPanel)
  && !/function buildLocalRangeFromItem\(/.test(planBuilderPanel)
  && !/function avgLatLng\(/.test(planBuilderPanel)
  && !/function normalizeMaxWalkM\(/.test(planBuilderPanel)
  && !/function clusterPreviewStops\(/.test(planBuilderPanel)
  && !/function buildPreviewPathPoints\(/.test(planBuilderPanel)
  && !/function summarizeMatrix\(/.test(planBuilderPanel)
  && !includesText(planBuilderPanel, "if (pbRooms?.length) return;")
  && !includesText(planBuilderPanel, "const roomIds = Object.entries(bulkOffer.roomsSel || {})")
  && !includesText(planBuilderPanel, "setPreviewBusy((p) => ({ ...p, [idx]: true }));")
  && !includesText(planBuilderPanel, "setMxRes((p) => ({ ...p, [idx]: null }));")
  && !includesText(planBuilderPanel, "setSolveRes((p) => ({ ...p, [idx]: null }));")
  && !includesText(planBuilderPanel, "setApplyRes(null);")
  && !/Toplu Teklif Gönder<\/h3>/.test(planBuilderPanel)
  && !/Taslak gruplar ve rota önerisi/.test(planBuilderPanel)
  && !/Plan Builder \(Stage-3\)/.test(planBuilderPanel)
  && !/İş Akışı/.test(planBuilderPanel)
  && !/Talep taslağı zamanı/.test(planBuilderPanel)) ok("company PlanBuilderPanel extracted shared workflow helpers and async action modules with expanded summary/workflow/timing sections and normalized API error parsing");
else fail("company PlanBuilderPanel must use extracted util/workflow/action/section modules without local preview-solve-apply helper duplication");

if (process.exitCode) process.exit(process.exitCode);

if (/from\s+["']\.\/roomShiftsPanelUtils["']/.test(roomShifts)
  && /from\s+["']\.\/roomShiftsOverviewSection["']/.test(roomShifts)
  && /from\s+["']\.\/roomShiftsMainSections["']/.test(roomShifts)
  && /from\s+["']\.\.\/\.\.\/utils\/apiContract["']/.test(roomShifts)
  && /getApiErrorMessage/.test(roomShifts)
  && /export function normalizeRoomShiftError/.test(roomShiftsUtils)
  && /getApiErrorInfo/.test(roomShiftsUtils)
  && /from\s+["']\.\/roomShiftsPanelSections["']/.test(roomShiftsMainSections)
  && /RoomShiftsDispatchPoolSection/.test(roomShiftsMainSections)
  && /RoomShiftsOverviewSection/.test(roomShiftsOverview)
  && /RoomShiftsModalSection/.test(roomShiftsOverview)
  && /RoomShiftsDispatchPoolSection/.test(roomShiftsOverview)
  && /from\s+["']\.\/roomShiftsPanelRows["']/.test(roomShiftsSections)
  && /from\s+["']\.\/roomShiftsPanelCards["']/.test(roomShiftsSections)
  && /export \{[\s\S]*AgreementBadge[\s\S]*RoomAvailabilityLine[\s\S]*\}/.test(roomShiftsSections)
  && /export function RoomPendingSection/.test(roomShiftsSections)
  && /export function RoomFinalListSection/.test(roomShiftsSections)
  && /export function RoomDispatchPoolSummary/.test(roomShiftsSections)
  && /export function RoomPendingShiftRow/.test(roomShiftsRows)
  && /export function RoomAllShiftRow/.test(roomShiftsRows)
  && /export function AgreementBadge/.test(roomShiftsCards)
  && /export function RoomAvailabilityLine/.test(roomShiftsCards)
  && /export function RoomDispatchSuggestionCard/.test(roomShiftsCards)
  && /shiftRequiredPax/.test(roomShiftsUtils)
  && /shiftRequiredPax/.test(roomShifts)
  && !/function renderAvailLine\(/.test(roomShifts)
  && !/const state = poolSummary\[sid\] \|\| null;/.test(roomShifts)
  && !/<h3>Bekleyen Talepler<\/h3>/.test(roomShifts)
  && !/<h3>Tüm Shifts<\/h3>/.test(roomShifts)
  && !/visibleCount=\{listFiltered\.length\}/.test(roomShifts)
  && !/function RoomPendingShiftRow\(/.test(roomShiftsSections)
  && !/function RoomAllShiftRow\(/.test(roomShiftsSections)
  && !/Öneri #\{part\.splitIndex\}/.test(roomShiftsSections)
  && /RoomDispatchSuggestionCard/.test(roomShiftsSections)) ok("room ShiftsPanel extracted shared helpers, row components, and dispatch cards using normalized API error helper");
else fail("room ShiftsPanel must use extracted helper/section/row/card modules with normalized API error parsing and dispatch card extraction");

if (/from\s+["']\.\/roomVehiclesPanelUtils["']/.test(roomVehicles)
  && /from\s+["']\.\/roomVehiclesPanelSections["']/.test(roomVehicles)
  && /export function pickRoomVehicleError/.test(roomVehiclesUtils)
  && /export const VEHICLE_TYPES/.test(roomVehiclesUtils)
  && /from\s+["']\.\/roomVehiclesPanelRows["']/.test(roomVehiclesSections)
  && /from\s+["']\.\/roomVehiclesPanelCards["']/.test(roomVehiclesSections)
  && /export function RoomVehicleStatusSection/.test(roomVehiclesSections)
  && /export function RoomVehicleAssignmentsSection/.test(roomVehiclesSections)
  && /export function RoomVehicleAvailabilitySection/.test(roomVehiclesSections)
  && /export function RoomVehicleTelematicsSection/.test(roomVehiclesSections)
  && /export \{ RoomVehicleLinkSection, RoomVehicleEditModal \} from ["']\.\/roomVehiclesPanelCards["']/.test(roomVehiclesSections)
  && /export function ShiftCompact/.test(roomVehiclesRows)
  && /export function RoomVehicleAssignmentRow/.test(roomVehiclesRows)
  && /export function RoomVehicleAvailabilityRow/.test(roomVehiclesRows)
  && /export function RoomTelematicsDeviceRow/.test(roomVehiclesRows)
  && /export function RoomDeviceTokenRevealCard/.test(roomVehiclesCards)
  && /export function RoomVehicleTransferWarning/.test(roomVehiclesCards)
  && /export function RoomVehicleCurrentLinkCard/.test(roomVehiclesCards)
  && /export function RoomVehicleLinkSection/.test(roomVehiclesCards)
  && /export function RoomVehicleEditModal/.test(roomVehiclesCards)
  && !/function ShiftCompact\(/.test(roomVehicles)
  && !/function ShiftCompact\(/.test(roomVehiclesSections)
  && !/<h3 style=\{\{ marginBottom: 0 \}\}>Atamalar<\/h3>/.test(roomVehicles)
  && !/<h3 style=\{\{ marginBottom: 0 \}\}>Müsaitlik<\/h3>/.test(roomVehicles)
  && !/Telematics Device Yönetimi/.test(roomVehicles)
  && !/<h3>Bağlantı \(Araç ↔ Sürücü\)<\/h3>/.test(roomVehicles)
  && !/<h3>Düzenle<\/h3>/.test(roomVehicles)
  && !/<ShiftCompact s=\{cur\}/.test(roomVehiclesSections)
  && !/const vOk = row \? row\.vehicleOk : null;/.test(roomVehiclesSections)
  && !/const draft = deviceDrafts\?\.\[d\.id\]/.test(roomVehiclesSections)
  && !/Yeni device token \(ilk ve tek gösterim\)/.test(roomVehiclesSections)
  && !/Aktif sürücü/.test(roomVehiclesSections)
  && !/Hazır Şablon \(TR\) \(opsiyonel\)/.test(roomVehiclesSections)
  && /RoomVehicleAssignmentsSection/.test(roomVehicles)
  && /RoomVehicleAvailabilitySection/.test(roomVehicles)
  && /RoomVehicleTelematicsSection/.test(roomVehicles)
  && /RoomVehicleLinkSection/.test(roomVehicles)
  && /RoomVehicleEditModal/.test(roomVehicles)) ok("room VehiclesPanel extracted section, row, and card/modal components for assignments, availability, telematics, link, and edit flows");
else fail("room VehiclesPanel must use extracted section, row, and card/modal components for assignments, availability, telematics, link, and edit flows");

if (process.exitCode) process.exit(process.exitCode);
