import prisma from "../src/prisma.js";
import { runCopilotFoundation } from "../src/ai/service.js";
import { buildActionableEventsForUser } from "../src/services/actionableEvents.js";

// Bounded production-parity gate for selected-record attention/caution.  Every
// case starts with raw user text and the browser drawer's screenContext shape;
// semantic plans are produced only by the real service orchestration.
const failures = [];
const production = { cases: 0, passed: 0, failed: 0, assertions: 0 };
const counters = {
  selectedRecordAttentionScopeLoss: 0,
  selectedRecordAttentionOffTopicFallback: 0,
  selectedRecordGlobalRiskSubstitution: 0,
  generalAttentionQueryProductHijack: 0,
  offTopicAttentionQueryProductHijack: 0,
};

function normalize(value) {
  return String(value || "").toLocaleLowerCase("tr-TR").normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").replace(/ğ/g, "g")
    .replace(/ü/g, "u").replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/\s+/g, " ").trim();
}

function finalReply(payload) {
  return String(payload?.reply || payload?.summary || "").trim();
}

function check(caseId, name, value, detail = "") {
  production.assertions += 1;
  if (!value) failures.push({ caseId, name, detail: String(detail).slice(0, 900) });
}

function uiContext({ user, id, path, label, selected = null }) {
  return {
    id,
    path,
    label,
    role: user.role || "",
    companyKind: user.companyKind || "",
    selectedLabel: selected?.label || "",
    selectedEntityType: selected?.type || "",
    selectedEntityId: Number(selected?.id || 0) || null,
    uiHints: { drawerMode: "quick", activeTabs: [] },
  };
}

