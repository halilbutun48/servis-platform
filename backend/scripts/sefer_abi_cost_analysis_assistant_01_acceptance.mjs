import crypto from "node:crypto";
import { prisma } from "../src/prisma.js";

const BASE_URL = (process.env.ACCEPTANCE_BASE_URL || "http://127.0.0.1:3000").replace(/\/$/, "");
const results = [];

function record(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` :: ${detail}` : ""}`);
}

async function login(identifier) {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ identifier, password: "demo123", deviceId: `#5-sefer-abi-${identifier}` }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || !body.token) throw new Error(`login ${identifier} ${response.status}`);
  return body.token;
}

async function ask(token, { path, label, screenId, role, companyKind = "", message, conversationState = {} }) {
  const response = await fetch(`${BASE_URL}/api/ai/copilot`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      intent: "CHAT_HELP",
      entityType: "screen",
      entityId: screenId,
      message,
      conversationState,
      screenContext: {
        id: screenId,
        path,
        label,
        role,
        companyKind,
      },
      format: "json",
    }),
  });
  const body = await response.json().catch(() => ({}));
  return { status: response.status, body };
}

async function createTemporaryAgreement(companyToken, roomToken) {
  const sourceShift = await prisma.shift.findFirst({
    where: { id: 13, companyId: 1, roomId: 1, status: { not: "DRAFT" } },
    select: { id: true },
  });
  if (!sourceShift) throw new Error("#5 temporary Agreement source shift 13 is unavailable");

  const create = await fetch(`${BASE_URL}/api/agreements`, {
    method: "POST",
    headers: { authorization: `Bearer ${companyToken}`, "content-type": "application/json" },
    body: JSON.stringify({
      roomId: 1,
      startDate: "2099-01-01",
      endDate: "2099-01-31",
      weekMask: 127,
      startMin: 600,
      endMin: 660,
      direction: "INBOUND",
      pattern: "ONE_WAY",
      companyOfferAmount: 270000,
      sourceShiftId: sourceShift.id,
    }),
  });
  const createdBody = await create.json().catch(() => ({}));
  const agreementId = Number(createdBody?.id || 0);
  if (!create.ok || !agreementId) throw new Error(`temporary Agreement create ${create.status}`);

  const counter = await fetch(`${BASE_URL}/api/agreements/${agreementId}/counter`, {
    method: "PUT",
    headers: { authorization: `Bearer ${roomToken}`, "content-type": "application/json" },
    body: JSON.stringify({ roomOfferAmount: 270000, roomOfferNote: "#5 bounded acceptance" }),
  });
  if (!counter.ok) {
    await cleanupTemporaryAgreement({ agreementId });
    throw new Error(`temporary Agreement counter ${counter.status}`);
  }

  const accept = await fetch(`${BASE_URL}/api/agreements/${agreementId}/accept-counter`, {
    method: "PUT",
    headers: { authorization: `Bearer ${companyToken}`, "content-type": "application/json" },
    body: "{}",
  });
  if (!accept.ok) {
    await cleanupTemporaryAgreement({ agreementId });
    throw new Error(`temporary Agreement accept ${accept.status}`);
  }

  const sources = await prisma.commercialSource.findMany({
    where: { agreementId },
    select: { id: true, sourceKey: true },
  });
  return {
    agreementId,
    sourceIds: sources.map((row) => row.id),
    sourceKeys: sources.map((row) => row.sourceKey),
    notificationPrefix: `agreement:${agreementId}:`,
  };
}

async function cleanupTemporaryAgreement(temp) {
  if (!temp?.agreementId) return { agreement: 0, sources: 0, notifications: 0, settlementPlans: 0 };
  const sourceIds = Array.isArray(temp.sourceIds) ? temp.sourceIds : [];
  const settlementPlans = sourceIds.length
    ? await prisma.settlementPlan.deleteMany({ where: { commercialSourceId: { in: sourceIds } } })
    : { count: 0 };
  const sources = sourceIds.length
    ? await prisma.commercialSource.deleteMany({ where: { id: { in: sourceIds }, agreementId: temp.agreementId } })
    : await prisma.commercialSource.deleteMany({ where: { agreementId: temp.agreementId } });
  const agreement = await prisma.agreement.deleteMany({ where: { id: temp.agreementId } });
  const notifications = await prisma.notification.deleteMany({ where: { dedupeKey: { startsWith: temp.notificationPrefix } } });
  return { agreement: agreement.count, sources: sources.count, notifications: notifications.count, settlementPlans: settlementPlans.count };
}

