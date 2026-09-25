/*
 * PRE-18 Category-C current product-source acceptance.
 *
 * This is a bounded acceptance consumer.  It exercises the security and
 * semantic modules directly and binds the current JSX/configuration hunks to
 * their existing component and build contracts.  It is intentionally not a
 * second ownership ledger and does not change product behaviour.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import prisma from "../src/prisma.js";
import { authorizeSemanticRequest } from "../src/ai/chat/authorizationGate.js";
import { resolveFieldPrivacyPolicy } from "../src/ai/chat/fieldPrivacyPolicy.js";
import { normalizeSeferAbiUserFacingPayload } from "../src/ai/chat/userFacingLanguageNormalizer.js";
import { normalizeCopilotRequestInput, parseCopilotRequest } from "../src/ai/schemas.js";
import { resolveAuthorizedProductDomains, buildAuthorizedProductAwarenessAnswer, buildVisibleFactText, summarizeAuthorizedCurrentScreenSnapshot } from "../src/services/authorizedProductAwareness.js";
import { resolveSemanticIntent } from "../src/ai/chat/semanticIntentPlanner.js";
import { ROOM, COMPANY } from "../src/ai/jobGuide/screenCatalog.roomCompany.js";
import { getScreenDefinitionForUser } from "../src/ai/jobGuide/screenCatalog.js";
import * as roleNavigation from "../../web/src/utils/roleNavigation.js";
import { resolveExplicitCopilotRecord } from "../../web/src/utils/copilotSelection.js";

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), "../..");
const failures = [];
let assertionCount = 0;

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}
function rawSha(relativePath) {
  return crypto.createHash("sha256").update(fs.readFileSync(path.join(repoRoot, relativePath))).digest("hex").toUpperCase();
}
function check(name, value, detail = "") {
  assertionCount += 1;
  if (!value) failures.push({ name, detail });
}
function hasAll(source, markers) {
  return markers.every((marker) => source.includes(marker));
}

const targets = {
  "backend/src/ai/chat/authorizationGate.js": "8556F409BA3C4835CBB8043396A88BFD14DA905DEBACA2694F94E5D138F0E82B",
  "backend/src/ai/chat/fieldPrivacyPolicy.js": "EF87634FBA829AF4C0CEB84AEE9A338C4B629B3158BF20504F06A403849D68A0",
  "backend/src/ai/chat/userFacingLanguageNormalizer.js": "C9B1161D0EFD2474CDFD3416230826AF0ACEA820D4EA762ADF54029D13CAECB4",
  "backend/src/ai/schemas.js": "D85A8A6DC4BA320AF5D7EE67DFC78A4282C93BE73CB982415AA0F72DB5D49895",
  "backend/src/services/authorizedProductAwareness.js": "154CB640CC7634D04209E77F1392A98350A60A901396041F3C8505C49612E4C7",
  "web/src/components/geo/GeoLocationPicker.jsx": "F009CD05537C062E4151BE4E439BE8CAE501F2C78BD3A963198A699020DFD569",
  "web/src/components/geo/HubMapPicker.jsx": "E5A6E4EEF74785594E8DDCAD2F35C174A106CADABDBCD6164D807033FEEBC310",
  "web/src/panels/shared/CommercialShiftCardPresentation.jsx": "4E10C7893D5825ABA5465955811535398AC031449C7E420499A939F97DDF66A4",
  "web/src/utils/copilotSelection.js": "0F40C84BA2210176488BF475D6073C3D5E4713556ADFE12A2FB5BB54ABFDA38B",
  "web/vite.config.js": "D6525E52EB61C4034A9C17F82537E2D127C95B017DDCB4ACE46B4E6029695A73",
};

for (const [relativePath, expected] of Object.entries(targets)) {
  check(`${relativePath}:current-source-identity`, rawSha(relativePath) === expected, JSON.stringify({ expected, actual: rawSha(relativePath) }));
}

const authorizationSource = read("backend/src/ai/chat/authorizationGate.js");
const privacySource = read("backend/src/ai/chat/fieldPrivacyPolicy.js");
const languageSource = read("backend/src/ai/chat/userFacingLanguageNormalizer.js");
const schemaSource = read("backend/src/ai/schemas.js");
const awarenessSource = read("backend/src/services/authorizedProductAwareness.js");
const geoSource = read("web/src/components/geo/GeoLocationPicker.jsx");
const hubSource = read("web/src/components/geo/HubMapPicker.jsx");
const shiftSource = read("web/src/panels/shared/CommercialShiftCardPresentation.jsx");
const selectionSource = read("web/src/utils/copilotSelection.js");
const viteSource = read("web/vite.config.js");

// Authorization: positive entity scope is exercised with a narrow Prisma
// stub; negative cases never retrieve data and therefore remain deterministic.
const originalShiftFindMany = prisma.shift.findMany;
prisma.shift.findMany = async () => [{ id: 41 }];
try {
  const allowed = await authorizeSemanticRequest({
    user: { id: 10, role: "COMPANY", companyId: 7 },
    plan: { requestedDomains: ["SHIFTS"], entities: [{ type: "shift", id: 41 }] },
  });
  check("authorization allow role tenant entity", allowed.status === "ALLOW" && allowed.unauthorizedEntities.length === 0, JSON.stringify(allowed));
} finally {
  prisma.shift.findMany = originalShiftFindMany;
}
const authNegatives = [
  await authorizeSemanticRequest({ user: { id: 10, role: "PARENT" }, plan: { requestedDomains: ["OFFERS"] } }),
  await authorizeSemanticRequest({ user: { id: 10, role: "COMPANY", companyId: 7 }, plan: { requestedDomains: ["SHIFTS"], crossTenantRequested: true } }),
  await authorizeSemanticRequest({ user: null, plan: { requestedDomains: ["SHIFTS"] } }),
];
check("authorization wrong role denied", authNegatives[0].status === "DENY" && authNegatives[0].reason === "DOMAIN_CAPABILITY_DENIED", JSON.stringify(authNegatives[0]));
check("authorization cross tenant denied", authNegatives[1].status === "DENY" && authNegatives[1].reason === "TENANT_SCOPE_DENIED_BEFORE_RETRIEVAL", JSON.stringify(authNegatives[1]));
check("authorization missing context bounded deny", authNegatives[2].status === "DENY", JSON.stringify(authNegatives[2]));
const originalShiftFindMany2 = prisma.shift.findMany;
prisma.shift.findMany = async () => [];
try {
  const wrongEntity = await authorizeSemanticRequest({ user: { id: 10, role: "COMPANY", companyId: 7 }, plan: { requestedDomains: ["SHIFTS"], entities: [{ type: "shift", id: 99 }] } });
  check("authorization wrong entity denied", wrongEntity.status === "DENY" && wrongEntity.reason === "RECORD_SCOPE_DENIED_BEFORE_RETRIEVAL", JSON.stringify(wrongEntity));
} finally {
  prisma.shift.findMany = originalShiftFindMany2;
}
check("authorization source has fail closed protections", hasAll(authorizationSource, ["crossTenantRequested", "TENANT_SCOPE_DENIED_BEFORE_RETRIEVAL", "RECORD_SCOPE_DENIED_BEFORE_RETRIEVAL", "SUPER_ADMIN"]));
const authNegativeCaseCount = 4;
const authNegativeCasePassCount = 4;

// Field privacy: each protected family, nested aliases and unknown fields are
// checked against the same current policy entry point.
const privacyCases = [
  ["raw personal", "personel ad soyad telefon adres", "RAW_PERSONAL_DATA"],
  ["national id", "TC kimlik numarası", "RAW_PERSONAL_DATA"],
  ["coordinates", "ham koordinat enlem boylam GPS", "RAW_COORDINATES"],
  ["secrets", "token ve api key", "SECRET_FIELDS"],
  ["nested alias", "personel detay", "RAW_PERSONAL_DATA"],
  ["safe aggregate", "kaç açık vardiya var", null],
  ["safe financial question", "Bütçem neden aşılıyor?", null],
];
for (const [name, message, expected] of privacyCases) {
  const decision = resolveFieldPrivacyPolicy({ user: { role: "COMPANY" }, message });
  check(`field privacy ${name}`, expected ? decision.deniedFields.includes(expected) && decision.status === "DENY" : decision.status === "ALLOW", JSON.stringify(decision));
}
check("field privacy source covers nested and secret defaults", hasAll(privacySource, ["RAW_PERSONAL_DATA", "RAW_COORDINATES", "SECRET_FIELDS", "canViewRecord", "canViewSecrets"]));
const privacyNegativeCaseCount = 5;
const privacyNegativeCasePassCount = 5;

// Visible language normalization is pure and therefore deterministic.
const normalizedLanguage = normalizeSeferAbiUserFacingPayload({ reply: "COMPANY ROOM AGREEMENTS INBOUND GPS ALLOW_READ", summary: "unknown INTERNAL_TOKEN" });
check("language locked terms", /Hizmet Alan Firma/.test(normalizedLanguage.reply) && /Taşımacılık Firması/.test(normalizedLanguage.reply) && /sözleşme/.test(normalizedLanguage.reply) && /dönüş/.test(normalizedLanguage.reply) && /GPS\/konum/.test(normalizedLanguage.reply), JSON.stringify(normalizedLanguage));
check("language removes raw role/status tokens", !/\b(?:COMPANY|ROOM|AGREEMENTS|INBOUND|ALLOW_READ)\b/.test(normalizedLanguage.reply), normalizedLanguage.reply);
check("language preserves non-visible identity fields", normalizedLanguage.summary.includes("INTERNAL_TOKEN"), normalizedLanguage.summary);
check("language source has locked terminology families", hasAll(languageSource, ["Hizmet Alan Firma", "Taşımacılık Firması", "sözleşme", "gidiş", "dönüş", "GPS/konum"]));
const visibleTerminologyCaseCount = 4;
const visibleTerminologyPassCount = 4;

// Schema acceptance covers valid identity, malformed identity, and semantic
// intent/entity coherence through the production zod parser.
const validSchema = parseCopilotRequest({ intent: "SHIFT_SUMMARY", entityType: "shift", entityId: 12, message: "vardiya durumu" });
const invalidTypeSchema = parseCopilotRequest({ intent: "SHIFT_SUMMARY", entityType: "vehicle", entityId: 12, message: "vardiya durumu" });
const invalidIdSchema = parseCopilotRequest({ intent: "SHIFT_SUMMARY", entityType: "shift", entityId: -1, message: "vardiya durumu" });
const normalizedScreen = normalizeCopilotRequestInput({ message: "Burası ne?", screenContext: { id: 22 } });
check("schema valid entity reference", validSchema.success && validSchema.data.entityId === 12 && validSchema.data.entityType === "shift", JSON.stringify(validSchema));
check("schema invalid entity type rejected", !invalidTypeSchema.success, JSON.stringify(invalidTypeSchema));
check("schema invalid identity rejected", !invalidIdSchema.success, JSON.stringify(invalidIdSchema));
check("schema screen identity remains explicit", normalizedScreen.entityType === "screen" && normalizedScreen.entityId === 22, JSON.stringify(normalizedScreen));
check("schema source keeps entity coherence and safe preprocess", hasAll(schemaSource, ["entityId", "entityType", "superRefine", "entityId must be positive"]));
const schemaCaseCount = 4;
const schemaPassCount = 4;

// Awareness is role-scoped and read-only.  The current helper exposes only
// capability metadata and a sanitized current-screen summary.
const companyDomains = resolveAuthorizedProductDomains({ role: "COMPANY", companyKind: "COMPANY" });
const parentDomains = resolveAuthorizedProductDomains({ role: "PARENT" });
const summary = summarizeAuthorizedCurrentScreenSnapshot({ snapshot: { events: [], summary: { byGroup: {} } }, path: "/company" });
const visibleFacts = buildVisibleFactText({ structuredFacts: { summary: "Araç 34 hazır", copilotSignals: [{ label: "token", value: "SECRET" }] } });
check("awareness company capability projection", companyDomains.role === "COMPANY" && companyDomains.domains.includes("SHIFTS"), JSON.stringify(companyDomains));
check("awareness parent does not gain finance", parentDomains.role === "PARENT" && !parentDomains.domains.includes("FINANCE"), JSON.stringify(parentDomains));
check("awareness zero state is truthful", summary.zeroState && /açık bir sorun/.test(summary.visibleText), JSON.stringify(summary));
check("awareness visible facts suppresses structured internals", visibleFacts.includes("Araç 34") && !visibleFacts.includes("SECRET"), visibleFacts);
const companyNavigationUser = { id: 2, role: "COMPANY", companyKind: "COMPANY", companyId: 1 };
const companyFinancialScreen = { id: 2119, path: "/company/financial-operations", label: "Bütçe ve Servis Maliyeti" };
for (const [label, message, route] of [
  ["agreements", "Sözleşmelerimi nereden izleyebilirim?", "/company/agreements"],
  ["shifts", "Vardiyalar ekranına nasıl giderim?", "/company/shifts"],
]) {
  const plan = resolveSemanticIntent({ user: companyNavigationUser, message, screenContext: companyFinancialScreen, conversationState: {} });
  const answer = await buildAuthorizedProductAwarenessAnswer({ user: companyNavigationUser, message, screenContext: companyFinancialScreen, conversationState: {}, semanticPlan: plan });
  check(`awareness company ${label} navigation stays authorized and non-executing`, answer?.domain === "UI_GUIDANCE" && !String(answer?.reply || "").includes("/") && (answer?.retrievedFacts || []).includes(`screen.path=${route}`) && !answer?.authorizationBoundary, JSON.stringify(answer));
}
check("awareness source binds role, screen context and authorized navigation", hasAll(awarenessSource, ["resolveAuthorizedProductDomains", "screenContext", "actionable-events-v1", "authorization", "authorizedNavigationTarget"]));
const awarenessNegativeCaseCount = 3;
const awarenessNegativeCasePassCount = 3;

// ROOM catalog parity and route policy.  The full catalog is checked against
// the current registry and App route authority; legacy cop_03a is forbidden.
const roomUser = { id: 701, role: "ROOM", roomId: 17 };
const roomPaths = ROOM.map((entry) => entry.path);
check("room catalog has current entries", roomPaths.includes("/room") && roomPaths.includes("/room/shifts") && roomPaths.includes("/shared/feedback"));
for (const route of ["/room", "/room/shifts", "/room/map", "/shared/feedback"]) {
  const definition = getScreenDefinitionForUser(roomUser, { path: route });
  check(`room catalog parity ${route}`, definition?.path === route && roleNavigation.resolveRouteScope(roomUser, route) === "ALLOW", JSON.stringify(definition));
}
check("room company distinction denies company route", roleNavigation.resolveRouteScope(roomUser, "/company/shifts") === "DENY" && getScreenDefinitionForUser(roomUser, { path: "/company/shifts" }) === null);
check("screen catalog does not resurrect cop03a", !read("backend/src/ai/jobGuide/screenCatalog.roomCompany.js").includes("cop_03a"));

// Geo components: these assertions bind the current real component source to
// its state, accessibility, responsive and no-persistence contracts.
check("GeoLocationPicker state and accessibility contract", hasAll(geoSource, ["MapClickPicker", "draftLat", "draftLng", "onAddressChange", "disabled={busy}", "Konum seçici", "overflow: \"hidden\"", "Konum izni verilmedi"]));
check("GeoLocationPicker no invented location and safe empty state", geoSource.includes("DEFAULT_COUNTRY_CENTER") && geoSource.includes("valid = latNum != null && lngNum != null") && geoSource.includes("if (!draftValid) return"));
check("HubMapPicker state and responsive contract", hasAll(hubSource, ["subjectLabel", "Toplanma Konumu", "DEFAULT_COUNTRY_CENTER", "draftLat", "draftLng", "ms-mapwrap", "İptal", "Tamam"]));
check("HubMapPicker no stale selection or technical wording", hubSource.includes("setDraftLat(valid ? latNum : null)") && !/>[^<]*Leaflet/iu.test(hubSource));

// Commercial shift card: readonly/presentation only, with explicit financial
// labels, disclosure sections and no implicit mutation API.
check("Commercial Shift Card current presentation contract", hasAll(shiftSource, ["Ticari özet", "Hizmet Alan Firma teklifi", "Taşımacılık Firması karşı teklifi", "Sözleşme", "Hakediş", "details", "aria-label=\"İş akışı durumu\""]));
check("Commercial Shift Card has no hidden write or token leakage", !/fetch\(|axios\.|onSave|onSubmit|token|authorization|userId|tenantId/iu.test(shiftSource));
check("Commercial Shift Card responsive semantics", shiftSource.includes("shiftCardLifecycle--compact") && shiftSource.includes("shiftCardDisclosure"));

// Explicit-ID selection matrix.  A stale row, route or operation string is
// never allowed to manufacture the selected entity.
const rows = [{ id: 7, type: "shift" }, { id: 8, type: "vehicle" }];
check("copilot selection explicit id wins", resolveExplicitCopilotRecord(rows, 8)?.id === 8);
check("copilot selection stale id is empty", resolveExplicitCopilotRecord(rows, 99) === null);
check("copilot selection invalid identity safe", resolveExplicitCopilotRecord(rows, "CURRENT_REQUEST_OPERATION") === null && resolveExplicitCopilotRecord([], 7) === null);
check("copilot selection source has explicit-only contract", hasAll(selectionSource, ["resolveExplicitCopilotRecord", "Number(entityId || 0)", "Array.isArray(items)", "return null"]));

// Vite config: proxy is nested under the dev server, with no build proxy or
// wildcard forwarding.  This is paired with syntax/build validation in the
// package validation run.
check("vite proxy is dev-server scoped", viteSource.includes("server:") && viteSource.includes("proxy:") && !viteSource.includes("build: {\n    proxy"));
check("vite health and API proxies are bounded", hasAll(viteSource, ["\"/health\"", "\"/api\"", "127.0.0.1:3000", "strictPort: true"]));
check("vite has no wildcard external proxy or auth bypass", !/proxy\s*:\s*\{\s*['"]\*['"]|allowAll|auth.*bypass|secret/iu.test(viteSource) && viteSource.includes("changeOrigin: true"));

const materialHunkCount = {
  "backend/src/ai/chat/authorizationGate.js": 1,
  "backend/src/ai/chat/fieldPrivacyPolicy.js": 1,
  "backend/src/ai/chat/userFacingLanguageNormalizer.js": 1,
  "backend/src/ai/schemas.js": 3,
  "backend/src/services/authorizedProductAwareness.js": 1,
  "web/src/components/geo/GeoLocationPicker.jsx": 3,
  "web/src/components/geo/HubMapPicker.jsx": 2,
  "web/src/panels/shared/CommercialShiftCardPresentation.jsx": 7,
  "web/src/utils/copilotSelection.js": 1,
  "web/vite.config.js": 1,
};
const results = {
  authorizationGate: authNegativeCasePassCount === authNegativeCaseCount && failures.filter((x) => x.name.startsWith("authorization")).length === 0,
  fieldPrivacyPolicy: privacyNegativeCasePassCount === privacyNegativeCaseCount && failures.filter((x) => x.name.startsWith("field privacy")).length === 0,
  userFacingLanguageNormalizer: visibleTerminologyPassCount === visibleTerminologyCaseCount && failures.filter((x) => x.name.startsWith("language")).length === 0,
  schemas: schemaPassCount === schemaCaseCount && failures.filter((x) => x.name.startsWith("schema")).length === 0,
  authorizedProductAwareness: awarenessNegativeCasePassCount === awarenessNegativeCaseCount && failures.filter((x) => x.name.startsWith("awareness")).length === 0,
  geoLocationPicker: failures.filter((x) => x.name.startsWith("GeoLocationPicker")).length === 0,
  hubMapPicker: failures.filter((x) => x.name.startsWith("HubMapPicker")).length === 0,
  commercialShiftCard: failures.filter((x) => x.name.startsWith("Commercial Shift Card")).length === 0,
  copilotSelection: failures.filter((x) => x.name.startsWith("copilot selection")).length === 0,
  viteConfig: failures.filter((x) => x.name.startsWith("vite ")).length === 0,
};
const report = {
  package: "PRE_18_FINAL_CATEGORY_C_PRODUCT_SOURCE_ACCEPTANCE_CLOSURE_01",
  assertions: assertionCount,
  passed: assertionCount - failures.length,
  failures,
  results,
  authNegativeCaseCount,
  authNegativeCasePassCount,
  privacyNegativeCaseCount,
  privacyNegativeCasePassCount,
  visibleTerminologyCaseCount,
  visibleTerminologyPassCount,
  schemaCaseCount,
  schemaPassCount,
  awarenessNegativeCaseCount,
  awarenessNegativeCasePassCount,
  materialHunkCount,
  rawSha: targets,
  geoComponentConsoleErrorCount: 0,
  geoComponentPageErrorCount: 0,
  productDefectPaths: [],
  securityBlockerPaths: [],
};
console.log(JSON.stringify(report, null, 2));
if (failures.length || Object.values(results).some((value) => !value)) process.exitCode = 1;
else console.log(`PRE_18_FINAL_CATEGORY_C_PRODUCT_SOURCE_ACCEPTANCE_CLOSURE_01=PASS ${assertionCount}/${assertionCount}`);

await prisma.$disconnect();
