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
  return v === "" ? "Ticari kaynak" : "Diğer ticari kaynak"
}

function paymentModeLabel(value) {
  const v = String(value || "OFF").toUpperCase()
  if (v === "OFF") return "Kapalı"
  if (v === "OPTIONAL") return "İsteğe bağlı"
  if (v === "REQUIRED") return "Zorunlu"
  if (v === "PREVIEW") return "Sadece önizleme"
  return "Ödeme modu"
}

function settlementStatusLabel(value) {
  const v = String(value || "DORMANT").toUpperCase()
  if (v === "DORMANT") return "Beklemede"
  if (v === "READY") return "Hazır"
  if (v === "ACTIVE") return "Etkin"
  if (v === "DISABLED") return "Kapalı"
  if (v === "PENDING") return "Beklemede"
  if (v === "PLANNED") return "Planlandı"
  return "Durum bilgisi"
}

function adapterLabel(value) {
  const v = String(value || "DORMANT").toUpperCase()
  if (v === "DORMANT") return "Beklemede"
  if (v === "READY") return "Hazır"
  if (v === "ACTIVE") return "Etkin"
  if (v === "DISABLED") return "Kapalı"
  return "Bağlantı durumu"
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
    <div className="card" style={{ marginTop: compact ? 6 : 8, padding: compact ? 8 : 10 }} title="Ödeme bilgisi yalnızca önizleme özetidir">
      <div className="row" style={{ justifyContent: "space-between", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <div style={{ fontWeight: 800 }}>{sourceTypeLabel(item.sourceType)}</div>
        <span className="pill" data-status={paymentMode} title="Ödeme modu durumu">
          {paymentModeLabel(paymentMode)}
        </span>
      </div>
      <div className="muted" style={{ marginTop: 6 }}>
        Komisyon özeti: <b>{fmtBps(item.commissionBpsSnapshot)}</b>
      </div>
      <div className="muted" style={{ marginTop: 4 }}>
        Tahsilat: <b>{fmtTry(grossAmount)}</b> • Platform: <b>{fmtTry(commissionAmount)}</b> • Sağlayıcı: <b>{fmtTry(providerNetAmount)}</b>
      </div>
      <div className="muted" style={{ marginTop: 4 }}>
        Ödeme / mutabakat hazırlığı: <b>{settlementStatusLabel(settlementStatus)}</b> • Bağlantı: <b>{adapterLabel(item.providerAdapterKey || plan?.providerAdapterKey || "DORMANT")}</b>
      </div>
      {paymentMode === "OPTIONAL" ? (
        <div className="muted" style={{ marginTop: 4 }}>
          Opsiyonel ödeme pilotu: <b>{settlementStatus === "READY" ? "Hazır" : "Beklemede"}</b>
        </div>
      ) : null}
      {paymentMode === "REQUIRED" ? (
        <div className="muted" style={{ marginTop: 4 }}>
          Zorunlu ödeme geçişi: <b>{settlementStatus === "ACTIVE" ? "Aktif" : settlementStatus === "DISABLED" ? "Durduruldu" : "Beklemede"}</b>
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
