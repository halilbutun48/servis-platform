// web/src/panels/parent/LivePanel.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { api } from "../../api";
import { useSession } from "../../state/session";
import { useAutoReload } from "../../live/useAutoReload";
import MapView from "../../components/map/MapView";
import PanelFeedbackEntryCard from "../../components/PanelFeedbackEntryCard";
import { navigate } from "../../router";
import { formatRegionOwnership } from "../../utils/regionOwnership";

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

function stopStateText(state) {
  const s = String(state || "PENDING").toUpperCase();
  if (s === "REACHED") return "Ulaşıldı";
  if (s === "DONE") return "Tamamlandı";
  if (s === "COMPLETED") return "Tamamlandı";
  if (s === "SKIPPED") return "Atlandı";
  if (s === "ACTIVE") return "Aktif";
  return "Bekliyor";
}

function distanceText(meters) {
  const n = Number(meters);
  if (!Number.isFinite(n)) return "—";
  if (n < 1000) return `${Math.round(n)} m`;
  return `${(n / 1000).toFixed(2)} km`;
}

function walkMinutesText(meters) {
  const n = Number(meters);
  if (!Number.isFinite(n)) return "—";
  return `${Math.max(1, Math.round(n / 80))} dk`;
}

function regionText(value) {
  return String(formatRegionOwnership(value) || "").replace(/^Bölge:\s*/i, "") || "—";
}

function timeText(value) {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit" }).format(d);
}

function timeRangeText(windowObj) {
  if (!windowObj?.startAt || !windowObj?.endAt) return "—";
  return `${timeText(windowObj.startAt)} - ${timeText(windowObj.endAt)}`;
}

function gpsAgeText(gpsLast) {
  const raw = gpsLast?.at;
  if (!raw) return "Konum gelmedi";
  const at = new Date(raw).getTime();
  if (!Number.isFinite(at)) return "Konum gelmedi";
  const diffSec = Math.max(0, Math.round((Date.now() - at) / 1000));
  if (diffSec < 15) return "Az önce";
  if (diffSec < 60) return `${diffSec} sn önce`;
  const min = Math.round(diffSec / 60);
  if (min < 60) return `${min} dk önce`;
  const hour = Math.round(min / 60);
  return `${hour} sa önce`;
}

function hasVehiclePoint(vehicle) {
  return Number.isFinite(Number(vehicle?.gpsLast?.lat)) && Number.isFinite(Number(vehicle?.gpsLast?.lng));
}

