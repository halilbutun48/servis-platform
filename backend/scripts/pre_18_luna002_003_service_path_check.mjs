import prisma from "../src/prisma.js";
import { inferCanonicalSemanticRequest } from "../src/ai/chat/canonicalSemanticRequest.js";
import { resolveConversationRoute } from "../src/ai/chat/conversationRouting.js";
import { resolveSemanticIntent } from "../src/ai/chat/semanticIntentPlanner.js";
import { runCopilotFoundation } from "../src/ai/service.js";

const servicePath = { assertions: 0, passed: 0, failed: 0 };
const lowLevel = { assertions: 0, passed: 0, failed: 0 };
const failures = [];

function check(bucket, condition, label) {
  bucket.assertions += 1;
  if (condition) {
    bucket.passed += 1;
    return;
  }
  bucket.failed += 1;
  failures.push(label);
}

function asPlan(payload) {
  return payload?.semanticPlan && typeof payload.semanticPlan === "object" ? payload.semanticPlan : {};
}

function entityRows(plan) {
  const rows = Array.isArray(plan?.entities) ? plan.entities : plan?.entity ? [plan.entity] : [];
  return rows.map((entity) => ({
    type: String(entity?.type || entity?.entityType || "").toLowerCase(),
    id: Number(entity?.id || entity?.entityId || 0) || null,
  }));
}

function reply(payload) {
  return String(payload?.reply || payload?.summary || "");
}

async function userFor(email) {
  const row = await prisma.user.findFirst({ where: { email } });
  if (!row) throw new Error("Missing seeded user: " + email);
  const company = row.companyId
    ? await prisma.company.findUnique({ where: { id: Number(row.companyId) }, select: { kind: true } })
    : null;
  return {
    id: row.id,
    role: row.role,
    companyId: row.companyId ?? null,
    roomId: row.roomId ?? null,
    companyKind: row.companyKind || company?.kind || null,
  };
}

async function runService({ user, screenContext, message, authSessionId }) {
  return runCopilotFoundation({
    intent: "CHAT_HELP",
    entityType: "screen",
    entityId: 0,
    user,
    screenContext,
    message,
    authSessionId,
  });
}

function explicitExternal(plan) {
  const typed = plan?.typedRequest || {};
  return Boolean(
    plan?.explicitExternalScope
    && plan?.crossTenantRequested
    && typed?.explicitExternalScope
    && typed?.requestedOwnerScope?.relation === "EXTERNAL"
    && String(typed?.requestedTenantScope || "").startsWith("EXTERNAL_"),
  );
}

function noProductExecutor(payload) {
  return !payload?.queryPlanExecution;
}

function noCountDisclosure(payload) {
  return !/\b\d+\s+(?:öğrenci|ogrenci|personel|veli|sürücü|surucu)\s+kayd/i.test(reply(payload));
}

const parent = await userFor("parent@demo.com");
const company = await userFor("company@demo.com");
const school = await userFor("school@demo.com");
const parentScreen = { path: "/parent/live", label: "Veli Canlı", selectedEntityId: null, selectedEntityType: null };

const externalVariants = [
  "başka bir kurumun kaç öğrencisi var",
  "başka okulun öğrenci sayısı",
  "diğer bir firmanın personel sayısı",
  "bizim kuruma bağlı olmayan öğrenciler",
  "şu hesabın dışındaki öğrencileri say",
  "o hesabın dışındaki öğrenci toplamı",
];

