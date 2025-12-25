import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";

function getToken() {
  return localStorage.getItem("token") || "";
}

async function api(path, { method = "GET", body } = {}) {
  const token = getToken();
  const res = await fetch(path, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { "x-auth-token": token } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.ok === false) throw new Error(json?.error || `HTTP_${res.status}`);
  return json;
}

function ClickToSetLatLon({ onPick }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng);
    },
  });
  return null;
}

export default function SchoolPanel() {
  const [school, setSchool] = useState(null);
  const [vehicles, setVehicles] = useState([]);
  const [routes, setRoutes] = useState([]);

  const [newVehicle, setNewVehicle] = useState({ plate: "", driverUserId: "" });
  const [newRoute, setNewRoute] = useState({ name: "", vehicleId: "" });

  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [stops, setStops] = useState([]);

  const [newStop, setNewStop] = useState({ ord: "", name: "", lat: "", lon: "" });

  const selectedRoute = useMemo(() => {
    const id = Number(selectedRouteId);
    return routes.find((r) => r.id === id) || null;
  }, [routes, selectedRouteId]);

  const center = useMemo(() => {
    if (school?.lat != null && school?.lon != null) return [school.lat, school.lon];
    // İstanbul fallback
    return [41.0094, 28.9794];
  }, [school]);

  async function refreshAll() {
    try {
      const s = await api("/api/school/me");
      setSchool(s.school);

      const v = await api("/api/school/vehicles");
      setVehicles(v.vehicles || []);

      const r = await api("/api/school/routes");
      setRoutes(r.routes || []);
    } catch (e) {
      toast.error("Okul paneli yüklenemedi: " + e.message);
    }
  }

  async function refreshStops(routeId) {
    if (!routeId) return;
    try {
      const j = await api(`/api/school/routes/${routeId}/stops`);
      setStops(j.stops || []);
    } catch (e) {
      toast.error("Duraklar alınamadı: " + e.message);
    }
  }

  useEffect(() => {
    refreshAll();
  }, []);

  useEffect(() => {
    if (selectedRouteId) refreshStops(Number(selectedRouteId));
  }, [selectedRouteId]);

  async function createVehicle() {
    if (!newVehicle.plate.trim()) return toast.error("Plaka zorunlu");
    try {
      const body = {
        plate: newVehicle.plate.trim(),
        driverUserId: newVehicle.driverUserId === "" ? null : Number(newVehicle.driverUserId),
      };
      await api("/api/school/vehicles", { method: "POST", body });
      toast.success("Araç eklendi");
      setNewVehicle({ plate: "", driverUserId: "" });
      await refreshAll();
    } catch (e) {
      toast.error("Araç eklenemedi: " + e.message);
    }
  }

  async function createRoute() {
    if (!newRoute.name.trim()) return toast.error("Rota adı zorunlu");
    try {
      const body = {
        name: newRoute.name.trim(),
        vehicleId: newRoute.vehicleId === "" ? null : Number(newRoute.vehicleId),
      };
      await api("/api/school/routes", { method: "POST", body });
      toast.success("Rota eklendi");
      setNewRoute({ name: "", vehicleId: "" });
      await refreshAll();
    } catch (e) {
      toast.error("Rota eklenemedi: " + e.message);
    }
  }

  async function addStop() {
    if (!selectedRouteId) return toast.error("Önce rota seç");
    if (!newStop.name.trim()) return toast.error("Durak adı zorunlu");
    if (newStop.lat === "" || newStop.lon === "") return toast.error("Lat/Lon zorunlu (haritadan tıklayabilirsin)");

    try {
      const body = {
        ord: newStop.ord === "" ? null : Number(newStop.ord),
        name: newStop.name.trim(),
        lat: Number(newStop.lat),
        lon: Number(newStop.lon),
      };
      await api(`/api/school/routes/${Number(selectedRouteId)}/stops`, { method: "POST", body });
      toast.success("Durak eklendi");
      setNewStop({ ord: "", name: "", lat: "", lon: "" });
      await refreshStops(Number(selectedRouteId));
    } catch (e) {
      toast.error("Durak eklenemedi: " + e.message);
    }
  }

  async function saveSchoolLocation() {
    try {
      if (!school) return;
      const body = { lat: school.lat, lon: school.lon };
      const j = await api("/api/school/me/location", { method: "PUT", body });
      setSchool(j.school);
      toast.success("Okul konumu kaydedildi");
    } catch (e) {
      toast.error("Konum kaydedilemedi: " + e.message);
    }
  }

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <h2 style={{ marginBottom: 8 }}>Okul Yönetimi</h2>
      <div style={{ opacity: 0.7, marginBottom: 14 }}>
        Araç / Rota / Durak yönetimi (SCHOOL_ADMIN)
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ padding: 14, border: "1px solid #eee", borderRadius: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Okul</div>
          <div style={{ fontSize: 13, opacity: 0.85 }}>
            {school ? (
              <>
                <b>{school.name}</b> (id={school.id})<br />
                lat: <input value={school.lat ?? ""} onChange={(e) => setSchool((p) => ({ ...p, lat: e.target.value === "" ? null : Number(e.target.value) }))} style={{ width: 120 }} />
                {"  "}
                lon: <input value={school.lon ?? ""} onChange={(e) => setSchool((p) => ({ ...p, lon: e.target.value === "" ? null : Number(e.target.value) }))} style={{ width: 120 }} />
                {"  "}
                <button onClick={saveSchoolLocation}>Konumu Kaydet</button>
              </>
            ) : (
              "Yükleniyor..."
            )}
          </div>

          <div style={{ marginTop: 14, fontWeight: 700 }}>Araçlar</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            <input placeholder="Plaka" value={newVehicle.plate} onChange={(e) => setNewVehicle((p) => ({ ...p, plate: e.target.value }))} />
            <input placeholder="driverUserId (ops)" value={newVehicle.driverUserId} onChange={(e) => setNewVehicle((p) => ({ ...p, driverUserId: e.target.value }))} style={{ width: 160 }} />
            <button onClick={createVehicle}>Araç Ekle</button>
          </div>

          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {vehicles.map((v) => (
              <div key={v.id} style={{ padding: 10, border: "1px solid #f0f0f0", borderRadius: 10 }}>
                <div style={{ fontWeight: 700 }}>#{v.id} — {v.plate}</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  driver: {v.driver ? `${v.driver.email} (#${v.driver.id})` : "-"}
                </div>
              </div>
            ))}
            {vehicles.length === 0 && <div style={{ opacity: 0.6 }}>Araç yok.</div>}
          </div>
        </div>

        <div style={{ padding: 14, border: "1px solid #eee", borderRadius: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>Rotalar</div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input placeholder="Rota adı" value={newRoute.name} onChange={(e) => setNewRoute((p) => ({ ...p, name: e.target.value }))} />
            <select value={newRoute.vehicleId} onChange={(e) => setNewRoute((p) => ({ ...p, vehicleId: e.target.value }))} style={{ padding: 8 }}>
              <option value="">Araç (ops)</option>
              {vehicles.map((v) => <option key={v.id} value={v.id}>{v.plate} (#{v.id})</option>)}
            </select>
            <button onClick={createRoute}>Rota Ekle</button>
          </div>

          <div style={{ marginTop: 12 }}>
            <select value={selectedRouteId} onChange={(e) => setSelectedRouteId(e.target.value)} style={{ width: "100%", padding: 8 }}>
              <option value="">Rota seç</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  #{r.id} — {r.name} (stops: {r._count?.stops ?? 0})
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginTop: 12, fontWeight: 700 }}>Durak Ekle</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            <input placeholder="ord (boş=auto)" value={newStop.ord} onChange={(e) => setNewStop((p) => ({ ...p, ord: e.target.value }))} style={{ width: 120 }} />
            <input placeholder="Durak adı" value={newStop.name} onChange={(e) => setNewStop((p) => ({ ...p, name: e.target.value }))} />
            <input placeholder="lat" value={newStop.lat} onChange={(e) => setNewStop((p) => ({ ...p, lat: e.target.value }))} style={{ width: 140 }} />
            <input placeholder="lon" value={newStop.lon} onChange={(e) => setNewStop((p) => ({ ...p, lon: e.target.value }))} style={{ width: 140 }} />
            <button onClick={addStop} disabled={!selectedRouteId}>Durak Ekle</button>
          </div>

          <div style={{ marginTop: 10, height: 360, borderRadius: 12, overflow: "hidden", border: "1px solid #eee" }}>
            <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <ClickToSetLatLon onPick={(ll) => setNewStop((p) => ({ ...p, lat: ll.lat.toFixed(6), lon: ll.lng.toFixed(6) }))} />
              {school?.lat != null && school?.lon != null && (
                <Marker position={[school.lat, school.lon]}>
                  <Popup>Okul: {school.name}</Popup>
                </Marker>
              )}
              {stops.map((st) => (
                <Marker key={st.id} position={[st.lat, st.lon]}>
                  <Popup>
                    <b>{st.ord}. {st.name}</b><br />
                    {st.lat}, {st.lon}
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          </div>

          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {selectedRoute ? (
              stops.length ? (
                stops.map((st) => (
                  <div key={st.id} style={{ padding: 10, border: "1px solid #f0f0f0", borderRadius: 10 }}>
                    <div style={{ fontWeight: 700 }}>{st.ord}. {st.name}</div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>{st.lat}, {st.lon} — id={st.id}</div>
                  </div>
                ))
              ) : (
                <div style={{ opacity: 0.6 }}>Seçili rotada durak yok.</div>
              )
            ) : (
              <div style={{ opacity: 0.6 }}>Durakları görmek için rota seç.</div>
            )}
          </div>

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>
            Haritaya tıkla → lat/lon otomatik dolar.
          </div>
        </div>
      </div>
    </div>
  );
}
