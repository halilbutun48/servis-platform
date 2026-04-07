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

console.log("=== M82.1 CORRECTNESS GUARD CHECK ===");

const people = read("backend/src/routes/shifts/people.js");
const room = read("backend/src/routes/shifts/room.js");

const previewIdx = people.indexOf('r.get("/:id/route-preview"');
const authIdx = people.indexOf('const shift = await getShiftAndCheckScopeOrThrow', previewIdx);
const cacheIdx = people.indexOf('const payload = await rememberResponse(', previewIdx);
if (previewIdx >= 0) ok("people route-preview endpoint exists"); else fail("people route-preview endpoint exists");
if (authIdx > previewIdx && cacheIdx > previewIdx && authIdx < cacheIdx) ok("route-preview auth/scope check runs before cache read"); else fail("route-preview auth/scope check runs before cache read");
if (includesText(people, 'allowRoomOfferScope: true')) ok("route-preview keeps room-offer scope gate"); else fail("route-preview keeps room-offer scope gate");

if (!includesText(room, 'json({ error') && !includesText(room, 'json({ ok: false')) ok("room routes no longer return ad-hoc error json bodies"); else fail("room routes no longer return ad-hoc error json bodies");
if (includesText(room, 'import { httpError, sendErrorResponse } from "../../errors/http.js";')) ok("room routes use centralized http error helpers"); else fail("room routes use centralized http error helpers");
if (!includesText(room, 'const httpError = (status, message) =>')) ok("room routes no longer shadow central httpError helper"); else fail("room routes no longer shadow central httpError helper");
if (includesText(room, 'clearShiftRoutePreviewCache(updated.id);')) ok("room write flows clear preview cache after mutation"); else fail("room write flows clear preview cache after mutation");
if (includesText(room, 'await rebuildShiftRouteStateBestEffort(shift.id);')) ok("room suggestion stop accept rebuilds route state"); else fail("room suggestion stop accept rebuilds route state");
if (includesText(room, 'return sendPenaltyError(res, e);')) ok("room penalty conflicts flow through centralized error helper"); else fail("room penalty conflicts flow through centralized error helper");

if (process.exitCode) process.exit(process.exitCode);
console.log("M82.1 CORRECTNESS GUARD CHECK PASS");
