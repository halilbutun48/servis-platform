import { useEffect, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";
import MapView from "../../components/map/MapView";

export default function PersonelLivePanel() {
  const { token } = useSession();
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [eta, setEta] = useState(null);
  const [err, setErr] = useState("");

  async function loadVehicles() {
    setErr("");
    try {
      const r = await api("/api/vehicles", { token });
      const items = Array.isArray(r) ? r : [];
      setVehicles(items);
      const vid = selectedVehicleId ?? (items[0]?.id ?? null);
      setSelectedVehicleId(vid);
      return vid;
    } catch (e) {
      setErr(String(e?.message || e));
      return null;
    }
  }

  async function loadEta(vid) {
    if (!vid) return;
    try {
      // personel konumu MVP'de user.me içinde olmayabilir; ETA endpoint'i opsiyonel
      const r = await api(`/api/eta?vehicleId=${encodeURIComponent(String(vid))}`, { token });
      setEta(r);
    } catch {
      setEta(null);
    }
  }

  async function loadAll() {
    const vid = await loadVehicles();
    await loadEta(vid);
  }

  useEffect(() => { loadAll(); }, []); // eslint-disable-line
  useAutoReload("vehicles", loadAll);
  useAutoReload("eta", loadAll);

  return (
    <div className="wrap wrap--fluid">
      <div className="topbar">
        <div>
          <div className="title">Personel • Canlı</div>
          <div className="muted">Araç konumu + basit ETA (varsa)</div>
        </div>
      </div>

      {err ? <div className="card err">{err}</div> : null}

      {eta ? (
        <div className="card">
          <div className="title" style={{ fontSize: 16 }}>ETA</div>
          <div className="muted">{eta?.minutes ? `${eta.minutes} dk` : JSON.stringify(eta)}</div>
        </div>
      ) : null}

      <MapView
        vehicles={vehicles}
        stops={[]}
        selectedVehicleId={selectedVehicleId}
        onSelectVehicle={(id) => { setSelectedVehicleId(id); loadEta(id); }}
        fitKey={`personel:${vehicles.length}`}
        height="calc(100vh - 320px)"
      />
    </div>
  );
}
