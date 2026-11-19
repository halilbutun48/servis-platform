import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSession } from "../../state/session";
import { navigate } from "../../router";
import { api } from "../../api";
import PanelChrome from "../../components/PanelChrome";
import { getApiErrorInfo } from "../../utils/apiContract";
import { humanizeUserFacingText } from "../../utils/terminology";
import {
  activateCompanyBudgetPlan,
  approveCompanyBudgetPlan,
  archiveCompanyBudgetPlan,
  createCompanyBudgetPlan,
  createRoomQuoteFloorDraft,
  getCurrentCompanyBudgetPlan,
  getCurrentRoomQuoteFloorDraft,
  getCompanyFinancialOperationsPreview,
  getRoomFinancialOperationsPreview,
  autoAllocateRoomCostByCanonicalUsage,
  upsertRoomCostAllocationLine,
  applyRoomQuoteFloorDraft,
  archiveRoomQuoteFloorDraft,
  sendCostedRoomAgreementQuote,
  sendRoomOfferCounter,
  submitCompanyBudgetPlan,
  updateRoomQuoteFloorDraft,
  updateCompanyBudgetPlan,
} from "../../api";
import FinancialOperationsCompanyPreview from "./FinancialOperationsCompanyPreview";
import {
  baselineSourceLabel,
  budgetLifecycleFeedbackLabel,
  confidenceLabel,
  confidenceTone,
  financeFieldLabels,
  fuelCalculationStatusLabel,
  lifecycleStateLabel,
  normalizeFinanceVisibleText,
  buyerFinanceSurfaceSubtitle,
  buyerFinanceSurfaceTitle,
  buyerFinanceTablistLabel,
  buyerRoleLabel,
  preferredScopeSubtitle,
  preferredScopeTitle,
  modelStatusLabel,
  modelStatusTone,
  previewStatusLabel,
  buildDecisionComponentKey,
} from "./financialOperationsPresentation";
import ExternalReferenceCard from "./ExternalReferenceCard";
import CostScenarioWorkspacePanel from "./CostScenarioWorkspacePanel";
import AccountingExportPanel from "./AccountingExportPanel";
import RoomCostLedgerPanel from "./RoomCostLedgerPanel";
import RoomCostSettlementPanel from "./RoomCostSettlementPanel";
import RoomFinanceOverviewPanel from "./RoomFinanceOverviewPanel";
import FinancialOverviewSummary from "./FinancialOverviewSummaryView";
import FinancialPeriodControls from "./FinancialPeriodControls";
import { roomFinanceShellCopy } from "./roomFinanceShell";
import ReconciliationPreviewCard from "../../components/ReconciliationPreviewCard";
import {
  normalizeRoomFinanceView,
  roomFinanceViewPath,
  ROOM_FINANCE_SECTIONS,
} from "./financialOperationsSections";
import {
  serviceContextRelationStatus,
} from "./financialServiceCostContext";
import {
  clearRoomFinanceContextParams,
  clearRoomFinanceContextParamsPreservingOperationalFilters,
  clearRoomFinanceServiceContextParams,
  financeViewUsesFocusedContext,
  roomServiceContextRequiredForView,
  isExpenseEntryContext,
  mergeRoomServiceContextWithoutOverwritingOperationalFilters,
  operationalFilterValuesFromUrl,
  roomExpenseLedgerFocusForView,
  shouldClearRoomServiceContextForOperationalFilterChange,
  vehicleFitLabel,
} from "./financeFocusContext";
import {
  buildRoomDecisionLayerDisplay,
  buildRoomDecisionRequestParams,
  buildPeriodPlanningDisplay,
  resolveSelectedScenarioPeriodPlanning,
  buildRoomProfitabilityDisplay,
  resultToneForMinor,
  effectiveOperationalDecisionCost,
  resolveOperationalDecisionForScope,
  resolveVehicleComparisonCostMinor,
  describePlanningBucket,
  accountingPeriodBlockerLabel,
  accountingPeriodStatusLabel,
} from "./roomProfitabilityPresentation";
import { buildRoomQuoteFloorPresentation, buildRoomQuoteRiskPresentation } from "./financeRiskPresentation.js";
import FinanceRiskBadge from "./FinanceRiskBadge.jsx";
import { roomMarketOfferQuoteReady } from "./roomOfferQuoteReadiness.js";
import { buildRoomQuoteContextFocus, buildRoomQuoteRequestContext } from "./roomQuoteRequestContext";
import { buildRoomScenarioExpectedProfit, normalizeRoomScenarioQuoteBinding, roomQuoteFormForSelectedScenario } from "./roomScenarioQuoteBinding.js";
import {
  listComputableRoomServiceCandidates,
  selectDefaultComputableRoomService,
} from "./roomFinanceDefaultContext";
import {
  classifyServiceCostBlocker,
  buildExpenseFocusTarget,
  expenseMissingFieldLabel,
  expenseMissingFieldActionLabel,
  unallocatedServiceCostAmountMinor,
} from "./roomServiceCostMissingInfo";
import { serviceCostSourcePeriodLabel } from "./serviceCostPeriodPresentation";
import { describeServiceCostDistributionStatus, hasPendingServiceAllocation, hasServiceAllocationEvidence } from "./serviceCostPresentation";
import { buildCompanyFinancialCopilotSelection, buildCompanyFinancialInvoiceCopilotSelection, buildFinancialCopilotSelection, isRoomIncomeFinanceCopilotSelection } from "./financialOperationsCopilot";
import { clearCopilotSelection, readCopilotSelection, setCopilotSelection } from "../../utils/copilotSelection";
import { readCompanyFinancialFocusFromHash } from "./companyFinancialFocus.js";
import {
  buildRoomFinanceOfferOptions,
  roomFinanceOfferDateLabel,
  roomFinanceOfferSearchText,
} from "./roomFinanceOfferSelection.js";

const INPUT_STYLE = {
  width: "100%",
  marginTop: 6,
  borderRadius: 10,
  border: "1px solid rgba(255,255,255,0.12)",
  background: "rgba(255,255,255,0.03)",
  color: "inherit",
  padding: "10px 12px",
  outline: "none",
};

function normalizeText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’‘`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function readRoomCostFocus({ usePersistedRoomSelection = false, consumePersistedRoomSelection = false } = {}) {
  if (typeof window === "undefined") return { vehicleId: null, driverId: null, shiftId: null, agreementId: null, focusOfferId: null, costCategory: null, field: null, expenseFilter: null, focusEntryId: null, periodStart: null, periodEnd: null, filterVehicleId: null, filterDriverId: null, filterPeriodStart: null, filterPeriodEnd: null, operationalScope: null, recordKind: null, prefillVehicleId: null, prefillDriverId: null, manualBaselineOperationalCostMinor: null, targetContributionBps: null, riskReserveBps: null, quoteScenarioAmountMinor: null };
  const hashQuery = String(window.location.hash || "").split("?")[1] || "";
  const query = new URLSearchParams(hashQuery);
  const persistedRoomShiftId = usePersistedRoomSelection
    ? Number(window.localStorage.getItem("room:focusShiftId") || 0)
    : 0;
  const vehicleId = Number(query.get("focusVehicleId") || 0);
  const driverId = Number(query.get("focusDriverId") || 0);
  const shiftId = Number(query.get("focusShiftId") || persistedRoomShiftId || 0);
  const agreementId = Number(query.get("focusAgreementId") || 0);
  const focusOfferId = Number(query.get("focusOfferId") || 0);
  const focusEntryId = Number(query.get("focusEntryId") || 0);
  const prefillVehicleId = Number(query.get("prefillVehicleId") || 0);
  const prefillDriverId = Number(query.get("prefillDriverId") || 0);
  const filterVehicleId = Number(query.get("filterVehicleId") || 0);
  const filterDriverId = Number(query.get("filterDriverId") || 0);
  if (consumePersistedRoomSelection && usePersistedRoomSelection && !query.get("focusShiftId") && persistedRoomShiftId > 0) {
    window.localStorage.removeItem("room:focusShiftId");
  }
  return {
    vehicleId: Number.isSafeInteger(vehicleId) && vehicleId > 0 ? vehicleId : null,
    driverId: Number.isSafeInteger(driverId) && driverId > 0 ? driverId : null,
    shiftId: Number.isSafeInteger(shiftId) && shiftId > 0 ? shiftId : null,
    agreementId: Number.isSafeInteger(agreementId) && agreementId > 0 ? agreementId : null,
    focusOfferId: Number.isSafeInteger(focusOfferId) && focusOfferId > 0 ? focusOfferId : null,
    costCategory: String(query.get("focusCostCategory") || "").trim().toUpperCase() || null,
    field: String(query.get("focusField") || "").trim() || null,
    expenseFilter: String(query.get("expenseFilter") || "").trim().toLowerCase() || null,
    focusEntryId: Number.isSafeInteger(focusEntryId) && focusEntryId > 0 ? focusEntryId : null,
    periodStart: String(query.get("focusPeriodStart") || "").trim() || null,
    periodEnd: String(query.get("focusPeriodEnd") || "").trim() || null,
    filterVehicleId: Number.isSafeInteger(filterVehicleId) && filterVehicleId > 0 ? filterVehicleId : null,
    filterDriverId: Number.isSafeInteger(filterDriverId) && filterDriverId > 0 ? filterDriverId : null,
    filterPeriodStart: String(query.get("filterPeriodStart") || "").trim() || null,
    filterPeriodEnd: String(query.get("filterPeriodEnd") || "").trim() || null,
    operationalScope: String(query.get("operationalScope") || "").trim().toLowerCase() || null,
    recordKind: ["ACTUAL", "BUDGET", "FORECAST", "ACCRUAL"].includes(String(query.get("focusRecordKind") || "").trim().toUpperCase())
      ? String(query.get("focusRecordKind") || "").trim().toUpperCase()
      : null,
    prefillVehicleId: Number.isSafeInteger(prefillVehicleId) && prefillVehicleId > 0 ? prefillVehicleId : null,
    prefillDriverId: Number.isSafeInteger(prefillDriverId) && prefillDriverId > 0 ? prefillDriverId : null,
    manualBaselineOperationalCostMinor: String(query.get("manualBaselineOperationalCostMinor") || "").trim() || null,
    targetContributionBps: String(query.get("targetContributionBps") || "").trim() || null,
    riskReserveBps: String(query.get("riskReserveBps") || "").trim() || null,
    quoteScenarioAmountMinor: String(query.get("quoteScenarioAmountMinor") || "").trim() || null,
    contextSource: String(query.get("contextSource") || "").trim() || null,
    returnTo: String(query.get("returnTo") || "").trim() || null,
  };
}

function roomServiceContextFromFocus(focus = {}) {
  return {
    vehicleId: focus.vehicleId || null,
    driverId: focus.driverId || null,
    shiftId: focus.shiftId || null,
    agreementId: focus.agreementId || null,
    periodStart: dateInputValue(focus.periodStart) || null,
    periodEnd: dateInputValue(focus.periodEnd) || null,
  };
}

function readPersistedRoomServiceContext(roomId) {
  if (typeof window === "undefined" || !roomId) return null;
  try {
    const raw = window.sessionStorage.getItem(`seferpakt:room-service-context:${roomId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? roomServiceContextFromFocus(parsed) : null;
  } catch {
    return null;
  }
}

function writePersistedRoomServiceContext(roomId, context) {
  if (typeof window === "undefined" || !roomId || !context) return;
  try {
    window.sessionStorage.setItem(`seferpakt:room-service-context:${roomId}`, JSON.stringify(roomServiceContextFromFocus(context)));
  } catch {
    // Session storage is a convenience; URL state remains canonical for the active view.
  }
}

function clearPersistedRoomServiceContext(roomId) {
  if (typeof window === "undefined" || !roomId) return;
  try {
    window.sessionStorage.removeItem(`seferpakt:room-service-context:${roomId}`);
  } catch {
    // Session storage is a convenience; the URL remains canonical.
  }
}

function readRoomFinanceView() {
  if (typeof window === "undefined") return "overview";
  const hashQuery = String(window.location.hash || "").split("?")[1] || "";
  return normalizeRoomFinanceView(new URLSearchParams(hashQuery).get("view"));
}

function readCompanyBudgetPlanQueryInput() {
  if (typeof window === "undefined") return "";
  const hashQuery = String(window.location.hash || "").split("?")[1] || "";
  const budgetPlanId = Number(new URLSearchParams(hashQuery).get("budgetPlanId") || 0);
  return Number.isSafeInteger(budgetPlanId) && budgetPlanId > 0 ? String(budgetPlanId) : "";
}

function readCompanyIncomeInvoiceQueryInput() {
  if (typeof window === "undefined") return "";
  return readCompanyFinancialFocusFromHash(window.location.hash).focusInvoiceId || "";
}

function writeCompanyIncomeInvoiceQuery(invoiceLink = null) {
  if (typeof window === "undefined") return;
  const invoiceId = Number(invoiceLink?.invoiceId || 0);
  if (!Number.isSafeInteger(invoiceId) || invoiceId <= 0) return;
  const hash = String(window.location.hash || "");
  const [routePart, queryPart = ""] = hash.split("?", 2);
  const params = new URLSearchParams(queryPart);
  params.set("focusInvoiceId", String(invoiceId));
  const agreementId = Number(invoiceLink?.agreementId || 0);
  if (Number.isSafeInteger(agreementId) && agreementId > 0) params.set("focusAgreementId", String(agreementId));
  const nextHash = `${routePart || "#/company/financial-operations"}?${params.toString()}`;
  if (nextHash !== hash) window.history.replaceState(window.history.state, "", `${window.location.pathname}${window.location.search}${nextHash}`);
}

function formatTRY(value) {
  if (value === null || value === undefined || String(value).trim() === "") return "-";
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  const major = n / 100;
  return `${new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(major)} ₺`;
}

function formatMinorInput(value) {
  if (value === null || value === undefined || String(value).trim() === "") return "";
  const n = Number(value);
  return Number.isFinite(n) ? String(n / 100) : "";
}

function parseMajorInput(value) {
  const text = String(value ?? "").trim().replace(",", ".");
  if (!text) return "";
  const n = Number(text);
  return Number.isFinite(n) && n >= 0 ? String(Math.round(n * 100)) : "";
}

function dateInputValue(value) {
  const text = String(value ?? "").trim();
  return text ? text.slice(0, 10) : "";
}

function formatPeople(value) {
  if (value === null || value === undefined || String(value).trim() === "") return "Belirtilmedi";
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return "Belirtilmedi";
  return `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(n)} kişi`;
}

function formatBps(value) {
  if (value === null || value === undefined || String(value).trim() === "") return "-";
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return `%${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2 }).format(n / 100)}`;
}

function formatBpsInput(value) {
  if (value === null || value === undefined || String(value).trim() === "") return "";
  const n = Number(value);
  return Number.isFinite(n) ? String(n / 100) : "";
}

function parseBpsInput(value) {
  const text = String(value ?? "").trim().replace(",", ".");
  if (!text) return "";
  const n = Number(text);
  return Number.isFinite(n) ? String(Math.round(n * 100)) : "";
}

function formatTextOrDash(value) {
  const text = String(value ?? "").trim();
  return text || "-";
}

function visibleText(value, fallback = "-") {
  const text = normalizeFinanceVisibleText(String(value ?? "").trim());
  return text || fallback;
}

function MetricCard({ title, value, note, tone = "default", className = "", dataScope }) {
  const palette = {
    default: { border: "1px solid rgba(255,255,255,0.08)", title: "#98a2b3", value: "#f8fafc" },
    muted: { border: "1px solid rgba(152,162,179,0.28)", title: "#98a2b3", value: "#b8c0cc" },
    warm: { border: "1px solid rgba(247,144,9,0.35)", title: "#f7b267", value: "#ffd38a" },
    good: { border: "1px solid rgba(18,183,106,0.35)", title: "#6ce9a6", value: "#d1fadf" },
    danger: { border: "1px solid rgba(240,68,56,0.35)", title: "#fda29b", value: "#fecaca" },
  }[tone] || {
    border: "1px solid rgba(255,255,255,0.08)",
    title: "#98a2b3",
    value: "#f8fafc",
  };

  return (
    <div
      className={`pre18-finance-metric ${className}`.trim()}
      data-finance-metric-scope={dataScope || undefined}
      style={{ padding: 14, border: palette.border, borderRadius: 12, minWidth: 0 }}
    >
      <div className="panelSectionTitle" style={{ marginBottom: 8, color: palette.title }}>{title}</div>
      <div className="panelStatValue" style={{ color: palette.value }}>{value}</div>
      {note ? <div className="panelMeta" style={{ marginTop: 8, lineHeight: 1.45 }}>{note}</div> : null}
    </div>
  );
}

function RoomMonthlyPriceReferenceCard({ reference = null, quoteFloor = null, quoteFloorPresentation = null }) {
  if (!reference) return null;
  const current = reference.currentPeriod || {};
  const displayedPlanningCostMinor = current.estimatedCostMinor ?? quoteFloor?.baselineOperationalCostMinor ?? null;
  const displayedQuoteFloorMinor = current.quoteFloorMinor ?? quoteFloor?.quoteFloorMinor ?? null;
  const pricePresentation = quoteFloorPresentation || buildRoomQuoteFloorPresentation({
    quoteFloor: { computed: false },
  });
  const historical = reference.historicalReference || null;
  const commercialReference = reference.commercialReference || null;
  const selectedNegotiationEvidence = reference.negotiationEvidence || null;
  const selectedOperationalEvidence = reference.operationalEvidence || null;
  const platformReference = reference.platformReference || null;
  const stored = reference.storedPlanningScenario || null;
  const risk = reference.risk || {
    tone: "muted",
    status: "GRAY",
    icon: "○",
    label: "Ekonomik kanıt eksik",
    description: "Hizmet maliyeti ve fiyat referansı için yeterli veri yok.",
  };
  const components = Array.isArray(reference.currentCostComponents) ? reference.currentCostComponents : [];
  const factors = Array.isArray(reference.factors) ? reference.factors : [];
  const assumptions = Array.isArray(reference.assumptions) ? reference.assumptions : [];
  const missing = Array.isArray(reference.missing) ? reference.missing : [];
  const comparison = reference.comparison || {};
  const monthlyCostChange = reference.monthlyCostChange || null;
  const negotiationEvidence = historical?.negotiationEvidence || null;
  const operationalEvidence = historical?.operationalEvidence || null;
  const platformAverageMinor = platformReference?.value?.averageAmountMinor ?? platformReference?.value?.medianAmountMinor ?? null;
  const platformRange = platformReference?.value?.range || null;
  const platformReady = platformReference?.status === "READY" && platformAverageMinor != null;
  const platformIsControlledDemo = platformReady && platformReference?.value?.controlledDemoOnly === true;
  const periodLabel = current.periodStart && current.periodEnd
    ? serviceContextDateRange(current.periodStart, current.periodEnd)
    : "Belirsiz dönem";
  const futurePeriod = isFutureServicePeriod(current.periodStart);
  return (
    <div className="card" data-testid="room-monthly-price-reference" style={{ marginTop: 12, border: risk.tone === "good" ? "1px solid rgba(18,183,106,0.35)" : "1px solid rgba(152,162,179,0.35)" }}>
      <div className="panelSectionTitle">Hizmet maliyeti ve fiyat referansı</div>
      <div data-testid="room-selected-service-period" style={{ marginTop: 10 }}>
        <MetricCard
          title="Seçili hizmet dönemi"
          value={serviceContextDateRange(current.periodStart, current.periodEnd)}
          note="Aşağıdaki tutarlar yalnızca bu tarihler için geçerlidir; haftalık hesap aylık toplam değildir."
        />
      </div>
      {futurePeriod ? (
        <div className="panelMeta" data-testid="room-future-service-period" style={{ marginTop: 8, color: "#f7b267" }}>
          Bu, henüz başlamamış planlı DEMO hizmet dönemidir. Aşağıdaki maliyet tahmindir; gerçekleşen gider toplamına dahil değildir.
        </div>
      ) : null}
      <div data-testid="room-monthly-price-reference-primary-summary" style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8 }}>
        <MetricCard
          className="room-monthly-price-reference-primary-metric"
           title={pricePresentation.costLabel}
           value={displayedPlanningCostMinor == null ? "Belirsiz" : formatTRY(displayedPlanningCostMinor)}
           note={pricePresentation.costNote}
           tone={displayedPlanningCostMinor == null ? "muted" : "warm"}
        />
        <MetricCard
          className="room-monthly-price-reference-primary-metric"
           title={pricePresentation.quoteLabel}
           value={displayedQuoteFloorMinor == null ? "Belirsiz" : formatTRY(displayedQuoteFloorMinor)}
           note={pricePresentation.quoteNote}
           tone={displayedQuoteFloorMinor == null ? "muted" : "warm"}
        />
      </div>
      <div
        className="card"
        data-testid="room-platform-price-reference-card"
        style={{ marginTop: 12, border: platformReady ? "1px solid rgba(18,183,106,0.35)" : "1px solid rgba(152,162,179,0.35)" }}
      >
        <div data-testid="room-platform-price-reference" className="panelSectionTitle">SeferPakt geçmiş anlaşma referansı</div>
        <div className="panelMeta" style={{ marginTop: 6, lineHeight: 1.45 }}>
          {platformReady
            ? platformIsControlledDemo
              ? "Kontrollü DEMO platform geçmiş anlaşma referansı; canlı platform ortalaması değildir."
              : "Onaylı politika ve bağımsız ROOM kanıtı bulunan anonim toplulaştırılmış geçmiş anlaşma referansı."
            : "Platform geçmiş anlaşma referansı şu anda kapalı; onaylı politika ve yeterli bağımsız ROOM kanıtı olmadan ortalama gösterilmez."}
        </div>
        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
          <div data-testid="room-platform-price-reference-average">
            <MetricCard
              title="Ortalama anlaşma bedeli"
              value={platformReady ? formatTRY(platformAverageMinor) : "Kapalı"}
              note={platformIsControlledDemo ? "DEMO toplulaştırılmış sonuç" : "Anonim toplulaştırılmış sonuç"}
              tone={platformReady ? "good" : "muted"}
            />
          </div>
          <div data-testid="room-platform-price-reference-range">
            <MetricCard
              title="Fiyat aralığı"
              value={platformReady && platformRange?.minMinor != null && platformRange?.maxMinor != null
                ? `${formatTRY(platformRange.minMinor)} – ${formatTRY(platformRange.maxMinor)}`
                : "Kapalı"}
              note={platformReady ? "Karşılaştırılabilir kabul edilmiş anlaşmalar" : "Yeterli kanıt yok"}
              tone={platformReady ? "default" : "muted"}
            />
          </div>
          <MetricCard
            title="Kanıtlı örneklem"
            value={platformReady ? `${platformReference.value?.sampleCount ?? "-"} ROOM` : "Kapalı"}
            note={platformReady ? "Bağımsız ROOM sayısı" : "Politika kapısı kapalı"}
            tone={platformReady ? "default" : "muted"}
          />
        </div>
      </div>
      <div className="panelMeta" style={{ marginTop: 6, lineHeight: 1.45 }}>
        Seçili dönemin planlama tahmini, varsa geçmiş ROOM anlaşması ve kayıtlı senaryo ayrı tutulur. Bu kart gerçekleşmiş gider veya kesin net kâr değildir.
      </div>
      <div style={{ marginTop: 10 }}>
        <FinanceRiskBadge risk={risk} testId="room-monthly-price-reference-risk" />
      </div>
      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8 }}>
        <MetricCard
          title="Kabul edilmiş sözleşme fiyatı"
          value={commercialReference?.status === "READY" && commercialReference.amountMinor != null ? formatTRY(commercialReference.amountMinor) : "Belirsiz"}
          note={commercialReference?.status === "READY"
            ? "Kabul kaydından okunur; gerçekleşmiş gider değildir"
            : "Kabul kaydı bulunmadı; tek teklif alanı nihai fiyat sayılmadı"}
          tone={commercialReference?.status === "READY" ? "default" : "muted"}
        />
        <MetricCard
          title="Geçmiş ROOM anlaşması — Kabul edilmiş geçmiş ticari fiyat"
          value={historical ? formatTRY(historical.amountMinor) : "Belirsiz"}
          note={historical ? `${serviceContextDateRange(historical.periodStart, historical.periodEnd)} · ${historical.comparabilityLabel} · Gerçekleşmiş gider değildir` : "Geçmiş benzer anlaşma yok; güncel hesap bağımsız hazırlanır"}
          tone={historical ? "default" : "muted"}
        />
        <MetricCard
          title="Hizmet dönemi"
          value={periodLabel}
          note={`${current.plannedMovementCount ?? "Belirsiz"} planlı hareket · ${current.observedLinkedShiftCount ?? "Belirsiz"} gözlenen bağlı vardiya`}
        />
      </div>
      {current.estimatedCostMinor == null && current.knownPartialCostMinor != null ? (
        <div className="panelMeta" data-testid="room-monthly-price-reference-known-partial" style={{ marginTop: 8 }}>
          Bilinen rota ve yakıt kısmı: <strong>{formatTRY(current.knownPartialCostMinor)}</strong>. Bu tutar tam dönem maliyeti değildir ve teklif tabanı yerine kullanılmaz.
        </div>
      ) : null}
      {stored ? (
        <div data-testid="room-monthly-price-reference-stored-scenario" style={{ marginTop: 10, padding: 12, border: "1px solid rgba(247,144,9,0.28)", borderRadius: 10 }}>
          <div className="panelSectionTitle">Önceki kayıtlı planlama senaryosu</div>
          <div className="panelMeta" style={{ marginTop: 6, lineHeight: 1.45 }}>
            Bu kayıtlı varsayım güncel gerçekleşmiş gider değildir; güncel fiyat hesabının yerine kendiliğinden kullanılmaz.
          </div>
          <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8 }}>
            <MetricCard title="Senaryo tahmini maliyeti" value={formatTRY(stored.estimatedCostMinor)} note={serviceContextDateRange(stored.periodStart, stored.periodEnd)} tone="warm" />
            <MetricCard title="Senaryo teklif tabanı" value={formatTRY(stored.quoteFloorMinor)} note="Kayıtlı planlama sonucudur" tone="warm" />
            {stored.scenarioOfferMinor != null ? <MetricCard title="Senaryo teklif tutarı" value={formatTRY(stored.scenarioOfferMinor)} note="Kullanıcı senaryosu" /> : null}
            {stored.expectedDifferenceMinor != null ? <MetricCard title="Senaryo beklenen farkı" value={formatTRY(stored.expectedDifferenceMinor)} note="Gerçekleşmiş kâr değildir" tone={stored.expectedDifferenceMinor < 0 ? "danger" : "warm"} /> : null}
          </div>
          {stored.assumptions?.length ? <div className="panelMeta" style={{ marginTop: 8 }}>Bu senaryonun varsayımları: {normalizeFinanceVisibleText(stored.assumptions.join(" "))}</div> : null}
        </div>
      ) : null}
      {reference.referenceMissing?.length ? <div className="panelMeta" data-testid="room-monthly-price-reference-history-note" style={{ marginTop: 8 }}>{reference.referenceMissing.join(" ")}</div> : null}
      <div className="panelMeta" data-testid="room-monthly-price-reference-selected-evidence" style={{ marginTop: 8 }}>
        <strong>Seçili anlaşma kanıtı:</strong> Pazarlık {selectedNegotiationEvidence?.status === "RECORDED" ? "kayıtlı" : "sınırlı veya doğrulanmadı"}; gerçekleşmiş operasyon gideri {selectedOperationalEvidence?.actualCostEvidence === "VERIFIED" ? "doğrulandı" : "doğrulanmadı"}. Ticari fiyat ile gerçekleşmiş gider ayrı tutulur.
      </div>
      {historical ? (
        <div className="panelMeta" data-testid="room-monthly-price-reference-commercial-evidence" style={{ marginTop: 8 }}>
          <strong>Ticari kanıt:</strong> Bu tutar kabul edilmiş anlaşma fiyatıdır; gerçekleşmiş gider veya kesin net kâr değildir.
          {negotiationEvidence?.status !== "RECORDED" ? " Pazarlık adımlarının tamamı kayıtlı değil; tarihçe sınırlı kanıttır." : " Pazarlıkta bulunan kayıtlar ayrı tutuldu."}
          {operationalEvidence?.actualCostEvidence !== "VERIFIED" ? " Gerçekleşmiş gider kanıtı ayrıca doğrulanmadı." : " Gerçekleşmiş gider kanıtı ayrıca doğrulandı."}
        </div>
      ) : null}
      {historical?.comparabilityNote ? <div className="panelMeta" style={{ marginTop: 8 }}>{historical.comparabilityNote}</div> : null}
      <div className="panelMeta" data-testid="room-monthly-price-reference-comparison-note" style={{ marginTop: 8 }}>
        {comparison.status === "READY"
          ? "Karşılaştırılabilir geçmiş kayıtla dönem farkı hesaplandı; bu sonuç güncel maliyet ve teklif tabanından ayrı bir referanstır."
          : historical
            ? "Geçmiş kayıt kapsamı tam doğrulanmadığı için fiyat farkı, yüzde değişimi veya kilometre başı referans hesaplanmadı."
            : "Karşılaştırılabilir geçmiş anlaşma bulunmadı; güncel fiyat hesabı geçmiş fiyata bağlı değildir."}
      </div>
      {monthlyCostChange?.status === "READY" ? (
        <div data-testid="room-monthly-price-reference-cost-change" style={{ marginTop: 10, padding: 12, border: "1px solid rgba(247,144,9,0.28)", borderRadius: 10 }}>
          <div className="panelSectionTitle">Aylık maliyet değişimi</div>
          <div className="panelMeta" style={{ marginTop: 6, lineHeight: 1.45 }}>
            Bu değişim aynı hizmet kapsamındaki iki onaylı dönem önizlemesinden hesaplandı; geçmiş anlaşma fiyatı ve gerçekleşmiş gider değildir.
          </div>
          <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8 }}>
            <MetricCard title="Önceki dönem maliyeti" value={formatTRY(monthlyCostChange.historicalPeriodCostMinor)} note="Karşılaştırma dönemi" />
            <MetricCard title="Güncel dönem maliyeti" value={formatTRY(monthlyCostChange.currentPeriodCostMinor)} note={monthlyCostChange.costChangePercentBps == null ? "Değişim oranı belirsiz" : `${formatBps(monthlyCostChange.costChangePercentBps)} değişim`} tone="warm" />
          <MetricCard title="Teklif tabanı değişimi" value={formatTRY(monthlyCostChange.quoteFloorDifferenceMinor)} note="Güncel önerilen en düşük teklif − önceki dönem" tone="warm" />
          </div>
          {monthlyCostChange.components?.length ? (
            <div className="panelMeta" style={{ marginTop: 8 }}>
              <strong>Aylık değişimi oluşturan giderler:</strong> {monthlyCostChange.components.map((component) => `${component.label}: ${formatTRY(component.differenceMinor)}`).join(" · ")}
            </div>
          ) : null}
        </div>
      ) : null}
      {factors.length ? (
        <div className="panelMeta" data-testid="room-monthly-price-reference-factors" style={{ marginTop: 8 }}>
          <strong>Fiyatı etkileyen kapsam:</strong> {factors.join(" ")}
        </div>
      ) : null}
      {components.length ? (
        <details style={{ marginTop: 8 }}>
          <summary className="panelMeta" style={{ cursor: "pointer" }}>Maliyet bileşenlerini göster</summary>
          <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
            {components.map((component) => (
              <div key={`${component.label}-${component.statusLabel}`} className="panelMeta" style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start" }}>
                <span>
                  {component.label} · {component.statusLabel}
                  <span style={{ display: "block", marginTop: 2 }}>{component.sourceLabel}{component.costKindLabel ? ` · ${component.costKindLabel}` : ""}</span>
                  {component.note ? <span style={{ display: "block", marginTop: 2 }}>{component.note}</span> : null}
                </span>
                <strong>{component.amountMinor == null ? "Belirsiz" : formatTRY(component.amountMinor)}</strong>
              </div>
            ))}
          </div>
        </details>
      ) : null}
      {assumptions.length ? <div className="panelMeta" data-testid="room-monthly-price-reference-assumptions" style={{ marginTop: 8 }}>Planlama notu: {normalizeFinanceVisibleText(assumptions.join(" "))}</div> : null}
      {missing.length ? <div className="panelMeta" data-testid="room-monthly-price-reference-missing" style={{ marginTop: 8 }}>Eksik veya doğrulanmamış bilgi: {missing.join(", ")}</div> : null}
    </div>
  );
}

function directoryVehicleLabel(vehicle) {
  return String(vehicle?.plate || vehicle?.name || "Araç kaydı").trim();
}

function directoryDriverLabel(driver) {
  return String(driver?.fullName || driver?.name || driver?.displayName || "Sürücü kaydı").trim();
}

function OperationalFilterBar({ focus = {}, directory = {}, onChange }) {
  const vehicles = Array.isArray(directory.vehicles) ? directory.vehicles : [];
  const drivers = Array.isArray(directory.drivers) ? directory.drivers : [];
  const hasPeriod = Boolean(focus.filterPeriodStart || focus.filterPeriodEnd);
  const active = Boolean(focus.operationalScope === "realized" || hasPeriod || focus.filterVehicleId || focus.filterDriverId);
  return (
    <div className="card room-operational-filter-bar" data-testid="room-operational-filter-bar" style={{ marginTop: 12, border: "1px solid rgba(98,117,255,0.26)" }}>
      <div className="panelSectionTitle">Gerçekleşen operasyonu filtrele</div>
      <div className="panelMeta" style={{ marginTop: 6, lineHeight: 1.45 }}>
        Dönem, araç ve sürücü seçimi yalnız görünümü filtreler.
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginTop: 12 }}>
        <FinancialPeriodControls
          prefix="gerçekleşen"
          compact
          periodStart={focus.filterPeriodStart || ""}
          periodEnd={focus.filterPeriodEnd || ""}
          onChange={onChange}
          style={{ gridColumn: "1 / -1" }}
        />
        <label className="muted">
          Araç
          <select
            aria-label="Gerçekleşen araç filtresi"
            data-testid="operational-vehicle-filter"
            value={focus.filterVehicleId || ""}
            onChange={(event) => onChange?.({ vehicleId: event.target.value || null })}
            style={INPUT_STYLE}
          >
            <option value="">Tüm araçlar</option>
            {vehicles.map((vehicle) => <option key={vehicle.id} value={vehicle.id}>{directoryVehicleLabel(vehicle)}</option>)}
          </select>
        </label>
        <label className="muted">
          Sürücü
          <select
            aria-label="Gerçekleşen sürücü filtresi"
            data-testid="operational-driver-filter"
            value={focus.filterDriverId || ""}
            onChange={(event) => onChange?.({ driverId: event.target.value || null })}
            style={INPUT_STYLE}
          >
            <option value="">Tüm sürücüler</option>
            {drivers.map((driver) => <option key={driver.id} value={driver.id}>{directoryDriverLabel(driver)}</option>)}
          </select>
        </label>
      </div>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 10 }}>
        <span className="panelMeta">
           {active ? "Seçili kapsam uygulanıyor." : "Dönem seçerek sonuçları görüntüleyin."}
        </span>
        {active ? (
          <button type="button" className="btn sm ghost" data-testid="operational-filter-clear" onClick={() => onChange?.({ clear: true })}>
            Filtreyi temizle
          </button>
        ) : null}
      </div>
    </div>
  );
}

function roomFinanceOfferOptionValue(option) {
  if (!option) return "";
  return option.kind === "OFFER" ? `offer:${option.offerId}` : `request:${option.shiftId}`;
}

