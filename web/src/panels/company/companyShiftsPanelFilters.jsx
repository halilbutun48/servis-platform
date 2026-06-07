export function CompanyAccordionHeader({ title, count, description, accOpen, onOpen, onClose, onToggle, rightContent = null }) {
  return (
    <div className="row companyAccordionHeader" style={{ justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
      <div className="row companyAccordionHeaderMain" style={{ alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        <span className="pill" data-status="COUNT" title="Filtrelere göre görünen kayıt sayısı">
          {count}
        </span>
        <span className="muted companyAccordionHeaderDescription">{description}</span>
      </div>
      <div className="row companyAccordionHeaderActions" style={{ gap: 8, flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center" }}>
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
          placeholder="Ara (id / durum)"
          value={marketQ}
          onChange={(e) => onChangeMarketQ(e.target.value)}
          style={{ width: "min(100%, 220px)" }}
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

export function CompanyPendingFilters({ pendingQ, onChangePendingQ, pendingFocusIds, onClearFocus, pendingOnlyRoomOffer, onChangePendingOnlyRoomOffer, busy }) {
  return (
    <div className="row" style={{ justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
      <div />
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <input placeholder="Ara (id / durum / not / oda)" value={pendingQ} onChange={(e) => onChangePendingQ(e.target.value)} style={{ width: "min(100%, 240px)" }} />
        {pendingFocusIds.length ? (
          <div className="muted" style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            <span>Filtre: {(pendingFocusIds || []).map((id) => "#" + id).join(" ")}</span>
            <button type="button" className="secondary" onClick={onClearFocus} disabled={busy}>Filtreyi temizle</button>
          </div>
        ) : null}
        <label className="muted" style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <input type="checkbox" checked={pendingOnlyRoomOffer} onChange={(e) => onChangePendingOnlyRoomOffer(e.target.checked)} />
          Sadece oda teklifi olanlar
        </label>
        <button type="button" onClick={() => { onChangePendingQ(""); onChangePendingOnlyRoomOffer(false); }}>Temizle</button>
      </div>
    </div>
  );
}

export function CompanyStatusFilters({ status, onChangeStatus, q, onChangeQ, onClearFilters, searchPlaceholder = "Ara" }) {
  return (
    <div className="row" style={{ justifyContent: "space-between", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
      <div />
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <select value={status} onChange={(e) => onChangeStatus(e.target.value)}>
          <option value="ALL">Hepsi</option>
          <option value="ACTIVE">Aktif</option>
          <option value="DONE">Tamamlandı</option>
          <option value="REJECTED">Reddedildi</option>
        </select>
        <input placeholder={searchPlaceholder} value={q} onChange={(e) => onChangeQ(e.target.value)} style={{ width: "min(100%, 240px)" }} />
        <button type="button" onClick={onClearFilters}>Temizle</button>
      </div>
    </div>
  );
}

export function CompanyFinalListFilters(props) {
  return CompanyStatusFilters(props);
}