for (let index = 0; index < externalVariants.length; index += 1) {
  const message = externalVariants[index];
  const canonical = inferCanonicalSemanticRequest({ message, screenContext: parentScreen, conversationState: null });
  const route = resolveConversationRoute({ message, user: parent, screenContext: parentScreen, conversationState: null, canonicalShape: canonical });
  const plan = resolveSemanticIntent({ message, user: parent, screenContext: parentScreen, conversationState: null });
  check(lowLevel, canonical.requestedOwnershipScope?.explicitExternalScope === true, "LUNA-002 canonical external scope lost: " + message);
  check(lowLevel, route.route === "AUTHORIZATION_NEGATIVE", "LUNA-002 route was not authorization-negative: " + message);
  check(lowLevel, explicitExternal(plan), "LUNA-002 planner did not preserve external scope: " + message);

  const payload = await runService({
    user: parent,
    screenContext: parentScreen,
    message,
    authSessionId: "luna002-service-path-" + index,
  });
  const finalPlan = asPlan(payload);
  check(servicePath, finalPlan?.authorizationDecision?.reason === "TENANT_SCOPE_DENIED_BEFORE_RETRIEVAL", "LUNA-002 authorization target changed: " + message);
  check(servicePath, explicitExternal(finalPlan), "LUNA-002 final plan lost external target: " + message);
  check(servicePath, finalPlan?.retrieveProductData === false && finalPlan?.typedRequest?.retrieveProductData === false, "LUNA-002 retrieval decision was not disabled: " + message);
  check(servicePath, String(payload?.questionType || "") === "AUTHORIZATION_BOUNDARY", "LUNA-002 service did not return boundary: " + message);
  check(servicePath, noProductExecutor(payload), "LUNA-002 executor invoked: " + message);
  check(servicePath, noCountDisclosure(payload), "LUNA-002 self/authorized count substituted: " + message);
}

for (const [index, message] of [
  "başka bir şey soracağım",
  "başka türlü anlat",
  "farklı bir mesaj yaz",
].entries()) {
  const canonical = inferCanonicalSemanticRequest({ message, screenContext: parentScreen, conversationState: null });
  const route = resolveConversationRoute({ message, user: parent, screenContext: parentScreen, conversationState: null, canonicalShape: canonical });
  const plan = resolveSemanticIntent({ message, user: parent, screenContext: parentScreen, conversationState: null });
  check(lowLevel, canonical.requestedOwnershipScope?.explicitExternalScope !== true, "LUNA-002 negative control became external: " + message);
  check(lowLevel, route.route !== "AUTHORIZATION_NEGATIVE" && plan.crossTenantRequested !== true, "LUNA-002 negative control reached tenant denial: " + message);
  const payload = await runService({
    user: parent,
    screenContext: parentScreen,
    message,
    authSessionId: "luna002-negative-" + index,
  });
  check(servicePath, asPlan(payload)?.crossTenantRequested !== true, "LUNA-002 service negative control became cross-tenant: " + message);
}

for (const [index, message] of [
  "rota ve vardiya kelimeleriyle kısa mesaj yaz",
  "teklif kelimesi geçen iki cümle yaz",
  "araç sözcüğünü kullanarak kısa hikâye yaz",
  "durak ve servis kelimeleriyle kısa not oluştur",
  "rota ve teklif sözcüklerini kullanan kafiyeli bir tekerleme yaz",
].entries()) {
  const canonical = inferCanonicalSemanticRequest({ message, screenContext: parentScreen, conversationState: null });
  const route = resolveConversationRoute({ message, user: parent, screenContext: parentScreen, conversationState: null, canonicalShape: canonical });
  const plan = resolveSemanticIntent({ message, user: parent, screenContext: parentScreen, conversationState: null });
  check(lowLevel, canonical.taskType === "OFF_TOPIC" && canonical.generalCreativeIntent === true, "LUNA-003 canonical creative task lost: " + message);
  check(lowLevel, route.route === "OFF_TOPIC_SAFE" && plan.retrieveProductData === false, "LUNA-003 route did not suspend product retrieval: " + message);

  const payload = await runService({
    user: parent,
    screenContext: parentScreen,
    message,
    authSessionId: "luna003-general-" + index,
  });
  const finalPlan = asPlan(payload);
  check(servicePath, finalPlan?.typedRequest?.taskType === "OFF_TOPIC", "LUNA-003 final task was not general: " + message);
  check(servicePath, finalPlan?.retrieveProductData === false && finalPlan?.typedRequest?.retrieveProductData === false, "LUNA-003 final retrieval decision was enabled: " + message);
  check(servicePath, Array.isArray(finalPlan?.requestedDomains) && finalPlan.requestedDomains.length === 0, "LUNA-003 product domains survived: " + message);
  check(servicePath, noProductExecutor(payload) && (payload?.retrievedFacts || []).length === 0, "LUNA-003 product executor/facts observed: " + message);
  check(servicePath, String(payload?.questionType || "") === "OFF_TOPIC_SAFE", "LUNA-003 did not render general creative output: " + message);
}