function RoomFinanceOfferSelector({ options = [], selectedValue = "", onChange }) {
  const [query, setQuery] = useState("");
  const normalizedQuery = String(query || "").trim().toLocaleUpperCase("tr-TR");
  const matchingOptions = normalizedQuery
    ? options.filter((option) => roomFinanceOfferSearchText(option).includes(normalizedQuery))
    : options;
  const selectedOption = options.find((option) => roomFinanceOfferOptionValue(option) === selectedValue) || null;
  const visibleOptions = selectedOption && !matchingOptions.some((option) => roomFinanceOfferOptionValue(option) === selectedValue)
    ? [selectedOption, ...matchingOptions]
    : matchingOptions;

  return (
    <div className="card room-finance-offer-selector" data-testid="room-finance-offer-selector" style={{ marginTop: 12, border: "1px solid rgba(98,117,255,0.32)" }}>
      <div className="panelSectionTitle">Teklif seç veya ara</div>
      <div className="panelMeta" style={{ marginTop: 6, lineHeight: 1.45 }}>
        Yeni işler ve hâlâ düzenlenebilen teklifler burada görünür. Kabul edilmiş veya sözleşmeye bağlanmış işler bu listeden çıkarılır.
      </div>
      <label className="muted" style={{ display: "block", marginTop: 10 }}>
        Teklif no, firma veya iş adı
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Örn. 15, DemoRoom veya rota adı"
          aria-label="Teklif no, firma veya iş adı ara"
          data-testid="room-finance-offer-search"
          style={INPUT_STYLE}
        />
      </label>
      <div className="muted" style={{ display: "block", marginTop: 10 }}>
        <div>Açık iş / teklif</div>
        {selectedOption ? (
          <div className="room-finance-offer-selected" role="status" data-testid="room-finance-offer-selected" style={{ marginTop: 6 }}>
            <strong>{selectedOption.kind === "OFFER" ? `Teklif #${selectedOption.offerId}` : `Yeni iş #${selectedOption.shiftId}`}</strong>
            <span> · {selectedOption.companyName} · {selectedOption.workName} · {roomFinanceOfferDateLabel(selectedOption)}</span>
            <button
              type="button"
              className="btn sm ghost"
              data-testid="room-finance-offer-clear"
              style={{ marginLeft: 8 }}
              onClick={() => onChange?.(null)}
            >
              Seçimi temizle
            </button>
          </div>
        ) : null}
        <div
          role="listbox"
          aria-label="Teklif seç veya ara"
          data-testid="room-finance-offer-options"
          style={{ display: "grid", gap: 6, marginTop: 8 }}
        >
          {visibleOptions.length ? visibleOptions.map((option) => {
            const value = roomFinanceOfferOptionValue(option);
            const isSelected = value === selectedValue;
            return (
              <button
                type="button"
                role="option"
                aria-selected={isSelected}
                data-testid={`room-finance-offer-option-${value}`}
                key={value}
                className={isSelected ? "btn primary" : "btn"}
                style={{ width: "100%", textAlign: "left", minHeight: 42 }}
                onClick={() => onChange?.(option)}
              >
                {option.kind === "OFFER" ? `Teklif #${option.offerId}` : `Yeni iş #${option.shiftId}`} · {option.companyName} · {option.workName} · {roomFinanceOfferDateLabel(option)}
              </button>
            );
          }) : (
            <div className="panelMeta" role="status">Teklif veya açık iş seçin.</div>
          )}
        </div>
      </div>
      {!options.length ? (
        <div className="panelMeta" role="status" data-testid="room-finance-offer-empty" style={{ marginTop: 8 }}>
          Şu anda teklif hazırlanabilecek açık iş bulunmuyor.
        </div>
      ) : normalizedQuery && !matchingOptions.length ? (
        <div className="panelMeta" role="status" style={{ marginTop: 8 }}>
          Aramanızla eşleşen açık iş veya teklif bulunamadı.
        </div>
      ) : null}
    </div>
  );
}

function OperationalDecisionSummary({ decision, costOverrideMinor = null, costNote = "Tek ekonomik kaynak", serviceCostPresentation = false }) {
  const source = decision && typeof decision === "object" ? decision : null;
  if (!source || source.status === "PERIOD_REQUIRED") {
    return (
      <div className="card" data-testid="room-operational-decision-empty" style={{ marginTop: 12 }}>
        <div className="panelSectionTitle">Gerçekleşen çalışma özeti</div>
        <div className="panelMeta" style={{ marginTop: 6 }}>Dönem seçildiğinde tamamlanmış sefer, çalışma süresi, kilometre ve maliyet payları burada görünür.</div>
      </div>
    );
  }
  const display = buildRoomDecisionLayerDisplay({
    vehicleMonthDecision: source,
    requireVehicleIncomeAttribution: !serviceCostPresentation,
  }).vehicle;
  const displayedCostMinor = effectiveOperationalDecisionCost({ decision: source, costOverrideMinor });
  const earnedRevenueMinor = display.earnedIncomeMinor;
  const hasEarnedRevenue = earnedRevenueMinor != null;
  const usageHours = display.verifiedUsageMinutes == null ? "Belirsiz" : `${(Number(display.verifiedUsageMinutes) / 60).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} saat`;
  const distanceKm = display.verifiedDistanceM == null ? "Belirsiz" : `${(Number(display.verifiedDistanceM) / 1000).toLocaleString("tr-TR", { maximumFractionDigits: 2 })} km`;
  const customerNames = display.customerLabels.map((item) => item.name).filter(Boolean);
  const activityResultLabel = display.activityResultMinor == null ? "Hesaplanamıyor" : decisionAmount(display.activityResultMinor);
  const activityResultNote = hasEarnedRevenue
    ? "Geçici sonuç; kesin net kâr değildir"
    : "Gelir kaydı olmadan kârlılık gösterilmez";
  const operationalBlockerNote = display.activityResultMinor == null
    ? "Faaliyet sonucu için gelir ve maliyet kapsamı tamamlanmalı."
    : display.blockerLabels.join(" · ");
  return (
    <div className="card" data-testid="room-operational-decision-summary" style={{ marginTop: 12, border: "1px solid rgba(18,183,106,0.24)" }}>
      <div className="panelSectionTitle">Gerçekleşen çalışma özeti</div>
      <div className="panelMeta" style={{ marginTop: 6 }}>
        {source.periodStart || "Dönem"} – {source.periodEnd || "belirtilmedi"} · {display.realizedOnly ? "Yalnız tamamlanmış seferler" : "Seçili operasyon kapsamı"}
      </div>
      {serviceCostPresentation ? (
        <>
          <div className="finance-service-cost-primary-metrics" data-finance-metric-group="primary">
            <MetricCard title="Gerçekleşmiş gider" value={decisionAmount(displayedCostMinor)} note={costNote} tone={displayedCostMinor == null ? "muted" : "default"} />
            {hasEarnedRevenue ? <MetricCard title="Kazanılmış gelir" value={decisionAmount(earnedRevenueMinor)} note="Hak edilmiş dönem geliri" tone="good" /> : null}
            <MetricCard title="Geçici faaliyet sonucu" value={activityResultLabel} note={activityResultNote} tone={display.activityResultMinor == null ? "muted" : resultToneForMinor(display.activityResultMinor)} />
          </div>
          <details className="finance-service-cost-evidence" data-finance-metric-group="evidence">
            <summary className="panelMeta">Operasyon kanıtını göster</summary>
            <div className="finance-service-cost-evidence-grid">
              <MetricCard title="Gerçekleşen sefer" value={display.realizedShiftCount ?? "Belirsiz"} note="Tamamlanmış vardiya" tone="good" />
              <MetricCard title="Doğrulanmış çalışma" value={usageHours} note="Kayıtlı gerçekleşen süre" tone="default" />
              <MetricCard title="Doğrulanmış mesafe" value={distanceKm} note="Kayıtlı rota mesafesi" tone="default" />
            </div>
          </details>
        </>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8, marginTop: 10 }}>
          <MetricCard title="Gerçekleşen sefer" value={display.realizedShiftCount ?? "Belirsiz"} note="Tamamlanmış vardiya" tone="good" />
          <MetricCard title="Doğrulanmış çalışma" value={usageHours} note="Kayıtlı gerçekleşen süre" tone="default" />
          <MetricCard title="Doğrulanmış mesafe" value={distanceKm} note="Kayıtlı rota mesafesi" tone="default" />
          <MetricCard title="Gerçekleşmiş gider" value={decisionAmount(displayedCostMinor)} note={costNote} tone={displayedCostMinor == null ? "muted" : "default"} />
          {hasEarnedRevenue ? <MetricCard title="Kazanılmış gelir" value={decisionAmount(earnedRevenueMinor)} note="Hak edilmiş dönem geliri" tone="good" /> : null}
          <MetricCard title="Faaliyet sonucu" value={activityResultLabel} note={activityResultNote} tone={display.activityResultMinor == null ? "muted" : resultToneForMinor(display.activityResultMinor)} />
        </div>
      )}
      <div className="panelMeta" style={{ marginTop: 10 }}>
        Hizmet alan müşteriler: <strong>{customerNames.length ? customerNames.join(", ") : "Kayıtlı müşteri ilişkisi yok"}</strong>
      </div>
      {operationalBlockerNote ? <div className="panelMeta" style={{ marginTop: 6, color: "#f7b267" }}>{operationalBlockerNote}</div> : null}
    </div>
  );
}

const ROOM_FINANCE_COPY = Object.freeze({
  overview: {
    title: "Genel Durum",
    subtitle: "Ne harcıyorum, ne kazanıyorum ve sıradaki adım.",
  },
  expenses: {
    title: "Giderlerim",
    subtitle: "Gerçekleşen giderleri doğru araç, sürücü ve dönemle yönetin.",
  },
  "service-cost": {
    title: "Servis Maliyeti",
    subtitle: "Bir servis veya vardiyanın kanıtlanmış maliyet kapsamını görün.",
  },
  "quote-profitability": {
    title: "Teklif Değerlendir",
    subtitle: "Açık işi seçin, uygun aracı karşılaştırın ve teklifinizi gönderin.",
  },
});

function ChipRow({ items = [], emptyText = "-" }) {
  const chips = Array.isArray(items) ? items.map((item) => String(item || "").trim()).filter(Boolean) : [];
  if (!chips.length) return <div className="muted" style={{ marginTop: 6 }}>{emptyText}</div>;
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
      {chips.map((item) => (
        <span key={item} className="pill">{item}</span>
      ))}
    </div>
  );
}

function MissingDataAction({ title, description, actionLabel, onClick }) {
  return (
    <div className="card" data-finance-missing-action={title} style={{ minWidth: 0, border: "1px solid rgba(247,144,9,0.3)" }}>
      <div className="panelSectionTitle">{title}</div>
      <div className="muted" style={{ marginTop: 6, lineHeight: 1.4 }}>{description}</div>
      <button type="button" className="btn sm" style={{ marginTop: 10 }} onClick={onClick}>{actionLabel}</button>
    </div>
  );
}

const PLANNING_BUCKET_LABELS = Object.freeze({
  actual: "Gerçekleşen gider",
  budget: "Bütçe",
  forecast: "Tahmin",
  accrual: "Karşılık",
});

const PLANNING_BLOCKER_LABELS = Object.freeze({
  NET_ROLLUP_BLOCKED: "Net sonuç doğrulaması",
  VAT_UNKNOWN_NET_ROLLUP: "KDV durumu bilinmiyor; net sonuç doğrulanmadı",
  MIXED_CURRENCIES: "Para birimleri için dönüşüm kanıtı eksik",
  ALLOCATION_EVIDENCE_INCOMPLETE: "Gider dağıtım kanıtı eksik",
  COST_ALLOCATION_EVIDENCE_PENDING: "Gider dağıtım kanıtı bekliyor",
  ALLOCATION_EVIDENCE_PENDING: "Gider dağıtım kanıtı bekliyor",
  VERIFIED_TAX_BASIS_MISSING: "Vergi bilgisi için kanıt eksik",
  INCOME_EVIDENCE_MISSING: "Gelir kanıtı bekliyor",
  ACCOUNTING_PERIOD_NOT_CLOSED: "Dönem bilgisi bekliyor",
  ACCRUAL_RECONCILIATION_REQUIRED: "Karşılık eşleştirmesi bekliyor",
  DUPLICATE_ROLLUP_LINEAGE: "Aynı gider ikinci kez sayılmadı",
  COMPONENT_LINEAGE_AMOUNT_MISMATCH: "Gider bileşenleri ana kayıtla eşleşmiyor",
});

function planningBucketStatusLabel(status, bucket) {
  return describePlanningBucket({
    status,
    entryCount: bucket?.entryCount,
    grossAmountMinor: bucket?.grossAmountMinor,
    blockers: bucket?.blockers,
  }).label;
}

function planningBucketTone(status) {
  return String(status || "").toUpperCase() === "READY" ? "good" : "warm";
}

function planningBlockerLabel(value) {
  const key = String(value || "").trim();
  return PLANNING_BLOCKER_LABELS[key] || "Hesap için ek doğrulama gerekiyor";
}

function compactMissingInfoLabel(value) {
  const text = String(value || "").trim();
  if (/KDV|gider kanıtı/iu.test(text)) return "KDV/gider kanıtı";
  if (/Dağıtım/iu.test(text)) return "Gider dağıtımı";
  if (/Yakıt|kilometre/iu.test(text)) return "Yakıt bilgisi";
  if (/Net sonuç/iu.test(text)) return "Net sonuç";
  return text.length > 28 ? `${text.slice(0, 27).trim()}…` : text;
}

function fuelTypeLabel(value) {
  const key = String(value || "").toUpperCase();
  return {
    DIESEL: "Motorin",
    GASOLINE_95: "Benzin",
    LPG: "LPG",
    ELECTRIC: "Elektrik",
  }[key] || "Belirtilmedi";
}

const SERVICE_COST_CATEGORY_LABELS = Object.freeze({
  FUEL: "Yakıt",
  ADBLUE: "AdBlue",
  MAINTENANCE: "Bakım",
  REPAIR: "Onarım",
  TIRE_RIM: "Lastik ve jant",
  MTV_TAX: "MTV ve araç vergileri",
  TRAFFIC_INSURANCE: "Trafik sigortası",
  CASCO: "Kasko",
  INSPECTION: "Muayene",
  EMISSION_TEST: "Egzoz ölçümü",
  FINANCE_CHARGE: "Finansman gideri",
  LEASING: "Leasing",
  RENT: "Kira",
  DEPRECIATION: "Amortisman",
  HGS_TOLL: "HGS ve geçiş",
  PARKING: "Otopark",
  CLEANING: "Temizlik",
  GPS: "GPS",
  CAMERA: "Kamera",
  VEHICLE_EQUIPMENT: "Araç ekipmanı",
  EMPLOYER_MONTHLY_COST: "Aylık işveren maliyeti",
  BASE_SALARY: "Temel maaş",
  BENEFIT: "Yan hak",
  OVERTIME: "Fazla mesai",
  PER_DIEM: "Harcırah",
  SERVICE_DIRECT: "Doğrudan servis gideri",
  ROUTE_FEE: "Güzergâh gideri",
  OPERATIONS_OVERHEAD: "Operasyon genel gideri",
  OTHER_OPERATION: "Diğer operasyon gideri",
  OTHER_VEHICLE: "Diğer araç gideri",
  OTHER_DRIVER: "Diğer sürücü gideri",
});

const SERVICE_COST_RECORD_KIND_LABELS = Object.freeze({
  ACTUAL: "Gerçekleşen",
  BUDGET: "Bütçe",
  FORECAST: "Tahmin",
  ACCRUAL: "Karşılık",
});

function serviceCostCategoryLabel(value) {
  const key = String(value || "").trim().toUpperCase();
  return SERVICE_COST_CATEGORY_LABELS[key] || "Diğer gider";
}

function serviceCostRecordKindLabel(value) {
  const key = String(value || "").trim().toUpperCase();
  return SERVICE_COST_RECORD_KIND_LABELS[key] || "Kayıt türü belirtilmedi";
}

function serviceCostDateLabel(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "Europe/Istanbul",
  }).format(date);
}

function serviceContextDateRange(start, end) {
  const startText = serviceCostDateLabel(start);
  const endText = serviceCostDateLabel(end);
  if (startText && endText) return `${startText} – ${endText}`;
  return startText || endText || "Dönem belirtilmedi";
}

function isFutureServicePeriod(value) {
  const candidate = new Date(String(value || ""));
  const now = new Date();
  if (Number.isNaN(candidate.getTime())) return false;
  candidate.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return candidate.getTime() > now.getTime();
}

function readablePeriodLabel(value) {
  const raw = String(value || "").trim();
  const match = raw.match(/(\d{4}-\d{2}-\d{2})[^\d]+(\d{4}-\d{2}-\d{2})/u);
  return match ? serviceContextDateRange(match[1], match[2]) : raw;
}

function serviceContextStatusLabel(value, start = null, end = null) {
  if (isFutureServicePeriod(start || end) && ["DONE", "COMPLETED"].includes(String(value || "").trim().toUpperCase())) {
    return "Planlandı (gelecek)";
  }
  return {
    ACTIVE: "Aktif",
    APPROVED: "Onaylandı",
    DONE: "Tamamlandı",
    COMPLETED: "Tamamlandı",
    REQUESTED: "Talep edildi",
    DRAFT: "Taslak",
    CANCELLED: "İptal edildi",
  }[String(value || "").trim().toUpperCase()] || "Durum bekliyor";
}

function serviceContextAgreementLabel(item, vehicles = []) {
  const vehicle = vehicles.find((candidate) => Number(candidate?.id) === Number(item?.vehicleId));
  return `${vehicle?.plate || item?.vehicle?.plate || "Araç belirtilmedi"} · ${serviceContextDateRange(item?.startDate, item?.endDate)} · ${serviceContextStatusLabel(item?.status, item?.startDate, item?.endDate)}`;
}

function serviceContextCustomerLabel(item) {
  return item?.company?.name || item?.customer?.name || item?.companyName || "Müşteri doğrulanmadı";
}

function serviceContextContractLabel(item) {
  if (!item) return "Sözleşme seçilmedi";
  return `Sözleşme · ${serviceContextDateRange(item.startDate, item.endDate)} · ${serviceContextStatusLabel(item.status, item.startDate, item.endDate)}`;
}

function serviceContextShiftLabel(item, vehicles = []) {
  const vehicle = vehicles.find((candidate) => Number(candidate?.id) === Number(item?.vehicleId));
  const label = !Number(item?.agreementId || 0) && Number(item?.id || 0) > 0
    ? `Sözleşmesiz talep #${item.id}`
    : (vehicle?.plate || item?.vehicle?.plate || "Araç belirtilmedi");
  return `${label} · ${serviceContextDateRange(item?.startAt, item?.endAt)} · ${serviceContextStatusLabel(item?.status, item?.startAt, item?.endAt)}`;
}

function quoteOfferReasonLabel(reason, requestContext = null) {
  const raw = String(reason || "").trim();
  if (/SERVIS_VARDIYA_TENANT_OR_CONTEXT_MISMATCH/iu.test(raw)) {
    return "Seçili talep ile hizmet kaydı eşleşmiyor.";
  }
  if (/SERVIS_VARDIYA_AGREEMENT_REQUIRED/iu.test(raw)) {
    return "Talebe bağlı hizmet kaydı bulunamadı.";
  }
  if (/^SERVIS_/iu.test(raw)) {
    return "Teklif bağlamı doğrulanamadı.";
  }
  if (requestContext?.missing?.length && !raw) {
    return "Bu talepte maliyet hesabı için gerekli bilgiler eksik.";
  }
  return raw || "Teklif kaynağı seçili müşteri ve hizmet bağlamından okunur.";
}

function serviceCostPeriodLabel(line) {
  const start = serviceCostDateLabel(line?.periodStart);
  const end = serviceCostDateLabel(line?.periodEnd);
  if (start && end) return `${start} – ${end}`;
  return serviceCostDateLabel(line?.occurredAt) || "Dönem bilgisi bekliyor";
}

function serviceCostLineOutsideSelectedPeriod(line, selectedStart, selectedEnd) {
  const selectedStartMs = Date.parse(String(selectedStart || ""));
  const selectedEndMs = Date.parse(String(selectedEnd || selectedStart || ""));
  const lineStartMs = Date.parse(String(line?.periodStart || line?.occurredAt || ""));
  const lineEndMs = Date.parse(String(line?.periodEnd || line?.periodStart || line?.occurredAt || ""));
  if (![selectedStartMs, selectedEndMs, lineStartMs, lineEndMs].every(Number.isFinite)) return false;
  return lineEndMs < selectedStartMs || lineStartMs > selectedEndMs;
}

function serviceCostRelationLabel(line) {
  if (line?.shiftId != null) return "Vardiya ilişkisi mevcut";
  if (line?.vehicleId != null) return "Araç kapsamı";
  if (line?.driverId != null) return "Sürücü kapsamı";
  if (line?.agreementId != null) return "Sözleşme kapsamı";
  return "Doğrudan gider";
}

function serviceCostSourceStatus(line) {
  const amountMinor = Number(line?.amountMinor ?? line?.grossAmountMinor);
  if (!Number.isSafeInteger(amountMinor)) {
    return { label: "Hesaplanamıyor", detail: "Onaylı tutar bilgisi yok.", tone: "danger" };
  }
  const allocation = String(line?.allocation || "DIRECT").toUpperCase();
  if (allocation === "EXCLUDED_FROM_ROLLUP") {
    return { label: "Maliyete dahil değil", detail: "Bu hesap bu kalemi toplama almıyor.", tone: "danger" };
  }
  const hasShift = line?.shiftId != null;
  const hasAllocationEvidence = serviceCostHasAllocationEvidence(line);
  if (allocation === "COUNT_IN_ROLLUP" && !hasAllocationEvidence) {
    return { label: "Dağıtım tutarı bekliyor", detail: "Vardiya payı için gerekli dağıtım kanıtı eksik.", tone: "warm" };
  }
  if (allocation === "COUNT_IN_ROLLUP" && hasAllocationEvidence) {
    return { label: "Maliyete dahil", detail: "Kanıtlı kullanım payı onaylı maliyet hesabına dahil edildi.", tone: "good" };
  }
  if (!hasShift) {
    return { label: "Maliyete dahil · dağıtım bekliyor", detail: "Kaynak tutarı maliyet kapsamındadır; kesin vardiya payı doğrulanmadı.", tone: "warm" };
  }
  return { label: "Maliyete dahil", detail: "Onaylı maliyet hesabına dahil edildi.", tone: "good" };
}

function sourceStatusColor(tone) {
  return tone === "good" ? "#6ce9a6" : tone === "danger" ? "#fda29b" : "#f7b267";
}

function serviceCostHasAmount(line) {
  return Number.isSafeInteger(Number(line?.amountMinor ?? line?.grossAmountMinor));
}

function serviceCostHasAllocationEvidence(line) {
  return hasServiceAllocationEvidence(line);
}

function serviceCostRecordStatus(line) {
  return line?.entryId != null || String(line?.sourceRef || "").trim()
    ? { label: "Kayıt mevcut", detail: "Onaylı gider kaydı bulundu.", tone: "good" }
    : { label: "Kayıt kaynağı bekliyor", detail: "Kaynak kaydı doğrulanmadı.", tone: "warm" };
}

function serviceCostCalculationStatus(line, { fuelCalculation, calculationBlocked } = {}) {
  if (!serviceCostHasAmount(line)) {
    return { label: "Hesaplanamıyor", detail: "Onaylı tutar bilgisi yok.", tone: "danger" };
  }
  const categoryKey = String(line?.categoryKey || "").trim().toUpperCase();
  const fuelPending = categoryKey === "FUEL"
    && Boolean(fuelCalculation)
    && (fuelCalculation?.fuelTypeStatus !== "RESOLVED" || fuelCalculation?.emptyDistanceKm == null);
  if (fuelPending || calculationBlocked || (line?.allocation === "COUNT_IN_ROLLUP" && !serviceCostHasAllocationEvidence(line))) {
    return { label: "Hesaplama doğrulaması bekliyor", detail: "Gerekli hesap girdileri veya yöntem henüz doğrulanmadı.", tone: "warm" };
  }
  return { label: "Hesaplama doğrulandı", detail: "Gerekli hesap girdileri onaylı kaynakta mevcut.", tone: "good" };
}

function ServiceCostProof({ title, value, note, tone = "warm" }) {
  return (
    <div className={`finance-service-cost-proof finance-service-cost-proof--${tone}`}>
      <div className="finance-service-cost-proof-label">{title}</div>
      <strong>{value}</strong>
      <span>{note}</span>
    </div>
  );
}