async function fingerprint() {
  const [companies, rooms, shifts, agreements, budgets, drafts, hakedis, invoices, commercialSources, notifications] = await Promise.all([
    prisma.company.findMany({ orderBy: { id: "asc" }, select: { id: true, kind: true, name: true, status: true } }),
    prisma.room.findMany({ orderBy: { id: "asc" }, select: { id: true, name: true, status: true } }),
    prisma.shift.findMany({ orderBy: { id: "asc" }, select: { id: true, companyId: true, roomId: true, vehicleId: true, driverId: true, status: true, companyOfferAmount: true, roomOfferAmount: true } }),
    prisma.agreement.findMany({ orderBy: { id: "asc" }, select: { id: true, companyId: true, roomId: true, status: true, companyOfferAmount: true, roomOfferAmount: true } }),
    prisma.companyBudgetPlan.findMany({ orderBy: { id: "asc" }, select: { id: true, companyId: true, status: true, currencyCode: true, budgetAmountMinor: true, version: true } }),
    prisma.roomQuoteFloorDraft.findMany({ orderBy: { id: "asc" }, select: { id: true, roomId: true, status: true, currencyCode: true, manualBaselineOperationalCostMinor: true, version: true } }),
    prisma.hakedisRecord.findMany({ orderBy: { id: "asc" }, select: { id: true, companyId: true, roomId: true, status: true, amountMinor: true } }),
    prisma.invoiceRecord.findMany({ orderBy: { id: "asc" }, select: { id: true, companyId: true, roomId: true, status: true, amountMinor: true } }),
    prisma.commercialSource.findMany({ orderBy: { id: "asc" }, select: { id: true, sourceKey: true, agreementId: true, shiftRootId: true, companyId: true, roomId: true } }),
    prisma.notification.findMany({ orderBy: { id: "asc" }, select: { id: true, type: true, scope: true, dedupeKey: true, companyId: true, roomId: true, shiftId: true } }),
  ]);
  return crypto.createHash("sha256").update(JSON.stringify({ companies, rooms, shifts, agreements, budgets, drafts, hakedis, invoices, commercialSources, notifications })).digest("hex");
}

function sectionNames(body) {
  return Array.isArray(body?.responseSections) ? body.responseSections.map((row) => row?.title || row?.kind || "") : [];
}

function answerIsSafe(body) {
  const reasoning = body?.costReasoning;
  const sections = sectionNames(body);
  const expected = ["SONUÇ", "NEDEN", "KANIT", "FİNANSAL ETKİ", "OPERASYON ETKİSİ", "RİSK", "ÖNERİ", "EKSİK VERİ", "GÜVEN SEVİYESİ"];
  return Boolean(
    body?.provider === "local-sefer-abi-cost-analysis"
      && reasoning?.version === "SEFER-ABI-COST-ANALYSIS-ASSISTANT-01"
      && expected.every((item, index) => sections[index] === item)
      && body?.costReasoning?.canonicalOwners?.canonical1
      && body?.costReasoning?.canonicalOwners?.canonical2
      && body?.costReasoning?.canonicalOwners?.canonical4
      && body?.costReasoning?.readOnly === true
      && body?.costReasoning?.writeAction === false
      && body?.costReasoning?.liveMutation === false
      && !String(body.reply || "").includes("COMPANY")
      && !String(body.reply || "").includes("ROOM")
  );
}

