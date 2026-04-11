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
        <h3>{isCommercialMode ? "Ticari AkÄ±ÅŸÄ±m (COMPANY)" : "Shifts (COMPANY)"}</h3>
        <div className="muted">{isCommercialMode ? "Market: teklif / pazarlÄ±k â€¢ Bekleyen: operasyon hazÄ±rlÄ±ÄŸÄ± â€¢ Liste: APPROVED/ACTIVE/DONE/REJECTED" : "Bekleyen: REQUESTED â€¢ Liste: APPROVED/ACTIVE/DONE/REJECTED"}</div>
      </div>

      {err ? <div className="card err">{err}</div> : null}

      {applyToast?.ids?.length ? (
        <div className="card" style={{ marginTop: 10 }}>
          <div className="row" style={{ justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 800 }}>OluÅŸturuldu:</div>
              <div className="muted" style={{ marginTop: 4 }}>
                {(applyToast.ids || []).map((id) => (
                  <button key={id} type="button" className="btn" style={{ marginRight: 6, marginTop: 6 }} onClick={() => focusMarketById(id)}>
                    #{id}
                  </button>
                ))}
                <span className="muted" style={{ marginLeft: 8 }}>TÄ±kla â†’ Bekleyen Talepler / Market Shiftsâ€™te filtrele</span>
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
                title="Åablon / talep / Shift Tools / plan Ã¼retimi Planlama Merkezi'nde yapÄ±lÄ±r"
              >
                Planlama Merkezi'ne git
              </button>
              <button
                type="button"
                className={mainTab === "track" ? "btn primary" : "btn"}
                disabled={busy}
                onClick={() => setMainTab("track")}
                title="Market / Bekleyen / Liste + hÄ±zlÄ± filtre"
              >
                Takip
              </button>
            </div>
            <div className="muted" style={{ marginTop: 6 }}>
              OluÅŸturma akÄ±ÅŸÄ± bu ekrandan kaldÄ±rÄ±ldÄ±. Åablon, talep, Shift Tools, OSRM + solver ve teklif Ã¼retimi Planlama Merkezi'nden yÃ¼rÃ¼r; bu ekran takip ve operasyon iÃ§indir.
            </div>
          </div>

          {mainTab === "create" ? (
            <div className="card">
              <div style={{ fontWeight: 800 }}>OluÅŸturma Planlama Merkezi'ne taÅŸÄ±ndÄ±</div>
              <div className="muted" style={{ marginTop: 8 }}>
                AynÄ± iÅŸi iki farklÄ± yerden Ã¼retmemek iÃ§in bu ekrandaki oluÅŸturma akÄ±ÅŸÄ± pasife alÄ±ndÄ±.
                Yeni vardiya kurma, ÅŸablon/talep, Shift Tools, durak Ã¼retimi, OSRM + solver Ã¶nizleme ve market teklif akÄ±ÅŸÄ± Planlama Merkezi'nden yapÄ±lÄ±r.
              </div>
              <div className="row" style={{ gap: 8, flexWrap: "wrap", marginTop: 12 }}>
                <button type="button" className="btn primary" disabled={busy} onClick={goPlanningCenter}>Planlama Merkezi'ne git</button>
                <button type="button" className="btn" disabled={busy} onClick={() => setMainTab("track")}>Takibe dÃ¶n</button>
              </div>
            </div>
          ) : null}
        </>
      ) : (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <h3 style={{ margin: 0 }}>Ticari AkÄ±ÅŸÄ±m</h3>
              <div className="muted" style={{ marginTop: 6 }}>Company iÃ§in teklif, karÅŸÄ± teklif ve pazarlÄ±k gÃ¶rÃ¼nÃ¼rlÃ¼ÄŸÃ¼</div>
            </div>
            <div className="muted">Kapsam: Kendi ticari alanÄ±nÄ±z</div>
          </div>
        </div>
      )}
    </>
  );
}
