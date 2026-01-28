// web/src/panels/company/MapPanel.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";
import MapView from "../../components/map/MapView";
import { uiStatusFromVehicle, pillKeyFromUi } from "../../utils/uiStatus";

const TYPE_TR = { MINIBUS: "Minibüs", MIDIBUS: "Midibüs", OTOBUS: "Otobüs" };

function vehicleMetaLine(v) {
  const type = TYPE_TR[v?.type] || (v?.type ? String(v.type) : "");
  const bmy = [v?.brand, v?.model, v?.modelYear].filter(Boolean).join(" ");
  const cap = Number.isFinite(v?.capacity) ? `${v.capacity} koltuk` : "";
  return [type, bmy, cap].filter(Boolean).join(" • ");
}

export default function CompanyMapPanel() {
  const { token } = useSession();
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [err, setErr] = useState("");

  async function load() {
    setErr("");
    try {
      const r = await api("/api/vehicles", { token });
      const items = Array.isArray(r) ? r : [];
      setVehicles(items);

      if (selectedVehicleId && !items.some((v) => v.id === selectedVehicleId)) setSelectedVehicleId(null);
      if (!selectedVehicleId && items.length) setSelectedVehicleId(items[0].id);
    } catch (e) {
      setErr(String(e?.message || e));
    }
  }

  useEffect(() => {
    load();
  }, []); // eslint-disable-line
  useAutoReload("vehicles", load);

  const selected = useMemo(
    () => vehicles.find((v) => v.id === selectedVehicleId) || null,
    [vehicles, selectedVehicleId]
  );

  return (
    <div className="wrap wrap--fluid">
      <div className="topbar">
        <div>
          <div className="title">Company • Canlı Harita</div>
          <div className="muted">Onaylı/aktif vardiyalardaki araçlar</div>

          {selected ? (
            <div className="muted" style={{ marginTop: 6 }}>
              Seçili: {selected.plate} • {vehicleMetaLine(selected)}
            </div>
          ) : null}
        </div>
      </div>

      {err ? <div className="card err">{err}</div> : null}

      <div className="grid mapGrid" style={{ ["--mapH"]: "calc(100vh - 260px)" }}>
        <div className="card mapAsideCard">
          <div className="title" style={{ fontSize: 16 }}>
            Araçlar
          </div>
          <div className="muted" style={{ marginBottom: 10 }}>
            Marker&apos;a tıkla veya listeden seç.
          </div>

          <div className="col mapAsideList">
            {vehicles.map((v) => {
              const ui = uiStatusFromVehicle(v); // LIVE|STALE|OFFLINE
              const pillKey = pillKeyFromUi(ui); // ACTIVE|STALE|PASSIVE
              const line = `${v.plate} • ${vehicleMetaLine(v)}`;

              return (
                <button
                  key={v.id}
                  onClick={() => setSelectedVehicleId(v.id)}
                  className={v.id === selectedVehicleId ? "navItem active" : "navItem"}
                  style={{ justifyContent: "space-between" }}
                  title={line}
                >
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {line}
                  </span>
                  <span className="pill" data-status={pillKey}>
                    {ui}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <MapView
            vehicles={vehicles}
            stops={[]}
            selectedVehicleId={selectedVehicleId}
            onSelectVehicle={setSelectedVehicleId}
            fitKey={`company:${vehicles.length}`}
            height="var(--mapH)"
          />
        </div>
      </div>
    </div>
  );
}