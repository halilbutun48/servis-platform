function CountCard({ label, value, note }) {
  return (
    <div className="card" style={{ minWidth: 170, flex: "1 1 170px" }}>
      <div className="muted" style={{ fontSize: 12 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.1, marginTop: 6 }}>{value}</div>
      {note ? <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>{note}</div> : null}
    </div>
  );
}

function scopeTitle(companyKind) {
  const kind = String(companyKind || "").toUpperCase();
  if (kind === "SCHOOL") return "Okul Vardiyaları";
  if (kind === "ORGANIZATION") return "Organizasyon Vardiyaları";
  return "Hizmet Alan Firma Vardiyaları";
}

export default function CompanyShiftsPanelIntro({ err, applyToast, focusMarketById, setApplyToast, trackCounts, companyKind }) {
  const counts = trackCounts || {};

  return (
    <>
      <div className="card">
        <div className="panelSectionTitle">{scopeTitle(companyKind)}</div>
        <div className="panelMeta" style={{ marginTop: 6 }}>
          Market, bekleyen, sözleşmeden üretilen ve diğer vardiyaları takip et. Takip ve operasyon bu ekranda kalır.
        </div>
      </div>

      {err ? <div className="card err">{err}</div> : null}

      {applyToast?.ids?.length ? (
        <div className="card" style={{ marginTop: 10 }}>
          <div className="row" style={{ justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div className="panelSectionTitle">Yeni bağlantı oluştu</div>
              <div className="panelMeta" style={{ marginTop: 4 }}>
                {(applyToast.ids || []).map((id) => (
                  <button key={id} type="button" className="btn" style={{ marginRight: 6, marginTop: 6 }} onClick={() => focusMarketById(id)}>
                    #{id}
                  </button>
                ))}
                <span className="panelMeta" style={{ marginLeft: 8 }}>Tıkla → Market’te filtrele</span>
              </div>
            </div>
            <button type="button" className="btn" onClick={() => setApplyToast(null)}>Kapat</button>
          </div>
        </div>
      ) : null}

      <div className="row" style={{ alignItems: "stretch", flexWrap: "wrap", gap: 10, marginTop: 10 }}>
        <CountCard label="Market" value={String(counts.market || 0)} note="taşımacılık firması seçilmemiş / pazara düşmüş" />
        <CountCard label="Bekleyen" value={String(counts.pending || 0)} note="pazarlık / karar bekleyen" />
        <CountCard label="Sözleşmeden Üretilen" value={String(counts.contract || 0)} note="sözleşmeye bağlı" />
        <CountCard label="Diğer Vardiyalar" value={String(counts.other || 0)} note="sözleşmesiz normal / rehberli" />
      </div>
    </>
  );
}
