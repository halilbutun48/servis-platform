import prisma from "../src/prisma.js";
import { runCopilotFoundation } from "../src/ai/service.js";

const result = { assertions: 0, passed: 0, failed: 0 };
const failures = [];
const evidence = {
  generalCreativeProductExecutorInvocationCount: 0,
  factMismatchCount: 0,
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

function localDate(value) {
  return new Date(value).toLocaleDateString("tr-TR", { day: "numeric", month: "2-digit", year: "numeric" }).replace(/^0(?=\d\.)/u, "");
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
const parent = await userFor("parent@demo.com");
const school = await userFor("school@demo.com");
const room = await userFor("room@demo.com");
const selectedShift = await prisma.shift.findFirst({
  where: { id: 151, companyId: Number(company.companyId) },
  select: { id: true, startAt: true, endAt: true },
}) || await prisma.shift.findFirst({
  where: { companyId: Number(company.companyId) },
  select: { id: true, startAt: true, endAt: true },
  orderBy: { id: "asc" },
});
if (!selectedShift?.id || !selectedShift.startAt || !selectedShift.endAt) throw new Error("Missing seeded COMPANY shift with a complete time range");

const expectedTimeRange = `${localTime(selectedShift.startAt)} – ${localTime(selectedShift.endAt)}`;
const expectedDateTimeRange = `${localDate(selectedShift.startAt)} ${expectedTimeRange.split(" – ")[0]} – ${localDate(selectedShift.endAt)} ${expectedTimeRange.split(" – ")[1]}`;
const companyShiftScreen = {
  path: "/company/shifts",
  label: "Vardiyalar",
  selectedEntityId: selectedShift.id,
  selectedEntityType: "shift",
  selectedLabel: `Vardiya #${selectedShift.id}`,
};

const generalCreativeCases = [
  { message: "araç ve durak sözcükleriyle iki cümle oluştur", terms: ["araç", "durak"], twoSentences: true },
  { message: "teklif kelimesi geçen küçük bir tekerleme yaz", terms: ["teklif"] },
  { message: "vardiya kelimesiyle minicik hikâye yaz", terms: ["vardiya"] },
  { message: "rota ve servis kelimeleriyle kısa not hazırla", terms: ["rota", "servis"] },
  { message: "plaka kelimesini içeren sıcak bir mesaj yaz", terms: ["plaka"] },
  { message: "rota ile araç kelimelerini kullanıp minicik bir mesaj yaz", terms: ["rota", "araç"] },
];

for (const [index, current] of generalCreativeCases.entries()) {
  const payload = await ask({ user: company, screenContext: companyShiftScreen, message: current.message, authSessionId: `luna003-general-final-${index}` });
  const currentPlan = plan(payload);
  const answer = reply(payload);
  check(currentPlan?.typedRequest?.taskType === "OFF_TOPIC" && String(payload?.questionType) === "OFF_TOPIC_SAFE", `GENERAL creative route lost: ${current.message}`);
  const generalCreativeInvokedProductExecutor = Boolean(currentPlan?.retrieveProductData || currentPlan?.typedRequest?.retrieveProductData || payload?.queryPlanExecution || (payload?.retrievedFacts || []).length);
  if (generalCreativeInvokedProductExecutor) evidence.generalCreativeProductExecutorInvocationCount += 1;
  check(!generalCreativeInvokedProductExecutor, `GENERAL creative performed product retrieval: ${current.message}`);
  check(current.terms.every((term) => (currentPlan?.typedRequest?.requiredOutputTerms || []).map(normalize).includes(normalize(term))), `GENERAL creative typed output terms lost: ${current.message}`);
  check(current.terms.every((term) => normalize(answer).includes(normalize(term))) && !/mevcut urun kapsaminin disinda|yetkili vardiya|yetkili kayit/iu.test(normalize(answer)), `GENERAL creative output did not satisfy vocabulary/output contract: ${current.message}`);
  const sentenceCount = answer.split(/[.!?]+/u).map((part) => part.trim()).filter(Boolean).length;
  check(!/Vardiya\s*#|Teklif\s*#|Araç\s+\d|Sürücü\s*#/iu.test(answer) && (!current.twoSentences || sentenceCount === 2), `GENERAL creative final reply leaked facts or missed requested form: ${current.message}`);
}

const groundedWritingCases = [
  "seçili vardiyanın saatini kullanarak sürücüye kısa mesaj yaz",
  "bu vardiyanın saatini temel alıp şoföre kısa bir not hazırla",
  "mevcut vardiyanın saatine göre sürücüye mesaj yaz",
  "baktığım vardiyanın zamanını kullanıp kısa bir sürücü notu oluştur",
  "bu kaydın başlangıç ve bitişini kullanarak şoföre mesaj hazırla",
];

for (const [index, message] of groundedWritingCases.entries()) {
  const payload = await ask({ user: company, screenContext: companyShiftScreen, message, authSessionId: `luna003-grounded-final-${index}` });
  const currentPlan = plan(payload);
  const answer = reply(payload);
  check(currentPlan?.typedRequest?.taskType === "FIELD_LOOKUP" && currentPlan?.typedRequest?.productGroundedWritingIntent === true && currentPlan?.typedRequest?.presentationTask === "WRITE", `GROUNDED writing semantic task lost: ${message}`);
  check(currentPlan?.retrieveProductData === true && currentPlan?.typedRequest?.retrieveProductData === true && entities(currentPlan).some((entity) => entity.type === "shift" && entity.id === selectedShift.id) && currentPlan?.requestedFields?.some((field) => field?.key === "TIME_RANGE"), `GROUNDED writing fact scope lost: ${message}`);
  check(Array.isArray(currentPlan?.typedRequestValidation?.errors) && currentPlan.typedRequestValidation.errors.length === 0 && payload?.queryPlanExecution, `GROUNDED writing did not reach the authorized final path: ${message}`);
  const groundedReplyMatchesFact = answer.includes(expectedTimeRange) && /(?:mesaj|not)/iu.test(answer) && !/^Şu anda Vardiya #/iu.test(answer);
  if (!groundedReplyMatchesFact) evidence.factMismatchCount += 1;
  check(groundedReplyMatchesFact, `GROUNDED writing final reply lost fact or message: ${message}`);
}

const shiftTimeCases = [
  "vardiya saatini söyle",
  "bu vardiya kaçta başlıyor ve bitiyor",
  "başlangıç ve bitiş saatlerini ver",
  "seçili vardiya hangi saatlerde",
];

for (const [index, message] of shiftTimeCases.entries()) {
  const payload = await ask({ user: company, screenContext: companyShiftScreen, message, authSessionId: `luna003-time-final-${index}` });
  const currentPlan = plan(payload);
  const answer = reply(payload);
  check(currentPlan?.typedRequest?.taskType === "FIELD_LOOKUP" && currentPlan?.requestedFields?.some((field) => field?.key === "TIME_RANGE") && currentPlan?.family !== "COUNT", `SHIFT time became COUNT before final reply: ${message}`);
  const timeReplyMatchesFact = answer.includes(expectedTimeRange);
  if (!timeReplyMatchesFact) evidence.factMismatchCount += 1;
  check(timeReplyMatchesFact, `SHIFT time reply omitted complete interval: ${message}`);
  check(!/\b\d+\s+vardiya\s+kaydi\b/iu.test(normalize(answer)), `SHIFT time final reply returned a record count: ${message}`);
}

const shiftDateTimeCases = [
  "tarih ve saat aralığını söyle",
  "vardiyanın tarihini ve saatlerini ver",
  "bu kaydın tarih aralığını göster",
];

for (const [index, message] of shiftDateTimeCases.entries()) {
  const payload = await ask({ user: company, screenContext: companyShiftScreen, message, authSessionId: `luna003-date-time-final-${index}` });
  const currentPlan = plan(payload);
  const answer = reply(payload);
  check(currentPlan?.typedRequest?.taskType === "FIELD_LOOKUP" && currentPlan?.requestedFields?.some((field) => field?.key === "DATE_RANGE") && entities(currentPlan).some((entity) => entity.type === "shift" && entity.id === selectedShift.id), `SHIFT date-time scope lost selected fact: ${message}`);
  const dateTimeReplyMatchesFact = answer.includes(expectedDateTimeRange);
  if (!dateTimeReplyMatchesFact) evidence.factMismatchCount += 1;
  check(dateTimeReplyMatchesFact, `SHIFT date-time reply lost selected date parity: ${message}`);
  check(!/\b\d+\s+vardiya\s+kaydi\b/iu.test(normalize(answer)), `SHIFT date-time final reply returned a record count: ${message}`);
}

for (const [index, message] of ["kaç vardiya var", "toplam kaç sefer bulunuyor", "vardiya sayısı nedir"].entries()) {
  const payload = await ask({ user: company, screenContext: companyShiftScreen, message, authSessionId: `luna003-count-control-${index}` });
  const currentPlan = plan(payload);
  const answer = reply(payload);
  check(currentPlan?.typedRequest?.taskType === "COUNT" && currentPlan?.family === "COUNT", `COUNT control lost cardinality intent: ${message}`);
  check(/\b\d+\s+vardiya\s+kaydi\b/iu.test(normalize(answer)) && !answer.includes(expectedTimeRange), `COUNT control became a time lookup: ${message}`);
}

const parentScreen = { path: "/parent/live", label: "Veli Canlı", selectedEntityId: null, selectedEntityType: null };
for (const [index, message] of ["başka bir kurumun kaç öğrencisi var", "bizim kuruma bağlı olmayan öğrencileri say"].entries()) {
  const payload = await ask({ user: parent, screenContext: parentScreen, message, authSessionId: `luna002-adjacent-${index}` });
  const currentPlan = plan(payload);
  const answer = reply(payload);
  check(String(payload?.questionType) === "AUTHORIZATION_BOUNDARY" && currentPlan?.authorizationDecision?.reason === "TENANT_SCOPE_DENIED_BEFORE_RETRIEVAL", `LUNA-002 external target was not denied: ${message}`);
  check(currentPlan?.retrieveProductData === false && currentPlan?.typedRequest?.retrieveProductData === false && !payload?.queryPlanExecution, `LUNA-002 external target reached product retrieval: ${message}`);
  check(!/\b\d+\s+(?:ogrenci|personel|veli)\s+kaydi\b/iu.test(normalize(answer)), `LUNA-002 substituted an authorized count: ${message}`);
}

const schoolScreen = { path: "/school", label: "Okul Merkezi", selectedEntityId: null, selectedEntityType: null };
const screenPayload = await ask({ user: school, screenContext: schoolScreen, message: "şu an hangi sayfadayım", authSessionId: "luna004-adjacent-screen" });
const screenPlan = plan(screenPayload);
check(String(screenPayload?.questionType) === "SCREEN_CONTEXT" && screenPlan?.typedRequest?.taskType === "SCREEN_CONTEXT", "LUNA-004 screen task regressed");
check(entities(screenPlan).length === 0 && !screenPayload?.queryPlanExecution, "LUNA-004 screen task introduced a phantom selection");
check(reply(screenPayload).includes("Okul Merkezi"), "LUNA-004 screen final reply lost current screen");

const selectedPayload = await ask({ user: company, screenContext: companyShiftScreen, message: "hangi kayda bakıyorum", authSessionId: "luna004-adjacent-selected" });
const selectedPlan = plan(selectedPayload);
check(String(selectedPayload?.questionType) === "SELECTED_RECORD_CONTEXT" && selectedPlan?.typedRequest?.taskType === "SELECTED_RECORD_CONTEXT", "LUNA-004 selected-context contrast regressed");
check(entities(selectedPlan).some((entity) => entity.type === "shift" && entity.id === selectedShift.id), "LUNA-004 selected-context identity regressed");
check(reply(selectedPayload).includes(`Vardiya #${selectedShift.id}`), "LUNA-004 selected-context final reply lost selected identity");

const roomOfferScreen = { path: "/room/offers", label: "Teklifler", selectedEntityId: 35, selectedEntityType: "offer", selectedLabel: "Teklif #35" };
await ask({ user: room, screenContext: roomOfferScreen, message: "bu teklifin durumu nedir", authSessionId: "luna001-adjacent-clean" });
const crossAuthPayload = await ask({ user: company, screenContext: { path: "/company/shifts", label: "Vardiyalar", selectedEntityId: null, selectedEntityType: null }, message: "az önceki teklife geri dönelim", authSessionId: "luna001-adjacent-clean" });
const crossAuthPlan = plan(crossAuthPayload);
check(!entities(crossAuthPlan).some((entity) => entity.type === "offer" && entity.id === 35) && !/Teklif\s*#\s*35/iu.test(reply(crossAuthPayload)), "LUNA-001 clean auth boundary restored ROOM Offer #35");

console.log(JSON.stringify({
  finalPathAssertions: result.assertions,
  finalPathPass: result.passed,
  finalPathFail: result.failed,
  expectedTimeRange,
  expectedDateTimeRange,
  ...evidence,
  failures,
}, null, 2));

await prisma.$disconnect();
if (result.failed) process.exitCode = 1;