function infoCard(title, value, muted) {
  return { title, value, muted };
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
  const lastRequestedChildRef = useRef("");

  async function loadChildren() {
    const r = await api("/api/parent/children", { token });
    const items = Array.isArray(r?.items) ? r.items : [];
    setChildren(items);
    if (!childId && items[0]?.id) setChildId(String(items[0].id));
    return items;
  }

  const loadVehicles = useCallback(async (cid) => {
    const resolvedChildId = String(cid || "");
    if (!resolvedChildId) {
      setVehicles([]);
      setSelectedVehicleId("");
      lastRequestedChildRef.current = "";
      return [];
    }
    lastRequestedChildRef.current = resolvedChildId;
    const qs = new URLSearchParams();
    qs.set("childId", resolvedChildId);
    const r = await api(`/api/parent/live/vehicles?${qs.toString()}`, { token });
    const items = Array.isArray(r) ? r : Array.isArray(r?.items) ? r.items : [];
    setVehicles(items);
    setSelectedVehicleId((prev) => {
      if (prev && items.some((x) => String(x.id) === String(prev))) return prev;
      return items[0]?.id ? String(items[0].id) : "";
    });
    return items;
  }, [token]);

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

  useEffect(() => {
    const cid = String(childId || "");
    if (!cid || lastRequestedChildRef.current === cid) return;
    setBusy(true);
    setErr("");
    loadVehicles(cid)
      .catch((e) => {
        setErr(e?.message || String(e));
        setVehicles([]);
      })
      .finally(() => setBusy(false));
  }, [childId, loadVehicles]);

  useAutoReload("gps", () => loadVehicles(childId).catch(() => {}), Boolean(childId));
  useAutoReload("vehicles", () => loadVehicles(childId).catch(() => {}), Boolean(childId));
  useAutoReload("shifts", () => loadVehicles(childId).catch(() => {}), Boolean(childId));

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
  const nearbyStops = useMemo(() => nearestStops.slice(0, 3), [nearestStops]);
  const childNavUrl = useMemo(() => buildWalkNavUrl(childStop, myPos), [childStop, myPos]);
  const nearestNavUrl = useMemo(() => buildWalkNavUrl(nearestStop, myPos), [nearestStop, myPos]);

  const childDistanceM = useMemo(() => {
    if (!childStopPoint || !myPos) return null;
    return haversineMeters(Number(myPos.lat), Number(myPos.lng), childStopPoint.lat, childStopPoint.lng);
  }, [childStopPoint, myPos]);
  const nearestDistanceM = useMemo(() => (nearestStop ? Number(nearestStop.__distanceM || 0) : null), [nearestStop]);

  const mapStops = useMemo(() => {
    const arr = allStops
      .map((stop, idx) => {
        const coord = stopCoord(stop);
        return {
          ...stop,
          id: stop?.id ?? `stop-${idx}`,
          name: sameStop(stop, childStop) ? `Çocuğun durağı • ${stopTitle(stop)}` : stopTitle(stop),
          lat: coord?.lat,
          lng: coord?.lng,
          status: sameStop(stop, childStop) ? "DONE" : String(stop?.state || "PENDING").toUpperCase(),
        };
      })
      .filter((x) => Number.isFinite(Number(x.lat)) && Number.isFinite(Number(x.lng)));
    if (myPos && Number.isFinite(Number(myPos.lat)) && Number.isFinite(Number(myPos.lng))) {
      arr.push({ id: "me", name: "Siz", lat: Number(myPos.lat), lng: Number(myPos.lng), status: "DONE" });
    }
    return arr;
  }, [allStops, childStop, myPos]);

  const summaryCards = useMemo(() => {
    if (!selectedVehicle) return [];
    return [
      infoCard("Araç", selectedVehicle?.plate || `#${selectedVehicle?.id || "-"}`, hasVehiclePoint(selectedVehicle) ? "Canlı konum görünüyor" : "Canlı konum henüz görünmüyor"),
      infoCard("Bölge", regionText(selectedVehicle), "Çocuğun servisinin bağlı olduğu bölge."),
      infoCard("Görünürlük aralığı", timeRangeText(selectedVehicle?.visibleWindow), "Canlı konum sadece bu vardiya aralığında görünür."),
      infoCard("Son konum", gpsAgeText(selectedVehicle?.gpsLast), selectedVehicle?.gpsLast?.precision === "masked-2dp" ? "Konum KVKK gereği yaklaşık gösterilir." : null),
      infoCard("Kalan durak", numText(selectedVehicle?.remainingStopsToChild), selectedVehicle?.childStopReached ? "Çocuğun durağına ulaşıldı." : "Çocuğun durağına kadar kalan durak sayısı."),
    ];
  }, [selectedVehicle]);

  return (
    <div className="wrap">
      <div className="card">
        <div className="title">Veli • Canlı Takip</div>
        <div className="muted">KVKK kuralı: Canlı konum sadece <b>vardiya saat aralığında</b> gösterilir. Çocuğun durağı, tüm shift durakları ve size göre en yakın durak birlikte gösterilir.</div>
      </div>

      <PanelFeedbackEntryCard roleId="PARENT" panelLabel="Veli Canlı Takip" relatedPath="/parent/live" />

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
            disabled={busy || !childId}
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
          {selected?.company ? <div className="muted">Bölge: <b>{regionText(selected.company)}</b></div> : null}
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
        {geoErr ? <div className="muted" style={{ color: "#fca5a5", marginTop: 12 }}>Konum alınamadı: {geoErr}</div> : null}
        {!myPos ? <div className="muted" style={{ marginTop: 12 }}>Size en yakın durağı ve yürüyüş süresini görmek için <b>Konumumu Al</b> kullanın.</div> : null}

        {!vehicles.length ? <div className="muted" style={{ marginTop: 12 }}>Bu çocuk için şu an canlı araç görünmüyor. Araç sadece aktif vardiya saat aralığında ve araç ataması varsa görünür.</div> : null}

        {selectedVehicle ? (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10, marginTop: 12 }}>
              {summaryCards.map((card) => (
                <div key={card.title} className="card" style={{ padding: 12 }}>
                  <div className="muted" style={{ marginBottom: 6 }}>{card.title}</div>
                  <div style={{ fontWeight: 800 }}>{card.value}</div>
                  {card.muted ? <div className="muted" style={{ marginTop: 6 }}>{card.muted}</div> : null}
                </div>
              ))}
            </div>

            <div className="card" style={{ marginTop: 12, padding: 12 }}>
              <div className="title">Çocuk durağı ve yaklaşım</div>
              <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                <div>Araç <b>#{selectedVehicle.id}</b> • <b>{selectedVehicle.plate}</b></div>
                <div className="muted">Bölge: <b>{regionText(selectedVehicle)}</b></div>
                <div>Çocuğun durağı: <b>{childStop ? stopTitle(childStop) : "Atanmış durak bulunamadı"}</b></div>
                <div>En yakın durak: <b>{nearestStop ? stopTitle(nearestStop) : "Konum alınmadı"}</b>{nearestStop && childStop && sameStop(nearestStop, childStop) ? <span className="muted"> • Çocuğun durağı ile aynı</span> : null}</div>
                <div className="muted">Araçtan çocuğun durağına ETA: <b>{etaText(selectedVehicle)}</b>{selectedVehicle?.etaToChildKm != null ? <> • Mesafe: <b>{selectedVehicle.etaToChildKm} km</b></> : null}</div>
                <div className="muted">Sizden çocuğun durağına: <b>{distanceText(childDistanceM)}</b>{Number.isFinite(Number(childDistanceM)) ? <> • Yaklaşık yürüyüş: <b>{walkMinutesText(childDistanceM)}</b></> : null}</div>
                <div className="muted">Sizden en yakın durağa: <b>{distanceText(nearestDistanceM)}</b>{Number.isFinite(Number(nearestDistanceM)) ? <> • Yaklaşık yürüyüş: <b>{walkMinutesText(nearestDistanceM)}</b></> : null}</div>
                <div className="muted">Sonraki durak: <b>{stopTitle(selectedVehicle.nextStop)}</b> • Çocuğa kalan: <b>{numText(selectedVehicle.remainingStopsToChild)}</b> • Toplam kalan: <b>{numText(selectedVehicle.remainingStopsTotal)}</b></div>
                {selectedVehicle?.childStopReached ? <div className="muted">Durum: <b>Çocuğun durağına ulaşıldı</b></div> : null}
                {!hasVehiclePoint(selectedVehicle) ? <div className="muted">Araç konumu henüz görünmüyor. Bu, sürücünün telefon GPS'i henüz gelmediği ya da canlı görünürlük anlık boş olduğu anlamına gelebilir.</div> : null}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" className="btn" onClick={() => navigate(`/shared/logs?kind=bundle_vehicle&targetType=vehicle&targetId=${selectedVehicle.id}&childId=${childId}&format=txt`)} title="Araç için TXT log export (GPS + hız + bildirim)">Log TXT</button>
                  {childNavUrl ? <button type="button" className="btn" onClick={() => window.open(childNavUrl, "_blank", "noopener,noreferrer")}>Çocuğun durağına git</button> : null}
                  {nearestNavUrl ? <button type="button" className="btn" onClick={() => window.open(nearestNavUrl, "_blank", "noopener,noreferrer")}>En yakın durağa git</button> : null}
                </div>
              </div>
            </div>

            {nearbyStops.length ? (
              <div className="card" style={{ marginTop: 12, padding: 12 }}>
                <div className="title">Size en yakın duraklar</div>
                <div className="muted" style={{ marginBottom: 8 }}>İlk 3 durak mesafeye göre sıralanır.</div>
                <div style={{ display: "grid", gap: 8 }}>
                  {nearbyStops.map((stop, idx) => (
                    <div key={`${stopUniqueKey(stop, idx)}:near`} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", padding: "8px 10px", borderRadius: 12, background: sameStop(stop, childStop) ? "rgba(16,185,129,.10)" : "rgba(255,255,255,.03)" }}>
                      <div><b>{stopTitle(stop)}</b></div>
                      <div className="muted">Mesafe: <b>{distanceText(stop.__distanceM)}</b></div>
                      <div className="muted">Yürüyüş: <b>{walkMinutesText(stop.__distanceM)}</b></div>
                      {sameStop(stop, childStop) ? <div className="muted">• Çocuğun durağı</div> : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {allStops.length ? (
              <div className="card" style={{ marginTop: 12, padding: 12 }}>
                <div className="title">Shift durakları</div>
                <div className="muted" style={{ marginBottom: 8 }}>Çocuğun durağı yeşil, size en yakın durak mavi vurgulanır. Tüm koordinatlı shift durakları listelenir.</div>
                <div style={{ display: "grid", gap: 8 }}>
                  {allStops.map((stop, idx) => {
                    const isChild = sameStop(stop, childStop);
                    const isNearest = nearestStop && sameStop(stop, nearestStop);
                    const navUrl = buildWalkNavUrl(stop, myPos);
                    const distanceMeters = myPos ? haversineMeters(Number(myPos.lat), Number(myPos.lng), Number(stopCoord(stop)?.lat), Number(stopCoord(stop)?.lng)) : null;
                    return (
                      <div key={stopUniqueKey(stop, idx)} style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", padding: "8px 10px", borderRadius: 12, background: isChild ? "rgba(16,185,129,.10)" : isNearest ? "rgba(59,130,246,.10)" : "rgba(255,255,255,.03)" }}>
                        <div><b>{stopTitle(stop)}</b></div>
                        {isChild ? <div className="muted">• Çocuğun durağı</div> : null}
                        {isNearest ? <div className="muted">• Size en yakın</div> : null}
                        <div className="muted">Durum: <b>{stopStateText(stop?.state)}</b></div>
                        {Number.isFinite(Number(distanceMeters)) ? <div className="muted">• Mesafe: <b>{distanceText(distanceMeters)}</b></div> : null}
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