async function userFor(email) {
  const row = await prisma.user.findFirst({ where: { email } });
  if (!row) throw new Error(`Missing fixture user: ${email}`);
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

async function ask(input) {
  return runCopilotFoundation({
    intent: "CHAT_HELP",
    entityType: "screen",
    entityId: Number(input.screenContext?.id || 0),
    ...input,
  });
}

async function productionCase(caseId, input, verify) {
  const before = failures.length;
  try {
    const payload = await ask(input);
    const answer = finalReply(payload);
    check(caseId, "FINAL_PAYLOAD_REPLY", Boolean(answer), JSON.stringify(payload));
    check(caseId, "FROZEN_TYPED_REQUEST", Object.isFrozen(payload?.semanticPlan?.typedRequest), JSON.stringify(payload?.semanticPlan));
    await verify(payload, answer, (name, value, detail = "") => check(caseId, name, value, detail));
    production.cases += 1;
    if (failures.length === before) production.passed += 1;
    else production.failed += 1;
    return payload;
  } catch (error) {
    check(caseId, "SERVICE_ORCHESTRATION", false, error?.stack || error?.message || error);
    production.cases += 1;
    production.failed += 1;
    return null;
  }
}

function planEntityIs(payload, type, id) {
  const entities = Array.isArray(payload?.semanticPlan?.entities) ? payload.semanticPlan.entities : [];
  const entity = payload?.semanticPlan?.entity || entities[0];
  return String(entity?.type || "").toLowerCase() === String(type).toLowerCase() && Number(entity?.id) === Number(id);
}

function selectedNoData(answer, shiftId) {
  return new RegExp(`Vardiya\\s*#${shiftId}\\s*için doğrulanmış kayda özgü bir risk sinyali görünmüyor`, "iu").test(answer);
}

function hasGlobalAgreement(answer) {
  return /\b1\s+sözleşme inceleme bekliyor\b/iu.test(answer);
}

function noKnownEntityDisclosure(answer) {
  return !/(?:vardiya|teklif|sözleşme|arac|araç|sürücü|surucu)\s*#\s*\d+/iu.test(answer);
}

function noSelectedProjection(answer, shiftId) {
  return !new RegExp(`Vardiya\\s*#${shiftId}\\s*için doğrulanmış kayda özgü`, "iu").test(answer);
}

function localTime(value) {
  return new Date(value).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

function includesInterval(answer, interval) {
  return normalize(answer).includes(normalize(interval));
}

function isNonProduct(payload, answer) {
  return payload?.semanticPlan?.retrieveProductData === false && !payload?.semanticPlan?.entities?.length && noKnownEntityDisclosure(answer);
}

try {
  const [company, room, school, parent] = await Promise.all([
    userFor("company@demo.com"), userFor("room@demo.com"), userFor("school@demo.com"), userFor("parent@demo.com"),
  ]);
  const shift = await prisma.shift.findFirst({
    where: { id: 151, companyId: Number(company.companyId) },
    select: { id: true, startAt: true, endAt: true },
  }) || await prisma.shift.findFirst({
    where: { companyId: Number(company.companyId) },
    select: { id: true, startAt: true, endAt: true }, orderBy: { id: "asc" },
  });
  if (!shift?.id) throw new Error("Missing COMPANY shift");
  const interval = `${localTime(shift.startAt)} – ${localTime(shift.endAt)}`;
  const companyShift = uiContext({ user: company, id: 2102, path: "/company/shifts", label: "Vardiyalar", selected: { type: "shift", id: shift.id, label: `Vardiya #${shift.id}` } });
  const companyBare = uiContext({ user: company, id: 2102, path: "/company/shifts", label: "Vardiyalar" });
  const roomOffer = uiContext({ user: room, id: 1103, path: "/room/offers", label: "Teklifler", selected: { type: "offer", id: 35, label: "Teklif #35" } });
  const roomShifts = uiContext({ user: room, id: 1102, path: "/room/shifts", label: "Vardiyalar" });
  const schoolHome = uiContext({ user: school, id: 2201, path: "/school", label: "Okul Merkezi" });
  const parentLive = uiContext({ user: parent, id: 1402, path: "/parent/live", label: "Canlı" });
  const companyActionable = await buildActionableEventsForUser(company);
  check("SETUP", "ROLE_GLOBAL_ACTIONABLE_NONZERO", Number(companyActionable?.summary?.total || 0) > 0, JSON.stringify(companyActionable?.summary));

  const bareAttention = [
    "neye dikkat etmeliyim", "nelere dikkat edeyim", "neyi kontrol etmem iyi olur",
    "göz önünde bulundurmam gereken ne", "gözümden kaçırmamam gereken ne", "burada dikkat etmem gereken bir şey var mı",
  ];
  const explicitAttention = [
    "bu kayıtta neye dikkat etmeliyim", "bu vardiyada neyi kontrol etmeliyim",
    "seçili kayıtta dikkat edilmesi gereken bir şey var mı", "baktığım kayıtta sorun yaşamamak için neye bakayım",
    "bir sorun yaşamamak için neyi kontrol edeyim", "bu vardiyada gözden geçirmem gereken ne var",
  ];
  for (const [index, message] of [...bareAttention, ...explicitAttention].entries()) {
    const expectedExplicit = index >= bareAttention.length;
    await productionCase(`ATTENTION-${index + 1}`, { user: company, screenContext: companyShift, message, authSessionId: `attention-selected-${index}` }, (payload, answer, assert) => {
      const selectedScope = payload?.semanticPlan?.scopeTarget === "SELECTED_RECORD" && planEntityIs(payload, "shift", shift.id);
      const offTopic = payload?.semanticPlan?.family === "OFF_TOPIC_SAFE";
      const globalSubstitution = hasGlobalAgreement(answer);
      if (!selectedScope) counters.selectedRecordAttentionScopeLoss += 1;
      if (offTopic) counters.selectedRecordAttentionOffTopicFallback += 1;
      if (globalSubstitution) counters.selectedRecordGlobalRiskSubstitution += 1;
      assert("SELECTED_RECORD_SCOPE", selectedScope, JSON.stringify(payload?.semanticPlan));
      assert("ASSESSMENT_FAMILY", ["NEXT_STEP", "ISSUE_DIAGNOSTIC", "RISK_RANKING"].includes(payload?.semanticPlan?.family), JSON.stringify(payload?.semanticPlan));
      assert("SELECTED_RECORD_NO_DATA", selectedNoData(answer, shift.id), answer);
      assert("NO_OFF_TOPIC_FALLBACK", !offTopic, answer);
      assert("NO_ROLE_GLOBAL_SUBSTITUTION", !globalSubstitution, answer);
      if (expectedExplicit) assert("EXPLICIT_SELECTED_REFERENCE_PRESERVED", planEntityIs(payload, "shift", shift.id), JSON.stringify(payload?.semanticPlan));
    });
  }

  const generalAttention = [
    "satranç oynarken neye dikkat etmeliyim", "genel olarak karar verirken neye dikkat edilir",
    "genel olarak proje yönetirken neye dikkat edilir", "yeni bir işe başlarken nelere dikkat etmeliyim",
  ];
  const offTopicAttention = [
    "trafikte neye dikkat etmeliyim", "toplantı yönetirken neyi kontrol etmek gerekir",
    "yolculukta nelere dikkat edilir", "film izlerken neye dikkat etmeliyim",
  ];
  for (const [index, message] of [...generalAttention, ...offTopicAttention].entries()) {
    const general = index < generalAttention.length;
    await productionCase(`GENERAL-ATTENTION-${index + 1}`, { user: company, screenContext: companyShift, message, authSessionId: `attention-general-${index}` }, (payload, answer, assert) => {
      const hijacked = !isNonProduct(payload, answer);
      if (general) counters.generalAttentionQueryProductHijack += Number(hijacked);
      else counters.offTopicAttentionQueryProductHijack += Number(hijacked);
      assert("NO_PRODUCT_RETRIEVAL_OR_ENTITY_DISCLOSURE", !hijacked, JSON.stringify({ answer, plan: payload?.semanticPlan }));
      assert("GENERAL_OR_OFF_TOPIC_ROUTE", ["GENERAL_KNOWLEDGE", "OFF_TOPIC_SAFE", "LIVE_EXTERNAL_DATA"].includes(payload?.semanticPlan?.family), JSON.stringify(payload?.semanticPlan));
      assert("NO_SELECTED_SHIFT_PROJECTION", noSelectedProjection(answer, shift.id), answer);
    });
  }

  const bareRisk = ["en önemli risk ne", "risk var mı", "şu an en kritik risk ne"];
  for (const [index, message] of bareRisk.entries()) {
    await productionCase(`BARE-RISK-${index + 1}`, { user: company, screenContext: companyShift, message, authSessionId: `attention-risk-${index}` }, (payload, answer, assert) => {
      assert("SELECTED_RISK_NO_DATA", payload?.semanticPlan?.scopeTarget === "SELECTED_RECORD" && planEntityIs(payload, "shift", shift.id) && selectedNoData(answer, shift.id), JSON.stringify({ answer, plan: payload?.semanticPlan }));
    });
  }
  await productionCase("EXPLICIT-GLOBAL", { user: company, screenContext: companyShift, message: "firma genelinde açık risk var mı", authSessionId: "attention-global" }, (payload, answer, assert) => {
    assert("ROLE_GLOBAL_WINS", payload?.semanticPlan?.scopeTarget === "ROLE_GLOBAL" && !planEntityIs(payload, "shift", shift.id) && noSelectedProjection(answer, shift.id), JSON.stringify({ answer, plan: payload?.semanticPlan }));
  });
  const continuitySession = "attention-selected-global-selected";
  await productionCase("CONTINUITY-SELECTED-1", { user: company, screenContext: companyShift, message: "neye dikkat etmeliyim", authSessionId: continuitySession }, (payload, answer, assert) => assert("FIRST_SELECTED_ATTENTION", payload?.semanticPlan?.scopeTarget === "SELECTED_RECORD" && selectedNoData(answer, shift.id), answer));
  await productionCase("CONTINUITY-GLOBAL", { user: company, screenContext: companyShift, message: "firma genelinde açık risk var mı", authSessionId: continuitySession }, (payload, answer, assert) => assert("EXPLICIT_GLOBAL_SUSPENDS_SELECTION", payload?.semanticPlan?.scopeTarget === "ROLE_GLOBAL" && !planEntityIs(payload, "shift", shift.id), JSON.stringify(payload?.semanticPlan)));
  await productionCase("CONTINUITY-SELECTED-2", { user: company, screenContext: companyShift, message: "bu vardiyanın riskine dön", authSessionId: continuitySession }, (payload, answer, assert) => assert("SELECTED_CONTEXT_RESUMES", payload?.semanticPlan?.scopeTarget === "SELECTED_RECORD" && planEntityIs(payload, "shift", shift.id) && selectedNoData(answer, shift.id), JSON.stringify({ answer, plan: payload?.semanticPlan })));

  const compareSession = "attention-pub06";
  await productionCase("PUB06-COMPARE", { user: room, screenContext: roomOffer, message: "Teklif #35 ile Teklif #34ü karşılaştır", authSessionId: compareSession }, (payload, answer, assert) => assert("COMPARISON_SET", payload?.semanticPlan?.entities?.length === 2 && /Teklif\s*#35/iu.test(answer) && /Teklif\s*#34/iu.test(answer), answer));
  await productionCase("PUB06-PRIORITY", { user: room, screenContext: roomOffer, message: "ikisini önem sırasına koy, nedenini de söyle", authSessionId: compareSession }, (payload, answer, assert) => assert("COMPARISON_PRIORITY", payload?.semanticPlan?.entities?.length === 2 && /Gerekçe:/iu.test(answer) && !/sözleşme inceleme bekliyor/iu.test(answer), answer));
  await productionCase("PUB07-SCREEN", { user: school, screenContext: schoolHome, message: "bu ekranda açık sorun var mı", authSessionId: "attention-pub07" }, (payload, answer, assert) => assert("CURRENT_SCREEN_ZERO_TRUTH", payload?.semanticPlan?.scopeTarget === "CURRENT_SCREEN" && /açık sorun veya fırsat görünmüyor|sayaçları sıfır|doğrulanmış risk yok|açık öncelik gerektiren/iu.test(answer), answer));
  await productionCase("PUB08-SELECTED-RISK", { user: company, screenContext: companyShift, message: "bu vardiyanın riskine dön", authSessionId: "attention-pub08" }, (payload, answer, assert) => assert("EXPLICIT_SELECTED_RISK", payload?.semanticPlan?.scopeTarget === "SELECTED_RECORD" && selectedNoData(answer, shift.id), answer));
  const discourseSession = "attention-pub09";
  await productionCase("PUB09-ESTABLISH", { user: room, screenContext: roomOffer, message: "bu teklifin durumu ne", authSessionId: discourseSession }, (payload, answer, assert) => assert("OFFER_CONTEXT_ESTABLISHED", /Teklif\s*#35/iu.test(answer), answer));
  await productionCase("PUB09-FOLLOWUP", { user: room, screenContext: roomShifts, message: "az önceki teklifin durumu ne", authSessionId: discourseSession }, (payload, answer, assert) => assert("SAME_AUTH_DISCOURSE", Number(payload?.semanticPlan?.entity?.id) === 35 && /Teklif\s*#35/iu.test(answer), JSON.stringify({ answer, plan: payload?.semanticPlan })));
  await productionCase("LUNA002-EXTERNAL", { user: parent, screenContext: parentLive, message: "başka bir kurumun kaç öğrencisi var", authSessionId: "attention-luna002" }, (payload, answer, assert) => assert("EXTERNAL_NOT_SELF_SUBSTITUTED", payload?.semanticPlan?.retrieveProductData === false && !/benim çocuğum|öğrenci\s*#|\b\d+\s+öğrenci/iu.test(answer), JSON.stringify({ answer, plan: payload?.semanticPlan })));
  await productionCase("LUNA004-SCREEN", { user: school, screenContext: schoolHome, message: "hangi sayfadayım", authSessionId: "attention-luna004" }, (payload, answer, assert) => assert("SCREEN_NOT_SELECTION", payload?.semanticPlan?.family === "SCREEN_CONTEXT" && !/Vardiya\s*#|Teklif\s*#/iu.test(answer), answer));
  const crossAuthSession = "attention-luna001";
  await productionCase("LUNA001-ROOM", { user: room, screenContext: roomOffer, message: "bu teklifin durumu ne", authSessionId: crossAuthSession }, (payload, answer, assert) => assert("ROOM_CONTEXT_ESTABLISHED", /Teklif\s*#35/iu.test(answer), answer));
  await productionCase("LUNA001-COMPANY", { user: company, screenContext: companyBare, message: "az önceki teklife geri dönelim", authSessionId: crossAuthSession }, (payload, answer, assert) => assert("CROSS_AUTH_RESET", !/Teklif\s*#35/iu.test(answer) && Number(payload?.semanticPlan?.entity?.id || 0) !== 35, JSON.stringify({ answer, plan: payload?.semanticPlan })));
  await productionCase("FACT-PARITY", { user: company, screenContext: companyShift, message: "başlangıç ve bitiş saatini söyle", authSessionId: "attention-fact" }, (payload, answer, assert) => assert("SHIFT_TIME_INTERVAL", includesInterval(answer, interval) && !/vardiya kaydı/iu.test(answer), answer));
  const styleSession = "attention-style-return";
  await productionCase("STYLE-SOURCE", { user: room, screenContext: roomOffer, message: "bu teklif için risk, kanıt, etki ve sonraki güvenli adım ne", authSessionId: styleSession }, (payload, answer, assert) => assert("STYLE_SOURCE", /Teklif\s*#35/iu.test(answer), answer));
  await productionCase("STYLE-TRANSFORM", { user: room, screenContext: roomOffer, message: "bunu iki cümleye indir", authSessionId: styleSession }, (payload, answer, assert) => assert("STYLE_FINAL_REPLY", payload?.semanticPlan?.family === "STYLE" && String(answer).split(/(?<=[.!?])\s+/u).filter(Boolean).length === 2, answer));
  await productionCase("STYLE-RETURN", { user: room, screenContext: roomShifts, message: "teklife geri dönelim", authSessionId: styleSession }, (payload, answer, assert) => assert("STYLE_RETURN", payload?.semanticPlan?.typedRequest?.taskType === "RETURN_TO_PRODUCT" && /Teklif\s*#35/iu.test(answer), JSON.stringify({ answer, plan: payload?.semanticPlan })));
  await productionCase("GENERAL-INFORMATION", { user: company, screenContext: companyShift, message: "genel olarak servis planı yaparken nelere dikkat edilir", authSessionId: "attention-general-precedence" }, (payload, answer, assert) => assert("GENERAL_INFORMATION_PRECEDENCE", payload?.semanticPlan?.typedRequest?.generalInformationIntent === true && isNonProduct(payload, answer), JSON.stringify({ answer, plan: payload?.semanticPlan })));
} catch (error) {
  failures.push({ caseId: "SETUP", name: "UNCAUGHT", detail: error?.stack || error?.message || String(error) });
}

console.log(JSON.stringify({
  check: "PRE_18_FINAL_ATTENTION_ASSESSMENT_TERRA",
  productionParity: production,
  counters,
  manuallySuppliedSemanticPlanPrimaryCaseCount: 0,
  realServiceOrchestrationUsed: true,
  realFrontendScreenContextShapeUsed: true,
  finalPayloadReplyAsserted: true,
  failures,
}, null, 2));
process.exitCode = failures.length ? 1 : 0;