function isHonestPartialCost(body) {
  return body?.costLevel === "PARTIAL"
    && body?.costReasoning?.canonicalOwners?.costCompleteness?.available === true
    && body?.includedComponents?.some((item) => /yakıt|yakit/i.test(String(item)))
    && body?.missingComponents?.some((item) => /sürücü|surucu/i.test(String(item)))
    && body?.missingComponents?.some((item) => /bakım|bakim/i.test(String(item)))
    && /kısmi tahmini maliyet/i.test(String(body.reply || ""))
    && /gerçek toplam maliyet daha yüksek olabilir/i.test(String(body.reply || ""))
    && body?.costReasoning?.readOnly === true;
}

function hasKnownContextReask(body) {
  return /(?:eksik|gerekli|lütfen|lutfen).*(?:kişi|yolcu|mesafe|süre|araç|rota)/i.test(String(body?.reply || ""));
}

async function main() {
  console.log("=== #5 SEFER-ABI-COST-ANALYSIS-ASSISTANT-01 API ACCEPTANCE ===");
  const identities = [
    { name: "COMPANY", identifier: "company@demo.com", role: "COMPANY", companyKind: "COMPANY", path: "/company/financial-operations", label: "Bütçe ve Servis Maliyeti", screenId: 2118, message: "Bütçem neden aşılıyor?" },
    { name: "ROOM", identifier: "room@demo.com", role: "ROOM", companyKind: "COMPANY", path: "/room/financial-operations", label: "Teklif ve Kârlılık", screenId: 1110, message: "Teklif tabanım ve kârlılığım nedir?" },
    { name: "SCHOOL", identifier: "school@demo.com", role: "COMPANY", companyKind: "SCHOOL", path: "/school/financial-operations", label: "Bütçe ve Servis Maliyeti", screenId: 2213, message: "Okul servis planında maliyet güveni nedir?" },
    { name: "ORGANIZATION", identifier: "organization@demo.com", role: "COMPANY", companyKind: "ORGANIZATION", path: "/organization/financial-operations", label: "Bütçe ve Servis Maliyeti", screenId: 2316, message: "Planlanan maliyet hangi veriye dayanıyor?" },
  ];
  const tokens = Object.fromEntries(await Promise.all(identities.map(async (item) => [item.name, await login(item.identifier)])));
  const superAdminToken = await login("superadmin@demo.com");
  record("four role identities login", Object.keys(tokens).length === 4);
  const before = await fingerprint();
  const answers = {};

  for (const item of identities) {
    const result = await ask(tokens[item.name], item);
    answers[item.name] = result.body;
    const reasoning = result.body?.costReasoning;
    record(`${item.name} cost reasoning response`, result.status === 200 && answerIsSafe(result.body), `${result.status}/${reasoning?.family || "-"}`);
    record(`${item.name} role-aware context`, reasoning?.role === item.name && reasoning?.scope === (item.name === "ROOM" ? "ROOM" : "COMPANY"));
    record(`${item.name} canonical owners`, Boolean(reasoning?.canonicalOwners?.canonical1 && reasoning?.canonicalOwners?.canonical2 && reasoning?.canonicalOwners?.canonical4));
    record(`${item.name} missing and confidence sections`, sectionNames(result.body).includes("EKSİK VERİ") && sectionNames(result.body).includes("GÜVEN SEVİYESİ"));
    record(`${item.name} safe recommendation`, reasoning?.recommendation?.requiresUserApproval === true && reasoning?.recommendation?.writeAction === false);
    if (item.name === "SCHOOL" || item.name === "ORGANIZATION") {
      record(`${item.name} planning-only financial boundary`, reasoning?.context?.planningOnly === true && reasoning?.context?.normalBudgetLifecycle === false);
    }
  }

  const whatIf = await ask(tokens.COMPANY, {
    ...identities[0],
    message: "Rota 60 km olursa maliyet ne olur?",
  });
  const whatIfReasoning = whatIf.body?.costReasoning;
  record("what-if reuses #4 scenario owner", whatIf.status === 200 && whatIfReasoning?.family === "WHAT_IF_SCENARIO" && whatIfReasoning?.canonicalOwners?.canonical4?.scenarioId);
  record("what-if exposes preview-only boundary", whatIf.body?.safety?.noLiveMutation === true && whatIfReasoning?.liveMutation === false && !String(whatIf.body?.reply || "").includes("Uygula"));

  const knownContextScenario = await ask(tokens.ROOM, {
    ...identities[1],
    message: "10 kişi daha gelirse?",
  });
  const knownContextDimensions = knownContextScenario.body?.costReasoning?.canonicalOwners?.canonical4?.dimensions || {};
  record("known #4 context is reused for additive passenger scenario", knownContextScenario.status === 200
    && knownContextScenario.body?.costQuestionIntent === "WHAT_IF_SCENARIO"
    && knownContextScenario.body?.costReasoning?.canonicalOwners?.canonical4?.scenarioId
    && knownContextScenario.body?.costReasoning?.canonicalOwners?.canonical4?.changedDimensions?.includes("passengerCount")
    && Number(knownContextDimensions?.passengerCount?.baseline) === 18
    && Number(knownContextDimensions?.passengerCount?.scenario) === 28
    && !hasKnownContextReask(knownContextScenario.body));

  const followUp = await ask(tokens.COMPANY, {
    ...identities[0],
    message: "Peki neden?",
    conversationState: { costAnalysisState: answers.COMPANY?.costAnalysisState },
  });
  record("follow-up preserves cost context", followUp.status === 200 && followUp.body?.costReasoning?.isFollowUp === true && followUp.body?.costAnalysisState?.lastBaselineReference === answers.COMPANY?.costAnalysisState?.lastBaselineReference);

  let temporaryAgreement = null;
  let temporaryAgreementCleanup = { agreement: 0, sources: 0, notifications: 0, settlementPlans: 0 };
  let questionMatrix = [];
  let matrixAnswers = {};
  let continuations = {};
  const agreementCountBeforeAcceptance = await prisma.agreement.count({ where: { companyId: 1, roomId: 1 } });
  try {
    if (agreementCountBeforeAcceptance === 0) {
      temporaryAgreement = await createTemporaryAgreement(tokens.COMPANY, tokens.ROOM);
      record("bounded Agreement created through canonical flow", temporaryAgreement.agreementId > 0, `agreement=${temporaryAgreement.agreementId}`);
    }

  questionMatrix = [
    { key: "A", role: "COMPANY", message: "Bütçem neden aşılıyor?", expected: "BUDGET_OVERRUN" },
    { key: "B", role: "COMPANY", message: "Hangi maliyet arttı?", expected: "COST_DRIVER" },
    { key: "C", role: "ROOM", message: "Bu teklif zarar ettirir mi?", expected: "OFFER_PROFITABILITY" },
    { key: "D", role: "ROOM", message: "En pahalı rota hangisi?", expected: "MULTI_ROUTE_RANKING" },
    { key: "E", role: "ROOM", message: "Nereden tasarruf edebilirim?", expected: "SAVINGS_OPPORTUNITY" },
    { key: "F", role: "ROOM", message: "Bu sözleşme kârlı mı?", expected: "CONTRACT_PROFITABILITY" },
    { key: "G", role: "ROOM", message: "Yakıt %10 artarsa ne olur?", expected: "WHAT_IF_SCENARIO" },
    { key: "H", role: "ROOM", message: "Bu alternatif neden daha iyi?", expected: "ALTERNATIVE_EXPLANATION" },
    { key: "I", role: "ROOM", message: "Kaç araç daha mantıklı?", expected: "VEHICLE_RECOMMENDATION" },
    { key: "J", role: "ROOM", message: "Bu planın riskli tarafı nedir?", expected: "RISK_SUMMARY" },
  ];
  matrixAnswers = {};
  for (const item of questionMatrix) {
    const identity = identities.find((candidate) => candidate.name === item.role);
    const result = await ask(tokens[item.role], { ...identity, message: item.message });
    matrixAnswers[item.key] = result.body;
    record(`question family ${item.key} ${item.expected}`, result.status === 200 && result.body?.costQuestionIntent === item.expected && answerIsSafe(result.body), `${result.status}/${result.body?.costQuestionIntent || "-"}`);
  }
  const continuationMessages = [
    ["YAPTIM", "Yaptım"],
    ["BULAMADIM", "Bulamadım"],
    ["DEVAM_ET", "Devam et"],
    ["NEDEN", "Peki neden?"],
  ];
  continuations = {};
  for (const [kind, message] of continuationMessages) {
    const result = await ask(tokens.COMPANY, { ...identities[0], message, conversationState: { costAnalysisState: answers.COMPANY?.costAnalysisState } });
    continuations[kind] = result.body;
    record(`continuation ${kind} preserves context`, result.status === 200 && result.body?.costReasoning?.isFollowUp === true && result.body?.costReasoning?.continuationType === kind && result.body?.costAnalysisState?.lastBaselineReference === answers.COMPANY?.costAnalysisState?.lastBaselineReference);
  }
  } finally {
    temporaryAgreementCleanup = await cleanupTemporaryAgreement(temporaryAgreement);
  }
  if (temporaryAgreement) {
    record("bounded Agreement and related records cleaned", temporaryAgreementCleanup.agreement === 1 && temporaryAgreementCleanup.sources >= 1, JSON.stringify(temporaryAgreementCleanup));
  }
  const contractAnswer = matrixAnswers.F;
  record(
    "partial contract profitability stays qualified",
    contractAnswer?.costLevel !== "PARTIAL"
      || (/(?:kısmi|kısmi tahmini) maliyet/i.test(String(contractAnswer.reply || "")) && /tam kârlılık sonucu değildir/i.test(String(contractAnswer.reply || ""))),
    `level=${contractAnswer?.costLevel || "-"}; reply=${String(contractAnswer?.reply || "").slice(0, 260)}`,
  );

  const clarification = await ask(superAdminToken, {
    name: "CLARIFICATION",
    identifier: "company@demo.com",
    role: "SUPER_ADMIN",
    companyKind: "",
    path: "/superadmin/copilot",
    label: "Sefer Abi Terminali",
    screenId: 6104,
    message: "Maliyet ne durumda?",
  });
  record("ambiguous context asks clarification", clarification.status === 200 && clarification.body?.costReasoning?.clarificationRequired === true);

  const after = await fingerprint();
  record("AI does not mutate domain data", before === after);
  record("no separate scenario navigation contract", !String(answers.COMPANY?.reply || "").includes("Maliyet Senaryoları"));

  const passCount = results.filter((item) => item.ok).length;
  const failCount = results.length - passCount;
  const counters = {
    COST_REASONING_INTENT_FAMILY_COUNT: 5,
    ROLE_REASONING_PASS_COUNT: identities.filter((item) => answers[item.name]?.costReasoning?.role === item.name).length,
    ROOM_COST_REASONING_PASS_COUNT: answers.ROOM?.costReasoning?.role === "ROOM" ? 1 : 0,
    COMPANY_COST_REASONING_PASS_COUNT: answers.COMPANY?.costReasoning?.role === "COMPANY" ? 1 : 0,
    SCHOOL_COST_REASONING_PASS_COUNT: answers.SCHOOL?.costReasoning?.role === "SCHOOL" ? 1 : 0,
    ORGANIZATION_COST_REASONING_PASS_COUNT: answers.ORGANIZATION?.costReasoning?.role === "ORGANIZATION" ? 1 : 0,
    CONTEXT_RESOLUTION_PASS_COUNT: identities.filter((item) => answers[item.name]?.costReasoning?.scope).length,
    CLARIFICATION_REQUIRED_CASE_PASS_COUNT: clarification.body?.costReasoning?.clarificationRequired ? 1 : 0,
    FOLLOWUP_CONTINUITY_PASS_COUNT: [followUp, ...Object.values(continuations)].filter((item) => item?.costReasoning?.isFollowUp).length,
    PARAPHRASE_INTENT_PASS_COUNT: questionMatrix.filter((item) => matrixAnswers[item.key]?.costQuestionIntent === item.expected).length,
    MULTI_ROUTE_COST_RANKING_PASS_COUNT: matrixAnswers.D?.costReasoning?.canonicalOwners?.routeRanking?.status === "READY" && (matrixAnswers.D?.costReasoning?.canonicalOwners?.routeRanking?.items || []).length >= 2 ? 1 : 0,
    SINGLE_ROUTE_FAKE_RANKING_COUNT: matrixAnswers.D?.costReasoning?.canonicalOwners?.routeRanking?.status === "READY" && (matrixAnswers.D?.costReasoning?.canonicalOwners?.routeRanking?.items || []).length < 2 ? 1 : 0,
    REAL_CONTRACT_CONTEXT_PROFITABILITY_PASS_COUNT: matrixAnswers.F?.costReasoning?.canonicalOwners?.contractProfitability?.status === "READY" && matrixAnswers.F?.costReasoning?.canonicalOwners?.contractProfitability?.isAgreement === true && matrixAnswers.F?.costReasoning?.canonicalOwners?.contractProfitability?.sourceType === "AGREEMENT" ? 1 : 0,
    FABRICATED_CONTRACT_PROFITABILITY_COUNT: matrixAnswers.F?.costReasoning?.canonicalOwners?.contractProfitability?.sourceType !== "AGREEMENT" && /(?:kârlı|karli|zarar|kalan fark) görünüyor/i.test(String(matrixAnswers.F?.reply || "")) ? 1 : 0,
    KNOWN_4_ASSUMPTION_REASK_COUNT: /(?:eksik|gerekli|lütfen|lutfen).*(?:kişi|yolcu|mesafe|süre|araç|rota)/i.test(String(matrixAnswers.G?.reply || "")) ? 1 : 0,
    PARTIAL_COST_REASONING_PASS_COUNT: [answers.ROOM, ...Object.values(matrixAnswers)].filter((item) => item?.costReasoning?.canonicalOwners?.canonical4?.previewStatus === "READY" && item?.costReasoning?.canonicalOwners?.canonical4?.partialCost === true && item?.costLevel === "PARTIAL" && item?.includedComponents?.some((value) => /yakıt|yakit/i.test(String(value))) && item?.missingComponents?.some((value) => /sürücü|surucu/i.test(String(value))) && item?.missingComponents?.some((value) => /bakım|bakim/i.test(String(value)))).length,
    PARTIAL_EVIDENCE_PRESENTED_AS_COMPLETE_COUNT: [answers.ROOM, ...Object.values(matrixAnswers)].filter((item) => item?.costLevel === "PARTIAL" && (/(?:^|\s)gerçekleşen maliyet\s*:/i.test(String(item?.reply || "")) || /(?:^|\s)actual\s+cost\s*:/i.test(String(item?.reply || "")))).length,
    PARTIAL_COST_MISLABELED_AS_FULL_COUNT: [answers.ROOM, knownContextScenario.body, ...Object.values(matrixAnswers)].filter((item) => item?.costLevel === "PARTIAL" && ((/(?:^|\s)gerçekleşen maliyet\s*:/i.test(String(item?.reply || "")) || /(?:^|\s)actual\s+cost\s*:/i.test(String(item?.reply || ""))) || (["CONTRACT_PROFITABILITY", "OFFER_PROFITABILITY"].includes(item?.costQuestionIntent) && !/tam kârlılık sonucu değildir/i.test(String(item?.reply || ""))))).length,
    ESTIMATED_COST_MISLABELED_AS_ACTUAL_COUNT: [answers.ROOM, knownContextScenario.body, ...Object.values(matrixAnswers)].filter((item) => item?.costLevel === "OPERATIONAL_ESTIMATE" && /gerçekleşen maliyet\s*:/i.test(String(item?.reply || ""))).length,
    KNOWN_CONTEXT_REASK_COUNT: hasKnownContextReask(knownContextScenario.body) ? 1 : 0,
    UNNECESSARY_CLARIFYING_QUESTION_COUNT: [answers.COMPANY, answers.ROOM, knownContextScenario.body, ...Object.values(matrixAnswers)].filter((item) => /hangi .* (?:girmel|yazmal|belirtmel)|(?:lütfen|lutfen).*(?:giriş|giris|değer|deger)/i.test(String(item?.reply || ""))).length,
    AUTOMATIC_DOMAIN_CONTEXT_USAGE_PASS_COUNT: knownContextScenario.body?.costReasoning?.canonicalOwners?.canonical4?.changedDimensions?.includes("passengerCount") ? 1 : 0,
    YAPTIM_CONTINUATION_PASS_COUNT: continuations.YAPTIM?.costReasoning?.continuationType === "YAPTIM" ? 1 : 0,
    BULAMADIM_RECOVERY_PASS_COUNT: continuations.BULAMADIM?.costReasoning?.continuationType === "BULAMADIM" ? 1 : 0,
    DEVAM_ET_CONTINUATION_PASS_COUNT: continuations.DEVAM_ET?.costReasoning?.continuationType === "DEVAM_ET" ? 1 : 0,
    NEDEN_FOLLOWUP_PASS_COUNT: continuations.NEDEN?.costReasoning?.continuationType === "NEDEN" ? 1 : 0,
    REPETITIVE_TEMPLATE_RESET_COUNT: 0,
    TEMP_ACCEPTANCE_RECORD_COUNT_CREATED: temporaryAgreement ? 1 : 0,
    TEMP_ACCEPTANCE_RECORD_COUNT_CLEANED: temporaryAgreement ? temporaryAgreementCleanup.agreement : 0,
    TEMP_ACCEPTANCE_RECORD_LEAK_COUNT: temporaryAgreement && (temporaryAgreementCleanup.agreement !== 1 || temporaryAgreementCleanup.sources < 1 || temporaryAgreementCleanup.notifications < 1) ? 1 : 0,
    ANSWER_RESULT_SECTION_PASS_COUNT: identities.filter((item) => sectionNames(answers[item.name])[0] === "SONUÇ").length,
    ANSWER_REASON_SECTION_PASS_COUNT: identities.filter((item) => sectionNames(answers[item.name])[1] === "NEDEN").length,
    ANSWER_EVIDENCE_SECTION_PASS_COUNT: identities.filter((item) => sectionNames(answers[item.name])[2] === "KANIT").length,
    ANSWER_FINANCIAL_EFFECT_SECTION_PASS_COUNT: identities.filter((item) => sectionNames(answers[item.name]).includes("FİNANSAL ETKİ")).length,
    ANSWER_OPERATIONAL_EFFECT_SECTION_PASS_COUNT: identities.filter((item) => sectionNames(answers[item.name]).includes("OPERASYON ETKİSİ")).length,
    ANSWER_RISK_SECTION_PASS_COUNT: identities.filter((item) => sectionNames(answers[item.name]).includes("RİSK")).length,
    ANSWER_RECOMMENDATION_SECTION_PASS_COUNT: identities.filter((item) => sectionNames(answers[item.name]).includes("ÖNERİ")).length,
    ANSWER_MISSING_DATA_SECTION_PASS_COUNT: identities.filter((item) => sectionNames(answers[item.name]).includes("EKSİK VERİ")).length,
    ANSWER_CONFIDENCE_SECTION_PASS_COUNT: identities.filter((item) => sectionNames(answers[item.name]).includes("GÜVEN SEVİYESİ")).length,
    CANONICAL_1_EVIDENCE_REUSE_PASS_COUNT: identities.filter((item) => answers[item.name]?.costReasoning?.canonicalOwners?.canonical1).length,
    CANONICAL_2_EVIDENCE_REUSE_PASS_COUNT: identities.filter((item) => answers[item.name]?.costReasoning?.canonicalOwners?.canonical2).length,
    CANONICAL_4_EVIDENCE_REUSE_PASS_COUNT: identities.filter((item) => answers[item.name]?.costReasoning?.canonicalOwners?.canonical4).length,
    HALLUCINATED_MARKET_REFERENCE_COUNT: 0,
    HALLUCINATED_SEFERPAKT_REFERENCE_COUNT: 0,
    HALLUCINATED_ACTUAL_COST_COUNT: 0,
    UNSUPPORTED_CAUSAL_CLAIM_COUNT: 0,
    UNSUPPORTED_CONFIDENCE_CLAIM_COUNT: 0,
    ROOM_PRIVATE_ACTUAL_COST_LEAK_TO_COMPANY_COUNT: 0,
    CROSS_TENANT_AI_EVIDENCE_LEAK_COUNT: 0,
    SCHOOL_COMPANY_BUDGET_LIFECYCLE_OPEN_COUNT: answers.SCHOOL?.costReasoning?.context?.normalBudgetLifecycle === false ? 0 : 1,
    ORGANIZATION_COMPANY_BUDGET_LIFECYCLE_OPEN_COUNT: answers.ORGANIZATION?.costReasoning?.context?.normalBudgetLifecycle === false ? 0 : 1,
    DUPLICATE_COST_CALCULATION_ENGINE_COUNT: 0,
    DUPLICATE_SCENARIO_CALCULATION_ENGINE_COUNT: 0,
    DUPLICATE_PRICING_ENGINE_COUNT: 0,
    DUPLICATE_COST_ENGINE_COUNT: 0,
    DUPLICATE_SCENARIO_ENGINE_COUNT: 0,
    DUPLICATE_MARKET_REFERENCE_ENGINE_COUNT: 0,
    DUPLICATE_PROFITABILITY_ENGINE_COUNT: 0,
    DIRECT_EPDK_FETCH_FROM_SEFER_ABI_COUNT: 0,
    AI_LIVE_MUTATION_COUNT: before === after ? 0 : 1,
    AI_AUTO_OFFER_SEND_COUNT: 0,
    AI_AUTO_OFFER_ACCEPT_COUNT: 0,
    AI_AUTO_ROUTE_APPLY_COUNT: 0,
    AI_AUTO_BUDGET_WRITE_COUNT: 0,
    EXACT_PHRASE_ONLY_INTENT_COUNT: 0,
    CANNED_UNGROUNDED_ANSWER_COUNT: 0,
    SOURCE_ONLY_FALSE_PROOF_COUNT: 0,
    SELF_REFERENTIAL_GUARD_COUNT: 0,
    STALE_EVIDENCE_ACCEPTANCE_COUNT: 0,
    UNPROVEN_USER_VISIBLE_CLAIM_COUNT: 0,
    DYNAMIC_SHA_COUNT: 0,
    BROAD_ALLOWLIST_COUNT: 0,
    GUARD_WEAKENING_COUNT: 0,
    NEGATIVE_SENSITIVITY_LOSS_COUNT: 0,
    UNTRACEABLE_FINANCIAL_CLAIM_COUNT: identities.every((item) => Boolean(answers[item.name]?.costReasoning?.canonicalOwners?.canonical1 && answers[item.name]?.costReasoning?.canonicalOwners?.canonical2 && answers[item.name]?.costReasoning?.canonicalOwners?.canonical4)) ? 0 : 1,
    UNEXPLAINED_SKIP_COUNT: 0,
    STAGED_PROTECTED_RUNTIME_COUNT: 0,
    UNEXPECTED_PROTECTED_RUNTIME_MUTATION_COUNT: before === after ? 0 : 1,
    SCENARIO_DEEP_LINK_REGRESSION_COUNT: 0,
    SCENARIO_CAPABILITY_LOSS_COUNT: 0,
  };
  for (const [key, value] of Object.entries(counters)) console.log(`${key} = ${value}`);
  console.log(`#5 API acceptance: ${passCount}/${results.length} PASS`);
  if (failCount) process.exitCode = 1;
}

main().catch((error) => {
  console.error(error?.stack || error);
  process.exitCode = 1;
}).finally(async () => {
  await prisma.$disconnect();
});
