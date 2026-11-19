import { useEffect, useMemo, useState } from "react";
import {
  cancelInvoiceCollectionDraft,
  confirmInvoiceCollectionDraft,
  createInvoiceCollectionDraft,
  getInvoiceCollectionSummary,
  reverseInvoiceCollection,
} from "../api";
import { getApiErrorInfo } from "../utils/apiContract";
import { useSession } from "../state/session";
import { invoiceLineageLabel, normalizeRoomCollectionOptions, roomCollectionCustomers, roomCollectionInvoicesForCustomer } from "../panels/shared/roomCollectionSelection";
import { displayCollectionAmount } from "./invoiceCollectionAmounts";

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

function newIdempotencyKey(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function readableError(error, fallback) {
  return getApiErrorInfo(error, fallback)?.message || fallback;
}

export default function InvoiceCollectionPanel({ invoiceId, invoiceOptions = [], token, enabled = false, context = {}, onSelectionChange }) {
  const { me } = useSession();
  const [state, setState] = useState({ loading: false, data: null, error: "" });
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [form, setForm] = useState({ amount: "", collectedAt: new Date().toISOString().slice(0, 10), paymentMethod: "BANK_TRANSFER", sourceRef: "" });
  const normalizedInvoiceOptions = useMemo(() => normalizeRoomCollectionOptions(invoiceOptions), [invoiceOptions]);
  const customerOptions = useMemo(() => roomCollectionCustomers(normalizedInvoiceOptions), [normalizedInvoiceOptions]);
  const initialOption = normalizedInvoiceOptions.find((option) => Number(option.invoiceId) === Number(invoiceId)) || normalizedInvoiceOptions[0] || null;
  const [selectedCustomerKey, setSelectedCustomerKey] = useState(initialOption?.customerKey || "");
  const [selectedInvoiceId, setSelectedInvoiceId] = useState(initialOption?.invoiceId || Number(invoiceId || 0) || "");
  const roomWritable = String(me?.role || "").toUpperCase() === "ROOM";
  const customerInvoices = useMemo(
    () => roomCollectionInvoicesForCustomer(normalizedInvoiceOptions, selectedCustomerKey),
    [normalizedInvoiceOptions, selectedCustomerKey],
  );
  const activeOption = normalizedInvoiceOptions.find((option) => Number(option.invoiceId) === Number(selectedInvoiceId)) || null;
  const numericInvoiceId = Number(activeOption?.invoiceId || invoiceId || 0);
  const visibleContext = {
    ...context,
    companyName: activeOption?.customerLabel || context.companyName,
    agreementReference: activeOption?.agreementId ? `Sözleşme #${activeOption.agreementId}` : context.agreementReference,
    hakedisExists: activeOption ? Boolean(activeOption.hakedisId) : context.hakedisExists,
    invoiceExists: activeOption ? true : context.invoiceExists,
    invoiceReference: activeOption?.invoiceLabel || context.invoiceReference,
    sourceLabel: activeOption?.sourceLabel || context.sourceLabel,
  };

  useEffect(() => {
    onSelectionChange?.(activeOption);
  }, [activeOption, onSelectionChange]);

  useEffect(() => {
    const nextOption = normalizedInvoiceOptions.find((option) => Number(option.invoiceId) === Number(invoiceId)) || normalizedInvoiceOptions[0] || null;
    if (!nextOption) return;
    setSelectedCustomerKey(nextOption.customerKey);
    setSelectedInvoiceId(nextOption.invoiceId);
  }, [invoiceId, normalizedInvoiceOptions]);

  useEffect(() => {
    if (!customerOptions.length) return;
    if (!customerOptions.some((option) => option.key === selectedCustomerKey)) {
      const nextCustomer = customerOptions[0];
      const nextInvoice = roomCollectionInvoicesForCustomer(normalizedInvoiceOptions, nextCustomer.key)[0];
      setSelectedCustomerKey(nextCustomer.key);
      setSelectedInvoiceId(nextInvoice?.invoiceId || "");
      return;
    }
    if (!customerInvoices.some((option) => Number(option.invoiceId) === Number(selectedInvoiceId))) {
      setSelectedInvoiceId(customerInvoices[0]?.invoiceId || "");
    }
  }, [customerInvoices, customerOptions, normalizedInvoiceOptions, selectedCustomerKey, selectedInvoiceId]);

  const load = () => {
    if (!token || !numericInvoiceId || !enabled) return;
    setState({ loading: true, data: null, error: "" });
    getInvoiceCollectionSummary(numericInvoiceId, { token })
      .then((data) => setState({ loading: false, data, error: "" }))
      .catch((error) => setState({ loading: false, data: null, error: readableError(error, "Tahsilat kaydı okunamadı.") }));
  };

  useEffect(() => {
    load();
    // load is intentionally scoped to the selected invoice and current token.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, numericInvoiceId, token]);

  const rows = useMemo(
    () => (Array.isArray(state.data?.records) ? state.data.records : []),
    [state.data?.records],
  );
  const foundationBlocked = /henüz kurulmadı|altyapısı/i.test(String(state.error || ""));
  const formReady = roomWritable && !foundationBlocked && Boolean(state.data);
  const draftRows = useMemo(() => rows.filter((row) => String(row?.status || "").toUpperCase() === "DRAFT"), [rows]);

  async function createDraft() {
    const amountMinor = minorFromInput(form.amount);
    if (!amountMinor) {
      setFeedback("Tahsilat tutarı sıfırdan büyük olmalı.");
      return;
    }
    if (!form.collectedAt) {
      setFeedback("Ödeme tarihi girin.");
      return;
    }
    const remainingMinor = displayCollectionAmount(state.data?.receivableAmountMinor);
    const pendingDraftMinor = draftRows.reduce((sum, row) => sum + (displayCollectionAmount(row?.amountMinor, 0) || 0), 0);
    if (remainingMinor !== null && amountMinor + pendingDraftMinor > remainingMinor) {
      setFeedback("Tahsilat tutarı kalan alacaktan fazla olamaz.");
      return;
    }
    setBusy(true);
    setFeedback("");
    try {
      const result = await createInvoiceCollectionDraft(numericInvoiceId, {
        amountMinor,
        currencyCode: String(state.data?.currencyCode || "TRY").toUpperCase(),
        collectedAt: form.collectedAt,
        paymentMethod: form.paymentMethod,
        sourceRef: form.sourceRef.trim(),
        idempotencyKey: newIdempotencyKey("room-collection"),
      }, { token });
      setFeedback(`Taslak hazırlandı: ${moneyMinor(result?.item?.amountMinor, result?.item?.currencyCode || "TRY")}. Açık onay bekliyor.`);
      setForm((previous) => ({ ...previous, amount: "", sourceRef: "" }));
      load();
    } catch (error) {
      setFeedback(readableError(error, "Tahsilat taslağı oluşturulamadı."));
    } finally {
      setBusy(false);
    }
  }

  async function confirmDraft(row) {
    setBusy(true);
    setFeedback("");
    try {
      await confirmInvoiceCollectionDraft(row.id, { token });
      setFeedback("Tahsilat doğrulandı; kalan alacak yeniden hesaplandı.");
      load();
    } catch (error) {
      setFeedback(readableError(error, "Tahsilat doğrulanamadı."));
    } finally {
      setBusy(false);
    }
  }

  async function cancelDraft(row) {
    setBusy(true);
    setFeedback("");
    try {
      await cancelInvoiceCollectionDraft(row.id, "Kullanıcı taslağı iptal etti.", { token });
      setFeedback("Tahsilat taslağı iptal edildi; ekonomik toplam değişmedi.");
      load();
    } catch (error) {
      setFeedback(readableError(error, "Tahsilat taslağı iptal edilemedi."));
    } finally {
      setBusy(false);
    }
  }

  async function reverseRow(row) {
    setBusy(true);
    setFeedback("");
    try {
      await reverseInvoiceCollection(row.id, { idempotencyKey: newIdempotencyKey("room-collection-reversal"), reason: "Kullanıcı tarafından denetlenebilir ters kayıt" }, { token });
      setFeedback("Ters kayıt oluşturuldu; tahsilat geçmişi korunarak bakiye güncellendi.");
      load();
    } catch (error) {
      setFeedback(readableError(error, "Tahsilat ters kaydı oluşturulamadı."));
    } finally {
      setBusy(false);
    }
  }

  if (!enabled || !numericInvoiceId) return null;

  const previousCollections = state.data?.status === "RECONCILIATION_MISMATCH"
    ? null
    : displayCollectionAmount(state.data?.collectedAmountMinor, 0);
  const invoiceAmount = displayCollectionAmount(state.data?.invoiceAmountMinor);
  const remainingReceivable = state.data?.status === "RECONCILIATION_MISMATCH"
    ? null
    : displayCollectionAmount(state.data?.receivableAmountMinor, invoiceAmount);

  return (
    <section className="card" data-testid="invoice-collection-panel" style={{ marginTop: 12, border: "1px solid rgba(98,117,255,.28)" }}>
      <div className="panelSectionTitle">Tahsilat Kaydet</div>
      <div className="panelMeta" style={{ marginTop: 5 }}>
        Faturaya bağlı tahsilat ve kalan alacak. Fatura, hakediş veya teklif yerine geçmez.
      </div>
      {normalizedInvoiceOptions.length ? (
        <div data-testid="invoice-collection-selection" className="card" style={{ marginTop: 10, border: "1px solid var(--border, #d9dee8)", display: "grid", gap: 8 }}>
          <label className="field">Müşteri
            <select data-testid="invoice-collection-company" value={selectedCustomerKey} onChange={(event) => {
              const nextCustomerKey = event.target.value;
              const nextInvoice = roomCollectionInvoicesForCustomer(normalizedInvoiceOptions, nextCustomerKey)[0];
              setSelectedCustomerKey(nextCustomerKey);
              setSelectedInvoiceId(nextInvoice?.invoiceId || "");
              onSelectionChange?.(nextInvoice || null);
            }}>
              {customerOptions.map((option) => <option key={option.key} value={option.key}>{option.label}</option>)}
            </select>
          </label>
          <label className="field">Tahsilat yapılacak fatura
            <select data-testid="invoice-collection-invoice" value={selectedInvoiceId} onChange={(event) => {
              const nextInvoiceId = Number(event.target.value);
              const nextInvoice = normalizedInvoiceOptions.find((option) => Number(option.invoiceId) === nextInvoiceId) || null;
              setSelectedInvoiceId(nextInvoiceId);
              onSelectionChange?.(nextInvoice);
            }}>
              {customerInvoices.map((option) => <option key={option.invoiceId} value={option.invoiceId}>{option.invoiceLabel}</option>)}
            </select>
          </label>
        </div>
      ) : null}
      <div className="card" data-testid="invoice-collection-context" style={{ marginTop: 10, border: "1px solid var(--border, #d9dee8)" }}>
        <div><span className="muted">Müşteri</span><br /><b>{visibleContext.companyName || "Müşteri kaydı bağlı"}</b></div>
        <div style={{ marginTop: 6 }}><span className="muted">Fatura</span><br /><b>{visibleContext.invoiceReference || (visibleContext.invoiceExists ? `Fatura #${numericInvoiceId}` : "Fatura kaydı yok")}</b></div>
        <div style={{ marginTop: 6 }}><span className="muted">Sözleşme</span><br /><b>{visibleContext.agreementReference || "Sözleşme kaydı bağlı"}</b></div>
        <div style={{ marginTop: 6 }}><span className="muted">Hakediş</span><br /><b>{visibleContext.hakedisExists ? `Hakediş #${activeOption?.hakedisId || "bağlı"}` : "Hakediş kaydı yok"}</b></div>
        {activeOption ? <div data-testid="invoice-collection-offer-lineage" className="panelMeta" style={{ marginTop: 8 }}>{invoiceLineageLabel(activeOption)}</div> : null}
        {visibleContext.sourceLabel ? <div data-testid="invoice-collection-source-label" className="panelMeta" style={{ marginTop: 8 }}>{visibleContext.sourceLabel}</div> : null}
      </div>
      <div className="panelMeta" data-testid="invoice-collection-verification-mode" style={{ marginTop: 6 }}>
        Manuel tahsilat kaydı · banka tarafından doğrulanmış ödeme bağlantısı yok
      </div>
      {state.data?.partyBinding?.status === "READY" ? (
        <div className="panelMeta" data-testid="invoice-collection-party-binding" style={{ marginTop: 8, lineHeight: 1.45 }}>
          Faturayı düzenleyen: <b>{state.data.partyBinding.issuer?.name || "ROOM"}</b> · Borçlu: <b>{state.data.partyBinding.debtor?.name || "COMPANY"}</b> · Ödeme yönü: hizmet alan firmadan taşımacılık firmasına
        </div>
      ) : state.data?.partyBinding ? (
        <div className="panelMeta" data-testid="invoice-collection-party-binding-missing" style={{ marginTop: 8 }}>
          Faturanın sözleşme ve ticari taraf bağlantısı doğrulanamadı; tahsilat güvenli olarak bekletiliyor.
        </div>
      ) : null}
      {state.loading ? <div className="panelMeta" style={{ marginTop: 10 }}>Tahsilat kanıtı okunuyor...</div> : null}
      {state.error ? (
        <div className="panelMeta" data-testid="invoice-collection-foundation-status" style={{ marginTop: 10 }}>
          {foundationBlocked ? "Tahsilat altyapısı bu çalışma ortamında henüz kurulmadı; ödeme kaydı oluşturulmadı." : state.error}
        </div>
      ) : null}
      {!state.loading && !state.error && state.data ? (
        <>
          <div data-testid="invoice-collection-financial-summary" className="card" style={{ display: "grid", gap: 8, marginTop: 10, background: "rgba(127,127,127,.08)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><span className="muted">Fatura tutarı</span><b>{moneyMinor(invoiceAmount, state.data.currencyCode)}</b></div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}><span className="muted">Önceki tahsilatlar</span><b data-testid="invoice-collection-collected">{moneyMinor(previousCollections, state.data.currencyCode)}</b></div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, borderTop: "1px solid var(--border, #d9dee8)", paddingTop: 8 }}><span><b>Kalan alacak</b></span><b data-testid="invoice-collection-receivable">{moneyMinor(remainingReceivable, state.data.currencyCode)}</b></div>
          </div>
          {state.data.status === "UNAVAILABLE" ? <div className="panelMeta" style={{ marginTop: 8 }}>Doğrulanmış tahsilat kaydı yok; ödeme sıfır kabul edilmedi.</div> : null}
          {state.data.status === "RECONCILIATION_MISMATCH" ? <div className="panelMeta" style={{ marginTop: 8 }}>Tahsilat ve fatura mutabık değil; bakiye doğrulanamıyor.</div> : null}
          {rows.length ? (
            <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
              {rows.map((row) => (
                <div key={row.id} data-testid={`invoice-collection-row-${row.id}`} style={{ display: "flex", justifyContent: "space-between", gap: 8, flexWrap: "wrap", borderTop: "1px solid var(--border, #d9dee8)", paddingTop: 8 }}>
                  <span>{row.direction === "REVERSAL" ? "Ters kayıt" : row.status === "DRAFT" ? "Taslak tahsilat" : "Tahsilat"} · {moneyMinor(row.amountMinor, row.currencyCode)} · {row.collectedAt || "Tarih yok"} · {row.verificationMode === "BANK_VERIFIED" ? "Banka doğrulandı" : "Manuel kayıt"}</span>
                  {roomWritable && row.status === "DRAFT" ? <span style={{ display: "flex", gap: 6 }}><button type="button" className="btn sm primary" disabled={busy} onClick={() => confirmDraft(row)}>Açık ONAYLA</button><button type="button" className="btn sm ghost" disabled={busy} onClick={() => cancelDraft(row)}>İptal</button></span> : null}
                  {roomWritable && row.status === "CONFIRMED" && row.direction === "COLLECTION" ? <button type="button" className="btn sm ghost" disabled={busy} onClick={() => reverseRow(row)}>Ters kayıt</button> : null}
                </div>
              ))}
            </div>
          ) : null}
          {formReady ? (
            <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
              <div className="panelSectionTitle">Faturaya tahsilat ekle</div>
              <div className="fieldRow" style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                <label className="field">Tutar<input data-testid="invoice-collection-amount" inputMode="decimal" value={form.amount} onChange={(event) => setForm((previous) => ({ ...previous, amount: event.target.value }))} placeholder="örn. 50.000,00" /></label>
                <label className="field">Tarih<input data-testid="invoice-collection-date" type="date" value={form.collectedAt} onChange={(event) => setForm((previous) => ({ ...previous, collectedAt: event.target.value }))} /></label>
              </div>
              <div className="fieldRow" style={{ display: "grid", gap: 8, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
                <label className="field">Ödeme yöntemi<select value={form.paymentMethod} onChange={(event) => setForm((previous) => ({ ...previous, paymentMethod: event.target.value }))}><option value="BANK_TRANSFER">Banka transferi</option><option value="CASH">Nakit</option><option value="CARD">Kart</option><option value="OTHER">Diğer</option></select></label>
                <label className="field">Dekont / işlem referansı (isteğe bağlı)<input data-testid="invoice-collection-source-ref" value={form.sourceRef} onChange={(event) => setForm((previous) => ({ ...previous, sourceRef: event.target.value }))} placeholder="Varsa dekont veya iç referans" /></label>
              </div>
              <div className="panelMeta">Kaydetme iki adımda tamamlanır: önce taslak hazırlanır, ardından açık onayla kesinleştirilir.</div>
              <button type="button" className="btn primary" data-testid="invoice-collection-submit" disabled={busy} onClick={createDraft}>Tahsilatı Kaydet</button>
            </div>
          ) : null}
        </>
      ) : null}
      {feedback ? <div className="panelMeta" aria-live="polite" style={{ marginTop: 10 }}>{feedback}</div> : null}
      {draftRows.length ? <div className="panelMeta" style={{ marginTop: 8 }}>{draftRows.length} taslak açık onay bekliyor.</div> : null}
    </section>
  );
}
