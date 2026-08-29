import { prisma } from "../../prisma.js";
import {
  buildCompanyBudgetAndServiceCostPreview,
} from "../../finance/companyBudgetAndServiceCost.js";
import {
  buildRoomProfitabilityAndQuoteFloorPreview,
} from "../../finance/roomProfitabilityAndQuoteFloor.js";
import {
  buildRoomQuoteFloorDraftPreviewInputs,
  getCurrentRoomQuoteFloorDraft,
} from "../../services/financialOperationsLifecycle.js";
import { getReferenceLayers } from "../../externalCost/externalCostReferenceService.js";
import {
  buildCostScenarioPreviewFromBaseline,
  loadCostScenarioBaselineForUser,
} from "../../routes/costScenario.js";

export const SEFER_ABI_COST_ANALYSIS_ASSISTANT_VERSION = "SEFER-ABI-COST-ANALYSIS-ASSISTANT-01";

export const COST_REASONING_INTENT_FAMILIES = Object.freeze([
  "BUDGET_COST",
  "OFFER_PROFITABILITY",
  "ROUTE_OPERATION",
  "WHAT_IF_SCENARIO",
  "DATA_CONFIDENCE",
]);

export const COST_REASONING_ANSWER_SECTIONS = Object.freeze([
  "SONUÇ",
  "NEDEN",
  "KANIT",
  "FİNANSAL ETKİ",
  "OPERASYON ETKİSİ",
  "RİSK",
  "ÖNERİ",
  "EKSİK VERİ",
  "GÜVEN SEVİYESİ",
]);

const FINANCIAL_PATH_PATTERN = /(?:\/|^)(?:room|company|school|organization)\/financial-operations\b/i;
const FOLLOW_UP_PATTERN = /^(?:peki|neden|nasıl|nasil|bunu aç|bunu ac|devam|aynı|ayni|bu durumda|hangi veri|ne öner|ne oner|detay|açıkla|acikla)\b/i;

function normalizeText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/İ/g, "i")
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("tr-TR");
}

function upper(value) {
  return String(value || "").trim().toUpperCase();
}

