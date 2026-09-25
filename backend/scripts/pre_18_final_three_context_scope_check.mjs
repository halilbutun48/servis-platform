import prisma from "../src/prisma.js";
import { runCopilotFoundation } from "../src/ai/service.js";
import { getCanonicalConversationState } from "../src/ai/chat/canonicalConversationState.js";
import { buildActionableEventsForUser } from "../src/services/actionableEvents.js";

// Bounded production-parity gate for PUB-07/08/09. Primary cases begin with
// raw text and the real drawer shape, then assert final payload.reply. SCHOOL
// uses the same server-side actionable read identity that the visible command
// centre receives; no client counters or synthetic screen snapshot is used.
const failures = [];
const production = { cases: 0, passed: 0, failed: 0, assertions: 0 };
const scopeCounters = {
  currentScreenGlobalOverride: 0,
  selectedRecordGlobalRiskSubstitution: 0,
  comparisonGlobalActionableSubstitution: 0,
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

function assertCase(caseId, name, value, detail = "") {
  production.assertions += 1;
  if (!value) failures.push({ caseId, name, detail: String(detail).slice(0, 800) });
}

function context({ user, id, path, label, selected = null } = {}) {
  // Matches the CHAT request body built by CopilotPanel: screen identity,
  // role/kind, current UI selection, and presentational UI hints only.
  return {
    id,
    path,
    label,
    role: user?.role || "",
    companyKind: user?.companyKind || "",
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
  return runCopilotFoundation({ intent: "CHAT_HELP", entityType: "screen", entityId: Number(input.screenContext?.id || 0), ...input });
}

async function productionCase(caseId, input, verify) {
  const before = failures.length;
  try {
    const payload = await ask(input);
    const answer = finalReply(payload);
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

function localTime(value) {
  return new Date(value).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
}

function hasTimeRange(answer, expected) {
  return normalize(answer).includes(normalize(expected));
}

function noGlobalRisk(answer) {
  return !/\b1\s+sözleşme inceleme bekliyor\b/i.test(String(answer || ""));
}

function noRealEntityDisclosure(answer) {
  return !/(?:vardiya|teklif|sözleşme|arac|araç|sürücü|surucu)\s*#\s*\d+/iu.test(String(answer || ""));
}

try {
  const [company, room, school, parent] = await Promise.all([
    userFor("company@demo.com"), userFor("room@demo.com"), userFor("school@demo.com"), userFor("parent@demo.com"),
  ]);
  const shift = await prisma.shift.findFirst({
    where: { id: 151, companyId: Number(company.companyId) },
    select: { id: true, startAt: true, endAt: true },
  }) || await prisma.shift.findFirst({ where: { companyId: Number(company.companyId) }, select: { id: true, startAt: true, endAt: true }, orderBy: { id: "asc" } });
  if (!shift?.id) throw new Error("Missing COMPANY shift");
  const interval = `${localTime(shift.startAt)} – ${localTime(shift.endAt)}`;
  const companyShift = context({ user: company, id: 2102, path: "/company/shifts", label: "Vardiyalar", selected: { type: "shift", id: shift.id, label: `Vardiya #${shift.id}` } });
  const roomOffer = context({ user: room, id: 1103, path: "/room/offers", label: "Teklifler", selected: { type: "offer", id: 35, label: "Teklif #35" } });
  const roomShifts = context({ user: room, id: 1102, path: "/room/shifts", label: "Vardiyalar" });
  const schoolHome = context({ user: school, id: 2201, path: "/school", label: "Okul Merkezi" });
  const parentLive = context({ user: parent, id: 1402, path: "/parent/live", label: "Canlı" });

  // PUB-07 setup: a SCHOOL-enriched role has a broader actionable signal, but
  // the real role-home command centre's persisted COMPANY identity has a zero
  // snapshot. The assistant must use that same server-owned UI read model for
  // CURRENT_SCREEN rather than substituting the broader role-global signal.
  const schoolRoleGlobal = await buildActionableEventsForUser(school);
  assertCase("SETUP-PUB07", "ROLE_GLOBAL_NONZERO", Number(schoolRoleGlobal?.summary?.total || 0) > 0, JSON.stringify(schoolRoleGlobal?.summary));
  const schoolUiReadModel = await buildActionableEventsForUser({ ...school, companyKind: null });
  assertCase("SETUP-PUB07", "UI_CURRENT_SCREEN_ZERO", Number(schoolUiReadModel?.summary?.total || 0) === 0, JSON.stringify(schoolUiReadModel?.summary));
  const schoolMessages = [
    "burada neyi takip ediyoruz", "bu ekranda açık bir sorun var mı", "bu ekranda en önemli şey ne", "bu sayfada önce neye bakmalıyım",
    "bu sayfada ilk güvenli hamle ne", "bu ekranda durum ne", "bu sayfada şu an sorun var mı", "burada şimdi nereden başlayalım",
  ];
  for (const [index, message] of schoolMessages.entries()) {
    await productionCase(`PUB07-${index + 1}`, { user: school, screenContext: schoolHome, message, authSessionId: `final-three-school-${index}` }, (payload, answer, check) => {
      if (/takip edilmeli:\s*1|veli erişimi tamamlanmayı bekliyor/i.test(answer)) scopeCounters.currentScreenGlobalOverride += 1;
      check("CURRENT_SCREEN_SCOPE", payload?.semanticPlan?.scopeTarget === "CURRENT_SCREEN", JSON.stringify(payload?.semanticPlan));
      check("ZERO_SCREEN_TRUTH", /açık sorun veya fırsat görünmüyor|sayaçları sıfır|doğrulanmış risk yok|açık öncelik gerektiren|doğrulanmış sorun yok|doğrulanmış sorun bulunmuyor/i.test(answer), answer);
      check("NO_ROLE_GLOBAL_OVERRIDE", !/takip edilmeli:\s*1|veli erişimi tamamlanmayı bekliyor/i.test(answer), answer);
      check("UI_CURRENT_SCREEN_SERVER_SOURCE", /ui-current-screen-(?:scope|kapsam)/iu.test(String(payload?.dataSources || "")), JSON.stringify(payload?.dataSources));
    });
  }

  // PUB-08: selected Shift risk variants remain selected-scoped; a separate
  // explicit role-global question is the only allowed global-risk path.
  const selectedRiskMessages = [
    "vardiyanın riskini ve güvenli sonraki adımı söyle", "seçili vardiyada risk var mı, sonra neyi doğrulayayım", "bu kayıtta dikkat etmem gereken risk ve ilk güvenli adım ne",
    "bu vardiyanın riski ne, sonra ne yapmalıyım", "baktığım vardiya için risk görüyor musun; güvenli devam adımı ne", "açık vardiyadaki risk nedir ve neyi kontrol etmeliyim",
    "şu vardiyada sorun riski var mı; sonraki güvenli iş ne", "seçili seferin riskiyle birlikte ilk adımı açıkla",
  ];
  for (const [index, message] of selectedRiskMessages.entries()) {
    await productionCase(`PUB08-${index + 1}`, { user: company, screenContext: companyShift, message, authSessionId: `final-three-risk-${index}` }, (payload, answer, check) => {
      if (!noGlobalRisk(answer)) scopeCounters.selectedRecordGlobalRiskSubstitution += 1;
      check("SELECTED_SCOPE", payload?.semanticPlan?.scopeTarget === "SELECTED_RECORD", JSON.stringify(payload?.semanticPlan));
      check("SELECTED_SHIFT", payload?.semanticPlan?.entity?.type === "shift" && Number(payload?.semanticPlan?.entity?.id) === Number(shift.id), JSON.stringify(payload?.semanticPlan));
      check("NO_GLOBAL_RISK_SUBSTITUTION", noGlobalRisk(answer) && new RegExp(`Vardiya\\s*#${shift.id}`, "iu").test(answer), answer);
      check("SELECTED_NO_DATA_TERMINAL", /doğrulanmış kayda özgü bir risk sinyali görünmüyor/i.test(answer)
        && /authorized selected-record risk boundary/i.test(String(payload?.dataSources || "")), JSON.stringify({ answer, dataSources: payload?.dataSources }));
    });
  }
  const globalScopeSession = "final-three-risk-global";
  await productionCase("PUB08-TERMINAL-THEN-GLOBAL", { user: company, screenContext: companyShift, message: "seçili vardiyada risk var mı; güvenli devam adımı ne", authSessionId: globalScopeSession }, (payload, answer, check) => {
    check("NARROW_NO_DATA_BEFORE_SCOPE_CHANGE", payload?.semanticPlan?.scopeTarget === "SELECTED_RECORD"
      && /doğrulanmış kayda özgü bir risk sinyali görünmüyor/i.test(answer), answer);
  });
  await productionCase("PUB08-GLOBAL-CONTROL", { user: company, screenContext: companyShift, message: "firma genelindeki riskleri söyle", authSessionId: globalScopeSession }, (payload, answer, check) => {
    check("ROLE_GLOBAL_SCOPE", payload?.semanticPlan?.scopeTarget === "ROLE_GLOBAL", JSON.stringify(payload?.semanticPlan));
    check("GLOBAL_PATH_AVAILABLE", !/Vardiya\s*#151 için doğrulanmış kayda özgü/i.test(answer), answer);
  });

  // PUB-09: service turns establish the referent before a real route change.
  const discourseMessages = [
    "az önceki teklifin durumu ne", "önce baktığımız teklif açık mı", "o teklifin kararı nedir", "biraz önce konuştuğumuz teklifin statüsü ne", "önceki teklif kaydının durumu nasıl", "deminki teklifin sonucu ne",
  ];
  for (const [index, message] of discourseMessages.entries()) {
    const session = `final-three-discourse-${index}`;
    await productionCase(`PUB09-${index + 1}-ESTABLISH`, { user: room, screenContext: roomOffer, message: "bu teklifin durumu ne", authSessionId: session }, (payload, answer, check) => {
      check("OFFER_ESTABLISHED", /Teklif\s*#35/iu.test(answer), answer);
      const state = getCanonicalConversationState({ user: room, screenContext: roomOffer, authSessionId: session });
      check("UNIQUE_DISCOURSE_REGISTER", state?.uniqueDiscourseReferent?.type === "offer" && Number(state?.uniqueDiscourseReferent?.id) === 35, JSON.stringify(state?.uniqueDiscourseReferent));
    });
    await productionCase(`PUB09-${index + 1}-FOLLOWUP`, { user: room, screenContext: roomShifts, message, authSessionId: session }, (payload, answer, check) => {
      check("FOLLOW_UP_CONTEXT", payload?.semanticPlan?.entity?.source === "FOLLOW_UP_CONTEXT" && Number(payload?.semanticPlan?.entity?.id) === 35, JSON.stringify(payload?.semanticPlan));
      check("DISCOURSE_REFERENCE_CLASSIFIED", payload?.semanticPlan?.discourseReference === true, JSON.stringify(payload?.semanticPlan));
      check("OFFER_NOT_CURRENT_UI_SELECTION", !payload?.semanticPlan?.typedRequest?.selectedRecordIntent, JSON.stringify(payload?.semanticPlan?.typedRequest));
      check("FINAL_REPLY_RESOLVES_OFFER", /Teklif\s*#35/iu.test(answer) && !/hangi.*teklif/i.test(answer), answer);
    });
  }
  const ambiguousSession = "final-three-discourse-ambiguous";
  await productionCase("PUB09-AMBIGUOUS-COMPARE", { user: room, screenContext: roomOffer, message: "Teklif #35 ile Teklif #34'ü karşılaştır", authSessionId: ambiguousSession }, (payload, answer, check) => check("PAIR_ESTABLISHED", payload?.semanticPlan?.entities?.length === 2, JSON.stringify(payload?.semanticPlan)));
  await productionCase("PUB09-AMBIGUOUS-REFERENCE", { user: room, screenContext: roomShifts, message: "o teklifin durumu ne", authSessionId: ambiguousSession }, (payload, answer, check) => check("AMBIGUITY_CLARIFIED", /hangisi olduğunu netleştir|hangisini kastettiğini/i.test(answer) && !/Teklif\s*#(?:35|34)\s+için durum/iu.test(answer), JSON.stringify({ answer, plan: payload?.semanticPlan })));
  const selectedShiftRoute = context({ user: room, id: 1102, path: "/room/shifts", label: "Vardiyalar", selected: { type: "shift", id: 167, label: "Vardiya #167" } });
  const selectedRouteSession = "final-three-discourse-selected-route";
  await productionCase("PUB09-SELECTED-ROUTE-ESTABLISH", { user: room, screenContext: roomOffer, message: "bu teklifin durumu ne", authSessionId: selectedRouteSession }, (payload, answer, check) => check("OFFER_DISCOURSE_ESTABLISHED", /Teklif\s*#35/iu.test(answer), answer));
  await productionCase("PUB09-SELECTED-ROUTE-FOLLOWUP", { user: room, screenContext: selectedShiftRoute, message: "az önceki teklifin durumu ne", authSessionId: selectedRouteSession }, (payload, answer, check) => {
    check("NAMED_DISCOURSE_BEATS_OTHER_UI_SELECTION", payload?.semanticPlan?.entity?.source === "FOLLOW_UP_CONTEXT" && Number(payload?.semanticPlan?.entity?.id) === 35, JSON.stringify(payload?.semanticPlan));
    check("FINAL_REPLY_STAYS_OFFER", /Teklif\s*#35/iu.test(answer) && !/Vardiya\s*#167 için durum/iu.test(answer), answer);
  });

  // Closed PUB-01…06 and scope/state regressions, each on the full service
  // path. These are intentionally compact, not a second defect harvest.
  await productionCase("R-PUB01-CREATIVE", { user: company, screenContext: companyShift, message: "rota ve araç geçen iki cümlelik not yaz", authSessionId: "final-three-pub01" }, (payload, answer, check) => check("CREATIVE_NO_RETRIEVAL", payload?.semanticPlan?.retrieveProductData === false && /rota/iu.test(answer) && /araç|arac/iu.test(answer) && noRealEntityDisclosure(answer), answer));
  await productionCase("R-PUB02-GROUNDED", { user: company, screenContext: companyShift, message: "seçili vardiyanın saatini kullanıp sürücüye kısa mesaj hazırla", authSessionId: "final-three-pub02" }, (payload, answer, check) => check("GROUNDED_TIME_MESSAGE", payload?.semanticPlan?.typedRequest?.productGroundedWritingIntent === true && hasTimeRange(answer, interval) && /mesaj|sürücü|surucu|şoför|sofor/iu.test(answer), answer));
  await productionCase("R-PUB03-TIME", { user: company, screenContext: companyShift, message: "bu kayıt kaçta başlayıp kaçta bitiyor", authSessionId: "final-three-pub03" }, (payload, answer, check) => check("FULL_INTERVAL_NOT_COUNT", payload?.semanticPlan?.family === "ENTITY_LOOKUP" && hasTimeRange(answer, interval) && !/vardiya kaydı/iu.test(answer), answer));
  await productionCase("R-PUB03-COUNT", { user: company, screenContext: companyShift, message: "kaç vardiya var", authSessionId: "final-three-pub03-count" }, (payload, answer, check) => check("CARDINALITY_STAYS_COUNT", payload?.semanticPlan?.family === "COUNT" && !hasTimeRange(answer, interval), JSON.stringify({ answer, plan: payload?.semanticPlan })));
  const styleSession = "final-three-pub04";
  await productionCase("R-PUB04-SOURCE", { user: room, screenContext: roomOffer, message: "bu teklif için risk, kanıt, etki ve sonraki güvenli adım ne", authSessionId: styleSession }, (payload, answer, check) => check("STYLE_SOURCE", /Teklif\s*#35/iu.test(answer), answer));
  await productionCase("R-PUB04-STYLE", { user: room, screenContext: roomOffer, message: "bunu iki cümleye indir", authSessionId: styleSession }, (payload, answer, check) => check("TWO_SENTENCE_STYLE", payload?.semanticPlan?.family === "STYLE" && String(answer).split(/(?<=[.!?])\s+/u).filter(Boolean).length === 2, answer));
  await productionCase("R-STYLE-OFFTOPIC", { user: room, screenContext: roomOffer, message: "teklifleri bırak, firma ve rakam geçen kısa şaka yaz", authSessionId: styleSession }, (payload, answer, check) => check("OFFTOPIC_SUSPENDS_PRODUCT", payload?.semanticPlan?.retrieveProductData === false && /firma/iu.test(answer) && /rakam/iu.test(answer) && noRealEntityDisclosure(answer), answer));
  await productionCase("R-STYLE-RETURN", { user: room, screenContext: roomShifts, message: "teklife geri dönelim", authSessionId: styleSession }, (payload, answer, check) => check("STYLE_RETURN_RESTORES_SAME_AUTH", payload?.semanticPlan?.typedRequest?.taskType === "RETURN_TO_PRODUCT" && /Teklif\s*#35/iu.test(answer), JSON.stringify({ answer, plan: payload?.semanticPlan })));
  await productionCase("R-PUB05-MULTIPART", { user: room, screenContext: roomOffer, message: "teklifin tarihini baştan sona ve durumunu söyle", authSessionId: "final-three-pub05" }, (payload, answer, check) => check("MULTIPART_COMPLETE", /Açık/iu.test(answer) && /28\.09\.2026/iu.test(answer) && /15:00[\s\S]{0,48}17:00/iu.test(answer), answer));
  const comparisonPriorityVariants = [
    ["Teklif #35 ile Teklif #34ü karşılaştır", "teklifleri tarih ve tutar açısından karşılaştırıp önce hangisine bakacağımızı söyle"],
    ["Teklif #35 ve Teklif #34ü yan yana kıyasla", "ikisini önem sırasına koy; neden"],
    ["35 ve 34 numaralı teklifleri karşılaştır", "bu iki teklifi tarih ve bedel yönünden sıralayıp gerekçeyi açıkla"],
    ["Teklif #35 ile #34 arasındaki farkı çıkar", "hangisini ilk ele alalım, nedeni ne"],
    ["35 ile 34 teklifini kıyasla", "teklifleri tarihleri ve tutarlarıyla karşılaştır; öncelik sırası ne"],
    ["Teklif #35, Teklif #34 ile nasıl farklı", "iki teklifin farkını çıkar sonra aciliyet sırasını ver"],
    ["#35 ve #34 teklifini karşılaştır", "önce hangi teklife bakalım; tarih ve bedel yönünden açıkla"],
    ["Teklif #35 ile #34ü değerlendir", "bu ikiliyi teklif tarihi ve fiyatına göre değerlendir, kimi öne koyarsın"],
  ];
  for (const [index, [seedMessage, priorityMessage]] of comparisonPriorityVariants.entries()) {
    const compareSession = `final-three-pub06-${index}`;
    await productionCase(`PUB06-${index + 1}-COMPARE`, { user: room, screenContext: roomOffer, message: seedMessage, authSessionId: compareSession }, (payload, answer, check) => {
      if (!noGlobalRisk(answer)) scopeCounters.comparisonGlobalActionableSubstitution += 1;
      check("COMPARISON_SET_ESTABLISHED", payload?.semanticPlan?.entities?.length === 2 && payload?.semanticPlan?.comparisonSpec?.kind === "ENTITY_COMPARISON", JSON.stringify(payload?.semanticPlan));
      check("COMPARISON_FINAL_REPLY", /Teklif\s*#35/iu.test(answer) && /Teklif\s*#34/iu.test(answer) && noGlobalRisk(answer), answer);
    });
    await productionCase(`PUB06-${index + 1}-PRIORITY`, { user: room, screenContext: roomOffer, message: priorityMessage, authSessionId: compareSession }, (payload, answer, check) => {
      if (!noGlobalRisk(answer)) scopeCounters.comparisonGlobalActionableSubstitution += 1;
      check("ACTIVE_COMPARISON_SET_RETAINED", payload?.semanticPlan?.entities?.length === 2 && payload?.semanticPlan?.comparisonSpec?.kind === "ENTITY_COMPARISON", JSON.stringify(payload?.semanticPlan));
      check("PRIORITY_ORDER_REASON", /Teklif\s*#(?:35|34)/iu.test(answer) && /Önce|Eşit|yeterli kanıt/iu.test(answer) && /Gerekçe:/iu.test(answer) && noGlobalRisk(answer), answer);
    });
  }
  await productionCase("R-GENERAL-INFORMATION", { user: company, screenContext: companyShift, message: "genel servis planlama yaparken nelere dikkat edilir", authSessionId: "final-three-general" }, (payload, answer, check) => check("GENERAL_BEATS_SELECTED_CONTEXT", payload?.semanticPlan?.typedRequest?.generalInformationIntent === true && payload?.semanticPlan?.retrieveProductData === false && noRealEntityDisclosure(answer), answer));
  await productionCase("R-OFFTOPIC", { user: room, screenContext: roomOffer, message: "teklifleri bırak, firma ve rakam geçen kısa şaka yaz", authSessionId: "final-three-offtopic" }, (payload, answer, check) => check("OFFTOPIC_NO_RETRIEVAL", payload?.semanticPlan?.retrieveProductData === false && /firma/iu.test(answer) && /rakam/iu.test(answer) && noRealEntityDisclosure(answer), answer));

  const crossAuthSession = "final-three-luna001";
  await productionCase("R-LUNA001-ROOM", { user: room, screenContext: roomOffer, message: "bu teklifin durumu ne", authSessionId: crossAuthSession }, (payload, answer, check) => check("ROOM_CONTEXT", /Teklif\s*#35/iu.test(answer), answer));
  await productionCase("R-LUNA001-COMPANY", { user: company, screenContext: context({ user: company, id: 2102, path: "/company/shifts", label: "Vardiyalar" }), message: "az önceki teklife geri dönelim", authSessionId: crossAuthSession }, (payload, answer, check) => check("CROSS_AUTH_RESET", !/Teklif\s*#35/iu.test(answer) && Number(payload?.semanticPlan?.entity?.id || 0) !== 35, JSON.stringify({ answer, plan: payload?.semanticPlan })));
  await productionCase("R-LUNA004-SCREEN", { user: school, screenContext: schoolHome, message: "hangi sayfadayım", authSessionId: "final-three-luna004-screen" }, (payload, answer, check) => check("SCREEN_NOT_SELECTION", payload?.semanticPlan?.family === "SCREEN_CONTEXT" && /Okul Merkezi|okul/i.test(answer) && !/Vardiya\s*#|Teklif\s*#/iu.test(answer), answer));
  await productionCase("R-LUNA004-SELECTION", { user: company, screenContext: companyShift, message: "hangi kayda bakıyorum", authSessionId: "final-three-luna004-selection" }, (payload, answer, check) => check("SELECTED_NOT_SCREEN", payload?.semanticPlan?.family === "SELECTED_RECORD_CONTEXT" && new RegExp(`Vardiya\\s*#${shift.id}`, "iu").test(answer), answer));
  await productionCase("R-LUNA002-EXTERNAL", { user: parent, screenContext: parentLive, message: "başka bir kurumun kaç öğrencisi var", authSessionId: "final-three-luna002" }, (payload, answer, check) => check("EXTERNAL_NOT_SUBSTITUTED", payload?.semanticPlan?.retrieveProductData === false && !/benim çocuğum|öğrenci\s*#|\b\d+\s+öğrenci/iu.test(answer), JSON.stringify({ answer, plan: payload?.semanticPlan })));
} catch (error) {
  failures.push({ caseId: "SETUP", name: "UNCAUGHT", detail: error?.stack || error?.message || String(error) });
}

const result = {
  check: "PRE_18_FINAL_THREE_CONTEXT_SCOPE_TERRA",
  productionParity: production,
  scopeCounters,
  manuallySuppliedSemanticPlanPrimaryCaseCount: 0,
  realFrontendScreenContextShapeUsed: true,
  realServiceOrchestrationUsed: true,
  finalPayloadReplyAsserted: true,
  failures,
};
console.log(JSON.stringify(result, null, 2));
process.exitCode = failures.length ? 1 : 0;
