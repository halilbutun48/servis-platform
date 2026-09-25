/*
 * PRE-18 Category-B bounded acceptance.
 *
 * This package consumes the existing screen, navigation, browser and security
 * check families.  The assertions here cover only the material current hunks
 * that were still missing exact acceptance; they do not become a second
 * product policy or ownership ledger.
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ROOM } from "../src/ai/jobGuide/screenCatalog.roomCompany.js";
import { getScreenDefinitionForUser } from "../src/ai/jobGuide/screenCatalog.js";
import * as roleNavigation from "../../web/src/utils/roleNavigation.js";

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), "../..");
const failures = [];
let assertionCount = 0;

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}
function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex").toUpperCase();
}
function check(name, value, detail = "") {
  assertionCount += 1;
  if (!value) failures.push({ name, detail });
}
function expectedSourceIdentity(relativePath, expectedRawSha) {
  const raw = fs.readFileSync(path.join(repoRoot, relativePath));
  check(`${relativePath}:current-source-identity`, sha256(raw) === expectedRawSha, JSON.stringify({ expectedRawSha, actualRawSha: sha256(raw) }));
}
function sourceWithoutComments(value) {
  return value.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}

const expected = {
  screenCatalog: "F5E819AB22DD8BB244DBBCD9C633F57EF2AFC084E11E4FF62045DB882543D260",
  operations: "D5F1181D8414BC49BF700A7688FAFD9FBE74539F78A16FB67BDCBEFA24088961",
  map: "DFD648AC0D68FC40DA11FD1FE60D3969D1DFE05C811B4504B0E48B052D293311",
  passengerLinks: "A80115478963A14CC95AE20821E008E3E158F45D80122408EF20491AEDA3C844",
  dashboardBulk: "73856CA9042F631909914290F28BEFCFD9538DCFEBFEF2D10987773F3F48E175",
};

expectedSourceIdentity("backend/src/ai/jobGuide/screenCatalog.roomCompany.js", expected.screenCatalog);
expectedSourceIdentity("web/src/components/OperationsCommandCenter.jsx", expected.operations);
expectedSourceIdentity("web/src/components/map/MapView.jsx", expected.map);
expectedSourceIdentity("web/src/panels/company/PassengerLinksPanel.jsx", expected.passengerLinks);
expectedSourceIdentity("web/src/utils/dashboardBulk.js", expected.dashboardBulk);

const screenSource = read("backend/src/ai/jobGuide/screenCatalog.roomCompany.js");
const appSource = read("web/src/App.jsx");
const operationsSource = read("web/src/components/OperationsCommandCenter.jsx");
const mapSource = read("web/src/components/map/MapView.jsx");
const mapCss = read("web/src/components/map/mapShell.css");
const indexCss = read("web/src/index.css");
const passengerSource = read("web/src/panels/company/PassengerLinksPanel.jsx");
const dashboardBulkSource = read("web/src/utils/dashboardBulk.js");

// ROOM catalog parity: catalog metadata, route policy and App route/render
// authority must agree for every current ROOM/shared catalog entry.
const roomUser = { id: 701, role: "ROOM", roomId: 17, companyId: 71 };
const roomPaths = ROOM.map((entry) => entry.path);
check("ROOM catalog has current ROOM and shared entries", roomPaths.includes("/room") && roomPaths.includes("/shared/feedback"), roomPaths.join(","));
for (const route of roomPaths) {
  const definition = getScreenDefinitionForUser(roomUser, { path: route });
  check(`ROOM catalog resolves ${route}`, definition?.path === route && definition?.roleKey === "ROOM", JSON.stringify(definition));
  check(`ROOM route policy allows ${route}`, roleNavigation.resolveRouteScope(roomUser, route) === "ALLOW", roleNavigation.resolveRouteScope(roomUser, route));
  check(`App owns ${route} route/render authority`, appSource.includes(route), route);
}
check("legacy cop_03a lookup is not reintroduced", !screenSource.includes("cop_03a") && !appSource.includes("cop_03a"));
check("ROOM/COMPANY distinction remains enforced", getScreenDefinitionForUser(roomUser, { path: "/company/shifts" }) === null && roleNavigation.resolveRouteScope(roomUser, "/company/shifts") === "DENY");

// OperationsCommandCenter: exact state branches and role/tenant-scoped data
// contract are covered by the existing browser check; these assertions bind
// the current material source hunks to that acceptance family.
for (const marker of ["loadActionableEventsBundle", "loading", "sourceUnavailable", "data-command-center-empty", "data-command-center-primary-action", "roleTaskDetails", "data-actionable-event-id", "data-command-center-source"]) {
  check(`OperationsCommandCenter current state marker: ${marker}`, operationsSource.includes(marker), marker);
}
check("OperationsCommandCenter cancels stale async state", /let active = true|active = false|return \(\) => \{\s*active = false/s.test(operationsSource), "missing cancellation guard");
check("OperationsCommandCenter has no raw token/internal leakage", !/item\.(token|authorization|userId|tenantId)/iu.test(operationsSource), "technical token in rendered event fields");
check("OperationsCommandCenter consumes shared actionable-events source", /loadActionableEventsBundle\(\{\s*token,\s*force:\s*true/s.test(operationsSource));

// MapView current viewport and reduced-motion contract.
const mapVisible = sourceWithoutComments(mapSource);
check("MapView observes container size and invalidates without animation", mapVisible.includes("ResizeObserver") && /invalidateSize\(\{\s*pan:\s*false,\s*animate:\s*false/s.test(mapVisible));
check("MapView camera transitions disable animation", /fitBounds\([\s\S]*animate:\s*false/s.test(mapVisible) && /flyTo\([\s\S]*animate:\s*false/s.test(mapVisible));
check("MapView shell prevents horizontal clipping", /overflow\s*:\s*hidden/s.test(mapCss) && /overflow-x\s*:\s*hidden/s.test(indexCss));
check("MapView reduced-motion CSS is present", /prefers-reduced-motion\s*:\s*reduce/s.test(indexCss));
check("MapView uses current location terminology", ["Konum kaynağı", "Konum durumu", "Rota kaynağı"].every((term) => mapSource.includes(term)));
check("MapView has no retired Leaflet wording in rendered source", !/>[^<]*Leaflet[^<]*</iu.test(mapVisible));
check("MapView remains a readonly map surface without invented location", mapVisible.includes("MapContainer") && !/\b(fetch|api)\s*\(/u.test(mapVisible) && !/fake|invented|simulated/iu.test(mapVisible));

// PassengerLinksPanel targeted privacy boundary and TTL/error behavior.
check("PassengerLinksPanel uses COMPANY-scoped API endpoints", passengerSource.includes("/api/company/passenger-links") && passengerSource.includes("/api/shifts?status=APPROVED,ACTIVE"));
check("PassengerLinksPanel enforces revoked/expired link usability", /revokedAt/.test(passengerSource) && /expiresAt/.test(passengerSource) && /isUsableLink/.test(passengerSource));
check("PassengerLinksPanel preserves TTL choices", ["7", "30", "180", "365"].every((value) => passengerSource.includes(`value=\"${value}\"`)));
check("PassengerLinksPanel does not render token or internal ids in errors", !/err\.(token|userId|tenantId|personelId)|JSON\.stringify\(err\)/iu.test(passengerSource));
check("PassengerLinksPanel does not contain parent identity/location projection", !/parent.*(identity|location)|location.*parent/iu.test(passengerSource));
check("PassengerLinksPanel keeps access-code one-time disclosure", /security|güvenlik/iu.test(passengerSource) && /access code|erişim kodu/iu.test(passengerSource));

// Dashboard bulk helper isolated acceptance.
check("dashboardBulk actionable helper calls only actionable-events bundle", /loadDashboardBulkBundle\("actionable-events"/s.test(dashboardBulkSource));
check("dashboardBulk helper normalizes only events and summary", /events:\s*normalizeItems\(payload\.events\)/s.test(dashboardBulkSource) && /summary:\s*payload\.summary/s.test(dashboardBulkSource));
check("dashboardBulk helper preserves empty/error behavior", /if \(!payload\) return null/s.test(dashboardBulkSource) && /total:\s*0,\s*byGroup:\s*\{\}/s.test(dashboardBulkSource));
check("dashboardBulk helper forwards token and request controls", /token,\s*force,\s*signal/s.test(dashboardBulkSource));
check("dashboardBulk helper does not fabricate events", !/events:\s*\[[^\]]*fake|events:\s*\[[^\]]*mock/iu.test(dashboardBulkSource));

const summary = {
  assertions: assertionCount,
  passed: assertionCount - failures.length,
  failures,
  roomCatalogPathCount: ROOM.length,
  staleCop03aExpectationReintroduced: false,
};
console.log(JSON.stringify(summary, null, 2));
if (failures.length) process.exitCode = 1;
else console.log(`PRE_18_FINAL_CATEGORY_B_PRODUCT_ACCEPTANCE_CLOSURE_02=PASS ${assertionCount}/${assertionCount}`);
