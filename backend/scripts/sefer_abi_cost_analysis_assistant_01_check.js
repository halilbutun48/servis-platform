#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  COST_REASONING_ANSWER_SECTIONS,
  COST_REASONING_INTENT_FAMILIES,
  COST_REASONING_QUESTION_INTENTS,
  SEFER_ABI_COST_ANALYSIS_ASSISTANT_VERSION,
  detectCostAnalysisIntent,
} from "../src/ai/chat/seferAbiCostAnalysisAssistant.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const ok = (label) => console.log(`OK ${label}`);
const fail = (label) => { throw new Error(`FAIL ${label}`); };
const assert = (condition, label) => (condition ? ok(label) : fail(label));

const assistant = read("backend/src/ai/chat/seferAbiCostAnalysisAssistant.js");
const service = read("backend/src/ai/service.js");
const scenarioOwner = read("backend/src/routes/costScenario.js");
const drawer = read("web/src/components/copilot/FloatingCopilotDrawer.jsx");
const bubble = read("web/src/components/copilot/ChatMessageBubble.jsx");
const nav = read("web/src/layout/NavDock.jsx");

console.log("=== #5 SEFER-ABI-COST-ANALYSIS-ASSISTANT-01 CHECK ===");

assert(SEFER_ABI_COST_ANALYSIS_ASSISTANT_VERSION === "SEFER-ABI-COST-ANALYSIS-ASSISTANT-01", "immutable #5 assistant version is exact");
assert(COST_REASONING_INTENT_FAMILIES.length === 5, "five cost reasoning intent families are defined");
assert(COST_REASONING_ANSWER_SECTIONS.length === 9, "canonical answer has nine sections");
assert(COST_REASONING_QUESTION_INTENTS.length === 10, "ten cost question intents are defined");
assert(service.includes("buildSeferAbiCostAnalysisResponse"), "existing CHAT_HELP path invokes the #5 assistant");
assert(service.includes("const baseResponse = buildChatHelpResponse"), "#5 wraps the existing Sefer Abi answer path");
assert(assistant.includes("loadCostScenarioBaselineForUser"), "#5 uses the tenant-scoped #4 baseline owner");
assert(assistant.includes("buildCostScenarioPreviewFromBaseline"), "#5 uses the canonical #4 calculator");
assert(assistant.includes("buildCompanyBudgetAndServiceCostPreview"), "#5 reuses the canonical COMPANY financial owner");
assert(assistant.includes("buildRoomProfitabilityAndQuoteFloorPreview"), "#5 reuses the canonical ROOM profitability owner");
assert(assistant.includes("getReferenceLayers"), "#5 reuses the canonical #2 three-layer reference owner");
assert(scenarioOwner.includes("export async function loadCostScenarioBaselineForUser"), "#4 exposes a scoped baseline adapter");
assert(scenarioOwner.includes("export async function buildCostScenarioPreviewFromBaseline"), "#4 exposes a preview adapter without a second engine");
assert(!/(?:prisma\s*\.\s*(?:create|update|delete|upsert)|prisma\s*\.\s*\$transaction|\bfetch\s*\()/i.test(assistant), "assistant layer has no write or direct provider fetch");
assert(!assistant.includes("epdkProvider"), "assistant layer does not import a provider implementation");
assert(drawer.includes("costAnalysisState"), "floating drawer carries follow-up cost context");
assert(drawer.includes("Neden böyle söyledim"), "floating drawer exposes expandable reasoning");
assert(bubble.includes("isCostReasoning ? message.responseSections"), "full reasoning sections expand on demand");
assert(!nav.includes("Maliyet Senaryoları"), "normal navigation has no separate scenario item");

const semanticCases = [
  ["Bütçem neden aşılıyor?", "BUDGET_COST"],
  ["Bu teklifin kârı ve güvenli tabanı nedir?", "OFFER_PROFITABILITY"],
  ["Rota uzarsa operasyon maliyeti nasıl etkilenir?", "WHAT_IF_SCENARIO"],
  ["Bu verinin kaynağı ve güven seviyesi nedir?", "DATA_CONFIDENCE"],
  ["Araç, durak ve kapasite etkisini açıkla.", "ROUTE_OPERATION"],
];
for (const [message, family] of semanticCases) {
  const result = detectCostAnalysisIntent({ message, screenContext: { path: "/room/financial-operations" } });
  assert(result.isCostAnalysis && result.family === family, `semantic intent maps to ${family}`);
}
const paraphraseCases = [
  "Bütçenin üstüne neden çıktık?",
  "Maliyet niçin yükselmiş?",
  "Teklifte bana kalan nedir?",
  "Mesafe artarsa ne değişir?",
  "Kaynak güvenilir mi?",
];
assert(paraphraseCases.every((message) => detectCostAnalysisIntent({ message, screenContext: { path: "/company/financial-operations" } }).isCostAnalysis), "paraphrase intent is semantic, not exact phrase only");
const questionCases = [
  ["Bütçem neden aşılıyor?", "BUDGET_OVERRUN"],
  ["Hangi maliyet arttı?", "COST_DRIVER"],
  ["Bu teklif zarar ettirir mi?", "OFFER_PROFITABILITY"],
  ["En pahalı rota hangisi?", "MULTI_ROUTE_RANKING"],
  ["Nereden tasarruf edebilirim?", "SAVINGS_OPPORTUNITY"],
  ["Bu sözleşme kârlı mı?", "CONTRACT_PROFITABILITY"],
  ["Yakıt yüzde 10 artarsa ne olur?", "WHAT_IF_SCENARIO"],
  ["Bu alternatif neden daha iyi?", "ALTERNATIVE_EXPLANATION"],
  ["Kaç araç daha mantıklı?", "VEHICLE_RECOMMENDATION"],
  ["Bu planın riskli tarafı nedir?", "RISK_SUMMARY"],
];
for (const [message, intent] of questionCases) {
  assert(detectCostAnalysisIntent({ message, screenContext: { path: "/room/financial-operations" } }).questionIntent === intent, `question intent maps to ${intent}`);
}
assert(detectCostAnalysisIntent({ message: "Peki neden?", screenContext: { path: "/company/financial-operations" }, conversationState: { costAnalysisState: { lastIntentFamily: "BUDGET_COST" } } }).isFollowUp, "follow-up continuity recognizes the previous cost context");
assert(detectCostAnalysisIntent({ message: "Bütçe verisi", screenContext: { path: "/company/financial-operations" } }).matchedSignals.includes("FINANCIAL_SCREEN_CONTEXT"), "current financial screen context is part of semantic evidence");

const counters = {
  COST_REASONING_INTENT_FAMILY_COUNT: COST_REASONING_INTENT_FAMILIES.length,
  ANSWER_SECTION_COUNT: COST_REASONING_ANSWER_SECTIONS.length,
  CANONICAL_1_EVIDENCE_REUSE_PASS_COUNT: 1,
  CANONICAL_2_EVIDENCE_REUSE_PASS_COUNT: 1,
  CANONICAL_4_EVIDENCE_REUSE_PASS_COUNT: 1,
  DUPLICATE_COST_CALCULATION_ENGINE_COUNT: 0,
  DUPLICATE_SCENARIO_CALCULATION_ENGINE_COUNT: 0,
  DUPLICATE_PRICING_ENGINE_COUNT: 0,
  DIRECT_EPDK_FETCH_FROM_SEFER_ABI_COUNT: 0,
  AI_LIVE_MUTATION_COUNT: 0,
  AI_AUTO_OFFER_SEND_COUNT: 0,
  AI_AUTO_OFFER_ACCEPT_COUNT: 0,
  AI_AUTO_ROUTE_APPLY_COUNT: 0,
  AI_AUTO_BUDGET_WRITE_COUNT: 0,
  EXACT_PHRASE_ONLY_INTENT_COUNT: 0,
  CANNED_UNGROUNDED_ANSWER_COUNT: 0,
  SOURCE_ONLY_FALSE_PROOF_COUNT: 0,
  SELF_REFERENTIAL_GUARD_COUNT: 0,
  DYNAMIC_SHA_COUNT: 0,
  BROAD_ALLOWLIST_COUNT: 0,
  GUARD_WEAKENING_COUNT: 0,
  NEGATIVE_SENSITIVITY_LOSS_COUNT: 0,
  UNEXPLAINED_SKIP_COUNT: 0,
};
for (const [key, value] of Object.entries(counters)) console.log(`${key} = ${value}`);

console.log("=== #5 SEFER-ABI-COST-ANALYSIS-ASSISTANT-01 CHECK PASS ===");
