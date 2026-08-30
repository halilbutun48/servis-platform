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

export const COST_REASONING_QUESTION_INTENTS = Object.freeze([
  "BUDGET_OVERRUN",
  "COST_DRIVER",
  "OFFER_PROFITABILITY",
  "MULTI_ROUTE_RANKING",
  "SAVINGS_OPPORTUNITY",
  "CONTRACT_PROFITABILITY",
  "WHAT_IF_SCENARIO",
  "VEHICLE_RECOMMENDATION",
  "ALTERNATIVE_EXPLANATION",
  "RISK_SUMMARY",
]);

const FINANCIAL_PATH_PATTERN = /(?:\/|^)(?:room|company|school|organization)\/financial-operations\b/i;
const FOLLOW_UP_PATTERN = /^(?:peki|neden|nasıl|nasil|bunu aç|bunu ac|devam|aynı|ayni|bu durumda|hangi veri|ne öner|ne oner|detay|açıkla|acikla|yaptım|yaptim|bulamadım|bulamadim|başka seçenek|baska secenek)\b/i;

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

function continuationTypeFromText(message) {
  const text = normalizeText(message);
  if (/^yaptim\b/.test(text)) return "YAPTIM";
  if (/^bulamadim\b/.test(text)) return "BULAMADIM";
  if (/^(?:devam|devam et)\b/.test(text)) return "DEVAM_ET";
  if (/^(?:neden|nasil|nasıl|bunu ac|bunu aç|peki\s+neden)\b/.test(text)) return "NEDEN";
  if (/^(?:baska secenek|başka seçenek|alternatif)\b/.test(text)) return "ALTERNATIVE";
  return "";
}

function familyFromText(text) {
  if (/(?:teklif|kâr|kar|kârlılık|karlilik|marj|fiyat|teklif tabanı|teklif tabani|minimum fiyat)/.test(text)) return "OFFER_PROFITABILITY";
  if (/(?:senaryo|varsay|olursa|gelirse|gelecekse|uzarsa|artarsa|azalırsa|azalirsa|değiştir|degistir|artır|artir|azalt|eklersem|çıkarırsam|cikarsam|what if|alternatif|daha iyi|kişi daha|kisi daha)/.test(text)) return "WHAT_IF_SCENARIO";
  if (/(?:rota|mesafe|durak|araç|arac|sürücü|surucu|operasyon|sefer|süre|sure|gecik|kapasite|pahalı|pahali|riskli|risk)/.test(text)) return "ROUTE_OPERATION";
  if (/(?:bütçe|butce|maliyet|masraf|harcama|servis maliyeti|maliyet neden|maliyetim|tasarruf|nereden)/.test(text)) return "BUDGET_COST";
  if (/(?:kaynak|kanıt|kanit|veri|güven|guven|güncel|guncel|referans|piyasa|gerçek|gercek|tazelik)/.test(text)) return "DATA_CONFIDENCE";
  return "";
}

function questionIntentFromText(text, family, continuationType = "") {
  if (continuationType === "ALTERNATIVE") return "ALTERNATIVE_EXPLANATION";
  if (/(?:alternatif|seçenek|secenek).*(?:neden|niçin|nicin|daha iyi)|(?:neden|niçin|nicin).*(?:alternatif|seçenek|secenek)/.test(text)) return "ALTERNATIVE_EXPLANATION";
  if (/(?:en pahalı|en pahali|hangisi daha pahalı|hangisi daha pahali|rota.*hang|hang.*rota|karşılaştır|karsilastir|sıral|sirala)/.test(text)) return "MULTI_ROUTE_RANKING";
  if (/(?:nereden.*tasarruf|tasarruf.*nereden|maliyeti düşür|maliyeti dusur|ucuzlat|azaltabilirim)/.test(text)) return "SAVINGS_OPPORTUNITY";
  if (/(?:sözleşme|sozlesme|anlaşma|anlasma).*(?:kâr|kar|kârlı|karli|zarar|kazanç|kazanc)|(?:kâr|kar|kârlı|karli).*(?:sözleşme|sozlesme|anlaşma|anlasma)/.test(text)) return "CONTRACT_PROFITABILITY";
  if (/(?:kaç araç|kac arac|hangi araç|hangi arac|araç.*mantıklı|arac.*mantikli|araç.*öner|arac.*oner)/.test(text)) return "VEHICLE_RECOMMENDATION";
  if (/(?:riskli|risk|tehlike|sakınca|sakinca)/.test(text)) return "RISK_SUMMARY";
  if (/(?:neden.*aş|neden.*as|üstüne.*çık|ustune.*cik|bütçe.*aş|butce.*as)/.test(text)) return "BUDGET_OVERRUN";
  if (/(?:hangi maliyet|hangi kalem|artmış|artmis|yüksel|yuksel)/.test(text)) return "COST_DRIVER";
  if (family === "WHAT_IF_SCENARIO") return "WHAT_IF_SCENARIO";
  if (family === "OFFER_PROFITABILITY") return "OFFER_PROFITABILITY";
  return family || "BUDGET_OVERRUN";
}

