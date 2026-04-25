export default function CompanyShiftsPanelIntro(props) {
  const {
    isCommercialMode,
    err,
    applyToast,
    focusMarketById,
    setApplyToast,
    busy,
    goPlanningCenter,
    mainTab,
    setMainTab,
  } = props;

  return (
    <>
      <div className="card">
        <div className="panelSectionTitle">{isCommercialMode ? "Ticari Akışım (COMPANY)" : "Shifts (COMPANY)"}</div>
        <div className="panelMeta" style={{ marginTop: 6 }}>{isCommercialMode ? "Market: teklif / pazarlık • Bekleyen: operasyon hazırlığı • Liste: kabul edildi / aktif / tamamlandı / reddedildi" : "Bekleyen: bekliyor • Liste: kabul edildi / aktif / tamamlandı / reddedildi"}</div>
      </div>

      {err ? <div className="card err">{err}</div> : null}

      {applyToast?.ids?.length ? (
        <div className="card" style={{ marginTop: 10 }}>
          <div className="row" style={{ justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div className="panelSectionTitle">Oluşturuldu:</div>
              <div className="panelMeta" style={{ marginTop: 4 }}>
                {(applyToast.ids || []).map((id) => (
                  <button key={id} type="button" className="btn" style={{ marginRight: 6, marginTop: 6 }} onClick={() => focusMarketById(id)}>
                    #{id}
                  </button>
                ))}
                <span className="panelMeta" style={{ marginLeft: 8 }}>Tıkla → Bekleyen Talepler / Market Shifts’te filtrele</span>
              </div>
            </div>
            <button type="button" className="btn" onClick={() => setApplyToast(null)}>Kapat</button>
          </div>
        </div>
      ) : null}

      {!isCommercialMode ? (
        <>
            <div className="card">
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button
                type="button"
                className="btn"
                disabled={busy}
                onClick={goPlanningCenter}
                title="Şablon / talep / Shift Tools / plan üretimi Planlama Merkezi'nde yapılır"
              >
                Planlama Merkezi'ne git
              </button>
              <button
                type="button"
                className={mainTab === "track" ? "btn primary" : "btn"}
                disabled={busy}
                onClick={() => setMainTab("track")}
                title="Market / Bekleyen / Liste + hızlı filtre"
              >
                Takip
              </button>
              </div>
            <div className="panelMeta" style={{ marginTop: 6 }}>
              Oluşturma akışı bu ekrandan kaldırıldı. Şablon, talep, Shift Tools, OSRM + solver ve teklif üretimi Planlama Merkezi'nden yürür; bu ekran takip ve operasyon içindir.
            </div>
          </div>

          {mainTab === "create" ? (
            <div className="card">
              <div className="panelSectionTitle">Oluşturma Planlama Merkezi'ne taşındı</div>
              <div className="panelMeta" style={{ marginTop: 8 }}>
                Aynı işi iki farklı yerden üretmemek için bu ekrandaki oluşturma akışı pasife alındı.
                Yeni vardiya kurma, şablon/talep, Shift Tools, durak üretimi, OSRM + solver ön izleme ve market teklif akışı Planlama Merkezi'nden yapılır.
              </div>
              <div className="row" style={{ gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                <button type="button" className="btn primary" disabled={busy} onClick={goPlanningCenter}>Planlama Merkezi'ne git</button>
                <button type="button" className="btn" disabled={busy} onClick={() => setMainTab("track")}>Takibe dön</button>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div className="panelSectionTitle">Ticari Akışım</div>
              <div className="panelMeta" style={{ marginTop: 6 }}>Company için teklif, karşı teklif ve pazarlık görünürlüğü</div>
            </div>
            <div className="panelMeta">Kapsam: Kendi ticari alanınız</div>
          </div>
        </div>
      )}
    </>
  );
}
