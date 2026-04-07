import { hasGpsFix, VEHICLE_TEMPLATES_TR, VEHICLE_TYPES } from "./roomVehiclesPanelUtils";

export function RoomDeviceTokenRevealCard({ tokenReveal, copyToken }) {
  if (!tokenReveal?.token) return null;
  return (
    <div className="card" style={{ marginTop: 12, padding: "10px 12px", borderLeft: "6px solid" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <b>{tokenReveal.kind === "rotate" ? "Yeni device token" : "Yeni device token (ilk ve tek gösterim)"}</b>
        <button type="button" onClick={() => copyToken(tokenReveal.token)}>Kopyala</button>
      </div>
      <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
        Device #{tokenReveal.id || "-"}{tokenReveal.serial ? ` • ${tokenReveal.serial}` : ""}
      </div>
      <textarea readOnly value={tokenReveal.token} rows={4} style={{ marginTop: 8, width: "100%" }} />
    </div>
  );
}

export function RoomVehicleTransferWarning({ selectedBound }) {
  if (!selectedBound) return null;
  return (
    <div className="card" style={{ marginTop: 10, padding: "10px 12px", borderLeft: "6px solid" }}>
      <b>⚠️ Bu driver başka araca bağlı:</b>{" "}<span className="muted">{selectedBound?.plate}</span>
      <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
        Kural gereği aynı anda tek araçta olabilir. “Transfer” ile otomatik taşıyabilirsin.
      </div>
    </div>
  );
}

export function RoomVehicleCurrentLinkCard({ focusVehicle, focusDriverLabel, focusHasDriver, focusDriverId, busy, focusArchived, unbindDriver, focusVehicleId }) {
  return (
    <div className="card" style={{ margin: 0 }}>
      <h3 style={{ marginTop: 0 }}>Mevcut Bağlantı</h3>
      <div className="muted">Seçili araç: <b>{focusVehicle?.plate || "-"}</b></div>
      <div style={{ marginTop: 10 }}>
        <div className="muted">Aktif sürücü</div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 6 }}>
          <b>{focusDriverLabel}</b>
          {focusHasDriver ? <span className="muted">(id={focusDriverId})</span> : null}
          <button type="button" disabled={busy || focusArchived || !focusHasDriver} onClick={() => unbindDriver(focusVehicleId)}>
            Bağlantıyı kaldır (Ayır)
          </button>
        </div>
      </div>
      {focusVehicle && !hasGpsFix(focusVehicle) ? <div className="muted" style={{ marginTop: 10, fontSize: 12 }}>📡 GPS yok — bu araç haritada marker olarak görünmez.</div> : null}
    </div>
  );
}

export function RoomVehicleLinkSection({
  focusVehicleId,
  setFocusVehicleId,
  setErr,
  setBindSel,
  bindSel,
  busy,
  items,
  focusArchived,
  drivers,
  driverOptionLabel,
  selectedBoundOther,
  bindDriver,
  selectedDriverId,
  selectedBound,
  transferDriver,
  focusVehicle,
  focusDriverLabel,
  focusHasDriver,
  focusDriverId,
  unbindDriver,
}) {
  return (
    <div className="card">
      <h3>Bağlantı (Araç ↔ Sürücü)</h3>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "start" }}>
        <div>
          <div style={{ display: "flex", gap: 12, alignItems: "end", flexWrap: "wrap" }}>
            <div style={{ minWidth: 220 }}>
              <label className="muted">Araç</label>
              <select
                value={String(focusVehicleId || "")}
                onChange={(e) => {
                  const nextId = Number(e.target.value || 0);
                  setFocusVehicleId(nextId);
                  setErr("");
                  if (nextId) setBindSel((p) => ({ ...p, [nextId]: "" }));
                }}
                disabled={busy}
              >
                {items.map((v) => (
                  <option key={v.id} value={v.id} disabled={Boolean(v.archivedAt)}>
                    {v.plate} (#{v.id}){v.archivedAt ? " • ARCHIVED" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ minWidth: 260 }}>
              <label className="muted">Yeni Sürücü</label>
              <select value={String(bindSel[focusVehicleId] ?? "")} onChange={(e) => setBindSel((prev) => ({ ...prev, [focusVehicleId]: e.target.value }))} disabled={busy || focusArchived}>
                <option value="">Driver seç</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>{driverOptionLabel(d)}</option>
                ))}
              </select>
            </div>
            <button type="button" disabled={busy || !focusVehicleId || !bindSel[focusVehicleId] || focusArchived || selectedBoundOther} onClick={() => bindDriver(focusVehicleId)} title={selectedBoundOther ? "Driver başka araca bağlı. Transfer kullan." : ""}>
              Bağla
            </button>
            {selectedBoundOther ? (
              <button type="button" className="btn" disabled={busy || focusArchived} onClick={() => transferDriver(focusVehicleId, selectedDriverId, selectedBound.vehicleId)} title="Driver başka araca bağlıysa: önce ayır, sonra bağla">
                Transfer
              </button>
            ) : null}
          </div>
          {selectedBoundOther ? <RoomVehicleTransferWarning selectedBound={selectedBound} /> : null}
          <div className="muted" style={{ marginTop: 10 }}>Not: Arşivli araçta bind/ayır yapılmaz.</div>
        </div>

        <RoomVehicleCurrentLinkCard
          focusVehicle={focusVehicle}
          focusDriverLabel={focusDriverLabel}
          focusHasDriver={focusHasDriver}
          focusDriverId={focusDriverId}
          busy={busy}
          focusArchived={focusArchived}
          unbindDriver={unbindDriver}
          focusVehicleId={focusVehicleId}
        />
      </div>
    </div>
  );
}