const selectedShift = await prisma.shift.findFirst({
  where: { companyId: Number(company.companyId) },
  select: { id: true },
  orderBy: { id: "asc" },
});
if (!selectedShift?.id) throw new Error("Missing seeded COMPANY shift for product-grounded contrast");
const companyShiftScreen = {
  path: "/company/shifts",
  label: "Vardiyalar",
  selectedEntityId: selectedShift.id,
  selectedEntityType: "shift",
  selectedLabel: "Vardiya #" + selectedShift.id,
};

for (const [index, message] of [
  "seçili vardiyanın saatini kullanarak sürücüye kısa mesaj yaz",
  "vardiya saatini söyle",
].entries()) {
  const payload = await runService({
    user: company,
    screenContext: companyShiftScreen,
    message,
    authSessionId: "luna003-product-grounded-" + index,
  });
  const finalPlan = asPlan(payload);
  const entities = entityRows(finalPlan);
  check(lowLevel, finalPlan?.typedRequest?.taskType !== "OFF_TOPIC", "LUNA-003 product-grounded contrast became general: " + message);
  check(servicePath, finalPlan?.retrieveProductData === true && finalPlan?.typedRequest?.retrieveProductData === true, "LUNA-003 product-grounded read was disabled: " + message);
  check(servicePath, entities.some((entity) => entity.type === "shift" && entity.id === selectedShift.id), "LUNA-003 selected shift was not retained: " + message);
  check(servicePath, String(payload?.questionType || "") !== "OFF_TOPIC_SAFE", "LUNA-003 product-grounded contrast returned general route: " + message);
}

const schoolScreen = { path: "/school", label: "Okul Merkezi", selectedEntityId: null, selectedEntityType: null };
const screenPayload = await runService({
  user: school,
  screenContext: schoolScreen,
  message: "şu an neye bakıyorum",
  authSessionId: "luna004-regression",
});
const screenPlan = asPlan(screenPayload);
check(lowLevel, screenPlan?.typedRequest?.taskType === "SCREEN_CONTEXT", "LUNA-004 canonical screen task regressed");
check(servicePath, String(screenPayload?.questionType || "") === "SCREEN_CONTEXT", "LUNA-004 service screen context regressed");
check(servicePath, entityRows(screenPlan).length === 0, "LUNA-004 introduced phantom selection");
check(servicePath, noProductExecutor(screenPayload), "LUNA-004 screen context invoked product executor");

const returnPayload = await runService({
  user: company,
  screenContext: { path: "/company/shifts", label: "Vardiyalar", selectedEntityId: null, selectedEntityType: null },
  message: "az önceki teklife geri dönelim",
  authSessionId: "luna001-clean-regression",
});
const returnPlan = asPlan(returnPayload);
const returnsOffer35 = entityRows(returnPlan).some((entity) => entity.type === "offer" && entity.id === 35) || /teklif\s*#\s*35/iu.test(reply(returnPayload));
check(lowLevel, returnsOffer35 === false, "LUNA-001 clean state restored Offer #35");
check(servicePath, returnsOffer35 === false, "LUNA-001 service response restored Offer #35");
check(servicePath, !returnPayload?.queryPlanExecution, "LUNA-001 clean return invoked product executor");

await prisma.$disconnect();

console.log(JSON.stringify({
  servicePathAssertions: servicePath.assertions,
  servicePathPass: servicePath.passed,
  servicePathFail: servicePath.failed,
  lowLevelAssertions: lowLevel.assertions,
  lowLevelPass: lowLevel.passed,
  lowLevelFail: lowLevel.failed,
  failures,
}, null, 2));

process.exitCode = servicePath.failed || lowLevel.failed ? 1 : 0;