function PlanningEvidenceSummary({
  evidence,
  modelInput,
  roomProfitability,
  vehicleMonthDecision,
  contractMonthDecision,
  newOfferDecision,
  accountingPeriod,
  accountingPeriodReadiness,
  onAccountingPeriodTransition,
  serviceCostScope,
  sourceEntries,
  onNavigate,
  onViewChange,
  onCompleteAllocation,
  onAutoAllocate,
  onOpenPlanningBucket,
  selectedServiceShiftId,
  selectedServiceAgreementId,
  selectedServiceVehicleId,
  selectedServiceDriverId,
  selectedServicePeriodStart,
  selectedServicePeriodEnd,
  selectedServicePeriodLabel,
  canManageRoomCosts,
}) {
  const [allocationEntryId, setAllocationEntryId] = useState(null);
  const [allocationForm, setAllocationForm] = useState({
    quantity: "",
    unit: "KM",
    unitRateMinor: "",
    allocatedAmountMinor: "",
    periodStart: "",
    periodEnd: "",
    sourceRef: "",
    evidenceRef: "",
  });
  const [allocationError, setAllocationError] = useState("");
  const [allocationBusy, setAllocationBusy] = useState(false);
  const [automaticAllocationEntryId, setAutomaticAllocationEntryId] = useState(null);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [missingOpen, setMissingOpen] = useState(false);
  const serviceCostReturnTo = roomFinanceViewPath("service-cost", {
    focusVehicleId: selectedServiceVehicleId,
    focusDriverId: selectedServiceDriverId,
    focusShiftId: selectedServiceShiftId,
    focusAgreementId: selectedServiceAgreementId,
    focusPeriodStart: selectedServicePeriodStart,
    focusPeriodEnd: selectedServicePeriodEnd,
  });

  function openAllocationForm(line) {
    setAllocationError("");
    setAllocationEntryId(line?.entryId ?? null);
    setAllocationForm({
      quantity: "",
      unit: "KM",
      unitRateMinor: "",
      allocatedAmountMinor: "",
      periodStart: dateInputValue(line?.periodStart),
      periodEnd: dateInputValue(line?.periodEnd),
      sourceRef: String(line?.sourceRef || "").trim(),
      evidenceRef: "",
    });
  }

  async function submitAllocation(line) {
    if (typeof onCompleteAllocation !== "function" || !line?.entryId) return;
    const amountMinor = Number(allocationForm.allocatedAmountMinor);
    if (!Number.isSafeInteger(amountMinor) || amountMinor <= 0) {
      setAllocationError("Dağıtım payı 0 TL'den büyük olmalıdır.");
      return;
    }
    const quantityText = allocationForm.quantity.trim().replace(",", ".");
    const quantity = Number(quantityText);
    const unitRateMinor = Number(allocationForm.unitRateMinor);
    if (!quantityText || !Number.isFinite(quantity) || quantity <= 0) {
      setAllocationError("Kullanım miktarını 0'dan büyük girin.");
      return;
    }
    if (!Number.isSafeInteger(unitRateMinor) || unitRateMinor <= 0) {
      setAllocationError("Birim payını 0 TL'den büyük girin.");
      return;
    }
    if (Math.round(quantity * unitRateMinor) !== amountMinor) {
      setAllocationError("Kullanım miktarı ile birim payı servis payıyla eşleşmiyor.");
      return;
    }
    if (!allocationForm.periodStart || !allocationForm.periodEnd) {
      setAllocationError("Kullanım döneminin başlangıç ve bitiş tarihlerini girin.");
      return;
    }
    if (!allocationForm.sourceRef.trim() || !allocationForm.evidenceRef.trim()) {
      setAllocationError("Kaynak ve kullanım kanıtı referanslarını girin.");
      return;
    }
    setAllocationBusy(true);
    setAllocationError("");
    try {
      await onCompleteAllocation({
        line,
        input: {
          lineageKind: "REFERENCE",
          targetKind: "SHIFT",
          lineageKey: `SHIFT:${selectedServiceShiftId || line.shiftId}`,
          vehicleId: selectedServiceVehicleId || line.vehicleId || null,
          driverId: selectedServiceDriverId || line.driverId || null,
          agreementId: selectedServiceAgreementId || line.agreementId || null,
          shiftId: selectedServiceShiftId || line.shiftId || null,
          quantity: allocationForm.quantity || null,
          unit: allocationForm.unit,
          unitRateMinor: allocationForm.unitRateMinor || null,
          allocatedAmountMinor: amountMinor,
          periodStart: allocationForm.periodStart,
          periodEnd: allocationForm.periodEnd,
          sourceRef: allocationForm.sourceRef.trim(),
          evidenceRef: allocationForm.evidenceRef.trim(),
        },
      });
      setAllocationEntryId(null);
    } catch (error) {
      setAllocationError(error?.message || "Kullanım kanıtı kaydedilemedi.");
    } finally {
      setAllocationBusy(false);
    }
  }

  async function submitAutomaticAllocation(line) {
    if (typeof onAutoAllocate !== "function" || !line?.entryId) return;
    setAutomaticAllocationEntryId(line.entryId);
    setAllocationError("");
    try {
      await onAutoAllocate({ line });
    } catch (error) {
      setAllocationError(error?.message || "Kayıtlı vardiya kullanımına göre dağıtım yapılamadı.");
    } finally {
      setAutomaticAllocationEntryId(null);
    }
  }
  if (!evidence && !roomProfitability) return null;
  const manualMinor = roomProfitability?.costInputs?.manualBaselineOperationalCostMinor;
  const profitabilityStatus = String(roomProfitability?.profitabilityStatus || "").toUpperCase();
  const earnedRevenueMinor = contractMonthDecision?.earnedRevenueMinor ?? vehicleMonthDecision?.earnedIncomeMinor ?? null;
  const hasEarnedRevenue = earnedRevenueMinor != null;
  const profitabilityLabel = hasEarnedRevenue ? ({
    CONFIRMED: "Doğrulanmış kârlılık",
    ESTIMATED: "Geçici faaliyet sonucu",
    BLOCKED: "Kârlılık hesaplanmadı",
  }[profitabilityStatus] || "Kârlılık durumu bilinmiyor") : "Faaliyet sonucu";
  const profitabilitySummary = hasEarnedRevenue
    ? (profitabilityStatus === "ESTIMATED"
      ? "Bu geçici sonuç, eksik veya manuel varsayımlar nedeniyle kesin net kâr değildir."
      : (roomProfitability?.summaryText || "Gelir ve maliyet kanıtları tamamlandığında sonuç güncellenir."))
    : "Gelir kaydı bulunmadığı için kârlılık sonucu gösterilmiyor.";
  const profitabilityTone = !hasEarnedRevenue ? "warm" : profitabilityStatus === "CONFIRMED" ? "good" : profitabilityStatus === "BLOCKED" ? "danger" : "warm";
  const fuel = roomProfitability?.fuelCalculation || null;
  const fuelStatus = String(fuel?.status || "").toUpperCase();
  const fuelStatusLabel = fuelCalculationStatusLabel(fuelStatus);
  const sourceRows = Array.isArray(sourceEntries)
    ? sourceEntries
    : (Array.isArray(modelInput?.roomCostLedgerInputs) ? modelInput.roomCostLedgerInputs : []);
  const serviceCostContextMismatch = String(serviceCostScope?.allocationStatus || "").toUpperCase() === "CONTEXT_MISMATCH";
  const provenServiceAmountMinor = serviceCostContextMismatch
    ? null
    : serviceCostScope?.provenDistributedAmountMinor ?? null;
  const sourceScopeAmountMinor = serviceCostContextMismatch
    ? null
    : serviceCostScope?.grossAmountMinor ?? null;
  const pendingServiceAmountMinor = serviceCostContextMismatch
    ? null
    : (serviceCostScope?.unallocatedAmountMinor ?? serviceCostScope?.pendingAmountMinor ?? null);
  const forecastAllocation = evidence?.forecastAllocation || null;
  const plannedServiceAmountMinor = serviceCostContextMismatch
    ? null
    : (serviceCostScope?.plannedAmountMinor ?? forecastAllocation?.grossAmountMinor ?? null);
  const plannedSourceAmountMinor = serviceCostContextMismatch
    ? null
    : (serviceCostScope?.plannedSourceAmountMinor ?? forecastAllocation?.sourceScopeAmountMinor ?? null);
  const plannedUnallocatedAmountMinor = serviceCostContextMismatch
    ? null
    : (serviceCostScope?.plannedUnallocatedAmountMinor ?? forecastAllocation?.unallocatedAmountMinor ?? null);
  const sourceRecordCount = sourceRows.filter((line) => serviceCostRecordStatus(line).label === "Kayıt mevcut").length;
  const fuelCalculationPending = Boolean(
    fuel
      && (fuel.fuelTypeStatus !== "RESOLVED" || fuel.emptyDistanceKm == null),
  );
  const evidenceCalculationBlocked = Array.isArray(evidence?.blockers)
    && evidence.blockers.some((blocker) => ![
      "NET_ROLLUP_BLOCKED",
      "VAT_UNKNOWN_NET_ROLLUP",
      "ALLOCATION_EVIDENCE_INCOMPLETE",
    ].includes(String(blocker || "").toUpperCase()));
  const calculationBlocked = fuelCalculationPending || evidenceCalculationBlocked;
  const distributedSourceCount = sourceRows.filter((line) => describeServiceCostDistributionStatus(line).label === "Servise dağıtıldı").length;
  const actualBucketPresentation = describePlanningBucket(evidence?.actual || {});
  const calculationStatusLabel = sourceRecordCount > 0 && !calculationBlocked
    ? "Hesaplama doğrulandı"
    : "Hesaplama doğrulaması bekliyor";
  const calculationStatusNote = calculationStatusLabel === "Hesaplama doğrulandı"
    ? "Gerekli girdiler ve yöntem doğrulandı."
    : "Yakıt, dönem veya dağıtım girdileri tamamlanmalı.";
  const distributionStatusLabel = sourceRecordCount > 0 && distributedSourceCount === sourceRecordCount && (!evidence?.excludedCount || actualBucketPresentation.netOnlyUnknown)
    ? "Servise dağıtıldı"
    : sourceRecordCount > 0
      ? "Dağıtım bekliyor"
      : "Henüz doğrulanmadı";
  const distributionStatusNote = distributionStatusLabel === "Servise dağıtıldı"
    ? (actualBucketPresentation.netOnlyUnknown
      ? "Brüt maliyetin servis/vardiya payı onaylı kanıtla doğrulandı; KDV belirsizliği yalnız net sonucu sınırlar."
      : "Belirli servis/vardiya payı onaylı kanıtla doğrulandı.")
    : "Kayıt bulunması tek başına servis dağıtımı kanıtı değildir.";
  const netResultBlocked = Boolean(
    roomProfitability?.netRollupBlocked
      || evidence?.netRollupEligible === false
      || Number(evidence?.blockerCount || 0) > 0
      || Number(evidence?.excludedCount || 0) > 0,
  );
  const pendingAllocationSourceRows = sourceRows.filter((line) => (
    line?.entryId != null
      && unallocatedServiceCostAmountMinor(line) > 0
  ));
  const navigateToEmptyDistance = () => {
    if (!canManageRoomCosts || typeof onNavigate !== "function" || !selectedServiceShiftId) return false;
    onNavigate({
      recordPath: `/room/shifts?focusShiftId=${selectedServiceShiftId}${selectedServiceAgreementId ? `&focusAgreementId=${selectedServiceAgreementId}` : ""}&focusTask=usage&returnTo=${encodeURIComponent(roomFinanceViewPath("service-cost", {
        focusVehicleId: selectedServiceVehicleId || "",
        focusShiftId: selectedServiceShiftId,
        focusAgreementId: selectedServiceAgreementId || "",
        focusPeriodStart: selectedServicePeriodStart || vehicleMonthDecision?.periodStart || contractMonthDecision?.periodStart || "",
        focusPeriodEnd: selectedServicePeriodEnd || vehicleMonthDecision?.periodEnd || contractMonthDecision?.periodEnd || "",
      }))}`,
    });
    return true;
  };
  const missingInfoEntries = [];
  const missingInfoNotes = [];
  const seenMissingKeys = new Set();
  const addMissingInfo = (entry) => {
    if (!entry?.key || seenMissingKeys.has(entry.key)) return;
    seenMissingKeys.add(entry.key);
    missingInfoEntries.push(entry);
  };
  (Array.isArray(evidence?.blockers) ? evidence.blockers : []).forEach((blocker) => {
    const normalized = String(blocker || "").toUpperCase();
    const classification = classifyServiceCostBlocker(normalized);
    if (classification.kind === "USER_ACTION" && classification.action === "allocation") return;
    if (normalized.includes("VAT") || normalized === "NET_ROLLUP_BLOCKED") {
      missingInfoNotes.push("KDV bilgisi girilmedi. Giderin tamamı üzerinden hesap yapılıyor; KDV ayrıca hesaplanmadı.");
    } else {
      missingInfoNotes.push(`${planningBlockerLabel(blocker)} tamamlanmadan kesin sonuç gösterilmez.`);
    }
  });
  (Array.isArray(fuel?.missing) ? fuel.missing : []).forEach((missing) => {
    addMissingInfo({
      key: `fuel:${String(missing)}`,
      title: String(missing),
      reason: "Yakıt hesabının bu servise uygulanabilmesi için kaynak bilgi tamamlanmalı.",
      recordLabel: selectedServicePeriodLabel || "Seçili servis",
      action: canManageRoomCosts && selectedServiceShiftId ? { label: "Boş kilometreyi tamamla", onClick: navigateToEmptyDistance } : null,
    });
  });
  pendingAllocationSourceRows.forEach((line) => {
    const unallocatedAmountMinor = unallocatedServiceCostAmountMinor(line);
    const hasCanonicalUsageCandidate = ["PERIODIC", "RECURRING"].includes(String(line?.occurrenceKind || "").toUpperCase())
      && (line?.vehicleId != null || line?.driverId != null)
      && line?.periodStart && line?.periodEnd;
    const action = canManageRoomCosts && hasCanonicalUsageCandidate && typeof onAutoAllocate === "function"
      ? {
        label: "Kayıtlı vardiyalara dağıt",
        onClick: () => submitAutomaticAllocation(line),
      }
      : canManageRoomCosts && typeof onCompleteAllocation === "function"
        ? {
          label: "Dağıtım bilgisini gir",
          onClick: () => {
            setSourcesOpen(true);
            openAllocationForm(line);
          },
        }
        : null;
    addMissingInfo({
      key: `allocation:${line.entryId}`,
      title: "Dağıtılmamış gider payı",
      reason: `${formatTRY(unallocatedAmountMinor)} tutarındaki pay henüz kanıtlı bir vardiya kullanımına bağlanmadı.`,
      recordLabel: `${serviceCostCategoryLabel(line.categoryKey)} · ${serviceCostPeriodLabel(line)}`,
      action,
    });
  });
  if (evidence?.excludedCount) {
    missingInfoNotes.push(`${evidence.excludedCount} kayıt net sonuca alınmadı; eksik bilgi sıfır kabul edilmedi.`);
  }
  sourceRows.forEach((line) => {
    const target = buildExpenseFocusTarget(line, { returnTo: serviceCostReturnTo });
    if (!target) return;
    const missingFieldLabel = expenseMissingFieldLabel(target.field);
    const actionLabel = expenseMissingFieldActionLabel(target.field);
    addMissingInfo({
      key: `expense:${target.focusEntryId}:${target.field}`,
      title: missingFieldLabel ? `Eksik ${missingFieldLabel.toLowerCase()}` : "Eksik gider bilgisi",
      reason: missingFieldLabel
        ? `Bu gider kaydında yalnız ${missingFieldLabel.toLowerCase()} bilgisi eksik.`
        : "Bu gider kaydındaki eksik alan tamamlanmalı.",
      recordLabel: `${serviceCostCategoryLabel(line.categoryKey)} · ${serviceCostPeriodLabel(line)}`,
      action: canManageRoomCosts && typeof onNavigate === "function"
        ? { label: actionLabel || "Eksik alanı tamamla", onClick: () => onNavigate({ contextSource: "expense-entry", ...target }) }
        : null,
    });
  });
  const missingInfoCount = missingInfoEntries.length;
  const missingInfoSummary = missingInfoCount
    ? Array.from(new Set(missingInfoEntries.map((item) => compactMissingInfoLabel(item.title)).filter(Boolean)))
      .slice(0, 2)
      .join(", ")
      + (missingInfoCount > 2 ? " ve diğer eksikler" : "")
    : "Bu kapsamda açık bilgi yok.";
  return (
    <div className="card" data-testid="room-planning-evidence" style={{ marginTop: 12, border: "1px solid rgba(98,117,255,0.3)" }}>
      <div className="finance-service-cost-v31-heading">
        <div>
          <div className="finance-v21-eyebrow">SERVİS GİDERLERİ</div>
          <div className="panelSectionTitle">Servis giderleri</div>
        </div>
        <span className="finance-service-cost-v31-source-label">Gerçek kayıtlar</span>
      </div>
      <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
        Seçili servise bağlanan gerçek giderleri, dağıtım bekleyen tutarı ve tamamlanması gereken bilgileri görün.
      </div>
      <div className="finance-service-cost-v31-summary" data-testid="room-service-cost-v31-summary">
        <div className="finance-service-cost-v31-card finance-service-cost-v31-card--main">
          <span>Bu servise bağlanan gider</span>
          <strong>{provenServiceAmountMinor == null ? "Hesaplanamıyor" : formatTRY(provenServiceAmountMinor)}</strong>
          <small>{provenServiceAmountMinor == null ? "Kanıtlı servis payı bekleniyor." : `${distributedSourceCount || sourceRecordCount} gider kaydından oluşuyor · Brüt tutar`}</small>
        </div>
        <div className="finance-service-cost-v31-card finance-service-cost-v31-card--pending">
          <span>Dağıtım bekleyen</span>
          <strong>{pendingServiceAmountMinor == null ? "Belirsiz" : formatTRY(pendingServiceAmountMinor)}</strong>
          <small>{pendingServiceAmountMinor > 0 ? "Henüz bu servisin maliyetine eklenmedi." : pendingServiceAmountMinor === 0 ? "Bu kapsam için dağıtım beklemiyor." : "Dağıtım kapsamı doğrulanıyor."}</small>
        </div>
        <div className="finance-service-cost-v31-card finance-service-cost-v31-card--missing" data-testid="room-service-cost-v31-card-missing">
          <span>Tamamlanması gereken</span>
          <strong>{missingInfoCount ? `${missingInfoCount} bilgi eksik` : "Eksik bilgi yok"}</strong>
          <small>{missingInfoSummary}</small>
        </div>
      </div>
      <div className="finance-service-cost-v31-result" data-testid="room-service-cost-v31-result">
        <div>
          <div className="finance-v21-eyebrow">SONUÇ</div>
          <strong>{profitabilityLabel}</strong>
          <span>{profitabilitySummary}</span>
        </div>
        <div className="finance-service-cost-v31-result-metrics">
          {hasEarnedRevenue ? (
            <div>
              <small>Kazanılmış gelir</small>
              <b>{formatTRY(earnedRevenueMinor)}</b>
            </div>
          ) : null}
          <div>
            <small>Gerçekleşen gider (brüt; kâr değildir)</small>
            <b>{provenServiceAmountMinor == null ? "Hesaplanamıyor" : formatTRY(provenServiceAmountMinor)}</b>
          </div>
        </div>
      </div>
      <details className="finance-service-cost-missing" data-testid="room-service-cost-missing" open={missingOpen}>
        <summary
          aria-expanded={missingOpen ? "true" : "false"}
          onClick={(event) => { event.preventDefault(); setMissingOpen((current) => !current); }}
        >
          {missingOpen ? "Tamamlanması gerekenleri gizle" : "Tamamlanması gerekenleri göster"}
        </summary>
        {missingOpen ? (
          <div className="finance-service-cost-missing-list">
            {missingInfoEntries.length ? missingInfoEntries.map((item) => (
              <div className="finance-service-cost-missing-item" data-testid="room-service-cost-missing-item" key={item.key}>
                <strong>{item.title}</strong>
                <span>{item.recordLabel}</span>
                <small>{item.reason}</small>
                {item.action ? <button type="button" className="btn sm" onClick={item.action.onClick}>{item.action.label}</button> : <em>Bu bilgi için bu oturumda doğrudan yetkili düzenleme yolu yok.</em>}
              </div>
            )) : <div className="finance-service-cost-missing-empty">Bu kapsamda kullanıcı tarafından tamamlanacak ek işlem yok.</div>}
            {missingInfoNotes.length ? (
              <div className="finance-service-cost-missing-note" role="status">
                {[...new Set(missingInfoNotes)].map((note) => <span key={note}>{note}</span>)}
              </div>
            ) : null}
          </div>
        ) : null}
      </details>
      <details className="finance-service-cost-breakdown" data-testid="room-service-cost-breakdown" open={breakdownOpen}>
        <summary
          aria-expanded={breakdownOpen ? "true" : "false"}
          onClick={(event) => {
            event.preventDefault();
            setBreakdownOpen((current) => {
              const next = !current;
              if (!next) setAdvancedOpen(false);
              return next;
            });
          }}
        >
          {breakdownOpen ? "Gider dağılımını gizle" : "Gider dağılımını göster"}
        </summary>
        <div className="finance-service-cost-breakdown-body">
      <div className="finance-service-cost-distribution-summary" data-testid="room-service-cost-distribution-details">
        <div className="panelSectionTitle">Dağıtım durumu</div>
        <div className="panelMeta" style={{ marginTop: 6 }}>
          {distributedSourceCount > 0
            ? `${distributedSourceCount} gider satırının seçili servise dağıtımı kanıtlandı.`
            : "Seçili servise dağıtılmış gider kanıtı bekleniyor."}
        </div>
        <div className="panelMeta" style={{ marginTop: 6 }}>
          {pendingServiceAmountMinor > 0
            ? `${formatTRY(pendingServiceAmountMinor)} tutarındaki pay henüz bu servisin maliyetine eklenmedi.`
            : pendingServiceAmountMinor === 0
              ? "Bu kapsam için bekleyen dağıtım bulunmuyor."
              : "Dağıtım kapsamı doğrulanıyor."}
        </div>
      </div>
      <details className="finance-service-cost-advanced" data-testid="room-service-cost-advanced" open={advancedOpen}>
        <summary
          aria-expanded={advancedOpen ? "true" : "false"}
          onClick={(event) => { event.preventDefault(); setAdvancedOpen((current) => !current); }}
        >
          {advancedOpen ? "Gelişmiş maliyet ayrıntılarını gizle" : "Gelişmiş maliyet ayrıntılarını göster"}
        </summary>
        <div className="finance-service-cost-advanced-body">
      <RoomDecisionLayerSummary
        vehicleMonthDecision={vehicleMonthDecision}
        contractMonthDecision={contractMonthDecision}
        newOfferDecision={newOfferDecision}
        onNavigate={onNavigate}
        accountingPeriod={accountingPeriod}
        accountingPeriodReadiness={accountingPeriodReadiness}
        onAccountingPeriodTransition={onAccountingPeriodTransition}
      />
      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: 8 }}>
        {Object.entries(PLANNING_BUCKET_LABELS).map(([key, label]) => {
          const bucket = evidence?.[key] || null;
          const missing = key !== "actual" && (!bucket || Number(bucket?.entryCount || 0) === 0);
          const actionLabel = key === "budget" ? "Bütçe ekle" : key === "forecast" ? "Tahmin girdisini tamamla" : "Karşılık ekle";
          const emptyNote = key === "budget"
            ? "Bütçe girilmedi; seçili dönem ve hizmet için ayrı kayıt gerekir."
            : key === "forecast"
              ? "Tahmin girdisi yok; tahmin gerçekleşen gider olarak sayılmaz."
              : "Karşılık kaydı yok; gerçekleşen giderle otomatik olarak birleştirilmez.";
          return (
            <div key={key} data-testid={`room-planning-bucket-${key}`}>
              <MetricCard
                title={label}
                value={bucket?.grossAmountMinor == null ? "Belirsiz" : formatTRY(bucket.grossAmountMinor)}
                note={missing ? emptyNote : `${planningBucketStatusLabel(bucket?.status, bucket)} · ${bucket?.entryCount ?? 0} kayıt`}
                tone={planningBucketTone(bucket?.status)}
              />
              {missing && typeof onOpenPlanningBucket === "function" ? (
                <button
                  type="button"
                  className="btn sm"
                  data-testid={`room-planning-bucket-action-${key}`}
                  style={{ marginTop: 8, width: "100%" }}
                  onClick={() => onOpenPlanningBucket(key.toUpperCase())}
                >
                  {actionLabel}
                </button>
              ) : null}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
        <div className="finance-service-cost-proof-grid" data-testid="room-service-cost-proof-grid">
          <ServiceCostProof
            title="Kayıt durumu"
            value={sourceRecordCount > 0 ? "Kayıt mevcut" : "Kayıt kaynağı bekliyor"}
            note={sourceRecordCount > 0 ? `${sourceRecordCount} onaylı gider kaydı bulundu.` : "Kaynak gider kaydı bulunamadı."}
            tone={sourceRecordCount > 0 ? "good" : "warm"}
          />
          <ServiceCostProof
            title="Hesaplama durumu"
            value={calculationStatusLabel}
            note={calculationStatusNote}
            tone={calculationStatusLabel === "Hesaplama doğrulandı" ? "good" : "warm"}
          />
          <ServiceCostProof
            title="Dağıtım durumu"
            value={distributionStatusLabel}
            note={distributionStatusNote}
            tone={distributionStatusLabel === "Servise dağıtıldı" ? "good" : "warm"}
          />
        </div>
      </div>
      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
        <div data-testid="room-proven-service-cost">
          <MetricCard
            title="Dağıtılan gider ayrıntısı"
            value={provenServiceAmountMinor == null ? "Belirsiz" : formatTRY(provenServiceAmountMinor)}
            note={provenServiceAmountMinor == null
              ? "Seçili servis için kanıtlı pay hesaplanamıyor."
              : "Doğrudan veya seçili vardiyaya dağıtımı kanıtlanan gider payı."}
            tone={provenServiceAmountMinor == null ? "warm" : "good"}
          />
        </div>
        <div data-testid="room-source-scope-cost">
          <MetricCard
            title="Dağıtım havuzu"
            value={sourceScopeAmountMinor == null ? "Belirsiz" : formatTRY(sourceScopeAmountMinor)}
            note={sourceScopeAmountMinor == null
              ? "Seçili servisin maliyeti henüz doğrulanamıyor; kaynak kapsamı doğrulanamıyor."
              : pendingServiceAmountMinor > 0
                ? `${formatTRY(pendingServiceAmountMinor)} için vardiya payı kanıtı bekliyor; kesin vardiya maliyeti değildir.`
                : "Kaynak kapsamı için dağıtım kanıtı tamamlandı."}
            tone={netResultBlocked || pendingServiceAmountMinor > 0 ? "warm" : "good"}
          />
        </div>
        <MetricCard title="Kârlılık sonucu" value={profitabilityLabel} note={profitabilitySummary} tone={profitabilityTone} />
        {manualMinor != null ? <MetricCard title="Manuel varsayım" value={formatTRY(manualMinor)} note="Gerçekleşen giderden ayrı; yalnız senaryo/önizleme" tone="warm" /> : null}
      </div>
      {plannedServiceAmountMinor != null || plannedSourceAmountMinor != null ? (
        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }} data-testid="room-service-cost-forecast-allocation">
          <MetricCard
            title="Planlama servis payı"
            value={plannedServiceAmountMinor == null ? "Belirsiz" : formatTRY(plannedServiceAmountMinor)}
            note="Tahmini ortak giderin bu servise kanıtlı payı; gerçekleşmiş harcama değildir."
            tone={plannedServiceAmountMinor == null ? "muted" : "warm"}
          />
          <MetricCard
            title="Planlama kaynak gideri"
            value={plannedSourceAmountMinor == null ? "Belirsiz" : formatTRY(plannedSourceAmountMinor)}
            note={plannedUnallocatedAmountMinor > 0
              ? `${formatTRY(plannedUnallocatedAmountMinor)} planlama payı henüz dağıtılmadı.`
              : "Kaynak toplamı, vardiya paylarıyla bir kez eşleşiyor."}
            tone={plannedUnallocatedAmountMinor > 0 ? "warm" : "default"}
          />
        </div>
      ) : null}
      {fuel ? (
        <div className="card" data-testid="room-automatic-fuel" style={{ marginTop: 10, border: "1px solid rgba(247,144,9,0.3)" }}>
          <div className="panelSectionTitle">Otomatik yakıt maliyeti</div>
          <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
            {fuelStatusLabel}. {fuelStatus === "ACTUAL_LEDGER"
              ? "Gerçekleşen yakıt gideri kullanıldı; tahmini yakıt ikinci kez toplanmadı."
              : fuelStatus === "AUTO_REFERENCE_ESTIMATE"
                ? "Rota mesafesi, araç tüketim referansı ve kaynaklı litre fiyatı aynı hesaplama motorunda kullanıldı."
                : "Rota, tüketim veya kaynaklı litre fiyatı eksik olduğu için kesin yakıt maliyeti üretilmedi."}
          </div>
          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 8 }}>
            <MetricCard title="Araç yakıtı" value={fuelTypeLabel(fuel.fuelType)} note={fuel.fuelTypeStatus === "RESOLVED" ? "Yakıt türü doğrulandı" : "Yakıt türü doğrulaması eksik"} tone={fuel.fuelTypeStatus === "RESOLVED" ? "good" : "warm"} />
            <MetricCard title="Toplam km" value={fuel.totalDistanceKm == null ? "Belirsiz" : `${fuel.totalDistanceKm} km`} note={fuel.emptyDistanceKm == null ? "Boş km ayrı veri olarak yok" : `Boş km: ${fuel.emptyDistanceKm} km`} tone={fuel.totalDistanceKm == null ? "muted" : "good"} />
            <MetricCard title="Tüketim" value={fuel.consumptionLitersPer100Km == null ? "Belirsiz" : `${fuel.consumptionLitersPer100Km} L/100 km`} note={fuel.consumptionSourceName || "Kaynak belirtilmedi"} tone={fuel.consumptionLitersPer100Km == null ? "muted" : "warm"} />
            <MetricCard title="Yakıt maliyeti" value={fuel.countedAmountMinor == null ? "Belirsiz" : formatTRY(fuel.countedAmountMinor)} note={fuel.actualLedgerUsed ? `Gerçek gider defteri; tahmini karşılık ${fuel.estimatedAmountMinor == null ? "belirsiz" : formatTRY(fuel.estimatedAmountMinor)}` : (fuel.priceSourceName ? `Fiyat kaynağı: ${fuel.priceSourceName}` : "Fiyat kaynağı eksik")} tone={fuel.actualLedgerUsed ? "good" : "warm"} />
          </div>
          {fuel.fuelTypeStatus !== "RESOLVED" || fuel.emptyDistanceKm == null ? (
            <div className="finance-service-cost-warning" data-testid="room-fuel-calculation-pending">
              <div>Hesaplama doğrulaması bekliyor: yakıt türü veya boş kilometre bilgisi tamamlanmamış.</div>
              {fuel.emptyDistanceKm == null && selectedServiceShiftId && typeof onNavigate === "function" ? (
                <button
                  type="button"
                  className="btn sm"
                  style={{ marginTop: 8 }}
                  onClick={() => onNavigate({
                    recordPath: `/room/shifts?focusShiftId=${selectedServiceShiftId}${selectedServiceAgreementId ? `&focusAgreementId=${selectedServiceAgreementId}` : ""}&focusTask=usage&returnTo=${encodeURIComponent(roomFinanceViewPath("service-cost", {
                      focusVehicleId: selectedServiceVehicleId || "",
                      focusShiftId: selectedServiceShiftId,
                      focusAgreementId: selectedServiceAgreementId || "",
                      focusPeriodStart: vehicleMonthDecision?.periodStart || contractMonthDecision?.periodStart || "",
                      focusPeriodEnd: vehicleMonthDecision?.periodEnd || contractMonthDecision?.periodEnd || "",
                    }))}`,
                  })}
                >
                  Boş kilometreyi tamamla
                </button>
              ) : null}
            </div>
          ) : null}
          {fuel.missing?.length ? <div className="panelMeta" style={{ marginTop: 8 }}>Eksik / doğrulanması gereken: {fuel.missing.join(", ")}. Kesin net kâr gösterilmez.</div> : null}
          <div className="panelMeta" style={{ marginTop: 6 }}>Formül: {fuel.formula}</div>
        </div>
      ) : null}
      {evidence?.blockers?.length ? (
        <div className="muted" style={{ marginTop: 10 }}>
          Hesap sınırı: {evidence.blockers.map(planningBlockerLabel).join("; ")}.
        </div>
      ) : null}
      {evidence?.excludedCount ? <div className="panelMeta" style={{ marginTop: 6 }}>{actualBucketPresentation.netOnlyUnknown
        ? `${evidence.excludedCount} kayıt brüt maliyet hesabında korundu; KDV bilinmediği için net toplam ve net kârlılık doğrulanmadı.`
        : `${evidence.excludedCount} kayıt net sonuca dahil edilmedi; eksik veya doğrulanmamış veri sıfır kabul edilmedi.`}</div> : null}
        </div>
      </details>
        </div>
      </details>
      <div className="finance-service-cost-sources" data-testid="room-cost-source-rows">
        <div className="finance-service-cost-sources-head">
          <div>
            <div className="finance-v21-eyebrow">GİDER KAYITLARI</div>
            <div className="panelSectionTitle">Gider kayıtları</div>
          </div>
          <button
            type="button"
            className="btn sm ghost"
            data-testid="room-cost-source-toggle"
            aria-expanded={sourcesOpen ? "true" : "false"}
            onClick={() => setSourcesOpen((current) => !current)}
          >
            {sourcesOpen ? "Gider kayıtlarını gizle" : "Gider kayıtlarını göster"}
          </button>
        </div>
        <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
          Gerçek gider satırlarını gerektiğinde açabilirsiniz. Tutarlar ve kapsam bu servise ait gider kayıtlarının özetinden okunur.
        </div>
        {sourcesOpen ? (sourceRows.length ? (
          <div className="finance-service-cost-source-list">
            {sourceRows.map((line, index) => {
              const status = serviceCostSourceStatus(line);
              const amountMinor = line?.amountMinor ?? line?.grossAmountMinor;
              const sourceLinkEnabled = typeof onNavigate === "function" && (line?.entryId != null || line?.categoryKey);
              const allocationPending = String(line?.allocation || "DIRECT").toUpperCase() === "COUNT_IN_ROLLUP"
                && !serviceCostHasAllocationEvidence(line)
                && line?.entryId != null;
              const outsideSelectedPeriod = serviceCostLineOutsideSelectedPeriod(line, selectedServicePeriodStart, selectedServicePeriodEnd);
              const displayStatus = outsideSelectedPeriod
                ? { label: "Seçili döneme dahil değil", detail: "Bu kayıt seçili servis dönemine dahil değil; seçili maliyete eklenmedi.", tone: "warm" }
                : status;
              return (
                <div className="finance-service-cost-source-row" data-finance-source-row data-testid="room-cost-source-row" key={line?.entryId || `${line?.categoryKey || "source"}-${index}`}>
                  <div className="finance-service-cost-source-main">
                    <strong>{serviceCostCategoryLabel(line?.categoryKey)}</strong>
                    <span>{serviceCostRelationLabel(line)} · {serviceCostPeriodLabel(line)}</span>
                    <small>{serviceCostRecordKindLabel(line?.recordKind)} · {serviceCostPeriodLabel(line)}</small>
                  </div>
                  <div className="finance-service-cost-source-amount">
                    <strong>{amountMinor == null ? "Hesaplanamıyor" : formatTRY(amountMinor)}</strong>
                    <span style={{ color: sourceStatusColor(displayStatus.tone) }}>{displayStatus.label}</span>
                  </div>
                  <div className="finance-service-cost-source-detail">
                    <div className="finance-service-cost-source-statuses">
                      {[
                        ["sourceRecordStatus", serviceCostRecordStatus(line)],
                        ["sourceCalculationStatus", serviceCostCalculationStatus(line, {
                          fuelCalculation: fuel,
                          calculationBlocked: evidenceCalculationBlocked || (fuelCalculationPending && String(line?.categoryKey || "").toUpperCase() === "FUEL"),
                        })],
                        ["sourceDistributionStatus", describeServiceCostDistributionStatus(line)],
                      ].map(([statusKey, sourceStatus]) => (
                        <span key={statusKey} className={`finance-service-cost-status finance-service-cost-status--${sourceStatus.tone}`} data-finance-source-status={statusKey}>
                          {sourceStatus.label}
                        </span>
                      ))}
                    </div>
                    <span>{displayStatus.detail}</span>
                    {String(line?.vatClassification || "UNKNOWN").toUpperCase() === "UNKNOWN" ? <span>KDV sınıflandırması bilinmiyor; net sonuç belirsiz.</span> : null}
                    {sourceLinkEnabled ? (
                      <button
                        type="button"
                        className="btn sm ghost"
                        data-finance-source-link
                        onClick={() => onNavigate({
                          focusEntryId: line?.entryId,
                          contextSource: "expense-entry",
                          costCategory: line?.entryId == null ? line?.categoryKey : undefined,
                          field: line?.vehicleId != null ? "vehicle" : line?.driverId != null ? "driver" : "amount",
                          periodStart: line?.periodStart,
                          periodEnd: line?.periodEnd,
                        })}
                      >
                        İlgili giderleri göster
                      </button>
                    ) : null}
                    {allocationPending && typeof onCompleteAllocation === "function" && selectedServiceShiftId ? (
                      <button
                        type="button"
                        className="btn sm"
                        data-testid={`room-cost-complete-allocation-${line.entryId}`}
                        onClick={() => openAllocationForm(line)}
                      >
                        Bilgiyi tamamla
                      </button>
                    ) : null}
                    {allocationPending && typeof onAutoAllocate === "function" ? (
                      <button
                        type="button"
                        className="btn sm"
                        data-testid={`room-cost-auto-allocation-${line.entryId}`}
                        onClick={() => submitAutomaticAllocation(line)}
                        disabled={automaticAllocationEntryId === line.entryId}
                      >
                        {automaticAllocationEntryId === line.entryId ? "Dağıtım hesaplanıyor..." : "Kanıtlı vardiyalara saat bazlı dağıt"}
                      </button>
                    ) : null}
                    {allocationEntryId === line?.entryId ? (
                      <div className="finance-service-cost-evidence-form" data-testid={`room-cost-allocation-form-${line.entryId}`}>
                        <strong>Kullanım kanıtını tamamla</strong>
                        <span className="panelMeta">Bu kaynak giderin seçili vardiyaya düşen payını kaydetmek için kanıtlı dönem ve ölçüm bilgisi girin.</span>
                        <label>
                          <span>Ölçüm birimi</span>
                          <select
                            aria-label="Kullanım ölçüm birimi"
                            value={allocationForm.unit}
                            onChange={(event) => setAllocationForm((current) => ({ ...current, unit: event.target.value }))}
                          >
                            <option value="KM">Kilometre</option>
                            <option value="HOUR">Çalışma saati</option>
                            <option value="MINUTE">Çalışma dakikası</option>
                            <option value="SHIFT">Vardiya</option>
                          </select>
                        </label>
                        <label>
                          <span>Kullanım miktarı</span>
                          <input
                            aria-label="Kullanım miktarı"
                            inputMode="decimal"
                            value={allocationForm.quantity}
                            onChange={(event) => setAllocationForm((current) => ({ ...current, quantity: event.target.value }))}
                          />
                        </label>
                        <label>
                          <span>Birim payı (TL)</span>
                          <input
                            aria-label="Birim payı"
                            inputMode="decimal"
                            value={formatMinorInput(allocationForm.unitRateMinor)}
                            onChange={(event) => setAllocationForm((current) => ({ ...current, unitRateMinor: parseMajorInput(event.target.value) }))}
                          />
                        </label>
                        <label>
                          <span>Servis payı (TL)</span>
                          <input
                            aria-label="Servis payı"
                            inputMode="decimal"
                            value={formatMinorInput(allocationForm.allocatedAmountMinor)}
                            onChange={(event) => setAllocationForm((current) => ({ ...current, allocatedAmountMinor: parseMajorInput(event.target.value) }))}
                          />
                        </label>
                        <label>
                          <span>Dönem başlangıcı</span>
                          <input
                            aria-label="Dağıtım dönem başlangıcı"
                            type="date"
                            value={allocationForm.periodStart}
                            onChange={(event) => setAllocationForm((current) => ({ ...current, periodStart: event.target.value }))}
                          />
                        </label>
                        <label>
                          <span>Dönem bitişi</span>
                          <input
                            aria-label="Dağıtım dönem bitişi"
                            type="date"
                            value={allocationForm.periodEnd}
                            onChange={(event) => setAllocationForm((current) => ({ ...current, periodEnd: event.target.value }))}
                          />
                        </label>
                        <label>
                          <span>Kaynak referansı</span>
                          <input
                            aria-label="Dağıtım kaynak referansı"
                            value={allocationForm.sourceRef}
                            readOnly
                            onChange={(event) => setAllocationForm((current) => ({ ...current, sourceRef: event.target.value }))}
                          />
                        </label>
                        <label>
                          <span>Kullanım kanıtı referansı</span>
                          <input
                            aria-label="Kullanım kanıtı referansı"
                            value={allocationForm.evidenceRef}
                            onChange={(event) => setAllocationForm((current) => ({ ...current, evidenceRef: event.target.value }))}
                          />
                        </label>
                        {allocationError ? <div className="finance-service-cost-warning" role="alert">{allocationError}</div> : null}
                        <div className="finance-v21-card-actions">
                          <button type="button" className="btn sm ghost" onClick={() => setAllocationEntryId(null)} disabled={allocationBusy}>İptal</button>
                          <button type="button" className="btn sm primary" onClick={() => submitAllocation(line)} disabled={allocationBusy}>
                            {allocationBusy ? "Kaydediliyor..." : "Kanıtı kaydet"}
                          </button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="finance-service-cost-source-empty">Onaylı kaynak satırları bu önizlemeye taşınmadı; tutar veya dağıtım sonucu uydurulmadı.</div>
        )) : null}
      </div>
      {hasPendingServiceAllocation({ pendingAmountMinor: pendingServiceAmountMinor }) ? (
        <div className="finance-service-cost-warning" data-testid="room-cost-distribution-pending">
          {formatTRY(pendingServiceAmountMinor)} tutarındaki servis payı için dağıtım kanıtı bekliyor; bu tutar kesin vardiya maliyetine dahil edilmez.
        </div>
      ) : null}
      {typeof onViewChange === "function" ? (
        <div className="finance-service-cost-compare" data-testid="room-service-cost-vehicle-comparison">
          <div>
            <strong>Bu servise uygun araçları karşılaştır</strong>
            <span>Seçili servis/vardiya bağlamı korunarak Araç Karşılaştır ekranı açılır.</span>
          </div>
          <button type="button" className="btn sm" onClick={() => onViewChange("vehicle-comparison")}>
            Araçları karşılaştır
          </button>
        </div>
      ) : null}
    </div>
  );
}

function decisionAmount(value) {
  return value == null ? "Belirsiz" : formatTRY(value);
}

function coverageMinutesLabel(value) {
  if (value == null) return "Doğrulanmadı";
  const minutes = Math.max(0, Math.round(Number(value)));
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  if (!hours) return `${remainder} dakika`;
  if (!remainder) return `${hours} saat`;
  return `${hours} saat ${remainder} dakika`;
}

function DecisionEvidenceNotes({ decision }) {
  const missing = Array.isArray(decision?.missingLabels) ? decision.missingLabels : [];
  const blockers = Array.isArray(decision?.blockerLabels) ? decision.blockerLabels : [];
  const coverage = decision?.operationalCoverage || null;
  const driverCoverage = decision?.driverOperationalCoverage || null;
  if (!missing.length && !blockers.length && !coverage && !driverCoverage) return null;
  return (
    <div className="panelMeta" style={{ marginTop: 8 }}>
      {coverage ? (
        <div data-testid="operational-coverage-summary" style={{ marginBottom: missing.length || blockers.length ? 6 : 0 }}>
          <div><strong>Çalışma kapsamı:</strong> {coverage.statusLabel}</div>
          <div>Kanıtlı gerçekleşen çalışma: {coverageMinutesLabel(coverage.verifiedUsageMinutes)}</div>
          <div>Doğrulanmış boş kapasite: {coverageMinutesLabel(coverage.verifiedIdleMinutes)}</div>
          {coverage.unknownScope ? <div>Kalan süre için kayıt bulunmadığından boş olduğu varsayılmadı.</div> : null}
        </div>
      ) : null}
      {driverCoverage ? (
        <div data-testid="driver-monthly-coverage-summary" style={{ marginTop: coverage ? 6 : 0 }}>
          <div><strong>Sürücü aylık çalışma kapsamı:</strong> {driverCoverage.statusLabel}</div>
          <div>Kanıtlı sürücü çalışma süresi: {coverageMinutesLabel(driverCoverage.verifiedUsageMinutes)}</div>
          <div>Doğrulanmış boş sürücü zamanı: {coverageMinutesLabel(driverCoverage.verifiedIdleMinutes)}</div>
          {driverCoverage.unknownScope ? <div>Bu süre, sürücünün ay boyunca ücretli çalışma süresinin tamamı olarak kabul edilmedi.</div> : null}
        </div>
      ) : null}
      {missing.length ? <div><strong>Eksik kanıt:</strong> {missing.join(", ")}</div> : null}
      {blockers.length ? <div><strong>Sınır:</strong> {blockers.join(" · ")}</div> : null}
    </div>
  );
}

function DecisionComponentList({ components }) {
  if (!Array.isArray(components) || !components.length) {
    return <div className="panelMeta">Kategori bazlı gerçekleşmiş maliyet kanıtı bulunmuyor.</div>;
  }
  return (
    <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
      {components.map((component, index) => (
        <div key={buildDecisionComponentKey(component, index)} className="panelMeta" style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
          <span>{component.label}{component.sourceCount ? ` · ${component.sourceCount} kaynak` : ""}</span>
          <strong>{decisionAmount(component.amountMinor)}</strong>
        </div>
      ))}
    </div>
  );
}

function VatAdjustedProfitabilityBlock({ summary, onNavigate }) {
  if (!summary) return null;
  const evidence = summary.profitabilityEvidence || {};
  const unknownIds = Array.isArray(evidence.unknownVatSourceIds) ? evidence.unknownVatSourceIds : [];
  const afterTaxLabel = summary.estimatedAfterTaxNetProfitMinor == null
    ? "Hesaplanamadı"
    : decisionAmount(summary.estimatedAfterTaxNetProfitMinor);
  return (
    <div className="panelMeta" data-testid="vat-adjusted-profitability" style={{ marginTop: 10, padding: 10, border: "1px solid rgba(98,117,255,0.24)", borderRadius: 8 }}>
      <strong>KDV etkisiyle sonuç</strong>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 6, marginTop: 6 }}>
        <span>Net gelir: <b>{decisionAmount(summary.netEarnedRevenueMinor)}</b></span>
        <span>Brüt maliyet: <b>{decisionAmount(summary.grossActualCostMinor)}</b></span>
        <span>Faaliyet kârı: <b>{decisionAmount(summary.vatAdjustedOperatingProfitMinor)}</b></span>
        <span>Tahmini net kâr: <b>{afterTaxLabel}</b></span>
      </div>
      <div style={{ marginTop: 6 }}>
        {summary.estimatedAfterTaxNetProfitMinor == null
          ? "Vergi sonrası tahmin için doğrulanmış vergi girdisi bulunmuyor; faaliyet sonucu ayrı gösterilir."
          : "Vergi sonrası değer yalnız doğrulanmış vergi girdileriyle tahmini olarak gösterilir."}
      </div>
      {unknownIds.length ? (
        <div style={{ marginTop: 6 }}>
          KDV bilgisi eksik olan kayıtlar brüt maliyette korunuyor; KDV %0 varsayılmadı.
          {typeof onNavigate === "function" ? (
            <button type="button" className="btn sm ghost" style={{ marginLeft: 8 }} onClick={() => onNavigate({ focusEntryId: unknownIds[0], field: "vat", contextSource: "expense-entry" })}>
              KDV bilgisini tamamla
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function RoomDecisionLayerSummary({
  vehicleMonthDecision,
  contractMonthDecision,
  newOfferDecision,
  accountingPeriod,
  accountingPeriodReadiness,
  onAccountingPeriodTransition,
  onNavigate,
}) {
  const display = buildRoomDecisionLayerDisplay({ vehicleMonthDecision, contractMonthDecision, newOfferDecision });
  const vehicle = display.vehicle;
  const contract = display.contract;
  const offer = display.offer;
  const period = accountingPeriod || null;
  const periodReadiness = accountingPeriodReadiness || period?.readiness || null;
  const periodBlockers = Array.isArray(periodReadiness?.blockers) ? periodReadiness.blockers : [];
  const canStartReview = period?.status === "OPEN";
  const canPrepareClose = period?.status === "REVIEW" && periodReadiness?.readyForClose === true;
  return (
    <div className="card" data-testid="room-decision-layer-summary" style={{ marginTop: 12, border: "1px solid rgba(18,183,106,0.24)" }}>
      <div className="panelSectionTitle">Gerçek maliyet ve karar özeti</div>
      <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
        Sunucu tarafından hesaplanan dönem kararları gösterilir. Teklif bedeli kazanılmış gelir değildir; planlama, gerçekleşmiş gider ve tahsilat ayrı tutulur.
      </div>
      {period ? (
        <div className="card" data-testid="room-accounting-period" style={{ marginTop: 12, border: "1px solid rgba(247,144,9,0.3)", background: "rgba(247,144,9,0.05)" }}>
          <div className="panelSectionTitle">Muhasebe dönemi</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>
            {serviceContextDateRange(period.periodStart, period.periodEnd)} · <strong>{accountingPeriodStatusLabel(period.status)}</strong>
          </div>
          {periodBlockers.length ? (
            <div className="panelMeta" style={{ marginTop: 6 }}>
              Kapanış hazırlığı için: {periodBlockers.map(accountingPeriodBlockerLabel).join(" · ")}
            </div>
          ) : null}
          <div className="finance-v21-card-actions" style={{ marginTop: 8 }}>
            {canStartReview && typeof onAccountingPeriodTransition === "function" ? (
              <button type="button" className="btn sm" data-testid="room-accounting-period-review" onClick={() => onAccountingPeriodTransition("REVIEW")}>
                İncelemeye al
              </button>
            ) : null}
            {canPrepareClose && typeof onAccountingPeriodTransition === "function" ? (
              <button type="button" className="btn sm" data-testid="room-accounting-period-ready" onClick={() => onAccountingPeriodTransition("READY_TO_CLOSE")}>
                Kapanış hazırlığına al
              </button>
            ) : null}
            {period.status === "READY_TO_CLOSE" ? (
              <span className="panelMeta">Kesin kapanış ve yeniden açma mali müşavir/finans politikası onayı bekler.</span>
            ) : null}
          </div>
        </div>
      ) : null}
      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
        <div data-testid="vehicle-month-decision" className="card" style={{ margin: 0 }}>
          <div className="panelSectionTitle">Araç / ay sonucu</div>
          <div className="panelMeta" style={{ marginTop: 6 }}><strong>Durum:</strong> {vehicle.statusLabel}</div>
          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8 }}>
            <MetricCard title="Kazanılmış gelir" value={decisionAmount(vehicle.earnedIncomeMinor)} note="Hakediş/fatura kanıtı" tone={vehicle.earnedIncomeMinor == null ? "muted" : "good"} />
            <MetricCard title="Gerçekleşmiş gider" value={decisionAmount(vehicle.grossActualCostMinor)} note="Gerçek gider defteri" tone={vehicle.grossActualCostMinor == null ? "muted" : "good"} />
            <MetricCard title="Dağıtılmış gider" value={decisionAmount(vehicle.distributedActualCostMinor)} note="Kanıtlı servis payı" tone={vehicle.distributedActualCostMinor == null ? "muted" : "good"} />
            <MetricCard title="Faaliyet sonucu" value={decisionAmount(vehicle.activityResultMinor)} note="Geçici; kesin net kâr değildir" tone={vehicle.activityResultMinor == null ? "muted" : resultToneForMinor(vehicle.activityResultMinor)} />
          </div>
          <DecisionComponentList components={vehicle.costComponents} />
          <VatAdjustedProfitabilityBlock summary={vehicleMonthDecision?.vatAdjustedProfitability} onNavigate={onNavigate} />
          <DecisionEvidenceNotes decision={vehicle} />
        </div>
        <div data-testid="contract-month-decision" className="card" style={{ margin: 0 }}>
          <div className="panelSectionTitle">Sözleşme / ay sonucu</div>
          <div className="panelMeta" style={{ marginTop: 6 }}><strong>Durum:</strong> {contract.statusLabel}</div>
          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8 }}>
            <MetricCard title="Sözleşme bedeli" value={decisionAmount(contract.contractTotalMinor)} note="Teklif/kontrat toplamı" tone={contract.contractTotalMinor == null ? "muted" : "default"} />
            <MetricCard title="Kazanılmış dönem geliri" value={decisionAmount(contract.earnedRevenueMinor)} note="Teklif bedelinden ayrı" tone={contract.earnedRevenueMinor == null ? "muted" : "good"} />
            <MetricCard title="Gerçekleşmiş gider" value={decisionAmount(contract.grossActualCostMinor)} note="Gerçekleşen gider; planlama değildir" tone={contract.grossActualCostMinor == null ? "muted" : "good"} />
            <MetricCard title="Tahsil edilen" value={decisionAmount(contract.collectedCashMinor)} note="Kazanılmış gelirden ayrı" tone={contract.collectedCashMinor == null ? "muted" : "good"} />
          </div>
          <VatAdjustedProfitabilityBlock summary={contractMonthDecision?.vatAdjustedProfitability} onNavigate={onNavigate} />
          <DecisionEvidenceNotes decision={contract} />
        </div>
        <div data-testid="new-offer-decision" className="card" style={{ margin: 0 }}>
          <div className="panelSectionTitle">Yeni teklif kararı</div>
          <div className="panelMeta" style={{ marginTop: 6 }}><strong>Durum:</strong> {offer.statusLabel}</div>
          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8 }}>
            <MetricCard title={offer.scenarioOfferLabel} value={decisionAmount(offer.scenarioOfferMinor)} note={offer.scenarioOfferNote} tone={offer.scenarioOfferMinor == null ? "muted" : "default"} />
            <MetricCard title="Risk ayarlı maliyet" value={decisionAmount(offer.riskAdjustedCostMinor)} note="Temel tahmini maliyet + risk payı" tone={offer.riskAdjustedCostMinor == null ? "muted" : "default"} />
            <MetricCard title={offer.quoteFloorDefinitive ? "Minimum teklif tabanı" : "Kısmi teklif önizlemesi"} value={decisionAmount(offer.quoteFloorMinor)} note={offer.quoteFloorNote} tone={offer.quoteFloorMinor == null ? "muted" : offer.quoteFloorDefinitive ? "good" : "warm"} />
            <MetricCard title={offer.scenarioResultLabel} value={decisionAmount(offer.scenarioActivityResultMinor)} note={offer.scenarioResultNote} tone={offer.scenarioActivityResultMinor == null ? "muted" : resultToneForMinor(offer.scenarioActivityResultMinor)} />
            <MetricCard title="Maliyet sonrası oran (hedef/risk öncesi)" value={offer.scenarioContributionMarginBps == null ? "Belirsiz" : formatBps(offer.scenarioContributionMarginBps)} note={offer.marginBasisLabel} tone={offer.scenarioContributionMarginBps == null ? "muted" : resultToneForMinor(offer.scenarioContributionMarginBps)} />
          </div>
          <div className="panelMeta" style={{ marginTop: 8 }}><strong>Hedef katkı:</strong> {offer.targetContributionBps == null ? "Belirsiz" : formatBps(offer.targetContributionBps)} · <strong>Risk payı:</strong> {offer.riskReserveBps == null ? "Belirsiz" : formatBps(offer.riskReserveBps)}</div>
          <div className="panelMeta" data-testid="quote-economic-basis-note" style={{ marginTop: 6 }}>
            Bu fark, teklif ile temel tahmini maliyet arasındadır. Aşağıdaki planlama kazancı ise hedef katkı ve risk payı eklenmiş teklif tabanını kullanır; gerçekleşmiş gider ayrı gösterilir.
          </div>
          <div className="panelMeta" style={{ marginTop: 6 }}>{offer.offerSubmissionLabel}. Bu kart yalnız okuma/önizlemedir.</div>
          <DecisionEvidenceNotes decision={offer} />
        </div>
      </div>
    </div>
  );
}

function scopeMeta(scope, me = null) {
  if (scope === "ROOM") {
    return {
      title: preferredScopeTitle("ROOM"),
      subtitle: preferredScopeSubtitle("ROOM"),
      currentLabel: "Planlanan teklif",
      baselineLabel: "Tahmini maliyet",
      resultLabel: "Önerilen minimum teklif",
      amountLabel: "Teklif sinyali",
      amountGapLabel: "Kâr sonucu",
      endpointLabel: "Taşımacılık Firması önizlemesi",
    };
  }
  const requestedBuyerKind = normalizeText(me?.companyKind || me?.role);
  const buyerKind = ["SCHOOL", "ORGANIZATION"].includes(requestedBuyerKind)
    ? requestedBuyerKind
    : "COMPANY";
  const buyerLabel = buyerRoleLabel(buyerKind);
  return {
    title: buyerFinanceSurfaceTitle(buyerKind),
    subtitle: buyerFinanceSurfaceSubtitle(buyerKind),
    currentLabel: "Mevcut bütçe planı",
    baselineLabel: "Servis maliyeti",
    resultLabel: "Bütçe farkı",
    amountLabel: "Bütçe sinyali",
    amountGapLabel: "Bütçe farkı",
    endpointLabel: `${buyerLabel} önizlemesi`,
    buyerKind,
    buyerLabel,
    buyerTablistLabel: buyerFinanceTablistLabel(buyerKind),
  };
}

function readRoomDecisionQueryInputs() {
  if (typeof window === "undefined") return {};
  const hashQuery = String(window.location.hash || "").split("?")[1] || "";
  const query = new URLSearchParams(hashQuery);
  return {
    manualBaselineOperationalCostMinor: String(query.get("manualBaselineOperationalCostMinor") || "").trim(),
    targetContributionBps: String(query.get("targetContributionBps") || "").trim(),
    riskReserveBps: String(query.get("riskReserveBps") || "").trim(),
    quoteScenarioAmountMinor: String(query.get("quoteScenarioAmountMinor") || "").trim(),
  };
}

function initialForm() {
  const decisionQueryInputs = readRoomDecisionQueryInputs();
  const companyBudgetPlanId = readCompanyBudgetPlanQueryInput();
  return {
    manualBaselineOperationalCostMinor: decisionQueryInputs.manualBaselineOperationalCostMinor,
    targetContributionBps: decisionQueryInputs.targetContributionBps,
    riskReserveBps: decisionQueryInputs.riskReserveBps,
    serviceDistanceKm: "",
    emptyDistanceKm: "",
    routeDurationMinutes: "",
    passengerCount: "",
    vehicleCapacity: "",
    shiftCount: "",
    serviceDayCount: "",
    fuelType: "",
    fuelConsumptionLitersPer100Km: "",
    fuelUnitPriceMinor: "",
    driverBasePerShiftMinor: "",
    driverCompensationMode: "",
    maintenancePerKmMinor: "",
    vehicleLeaseMonthlyMinor: "",
    fixedVehicleCostMonthlyMinor: "",
    vehicleFixedCostAllocationMode: "",
    allocationServiceDaysPerMonth: "",
    quoteScenarioAmountMinor: decisionQueryInputs.quoteScenarioAmountMinor,
    budgetPlanId: companyBudgetPlanId,
    budgetPlanVersion: "",
    budgetAmountMinor: "",
    periodStart: "",
    periodEnd: "",
    budgetSource: "",
    budgetApprovalState: "draft",
    description: "",
    warningThresholdBps: "",
    agreementIds: [],
    currencyCode: "TRY",
    quoteContextHash: "",
    roomQuoteFloorDraftId: "",
    roomQuoteFloorDraftVersion: "",
    quoteFloorMinor: "",
    quoteFloorPerPassengerMinor: "",
    baselineSource: "",
    calculationVersion: "ROOM-PROFITABILITY-AND-QUOTE-FLOOR-01",
  };
}

const COMPANY_PLAN_FIELD_KEYS = [
  "budgetPlanId",
  "budgetPlanVersion",
  "budgetAmountMinor",
  "periodStart",
  "periodEnd",
  "budgetSource",
  "budgetApprovalState",
  "description",
  "warningThresholdBps",
  "currencyCode",
];

const ROOM_DRAFT_FIELD_KEYS = [
  "roomQuoteFloorDraftId",
  "roomQuoteFloorDraftVersion",
  "manualBaselineOperationalCostMinor",
  "targetContributionBps",
  "riskReserveBps",
  "quoteFloorMinor",
  "quoteFloorPerPassengerMinor",
  "baselineSource",
  "calculationVersion",
  "currencyCode",
];

function companyPlanFormFromPlan(plan = null) {
  if (!plan) return {};
  return {
    budgetPlanId: plan.id != null ? String(plan.id) : "",
    budgetPlanVersion: plan.version != null ? String(plan.version) : "",
    budgetAmountMinor: plan.budgetAmountMinor != null ? String(plan.budgetAmountMinor) : "",
    periodStart: plan.periodStart || "",
    periodEnd: plan.periodEnd || "",
    budgetSource: plan.budgetSource || "",
    budgetApprovalState: plan.budgetApprovalState || (plan.status === "ACTIVE" ? "approved" : "draft"),
    description: plan.description || "",
    warningThresholdBps: plan.warningThresholdBps != null ? String(plan.warningThresholdBps) : "",
    agreementIds: Array.isArray(plan.agreementIds)
      ? plan.agreementIds.map((id) => String(id))
      : Array.isArray(plan.scope?.selectedAgreementIds)
        ? plan.scope.selectedAgreementIds.map((id) => String(id))
        : [],
    currencyCode: plan.currencyCode || "TRY",
  };
}

function companyPlanFormIsBlank(form = {}) {
  return COMPANY_PLAN_FIELD_KEYS.every((key) => {
    const value = String(form?.[key] ?? "").trim();
    if (!value) return true;
    if (key === "budgetApprovalState" && value.toLowerCase() === "draft") return true;
    if (key === "currencyCode" && value.toUpperCase() === "TRY") return true;
    return false;
  });
}

function companyPlanPayloadFromForm(form = {}) {
  return {
    budgetAmountMinor: String(form?.budgetAmountMinor ?? "").trim(),
    periodStart: String(form?.periodStart ?? "").trim(),
    periodEnd: String(form?.periodEnd ?? "").trim(),
    budgetSource: String(form?.budgetSource ?? "").trim(),
    budgetApprovalState: String(form?.budgetApprovalState ?? "").trim(),
    description: String(form?.description ?? "").trim(),
    warningThresholdBps: String(form?.warningThresholdBps ?? "").trim(),
    agreementIds: Array.isArray(form?.agreementIds) ? form.agreementIds : [],
    currencyCode: String(form?.currencyCode ?? "").trim() || "TRY",
  };
}

function roomDraftFormFromDraft(draft = null) {
  if (!draft) return {};
  const snapshot = draft.inputSnapshot && typeof draft.inputSnapshot === "object" ? draft.inputSnapshot : {};
  const savedPlanningInputs = snapshot.computed?.planningInputs && typeof snapshot.computed.planningInputs === "object"
    ? snapshot.computed.planningInputs
    : {};
  return {
    roomQuoteFloorDraftId: draft.id != null ? String(draft.id) : "",
    roomQuoteFloorDraftVersion: draft.version != null ? String(draft.version) : "",
    manualBaselineOperationalCostMinor: draft.manualBaselineOperationalCostMinor != null ? String(draft.manualBaselineOperationalCostMinor) : "",
    targetContributionBps: draft.targetContributionBps != null ? String(draft.targetContributionBps) : "",
    riskReserveBps: draft.riskReserveBps != null ? String(draft.riskReserveBps) : "",
    quoteFloorMinor: draft.quoteFloorMinor != null ? String(draft.quoteFloorMinor) : "",
    quoteFloorPerPassengerMinor: draft.quoteFloorPerPassengerMinor != null ? String(draft.quoteFloorPerPassengerMinor) : "",
    baselineSource: draft.baselineSource || "",
    calculationVersion: draft.calculationVersion || "ROOM-PROFITABILITY-AND-QUOTE-FLOOR-01",
    currencyCode: draft.currencyCode || "TRY",
    quoteContextHash: snapshot.serviceContext?.scopeHash || "",
    ...savedPlanningInputs,
  };
}

function roomDraftFormIsBlank(form = {}) {
  return ROOM_DRAFT_FIELD_KEYS.every((key) => {
    const value = String(form?.[key] ?? "").trim();
    if (!value) return true;
    if (key === "calculationVersion" && value === "ROOM-PROFITABILITY-AND-QUOTE-FLOOR-01") return true;
    if (key === "currencyCode" && value.toUpperCase() === "TRY") return true;
    return false;
  });
}

function clearRoomDraftScopeFields(form = {}) {
  return {
    ...form,
    roomQuoteFloorDraftId: "",
    roomQuoteFloorDraftVersion: "",
    manualBaselineOperationalCostMinor: "",
    targetContributionBps: "",
    riskReserveBps: "",
    quoteFloorMinor: "",
    quoteFloorPerPassengerMinor: "",
    baselineSource: "",
    quoteContextHash: "",
    emptyDistanceKm: "",
    fuelType: "",
    fuelConsumptionLitersPer100Km: "",
    fuelUnitPriceMinor: "",
    driverBasePerShiftMinor: "",
    driverCompensationMode: "",
    maintenancePerKmMinor: "",
    vehicleLeaseMonthlyMinor: "",
    fixedVehicleCostMonthlyMinor: "",
    vehicleFixedCostAllocationMode: "",
    allocationServiceDaysPerMonth: "",
    quoteScenarioAmountMinor: "",
  };
}

function roomDraftPayloadFromForm(form = {}, serviceContext = {}) {
  return {
    manualBaselineOperationalCostMinor: String(form?.manualBaselineOperationalCostMinor ?? "").trim(),
    targetContributionBps: String(form?.targetContributionBps ?? "").trim(),
    riskReserveBps: String(form?.riskReserveBps ?? "").trim(),
    quoteFloorMinor: String(form?.quoteFloorMinor ?? "").trim(),
    quoteFloorPerPassengerMinor: String(form?.quoteFloorPerPassengerMinor ?? "").trim(),
    baselineSource: String(form?.baselineSource ?? "").trim(),
    calculationVersion: String(form?.calculationVersion ?? "").trim() || "ROOM-PROFITABILITY-AND-QUOTE-FLOOR-01",
    currencyCode: String(form?.currencyCode ?? "").trim() || "TRY",
    quoteContextHash: String(form?.quoteContextHash ?? "").trim(),
    emptyDistanceKm: String(form?.emptyDistanceKm ?? "").trim(),
    fuelType: String(form?.fuelType ?? "").trim(),
    fuelConsumptionLitersPer100Km: String(form?.fuelConsumptionLitersPer100Km ?? "").trim(),
    fuelUnitPriceMinor: String(form?.fuelUnitPriceMinor ?? "").trim(),
    driverBasePerShiftMinor: String(form?.driverBasePerShiftMinor ?? "").trim(),
    driverCompensationMode: String(form?.driverCompensationMode ?? "").trim(),
    maintenancePerKmMinor: String(form?.maintenancePerKmMinor ?? "").trim(),
    vehicleLeaseMonthlyMinor: String(form?.vehicleLeaseMonthlyMinor ?? "").trim(),
    fixedVehicleCostMonthlyMinor: String(form?.fixedVehicleCostMonthlyMinor ?? "").trim(),
    vehicleFixedCostAllocationMode: String(form?.vehicleFixedCostAllocationMode ?? "").trim(),
    allocationServiceDaysPerMonth: String(form?.allocationServiceDaysPerMonth ?? "").trim(),
    quoteScenarioAmountMinor: String(form?.quoteScenarioAmountMinor ?? "").trim(),
    serviceContext: {
      vehicleId: Number(serviceContext?.vehicleId || 0) || null,
      shiftId: Number(serviceContext?.shiftId || 0) || null,
      agreementId: Number(serviceContext?.agreementId || 0) || null,
    },
  };
}

function cleanParams(form) {
  const params = {};
  for (const [key, value] of Object.entries(form || {})) {
    const text = String(value ?? "").trim();
    if (!text) continue;
    params[key] = text;
  }
  return params;
}

function allowedForScope(scope, me) {
  const role = normalizeText(me?.role);
  const kind = normalizeText(me?.companyKind);
  if (scope === "ROOM") return role === "ROOM" || role === "SUPER_ADMIN";
  if (role === "SUPER_ADMIN") return true;
  if (role !== "COMPANY") return false;
  return kind === "" || ["COMPANY", "SCHOOL", "ORGANIZATION"].includes(kind);
}

function buildDeniedText(scope, me) {
  const role = normalizeText(me?.role) || "-";
  const kind = normalizeText(me?.companyKind) || "-";
  if (role === "COMPANY" && (kind === "SCHOOL" || kind === "ORGANIZATION")) {
    return "Bu alt kimlik için finansal operasyon yüzeyi kapalıdır. Bu alan salt okunur önizleme olarak kalır.";
  }
  return scope === "ROOM"
    ? "Bu rol için taşımacılık firması finansal operasyon yüzeyi görünmez. Bu alan salt okunur önizleme olarak kalır."
    : "Bu rol için hizmet alan firma finansal operasyon yüzeyi görünmez. Bu alan salt okunur önizleme olarak kalır.";
}

function FinancialOperationsDetailPanel({ scope = "ROOM", overviewSummary = false }) {
  const { token, me } = useSession();
  const [roomCostFocus, setRoomCostFocus] = useState(() => readRoomCostFocus({ usePersistedRoomSelection: scope === "ROOM" }));
  const [, setServiceCostContext] = useState(() => roomServiceContextFromFocus(readRoomCostFocus({ usePersistedRoomSelection: scope === "ROOM" })));
  const roomCostFocusRef = useRef(roomCostFocus);
  const [financeView, setFinanceView] = useState(() => readRoomFinanceView());
  const meta = useMemo(() => scopeMeta(scope, me), [me, scope]);
  const canView = useMemo(() => allowedForScope(scope, me), [scope, me]);
  const canManageRoomCosts = scope === "ROOM" && normalizeText(me?.role) === "ROOM";
  const [form, setForm] = useState(() => initialForm());
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState("");
  const [actionErr, setActionErr] = useState("");
  const [actionOk, setActionOk] = useState("");
  const [costedQuoteApprovalOpen, setCostedQuoteApprovalOpen] = useState(false);
  const [costedQuoteApprovalToken, setCostedQuoteApprovalToken] = useState("");
  const [err, setErr] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);
  const [incomeCorrectionTarget, setIncomeCorrectionTarget] = useState(null);
  const [selectedCompanyIncomeLink, setSelectedCompanyIncomeLink] = useState(null);
  const [roomDetailsOpen, setRoomDetailsOpen] = useState(false);
  const [serviceContextOpen, setServiceContextOpen] = useState(false);
  const [quoteContextPickerOpen, setQuoteContextPickerOpen] = useState(false);
  const [selectedRoomScenario, setSelectedRoomScenario] = useState(null);
  const [serviceDirectory, setServiceDirectory] = useState({ vehicles: [], shifts: [], agreements: [], drivers: [], offers: [] });
  const isRoomOfferDecisionView = scope === "ROOM" && financeView === "quote-profitability";
  const defaultRoomServiceContext = useMemo(
    () => selectDefaultComputableRoomService({
      ...serviceDirectory,
      preferredVehicleId: roomCostFocus.filterVehicleId,
      preferredPeriodStart: roomCostFocus.filterPeriodStart,
      preferredPeriodEnd: roomCostFocus.filterPeriodEnd,
    }),
    [roomCostFocus.filterPeriodEnd, roomCostFocus.filterPeriodStart, roomCostFocus.filterVehicleId, serviceDirectory],
  );
  useEffect(() => {
    roomCostFocusRef.current = roomCostFocus;
  }, [roomCostFocus]);
  const effectiveRoomCostFocus = useMemo(() => {
    if (
      scope === "ROOM"
      && financeViewUsesFocusedContext(financeView)
      && !isRoomOfferDecisionView
      && !roomCostFocus.agreementId
      && !roomCostFocus.shiftId
      && defaultRoomServiceContext
    ) {
      return { ...roomCostFocus, ...defaultRoomServiceContext };
    }
    return roomCostFocus;
  }, [defaultRoomServiceContext, financeView, isRoomOfferDecisionView, roomCostFocus, scope]);
  const hasExplicitServiceSelection = Boolean(effectiveRoomCostFocus.shiftId || effectiveRoomCostFocus.agreementId);
  const serviceCostContextRequired = roomServiceContextRequiredForView({
    view: financeView,
    hasExplicitServiceSelection,
    filterVehicleId: effectiveRoomCostFocus.filterVehicleId,
    filterDriverId: effectiveRoomCostFocus.filterDriverId,
    filterPeriodStart: effectiveRoomCostFocus.filterPeriodStart,
    filterPeriodEnd: effectiveRoomCostFocus.filterPeriodEnd,
  });
  const expenseEntryContext = typeof window !== "undefined"
    && isExpenseEntryContext(new URLSearchParams(String(window.location.hash || "").split("?")[1] || ""));
  const expenseLedgerFocus = roomExpenseLedgerFocusForView(roomCostFocus, {
    preserveExpenseEntryContext: expenseEntryContext,
  });

  const quotePreviewForm = useMemo(
    () => scope === "ROOM" ? roomQuoteFormForSelectedScenario(form, selectedRoomScenario) : form,
    [form, scope, selectedRoomScenario],
  );

  useEffect(() => {
    if (scope !== "ROOM") return;
    setSelectedRoomScenario(null);
  }, [
    effectiveRoomCostFocus.agreementId,
    effectiveRoomCostFocus.shiftId,
    effectiveRoomCostFocus.periodStart,
    effectiveRoomCostFocus.periodEnd,
    scope,
  ]);

  useEffect(() => {
    setForm(initialForm());
    setPreview(null);
    setErr("");
    setActionBusy("");
    setActionErr("");
    setActionOk("");
    setCostedQuoteApprovalOpen(false);
    setCostedQuoteApprovalToken("");
    setRefreshTick(0);
    setIncomeCorrectionTarget(null);
    setRoomDetailsOpen(false);
    setServiceContextOpen(false);
    setSelectedRoomScenario(null);
  }, [scope]);

  useEffect(() => {
    if (scope !== "ROOM" || !me?.roomId) return;
    if (readRoomFinanceView() === "service-cost") return;
    const persisted = readPersistedRoomServiceContext(me.roomId);
    if (!persisted) return;
    setServiceCostContext((current) => (
      current.vehicleId || current.driverId || current.shiftId || current.agreementId ? current : persisted
    ));
  }, [me?.roomId, scope]);

  useEffect(() => {
    if (scope !== "ROOM" || financeView !== "expenses" || typeof window === "undefined") return undefined;
    const currentParams = new URLSearchParams(String(window.location.hash || "").split("?")[1] || "");
    const hasServiceContext = !isExpenseEntryContext(currentParams)
      && ["focusVehicleId", "focusDriverId", "focusShiftId", "focusAgreementId", "focusCostCategory", "focusField", "contextSource"]
        .some((key) => currentParams.has(key));
    if (!hasServiceContext) return undefined;
    const cleaned = clearRoomFinanceServiceContextParams(currentParams);
    navigate(roomFinanceViewPath("expenses", Object.fromEntries(cleaned.entries())));
    return undefined;
  }, [financeView, scope]);

  useEffect(() => {
    if (scope !== "ROOM") return undefined;
    const syncRoomCostFocus = () => {
      const hashQuery = String(window.location.hash || "").split("?")[1] || "";
      const query = new URLSearchParams(hashQuery);
      const hasExplicitFocus = ["focusVehicleId", "focusDriverId", "focusShiftId", "focusAgreementId", "focusOfferId"]
        .some((key) => query.has(key));
      const hasPersistedRoomSelection = scope === "ROOM"
        && !query.has("focusShiftId")
        && Number(window.localStorage.getItem("room:focusShiftId") || 0) > 0;
      const readFocus = readRoomCostFocus({
        usePersistedRoomSelection: scope === "ROOM",
        consumePersistedRoomSelection: true,
      });
      const nextFocus = !hasExplicitFocus && !hasPersistedRoomSelection && roomCostFocusRef.current.shiftId
        ? mergeRoomServiceContextWithoutOverwritingOperationalFilters(
          readFocus,
          roomCostFocusRef.current,
          { blocked: query.get("serviceCostContextRequired") === "true" },
        )
        : readFocus;
      const nextView = readRoomFinanceView();
      const clearStaleServiceContext = shouldClearRoomServiceContextForOperationalFilterChange({
        hasExplicitServiceSelection: Boolean(nextFocus.shiftId || nextFocus.agreementId),
        currentVehicleId: nextFocus.vehicleId,
        // An offer/shift selection does not change the operational filters.
        // Treat absent filter keys as "unchanged"; passing null here would
        // incorrectly clear a newly selected offer that has no vehicle yet.
        nextVehicleId: query.has("filterVehicleId") ? nextFocus.filterVehicleId : undefined,
        currentPeriodStart: nextFocus.periodStart,
        currentPeriodEnd: nextFocus.periodEnd,
        nextPeriodStart: query.has("filterPeriodStart") ? nextFocus.filterPeriodStart : undefined,
        nextPeriodEnd: query.has("filterPeriodEnd") ? nextFocus.filterPeriodEnd : undefined,
      });
      if (clearStaleServiceContext && typeof window !== "undefined") {
        const currentParams = new URLSearchParams(String(window.location.hash || "").split("?")[1] || "");
        const clearedServiceParams = clearRoomFinanceServiceContextParams(currentParams);
        clearedServiceParams.delete("focusPeriodStart");
        clearedServiceParams.delete("focusPeriodEnd");
        if (nextView === "service-cost") clearedServiceParams.set("serviceCostContextRequired", "true");
        else clearedServiceParams.delete("serviceCostContextRequired");
        const emptyFocus = readRoomCostFocus({ usePersistedRoomSelection: scope === "ROOM" });
        setRoomCostFocus({
          ...emptyFocus,
          vehicleId: null,
          driverId: null,
          shiftId: null,
          agreementId: null,
          focusOfferId: null,
          periodStart: null,
          periodEnd: null,
        });
        setServiceCostContext(roomServiceContextFromFocus({}));
        clearPersistedRoomServiceContext(me?.roomId);
        setFinanceView(nextView);
        navigate(roomFinanceViewPath(nextView, Object.fromEntries(clearedServiceParams.entries())));
        return;
      }
      setRoomCostFocus(nextFocus);
      if (financeViewUsesFocusedContext(nextView)) {
        const nextServiceContext = roomServiceContextFromFocus(nextFocus);
        setServiceCostContext(nextServiceContext);
        writePersistedRoomServiceContext(me?.roomId, nextServiceContext);
      }
      setFinanceView(nextView);
    };
    syncRoomCostFocus();
    window.addEventListener("hashchange", syncRoomCostFocus);
    return () => window.removeEventListener("hashchange", syncRoomCostFocus);
  }, [me?.roomId, scope]);

  useEffect(() => {
    if (scope !== "ROOM" || !["overview", "service-cost", "quote-profitability", "expenses"].includes(financeView) || !token || !canManageRoomCosts) return undefined;
    let active = true;
    Promise.allSettled([
      api.get("/api/vehicles", { token }),
      api.get("/api/drivers", { token }),
      api.get("/api/shifts?take=200&includeOffered=1", { token }),
      api.get("/api/agreements?take=200", { token }),
      api.get("/api/offers/inbox?status=OPEN,COUNTERED,ACCEPTED&take=300", { token }),
    ]).then(([vehiclesResult, driversResult, shiftsResult, agreementsResult, offersResult]) => {
      if (!active) return;
      const vehicles = vehiclesResult.status === "fulfilled" ? vehiclesResult.value : null;
      const drivers = driversResult.status === "fulfilled" ? driversResult.value : null;
      const shifts = shiftsResult.status === "fulfilled" ? shiftsResult.value : null;
      const agreements = agreementsResult.status === "fulfilled" ? agreementsResult.value : null;
      const offers = offersResult.status === "fulfilled" ? offersResult.value : null;
      const nextDirectory = {
        vehicles: Array.isArray(vehicles?.items) ? vehicles.items : (Array.isArray(vehicles) ? vehicles : []),
        drivers: Array.isArray(drivers?.items) ? drivers.items : (Array.isArray(drivers) ? drivers : []),
        shifts: Array.isArray(shifts?.items) ? shifts.items : (Array.isArray(shifts) ? shifts : []),
        agreements: Array.isArray(agreements?.items) ? agreements.items : (Array.isArray(agreements) ? agreements : []),
        offers: Array.isArray(offers?.items) ? offers.items : (Array.isArray(offers) ? offers : []),
      };
      setServiceDirectory(nextDirectory);
      const currentParams = new URLSearchParams(String(window.location.hash || "").split("?")[1] || "");
      const hasExplicitUrlServiceContext = ["focusVehicleId", "focusShiftId", "focusAgreementId", "focusOfferId"]
        .some((key) => currentParams.has(key));
      if (
        financeViewUsesFocusedContext(financeView)
        && !isRoomOfferDecisionView
        && !hasExplicitUrlServiceContext
        && !roomCostFocus.shiftId
        && !roomCostFocus.agreementId
      ) {
        const defaultContext = selectDefaultComputableRoomService({
          ...nextDirectory,
          preferredVehicleId: roomCostFocus.filterVehicleId,
          preferredPeriodStart: roomCostFocus.filterPeriodStart,
          preferredPeriodEnd: roomCostFocus.filterPeriodEnd,
        });
        const contextMatchesDefault = defaultContext
          && Number(roomCostFocus.vehicleId || 0) === Number(defaultContext.vehicleId || 0)
          && Number(roomCostFocus.shiftId || 0) === Number(defaultContext.shiftId || 0)
          && Number(roomCostFocus.agreementId || 0) === Number(defaultContext.agreementId || 0)
          && String(roomCostFocus.periodStart || "") === String(defaultContext.periodStart || "")
          && String(roomCostFocus.periodEnd || "") === String(defaultContext.periodEnd || "");
        if (defaultContext && !contextMatchesDefault) {
          const nextFocus = { ...roomCostFocus, ...defaultContext };
          setRoomCostFocus(nextFocus);
          setServiceCostContext(roomServiceContextFromFocus(nextFocus));
          writePersistedRoomServiceContext(me?.roomId, nextFocus);
        }
      }
    });
    return () => { active = false; };
  }, [canManageRoomCosts, financeView, isRoomOfferDecisionView, me?.roomId, refreshTick, roomCostFocus, scope, token]);

  useEffect(() => {
    if (
      scope !== "ROOM"
      || !canManageRoomCosts
      || !financeViewUsesFocusedContext(financeView)
      || isRoomOfferDecisionView
      || roomCostFocus.agreementId
      || roomCostFocus.shiftId
      || !serviceDirectory.agreements.length
      || !serviceDirectory.shifts.length
    ) return;

    const defaultContext = defaultRoomServiceContext;
    if (!defaultContext) return;
    const nextFocus = { ...roomCostFocus, ...defaultContext };
    setRoomCostFocus((current) => (
      current.agreementId || current.shiftId ? current : { ...current, ...defaultContext }
    ));
    setServiceCostContext(roomServiceContextFromFocus(nextFocus));
    writePersistedRoomServiceContext(me?.roomId, nextFocus);
  }, [
    canManageRoomCosts,
    financeView,
    isRoomOfferDecisionView,
    me?.roomId,
    roomCostFocus.agreementId,
    roomCostFocus.shiftId,
    roomCostFocus,
    scope,
    serviceDirectory,
    defaultRoomServiceContext,
  ]);

  function rememberServiceCostContext(nextContext = roomCostFocus) {
    const normalized = roomServiceContextFromFocus(nextContext);
    setServiceCostContext(normalized);
    writePersistedRoomServiceContext(me?.roomId, normalized);
  }

  function handleRoomCostNavigate({ costCategory, field, focusEntryId, periodStart, periodEnd, recordKind, vehicleId, driverId, shiftId, agreementId, contextSource, recordPath, returnTo } = {}) {
    if (!canManageRoomCosts) {
      handleFinanceViewChange("service-cost");
      return;
    }
    if (recordPath) {
      navigate(String(recordPath));
      return;
    }
    rememberServiceCostContext(roomCostFocus);
    const currentParams = new URLSearchParams(String(window.location.hash || "").split("?")[1] || "");
    const params = clearRoomFinanceContextParams(currentParams);
    if (focusEntryId) {
      params.set("focusEntryId", String(focusEntryId));
      params.delete("focusCostCategory");
    } else if (costCategory) {
      params.set("focusCostCategory", String(costCategory).toUpperCase());
      if (roomCostFocus.vehicleId) params.set("prefillVehicleId", String(roomCostFocus.vehicleId));
      if (roomCostFocus.driverId) params.set("prefillDriverId", String(roomCostFocus.driverId));
    }
    if (field && focusEntryId) params.set("focusField", String(field));
    if (periodStart) params.set("focusPeriodStart", String(periodStart));
    if (periodEnd) params.set("focusPeriodEnd", String(periodEnd));
    if (recordKind) params.set("focusRecordKind", String(recordKind).toUpperCase());
    for (const [key, value] of Object.entries({ focusVehicleId: vehicleId, focusDriverId: driverId, focusShiftId: shiftId, focusAgreementId: agreementId })) {
      const id = Number(value || 0);
      if (Number.isSafeInteger(id) && id > 0) params.set(key, String(id));
    }
    if (contextSource === "expense-entry") params.set("contextSource", "expense-entry");
    if (returnTo) params.set("returnTo", String(returnTo));
    navigate(roomFinanceViewPath("expenses", Object.fromEntries(params.entries())));
  }

  function handleRoomContextChange({ vehicleId, shiftId, agreementId } = {}) {
    if (!canManageRoomCosts) return;
    rememberServiceCostContext({ vehicleId, shiftId, agreementId });
    const params = new URLSearchParams(String(window.location.hash || "").split("?")[1] || "");
    const contextParams = {
      focusVehicleId: vehicleId,
      focusShiftId: shiftId,
      focusAgreementId: agreementId,
    };
    Object.entries(contextParams).forEach(([key, value]) => {
      const id = Number(value || 0);
      if (Number.isSafeInteger(id) && id > 0) params.set(key, String(id));
      else params.delete(key);
    });
    navigate(roomFinanceViewPath("overview", Object.fromEntries(params.entries())));
  }

  function handleServiceCostContextChange({ vehicleId, shiftId, agreementId, periodStart, periodEnd } = {}) {
    if (!canManageRoomCosts) return;
    setServiceContextOpen(false);
    rememberServiceCostContext({ vehicleId, shiftId, agreementId, periodStart, periodEnd });
    const params = new URLSearchParams(String(window.location.hash || "").split("?")[1] || "");
    const contextParams = {
      focusVehicleId: vehicleId,
      focusShiftId: shiftId,
      focusAgreementId: agreementId,
    };
    Object.entries(contextParams).forEach(([key, value]) => {
      const id = Number(value || 0);
      if (Number.isSafeInteger(id) && id > 0) params.set(key, String(id));
      else params.delete(key);
    });
    const normalizedPeriodStart = dateInputValue(periodStart);
    const normalizedPeriodEnd = dateInputValue(periodEnd);
    if (normalizedPeriodStart) params.set("focusPeriodStart", normalizedPeriodStart);
    else params.delete("focusPeriodStart");
    if (normalizedPeriodEnd) params.set("focusPeriodEnd", normalizedPeriodEnd);
    else params.delete("focusPeriodEnd");
    if (shiftId || agreementId) params.delete("serviceCostContextRequired");
    else params.set("serviceCostContextRequired", "true");
    navigate(roomFinanceViewPath("service-cost", Object.fromEntries(params.entries())));
  }

  function handleRoomFinanceOfferSelection(option) {
    if (!canManageRoomCosts) return;
    if (!option) {
      clearPersistedRoomServiceContext(me?.roomId);
      const params = new URLSearchParams(String(window.location.hash || "").split("?")[1] || "");
      ["focusVehicleId", "focusDriverId", "focusShiftId", "focusAgreementId", "focusOfferId", "focusPeriodStart", "focusPeriodEnd", "serviceCostContextRequired"].forEach((key) => params.delete(key));
      setQuoteContextPickerOpen(false);
      navigate(roomFinanceViewPath(financeView, Object.fromEntries(params.entries())));
      return;
    }
    const shift = serviceDirectory.shifts.find((item) => Number(item?.id) === Number(option.shiftId)) || option.shift || null;
    if (!shift?.id) return;
    const focus = buildRoomQuoteContextFocus({ agreement: null, shift });
    rememberServiceCostContext(focus);
    const params = new URLSearchParams(String(window.location.hash || "").split("?")[1] || "");
    for (const [key, value] of Object.entries({
      focusVehicleId: focus.vehicleId,
      focusShiftId: focus.shiftId,
      focusAgreementId: null,
      focusOfferId: option.kind === "OFFER" ? option.offerId : null,
      focusPeriodStart: focus.periodStart,
      focusPeriodEnd: focus.periodEnd,
    })) {
      const text = String(value ?? "").trim();
      if (text) params.set(key, text);
      else params.delete(key);
    }
    setQuoteContextPickerOpen(false);
    navigate(roomFinanceViewPath(financeView, Object.fromEntries(params.entries())));
  }

  function handleOperationalFilterChange({ vehicleId, driverId, periodStart, periodEnd, clear = false } = {}) {
    if (scope !== "ROOM") return;
    let params = new URLSearchParams(String(window.location.hash || "").split("?")[1] || "");
    const hasExplicitServiceSelection = Boolean(roomCostFocus.shiftId || roomCostFocus.agreementId);
    const currentOperationalFilters = operationalFilterValuesFromUrl(params, roomCostFocus);
    const clearServiceContext = !clear && shouldClearRoomServiceContextForOperationalFilterChange({
      hasExplicitServiceSelection,
      currentVehicleId: currentOperationalFilters.filterVehicleId || roomCostFocus.vehicleId,
      nextVehicleId: vehicleId,
      currentPeriodStart: roomCostFocus.periodStart,
      currentPeriodEnd: roomCostFocus.periodEnd,
      nextPeriodStart: periodStart,
      nextPeriodEnd: periodEnd,
    });
    if (clearServiceContext) {
      const clearedServiceParams = clearRoomFinanceServiceContextParams(params);
      clearedServiceParams.delete("focusPeriodStart");
      clearedServiceParams.delete("focusPeriodEnd");
      clearedServiceParams.set("serviceCostContextRequired", "true");
      params = clearedServiceParams;
      setServiceCostContext(roomServiceContextFromFocus({}));
      clearPersistedRoomServiceContext(me?.roomId);
    }
    if (clear) {
      for (const key of ["filterVehicleId", "filterDriverId", "filterPeriodStart", "filterPeriodEnd", "operationalScope"]) params.delete(key);
    } else {
      const nextValues = {
        filterVehicleId: vehicleId === undefined ? currentOperationalFilters.filterVehicleId : vehicleId,
        filterDriverId: driverId === undefined ? currentOperationalFilters.filterDriverId : driverId,
        filterPeriodStart: periodStart === undefined ? currentOperationalFilters.filterPeriodStart : periodStart,
        filterPeriodEnd: periodEnd === undefined ? currentOperationalFilters.filterPeriodEnd : periodEnd,
      };
      for (const [key, value] of Object.entries(nextValues)) {
        const text = String(value ?? "").trim();
        if (text) params.set(key, text);
        else if (value === null || value === undefined || text === "") params.delete(key);
      }
      const hasOperationalSelection = ["filterVehicleId", "filterDriverId", "filterPeriodStart", "filterPeriodEnd"]
        .some((key) => params.has(key));
      if (hasOperationalSelection) params.set("operationalScope", "realized");
      else params.delete("operationalScope");
    }
    navigate(roomFinanceViewPath(financeView, Object.fromEntries(params.entries())));
  }

  function handleFinanceViewChange(nextView) {
    const params = new URLSearchParams(String(window.location.hash || "").split("?")[1] || "");
    const requestedView = String(nextView || "").trim().toLowerCase();
    const nextFinanceView = requestedView === "vehicle-comparison" ? "quote-profitability" : requestedView;
    const hasExplicitServiceSelection = Boolean(roomCostFocus.shiftId || roomCostFocus.agreementId);
    if (nextFinanceView === "expenses") rememberServiceCostContext(roomCostFocus);
    if (nextFinanceView === "service-cost" && !hasExplicitServiceSelection) {
      const emptyContext = roomServiceContextFromFocus({});
      setServiceCostContext(emptyContext);
      clearPersistedRoomServiceContext(me?.roomId);
    }
    const nextParams = nextFinanceView === "expenses"
      ? clearRoomFinanceContextParamsPreservingOperationalFilters(params)
      : nextFinanceView === "service-cost"
        ? clearRoomFinanceServiceContextParams(params)
        : params;
    if (nextFinanceView === "overview") {
      nextParams.delete("filterVehicleId");
      nextParams.delete("filterDriverId");
      nextParams.delete("operationalScope");
    }
    if (nextFinanceView !== "service-cost") nextParams.delete("serviceCostContextRequired");
    if (nextFinanceView === "service-cost") {
      const context = hasExplicitServiceSelection
        ? roomServiceContextFromFocus(roomCostFocus)
        : roomServiceContextFromFocus({});
      for (const [key, value] of Object.entries({
        focusVehicleId: context.vehicleId,
        focusDriverId: context.driverId,
        focusShiftId: context.shiftId,
        focusAgreementId: context.agreementId,
      })) {
        if (value) nextParams.set(key, String(value));
      }
      if (context.periodStart) nextParams.set("focusPeriodStart", context.periodStart);
      if (context.periodEnd) nextParams.set("focusPeriodEnd", context.periodEnd);
      if (!hasExplicitServiceSelection) nextParams.set("serviceCostContextRequired", "true");
    }
    navigate(roomFinanceViewPath(nextView, Object.fromEntries(nextParams.entries())));
  }

  async function handleServiceCostAllocation({ line, input } = {}) {
    if (!canManageRoomCosts || !line?.entryId) {
      throw new Error("Bu kullanım kanıtı için ROOM yetkisi gerekir.");
    }
    try {
      await upsertRoomCostAllocationLine(line.entryId, input, { token });
      setRefreshTick((current) => current + 1);
    } catch (error) {
      const info = getApiErrorInfo(error, "Kullanım kanıtı kaydedilemedi.");
      throw new Error(info.message || "Kullanım kanıtı kaydedilemedi.");
    }
  }

  async function handleAutomaticServiceCostAllocation({ line } = {}) {
    if (!canManageRoomCosts || !line?.entryId) {
      throw new Error("Bu otomatik dağıtım için ROOM yetkisi gerekir.");
    }
    try {
      await autoAllocateRoomCostByCanonicalUsage(line.entryId, { token });
      setRefreshTick((current) => current + 1);
    } catch (error) {
        const info = getApiErrorInfo(error, "Kayıtlı vardiya kullanımına göre dağıtım yapılamadı.");
        throw new Error(info.message || "Kayıtlı vardiya kullanımına göre dağıtım yapılamadı.");
    }
  }

  async function handleAccountingPeriodTransition(targetStatus) {
    if (!canManageRoomCosts) {
      throw new Error("Bu dönem işlemi için ROOM yetkisi gerekir.");
    }
    const periodStart = preview?.accountingPeriod?.periodStart
      || selectedServiceShift?.startAt
      || selectedServiceAgreement?.startAt
      || roomCostFocus.periodStart
      || null;
    const periodEnd = preview?.accountingPeriod?.periodEnd
      || selectedServiceShift?.endAt
      || selectedServiceAgreement?.endAt
      || roomCostFocus.periodEnd
      || null;
    if (!periodStart || !periodEnd) {
      throw new Error("Muhasebe dönemi için başlangıç ve bitiş tarihi gerekir.");
    }
    setActionBusy("accounting-period");
    setActionErr("");
    setActionOk("");
    try {
      await api.post(
        "/api/commercial-core/room/financial-operations/costs/accounting-periods/transition",
        {
          periodStart,
          periodEnd,
          targetStatus: String(targetStatus || "").toUpperCase(),
          confirmed: true,
        },
        { token },
      );
      setActionOk("Muhasebe dönemi durumu güncellendi.");
      setRefreshTick((current) => current + 1);
    } catch (error) {
      const info = getApiErrorInfo(error, "Muhasebe dönemi güncellenemedi.");
      setActionErr(info.message || "Muhasebe dönemi güncellenemedi.");
      throw new Error(info.message || "Muhasebe dönemi güncellenemedi.");
    } finally {
      setActionBusy("");
    }
  }

  function clearExpenseFocus() {
    const params = new URLSearchParams(String(window.location.hash || "").split("?")[1] || "");
    const cleared = clearRoomFinanceContextParams(params);
    navigate(roomFinanceViewPath("expenses", Object.fromEntries(cleared.entries())));
  }

  function openOverviewExpenses() {
    navigate(roomFinanceViewPath("expenses", { action: "add" }));
  }

  function openQuoteMissingCostEditor(item = {}) {
    if (scope !== "ROOM" || !canManageRoomCosts) return;
    const missingKey = String(item?.missingOptionalCosts?.[0]?.key || item?.key || "")
      .trim()
      .toLowerCase()
      .replace(/_(?:allocated|actual|planning)$/u, "");
    const categoryByMissingKey = {
      driver_labor: "EMPLOYER_MONTHLY_COST",
      vehicle_variable: "MAINTENANCE",
      vehicle_fixed: "DEPRECIATION",
      route_fees: "HGS_TOLL",
      adblue: "ADBLUE",
      operations_overhead: "OPERATIONS_OVERHEAD",
      other_direct_cost: "OTHER_OPERATION",
    };
    const categoryKey = categoryByMissingKey[missingKey] || "OTHER_OPERATION";
    // The selected offer is canonical URL state. Keep it even when the
    // directory refresh has not reconciled the derived option yet; otherwise
    // a quote-specific forecast silently degrades into a shift cost entry.
    const currentParams = new URLSearchParams(String(window.location.hash || "").split("?")[1] || "");
    const urlOfferId = Number(currentParams.get("focusOfferId") || 0) || null;
    const offerId = Number(selectedRoomFinanceOfferId || effectiveRoomCostFocus.focusOfferId || urlOfferId || 0) || null;
    const shiftId = Number(selectedServiceShiftId || effectiveRoomCostFocus.shiftId || 0) || null;
    const agreementId = Number(selectedServiceAgreementId || effectiveRoomCostFocus.agreementId || 0) || null;
    const vehicleId = Number(item?.vehicleId || item?.availability?.vehicleId || selectedRoomScenario?.vehicleId || selectedServiceVehicleId || 0) || null;
    const driverId = Number(item?.driverId || item?.availability?.driverId || selectedServiceDriverId || 0) || null;
    const returnParams = new URLSearchParams(currentParams);
    returnParams.set("view", "quote-profitability");
    if (form.quoteScenarioAmountMinor) returnParams.set("quoteScenarioAmountMinor", String(form.quoteScenarioAmountMinor));
    const returnTo = roomFinanceViewPath("quote-profitability", Object.fromEntries(returnParams.entries()));
    const params = new URLSearchParams({
      contextSource: "expense-entry",
      focusRecordKind: "FORECAST",
      focusCostCategory: categoryKey,
      focusField: "amount",
      ...(offerId ? { focusOfferId: String(offerId) } : {}),
      ...(shiftId ? { focusShiftId: String(shiftId) } : {}),
      ...(agreementId ? { focusAgreementId: String(agreementId) } : {}),
      ...(vehicleId ? { focusVehicleId: String(vehicleId), prefillVehicleId: String(vehicleId) } : {}),
      ...(driverId ? { focusDriverId: String(driverId), prefillDriverId: String(driverId) } : {}),
      ...(effectiveRoomCostFocus.periodStart ? { focusPeriodStart: String(effectiveRoomCostFocus.periodStart) } : {}),
      ...(effectiveRoomCostFocus.periodEnd ? { focusPeriodEnd: String(effectiveRoomCostFocus.periodEnd) } : {}),
      returnTo,
    });
    // This route is a focused forecast editor, not the generic add flow.
    // Do not let a stale action flag reopen the batch composer.
    params.delete("action");
    navigate(roomFinanceViewPath("expenses", Object.fromEntries(params.entries())));
  }

  function openAllOverviewExpenses({ expenseFilter = "", focusEntryId = "", periodStart = "", periodEnd = "", vehicleId = "" } = {}) {
    navigate(roomFinanceViewPath("expenses", {
      ...(expenseFilter ? { expenseFilter } : {}),
      ...(focusEntryId ? { focusEntryId } : {}),
      ...(vehicleId ? { filterVehicleId: vehicleId } : {}),
      ...(periodStart ? { filterPeriodStart: periodStart } : {}),
      ...(periodEnd ? { filterPeriodEnd: periodEnd } : {}),
      ...(vehicleId || periodStart || periodEnd ? { operationalScope: "realized" } : {}),
    }));
  }

  const openIncomeEvidence = useCallback((incomeLink = {}) => {
    if (scope === "COMPANY") {
      const invoiceId = Number(incomeLink?.invoiceId || 0);
      if (!Number.isSafeInteger(invoiceId) || invoiceId <= 0) return;
      setSelectedCompanyIncomeLink(incomeLink);
      writeCompanyIncomeInvoiceQuery(incomeLink);
      return;
    }
    const { agreementId, periodStart = "", periodEnd = "" } = incomeLink;
    const id = Number(agreementId || 0);
    if (!Number.isSafeInteger(id) || id <= 0) return;
    const params = new URLSearchParams({ agreementId: String(id), tab: "settlement" });
    if (periodStart) params.set("focusPeriodStart", String(periodStart));
    if (periodEnd) params.set("focusPeriodEnd", String(periodEnd));
    navigate(`/room/commercial-flow?${params.toString()}`);
  }, [scope]);

  function openIncomeCorrection(target = null) {
    setIncomeCorrectionTarget(target?.hakedisId ? target : null);
  }

  function handleCompanyBudgetPlanSelect(planId) {
    const selectedPlan = Array.isArray(preview?.budgetPlan?.items)
      ? preview.budgetPlan.items.find((plan) => String(plan?.id ?? "") === String(planId ?? ""))
      : null;
    if (!selectedPlan) return;
    setCopilotSelection(buildCompanyFinancialCopilotSelection({
      financeView,
      preview: {
        ...(preview || {}),
        budgetPlan: {
          ...(preview?.budgetPlan || {}),
          current: selectedPlan,
        },
        commitmentSummary: null,
      },
    }));
    setForm((prev) => ({
      ...prev,
      ...companyPlanFormFromPlan(selectedPlan),
    }));
    if (scope === "COMPANY") {
      const selectedBudgetPath = `/company/financial-operations?budgetPlanId=${encodeURIComponent(String(selectedPlan.id))}`;
      if (typeof window !== "undefined") {
        window.location.hash = selectedBudgetPath;
      } else {
        navigate(selectedBudgetPath);
      }
    }
    setRefreshTick((current) => current + 1);
  }

  useEffect(() => {
    if (scope !== "COMPANY") return;
    const currentPlan = preview?.budgetPlan?.current || null;
    if (!currentPlan) return;
    setForm((prev) => {
      if (!companyPlanFormIsBlank(prev)) {
        return prev;
      }
      return {
        ...prev,
        ...companyPlanFormFromPlan(currentPlan),
      };
    });
  }, [preview, scope]);

  useEffect(() => {
    if (scope !== "ROOM") return;
    const currentDraft = preview?.quoteFloorDraft?.current || null;
    setForm((prev) => {
      if (
        financeViewUsesFocusedContext(financeView)
        && !currentDraft
        && String(prev.roomQuoteFloorDraftId || "").trim()
      ) {
        return clearRoomDraftScopeFields(prev);
      }
      if (!currentDraft) return prev;
      if (!roomDraftFormIsBlank(prev)) {
        return prev;
      }
      return {
        ...prev,
        ...roomDraftFormFromDraft(currentDraft),
      };
    });
  }, [financeView, preview, scope]);

  useEffect(() => {
    if (!token || !canView || (overviewSummary && scope === "ROOM" && financeView === "overview")) return undefined;
    const serviceCostContextMissing = scope === "ROOM"
      && financeView === "service-cost"
      && !effectiveRoomCostFocus.shiftId
      && !effectiveRoomCostFocus.agreementId;
    const roomOfferContextMissing = scope === "ROOM"
      && isRoomOfferDecisionView
      && !effectiveRoomCostFocus.shiftId;
    if (serviceCostContextMissing || roomOfferContextMissing) {
      setLoading(false);
      setErr("");
      setPreview(null);
      return undefined;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setErr("");
      try {
        const params = cleanParams(scope === "ROOM"
          ? buildRoomDecisionRequestParams({
            form: quotePreviewForm,
            focusedContext: financeViewUsesFocusedContext(financeView),
            serviceCostContextRequired,
            roomCostFocus: effectiveRoomCostFocus,
          })
          : {
            ...form,
            ...(typeof window !== "undefined"
              ? readCompanyFinancialFocusFromHash(window.location.hash)
              : {}),
          });
        const [payload, currentScopeOverview] = scope === "ROOM"
          ? await Promise.all([
            getRoomFinancialOperationsPreview(token, params, { signal: controller.signal, force: true }),
            getCurrentRoomQuoteFloorDraft(token, params, { signal: controller.signal, force: true }),
          ])
          : await Promise.all([
            getCompanyFinancialOperationsPreview(token, params, { signal: controller.signal, force: true }),
            getCurrentCompanyBudgetPlan(token, params, { signal: controller.signal, force: true }),
          ]);
        const mergedPayload = scope === "ROOM"
          ? {
            ...(payload || {}),
            quoteFloorDraft: currentScopeOverview || payload?.quoteFloorDraft || null,
          }
          : {
            ...(payload || {}),
            budgetPlan: currentScopeOverview || payload?.budgetPlan || null,
          };
        if (!controller.signal.aborted) {
          setPreview(mergedPayload || null);
          if (scope === "COMPANY") {
            const publishCompanySelection = () => {
              if (!controller.signal.aborted) {
                setCopilotSelection(buildCompanyFinancialCopilotSelection({
                  financeView,
                  preview: mergedPayload,
                }));
              }
            };
            if (typeof window !== "undefined") window.setTimeout(publishCompanySelection, 0);
            else publishCompanySelection();
          }
        }
      } catch (e) {
        if (e?.name === "AbortError" || controller.signal.aborted) return;
        const info = getApiErrorInfo(e, "Finansal operasyon önizlemesi okunamadı.");
        setErr(info.message || "Finansal operasyon önizlemesi okunamadı.");
        setPreview(null);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 280);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [canView, effectiveRoomCostFocus, financeView, form, isRoomOfferDecisionView, overviewSummary, quotePreviewForm, refreshTick, scope, serviceCostContextRequired, token]);

  const snapshot = preview?.snapshot || {};
  const selectedServiceContext = preview?.related?.selectedContext || null;
  const model = preview?.operationalCostModel || {};
  const quoteFloor = preview?.quoteFloor || {};
  const roomProfitability = preview?.roomProfitability || null;
  const selectedScenarioQuoteActive = scope === "ROOM" && Boolean(selectedRoomScenario?.scenarioId);
  const selectedScenarioPeriodPlanning = resolveSelectedScenarioPeriodPlanning({
    selectedScenarioQuoteActive,
    selectedScenario: selectedRoomScenario,
    previewPeriodPlanning: preview?.periodPlanning,
  });
  const periodPlanningDisplay = buildPeriodPlanningDisplay({
    periodPlanning: selectedScenarioQuoteActive ? selectedScenarioPeriodPlanning : preview?.periodPlanning,
    selectedShiftQuoteFloorMinor: selectedScenarioQuoteActive
      ? null
      : preview?.selectedShiftNewOfferDecision?.baselineOperationalCostMinor
        ?? quoteFloor?.baselineOperationalCostMinor
        ?? preview?.selectedShiftNewOfferDecision?.quoteFloorMinor
        ?? quoteFloor?.quoteFloorMinor,
  });
  const periodScopeActive = Boolean(
    (selectedScenarioQuoteActive || preview?.periodPlanning)
    && (effectiveRoomCostFocus.agreementId || preview?.serviceCostContext?.contractless === true),
  );
  const periodPreview = periodScopeActive && periodPlanningDisplay.comparisonAllowed
    ? preview?.periodFinancialPreview || null
    : null;
  const periodQuoteFloor = periodPreview?.quoteFloor || null;
  const periodRoomProfitability = periodPreview?.roomProfitability || null;
  const serviceCostScope = preview?.serviceCostScope || null;
  const missingFields = Array.from(new Set([
    ...(model?.missingFields || []),
    ...(quoteFloor?.missingFields || []),
    ...(roomProfitability?.missingFields || []),
  ]));
  const missingFieldLabels = financeFieldLabels(missingFields);
  const missingFieldText = missingFields.map((field) => normalizeText(field));
  const quoteMissingEvidenceLabels = Array.from(new Set(missingFields.map((field, index) => {
    const normalized = normalizeText(field);
    if (normalized.includes("DISTANCE") || normalized.includes("ROUTE") || normalized.includes("MESAFE") || normalized.includes("ROTA")) {
      return "Doğrulanmış rota mesafesi";
    }
    if (normalized.includes("FUEL") || normalized.includes("YAKIT")) {
      return "Doğrulanmış yakıt girdileri";
    }
    return missingFieldLabels[index] || "Eksik hesap kanıtı";
  })));
  if (periodScopeActive) {
    for (const label of periodPlanningDisplay.missingLabels) {
      if (!quoteMissingEvidenceLabels.includes(label)) quoteMissingEvidenceLabels.push(label);
    }
  }
  const hasMissingField = (...needles) => missingFieldText.some((field) => needles.some((needle) => field.includes(normalizeText(needle))));
  const modelComponents = Array.isArray(model?.components) ? model.components : [];
  const vehicleVariableComponent = modelComponents.find((component) => component?.componentKey === "vehicle_variable") || null;
  const vehicleVariableIncomplete = Boolean(
    vehicleVariableComponent
      && (vehicleVariableComponent.status === "excluded" || vehicleVariableComponent.dataQuality === "excluded" || vehicleVariableComponent.missingFields?.length),
  );
  const fuelNeedsUserEntry = hasMissingField("fuel")
    || (String(roomProfitability?.fuelCalculation?.status || "").toUpperCase() === "INCOMPLETE_REFERENCE"
      && roomProfitability?.fuelCalculation?.actualLedgerUsed !== true);
  const selectedEvidenceShiftId = Number(effectiveRoomCostFocus.shiftId || snapshot.shiftId || 0) || null;
  const selectedEvidenceAgreementId = Number(effectiveRoomCostFocus.agreementId || snapshot.agreementId || 0) || null;
  const operationalEvidenceMissing = hasMissingField("distance inputs", "route", "passenger")
    || Number(snapshot.passengerCount || 0) <= 0;
  const operationalEvidenceAction = operationalEvidenceMissing && selectedEvidenceShiftId
    ? {
      title: "Rota ve yolcu kanıtı",
      description: "Seçili vardiya kaydını açarak mevcut rota ve yolcu kanıtını kontrol edin. Kaynakta olmayan değer maliyet hesabına eklenmez.",
      actionLabel: "Seçili vardiya kaydını aç",
      recordPath: `/room/shifts?focusShiftId=${selectedEvidenceShiftId}${selectedEvidenceAgreementId ? `&focusAgreementId=${selectedEvidenceAgreementId}` : ""}&focusTask=usage&returnTo=${encodeURIComponent(roomFinanceViewPath("service-cost", {
        focusShiftId: selectedEvidenceShiftId,
        focusAgreementId: selectedEvidenceAgreementId,
        focusVehicleId: effectiveRoomCostFocus.vehicleId || "",
      }))}`,
      field: "serviceDistanceKm",
    }
    : null;
  const missingDataActions = [
    operationalEvidenceAction,
    hasMissingField("driver", "labor", "salary") ? {
      title: "Sürücü aylık maliyeti",
      description: "Sürücü adını seçerek aylık işveren maliyetini gerçek gider kaydı olarak ekleyin.",
      actionLabel: "Sürücü maliyetini ekle",
      costCategory: "EMPLOYER_MONTHLY_COST",
      field: "amount",
    } : null,
    fuelNeedsUserEntry ? {
      title: "Yakıt bilgisi",
      description: "Doğrulanmış tüketim referansı yoksa gerçekleşen yakıt giderini plaka ile kaydedin.",
      actionLabel: "Yakıt bilgisini tamamla",
      costCategory: "FUEL",
      field: "amount",
    } : null,
    (hasMissingField("maintenance", "vehicle variable") || vehicleVariableIncomplete) ? {
      title: "Bakım gideri",
      description: "Bakım tutarını ilgili plaka ve dönemle gider defterine ekleyin.",
      actionLabel: "Bakım gideri ekle",
      costCategory: "MAINTENANCE",
      field: "amount",
    } : null,
    hasMissingField("insurance") ? {
      title: "Sigorta gideri",
      description: "Sigorta tutarını ilgili plaka ve geçerlilik dönemiyle gider defterine ekleyin.",
      actionLabel: "Sigorta gideri ekle",
      costCategory: "TRAFFIC_INSURANCE",
      field: "amount",
    } : null,
    hasMissingField("rent", "lease", "kira") ? {
      title: "Araç kira gideri",
      description: "Kiralık olduğu doğrulanmış aracı seçerek aylık kira giderini dönem ve belge bilgisiyle kaydedin.",
      actionLabel: "Araç kira gideri ekle",
      costCategory: "RENT",
      field: "amount",
    } : null,
  ].filter(Boolean);
  const surfaceNote = scope === "COMPANY"
    ? "Bu yüzey bütçe yaşam döngüsü ve açıklanabilir önizleme sunar; ödeme, fatura ve muhasebe kapalıdır."
    : "Bu yüzey teklif tabanı taslak yaşam döngüsü sunar; sevk uygulama, ödeme, fatura ve muhasebe kapalıdır.";
  const currentBudgetPlan = preview?.budgetPlan?.current || preview?.budgetPlan?.draft || preview?.budgetPlan?.active || null;

  async function handleCompanyBudgetAction(action, { createNew = false } = {}) {
    if (scope !== "COMPANY") return;
    setActionErr("");
    setActionOk("");

    try {
      setActionBusy(action);
      const payload = companyPlanPayloadFromForm(form);
      const currentId = createNew ? "" : String(currentBudgetPlan?.id ?? form.budgetPlanId ?? "").trim();
      const currentVersion = String(currentBudgetPlan?.version ?? form.budgetPlanVersion ?? "").trim();
      let result = null;

      if (action === "new") {
        setForm((prev) => ({
          ...prev,
          budgetPlanId: "",
          budgetPlanVersion: "",
        }));
        setActionOk("Yeni taslak için plan kimliği temizlendi.");
        return;
      }

      if (action === "save") {
        const body = {
          ...payload,
          version: currentVersion || undefined,
        };
        if (currentId) {
          result = await updateCompanyBudgetPlan(currentId, body, { token });
        } else {
          result = await createCompanyBudgetPlan(body, { token });
        }
      } else if (action === "submit") {
        if (!currentId) throw new Error("Önce bir taslak kaydetmelisin.");
        result = await submitCompanyBudgetPlan(currentId, { version: currentVersion }, { token });
      } else if (action === "approve") {
        if (!currentId) throw new Error("Önce bir taslak kaydetmelisin.");
        result = await approveCompanyBudgetPlan(currentId, { version: currentVersion }, { token });
      } else if (action === "activate") {
        if (!currentId) throw new Error("Önce bir taslak kaydetmelisin.");
        result = await activateCompanyBudgetPlan(currentId, { version: currentVersion }, { token });
      } else if (action === "archive") {
        if (!currentId) throw new Error("Önce bir taslak kaydetmelisin.");
        result = await archiveCompanyBudgetPlan(currentId, { version: currentVersion }, { token });
      } else {
        throw new Error("Bilinmeyen bütçe aksiyonu.");
      }

      if (result?.item) {
        setForm((prev) => ({
          ...prev,
          ...companyPlanFormFromPlan(result.item),
        }));
        setActionOk(`Bütçe planı kaydı ${budgetLifecycleFeedbackLabel(result.item)} durumuna alındı.`);
      }

      setRefreshTick((n) => n + 1);
    } catch (e) {
      const info = getApiErrorInfo(e, "Bütçe yaşam döngüsü işlemi tamamlanamadı.");
      setActionErr(info.message || "Bütçe yaşam döngüsü işlemi tamamlanamadı.");
    } finally {
      setActionBusy("");
    }
  }

  const currentRoomQuoteFloorDraft = preview?.quoteFloorDraft?.current || preview?.quoteFloorDraft?.draft || preview?.quoteFloorDraft?.applied || null;

  useEffect(() => {
    setCostedQuoteApprovalOpen(false);
    setCostedQuoteApprovalToken("");
  }, [
    effectiveRoomCostFocus.agreementId,
    effectiveRoomCostFocus.focusOfferId,
    currentRoomQuoteFloorDraft?.id,
    currentRoomQuoteFloorDraft?.version,
  ]);

  async function handleCostedQuoteSend() {
    if (scope !== "ROOM" || !canManageRoomCosts) return;
    const marketOfferId = Number(selectedRoomFinanceOffer?.offerId || 0);
    const agreementId = Number(effectiveRoomCostFocus.agreementId || snapshot.agreementId || 0);
    const draftId = Number(currentRoomQuoteFloorDraft?.id || 0);
    const draftVersion = Number(currentRoomQuoteFloorDraft?.version || form.roomQuoteFloorDraftVersion || 0);
    const offerAmountMinor = Number(form.quoteScenarioAmountMinor || 0);
    const quoteContextHash = String(
      draftSnapshot?.serviceContext?.scopeHash
      || form.quoteContextHash
      || "",
    ).trim();
    if (!marketOfferId && (!agreementId || !draftId || !draftVersion || !quoteContextHash)) {
      setActionErr("Teklif taslağı ve hizmet bağlamı güncel olarak doğrulanamadı.");
      return;
    }
    if (!Number.isSafeInteger(offerAmountMinor) || offerAmountMinor <= 0) {
      setActionErr("Gönderilecek teklif tutarı 0'dan büyük olmalı.");
      return;
    }
    if (String(costedQuoteApprovalToken || "").trim().toUpperCase() !== "ONAYLA") {
      setActionErr("Gönderim için ONAYLA yazarak açık onay vermelisin.");
      return;
    }

    setActionBusy("send-costed-quote");
    setActionErr("");
    setActionOk("");
    try {
      if (marketOfferId) {
        await sendRoomOfferCounter(marketOfferId, {
          amountRoom: offerAmountMinor,
          roomOfferVehicleId: Number(selectedServiceVehicleId || 0) || null,
          noteRoom: `Finans senaryosu ${selectedRoomScenario?.scenarioId || "seçili plan"} · ${costedQuoteUsesSingleRequestEstimate ? "tek talep tahmini" : "tahmini dönem maliyeti"} ${formatTRY(costedQuotePlanningEstimateMinor)} · teklif tabanı ${formatTRY(costedQuoteFloorMinor)}`.slice(0, 500),
          ...(draftId ? {
            quoteFloorDraftId: draftId,
            quoteDraftVersion: draftVersion || undefined,
            quoteContextHash: quoteContextHash || undefined,
          } : {}),
          scenarioId: selectedRoomScenario?.scenarioId || null,
          estimatedCostMinor: costedQuotePlanningEstimateMinor,
          quoteFloorMinor: costedQuoteFloorMinor,
          confirmed: true,
          confirmationToken: "ONAYLA",
        }, { token });
      } else {
        await sendCostedRoomAgreementQuote(agreementId, {
          roomOfferAmount: offerAmountMinor,
          quoteFloorDraftId: draftId,
          quoteDraftVersion: draftVersion,
          quoteContextHash,
          confirmed: true,
          confirmationToken: "ONAYLA",
        }, { token });
      }
      setCostedQuoteApprovalOpen(false);
      setCostedQuoteApprovalToken("");
      setActionOk("Teklif mevcut ticari akışta COMPANY'ye gönderildi. Kabul edilirse sözleşme akışı devam eder.");
      setRefreshTick((current) => current + 1);
    } catch (error) {
      const info = getApiErrorInfo(error, "Maliyetli teklif gönderilemedi.");
      setActionErr(info.message || "Maliyetli teklif gönderilemedi.");
    } finally {
      setActionBusy("");
    }
  }

  async function handleRoomQuoteFloorAction(action, { createNew = false } = {}) {
    if (scope !== "ROOM") return;
    setActionErr("");
    setActionOk("");

    try {
      setActionBusy(action);
      const payload = roomDraftPayloadFromForm(form, effectiveRoomCostFocus);
      const currentId = createNew ? "" : String(currentRoomQuoteFloorDraft?.id ?? form.roomQuoteFloorDraftId ?? "").trim();
      const currentVersion = String(currentRoomQuoteFloorDraft?.version ?? form.roomQuoteFloorDraftVersion ?? "").trim();
      let result = null;

      if (action === "save") {
        const body = {
          ...payload,
          version: currentVersion || undefined,
        };
        if (currentId) {
          result = await updateRoomQuoteFloorDraft(currentId, body, { token });
        } else {
          result = await createRoomQuoteFloorDraft(body, { token });
        }
      } else if (action === "apply") {
        if (!currentId) throw new Error("Önce bir taslak kaydetmelisin.");
        result = await applyRoomQuoteFloorDraft(currentId, { version: currentVersion }, { token });
      } else if (action === "archive") {
        if (!currentId) throw new Error("Önce bir taslak kaydetmelisin.");
        result = await archiveRoomQuoteFloorDraft(currentId, { version: currentVersion }, { token });
      } else if (action === "new") {
        result = await createRoomQuoteFloorDraft({
          ...payload,
          version: undefined,
        }, { token });
      } else {
        throw new Error("Bilinmeyen quote floor aksiyonu.");
      }

      if (result?.item) {
        setForm((prev) => ({
          ...prev,
          ...roomDraftFormFromDraft(result.item),
        }));
        setActionOk(`Taslak gider ${lifecycleStateLabel(result.item.status || "-")} durumuna alındı.`);
      }

      setRefreshTick((n) => n + 1);
    } catch (e) {
      const info = getApiErrorInfo(e, "Teklif tabanı yaşam döngüsü işlemi tamamlanamadı.");
      setActionErr(info.message || "Teklif tabanı yaşam döngüsü işlemi tamamlanamadı.");
    } finally {
      setActionBusy("");
    }
  }

  const deniedView = !canView ? (
      <PanelChrome
        title={meta.title}
        subtitle={meta.subtitle}
      >
        <div className="card" style={{ border: "1px solid rgba(240,68,56,0.25)" }}>
          <div style={{ fontWeight: 900 }}>Erişim kapalı</div>
          <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
            {buildDeniedText(scope, me)}
          </div>
          <div className="muted" style={{ marginTop: 10 }}>{surfaceNote}</div>
        </div>
      </PanelChrome>
    ) : null;

  const companyView = scope === "COMPANY" ? (
      <FinancialOperationsCompanyPreview
        meta={meta}
        token={token}
        me={me}
        preview={preview}
        loading={loading}
        err={err}
        setRefreshTick={setRefreshTick}
        form={form}
        setForm={setForm}
        onBudgetPlanSelect={handleCompanyBudgetPlanSelect}
        onBudgetAction={handleCompanyBudgetAction}
        budgetActionBusy={actionBusy}
        budgetActionErr={actionErr}
        budgetActionOk={actionOk}
        initialIncomeInvoiceId={readCompanyIncomeInvoiceQueryInput()}
        selectedIncomeInvoiceId={selectedCompanyIncomeLink?.invoiceId || null}
        onSelectIncomeInvoice={openIncomeEvidence}
        normalizeText={normalizeText}
        MetricCard={MetricCard}
        ChipRow={ChipRow}
        formatBps={formatBps}
        INPUT_STYLE={INPUT_STYLE}
      />
    ) : null;

  const compactOverviewActive = overviewSummary && scope === "ROOM" && financeView === "overview";
  const roomFinanceCopy = scope === "ROOM" ? ROOM_FINANCE_COPY[financeView] || ROOM_FINANCE_COPY.overview : null;
  const realizedRoomFinanceShell = scope === "ROOM"
    ? roomFinanceShellCopy({
      financeView,
      roomName: me?.roomName || me?.companyName || me?.organizationName,
    })
    : null;
  const scopeTitle = scope === "ROOM"
    ? "Finans"
    : (roomFinanceCopy?.title || meta.title);
  const scopeSubtitle = scope === "ROOM" ? null : (realizedRoomFinanceShell?.subtitle || (financeView === "overview"
    ? (compactOverviewActive
      ? `${String(me?.roomName || me?.companyName || me?.organizationName || "Taşımacılık Firması").trim()} · Firma genelindeki gerçekleşen gider özeti`
      : null)
    : (roomFinanceCopy?.subtitle || meta.subtitle)));
  const scopeEyebrow = scope === "ROOM" ? null : (realizedRoomFinanceShell?.eyebrow || (compactOverviewActive
    ? "MALİYET KONTROL MERKEZİ"
    : undefined));
  const currentAmountMinor = scope === "ROOM"
    ? Number(snapshot.currentRoomOfferMinor || snapshot.currentCommercialAmountMinor || 0) || null
    : Number(snapshot.currentCommercialAmountMinor || snapshot.currentCompanyOfferMinor || 0) || null;
  const baselineMinor = Number(quoteFloor?.baselineOperationalCostMinor || preview?.baselineOperationalCostMinor || 0) || null;
  const displayQuoteFloor = selectedScenarioQuoteActive
    ? quoteFloor
    : periodScopeActive
      ? (periodQuoteFloor || {})
      : quoteFloor;
  const displayRoomProfitability = selectedScenarioQuoteActive
    ? roomProfitability
    : periodScopeActive
      ? periodRoomProfitability
      : roomProfitability;
  const currentGapMinor = currentAmountMinor != null && baselineMinor != null
    ? (preview?.roomProfitability?.profitMinor ?? preview?.companyBudget?.budgetGapMinor ?? null)
    : null;
  const quoteFloorGapMinor = Number.isFinite(Number(displayQuoteFloor?.marginGapMinor)) ? Number(displayQuoteFloor.marginGapMinor) : null;
  const quoteFloorComputed = Boolean(displayQuoteFloor?.computed);
  const quoteFloorPresentation = buildRoomQuoteFloorPresentation({
    quoteFloor: displayQuoteFloor,
    periodScopeActive,
    periodPlanning: periodPlanningDisplay,
  });
  const profitabilityStatus = String(displayRoomProfitability?.profitabilityStatus || "").toUpperCase();
  const quoteFloorConfirmed = profitabilityStatus === "CONFIRMED";
  const commercialOffer = preview?.commercialOffer || null;
  const scenarioOfferMinor = displayRoomProfitability?.scenarioOfferMinor ?? null;
  const scenarioQuoteOfferMinor = Number(form.quoteScenarioAmountMinor || 0) || null;
  const selectedScenarioQuoteCostMinor = selectedScenarioQuoteActive
    && selectedRoomScenario?.quoteCostComplete === true
    && selectedRoomScenario?.quoteCostMinor != null
    ? Number(selectedRoomScenario.quoteCostMinor)
    : null;
  const selectedScenarioQuotePartialCostMinor = selectedScenarioQuoteActive
    && selectedRoomScenario?.quoteCostPartialMinor != null
    ? Number(selectedRoomScenario.quoteCostPartialMinor)
    : null;
  const selectedScenarioQuoteMissingLabels = Array.from(new Set(
    (selectedRoomScenario?.quoteCostMissingLabels || [])
      .map((label) => String(label || "").trim())
      .filter(Boolean),
  ));
  const selectedScenarioExpectedProfit = buildRoomScenarioExpectedProfit({
    offerAmountMinor: scenarioQuoteOfferMinor,
    quoteCostMinor: selectedScenarioQuoteCostMinor,
    missingCostLabels: selectedScenarioQuoteMissingLabels,
  });
  const effectiveQuoteMissingEvidenceLabels = selectedScenarioQuoteActive
    ? selectedScenarioQuoteMissingLabels
    : quoteMissingEvidenceLabels;
  const profitabilityDisplay = buildRoomProfitabilityDisplay({
    currentOfferMinor: currentAmountMinor,
    quoteFloorMinor: displayQuoteFloor?.quoteFloorMinor,
    quoteFloorComputed: quoteFloorPresentation.definitive,
    actualOperationalCostMinor: displayRoomProfitability?.actualOperationalCostMinor,
    scenarioOfferMinor,
  });
  const expectedProfitMinor = selectedScenarioQuoteActive
    ? selectedScenarioExpectedProfit.profitMinor
    : profitabilityDisplay.planningExpectedGainMinor;
  const actualExpenseGapMinor = profitabilityDisplay.actualExpenseGapMinor;
  const actualOperationalCostMinor = displayRoomProfitability?.actualOperationalCostMinor != null
    ? Number(displayRoomProfitability.actualOperationalCostMinor)
    : null;
  const planningCostMinor = selectedScenarioQuoteActive && selectedScenarioQuoteCostMinor != null
    ? selectedScenarioQuoteCostMinor
    : periodScopeActive && !selectedScenarioQuoteActive && periodPlanningDisplay.periodPlanningCostMinor != null
      ? Number(periodPlanningDisplay.periodPlanningCostMinor)
      : quoteFloorComputed && displayQuoteFloor?.baselineOperationalCostMinor != null
        ? Number(displayQuoteFloor.baselineOperationalCostMinor)
      : null;
  const planningCostLabel = selectedScenarioQuoteActive
    ? "Seçili senaryo planlama maliyeti"
    : quoteFloorPresentation.costLabel;
  const planningCostNote = selectedScenarioQuoteActive
    ? "Canonical planlama önizlemesi; teklif tabanı veya gerçekleşmiş gider değildir"
    : quoteFloorPresentation.costNote;
  const selectedScenarioMonthlyPriceReference = selectedScenarioQuoteActive && preview?.monthlyPriceReference
    ? {
      ...preview.monthlyPriceReference,
      currentPeriod: {
        ...(preview.monthlyPriceReference.currentPeriod || {}),
        periodStart: selectedScenarioPeriodPlanning?.periodStart
          || preview.monthlyPriceReference.currentPeriod?.periodStart
          || null,
        periodEnd: selectedScenarioPeriodPlanning?.periodEnd
          || preview.monthlyPriceReference.currentPeriod?.periodEnd
          || null,
        estimatedCostMinor: Number(selectedScenarioPeriodPlanning?.periodPlanningCostMinor ?? selectedScenarioQuoteCostMinor),
        quoteFloorMinor: null,
        plannedMovementCount: selectedScenarioPeriodPlanning?.plannedMovementCount ?? null,
        observedLinkedShiftCount: selectedScenarioPeriodPlanning?.observedLinkedShiftCount ?? null,
      },
    }
    : preview?.monthlyPriceReference;
  const expectedMarginOfferMinor = Number(scenarioQuoteOfferMinor ?? scenarioOfferMinor ?? currentAmountMinor);
  const expectedMarginBps = expectedProfitMinor != null && expectedMarginOfferMinor > 0
    ? Math.round((expectedProfitMinor / expectedMarginOfferMinor) * 10_000)
    : null;
  const quoteOfferStatusLabel = commercialOffer?.status === "AVAILABLE"
    ? "Gerçek teklif bulundu"
    : commercialOffer?.status === "BLOCKED"
      ? "Teklif bağlamı doğrulanamıyor"
      : "Teklif kaydı yok";
  const vehicleComparisonCostMinor = resolveVehicleComparisonCostMinor({
    primaryCostMinor: roomProfitability?.actualOperationalCostMinor,
    vehicleMonthDecision: preview?.vehicleMonthDecision,
    focus: effectiveRoomCostFocus,
  });
  const vehicleComparisonCostLabel = vehicleComparisonCostMinor == null
    ? "Eksik veri"
    : formatTRY(vehicleComparisonCostMinor);
  const vehicleComparisonCostNote = roomProfitability?.netRollupBlocked
    ? "Brüt gerçekleşen gider • net toplam doğrulanmadı"
    : "Gerçekleşen gider";
  const vehicleFit = vehicleFitLabel({
    passengerCount: snapshot?.passengerCount,
    vehicleCapacity: snapshot?.vehicleCapacity,
  });
  const currentRoomQuoteFloorDraftStatus = String(currentRoomQuoteFloorDraft?.status || "").toUpperCase();
  const roomDraftEditable = !currentRoomQuoteFloorDraft?.id || currentRoomQuoteFloorDraftStatus === "DRAFT";
  const roomDraftCanApply = roomDraftEditable;
  const roomDraftCanArchive = Boolean(currentRoomQuoteFloorDraft?.id) && currentRoomQuoteFloorDraftStatus !== "ARCHIVED";
  const previewStatusValue = previewStatusLabel(preview?.status || preview?.modelStatus || "");
  const modelStatusValue = modelStatusLabel(model?.status || "");
  const modelStatusToneValue = modelStatusTone(model?.status || "");
  const confidenceKey = model?.confidence?.level || preview?.confidence?.level || preview?.dataQuality?.level || "";
  const confidenceValue = confidenceLabel(confidenceKey);
  const confidenceToneValue = confidenceTone(confidenceKey);
  const confidenceMetricTone = confidenceToneValue === "ready"
    ? "good"
    : confidenceToneValue === "warning"
      ? "warm"
      : confidenceToneValue === "danger"
        ? "danger"
        : "default";
  const currentRoomDraftLabel = lifecycleStateLabel(currentRoomQuoteFloorDraft?.status || "DRAFT");
  const draftSnapshot = currentRoomQuoteFloorDraft?.inputSnapshot || null;
  const draftPassengerCount = draftSnapshot?.costInputs?.passengerCount ?? draftSnapshot?.passengerCount ?? null;
  const draftPassengerLabel = formatPeople(draftPassengerCount);
  const livePassengerLabel = formatPeople(snapshot.passengerCount);
  const baselineSourceHuman = baselineSourceLabel(
    periodQuoteFloor?.baselineSource
      || quoteFloor?.baselineSource
      || draftSnapshot?.computed?.baselineSource
      || currentRoomQuoteFloorDraft?.baselineSource
      || form.baselineSource,
  );
  const selectedPeriodShift = serviceDirectory.shifts.find((item) => Number(item?.id) === Number(effectiveRoomCostFocus.shiftId || snapshot.shiftId)) || null;
  const selectedPeriodLabel = selectedPeriodShift?.startAt && selectedPeriodShift?.endAt
    ? serviceContextDateRange(selectedPeriodShift.startAt, selectedPeriodShift.endAt)
    : null;
  const periodLabel = readablePeriodLabel(visibleText(
    selectedPeriodLabel
      || preview?.period?.periodLabel
      || preview?.periodLabel
      || (periodPlanningDisplay.periodStart && periodPlanningDisplay.periodEnd
        ? serviceContextDateRange(periodPlanningDisplay.periodStart, periodPlanningDisplay.periodEnd)
        : null)
      || (draftSnapshot?.serviceContext?.periodStart && draftSnapshot?.serviceContext?.periodEnd
        ? serviceContextDateRange(draftSnapshot.serviceContext.periodStart, draftSnapshot.serviceContext.periodEnd)
        : null)
      || currentRoomQuoteFloorDraft?.periodLabel
      || form.periodLabel
      || serviceCostSourcePeriodLabel(preview?.serviceCostSourceEntries)
      || "Dönem belirtilmedi",
  ));
  const decisionSummary = visibleText(preview?.summaryText || "Sadece önizleme. Yazma aksiyonu yok.");
  const snapshotTitle = "Hesaplama özeti";
  const snapshotSourceLabel = visibleText(snapshot.sourceLabel || "Finansal kaynak");
  const readableSnapshotSourceLabel = snapshotSourceLabel.replace(/^Vardiya #\d+$/u, "Seçili vardiya").replace(/^Sözleşme #\d+$/u, "Seçili sözleşme");
  const livePreviewSourceLabel = snapshot.sourceLabel ? `Canlı ${readableSnapshotSourceLabel}` : "Canlı vardiya önizlemesi";
  const roomFinanceOfferOptions = useMemo(
    () => buildRoomFinanceOfferOptions({ offers: serviceDirectory.offers, shifts: serviceDirectory.shifts }),
    [serviceDirectory.offers, serviceDirectory.shifts],
  );
  const selectedRoomFinanceOffer = roomFinanceOfferOptions.find((option) => (
    (effectiveRoomCostFocus.focusOfferId && Number(option.offerId || 0) === Number(effectiveRoomCostFocus.focusOfferId))
      || (!effectiveRoomCostFocus.focusOfferId && Number(option.shiftId || 0) === Number(effectiveRoomCostFocus.shiftId || 0))
  )) || null;
  const selectedRoomFinanceOfferId = Number(selectedRoomFinanceOffer?.offerId || 0) || 0;
  const selectedRoomScenarioVehicleId = Number(selectedRoomScenario?.vehicleId || 0) || 0;
  const selectedServiceAgreementId = serviceCostContextRequired ? "" : (effectiveRoomCostFocus.agreementId || (!isRoomOfferDecisionView ? snapshot.agreementId : "") || "");
  const selectedServiceShiftId = serviceCostContextRequired ? "" : (effectiveRoomCostFocus.shiftId || (!isRoomOfferDecisionView ? snapshot.shiftId : "") || "");
  const selectedServiceVehicleId = serviceCostContextRequired ? "" : (effectiveRoomCostFocus.vehicleId
    || selectedRoomScenarioVehicleId
    || serviceDirectory.shifts.find((item) => Number(item?.id) === Number(selectedServiceShiftId))?.vehicleId
    || serviceDirectory.agreements.find((item) => Number(item?.id) === Number(selectedServiceAgreementId))?.vehicleId
    || (!isRoomOfferDecisionView ? snapshot.vehicleId : "")
    || "");
  const selectedServiceAgreement = serviceDirectory.agreements.find((item) => Number(item?.id) === Number(selectedServiceAgreementId)) || null;
  // Offer inbox rows already carry an authorized shift summary. The shifts
  // endpoint may omit offered REQUESTED rows for a ROOM-scoped list, so keep
  // the selected offer's canonical shift as the same read-only context rather
  // than dropping the user's selection into an empty state.
  const selectedServiceShift = serviceDirectory.shifts.find((item) => Number(item?.id) === Number(selectedServiceShiftId))
    || selectedRoomFinanceOffer?.shift
    || null;
  const readableSnapshotStatus = lifecycleStateLabel(
    snapshot.shiftStatus
      || selectedServiceShift?.status
      || selectedServiceAgreement?.status
      || "-",
  );
  const selectedServiceVehicle = serviceDirectory.vehicles.find((item) => Number(item?.id) === Number(selectedServiceVehicleId)) || null;
  const selectedServiceDriverId = selectedServiceShift?.driverId || selectedServiceAgreement?.driverId || null;
  const selectedServiceDriver = serviceDirectory.drivers.find((item) => Number(item?.id) === Number(selectedServiceDriverId)) || null;
  const serviceCostCandidates = listComputableRoomServiceCandidates({
    ...serviceDirectory,
    preferredVehicleId: roomCostFocus.filterVehicleId,
    preferredPeriodStart: roomCostFocus.filterPeriodStart,
    preferredPeriodEnd: roomCostFocus.filterPeriodEnd,
  });
  const serviceCostOptionByAgreement = new Map();
  serviceCostCandidates.forEach((candidate) => {
    if (!serviceCostOptionByAgreement.has(candidate.agreementId)) serviceCostOptionByAgreement.set(candidate.agreementId, candidate);
  });
  const serviceCostAgreementOptions = [...serviceCostOptionByAgreement.values()]
    .map((candidate) => serviceDirectory.agreements.find((agreement) => Number(agreement?.id) === Number(candidate.agreementId)))
    .filter(Boolean);
  const serviceCostNoMatchingService = serviceCostContextRequired
    && (roomCostFocus.filterVehicleId || roomCostFocus.filterPeriodStart || roomCostFocus.filterPeriodEnd)
    && (serviceDirectory.agreements.length > 0 || serviceDirectory.shifts.length > 0)
    && serviceCostCandidates.length === 0;
  const serviceCostSelectionPrompt = serviceCostNoMatchingService
    ? "Bu araç ve dönem için doğrulanmış servis yok"
    : "Servis seçin";
  const selectedRoomFinanceOfferValue = selectedRoomFinanceOffer ? roomFinanceOfferOptionValue(selectedRoomFinanceOffer) : "";
  const quoteRequestContext = financeView === "quote-profitability"
    ? buildRoomQuoteRequestContext({ agreement: selectedServiceAgreement, shift: selectedServiceShift })
    : null;
  const selectedServiceVehicleText = selectedServiceVehicle?.plate
    || selectedServiceContext?.vehiclePlate
    || (!isRoomOfferDecisionView ? snapshot.vehiclePlate : null)
    || (!isRoomOfferDecisionView ? snapshot.vehicleLabel : null)
    || (selectedServiceVehicleId ? "Araç kaydı doğrulanmadı" : "Araç seçilmedi");
  const selectedServiceDriverText = selectedServiceDriver?.fullName
    || selectedServiceContext?.driverName
    || (!isRoomOfferDecisionView ? snapshot.driverName : null)
    || (!isRoomOfferDecisionView ? snapshot.driverLabel : null)
    || (selectedServiceDriverId ? "Sürücü kaydı doğrulanmadı" : "Sürücü bağlantısı doğrulanmadı");
  const selectedServiceAgreementText = selectedServiceAgreement
    ? serviceContextAgreementLabel(selectedServiceAgreement, serviceDirectory.vehicles)
    : (selectedServiceAgreementId ? "Servis kaydı doğrulanmadı" : "Servis seçilmedi");
  const selectedServiceShiftText = selectedServiceShift
    ? serviceContextShiftLabel(selectedServiceShift, serviceDirectory.vehicles)
    : (selectedServiceShiftId ? "Vardiya kaydı doğrulanmadı" : "Vardiya seçilmedi");
  const costedQuoteOfferMinor = Number(form.quoteScenarioAmountMinor || 0) || null;
  const costedQuotePeriodCostMinor = periodPlanningDisplay.periodPlanningCostMinor != null
    ? Number(periodPlanningDisplay.periodPlanningCostMinor)
    : null;
  const costedQuotePlanningEstimateMinor = selectedScenarioQuoteActive
    ? selectedScenarioQuoteCostMinor
    : costedQuotePeriodCostMinor;
  const costedQuoteUsesSingleRequestEstimate = selectedScenarioQuoteActive
    && !periodPlanningDisplay.comparisonAllowed;
  const costedQuoteFloorMinor = periodPlanningDisplay.periodQuoteFloorMinor != null
    ? Number(periodPlanningDisplay.periodQuoteFloorMinor)
    : Number(currentRoomQuoteFloorDraft?.quoteFloorMinor || 0) || null;
  const costedQuoteDifferenceToCostMinor = costedQuoteOfferMinor != null && costedQuotePlanningEstimateMinor != null
    ? costedQuoteOfferMinor - costedQuotePlanningEstimateMinor
    : null;
  const costedQuoteDifferenceToFloorMinor = costedQuoteOfferMinor != null && costedQuoteFloorMinor != null
    ? costedQuoteOfferMinor - costedQuoteFloorMinor
    : null;
  const costedQuoteBelowEstimatedCost = costedQuoteDifferenceToCostMinor != null && costedQuoteDifferenceToCostMinor < 0;
  const costedQuoteBelowRecommendedFloor = costedQuoteDifferenceToFloorMinor != null && costedQuoteDifferenceToFloorMinor < 0;
  const roomEstimatedCostMinor = selectedScenarioQuoteActive
    ? selectedScenarioQuoteCostMinor
    : periodScopeActive
    ? costedQuotePeriodCostMinor
    : displayQuoteFloor?.baselineOperationalCostMinor != null
      ? Number(displayQuoteFloor.baselineOperationalCostMinor)
      : null;
  const roomQuoteRisk = buildRoomQuoteRiskPresentation({
    offerMinor: costedQuoteOfferMinor ?? scenarioOfferMinor ?? currentAmountMinor,
    estimatedCostMinor: roomEstimatedCostMinor,
    // The summary badge must use the same canonical target floor shown in the
    // decision summary. The costed-send draft floor is only a submission-card
    // value and can represent a different period scope.
    quoteFloorMinor: displayQuoteFloor?.quoteFloorMinor ?? costedQuoteFloorMinor,
    evidenceReady: Boolean(
      quoteFloorComputed
        && !roomProfitability?.contextBlocked
        && roomEstimatedCostMinor != null
        && costedQuoteFloorMinor != null
        && quoteFloorPresentation.definitive
        && (!periodScopeActive || selectedScenarioQuoteActive || periodPlanningDisplay.comparisonAllowed),
    ),
    contextBlocked: Boolean(roomProfitability?.contextBlocked),
  });
  const costedQuoteDraftContextMatches = Number(draftSnapshot?.serviceContext?.agreementId || 0) === Number(selectedServiceAgreementId || 0)
    && Number(draftSnapshot?.serviceContext?.roomId || 0) === Number(me?.roomId || 0);
  const marketOfferCostedQuoteReady = roomMarketOfferQuoteReady({
    canManageRoomCosts: scope === "ROOM" && canManageRoomCosts,
    offerId: selectedRoomFinanceOfferId,
    offerKind: selectedRoomFinanceOffer?.kind,
    offerStatus: selectedRoomFinanceOffer?.status,
    shiftStatus: selectedServiceShift?.status,
    vehicleId: selectedServiceVehicleId,
    scenarioCostMinor: selectedScenarioQuoteActive
      ? (selectedScenarioQuoteCostMinor ?? selectedScenarioQuotePartialCostMinor)
      : null,
    offerAmountMinor: costedQuoteOfferMinor,
  });
  const agreementCostedQuoteReady = scope === "ROOM"
    && canManageRoomCosts
    && Number(selectedServiceAgreementId || 0) > 0
    && Number(currentRoomQuoteFloorDraft?.id || 0) > 0
    && currentRoomQuoteFloorDraftStatus === "DRAFT"
    && costedQuoteDraftContextMatches
    && String(selectedServiceAgreement?.status || "").toUpperCase() === "REQUESTED"
    && periodPlanningDisplay.comparisonAllowed
    && quoteFloorPresentation.definitive
    && costedQuotePeriodCostMinor != null
    && costedQuoteFloorMinor != null
    && Number(costedQuoteOfferMinor || 0) > 0;
  const costedQuoteReady = marketOfferCostedQuoteReady || agreementCostedQuoteReady;

  useEffect(() => {
    if (
      financeView !== "service-cost"
      || effectiveRoomCostFocus.periodStart
      || effectiveRoomCostFocus.periodEnd
      || (!effectiveRoomCostFocus.shiftId && !effectiveRoomCostFocus.agreementId)
    ) return undefined;
    const currentParams = new URLSearchParams(String(window.location.hash || "").split("?")[1] || "");
    if (currentParams.get("serviceCostContextRequired") === "true") return undefined;
    const periodStart = dateInputValue(selectedServiceShift?.startAt || selectedServiceAgreement?.startAt);
    const periodEnd = dateInputValue(selectedServiceShift?.endAt || selectedServiceAgreement?.endAt);
    if (!periodStart || !periodEnd) return undefined;
    if (currentParams.get("focusPeriodStart") === periodStart && currentParams.get("focusPeriodEnd") === periodEnd) return undefined;
    currentParams.set("focusPeriodStart", periodStart);
    currentParams.set("focusPeriodEnd", periodEnd);
    navigate(roomFinanceViewPath("service-cost", Object.fromEntries(currentParams.entries())));
    return undefined;
  }, [effectiveRoomCostFocus.agreementId, effectiveRoomCostFocus.periodStart, effectiveRoomCostFocus.periodEnd, effectiveRoomCostFocus.shiftId, financeView, selectedServiceShift?.startAt, selectedServiceShift?.endAt, selectedServiceAgreement?.startAt, selectedServiceAgreement?.endAt]);

  const selectedShiftVehicleId = selectedServiceShift?.vehicleId || selectedServiceShift?.vehicle?.id || null;
  const serviceVehicleRelation = serviceContextRelationStatus({
    serviceAgreementId: selectedServiceAgreementId,
    shiftAgreementId: selectedServiceShift?.agreementId,
    serviceVehicleId: selectedServiceVehicleId,
    shiftVehicleId: selectedShiftVehicleId,
  });
  const snapshotRoomName = visibleText(snapshot.roomName || "-");
  const snapshotCompanyName = visibleText(snapshot.companyName || "-");
  const snapshotCounterLabel = visibleText(snapshot.currentCommercialAmountCounterLabel || snapshot.currentCommercialCounterLabel || "-");
  const modelSummaryText = visibleText(model?.summaryText || "Maliyet modeli henüz hesaplanmadı.");
  const modelConfidenceReason = visibleText(model?.confidence?.reason || "-");
  const serviceCostSourceRows = useMemo(() => (
    Array.isArray(preview?.serviceCostSourceEntries)
      ? preview.serviceCostSourceEntries
      : (Array.isArray(preview?.modelInput?.roomCostLedgerInputs)
        ? preview.modelInput.roomCostLedgerInputs
        : [])
  ), [preview?.modelInput?.roomCostLedgerInputs, preview?.serviceCostSourceEntries]);
  const serviceCostHasScopedSources = serviceCostSourceRows.length > 0
    || Number(preview?.roomCostPlanningEvidence?.actual?.entryCount || 0) > 0;
  const serviceCostScopeStatus = !serviceCostHasScopedSources
    ? "Kapsam doğrulanmadı"
    : roomProfitability?.netRollupBlocked
      || preview?.roomCostPlanningEvidence?.netRollupEligible === false
      || preview?.roomCostPlanningEvidence?.blockerCount > 0
       || preview?.roomCostPlanningEvidence?.excludedCount > 0
       ? "Ekonomik sonuç için kanıt bekliyor"
      : "Kapsam doğrulandı";
  const financialCopilotSelection = useMemo(
    () => {
      if (scope === "COMPANY") {
        const baseSelection = buildCompanyFinancialCopilotSelection({ financeView, preview });
        return selectedCompanyIncomeLink
          ? buildCompanyFinancialInvoiceCopilotSelection({ baseSelection, invoiceLink: selectedCompanyIncomeLink })
          : baseSelection;
      }
      // The shared focus state is synchronized from hashchange, but the
      // copilot publication can happen in the same render as a menu-driven
      // navigation. Read the current operational filters once more for this
      // read-only selection so Sefer Abi cannot lose the visible vehicle and
      // period while the ledger itself remains independently scoped.
      const liveFocus = readRoomCostFocus({ usePersistedRoomSelection: false });
      const liveLedgerVehicle = liveFocus.filterVehicleId
        ? serviceDirectory.vehicles.find((vehicle) => Number(vehicle?.id) === Number(liveFocus.filterVehicleId))
        : null;
      return buildFinancialCopilotSelection({
        financeView,
        roomCostFocus: {
          ...effectiveRoomCostFocus,
          filterVehicleId: liveFocus.filterVehicleId || effectiveRoomCostFocus.filterVehicleId,
          filterPeriodStart: liveFocus.filterPeriodStart || effectiveRoomCostFocus.filterPeriodStart,
          filterPeriodEnd: liveFocus.filterPeriodEnd || effectiveRoomCostFocus.filterPeriodEnd,
        },
        preview,
        sourceRows: serviceCostSourceRows,
        selectedVehicleLabel: liveLedgerVehicle?.plate || selectedServiceVehicleText,
      });
    },
    [effectiveRoomCostFocus, financeView, preview, scope, selectedCompanyIncomeLink, selectedServiceVehicleText, serviceCostSourceRows, serviceDirectory.vehicles],
  );

  useEffect(() => {
    if (!canView) {
      clearCopilotSelection(scope === "COMPANY" ? "/company/financial-operations" : "/room/financial-operations");
      return undefined;
    }
    if (scope !== "ROOM" && scope !== "COMPANY") return undefined;
    // The shell-level drawer resets its auth-scoped selection in a sibling
    // effect. Publish after that reset settles so a valid finance context is
    // not lost before the user opens Sefer Abi.
    const timer = typeof window !== "undefined"
      ? window.setTimeout(() => {
        const current = readCopilotSelection();
        const selectedScenarioOverrides = current?.scopeKey === financialCopilotSelection.scopeKey
          ? current?.facts?.selectedScenarioOverrides
          : null;
        const currentRoomIncomeSelection = scope === "ROOM"
          && financeView === "overview"
          && isRoomIncomeFinanceCopilotSelection(current);
        setCopilotSelection(currentRoomIncomeSelection
          ? current
          : selectedScenarioOverrides && typeof selectedScenarioOverrides === "object"
          ? {
            ...financialCopilotSelection,
            facts: {
              ...financialCopilotSelection.facts,
              selectedScenarioOverrides,
              selectedScenarioStatus: current.facts?.selectedScenarioStatus || null,
              selectedScenarioModelVersion: current.facts?.selectedScenarioModelVersion || null,
              selectedScenarioId: current.facts?.selectedScenarioId || null,
              selectedScenarioCostMinor: current.facts?.selectedScenarioCostMinor ?? null,
              selectedScenarioPeriodPlanning: current.facts?.selectedScenarioPeriodPlanning || null,
            },
          }
          : financialCopilotSelection);
      }, 0)
      : null;
    return () => {
      if (timer !== null && typeof window !== "undefined") window.clearTimeout(timer);
    };
  }, [canView, financialCopilotSelection, scope]);

  if (!canView) return deniedView;
  if (scope === "COMPANY") return companyView;

  return (
    <PanelChrome
      className="pre18-finance-surface pre18-finance-room"
      title={scopeTitle}
      subtitle={scopeSubtitle}
       eyebrow={scopeEyebrow}
      actions={(
        <button type="button" className="btn sm" onClick={() => setRefreshTick((n) => n + 1)} disabled={loading}>
          {loading ? "Yenileniyor..." : "Yenile"}
        </button>
      )}
    >
      <nav
        aria-label="Finansal operasyon bölümleri"
        role="tablist"
        data-finance-tablist="room-financial-operations"
        className="pre18-finance-tabs"
        style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}
      >
        {ROOM_FINANCE_SECTIONS.map((section) => {
          const selected = financeView === section.key;
          return (
            <button
              key={section.key}
              type="button"
              role="tab"
              id={`room-financial-operations-tab-${section.key}`}
              data-finance-view={section.key}
              data-copilot-reveals-target={section.key === "expenses"
                ? "room:financial-operations:cost-ledger room:financial-operations:cost-summary room:financial-operations:cost-entry-form room:financial-operations:cost-allocation"
                : section.key === "quote-profitability"
                  ? "room:financial-operations:quote-floor-details"
                  : undefined}
              aria-selected={selected ? "true" : "false"}
              aria-controls={`room-financial-operations-panel-${section.key}`}
              tabIndex={selected ? 0 : -1}
              className={selected ? "btn primary" : "btn sm"}
              onClick={() => handleFinanceViewChange(section.key)}
              onKeyDown={(event) => {
                if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                  event.preventDefault();
                  const index = ROOM_FINANCE_SECTIONS.findIndex((item) => item.key === section.key);
                  const next = ROOM_FINANCE_SECTIONS[(index + 1) % ROOM_FINANCE_SECTIONS.length];
                  handleFinanceViewChange(next.key);
                }
                if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                  event.preventDefault();
                  const index = ROOM_FINANCE_SECTIONS.findIndex((item) => item.key === section.key);
                  const previous = ROOM_FINANCE_SECTIONS[(index - 1 + ROOM_FINANCE_SECTIONS.length) % ROOM_FINANCE_SECTIONS.length];
                  handleFinanceViewChange(previous.key);
                }
              }}
            >
              {section.label}
            </button>
          );
        })}
      </nav>

      <div
        id={`room-financial-operations-panel-${financeView}`}
        role="tabpanel"
        aria-labelledby={`room-financial-operations-tab-${financeView}`}
        data-finance-active-view={financeView}
        className="pre18-finance-tabpanel"
        tabIndex={0}
      >
      {financeView === "overview" ? (
        overviewSummary ? (
          <FinancialOverviewSummary
            token={token}
            me={me}
            embedded
            refreshSignal={refreshTick}
            initialPeriodStart={roomCostFocus.filterPeriodStart}
            initialPeriodEnd={roomCostFocus.filterPeriodEnd}
            collectionEnabled={scope === "ROOM" && String(me?.role || "").toUpperCase() === "ROOM"}
            onPeriodChange={({ periodStart, periodEnd }) => handleOperationalFilterChange({ periodStart, periodEnd })}
            onOpenExpenses={openOverviewExpenses}
            onOpenAllExpenses={openAllOverviewExpenses}
            onOpenServiceCost={() => handleFinanceViewChange("service-cost")}
            onOpenIncomeEvidence={openIncomeEvidence}
            onOpenIncomeCorrection={openIncomeCorrection}
            incomeCorrectionTarget={incomeCorrectionTarget}
            initialIncomeInvoiceId={readCompanyIncomeInvoiceQueryInput()}
            agreementRecords={serviceDirectory.agreements}
            onIncomeCorrectionSaved={() => {
              setIncomeCorrectionTarget(null);
              setRefreshTick((value) => value + 1);
            }}
          />
        ) : (
          <RoomFinanceOverviewPanel
            token={token}
            preview={preview}
            loading={loading}
            err={err}
            roomCostFocus={roomCostFocus}
            missingDataActions={missingDataActions}
            onNavigate={handleRoomCostNavigate}
            onViewChange={handleFinanceViewChange}
            onContextChange={handleRoomContextChange}
            canManageExpenses={canManageRoomCosts}
          />
        )
      ) : null}

      {financeView === "expenses" ? (
        <section className="pre18-finance-expenses" data-finance-section="expenses" aria-labelledby="room-financial-operations-tab-expenses">
      {canManageRoomCosts ? (
        <>
        <OperationalFilterBar
          focus={roomCostFocus}
          directory={serviceDirectory}
          onChange={handleOperationalFilterChange}
        />
        <RoomCostLedgerPanel
          token={token}
          roomId={me?.roomId}
          focusVehicleId={expenseLedgerFocus.vehicleId}
          focusDriverId={expenseLedgerFocus.driverId}
          focusCostCategory={roomCostFocus.costCategory}
          focusField={roomCostFocus.field}
          prefillVehicleId={roomCostFocus.prefillVehicleId}
          prefillDriverId={roomCostFocus.prefillDriverId}
          focusExpenseFilter={roomCostFocus.expenseFilter}
          focusEntryId={roomCostFocus.focusEntryId}
          focusPeriodStart={expenseLedgerFocus.periodStart}
          focusPeriodEnd={expenseLedgerFocus.periodEnd}
          focusRecordKind={roomCostFocus.recordKind}
          focusAgreementId={roomCostFocus.agreementId}
          focusShiftId={roomCostFocus.shiftId}
          focusOfferId={roomCostFocus.focusOfferId}
          returnTo={roomCostFocus.returnTo}
          focusContextLabel={roomCostFocus.recordKind && (roomCostFocus.agreementId || roomCostFocus.shiftId)
            ? `Sözleşme · ${selectedServiceAgreementText} · Vardiya · ${selectedServiceShiftText} · ${selectedServiceVehicleText} · ${selectedServiceDriverText} · ${serviceContextDateRange(roomCostFocus.periodStart, roomCostFocus.periodEnd)}`
            : null}
          onNavigate={handleRoomCostNavigate}
          onClearExpenseFocus={clearExpenseFocus}
          onLedgerChanged={() => setRefreshTick((n) => n + 1)}
        />
        <RoomCostSettlementPanel
          token={token}
          onChanged={() => setRefreshTick((n) => n + 1)}
        />
        </>
      ) : (
        <div className="card" data-finance-expenses-readonly>
          <div className="panelSectionTitle">Giderler salt okunur</div>
          <div className="muted" style={{ marginTop: 8, lineHeight: 1.45 }}>
            Bu oturumda gider ekleme, taslak oluşturma veya onaylama işlemi açılmaz. Kanıtı okumak için Servis Maliyeti sekmesini kullanın.
          </div>
        </div>
      )}
        </section>
      ) : null}

      {financeView === "service-cost" ? (
        <section className="pre18-finance-service-cost" data-finance-section="service-cost" aria-labelledby="room-financial-operations-tab-service-cost">
      <OperationalFilterBar
        focus={effectiveRoomCostFocus}
        directory={serviceDirectory}
        onChange={handleOperationalFilterChange}
      />
      <OperationalDecisionSummary
        decision={resolveOperationalDecisionForScope({
          vehicleMonthDecision: preview?.vehicleMonthDecision,
          contractMonthDecision: preview?.contractMonthDecision,
          serviceCostScope,
          selectedServiceShift,
          selectedServiceAgreement,
        })}
        costNote="Seçili servise bağlanan gerçekleşmiş gider payı"
        serviceCostPresentation
      />
      <details className="finance-service-cost-context" data-testid="room-service-cost-context" open={serviceContextOpen}>
        <summary
          className="finance-service-cost-context-summary"
          aria-expanded={serviceContextOpen ? "true" : "false"}
          onClick={(event) => { event.preventDefault(); setServiceContextOpen((current) => !current); }}
        >
          <span>
            <small>SERVİS VE DÖNEM</small>
            <strong>{serviceCostContextRequired ? serviceCostSelectionPrompt : `${selectedServiceShiftText} · ${periodLabel}`}</strong>
            {!serviceCostContextRequired ? (
              <small>{serviceContextCustomerLabel(selectedServiceAgreement)} · {selectedServiceVehicleText} · {periodLabel}</small>
            ) : null}
          </span>
          <span className="finance-service-cost-context-summary-state">
            <em>{serviceCostContextRequired ? serviceCostSelectionPrompt : serviceCostScopeStatus}</em>
            <small>{serviceContextOpen ? "Servis ayrıntılarını gizle" : "Servis ayrıntılarını göster"}</small>
          </span>
        </summary>
        <div className="finance-service-cost-context-details">
        <div className="finance-service-cost-context-head">
          <div>
            <div className="panelSectionTitle">Servis ayrıntıları</div>
            <div className="panelMeta">Seçim burada değiştirildiğinde aynı firma kapsamındaki onaylı önizleme yenilenir.</div>
          </div>
          <span className="finance-service-cost-context-source">{readableSnapshotSourceLabel}</span>
        </div>
        <div className="finance-service-cost-context-grid">
          <label className="finance-service-cost-context-field">
            <span>İncelenecek servis</span>
            {canManageRoomCosts && serviceCostAgreementOptions.length ? (
              <select
                aria-label="Servis seçimi"
                data-testid="service-context-service-select"
                value={selectedServiceAgreementId}
                onChange={(event) => {
                  const agreementId = event.target.value || null;
                  const candidate = serviceCostCandidates.find((item) => Number(item.agreementId) === Number(agreementId));
                  const agreement = serviceDirectory.agreements.find((item) => Number(item?.id) === Number(agreementId)) || null;
                  handleServiceCostContextChange({
                    vehicleId: candidate?.vehicleId || null,
                    shiftId: candidate?.shiftId || null,
                    agreementId: candidate?.agreementId || agreement?.id || null,
                    periodStart: candidate?.periodStart || agreement?.startDate || null,
                    periodEnd: candidate?.periodEnd || agreement?.endDate || null,
                  });
                }}
              >
                <option value="">Servis seçin</option>
                {serviceCostAgreementOptions.map((agreement) => (
                  <option key={agreement.id} value={agreement.id}>{serviceContextAgreementLabel(agreement, serviceDirectory.vehicles)}</option>
                ))}
              </select>
            ) : (
              <strong>{serviceCostContextRequired ? serviceCostSelectionPrompt : selectedServiceAgreementText}</strong>
            )}
          </label>
          <div className="finance-service-cost-context-field">
            <span>Araç</span>
            <strong>{selectedServiceVehicleText}</strong>
          </div>
          <div className="finance-service-cost-context-field">
            <span>Dönem</span>
            <strong>{periodLabel}</strong>
          </div>
        </div>
        <details className="finance-service-cost-context-relations">
          <summary>Kaynak ilişki ayrıntıları</summary>
          <div className="finance-service-cost-context-grid">
            <div className="finance-service-cost-context-field">
              <span>Müşteri</span>
              <strong>{selectedServiceAgreement ? serviceContextCustomerLabel(selectedServiceAgreement) : "Müşteri doğrulanamadı"}</strong>
            </div>
            <div className="finance-service-cost-context-field">
              <span>Sözleşme</span>
              <strong>{serviceContextContractLabel(selectedServiceAgreement)}</strong>
            </div>
            <div className="finance-service-cost-context-field">
              <span>Vardiya</span>
              <strong>{selectedServiceShiftText}</strong>
            </div>
            <div className="finance-service-cost-context-field">
              <span>Sürücü</span>
              <strong>{selectedServiceDriverText}</strong>
            </div>
            <div className="finance-service-cost-context-field">
              <span>Vardiya–araç ilişkisi</span>
              <strong className={serviceVehicleRelation === "Doğrulandı" ? "finance-service-cost-context-good" : "finance-service-cost-context-warning"}>{serviceVehicleRelation}</strong>
            </div>
          </div>
        </details>
      </div>
      </details>
      {hasExplicitServiceSelection ? (
        <>
          <PlanningEvidenceSummary
            evidence={preview?.roomCostPlanningEvidence}
            modelInput={preview?.modelInput}
            roomProfitability={roomProfitability}
            vehicleMonthDecision={preview?.vehicleMonthDecision}
            contractMonthDecision={preview?.contractMonthDecision}
            newOfferDecision={preview?.newOfferDecision}
            accountingPeriod={preview?.accountingPeriod}
            accountingPeriodReadiness={preview?.accountingPeriodReadiness}
            onAccountingPeriodTransition={canManageRoomCosts ? handleAccountingPeriodTransition : undefined}
            serviceCostScope={serviceCostScope}
            sourceEntries={serviceCostSourceRows}
            onNavigate={handleRoomCostNavigate}
            onViewChange={handleFinanceViewChange}
            onCompleteAllocation={canManageRoomCosts ? handleServiceCostAllocation : undefined}
            onAutoAllocate={canManageRoomCosts ? handleAutomaticServiceCostAllocation : undefined}
            onOpenPlanningBucket={(recordKind) => handleRoomCostNavigate({
              costCategory: "OTHER_OPERATION",
              recordKind,
              periodStart: selectedServiceShift?.startAt || selectedServiceAgreement?.startAt || undefined,
              periodEnd: selectedServiceShift?.endAt || selectedServiceAgreement?.endAt || undefined,
              vehicleId: selectedServiceVehicleId,
              driverId: selectedServiceDriverId,
              shiftId: selectedServiceShiftId,
              agreementId: selectedServiceAgreementId,
              contextSource: "expense-entry",
            })}
            selectedServiceShiftId={selectedServiceShiftId}
            selectedServiceAgreementId={selectedServiceAgreementId}
            selectedServiceVehicleId={selectedServiceVehicleId}
            selectedServiceDriverId={selectedServiceDriverId}
            selectedServicePeriodStart={selectedServiceShift?.startAt || selectedServiceAgreement?.startAt || null}
            selectedServicePeriodEnd={selectedServiceShift?.endAt || selectedServiceAgreement?.endAt || null}
            selectedServicePeriodLabel={periodLabel}
            canManageRoomCosts={canManageRoomCosts}
          />
          <div className="finance-service-cost-scope-note" data-finance-scope-summary>
            <span>Seçili kapsam</span>
            <strong>{readableSnapshotSourceLabel} · {periodLabel}</strong>
            <span>{serviceCostScopeStatus}</span>
          </div>
        </>
      ) : (
        <div className="card finance-service-cost-empty" data-testid="room-service-cost-empty" role="status" style={{ marginTop: 12 }}>
          <div className="panelSectionTitle">{serviceCostSelectionPrompt}</div>
          <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
            {serviceCostNoMatchingService
              ? "Bu araç ve dönemde tamamlanmış, rota bilgisi doğrulanmış servis bulunmuyor. Önce uygun servis kaydını tamamlayın veya araç/dönem filtresini değiştirin."
              : "Servis giderlerini ve o servise ait eksik bilgileri görmek için yukarıdaki servis listesinden seçim yapın."}
          </div>
          <div className="panelMeta" style={{ marginTop: 6 }}>
            Bu özet gerçekleşen araç, sürücü ve dönem kapsamındadır; servis maliyetinden ayrıdır.
          </div>
          <button type="button" className="btn sm" style={{ marginTop: 10 }} onClick={() => setServiceContextOpen(true)}>
            Servis seçin
          </button>
        </div>
      )}
        </section>
      ) : null}

      {financeView === "vehicle-comparison-disabled" ? (
        <section className="pre18-finance-vehicle-comparison" data-finance-section="vehicle-comparison" aria-labelledby="room-financial-operations-tab-vehicle-comparison">
          <RoomFinanceOfferSelector
            options={roomFinanceOfferOptions}
            selectedValue={selectedRoomFinanceOfferValue}
            onChange={handleRoomFinanceOfferSelection}
          />
          <OperationalFilterBar
            focus={effectiveRoomCostFocus}
            directory={serviceDirectory}
            onChange={handleOperationalFilterChange}
          />
          <OperationalDecisionSummary decision={preview?.vehicleMonthDecision} />
          <div className="card pre18-finance-decision-card" style={{ marginTop: 12 }}>
            <div className="panelSectionTitle">Araç karşılaştır</div>
            <div className="muted" style={{ marginTop: 8, lineHeight: 1.5 }}>
              Mevcut planı araç tipi, kapasite, rota ve maliyet varsayımlarıyla karşılaştır. Eksik kaynaklar sonucu kesinleştirmez; doğrulanmış senaryo hizmeti kapsamı ve açık engelleri ayrı gösterir.
            </div>
            <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
              <div className="muted">Kapasite: <b>{snapshot?.vehicleCapacity ?? "Belirsiz"}</b></div>
              <div className="muted">Uygunluk: <b>{vehicleFit || snapshot?.vehicleFitLabel || "Doğrulama bekliyor"}</b></div>
              <div className="muted">Gerçekleşen gider (brüt): <b>{vehicleComparisonCostLabel}</b></div>
              <div className="panelMeta">{vehicleComparisonCostNote}. Planlanan teklif bu maliyete dahil değildir.</div>
            </div>
            <div className="finance-v21-card-actions">
              <button type="button" className="btn sm" onClick={() => handleFinanceViewChange("overview")}>
                Genel Durum'a dön
              </button>
            </div>
          </div>
          <CostScenarioWorkspacePanel
            scope="ROOM"
            embedded
            focusAgreementId={effectiveRoomCostFocus.agreementId}
            focusShiftId={effectiveRoomCostFocus.shiftId}
            focusVehicleId={effectiveRoomCostFocus.vehicleId}
            quoteFloor={quoteFloor}
            roomProfitability={roomProfitability}
            commercialOffer={commercialOffer}
            planningCostInputs={form}
            onScenarioSelectionChange={(selection) => setSelectedRoomScenario(normalizeRoomScenarioQuoteBinding(selection))}
          />
        </section>
      ) : null}

      {financeView === "quote-profitability-legacy" ? (
        <section className="pre18-finance-quote" data-finance-section="quote-profitability" aria-labelledby="room-financial-operations-tab-quote-profitability">
      <RoomMonthlyPriceReferenceCard
        reference={selectedScenarioMonthlyPriceReference}
        quoteFloor={displayQuoteFloor}
        quoteFloorPresentation={quoteFloorPresentation}
      />
      {selectedRoomScenario ? (
        <div className="card" data-testid="quote-selected-scenario-binding" style={{ marginTop: 12, border: "1px solid rgba(18,183,106,0.36)", background: "rgba(18,183,106,0.045)" }}>
          <div className="panelSectionTitle">Seçili araç senaryosu teklife bağlandı</div>
          <div className="muted" style={{ marginTop: 8, lineHeight: 1.5 }}>
            Seçili araç planı · Planlama maliyeti: <b>{selectedScenarioQuoteCostMinor != null ? formatTRY(selectedScenarioQuoteCostMinor) : "Belirsiz"}</b> · Durum: {humanizeUserFacingText(selectedRoomScenario.status || "Belirtilmedi")}
          </div>
          <div className="panelMeta" style={{ marginTop: 6 }}>
            Teklif tabanı ve hedef kâr aynı senaryo maliyetiyle canonical finans önizlemesinde yeniden hesaplanıyor; bu seçim canlı gider veya teklif kaydı oluşturmaz.
          </div>
        </div>
      ) : null}
      <div className="card" data-testid="quote-profitability-context" style={{ marginTop: 12 }}>
        <div className="panelSectionTitle">Teklif ve hizmet bağlamı</div>
        <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
          Aynı açık iş ve teklif kaynağı Araç Karşılaştır ekranıyla paylaşılır. Teklif yoksa hakediş veya sözleşme bedeli teklif yerine kullanılmaz.
        </div>
        {selectedServiceShiftId ? (
          <div className="finance-quote-selected-context" data-testid="quote-selected-context" style={{ marginTop: 10 }}>
            <div>
              <span className="finance-context-label">Seçili iş</span>
              <strong>
                {selectedRoomFinanceOffer
                  ? `${Number(selectedRoomFinanceOffer.offerId || 0) > 0 ? `Teklif #${selectedRoomFinanceOffer.offerId}` : `Açık iş #${selectedRoomFinanceOffer.shiftId || selectedRoomFinanceOffer.requestId || "-"}`} · ${selectedRoomFinanceOffer.companyName}`
                  : (selectedServiceAgreement ? serviceContextCustomerLabel(selectedServiceAgreement) : (snapshot.companyName || "Müşteri doğrulanamadı"))}
                {` · ${selectedServiceShiftText}`}
              </strong>
              <small>{selectedServiceVehicleText} · {periodLabel}</small>
            </div>
            <button type="button" className="btn sm ghost" data-testid="quote-context-toggle" onClick={() => setQuoteContextPickerOpen((current) => !current)}>
              {quoteContextPickerOpen ? "Seçimi kapat" : "Başka iş seç"}
            </button>
          </div>
        ) : null}
        {(!selectedServiceShiftId || quoteContextPickerOpen) ? (
          <RoomFinanceOfferSelector
            options={roomFinanceOfferOptions}
            selectedValue={selectedRoomFinanceOfferValue}
            onChange={handleRoomFinanceOfferSelection}
          />
        ) : null}
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
          <MetricCard title="Gerçek teklif" value={commercialOffer?.status === "AVAILABLE" ? formatTRY(commercialOffer.amountMinor) : "-"} note={commercialOffer?.source === "AGREEMENT_ROOM_OFFER" ? "Seçili sözleşmedeki ROOM teklifi" : commercialOffer?.source === "SHIFT_ROOM_OFFER" ? "Seçili vardiyadaki ROOM teklifi" : quoteOfferStatusLabel} tone={commercialOffer?.status === "AVAILABLE" ? "good" : "muted"} />
          <MetricCard title="Seçili hizmet" value={selectedServiceShiftText} note={`${selectedServiceVehicleText} · ${selectedServiceDriverText}`} />
          <MetricCard title="Teklif durumu" value={quoteOfferStatusLabel} note={quoteOfferReasonLabel(commercialOffer?.reason, quoteRequestContext)} tone={commercialOffer?.status === "AVAILABLE" ? "good" : "muted"} />
        </div>
        {roomProfitability?.contextBlocked ? (
          <div className="panelMeta" style={{ marginTop: 10, color: "#f7b267" }}>
            Seçilen teklif ile hizmet eşleşmiyor. Beklenen kazanç ve marj gösterilmiyor; önce uyumlu bir hizmet seçin.
          </div>
        ) : null}
        {quoteRequestContext ? (
          <div
            className="card"
            data-testid="quote-request-context"
            style={{ marginTop: 12, border: quoteRequestContext.canPreviewCost ? "1px solid rgba(70,180,120,.34)" : "1px solid rgba(247,178,103,.42)", background: quoteRequestContext.canPreviewCost ? "rgba(70,180,120,.05)" : "rgba(247,178,103,.06)" }}
          >
            <div className="panelSectionTitle">Talep bağlamı</div>
            <div className="panelMeta" style={{ marginTop: 6 }}>
                    <strong>{quoteRequestContext.contractless ? `Sözleşmesiz talep #${quoteRequestContext.shiftId}` : `Talep #${quoteRequestContext.agreementId}`}</strong> · {quoteRequestContext.customerLabel} · {quoteRequestContext.contractless ? quoteRequestContext.periodLabel : serviceContextDateRange(selectedServiceAgreement?.startDate, selectedServiceAgreement?.endDate)}
            </div>
            <div className="panelMeta" style={{ marginTop: 6 }}>
              {quoteRequestContext.contractless
                ? "Bu sözleşmesiz teklif önizlemesi yalnızca şirket talebi, ROOM teklifinin ve doğrulanmış rota kaydının planlama bilgilerini kullanır; gerçekleşmiş gider veya sözleşme geliri bu talebe aktarılmaz."
                : "Bu önizleme yalnızca seçili talebin kayıtlı bilgilerini ve ona bağlı hizmeti kullanır; başka sözleşme veya gerçekleşmiş servis gideri bu talebe aktarılmaz."}
            </div>
            {quoteRequestContext.canPreviewCost ? (
              <div className="panelMeta" data-testid="quote-request-ready" style={{ marginTop: 8 }}>
                {quoteRequestContext.contractless
                  ? "Talep ve doğrulanmış rota bağlamı hazır. Araç planı seçildiğinde yalnız kanıtlanan maliyet bileşenleri hesaplanır; eksik bileşenler teklif tabanını kesinleştirmez."
                  : "Talep bağlamı tamamlandı. Tahmini maliyet mevcut onaylı maliyet hesabından okunuyor; sonuç kesin net kâr değildir."}
              </div>
            ) : (
              <>
                <div className="panelMeta" data-testid="quote-request-missing-info" style={{ marginTop: 8 }}>
                  Maliyetli teklif önizlemesi için şu bilgiler tamamlanmalı:
                </div>
                <ul style={{ margin: "6px 0 0 18px", padding: 0 }}>
                  {quoteRequestContext.missing.map((item) => (
                    <li key={item.key} className="panelMeta" style={{ marginTop: 4 }}>
                      <strong>{item.label}:</strong> {item.completion}
                    </li>
                  ))}
                </ul>
                <div className="finance-v21-card-actions" style={{ marginTop: 10 }}>
                  <button
                    type="button"
                    className="btn sm"
                    data-testid="quote-request-completion-link"
                    onClick={() => navigate(`/room/agreements?focusAgreementId=${quoteRequestContext.agreementId}`)}
                  >
                    {quoteRequestContext.contractless ? "Araç ve rota planını tamamla" : "Talep / sözleşme kaydını aç"}
                  </button>
                </div>
              </>
            )}
          </div>
        ) : null}
      </div>
      <div className="card pre18-finance-quote-separation" data-finance-quote-cost-separation style={{ marginTop: 12, border: "1px solid rgba(247,144,9,0.3)", background: "rgba(247,144,9,0.05)" }}>
        <div className="panelSectionTitle">Teklif varsayımı ve gerçek gider ayrı</div>
        <div className="muted" style={{ marginTop: 8, lineHeight: 1.5 }}>
          Bu ekrandaki boş kilometre, sürücü vardiya maliyeti ve ortak araç sabit gideri teklif önizlemesindeki manuel planlama varsayımlarıdır. Giderlerim ekranında açıkça onaylanan gerçek gider kayıtları ise ayrı tutulur; iki kaynak birbirine eklenerek iki kez sayılmaz.
        </div>
        <div className="panelMeta" style={{ marginTop: 8 }}>Gerçek gider eklemek için Giderlerim sekmesindeki işlem kartını kullanın.</div>
      </div>
      <div className="card pre18-finance-quote-vehicle-context" data-testid="quote-vehicle-scenario-summary" style={{ marginTop: 12 }}>
        <div className="panelSectionTitle">Seçili hizmetin araç maliyeti</div>
        <div className="muted" style={{ marginTop: 8, lineHeight: 1.5 }}>
          Teklif hesabı seçili hizmetin mevcut maliyet bağlamını kullanır. Araç tipi, kapasite ve alternatif araçların ayrıntılı karşılaştırması ayrı menüde yapılır; burada aynı senaryo paneli tekrar edilmez.
        </div>
        <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
          <div className="panelMeta"><strong>Hizmet:</strong> {selectedServiceShiftText}</div>
          <div className="panelMeta"><strong>Araç:</strong> {selectedServiceVehicleText}</div>
          <div className="panelMeta"><strong>Sürücü:</strong> {selectedServiceDriverText}</div>
          <div className="panelMeta"><strong>Maliyet durumu:</strong> {roomProfitability?.contextBlocked ? "Bağlam uyuşmuyor" : baselineMinor != null ? "Tahmini hizmet maliyeti bağlı" : "Maliyet kanıtı bekleniyor"}</div>
        </div>
        <div className="finance-v21-card-actions" style={{ marginTop: 12 }}>
          <button
            type="button"
            className="btn sm"
            data-testid="quote-vehicle-comparison-link"
            onClick={() => handleFinanceViewChange("vehicle-comparison")}
          >
            Araçları karşılaştır
          </button>
        </div>
      </div>
      <RoomDecisionLayerSummary
        vehicleMonthDecision={preview?.vehicleMonthDecision}
        contractMonthDecision={preview?.contractMonthDecision}
        newOfferDecision={preview?.newOfferDecision}
        onNavigate={handleRoomCostNavigate}
        accountingPeriod={preview?.accountingPeriod}
        accountingPeriodReadiness={preview?.accountingPeriodReadiness}
        onAccountingPeriodTransition={canManageRoomCosts ? handleAccountingPeriodTransition : undefined}
      />
      {periodScopeActive ? (
        <div className="card" data-testid="quote-period-planning-scope" style={{ marginTop: 12, border: "1px solid rgba(247,144,9,0.3)", background: "rgba(247,144,9,0.05)" }}>
          <div className="panelSectionTitle">Hizmet dönemi maliyet kapsamı</div>
          <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
            Seçili vardiya hesabı ile planlanan hizmet dönemi ayrı tutulur. Gözlenen vardiya sayısı, gerçekleşmiş hizmet sayısı olarak çoğaltılmaz; sözleşmesiz talepte bu kart yalnızca kullanıcı planlama önizlemesidir.
          </div>
          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8 }}>
            <MetricCard title="Hizmet dönemi" value={periodPlanningDisplay.periodStart && periodPlanningDisplay.periodEnd ? serviceContextDateRange(periodPlanningDisplay.periodStart, periodPlanningDisplay.periodEnd) : "Belirsiz"} note="Sözleşme planı" tone="default" />
            <MetricCard title="Planlı servis günü" value={periodPlanningDisplay.scheduledServiceDayCount ?? "Belirsiz"} note="Takvim ve haftalık sıklık" tone={periodPlanningDisplay.scheduledServiceDayCount == null ? "muted" : "default"} />
            <MetricCard title="Planlı hareket" value={periodPlanningDisplay.plannedMovementCount ?? "Belirsiz"} note="Her uygun günde bir sözleşme vardiyası varsayımı" tone={periodPlanningDisplay.plannedMovementCount == null ? "muted" : "default"} />
            <MetricCard title="Gözlenen bağlı vardiya" value={periodPlanningDisplay.observedLinkedShiftCount ?? "Belirsiz"} note="Bu sayı dönem toplamı değildir" tone="default" />
            <MetricCard title="Seçili vardiya tahmini maliyeti" value={periodPlanningDisplay.selectedShiftQuoteFloorMinor == null ? "Belirsiz" : formatTRY(periodPlanningDisplay.selectedShiftQuoteFloorMinor)} note="Tek vardiya planlama tabanı; tam dönem değildir" tone={periodPlanningDisplay.selectedShiftQuoteFloorMinor == null ? "muted" : "warm"} />
            <MetricCard title="Bilinen rota + boş km yakıtı" value={periodPlanningDisplay.knownRoutePlanningCostMinor == null ? "Belirsiz" : formatTRY(periodPlanningDisplay.knownRoutePlanningCostMinor)} note="Planlı hareketlerin yakıt bileşeni; dönem toplamı değildir" tone={periodPlanningDisplay.knownRoutePlanningCostMinor == null ? "muted" : "warm"} />
            <MetricCard title="Tahmini dönem maliyeti" value={periodPlanningDisplay.periodPlanningCostMinor == null ? "Belirsiz" : formatTRY(periodPlanningDisplay.periodPlanningCostMinor)} note={periodPlanningDisplay.periodCostReady ? "Tüm planlı hareketler ve açık varsayımlar" : "Eksik planlama bileşenleri tamamlanmalı"} tone={periodPlanningDisplay.periodCostReady ? "warm" : "muted"} />
          </div>
          <div className="panelMeta" data-testid="quote-period-planning-status" style={{ marginTop: 10 }}>
            <strong>{periodPlanningDisplay.statusLabel}</strong>
            {!periodPlanningDisplay.comparisonAllowed ? " Aylık teklif ile tek vardiya maliyeti karşılaştırılmıyor." : " Dönem maliyeti aynı planlama kapsamından hesaplanıyor."}
          </div>
          {periodPlanningDisplay.missingLabels.length ? (
            <div className="panelMeta" data-testid="quote-period-planning-missing" style={{ marginTop: 6 }}>
              Tamamlanması gereken bilgiler: {periodPlanningDisplay.missingLabels.join(", ")}.
            </div>
          ) : null}
          {periodPlanningDisplay.assumptions.length ? (
            <div className="panelMeta" data-testid="quote-period-planning-assumptions" style={{ marginTop: 6 }}>
              Planlama notu: {normalizeFinanceVisibleText(periodPlanningDisplay.assumptions.join(" "))}
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="card" data-testid="quote-profitability-summary" style={{ marginTop: 12 }}>
        <div className="panelSectionTitle">Teklif sonucu ve fiyat senaryosu</div>
        <div style={{ marginTop: 8 }}>
          <FinanceRiskBadge risk={roomQuoteRisk} testId="room-quote-risk-status" />
        </div>
        <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
          {selectedScenarioQuoteActive
            ? "Seçili araç senaryosunun dönem planlama maliyeti teklife bağlandı. Teklif tabanı için hedef katkı ve risk varsayımları ayrıca doğrulanmalıdır."
            : periodScopeActive && !periodPlanningDisplay.comparisonAllowed
            ? "Hizmet döneminin tamamı için maliyet henüz hesaplanamadı; tek vardiya tabanı aylık teklif sonucu yerine kullanılmıyor."
            : "Gerçek teklif, tahmini maliyet ve fiyat senaryosu ayrı tutulur. Bu alan yalnızca önizlemedir; fatura, tahsilat veya gider kaydı oluşturmaz."}
        </div>
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
          <MetricCard title="Teklif bedeli" value={commercialOffer?.status === "AVAILABLE" ? formatTRY(currentAmountMinor) : "-"} note="Onaylı gerçek teklif" tone={commercialOffer?.status === "AVAILABLE" ? roomQuoteRisk.tone : "muted"} />
          <MetricCard title={planningCostLabel} value={planningCostMinor != null ? formatTRY(planningCostMinor) : "-"} note={planningCostNote} tone={planningCostMinor != null && !displayRoomProfitability?.contextBlocked ? "warm" : "muted"} />
          <MetricCard title="Kanıtlanmış gerçekleşmiş gider" value={actualOperationalCostMinor != null ? formatTRY(actualOperationalCostMinor) : "-"} note={displayRoomProfitability?.netRollupBlocked ? "Brüt gerçekleşen gider • net toplam doğrulanmadı" : "Onaylı gider defteri ve hizmet kapsamı"} tone={actualOperationalCostMinor != null && !displayRoomProfitability?.contextBlocked ? "good" : "muted"} />
          <MetricCard title="Beklenen kazanç (planlama)" value={expectedProfitMinor != null ? formatTRY(expectedProfitMinor) : "-"} note={quoteFloorPresentation.definitive ? "Teklif − hedef katkı ve risk payı içeren planlama tabanı" : "Planlama tabanı veya katkı varsayımı doğrulanmadı"} tone={roomQuoteRisk.tone} />
              <MetricCard title="Gerçekleşmiş gider farkı" value={actualExpenseGapMinor != null ? formatTRY(actualExpenseGapMinor) : "-"} note="Teklif − kanıtlanmış gerçekleşmiş gider; planlama kazancı değildir" tone={actualExpenseGapMinor != null && !roomProfitability?.contextBlocked ? resultToneForMinor(actualExpenseGapMinor) : "muted"} />
          <MetricCard title="Beklenen kâr marjı" value={expectedMarginBps != null ? formatBps(expectedMarginBps) : "-"} note={displayRoomProfitability?.contextBlocked ? "Hesaplanamıyor" : "Planlama kazancı / planlama teklif bedeli; kesin net kâr değildir."} tone={roomQuoteRisk.tone} />
        </div>
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, alignItems: "end" }}>
          <label className="muted">
            Planlama için teklif bedeli (₺)
            <input
              data-testid="quote-scenario-price"
              inputMode="decimal"
              placeholder="Örn. 150000"
              value={formatMinorInput(form.quoteScenarioAmountMinor)}
              onChange={(event) => setForm((prev) => ({ ...prev, quoteScenarioAmountMinor: parseMajorInput(event.target.value) }))}
              style={INPUT_STYLE}
            />
          </label>
          <button type="button" className="btn sm" onClick={() => setRefreshTick((n) => n + 1)} disabled={loading}>
            Fiyatı hesapla
          </button>
        </div>
        <div className="panelMeta" style={{ marginTop: 8 }}>
          {roomProfitability?.summaryText || "Kârlılık için gerçek teklif ve maliyet kanıtı bekleniyor."}
        </div>
        {effectiveQuoteMissingEvidenceLabels.length ? (
          <div className="panelMeta" style={{ marginTop: 6 }}>Eksik kanıt: {effectiveQuoteMissingEvidenceLabels.join(", ")}</div>
        ) : null}
      </div>
      {effectiveRoomCostFocus.agreementId ? (
        <details className="card" style={{ marginTop: 12 }} data-testid="quote-realized-evidence">
          <summary className="panelSectionTitle" style={{ cursor: "pointer" }}>Tahmin / gerçekleşen kanıtı</summary>
          <div style={{ marginTop: 12 }}>
            <ReconciliationPreviewCard
              agreementId={effectiveRoomCostFocus.agreementId}
              token={token}
              collectionEnabled={scope === "ROOM" && String(me?.role || "").toUpperCase() === "ROOM"}
            />
          </div>
        </details>
      ) : null}
      <details className="card pre18-finance-secondary" style={{ marginTop: 12 }}>
        <summary className="panelSectionTitle">Karşılaştırma, senaryo ve dışa aktarım</summary>
        <div style={{ display: "grid", gap: 12 }}>
          <ExternalReferenceCard
            token={token}
            canView={canView}
            scope="ROOM"
            preview={preview}
            regionName={preview?.regionName || preview?.snapshot?.regionName || null}
            refreshTick={refreshTick}
          />
          <AccountingExportPanel scope="ROOM" me={me} preview={preview} token={token} />
        </div>
      </details>
      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
        <details className="card" style={{ minWidth: 0 }} open={roomDetailsOpen} onToggle={(event) => setRoomDetailsOpen(event.currentTarget.open)}>
          <summary
            className="panelSectionTitle"
            style={{ cursor: "pointer" }}
            data-copilot-target="room:financial-operations:quote-floor-details"
            data-copilot-semantic-id="product:room:financial-operations:quote-floor-details"
          >
            Teklif detayları
          </summary>
          <div className="card" style={{ minWidth: 0, marginTop: 12 }}>
          <div className="panelSectionTitle">Teklif tabanı yaşam döngüsü</div>
          <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
            {currentRoomQuoteFloorDraft
              ? "Sunucuda hesaplanan teklif tabanı taslağı sürüm ile korunur."
              : "Henüz kayıtlı teklif tabanı taslağı yok; yeni bir taslak oluşturabilirsin."}
          </div>
          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            <MetricCard
              title="Durum"
              value={currentRoomDraftLabel}
              note={currentRoomQuoteFloorDraft?.id ? "Mevcut taslak" : "Yeni taslak"}
              tone={currentRoomQuoteFloorDraftStatus === "APPLIED" ? "good" : currentRoomQuoteFloorDraftStatus === "ARCHIVED" ? "danger" : "warm"}
            />
            <MetricCard
              title="Sürüm"
              value={formatTextOrDash(currentRoomQuoteFloorDraft?.version ?? form.roomQuoteFloorDraftVersion)}
              note={currentRoomQuoteFloorDraft?.id ? "Mevcut taslak" : "Yeni taslak"}
            />
            <MetricCard
              title="Taban"
              value={formatTRY(currentRoomQuoteFloorDraft?.manualBaselineOperationalCostMinor ?? form.manualBaselineOperationalCostMinor)}
              note={baselineSourceHuman}
            />
            <MetricCard
              title="Teklif tabanı"
              value={formatTRY(currentRoomQuoteFloorDraft?.quoteFloorMinor ?? form.quoteFloorMinor)}
              note={currentRoomQuoteFloorDraft?.quoteFloorPerPassengerMinor != null ? `Taslak hesap özeti ${draftPassengerLabel} • Kişi başı ${formatTRY(currentRoomQuoteFloorDraft.quoteFloorPerPassengerMinor)}` : "Hesap bekliyor"}
            />
            <MetricCard title="Taslak hesap özeti kişi sayısı" value={draftPassengerLabel} note="Taslak girdisinden okunur; canlı vardiya değildir." />
          </div>
          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            <div className="muted">Dönem: <b>{periodLabel}</b></div>
            <div className="muted">Önizleme durumu: <b>{previewStatusValue || "Durum bekleniyor"}</b></div>
            <div className="muted">Taban kaynağı: <b>{baselineSourceHuman}</b></div>
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            {!currentRoomQuoteFloorDraft?.id ? (
              <button type="button" className="btn primary" onClick={() => handleRoomQuoteFloorAction("save")} disabled={loading || actionBusy.length > 0}>
                {actionBusy === "save" ? "Kaydediliyor..." : "Taslak kaydet"}
              </button>
            ) : null}
            {currentRoomQuoteFloorDraft?.id && roomDraftEditable ? (
              <button type="button" className="btn sm" onClick={() => handleRoomQuoteFloorAction("save")} disabled={loading || actionBusy.length > 0}>
                {actionBusy === "save" ? "Kaydediliyor..." : "Taslağı güncelle"}
              </button>
            ) : null}
            {currentRoomQuoteFloorDraft?.id && roomDraftCanApply ? (
              <button type="button" className="btn primary" onClick={() => handleRoomQuoteFloorAction("apply")} disabled={loading || actionBusy.length > 0}>
                {actionBusy === "apply" ? "Uygulanıyor..." : "Uygula"}
              </button>
            ) : null}
          </div>

          {costedQuoteReady ? (
            <div className="card finance-risk-card" data-risk={roomQuoteRisk.status.toLowerCase()} data-testid="costed-quote-send-card" style={{ marginTop: 12 }}>
              <div className="panelSectionTitle">Maliyetli teklifi sun</div>
              <div style={{ marginTop: 8 }}>
                <FinanceRiskBadge risk={roomQuoteRisk} />
              </div>
              <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
                Bu işlem mevcut ticari akışta yalnızca teklif sunar. Sözleşme kabulü, fatura, tahsilat ve gerçekleşmiş gider kaydı oluşturmaz.
              </div>
              <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
                <MetricCard title="Müşteri" value={selectedServiceAgreement ? serviceContextCustomerLabel(selectedServiceAgreement) : (selectedRoomFinanceOffer?.companyName || snapshotCompanyName)} note={selectedRoomFinanceOfferId ? `Teklif #${selectedRoomFinanceOfferId}` : selectedServiceAgreementId ? `Sözleşme #${selectedServiceAgreementId}` : "Hizmet bağlamı"} />
                <MetricCard title="Hizmet dönemi" value={periodLabel} note={`${periodPlanningDisplay.plannedMovementCount} planlı hareket`} />
                <MetricCard title="Gönderilecek teklif" value={formatTRY(costedQuoteOfferMinor)} note="ROOM tarafından belirlendi" tone={roomQuoteRisk.tone} />
                <MetricCard
                  title={costedQuoteUsesSingleRequestEstimate ? "Seçili talep tahmini maliyeti" : "Tahmini dönem maliyeti"}
                  value={formatTRY(costedQuotePlanningEstimateMinor)}
                  note={costedQuoteUsesSingleRequestEstimate ? "Tek talep planlama tahmini; dönem toplamı değildir" : "Aynı planlı hizmet kapsamı"}
                  tone="warm"
                />
                <MetricCard title="Önerilen teklif tabanı" value={formatTRY(costedQuoteFloorMinor)} note={costedQuoteFloorMinor == null ? "Dönem planı doğrulanmadı; kesin taban değil" : "Hedef katkı ve risk payı dahil"} tone="warm" />
                <MetricCard title="Beklenen maliyet farkı" value={formatTRY(costedQuoteDifferenceToCostMinor)} note={costedQuoteUsesSingleRequestEstimate ? "Teklif − seçili talep planlama tahmini" : "Teklif − tahmini dönem maliyeti"} tone={roomQuoteRisk.tone} />
              </div>
              {costedQuoteUsesSingleRequestEstimate ? (
                <div className="panelMeta" data-testid="costed-quote-period-not-proven" style={{ marginTop: 10, color: "#f7b267" }}>
                  Hizmet dönemi toplam maliyeti ve kesin kârlılık henüz doğrulanmadı. Gönderim yalnız seçili açık talebin mevcut planlama tahminiyle hazırlanır; sürücü ve dönem takvimi teklif hazırlığı için zorunlu değildir.
                </div>
              ) : null}
              {costedQuoteBelowEstimatedCost ? (
                <div className="panelMeta" data-testid="costed-quote-below-cost-warning" style={{ marginTop: 10, color: "#fda29b" }}>
                  Bu teklif, hesaplanan tahmini maliyetin altında.
                </div>
              ) : null}
              {!costedQuoteBelowEstimatedCost && costedQuoteBelowRecommendedFloor ? (
                <div className="panelMeta" data-testid="costed-quote-below-floor-warning" style={{ marginTop: 10, color: "#f7b267" }}>
                  Bu teklif tahmini maliyetin üzerinde; ancak önerilen teklif tabanının altında. Hedef katkı ve risk payı tam karşılanmıyor.
                </div>
              ) : null}
              {periodPlanningDisplay.assumptions.length ? (
                <div className="panelMeta" data-testid="costed-quote-assumptions" style={{ marginTop: 8 }}>
                  Planlama varsayımları: {periodPlanningDisplay.assumptions.join(" ")}
                </div>
              ) : null}
              {!costedQuoteApprovalOpen ? (
                <button type="button" className="btn primary" data-testid="costed-quote-open-approval" style={{ marginTop: 10 }} onClick={() => setCostedQuoteApprovalOpen(true)} disabled={loading || actionBusy.length > 0}>
                  Gönderim özetini aç
                </button>
              ) : (
                <div data-testid="costed-quote-approval" style={{ marginTop: 12, display: "grid", gap: 8 }}>
                  <div className="panelMeta">Teklif tutarı, dönem maliyeti ve uyarılar yukarıdaki özetle birlikte kontrol edildi. Göndermek için aşağıya <b>ONAYLA</b> yazın.</div>
                  <input
                    aria-label="Teklif gönderim onayı"
                    data-testid="costed-quote-confirmation"
                    inputMode="text"
                    autoComplete="off"
                    placeholder="ONAYLA"
                    value={costedQuoteApprovalToken}
                    onChange={(event) => setCostedQuoteApprovalToken(event.target.value)}
                    style={INPUT_STYLE}
                  />
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button type="button" className="btn primary" data-testid="costed-quote-send" onClick={handleCostedQuoteSend} disabled={loading || actionBusy.length > 0 || String(costedQuoteApprovalToken || "").trim().toUpperCase() !== "ONAYLA"}>
                      {actionBusy === "send-costed-quote" ? "Sunuluyor..." : "Teklifi açıkça sun"}
                    </button>
                    <button type="button" className="btn sm" onClick={() => { setCostedQuoteApprovalOpen(false); setCostedQuoteApprovalToken(""); }} disabled={actionBusy.length > 0}>
                      Vazgeç
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          <details style={{ marginTop: 12 }}>
            <summary className="muted" style={{ cursor: "pointer" }}>Diğer teklif işlemleri</summary>
            <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {roomDraftCanArchive ? (
                <button type="button" className="btn sm" onClick={() => handleRoomQuoteFloorAction("archive")} disabled={loading || actionBusy.length > 0}>
                  {actionBusy === "archive" ? "Arşivleniyor..." : "Arşivle"}
                </button>
              ) : null}
              <button type="button" className="btn sm" onClick={() => handleRoomQuoteFloorAction("save", { createNew: true })} disabled={loading || actionBusy.length > 0}>
                Yeni taslak
              </button>
            </div>
      </details>
          {actionErr ? (
            <div className="card" style={{ marginTop: 10, border: "1px solid rgba(240,68,56,0.25)" }}>
              {actionErr}
            </div>
          ) : null}
          {actionOk ? (
            <div className="muted" style={{ marginTop: 8, lineHeight: 1.45 }}>
              {actionOk}
            </div>
          ) : null}

          <details style={{ marginTop: 12 }} data-testid="quote-canonical-cost-source">
            <summary className="muted" style={{ cursor: "pointer" }}>Maliyet kaynağı ve otomatik hesap</summary>
            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              <div className="panelMeta">
                Maliyet; yetkili gider kaydı, araç, sürücü, rota ve hizmet dönemi bilgilerinden otomatik hesaplanır. Bu ekranda maliyet tabanı, aylık pay, kilometre anahtarı, yakıt, bakım, maaş veya muhasebe sınıflandırması elle girilmez.
              </div>
              <div className="panelMeta">Gider bir kez Giderlerim ekranına kaydedilir; Servis Maliyeti ve Teklif Değerlendir aynı kanonik hesabı okur. Tahmini maliyet gerçekleşmiş gider veya kesin kâr değildir.</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8 }}>
                <MetricCard title="Maliyet durumu" value={roomProfitability?.contextBlocked ? "Bağlam uyuşmuyor" : baselineMinor != null ? "Kanıtlı hesap" : "Kanıt bekleniyor"} note={modelStatusValue || "Durum bekleniyor"} tone={roomProfitability?.contextBlocked ? "danger" : baselineMinor != null ? "good" : "warm"} />
                <MetricCard title="Maliyet kaynağı" value={baselineSourceHuman || "Kaynak bekleniyor"} note="Yetkili kayıt ve operasyon bağlamı" />
                <MetricCard title="Hizmet dönemi" value={periodLabel || "Belirsiz"} note="Dönem ve sıklık kanıtı" />
                <MetricCard title="Planlanan maliyet" value={planningCostMinor != null ? formatTRY(planningCostMinor) : "Belirsiz"} note="Tahmin; gerçekleşmiş gider değildir" tone={planningCostMinor != null ? "warm" : "muted"} />
                <MetricCard title="Gerçekleşen gider" value={actualOperationalCostMinor != null ? formatTRY(actualOperationalCostMinor) : "Belirsiz"} note="Onaylı gider kaydı" tone={actualOperationalCostMinor != null ? "good" : "muted"} />
              </div>
              <div className="panelMeta">
                Kanıt eksikse sistem oran, aylık pay veya kilometre varsayımı uydurmaz; maliyet ve kâr sonucu belirsiz bırakılır.
              </div>
            </div>
          </details>
          <details style={{ marginTop: 12 }} data-testid="quote-policy-controls">
            <summary className="muted" style={{ cursor: "pointer" }}>Teklif politikası</summary>
            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              <div className="panelMeta">Bu iki alan maliyet dağıtımı değildir; teklif hedefi ve risk politikasıdır. Maliyet hesabı bu alanlara göre yeniden kurulmaz.</div>
              <label className="muted">
                Hedef katkı oranı (%)
                <input
                  inputMode="decimal"
                  placeholder="örn. 12"
                  value={formatBpsInput(form.targetContributionBps)}
                  onChange={(e) => setForm((prev) => ({ ...prev, targetContributionBps: parseBpsInput(e.target.value) }))}
                  style={INPUT_STYLE}
                />
              </label>
              <label className="muted">
                Risk payı (%)
                <input
                  inputMode="decimal"
                  placeholder="örn. 3"
                  value={formatBpsInput(form.riskReserveBps)}
                  onChange={(e) => setForm((prev) => ({ ...prev, riskReserveBps: parseBpsInput(e.target.value) }))}
                  style={INPUT_STYLE}
                />
              </label>
            </div>
          </details>
        </div>
        </details>

        <details className="card" style={{ minWidth: 0 }}>
          <summary className="panelSectionTitle" style={{ cursor: "pointer" }}>Hesaplama detayları</summary>
          <div style={{ marginTop: 12 }}>
            <div className="panelSectionTitle">Karar özeti</div>
            <div className="muted" style={{ lineHeight: 1.45 }}>{decisionSummary}</div>
            <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
              <div className="muted">Taban kaynağı: <b>{baselineSourceHuman}</b></div>
              <div className="muted">Hedef katkı oranı: <b>{formatBps(quoteFloor?.targetContributionBps)}</b> • Risk payı: <b>{formatBps(quoteFloor?.riskReserveBps)}</b></div>
              <div className="muted">Planlama kazancı (teklif − planlama maliyeti): <b>{formatTRY(quoteFloorGapMinor)}</b></div>
            </div>
            <div className="card" style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
              <MetricCard title={meta.currentLabel} value={formatTRY(currentAmountMinor)} note={snapshotCounterLabel} tone={currentAmountMinor != null ? "good" : "default"} />
              <MetricCard title={scope === "ROOM" ? "Gerçekleşmiş gider farkı" : meta.amountGapLabel} value={formatTRY(scope === "ROOM" ? actualExpenseGapMinor : currentGapMinor)} note={scope === "ROOM" ? "Teklif − kanıtlanmış gerçekleşmiş gider" : "Planlanan teklif − tahmini maliyet"} tone={(scope === "ROOM" ? actualExpenseGapMinor : currentGapMinor) == null ? "muted" : Number(scope === "ROOM" ? actualExpenseGapMinor : currentGapMinor) >= 0 ? "good" : "danger"} />
              <MetricCard title={meta.resultLabel} value={quoteFloorComputed ? formatTRY(quoteFloor?.quoteFloorMinor) : "-"} note={quoteFloorComputed ? `${quoteFloorConfirmed ? "Doğrulanmış" : "Tahmini; net kâr doğrulanmadı"} • ${livePreviewSourceLabel} • ${livePassengerLabel} • Kişi başı ${formatTRY(quoteFloor?.quoteFloorPerPassengerMinor)}` : "Maliyet bilgileri bekleniyor"} tone={quoteFloorComputed && quoteFloorConfirmed ? "good" : quoteFloorComputed ? "warm" : "muted"} />
            </div>
          </div>
        </details>
      </div>

      <details className="card" style={{ marginTop: 12, padding: 12 }}>
        <summary className="panelSectionTitle" style={{ cursor: "pointer" }}>Gelişmiş bilgiler</summary>
        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
          <div className="panelSectionTitle" style={{ gridColumn: "1 / -1" }}>Ayrıntılı maliyet verileri</div>
          <div className="card" style={{ minWidth: 0 }}>
            <div className="panelSectionTitle">Maliyet modeli</div>
            <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
              {modelSummaryText}
            </div>
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
              <MetricCard title="Durum" value={modelStatusValue || "-"} note={modelConfidenceReason} tone={modelStatusToneValue} />
              <MetricCard title="Güven" value={confidenceValue || "-"} note={`Puan ${Number(model?.confidence?.score || 0) || 0}/100`} tone={confidenceMetricTone} />
              <MetricCard title="Birim km" value={formatTRY(model?.unitCosts?.costPerTotalKmMinor)} note="Toplam km başı" />
              <MetricCard title="Birim yolcu" value={formatTRY(model?.unitCosts?.costPerPassengerMinor)} note="Yolcu başı" />
            </div>
            <div style={{ marginTop: 12 }}>
              <div className="muted">Eksik alanlar</div>
              <ChipRow items={missingFieldLabels} emptyText="Eksik alan görünmüyor." />
              {operationalEvidenceAction ? (
                <div className="finance-v21-evidence-note" style={{ marginTop: 10 }}>
                  <strong>Eksik operasyon kanıtı</strong>
                  <span>{operationalEvidenceAction.description}</span>
                  <div className="finance-v21-card-actions" style={{ marginTop: 8 }}>
                    <button
                      type="button"
                      className="btn sm"
                      data-testid="finance-cost-model-complete-evidence"
                      onClick={() => handleRoomCostNavigate(operationalEvidenceAction)}
                    >
                      {operationalEvidenceAction.actionLabel}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="card" style={{ minWidth: 0 }}>
            <div className="panelSectionTitle">{snapshotTitle}</div>
            <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
              {snapshotRoomName || snapshotCompanyName ? `${snapshotRoomName || "-"} • ${snapshotCompanyName || "-"}` : "Hesaplama özeti adı yok."}
            </div>
            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              <div className="muted">Kaynak: <b>{readableSnapshotSourceLabel}</b></div>
              <div className="muted">Durum: <b>{readableSnapshotStatus}</b></div>
              <div className="muted">Aktif vardiya: <b>{snapshot.activeShiftCount || 0}</b></div>
              <div className="muted">Aktif sözleşme: <b>{snapshot.activeAgreementCount || 0}</b></div>
              <div className="muted">Açık teklif: <b>{snapshot.openOfferCount || 0}</b></div>
              <div className="muted">Karşı teklif: <b>{snapshot.counterOfferCount || 0}</b></div>
              <div className="muted">Canlı önizleme kişi sayısı: <b>{livePassengerLabel}</b></div>
              <div className="muted">Firma rolü: <b>{snapshotCounterLabel}</b></div>
            </div>
          </div>
        </div>
      </details>
        </section>
      ) : null}
      {financeView === "quote-profitability" ? (
        <section className="pre18-finance-quote-evaluate" data-finance-section="quote-profitability" aria-labelledby="room-financial-operations-tab-quote-profitability">
          <div className="card" data-testid="quote-evaluation-flow">
            <div className="panelSectionTitle">1. Açık işi seç</div>
            <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
              Teklif vereceğiniz gerçek talep veya açık teklif burada seçilir. Müşteri, dönem ve rota seçiminizle birlikte korunur.
            </div>
            <RoomFinanceOfferSelector
              options={roomFinanceOfferOptions}
              selectedValue={selectedRoomFinanceOfferValue}
              onChange={handleRoomFinanceOfferSelection}
            />
            {selectedRoomFinanceOffer || selectedServiceShiftId ? (
              <div className="finance-quote-selected-context" data-testid="quote-selected-context" style={{ marginTop: 12 }}>
                <div>
                  <span className="finance-context-label">Seçili iş</span>
                  <strong>
                    {selectedRoomFinanceOffer
                      ? `${Number(selectedRoomFinanceOffer.offerId || 0) > 0 ? `Teklif #${selectedRoomFinanceOffer.offerId}` : `Açık iş #${selectedRoomFinanceOffer.shiftId || selectedRoomFinanceOffer.requestId || "-"}`} · ${selectedRoomFinanceOffer.companyName}`
                      : (selectedServiceAgreement ? serviceContextCustomerLabel(selectedServiceAgreement) : (snapshot.companyName || "Müşteri doğrulanamadı"))}
                  </strong>
                  <small>{selectedServiceShiftText} · {periodLabel}</small>
                </div>
                <div className="panelMeta">{selectedServiceVehicleText} · {selectedServiceDriverText}</div>
              </div>
            ) : null}
            {quoteRequestContext ? (
              <div className="panelMeta" data-testid="quote-request-context" style={{ marginTop: 10 }}>
                <strong>{quoteRequestContext.contractless ? `Talep #${quoteRequestContext.shiftId}` : `Talep #${quoteRequestContext.agreementId}`}</strong> · {quoteRequestContext.customerLabel} · {quoteRequestContext.contractless ? quoteRequestContext.periodLabel : serviceContextDateRange(selectedServiceAgreement?.startDate, selectedServiceAgreement?.endDate)}
                <br />
                {quoteRequestContext.canPreviewCost
                  ? "Talep bağlamı hazır; tahmini maliyet yalnız kanıtlanan planlama bileşenlerinden hesaplanır."
                  : `Teklif hazırlığı için eksik bilgi: ${quoteRequestContext.missing.map((item) => item.label).join(", ") || "bağlam doğrulaması"}.`}
              </div>
            ) : null}
          </div>

          <div className="card" data-testid="quote-evaluation-vehicle-options" style={{ marginTop: 12 }}>
            <div className="panelSectionTitle">2. Uygun araçları ve tahmini maliyeti karşılaştır</div>
            <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
              Araç senaryoları seçili açık işin kapasite, rota ve kanıtlanan planlama verileriyle karşılaştırılır. Gerçekleşmiş gider defteri bu teklif hazırlığına yeniden yazılmaz.
            </div>
            <div className="panelMeta" data-testid="quote-canonical-cost-source-active" style={{ marginTop: 10 }}>
              Maliyet; Giderlerim'e bir kez kaydedilen yetkili gider, araç, sürücü, rota ve hizmet dönemi kayıtlarından otomatik hesaplanır. Dağıtım oranı, aylık pay veya kilometre anahtarı elle girilmez; kanıt yoksa sonuç kesinleştirilmez.
            </div>
            <CostScenarioWorkspacePanel
              scope="ROOM"
              embedded
              focusAgreementId={effectiveRoomCostFocus.agreementId}
              focusShiftId={effectiveRoomCostFocus.shiftId}
              focusOfferId={selectedRoomFinanceOfferId || effectiveRoomCostFocus.focusOfferId || null}
              focusVehicleId={effectiveRoomCostFocus.vehicleId}
              quoteFloor={quoteFloor}
              roomProfitability={roomProfitability}
              commercialOffer={commercialOffer}
              planningCostInputs={form}
              quoteEvaluation
              onOpenMissingCost={openQuoteMissingCostEditor}
              onScenarioSelectionChange={(selection) => setSelectedRoomScenario(normalizeRoomScenarioQuoteBinding(selection))}
            />
            {selectedRoomScenario ? (
              <div className="panelMeta" data-testid="quote-selected-scenario-binding" style={{ marginTop: 10 }}>
                Seçili araç planı · tahmini toplam maliyet <strong>{selectedScenarioQuoteCostMinor != null ? formatTRY(selectedScenarioQuoteCostMinor) : "Belirsiz"}</strong>. Bu seçim canlı gider veya teklif kaydı oluşturmaz.
              </div>
            ) : null}
          </div>

          <div className="card" data-testid="quote-evaluation-price" style={{ marginTop: 12 }}>
            <div className="panelSectionTitle">3. Teklif tutarını belirle</div>
            <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
              Tahmini maliyet ile göndereceğiniz tutar ayrı tutulur. Eksik kanıt varsa sistem tutarı uydurmaz ve sonucu belirsiz bırakır.
            </div>
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "minmax(180px, 260px) auto", gap: 10, alignItems: "end" }}>
              <label className="muted">
                Gönderilecek teklif (₺)
                <input
                  data-testid="quote-scenario-price"
                  inputMode="decimal"
                  placeholder="Örn. 150000"
                  value={formatMinorInput(form.quoteScenarioAmountMinor)}
                  onChange={(event) => setForm((prev) => ({ ...prev, quoteScenarioAmountMinor: parseMajorInput(event.target.value) }))}
                  style={INPUT_STYLE}
                />
              </label>
              <button type="button" className="btn sm" onClick={() => setRefreshTick((n) => n + 1)} disabled={loading}>
                Fiyatı hesapla
              </button>
            </div>
            <div className="panelMeta" data-testid="quote-evaluation-estimate" style={{ marginTop: 10 }}>
              Tahmini maliyet: <strong>{planningCostMinor != null ? formatTRY(planningCostMinor) : "Belirsiz"}</strong> · {planningCostNote}
            </div>
          </div>

          <div className="card" data-testid="quote-evaluation-profit" style={{ marginTop: 12 }}>
            <div className="panelSectionTitle">4. Beklenen kârı kontrol et</div>
            <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10 }}>
              <MetricCard title="Teklif tutarı" value={costedQuoteOfferMinor != null ? formatTRY(costedQuoteOfferMinor) : "Belirsiz"} note="Kullanıcının belirlediği tutar" tone={costedQuoteOfferMinor != null ? roomQuoteRisk.tone : "muted"} />
              <MetricCard title="Tahmini maliyet" value={planningCostMinor != null ? formatTRY(planningCostMinor) : "Belirsiz"} note="Canonical planlama önizlemesi" tone={planningCostMinor != null ? "warm" : "muted"} />
              <MetricCard title="Beklenen kâr" value={expectedProfitMinor != null ? formatTRY(expectedProfitMinor) : "Belirsiz"} note="Planlama göstergesi; kesin net kâr değildir" tone={expectedProfitMinor != null ? roomQuoteRisk.tone : "muted"} />
              <MetricCard title="Beklenen marj" value={expectedMarginBps != null ? formatBps(expectedMarginBps) : "Belirsiz"} note={displayRoomProfitability?.contextBlocked ? "Bağlam uyuşmuyor" : "Planlama oranı"} tone={expectedMarginBps != null ? roomQuoteRisk.tone : "muted"} />
            </div>
            <div className="panelMeta" style={{ marginTop: 10 }}>
              <FinanceRiskBadge risk={roomQuoteRisk} testId="room-quote-risk-status" />
              {effectiveQuoteMissingEvidenceLabels.length ? ` Eksik kanıt: ${effectiveQuoteMissingEvidenceLabels.join(", ")}.` : " Gerçekleşmiş gider ve tahsilat bu önizlemede kesin kâr olarak sunulmaz."}
            </div>
          </div>

          <div className="card finance-risk-card" data-testid="costed-quote-send-card" style={{ marginTop: 12 }}>
            <div className="panelSectionTitle">5. Kontrol et ve açıkça gönder</div>
            <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
              {costedQuoteReady
                ? "Gönderim özeti hazır. Tutarı, seçili işi ve araç senaryosunu kontrol ettikten sonra açık onay verin."
                : "Gönderim için seçili açık iş, uygun araç planı ve en azından mevcut planlama önizlemesi gerekir. Eksik kalemler varsa teklif gönderilebilir; beklenen kâr henüz doğrulanmadı."}
            </div>
            {costedQuoteReady ? (
              <>
                <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 8 }}>
                  <MetricCard title="Müşteri" value={selectedRoomFinanceOffer?.companyName || (selectedServiceAgreement ? serviceContextCustomerLabel(selectedServiceAgreement) : snapshotCompanyName)} note={selectedRoomFinanceOfferId ? `Teklif #${selectedRoomFinanceOfferId}` : "Seçili iş"} />
                  <MetricCard title="Dönem" value={periodLabel} note={selectedServiceShiftText} />
                  <MetricCard title="Gönderilecek" value={formatTRY(costedQuoteOfferMinor)} note="ROOM tarafından belirlendi" tone={roomQuoteRisk.tone} />
                  <MetricCard title="Tahmini maliyet" value={formatTRY(costedQuotePlanningEstimateMinor)} note={costedQuoteUsesSingleRequestEstimate ? "Tek talep tahmini" : "Aynı planlama kapsamı"} tone="warm" />
                </div>
                {costedQuoteUsesSingleRequestEstimate ? (
                  <div className="panelMeta" data-testid="costed-quote-period-not-proven" style={{ marginTop: 10, color: "#f7b267" }}>
                    Hizmet dönemi toplam maliyeti ve kesin kârlılık henüz doğrulanmadı; gönderim yalnız seçili açık talebin mevcut planlama tahminiyle hazırlanır.
                  </div>
                ) : null}
                {effectiveQuoteMissingEvidenceLabels.length ? (
                  <div className="panelMeta" data-testid="costed-quote-missing-evidence" style={{ marginTop: 10, color: "#f7b267" }}>
                    Eksik maliyet kanıtı: {effectiveQuoteMissingEvidenceLabels.join(", ")}. Beklenen kâr henüz doğrulanmadı; bu kalemler teklif tutarına eklenmedi.
                  </div>
                ) : null}
                {!costedQuoteApprovalOpen ? (
                  <button type="button" className="btn primary" data-testid="costed-quote-open-approval" style={{ marginTop: 10 }} onClick={() => setCostedQuoteApprovalOpen(true)} disabled={loading || actionBusy.length > 0}>
                    Gönderim özetini aç
                  </button>
                ) : (
                  <div data-testid="costed-quote-approval" style={{ marginTop: 12, display: "grid", gap: 8 }}>
                    <div className="panelMeta">Teklif tutarı, seçili iş ve maliyet özeti kontrol edildi. Göndermek için aşağıya <b>ONAYLA</b> yazın.</div>
                    <input
                      aria-label="Teklif gönderim onayı"
                      data-testid="costed-quote-confirmation"
                      inputMode="text"
                      autoComplete="off"
                      placeholder="ONAYLA"
                      value={costedQuoteApprovalToken}
                      onChange={(event) => setCostedQuoteApprovalToken(event.target.value)}
                      style={INPUT_STYLE}
                    />
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      <button type="button" className="btn primary" data-testid="costed-quote-send" onClick={handleCostedQuoteSend} disabled={loading || actionBusy.length > 0 || String(costedQuoteApprovalToken || "").trim().toUpperCase() !== "ONAYLA"}>
                        {actionBusy === "send-costed-quote" ? "Sunuluyor..." : "Teklifi açıkça sun"}
                      </button>
                      <button type="button" className="btn sm" onClick={() => { setCostedQuoteApprovalOpen(false); setCostedQuoteApprovalToken(""); }} disabled={actionBusy.length > 0}>
                        Vazgeç
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="panelMeta" data-testid="costed-quote-send-blocked" style={{ marginTop: 10, color: "#f7b267" }}>
                {effectiveQuoteMissingEvidenceLabels.length ? `Eksik kanıt: ${effectiveQuoteMissingEvidenceLabels.join(", ")}.` : "Önce bir açık iş ve uygun araç senaryosu seçin."}
              </div>
            )}
          </div>
        </section>
      ) : null}
      </div>
    </PanelChrome>
  );
}

function RoomFinancialOperationsSurface() {
  return <FinancialOperationsDetailPanel scope="ROOM" overviewSummary />;
}

export default function FinancialOperationsPanel({ scope = "ROOM" }) {
  if (scope === "ROOM") return <RoomFinancialOperationsSurface />;
  return <FinancialOperationsDetailPanel scope={scope} />;
}
