import { hasGpsFix, gpsAtLabel, VEHICLE_TEMPLATES_TR, VEHICLE_TYPES } from "./roomVehiclesPanelUtils";
import { getGpsReliabilityLabel, normalizeGpsFreshness } from "../../utils/etaSanity";
import { formatRegionOwnership, hasRegionOwnership } from "../../utils/regionOwnership";

export function RoomTelematicsReadinessCard({ focusVehicle, loadDevices, deviceBusy, deviceSaving }) {
  const freshness = normalizeGpsFreshness(focusVehicle || {});
  return (
    <div className="card" style={{ margin: 0, padding: 14, display: "grid", gap: 10 }}>
      <div>
        <div className="panelSectionTitle">Hazırlık notu</div>
        <div className="panelMeta" style={{ marginTop: 6 }}>
          Provider kataloğu ve güvenlik kuralları Super Admin tarafından yönetilir.
        </div>
      </div>
      <div className="panelMeta">
        Room kendi GPS hesabını onaylı provider kataloğu üzerinden bağlar ve kendi araçlarını cihazlarla eşleştirir.
      </div>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span className="pill" data-status={freshness.status === "OFFLINE" ? "WARN" : freshness.status === "STALE" ? "INFO" : "OK"}>
          {freshness.status}
        </span>
        <span className="pill" data-status="ROLE">
          {getGpsReliabilityLabel(focusVehicle)}
        </span>
      </div>
      <div className="panelMeta">
        Son veri zamanı: <b>{gpsAtLabel(focusVehicle)}</b>
      </div>
      <div className="panelMeta">
        Secret/token/API key görünmez. Ham payload ve endpoint metinleri bu ekranda yer almaz.
      </div>
      <button type="button" disabled={deviceBusy || deviceSaving} onClick={() => loadDevices()}>
        Test eşleştirme
      </button>
      <div className="panelMeta" style={{ fontSize: 12 }}>
        Yalnızca onaylı provider kataloğu üzerinden self-service eşleştirme yapılır.
      </div>
      <div className="panelMeta" style={{ fontSize: 12 }}>
        Yeni cihaz erişim kodu create/rotate akışında yönetilir.
      </div>
    </div>
  );
}

export function RoomDeviceTokenRevealCard() {
  return (
    <div className="card" style={{ margin: 0, padding: 14, display: "grid", gap: 10 }}>
      <div>
        <div className="panelSectionTitle">Yeni cihaz erişim kodu</div>
        <div className="panelMeta" style={{ marginTop: 6 }}>
          Erişim kodu yalnızca create/rotate anında bir kez gösterilir.
        </div>
      </div>
      <div className="panelMeta">
        Secret/token/API key görünmez. Ham payload ve endpoint metinleri bu ekranda yer almaz.
      </div>
    </div>
  );
}

export function RoomVehicleTransferWarning({ selectedBound }) {
  if (!selectedBound) return null;
  return (
    <div className="card" style={{ marginTop: 10, padding: "10px 12px", borderLeft: "6px solid" }}>
      <b>⚠️ Bu sürücü başka araca bağlı:</b>{" "}<span className="muted">{selectedBound?.plate}</span>
      <div className="muted" style={{ marginTop: 6, fontSize: 12 }}>
        Kural gereği aynı anda tek araçta olabilir. “Transfer” ile otomatik taşıyabilirsin.
      </div>
    </div>
  );
}

export function RoomVehicleCurrentLinkCard({ focusVehicle, focusDriverLabel, focusHasDriver, focusDriverId, busy, focusArchived, unbindDriver, focusVehicleId }) {
  return (
    <div className="card" style={{ margin: 0 }}>
      <h3 style={{ marginTop: 0 }}>Mevcut Bağlı Sürücü</h3>
      <div className="muted">Seçili araç: <b>{focusVehicle?.plate || "-"}</b></div>
      {hasRegionOwnership(focusVehicle) ? <div className="muted" style={{ marginTop: 4, fontSize: 12 }}>{formatRegionOwnership(focusVehicle)}</div> : null}
      <div style={{ marginTop: 10 }}>
        <div className="muted">Bağlı sürücü</div>
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
      <h3>Araç bağlantısı (Araç ↔ Sürücü)</h3>
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
                    {v.plate} (#{v.id}){hasRegionOwnership(v) ? ` • ${formatRegionOwnership(v).replace(/^Bölge:\s*/, "")}` : ""}{v.archivedAt ? " • Arşivde" : ""}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ minWidth: 260 }}>
              <label className="muted">Sürücü</label>
              <select
                value={String(bindSel[focusVehicleId] ?? focusVehicle?.driver?.id ?? focusVehicle?.driverId ?? "")}
                onChange={(e) => setBindSel((prev) => ({ ...prev, [focusVehicleId]: e.target.value }))}
                disabled={busy || focusArchived}
              >
                <option value="">Sürücü seç</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>{driverOptionLabel(d)}{hasRegionOwnership(d) ? ` • ${formatRegionOwnership(d).replace(/^Bölge:\s*/, "")}` : ""}</option>
                ))}
              </select>
            </div>
            <button type="button" disabled={busy || !focusVehicleId || !String(bindSel[focusVehicleId] ?? focusVehicle?.driver?.id ?? focusVehicle?.driverId ?? "").trim() || focusArchived || selectedBoundOther} onClick={() => bindDriver(focusVehicleId)} title={selectedBoundOther ? "Sürücü başka bir araca bağlı. Transfer kullan." : ""}>
              Bağla
            </button>
            {selectedBoundOther ? (
              <button type="button" className="btn" disabled={busy || focusArchived} onClick={() => transferDriver(focusVehicleId, selectedDriverId, selectedBound.vehicleId)} title="Sürücü başka araca bağlıysa: önce ayır, sonra bağla">
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
          <div className="col">
            <label className="muted">Plaka</label>
            <input
              value={editForm.plate}
              onChange={(e) => setEditForm((p) => ({ ...p, plate: String(e.target.value || "").toLocaleUpperCase("tr-TR") }))}
            />
          </div>
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
