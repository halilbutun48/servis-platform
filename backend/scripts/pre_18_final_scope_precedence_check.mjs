import prisma from "../src/prisma.js";
import { runCopilotFoundation } from "../src/ai/service.js";
import { buildActionableEventsForUser } from "../src/services/actionableEvents.js";

// Production-like bounded gate for the final selected-record / explicit
// role-global scope root.  Cases begin with raw text and the same screen
// context shape the browser drawer posts; no primary case supplies a plan.
const failures = [];
const production = { cases: 0, passed: 0, failed: 0, assertions: 0 };
const counters = {
  selectedRecordGlobalRiskSubstitution: 0,
  explicitRoleGlobalScopeLoss: 0,
  explicitGlobalQuerySelectedRecordHijack: 0,
};

function normalize(value) {
  return String(value || "").toLocaleLowerCase("tr-TR").normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "").replace(/ı/g, "i").replace(/ğ/g, "g")
    .replace(/ü/g, "u").replace(/ş/g, "s").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/\s+/g, " ").trim();
}

function reply(payload) {
  return String(payload?.reply || payload?.summary || "").trim();
}

function assertCase(caseId, name, value, detail = "") {
  production.assertions += 1;
  if (!value) failures.push({ caseId, name, detail: String(detail).slice(0, 900) });
}

function screenContext({ user, id, path, label, selected = null }) {
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
  return { id: row.id, role: row.role, companyId: row.companyId ?? null, roomId: row.roomId ?? null, companyKind: row.companyKind || company?.kind || null };
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
    const answer = reply(payload);
    assertCase(caseId, "FINAL_PAYLOAD_REPLY", Boolean(answer), JSON.stringify(payload));
    assertCase(caseId, "FROZEN_TYPED_REQUEST", Object.isFrozen(payload?.semanticPlan?.typedRequest), JSON.stringify(payload?.semanticPlan));
    await verify(payload, answer, (name, value, detail = "") => assertCase(caseId, name, value, detail));
    production.cases += 1;
    if (failures.length === before) production.passed += 1;
    else production.failed += 1;
    return payload;
  } catch (error) {
    assertCase(caseId, "SERVICE_ORCHESTRATION", false, error?.stack || error?.message || error);
    production.cases += 1;
    production.failed += 1;
    return null;
  }
}

function planEntityIs(payload, type, id) {
  const entities = Array.isArray(payload?.semanticPlan?.entities) ? payload.semanticPlan.entities : [];
  const entity = payload?.semanticPlan?.entity || entities[0];
  return String(entity?.type || "").toLowerCase() === type && Number(entity?.id) === Number(id);
}

function hasNoKnownSelectedRisk(answer, shiftId) {
  return new RegExp(`Vardiya\\s*#${shiftId}\\s*için doğrulanmış kayda özgü bir risk sinyali görünmüyor`, "iu").test(answer);
}

function hasGlobalAgreement(answer) {
  return /\b1\s+sözleşme inceleme bekliyor\b/i.test(answer);
}

function noSelectedShiftProjection(answer, shiftId) {
  return !new RegExp(`Vardiya\\s*#${shiftId}\\s*için doğrulanmış kayda özgü`, "iu").test(answer);
}

function noRealEntityDisclosure(answer) {
  return !/(?:vardiya|teklif|sözleşme|arac|araç|sürücü|surucu)\s*#\s*\d+/iu.test(answer);
}