export function detectCostAnalysisIntent({ message = "", screenContext = null, conversationState = null } = {}) {
  const text = normalizeText(message);
  const screen = contextText(screenContext, conversationState);
  const previous = conversationState?.costAnalysisState || conversationState?.costReasoning || null;
  const followUp = isFollowUpMessage(message, conversationState);
  const family = familyFromText(text) || (followUp ? String(previous?.lastIntentFamily || "") : "");
  const continuationType = continuationTypeFromText(message);
  const financialScreen = FINANCIAL_PATH_PATTERN.test(screen) || /(?:bütçe|butce|servis maliyeti|teklif ve kârlılık|teklif ve karlilik)/.test(screen);
  const isCostAnalysis = Boolean(family) || (financialScreen && /(?:maliyet|bütçe|butce|teklif|kâr|kar|senaryo|veri|güven|guven|referans|pahalı|pahali|risk|tasarruf|alternatif|araç|arac)/.test(text));
  if (!isCostAnalysis) {
    return { isCostAnalysis: false, family: "", intent: "", questionIntent: "", continuationType: "", confidence: 0, isFollowUp: false, matchedSignals: [] };
  }
  const intent = {
    BUDGET_COST: "BÜTÇE_VE_MALİYETİ_AÇIKLA",
    OFFER_PROFITABILITY: "TEKLİF_VE_KÂRLILIĞI_AÇIKLA",
    ROUTE_OPERATION: "OPERASYONEL_MALİYETİ_AÇIKLA",
    WHAT_IF_SCENARIO: "SENARYO_ETKİSİNİ_KARŞILAŞTIR",
    DATA_CONFIDENCE: "VERİ_VE_GÜVENİ_AÇIKLA",
  }[family] || "BÜTÇE_VE_MALİYETİ_AÇIKLA";
  const questionIntent = questionIntentFromText(text, family, continuationType);
  return {
    isCostAnalysis: true,
    family: COST_REASONING_INTENT_FAMILIES.includes(family) ? family : "BUDGET_COST",
    intent,
    questionIntent: COST_REASONING_QUESTION_INTENTS.includes(questionIntent) ? questionIntent : "BUDGET_OVERRUN",
    confidence: family ? (followUp ? 0.86 : 0.93) : 0.58,
    isFollowUp: followUp,
    continuationType,
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
  const vehicleCount = numberAfter(text, /(\d+(?:[.,]\d+)?)\s*araç(?:la|lık|lik)?/);
  const vehicleSet = numberAfter(text, /(?:araç sayısını|arac sayisini|araç sayısı|arac sayisi)\s*(?:ayı|ayi|olarak|=)?\s*(\d+(?:[.,]\d+)?)/);
  if (vehicleSet !== null) overrides.vehicleCount = Math.max(0, Math.trunc(vehicleSet));
  else if (vehicleCount !== null && /(?:\d+\s*araçla|\d+\s*araçlık|\d+\s*aracla|\d+\s*araclik)/.test(text)) overrides.vehicleCount = Math.max(0, Math.trunc(vehicleCount));

  const passengerCount = numberAfter(text, /(\d+(?:[.,]\d+)?)\s*(?:kişi|kisi|öğrenci|ogrenci|yolcu)/);
  if (passengerCount !== null) {
    const relativePassengerChange = /(?:daha|ek|art(?:arsa|ır|ir)|gel(?:irse|ir))/ .test(text);
    const baselinePassengerCount = finiteNumber(baselineInput?.passengerCount);
    overrides.passengerCount = relativePassengerChange && baselinePassengerCount !== null
      ? Math.max(0, Math.trunc(baselinePassengerCount + passengerCount))
      : Math.max(0, Math.trunc(passengerCount));
  }
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

function fuelIncreasePercentFromText(message) {
  const text = normalizeText(message);
  if (!/(?:yakıt|yakit|akaryakıt|akaryakit)/.test(text)) return null;
  const value = numberAfter(text, /(?:yakıt|yakit|akaryakıt|akaryakit)[^\d]{0,24}(\d+(?:[.,]\d+)?)\s*%/);
  return value !== null && value >= 0 && value <= 200 ? value : null;
}

function applyFuelIncreaseOverride(overrides, message, baselineInput, reference) {
  const percent = fuelIncreasePercentFromText(message);
  if (percent === null) return { overrides, percent: null, applied: false };
  const baselinePrice = finiteNumber(baselineInput?.fuelUnitPriceMinor)
    ?? finiteNumber(reference?.selected?.valueMinor)
    ?? finiteNumber(reference?.layers?.find((layer) => layer?.layer === "EXTERNAL_MARKET_REFERENCE" && layer?.available)?.valueMinor);
  if (baselinePrice === null) return { overrides, percent, applied: false };
  return {
    overrides: {
      ...overrides,
      fuelUnitPriceMinor: Math.max(0, Math.round(baselinePrice * (1 + (percent / 100)))),
    },
    percent,
    applied: true,
  };
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
  const [company, room, agreement, quoteDraft, shiftOffer] = await Promise.all([
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
    baseline?.routeShift?.id && baseline?.routeShift?.roomId
      ? prisma.shiftOffer.findFirst({
        where: { shiftId: Number(baseline.routeShift.id), roomId: Number(baseline.routeShift.roomId) },
        orderBy: [{ updatedAt: "desc" }, { id: "desc" }],
        select: { id: true, shiftId: true, roomId: true, status: true, amountCompany: true, amountRoom: true, createdAt: true, updatedAt: true },
      })
      : null,
  ]);

  const acceptedShiftOffer = upper(shiftOffer?.status) === "ACCEPTED" ? shiftOffer : null;
  const commercialContext = agreement
    ? { type: "AGREEMENT", id: agreement.id, status: agreement.status, companyOfferAmount: agreement.companyOfferAmount, roomOfferAmount: agreement.roomOfferAmount }
    : acceptedShiftOffer
      ? { type: "ACCEPTED_SHIFT_OFFER", id: acceptedShiftOffer.id, status: acceptedShiftOffer.status, companyOfferAmount: acceptedShiftOffer.amountCompany, roomOfferAmount: acceptedShiftOffer.amountRoom }
      : { type: "NONE", id: null, status: null, companyOfferAmount: null, roomOfferAmount: null };
  const financeShift = baseline?.routeShift
    ? {
      ...baseline.routeShift,
      ...(acceptedShiftOffer ? {
        companyOfferAmount: acceptedShiftOffer.amountCompany,
        roomOfferAmount: acceptedShiftOffer.amountRoom,
      } : {}),
    }
    : baseline?.routeShift;
  const financeAgreement = agreement || (acceptedShiftOffer ? {
    id: null,
    companyId: acceptedShiftOffer.companyId || baseline?.companyId || null,
    roomId: acceptedShiftOffer.roomId || baseline?.roomId || null,
    status: "ACCEPTED_SHIFT_OFFER",
    companyOfferAmount: acceptedShiftOffer.amountCompany,
    roomOfferAmount: acceptedShiftOffer.amountRoom,
  } : null);

  const financePreview = scope === "ROOM"
    ? buildRoomProfitabilityAndQuoteFloorPreview({
      role: user?.role,
      companyKind: baseline?.companyKind,
      room,
      company,
      shift: financeShift,
      agreement: financeAgreement,
      costInputs: baseline?.input || {},
      quoteFloorInputs: buildRoomQuoteFloorDraftPreviewInputs(quoteDraft),
    })
    : buildCompanyBudgetAndServiceCostPreview({
      role: user?.role,
      companyKind: baseline?.companyKind,
      company,
      shift: financeShift,
      agreement: financeAgreement,
      budgetInputs: financialPreviewInputs(baseline),
      serviceCostInputs: financialPreviewInputs(baseline),
      previewInputs: { currencyCode: baseline?.input?.currencyCode || "TRY" },
    });

  return {
    financePreview,
    company,
    room,
    agreement,
    shiftOffer: acceptedShiftOffer,
    commercialContext,
    quoteDraft,
    regionName: company?.region?.name || room?.region?.name || null,
  };
}

function candidateInputFromShift(baseline, shift) {
  const input = { ...(baseline?.input || {}) };
  const routeDistanceKm = Number(shift?.routeSnapshotDistanceM) > 0
    ? Number(shift.routeSnapshotDistanceM) / 1000
    : null;
  const routeDurationMinutes = Number(shift?.routeSnapshotDurationSec) > 0
    ? Number(shift.routeSnapshotDurationSec) / 60
    : null;
  return {
    ...input,
    ...(shift?.vehicle?.type ? { vehicleType: shift.vehicle.type } : {}),
    ...(shift?.vehicle?.capacity != null ? { vehicleCapacity: Number(shift.vehicle.capacity) } : {}),
    ...(shift?.vehicle ? { vehicleCount: 1 } : {}),
    ...((shift?.requiredPaxOverride ?? shift?._count?.people) != null ? { passengerCount: Number(shift.requiredPaxOverride ?? shift._count.people) } : {}),
    ...(shift?._count?.stops != null ? { stopCount: Number(shift._count.stops) } : {}),
    ...(routeDistanceKm !== null ? { serviceDistanceKm: routeDistanceKm, totalDistanceKm: routeDistanceKm } : {}),
    ...(routeDurationMinutes !== null ? { routeDurationMinutes } : {}),
    serviceDayCount: input.serviceDayCount ?? 1,
  };
}

function routeSignature(shift) {
  return [
    Number(shift?.routeSnapshotDistanceM) || "missing",
    Number(shift?.routeSnapshotDurationSec) || "missing",
    Number(shift?._count?.stops) || "missing",
    Number(shift?.requiredPaxOverride ?? shift?._count?.people) || "missing",
  ].join(":");
}

async function buildRouteRanking({ user, baseline, scope, externalReference = null }) {
  const where = scope === "ROOM"
    ? { roomId: Number(baseline?.roomId || 0), status: { not: "DRAFT" } }
    : { companyId: Number(baseline?.companyId || 0), status: { not: "DRAFT" } };
  if (!(where.roomId || where.companyId)) {
    return { status: "INSUFFICIENT_DATA", candidates: [], items: [], reason: "Karşılaştırılabilir rota kapsamı bulunamadı." };
  }
  const shifts = await prisma.shift.findMany({
    where,
    orderBy: [{ startAt: "desc" }, { id: "desc" }],
    take: 24,
    select: {
      id: true,
      companyId: true,
      roomId: true,
      status: true,
      requiredPaxOverride: true,
      routeSnapshotDistanceM: true,
      routeSnapshotDurationSec: true,
      vehicle: { select: { type: true, capacity: true } },
      _count: { select: { people: true, stops: true } },
    },
  });
  const candidates = [];
  const seen = new Set();
  for (const shift of shifts) {
    const distance = Number(shift?.routeSnapshotDistanceM);
    const duration = Number(shift?.routeSnapshotDurationSec);
    if (!(distance > 0) || !(duration > 0)) continue;
    const signature = routeSignature(shift);
    if (seen.has(signature)) continue;
    seen.add(signature);
    candidates.push(shift);
  }
  if (candidates.length < 2) {
    return { status: "INSUFFICIENT_DATA", candidates, items: [], reason: "En az iki farklı kanonik rota metriği bulunamadı; tek rota sıralaması yapılmadı." };
  }

  const scored = await Promise.all(candidates.map(async (shift) => {
    const candidateBaseline = {
      ...baseline,
      input: candidateInputFromShift(baseline, shift),
      routeShift: null,
      routeEvidence: {
        baseline: {
          distanceKm: Number(shift.routeSnapshotDistanceM) / 1000,
          durationMinutes: Number(shift.routeSnapshotDurationSec) / 60,
          stopCount: Number(shift?._count?.stops) || null,
          source: "DB_ROUTE_SNAPSHOT",
        },
      },
      source: {
        ...(baseline.source || {}),
        type: "SHIFT",
        label: `Vardiya #${shift.id}`,
        shiftId: shift.id,
        companyId: shift.companyId,
        roomId: shift.roomId,
      },
    };
    const preview = await buildCostScenarioPreviewFromBaseline({ user, baseline: candidateBaseline, scenarioOverrides: {}, externalReference });
    return {
      shiftId: shift.id,
      label: `Vardiya #${shift.id}`,
      distanceKm: Number((Number(shift.routeSnapshotDistanceM) / 1000).toFixed(2)),
      durationMinutes: Number((Number(shift.routeSnapshotDurationSec) / 60).toFixed(2)),
      stopCount: Number(shift?._count?.stops) || null,
      passengerCount: Number(shift?.requiredPaxOverride ?? shift?._count?.people) || null,
      vehicleType: shift?.vehicle?.type || null,
      costMinor: preview?.scenario?.costMinor ?? null,
      currencyCode: preview?.currencyCode || baseline?.input?.currencyCode || "TRY",
      status: preview?.status || "INCOMPLETE",
      evidence: preview?.evidence || [],
    };
  }));
  const comparable = scored.filter((item) => item.costMinor !== null && item.costMinor !== undefined && item.status !== "BLOCKED");
  if (comparable.length < 2) {
    return {
      status: "INSUFFICIENT_COST_DATA",
      candidates: scored,
      items: [],
      reason: "Birden fazla kanonik rota bulundu; ancak en az iki rota için karşılaştırılabilir maliyet kanıtı yok. Maliyet sıralaması uydurulmadı.",
    };
  }
  const items = comparable
    .sort((left, right) => Number(left.costMinor) - Number(right.costMinor))
    .map((item, index) => ({ ...item, rank: index + 1 }));
  return {
    status: "READY",
    candidates: scored,
    items,
    best: items[0],
    mostExpensive: items[items.length - 1],
    reason: "Birden fazla yetkili rota aynı #4 maliyet sahibiyle karşılaştırıldı.",
  };
}

function buildCommercialProfitability({ scope, financePreview, commercialContext, scenarioPreview = null, agreementOnly = false }) {
  const section = scope === "ROOM" ? financePreview?.roomProfitability : financePreview?.companyBudget;
  const amountMinor = scope === "ROOM"
    ? section?.currentOfferMinor ?? commercialContext?.roomOfferAmount ?? commercialContext?.companyOfferAmount
    : section?.currentBudgetMinor ?? commercialContext?.companyOfferAmount;
  const costMinor = scenarioPreview?.baseline?.costMinor ?? (scope === "ROOM" ? section?.baselineOperationalCostMinor : section?.serviceCostMinor);
  const profitMinor = amountMinor != null && costMinor != null ? Number(amountMinor) - Number(costMinor) : null;
  const marginBps = amountMinor != null && profitMinor != null && Number(amountMinor) > 0
    ? Math.round((profitMinor / Number(amountMinor)) * 10000)
    : null;
  const sourceType = commercialContext?.type || "NONE";
  const sourceLabel = sourceType === "AGREEMENT"
    ? `Sözleşme #${commercialContext.id}`
    : sourceType === "ACCEPTED_SHIFT_OFFER"
      ? `Kabul edilmiş teklif #${commercialContext.id}`
      : "Sözleşme veya kabul edilmiş teklif yok";
  const ready = (!agreementOnly || sourceType === "AGREEMENT")
    && sourceType !== "NONE"
    && amountMinor != null
    && costMinor != null
    && profitMinor != null;
  return {
    status: ready ? "READY" : "INCOMPLETE",
    sourceType,
    sourceLabel,
    isRealCommercialContext: sourceType !== "NONE",
    isAgreement: sourceType === "AGREEMENT",
    agreementOnly,
    amountMinor: amountMinor ?? null,
    costMinor: costMinor ?? null,
    profitMinor: profitMinor ?? null,
    marginBps: marginBps ?? null,
    missingData: [
      ...(amountMinor == null ? ["Gerçek ticari tutar"] : []),
      ...(costMinor == null ? ["Kanonik maliyet tabanı"] : []),
    ],
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

function costCompleteness({ baseline, scenarioPreview, referenceLayers, scope }) {
  const scenarioCostMinor = finiteNumber(scenarioPreview?.scenario?.costMinor);
  const coverage = scenarioPreview?.costCoverage?.scenario || {};
  const actualCostMinor = finiteNumber(baseline?.actualEvidence?.actualCostMinor);
  const actualAuthorized = scope === "COMPANY" && actualCostMinor !== null;
  const costLevel = actualAuthorized
    ? "ACTUAL"
    : coverage.status === "COMPLETE" && scenarioCostMinor !== null
      ? "OPERATIONAL_ESTIMATE"
      : "PARTIAL";
  const componentBreakdown = Array.isArray(scenarioPreview?.scenario?.componentBreakdown)
    ? scenarioPreview.scenario.componentBreakdown
    : [];
  const includedComponents = componentBreakdown
    .filter((component) => component?.includedInBaseline)
    .map((component) => component.labelTr || component.key)
    .filter(Boolean);
  const missingComponents = unique([
    ...(Array.isArray(coverage.missingOptionalCosts) ? coverage.missingOptionalCosts.map((item) => item?.label) : []),
    ...componentBreakdown
      .filter((component) => component?.status === "incomplete" && component?.labelTr)
      .map((component) => component.labelTr),
  ]);
  const referenceSources = (Array.isArray(referenceLayers?.layers) ? referenceLayers.layers : [])
    .filter((layer) => layer?.available)
    .map((layer) => layer.provenance || layer.sourceName || layer.layer)
    .filter(Boolean);
  const confidenceSource = scenarioPreview?.confidence || {};
  const confidence = {
    level: confidenceSource.level || "INSUFFICIENT",
    score: finiteNumber(confidenceSource.score),
    reason: confidenceSource.reason || null,
  };
  const provenance = {
    canonical1: scope === "ROOM" ? "ROOM_PROFITABILITY_AND_QUOTE_FLOOR" : "COMPANY_BUDGET_AND_SERVICE_COST",
    canonical2: "EXTERNAL_COST_REFERENCE_LAYERS",
    canonical4: "COST_SCENARIO_FORECAST",
    baselineReference: baseline?.baselineReference || null,
    referenceSources: unique(referenceSources),
    actualSource: actualAuthorized ? baseline?.actualEvidence?.provenance || "AUTHORIZED_INTERNAL_ACTUAL" : null,
  };
  return {
    costLevel,
    available: scenarioCostMinor !== null,
    costMinor: scenarioCostMinor,
    actualCostMinor: actualAuthorized ? actualCostMinor : null,
    includedComponents: unique(includedComponents),
    missingComponents,
    confidence,
    provenance,
  };
}

function costLevelText(completeness, scenarioPreview) {
  const amount = completeness?.costMinor !== null && completeness?.costMinor !== undefined
    ? formatMoneyMinor(completeness.costMinor, scenarioPreview?.currencyCode || "TRY")
    : "tutar yok";
  if (completeness?.costLevel === "ACTUAL") return `Gerçekleşen maliyet: ${amount}.`;
  if (completeness?.costLevel === "OPERATIONAL_ESTIMATE") return `Operasyonel tahmini maliyet: ${amount}.`;
  if (completeness?.available) return `Kısmi tahmini maliyet: ${amount}.`;
  return "Kısmi tahmini maliyet için kullanılabilir tutar oluşmadı.";
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
  let scenarioOverrides = request.family === "WHAT_IF_SCENARIO"
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
    refresh: "true",
  }, user);
  const externalLayer = (firstReference?.layers || []).find((layer) => layer?.layer === "EXTERNAL_MARKET_REFERENCE" && layer?.available && upper(layer?.freshness) === "FRESH");
  const fuelIncrease = applyFuelIncreaseOverride(scenarioOverrides, message, baseline?.input, firstReference);
  scenarioOverrides = fuelIncrease.overrides;
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
    refresh: "true",
  }, user);

  const missing = missingData({ baseline, financePreview: canonicalFinancial.financePreview, referenceLayers: finalReference, scenarioPreview });
  const changed = changedDimensionLabels(scenarioPreview);
  const hasScenarioInput = Object.keys(scenarioOverrides).length > 0;
  const completeness = costCompleteness({ baseline, scenarioPreview, referenceLayers: finalReference, scope: effectiveScope });
  const commercialProfitability = buildCommercialProfitability({
    scope: effectiveScope,
    financePreview: canonicalFinancial.financePreview,
    commercialContext: canonicalFinancial.commercialContext,
    scenarioPreview,
  });
  const contractProfitability = buildCommercialProfitability({
    scope: effectiveScope,
    financePreview: canonicalFinancial.financePreview,
    commercialContext: canonicalFinancial.commercialContext,
    scenarioPreview,
    agreementOnly: true,
  });
  const needsRouteRanking = ["MULTI_ROUTE_RANKING", "SAVINGS_OPPORTUNITY"].includes(request.questionIntent);
  const routeRanking = needsRouteRanking
    ? await buildRouteRanking({
      user,
      baseline,
      scope: effectiveScope,
      externalReference: externalLayer ? { marketReference: externalLayer } : null,
    })
    : null;
  const vehicleAlternatives = scenarioPreview?.vehiclePlanAlternatives || null;
  const vehicleRecommendation = vehicleAlternatives?.recommendation || null;
  const capacityVehiclePlan = vehicleAlternatives?.items?.find((item) => upper(item.vehicleType) === upper(baseline?.input?.vehicleType))
    || vehicleAlternatives?.items?.find((item) => item?.requiredVehicleCount != null)
    || null;
  const currentPlan = baselinePlanText(baseline);
  const profitabilityCostLabel = completeness.costLevel === "ACTUAL"
    ? "gerçekleşen"
    : completeness.costLevel === "OPERATIONAL_ESTIMATE"
      ? "operasyonel tahmini"
      : "kısmi tahmini";
  const partialProfitabilityQualifier = completeness.costLevel === "PARTIAL"
    ? " Bu fark tam kârlılık sonucu değildir; eksik maliyet kalemleri sonucu artırabilir."
    : "";
  const resultText = request.questionIntent === "MULTI_ROUTE_RANKING"
    ? routeRanking?.status === "READY"
      ? `Karşılaştırılan rotalar içinde en pahalı kanonik rota ${routeRanking.mostExpensive.label}: ${formatMoneyMinor(routeRanking.mostExpensive.costMinor, routeRanking.mostExpensive.currencyCode)}.`
      : routeRanking?.reason || "Maliyet sıralaması için karşılaştırılabilir rota kanıtı eksik."
    : request.questionIntent === "VEHICLE_RECOMMENDATION"
      ? vehicleRecommendation
        ? `${vehicleRecommendation.vehicleLabel} planı ${formatNumber(vehicleRecommendation.requiredVehicleCount, 0)} araç ile kapasiteyi karşılayan hesaplanabilir adaylar içinde öne çıkıyor.`
        : capacityVehiclePlan
          ? `Kapasite açısından ${capacityVehiclePlan.vehicleLabel} planı ${formatNumber(capacityVehiclePlan.requiredVehicleCount, 0)} araç gerektiriyor; maliyet açısından en iyi aday yakıt ve diğer maliyet kanıtı olmadan seçilmedi.`
          : vehicleAlternatives?.reason || "Araç önerisi için karşılaştırılabilir kapasite ve maliyet kanıtı yok; öneri uydurulmadı."
    : request.questionIntent === "SAVINGS_OPPORTUNITY"
      ? routeRanking?.status === "READY"
        ? `En düşük maliyetli kanonik rota ${routeRanking.best.label}: ${formatMoneyMinor(routeRanking.best.costMinor, routeRanking.best.currencyCode)}. Bu bir preview sıralamasıdır.`
        : scenarioPreview?.savingsMinor != null
          ? `Açık senaryo varsayımı mevcut plana göre tahmini ${formatMoneyMinor(scenarioPreview.savingsMinor, scenarioPreview.currencyCode)} tasarruf sinyali veriyor.`
          : "Kanıtlanmış bir tasarruf fırsatı yok; eksik maliyet verisi nedeniyle değer uydurulmadı."
    : request.questionIntent === "CONTRACT_PROFITABILITY"
      ? contractProfitability.status === "READY"
        ? `${contractProfitability.sourceLabel} bağlamında ${profitabilityCostLabel} maliyet sonrası ${formatMoneyMinor(Math.abs(contractProfitability.profitMinor), scenarioPreview?.currencyCode || "TRY")} ${contractProfitability.profitMinor >= 0 ? "kalan fark" : "zarar"} görünüyor.${partialProfitabilityQualifier}`
        : `${contractProfitability.sourceLabel}; yetkili bir gerçek sözleşme ve kanonik maliyet birlikte karşılaştırılamadığı için sözleşme kârlılığı kesinleştirilmedi.`
    : request.questionIntent === "OFFER_PROFITABILITY"
      ? commercialProfitability.status === "READY"
        ? `${commercialProfitability.sourceLabel} için ${profitabilityCostLabel} maliyet sonrası ${formatMoneyMinor(Math.abs(commercialProfitability.profitMinor), scenarioPreview?.currencyCode || "TRY")} ${commercialProfitability.profitMinor >= 0 ? "kalan fark" : "zarar"} görünüyor.${partialProfitabilityQualifier} Bu karar desteği teklif veya sözleşmeyi değiştirmez.`
        : `${commercialProfitability.sourceLabel}; teklif ve kanonik maliyet birlikte karşılaştırılamadığı için zarar/kalan fark sonucu kesinleştirilmedi.`
    : request.continuationType === "YAPTIM"
      ? "Tamam; aynı kanonik maliyet bağlamını koruyorum. Sonraki adım, sonucu veya değişen varsayımı birlikte kontrol etmek."
    : request.continuationType === "BULAMADIM"
      ? "Sorun değil; kaydı veya maliyet kalemini bulamadıysan mevcut kanıtı değiştirmeden eksik veriyi işaretliyorum. Önce aynı finans ekranındaki kanonik planı doğrula."
    : request.continuationType === "DEVAM_ET"
      ? "Devam ediyorum: önce kanonik mevcut plan, sonra karşılaştırılabilir maliyet ve en son risk/eksik veri sırasını koruyorum."
    : request.questionIntent === "RISK_SUMMARY"
      ? riskText(scenarioPreview)
    : hasScenarioInput && scenarioPreview?.status === "READY"
    ? `${costLevelText(completeness, scenarioPreview)} ${scenarioPreview.costDeltaMinor < 0
      ? `Alternatif senaryo mevcut plana göre tahmini maliyeti azaltıyor: ${formatMoneyMinor(Math.abs(scenarioPreview.costDeltaMinor), scenarioPreview.currencyCode)}.`
      : scenarioPreview.costDeltaMinor > 0
        ? `Alternatif senaryo mevcut plana göre tahmini maliyeti artırıyor: ${formatMoneyMinor(scenarioPreview.costDeltaMinor, scenarioPreview.currencyCode)}.`
        : "Alternatif senaryo mevcut planla aynı tahmini maliyeti gösteriyor."}`
    : scenarioPreview?.status === "INCOMPLETE"
      ? "Kanonik mevcut plan okundu; karşılaştırma için eksik veri var."
      : `${costLevelText(completeness, scenarioPreview)} Kanonik mevcut plan ve finans bağlamı okundu; bu sonuç salt okunur önizlemedir.`;
  const reasonText = [
    currentPlan,
    changed.length ? `Nedensel fark #4 modelindeki şu değişkenlerden geliyor: ${changed.join(", ")}.` : "Değişen senaryo girdisi yok; mevcut plan karşılaştırma tabanı olarak tutuldu.",
    request.questionIntent === "VEHICLE_RECOMMENDATION" && vehicleRecommendation?.reason ? vehicleRecommendation.reason : "",
    request.questionIntent === "VEHICLE_RECOMMENDATION" && capacityVehiclePlan && !vehicleRecommendation ? "Kapasite hesabı kanonik araç kapasitesi ve kişi sayısından türetildi; maliyet önceliği için yeterli yakıt kanıtı yok." : "",
    routeRanking?.status === "READY" ? routeRanking.reason : routeRanking?.reason || "",
    contractProfitability.status === "READY" && request.questionIntent === "CONTRACT_PROFITABILITY" ? `${contractProfitability.sourceLabel} ve kanonik #1 finans çıktısı kullanıldı.` : "",
    fuelIncrease.percent !== null ? (fuelIncrease.applied ? `Yakıt varsayımı #2 referansına göre %${formatNumber(fuelIncrease.percent)} artırıldı.` : `Yakıt için %${formatNumber(fuelIncrease.percent)} varsayımı verildi; baz yakıt fiyatı bulunamadığı için uygulanmadı.`) : "",
  ].filter(Boolean).join(" ");
  const recommendation = request.questionIntent === "VEHICLE_RECOMMENDATION" && vehicleRecommendation
    ? vehicleRecommendation.reason
    : request.questionIntent === "VEHICLE_RECOMMENDATION" && capacityVehiclePlan
      ? "Kapasite planını operasyon yetkilisiyle doğrula; maliyet açısından kesin en iyi seçim iddiası kurmuyorum."
    : request.questionIntent === "MULTI_ROUTE_RANKING" && routeRanking?.status === "READY"
      ? `Önce ${routeRanking.best.label} için yetkili operasyon doğrulaması yap; bu sonuç canlı rota veya atama değişikliği uygulamaz.`
      : request.questionIntent === "CONTRACT_PROFITABILITY" && contractProfitability.status === "READY"
        ? "Sözleşme kararından önce bu read-only farkı yetkili kullanıcıyla doğrula; teklif, sözleşme veya ödeme değişikliği uygulanmaz."
        : request.family === "WHAT_IF_SCENARIO" && !hasScenarioInput
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
    vehicleAlternatives ? `#4 araç planı adayları: ${(vehicleAlternatives.items || []).length} sınıf; öneri yalnız kapasite ve mevcut maliyet kanıtına göre verilir.` : "",
    routeRanking?.status === "READY" ? `#4 çoklu rota karşılaştırması: ${routeRanking.items.length} kanonik rota sıralandı.` : routeRanking?.reason || "",
    canonicalFinancial.commercialContext?.type === "AGREEMENT" ? `Gerçek sözleşme bağlamı: Sözleşme #${canonicalFinancial.commercialContext.id}.` : "Gerçek sözleşme bağlamı bulunmadı; sözleşme kârlılığı kesinleştirilmedi.",
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
    questionIntent: request.questionIntent,
    continuationType: request.continuationType,
    costLevel: completeness.costLevel,
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
      commercialContext: canonicalFinancial.commercialContext || null,
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
        previewStatus: scenarioPreview?.status || null,
        partialCost: scenarioPreview?.scenario?.costMinor != null && scenarioPreview?.costCoverage?.scenario?.status === "PARTIAL",
        dimensions: scenarioPreview?.dimensions || {},
        changedDimensions: scenarioPreview?.changedDimensions || [],
        vehiclePlanAlternatives: vehicleAlternatives,
        evidence: scenarioPreview?.evidence || [],
      },
      costCompleteness: completeness,
      routeRanking,
      commercialProfitability,
      contractProfitability,
      fuelIncrease: { percent: fuelIncrease.percent, applied: fuelIncrease.applied },
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
      routeRankingStatus: routeRanking?.status || null,
      commercialContext: canonicalFinancial.commercialContext || null,
      vehicleRecommendation: vehicleRecommendation || null,
      costLevel: completeness.costLevel,
      includedComponents: completeness.includedComponents,
      missingComponents: completeness.missingComponents,
      provenance: completeness.provenance,
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
    costLevel: completeness.costLevel,
    includedComponents: completeness.includedComponents,
    missingComponents: completeness.missingComponents,
    costProvenance: completeness.provenance,
    costConfidence: completeness.confidence,
    intentConfidence: request.confidence,
    costQuestionIntent: request.questionIntent,
    intentSignals: request.matchedSignals,
    responseSections: sections,
    followUpPrompt: "Aynı bağlamda devam etmek için maliyet, senaryo veya eksik veri sorusunu yazabilirsin.",
    evidenceConfidence: confidenceText,
    roleBoundary: "Bu yanıt yalnızca yetkili kapsamındaki kanonik veriyi okur; kayıt, teklif, rota veya bütçe değiştirmez.",
    costReasoning,
    costAnalysisState: {
      lastIntentFamily: request.family,
      lastIntent: request.intent,
      lastQuestionIntent: request.questionIntent,
      lastContinuationType: request.continuationType,
      lastScreenPath: screenPath,
      lastBaselineReference: baseline?.baselineReference || null,
      lastScope: effectiveScope,
      lastAnswer: shortReply,
      lastRouteRankingStatus: routeRanking?.status || null,
      lastCommercialContextType: canonicalFinancial.commercialContext?.type || "NONE",
      lastGeneratedAt: generatedAt,
    },
    safety: { readOnly: true, previewOnly: true, writeAction: false, noLiveMutation: true, notPersisted: true },
  };
}
