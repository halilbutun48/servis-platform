//web/src/panels/room/ShiftsPanel.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";

export default function RoomShiftsPanel() {
  const { token } = useSession();
  const [shifts, setShifts] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const requested = useMemo(() => shifts.filter((s) => s.status === "REQUESTED"), [shifts]);

  async function loadAll() {
    setErr("");
    try {
      const [s, v, d] = await Promise.all([
        api("/api/shifts", { token }),
        api("/api/vehicles", { token }),
        api("/api/drivers", { token }),
      ]);
      setShifts(Array.isArray(s) ? s : []);
      setVehicles(Array.isArray(v) ? v : []);
      setDrivers(Array.isArray(d) ? d : []);
    } catch (e) {
      setErr(String(e?.message || e));
    }
  }

  useEffect(() => { loadAll(); }, []); // eslint-disable-line
  useAutoReload("shifts", loadAll);
  useAutoReload("vehicles", loadAll);
  useAutoReload("drivers", loadAll);

  const [approveSel, setApproveSel] = useState({});

  function setSel(shiftId, patch) {
    setApproveSel((prev) => ({ ...prev, [shiftId]: { ...(prev[shiftId] || {}), ...patch } }));
  }

  async function approveShift(shiftId) {
    const sel = approveSel[shiftId] || {};
    if (!sel.vehicleId || !sel.driverId) {
      setErr("Approve için vehicleId ve driverId seçmelisin.");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      await api(`/api/shifts/${shiftId}/approve`, {
        method: "POST",
        token,
        body: { vehicleId: Number(sel.vehicleId), driverId: Number(sel.driverId) },
      });
      await loadAll();
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="card">
        <h3>Shifts (ROOM)</h3>
        <div className="muted">Company request → Room approve (vehicle + driver)</div>
      </div>

      {err ? <div className="card err">{err}</div> : null}

      <div className="card">
        <h3>Bekleyen Talepler</h3>
        {requested.length ? (
          <table className="tbl">
            <thead>
              <tr>
                <th>ID</th>
                <th>Company</th>
                <th>Start</th>
                <th>End</th>
                <th>Vehicle</th>
                <th>Driver</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {requested.map((s) => (
                <tr key={s.id}>
                  <td>{s.id}</td>
                  <td className="muted">{s.company?.name || s.companyId}</td>
                  <td className="muted">{String(s.startAt)}</td>
                  <td className="muted">{String(s.endAt)}</td>
                  <td>
                    <select
                      value={approveSel[s.id]?.vehicleId || ""}
                      onChange={(e) => setSel(s.id, { vehicleId: e.target.value })}
                    >
                      <option value="">Seç</option>
                      {vehicles.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.plate} (#{v.id})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <select
                      value={approveSel[s.id]?.driverId || ""}
                      onChange={(e) => setSel(s.id, { driverId: e.target.value })}
                    >
                      <option value="">Seç</option>
                      {drivers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.fullName} (#{d.id})
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <button disabled={busy} onClick={() => approveShift(s.id)}>
                      {busy ? "..." : "Approve"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="muted">Bekleyen talep yok.</div>
        )}
      </div>

      <div className="card">
        <h3>Tüm Shifts</h3>
        <table className="tbl">
          <thead>
            <tr>
              <th>ID</th>
              <th>Status</th>
              <th>Company</th>
              <th>Vehicle</th>
              <th>Driver</th>
              <th>Start</th>
              <th>End</th>
            </tr>
          </thead>
          <tbody>
            {shifts.map((s) => (
              <tr key={s.id}>
                <td>{s.id}</td>
                <td><span className="pill" data-status={s.status}>{s.status}</span></td>
                <td className="muted">{s.company?.name || s.companyId}</td>
                <td className="muted">{s.vehicle?.plate || (s.vehicleId ? `#${s.vehicleId}` : "-")}</td>
                <td className="muted">{s.driver?.fullName || (s.driverId ? `#${s.driverId}` : "-")}</td>
                <td className="muted">{String(s.startAt)}</td>
                <td className="muted">{String(s.endAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
