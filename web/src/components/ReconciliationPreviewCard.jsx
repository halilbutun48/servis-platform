import { useEffect, useState } from "react";
import { getReconciliationPreview } from "../api";

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

export default function ReconciliationPreviewCard({ agreementId, token, className = "", style }) {
  const [state, setState] = useState({ requestKey: "", loading: false, data: null, error: "" });
  const [detailsOpen, setDetailsOpen] = useState(false);
  const id = Number(agreementId || 0);
  const requestKey = token && id ? `${token}:${id}` : "";

  useEffect(() => {
    if (!requestKey) {
      return undefined;
    }
    const controller = new AbortController();
    getReconciliationPreview(id, {}, { token, signal: controller.signal })
      .then((payload) => setState({ requestKey, loading: false, data: payload?.data || payload || null, error: "" }))
      .catch((error) => {
        if (error?.name === "AbortError") return;
        setState({ requestKey, loading: false, data: null, error: error?.message || "Mutabakat önizlemesi yüklenemedi." });
      });
    return () => controller.abort();
  }, [id, requestKey, token]);

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

  return (
    <section className={`card ${className}`.trim()} style={style} data-testid="reconciliation-preview-card" data-reconciliation-status={status}>
      <div className="topbar" style={{ alignItems: "flex-start" }}>
        <div>
          <div className="title">Hakediş ve fatura mutabakat önizlemesi</div>
          <div className="muted" style={{ marginTop: 4 }}>Dönem: {formatDate(data.period?.start)} - {formatDate(data.period?.end)}</div>
        </div>
        <span className={`pill ${tone}`} data-testid="reconciliation-status">{data.statusLabel || "İncelenmeli"}</span>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 12 }}>
        <Metric label="Beklenen hakediş" value={formatMoneyMinor(data.expectedAmount?.amountMinor, currency)} note="Hakediş kaynağı" />
        <Metric label="Fatura tutarı" value={formatMoneyMinor(data.invoice?.amountMinor, currency)} note="Fatura kaynağı" />
        <Metric label="Fark" value={differenceValue} note={difference.direction === "INVOICE_UNDER" ? "Fatura daha düşük" : difference.direction === "INVOICE_OVER" ? "Fatura daha yüksek" : "Karşılaştırma sonucu"} />
      </div>

      <div className="muted" style={{ marginTop: 12 }}>
        {data.reasons?.[0]?.label || "Kayıtlar sözleşme ve operasyon kanıtlarıyla birlikte değerlendirilir."}
      </div>
      {data.nextAction && data.nextAction !== "İnceleme gerekmiyor" ? (
        <button type="button" className="btn sm primary" style={{ marginTop: 10 }} onClick={() => setDetailsOpen((open) => !open)}>
          Farkı incele
        </button>
      ) : null}

      <details open={detailsOpen} onToggle={(event) => setDetailsOpen(event.currentTarget.open)} style={{ marginTop: 12 }}>
        <summary style={{ cursor: "pointer", fontWeight: 800 }}>Kanıtlar ve ayrıntılar</summary>
        <div data-testid="reconciliation-evidence" style={{ marginTop: 10 }}>
          <div className="muted">Sözleşme: <b>{data.evidence?.agreement?.reference || "Veri yok"}</b></div>
          <div className="muted" style={{ marginTop: 4 }}>Operasyon kanıtı: <b>{operations.completedCount || 0} / {operations.eligibleCount || 0} tamamlandı</b></div>
          <div className="muted" style={{ marginTop: 4 }}>Hakediş kaydı: <b>{data.hakedisPreview?.reference || "Veri yok"}</b></div>
          <div className="muted" style={{ marginTop: 4 }}>Fatura kaydı: <b>{data.invoice?.reference || "Veri yok"}</b></div>
          {data.missingData?.length ? <div style={{ marginTop: 8, color: "#9a3412" }}><b>Eksik veri:</b> {data.missingData.map((item) => item.label).join(", ")}</div> : null}
        </div>
      </details>
      <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>Bu bir önizlemedir; fatura onayı, hakediş kesinleştirme, ödeme veya muhasebe kaydı oluşturmaz.</div>
    </section>
  );
}
