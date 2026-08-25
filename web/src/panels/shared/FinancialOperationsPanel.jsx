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
  getCompanyFinancialOperationsPreview,
  getRoomFinancialOperationsPreview,
  applyRoomQuoteFloorDraft,
  archiveRoomQuoteFloorDraft,
  submitCompanyBudgetPlan,
  updateRoomQuoteFloorDraft,
  updateCompanyBudgetPlan,
} from "../../api";
import FinancialOperationsCompanyPreview from "./FinancialOperationsCompanyPreview";

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

function formatKm(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  if (n <= 0) return "-";
  return n >= 10 ? `${Math.round(n)} km` : `${n.toFixed(2)} km`;
}

function formatMinutes(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "-";
  if (n <= 0) return "-";
  return `${Math.round(n)} dk`;
}

function formatTextOrDash(value) {
  const text = String(value ?? "").trim();
  return text || "-";
}

function MetricCard({ title, value, note, tone = "default" }) {
  const palette = {
    default: { border: "1px solid rgba(255,255,255,0.08)", title: "#98a2b3", value: "#f8fafc" },
    warm: { border: "1px solid rgba(247,144,9,0.35)", title: "#f7b267", value: "#ffd38a" },
    good: { border: "1px solid rgba(18,183,106,0.35)", title: "#6ce9a6", value: "#d1fadf" },
    danger: { border: "1px solid rgba(240,68,56,0.35)", title: "#fda29b", value: "#fecaca" },
  }[tone] || null;

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
      title: "Finansal Operasyonlar",
      subtitle: "Oda kârlılığı ve quote floor draft yaşam döngüsü.",
      currentLabel: "Mevcut oda teklifi",
      baselineLabel: "Maliyet tabanı",
      resultLabel: "Quote floor",
      amountLabel: "Oda teklif sinyali",
      amountGapLabel: "Oda farkı",
      endpointLabel: "Room preview",
    };
  }
  return {
    title: "Bütçe ve Servis Maliyeti",
    subtitle: "Şirket bütçe planı yaşam döngüsü ve servis maliyeti önizlemesi.",
    currentLabel: "Mevcut bütçe planı",
    baselineLabel: "Servis maliyeti",
    resultLabel: "Bütçe farkı",
    amountLabel: "Bütçe sinyali",
    amountGapLabel: "Bütçe farkı",
    endpointLabel: "Company preview",
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
    return "Bu alt kimlik için finansal operasyon yüzeyi kapalıdır. Bu alan read-only/preview olarak kalır.";
  }
  return scope === "ROOM"
    ? "Bu rol için oda finansal operasyon yüzeyi görünmez. Bu alan read-only/preview olarak kalır."
    : "Bu rol için şirket finansal operasyon yüzeyi görünmez. Bu alan read-only/preview olarak kalır.";
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

  useEffect(() => {
    setForm(initialForm());
    setPreview(null);
    setErr("");
    setActionBusy("");
    setActionErr("");
    setActionOk("");
    setRefreshTick(0);
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
        const payload = scope === "ROOM"
          ? await getRoomFinancialOperationsPreview(token, params, { signal: controller.signal })
          : await getCompanyFinancialOperationsPreview(token, params, { signal: controller.signal });
        if (!controller.signal.aborted) setPreview(payload || null);
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
  const companyBudget = preview?.companyBudget || null;
  const missingFields = Array.from(new Set([...(model?.missingFields || []), ...(quoteFloor?.missingFields || [])]));
  const surfaceNote = scope === "COMPANY"
    ? "Bu yüzey budget lifecycle ve explainable preview sunar; payment, invoice ve accounting kapalıdır."
    : "Bu yüzey quote floor draft lifecycle sunar; dispatch apply, payment, invoice ve accounting kapalıdır.";
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
        setActionOk(`Plan #${result.item.id} ${String(result.item.status || "-").toUpperCase()} durumuna alındı.`);
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
        setActionOk(`Draft #${result.item.id} ${String(result.item.status || "-").toUpperCase()} durumuna alındı.`);
      }

      setRefreshTick((n) => n + 1);
    } catch (e) {
      const info = getApiErrorInfo(e, "Quote floor yaşam döngüsü işlemi tamamlanamadı.");
      setActionErr(info.message || "Quote floor yaşam döngüsü işlemi tamamlanamadı.");
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
    ? Number(snapshot.currentRoomOfferMinor || 0) || null
    : Number(snapshot.currentCommercialAmountMinor || snapshot.currentCompanyOfferMinor || 0) || null;
  const baselineMinor = Number(quoteFloor?.baselineOperationalCostMinor || preview?.baselineOperationalCostMinor || 0) || null;
  const currentGapMinor = preview?.roomProfitability?.profitMinor ?? preview?.companyBudget?.budgetGapMinor ?? null;
  const quoteFloorGapMinor = Number.isFinite(Number(quoteFloor?.marginGapMinor)) ? Number(quoteFloor.marginGapMinor) : null;
  const quoteFloorComputed = Boolean(quoteFloor?.computed);
  const modelStatusTone = String(model?.status || "").toLowerCase() === "complete"
    ? "good"
    : String(model?.status || "").toLowerCase() === "blocked"
      ? "danger"
      : "warm";
  const currentRoomQuoteFloorDraftStatus = String(currentRoomQuoteFloorDraft?.status || "").toUpperCase();
  const roomDraftEditable = !currentRoomQuoteFloorDraft?.id || currentRoomQuoteFloorDraftStatus === "DRAFT";
  const roomDraftCanApply = roomDraftEditable;
  const roomDraftCanArchive = Boolean(currentRoomQuoteFloorDraft?.id) && currentRoomQuoteFloorDraftStatus !== "ARCHIVED";

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
      <div className="muted" style={{ lineHeight: 1.45 }}>{surfaceNote}</div>

      <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span className="pill" data-status="OK">{normalizeText(me?.role) || "-"}</span>
        {normalizeText(me?.companyKind) ? <span className="pill">{normalizeText(me?.companyKind)}</span> : null}
        <span className="pill" data-status={modelStatusTone.toUpperCase()}>{String(model?.status || "unknown").toUpperCase()}</span>
        <span className="pill" data-status={quoteFloorComputed ? "OK" : "WARN"}>{quoteFloorComputed ? "Quote floor hazır" : "Quote floor bekliyor"}</span>
      </div>

      {err ? (
        <div className="card" style={{ marginTop: 12, border: "1px solid rgba(240,68,56,0.25)" }}>
          {err}
        </div>
      ) : null}

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
        <MetricCard title="Kaynak" value={snapshot.sourceLabel || "-"} note={snapshot.roomName || snapshot.companyName || "-"} />
        <MetricCard title="Mesafe" value={formatKm(snapshot.routeDistanceKm)} note="Rota snapshot mesafesi" />
        <MetricCard title="Süre" value={formatMinutes(snapshot.routeDurationMin)} note="Rota snapshot süresi" />
        <MetricCard title="Yolcu" value={Number(snapshot.passengerCount || 0)} note="Snapshot yolcu / pax" />
        <MetricCard title="Kapasite" value={Number(snapshot.vehicleCapacity || 0) || "-"} note="Araç kapasitesi" />
        <MetricCard title={meta.currentLabel} value={formatTRY(currentAmountMinor)} note={snapshot.currentCommercialAmountLabel || "-"} />
        <MetricCard title={meta.baselineLabel} value={formatTRY(baselineMinor)} note={quoteFloor?.baselineSource || model?.status || "-"} tone={quoteFloorComputed ? "good" : "warm"} />
        <MetricCard title={meta.resultLabel} value={formatTRY(quoteFloor?.quoteFloorMinor)} note={quoteFloorComputed ? `Kişi başı ${formatTRY(quoteFloor?.quoteFloorPerPassengerMinor)}` : "Açık parametre bekleniyor"} tone={quoteFloorComputed ? "good" : "warm"} />
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        <div className="card" style={{ minWidth: 0 }}>
          <div className="panelSectionTitle">Quote floor yaşam döngüsü</div>
          <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
            {currentRoomQuoteFloorDraft
              ? "Sunucuda hesaplanan quote floor taslağı sürüm ile korunur."
              : "Henüz kayıtlı quote floor taslağı yok; yeni bir draft oluşturabilirsin."}
          </div>
          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            <MetricCard title="Durum" value={String(currentRoomQuoteFloorDraft?.status || "DRAFT").toUpperCase()} note={currentRoomQuoteFloorDraft?.lifecycleState || "draft"} tone={currentRoomQuoteFloorDraft?.status === "APPLIED" ? "good" : currentRoomQuoteFloorDraft?.status === "ARCHIVED" ? "danger" : "warm"} />
            <MetricCard title="Sürüm" value={formatTextOrDash(currentRoomQuoteFloorDraft?.version ?? form.roomQuoteFloorDraftVersion)} note={currentRoomQuoteFloorDraft?.id ? `Draft #${currentRoomQuoteFloorDraft.id}` : "Yeni draft"} />
            <MetricCard title="Taban" value={formatTRY(currentRoomQuoteFloorDraft?.manualBaselineOperationalCostMinor ?? form.manualBaselineOperationalCostMinor)} note={currentRoomQuoteFloorDraft?.baselineSource || "manual"} />
            <MetricCard title="Quote floor" value={formatTRY(currentRoomQuoteFloorDraft?.quoteFloorMinor ?? form.quoteFloorMinor)} note={currentRoomQuoteFloorDraft?.quoteFloorPerPassengerMinor != null ? `Kişi başı ${formatTRY(currentRoomQuoteFloorDraft.quoteFloorPerPassengerMinor)}` : "Hesap bekliyor"} />
          </div>
          <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button type="button" className="btn sm" onClick={() => handleRoomQuoteFloorAction("save")} disabled={loading || actionBusy.length > 0 || (currentRoomQuoteFloorDraft?.id && !roomDraftEditable)}>
              {actionBusy === "save" ? "Kaydediliyor..." : "Taslak kaydet"}
            </button>
            <button type="button" className="btn sm" onClick={() => handleRoomQuoteFloorAction("apply")} disabled={loading || !currentRoomQuoteFloorDraft?.id || !roomDraftCanApply || actionBusy.length > 0}>
              {actionBusy === "apply" ? "Uygulanıyor..." : "Uygula"}
            </button>
            <button type="button" className="btn sm" onClick={() => handleRoomQuoteFloorAction("archive")} disabled={loading || !currentRoomQuoteFloorDraft?.id || !roomDraftCanArchive || actionBusy.length > 0}>
              {actionBusy === "archive" ? "Arşivleniyor..." : "Arşivle"}
            </button>
            <button type="button" className="btn sm" onClick={() => handleRoomQuoteFloorAction("save", { createNew: true })} disabled={loading || actionBusy.length > 0}>
              Yeni taslak
            </button>
          </div>

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
        </div>

        <div className="card" style={{ minWidth: 0 }}>
          <div className="panelSectionTitle">Açık parametreler</div>
          <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
            Quote floor ve maliyet önizlemesi açıkça girilen parametrelerle çalışır. Gizli varsayılan kullanılmaz.
          </div>
          <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
            <label className="muted">
              Manuel maliyet tabanı
              <input
                inputMode="numeric"
                placeholder="örn. 125000"
                value={form.manualBaselineOperationalCostMinor}
                onChange={(e) => setForm((prev) => ({ ...prev, manualBaselineOperationalCostMinor: e.target.value }))}
                style={INPUT_STYLE}
              />
            </label>
            <label className="muted">
              Hedef katkı bps
              <input
                inputMode="numeric"
                placeholder="örn. 1200"
                value={form.targetContributionBps}
                onChange={(e) => setForm((prev) => ({ ...prev, targetContributionBps: e.target.value }))}
                style={INPUT_STYLE}
              />
            </label>
            <label className="muted">
              Risk rezervi bps
              <input
                inputMode="numeric"
                placeholder="örn. 300"
                value={form.riskReserveBps}
                onChange={(e) => setForm((prev) => ({ ...prev, riskReserveBps: e.target.value }))}
                style={INPUT_STYLE}
              />
            </label>
          </div>

          <details style={{ marginTop: 12 }}>
            <summary className="muted" style={{ cursor: "pointer" }}>Gelişmiş maliyet girdileri</summary>
            <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
              <label className="muted">
                Servis mesafesi (km)
                <input
                  inputMode="decimal"
                  placeholder="otomatik snapshot kullanılır"
                  value={form.serviceDistanceKm}
                  onChange={(e) => setForm((prev) => ({ ...prev, serviceDistanceKm: e.target.value }))}
                  style={INPUT_STYLE}
                />
              </label>
              <label className="muted">
                Rota süresi (dk)
                <input
                  inputMode="decimal"
                  placeholder="otomatik snapshot kullanılır"
                  value={form.routeDurationMinutes}
                  onChange={(e) => setForm((prev) => ({ ...prev, routeDurationMinutes: e.target.value }))}
                  style={INPUT_STYLE}
                />
              </label>
              <label className="muted">
                Yolcu sayısı
                <input
                  inputMode="numeric"
                  placeholder="otomatik snapshot kullanılır"
                  value={form.passengerCount}
                  onChange={(e) => setForm((prev) => ({ ...prev, passengerCount: e.target.value }))}
                  style={INPUT_STYLE}
                />
              </label>
              <label className="muted">
                Araç kapasitesi
                <input
                  inputMode="numeric"
                  placeholder="otomatik snapshot kullanılır"
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
                Yakıt birim fiyatı (minor)
                <input
                  inputMode="numeric"
                  placeholder="örn. 5000"
                  value={form.fuelUnitPriceMinor}
                  onChange={(e) => setForm((prev) => ({ ...prev, fuelUnitPriceMinor: e.target.value }))}
                  style={INPUT_STYLE}
                />
              </label>
              <label className="muted">
                Sürücü temel maliyeti
                <input
                  inputMode="numeric"
                  placeholder="örn. 1200"
                  value={form.driverBasePerShiftMinor}
                  onChange={(e) => setForm((prev) => ({ ...prev, driverBasePerShiftMinor: e.target.value }))}
                  style={INPUT_STYLE}
                />
              </label>
              <label className="muted">
                Km başı bakım maliyeti
                <input
                  inputMode="numeric"
                  placeholder="örn. 15"
                  value={form.maintenancePerKmMinor}
                  onChange={(e) => setForm((prev) => ({ ...prev, maintenancePerKmMinor: e.target.value }))}
                  style={INPUT_STYLE}
                />
              </label>
              <label className="muted">
                Aylık araç kira maliyeti
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

        <div className="card" style={{ minWidth: 0 }}>
          <div className="panelSectionTitle">Maliyet modeli</div>
          <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
            {model?.summaryText || "Maliyet modeli henüz hesaplanmadı."}
          </div>
          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            <MetricCard title="Durum" value={String(model?.status || "-").toUpperCase()} note={model?.confidence?.reason || "-"} tone={modelStatusTone} />
            <MetricCard title="Güven" value={String(model?.confidence?.level || "-").toUpperCase()} note={`Puan ${Number(model?.confidence?.score || 0) || 0}/100`} />
            <MetricCard title="Birim km" value={formatTRY(model?.unitCosts?.costPerTotalKmMinor)} note="Toplam km başı" />
            <MetricCard title="Birim yolcu" value={formatTRY(model?.unitCosts?.costPerPassengerMinor)} note="Yolcu başı" />
          </div>
          <div style={{ marginTop: 12 }}>
            <div className="muted">Eksik alanlar</div>
            <ChipRow items={missingFields} emptyText="Eksik alan görünmüyor." />
          </div>
        </div>
      </div>

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        <div className="card" style={{ minWidth: 0 }}>
          <div className="panelSectionTitle">{scope === "ROOM" ? "Oda kârlılığı" : "Bütçe sinyali"}</div>
          <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
            {scope === "ROOM"
              ? roomProfitability?.summaryText || "Oda kârlılığı önizlemesi için veri bekleniyor."
              : companyBudget?.summaryText || "Bütçe önizlemesi için veri bekleniyor."}
          </div>
          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
            <MetricCard title={meta.currentLabel} value={formatTRY(currentAmountMinor)} note={snapshot.currentCommercialAmountCounterLabel || snapshot.currentCommercialCounterLabel || "-"} tone={currentAmountMinor != null ? "good" : "default"} />
            <MetricCard title={scope === "ROOM" ? "Kâr / zarar" : "Bütçe farkı"} value={formatTRY(currentGapMinor)} note={scope === "ROOM" ? "Mevcut teklif - maliyet" : "Mevcut bütçe - servis maliyeti"} tone={currentGapMinor != null && Number(currentGapMinor) >= 0 ? "good" : "warm"} />
            <MetricCard title={meta.resultLabel} value={formatTRY(quoteFloor?.quoteFloorMinor)} note={quoteFloorComputed ? `Kişi başı ${formatTRY(quoteFloor?.quoteFloorPerPassengerMinor)}` : "Açık parametre bekliyor"} tone={quoteFloorComputed ? "good" : "warm"} />
          </div>
          <div style={{ marginTop: 12 }}>
            <div className="muted">Quote floor açıklığı</div>
            <div className="card" style={{ marginTop: 8, padding: 12, background: "rgba(255,255,255,0.02)" }}>
              <div className="muted">Taban kaynağı</div>
              <div style={{ fontWeight: 800, marginTop: 4 }}>{quoteFloor?.baselineSource || "-"}</div>
              <div className="muted" style={{ marginTop: 6 }}>Hedef katkı: <b>{formatBps(quoteFloor?.targetContributionBps)}</b> • Risk rezervi: <b>{formatBps(quoteFloor?.riskReserveBps)}</b></div>
              <div className="muted" style={{ marginTop: 6 }}>Fark: <b>{formatTRY(quoteFloorGapMinor)}</b></div>
            </div>
          </div>
        </div>

        <div className="card" style={{ minWidth: 0 }}>
          <div className="panelSectionTitle">Snapshot</div>
          <div className="muted" style={{ marginTop: 6, lineHeight: 1.45 }}>
            {snapshot.roomName || snapshot.companyName ? `${snapshot.roomName || "-"} • ${snapshot.companyName || "-"}` : "Snapshot adı yok."}
          </div>
          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            <div className="muted">Kaynak: <b>{snapshot.sourceLabel || "-"}</b></div>
            <div className="muted">Durum: <b>{snapshot.shiftStatus || "-"}</b></div>
            <div className="muted">Aktif vardiya: <b>{snapshot.activeShiftCount || 0}</b></div>
            <div className="muted">Aktif sözleşme: <b>{snapshot.activeAgreementCount || 0}</b></div>
            <div className="muted">Açık teklif: <b>{snapshot.openOfferCount || 0}</b></div>
            <div className="muted">Karşı teklif: <b>{snapshot.counterOfferCount || 0}</b></div>
            <div className="muted">Oda / şirket etiketi: <b>{snapshot.currentCommercialCounterLabel || "-"}</b></div>
          </div>
          <div style={{ marginTop: 12 }}>
            <div className="muted">Genel not</div>
            <div className="card" style={{ marginTop: 8, padding: 12, background: "rgba(255,255,255,0.02)" }}>
              {preview?.summaryText || "Sadece önizleme. Yazma aksiyonu yok."}
            </div>
          </div>
        </div>
      </div>
    </PanelChrome>
  );
}
