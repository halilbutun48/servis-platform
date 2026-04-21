export default function CompanyAgreementsOverviewSection({
  busy = false,
  statusFilter = "",
  take = 20,
  filterQ = "",
  statusOptions = [],
  recentConversion = null,
  wizardPrefill = null,
  onStatusFilterChange,
  onTakeChange,
  onFilterChange,
  onReload,
}) {
  return (
    <>
      <div className="row" style={{ justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <div className="panelTitle">Sözleşmeler (Company)</div>
        <div className="row" style={{ gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <label className="muted">
            Durum
            <select value={statusFilter} onChange={(e) => onStatusFilterChange(e.target.value)} disabled={busy}>
              <option value="">(tümü)</option>
              {statusOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </label>
          <label className="muted">
            Take
            <select value={String(take)} onChange={(e) => onTakeChange(Number(e.target.value))} disabled={busy}>
              {[20, 50, 100, 200].map((n) => (
                <option key={n} value={String(n)}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          <label className="muted">
            Filtre
            <input value={filterQ} onChange={(e) => onFilterChange(e.target.value)} placeholder="Oda / durum / not / tarih" disabled={busy} />
          </label>
          <button type="button" disabled={busy} onClick={onReload}>
            Yenile
          </button>
        </div>

        <div className="card">
          <div style={{ fontWeight: 800 }}>Bu sayfa ne?</div>
          <div className="muted" style={{ marginTop: 6 }}>
            <b>Sözleşme</b> rota/durak üretmez. Sadece <b>düzenli çalışma dönemi</b> (tarih aralığı + hafta günleri + saat penceresi) için bir rezervasyon/çalışma katmanıdır.
            Durak üretme/önizleme ve market teklif süreci için <b>Vardiyalar</b> ekranını kullan.
          </div>
        </div>
      </div>

      <div className="muted" style={{ marginTop: -4 }}>
        Not: Market/vardiya teklifinde “anlaşma” sağlamak otomatik sözleşme oluşturmaz. Sözleşmeler ayrı kayıttır.
      </div>

      {recentConversion ? (
        <div className="card" style={{ border: "1px solid rgba(46,160,67,.45)" }}>
          <div style={{ fontWeight: 900 }}>Vardiya sözleşmeye taşındı</div>
          <div className="muted" style={{ marginTop: 6 }}>
            Vardiya #{recentConversion.sourceShiftId} için oluşturulan sözleşme seçildi: <b>#{recentConversion.agreementId}</b>
          </div>
          {recentConversion.sourceSummary ? (
            <div className="muted" style={{ marginTop: 6 }}>{recentConversion.sourceSummary}</div>
          ) : null}
        </div>
      ) : null}

      {wizardPrefill ? (
        <div className="card" style={{ border: "1px solid rgba(88,166,255,.35)" }}>
          <div style={{ fontWeight: 900 }}>Vardiyadan getirilen sözleşme taslağı hazır</div>
          <div className="muted" style={{ marginTop: 6 }}>
            {String(wizardPrefill?.sourceSummary || "Seçilen vardiya bilgileri sözleşme akışına taşındı.")}
          </div>
          <div className="muted" style={{ marginTop: 6 }}>Akış otomatik açıldı. Tarih/gün/saati düzenleyip kaydedebilirsin.</div>
        </div>
      ) : null}
    </>
  );
}
