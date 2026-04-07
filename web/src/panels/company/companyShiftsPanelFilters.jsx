export function CompanyAccordionHeader({ title, count, description, accOpen, onOpen, onClose, onToggle, rightContent = null }) {
  return (
    <div className="row" style={{ justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
      <div className="row" style={{ alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        <span className="pill" data-status="COUNT" title="Filtrelere göre görünen kayıt sayısı">
          {count}
        </span>
        <span className="muted">{description}</span>
      </div>
      <div className="row" style={{ gap: 8, flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center" }}>
        {rightContent}
        <button type="button" className="btn sm" disabled={accOpen} onClick={onOpen}>Aç</button>
        <button type="button" className="btn sm" disabled={!accOpen} onClick={onClose}>Kapat</button>
        <button type="button" className="btn sm" title="Aç / Kapat" onClick={onToggle}>{accOpen ? "▾" : "▸"}</button>
      </div>
    </div>
  );
}

export function CompanyMarketFilters({ marketQ, onChangeMarketQ, marketFocusIds, onClearFocus, busy, searchRef }) {
  return (
    <div className="row" style={{ justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
      <div />
      <div style={{ display: "grid", gap: 6, justifyItems: "end" }}>
        <input
          ref={searchRef}
          placeholder="Ara (id/status)"
          value={marketQ}
          onChange={(e) => onChangeMarketQ(e.target.value)}
          style={{ minWidth: 220 }}
        />
        {marketFocusIds.length ? (
          <div className="muted" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span>Filtre: {(marketFocusIds || []).map((id) => "#" + id).join(" ")}</span>
            <button type="button" className="secondary" onClick={onClearFocus} disabled={busy}>Filtreyi temizle</button>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function CompanyPendingFilters({ pendingQ, onChangePendingQ, pendingFocusIds, onClearFocus, pendingOnlyRoomOffer, onChangePendingOnlyRoomOffer, onlyAgreement, onChangeOnlyAgreement, busy }) {
  return (
    <div className="row" style={{ justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
      <div />
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input placeholder="Ara (id/status/note/room)" value={pendingQ} onChange={(e) => onChangePendingQ(e.target.value)} style={{ minWidth: 240 }} />
        {pendingFocusIds.length ? (
          <div className="muted" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span>Filtre: {(pendingFocusIds || []).map((id) => "#" + id).join(" ")}</span>
            <button type="button" className="secondary" onClick={onClearFocus} disabled={busy}>Filtreyi temizle</button>
          </div>
        ) : null}
        <label className="muted" style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input type="checkbox" checked={pendingOnlyRoomOffer} onChange={(e) => onChangePendingOnlyRoomOffer(e.target.checked)} />
          Sadece Room teklifi olanlar
        </label>
        <label className="muted" style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input type="checkbox" checked={onlyAgreement} onChange={(e) => onChangeOnlyAgreement(e.target.checked)} />
          Sadece Agreement shiftleri
        </label>
        <button type="button" onClick={() => { onChangePendingQ(""); onChangePendingOnlyRoomOffer(false); onChangeOnlyAgreement(false); }}>Temizle</button>
      </div>
    </div>
  );
}

export function CompanyFinalListFilters({ finalStatus, onChangeFinalStatus, finalQ, onChangeFinalQ, onlyAgreement, onChangeOnlyAgreement, onClearFilters }) {
  return (
    <div className="row" style={{ justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
      <div />
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <select value={finalStatus} onChange={(e) => onChangeFinalStatus(e.target.value)}>
          <option value="ALL">Hepsi</option>
          <option value="OPEN">Açık (APPROVED+ACTIVE)</option>
          <option value="APPROVED">APPROVED</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="DONE">DONE</option>
          <option value="REJECTED">REJECTED</option>
        </select>
        <input placeholder="Ara (id/status/plate/driver/note)" value={finalQ} onChange={(e) => onChangeFinalQ(e.target.value)} style={{ minWidth: 240 }} />
        <label className="muted" style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input type="checkbox" checked={onlyAgreement} onChange={(e) => onChangeOnlyAgreement(e.target.checked)} />
          Sadece Agreement shiftleri
        </label>
        <button type="button" onClick={onClearFilters}>Temizle</button>
      </div>
    </div>
  );
}