export function RoomVehicleEditModal({ editOpen, busy, setEditOpen, editTemplateId, applyEditTemplate, editForm, setEditForm, saveEdit }) {
  if (!editOpen) return null;
  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", padding: 16, zIndex: 50, background: "rgba(0,0,0,0.5)" }}>
      <div className="card" style={{ width: "min(980px, 96vw)", maxHeight: "92vh", overflow: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <h3>Düzenle</h3>
          <button type="button" disabled={busy} onClick={() => setEditOpen(false)}>Kapat</button>
        </div>
        <div className="grid" style={{ marginTop: 8 }}>
          <div className="col" style={{ gridColumn: "1 / -1" }}>
            <label className="muted">Hazır Şablon (TR) (opsiyonel)</label>
            <select value={editTemplateId} onChange={(e) => applyEditTemplate(e.target.value)}>
              <option value="">— Şablon seç —</option>
              {VEHICLE_TEMPLATES_TR.map((t) => (
                <option key={t.id} value={t.id}>{t.label} • {t.type} • {t.capacity}</option>
              ))}
            </select>
          </div>
          <div className="col"><label className="muted">Plaka</label><input value={editForm.plate} onChange={(e) => setEditForm((p) => ({ ...p, plate: e.target.value }))} /></div>
          <div className="col"><label className="muted">Kapasite</label><input type="number" value={editForm.capacity} onChange={(e) => setEditForm((p) => ({ ...p, capacity: e.target.value }))} /></div>
          <div className="col"><label className="muted">Araç tipi</label><select value={editForm.type} onChange={(e) => setEditForm((p) => ({ ...p, type: e.target.value }))}>{VEHICLE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select></div>
          <div className="col"><label className="muted">Marka</label><input value={editForm.brand} onChange={(e) => setEditForm((p) => ({ ...p, brand: e.target.value }))} /></div>
          <div className="col"><label className="muted">Model</label><input value={editForm.model} onChange={(e) => setEditForm((p) => ({ ...p, model: e.target.value }))} /></div>
          <div className="col"><label className="muted">Model yılı</label><input type="number" value={editForm.modelYear} onChange={(e) => setEditForm((p) => ({ ...p, modelYear: e.target.value }))} /></div>
          <div className="col"><label className="muted">Hız limiti (km/h)</label><input type="number" value={editForm.speedLimitKmh} onChange={(e) => setEditForm((p) => ({ ...p, speedLimitKmh: e.target.value }))} /></div>
          <div className="col"><label className="muted">Muayene bitiş</label><input type="date" value={editForm.inspectionDueAt} onChange={(e) => setEditForm((p) => ({ ...p, inspectionDueAt: e.target.value }))} /></div>
          <div className="col"><label className="muted">Güncel km</label><input type="number" value={editForm.odometerKm} onChange={(e) => setEditForm((p) => ({ ...p, odometerKm: e.target.value }))} /></div>
          <div className="col"><label className="muted">Son bakım tarihi</label><input type="date" value={editForm.lastServiceAt} onChange={(e) => setEditForm((p) => ({ ...p, lastServiceAt: e.target.value }))} /></div>
          <div className="col"><label className="muted">Son bakım km</label><input type="number" value={editForm.lastServiceKm} onChange={(e) => setEditForm((p) => ({ ...p, lastServiceKm: e.target.value }))} /></div>
          <div className="col"><label className="muted">Bakım periyodu (km)</label><input type="number" value={editForm.serviceIntervalKm} onChange={(e) => setEditForm((p) => ({ ...p, serviceIntervalKm: e.target.value }))} /></div>
          <div className="col"><label className="muted">Renk</label><input value={editForm.color} onChange={(e) => setEditForm((p) => ({ ...p, color: e.target.value }))} /></div>
          <div className="col"><label className="muted">VIN</label><input value={editForm.vin} onChange={(e) => setEditForm((p) => ({ ...p, vin: e.target.value }))} /></div>
          <div className="col" style={{ gridColumn: "1 / -1" }}><label className="muted">Not</label><input value={editForm.note} onChange={(e) => setEditForm((p) => ({ ...p, note: e.target.value }))} /></div>
          <div className="col" style={{ display: "flex", gap: 8, justifyContent: "end" }}>
            <button type="button" disabled={busy} onClick={() => setEditOpen(false)}>İptal</button>
            <button type="button" disabled={busy} onClick={saveEdit}>{busy ? "..." : "Kaydet"}</button>
          </div>
        </div>
      </div>
    </div>
  );
}