function unique(values) {
  return [...new Set((Array.isArray(values) ? values : []).map((value) => String(value || "").trim()).filter(Boolean))];
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function integer(value) {
  const number = finiteNumber(value);
  return number === null ? null : Math.trunc(number);
}

function formatMoneyMinor(value, currencyCode = "TRY") {
  const amount = integer(value);
  if (amount === null) return "";
  try {
    return (amount / 100).toLocaleString("tr-TR", {
      style: "currency",
      currency: String(currencyCode || "TRY").toUpperCase(),
      maximumFractionDigits: 2,
    });
  } catch {
    return `${(amount / 100).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} ${String(currencyCode || "TRY").toUpperCase()}`;
  }
}

function formatNumber(value, maximumFractionDigits = 2) {
  const number = finiteNumber(value);
  if (number === null) return "";
  return number.toLocaleString("tr-TR", { maximumFractionDigits });
}

async function roleKeyForUser(user = {}) {
  const role = upper(user?.role);
  let kind = upper(user?.companyKind || user?.companyType);
  if (!kind && role === "COMPANY" && user?.companyId) {
    const company = await prisma.company.findUnique({
      where: { id: Number(user.companyId) },
      select: { kind: true },
    });
    kind = upper(company?.kind);
  }
  if (role === "COMPANY" && kind === "SCHOOL") return "SCHOOL";
  if (role === "COMPANY" && kind === "ORGANIZATION") return "ORGANIZATION";
  return role || "DEFAULT";
}

function visibleRoleLabel(roleKey) {
  return {
    COMPANY: "Hizmet Alan Firma",
    ROOM: "Taşımacılık Firması",
    SCHOOL: "Okul",
    ORGANIZATION: "Organizasyon",
    SUPER_ADMIN: "Süper Yönetici",
  }[roleKey] || "kendi çalışma alanın";
}

function scopeForRole(roleKey, screenPath = "") {
  if (roleKey === "ROOM" || /\/room\//i.test(String(screenPath || ""))) return "ROOM";
  if (["COMPANY", "SCHOOL", "ORGANIZATION"].includes(roleKey) || /\/(?:company|school|organization)\//i.test(String(screenPath || ""))) return "COMPANY";
  return "";
}

function contextText(screenContext, conversationState) {
  return normalizeText([
    screenContext?.path,
    screenContext?.label,
    screenContext?.helpContextSummary,
    screenContext?.contextSummary,
    screenContext?.selectedSummary,
    screenContext?.selectedRecordSummary,
    screenContext?.selectedRecordStatus,
    conversationState?.lastScreenPath,
    conversationState?.lastScreenLabel,
    conversationState?.costAnalysisState?.lastScreenPath,
  ].filter(Boolean).join(" "));
}

function isFollowUpMessage(message, conversationState) {
  const previous = conversationState?.costAnalysisState || conversationState?.costReasoning || null;
  return Boolean(previous?.lastIntentFamily && FOLLOW_UP_PATTERN.test(String(message || "").trim()));
}

function familyFromText(text) {
  if (/(?:teklif|kâr|kar|kârlılık|karlilik|marj|fiyat|teklif tabanı|teklif tabani|minimum fiyat)/.test(text)) return "OFFER_PROFITABILITY";
  if (/(?:senaryo|varsay|olursa|uzarsa|artarsa|azalırsa|azalirsa|değiştir|degistir|artır|artir|azalt|eklersem|çıkarırsam|cikarsam|what if)/.test(text)) return "WHAT_IF_SCENARIO";
  if (/(?:rota|mesafe|durak|araç|arac|sürücü|surucu|operasyon|sefer|süre|sure|gecik|kapasite)/.test(text)) return "ROUTE_OPERATION";
  if (/(?:bütçe|butce|maliyet|masraf|harcama|servis maliyeti|maliyet neden|maliyetim)/.test(text)) return "BUDGET_COST";
  if (/(?:kaynak|kanıt|kanit|veri|güven|guven|güncel|guncel|referans|piyasa|gerçek|gercek|tazelik)/.test(text)) return "DATA_CONFIDENCE";
  return "";
}

export function detectCostAnalysisIntent({ message = "", screenContext = null, conversationState = null } = {}) {
  const text = normalizeText(message);
  const screen = contextText(screenContext, conversationState);
  const previous = conversationState?.costAnalysisState || conversationState?.costReasoning || null;
  const followUp = isFollowUpMessage(message, conversationState);
  const family = familyFromText(text) || (followUp ? String(previous?.lastIntentFamily || "") : "");
  const financialScreen = FINANCIAL_PATH_PATTERN.test(screen) || /(?:bütçe|butce|servis maliyeti|teklif ve kârlılık|teklif ve karlilik)/.test(screen);
  const isCostAnalysis = Boolean(family) || (financialScreen && /(?:maliyet|bütçe|butce|teklif|kâr|kar|senaryo|veri|güven|guven|referans|pahalı|pahali)/.test(text));
  if (!isCostAnalysis) {
    return { isCostAnalysis: false, family: "", intent: "", confidence: 0, isFollowUp: false, matchedSignals: [] };
  }
  const intent = {
    BUDGET_COST: "BÜTÇE_VE_MALİYETİ_AÇIKLA",
    OFFER_PROFITABILITY: "TEKLİF_VE_KÂRLILIĞI_AÇIKLA",
    ROUTE_OPERATION: "OPERASYONEL_MALİYETİ_AÇIKLA",
    WHAT_IF_SCENARIO: "SENARYO_ETKİSİNİ_KARŞILAŞTIR",
    DATA_CONFIDENCE: "VERİ_VE_GÜVENİ_AÇIKLA",
  }[family] || "BÜTÇE_VE_MALİYETİ_AÇIKLA";
  return {
    isCostAnalysis: true,
    family: COST_REASONING_INTENT_FAMILIES.includes(family) ? family : "BUDGET_COST",
    intent,
    confidence: family ? (followUp ? 0.86 : 0.93) : 0.58,
    isFollowUp: followUp,
    matchedSignals: unique([
      family,
      financialScreen ? "FINANCIAL_SCREEN_CONTEXT" : "COST_LANGUAGE",
      followUp ? "FOLLOW_UP_CONTEXT" : "DIRECT_COST_QUESTION",
    ]),
  };
}

function numberAfter(text, pattern) {
  const match = String(text || "").match(pattern);
  return match ? finiteNumber(String(match[1]).replace(",", ".")) : null;
}

function extractScenarioOverrides(message, baselineInput = {}) {
  const text = normalizeText(message);
  const overrides = {};
  const vehicleCount = numberAfter(text, /(?:araç sayısını|arac sayisini|araç sayısı|arac sayisi|)(\d+(?:[.,]\d+)?)\s*araç(?:la|lık|lik)?/);
  const vehicleSet = numberAfter(text, /(?:araç sayısını|arac sayisini|araç sayısı|arac sayisi)\s*(?:ayı|ayi|olarak|=)?\s*(\d+(?:[.,]\d+)?)/);
  if (vehicleSet !== null) overrides.vehicleCount = Math.max(0, Math.trunc(vehicleSet));
  else if (vehicleCount !== null && /(?:\d+\s*araçla|\d+\s*araçlık|\d+\s*aracla|\d+\s*araclik)/.test(text)) overrides.vehicleCount = Math.max(0, Math.trunc(vehicleCount));

  const passengerCount = numberAfter(text, /(\d+(?:[.,]\d+)?)\s*(?:kişi|kisi|öğrenci|ogrenci|yolcu)/);
  if (passengerCount !== null) overrides.passengerCount = Math.max(0, Math.trunc(passengerCount));
  const stopCount = numberAfter(text, /(\d+(?:[.,]\d+)?)\s*durak/);
  if (stopCount !== null) overrides.stopCount = Math.max(0, Math.trunc(stopCount));
  const distance = numberAfter(text, /(\d+(?:[.,]\d+)?)\s*km/);
  if (distance !== null && /(?:mesafe|rota|km)/.test(text)) overrides.serviceDistanceKm = Math.max(0, distance);
  const duration = numberAfter(text, /(\d+(?:[.,]\d+)?)\s*(?:dakika|dk)/);
  const baseDuration = finiteNumber(baselineInput?.routeDurationMinutes);
  if (duration !== null && /(?:süre|sure|dakika|dk)/.test(text)) {
    overrides.routeDurationMinutes = /(?:artır|artir|uzat|fazla)/.test(text) && baseDuration !== null
      ? Math.max(0, baseDuration + duration)
      : Math.max(0, duration);
  }
  const serviceDays = numberAfter(text, /(\d+(?:[.,]\d+)?)\s*(?:gün|gun)\b/);
  if (serviceDays !== null) overrides.serviceDayCount = Math.max(0, Math.trunc(serviceDays));
  if (/(?:yakıt|yakit|akaryakıt|akaryakit).*(?:piyasa|referans)|(?:piyasa|referans).*?(?:yakıt|yakit|akaryakıt|akaryakit)/.test(text)) {
    overrides.useExternalFuelPrice = true;
  }
  return overrides;
}

function financialPreviewInputs(baseline) {
  const budget = baseline?.budgetEvidence || {};
  const actual = baseline?.actualEvidence || {};
  return {
    currencyCode: baseline?.input?.currencyCode || "TRY",
    budgetAmountMinor: budget.budgetAmountMinor ?? null,
    approvedBudgetAmountMinor: budget.status === "ACTIVE" ? budget.budgetAmountMinor ?? null : null,
    budgetApprovalState: budget.approvalState || (budget.status === "ACTIVE" ? "approved" : "draft"),
    budgetSource: budget.source || null,
    periodStart: budget.periodStart || null,
    periodEnd: budget.periodEnd || null,
    actualServiceSpendMinor: actual.actualCostMinor ?? null,
  };
}

async function loadCanonicalFinancialEvidence({ user, baseline }) {
  const scope = upper(baseline?.scope);
  const [company, room, agreement, quoteDraft] = await Promise.all([
    baseline?.companyId
      ? prisma.company.findUnique({
        where: { id: Number(baseline.companyId) },
        select: { id: true, name: true, kind: true, region: { select: { name: true } } },
      })
      : null,
    baseline?.roomId
      ? prisma.room.findUnique({
        where: { id: Number(baseline.roomId) },
        select: { id: true, name: true, status: true, region: { select: { name: true } } },
      })
      : null,
    scope === "ROOM" && baseline?.roomId
      ? prisma.agreement.findFirst({
        where: { roomId: Number(baseline.roomId) },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        select: {
          id: true, companyId: true, roomId: true, status: true, startDate: true, endDate: true,
          companyOfferAmount: true, roomOfferAmount: true, companyOfferNote: true, roomOfferNote: true, updatedAt: true,
          room: { select: { id: true, name: true } },
          company: { select: { id: true, name: true, kind: true } },
        },
      })
      : baseline?.companyId
        ? prisma.agreement.findFirst({
          where: { companyId: Number(baseline.companyId) },
          orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
          select: {
            id: true, companyId: true, roomId: true, status: true, startDate: true, endDate: true,
            companyOfferAmount: true, roomOfferAmount: true, companyOfferNote: true, roomOfferNote: true, updatedAt: true,
            room: { select: { id: true, name: true } },
            company: { select: { id: true, name: true, kind: true } },
          },
        })
        : null,
    scope === "ROOM" && baseline?.roomId ? getCurrentRoomQuoteFloorDraft(Number(baseline.roomId)) : null,
  ]);

  const financePreview = scope === "ROOM"
    ? buildRoomProfitabilityAndQuoteFloorPreview({
      role: user?.role,
      companyKind: baseline?.companyKind,
      room,
      company,
      shift: baseline?.routeShift,
      agreement,
      costInputs: baseline?.input || {},
      quoteFloorInputs: buildRoomQuoteFloorDraftPreviewInputs(quoteDraft),
    })
    : buildCompanyBudgetAndServiceCostPreview({
      role: user?.role,
      companyKind: baseline?.companyKind,
      company,
      shift: baseline?.routeShift,
      agreement,
      budgetInputs: financialPreviewInputs(baseline),
      serviceCostInputs: financialPreviewInputs(baseline),
      previewInputs: { currencyCode: baseline?.input?.currencyCode || "TRY" },
    });

  return {
    financePreview,
    company,
    room,
    agreement,
    quoteDraft,
    regionName: company?.region?.name || room?.region?.name || null,
  };
}

function layerLabel(layer) {
  if (!layer) return "Katman yok";
  if (layer.available) {
    if (layer.layer === "EXTERNAL_MARKET_REFERENCE") return `Dış piyasa referansı kullanılabilir${layer.valueMinor != null ? `: ${formatMoneyMinor(layer.valueMinor, layer.currencyCode || "TRY")}/${layer.unit === "CURRENCY_PER_L" ? "L" : "birim"}` : "."}`;
    if (layer.layer === "SEFERPAKT_PLATFORM_REFERENCE") return `SeferPakt platform gözlemi kullanılabilir: ${layer.sampleCount || 0} gözlem.`;
    if (layer.layer === "USER_COMPANY_ROOM_ACTUAL") return `Bu kapsamın gerçek verisi kullanılabilir: ${formatMoneyMinor(layer.valueMinor, layer.currencyCode || "TRY")}.`;
  }
  if (layer.layer === "SEFERPAKT_PLATFORM_REFERENCE") return "SeferPakt platform gözlemi için yeterli anonim örnek yok.";
  if (layer.layer === "USER_COMPANY_ROOM_ACTUAL") return "Bu kapsam için karşılaştırılabilir gerçek veri yok.";
  return "Dış piyasa referansı kullanılabilir bir değer sağlamıyor.";
}

function confidenceLabel(level, score) {
  const normalized = upper(level);
  if (normalized === "HIGH" || Number(score) >= 90) return "Yüksek";
  if (normalized === "MEDIUM" || Number(score) >= 65) return "Orta";
  if (normalized === "LOW" || Number(score) >= 40) return "Düşük";
  return "Yetersiz";
}

function baselinePlanText(baseline) {
  const input = baseline?.input || {};
  const parts = [
    baseline?.source?.label ? `Mevcut plan: ${baseline.source.label}.` : "Mevcut plan kaynağı bulunamadı.",
    input.vehicleCount != null ? `Araç: ${formatNumber(input.vehicleCount, 0)} araç.` : "",
    input.passengerCount != null ? `Yolcu: ${formatNumber(input.passengerCount, 0)} kişi.` : "",
    input.stopCount != null ? `Durak: ${formatNumber(input.stopCount, 0)} durak.` : "",
    input.serviceDistanceKm != null ? `Mesafe: ${formatNumber(input.serviceDistanceKm)} km.` : "",
    input.routeDurationMinutes != null ? `Rota süresi: ${formatNumber(input.routeDurationMinutes, 0)} dk.` : "",
    input.serviceDayCount != null ? `Hizmet günü: ${formatNumber(input.serviceDayCount, 0)} gün.` : "",
  ];
  return parts.filter(Boolean).join(" ");
}

function changedDimensionLabels(preview) {
  const map = {
    vehicleCount: "araç sayısı",
    vehicleType: "araç tipi",
    vehicleCapacity: "araç kapasitesi",
    passengerCount: "kişi sayısı",
    stopCount: "durak sayısı",
    serviceDistanceKm: "hizmet mesafesi",
    totalDistanceKm: "toplam mesafe",
    routeDurationMinutes: "rota süresi",
    serviceDayCount: "hizmet günü",
  };
  return unique((preview?.changedDimensions || []).map((key) => map[key] || key));
}

function materialFinancialEffect({ scope, financePreview, scenarioPreview }) {
  const currencyCode = scenarioPreview?.currencyCode || financePreview?.currencyCode || "TRY";
  if (scenarioPreview?.costDeltaMinor !== null && scenarioPreview?.costDeltaMinor !== undefined) {
    const delta = integer(scenarioPreview.costDeltaMinor);
    const direction = delta < 0 ? "azalış" : delta > 0 ? "artış" : "değişiklik yok";
    return `#4 karşılaştırmasına göre tahmini maliyet etkisi: ${formatMoneyMinor(Math.abs(delta), currencyCode)} ${direction}. Bu değer yalnızca önizlemedir.`;
  }
  if (scope === "ROOM" && financePreview?.roomProfitability) {
    const quote = financePreview.roomProfitability;
    if (financePreview?.quoteFloor?.quoteFloorMinor !== null && financePreview?.quoteFloor?.quoteFloorMinor !== undefined) return `Kanonik teklif tabanı önizlemesi: ${formatMoneyMinor(financePreview.quoteFloor.quoteFloorMinor, currencyCode)}. Bu değer teklif göndermez veya değişiklik uygulamaz.`;
    if (quote.baselineOperationalCostMinor !== null && quote.baselineOperationalCostMinor !== undefined) return `Kanonik maliyet tabanı: ${formatMoneyMinor(quote.baselineOperationalCostMinor, currencyCode)}. Teklif tabanı için ek parametre gerekebilir.`;
  }
  if (scope === "COMPANY" && financePreview?.companyBudget) {
    const budget = financePreview.companyBudget;
    const service = financePreview.companyServiceCost;
    const parts = [];
    if (budget.effectiveBudgetMinor !== null && budget.effectiveBudgetMinor !== undefined) parts.push(`Kanonik bütçe: ${formatMoneyMinor(budget.effectiveBudgetMinor, currencyCode)}.`);
    if (service?.companyVisibleServiceSpendMinor !== null && service?.companyVisibleServiceSpendMinor !== undefined) parts.push(`Görünen servis maliyeti: ${formatMoneyMinor(service.companyVisibleServiceSpendMinor, currencyCode)}.`);
    return parts.join(" ") || "Kanonik finansal etki için karşılaştırılabilir bütçe veya servis maliyeti verisi eksik.";
  }
  return "Karşılaştırılabilir parasal etki için kanonik veri eksik.";
}

function operationalEffect({ baseline, scenarioPreview }) {
  const changed = changedDimensionLabels(scenarioPreview);
  const timing = scenarioPreview?.timingComparison;
  const parts = [];
  if (changed.length) parts.push(`Değişen operasyon boyutları: ${changed.join(", ")}.`);
  if (timing?.delayImpactMinutes !== null && timing?.delayImpactMinutes !== undefined) parts.push(`Tahmini süre etkisi: ${formatNumber(timing.delayImpactMinutes, 0)} dk.`);
  if (scenarioPreview?.scenario?.requiredVehicleCount !== null && scenarioPreview?.scenario?.requiredVehicleCount !== undefined) parts.push(`Senaryo kapasite ihtiyacı: ${formatNumber(scenarioPreview.scenario.requiredVehicleCount, 0)} araç.`);
  if (!parts.length) return baselinePlanText(baseline);
  return parts.join(" ");
}

function riskText(scenarioPreview) {
  const risks = unique([
    ...(scenarioPreview?.blockers || []),
    ...(scenarioPreview?.warnings || []),
    scenarioPreview?.operationalRisk?.summary,
    scenarioPreview?.operationalRisk?.reason,
  ]);
  return risks.length ? risks.slice(0, 4).join(" ") : "Kanonik önizlemede ek risk sinyali yok; sonuç yine de operasyon onayı yerine geçmez.";
}

function missingData({ baseline, financePreview, referenceLayers, scenarioPreview }) {
  const fields = [
    ...(baseline?.missingFields || []),
    ...(financePreview?.missingFields || []),
    ...(financePreview?.companyBudget?.missingFields || []),
    ...(financePreview?.companyServiceCost?.missingFields || []),
    ...(financePreview?.roomProfitability?.missingFields || []),
    ...(scenarioPreview?.missingData || []),
  ];
  const selected = referenceLayers?.selected;
  if (!selected?.available) fields.push("Uygun dış veya platform referansı");
  const labels = {
    vehicleType: "Araç tipi",
    vehicleCount: "Araç sayısı",
    vehicleCapacity: "Araç kapasitesi",
    passengerCount: "Kişi / öğrenci / yolcu sayısı",
    stopCount: "Durak sayısı",
    serviceDistanceKm: "Rota mesafesi",
    totalDistanceKm: "Toplam mesafe",
    routeDurationMinutes: "Rota süresi",
    serviceDayCount: "Hizmet günü",
    shiftCount: "Sefer sayısı",
    tripCount: "Yolculuk sayısı",
    periodStart: "Dönem başlangıcı",
    periodEnd: "Dönem bitişi",
    actualServiceSpendMinor: "Gerçekleşen servis harcaması",
    contractedServiceCostMinor: "Sözleşmeli servis maliyeti",
    agreementPriceMinor: "Sözleşme tutarı",
    offerPriceMinor: "Teklif tutarı",
    deliveredShiftCount: "Tamamlanan sefer sayısı",
    deliveredServiceDayCount: "Tamamlanan hizmet günü",
  };
  return unique(fields).map((field) => labels[field] || field).slice(0, 10);
}

function answerSection(title, text, hint = "", items = []) {
  return { kind: title, title, text: String(text || "").trim(), ...(hint ? { hint } : {}), ...(items.length ? { items } : {}) };
}

function buildClarificationResponse({ baseResponse, request, roleKey, scope, screenPath }) {
  const roleLabel = visibleRoleLabel(roleKey);
  const question = scope
    ? `${roleLabel} için ${scope === "ROOM" ? "hangi oda / vardiya" : "hangi firma planı"} üzerinde bakayım?`
    : "Maliyet sorusunu hangi finans ekranı ve seçili plan için yanıtlayayım?";
  const sections = COST_REASONING_ANSWER_SECTIONS.map((title) => {
    if (title === "SONUÇ") return answerSection(title, "Sağlam bir maliyet açıklaması için bağlamı netleştirmem gerekiyor.");
    if (title === "NEDEN") return answerSection(title, "Birden fazla finans kapsamı veya geçerli kayıt olabilir; yanlış kapsam üzerinden sonuç üretmiyorum.");
    if (title === "ÖNERİ") return answerSection(title, question, "Seçili kayıt veya finans ekranı üzerinden devam edebiliriz.");
    if (title === "EKSİK VERİ") return answerSection(title, [screenPath ? "Seçili kapsam doğrulaması" : "Finans ekranı / plan kapsamı"].join("."));
    if (title === "GÜVEN SEVİYESİ") return answerSection(title, "Yetersiz — bağlam seçilmeden sayısal veya nedensel iddia kurmuyorum.");
    if (title === "KANIT") return answerSection(title, "Kanonik #1, #2 ve #4 sahipleri bağlam netleşince birlikte okunacak.");
    return answerSection(title, "Bağlam netleşince açıklanacak.");
  });
  return {
    ...baseResponse,
    provider: "local-sefer-abi-cost-analysis",
    copilotVersion: SEFER_ABI_COST_ANALYSIS_ASSISTANT_VERSION,
    reply: `Sonuç: ${sections[0].text} Öneri: ${sections.find((section) => section.kind === "ÖNERİ")?.text || question}`,
    questionType: "COST_REASONING_CLARIFICATION",
    questionLabel: "Maliyet bağlamı",
    responseSections: sections,
    costReasoning: {
      version: SEFER_ABI_COST_ANALYSIS_ASSISTANT_VERSION,
      family: request.family,
      clarificationRequired: true,
      isFollowUp: request.isFollowUp,
      role: roleKey,
      scope,
      screenPath: screenPath || null,
      context: { role: roleLabel, screenPath: screenPath || null, selectedRecord: null },
      evidence: { canonical1: null, canonical2: null, canonical4: null },
      readOnly: true,
      writeAction: false,
      generatedAt: new Date().toISOString(),
    },
    evidenceConfidence: "Yetersiz — bağlam seçilmeden değerlendirme yapılmadı.",
  };
}

export async function buildSeferAbiCostAnalysisResponse({
  baseResponse = {},
  user = {},
  message = "",
  screenContext = null,
  conversationState = null,
  resolvedEntityType = "screen",
  resolvedEntityId = 0,
} = {}) {
  const request = detectCostAnalysisIntent({ message, screenContext, conversationState });
  if (!request.isCostAnalysis) return baseResponse;

  const roleKey = await roleKeyForUser(user);
  const screenPath = String(screenContext?.path || conversationState?.lastScreenPath || baseResponse?.screenPath || "").split("?")[0];
  const scope = scopeForRole(roleKey, screenPath);
  const effectiveScope = scope || (resolvedEntityType === "shift" && roleKey === "ROOM" ? "ROOM" : "");
  if (!effectiveScope || (roleKey === "SUPER_ADMIN" && !user?.companyId && !user?.roomId && resolvedEntityType === "screen" && !/\/(?:room|company|school|organization)\//i.test(screenPath))) {
    return buildClarificationResponse({ baseResponse, request, roleKey, scope: effectiveScope, screenPath, user });
  }

  let baseline;
  try {
    baseline = await loadCostScenarioBaselineForUser({
      user,
      scope: effectiveScope,
      companyId: effectiveScope === "COMPANY" ? user?.companyId : null,
      roomId: effectiveScope === "ROOM" ? user?.roomId : null,
    });
  } catch {
    return buildClarificationResponse({ baseResponse, request, roleKey, scope: effectiveScope, screenPath, user });
  }

  const canonicalFinancial = await loadCanonicalFinancialEvidence({ user, baseline });
  const scenarioOverrides = request.family === "WHAT_IF_SCENARIO"
    ? extractScenarioOverrides(message, baseline?.input)
    : {};
  const firstReference = await getReferenceLayers({
    family: "FUEL_DIESEL",
    unit: "CURRENCY_PER_L",
    currencyCode: baseline?.input?.currencyCode || "TRY",
    regionName: canonicalFinancial.regionName || undefined,
    scope: effectiveScope,
    actualValueMinor: effectiveScope === "COMPANY" ? baseline?.actualEvidence?.actualCostMinor : null,
    actualUnit: "CURRENCY_PER_TRIP",
  }, user);
  const externalLayer = (firstReference?.layers || []).find((layer) => layer?.layer === "EXTERNAL_MARKET_REFERENCE" && layer?.available && upper(layer?.freshness) === "FRESH");
  const scenarioPreview = await buildCostScenarioPreviewFromBaseline({
    user,
    baseline,
    scenarioOverrides,
    externalReference: externalLayer ? { marketReference: externalLayer } : null,
  });
  const finalReference = await getReferenceLayers({
    family: "FUEL_DIESEL",
    unit: "CURRENCY_PER_L",
    currencyCode: scenarioPreview?.currencyCode || baseline?.input?.currencyCode || "TRY",
    regionName: canonicalFinancial.regionName || undefined,
    scope: effectiveScope,
    actualValueMinor: effectiveScope === "COMPANY" ? baseline?.actualEvidence?.actualCostMinor : null,
    actualUnit: "CURRENCY_PER_TRIP",
    operationalCostMinor: scenarioPreview?.baseline?.costMinor,
    quoteFloorMinor: canonicalFinancial?.financePreview?.quoteFloor?.quoteFloorMinor,
  }, user);

  const missing = missingData({ baseline, financePreview: canonicalFinancial.financePreview, referenceLayers: finalReference, scenarioPreview });
  const changed = changedDimensionLabels(scenarioPreview);
  const hasScenarioInput = Object.keys(scenarioOverrides).length > 0;
  const currentPlan = baselinePlanText(baseline);
  const resultText = hasScenarioInput && scenarioPreview?.status === "READY"
    ? (scenarioPreview.costDeltaMinor < 0
      ? `Alternatif senaryo mevcut plana göre tahmini maliyeti azaltıyor: ${formatMoneyMinor(Math.abs(scenarioPreview.costDeltaMinor), scenarioPreview.currencyCode)}.`
      : scenarioPreview.costDeltaMinor > 0
        ? `Alternatif senaryo mevcut plana göre tahmini maliyeti artırıyor: ${formatMoneyMinor(scenarioPreview.costDeltaMinor, scenarioPreview.currencyCode)}.`
        : "Alternatif senaryo mevcut planla aynı tahmini maliyeti gösteriyor.")
    : scenarioPreview?.status === "INCOMPLETE"
      ? "Kanonik mevcut plan okundu; karşılaştırma için eksik veri var."
      : "Kanonik mevcut plan ve finans bağlamı okundu; bu sonuç salt okunur önizlemedir.";
  const reasonText = [
    currentPlan,
    changed.length ? `Nedensel fark #4 modelindeki şu değişkenlerden geliyor: ${changed.join(", ")}.` : "Değişen senaryo girdisi yok; mevcut plan karşılaştırma tabanı olarak tutuldu.",
  ].filter(Boolean).join(" ");
  const recommendation = request.family === "WHAT_IF_SCENARIO" && !hasScenarioInput
    ? "Hangi parametreyi değiştirmek istediğini açıkça yaz; karşılaştırmayı aynı #4 senaryo motoruyla önizleyeyim."
    : roleKey === "ROOM"
      ? "Teklif kararından önce kanonik maliyet tabanını, teklif tabanını ve eksik veriyi yetkili kullanıcıyla doğrula."
      : "Bütçe veya plan kararından önce kanonik maliyet etkisini ve eksik veriyi yetkili kullanıcıyla doğrula.";
  const confidenceSource = scenarioPreview?.confidence || canonicalFinancial?.financePreview?.confidence || baseline?.baselineConfidence || {};
  const confidenceText = `${confidenceLabel(confidenceSource.level, confidenceSource.score)}${confidenceSource.reason ? ` — ${confidenceSource.reason}.` : "."}`;
  const layerLines = (finalReference?.layers || []).map(layerLabel);
  const evidenceText = [
    `${effectiveScope === "ROOM" ? "#1 Oda kârlılığı ve teklif tabanı" : "#1 Şirket bütçe ve servis maliyeti"} kanonik sahibi kullanıldı.`,
    `#2 üç katmanlı referans ayrımı korundu: ${layerLines.join(" ")}`,
    "#4 senaryo sahibi mevcut plan referansıyla salt okunur önizleme üretti.",
  ].join(" ");
  const financialEffect = materialFinancialEffect({ scope: effectiveScope, financePreview: canonicalFinancial.financePreview, scenarioPreview });
  const sections = [
    answerSection("SONUÇ", resultText, "Varsayımlar değişirse bu bölüm aynı kanonik preview üzerinden güncellenir."),
    answerSection("NEDEN", reasonText, "Sayısal ve nedensel iddialar kanonik sahiplerin çıktılarıyla sınırlıdır."),
    answerSection("KANIT", evidenceText, "Dış referans, platform gözlemi ve tenant içi gerçek veri birbirine karıştırılmaz.", layerLines),
    answerSection("FİNANSAL ETKİ", financialEffect, "Para alanları yalnızca kanonik finans/senaryo çıktısı varsa gösterilir."),
    answerSection("OPERASYON ETKİSİ", operationalEffect({ baseline, scenarioPreview }), "Birimler açıkça belirtilir: araç, kişi, durak, km, dk, gün."),
    answerSection("RİSK", riskText(scenarioPreview), "Bu ekran karar desteğidir; otomatik uygulama yapmaz."),
    answerSection("ÖNERİ", recommendation, "Öneri bağlayıcı değildir; kullanıcı onayı gerekir."),
    answerSection("EKSİK VERİ", missing.length ? missing.join(" • ") : "Kritik eksik veri görünmüyor.", "Eksik değer uydurulmaz."),
    answerSection("GÜVEN SEVİYESİ", confidenceText, "Güven, kanonik veri kapsamı ve tazeliğinden türetilir."),
  ];
  const shortReply = `Sonuç: ${resultText} Neden: ${reasonText} Öneri: ${recommendation}`;
  const roleLabel = visibleRoleLabel(roleKey);
  const generatedAt = new Date().toISOString();
  const costReasoning = {
    version: SEFER_ABI_COST_ANALYSIS_ASSISTANT_VERSION,
    family: request.family,
    intent: request.intent,
    role: roleKey,
    roleLabel,
    scope: effectiveScope,
    screen: { path: screenPath || null, label: screenContext?.label || baseResponse?.screenLabel || null },
    context: {
      selectedRecord: resolvedEntityType !== "screen" ? { type: resolvedEntityType, id: Number(resolvedEntityId) || null } : null,
      baselinePlan: baseline?.source?.label || null,
      baselineReference: baseline?.baselineReference || null,
      companyKind: ["SCHOOL", "ORGANIZATION"].includes(roleKey) ? roleKey : null,
      planningOnly: ["SCHOOL", "ORGANIZATION"].includes(roleKey),
      normalBudgetLifecycle: roleKey === "COMPANY",
    },
    canonicalOwners: {
      canonical1: {
        owner: effectiveScope === "ROOM" ? "ROOM_PROFITABILITY_AND_QUOTE_FLOOR" : "COMPANY_BUDGET_AND_SERVICE_COST",
        modelVersion: canonicalFinancial.financePreview?.modelVersion || null,
        evidence: canonicalFinancial.financePreview?.evidence || [],
      },
      canonical2: {
        owner: "EXTERNAL_COST_REFERENCE_LAYERS",
        layers: finalReference?.layers || [],
        pricingGuidance: finalReference?.pricingGuidance || null,
      },
      canonical4: {
        owner: "COST_SCENARIO_FORECAST",
        modelVersion: scenarioPreview?.modelVersion || null,
        scenarioId: scenarioPreview?.scenarioId || null,
        changedDimensions: scenarioPreview?.changedDimensions || [],
        evidence: scenarioPreview?.evidence || [],
      },
    },
    evidence: {
      baselineReference: baseline?.baselineReference || null,
      baselineSource: baseline?.source?.label || null,
      baselineConfidence: baseline?.baselineConfidence || null,
      financialModelVersion: canonicalFinancial.financePreview?.modelVersion || null,
      scenarioModelVersion: scenarioPreview?.modelVersion || null,
      referenceLayers: finalReference?.layers || [],
      missingData: missing,
      causalBasis: changed,
    },
    answer: {
      sections,
      concise: shortReply,
      expandedOnDemand: true,
    },
    recommendation: { text: recommendation, requiresUserApproval: true, writeAction: false },
    clarificationRequired: false,
    readOnly: true,
    writeAction: false,
    liveMutation: false,
    isFollowUp: request.isFollowUp,
    generatedAt,
  };
  return {
    ...baseResponse,
    provider: "local-sefer-abi-cost-analysis",
    copilotVersion: SEFER_ABI_COST_ANALYSIS_ASSISTANT_VERSION,
    generatedAt,
    reply: shortReply,
    summary: resultText,
    questionType: "COST_REASONING",
    questionLabel: "Maliyet analizi",
    intentConfidence: request.confidence,
    intentSignals: request.matchedSignals,
    responseSections: sections,
    followUpPrompt: "Aynı bağlamda devam etmek için maliyet, senaryo veya eksik veri sorusunu yazabilirsin.",
    evidenceConfidence: confidenceText,
    roleBoundary: "Bu yanıt yalnızca yetkili kapsamındaki kanonik veriyi okur; kayıt, teklif, rota veya bütçe değiştirmez.",
    costReasoning,
    costAnalysisState: {
      lastIntentFamily: request.family,
      lastIntent: request.intent,
      lastScreenPath: screenPath,
      lastBaselineReference: baseline?.baselineReference || null,
      lastScope: effectiveScope,
      lastAnswer: shortReply,
      lastGeneratedAt: generatedAt,
    },
    safety: { readOnly: true, previewOnly: true, writeAction: false, noLiveMutation: true, notPersisted: true },
  };
}
