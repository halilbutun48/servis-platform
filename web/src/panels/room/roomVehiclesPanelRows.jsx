import { rowSelectionStyle } from "../../utils/listUi";
import {
  conflictCodeLabel,
  expKey,
  fmtDriverHuman,
  fmtTR,
  shiftOneLine,
  shiftWindowLabel,
  toggleExp,
  toggleSel,
} from "./roomVehiclesPanelUtils";
import { displayStatusLabel } from "../../utils/displayStatus";
import { formatRegionOwnership, hasRegionOwnership } from "../../utils/regionOwnership";

export function ShiftCompact({ s, open, onToggle }) {
  if (!s) return <span className="muted">—</span>;

  const companyName = s.company?.name || (s.companyId ? `company#${s.companyId}` : "");
  const hasAgreement = Number(s.agreementId) > 0;

  return (
    <div style={{ display: "grid", gap: 6 }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <span><b>{shiftOneLine(s)}</b></span>
        <span className="pill" data-status={s.status === "ACTIVE" ? "BUSY" : "OK"}>{displayStatusLabel(s.status)}</span>
        {hasAgreement ? <span className="pill" data-status="AGREEMENT">Sözleşme #{s.agreementId}</span> : null}
        <button
          type="button"
          onClick={onToggle}
          style={{ padding: "2px 8px", fontSize: 12 }}
          title="Detay göster/gizle"
        >
          {open ? "Gizle" : "Detay"}
        </button>
      </div>

      {open ? (
        <div className="muted" style={{ fontSize: 12, display: "grid", gap: 4 }}>
          <div>{shiftWindowLabel(s)}</div>
          <div>Company: <b>{companyName || "-"}</b></div>
          <div>Oda: <b>{s.room?.name || (s.roomId ? `oda#${s.roomId}` : "-")}</b></div>
          <div>Route: <b>{s.route?.name || (s.routeId ? `route#${s.routeId}` : "-")}</b></div>
          <div>Direction: <b>{s.direction || "-"}</b></div>
          {s.note ? <div>Not: <b>{s.note}</b></div> : null}
        </div>
      ) : null}
    </div>
  );
}

export function RoomVehicleAssignmentRow({
  v,
  cur,
  next,
  focusVehicleId,
  onSelectVehicle,
  shiftExp,
  setShiftExp,
}) {
  return (
    <tr
      onClick={() => onSelectVehicle(Number(v.id) || 0)}
      style={rowSelectionStyle(Number(focusVehicleId || 0) === Number(v.id || 0))}
    >
      <td style={{ padding: "12px 14px", verticalAlign: "top" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <b>{v.plate}</b>
          <span className="muted">#{v.id}</span>
        </div>
        {hasRegionOwnership(v) ? <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{formatRegionOwnership(v)}</div> : null}
      </td>
      <td style={{ padding: "12px 14px", verticalAlign: "top" }}>
        {v.driver ? <span>{fmtDriverHuman(v.driver)}</span> : <span className="muted">Bağlı sürücü yok</span>}
      </td>
      <td style={{ padding: "12px 14px", verticalAlign: "top" }}>
        <ShiftCompact
          s={cur}
          open={!!shiftExp[expKey(v.id, "cur")]}
          onToggle={() => toggleExp(setShiftExp, expKey(v.id, "cur"))}
        />
      </td>
      <td style={{ padding: "12px 14px", verticalAlign: "top" }}>
        <ShiftCompact
          s={next}
          open={!!shiftExp[expKey(v.id, "next")]}
          onToggle={() => toggleExp(setShiftExp, expKey(v.id, "next"))}
        />
      </td>
    </tr>
  );
}

export function RoomVehicleAvailabilityRow({
  v,
  row,
  quickBusy,
  hasDriver,
  focusVehicleId,
  onSelectVehicle,
  availSel,
  setAvailSel,
  availBusy,
}) {
  const vOk = row ? row.vehicleOk : null;
  const dOk = row ? row.driverOk : null;
  const vCode = row?.vehicleConflict ? conflictCodeLabel(row.vehicleConflict) : null;
  const dCode = row?.driverConflict ? conflictCodeLabel(row.driverConflict) : null;
  const vHint = row?.vehicleConflict?.conflictingAgreementId
    ? `A#${row.vehicleConflict.conflictingAgreementId}`
    : row?.vehicleConflict?.conflictingShiftId
    ? `S#${row.vehicleConflict.conflictingShiftId}`
    : "";
  const dHint = row?.driverConflict?.conflictingAgreementId
    ? `A#${row.driverConflict.conflictingAgreementId}`
    : row?.driverConflict?.conflictingShiftId
    ? `S#${row.driverConflict.conflictingShiftId}`
    : "";

  return (
    <tr
      onClick={() => onSelectVehicle(Number(v.id) || 0)}
      style={rowSelectionStyle(Number(focusVehicleId || 0) === Number(v.id || 0))}
    >
      <td style={{ padding: "12px 10px", verticalAlign: "top" }}>
        <input type="checkbox" checked={!!availSel[v.id]} onChange={() => toggleSel(setAvailSel, v.id)} disabled={availBusy} />
      </td>
      <td style={{ padding: "12px 14px", verticalAlign: "top" }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <b>{v.plate}</b>
          <span className="muted">#{v.id}</span>
          {quickBusy ? <span className="pill" data-status="BUSY" title="Şu an shift var">Şu an meşgul</span> : <span className="pill" data-status="FREE" title="Şu an shift yok">Şu an müsait</span>}
        </div>
        {hasRegionOwnership(v) ? <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{formatRegionOwnership(v)}</div> : null}
      </td>
      <td style={{ padding: "12px 14px", verticalAlign: "top" }}>
        {v.driver ? fmtDriverHuman(v.driver) : <span className="muted">Bağlı sürücü yok</span>}
      </td>
      <td style={{ padding: "12px 14px", verticalAlign: "top" }}>
        {vOk == null ? <span className="muted">Kontrol edilmedi</span> : vOk ? <span className="pill" data-status="OK">OK</span> : (
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span className="pill" data-status="CONFLICT">CONFLICT: {vCode}</span>
            {vHint ? <span className="muted" style={{ fontSize: 12 }}>{vHint}</span> : null}
          </div>
        )}
      </td>
      <td style={{ padding: "12px 14px", verticalAlign: "top" }}>
        {hasDriver ? (dOk == null ? <span className="muted">Kontrol edilmedi</span> : dOk ? <span className="pill" data-status="OK">OK</span> : (
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <span className="pill" data-status="CONFLICT">CONFLICT: {dCode}</span>
            {dHint ? <span className="muted" style={{ fontSize: 12 }}>{dHint}</span> : null}
          </div>
        )) : <span className="muted">—</span>}
      </td>
    </tr>
  );
}

export function RoomTelematicsDeviceRow({
  d,
  deviceDrafts,
  setDeviceDrafts,
  deviceSaving,
  saveDevice,
  rotateDeviceToken,
}) {
  const draft = deviceDrafts?.[d.id] || { label: d.label || "", status: d.status || "ACTIVE" };

  return (
    <tr>
      <td>#{d.id}</td>
      <td>{d.vendor || "-"}</td>
      <td><code>{d.serial}</code></td>
      <td style={{ minWidth: 180 }}>
        <input
          value={draft.label}
          onChange={(e) => setDeviceDrafts((prev) => ({ ...prev, [d.id]: { ...draft, label: e.target.value } }))}
          placeholder="label"
          disabled={deviceSaving}
        />
      </td>
      <td style={{ minWidth: 130 }}>
        <select
          value={draft.status}
          onChange={(e) => setDeviceDrafts((prev) => ({ ...prev, [d.id]: { ...draft, status: e.target.value } }))}
          disabled={deviceSaving}
        >
          <option value="ACTIVE">Aktif</option>
          <option value="DISABLED">Devre Dışı</option>
        </select>
      </td>
      <td>{fmtTR(d.lastSeenAt)}</td>
      <td>{fmtTR(d.lastIngestAt)}</td>
      <td>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" disabled={deviceSaving} onClick={() => saveDevice(d.id)}>Kaydet</button>
          <button type="button" className="btn" disabled={deviceSaving} onClick={() => rotateDeviceToken(d.id)}>Token rotate</button>
        </div>
      </td>
    </tr>
  );
}
