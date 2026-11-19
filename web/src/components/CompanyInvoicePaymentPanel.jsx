import { useEffect, useState } from "react";
import {
  createCompanyPaymentDeclarationDraft,
  getCompanyInvoicePaymentSummary,
} from "../api";
import { getApiErrorInfo } from "../utils/apiContract";
import { useSession } from "../state/session";

function moneyMinor(value, currencyCode = "TRY") {
  if (value == null || !Number.isSafeInteger(Number(value))) return "Doğrulanamıyor";
  const formatted = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(value) / 100);
  return currencyCode === "TRY" ? `${formatted} ₺` : `${formatted} ${currencyCode}`;
}

function minorFromInput(value) {
  const normalized = String(value || "").trim().replace(/\./g, "").replace(",", ".");
  const number = Number(normalized);
  if (!Number.isFinite(number) || number <= 0) return null;
  const minor = Math.round(number * 100);
  return Number.isSafeInteger(minor) && minor > 0 ? minor : null;
}

function readableError(error) {
  return getApiErrorInfo(error, "Ödeme beyanı oluşturulamadı.")?.message || "Ödeme beyanı oluşturulamadı.";
}

function newIdempotencyKey() {
  return `company-payment-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function CompanyInvoicePaymentPanel({
  invoiceId,
  token,
  agreementId = null,
  hakedisId = null,
  onSelectInvoice = null,
  selected = false,
  onChanged = null,
}) {
  const { me } = useSession();
  const [state, setState] = useState({ loading: false, data: null, error: "" });
  const [form, setForm] = useState({ amount: "", collectedAt: new Date().toISOString().slice(0, 10), paymentMethod: "BANK_TRANSFER", sourceRef: "" });
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const numericInvoiceId = Number(invoiceId || 0);
  const companyWritable = String(me?.role || "").toUpperCase() === "COMPANY";

  function load() {
    if (!token || !numericInvoiceId) return;
    setState((previous) => ({ ...previous, loading: true, error: "" }));
    getCompanyInvoicePaymentSummary(numericInvoiceId, { token })
      .then((data) => setState({ loading: false, data, error: "" }))
      .catch((error) => setState({ loading: false, data: null, error: readableError(error) }));
  }

  useEffect(() => {
    load();
    // load is scoped to the selected invoice and current token.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numericInvoiceId, token]);

  if (!numericInvoiceId) return null;
  const data = state.data;
  const partyBinding = data?.partyBinding || null;
  const declaration = data?.paymentDeclaration || {};
  const currencyCode = String(data?.currencyCode || "TRY").toUpperCase();
  const confirmedAmountMinor = data?.collectedAmountMinor;
  const declaredAmountMinor = declaration.status === "PENDING_ROOM_CONFIRMATION" ? declaration.amountMinor : null;
  const pendingAmountMinor = declaration.pendingAmountMinor ?? declaredAmountMinor;
  const remainingAmountMinor = data?.receivableAmountMinor;
  const sourceLabel = String(data?.sourceLabel || "").trim();
  const rows = Array.isArray(data?.records) ? data.records : [];

  function selectInvoiceContext() {
    onSelectInvoice?.({
      invoiceId: numericInvoiceId,
      agreementId: Number(agreementId || 0) || null,
      hakedisId: Number(hakedisId || 0) || null,
      customerLabel: partyBinding?.debtor?.name || "Hizmet alan",
      sourceLabel,
    });
  }

  async function submit() {
    const amountMinor = minorFromInput(form.amount);
    if (!amountMinor) {
      setFeedback("Ödeme tutarı sıfırdan büyük olmalı.");
      return;
    }
    if (!form.collectedAt) {
      setFeedback("Ödeme tarihini girin.");
      return;
    }
    setBusy(true);
    setFeedback("");
    try {
      await createCompanyPaymentDeclarationDraft(numericInvoiceId, {
        amountMinor,
        currencyCode,
        collectedAt: form.collectedAt,
        paymentMethod: form.paymentMethod,
        sourceRef: form.sourceRef.trim(),
        idempotencyKey: newIdempotencyKey(),
      }, { token });
      setForm((previous) => ({ ...previous, amount: "", sourceRef: "" }));
      setFeedback("Ödeme beyanı kaydedildi. ROOM onayı olmadan alınmış ödeme sayılmaz.");
      load();
      onChanged?.();
    } catch (error) {
      setFeedback(readableError(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card" data-testid="company-invoice-payment-panel" style={{ marginTop: 12, border: "1px solid rgba(98,117,255,.28)" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        <div className="panelSectionTitle">Bu hizmetin faturası ve ödeme durumu</div>
        {typeof onSelectInvoice === "function" ? (
          <button
            type="button"
            className={`btn sm ${selected ? "primary" : "ghost"}`}
            data-testid={`company-finance-select-invoice-${numericInvoiceId}`}
            aria-pressed={selected ? "true" : "false"}
            onClick={selectInvoiceContext}
          >
            {selected ? `Sefer Abi bağlamı: Fatura #${numericInvoiceId}` : `Fatura #${numericInvoiceId}'yı Sefer Abi'de seç`}
          </button>
        ) : null}
      </div>
      <div className="panelMeta" style={{ marginTop: 5, lineHeight: 1.45 }}>
        Tek fatura aynı sözleşmeye bağlıdır; COMPANY beyanı ile ROOM onayı ayrı gösterilir.
      </div>
      {state.loading ? <div className="panelMeta" style={{ marginTop: 10 }}>Fatura ve ödeme durumu okunuyor...</div> : null}
      {state.error ? <div className="panelMeta" style={{ marginTop: 10 }}>{state.error}</div> : null}
      {!state.loading && !state.error && data ? (
        <>
          {sourceLabel ? (
            <div className="panelMeta" data-testid="company-invoice-source-label" style={{ marginTop: 10, color: "#8b5a00" }}>
              {sourceLabel}
            </div>
          ) : null}
          {partyBinding?.status === "READY" ? (
            <div className="card" data-testid="company-invoice-party-binding" style={{ marginTop: 10, border: "1px solid var(--border, #d9dee8)" }}>
              <div><span className="muted">Faturayı düzenleyen</span><br /><b>{partyBinding.issuer?.name || "ROOM"}</b></div>
              <div style={{ marginTop: 6 }}><span className="muted">Borçlu hizmet alan</span><br /><b>{partyBinding.debtor?.name || "COMPANY"}</b></div>
              <div className="panelMeta" style={{ marginTop: 6 }}>Ödeme yönü: Hizmet alan firmadan taşımacılık firmasına</div>
            </div>
          ) : (
            <div className="panelMeta" data-testid="company-invoice-party-binding-missing" style={{ marginTop: 10 }}>
              Faturanın sözleşme ve ticari taraf bağlantısı doğrulanamadı; ödeme beyanı oluşturulmadı.
            </div>
          )}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 10 }}>
            <div><span className="muted">Fatura tutarı</span><br /><b>{moneyMinor(data.invoiceAmountMinor, currencyCode)}</b></div>
            <div><span className="muted">ROOM tarafından onaylanan tahsilat</span><br /><b>{moneyMinor(confirmedAmountMinor, currencyCode)}</b></div>
            <div><span className="muted">Kalan borç</span><br /><b>{moneyMinor(remainingAmountMinor, currencyCode)}</b></div>
          </div>
          {pendingAmountMinor != null ? (
            <div className="panelMeta" data-testid="company-payment-pending" style={{ marginTop: 8 }}>
              {moneyMinor(pendingAmountMinor, currencyCode)} ödeme beyanı bekliyor. ROOM onayı gelmeden bakiye değişmez; banka doğrulaması yapılmış sayılmaz.
            </div>
          ) : null}
          {declaration.status === "ROOM_CONFIRMED_MANUAL" ? (
            <div className="panelMeta" data-testid="company-payment-confirmed" style={{ marginTop: 8 }}>
              ROOM tarafından manuel olarak onaylandı; banka entegrasyonu bulunmadığı için banka doğrulaması değildir.
            </div>
          ) : null}
          {rows.length ? (
            <div className="panelMeta" style={{ marginTop: 8 }}>
              {rows.length} ödeme kaydı aynı faturaya bağlı; mükerrer kayıt oluşturulmaz.
            </div>
          ) : null}
          {companyWritable && partyBinding?.status === "READY" ? (
            <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
              <div className="panelSectionTitle">Ödeme beyanı ekle</div>
              <div className="fieldRow" style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                <label className="field">Tutar<input data-testid="company-payment-amount" inputMode="decimal" value={form.amount} onChange={(event) => setForm((previous) => ({ ...previous, amount: event.target.value }))} placeholder="örn. 50.000,00" /></label>
                <label className="field">Ödeme tarihi<input data-testid="company-payment-date" type="date" value={form.collectedAt} onChange={(event) => setForm((previous) => ({ ...previous, collectedAt: event.target.value }))} /></label>
              </div>
              <div className="fieldRow" style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                <label className="field">Ödeme yöntemi<select value={form.paymentMethod} onChange={(event) => setForm((previous) => ({ ...previous, paymentMethod: event.target.value }))}><option value="BANK_TRANSFER">Banka transferi</option><option value="CASH">Nakit</option><option value="CARD">Kart</option><option value="OTHER">Diğer</option></select></label>
                <label className="field">Dekont / işlem referansı (isteğe bağlı)<input data-testid="company-payment-source-ref" value={form.sourceRef} onChange={(event) => setForm((previous) => ({ ...previous, sourceRef: event.target.value }))} placeholder="Varsa dekont veya iç referans" /></label>
              </div>
              <button type="button" className="btn primary" disabled={busy} onClick={submit}>{busy ? "Kaydediliyor..." : "Ödeme beyanını kaydet"}</button>
            </div>
          ) : null}
        </>
      ) : null}
      {feedback ? <div className="panelMeta" aria-live="polite" style={{ marginTop: 10 }}>{feedback}</div> : null}
    </section>
  );
}
