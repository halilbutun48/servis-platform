import { useEffect, useMemo, useState } from "react";
import PanelChrome from "../../components/PanelChrome";
import { api, createRoomIncomePeriodCorrection } from "../../api";
import { getApiErrorInfo } from "../../utils/apiContract";
import {
  buildFinancialOverviewQuery,
  buildFinancialOverviewSummary,
  buildIncomeOverviewSummary,
  selectRoomCollectionInvoiceLinks,
  buildProvisionalProfitability,
  financialCategoryLabel,
  financialOverviewMetricGroups,
  financialOverviewScopeCopy,
  initialFinancialOverviewPeriod,
} from "./financialOverviewSummary";
import FinancialPeriodControls from "./FinancialPeriodControls";
import InvoiceCollectionPanel from "../../components/InvoiceCollectionPanel";
import { buildFinancialCopilotSelection, buildRoomIncomeFinanceCopilotSelection } from "./financialOperationsCopilot";
import { setCopilotSelection } from "../../utils/copilotSelection";

const COSTS_BASE = "/api/commercial-core/room/financial-operations/costs";

function formatTRY(value, currencyCode = "TRY") {
  if (value === null || value === undefined || String(value).trim() === "") return "Bilinmiyor";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return "Bilinmiyor";
  const currency = String(currencyCode || "TRY").toUpperCase();
  const suffix = currency === "TRY" ? "₺" : currency;
  return `${new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount / 100)} ${suffix}`;
}

