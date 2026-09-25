import prisma from "../src/prisma.js";
import { runCopilotFoundation } from "../src/ai/service.js";

const result = { assertions: 0, passed: 0, failed: 0 };
const failures = [];
const evidence = {
  generalCreativeProductExecutorInvocationCount: 0,
  requiredTermMissingCount: 0,
  forbiddenTermPresentCount: 0,
  realEntityDisclosureCount: 0,
};

function check(condition, label) {
  result.assertions += 1;
  if (condition) {
    result.passed += 1;
    return;
  }
  result.failed += 1;
  failures.push(label);
}

function normalize(value) {
  return String(value || "")
    .toLocaleLowerCase("tr-TR")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/\s+/g, " ")
    .trim();
}

function reply(payload) {
  return String(payload?.reply || payload?.summary || "");
}

function plan(payload) {
  return payload?.semanticPlan && typeof payload.semanticPlan === "object" ? payload.semanticPlan : {};
}

function entities(value) {
  const rows = Array.isArray(value?.entities) ? value.entities : value?.entity ? [value.entity] : [];
  return rows.map((entity) => ({ type: String(entity?.type || "").toLowerCase(), id: Number(entity?.id || 0) || null }));
}

function localTime(value) {
  return new Date(value).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

async function userFor(email) {
  const row = await prisma.user.findFirst({ where: { email } });
  if (!row) throw new Error(`Missing seeded user: ${email}`);
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

async function ask({ user, screenContext, message, authSessionId }) {
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

const company = await userFor("company@demo.com");
const selectedShift = await prisma.shift.findFirst({
  where: { id: 151, companyId: Number(company.companyId) },
  select: { id: true, startAt: true, endAt: true },
}) || await prisma.shift.findFirst({
  where: { companyId: Number(company.companyId) },
  select: { id: true, startAt: true, endAt: true },
  orderBy: { id: "asc" },
});
if (!selectedShift?.id || !selectedShift.startAt || !selectedShift.endAt) {
  throw new Error("Missing seeded COMPANY shift with a complete time range");
}

const expectedTimeRange = `${localTime(selectedShift.startAt)} – ${localTime(selectedShift.endAt)}`;
const companyShiftScreen = {
  path: "/company/shifts",
  label: "Vardiyalar",
  selectedEntityId: selectedShift.id,
  selectedEntityType: "shift",
  selectedLabel: `Vardiya #${selectedShift.id}`,
};

const generalCreativeCases = [
  { message: "vardiya sözcüğünü kullanarak mini hikâye oluştur", required: ["vardiya"], forbidden: [], format: "MINI_STORY" },
  { message: "vardiya kelimesi geçen iki cümle yaz", required: ["vardiya"], forbidden: [], format: "SENTENCES" },
  { message: "içinde rota ve araç geçen kısa not hazırla", required: ["rota", "araç"], forbidden: [], format: "SHORT_NOTE" },
  { message: "teklif ile servis sözcüklerini kullanıp tekerleme yaz", required: ["teklif", "servis"], forbidden: [], format: "RHYME" },
  { message: "durak kelimesini içeren minicik mesaj yaz", required: ["durak"], forbidden: [], format: "SHORT_MESSAGE" },
  { message: "vardiya kelimesini kullanmadan kısa mesaj yaz", required: [], forbidden: ["vardiya"], format: "SHORT_MESSAGE" },
  { message: "teklif sözcüğünü geçirmeden iki cümle oluştur", required: [], forbidden: ["teklif"], format: "SENTENCES" },
];

for (const [index, current] of generalCreativeCases.entries()) {
  const payload = await ask({
    user: company,
    screenContext: companyShiftScreen,
    message: current.message,
    authSessionId: `required-term-final-${index}`,
  });
  const currentPlan = plan(payload);
  const typedRequest = currentPlan?.typedRequest || {};
  const answer = reply(payload);
  const normalizedAnswer = normalize(answer);
  const required = Array.isArray(typedRequest.requiredOutputTerms) ? typedRequest.requiredOutputTerms.map(normalize) : [];
  const forbidden = Array.isArray(typedRequest.forbiddenOutputTerms) ? typedRequest.forbiddenOutputTerms.map(normalize) : [];
  const performedProductRetrieval = Boolean(
    currentPlan?.retrieveProductData
      || typedRequest.retrieveProductData
      || payload?.queryPlanExecution
      || (payload?.retrievedFacts || []).length,
  );
  if (performedProductRetrieval) evidence.generalCreativeProductExecutorInvocationCount += 1;

  check(typedRequest.taskType === "OFF_TOPIC" && payload?.questionType === "OFF_TOPIC_SAFE", `creative task route lost: ${current.message}`);
  check(
    current.required.every((term) => required.includes(normalize(term)))
      && current.forbidden.every((term) => forbidden.includes(normalize(term)))
      && required.length === current.required.length
      && forbidden.length === current.forbidden.length,
    `output constraints were not extracted canonically: ${current.message}`,
  );
  check(!performedProductRetrieval, `general creative entered product retrieval: ${current.message}`);
  const missing = current.required.filter((term) => !normalizedAnswer.includes(normalize(term)));
  const presentForbidden = current.forbidden.filter((term) => normalizedAnswer.includes(normalize(term)));
  if (missing.length) evidence.requiredTermMissingCount += missing.length;
  if (presentForbidden.length) evidence.forbiddenTermPresentCount += presentForbidden.length;
  check(!missing.length && !presentForbidden.length, `final reply violated required/forbidden terms: ${current.message}`);
  const sentenceCount = answer.split(/[.!?]+/u).map((part) => part.trim()).filter(Boolean).length;
  const formatSatisfied = current.format === "MINI_STORY"
    ? /hikaye/iu.test(normalizedAnswer)
    : current.format === "RHYME"
      ? /ritim/iu.test(normalizedAnswer)
      : current.format === "SHORT_NOTE"
        ? /not/iu.test(normalizedAnswer)
        : current.format === "SHORT_MESSAGE"
          ? /mesaj/iu.test(normalizedAnswer)
          : current.format === "SENTENCES" ? sentenceCount === 2 : true;
  const leakedRealEntity = /vardiya\s*#\s*\d+|teklif\s*#\s*\d+|04\.09\.2026|07:00\s*[–-]\s*09:00/iu.test(answer);
  if (leakedRealEntity) evidence.realEntityDisclosureCount += 1;
  check(formatSatisfied && !leakedRealEntity && !/mevcut ürün kapsamının dışında|yetkili vardiya|ürün kaydı/iu.test(answer), `final creative format or isolation failed: ${current.message}`);
}

const groundedWritingCases = [
  "seçili vardiyanın saatini kullanarak sürücüye kısa mesaj yaz",
  "bu vardiyanın saatini temel alıp şoföre kısa bir not hazırla",
];
for (const [index, message] of groundedWritingCases.entries()) {
  const payload = await ask({ user: company, screenContext: companyShiftScreen, message, authSessionId: `required-term-grounded-${index}` });
  const currentPlan = plan(payload);
  const typedRequest = currentPlan?.typedRequest || {};
  const answer = reply(payload);
  check(
    typedRequest.taskType === "FIELD_LOOKUP"
      && typedRequest.productGroundedWritingIntent === true
      && typedRequest.presentationTask === "WRITE",
    `grounded writing semantic regression: ${message}`,
  );
  check(
    currentPlan?.retrieveProductData === true
      && typedRequest.retrieveProductData === true
      && entities(currentPlan).some((entity) => entity.type === "shift" && entity.id === selectedShift.id)
      && currentPlan?.requestedFields?.some((field) => field?.key === "TIME_RANGE"),
    `grounded writing fact dependency regression: ${message}`,
  );
  check(answer.includes(expectedTimeRange) && /mesaj|not/iu.test(answer) && !/^Şu anda Vardiya #/iu.test(answer), `grounded writing final reply regression: ${message}`);
}

for (const [index, message] of ["vardiya saatini söyle", "bu vardiya kaçta"].entries()) {
  const payload = await ask({ user: company, screenContext: companyShiftScreen, message, authSessionId: `required-term-time-${index}` });
  const currentPlan = plan(payload);
  const answer = reply(payload);
  check(
    currentPlan?.typedRequest?.taskType === "FIELD_LOOKUP"
      && currentPlan?.requestedFields?.some((field) => field?.key === "TIME_RANGE")
      && currentPlan?.family !== "COUNT",
    `shift time field became count: ${message}`,
  );
  check(answer.includes(expectedTimeRange) && !/\b\d+\s+vardiya\s+kayd[ıi]\b/iu.test(normalize(answer)), `shift time final reply regression: ${message}`);
}

const countPayload = await ask({ user: company, screenContext: companyShiftScreen, message: "kaç vardiya var", authSessionId: "required-term-count-control" });
check(plan(countPayload)?.typedRequest?.taskType === "COUNT" && plan(countPayload)?.family === "COUNT", "true count control lost cardinality intent");
check(/\b\d+\s+vardiya\s+kayd[ıi]\b/iu.test(normalize(reply(countPayload))), "true count control did not return a count");

console.log(JSON.stringify({
  finalPathAssertions: result.assertions,
  finalPathPass: result.passed,
  finalPathFail: result.failed,
  selectedShift: { id: selectedShift.id, expectedTimeRange },
  evidence,
  failures,
}, null, 2));

await prisma.$disconnect();
if (result.failed > 0) process.exitCode = 1;
