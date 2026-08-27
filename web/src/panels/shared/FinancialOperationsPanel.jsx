import { useEffect, useMemo, useState } from "react";
import { useSession } from "../../state/session";
import PanelChrome from "../../components/PanelChrome";
import { getApiErrorInfo } from "../../utils/apiContract";
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
  applyRoomQuoteFloorDraft,
  archiveRoomQuoteFloorDraft,
  submitCompanyBudgetPlan,
  updateRoomQuoteFloorDraft,
  updateCompanyBudgetPlan,
} from "../../api";
import FinancialOperationsCompanyPreview from "./FinancialOperationsCompanyPreview";
import {
  baselineSourceLabel,
  confidenceLabel,
  confidenceTone,
  financeFieldLabels,
  lifecycleStateLabel,
  normalizeFinanceVisibleText,
  preferredScopeSubtitle,
  preferredScopeTitle,
  modelStatusLabel,
  modelStatusTone,
  previewStatusLabel,
  previewStatusTone,
} from "./financialOperationsPresentation";
import ExternalReferenceCard from "./ExternalReferenceCard";

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

function formatTRY(value) {
  if (value === null || value === undefined || String(value).trim() === "") return "-";
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  return `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(n)} ₺`;
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

function MetricCard({ title, value, note, tone = "default" }) {
  const palette = {
    default: { border: "1px solid rgba(255,255,255,0.08)", title: "#98a2b3", value: "#f8fafc" },
    warm: { border: "1px solid rgba(247,144,9,0.35)", title: "#f7b267", value: "#ffd38a" },
    good: { border: "1px solid rgba(18,183,106,0.35)", title: "#6ce9a6", value: "#d1fadf" },
    danger: { border: "1px solid rgba(240,68,56,0.35)", title: "#fda29b", value: "#fecaca" },
  }[tone] || {
    border: "1px solid rgba(255,255,255,0.08)",
    title: "#98a2b3",
    value: "#f8fafc",
  };

  return (
    <div style={{ padding: 14, border: palette.border, borderRadius: 12, minWidth: 0 }}>
      <div className="panelSectionTitle" style={{ marginBottom: 8, color: palette.title }}>{title}</div>
      <div className="panelStatValue" style={{ color: palette.value }}>{value}</div>
      {note ? <div className="panelMeta" style={{ marginTop: 8, lineHeight: 1.45 }}>{note}</div> : null}
    </div>
  );
}

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

function scopeMeta(scope) {
  if (scope === "ROOM") {
    return {
      title: preferredScopeTitle("ROOM"),
      subtitle: preferredScopeSubtitle("ROOM"),
      currentLabel: "Planlanan teklif",
      baselineLabel: "Tahmini maliyet",
      resultLabel: "Önerilen minimum teklif",
      amountLabel: "Teklif sinyali",
      amountGapLabel: "Tahmini kâr / zarar",
      endpointLabel: "Taşımacılık Firması önizlemesi",
    };
  }
  return {
    title: preferredScopeTitle("COMPANY"),
    subtitle: preferredScopeSubtitle("COMPANY"),
    currentLabel: "Mevcut bütçe planı",
    baselineLabel: "Servis maliyeti",
    resultLabel: "Bütçe farkı",
    amountLabel: "Bütçe sinyali",
    amountGapLabel: "Bütçe farkı",
    endpointLabel: "Hizmet Alan Firma önizlemesi",
  };
}

function initialForm() {
  return {
    manualBaselineOperationalCostMinor: "",
    targetContributionBps: "",
    riskReserveBps: "",
    serviceDistanceKm: "",
    routeDurationMinutes: "",
    passengerCount: "",
    vehicleCapacity: "",
    shiftCount: "",
    serviceDayCount: "",
    fuelConsumptionLitersPer100Km: "",
    fuelUnitPriceMinor: "",
    driverBasePerShiftMinor: "",
    maintenancePerKmMinor: "",
    vehicleLeaseMonthlyMinor: "",
    budgetPlanId: "",
    budgetPlanVersion: "",
    budgetAmountMinor: "",
    periodStart: "",
    periodEnd: "",
    budgetSource: "",
    budgetApprovalState: "draft",
    description: "",
    warningThresholdBps: "",
    currencyCode: "TRY",
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
    currencyCode: String(form?.currencyCode ?? "").trim() || "TRY",
  };
}

function roomDraftFormFromDraft(draft = null) {
  if (!draft) return {};
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

function roomDraftPayloadFromForm(form = {}) {
  return {
    manualBaselineOperationalCostMinor: String(form?.manualBaselineOperationalCostMinor ?? "").trim(),
    targetContributionBps: String(form?.targetContributionBps ?? "").trim(),
    riskReserveBps: String(form?.riskReserveBps ?? "").trim(),
    quoteFloorMinor: String(form?.quoteFloorMinor ?? "").trim(),
    quoteFloorPerPassengerMinor: String(form?.quoteFloorPerPassengerMinor ?? "").trim(),
    baselineSource: String(form?.baselineSource ?? "").trim(),
    calculationVersion: String(form?.calculationVersion ?? "").trim() || "ROOM-PROFITABILITY-AND-QUOTE-FLOOR-01",
    currencyCode: String(form?.currencyCode ?? "").trim() || "TRY",
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
  return !(kind === "SCHOOL" || kind === "ORGANIZATION");
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

export default function FinancialOperationsPanel({ scope = "ROOM" }) {
  const { token, me } = useSession();
  const meta = useMemo(() => scopeMeta(scope), [scope]);
  const canView = useMemo(() => allowedForScope(scope, me), [scope, me]);
  const [form, setForm] = useState(() => initialForm());
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState("");
  const [actionErr, setActionErr] = useState("");
  const [actionOk, setActionOk] = useState("");
  const [err, setErr] = useState("");
  const [refreshTick, setRefreshTick] = useState(0);
  const [roomDetailsOpen, setRoomDetailsOpen] = useState(false);

  useEffect(() => {
    setForm(initialForm());
    setPreview(null);
    setErr("");
    setActionBusy("");
    setActionErr("");
    setActionOk("");
    setRefreshTick(0);
    setRoomDetailsOpen(false);
  }, [scope]);

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
    if (!currentDraft) return;
    setForm((prev) => {
      if (!roomDraftFormIsBlank(prev)) {
        return prev;
      }
      return {
        ...prev,
        ...roomDraftFormFromDraft(currentDraft),
      };
    });
  }, [preview, scope]);

  useEffect(() => {
    if (!token || !canView) return undefined;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      setErr("");
      try {
        const params = cleanParams(form);
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
        if (!controller.signal.aborted) setPreview(mergedPayload || null);
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
  }, [canView, form, refreshTick, scope, token]);

  const snapshot = preview?.snapshot || {};
  const model = preview?.operationalCostModel || {};
  const quoteFloor = preview?.quoteFloor || {};
  const roomProfitability = preview?.roomProfitability || null;
  const missingFields = Array.from(new Set([...(model?.missingFields || []), ...(quoteFloor?.missingFields || [])]));
  const missingFieldLabels = financeFieldLabels(missingFields);
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
        setActionOk(`Bütçe planı #${result.item.id} ${lifecycleStateLabel(result.item.status || "-")} durumuna alındı.`);
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

  async function handleRoomQuoteFloorAction(action, { createNew = false } = {}) {
    if (scope !== "ROOM") return;
    setActionErr("");
    setActionOk("");

    try {
      setActionBusy(action);
      const payload = roomDraftPayloadFromForm(form);
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
        setActionOk(`Taslak #${result.item.id} ${lifecycleStateLabel(result.item.status || "-")} durumuna alındı.`);
      }

      setRefreshTick((n) => n + 1);
    } catch (e) {
      const info = getApiErrorInfo(e, "Teklif tabanı yaşam döngüsü işlemi tamamlanamadı.");
      setActionErr(info.message || "Teklif tabanı yaşam döngüsü işlemi tamamlanamadı.");
    } finally {
      setActionBusy("");
    }
  }

  if (!canView) {
    return (
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
    );
  }

  if (scope === "COMPANY") {
    return (
      <FinancialOperationsCompanyPreview
        meta={meta}
        me={me}
        preview={preview}
        loading={loading}
        err={err}
        setRefreshTick={setRefreshTick}
        form={form}
        setForm={setForm}
        onBudgetAction={handleCompanyBudgetAction}
        budgetActionBusy={actionBusy}
        budgetActionErr={actionErr}
        budgetActionOk={actionOk}
        externalReferenceCard={(
          <ExternalReferenceCard
            token={token}
            canView={canView}
            refreshTick={refreshTick}
          />
        )}
        normalizeText={normalizeText}
        MetricCard={MetricCard}
        ChipRow={ChipRow}
        formatBps={formatBps}
        INPUT_STYLE={INPUT_STYLE}
      />
    );
  }

  const scopeTitle = meta.title;
  const currentAmountMinor = scope === "ROOM"
    ? Number(snapshot.currentRoomOfferMinor || snapshot.currentCommercialAmountMinor || 0) || null
    : Number(snapshot.currentCommercialAmountMinor || snapshot.currentCompanyOfferMinor || 0) || null;
  const baselineMinor = Number(quoteFloor?.baselineOperationalCostMinor || preview?.baselineOperationalCostMinor || 0) || null;
  const currentGapMinor = currentAmountMinor != null && baselineMinor != null
    ? (preview?.roomProfitability?.profitMinor ?? preview?.companyBudget?.budgetGapMinor ?? null)
    : null;
  const quoteFloorGapMinor = Number.isFinite(Number(quoteFloor?.marginGapMinor)) ? Number(quoteFloor.marginGapMinor) : null;
  const quoteFloorComputed = Boolean(quoteFloor?.computed);
  const currentRoomQuoteFloorDraftStatus = String(currentRoomQuoteFloorDraft?.status || "").toUpperCase();
  const roomDraftEditable = !currentRoomQuoteFloorDraft?.id || currentRoomQuoteFloorDraftStatus === "DRAFT";
  const roomDraftCanApply = roomDraftEditable;
  const roomDraftCanArchive = Boolean(currentRoomQuoteFloorDraft?.id) && currentRoomQuoteFloorDraftStatus !== "ARCHIVED";
  const previewStatusValue = previewStatusLabel(preview?.status || preview?.modelStatus || "");
  const previewStatusToneValue = previewStatusTone(preview?.status || preview?.modelStatus || "");
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
  const quoteFloorStateLabel = quoteFloorComputed ? "Teklif tabanı hazır" : "Teklif tabanı bekliyor";
  const quoteFloorStateTone = quoteFloorComputed ? "good" : "warm";
  const currentRoomDraftLabel = lifecycleStateLabel(currentRoomQuoteFloorDraft?.status || "DRAFT");
  const baselineSourceHuman = baselineSourceLabel(quoteFloor?.baselineSource || currentRoomQuoteFloorDraft?.baselineSource || form.baselineSource);
  const periodLabel = visibleText(
    preview?.period?.periodLabel
      || preview?.periodLabel
      || currentRoomQuoteFloorDraft?.periodLabel
      || form.periodLabel
      || "-",
  );
  const roomSummaryText = visibleText(roomProfitability?.summaryText || "Taşımacılık Firması kârlılığı önizlemesi için veri bekleniyor.");
  const decisionSummary = visibleText(preview?.summaryText || "Sadece önizleme. Yazma aksiyonu yok.");
  const snapshotTitle = "Hesaplama özeti";
  const surfaceIntro = "Maliyet ve teklif kararınızı güvenle değerlendirin.";
  const snapshotSourceLabel = visibleText(snapshot.sourceLabel || "-");
  const snapshotRoomName = visibleText(snapshot.roomName || "-");
  const snapshotCompanyName = visibleText(snapshot.companyName || "-");
  const snapshotCurrentAmountLabel = visibleText(snapshot.currentCommercialAmountLabel || snapshot.currentCommercialCounterLabel || "Mevcut teklif");
  const snapshotCounterLabel = visibleText(snapshot.currentCommercialAmountCounterLabel || snapshot.currentCommercialCounterLabel || "-");
  const modelSummaryText = visibleText(model?.summaryText || "Maliyet modeli henüz hesaplanmadı.");
  const modelConfidenceReason = visibleText(model?.confidence?.reason || "-");
  const roomDataGuidance = quoteFloorComputed
    ? roomSummaryText.replace(/;?\s*bu alan salt okunur önizleme olarak kalır\.?/i, ".")
    : "Kârlılık hesabı için bazı maliyet bilgileri eksik. Eksik bilgileri tamamladığınızda tahmini kârınızı gösterebiliriz.";
  const roomPrimaryAction = currentRoomQuoteFloorDraft?.id && roomDraftCanApply
    ? { label: "Taslağı uygula", action: "apply" }
    : currentRoomQuoteFloorDraft?.id
      ? { label: "Teklif detaylarını aç", action: "open" }
      : { label: "Taslak oluştur", action: "open" };

  function handleRoomPrimaryAction() {
    setRoomDetailsOpen(true);
    if (roomPrimaryAction.action !== "open") {
      handleRoomQuoteFloorAction(roomPrimaryAction.action);
    }
  }

  return (
    <PanelChrome
      title={scopeTitle}
      subtitle={meta.subtitle}
      actions={(
        <button type="button" className="btn sm" onClick={() => setRefreshTick((n) => n + 1)} disabled={loading}>
          {loading ? "Yenileniyor..." : "Yenile"}
        </button>
      )}
    >
      <div className="muted" style={{ lineHeight: 1.45 }}>{surfaceIntro}</div>

      <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span className="pill" data-status={previewStatusToneValue.toUpperCase()}>{previewStatusValue || "Durum bekleniyor"}</span>
        <span className="pill" data-status={confidenceToneValue.toUpperCase()}>{confidenceValue || "Bilinmiyor"}</span>
        <span className="pill" data-status={quoteFloorStateTone.toUpperCase()}>{quoteFloorStateLabel}</span>
      </div>

      {err ? (
        <div className="card" style={{ marginTop: 12, border: "1px solid rgba(240,68,56,0.25)" }}>
          {err}
        </div>
      ) : null}

      <div className="card" style={{ marginTop: 12, border: "1px solid rgba(247,144,9,0.3)", background: "rgba(247,144,9,0.05)" }}>
        <div className="panelSectionTitle">Şimdi ne yapmalıyım?</div>
        <div className="muted" style={{ marginTop: 8, lineHeight: 1.5 }}>{roomDataGuidance}</div>
        <button type="button" className="btn primary" style={{ marginTop: 14 }} onClick={handleRoomPrimaryAction} disabled={loading || actionBusy.length > 0}>
          {roomPrimaryAction.label}
        </button>
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <MetricCard title={meta.currentLabel} value={formatTRY(currentAmountMinor)} note={snapshotCurrentAmountLabel} tone={currentAmountMinor != null ? "good" : "default"} />
        <MetricCard title={meta.baselineLabel} value={formatTRY(baselineMinor)} note={baselineSourceHuman} tone={quoteFloorComputed ? "good" : "warm"} />
        <MetricCard title={meta.resultLabel} value={formatTRY(quoteFloor?.quoteFloorMinor)} note={quoteFloorComputed ? `Kişi başı ${formatTRY(quoteFloor?.quoteFloorPerPassengerMinor)}` : "Maliyet bilgileri bekleniyor"} tone={quoteFloorComputed ? "good" : "warm"} />
        <MetricCard title={meta.amountGapLabel} value={formatTRY(currentGapMinor)} note="Planlanan teklif - tahmini maliyet" tone={currentGapMinor != null && Number(currentGapMinor) >= 0 ? "good" : "warm"} />
        <MetricCard title="Veri güveni" value={confidenceValue || "Bilinmiyor"} note={modelStatusValue || "Model durumu"} tone={confidenceMetricTone} />
      </div>

      <ExternalReferenceCard
        token={token}
        canView={canView}
        refreshTick={refreshTick}
      />

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
        <details className="card" style={{ minWidth: 0 }} open={roomDetailsOpen} onToggle={(event) => setRoomDetailsOpen(event.currentTarget.open)}>
          <summary className="panelSectionTitle" style={{ cursor: "pointer" }}>Teklif detayları</summary>
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
              note={currentRoomQuoteFloorDraft?.id ? `Taslak #${currentRoomQuoteFloorDraft.id}` : "Yeni taslak"}
              tone={currentRoomQuoteFloorDraftStatus === "APPLIED" ? "good" : currentRoomQuoteFloorDraftStatus === "ARCHIVED" ? "danger" : "warm"}
            />
            <MetricCard
              title="Sürüm"
              value={formatTextOrDash(currentRoomQuoteFloorDraft?.version ?? form.roomQuoteFloorDraftVersion)}
              note={currentRoomQuoteFloorDraft?.id ? `Taslak #${currentRoomQuoteFloorDraft.id}` : "Yeni taslak"}
            />
            <MetricCard
              title="Taban"
              value={formatTRY(currentRoomQuoteFloorDraft?.manualBaselineOperationalCostMinor ?? form.manualBaselineOperationalCostMinor)}
              note={baselineSourceHuman}
            />
            <MetricCard
              title="Teklif tabanı"
              value={formatTRY(currentRoomQuoteFloorDraft?.quoteFloorMinor ?? form.quoteFloorMinor)}
              note={currentRoomQuoteFloorDraft?.quoteFloorPerPassengerMinor != null ? `Kişi başı ${formatTRY(currentRoomQuoteFloorDraft.quoteFloorPerPassengerMinor)}` : "Hesap bekliyor"}
            />
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

          <details style={{ marginTop: 12 }}>
            <summary className="muted" style={{ cursor: "pointer" }}>Maliyet girdileri</summary>
            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              <div className="panelMeta">Otomatik hesaplanan değerler üstteki hesaplama özetinde gösterilir. Aşağıdaki alanlar yalnızca gerektiğinde manuel düzeltme içindir.</div>
              <label className="muted">
                Manuel maliyet tabanı (₺)
                <input
                  inputMode="numeric"
                  placeholder="örn. 125000"
                  value={form.manualBaselineOperationalCostMinor}
                  onChange={(e) => setForm((prev) => ({ ...prev, manualBaselineOperationalCostMinor: e.target.value }))}
                  style={INPUT_STYLE}
                />
              </label>
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
              <label className="muted">
                Servis mesafesi (km)
                <input
                  inputMode="decimal"
                  placeholder="otomatik hesaplama özeti kullanılır"
                  value={form.serviceDistanceKm}
                  onChange={(e) => setForm((prev) => ({ ...prev, serviceDistanceKm: e.target.value }))}
                  style={INPUT_STYLE}
                />
              </label>
              <label className="muted">
                Rota süresi (dk)
                <input
                  inputMode="decimal"
                  placeholder="otomatik hesaplama özeti kullanılır"
                  value={form.routeDurationMinutes}
                  onChange={(e) => setForm((prev) => ({ ...prev, routeDurationMinutes: e.target.value }))}
                  style={INPUT_STYLE}
                />
              </label>
              <label className="muted">
                Yolcu sayısı
                <input
                  inputMode="numeric"
                  placeholder="otomatik hesaplama özeti kullanılır"
                  value={form.passengerCount}
                  onChange={(e) => setForm((prev) => ({ ...prev, passengerCount: e.target.value }))}
                  style={INPUT_STYLE}
                />
              </label>
              <label className="muted">
                Araç kapasitesi
                <input
                  inputMode="numeric"
                  placeholder="otomatik hesaplama özeti kullanılır"
                  value={form.vehicleCapacity}
                  onChange={(e) => setForm((prev) => ({ ...prev, vehicleCapacity: e.target.value }))}
                  style={INPUT_STYLE}
                />
              </label>
              <label className="muted">
                Yakıt tüketimi (L/100km)
                <input
                  inputMode="decimal"
                  placeholder="örn. 5.5"
                  value={form.fuelConsumptionLitersPer100Km}
                  onChange={(e) => setForm((prev) => ({ ...prev, fuelConsumptionLitersPer100Km: e.target.value }))}
                  style={INPUT_STYLE}
                />
              </label>
              <label className="muted">
                Yakıt birim fiyatı (₺/L)
                <input
                  inputMode="numeric"
                  placeholder="örn. 5000"
                  value={form.fuelUnitPriceMinor}
                  onChange={(e) => setForm((prev) => ({ ...prev, fuelUnitPriceMinor: e.target.value }))}
                  style={INPUT_STYLE}
                />
              </label>
              <label className="muted">
                Sürücü temel maliyeti (₺/vardiya)
                <input
                  inputMode="numeric"
                  placeholder="örn. 1200"
                  value={form.driverBasePerShiftMinor}
                  onChange={(e) => setForm((prev) => ({ ...prev, driverBasePerShiftMinor: e.target.value }))}
                  style={INPUT_STYLE}
                />
              </label>
              <label className="muted">
                Km başı bakım maliyeti (₺/km)
                <input
                  inputMode="numeric"
                  placeholder="örn. 15"
                  value={form.maintenancePerKmMinor}
                  onChange={(e) => setForm((prev) => ({ ...prev, maintenancePerKmMinor: e.target.value }))}
                  style={INPUT_STYLE}
                />
              </label>
              <label className="muted">
                Aylık araç kira maliyeti (₺/ay)
                <input
                  inputMode="numeric"
                  placeholder="örn. 25000"
                  value={form.vehicleLeaseMonthlyMinor}
                  onChange={(e) => setForm((prev) => ({ ...prev, vehicleLeaseMonthlyMinor: e.target.value }))}
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
              <div className="muted">Fark: <b>{formatTRY(quoteFloorGapMinor)}</b></div>
            </div>
            <div className="card" style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
              <MetricCard title={meta.currentLabel} value={formatTRY(currentAmountMinor)} note={snapshotCounterLabel} tone={currentAmountMinor != null ? "good" : "default"} />
              <MetricCard title={meta.amountGapLabel} value={formatTRY(currentGapMinor)} note="Planlanan teklif - tahmini maliyet" tone={currentGapMinor != null && Number(currentGapMinor) >= 0 ? "good" : "warm"} />
              <MetricCard title={meta.resultLabel} value={formatTRY(quoteFloor?.quoteFloorMinor)} note={quoteFloorComputed ? `Kişi başı ${formatTRY(quoteFloor?.quoteFloorPerPassengerMinor)}` : "Maliyet bilgileri bekleniyor"} tone={quoteFloorComputed ? "good" : "warm"} />
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
            </div>
          </div>

          <div className="card" style={{ minWidth: 0 }}>
            <div className="panelSectionTitle">{snapshotTitle}</div>
            <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
              {snapshotRoomName || snapshotCompanyName ? `${snapshotRoomName || "-"} • ${snapshotCompanyName || "-"}` : "Hesaplama özeti adı yok."}
            </div>
            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              <div className="muted">Kaynak: <b>{snapshotSourceLabel}</b></div>
              <div className="muted">Durum: <b>{lifecycleStateLabel(snapshot.shiftStatus || "-")}</b></div>
              <div className="muted">Aktif vardiya: <b>{snapshot.activeShiftCount || 0}</b></div>
              <div className="muted">Aktif sözleşme: <b>{snapshot.activeAgreementCount || 0}</b></div>
              <div className="muted">Açık teklif: <b>{snapshot.openOfferCount || 0}</b></div>
              <div className="muted">Karşı teklif: <b>{snapshot.counterOfferCount || 0}</b></div>
              <div className="muted">Firma rolü: <b>{snapshotCounterLabel}</b></div>
            </div>
          </div>
        </div>
      </details>
    </PanelChrome>
  );
}
