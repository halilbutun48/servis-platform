function toNumber(value, fallback = 0) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

function fmtTry(value) {
  const n = toNumber(value, null)
  if (n == null) return "-"
  return `₺${n.toLocaleString("tr-TR")}`
}

function fmtBps(value) {
  const n = toNumber(value, 0)
  const pct = n / 100
  return `%${pct.toLocaleString("tr-TR", { minimumFractionDigits: pct % 1 ? 2 : 0, maximumFractionDigits: 2 })}`
}

function sourceTypeLabel(value) {
  const v = String(value || "").toUpperCase()
  if (v === "AGREEMENT") return "Sözleşme"
  if (v === "SHIFT_SERIES") return "Vardiya serisi"
  return v || "Ticari kaynak"
}

export default function CommercialReadonlySummary({ item, compact = false }) {
  if (!item) return null
  const plan = item.settlementPlan || null
  const paymentMode = String(item.paymentModeSnapshot || "OFF").toUpperCase()
  const settlementStatus = String(item.settlementStatus || plan?.status || "DORMANT").toUpperCase()
  const grossAmount = plan?.grossAmount ?? item.amountCompanySnapshot ?? null
  const commissionAmount = plan?.commissionAmount ?? null
  const providerNetAmount = plan?.providerNetAmount ?? item.amountProviderSnapshot ?? null

  return (
    <div className="card" style={{ marginTop: compact ? 6 : 8, padding: compact ? 8 : 10 }} title="Payment backbone readonly özeti">
      <div className="row" style={{ justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ fontWeight: 800 }}>{sourceTypeLabel(item.sourceType)}</div>
        <span className="pill" data-status={paymentMode} title="Payment mode snapshot">
          {paymentMode}
        </span>
      </div>
      <div className="muted" style={{ marginTop: 6 }}>
        Komisyon snapshot: <b>{fmtBps(item.commissionBpsSnapshot)}</b>
      </div>
      <div className="muted" style={{ marginTop: 4 }}>
        Tahsilat: <b>{fmtTry(grossAmount)}</b> • Platform: <b>{fmtTry(commissionAmount)}</b> • Sağlayıcı: <b>{fmtTry(providerNetAmount)}</b>
      </div>
      <div className="muted" style={{ marginTop: 4 }}>
        Settlement hazırlığı: <b>{settlementStatus}</b> • Adaptör: <b>{String(item.providerAdapterKey || plan?.providerAdapterKey || "DORMANT")}</b>
      </div>
      {paymentMode === "OPTIONAL" ? (
        <div className="muted" style={{ marginTop: 4 }}>
          Opsiyonel ödeme pilotu: <b>{settlementStatus === "READY" ? "Hazır" : "Beklemede"}</b>
        </div>
      ) : null}
      {paymentMode === "REQUIRED" ? (
        <div className="muted" style={{ marginTop: 4 }}>
          Zorunlu ödeme rollout'u: <b>{settlementStatus === "ACTIVE" ? "Aktif" : settlementStatus === "DISABLED" ? "Durduruldu" : "Beklemede"}</b>
        </div>
      ) : null}
      {!compact && item.sourceKey ? (
        <div className="muted" style={{ marginTop: 4 }}>
          Kaynak anahtarı: {item.sourceKey}
        </div>
      ) : null}
    </div>
  )
}
