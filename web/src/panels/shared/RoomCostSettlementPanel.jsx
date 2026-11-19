import { useCallback, useEffect, useMemo, useState } from "react";
import { api } from "../../api";

const BASE = "/api/commercial-core/room/financial-operations/costs";

function formatMinor(value, currencyCode = "TRY") {
  const amount = Number(value);
  if (!Number.isSafeInteger(amount)) return "Belirsiz";
  const formatted = new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount / 100);
  return `${formatted} ${String(currencyCode).toUpperCase() === "TRY" ? "₺" : String(currencyCode).toUpperCase()}`;
}

function formatDate(value) {
  if (!value) return "Dönem belirtilmemiş";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Dönem belirtilmemiş" : date.toLocaleDateString("tr-TR");
}

function periodLabel(item) {
  const start = formatDate(item?.periodStart || item?.occurredAt);
  const end = formatDate(item?.periodEnd || item?.occurredAt);
  return start === end ? start : `${start} – ${end}`;
}

export default function RoomCostSettlementPanel({ token, onChanged }) {
  const [data, setData] = useState({ items: [], candidates: { accruals: [], actuals: [] } });
  const [accrualId, setAccrualId] = useState("");
  const [actualId, setActualId] = useState("");
  const [amountMajor, setAmountMajor] = useState("");
  const [evidenceRef, setEvidenceRef] = useState("");
  const [reason, setReason] = useState("");
  const [settlementRef, setSettlementRef] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const response = await api.get(`${BASE}/settlements`, { token });
      setData({ items: response?.items || [], candidates: response?.candidates || { accruals: [], actuals: [] } });
    } catch (loadError) {
      setError(loadError?.message || "Mahsup kayıtları okunamadı.");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const selectedAccrual = useMemo(() => data.candidates.accruals.find((item) => String(item.id) === String(accrualId)) || null, [data.candidates.accruals, accrualId]);
  const selectedActual = useMemo(() => data.candidates.actuals.find((item) => String(item.id) === String(actualId)) || null, [data.candidates.actuals, actualId]);
  const maxAmountMinor = Math.min(Number(selectedAccrual?.outstandingMinor || 0), Number(selectedActual?.outstandingMinor || 0));

  function parseMajor(value) {
    const normalized = String(value || "").trim().replace(/\./g, "").replace(",", ".");
    const number = Number(normalized);
    return Number.isFinite(number) && number > 0 ? Math.round(number * 100) : null;
  }

  async function createSettlement() {
    setError("");
    setNotice("");
    const amountMinor = parseMajor(amountMajor);
    if (!selectedAccrual || !selectedActual) return setError("Önce bir karşılık ve gerçekleşen kayıt seçin.");
    if (!amountMinor || amountMinor > maxAmountMinor) return setError(`Mahsup tutarı kalan ${formatMinor(maxAmountMinor)} tutarı aşamaz.`);
    if (!evidenceRef.trim() || !reason.trim() || !settlementRef.trim()) return setError("Kanıt, gerekçe ve mahsup referansı gereklidir.");
    if (confirmation.trim().toUpperCase() !== "MAHSUPLA") return setError("İşlemi tamamlamak için MAHSUPLA yazın.");
    setBusy(true);
    try {
      const response = await api.post(`${BASE}/settlements`, {
        accrualEntryId: selectedAccrual.id,
        actualEntryId: selectedActual.id,
        settledAmountMinor: amountMinor,
        currencyCode: selectedAccrual.currencyCode,
        settlementRef: settlementRef.trim(),
        idempotencyKey: `room-settlement-${settlementRef.trim()}`,
        evidenceRef: evidenceRef.trim(),
        reason: reason.trim(),
        confirmed: true,
        confirmationToken: "MAHSUPLA",
      }, { token });
      setNotice(response?.idempotent ? "Bu mahsup daha önce kaydedilmişti; ikinci ekonomik kayıt oluşturulmadı." : "Karşılık ile gerçekleşen gider kanıtlı biçimde mahsup edildi.");
      setConfirmation("");
      setAmountMajor("");
      setEvidenceRef("");
      setReason("");
      setSettlementRef("");
      await load();
      onChanged?.(response);
    } catch (saveError) {
      setError(saveError?.message || "Mahsup kaydedilemedi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="finance-v21-expense-composer" data-testid="room-cost-settlement-panel" aria-labelledby="room-cost-settlement-title">
      <div className="finance-v21-card-head">
        <div>
          <div className="finance-v21-eyebrow">Muhasebe hareketi</div>
          <h3 id="room-cost-settlement-title">Karşılığı gerçekleşen giderle mahsup et</h3>
          <p>İki kayıt ayrı kalır; yalnız kanıtlı mahsup ilişkisi kurulur. Gerçekleşen gider toplamı ikinci kez artırılmaz.</p>
        </div>
        <strong>{loading ? "Yükleniyor..." : `${data.items.length} mahsup`}</strong>
      </div>
      <div className="finance-v21-form-grid">
        <label>Karşılık kaydı<select data-testid="room-settlement-accrual" value={accrualId} onChange={(event) => setAccrualId(event.target.value)} disabled={busy || loading}><option value="">Karşılık seçin</option>{data.candidates.accruals.map((item) => <option key={item.id} value={item.id}>{item.categoryLabel} · {periodLabel(item)} · kalan {formatMinor(item.outstandingMinor, item.currencyCode)}</option>)}</select></label>
        <label>Gerçekleşen gider<select data-testid="room-settlement-actual" value={actualId} onChange={(event) => setActualId(event.target.value)} disabled={busy || loading}><option value="">Gerçekleşen kayıt seçin</option>{data.candidates.actuals.map((item) => <option key={item.id} value={item.id}>{item.categoryLabel} · {periodLabel(item)} · kalan {formatMinor(item.outstandingMinor, item.currencyCode)}</option>)}</select></label>
        <label>Mahsup tutarı (₺)<input data-testid="room-settlement-amount" inputMode="decimal" value={amountMajor} onChange={(event) => setAmountMajor(event.target.value)} placeholder={maxAmountMinor ? formatMinor(maxAmountMinor) : "örn. 1.000"} /></label>
        <label>Mahsup referansı<input data-testid="room-settlement-ref" value={settlementRef} onChange={(event) => setSettlementRef(event.target.value)} placeholder="Örn. Eylül yakıt mahsup" /></label>
        <label>Kanıt referansı<input data-testid="room-settlement-evidence" value={evidenceRef} onChange={(event) => setEvidenceRef(event.target.value)} placeholder="Fatura veya iç belge" /></label>
        <label className="finance-v21-form-full">Gerekçe<textarea data-testid="room-settlement-reason" value={reason} onChange={(event) => setReason(event.target.value)} rows={2} placeholder="Gerçekleşen kaydın karşılığı nasıl kapattığını açıklayın" /></label>
        <label>Açık onay<input data-testid="room-settlement-confirmation" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="MAHSUPLA" /></label>
      </div>
      {selectedAccrual && selectedActual ? <div className="finance-v21-form-note" data-testid="room-settlement-lineage-preview">Kaynak dönemleri korunur: karşılık {periodLabel(selectedAccrual)}, gerçekleşen gider {periodLabel(selectedActual)}. En fazla {formatMinor(maxAmountMinor, selectedActual.currencyCode)} mahsup edilebilir.</div> : null}
      {error ? <div className="finance-v21-expense-message finance-v21-expense-message--error" role="alert">{error}</div> : null}
      {notice ? <div className="finance-v21-expense-message" role="status">{notice}</div> : null}
      <div className="finance-v21-form-actions"><button type="button" className="btn primary" data-testid="room-settlement-submit" onClick={createSettlement} disabled={busy || loading}>{busy ? "Kaydediliyor..." : "Mahsup kaydını onayla"}</button></div>
      {data.items.length ? <div className="finance-v21-draft-list" data-testid="room-settlement-history">{data.items.map((item) => <div className="finance-v21-draft-row" key={item.id}><div><strong>{item.accrual?.categoryLabel || "Karşılık"} → {item.actual?.categoryLabel || "Gerçekleşen gider"}</strong><small>{periodLabel(item.accrual)} · {periodLabel(item.actual)} · {item.status === "CONFIRMED" ? "Onaylı mahsup" : "İptal edildi"}</small></div><b>{formatMinor(item.settledAmountMinor, item.currencyCode)}</b></div>)}</div> : <div className="finance-v21-form-note">Henüz kanıtlı mahsup kaydı yok.</div>}
    </section>
  );
}
