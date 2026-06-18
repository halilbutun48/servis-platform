import { coordNum, hasCoord } from "./guidedPlanModalUtils";

export function GuidedDestinationRowCard({
  dest,
  idx,
  total,
  busy,
  moveDestination,
  removeDestination,
  setDestinationField,
  setDestinationCoordField,
  geocodeDestination,
  openDestinationMapPicker,
  openDestinationNavigation,
}) {
  return (
    <div className="card" style={{ padding: 10, border: "1px solid #223" }}>
      <div className="row" style={{ gap: 8, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
        <div style={{ fontWeight: 700 }}>Konum {idx + 1}</div>
        <div className="row" style={{ gap: 6, flexWrap: "wrap" }}>
          <button type="button" className="btn sm" onClick={() => moveDestination(idx, -1)} disabled={busy || idx === 0}>Yukarı</button>
          <button type="button" className="btn sm" onClick={() => moveDestination(idx, 1)} disabled={busy || idx === total - 1}>Aşağı</button>
          <button type="button" className="btn sm" onClick={() => removeDestination(idx)} disabled={busy}>Sil</button>
        </div>
      </div>

      <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label className="muted">Konum adı</label>
          <input
            value={dest?.title || ""}
            onChange={(e) => setDestinationField(idx, "title", e.target.value)}
            placeholder="örn. Pamukkale"
            disabled={busy}
          />
        </div>
        <div>
          <label className="muted">Adres / açıklama</label>
          <input
            value={dest?.address || ""}
            onChange={(e) => setDestinationField(idx, "address", e.target.value)}
            placeholder="örn. Pamukkale Travertenleri giriş"
            disabled={busy}
          />
        </div>
      </div>

      <div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label className="muted">Enlem (manuel / yedek)</label>
          <input
            value={dest?.lat || ""}
            onChange={(e) => setDestinationCoordField(idx, "lat", e.target.value)}
            placeholder="örn. 37.7765"
            disabled={busy}
          />
        </div>
        <div>
          <label className="muted">Boylam (manuel / yedek)</label>
          <input
            value={dest?.lng || ""}
            onChange={(e) => setDestinationCoordField(idx, "lng", e.target.value)}
            placeholder="örn. 29.0864"
            disabled={busy}
          />
        </div>
      </div>

      <div className="row" style={{ gap: 8, flexWrap: "wrap", marginTop: 8, alignItems: "center" }}>
        <button type="button" className="btn sm" onClick={() => geocodeDestination(idx)} disabled={busy}>Bul</button>
        <button type="button" className="btn sm" onClick={() => openDestinationMapPicker(idx)} disabled={busy}>Haritadan seç</button>
        {hasCoord(coordNum(dest?.lat), coordNum(dest?.lng)) ? (
          <button type="button" className="btn sm" onClick={() => openDestinationNavigation(dest)} disabled={busy}>Navigasyonda aç</button>
        ) : null}
        <div className="muted" style={{ fontSize: 12 }}>
          {dest?.status === "ok"
            ? `✅ ${dest?.foundText || "Bulundu"}`
            : dest?.status === "manual"
            ? `📍 ${dest?.foundText || "Koordinat hazır"}`
            : dest?.status === "error"
            ? `⚠ ${dest?.foundText || "Bulunamadı"}`
            : dest?.status === "loading"
            ? "Bulunuyor..."
            : "Henüz aranmadı"}
        </div>
      </div>
    </div>
  );
}

export function GuidedOrganizationPlanCard({
  busy,
  orgEstimatedPax,
  setOrgEstimatedPax,
  orgGatheringName,
  setOrgGatheringName,
  orgDestinationAudit,
  orgDestinations,
  moveDestination,
  removeDestination,
  setDestinationField,
  setDestinationCoordField,
  geocodeDestination,
  openDestinationMapPicker,
  openDestinationNavigation,
  addDestination,
  orgReturnType,
  setOrgReturnType,
}) {
  return (
    <div className="card">
      <div style={{ fontWeight: 800 }}>Kurum detayları</div>
      <div className="muted" style={{ marginTop: 4 }}>
        Gezi planını burada kurarsın. Tahmini kişi sayısı, toplanma konumu, gidilecek konumlar ve dönüş tipi aynı ekranda kalır.
      </div>

      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label className="muted">Tahmini kişi sayısı</label>
          <input
            value={orgEstimatedPax}
            onChange={(e) => setOrgEstimatedPax(e.target.value.replace(/[^\d]/g, ""))}
            placeholder="örn. 48"
            disabled={busy}
          />
        </div>
        <div>
          <label className="muted">Toplanma Konumu adı</label>
          <input
            value={orgGatheringName}
            onChange={(e) => setOrgGatheringName(e.target.value)}
            placeholder="örn. Denizli Forum önü"
            disabled={busy}
          />
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <div style={{ fontWeight: 700 }}>Gidilecek konumlar</div>
        <div className="muted" style={{ marginTop: 4 }}>
          Her konum ayrı satır olsun. Böylece tek tek düzeltmek, bulmak ve sırayı değiştirmek kolay olur.
        </div>
        <div className="muted" style={{ marginTop: 6 }}>
          Hazır konum: <b>{orgDestinationAudit.ready}</b> / {orgDestinationAudit.total || 0}
          {orgDestinationAudit.missing.length ? ` • Eksik konum: ${orgDestinationAudit.missing.map((x) => x.label).join(", ")}` : ""}
        </div>
        <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
          {(orgDestinations || []).map((dest, idx) => (
            <GuidedDestinationRowCard
              key={idx}
              dest={dest}
              idx={idx}
              total={(orgDestinations || []).length}
              busy={busy}
              moveDestination={moveDestination}
              removeDestination={removeDestination}
              setDestinationField={setDestinationField}
              setDestinationCoordField={setDestinationCoordField}
              geocodeDestination={geocodeDestination}
              openDestinationMapPicker={openDestinationMapPicker}
              openDestinationNavigation={openDestinationNavigation}
            />
          ))}
        </div>
        <div className="row" style={{ justifyContent: "flex-end", marginTop: 10 }}>
          <button type="button" className="btn" onClick={addDestination} disabled={busy}>+ Konum ekle</button>
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <label className="muted">Dönüş tipi</label>
        <select value={orgReturnType} onChange={(e) => setOrgReturnType(e.target.value)} disabled={busy}>
          <option value="RETURN_TO_START">Başlangıç noktasına dön</option>
          <option value="END_AT_LAST_STOP">Son noktada bitir</option>
        </select>
      </div>
    </div>
  );
}
