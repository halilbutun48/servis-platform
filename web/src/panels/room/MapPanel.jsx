// web/src/panels/room/MapPanel.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";
import MapView from "../../components/map/MapView";
import { uiStatusFromVehicle, pillKeyFromUi } from "../../utils/uiStatus";

function hasGpsFix(v) {
  const lat = v?.gpsLast?.lat;
  const lng = v?.gpsLast?.lng;
  return typeof lat === "number" && typeof lng === "number";
}

function gpsAtLabel(v) {
  const at = v?.gpsLast?.at || v?.gpsLast?.ts || v?.gpsLast?.updatedAt || null;
  if (!at) return "-";
  try {
    return new Date(at).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul" });
  } catch {
    return String(at);
  }
}

export default function RoomMapPanel() {
  const { token } = useSession();
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [err, setErr] = useState("");

  // ✅ GPS olmayanları göster filtresi
  const [showNoGps, setShowNoGps] = useState(true);

  async function load() {
    setErr("");
    try {
      const r = await api("/api/vehicles", { token });
      const items = Array.isArray(r) ? r : [];
      setVehicles(items);

      // selection sanity
      if (selectedVehicleId && !items.some((v) => v.id === selectedVehicleId)) setSelectedVehicleId(null);
      if (!selectedVehicleId && items.length) setSelectedVehicleId(items[0].id);
    } catch (e) {
      setErr(String(e?.message || e));
    }
  }

  useEffect(() => { load(); }, []); // eslint-disable-line
  useAutoReload("vehicles", load);

  const selected = useMemo(
    () => vehicles.find((v) => v.id === selectedVehicleId) || null,
    [vehicles, selectedVehicleId]
  );

  const stops = useMemo(() => {
    const s = selected?.shifts?.[0];
    return Array.isArray(s?.stops) ? s.stops : [];
  }, [selected]);

  const filteredVehicles = useMemo(() => {
    if (showNoGps) return vehicles;
    return vehicles.filter((v) => hasGpsFix(v));
  }, [vehicles, showNoGps]);

  // Eğer filtre yüzünden seçili araç görünmüyorsa, listede ilk aracı seç
  useEffect(() => {
    if (!filteredVehicles.length) return;
    if (!selectedVehicleId) return;
    const exists = filteredVehicles.some((v) => v.id === selectedVehicleId);
    if (!exists) setSelectedVehicleId(filteredVehicles[0].id);
  }, [filteredVehicles, selectedVehicleId]);

  const selectedHasGps = hasGpsFix(selected);

  return (
    <div className="wrap wrap--fluid">
      <div className="topbar">
        <div>
          <div className="title">Room • Canlı Harita</div>
          <div className="muted">Araçlar / GPS last / (varsa) aktif vardiya durakları</div>
        </div>
      </div>

      {err ? <div className="card err">{err}</div> : null}

      {/* ✅ Seçili araç GPS yoksa bilgi kutusu */}
      {selected && !selectedHasGps ? (
        <div className="card" style={{ borderLeft: "6px solid", padding: "10px 12px" }}>
          <b>📡 GPS yok:</b> <span style={{ marginLeft: 6 }}>{selected.plate}</span>
          <div className="muted" style={{ marginTop: 6 }}>
            Bu araç haritada marker olarak görünmez. GPS gelmesi için araç cihazından en az 1 kez konum (lat/lng) alınmalı.
          </div>
        </div>
      ) : null}

      <div className="grid mapGrid" style={{ ["--mapH"]: "calc(100vh - 260px)" }}>
        <div className="card mapAsideCard">
          <div className="title" style={{ fontSize: 16 }}>Araçlar</div>
          <div className="muted" style={{ marginBottom: 10 }}>Marker'a tıkla veya listeden seç.</div>

          {/* ✅ GPS olmayanları göster checkbox */}
          <label className="muted" style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 10 }}>
            <input
              type="checkbox"
              checked={showNoGps}
              onChange={(e) => setShowNoGps(Boolean(e.target.checked))}
            />
            GPS olmayanları göster
          </label>

          <div className="col mapAsideList">
            {!filteredVehicles.length ? (
              <div className="muted" style={{ padding: 10 }}>
                Liste boş (filtre nedeniyle olabilir).
              </div>
            ) : null}

            {filteredVehicles.map((v) => {
              const ui = uiStatusFromVehicle(v);   // LIVE|STALE|OFFLINE
              const pillKey = pillKeyFromUi(ui);   // ACTIVE|STALE|PASSIVE (CSS için)
              const gpsOk = hasGpsFix(v);

              return (
                <button
                  key={v.id}
                  onClick={() => setSelectedVehicleId(v.id)}
                  className={v.id === selectedVehicleId ? "navItem active" : "navItem"}
                  style={{ justifyContent: "space-between", gap: 10 }}
                  title={!gpsOk ? "GPS yok (haritada görünmez)" : ""}
                >
                  <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 2 }}>
                    <span>{v.plate}</span>
                    {!gpsOk ? (
                      <span className="muted" style={{ fontSize: 12 }}>📡 GPS yok</span>
                    ) : (
                      <span className="muted" style={{ fontSize: 12 }}>
                        Son GPS: {gpsAtLabel(v)}
                      </span>
                    )}
                  </span>

                  <span style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
                    <span className="pill" data-status={pillKey}>{ui}</span>
                    {!gpsOk ? (
                      <span className="pill" data-status="PASSIVE" style={{ fontSize: 11 }}>
                        NO GPS
                      </span>
                    ) : null}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <MapView
            // ✅ Harita sadece filtrelenmiş listeyi kullanır (NO GPS kapalıysa marker olmayanlar map'e gitmez)
            vehicles={filteredVehicles}
            stops={stops}
            selectedVehicleId={selectedVehicleId}
            onSelectVehicle={setSelectedVehicleId}
            // fitKey: filtre değişince ve sayı değişince re-fit
            fitKey={`room:${filteredVehicles.length}:${showNoGps ? "all" : "gpsOnly"}`}
            height="var(--mapH)"
          />
        </div>
      </div>
    </div>
  );
}
