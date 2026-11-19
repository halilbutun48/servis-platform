import { useEffect, useState } from "react";
import { createRoomIncomeChain, getReconciliationPreview } from "../api";
import { formatReconciliationRecord, getOperationEvidenceMessage, getReconciliationPrimaryAction, getRoomAgreementSummary } from "../utils/reconciliationPresentation";
import InvoiceCollectionPanel from "./InvoiceCollectionPanel";
import CompanyInvoicePaymentPanel from "./CompanyInvoicePaymentPanel";
import { buildRoomIncomeChainRequest } from "./reconciliationIncomeChainPresentation";
import { useSession } from "../state/session";

const STATUS_TONES = {
  MATCHED: "good",
  UNDER_INVOICED: "warm",
  OVER_INVOICED: "warm",
};

function formatMoneyMinor(value, currencyCode = "TRY") {
  if (value == null || !Number.isSafeInteger(Number(value))) return "Veri yok";
  const amount = Number(value) / 100;
  const formatted = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);
  return currencyCode === "TRY" ? `${formatted} ₺` : `${formatted} ${currencyCode}`;
}

function formatDate(value) {
  return String(value || "-").replace(/^(\d{4})-(\d{2})-(\d{2})$/, "$3.$2.$1");
}

function Metric({ label, value, note }) {
  return (
    <div className="card" style={{ minWidth: 150, flex: "1 1 150px", margin: 0 }}>
      <div className="muted" style={{ fontSize: 12 }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 900, marginTop: 4 }}>{value}</div>
      {note ? <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>{note}</div> : null}
    </div>
  );
}