function formatDate(value) {
  if (!value) return "Tarih yok";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Tarih yok";
  return new Intl.DateTimeFormat("tr-TR", { timeZone: "UTC", day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function entryDate(entry) {
  return entry?.periodStart || entry?.occurredAt || entry?.periodEnd || entry?.confirmedAt || entry?.createdAt || null;
}

function entryContext(entry) {
  return [entry?.display?.vehicleLabel, entry?.display?.driverLabel].filter(Boolean).join(" · ");
}

function entryStatuses(entry) {
  const statuses = ["Onaylı"];
  if (String(entry?.vatClassification || "UNKNOWN").toUpperCase() === "UNKNOWN") statuses.push("KDV ayrıca belirtilmedi");
  const shiftLinked = Boolean(entry?.shiftId || entry?.display?.shiftLabel || (Array.isArray(entry?.allocationLines) && entry.allocationLines.some((line) => String(line?.targetKind || "").toUpperCase() === "SHIFT" || line?.shiftId)));
  statuses.push(shiftLinked ? "Vardiya kanıtı var" : "Vardiya dağıtımı bekliyor");
  return statuses;
}

function formatPercent(amountMinor, totalMinor) {
  const total = Number(totalMinor);
  const amount = Number(amountMinor);
  if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(amount)) return "—";
  return `${new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1 }).format(Math.max(0, amount / total * 100))}%`;
}

function sourceName(me) {
  return String(me?.roomName || me?.companyName || me?.organizationName || "Taşımacılık Firması").trim();
}

function metricStyle(tone = "default") {
  return {
    default: { border: "1px solid rgba(255,255,255,0.08)", value: "#f8fafc", title: "#98a2b3" },
    good: { border: "1px solid rgba(18,183,106,0.35)", value: "#d1fadf", title: "#6ce9a6" },
    warm: { border: "1px solid rgba(247,144,9,0.35)", value: "#ffd38a", title: "#f7b267" },
    danger: { border: "1px solid rgba(240,68,56,0.35)", value: "#fecaca", title: "#fda29b" },
  }[tone] || metricStyle();
}

function Metric({ title, value, note, tone = "default", testId = "" }) {
  const palette = metricStyle(tone);
  return (
    <div className="card" data-testid={testId || undefined} style={{ minWidth: 0, border: palette.border }}>
      <div className="panelSectionTitle" style={{ color: palette.title }}>{title}</div>
      <div className="panelStatValue" style={{ color: palette.value, marginTop: 8 }}>{value}</div>
      {note ? <div className="panelMeta" style={{ marginTop: 8, lineHeight: 1.45 }}>{note}</div> : null}
    </div>
  );
}

function incomeStatusLabel(status) {
  switch (String(status || "").toUpperCase()) {
    case "READY": return "Hazır; kesinleşme ayrıca doğrulanmalı";
    case "FINALIZED": return "Hakediş kesinleşmiş";
    case "ISSUED": return "Fatura düzenlenmiş";
    case "PAID": return "Fatura kaydı mevcut";
    case "AVAILABLE": return "Doğrulandı";
    case "TEST_SIMULATED": return "Kontrollü DEMO simülasyonu · saha/banka kanıtı değil";
    case "FUTURE_NOT_REALIZED": return "Gelecek dönem";
    case "RECONCILIATION_MISMATCH": return "Mutabakat bekliyor";
    case "PERIOD_REQUIRED": return "Dönem seçimi gerekli";
    case "UNAVAILABLE": return "Doğrulanamıyor";
    default: return "Doğrulama bekliyor";
  }
}

function incomeCardValue(card) {
  return card?.amountMinor == null ? incomeStatusLabel(card?.status) : formatTRY(card.amountMinor, card.currencyCode);
}

function IncomePeriodCorrectionForm({ token, target, onClose, onSaved }) {
  const [recognizedPeriodStart, setRecognizedPeriodStart] = useState("");
  const [recognizedPeriodEnd, setRecognizedPeriodEnd] = useState("");
  const [evidenceRef, setEvidenceRef] = useState("");
  const [reason, setReason] = useState("");
  const [approval, setApproval] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setRecognizedPeriodStart("");
    setRecognizedPeriodEnd("");
    setEvidenceRef("");
    setReason("");
    setApproval(false);
    setBusy(false);
    setError("");
  }, [target?.hakedisId, target?.sourcePeriodEnd, target?.sourcePeriodStart]);

  if (!target?.hakedisId) return null;

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (!approval) {
      setError("Düzeltmeyi kaydetmeden önce açık kullanıcı onayı verin.");
      return;
    }
    setBusy(true);
    try {
      const result = await createRoomIncomePeriodCorrection({
        hakedisId: target.hakedisId,
        recognizedPeriodStart,
        recognizedPeriodEnd,
        evidenceRef,
        reason,
        idempotencyKey: `ROOM-INCOME-PERIOD-${target.hakedisId}-${recognizedPeriodStart}-${recognizedPeriodEnd}`,
        userApproval: true,
      }, { token });
      onSaved?.(result);
    } catch (nextError) {
      setError(nextError?.message || "Gelir dönemi düzeltmesi kaydedilemedi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card" data-testid="financial-overview-income-period-correction" style={{ marginTop: 12, border: "1px solid rgba(247,144,9,0.35)" }}>
      <div className="panelSectionTitle">Gelir dönemini düzelt</div>
      <div className="panelMeta" style={{ marginTop: 6, lineHeight: 1.5 }}>
        Kaynak hizmet dönemi: {formatDate(target.sourcePeriodStart || target.periodStart)} – {formatDate(target.sourcePeriodEnd || target.periodEnd)}. Kaynak hakediş, fatura ve tahsilat kayıtları taşınmaz; yalnız gelirin tanındığı dönem denetlenebilir biçimde düzeltilir.
      </div>
      <form onSubmit={submit} style={{ display: "grid", gap: 10, marginTop: 12 }}>
        <label className="panelMeta">
          Yeni gelir başlangıcı
          <input className="input" data-testid="income-correction-period-start" type="date" value={recognizedPeriodStart} onChange={(event) => setRecognizedPeriodStart(event.target.value)} required />
        </label>
        <label className="panelMeta">
          Yeni gelir bitişi
          <input className="input" data-testid="income-correction-period-end" type="date" value={recognizedPeriodEnd} onChange={(event) => setRecognizedPeriodEnd(event.target.value)} required />
        </label>
        <label className="panelMeta">
          Dayanak referansı
          <input className="input" data-testid="income-correction-evidence" value={evidenceRef} onChange={(event) => setEvidenceRef(event.target.value)} placeholder="Örn. hizmet gerçekleşme belgesi" required />
        </label>
        <label className="panelMeta">
          Düzeltme gerekçesi
          <textarea className="input" data-testid="income-correction-reason" rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Dönem düzeltmesinin nedenini açıklayın" required />
        </label>
        <label className="panelMeta" style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
          <input data-testid="income-correction-approval" type="checkbox" checked={approval} onChange={(event) => setApproval(event.target.checked)} />
          Kaynak dönemi, yeni dönem ve dayanak bilgisini kontrol ettim; bu düzeltmeyi açıkça onaylıyorum.
        </label>
        {error ? <div className="formError" role="alert">{error}</div> : null}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="submit" className="btn sm primary" data-testid="income-correction-save" disabled={busy}>{busy ? "Kaydediliyor…" : "Düzeltmeyi kaydet"}</button>
          <button type="button" className="btn sm ghost" onClick={onClose} disabled={busy}>Vazgeç</button>
        </div>
      </form>
    </section>
  );
}

function buildQueryString(query) {
  const text = new URLSearchParams(query).toString();
  return text ? `?${text}` : "";
}

async function readOverviewData({ token, query, signal }) {
  const load = (includeSalary) => {
    const requestQuery = { ...query, includeSalary: includeSalary ? "true" : "false" };
    const suffix = buildQueryString(requestQuery);
    return Promise.all([
      api.get(`${COSTS_BASE}/summary${suffix}`, { token, signal }),
      api.get(`${COSTS_BASE}${suffix}`, { token, signal }),
    ]);
  };

  try {
    const [summary, list] = await load(true);
    return { summary, list, salaryRedacted: Boolean(summary?.salaryRedacted || list?.salaryRedacted) };
  } catch (error) {
    if (getApiErrorInfo(error, "Gider özeti okunamadı.").status !== 403) throw error;
    const [summary, list] = await load(false);
    return { summary, list, salaryRedacted: true };
  }
}

export default function FinancialOverviewSummary({
  token,
  me,
  onOpenExpenses,
  onOpenAllExpenses,
  onOpenServiceCost,
  onOpenIncomeEvidence,
  onOpenIncomeCorrection,
  incomeCorrectionTarget,
  onIncomeCorrectionSaved,
  agreementRecords = [],
  initialIncomeInvoiceId = "",
  embedded = false,
  refreshSignal = 0,
  initialPeriodStart = "",
  initialPeriodEnd = "",
  onPeriodChange,
  collectionEnabled = false,
}) {
  const initialPeriod = useMemo(
    () => initialFinancialOverviewPeriod({ initialPeriodStart, initialPeriodEnd }),
    [initialPeriodEnd, initialPeriodStart],
  );
  const periodStart = initialPeriod.periodStart;
  const periodEnd = initialPeriod.periodEnd;
  const [summary, setSummary] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshTick, setRefreshTick] = useState(0);
  const [error, setError] = useState("");
  const [sourceState, setSourceState] = useState("waiting");

  const query = useMemo(() => buildFinancialOverviewQuery({ periodStart, periodEnd }), [periodEnd, periodStart]);
  const scopeCopy = useMemo(() => financialOverviewScopeCopy(), []);
  const metricGroups = useMemo(() => financialOverviewMetricGroups(), []);
  const invalidPeriod = Boolean(periodStart && periodEnd && periodStart > periodEnd);
  const overview = useMemo(
    () => buildFinancialOverviewSummary({ summary, entries, periodStart, periodEnd }),
    [entries, periodEnd, periodStart, summary],
  );
  const incomeOverview = useMemo(
    () => buildIncomeOverviewSummary({ incomeEvidence: summary?.incomeEvidence || null, periodStart, periodEnd, periodScope: query.periodScope, agreementRecords }),
    [agreementRecords, periodEnd, periodStart, query.periodScope, summary?.incomeEvidence],
  );
  const collectionInvoiceLinks = useMemo(
    () => selectRoomCollectionInvoiceLinks(incomeOverview.links, { role: me?.role }),
    [incomeOverview.links, me?.role],
  );
  const [selectedCollectionInvoiceId, setSelectedCollectionInvoiceId] = useState(null);
  const [selectedIncomeInvoiceId, setSelectedIncomeInvoiceId] = useState(() => Number(initialIncomeInvoiceId || 0) || null);
  const selectedCollectionInvoice = useMemo(() => {
    const selectedId = Number(selectedCollectionInvoiceId || 0);
    return collectionInvoiceLinks.find((link) => Number(link?.invoiceId || 0) === selectedId)
      || collectionInvoiceLinks[0]
      || null;
  }, [collectionInvoiceLinks, selectedCollectionInvoiceId]);
  const selectedIncomeLink = useMemo(() => {
    const selectedId = Number(selectedIncomeInvoiceId || 0);
    return selectedId > 0
      ? incomeOverview.links.find((link) => Number(link?.invoiceId || 0) === selectedId) || null
      : null;
  }, [incomeOverview.links, selectedIncomeInvoiceId]);

  useEffect(() => {
    if (String(me?.role || "").toUpperCase() !== "COMPANY" || !selectedIncomeLink) return undefined;
    onOpenIncomeEvidence?.(selectedIncomeLink);
    return undefined;
  }, [me?.role, onOpenIncomeEvidence, selectedIncomeLink]);

  useEffect(() => {
    if (!collectionEnabled || String(me?.role || "").toUpperCase() !== "ROOM") return undefined;
    const baseSelection = buildFinancialCopilotSelection({ financeView: "overview" });
    setCopilotSelection(buildRoomIncomeFinanceCopilotSelection({
      baseSelection,
      invoiceLinks: collectionInvoiceLinks,
      selectedInvoiceId: selectedCollectionInvoice?.invoiceId || null,
    }));
    return undefined;
  }, [collectionEnabled, collectionInvoiceLinks, me?.role, selectedCollectionInvoice?.invoiceId]);
  const meRoomId = me?.roomId;
  const profitability = useMemo(
    () => buildProvisionalProfitability({
      expenseMinor: overview.totalMinor,
      expenseCurrency: overview.currencyCode,
      period: { start: periodStart, end: periodEnd },
      scope: {
        roomId: meRoomId,
        scopeKey: meRoomId ? `ROOM:${meRoomId}` : null,
        firmExpenseScopeProven: summary?.firmExpenseScopeProven === true,
      },
      incomeEvidence: summary?.incomeEvidence || null,
    }),
    [meRoomId, overview.currencyCode, overview.totalMinor, periodEnd, periodStart, summary?.firmExpenseScopeProven, summary?.incomeEvidence],
  );

  useEffect(() => {
    if (!token || invalidPeriod) return undefined;
    const controller = new AbortController();
    let active = true;
    const loadingTimer = setTimeout(() => {
      if (!active) return;
      setLoading(true);
      setError("");
      setSourceState("loading");
    }, 0);

    readOverviewData({ token, query, signal: controller.signal })
      .then((payload) => {
        if (!active) return;
        setSummary(payload.summary || null);
        setEntries(Array.isArray(payload.list?.entries || payload.list?.items) ? (payload.list.entries || payload.list.items) : []);
        setSourceState(payload.summary?.readOnly === true ? "confirmed" : "unconfirmed");
      })
      .catch((loadError) => {
        if (!active || loadError?.name === "AbortError") return;
        setSummary(null);
        setEntries([]);
        setSourceState("failed");
        setError(getApiErrorInfo(loadError, "Gider özeti okunamadı.").message || "Gider özeti okunamadı.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      clearTimeout(loadingTimer);
      controller.abort();
    };
  }, [invalidPeriod, query, refreshSignal, refreshTick, token]);

  const sourceLabel = sourceState === "confirmed" ? "Canlı gider kaynağı doğrulandı" : sourceState === "failed" ? "Canlı gider kaynağı okunamadı" : "Canlı gider kaynağı kontrol ediliyor";
  const sourceTone = sourceState === "confirmed" ? "good" : sourceState === "failed" ? "danger" : "warm";
  const SummaryShell = embedded ? "div" : PanelChrome;
  const summaryShellProps = embedded
    ? {
      className: "financial-overview-summary-body",
      style: { display: "grid", gap: 10, minWidth: 0 },
    }
    : {
      className: "pre18-finance-surface pre18-finance-room",
      eyebrow: "MALİYET KONTROL MERKEZİ",
      title: "Finansal Genel Durum",
      subtitle: `${sourceName(me)} · Firma genelindeki gerçekleşen gider özeti`,
      actions: <button type="button" className="btn sm" onClick={() => setRefreshTick((tick) => tick + 1)} disabled={loading}>{loading ? "Yenileniyor..." : "Yenile"}</button>,
    };

  return (
    <SummaryShell {...summaryShellProps}>
      <div className="card" style={{ border: "1px solid rgba(98,117,255,0.28)", background: "rgba(98,117,255,0.05)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "start" }}>
          <div style={{ minWidth: 0 }}>
            <div className="panelSectionTitle">Firma özeti</div>
          </div>
          <span className="pill" data-status={sourceTone.toUpperCase()}>{sourceLabel}</span>
        </div>
        <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" className="btn primary" data-testid="financial-overview-add-expense" onClick={onOpenExpenses}>Gider Ekle</button>
          <button type="button" className="btn" data-testid="financial-overview-service-cost" onClick={onOpenServiceCost}>Servis Maliyeti</button>
        </div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div className="panelSectionTitle">Dönem</div>
        <div className="muted" style={{ marginTop: 6 }}>Toplam ve kayıtlar seçtiğiniz döneme göre yenilenir.</div>
        <div style={{ marginTop: 10, display: "grid", gap: 10, alignItems: "end" }}>
          <FinancialPeriodControls
            prefix="financial-overview"
            periodStart={periodStart}
            periodEnd={periodEnd}
            onChange={({ periodStart: nextPeriodStart, periodEnd: nextPeriodEnd }) => onPeriodChange?.({
              periodStart: nextPeriodStart,
              periodEnd: nextPeriodEnd,
            })}
          />
        </div>
        <div className="panelMeta" style={{ marginTop: 8 }}>Seçili kapsam: {overview.periodLabel}</div>
        {invalidPeriod ? <div className="card" style={{ marginTop: 10, border: "1px solid rgba(240,68,56,0.3)" }}>Başlangıç tarihi bitiş tarihinden önce olmalı.</div> : null}
      </div>

      {error ? <div className="card" style={{ marginTop: 12, border: "1px solid rgba(240,68,56,0.3)" }}>{error}</div> : null}

      <div data-testid="financial-overview-financial-metrics" className="financial-overview-primary-grid" data-financial-metric-keys={metricGroups.primary.join(",")} style={{ marginTop: 12 }}>
        <Metric
          title={scopeCopy.expenseTitle}
          value={formatTRY(overview.totalMinor, overview.currencyCode)}
          note={`${scopeCopy.expenseNotePrefix}${overview.recordCount} onaylı gerçekleşen kayıt · ${overview.periodLabel}`}
          tone={overview.totalMinor == null ? "warm" : "good"}
          testId="financial-overview-gross-total"
        />
        <Metric
          title="Firma geneli gerçekleşen gelir"
          value={incomeCardValue(incomeOverview.realized)}
          note={`${scopeCopy.incomeScopeNote} ${incomeOverview.realized.note}`}
          tone={incomeOverview.realized.status === "AVAILABLE" ? "good" : "warm"}
          testId="financial-overview-income-realized"
        />
        <Metric
          title={profitability.status === "AVAILABLE" ? scopeCopy.differenceTitle : "Gelir–gider farkı"}
          value={profitability.status === "AVAILABLE" ? formatTRY(profitability.differenceMinor, profitability.currencyCode) : "Doğrulanamıyor"}
          note={profitability.status === "AVAILABLE"
            ? scopeCopy.differenceNotePrefix
            : `${profitability.excludedReasons?.[0] || incomeOverview.realized.note} · Kayıtlı gider: ${formatTRY(overview.totalMinor, overview.currencyCode)}`}
          tone={profitability.status === "AVAILABLE" ? (profitability.differenceMinor >= 0 ? "good" : "danger") : "warm"}
          testId="financial-overview-profitability"
        />
      </div>

      <details className="financial-overview-company-wide" style={{ marginTop: 12 }}>
        <summary className="financial-overview-company-wide-summary">
          <span>
            <strong>Firma geneli gelir ve tahsilat</strong>
            <small>{scopeCopy.incomeScopeNote}</small>
          </span>
          <span className="panelMeta">Hakediş, fatura, tahsilat ve alacak ayrıntıları</span>
        </summary>
        <div className="financial-overview-company-wide-grid" data-financial-metric-keys={metricGroups.companyWide.join(",")}>
          <Metric
            title="Firma geneli · Hakediş"
            value={incomeCardValue(incomeOverview.hakedis)}
            note={incomeStatusLabel(incomeOverview.hakedis.status)}
            tone={incomeOverview.hakedis.amountMinor == null ? "warm" : "default"}
            testId="financial-overview-income-hakedis"
          />
          <Metric
            title="Firma geneli · Fatura"
            value={incomeCardValue(incomeOverview.invoiced)}
            note={incomeStatusLabel(incomeOverview.invoiced.status)}
            tone={incomeOverview.invoiced.amountMinor == null ? "warm" : "default"}
            testId="financial-overview-income-invoiced"
          />
          <Metric
            title="Firma geneli · Tahsilat"
            value={incomeCardValue(incomeOverview.collected)}
            note={incomeOverview.collected.note}
            tone="warm"
            testId="financial-overview-income-collected"
          />
          <Metric
            title="Firma geneli · Kalan alacak"
            value={incomeCardValue(incomeOverview.receivable)}
            note={incomeOverview.receivable.note}
            tone="warm"
            testId="financial-overview-income-receivable"
          />
        </div>
      </details>

      <section className="card" data-testid="financial-overview-income" style={{ marginTop: 12, border: "1px solid rgba(98,117,255,0.28)", background: "rgba(98,117,255,0.04)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline", flexWrap: "wrap" }}>
          <div>
            <div className="panelSectionTitle">Gelir kaynakları ve mutabakat</div>
            <div className="panelMeta" style={{ marginTop: 5 }}>
              {incomeOverview.periodRequired ? incomeOverview.message : `${scopeCopy.incomeScopeLabel} · ${overview.periodLabel}`}
            </div>
          </div>
          <span className="pill" data-status={incomeOverview.status}>{incomeStatusLabel(incomeOverview.status)}</span>
        </div>
        <details style={{ marginTop: 10 }}>
          <summary className="panelMeta" style={{ cursor: "pointer" }}>Kaynak ve mutabakat ayrıntılarını aç</summary>
          {!incomeOverview.periodRequired ? (
            <div className="panelMeta" style={{ marginTop: 8, lineHeight: 1.5 }}>
              Hakediş: {incomeStatusLabel(incomeOverview.hakedis.status)} · Faturalanan: {incomeStatusLabel(incomeOverview.invoiced.status)} · Tahsilat: {incomeOverview.collected.note} · Alacak: {incomeOverview.receivable.note}
            </div>
          ) : (
            <div className="panelMeta" data-testid="financial-overview-income-period-required" style={{ marginTop: 8 }}>
              Tarih aralığı seçildiğinde hakediş, fatura, gerçekleşmiş gelir ve varsa tahsilat kanıtı aynı kapsamda gösterilir.
            </div>
          )}
          {incomeOverview.links.length ? (
            <div data-testid="financial-overview-income-records" style={{ marginTop: 10, display: "grid", gap: 10 }}>
              {incomeOverview.links.map((link) => (
                <article
                  key={`${link.agreementId}:${link.hakedisId || 0}:${link.invoiceId || 0}`}
                  data-testid={`financial-overview-income-record-${link.agreementId}-${link.hakedisId || link.invoiceId || 0}`}
                  style={{ display: "grid", gap: 7, padding: 10, border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, minWidth: 0 }}
                >
                  <div className="panelSectionTitle">{link.customerLabel}</div>
                  <div className="panelMeta">{link.agreementLabel} · {link.recordTypeLabel}</div>
                  {link.sourceLabel ? <div className="panelMeta" data-testid={`financial-overview-income-source-${link.agreementId}-${link.hakedisId || link.invoiceId || 0}`}>{link.sourceLabel}</div> : null}
                  <div className="panelMeta">
                    Hizmet dönemi: {link.sourcePeriodStart ? `${formatDate(link.sourcePeriodStart)} – ${formatDate(link.sourcePeriodEnd || link.sourcePeriodStart)}` : "Bilgi bulunamadı"}
                    <br />
                    Gelirin tanındığı dönem: {link.periodStart ? `${formatDate(link.periodStart)} – ${formatDate(link.periodEnd || link.periodStart)}` : "Bilgi bulunamadı"}
                  </div>
                  <div><b>{link.amountMinor == null ? "Tutar bilgisi bulunamadı" : formatTRY(link.amountMinor, link.currencyCode)}</b></div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      type="button"
                      className="btn sm ghost"
                      data-testid={`financial-overview-income-link-${link.agreementId}-${link.hakedisId || link.invoiceId || 0}`}
                      onClick={() => {
                        if (String(me?.role || "").toUpperCase() === "COMPANY") setSelectedIncomeInvoiceId(Number(link?.invoiceId || 0) || null);
                        onOpenIncomeEvidence?.(link);
                      }}
                      disabled={typeof onOpenIncomeEvidence !== "function"}
                    >
                      {link.label}
                    </button>
                    {link.hakedisId && typeof onOpenIncomeCorrection === "function" ? (
                      <button
                        type="button"
                        className="btn sm ghost"
                        data-testid={`financial-overview-income-correction-${link.hakedisId}`}
                        onClick={() => onOpenIncomeCorrection(link)}
                      >
                        Gelir dönemini düzelt
                      </button>
                    ) : null}
                  </div>
                </article>
              ))}
            </div>
          ) : null}
          {!incomeOverview.periodRequired && incomeOverview.realized.status !== "AVAILABLE" ? (
            <div className="panelMeta" style={{ marginTop: 8 }}>{incomeOverview.realized.note}</div>
          ) : null}
        </details>
        <IncomePeriodCorrectionForm
          token={token}
          target={incomeCorrectionTarget}
          onClose={() => onOpenIncomeCorrection?.(null)}
          onSaved={onIncomeCorrectionSaved}
        />
      </section>

      {collectionEnabled ? (
        <section className="card" data-testid="room-general-collection" style={{ marginTop: 12, border: "1px solid rgba(98,117,255,0.28)", background: "rgba(98,117,255,0.04)" }}>
          <div className="panelSectionTitle">Tahsilat Kaydet</div>
          <div className="panelMeta" style={{ marginTop: 5, lineHeight: 1.5 }}>
            ROOM, bağlı fatura için aldığı ödemeyi bu ekrandan kaydedebilir. Manuel kayıt banka tarafından doğrulanmış ödeme anlamına gelmez; fatura, hakediş ve kalan alacak ayrı tutulur.
          </div>
          {collectionInvoiceLinks.length ? (
            <div data-testid="room-general-collection-invoices" style={{ marginTop: 10, display: "grid", gap: 10 }}>
              <InvoiceCollectionPanel
                invoiceId={collectionInvoiceLinks[0]?.invoiceId}
                invoiceOptions={collectionInvoiceLinks}
                token={token}
                enabled
                onSelectionChange={(option) => setSelectedCollectionInvoiceId(Number(option?.invoiceId || 0) || null)}
              />
            </div>
          ) : (
            <div className="panelMeta" data-testid="room-general-collection-empty" style={{ marginTop: 10, lineHeight: 1.5 }}>
              Bu kapsamda bağlı fatura kaydı bulunmadığı için tahsilat oluşturulmadı. Fatura oluştuğunda müşteri, sözleşme, kalan alacak ve önceki tahsilatlar bu bölümde gösterilir.
            </div>
          )}
        </section>
      ) : null}

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
        <section className="card" data-testid="financial-overview-categories">
          <div className="panelSectionTitle">En yüksek gider kategorileri</div>
          <div className="panelMeta" style={{ marginTop: 6 }}>İlk 5 kategori + Diğer giderler · {overview.periodLabel}</div>
          {overview.categories.length ? (
            <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
              {overview.categories.map((item) => {
                const share = Number(overview.totalMinor) > 0 ? Math.min(100, Math.max(0, Number(item.amountMinor) / Number(overview.totalMinor) * 100)) : 0;
                return (
                  <div key={item.key} data-testid={`financial-overview-category-row-${item.key}`} data-category-amount-minor={item.amountMinor}>
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <span className="muted">{item.label || financialCategoryLabel(item.key)}</span>
                      <span style={{ display: "inline-flex", gap: 8, alignItems: "baseline", whiteSpace: "nowrap" }}><b>{formatTRY(item.amountMinor, overview.currencyCode)}</b><span className="panelMeta">{formatPercent(item.amountMinor, overview.totalMinor)}</span></span>
                    </div>
                    <div style={{ height: 6, marginTop: 6, borderRadius: 999, background: "rgba(255,255,255,0.08)" }}>
                      <div style={{ width: `${share}%`, height: "100%", borderRadius: 999, background: "#6b8afd" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : <div className="muted" style={{ marginTop: 12 }}>Seçili dönemde kategori kanıtı yok.</div>}
          <div className="panelMeta" data-testid="financial-overview-category-invariant" style={{ marginTop: 10, color: overview.categoryInvariant ? "#6ce9a6" : "#f7b267" }}>
            {overview.categoryInvariant ? "Kategori toplamı gerçekleşen brüt giderle mutabık." : "Kategori kapsamı gerçekleşen brüt giderle henüz doğrulanamıyor."}
          </div>
        </section>

        <section className="card" data-testid="financial-overview-recent-expenses">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "baseline" }}>
            <div>
              <div className="panelSectionTitle">Son giderler</div>
              <div className="panelMeta" style={{ marginTop: 6 }}>Son 5 kayıt · toplam giderin tamamı değildir</div>
            </div>
            <button
              type="button"
              className="btn sm ghost"
              data-testid="financial-overview-all-expenses"
              onClick={() => onOpenAllExpenses?.({ periodStart, periodEnd })}
            >Tüm giderleri incele</button>
          </div>
          {overview.recentEntries.length ? (
            <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
              {overview.recentEntries.map((entry, index) => (
                <div key={entry.id || entry.sourceRef || index} style={{ display: "flex", justifyContent: "space-between", gap: 12, borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 8 }}>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ overflowWrap: "anywhere" }}>{financialCategoryLabel(entry.categoryKey)}</div>
                    <div className="panelMeta" style={{ marginTop: 4 }}>{[entryContext(entry), formatDate(entryDate(entry))].filter(Boolean).join(" · ")}</div>
                    <div style={{ marginTop: 5, display: "flex", gap: 5, flexWrap: "wrap" }}>
                      {entryStatuses(entry).map((status) => <span key={status} className="pill" style={{ fontSize: 11, padding: "2px 7px" }}>{status}</span>)}
                    </div>
                    {entry.description ? <details style={{ marginTop: 5 }}><summary className="panelMeta" style={{ cursor: "pointer" }}>Açıklamayı gör</summary><div className="panelMeta" style={{ marginTop: 4, overflowWrap: "anywhere" }}>{entry.description}</div></details> : null}
                  </div>
                  <b style={{ whiteSpace: "nowrap" }}>{formatTRY(entry.amountMinor, entry.currencyCode || overview.currencyCode)}</b>
                </div>
              ))}
            </div>
          ) : <div className="muted" style={{ marginTop: 12 }}>Seçili dönemde son gider kaydı yok.</div>}
        </section>
      </div>

      <section className="card" data-testid="financial-overview-alerts" style={{ marginTop: 12, border: overview.warnings.length ? "1px solid rgba(247,144,9,0.35)" : overview.informationNotes?.length ? "1px solid rgba(126,164,232,0.35)" : "1px solid rgba(18,183,106,0.28)" }}>
        <div className="panelSectionTitle">{overview.warnings.length ? "Dikkat Gerektirenler" : overview.informationNotes?.length ? "Bilgi notları" : "Dikkat Gerektirenler"}</div>
        {overview.warnings.length ? (
          <div style={{ marginTop: 8, display: "grid", gap: 7 }}>
            {overview.warnings.map((warning) => {
              const action = warning.action === "expenses"
                ? () => onOpenAllExpenses?.({
                  expenseFilter: warning.expenseFilter || "",
                  focusEntryId: warning.focusEntryId || "",
                  periodStart,
                  periodEnd,
                })
                : () => onOpenServiceCost?.();
              return (
                <div key={warning.key} data-finance-warning-key={warning.key} style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start", borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 8 }}>
                  <div style={{ minWidth: 0 }}><strong>{warning.title}</strong><div className="panelMeta" style={{ marginTop: 3 }}>{warning.impact}</div></div>
                  {action ? <button type="button" className="btn sm ghost" onClick={action}>{warning.actionLabel}</button> : null}
                </div>
              );
            })}
          </div>
        ) : null}
        {overview.informationNotes?.length ? (
          <div data-finance-information-notes style={{ marginTop: overview.warnings.length ? 10 : 8, display: "grid", gap: 7 }}>
            {overview.informationNotes.map((note) => (
              <div key={note.key} data-finance-information-key={note.key} style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", paddingBottom: 8 }}>
                <strong>{note.title}</strong>
                <div className="panelMeta" style={{ marginTop: 3 }}>{note.impact}</div>
              </div>
            ))}
          </div>
        ) : null}
        {!overview.warnings.length && !overview.informationNotes?.length ? <div className="muted" style={{ marginTop: 8 }}>Seçili dönem için ek açıklama gerektiren uyarı yok.</div> : null}
        <div className="panelMeta" style={{ marginTop: 10 }}>Net kârlılık ve vardiya maliyeti, yalnız kaynak ve dağıtım kanıtları tamamlandığında doğrulanabilir.</div>
      </section>
    </SummaryShell>
  );
}
