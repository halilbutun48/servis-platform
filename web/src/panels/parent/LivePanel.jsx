// web/src/panels/parent/LivePanel.jsx
import { useEffect, useMemo, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";
import MapView from "../../components/map/MapView";
import { navigate } from "../../router";

function etaText(v) {
  const m = v?.etaToChildMin;
  if (typeof m !== "number" || !Number.isFinite(m)) return "—";
  if (m <= 1) return "1 dk";
  return `${m} dk`;
}

function stopTitle(s) {
  if (!s?.name) return "—";
  const ord = typeof s.order === "number" ? s.order : null;
  return ord ? `${ord}. ${s.name}` : s.name;
}

function numText(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "—";
  return String(n);
}

function toNum(v) {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

function stopCoord(stop) {
  const lat = toNum(stop?.lat ?? stop?.location?.lat);
  const lng = toNum(stop?.lng ?? stop?.location?.lng);
  if (lat == null || lng == null) return null;
  return { lat, lng };
}

function haversineMeters(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function stopUniqueKey(stop, idx = 0) {
  const id = Number(stop?.id || 0);
  if (id > 0) return `id:${id}`;
  const coord = stopCoord(stop);
  const order = Number(stop?.order || 0);
  const name = String(stop?.name || "").trim().toLowerCase();
  if (coord) return `coord:${coord.lat.toFixed(6)}:${coord.lng.toFixed(6)}:${order}:${name}`;
  return `fallback:${order}:${name}:${idx}`;
}

function dedupeStops(list) {
  const out = [];
  const seen = new Set();
  for (const [idx, item] of (Array.isArray(list) ? list : []).entries()) {
    if (!item) continue;
    const coord = stopCoord(item);
    if (!coord) continue;
    const key = stopUniqueKey(item, idx);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out.sort((a, b) => Number(a?.order || 0) - Number(b?.order || 0));
}

function sameStop(a, b) {
  const aId = Number(a?.id || 0);
  const bId = Number(b?.id || 0);
  if (aId > 0 && bId > 0) return aId === bId;
  const ac = stopCoord(a);
  const bc = stopCoord(b);
  if (!ac || !bc) return false;
  return haversineMeters(ac.lat, ac.lng, bc.lat, bc.lng) <= 3;
}

function buildWalkNavUrl(stop, myPos) {
  const sc = stopCoord(stop);
  if (!sc) return "";
  const dest = `${sc.lat},${sc.lng}`;
  const hasOrigin = Number.isFinite(Number(myPos?.lat)) && Number.isFinite(Number(myPos?.lng));
  const originPart = hasOrigin ? `&origin=${Number(myPos.lat)},${Number(myPos.lng)}` : "";
  return `https://www.google.com/maps/dir/?api=1${originPart}&destination=${dest}&travelmode=walking`;
}

export default function ParentLivePanel() {
  const { token } = useSession();

  const [children, setChildren] = useState([]);
  const [childId, setChildId] = useState("");
  const [vehicles, setVehicles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [myPos, setMyPos] = useState(null);
  const [geoBusy, setGeoBusy] = useState(false);
  const [geoErr, setGeoErr] = useState("");
  const [selectedVehicleId, setSelectedVehicleId] = useState("");

  async function loadChildren() {
    const r = await api("/api/parent/children", { token });
    const items = Array.isArray(r?.items) ? r.items : [];
    setChildren(items);
    if (!childId && items[0]?.id) setChildId(String(items[0].id));
    return items;
  }

  async function loadVehicles(cid) {
    const qs = new URLSearchParams();
    if (cid) qs.set("childId", String(cid));
    const r = await api(`/api/parent/live/vehicles?${qs.toString()}`, { token });
    const items = Array.isArray(r) ? r : Array.isArray(r?.items) ? r.items : [];
    setVehicles(items);
    setSelectedVehicleId((prev) => {
      if (prev && items.some((x) => String(x.id) === String(prev))) return prev;
      return items[0]?.id ? String(items[0].id) : "";
    });
    return items;
  }

  async function loadAll() {
    setBusy(true);
    setErr("");
    try {
      const kids = await loadChildren();
      const cid = childId || (kids[0]?.id ? String(kids[0].id) : "");
      await loadVehicles(cid);
    } catch (e) {
      setErr(e?.message || String(e));
      setVehicles([]);
    } finally {
      setBusy(false);
    }
  }

  function requestMyLocation() {
    setGeoErr("");
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoErr("Tarayıcı konum desteği vermiyor.");
      return;
    }
    setGeoBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeoBusy(false);
        setMyPos({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
      },
      (e) => {
        setGeoBusy(false);
        setGeoErr(String(e?.message || e));
      },
      { enableHighAccuracy: true, maximumAge: 60000, timeout: 10000 }
    );
  }

  useEffect(() => {
    loadAll();
    requestMyLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useAutoReload("gps", () => loadVehicles(childId).catch(() => {}));
  useAutoReload("vehicles", () => loadVehicles(childId).catch(() => {}));
  useAutoReload("shifts", () => loadVehicles(childId).catch(() => {}));

  const selected = useMemo(() => children.find((c) => String(c.id) === String(childId)) || null, [children, childId]);
  const selectedVehicle = useMemo(() => vehicles.find((v) => String(v.id) === String(selectedVehicleId)) || vehicles[0] || null, [vehicles, selectedVehicleId]);
  const allStops = useMemo(() => dedupeStops(selectedVehicle?.stops || []), [selectedVehicle]);
  const childStop = useMemo(() => selectedVehicle?.childStop || null, [selectedVehicle]);
  const childStopPoint = useMemo(() => stopCoord(childStop), [childStop]);

  const nearestStops = useMemo(() => {
    if (!myPos) return [];
    return allStops
      .map((stop) => {
        const coord = stopCoord(stop);
        if (!coord) return null;
        return { ...stop, __distanceM: haversineMeters(Number(myPos.lat), Number(myPos.lng), coord.lat, coord.lng) };
      })
      .filter(Boolean)
      .sort((a, b) => Number(a.__distanceM || 0) - Number(b.__distanceM || 0));
  }, [allStops, myPos]);

  const nearestStop = useMemo(() => nearestStops[0] || null, [nearestStops]);
  const childNavUrl = useMemo(() => buildWalkNavUrl(childStop, myPos), [childStop, myPos]);
  const nearestNavUrl = useMemo(() => buildWalkNavUrl(nearestStop, myPos), [nearestStop, myPos]);

  const childDistanceM = useMemo(() => {
    if (!childStopPoint || !myPos) return null;
    return haversineMeters(Number(myPos.lat), Number(myPos.lng), childStopPoint.lat, childStopPoint.lng);
  }, [childStopPoint, myPos]);
  const childWalkMin = useMemo(() => {
    if (!Number.isFinite(Number(childDistanceM))) return null;
    return Math.max(1, Math.round(Number(childDistanceM) / 80));
  }, [childDistanceM]);
  const nearestDistanceM = useMemo(() => (nearestStop ? Number(nearestStop.__distanceM || 0) : null), [nearestStop]);
  const nearestWalkMin = useMemo(() => {
    if (!Number.isFinite(Number(nearestDistanceM))) return null;
    return Math.max(1, Math.round(Number(nearestDistanceM) / 80));
  }, [nearestDistanceM]);

  const mapStops = useMemo(() => {
    const arr = allStops.map((stop, idx) => {
      const coord = stopCoord(stop);
      return {
        ...stop,
        id: stop?.id ?? `stop-${idx}`,
        name: sameStop(stop, childStop) ? `Çocuğun durağı • ${stopTitle(stop)}` : stopTitle(stop),
        lat: coord?.lat,
        lng: coord?.lng,
        status: sameStop(stop, childStop) ? "DONE" : "PENDING",
      };
    }).filter((x) => Number.isFinite(Number(x.lat)) && Number.isFinite(Number(x.lng)));
    if (myPos && Number.isFinite(Number(myPos.lat)) && Number.isFinite(Number(myPos.lng))) {
      arr.push({ id: "me", name: "Siz", lat: Number(myPos.lat), lng: Number(myPos.lng), status: "DONE" });
    }
    return arr;
  }, [allStops, childStop, myPos]);

  return (
    <div className="wrap">
      <div className="card">
        <div className="title">Veli • Canlı Takip</div>
        <div className="muted">KVKK kuralı: Canlı konum sadece <b>vardiya saat aralığında</b> gösterilir. Çocuğun durağı, tüm shift durakları ve size göre en yakın durak birlikte gösterilir.</div>
      </div>

      <div className="card" style={{ marginTop: 12 }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <label className="muted" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            Çocuk
            <select value={childId} onChange={(e) => setChildId(e.target.value)} style={{ minWidth: 240 }}>
              <option value="">Seç</option>
              {children.map((c) => (
                <option key={c.id} value={c.id}>#{c.id} {c.fullName}</option>
              ))}
            </select>
          </label>

          <button
            type="button"
            className="btn"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              setErr("");
              try {
                await loadVehicles(childId);
              } catch (e) {
                setErr(e?.message || String(e));
              } finally {
                setBusy(false);
              }
            }}
          >{busy ? "..." : "Yenile"}</button>
          <button type="button" className="btn" disabled={geoBusy} onClick={requestMyLocation}>{geoBusy ? "..." : (myPos ? "Konumumu Yenile" : "Konumumu Al")}</button>

          <div className="muted">Araç: <b>{vehicles.length}</b></div>
          {selected?.company?.name ? <div className="muted">Okul/Şirket: <b>{selected.company.name}</b></div> : null}
        </div>

        {vehicles.length > 1 ? (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            {vehicles.map((v) => (
              <button key={v.id} type="button" className="btn" onClick={() => setSelectedVehicleId(String(v.id))} style={{ opacity: String(selectedVehicleId || "") === String(v.id) ? 1 : 0.75 }}>
                {v.plate || `Araç #${v.id}`}
              </button>
            ))}
          </div>
        ) : null}

        {err ? <div className="card err" style={{ marginTop: 12 }}>{err}</div> : null}

        {!vehicles.length ? <div className="muted" style={{ marginTop: 12 }}>Şu an canlı konum yok. (Vardiya saatinde ve araç ataması varsa görünür.)</div> : null}

        {selectedVehicle ? (
          <>
            <div className="card" style={{ marginTop: 12, padding: 12 }}>
              <div className="muted" style={{ marginBottom: 8 }}>Çocuk durağı ve yaklaşım</div>
              <div style={{ display: "grid", gap: 8 }}>
                <div>
                  Araç <b>#{selectedVehicle.id}</b> • <b>{selectedVehicle.plate}</b>
                </div>
                <div>Çocuğun durağı: <b>{childStop?.name || "-"}</b></div>
                <div>En yakın durak: <b>{nearestStop?.name || "-"}</b>{nearestStop && childStop && sameStop(nearestStop, childStop) ? <span className="muted"> • Çocuğun durağı ile aynı</span> : null}</div>
                <div className="muted">
                  Araçtan çocuğun durağına ETA: <b>{etaText(selectedVehicle)}</b>
                  {selectedVehicle?.etaToChildKm != null ? <> • Mesafe: <b>{selectedVehicle.etaToChildKm} km</b></> : null}
                </div>
                <div className="muted">
                  Sizden çocuğun durağına: <b>{childDistanceM != null ? `${(Number(childDistanceM) / 1000).toFixed(2)} km` : "Konum alınmadı"}</b>
                  {childWalkMin != null ? <> • Yaklaşık yürüyüş: <b>{childWalkMin} dk</b></> : null}
                </div>
                <div className="muted">
                  Sizden en yakın durağa: <b>{nearestDistanceM != null ? `${(Number(nearestDistanceM) / 1000).toFixed(2)} km` : "Konum alınmadı"}</b>
                  {nearestWalkMin != null ? <> • Yaklaşık yürüyüş: <b>{nearestWalkMin} dk</b></> : null}
                </div>
                <div className="muted">Sonraki: <b>{stopTitle(selectedVehicle.nextStop)}</b> • Çocuğa kalan: <b>{numText(selectedVehicle.remainingStopsToChild)}</b> • Toplam kalan: <b>{numText(selectedVehicle.remainingStopsTotal)}</b></div>
                {selectedVehicle?.childStopReached ? <div className="muted">Durum: <b>Çocuğun durağına ulaşıldı</b></div> : null}
                {geoErr ? <div className="muted" style={{ color: "#fca5a5" }}>Konum alınamadı: {geoErr}</div> : null}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" className="btn" onClick={() => navigate(`/shared/logs?kind=bundle_vehicle&targetType=vehicle&targetId=${selectedVehicle.id}&childId=${childId}&format=txt`)} title="Araç için TXT log export (GPS + hız + bildirim)">Log TXT</button>
                  {childNavUrl ? <button type="button" className="btn" onClick={() => window.open(childNavUrl, "_blank", "noopener,noreferrer")}>Çocuğun durağına git</button> : null}
                  {nearestNavUrl ? <button type="button" className="btn" onClick={() => window.open(nearestNavUrl, "_blank", "noopener,noreferrer")}>En yakın durağa git</button> : null}
                </div>
              </div>
            </div>

            {allStops.length ? (
              <div className="card" style={{ marginTop: 12, padding: 12 }}>
                <div className="title">Shift durakları</div>
                <div className="muted" style={{ marginBottom: 8 }}>Çocuğun durağı yeşil işaretli görünür. Tüm koordinatlı shift durakları listelenir.</div>
                <div style={{ display: "grid", gap: 8 }}>
                  {allStops.map((stop, idx) => {
                    const isChild = sameStop(stop, childStop);
                    const isNearest = nearestStop && sameStop(stop, nearestStop);
                    const navUrl = buildWalkNavUrl(stop, myPos);
                    return (
                      <div key={stopUniqueKey(stop, idx)} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", padding: "8px 10px", borderRadius: 12, background: isChild ? "rgba(16,185,129,.10)" : isNearest ? "rgba(59,130,246,.10)" : "rgba(255,255,255,.03)" }}>
                        <div><b>{stopTitle(stop)}</b></div>
                        {isChild ? <div className="muted">• Çocuğun durağı</div> : null}
                        {isNearest ? <div className="muted">• Size en yakın</div> : null}
                        <div className="muted">Durum: <b>{String(stop?.state || "PENDING").toUpperCase()}</b></div>
                        {navUrl ? <button type="button" className="btn" onClick={() => window.open(navUrl, "_blank", "noopener,noreferrer")}>Git</button> : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div style={{ marginTop: 12 }}>
              <MapView vehicles={vehicles} stops={mapStops} selectedVehicleId={selectedVehicle?.id ?? null} />
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
