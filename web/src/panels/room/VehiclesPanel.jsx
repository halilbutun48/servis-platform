// web/src/panels/room/VehiclesPanel.jsx
import { useEffect, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";
import { uiStatusFromVehicle, pillKeyFromUi } from "../../utils/uiStatus";

const VEHICLE_TYPES = [
  { value: "", label: "Seç (opsiyonel)" },
  { value: "MINIBUS", label: "Minibüs" },
  { value: "MIDIBUS", label: "Midibüs" },
  { value: "OTOBUS", label: "Otobüs" },
];

export default function VehiclesPanel() {
  const { token } = useSession();
  const [items, setItems] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [bindSel, setBindSel] = useState({});
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  // core
  const [plate, setPlate] = useState("");
  const [capacity, setCapacity] = useState(16);
  const [speedLimitKmh, setSpeedLimitKmh] = useState(80);

  // meta
  const [type, setType] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [modelYear, setModelYear] = useState("");
  const [color, setColor] = useState("");
  const [vin, setVin] = useState("");
  const [note, setNote] = useState("");

  // dates / km
  const [inspectionDueAt, setInspectionDueAt] = useState(""); // date
  const [lastServiceAt, setLastServiceAt] = useState(""); // date
  const [lastServiceKm, setLastServiceKm] = useState(""); // number
  const [serviceIntervalKm, setServiceIntervalKm] = useState(15000);
  const [odometerKm, setOdometerKm] = useState(""); // number

  // legacy (backward compat)
  const [nextMaintenanceAt, setNextMaintenanceAt] = useState(""); // datetime-local

  async function load() {
    setErr("");
    try {
      const [v, d] = await Promise.all([
        api("/api/vehicles", { token }),
        api("/api/drivers", { token }),
      ]);
      setItems(Array.isArray(v) ? v : []);
      setDrivers(Array.isArray(d) ? d : []);
    } catch (e) {
      setErr(String(e?.message || e));
    }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line
  useAutoReload("vehicles", load);
  useAutoReload("drivers", load);

  async function createVehicle(e) {
    e.preventDefault();
    setBusy(true);
    setErr("");
    try {
      const body = {
        plate: plate.trim(),
        capacity: Number(capacity),
        speedLimitKmh: Number(speedLimitKmh),
      };

      if (type) body.type = type;
      if (brand.trim()) body.brand = brand.trim();
      if (model.trim()) body.model = model.trim();
      if (String(modelYear).trim()) body.modelYear = Number(modelYear);
      if (color.trim()) body.color = color.trim();
      if (vin.trim()) body.vin = vin.trim();
      if (note.trim()) body.note = note.trim();

      if (inspectionDueAt) body.inspectionDueAt = new Date(inspectionDueAt).toISOString();
      if (lastServiceAt) body.lastServiceAt = new Date(lastServiceAt).toISOString();
      if (String(lastServiceKm).trim()) body.lastServiceKm = Number(lastServiceKm);
      if (serviceIntervalKm) body.serviceIntervalKm = Number(serviceIntervalKm);
      if (String(odometerKm).trim()) body.odometerKm = Number(odometerKm);

      if (nextMaintenanceAt) body.nextMaintenanceAt = new Date(nextMaintenanceAt).toISOString();

      await api("/api/vehicles", { method: "POST", token, body });
      setPlate("");
      await load();
    } catch (e2) {
      setErr(String(e2?.message || e2));
    } finally {
      setBusy(false);
    }
  }


  async function bindDriver(vehicleId) {
    const sel = bindSel?.[vehicleId] ?? "";
    const driverId = Number(sel || 0);
    if (!driverId) {
      setErr("Bağlamak için driver seçmelisin.");
      return;
    }

    setBusy(true);
    setErr("");
    try {
      await api(`/api/vehicles/${vehicleId}/bind-driver`, {
        method: "PUT",
        token,
        body: { driverId },
      });
      await load();
    } catch (e) {
      setErr(String(e?.payload?.message || e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  function fmtDate(v) {
    if (!v) return "-";
    try {
      const d = new Date(v);
      return d.toISOString().slice(0, 10);
    } catch {
      return String(v);
    }
  }

  return (
    <div>
      <div className="card">
        <h3>Vehicles</h3>
        <div className="muted">ROOM: araç ekle/listele</div>
      </div>

      {err ? <div className="card err">{err}</div> : null}

      <div className="card">
        <h3>Yeni Araç</h3>
        <form onSubmit={createVehicle} className="grid">
          <div className="col">
            <label className="muted">Plaka</label>
            <input value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="34 ABC 123" />
          </div>

          <div className="col">
            <label className="muted">Kapasite (koltuk)</label>
            <input type="number" value={capacity} onChange={(e) => setCapacity(e.target.value)} />
          </div>

          <div className="col">
            <label className="muted">Araç tipi</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              {VEHICLE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div className="col">
            <label className="muted">Marka</label>
            <input value={brand} onChange={(e) => setBrand(e.target.value)} placeholder="Ford" />
          </div>

          <div className="col">
            <label className="muted">Model</label>
            <input value={model} onChange={(e) => setModel(e.target.value)} placeholder="Transit" />
          </div>

          <div className="col">
            <label className="muted">Model yılı</label>
            <input type="number" value={modelYear} onChange={(e) => setModelYear(e.target.value)} placeholder="2021" />
          </div>

          <div className="col">
            <label className="muted">Hız limiti (km/h)</label>
            <input type="number" value={speedLimitKmh} onChange={(e) => setSpeedLimitKmh(e.target.value)} />
          </div>

          <div className="col">
            <label className="muted">Muayene bitiş</label>
            <input type="date" value={inspectionDueAt} onChange={(e) => setInspectionDueAt(e.target.value)} />
          </div>

          <div className="col">
            <label className="muted">Güncel km</label>
            <input type="number" value={odometerKm} onChange={(e) => setOdometerKm(e.target.value)} placeholder="123456" />
          </div>

          <div className="col">
            <label className="muted">Son bakım tarihi</label>
            <input type="date" value={lastServiceAt} onChange={(e) => setLastServiceAt(e.target.value)} />
          </div>

          <div className="col">
            <label className="muted">Son bakım km</label>
            <input type="number" value={lastServiceKm} onChange={(e) => setLastServiceKm(e.target.value)} placeholder="110000" />
          </div>

          <div className="col">
            <label className="muted">Bakım periyodu (km)</label>
            <input type="number" value={serviceIntervalKm} onChange={(e) => setServiceIntervalKm(e.target.value)} />
          </div>

          <div className="col">
            <label className="muted">Bakım tarihi (eski/opsiyonel)</label>
            <input type="datetime-local" value={nextMaintenanceAt} onChange={(e) => setNextMaintenanceAt(e.target.value)} />
          </div>

          <div className="col">
            <label className="muted">Renk (ops.)</label>
            <input value={color} onChange={(e) => setColor(e.target.value)} placeholder="Beyaz" />
          </div>

          <div className="col">
            <label className="muted">VIN (ops.)</label>
            <input value={vin} onChange={(e) => setVin(e.target.value)} placeholder="Şasi No" />
          </div>

          <div className="col" style={{ gridColumn: "1 / -1" }}>
            <label className="muted">Not (ops.)</label>
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Araçla ilgili not..." />
          </div>

          <div className="col" style={{ justifyContent: "end" }}>
            <button disabled={busy} type="submit">{busy ? "..." : "Ekle"}</button>
          </div>
        </form>
      </div>

      <div className="card">
        <h3>Liste</h3>
        <table className="tbl">
          <thead>
            <tr>
              <th>ID</th>
              <th>Plaka</th>
              <th>Driver</th>
              <th>Status</th>
              <th>Tip</th>
              <th>Marka/Model/Yıl</th>
              <th>Kapasite</th>
              <th>Limit</th>
              <th>Muayene</th>
              <th>Km / Bakım</th>
              <th>Bakım (eski)</th>
              <th>GPS</th>
            </tr>
          </thead>
          <tbody>
            {items.map((v) => {
              const ui = uiStatusFromVehicle(v);     // LIVE|STALE|OFFLINE
              const pillKey = pillKeyFromUi(ui);     // ACTIVE|STALE|PASSIVE (CSS)

              const nextKm = (v.lastServiceKm != null && v.serviceIntervalKm != null)
                ? (v.lastServiceKm + v.serviceIntervalKm)
                : null;
              const remainingKm = (nextKm != null && v.odometerKm != null)
                ? (nextKm - v.odometerKm)
                : null;

              const brandLine = [v.brand, v.model, v.modelYear].filter(Boolean).join(" ");

              const curDriverId = v.driverId ?? v.driver?.id ?? "";
              const selectedDriverId = String(bindSel[v.id] ?? curDriverId ?? "");
              const currentDriverLabel = v.driver?.fullName || (curDriverId ? `#${curDriverId}` : "-");

              return (
                <tr key={v.id}>
                  <td>{v.id}</td>
                  <td>{v.plate}</td>

                  <td>
                    <div className="muted">{currentDriverLabel}</div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                      <select
                        value={selectedDriverId}
                        onChange={(e) => setBindSel((prev) => ({ ...prev, [v.id]: e.target.value }))}
                        disabled={busy}
                      >
                        <option value="">Driver seç</option>
                        {drivers.map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.fullName}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={busy || !selectedDriverId || String(curDriverId || "") === String(selectedDriverId)}
                        onClick={() => bindDriver(v.id)}
                        title="Araca driver bağla"
                      >
                        Bağla
                      </button>
                    </div>
                  </td>

                  <td>
                    <span className="pill" data-status={pillKey}>{ui}</span>
                  </td>

                  <td className="muted">{v.type ?? "-"}</td>
                  <td>{brandLine || "-"}</td>

                  <td>{v.capacity}</td>
                  <td>{v.speedLimitKmh}</td>

                  <td className="muted">{fmtDate(v.inspectionDueAt)}</td>

                  <td className="muted">
                    {v.odometerKm != null ? `${v.odometerKm} km` : "-"}
                    {remainingKm != null ? ` • bakım ${remainingKm} km` : ""}
                  </td>

                  <td className="muted">{v.nextMaintenanceAt ? String(v.nextMaintenanceAt) : "-"}</td>

                  <td className="muted">
                    {v.gpsLast
                      ? `${v.gpsLast.lat.toFixed(4)}, ${v.gpsLast.lng.toFixed(4)} • ${v.gpsLast.speed ?? "-"} km/h • ${String(v.gpsLast.status)}`
                      : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
