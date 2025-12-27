import { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { t } from "../i18n/t";

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

  const [students, setStudents] = useState([]);
  const [studentQ, setStudentQ] = useState("");
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [studentsError, setStudentsError] = useState(null);

  const selectedRoute = useMemo(() => {
    const id = Number(selectedRouteId);
    return routes.find((r) => r.id === id) || null;
  }, [routes, selectedRouteId]);

  const center = useMemo(() => {
    if (school?.lat != null && school?.lon != null) return [school.lat, school.lon];
    // Istanbul fallback
    return [41.0094, 28.9794];
  }, [school]);

  const routeNameById = useMemo(() => {
    const m = new Map();
    for (const r of routes || []) m.set(r.id, r.name);
    return m;
  }, [routes]);

  async function refreshAll() {
    try {
      const s = await api("/api/school/me");
      setSchool(s.school);

      const v = await api("/api/school/vehicles");
      setVehicles(v.vehicles || []);

      const r = await api("/api/school/routes");
      setRoutes(r.routes || []);
    } catch (e) {
      toast.error(`${t("toast_err_refresh_failed")}: ${e.message}`);
    }
  }

  async function refreshStops(routeId) {
    try {
      const j = await api(`/api/school/routes/${routeId}/stops`);
      setStops(j.stops || []);
    } catch (e) {
      toast.error(`${t("toast_err_stops_fetch_failed")}: ${e.message}`);
    }
  }

  const loadStudents = async (q = "") => {
    setStudentsLoading(true);
    setStudentsError(null);
    try {
      const url = q ? `/api/school/students?q=${encodeURIComponent(q)}` : "/api/school/students";
      const j = await api(url);
      setStudents(j?.students || []);
    } catch (e) {
      setStudentsError(String(e?.message || e));
    } finally {
      setStudentsLoading(false);
    }
  };

  useEffect(() => {
    refreshAll();
    loadStudents("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selectedRouteId) refreshStops(Number(selectedRouteId));
  }, [selectedRouteId]);

  async function createVehicle() {
    if (!newVehicle.plate.trim()) return toast.error(t("toast_err_plate_required"));

    try {
      const body = {
        plate: newVehicle.plate.trim(),
        driverUserId: newVehicle.driverUserId === "" ? null : Number(newVehicle.driverUserId),
      };
      await api("/api/school/vehicles", { method: "POST", body });
      toast.success(t("toast_ok_vehicle_added"));
      setNewVehicle({ plate: "", driverUserId: "" });
      await refreshAll();
    } catch (e) {
      toast.error(`${t("toast_err_vehicle_add_failed")}: ${e.message}`);
    }
  }

  async function createRoute() {
    if (!newRoute.name.trim()) return toast.error(t("toast_err_route_name_required"));

    try {
      const body = {
        name: newRoute.name.trim(),
        vehicleId: newRoute.vehicleId === "" ? null : Number(newRoute.vehicleId),
      };
      await api("/api/school/routes", { method: "POST", body });
      toast.success(t("toast_ok_route_added"));
      setNewRoute({ name: "", vehicleId: "" });
      await refreshAll();
    } catch (e) {
      toast.error(`${t("toast_err_route_add_failed")}: ${e.message}`);
    }
  }

  async function addStop() {
    if (!selectedRouteId) return toast.error(t("toast_err_select_route_first"));
    if (!newStop.name.trim()) return toast.error(t("toast_err_stop_name_required"));
    if (newStop.lat === "" || newStop.lon === "") return toast.error(t("toast_err_latlon_required"));

    try {
      const body = {
        ord: newStop.ord === "" ? null : Number(newStop.ord),
        name: newStop.name.trim(),
        lat: Number(newStop.lat),
        lon: Number(newStop.lon),
      };
      await api(`/api/school/routes/${Number(selectedRouteId)}/stops`, { method: "POST", body });
      toast.success(t("toast_ok_stop_added"));
      setNewStop({ ord: "", name: "", lat: "", lon: "" });
      await refreshStops(Number(selectedRouteId));
    } catch (e) {
      toast.error(`${t("toast_err_stop_add_failed")}: ${e.message}`);
    }
  }

  async function saveSchoolLocation() {
    try {
      if (!school) return;
      const body = { lat: school.lat, lon: school.lon };
      const j = await api("/api/school/me/location", { method: "PUT", body });
      setSchool(j.school);
      toast.success(t("toast_ok_school_location_saved"));
    } catch (e) {
      toast.error(`${t("toast_err_school_location_save_failed")}: ${e.message}`);
    }
  }

  return (
    <div style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
      <h2 style={{ marginBottom: 8 }}>{t("school_title")}</h2>
      <div style={{ opacity: 0.7, marginBottom: 14 }}>{t("school_subtitle")}</div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ padding: 14, border: "1px solid #eee", borderRadius: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>{t("school_section_school")}</div>

          <div style={{ fontSize: 13, opacity: 0.85 }}>
            {school ? (
              <>
                <b>{school.name}</b> (id={school.id})
                <br />
                lat:{" "}
                <input
                  value={school.lat ?? ""}
                  onChange={(e) =>
                    setSchool((p) => ({
                      ...p,
                      lat: e.target.value === "" ? null : Number(e.target.value),
                    }))
                  }
                  style={{ width: 120 }}
                />
                {"  "}
                lon:{" "}
                <input
                  value={school.lon ?? ""}
                  onChange={(e) =>
                    setSchool((p) => ({
                      ...p,
                      lon: e.target.value === "" ? null : Number(e.target.value),
                    }))
                  }
                  style={{ width: 120 }}
                />
                {"  "}
                <button onClick={saveSchoolLocation}>{t("school_btn_save_location")}</button>
              </>
            ) : (
              t("school_loading")
            )}
          </div>

          <div style={{ marginTop: 14, fontWeight: 700 }}>{t("school_section_vehicles")}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            <input
              placeholder={t("school_placeholder_plate")}
              value={newVehicle.plate}
              onChange={(e) => setNewVehicle((p) => ({ ...p, plate: e.target.value }))}
            />
            <input
              placeholder={t("school_placeholder_driver_user_id")}
              value={newVehicle.driverUserId}
              onChange={(e) => setNewVehicle((p) => ({ ...p, driverUserId: e.target.value }))}
              style={{ width: 160 }}
            />
            <button onClick={createVehicle}>{t("school_btn_add_vehicle")}</button>
          </div>

          <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
            {vehicles.map((v) => (
              <div key={v.id} style={{ padding: 10, border: "1px solid #f0f0f0", borderRadius: 10 }}>
                <div style={{ fontWeight: 700 }}>
                  #{v.id} - {v.plate}
                </div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>
                  {t("school_vehicle_driver_label")}:{" "}
                  {v.driver ? `${v.driver.email} (#${v.driver.id})` : "-"}
                </div>
              </div>
            ))}
            {vehicles.length === 0 && <div style={{ opacity: 0.6 }}>{t("school_vehicle_none")}</div>}
          </div>
        </div>

        <div style={{ padding: 14, border: "1px solid #eee", borderRadius: 12 }}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>{t("school_section_routes")}</div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input
              placeholder={t("school_placeholder_route_name")}
              value={newRoute.name}
              onChange={(e) => setNewRoute((p) => ({ ...p, name: e.target.value }))}
              style={{ padding: 8 }}
            />

            <select
              value={newRoute.vehicleId}
              onChange={(e) => setNewRoute((p) => ({ ...p, vehicleId: e.target.value }))}
              style={{ padding: 8 }}
            >
              <option value="">{t("school_option_vehicle_optional")}</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.plate} (#{v.id})
                </option>
              ))}
            </select>

            <button onClick={createRoute}>{t("school_btn_add_route")}</button>
          </div>

          <div style={{ marginTop: 12 }}>
            <select
              value={selectedRouteId}
              onChange={(e) => setSelectedRouteId(e.target.value)}
              style={{ width: "100%", padding: 8 }}
            >
              <option value="">{t("school_select_route_placeholder")}</option>
              {routes.map((r) => (
                <option key={r.id} value={r.id}>
                  #{r.id} - {r.name} ({t("school_label_stops")}: {r._count?.stops ?? 0})
                </option>
              ))}
            </select>
          </div>

          <div style={{ marginTop: 12, fontWeight: 700 }}>{t("school_section_add_stop")}</div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
            <input
              placeholder={t("school_placeholder_ord")}
              value={newStop.ord}
              onChange={(e) => setNewStop((p) => ({ ...p, ord: e.target.value }))}
              style={{ width: 140 }}
            />
            <input
              placeholder={t("school_placeholder_stop_name")}
              value={newStop.name}
              onChange={(e) => setNewStop((p) => ({ ...p, name: e.target.value }))}
            />
            <input
              placeholder="lat"
              value={newStop.lat}
              onChange={(e) => setNewStop((p) => ({ ...p, lat: e.target.value }))}
              style={{ width: 140 }}
            />
            <input
              placeholder="lon"
              value={newStop.lon}
              onChange={(e) => setNewStop((p) => ({ ...p, lon: e.target.value }))}
              style={{ width: 140 }}
            />
            <button onClick={addStop} disabled={!selectedRouteId}>
              {t("school_btn_add_stop")}
            </button>
          </div>

          <div style={{ marginTop: 10, height: 360, borderRadius: 12, overflow: "hidden", border: "1px solid #eee" }}>
            <MapContainer center={center} zoom={13} style={{ height: "100%", width: "100%" }}>
              <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              <ClickToSetLatLon
                onPick={(ll) => setNewStop((p) => ({ ...p, lat: ll.lat.toFixed(6), lon: ll.lng.toFixed(6) }))}
              />

              {school?.lat != null && school?.lon != null && (
                <Marker position={[school.lat, school.lon]}>
                  <Popup>
                    {t("school_popup_school")}: {school.name}
                  </Popup>
                </Marker>
              )}

              {stops.map((st) => (
                <Marker key={st.id} position={[st.lat, st.lon]}>
                  <Popup>
                    <b>
                      {st.ord}. {st.name}
                    </b>
                    <br />
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
                    <div style={{ fontWeight: 700 }}>
                      {st.ord}. {st.name}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>
                      {st.lat}, {st.lon} - id={st.id}
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ opacity: 0.6 }}>{t("school_selected_route_no_stops")}</div>
              )
            ) : (
              <div style={{ opacity: 0.6 }}>{t("school_select_route_to_view_stops")}</div>
            )}
          </div>

          <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>{t("school_map_click_hint")}</div>
        </div>
      </div>

      {/* Students */}
      <div style={{ marginTop: 16, padding: 12, border: "1px solid #eee", borderRadius: 12 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <h3 style={{ margin: 0 }}>{t("school_students_title")}</h3>

          <input
            value={studentQ}
            onChange={(e) => setStudentQ(e.target.value)}
            placeholder={t("school_students_search_placeholder")}
            style={{ padding: "6px 10px", border: "1px solid #ddd", borderRadius: 8, minWidth: 200 }}
          />

          <button
            onClick={() => loadStudents(studentQ)}
            style={{ border: "1px solid #ddd", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontWeight: 600 }}
          >
            {t("school_students_search_btn")}
          </button>

          <button
            onClick={() => {
              setStudentQ("");
              loadStudents("");
            }}
            style={{ border: "1px solid #ddd", borderRadius: 8, padding: "6px 10px", cursor: "pointer" }}
          >
            {t("school_students_refresh_btn")}
          </button>

          {studentsLoading && <span style={{ fontSize: 12, opacity: 0.7 }}>{t("school_students_loading")}</span>}
        </div>

        {studentsError && <div style={{ color: "crimson", marginTop: 8 }}>{studentsError}</div>}

        <div style={{ marginTop: 8, overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: "6px 4px" }}>
                  {t("school_students_col_id")}
                </th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: "6px 4px" }}>
                  {t("school_students_col_fullname")}
                </th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: "6px 4px" }}>
                  {t("school_students_col_route")}
                </th>
                <th style={{ textAlign: "left", borderBottom: "1px solid #eee", padding: "6px 4px" }}>
                  {t("school_students_col_parent_email")}
                </th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => (
                <tr key={s.id}>
                  <td style={{ borderBottom: "1px solid #f3f3f3", padding: "6px 4px" }}>{s.id}</td>
                  <td style={{ borderBottom: "1px solid #f3f3f3", padding: "6px 4px" }}>{s.fullName}</td>
                  <td style={{ borderBottom: "1px solid #f3f3f3", padding: "6px 4px" }}>
                    {s.routeId ? routeNameById.get(s.routeId) || s.routeId : ""}
                  </td>
                  <td style={{ borderBottom: "1px solid #f3f3f3", padding: "6px 4px" }}>
                    {s.parentEmail || (s.parentUserId ?? "")}
                  </td>
                </tr>
              ))}

              {!studentsLoading && students.length === 0 && (
                <tr>
                  <td colSpan={4} style={{ padding: "10px 4px", opacity: 0.7 }}>
                    {t("school_students_no_records")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