function localTime(value) {
  return new Date(value).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

function hasInterval(answer, interval) {
  return normalize(answer).includes(normalize(interval));
}

try {
  const [company, room, school, parent] = await Promise.all([
    userFor("company@demo.com"), userFor("room@demo.com"), userFor("school@demo.com"), userFor("parent@demo.com"),
  ]);
  const shift = await prisma.shift.findFirst({
    where: { id: 151, companyId: Number(company.companyId) },
    select: { id: true, startAt: true, endAt: true },
  }) || await prisma.shift.findFirst({
    where: { companyId: Number(company.companyId) }, select: { id: true, startAt: true, endAt: true }, orderBy: { id: "asc" } });
  if (!shift?.id) throw new Error("Missing COMPANY shift");
  const interval = `${localTime(shift.startAt)} – ${localTime(shift.endAt)}`;
  const companyShift = screenContext({ user: company, id: 2102, path: "/company/shifts", label: "Vardiyalar", selected: { type: "shift", id: shift.id, label: `Vardiya #${shift.id}` } });
  const companyBare = screenContext({ user: company, id: 2102, path: "/company/shifts", label: "Vardiyalar" });
  const roomOffer = screenContext({ user: room, id: 1103, path: "/room/offers", label: "Teklifler", selected: { type: "offer", id: 35, label: "Teklif #35" } });
  const roomShifts = screenContext({ user: room, id: 1102, path: "/room/shifts", label: "Vardiyalar" });
  const schoolHome = screenContext({ user: school, id: 2201, path: "/school", label: "Okul Merkezi" });
  const parentLive = screenContext({ user: parent, id: 1402, path: "/parent/live", label: "Canlı" });

  // The selected Shift has no record-specific risk, while this COMPANY role
  // still owns a nonzero global actionable signal.  The matrix therefore
  // proves scope ownership, rather than accidentally passing in an all-zero
  // fixture where the two answers would be indistinguishable.
  const companyRoleGlobal = await buildActionableEventsForUser(company);
  assertCase("SETUP", "ROLE_GLOBAL_ACTIONABLE_NONZERO", Number(companyRoleGlobal?.summary?.total || 0) > 0, JSON.stringify(companyRoleGlobal?.summary));

  // Bare assessment is owned by the valid selected record.  It must terminate
  // as selected-record NO_DATA rather than widen to role-global work.
  const bareRiskVariants = [
    "en önemli risk ne", "en kritik konu ne", "şu an en kritik risk ne", "hangi riske dikkat etmeliyim",
    "önce hangi riske bakmalıyım", "şu anda riskli bir durum var mı", "kritik risk görülüyor mu",
    "risk açısından neyi izlemeliyim", "en önce hangi riski değerlendirmeliyim", "dikkat etmem gereken risk ne",
  ];
  for (const [index, message] of bareRiskVariants.entries()) {
    await productionCase(`BARE-SELECTED-${index + 1}`, { user: company, screenContext: companyShift, message, authSessionId: `scope-bare-${index}` }, (payload, answer, check) => {
      if (!hasNoKnownSelectedRisk(answer, shift.id)) counters.selectedRecordGlobalRiskSubstitution += 1;
      check("SELECTED_RECORD_SCOPE", payload?.semanticPlan?.scopeTarget === "SELECTED_RECORD", JSON.stringify(payload?.semanticPlan));
      check("SELECTED_SHIFT_ENTITY", planEntityIs(payload, "shift", shift.id), JSON.stringify(payload?.semanticPlan));
      check("NARROW_SCOPE_NO_DATA_TERMINAL", hasNoKnownSelectedRisk(answer, shift.id), answer);
      check("NO_ROLE_GLOBAL_SUBSTITUTION", !hasGlobalAgreement(answer), answer);
    });
  }

  // Explicit user scope wins over inherited selection.  It must be global even
  // while the Shift remains selected in the browser screen context.
  const globalRiskVariants = [
    "firma genelinde açık risk var mı", "şirket genelindeki en kritik konu ne", "tüm firma için hangi risk var",
    "genel risklerimizi söyle", "firma çapında neleri öncelemeliyiz", "bütün operasyon genelinde açık risk ne",
    "kurum genelindeki riskleri sırala", "tüm operasyonlarda en kritik sorun ne",
    "şirket çapında dikkat edilmesi gereken risk nedir", "rol genelindeki açık öncelikleri açıkla",
  ];
  for (const [index, message] of globalRiskVariants.entries()) {
    await productionCase(`EXPLICIT-GLOBAL-${index + 1}`, { user: company, screenContext: companyShift, message, authSessionId: `scope-global-${index}` }, (payload, answer, check) => {
      const isGlobal = payload?.semanticPlan?.scopeTarget === "ROLE_GLOBAL";
      const isHijacked = planEntityIs(payload, "shift", shift.id) || !noSelectedShiftProjection(answer, shift.id);
      if (!isGlobal) counters.explicitRoleGlobalScopeLoss += 1;
      if (isHijacked) counters.explicitGlobalQuerySelectedRecordHijack += 1;
      check("EXPLICIT_ROLE_GLOBAL_SCOPE", isGlobal, JSON.stringify(payload?.semanticPlan));
      check("NO_SELECTED_ENTITY_IN_GLOBAL_PLAN", !planEntityIs(payload, "shift", shift.id), JSON.stringify(payload?.semanticPlan));
      check("NO_SELECTED_RECORD_PROJECTION", noSelectedShiftProjection(answer, shift.id), answer);
    });
  }

  // This is the exact continuity contract: selected -> explicit global ->
  // selected.  The global turn suspends, rather than erases, valid selection.
  const continuitySession = "scope-selected-global-selected";
  await productionCase("CONTINUITY-SELECTED-1", { user: company, screenContext: companyShift, message: "en önemli risk ne", authSessionId: continuitySession }, (payload, answer, check) => {
    check("FIRST_SELECTED_NO_DATA", payload?.semanticPlan?.scopeTarget === "SELECTED_RECORD" && hasNoKnownSelectedRisk(answer, shift.id), answer);
  });
  await productionCase("CONTINUITY-GLOBAL", { user: company, screenContext: companyShift, message: "firma genelinde açık risk var mı", authSessionId: continuitySession }, (payload, answer, check) => {
    check("MIDDLE_EXPLICIT_GLOBAL", payload?.semanticPlan?.scopeTarget === "ROLE_GLOBAL" && !planEntityIs(payload, "shift", shift.id) && noSelectedShiftProjection(answer, shift.id) && hasGlobalAgreement(answer), JSON.stringify({ answer, plan: payload?.semanticPlan }));
  });
  await productionCase("CONTINUITY-SELECTED-2", { user: company, screenContext: companyShift, message: "yeniden en önemli risk ne", authSessionId: continuitySession }, (payload, answer, check) => {
    check("SELECTED_CONTEXT_RESUMES", payload?.semanticPlan?.scopeTarget === "SELECTED_RECORD" && hasNoKnownSelectedRisk(answer, shift.id), answer);
  });

  // Narrow regression ladder: current screen, comparison, general knowledge,
  // external ownership, same-auth discourse, cross-auth reset, and the
  // earlier final-path families.  Each remains on real orchestration/reply.
  await productionCase("PUB07-SCREEN", { user: school, screenContext: schoolHome, message: "bu ekranda açık sorun var mı", authSessionId: "scope-pub07" }, (payload, answer, check) => {
    check("CURRENT_SCREEN_NOT_ROLE_GLOBAL", payload?.semanticPlan?.scopeTarget === "CURRENT_SCREEN", JSON.stringify(payload?.semanticPlan));
    check("ZERO_SCREEN_TRUTH", /açık sorun veya fırsat görünmüyor|sayaçları sıfır|doğrulanmış risk yok|açık öncelik gerektiren/i.test(answer), answer);
  });
  const comparisonSession = "scope-pub06";
  await productionCase("PUB06-COMPARE", { user: room, screenContext: roomOffer, message: "Teklif #35 ile Teklif #34ü karşılaştır", authSessionId: comparisonSession }, (payload, answer, check) => check("COMPARISON_SET", payload?.semanticPlan?.entities?.length === 2 && /Teklif\s*#35/iu.test(answer) && /Teklif\s*#34/iu.test(answer), answer));
  await productionCase("PUB06-PRIORITY", { user: room, screenContext: roomOffer, message: "ikisini önem sırasına koy, nedenini de söyle", authSessionId: comparisonSession }, (payload, answer, check) => check("COMPARISON_PRIORITY", payload?.semanticPlan?.entities?.length === 2 && /Gerekçe:/iu.test(answer) && !/sözleşme inceleme bekliyor/i.test(answer), answer));
  await productionCase("PUB08-GENERAL", { user: company, screenContext: companyShift, message: "genel servis planlama yaparken nelere dikkat edilir", authSessionId: "scope-general" }, (payload, answer, check) => check("GENERAL_INFORMATION_BEATS_SELECTION", payload?.semanticPlan?.typedRequest?.generalInformationIntent === true && payload?.semanticPlan?.retrieveProductData === false && noRealEntityDisclosure(answer), answer));
  await productionCase("PUB01-CREATIVE", { user: company, screenContext: companyShift, message: "rota ve araç geçen iki cümlelik not yaz", authSessionId: "scope-pub01" }, (payload, answer, check) => check("CREATIVE_TERMS_NO_RETRIEVAL", payload?.semanticPlan?.retrieveProductData === false && /rota/iu.test(answer) && /araç|arac/iu.test(answer) && noRealEntityDisclosure(answer), answer));
  await productionCase("PUB02-GROUNDED", { user: company, screenContext: companyShift, message: "seçili vardiyanın saatini kullanıp sürücüye kısa mesaj hazırla", authSessionId: "scope-pub02" }, (payload, answer, check) => check("GROUNDED_WRITING", payload?.semanticPlan?.typedRequest?.productGroundedWritingIntent === true && hasInterval(answer, interval) && /mesaj|sürücü|surucu|şoför|sofor/iu.test(answer), answer));
  await productionCase("PUB03-TIME", { user: company, screenContext: companyShift, message: "bu kayıt kaçta başlayıp kaçta bitiyor", authSessionId: "scope-pub03" }, (payload, answer, check) => check("TIME_RANGE_NOT_COUNT", payload?.semanticPlan?.family === "ENTITY_LOOKUP" && hasInterval(answer, interval) && !/vardiya kaydı/iu.test(answer), answer));
  await productionCase("PUB03-COUNT", { user: company, screenContext: companyShift, message: "kaç vardiya var", authSessionId: "scope-pub03-count" }, (payload, answer, check) => check("COUNT_STAYS_COUNT", payload?.semanticPlan?.family === "COUNT" && !hasInterval(answer, interval), JSON.stringify({ answer, plan: payload?.semanticPlan })));
  await productionCase("PUB05-MULTIPART", { user: room, screenContext: roomOffer, message: "teklifin tarihini baştan sona ve durumunu söyle", authSessionId: "scope-pub05" }, (payload, answer, check) => check("MULTIPART_COMPLETE", /Açık/iu.test(answer) && /28\.09\.2026/iu.test(answer) && /15:00[\s\S]{0,48}17:00/iu.test(answer), answer));
  const styleSession = "scope-pub04";
  await productionCase("PUB04-SOURCE", { user: room, screenContext: roomOffer, message: "bu teklif için risk, kanıt, etki ve sonraki güvenli adım ne", authSessionId: styleSession }, (payload, answer, check) => check("STYLE_SOURCE", /Teklif\s*#35/iu.test(answer), answer));
  await productionCase("PUB04-STYLE", { user: room, screenContext: roomOffer, message: "bunu iki cümleye indir", authSessionId: styleSession }, (payload, answer, check) => check("STYLE_TRANSFORMED", payload?.semanticPlan?.family === "STYLE" && String(answer).split(/(?<=[.!?])\s+/u).filter(Boolean).length === 2, answer));
  await productionCase("STYLE-OFFTOPIC", { user: room, screenContext: roomOffer, message: "teklifleri bırak, firma ve rakam geçen kısa şaka yaz", authSessionId: styleSession }, (payload, answer, check) => check("OFFTOPIC_SUSPENDS_PRODUCT", payload?.semanticPlan?.retrieveProductData === false && /firma/iu.test(answer) && /rakam/iu.test(answer) && noRealEntityDisclosure(answer), answer));
  await productionCase("STYLE-RETURN", { user: room, screenContext: roomShifts, message: "teklife geri dönelim", authSessionId: styleSession }, (payload, answer, check) => check("STYLE_RETURN_RESTORES_SAME_AUTH", payload?.semanticPlan?.typedRequest?.taskType === "RETURN_TO_PRODUCT" && /Teklif\s*#35/iu.test(answer), JSON.stringify({ answer, plan: payload?.semanticPlan })));
  const discourseSession = "scope-pub09";
  await productionCase("PUB09-ESTABLISH", { user: room, screenContext: roomOffer, message: "bu teklifin durumu ne", authSessionId: discourseSession }, (payload, answer, check) => check("OFFER_ESTABLISHED", /Teklif\s*#35/iu.test(answer), answer));
  await productionCase("PUB09-FOLLOWUP", { user: room, screenContext: roomShifts, message: "az önceki teklifin durumu ne", authSessionId: discourseSession }, (payload, answer, check) => check("SAME_AUTH_DISCOURSE", Number(payload?.semanticPlan?.entity?.id) === 35 && /Teklif\s*#35/iu.test(answer), JSON.stringify({ answer, plan: payload?.semanticPlan })));
  await productionCase("LUNA002-EXTERNAL", { user: parent, screenContext: parentLive, message: "başka bir kurumun kaç öğrencisi var", authSessionId: "scope-luna002" }, (payload, answer, check) => check("EXTERNAL_NOT_SELF_SUBSTITUTED", payload?.semanticPlan?.retrieveProductData === false && !/benim çocuğum|öğrenci\s*#|\b\d+\s+öğrenci/iu.test(answer), JSON.stringify({ answer, plan: payload?.semanticPlan })));
  await productionCase("LUNA004-SCREEN", { user: school, screenContext: schoolHome, message: "hangi sayfadayım", authSessionId: "scope-luna004" }, (payload, answer, check) => check("SCREEN_NOT_SELECTION", payload?.semanticPlan?.family === "SCREEN_CONTEXT" && !/Vardiya\s*#|Teklif\s*#/iu.test(answer), answer));

  const crossAuthSession = "scope-luna001";
  await productionCase("LUNA001-ROOM", { user: room, screenContext: roomOffer, message: "bu teklifin durumu ne", authSessionId: crossAuthSession }, (payload, answer, check) => check("ROOM_CONTEXT_ESTABLISHED", /Teklif\s*#35/iu.test(answer), answer));
  await productionCase("LUNA001-COMPANY", { user: company, screenContext: companyBare, message: "az önceki teklife geri dönelim", authSessionId: crossAuthSession }, (payload, answer, check) => check("CROSS_AUTH_RESET", !/Teklif\s*#35/iu.test(answer) && Number(payload?.semanticPlan?.entity?.id || 0) !== 35, JSON.stringify({ answer, plan: payload?.semanticPlan })));
} catch (error) {
  failures.push({ caseId: "SETUP", name: "UNCAUGHT", detail: error?.stack || error?.message || String(error) });
}

console.log(JSON.stringify({
  check: "PRE_18_FINAL_SCOPE_PRECEDENCE_TERRA",
  productionParity: production,
  scopeCounters: counters,
  manuallySuppliedSemanticPlanPrimaryCaseCount: 0,
  realServiceOrchestrationUsed: true,
  realFrontendScreenContextShapeUsed: true,
  finalPayloadReplyAsserted: true,
  failures,
}, null, 2));
process.exitCode = failures.length ? 1 : 0;
