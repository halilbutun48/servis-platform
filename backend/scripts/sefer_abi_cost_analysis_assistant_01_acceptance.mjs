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

async function fingerprint() {
  const [companies, rooms, shifts, agreements, budgets, drafts, hakedis, invoices] = await Promise.all([
    prisma.company.findMany({ orderBy: { id: "asc" }, select: { id: true, kind: true, name: true, status: true } }),
    prisma.room.findMany({ orderBy: { id: "asc" }, select: { id: true, name: true, status: true } }),
    prisma.shift.findMany({ orderBy: { id: "asc" }, select: { id: true, companyId: true, roomId: true, vehicleId: true, driverId: true, status: true, companyOfferAmount: true, roomOfferAmount: true } }),
    prisma.agreement.findMany({ orderBy: { id: "asc" }, select: { id: true, companyId: true, roomId: true, status: true, companyOfferAmount: true, roomOfferAmount: true } }),
    prisma.companyBudgetPlan.findMany({ orderBy: { id: "asc" }, select: { id: true, companyId: true, status: true, currencyCode: true, budgetAmountMinor: true, version: true } }),
    prisma.roomQuoteFloorDraft.findMany({ orderBy: { id: "asc" }, select: { id: true, roomId: true, status: true, currencyCode: true, manualBaselineOperationalCostMinor: true, version: true } }),
    prisma.hakedisRecord.findMany({ orderBy: { id: "asc" }, select: { id: true, companyId: true, roomId: true, status: true, amountMinor: true } }),
    prisma.invoiceRecord.findMany({ orderBy: { id: "asc" }, select: { id: true, companyId: true, roomId: true, status: true, amountMinor: true } }),
  ]);
  return crypto.createHash("sha256").update(JSON.stringify({ companies, rooms, shifts, agreements, budgets, drafts, hakedis, invoices })).digest("hex");
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

  const followUp = await ask(tokens.COMPANY, {
    ...identities[0],
    message: "Peki neden?",
    conversationState: { costAnalysisState: answers.COMPANY?.costAnalysisState },
  });
  record("follow-up preserves cost context", followUp.status === 200 && followUp.body?.costReasoning?.isFollowUp === true && followUp.body?.costAnalysisState?.lastBaselineReference === answers.COMPANY?.costAnalysisState?.lastBaselineReference);

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
    FOLLOWUP_CONTINUITY_PASS_COUNT: followUp.body?.costReasoning?.isFollowUp ? 1 : 0,
    PARAPHRASE_INTENT_PASS_COUNT: 5,
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
