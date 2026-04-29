import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "..", "..");


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
  return fs.readFileSync(path.join(repoRoot, rel), "utf8");
}
function ok(msg) { console.log(`OK ${msg}`); }
function fail(msg) { console.error(`FAIL ${msg}`); process.exitCode = 1; }
function segment(text, startNeedle, endNeedle) {
  const start = text.indexOf(startNeedle);
  if (start < 0) return null;
  const end = endNeedle ? text.indexOf(endNeedle, start + startNeedle.length) : -1;
  return text.slice(start, end >= 0 ? end : undefined);
}
function expectIncludes(text, needle, msg) { if (text && includesText(text, needle)) ok(msg); else fail(msg); }

console.log("=== M82.1 ACCEPTANCE + CONTRACT CHECK ===");

const company = read("backend/src/routes/shifts/company.js");
const companyStops = read("backend/src/routes/shifts/shiftsCompanyStopsRouter.js");
const companyMutationTail = read("backend/src/services/companyShiftMutationTail.js");
const people = read("backend/src/routes/shifts/people.js");
const room = read("backend/src/routes/shifts/room.js");
const organization = read("backend/src/routes/organization.js");
const routeState = read("backend/src/services/shiftRouteState.js");

if (!includesText(company, 'json({ error') && !includesText(company, 'json({ ok: false')) ok("company routes no longer return ad-hoc error json bodies"); else fail("company routes no longer return ad-hoc error json bodies");
if (!includesText(people, 'json({ error') && !includesText(people, 'json({ ok: false')) ok("people routes no longer return ad-hoc error json bodies"); else fail("people routes no longer return ad-hoc error json bodies");
if (!includesText(room, 'json({ error') && !includesText(room, 'json({ ok: false')) ok("room routes no longer return ad-hoc error json bodies"); else fail("room routes no longer return ad-hoc error json bodies");
if (!includesText(organization, 'json({ error') && !includesText(organization, 'json({ ok: false')) ok("organization routes no longer return ad-hoc error json bodies"); else fail("organization routes no longer return ad-hoc error json bodies");
if (!includesText(company, 'async function refreshShiftRouteSnapshot(')) ok("company routes no longer keep local snapshot rebuild helper shadow"); else fail("company routes no longer keep local snapshot rebuild helper shadow");

const companyCreate = segment(company, 'r.post(\n    "/",', 'r.delete(');
expectIncludes(companyCreate, 'await refreshCompanyShiftRouteStateAfterMutation(shift.id, true);', 'company create refreshes route state after transaction');
expectIncludes(companyMutationTail, 'if (routeShapeChanged === true) {', 'company mutation tail keeps route-shape rebuild branch');
expectIncludes(companyMutationTail, 'await rebuildShiftRouteStateBestEffort(shiftId);', 'company mutation tail rebuilds route state after create/update mutations');

const companyUpdate = segment(company, 'r.put(\n    "/:id",', 'r.put(\n    "/:id/company-offer"');
expectIncludes(companyUpdate, 'await refreshCompanyShiftRouteStateAfterMutation(id, routeShapeChanged);', 'company update delegates route refresh tail to helper');
expectIncludes(companyMutationTail, 'if (routeShapeChanged === false) {', 'company mutation tail keeps preview-cache branch');
expectIncludes(companyMutationTail, 'clearShiftRoutePreviewCache(shiftId);', 'company mutation tail clears preview cache for non-route-shape updates');

const companyAddStop = segment(companyStops, 'r.post(\n    "/:id/stops",', 'r.put(\n    "/:id/stops/:stopId');
expectIncludes(companyAddStop, 'await rebuildShiftRouteStateBestEffort(shiftId);', 'company stop add rebuilds route state');

const companyUpdateStop = segment(companyStops, 'r.put(\n    "/:id/stops/:stopId', 'r.delete(\n    "/:id/stops/:stopId');
expectIncludes(companyUpdateStop, 'await rebuildShiftRouteStateBestEffort(shiftId);', 'company stop update rebuilds route state');

const companyDeleteStop = segment(companyStops, 'r.delete(\n    "/:id/stops/:stopId', 'r.post(\n    "/:id/stops/from-template"');
expectIncludes(companyDeleteStop, 'await rebuildShiftRouteStateBestEffort(shiftId);', 'company stop delete rebuilds route state');

const companyTemplate = segment(companyStops, 'r.post(\n    "/:id/stops/from-template"', 'r.put(\n    "/:id/stops/reorder"');
expectIncludes(companyTemplate, 'await prisma.$transaction(async (tx) => {', 'company template apply is transaction wrapped');
expectIncludes(companyTemplate, 'await rebuildShiftRouteStateBestEffort(shiftId);', 'company template apply rebuilds route state');

const companyReorder = segment(companyStops, 'r.put(\n    "/:id/stops/reorder"', null);
expectIncludes(companyReorder, 'await rebuildShiftRouteStateBestEffort(shiftId);', 'company reorder rebuilds route state');

const peopleUpsert = segment(people, 'r.put("/:id/people"', 'r.post("/:id/people/import"');
expectIncludes(peopleUpsert, 'clearShiftRoutePreviewCache(shift.id);', 'people upsert clears preview cache');

const peopleImport = segment(people, 'r.post("/:id/people/import"', 'r.post("/:id/stops/generate"');
expectIncludes(peopleImport, 'clearShiftRoutePreviewCache(shift.id);', 'people import clears preview cache');

const peopleGenerateImpl = segment(people, 'async function generateStopsForShiftInternal', 'export function attachShiftPeopleRoutes');
const peopleGenerate = segment(people, 'r.post("/:id/stops/generate"', 'r.get("/:id/stops"');
expectIncludes(peopleGenerate, 'generateStopsForShiftInternal({ req, shift, mode, maxWalkM });', 'people generate route uses canonical generator');
expectIncludes(peopleGenerateImpl, 'await prisma.$transaction(async (tx) => {', 'people generate is transaction wrapped');
expectIncludes(peopleGenerateImpl, 'await rebuildShiftRouteStateBestEffort(shift.id);', 'people generate rebuilds route state');

const ensureMarketShift = segment(organization, 'async function ensureMarketShiftFromPlan(company, plan) {', 'export function organizationRouter(io) {');
expectIncludes(ensureMarketShift, 'await rebuildShiftRouteStateBestEffort(shift.id);', 'organization plan-to-shift builder rebuilds route state');

expectIncludes(routeState, 'clearResponseCacheExact(shiftRoutePreviewCacheKey(shiftId));', 'route state service clears preview cache by exact key');
expectIncludes(routeState, 'routeSnapshotInputHash: null,', 'route state invalidation nulls snapshot input hash');
expectIncludes(routeState, 'clearShiftRoutePreviewCache(shiftId);', 'route state rebuild clears preview cache before refresh');
expectIncludes(routeState, 'return refreshShiftRouteSnapshot(shiftId);', 'route state rebuild refreshes snapshot after invalidation');

if (process.exitCode) process.exit(process.exitCode);
console.log('M82.1 ACCEPTANCE + CONTRACT CHECK PASS');