export default function ReconciliationPreviewCard({ agreementId, token, className = "", style, onOpenOperation = null, onOpenAgreementShifts = null, roomSummaryMode = false, periodStart = "", periodEnd = "", collectionEnabled = false }) {
  const [state, setState] = useState({ requestKey: "", loading: false, data: null, error: "" });
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [incomeBusy, setIncomeBusy] = useState(false);
  const [incomeFeedback, setIncomeFeedback] = useState("");
  const [incomeForm, setIncomeForm] = useState({ sourceRef: "" });
  const { me } = useSession();
  const id = Number(agreementId || 0);
  const requestKey = token && id ? `${token}:${id}:${periodStart || ""}:${periodEnd || ""}:${reloadVersion}` : "";

  useEffect(() => {
    if (!requestKey) {
      return undefined;
    }
    const controller = new AbortController();
    getReconciliationPreview(id, { periodStart, periodEnd }, { token, signal: controller.signal })
      .then((payload) => setState({ requestKey, loading: false, data: payload?.data || payload || null, error: "" }))
      .catch((error) => {
        if (error?.name === "AbortError") return;
        setState({ requestKey, loading: false, data: null, error: error?.message || "Mutabakat önizlemesi yüklenemedi." });
      });
    return () => controller.abort();
  }, [id, periodEnd, periodStart, requestKey, token]);

  if (!token || !id) return null;
  if (state.requestKey !== requestKey || state.loading) return <div className={`card ${className}`.trim()} style={style} data-testid="reconciliation-preview-card">Mutabakat önizlemesi hazırlanıyor...</div>;
  if (state.error) return <div className={`card ${className}`.trim()} style={style} data-testid="reconciliation-preview-card"><div style={{ fontWeight: 800 }}>Mutabakat önizlemesi</div><div className="muted" style={{ marginTop: 5 }}>{state.error}</div></div>;

  const data = state.data;
  if (!data) return null;
  const status = String(data.status || "REVIEW_REQUIRED").toUpperCase();
  const currency = data.expectedAmount?.currencyCode || data.invoice?.currencyCode || "TRY";
  const operations = data.evidence?.operations || {};
  const difference = data.difference || {};
  const differenceValue = difference.amountMinor == null ? "Veri yok" : formatMoneyMinor(difference.amountMinor, currency);
  const tone = STATUS_TONES[status] || "default";
  const operationShiftIds = Array.isArray(operations.shiftIds)
    ? operations.shiftIds.filter((value) => String(value || "").trim())
    : [];
  const hakedisDisplay = formatReconciliationRecord({
    kind: "hakedis",
    exists: data.hakedisPreview?.exists,
    source: data.hakedisPreview?.source,
  });
  const invoiceDisplay = formatReconciliationRecord({
    kind: "invoice",
    exists: data.invoice?.exists,
    source: data.invoice?.source,
  });
  const roomSummary = roomSummaryMode ? getRoomAgreementSummary({
    status,
    statusLabel: data.statusLabel,
    operations,
    canOpenOperation: typeof onOpenOperation === "function",
    canOpenAgreementShifts: typeof onOpenAgreementShifts === "function",
  }) : null;
  const primaryAction = roomSummary?.primaryAction || getReconciliationPrimaryAction({
    status,
    operationShiftIds,
    canOpenOperation: typeof onOpenOperation === "function",
  });
  const operationEvidenceMessage = getOperationEvidenceMessage({
    status,
    hasOperation: operationShiftIds.length > 0,
  });
  const reconciliationReason = data.reasons?.[0]?.label || "Kayıtlar sözleşme ve operasyon kanıtlarıyla birlikte değerlendirilir.";
  const showReconciliationReason = !roomSummary || reconciliationReason !== roomSummary.reason;
  const expectedAmount = data.expectedAmount?.amountMinor == null && data.hakedisPreview?.exists
    ? "Tutar girilmemiş"
    : formatMoneyMinor(data.expectedAmount?.amountMinor, currency);
  const invoiceAmount = data.invoice?.amountMinor == null && data.invoice?.exists
    ? "Tutar girilmemiş"
    : formatMoneyMinor(data.invoice?.amountMinor, currency);
  const roomWritable = String(me?.role || "").toUpperCase() === "ROOM";
  const companyWritable = String(me?.role || "").toUpperCase() === "COMPANY";
  const companyInvoiceId = Number(data.invoice?.id || 0);
  const incomeCalculation = data.incomeCalculation || null;
  const incomeCalculationReady = incomeCalculation?.status === "READY";
  const incomeCalculationBlocked = Boolean(incomeCalculation && !incomeCalculationReady);
  const incomeCalculationVisible = roomWritable && Boolean(incomeCalculation);
  const proportionalContinuationReady = incomeCalculation?.pricingUnit === "SERVICE_DAY_EQUAL"
    && Number(incomeCalculation?.newlyCompletedServiceUnitCount || 0) > 0;
  const incomeActionVisible = collectionEnabled
    && roomWritable
    && incomeCalculationReady
    && ((!data.hakedisPreview?.exists && !data.invoice?.exists && ["NO_HAKEDIS", "NO_INVOICE"].includes(status)) || proportionalContinuationReady);

  async function createIncomeChain() {
    const request = buildRoomIncomeChainRequest({ agreementId: id, data, form: incomeForm, currencyCode: currency });
    if (request.error) {
      setIncomeFeedback("Kaynak/kanıt referansı girin.");
      return;
    }
    setIncomeBusy(true);
    setIncomeFeedback("");
    try {
      const result = await createRoomIncomeChain(id, request, { token });
      setIncomeFeedback(result?.vatStatus === "NOT_PROVEN"
        ? "Hakediş ve fatura oluşturuldu. KDV kanıtı olmadığı için net kâr kesinleştirilmedi."
        : "Hakediş ve fatura oluşturuldu.");
      setIncomeForm({ sourceRef: "" });
      setReloadVersion((value) => value + 1);
    } catch (error) {
      setIncomeFeedback(error?.message || "Hakediş ve fatura oluşturulamadı.");
    } finally {
      setIncomeBusy(false);
    }
  }

  return (
    <section className={`card ${className}`.trim()} style={style} data-testid="reconciliation-preview-card" data-reconciliation-status={status}>
      <div className="topbar" style={{ alignItems: "flex-start" }}>
        <div>
          <div className="title">Hakediş ve fatura mutabakat önizlemesi</div>
          <div className="muted" style={{ marginTop: 4 }}>Dönem: {formatDate(data.period?.start)} - {formatDate(data.period?.end)}</div>
          <div className="muted" style={{ marginTop: 4 }} data-testid="reconciliation-agreement-reference">Sözleşme: <b>{data.evidence?.agreement?.reference || "Veri yok"}</b></div>
        </div>
        <span className={`pill ${tone}`} data-testid="reconciliation-status">{roomSummary?.statusLabel || data.statusLabel || "İncelenmeli"}</span>
      </div>

      {roomSummary ? (
        <div className="card" data-testid="room-agreement-summary" style={{ marginTop: 12, border: "1px solid rgba(88,166,255,.32)", background: "rgba(88,166,255,.06)" }}>
          <div className="muted" style={{ fontSize: 12 }}>Sözleşme durumu</div>
          <div style={{ fontWeight: 900, marginTop: 4 }} data-testid="room-agreement-summary-status">{roomSummary.statusLabel}</div>
          <div className="muted" style={{ marginTop: 6 }} data-testid="room-agreement-summary-reason">Nedeni: {roomSummary.reason}</div>
          {roomSummary.primaryAction ? (
            <button
              type="button"
              className="btn sm primary"
              style={{ marginTop: 10 }}
              data-testid="reconciliation-primary-action"
              data-action-kind={roomSummary.primaryAction.kind}
              onClick={() => {
                if (roomSummary.primaryAction.kind === "open-agreement-shifts") {
                  onOpenAgreementShifts?.(id);
                  return;
                }
                if (roomSummary.primaryAction.kind === "open-operation") {
                  onOpenOperation?.(Number(operationShiftIds[0]));
                }
              }}
            >
              {roomSummary.primaryAction.label}
            </button>
          ) : null}
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
        <Metric label={incomeCalculationBlocked ? "Kayıtlı hakediş" : "Beklenen hakediş"} value={incomeCalculationBlocked ? "Kapsam doğrulanmadı" : expectedAmount} note={incomeCalculationBlocked ? "Otomatik hesap bekliyor" : "Hakediş kaynağı"} />
        <Metric label="Fatura tutarı" value={invoiceAmount} note="Fatura kaynağı" />
        <Metric label="Fark" value={incomeCalculationBlocked ? "Kapsam doğrulanmadı" : differenceValue} note={incomeCalculationBlocked ? "Otomatik karşılaştırma bekliyor" : difference.direction === "INVOICE_UNDER" ? "Fatura daha düşük" : difference.direction === "INVOICE_OVER" ? "Fatura daha yüksek" : "Karşılaştırma sonucu"} />
      </div>

      <div className="muted" style={{ marginTop: 12, display: "grid", gap: 4 }} data-testid="reconciliation-source-reference">
        <div>Hakediş kaydı: <b>{hakedisDisplay.recordLabel}</b> • Kaynak: <b>{hakedisDisplay.sourceLabel}</b></div>
        <div>Fatura kaydı: <b>{invoiceDisplay.recordLabel}</b> • Kaynak: <b>{invoiceDisplay.sourceLabel}</b></div>
      </div>
      <div className="muted" style={{ marginTop: 6 }} data-testid="reconciliation-operation-evidence">
        Operasyon kanıtı: <b>{operations.completedCount || 0} / {operations.eligibleCount || 0} tamamlandı</b>
        {operationShiftIds.length ? <> • Bağlı vardiya: <b>{operationShiftIds.map((id) => `#${id}`).join(", ")}</b></> : null}
      </div>

      {companyWritable && companyInvoiceId > 0 ? (
        <CompanyInvoicePaymentPanel
          invoiceId={companyInvoiceId}
          token={token}
          onChanged={() => setReloadVersion((value) => value + 1)}
        />
      ) : null}

      {showReconciliationReason ? (
        <div className="muted" style={{ marginTop: 12 }} data-testid="reconciliation-reason">
          {reconciliationReason}
        </div>
      ) : null}
      {!roomSummary && operationEvidenceMessage ? (
        <div className="muted" style={{ marginTop: 8 }} data-testid="reconciliation-operation-guidance">
          {operationEvidenceMessage}
        </div>
      ) : null}
      {!roomSummary && primaryAction ? (
        <button
          type="button"
          className="btn sm primary"
          style={{ marginTop: 10 }}
          data-testid="reconciliation-primary-action"
          data-action-kind={primaryAction.kind}
          onClick={() => {
            if (primaryAction.kind === "open-operation") {
              onOpenOperation?.(Number(operationShiftIds[0]));
              return;
            }
            setDetailsOpen(true);
          }}
        >
          {primaryAction.label}
        </button>
      ) : null}

      {incomeCalculationVisible ? (
        <section className="card" data-testid="room-income-chain-panel" style={{ marginTop: 12, border: "1px solid rgba(234,179,8,.35)" }}>
          <div className="panelSectionTitle">Otomatik hakediş hesabı</div>
          <div className="panelMeta" style={{ marginTop: 5 }}>
            Sistem, kabul edilmiş sözleşme fiyatı ile dönemdeki tamamlanmış hizmetleri kullanarak tutarı hesaplar. Kullanıcıdan tutar girilmesi gerekmez.
          </div>
          <div data-testid="room-income-calculation" className="card" style={{ marginTop: 10, border: "1px solid rgba(88,166,255,.28)" }}>
            <div className="muted">Hesaplanan hakediş</div>
            <div style={{ fontSize: 20, fontWeight: 900, marginTop: 4 }} data-testid="room-income-calculated-amount">
              {incomeCalculationReady ? formatMoneyMinor(incomeCalculation.amountMinor, incomeCalculation.currencyCode || currency) : "Hesaplanamıyor"}
            </div>
            <div className="panelMeta" style={{ marginTop: 5 }} data-testid="room-income-calculation-detail">
              {incomeCalculation?.reason || "Sözleşme fiyatı veya gerçekleşmiş hizmet kanıtı eksik."}
            </div>
            {incomeCalculation ? (
              <div className="panelMeta" style={{ marginTop: 5 }}>
                Sözleşme bedeli: <b>{formatMoneyMinor(incomeCalculation.agreementAmountMinor, incomeCalculation.currencyCode || currency)}</b>
                {` • Planlanan hizmet: ${incomeCalculation.scheduledServiceDayCount || 0} gün`}
                {` • Tamamlanan hizmet: ${incomeCalculation.completedServiceUnitCount ?? incomeCalculation.completedCount ?? 0} gün`}
                {` • Önceden hakedişe alınan: ${incomeCalculation.previouslyClaimedServiceUnitCount || 0} gün`}
                {incomeCalculationReady ? ` • Bu işlem: ${formatMoneyMinor(incomeCalculation.amountMinor, incomeCalculation.currencyCode || currency)}` : ""}
                {` • Henüz hak edilmemiş: ${incomeCalculation.unearnedServiceUnitCount || 0} gün`}
                {Number(incomeCalculation.eligibleCount || 0) > Number(incomeCalculation.completedCount || 0) ? ` • Tamamlanan operasyon: ${incomeCalculation.completedCount || 0} / ${incomeCalculation.eligibleCount || 0}` : ""}
                {Number(incomeCalculation.missingServiceDayCount || 0) > 0 ? ` • Eksik planlı gün: ${incomeCalculation.missingServiceDayCount}` : ""}
                {Number(incomeCalculation.outOfScheduleCount || 0) > 0 ? ` • Takvim dışı kayıt: ${incomeCalculation.outOfScheduleCount}` : ""}
                {Number(incomeCalculation.duplicateOperationCount || 0) > 0 ? ` • Tekrarlanan kayıt: ${incomeCalculation.duplicateOperationCount}` : ""}
                {` • Hesap birimi: ${incomeCalculation.pricingUnitLabel || "Sözleşme dönemi"}`}
              </div>
            ) : null}
          </div>
          {incomeActionVisible && incomeCalculationReady ? <div className="fieldRow" style={{ marginTop: 10 }}>
            <label className="field">Kaynak/kanıt referansı<input data-testid="room-income-source-ref" value={incomeForm.sourceRef} onChange={(event) => setIncomeForm((previous) => ({ ...previous, sourceRef: event.target.value }))} placeholder="SEFERPAKT_DEMO_... (kontrollü DEMO)" /></label>
            <div className="panelMeta" style={{ marginTop: 6 }}>Bu vardiya kontrollü DEMO hizmet kanıtıdır; gerçek saha hizmeti, GPS veya banka işlemi değildir.</div>
          </div> : null}
          {incomeActionVisible && incomeCalculationReady ? <button type="button" className="btn primary" data-testid="room-income-create" disabled={incomeBusy} onClick={createIncomeChain} style={{ marginTop: 10 }}>
            {incomeBusy ? "Oluşturuluyor..." : "Hakediş ve faturayı oluştur"}
          </button> : null}
          {incomeFeedback ? <div className="panelMeta" data-testid="room-income-feedback" aria-live="polite" style={{ marginTop: 8 }}>{incomeFeedback}</div> : null}
        </section>
      ) : null}

      {!roomSummary ? (
        <details open={detailsOpen} onToggle={(event) => setDetailsOpen(event.currentTarget.open)} style={{ marginTop: 12 }}>
          <summary style={{ cursor: "pointer", fontWeight: 800 }}>Kanıtlar ve ayrıntılar</summary>
          <div data-testid="reconciliation-evidence" style={{ marginTop: 10 }}>
            <div className="muted">Sözleşme: <b>{data.evidence?.agreement?.reference || "Veri yok"}</b></div>
            <div className="muted" style={{ marginTop: 4 }}>Operasyon kanıtı: <b>{operations.completedCount || 0} / {operations.eligibleCount || 0} tamamlandı</b></div>
            <div className="muted" style={{ marginTop: 4 }}>Hakediş kaydı: <b>{hakedisDisplay.recordLabel}</b></div>
            <div className="muted" style={{ marginTop: 4 }}>Fatura kaydı: <b>{invoiceDisplay.recordLabel}</b></div>
            {data.missingData?.length ? <div style={{ marginTop: 8, color: "#9a3412" }}><b>Eksik veri:</b> {data.missingData.map((item) => item.label).join(", ")}</div> : null}
          </div>
        </details>
      ) : null}
      {collectionEnabled && Number(data.invoice?.id || 0) > 0 ? (
        <InvoiceCollectionPanel
          invoiceId={data.invoice.id}
          token={token}
          enabled
          context={{
            companyName: data.agreement?.companyName || null,
            agreementReference: data.agreement?.reference || data.evidence?.agreement?.reference || null,
            hakedisExists: Boolean(data.hakedisPreview?.exists),
            invoiceExists: Boolean(data.invoice?.exists),
          }}
        />
      ) : null}
      <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>
        {collectionEnabled
          ? "Hakediş ve fatura yalnız açık ROOM kullanıcı onayıyla oluşturulur; tahsilat ayrı bir taslak ve onay akışıdır. KDV kanıtı yoksa net kâr kesinleştirilmez."
          : "Bu bir önizlemedir; fatura onayı, hakediş kesinleştirme, ödeme veya muhasebe kaydı oluşturmaz."}
      </div>
    </section>
  );
}
